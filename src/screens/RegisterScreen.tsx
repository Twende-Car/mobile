import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ route, navigation }) => {
    const { role } = route.params;
    const { register } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);

    // Driver specific
    const [vehicleModel, setVehicleModel] = useState('');
    const [plateNumber, setPlateNumber] = useState('');

    const handleRegister = async () => {
        if (!name || !email || !password || !phoneNumber) {
            return Alert.alert('Erreur', 'Veuillez remplir tous les champs');
        }

        setLoading(true);
        try {
            await register({
                name,
                email,
                password,
                phoneNumber,
                role,
                vehicleInfo: role === 'driver' ? { vehicleModel, plateNumber } : null
            });
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
                            <Text style={styles.sectionTitle}>Information Véhicule</Text>
                            <Text style={styles.label}>Modèle</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Toyota Prius"
                                value={vehicleModel}
                                onChangeText={setVehicleModel}
                            />

                            <Text style={styles.label}>Immatriculation</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="AB-123-CD"
                                value={plateNumber}
                                onChangeText={setPlateNumber}
                            />
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
    },
    marginTop: {
        marginTop: theme.spacing.m
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
    }
});
