import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Dimensions, ActivityIndicator, Alert, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
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
import api, { API_URL } from '../constants/api';
import { GOOGLE_MAPS_API_KEY, CITIES } from '../constants/maps';
import * as Speech from 'expo-speech';
import * as Linking from 'expo-linking';
import { Image } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

// Mock drivers for visualization if none connected

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
    //const [vehicleType, setVehicleType] = useState<'Voiture' | 'Moto' | 'Luxe'>('Voiture');
    //const [selectedDriver, setSelectedDriver] = useState<{ id: string, name: string } | null>(null);
    const [fare, setFare] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<'client' | 'driver'>(authUser?.role || 'client');
    const [pendingRides, setPendingRides] = useState<any[]>([]);
    const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
    const [selectedVehicleType, setSelectedVehicleType] = useState<any>(null);
    const [selectedCity, setSelectedCity] = useState(CITIES.BENI);
    const mapRef = React.useRef<MapView>(null);

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
    const [navigationSteps, setNavigationSteps] = useState<any[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
    const [lastRerouteTime, setLastRerouteTime] = useState(0);
    const [rideSummary, setRideSummary] = useState<{ fare: number, duration: string } | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [detailedDriver, setDetailedDriver] = useState<any>(null);
    const [detailedPassenger, setDetailedPassenger] = useState<any>(null);

    const speak = (text: string) => {
        Speech.speak(text, { language: 'fr' });
    };

    const stripHtml = (html: string) => {
        return html.replace(/<[^>]*>?/gm, '');
    };

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        if (socket && location && userRole === 'driver') {
            socket.emit('updateLocation', {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
                rideId: currentRide?.id
            });

            // Rerouting detection
            if (currentRide && currentRide.status === 'IN_PROGRESS' && routeCoordinates.length > 0) {
                let minDistance = Infinity;
                routeCoordinates.forEach(coord => {
                    const dist = getDistance(location.coords.latitude, location.coords.longitude, coord.latitude, coord.longitude);
                    if (dist < minDistance) minDistance = dist;
                });

                // If deviation > 200m and last reroute was more than 30s ago
                if (minDistance > 200 && Date.now() - lastRerouteTime > 30000) {
                    setLastRerouteTime(Date.now());
                    socket.emit('rerouting', { rideId: currentRide.id });
                    Alert.alert("Itinéraire changé", "Vous avez dévié du trajet prévu. L'itinéraire est recalculé.");
                }

                // Voice guidance / Step progression
                if (navigationSteps.length > 0 && currentStepIndex < navigationSteps.length) {
                    const nextStep = navigationSteps[currentStepIndex];
                    const distToNext = getDistance(
                        location.coords.latitude,
                        location.coords.longitude,
                        nextStep.start_location.lat,
                        nextStep.start_location.lng
                    );

                    if (distToNext < 50) { // If within 50m of next step start
                        setCurrentStepIndex(currentStepIndex + 1);
                        if (navigationSteps[currentStepIndex + 1]) {
                            speak(stripHtml(navigationSteps[currentStepIndex + 1].html_instructions));
                        }
                    }
                }
            }
        }
    }, [socket, location, userRole, currentRide, routeCoordinates, navigationSteps, currentStepIndex, lastRerouteTime]);

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

            let location = await Location.getCurrentPositionAsync({ accuracy: 6 });
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

    // Re-fetch rides when socket reconnects
    useEffect(() => {
        if (isConnected && userRole === 'driver') {
            fetchPendingRides();
        }
    }, [isConnected, userRole]);

    const fetchPendingRides = async () => {
        try {
            const url = location
                ? `/rides/available-rides?lat=${location.coords.latitude}&lng=${location.coords.longitude}`
                : '/rides/available-rides';
            const response = await api.get(url);
            console.log("Demandes disponibles", response.data);
            setPendingRides(response.data);
        } catch (error) {
            console.error("Erreur lors de la récupération des demandes", error);
        }
    };

    //console.log('userRole: ', userRole, ' CurrentRide: ', currentRide?.driverId);

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
                const { ride, passenger, driver } = data;
                setCurrentRide(ride);
                if (passenger) setDetailedPassenger(passenger);
                if (driver) setDetailedDriver(driver);
                setStartConfirmed(false);
                Alert.alert("Offre acceptée", "Le client a accepté votre offre ! Rendez-vous au point de départ.");
            });

            socket.on('rideAcceptedSuccess', (data) => {
                const { ride, driver } = data;
                setCurrentRide(ride);
                if (driver) setDetailedDriver(driver);
                setStartConfirmed(false);
                Alert.alert(
                    "Course Confirmée",
                    `Le chauffeur ${driver?.name || 'Inconnu'} arrive !\n` +
                    `Véhicule: ${ride.vehicleModel} (${ride.vehicleColor})`
                );
            });

            socket.on('startConfirmed', (data) => {
                //console.log('startConfirmed', data);
                const { by, ride, driver, passenger } = data;
                setCurrentRide(ride);
                if (driver) setDetailedDriver(driver);
                if (passenger) setDetailedPassenger(passenger);
                if (by === userRole) {
                    setStartConfirmed(true);
                }
            });

            socket.on('rideStarted', (ride) => {
                setCurrentRide(ride);
                setStartTime(Date.now());
                Alert.alert("Course démarrée", "Bon voyage !");
            });

            socket.on('rideCancelled', (data?: { rideId: string }) => {
                const rideId = data?.rideId;
                if (userRole === 'driver') {
                    if (rideId) {
                        setPendingRides(prev => prev.filter(r => r.id !== rideId));
                        if (currentRide && currentRide.id === rideId) {
                            Alert.alert("Annulation", "Le passager a annulé la course");
                            setCurrentRide(null);
                            setRideOffers([]);
                            setDriverLocation(null);
                            setEta(null);
                        }
                    } else {
                        Alert.alert("Annulation", "La course a été annulée");
                        setPendingRides([]);
                        setCurrentRide(null);
                        setRideOffers([]);
                        setDriverLocation(null);
                        setEta(null);
                    }
                } else {
                    if (!rideId || (currentRide && currentRide.id === rideId)) {
                        Alert.alert("Annulation", "La course a été annulée");
                        setCurrentRide(null);
                        setRideOffers([]);
                        setDriverLocation(null);
                        setEta(null);
                    }
                }
            });

            socket.on('rideCancelledSuccess', () => {
                setCurrentRide(null);
                setRideOffers([]);
                setDriverLocation(null);
                setEta(null);
                Alert.alert("Succès", "Votre commande a été annulée.");
            });

            socket.on('rideCompleted', (ride) => {
                const endTime = Date.now();
                const durationMs = startTime ? endTime - startTime : 0;
                const durationMin = Math.ceil(durationMs / 60000);

                setRideSummary({
                    fare: ride.fare,
                    duration: `${durationMin} min`
                });

                //console.log('rideCompleted... ', userRole);

                // Clear navigation but keep currentRide until user dismisses summary
                setRideOffers([]);
                setCurrentRide(null);
                setDriverLocation(null);
                setEta(null);
                setNavigationSteps([]);
            });



            socket.on('driverLocationUpdate', (data: { lat: number, lng: number, rideId: string }) => {
                if (currentRide && currentRide.id === data.rideId) {
                    setDriverLocation({
                        latitude: data.lat,
                        longitude: data.lng
                    });
                }
            });

            socket.on('rerouting', () => {
                if (userRole === 'client') {
                    Alert.alert("Information", "Le chauffeur a changé d'itinéraire. La carte est mise à jour.");
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
    }, [socket, userRole, currentRide]);

    const handleRequestRide = () => {
        if (!destinationCoords) {
            Alert.alert("Erreur", "Destination non trouvée");
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
                passengerName: authUser?.name,
                passengerPhone: authUser?.phone,
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
        //console.log("confirmStart")

        if (socket && currentRide) {
            //console.log("EmitEvent", currentRide.id)
            socket.emit('confirmStart', { rideId: currentRide.id });
        }
    };

    const handleCancelRide = () => {
        if (socket && currentRide) {
            Alert.alert(
                "Annuler la commande",
                "Êtes-vous sûr de vouloir annuler votre commande ?",
                [
                    { text: "Non", style: "cancel" },
                    {
                        text: "Oui, annuler",
                        style: "destructive",
                        onPress: () => socket.emit('cancelRide', { rideId: currentRide.id })
                    }
                ]
            );
        }
    };

    const handleCompleteRide = () => {
        if (socket && currentRide) {
            socket.emit('completeRide', { rideId: currentRide.id });
        }
    };

    const handleDismissSummary = () => {
        handleCompleteRide();
        setRideSummary(null);
        setCurrentRide(null);
        setStartTime(null);
        setDetailedDriver(null);
        setDetailedPassenger(null);
    };

    const handleOpenWhatsApp = (phone: string) => {
        const formattedPhone = phone.replace(/[^0-9]/g, '');
        const url = `whatsapp://send?phone=${formattedPhone}`;
        Linking.canOpenURL(url).then((supported: any) => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Linking.openURL(`https://wa.me/${formattedPhone}`);
            }
        });
    };

    if (!location) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text>{errorMsg || "Chargement..."}</Text>
            </View>
        );
    }

    let waintingText = 'Chauffeur en route'
    if (userRole === 'driver') {
        waintingText = 'Client en attente'
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}>
            <View style={styles.roleToggle}>
                {userRole === 'client' && <Text
                    style={[styles.roleBtn, userRole === 'client' && styles.roleBtnActive]}
                    onPress={() => setUserRole('client')}
                >Accueil</Text>}
                {userRole === 'driver' && <Text
                    style={[styles.roleBtn, userRole === 'driver' && styles.roleBtnActive]}
                    onPress={() => setUserRole('driver')}
                >Accueil</Text>}
                <TouchableOpacity
                    style={styles.historyBtn}
                    onPress={() => navigation.navigate('History')}
                >
                    <Text style={styles.historyText}>Hist.</Text>
                </TouchableOpacity>
                {userRole === 'driver' && (
                    <TouchableOpacity
                        style={[styles.historyBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => navigation.navigate('Wallet')}
                    >
                        <Text style={[styles.historyText, { color: 'white' }]}>W</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.historyBtn, { backgroundColor: theme.colors.error }]}
                    onPress={logout}
                >
                    <Text style={[styles.historyText, { color: 'white' }]}>Déconnexion</Text>
                </TouchableOpacity>
            </View>

            {userRole === 'driver' && currentRide && currentRide.status === 'IN_PROGRESS' && navigationSteps.length > 0 && (
                <View style={styles.navHeader}>
                    <Text style={styles.navInstruction}>
                        {stripHtml(navigationSteps[currentStepIndex]?.html_instructions || 'Suivez l\'itinéraire')}
                    </Text>
                    <Text style={styles.navDistance}>
                        {navigationSteps[currentStepIndex]?.distance.text || ''}
                    </Text>
                </View>
            )}

            <MapView
                ref={mapRef}
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
                            if (result.legs && result.legs[0]) {
                                setNavigationSteps(result.legs[0].steps);
                                setRouteCoordinates(result.coordinates);
                                if (userRole === 'driver' && currentRide.status === 'IN_PROGRESS' && currentStepIndex === 0) {
                                    speak(stripHtml(result.legs[0].steps[0].html_instructions));
                                }
                            }
                        }}
                    />
                )}

                {userRole === 'driver' && pendingRides.map(ride => (
                    <Marker
                        key={ride.id}
                        coordinate={{ latitude: ride.pickupLat, longitude: ride.pickupLng }}
                        title="Nouveau passager"
                        onPress={() => {
                            setSelectedRideForBid(ride);
                            setShowBidModal(true);
                        }}
                    >
                        <View style={[styles.markerView, { backgroundColor: '#FFD700' }]}>
                            <Ionicons name="person" size={18} color="white" />
                        </View>
                    </Marker>
                ))}

                {currentRide && currentRide.status === 'ACCEPTED' && userRole === 'driver' && (
                    <Marker
                        coordinate={{ latitude: currentRide.pickupLat, longitude: currentRide.pickupLng }}
                        title="Passager à récupérer"
                    >
                        <View style={[styles.markerView, { backgroundColor: '#FFD700' }]}>
                            <Ionicons name="person" size={18} color="white" />
                        </View>
                    </Marker>
                )}

                {userRole === 'client' && currentRide && (currentRide.status === 'ACCEPTED' || currentRide.status === 'IN_PROGRESS') && driverLocation && (
                    <Marker
                        coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
                        title="Votre chauffeur"
                    >
                        <View style={[styles.markerView, { backgroundColor: theme.colors.primary }]}>
                            <FontAwesome5 name="car" size={18} color="white" />
                        </View>
                    </Marker>
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
                                        console.log("STARTING... DATA: ", data)
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
                                        components: 'country:cd',
                                        location: `${location.coords.latitude},${location.coords.longitude}`,
                                        radius: 20000,
                                        strictbounds: true,
                                    }}
                                    fetchDetails={true}
                                    onFail={(err) => console.log("Error: "  + err)}
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
                                        components: 'country:cd',
                                        location: `${location.coords.latitude},${location.coords.longitude}`,
                                        radius: 20000,
                                        strictbounds: true,
                                    }}
                                    fetchDetails={true}
                                    onFail={(err) => console.log("Error: "  + err)}
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

                            <Button
                                title="Annuler ma commande"
                                variant="outline"
                                onPress={handleCancelRide}
                                style={[styles.button, { borderColor: theme.colors.error, marginTop: 15 }]}
                                textStyle={{ color: theme.colors.error }}
                            />


                        </>
                    )}

                    {/* Start Confirmation Flow */}
                    {currentRide && (currentRide.status === 'ACCEPTED' || currentRide.status === 'IN_PROGRESS') && (
                        <View>
                            <Text style={styles.title}>
                                {currentRide.status === 'ACCEPTED' ? waintingText : 'Course en cours'}
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

                            <Button
                                title="Détails"
                                variant="outline"
                                onPress={() => setShowDetailsModal(true)}
                                style={[styles.button, { marginTop: 10 }]}
                            />
                        </View>
                    )}

                    {/* Driver Flow - Pending Request List */}
                    {userRole === 'driver' && !currentRide && (
                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <Text style={[styles.title, { marginBottom: 0 }]}>Demandes à proximité</Text>
                                <TouchableOpacity onPress={fetchPendingRides} style={{ padding: 5 }}>
                                    <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: 'bold' }}>Rafraichir</Text>
                                </TouchableOpacity>
                            </View>
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

            {/* Ride Summary Modal */}
            {rideSummary && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 40 }}>🎉</Text>
                            <Text style={styles.modalTitle}>Course Terminée !</Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Montant final</Text>
                            <Text style={styles.summaryValue}>{rideSummary.fare} Fc</Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Durée</Text>
                            <Text style={styles.summaryValue}>{rideSummary.duration}</Text>
                        </View>

                        <Button
                            title="Terminer"
                            onPress={handleDismissSummary}
                            style={{ marginTop: 20 }}
                        />
                    </View>
                </View>
            )}

            {/* Ride Details Modal */}
            {showDetailsModal && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Détails de la course</Text>

                        {userRole === 'client' && (
                            <View style={{ alignItems: 'center' }}>
                                {detailedDriver?.vehiclePhoto ? (
                                    <Image
                                        source={{ uri: `${API_URL}/uploads/${detailedDriver.vehiclePhoto}` }}
                                        style={styles.vehicleThumbnail}
                                    />
                                ) : (
                                    <View style={styles.vehicleThumbnailPlaceholder}>
                                        <Text>Impossible de charger la photo...</Text>
                                    </View>
                                )}
                                <View style={styles.detailCard}>
                                    <Text style={styles.detailRow}><Text style={styles.detailLabel}>Chauffeur:</Text> {detailedDriver?.name || 'Inconnu'}</Text>
                                    <Text style={styles.detailRow}><Text style={styles.detailLabel}>Véhicule:</Text> {currentRide?.vehicleModel || detailedDriver?.vehicleModel}</Text>
                                    <Text style={styles.detailRow}><Text style={styles.detailLabel}>Couleur:</Text> {currentRide?.vehicleColor || detailedDriver?.vehicleColor}</Text>
                                    <Text style={styles.detailRow}><Text style={styles.detailLabel}>Immatriculation:</Text> {currentRide?.vehicleRegistration || detailedDriver?.vehiclePlate}</Text>
                                </View>
                            </View>
                        )}

                        {userRole === 'driver' && (
                            <View>
                                <View style={styles.detailCard}>
                                    <Text style={styles.detailRow}><Text style={styles.detailLabel}>Client:</Text> {detailedPassenger?.name || currentRide?.passengerName || 'Client'}</Text>
                                    <Text style={styles.detailRow}><Text style={styles.detailLabel}>Téléphone:</Text> {detailedPassenger?.phoneNumber || currentRide?.passengerPhone || 'Non disponible'}</Text>
                                </View>

                                {(detailedPassenger?.phoneNumber) && (
                                    <Button
                                        title="Contacter sur WhatsApp"
                                        onPress={() => handleOpenWhatsApp(detailedPassenger.phoneNumber)}
                                        style={[styles.button, { backgroundColor: '#25D366' }]}
                                    />
                                )}
                            </View>
                        )}

                        <Button
                            title="Fermer"
                            variant="outline"
                            onPress={() => setShowDetailsModal(false)}
                            style={{ marginTop: 20 }}
                        />
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
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
    navHeader: {
        position: 'absolute',
        top: 110,
        left: 20,
        right: 20,
        backgroundColor: theme.colors.primary,
        padding: 15,
        borderRadius: 12,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    navInstruction: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 10,
    },
    navDistance: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    smallButton: {
        width: 'auto',
        paddingVertical: 5,
        paddingHorizontal: 15
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.inputBackground,
        width: '100%'
    },
    summaryLabel: {
        fontSize: 16,
        color: theme.colors.textSecondary
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.primary
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
    },
    citySelector: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15,
    },
    cityBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.s,
        backgroundColor: theme.colors.inputBackground,
        alignItems: 'center',
    },
    cityBtnActive: {
        backgroundColor: theme.colors.primary,
    },
    cityBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
    },
    cityBtnTextActive: {
        color: 'white',
    },
    vehicleThumbnail: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginBottom: 15,
        backgroundColor: '#f0f0f0'
    },
    vehicleThumbnailPlaceholder: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginBottom: 15,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center'
    },
    detailCard: {
        width: '100%',
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10
    },
    detailRow: {
        fontSize: 14,
        marginBottom: 8,
        color: theme.colors.text
    },
    detailLabel: {
        fontWeight: 'bold',
        color: theme.colors.textSecondary
    },
    markerView: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    }
});
