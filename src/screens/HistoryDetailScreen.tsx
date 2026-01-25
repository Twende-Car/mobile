import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import api from '../constants/api';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoryDetail'>;

export const HistoryDetailScreen: React.FC<Props> = ({ route, navigation }) => {
    const { rideId } = route.params;
    const [ride, setRide] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRideDetails() {
            try {
                const response = await api.get(`/rides/${rideId}`);
                const data = response.data;

                // Map API response to UI structure
                setRide({
                    id: data.id,
                    status: data.status,
                    date: new Date(data.createdAt).toLocaleString(),
                    fare: data.fare || 0,
                    pickup: data.pickupAddress || `${data.pickupLat}, ${data.pickupLng}`,
                    destination: data.dropoffAddress || `${data.dropoffLat}, ${data.dropoffLng}`,
                    vehicle: data.vehicleType?.name || 'Inconnu',
                    driver: {
                        name: data.driver?.name || 'Non assigné',
                        phone: data.driver?.phoneNumber || 'N/A',
                        plate: data.vehicleRegistration || data.driver?.vehiclePlate || 'N/A'
                    },
                    duration: data.endTime ? `${Math.round((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60000)} min` : 'N/A',
                    distance: data.distance ? `${data.distance.toFixed(1)} km` : 'N/A'
                });
            } catch (error) {
                console.error(error);
                Alert.alert('Erreur', 'Impossible de charger les détails de la course');
                navigation.goBack();
            } finally {
                setLoading(false);
            }
        }
        fetchRideDetails();
    }, [rideId]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>➔</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Détails de la course</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Information Générale</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Date:</Text>
                        <Text style={styles.value}>{ride.date}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Statut:</Text>
                        <Text style={[styles.value, { color: 'green' }]}>{ride.status}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Prix:</Text>
                        <Text style={[styles.value, styles.primary]}>{ride.fare.toFixed(0)} Fc</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Trajet</Text>
                    <View style={styles.routeItem}>
                        <View style={[styles.dot, { backgroundColor: 'green' }]} />
                        <Text style={styles.routeText}>{ride.pickup}</Text>
                    </View>
                    <View style={styles.line} />
                    <View style={styles.routeItem}>
                        <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
                        <Text style={styles.routeText}>{ride.destination}</Text>
                    </View>
                    <View style={styles.stats}>
                        <Text style={styles.statText}>Distance: {ride.distance}</Text>
                        <Text style={styles.statText}>Durée: {ride.duration}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Chauffeur & Véhicule</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Chauffeur:</Text>
                        <Text style={styles.value}>{ride.driver.name}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Téléphone:</Text>
                        <Text style={styles.value}>{ride.driver.phone}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Véhicule:</Text>
                        <Text style={styles.value}>{ride.vehicle}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Plaque:</Text>
                        <Text style={styles.value}>{ride.driver.plate}</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    content: {
        padding: theme.spacing.m,
    },
    section: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.s,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.inputBackground,
    },
    sectionTitle: {
        ...theme.textVariants.body,
        fontWeight: 'bold',
        marginBottom: theme.spacing.m,
        color: theme.colors.textSecondary,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.inputBackground,
        paddingBottom: theme.spacing.xs,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.s,
    },
    label: {
        ...theme.textVariants.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    value: {
        ...theme.textVariants.body,
        fontSize: 14,
        fontWeight: '500',
    },
    primary: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: theme.spacing.m,
    },
    routeText: {
        ...theme.textVariants.body,
        fontSize: 13,
        flex: 1,
    },
    line: {
        width: 2,
        height: 20,
        backgroundColor: theme.colors.inputBackground,
        marginLeft: 4,
        marginVertical: 4,
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: theme.spacing.m,
        paddingTop: theme.spacing.s,
        borderTopWidth: 1,
        borderTopColor: theme.colors.inputBackground,
    },
    statText: {
        ...theme.textVariants.caption,
        fontSize: 11,
    }
});
