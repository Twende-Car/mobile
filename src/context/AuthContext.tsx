import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthFailureCallback } from '../constants/api';

interface AuthContextData {
    user: any | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (userData: any) => Promise<void>;
    registerDriver: (formData: FormData) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStorageData() {
            const storageToken = await AsyncStorage.getItem('@Divocab:token');
            const storageUser = await AsyncStorage.getItem('@Divocab:user');

            if (storageToken && storageUser) {
                setToken(storageToken);
                setUser(JSON.parse(storageUser));
                api.defaults.headers.common['Authorization'] = `Bearer ${storageToken}`;
            }
            setLoading(false);
        }
        loadStorageData();
    }, []);

    useEffect(() => {
        setAuthFailureCallback(() => {
            setToken(null);
            setUser(null);
        });
    }, []);

    const login = async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, refreshToken, user: userData } = response.data;

        await AsyncStorage.setItem('@Divocab:token', token);
        await AsyncStorage.setItem('@Divocab:user', JSON.stringify(userData));
        if (refreshToken) {
            await AsyncStorage.setItem('@Divocab:refreshToken', refreshToken);
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setToken(token);
        setUser(userData);
    };

    const register = async (userData: any) => {
        const response = await api.post('/auth/register', userData);
        const { token, refreshToken, user: newUser } = response.data;

        if (token) {
            await AsyncStorage.setItem('@Divocab:token', token);
            await AsyncStorage.setItem('@Divocab:user', JSON.stringify(newUser));
            if (refreshToken) {
                await AsyncStorage.setItem('@Divocab:refreshToken', refreshToken);
            }
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setToken(token);
            setUser(newUser);
        }
    };

    const registerDriver = async (formData: FormData) => {
        const response = await api.post('/auth/register-driver', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        // We don't automatically login drivers because they need approval
        return response.data;
    };

    const logout = async () => {
        await AsyncStorage.multiRemove(['@Divocab:token', '@Divocab:user', '@Divocab:refreshToken']);
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, registerDriver, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
