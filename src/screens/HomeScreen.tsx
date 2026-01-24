import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Dimensions, ActivityIndicator, Alert, TextInput, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Button } from '../components/Button';
import { useSocket } from '../context/SocketContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

// Mock driver data until backend connected fully
const MOCK_DRIVERS = [
    { id: '1', lat: 37.78825, lng: -122.4324, title: 'Driver 1' },
    { id: '2', lat: 37.78865, lng: -122.4354, title: 'Driver 2' }
];

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
    const { socket, isConnected } = useSocket();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [pickup, setPickup] = useState('Position actuelle');
    const [destination, setDestination] = useState('');
    const [vehicleType, setVehicleType] = useState<'Voiture' | 'Moto' | 'Luxe'>('Voiture');
    const [selectedDriver, setSelectedDriver] = useState<{ id: string, name: string } | null>(null);
    const [fare, setFare] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<'client' | 'driver'>('client');
    const [pendingRides, setPendingRides] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
        })();
    }, []);

    useEffect(() => {
        if (destination && vehicleType) {
            // Simulate fare calculation: Base price * multiplier
            const basePrice = 5;
            const multipliers = { Voiture: 1, Moto: 0.7, Luxe: 2 };
            setFare(basePrice * multipliers[vehicleType]);
        }
    }, [destination, vehicleType]);

    // Listen for socket events
    useEffect(() => {
        if (socket) {
            socket.on('newRideRequest', (ride) => {
                if (userRole === 'driver') {
                    setPendingRides(prev => [...prev, ride]);
                } else {
                    Alert.alert("Nouvelle demande de course", "Un chauffeur a peut-être reçu votre demande");
                }
            });

            socket.on('rideAccepted', (ride) => {
                Alert.alert("Course Acceptée", "Votre chauffeur est en route !");
            });

            socket.on('rideCancelled', () => {
                Alert.alert("Annulation", "La course a été annulée");
                setPendingRides([]);
            });
        }
        return () => {
            socket?.off('newRideRequest');
            socket?.off('rideAccepted');
            socket?.off('rideCancelled');
        };
    }, [socket, userRole]);

    const handleAcceptRide = (rideId: string) => {
        if (socket) {
            socket.emit('acceptRide', { rideId });
            setPendingRides(prev => prev.filter(r => r.id !== rideId));
            Alert.alert("Succès", "Vous avez accepté la course !");
        }
    };

    const handleRequestRide = () => {
        if (!destination) {
            Alert.alert("Erreur", "Veuillez entrer une destination");
            return;
        }

        if (!selectedDriver) {
            Alert.alert("Sélection", "Veuillez sélectionner un chauffeur sur la carte");
            return;
        }

        Alert.alert(
            "Confirmer la course",
            `Détails:\nVéhicule: ${vehicleType}\nPrix: ${fare?.toFixed(2)}€\nChauffeur: ${selectedDriver.name}`,
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Confirmer", onPress: () => {
                        if (socket && location) {
                            socket.emit('requestRide', {
                                driverId: selectedDriver.id,
                                pickupLat: location.coords.latitude,
                                pickupLng: location.coords.longitude,
                                dropoffLat: location.coords.latitude + 0.01, // Mock
                                dropoffLng: location.coords.longitude + 0.01,
                                vehicleType,
                                fare
                            });
                            Alert.alert("Succès", "Demande envoyée au chauffeur.");
                        }
                    }
                }
            ]
        );
    };

    if (!location) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text>{errorMsg || "Chargement..."}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.roleToggle}>
                <Text
                    style={[styles.roleBtn, userRole === 'client' && styles.roleBtnActive]}
                    onPress={() => setUserRole('client')}
                >Client</Text>
                <Text
                    style={[styles.roleBtn, userRole === 'driver' && styles.roleBtnActive]}
                    onPress={() => setUserRole('driver')}
                >Driver</Text>
                <TouchableOpacity
                    style={styles.historyBtn}
                    onPress={() => navigation.navigate('History')}
                >
                    <Text style={styles.historyText}>Historique</Text>
                </TouchableOpacity>
            </View>

            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                showsUserLocation
            >
                {userRole === 'client' && MOCK_DRIVERS.map(driver => (
                    <Marker
                        key={driver.id}
                        coordinate={{ latitude: driver.lat, longitude: driver.lng }}
                        title={driver.title}
                        description="Disponible"
                        pinColor={selectedDriver?.id === driver.id ? theme.colors.primary : 'blue'}
                        onPress={() => setSelectedDriver({ id: driver.id, name: driver.title })}
                    />
                ))}

                {userRole === 'driver' && pendingRides.map(ride => (
                    <Marker
                        key={ride.id}
                        coordinate={{ latitude: ride.pickupLat, longitude: ride.pickupLng }}
                        title={`Passager: ${ride.passengerName || 'Client'}`}
                        description={`Prix: ${ride.fare}€`}
                        pinColor="green"
                    />
                ))}
            </MapView>

            <SafeAreaView style={styles.overlay} pointerEvents="box-none">
                <View style={styles.card}>
                    <Text style={styles.title}>{userRole === 'client' ? 'Où allez-vous ?' : 'Demandes en attente'}</Text>

                    {userRole === 'client' ? (
                        <>
                            <TextInput
                                style={styles.input}
                                placeholder="Départ"
                                value={pickup}
                                onChangeText={setPickup}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Destination"
                                value={destination}
                                onChangeText={setDestination}
                            />

                            <View style={styles.vehicleRow}>
                                {(['Voiture', 'Moto', 'Luxe'] as const).map(v => (
                                    <Text
                                        key={v}
                                        style={[styles.vehicleTab, vehicleType === v && styles.vehicleTabActive]}
                                        onPress={() => setVehicleType(v)}
                                    >
                                        {v}
                                    </Text>
                                ))}
                            </View>

                            {fare && (
                                <View style={styles.fareContainer}>
                                    <Text style={styles.fareText}>Prix estimé: {fare.toFixed(2)}€</Text>
                                </View>
                            )}

                            <Button
                                title={selectedDriver ? `Commander (${selectedDriver.name})` : "Sélectionner un Chauffeur"}
                                onPress={handleRequestRide}
                                style={styles.button}
                                variant={selectedDriver ? 'primary' : 'outline'}
                            />
                        </>
                    ) : (
                        <View>
                            {pendingRides.length === 0 ? (
                                <Text style={styles.emptyText}>Aucune demande pour le moment...</Text>
                            ) : (
                                pendingRides.map(ride => (
                                    <View key={ride.id} style={styles.rideItem}>
                                        <Text style={styles.rideText}>Client: {ride.passengerName || 'Client'} - {ride.fare}€</Text>
                                        <Button
                                            title="Accepter"
                                            onPress={() => handleAcceptRide(ride.id)}
                                            style={styles.smallButton}
                                        />
                                    </View>
                                ))
                            )}
                        </View>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    roleToggle: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        zIndex: 10,
        backgroundColor: theme.colors.white,
        padding: 5,
        borderRadius: theme.borderRadius.round,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5
    },
    roleBtn: {
        flex: 1,
        textAlign: 'center',
        paddingVertical: 10,
        borderRadius: theme.borderRadius.round,
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.textSecondary
    },
    roleBtnActive: {
        backgroundColor: theme.colors.primary,
        color: theme.colors.white
    },
    historyBtn: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: theme.borderRadius.round,
        backgroundColor: theme.colors.secondary,
        marginLeft: 5,
    },
    historyText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    map: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    overlay: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'flex-end',
        padding: theme.spacing.m
    },
    card: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
    },
    title: {
        ...theme.textVariants.title,
        fontSize: 18,
        marginBottom: theme.spacing.m
    },
    input: {
        backgroundColor: theme.colors.inputBackground,
        borderRadius: theme.borderRadius.s,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.s,
        fontSize: 14,
    },
    vehicleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: theme.spacing.s
    },
    vehicleTab: {
        padding: theme.spacing.s,
        borderRadius: theme.borderRadius.s,
        borderWidth: 1,
        borderColor: theme.colors.inputBackground,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 2,
        fontSize: 12,
    },
    vehicleTabActive: {
        backgroundColor: theme.colors.primary,
        color: theme.colors.white,
        borderColor: theme.colors.primary,
    },
    fareContainer: {
        alignItems: 'center',
        marginVertical: theme.spacing.s
    },
    fareText: {
        ...theme.textVariants.body,
        fontWeight: 'bold',
        color: theme.colors.primary
    },
    button: {
        marginTop: theme.spacing.s
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        padding: theme.spacing.m
    },
    rideItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.inputBackground
    },
    rideText: {
        fontSize: 14,
        flex: 1
    },
    smallButton: {
        width: 'auto',
        paddingVertical: 5,
        paddingHorizontal: 15
    }
});
