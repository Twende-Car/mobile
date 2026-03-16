import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';

export const ProfileScreen = () => {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Déconnexion',
            'Voulez-vous vraiment vous déconnecter ?',
            [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Déconnexion', style: 'destructive', onPress: logout },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Profil</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={22} color={theme.colors.primary} />
                    <Text style={styles.label}>Nom</Text>
                    <Text style={styles.value}>{user?.name || '—'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="mail-outline" size={22} color={theme.colors.primary} />
                    <Text style={styles.label}>Email</Text>
                    <Text style={styles.value}>{user?.email || '—'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={22} color={theme.colors.primary} />
                    <Text style={styles.label}>Téléphone</Text>
                    <Text style={styles.value}>{user?.phone || user?.phoneNumber || '—'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="car-outline" size={22} color={theme.colors.primary} />
                    <Text style={styles.label}>Rôle</Text>
                    <Text style={[styles.value, styles.roleBadge]}>
                        {user?.role === 'driver' ? 'Chauffeur' : 'Client'}
                    </Text>
                </View>
            </View>

            <View style={styles.footer}>
                <Button
                    title="Se déconnecter"
                    onPress={handleLogout}
                    variant="outline"
                    style={[styles.logoutBtn, { borderColor: theme.colors.error }]}
                    textStyle={{ color: theme.colors.error }}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.inputBackground,
    },
    title: {
        ...theme.textVariants.title,
        fontSize: 22,
    },
    card: {
        margin: theme.spacing.m,
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.l,
        borderWidth: 1,
        borderColor: theme.colors.inputBackground,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.l,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.white,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.inputBackground,
    },
    label: {
        marginLeft: theme.spacing.s,
        fontSize: 14,
        color: theme.colors.textSecondary,
        width: 100,
    },
    value: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text,
    },
    roleBadge: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    footer: {
        padding: theme.spacing.m,
        marginTop: 'auto',
    },
    logoutBtn: {
        backgroundColor: 'transparent',
    },
});
