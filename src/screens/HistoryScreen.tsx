import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import api, { getActiveRequest, acceptOfferApi } from '../constants/api';
import { Button } from '../components/Button';


type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export const HistoryScreen: React.FC<Props> = ({ navigation }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRequest, setActiveRequest] = useState<{ ride: any; offers: Array<{ offer: any; driver: any }> } | null>(null);
    const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const [historyRes, activeRes] = await Promise.all([api.get('/rides/history'), getActiveRequest()]);
            setHistory(historyRes.data);
            setActiveRequest(activeRes && typeof activeRes === 'object' && 'ride' in activeRes ? activeRes as any : null);
        } catch (error) {
            console.log(error);
            Alert.alert('Erreur', 'Impossible de récupérer l\'historique');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAcceptOffer = async (offerId: string) => {
        try {
            setAcceptingOfferId(offerId);
            const { ride, driver } = await acceptOfferApi(offerId);
            setActiveRequest(null);
            Alert.alert('Proposition acceptée', 'Vous pouvez maintenant lancer la course depuis l\'accueil.');
            (navigation.getParent() as any)?.navigate('Home', { acceptedRide: ride, acceptedDriver: driver });
        } catch (e: any) {
            Alert.alert('Erreur', e.response?.data?.message || 'Impossible d\'accepter la proposition');
        } finally {
            setAcceptingOfferId(null);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => {
                navigation.navigate('HistoryDetail', { rideId: item.id })
            }}
        >
            <View style={styles.itemHeader}>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={[styles.status, (item.status === 'CANCELLED' || item.status === 'REJECTED') && styles.cancelled]}>
                    {item.status}
                </Text>
            </View>
            <View style={styles.routeContainer}>
                <Text style={styles.addressLabel}>De: </Text>
                <Text style={styles.route} numberOfLines={1}>{item.pickupAddress || `${item.pickupLat.toFixed(4)}, ${item.pickupLng.toFixed(4)}`}</Text>
            </View>
            <View style={styles.routeContainer}>
                <Text style={styles.addressLabel}>Vers: </Text>
                <Text style={styles.route} numberOfLines={1}>{item.dropoffAddress || `${item.dropoffLat.toFixed(4)}, ${item.dropoffLng.toFixed(4)}`}</Text>
            </View>
            <Text style={styles.fare}>{item.fare > 0 ? `${item.fare.toFixed(0)} Fc` : 'N/A'}</Text>
        </TouchableOpacity>
    );

    const handleRefresh = () => {
        setLoading(true);
        loadData();
        setLoading(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => (navigation.getParent() as any)?.navigate('Home')}>
                    <Text style={styles.back}>➔</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Historique</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
            ) : (
                <FlatList
                    data={history}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}
                    ListHeaderComponent={
                        activeRequest && activeRequest.offers?.length > 0 ? (
                            <View style={styles.pendingSection}>
                                <Text style={styles.pendingTitle}>Demande en attente</Text>
                                <View style={styles.pendingCard}>
                                    <Text style={styles.pendingRoute}>De: {activeRequest.ride.pickupAddress || `${activeRequest.ride.pickupLat?.toFixed(4)}, ${activeRequest.ride.pickupLng?.toFixed(4)}`}</Text>
                                    <Text style={styles.pendingRoute}>Vers: {activeRequest.ride.dropoffAddress || `${activeRequest.ride.dropoffLat?.toFixed(4)}, ${activeRequest.ride.dropoffLng?.toFixed(4)}`}</Text>
                                    <Text style={styles.offersLabel}>Propositions des chauffeurs ({activeRequest.offers.length})</Text>
                                    {activeRequest.offers.map((item: any) => (
                                        <View key={item.offer.id} style={styles.offerRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.offerDriverName}>{item.driver?.name || 'Chauffeur'}</Text>
                                                <Text style={styles.offerMeta}>{item.driver?.vehicleModel} • {item.offer.price} Fc</Text>
                                            </View>
                                            <Button
                                                title={acceptingOfferId === item.offer.id ? '...' : 'Accepter'}
                                                onPress={() => handleAcceptOffer(item.offer.id)}
                                                disabled={!!acceptingOfferId}
                                                style={styles.acceptButton}
                                            />
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={<Text style={styles.empty}>Aucun historique disponible</Text>}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.inputBackground,
    },
    back: {
        fontSize: 24,
        transform: [{ rotate: '180deg' }],
        color: theme.colors.primary,
    },
    title: {
        ...theme.textVariants.title,
        fontSize: 20,
    },
    loader: {
        flex: 1,
    },
    list: {
        padding: theme.spacing.m,
    },
    item: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.s,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.inputBackground,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.s,
    },
    date: {
        ...theme.textVariants.caption,
        fontWeight: 'bold',
    },
    status: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'green',
    },
    cancelled: {
        color: theme.colors.error,
    },
    routeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    addressLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        width: 35,
    },
    route: {
        ...theme.textVariants.body,
        fontSize: 13,
        flex: 1,
    },
    fare: {
        ...theme.textVariants.body,
        fontWeight: 'bold',
        color: theme.colors.primary,
        textAlign: 'right',
        marginTop: theme.spacing.s,
    },
    empty: {
        textAlign: 'center',
        marginTop: 50,
        color: theme.colors.textSecondary,
    },
    pendingSection: {
        marginBottom: theme.spacing.l,
    },
    pendingTitle: {
        ...theme.textVariants.title,
        fontSize: 16,
        marginBottom: theme.spacing.s,
        color: theme.colors.primary,
    },
    pendingCard: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.s,
        borderWidth: 1,
        borderColor: theme.colors.inputBackground,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
    },
    pendingRoute: {
        ...theme.textVariants.body,
        fontSize: 12,
        marginBottom: 4,
    },
    offersLabel: {
        fontWeight: 'bold',
        marginTop: theme.spacing.m,
        marginBottom: theme.spacing.s,
        fontSize: 13,
    },
    offerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.s,
        borderTopWidth: 1,
        borderTopColor: theme.colors.inputBackground,
    },
    offerDriverName: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    offerMeta: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    acceptButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        minWidth: 90,
    },
});
