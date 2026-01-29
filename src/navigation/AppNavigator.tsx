import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HistoryDetailScreen } from '../screens/HistoryDetailScreen';
import { RootStackParamList } from './types';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
    const { loading, token } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const AuthNavigator = () => (
        <Stack.Navigator
            initialRouteName={"Onboarding"}
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#FFFFFF' }
            }}
        >
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    )

    const AppNavigator = () => (
        <Stack.Navigator
            initialRouteName={"Home"}
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#FFFFFF' }
            }}
        >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} />
        </Stack.Navigator>
    )

    return (
        <NavigationContainer>
            {token ? <AppNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
};
