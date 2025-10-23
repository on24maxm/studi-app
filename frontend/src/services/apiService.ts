import axios from 'axios';
import { useAuthStore } from '../stores/authStore.ts';

const apiClient = axios.create({
    baseURL: 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const authStore = useAuthStore();
        const token = authStore.token;
        if(token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
        },
        (error) => {
            return Promise.reject(error);
        }
)

export default {
    register(name: string, password: string) {
        return apiClient.post('/users/register', {name, password});
    },
    login(name: string, password: string) {
        return apiClient.post('/users/login', {name, password});
    },
    getDecks() {
        return apiClient.get('/decks');
    },
    createDeck(name: string) {
        return apiClient.post('/decks', { name });
    },
    updateDeck(id: number, name: string) {
    return apiClient.patch(`/decks/${id}`, { name });
  },
  deleteDeck(id: number) {
    return apiClient.delete(`/decks/${id}`);
  },
}