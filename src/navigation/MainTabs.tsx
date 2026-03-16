import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();

export const MainTabs = () => {
    const { user } = useAuth();
    const isDriver = user?.role === 'driver';

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.inactiveTab,
                tabBarStyle: {
                    backgroundColor: theme.colors.white,
                    borderTopColor: theme.colors.inputBackground,
                    borderTopWidth: 1,
                },
                tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: 'Accueil',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={24} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="History"
                component={HistoryScreen}
                options={{
                    tabBarLabel: 'Historique',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="time" size={24} color={color} />
                    ),
                }}
            />
            {isDriver && (
                <Tab.Screen
                    name="Wallet"
                    component={WalletScreen}
                    options={{
                        tabBarLabel: 'Portefeuille',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="wallet" size={24} color={color} />
                        ),
                    }}
                />
            )}
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profil',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};
