import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your local machine's IP address if testing on a physical device.
// For Android emulator, 10.0.2.2 points to localhost.
export const API_URL = 'https://twendeapi.afrimetrik.com';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

let authFailureCallback: () => void = () => {};
let refreshPromise: Promise<string | null> | null = null;

export function setAuthFailureCallback(cb: () => void) {
    authFailureCallback = cb;
}

async function refreshAuthToken(): Promise<string | null> {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
        try {
            const refreshToken = await AsyncStorage.getItem('@Divocab:refreshToken');
            if (!refreshToken) return null;
            const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, {
                headers: { 'Content-Type': 'application/json' },
            });
            const { token, refreshToken: newRT, user } = res.data;
            await AsyncStorage.setItem('@Divocab:token', token);
            if (newRT) await AsyncStorage.setItem('@Divocab:refreshToken', newRT);
            if (user) await AsyncStorage.setItem('@Divocab:user', JSON.stringify(user));
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            return token;
        } catch {
            return null;
        } finally {
            refreshPromise = null;
        }
    })();
    return refreshPromise;
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (originalRequest.__isRefreshRequest) {
            return Promise.reject(error);
        }
        const isAuthError = error.response?.status === 401 || error.response?.status === 403;
        if (!isAuthError || originalRequest._retry) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;
        const newToken = await refreshAuthToken();
        if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
        }

        await AsyncStorage.multiRemove(['@Divocab:token', '@Divocab:user', '@Divocab:refreshToken']);
        authFailureCallback();
        return Promise.reject(error);
    }
);

export default api;
