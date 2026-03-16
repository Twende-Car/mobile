import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import api from '../constants/api';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Wallet'>;

export const WalletScreen: React.FC<Props> = ({ navigation }) => {
    const [balance, setBalance] = useState<number>(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWalletDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get('/wallet');
            setBalance(response.data.balance);
            setTransactions(response.data.transactions);
        } catch (error) {
            console.error('Error fetching wallet details:', error);
            Alert.alert('Erreur', 'Impossible de charger le portefeuille.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWalletDetails();
    }, []);

    const renderTransactionItem = ({ item }: { item: any }) => (
        <View style={styles.transactionItem}>
            <View style={styles.iconContainer}>
                <Ionicons
                    name={item.type === 'CREDIT' ? "arrow-down-circle" : "arrow-up-circle"}
                    size={24}
                    color={item.type === 'CREDIT' ? theme.colors.secondary : theme.colors.error}
                />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.description}>{item.description}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}</Text>
            </View>
            <Text style={[
                styles.amount,
                { color: item.type === 'CREDIT' ? theme.colors.secondary : theme.colors.error }
            ]}>
                {item.type === 'CREDIT' ? '+' : '-'}{item.amount} Fc
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { justifyContent: 'center' }]}>
                <Text style={styles.title}>Mon Portefeuille</Text>
            </View>

            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Solde actuel</Text>
                <Text style={styles.balanceamount}>{balance.toLocaleString()} Fc</Text>
            </View>

            <Text style={styles.sectionTitle}>Historique des transactions</Text>

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={transactions}
                    renderItem={renderTransactionItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Aucune transaction récente.</Text>
                    }
                    onRefresh={fetchWalletDetails}
                    refreshing={loading}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.inputBackground,
    },
    backButton: {
        marginRight: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    balanceCard: {
        backgroundColor: theme.colors.primary,
        margin: theme.spacing.m,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    balanceLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        marginBottom: 5,
    },
    balanceamount: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: theme.spacing.m,
        marginTop: theme.spacing.s,
        marginBottom: theme.spacing.s,
    },
    listContent: {
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.m,
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.inputBackground,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.inputBackground,
        justifyContent: 'center',
        alignItems: 'center',
    },
    description: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
    },
    date: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    amount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textSecondary,
        marginTop: 20,
    },
});
