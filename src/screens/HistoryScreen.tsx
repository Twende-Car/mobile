import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import api from '../constants/api';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export const HistoryScreen: React.FC<Props> = ({ navigation }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            try {
                const response = await api.get('/rides/history');
                setHistory(response.data);
            } catch (error) {
                console.log(error);
                Alert.alert('Erreur', 'Impossible de récupérer l’historique');
            } finally {
                setLoading(false);
            }
        }
        fetchHistory();
    }, []);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('HistoryDetail', { rideId: item.id })}
        >
            <View style={styles.itemHeader}>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                <Text style={[styles.status, item.status === 'CANCELLED' && styles.cancelled]}>
                    {item.status}
                </Text>
            </View>
            <Text style={styles.route}>{item.pickupLat.toFixed(4)}, {item.pickupLng.toFixed(4)} ➔ {item.dropoffLat.toFixed(4)}, {item.dropoffLng.toFixed(4)}</Text>
            <Text style={styles.fare}>{item.fare > 0 ? `${item.fare.toFixed(2)}€` : 'Annulée'}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
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
    route: {
        ...theme.textVariants.body,
        fontSize: 12,
        marginBottom: theme.spacing.s,
    },
    fare: {
        ...theme.textVariants.body,
        fontWeight: 'bold',
        color: theme.colors.primary,
        textAlign: 'right',
    },
    empty: {
        textAlign: 'center',
        marginTop: 50,
        color: theme.colors.textSecondary,
    }
});
