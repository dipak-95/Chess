import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// REPLACE WITH YOUR PC'S IP ADDRESS (Run 'ipconfig' in terminal to find IPv4)
// Emulator uses 10.0.2.2 usually, but for physical device use LAN IP.
// Production Domain with HTTPS (Root Domain)
export const API_URL = 'https://pearlgems.store/api';
export const SOCKET_URL = 'https://pearlgems.store';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
        config.headers['x-auth-token'] = token;
    }
    return config;
});

export const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.token) {
        await AsyncStorage.setItem('token', res.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
};

export const signup = async (gamingName, email, password) => {
    const res = await api.post('/auth/signup', { gamingName, email, password });
    if (res.data.token) {
        await AsyncStorage.setItem('token', res.data.token);
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
};

export const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
};

export default api;
