import axios from 'axios';

// Replace with your local machine's IP address if testing on a physical device.
// For Android emulator, 10.0.2.2 points to localhost.
export const API_URL = 'http://192.168.11.103:3000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
