import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import api from '../constants/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ route, navigation }) => {
    const { role } = route.params;
    const { register, registerDriver } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);

    // Driver specific
    const [idCardNumber, setIdCardNumber] = useState('');
    const [address, setAddress] = useState('');
    const [vehicleBrand, setVehicleBrand] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [vehicleColor, setVehicleColor] = useState('');
    const [vehicleTypeId, setVehicleTypeId] = useState('');
    const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);

    // Photos
    const [driverPhoto, setDriverPhoto] = useState<string | null>(null);
    const [idCardPhoto, setIdCardPhoto] = useState<string | null>(null);
    const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);

    useEffect(() => {
        if (role === 'driver') {
            fetchVehicleTypes();
        }
    }, [role]);

    const fetchVehicleTypes = async () => {
        try {
            const response = await api.get('/admin/vehicle-types');
            setVehicleTypes(response.data);
            if (response.data.length > 0) {
                setVehicleTypeId(response.data[0].id);
            }
        } catch (error) {
            console.error('Error fetching vehicle types', error);
        }
    };

    const pickImage = async (type: 'driver' | 'idCard' | 'vehicle') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: type === 'vehicle' ? [16, 9] : [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            if (type === 'driver') setDriverPhoto(uri);
            else if (type === 'idCard') setIdCardPhoto(uri);
            else if (type === 'vehicle') {
                if (vehiclePhotos.length < 2) {
                    setVehiclePhotos([...vehiclePhotos, uri]);
                } else {
                    Alert.alert('Info', 'Maximum 2 photos du véhicule');
                }
            }
        }
    };

    const handleRegister = async () => {
        if (!name || !email || !password || !phoneNumber) {
            return Alert.alert('Erreur', 'Veuillez remplir tous les champs de base');
        }

        if (role === 'driver') {
            if (!idCardNumber || !address || !vehicleBrand || !vehicleModel || !vehiclePlate || !vehicleColor) {
                return Alert.alert('Erreur', 'Veuillez remplir toutes les informations du chauffeur et du véhicule');
            }
            if (!driverPhoto || !idCardPhoto || vehiclePhotos.length < 2) {
                return Alert.alert('Erreur', 'Veuillez ajouter toutes les photos requises (Photo, Carte ID, 2 photos véhicule)');
            }
        }

        setLoading(true);
        try {
            if (role === 'driver') {
                const formData = new FormData();
                formData.append('name', name);
                formData.append('email', email);
                formData.append('password', password);
                formData.append('phoneNumber', phoneNumber);
                formData.append('idCardNumber', idCardNumber);
                formData.append('address', address);
                formData.append('vehicleBrand', vehicleBrand);
                formData.append('vehicleModel', vehicleModel);
                formData.append('vehiclePlate', vehiclePlate);
                formData.append('vehicleColor', vehicleColor);
                formData.append('vehicleTypeId', vehicleTypeId);

                // Append files
                if (driverPhoto) {
                    const filename = driverPhoto.split('/').pop();
                    const match = /\.(\w+)$/.exec(filename || '');
                    const type = match ? `image/${match[1]}` : `image`;
                    formData.append('driverPhoto', { uri: driverPhoto, name: filename, type } as any);
                }

                if (idCardPhoto) {
                    const filename = idCardPhoto.split('/').pop();
                    const match = /\.(\w+)$/.exec(filename || '');
                    const type = match ? `image/${match[1]}` : `image`;
                    formData.append('idCardPhoto', { uri: idCardPhoto, name: filename, type } as any);
                }

                vehiclePhotos.forEach((uri, index) => {
                    const filename = uri.split('/').pop();
                    const match = /\.(\w+)$/.exec(filename || '');
                    const type = match ? `image/${match[1]}` : `image`;
                    formData.append('vehiclePhotos', { uri, name: filename, type } as any);
                });

                await registerDriver(formData);
                Alert.alert('Succès', 'Votre inscription a été soumise et est en attente d’approbation.', [
                    { text: 'OK', onPress: () => navigation.navigate('Login') }
                ]);
            } else {
                await register({
                    name,
                    email,
                    password,
                    phoneNumber,
                    role,
                });
            }
        } catch (error: any) {
            Alert.alert('Erreur', error.response?.data?.message || 'Erreur lors de l’inscription');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>Créer un compte</Text>
                    <Text style={styles.subtitle}>{role === 'driver' ? 'Devenez chauffeur' : 'Voyagez avec nous'}</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Nom complet</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="John Doe"
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="exemple@email.com"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <Text style={styles.label}>Téléphone</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="+33 6 12 34 56 78"
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                    />

                    <Text style={styles.label}>Mot de passe</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="********"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    {role === 'driver' && (
                        <>
                            <Text style={styles.sectionTitle}>Informations Personnelles</Text>
                            <Text style={styles.label}>Numéro Carte d'Identité</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="123456789"
                                value={idCardNumber}
                                onChangeText={setIdCardNumber}
                            />

                            <Text style={styles.label}>Adresse</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="123 Rue de la Paix"
                                value={address}
                                onChangeText={setAddress}
                            />

                            <Text style={styles.sectionTitle}>Informations Véhicule</Text>
                            <Text style={styles.label}>Type de véhicule</Text>
                            <View style={styles.typesContainer}>
                                {vehicleTypes.map((type) => (
                                    <TouchableOpacity
                                        key={type.id}
                                        style={[
                                            styles.typeButton,
                                            vehicleTypeId === type.id && styles.typeButtonActive
                                        ]}
                                        onPress={() => setVehicleTypeId(type.id)}
                                    >
                                        <Text style={[
                                            styles.typeButtonText,
                                            vehicleTypeId === type.id && styles.typeButtonTextActive
                                        ]}>{type.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Marque</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Toyota"
                                value={vehicleBrand}
                                onChangeText={setVehicleBrand}
                            />

                            <Text style={styles.label}>Modèle</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Prius"
                                value={vehicleModel}
                                onChangeText={setVehicleModel}
                            />

                            <Text style={styles.label}>Couleur</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Gris"
                                value={vehicleColor}
                                onChangeText={setVehicleColor}
                            />

                            <Text style={styles.label}>Immatriculation</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="AB-123-CD"
                                value={vehiclePlate}
                                onChangeText={setVehiclePlate}
                            />

                            <Text style={styles.sectionTitle}>Photos requises</Text>

                            <Text style={styles.label}>Votre Photo</Text>
                            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('driver')}>
                                {driverPhoto ? (
                                    <Image source={{ uri: driverPhoto }} style={styles.previewImage} />
                                ) : (
                                    <Text style={styles.imagePickerText}>Choisir une photo de profil</Text>
                                )}
                            </TouchableOpacity>

                            <Text style={styles.label}>Photo Carte d'Identité</Text>
                            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('idCard')}>
                                {idCardPhoto ? (
                                    <Image source={{ uri: idCardPhoto }} style={styles.previewImage} />
                                ) : (
                                    <Text style={styles.imagePickerText}>Choisir la photo d'identité</Text>
                                )}
                            </TouchableOpacity>

                            <Text style={styles.label}>Photos du Véhicule ({vehiclePhotos.length}/2)</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity style={[styles.imagePicker, { flex: 1 }]} onPress={() => pickImage('vehicle')}>
                                    <Text style={styles.imagePickerText}>Ajouter</Text>
                                </TouchableOpacity>
                                {vehiclePhotos.map((uri, idx) => (
                                    <View key={idx} style={{ flex: 1, height: 100, borderRadius: 8, overflow: 'hidden' }}>
                                        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                                        <TouchableOpacity
                                            style={styles.removePhoto}
                                            onPress={() => setVehiclePhotos(vehiclePhotos.filter((_, i) => i !== idx))}
                                        >
                                            <Text style={{ color: 'white', fontWeight: 'bold' }}>X</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    <Button title="S'inscrire" onPress={handleRegister} loading={loading} style={styles.marginTop} />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.linkText}>Déjà un compte ? </Text>
                    <Text style={styles.linkAction} onPress={() => navigation.navigate('Login')}>Se connecter</Text>
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
    scrollContent: {
        padding: theme.spacing.l,
        paddingBottom: theme.spacing.xl,
    },
    header: {
        marginBottom: theme.spacing.l,
    },
    title: {
        ...theme.textVariants.header,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        ...theme.textVariants.body,
        color: theme.colors.textSecondary
    },
    form: {
        marginBottom: theme.spacing.l
    },
    label: {
        ...theme.textVariants.body,
        marginBottom: theme.spacing.s,
        fontWeight: '600'
    },
    input: {
        backgroundColor: theme.colors.inputBackground,
        borderRadius: theme.borderRadius.s,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        fontSize: 16,
        color: theme.colors.text
    },
    sectionTitle: {
        ...theme.textVariants.title,
        fontSize: 18,
        marginTop: theme.spacing.m,
        marginBottom: theme.spacing.m,
        color: theme.colors.primary,
        fontWeight: 'bold'
    },
    marginTop: {
        marginTop: theme.spacing.l
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: theme.spacing.m
    },
    linkText: {
        ...theme.textVariants.body,
        color: theme.colors.textSecondary
    },
    linkAction: {
        ...theme.textVariants.body,
        color: theme.colors.primary,
        fontWeight: 'bold'
    },
    imagePicker: {
        height: 100,
        backgroundColor: theme.colors.inputBackground,
        borderRadius: theme.borderRadius.s,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.textSecondary,
        borderStyle: 'dashed'
    },
    imagePickerText: {
        color: theme.colors.textSecondary,
        fontSize: 14
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: theme.borderRadius.s
    },
    removePhoto: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    typesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: theme.spacing.m
    },
    typeButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    typeButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    typeButtonText: {
        color: theme.colors.primary,
        fontWeight: '600'
    },
    typeButtonTextActive: {
        color: 'white',
    }
});
