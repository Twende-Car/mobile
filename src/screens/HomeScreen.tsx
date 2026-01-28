import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Dimensions, ActivityIndicator, Alert, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Button } from '../components/Button';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../constants/api';
import { GOOGLE_MAPS_API_KEY } from '../constants/maps';

// Mock drivers for visualization if none connected
const MOCK_DRIVERS = [
    { id: '1', lat: 37.78825, lng: -122.4324, title: 'Driver Prototype 1' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
    const { socket, isConnected } = useSocket();
    const { user: authUser, logout } = useAuth();
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [pickup, setPickup] = useState('Position actuelle');
    const [pickupCoords, setPickupCoords] = useState<{ latitude: number, longitude: number } | null>(null);
    const [destination, setDestination] = useState('');
    const [destinationCoords, setDestinationCoords] = useState<{ latitude: number, longitude: number } | null>(null);
    const [vehicleType, setVehicleType] = useState<'Voiture' | 'Moto' | 'Luxe'>('Voiture');
    const [selectedDriver, setSelectedDriver] = useState<{ id: string, name: string } | null>(null);
    const [fare, setFare] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<'client' | 'driver'>(authUser?.role || 'client');
    const [pendingRides, setPendingRides] = useState<any[]>([]);
    const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
    const [selectedVehicleType, setSelectedVehicleType] = useState<any>(null);

    // Bidding Flow State
    const [rideOffers, setRideOffers] = useState<any[]>([]);
    const [currentRide, setCurrentRide] = useState<any>(null);
    const [bidPrice, setBidPrice] = useState('');
    const [showBidModal, setShowBidModal] = useState(false);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [selectedRideForBid, setSelectedRideForBid] = useState<any>(null);
    const [startConfirmed, setStartConfirmed] = useState(false);
    const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
    const [isEstimating, setIsEstimating] = useState(false);
    const [eta, setEta] = useState<number | null>(null); // in minutes
    const [driverLocation, setDriverLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    useEffect(() => {
        if (socket && location && userRole === 'driver') {
            socket.emit('updateLocation', {
                lat: location.coords.latitude,
                lng: location.coords.longitude
            });
        }
    }, [socket, location, userRole]);

    useEffect(() => {
        if (showSelectionModal && selectedVehicleType) {
            handleEstimate();
        }
    }, [showSelectionModal, selectedVehicleType]);

    const handleEstimate = async () => {
        if (!selectedVehicleType || !pickupCoords || !destinationCoords) return;
        setIsEstimating(true);
        try {
            // Use real distance from backend estimation (which should ideally take distance)
            const response = await api.post('/rides/estimate', {
                distance: 5, // We could calculate real distance here if needed
                vehicleTypeId: selectedVehicleType.id
            });
            setEstimatedFare(response.data.fare);
        } catch (error) {
            console.error("Erreur estimation", error);
        } finally {
            setIsEstimating(false);
        }
    };

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
            setPickupCoords({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
        })();

        // Fetch vehicle types
        (async () => {
            try {
                const response = await api.get('/admin/vehicle-types');
                setVehicleTypes(response.data);
                if (response.data.length > 0) setSelectedVehicleType(response.data[0]);
            } catch (error) {
                console.error("Erreur lors de la récupération des types de véhicules", error);
            }
        })();
    }, []);

    useEffect(() => {
        if (userRole === 'driver') {
            fetchPendingRides();
        }
    }, [userRole]);

    const fetchPendingRides = async () => {
        try {
            const url = location
                ? `/rides/available-rides?lat=${location.coords.latitude}&lng=${location.coords.longitude}`
                : '/rides/available-rides';
            const response = await api.get(url);
            setPendingRides(response.data);
        } catch (error) {
            console.error("Erreur lors de la récupération des demandes", error);
        }
    };

    // Listen for socket events
    useEffect(() => {
        if (socket) {
            socket.on('newRideRequest', (ride) => {
                if (userRole === 'driver') {
                    setPendingRides(prev => [...prev, ride]);
                    Alert.alert(
                        "Nouvelle demande",
                        `Un passager (${ride.passengerName || 'Client'}) demande une course à ${ride.distanceToPickup?.toFixed(1) || '?'} km.`
                    );
                }
            });

            socket.on('rideRequested', (ride) => {
                setCurrentRide(ride);
                setRideOffers([]);
                setShowSelectionModal(false);
            });

            socket.on('newOffer', (data) => {
                // data: { offer, driver }
                setRideOffers(prev => [...prev, data]);
            });

            socket.on('offerAccepted', (data) => {
                const { ride } = data;
                setCurrentRide(ride);
                setStartConfirmed(false);
                Alert.alert("Offre acceptée", "Le client a accepté votre offre ! Rendez-vous au point de départ.");
            });

            socket.on('rideAcceptedSuccess', (data) => {
                const { ride, driver } = data;
                setCurrentRide(ride);
                setStartConfirmed(false);
                Alert.alert(
                    "Course Confirmée",
                    `Le chauffeur ${driver.name} arrive !\n` +
                    `Véhicule: ${ride.vehicleModel} (${ride.vehicleColor})`
                );
            });

            socket.on('startConfirmed', (data) => {
                const { by, ride } = data;
                setCurrentRide(ride);
                if (by === userRole) {
                    setStartConfirmed(true);
                }
            });

            socket.on('rideStarted', (ride) => {
                setCurrentRide(ride);
                Alert.alert("Course démarrée", "Bon voyage !");
            });

            socket.on('rideCancelled', () => {
                Alert.alert("Annulation", "La course a été annulée");
                setCurrentRide(null);
                setPendingRides([]);
                setRideOffers([]);
                setDriverLocation(null);
                setEta(null);
            });

            socket.on('rideCompleted', (ride) => {
                Alert.alert("Terminé", "La course est terminée.");
                setCurrentRide(null);
                setRideOffers([]);
                setDriverLocation(null);
                setEta(null);
            });

            socket.on('driverLocationUpdate', (data: { lat: number, lng: number, rideId: string }) => {
                if (currentRide && currentRide.id === data.rideId) {
                    setDriverLocation({
                        latitude: data.lat,
                        longitude: data.lng
                    });
                }
            });
        }
        return () => {
            socket?.off('newRideRequest');
            socket?.off('rideRequested');
            socket?.off('newOffer');
            socket?.off('offerAccepted');
            socket?.off('rideAcceptedSuccess');
            socket?.off('startConfirmed');
            socket?.off('rideStarted');
            socket?.off('rideCancelled');
            socket?.off('rideCompleted');
            socket?.off('driverLocationUpdate');
        };
    }, [socket, userRole]);

    const handleRequestRide = () => {
        if (!destinationCoords) {
            Alert.alert("Erreur", "Veuillez entrer une destination");
            return;
        }
        setShowSelectionModal(true);
    };

    const confirmRideRequest = () => {
        if (socket && pickupCoords && destinationCoords) {
            socket.emit('requestRide', {
                pickupLat: pickupCoords.latitude,
                pickupLng: pickupCoords.longitude,
                dropoffLat: destinationCoords.latitude,
                dropoffLng: destinationCoords.longitude,
                pickupAddress: pickup,
                dropoffAddress: destination,
                distance: 5,
                vehicleTypeId: selectedVehicleType?.id,
            });
            Alert.alert("Succès", "Demande envoyée. Attente des offres des chauffeurs...");
        }
    };

    const handleAcceptOffer = (offerId: string) => {
        if (socket) {
            socket.emit('acceptOffer', { offerId });
        }
    };

    const handleSubmitOffer = () => {
        if (!bidPrice || isNaN(Number(bidPrice))) {
            return Alert.alert("Erreur", "Veuillez entrer un prix valide");
        }
        if (socket && selectedRideForBid) {
            socket.emit('submitOffer', {
                rideId: selectedRideForBid.id,
                price: Number(bidPrice)
            });
            setPendingRides(prev => prev.filter(r => r.id !== selectedRideForBid.id));
            setShowBidModal(false);
            setBidPrice('');
            Alert.alert("Succès", "Offre envoyée !");
        }
    };

    const handleConfirmStart = () => {
        if (socket && currentRide) {
            socket.emit('confirmStart', { rideId: currentRide.id });
        }
    };

    const handleCompleteRide = () => {
        if (socket && currentRide) {
            socket.emit('completeRide', { rideId: currentRide.id });
        }
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
                {userRole === 'client' && <Text
                    style={[styles.roleBtn, userRole === 'client' && styles.roleBtnActive]}
                    onPress={() => setUserRole('client')}
                >Client</Text>}
                {userRole === 'driver' && <Text
                    style={[styles.roleBtn, userRole === 'driver' && styles.roleBtnActive]}
                    onPress={() => setUserRole('driver')}
                >Driver</Text>}
                <TouchableOpacity
                    style={styles.historyBtn}
                    onPress={() => navigation.navigate('History')}
                >
                    <Text style={styles.historyText}>Hist.</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.historyBtn, { backgroundColor: theme.colors.error }]}
                    onPress={logout}
                >
                    <Text style={[styles.historyText, { color: 'white' }]}>Off</Text>
                </TouchableOpacity>
            </View>

            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                }}
                showsUserLocation
            >
                {(pickupCoords || currentRide) && (
                    <Marker
                        coordinate={currentRide ? { latitude: currentRide.pickupLat, longitude: currentRide.pickupLng } : pickupCoords!}
                        title="Départ"
                        pinColor="blue"
                    />
                )}
                {(destinationCoords || currentRide) && (
                    <Marker
                        coordinate={currentRide ? { latitude: currentRide.dropoffLat, longitude: currentRide.dropoffLng } : destinationCoords!}
                        title="Destination"
                        pinColor="red"
                    />
                )}

                {(pickupCoords && destinationCoords) || (currentRide && currentRide.status === 'REQUESTED') ? (
                    <MapViewDirections
                        origin={pickupCoords!}
                        destination={destinationCoords!}
                        apikey={GOOGLE_MAPS_API_KEY}
                        strokeWidth={4}
                        strokeColor={theme.colors.primary}
                    />
                ) : null}

                {currentRide && (currentRide.status === 'ACCEPTED' || currentRide.status === 'IN_PROGRESS') && (
                    <MapViewDirections
                        origin={userRole === 'client' ? (driverLocation || { latitude: currentRide.pickupLat, longitude: currentRide.pickupLng }) : { latitude: location.coords.latitude, longitude: location.coords.longitude }}
                        destination={currentRide.status === 'ACCEPTED' ? { latitude: currentRide.pickupLat, longitude: currentRide.pickupLng } : { latitude: currentRide.dropoffLat, longitude: currentRide.dropoffLng }}
                        apikey={GOOGLE_MAPS_API_KEY}
                        strokeWidth={4}
                        strokeColor={currentRide.status === 'ACCEPTED' ? theme.colors.secondary : theme.colors.primary}
                        onReady={(result) => {
                            setEta(Math.ceil(result.duration));
                        }}
                    />
                )}

                {userRole === 'driver' && pendingRides.map(ride => (
                    <Marker
                        key={ride.id}
                        coordinate={{ latitude: ride.pickupLat, longitude: ride.pickupLng }}
                        title="Nouveau passager"
                        pinColor="green"
                        onPress={() => {
                            setSelectedRideForBid(ride);
                            setShowBidModal(true);
                        }}
                    />
                ))}

                {currentRide && currentRide.status === 'ACCEPTED' && userRole === 'driver' && (
                    <Marker
                        coordinate={{ latitude: currentRide.pickupLat, longitude: currentRide.pickupLng }}
                        title="Passager à récupérer"
                        pinColor="yellow"
                    />
                )}
            </MapView>

            <SafeAreaView style={styles.overlay} pointerEvents="box-none">
                <View style={[styles.card, userRole === 'client' && !currentRide && { height: 400 }]}>
                    {/* Passenger Flow */}
                    {userRole === 'client' && !currentRide && (
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Où allez-vous ?</Text>

                            <View style={{ zIndex: 100, marginBottom: 10 }}>
                                <GooglePlacesAutocomplete
                                    placeholder='Lieu de départ'
                                    onPress={(data, details = null) => {
                                        setPickup(data.description);
                                        if (details) {
                                            setPickupCoords({
                                                latitude: details.geometry.location.lat,
                                                longitude: details.geometry.location.lng,
                                            });
                                        }
                                    }}
                                    query={{
                                        key: GOOGLE_MAPS_API_KEY,
                                        language: 'fr',
                                    }}
                                    fetchDetails={true}
                                    styles={{
                                        textInput: styles.input,
                                        container: { flex: 0 },
                                        listView: { backgroundColor: 'white' }
                                    }}
                                    predefinedPlaces={[{
                                        description: 'Position actuelle',
                                        geometry: { location: { lat: location.coords.latitude, lng: location.coords.longitude } } as any,
                                    }]}
                                />
                            </View>

                            <View style={{ zIndex: 99 }}>
                                <GooglePlacesAutocomplete
                                    placeholder='Destination'
                                    onPress={(data, details = null) => {
                                        setDestination(data.description);
                                        if (details) {
                                            setDestinationCoords({
                                                latitude: details.geometry.location.lat,
                                                longitude: details.geometry.location.lng,
                                            });
                                        }
                                    }}
                                    query={{
                                        key: GOOGLE_MAPS_API_KEY,
                                        language: 'fr',
                                    }}
                                    fetchDetails={true}
                                    styles={{
                                        textInput: styles.input,
                                        container: { flex: 0 },
                                        listView: { backgroundColor: 'white' }
                                    }}
                                />
                            </View>

                            <View style={{ flex: 1 }} />

                            <Button
                                title="Demander des offres"
                                onPress={handleRequestRide}
                                style={styles.button}
                            />
                        </View>
                    )}

                    {userRole === 'client' && currentRide?.status === 'REQUESTED' && (
                        <>
                            <Text style={styles.title}>Offres reçues ({rideOffers.length})</Text>
                            <ScrollView style={{ maxHeight: 200 }}>
                                {rideOffers.length === 0 ? (
                                    <Text style={styles.emptyText}>Attente des chauffeurs...</Text>
                                ) : (
                                    rideOffers.map((item, idx) => (
                                        <View key={idx} style={styles.rideItem}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontWeight: 'bold' }}>{item.driver.name}</Text>
                                                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                                                    {item.driver.vehicleModel} • ⭐ {item.driver.rating}
                                                </Text>
                                            </View>
                                            <Text style={styles.fareText}>{item.offer.price}Fc</Text>
                                            <Button
                                                title="Accepter"
                                                onPress={() => handleAcceptOffer(item.offer.id)}
                                                style={styles.smallButton}
                                            />
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        </>
                    )}

                    {/* Start Confirmation Flow */}
                    {currentRide && (currentRide.status === 'ACCEPTED' || currentRide.status === 'IN_PROGRESS') && (
                        <View>
                            <Text style={styles.title}>
                                {currentRide.status === 'ACCEPTED' ? 'Chauffeur en route' : 'Course en cours'}
                            </Text>
                            <View style={styles.rideDetail}>
                                <Text><Text style={{ fontWeight: 'bold' }}>Prix:</Text> {currentRide.fare}Fc</Text>
                                <Text><Text style={{ fontWeight: 'bold' }}>Véhicule:</Text> {currentRide.vehicleModel}</Text>
                                {eta && (
                                    <Text><Text style={{ fontWeight: 'bold' }}>Arrivée estimée:</Text> {eta} min</Text>
                                )}
                            </View>

                            {currentRide.status === 'ACCEPTED' && (
                                <Button
                                    title={startConfirmed ? "Attente de l'autre partie..." : "Lancer la course"}
                                    onPress={handleConfirmStart}
                                    disabled={startConfirmed}
                                    style={styles.button}
                                />
                            )}

                            {currentRide.status === 'IN_PROGRESS' && userRole === 'driver' && (
                                <Button
                                    title="Terminer la course"
                                    onPress={handleCompleteRide}
                                    style={styles.button}
                                />
                            )}
                        </View>
                    )}

                    {/* Driver Flow - Pending Request List */}
                    {userRole === 'driver' && !currentRide && (
                        <View>
                            <Text style={styles.title}>Demandes à proximité</Text>
                            {pendingRides.length === 0 ? (
                                <Text style={styles.emptyText}>Aucune demande...</Text>
                            ) : (
                                pendingRides.map(ride => (
                                    <View key={ride.id} style={styles.rideItem}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontWeight: 'bold' }}>{ride.passengerName || ride.passenger?.name || 'Client'}</Text>
                                            <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                                                Vers: {ride.dropoffAddress} • {ride.distanceToPickup?.toFixed(1) || '?'} km
                                            </Text>
                                        </View>
                                        <Button
                                            title="Proposer prix"
                                            onPress={() => {
                                                setSelectedRideForBid(ride);
                                                setShowBidModal(true);
                                            }}
                                            style={styles.smallButton}
                                        />
                                    </View>
                                ))
                            )}
                        </View>
                    )}
                </View>
            </SafeAreaView>

            {/* Selection Modal */}
            {showSelectionModal && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Choisir le type de véhicule</Text>

                        <View style={styles.vehicleRow}>
                            {vehicleTypes.map(v => (
                                <TouchableOpacity
                                    key={v.id}
                                    style={[styles.vehicleTab, selectedVehicleType?.id === v.id && styles.vehicleTabActive]}
                                    onPress={() => setSelectedVehicleType(v)}
                                >
                                    <Text style={[styles.vehicleTabText, selectedVehicleType?.id === v.id && styles.vehicleTabTextActive]}>
                                        {v.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {isEstimating ? (
                            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
                        ) : (
                            estimatedFare && (
                                <View style={styles.fareContainer}>
                                    <Text style={styles.fareText}>Estimation: {estimatedFare.toFixed(0)}Fc</Text>
                                    <Text style={styles.disclaimerText}>
                                        Attention : les prix réels peuvent différer suivant la proposition faite par le Driver.
                                    </Text>
                                </View>
                            )
                        )}

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                            <Button title="Annuler" variant="outline" onPress={() => setShowSelectionModal(false)} style={{ flex: 1 }} />
                            <Button title="Confirmer la demande" onPress={confirmRideRequest} style={{ flex: 1 }} />
                        </View>
                    </View>
                </View>
            )}

            {/* Bid Modal */}
            {showBidModal && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Proposer un prix</Text>
                        <Text style={{ marginBottom: 10 }}>Vers: {selectedRideForBid?.dropoffAddress}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Votre prix (Fc)"
                            keyboardType="numeric"
                            autoFocus
                            value={bidPrice}
                            onChangeText={setBidPrice}
                        />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Button title="Annuler" variant="outline" onPress={() => setShowBidModal(false)} style={{ flex: 1 }} />
                            <Button title="Envoyer" onPress={handleSubmitOffer} style={{ flex: 1 }} />
                        </View>
                    </View>
                </View>
            )}
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
        height: 50,
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
    },
    vehicleTabActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    vehicleTabText: {
        fontSize: 12,
        color: theme.colors.text,
        textAlign: 'center'
    },
    vehicleTabTextActive: {
        color: theme.colors.white,
    },
    fareContainer: {
        alignItems: 'center',
        marginVertical: theme.spacing.m
    },
    fareText: {
        ...theme.textVariants.body,
        fontWeight: 'bold',
        color: theme.colors.primary,
        fontSize: 20,
        marginBottom: 8
    },
    disclaimerText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
        paddingHorizontal: 10
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
    rideDetail: {
        backgroundColor: theme.colors.inputBackground,
        padding: 10,
        borderRadius: 8,
        marginBottom: 10
    },
    smallButton: {
        width: 'auto',
        paddingVertical: 5,
        paddingHorizontal: 15
    },
    modalOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        width: '90%'
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center'
    }
});
