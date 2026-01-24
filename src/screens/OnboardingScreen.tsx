import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { theme } from '../theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
    const handleRoleSelect = (role: 'client' | 'driver') => {
        navigation.navigate('Register', { role });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Divocabb</Text>
                    <Text style={styles.subtitle}>Votre course, votre choix.</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Je suis passager</Text>
                    <Text style={styles.cardDescription}>Commandez un trajet en quelques secondes.</Text>
                    <Button title="Continuer comme Passager" onPress={() => handleRoleSelect('client')} />
                </View>

                <View style={styles.spacer} />

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Je suis chauffeur</Text>
                    <Text style={styles.cardDescription}>Conduisez et gagnez de l'argent.</Text>
                    <Button
                        title="Continuer comme Chauffeur"
                        variant="outline"
                        onPress={() => handleRoleSelect('driver')}
                    />
                </View>

                <View style={styles.loginLink}>
                    <Text style={styles.linkText}>Déjà un compte ? </Text>
                    <Text style={styles.linkAction} onPress={() => navigation.navigate('Login')}>Se connecter</Text>
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
        alignItems: 'center',
    },
    title: {
        ...theme.textVariants.header,
        color: theme.colors.primary,
        marginBottom: theme.spacing.s,
    },
    subtitle: {
        ...theme.textVariants.body,
        color: theme.colors.textSecondary,
    },
    card: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.s,
        shadowColor: theme.colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.inputBackground,
    },
    cardTitle: {
        ...theme.textVariants.title,
        fontSize: 20,
        marginBottom: theme.spacing.xs,
    },
    cardDescription: {
        ...theme.textVariants.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.m,
    },
    spacer: {
        height: theme.spacing.m,
    },
    loginLink: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: theme.spacing.l
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
