import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        // Placeholder for API call
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            // navigation.navigate('Home', { role: 'client' }); // Need to update types if passing params
            navigation.navigate('Home');
        }, 1000);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Bon retour !</Text>
                    <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="exemple@email.com"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <Text style={styles.label}>Mot de passe</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="********"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <Button title="Se connecter" onPress={handleLogin} loading={loading} style={styles.marginTop} />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.linkText}>Pas encore de compte ? </Text>
                    <Text style={styles.linkAction} onPress={() => navigation.navigate('Onboarding')}>S'inscrire</Text>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        padding: theme.spacing.l,
        justifyContent: 'center',
    },
    header: {
        marginBottom: theme.spacing.xl,
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
        marginBottom: theme.spacing.xl
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
    marginTop: {
        marginTop: theme.spacing.m
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
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
