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
    getDeckById(id: number) {
    return apiClient.get(`/decks/${id}`);
    },
    getCardsForDeck(deckId: number) {
    return apiClient.get(`/decks/${deckId}/cards`);
    },
    createCard(deckId: number, front: string, back: string) {
    return apiClient.post(`/decks/${deckId}/cards`, { front, back });
    },
    updateCard(cardId: number, front: string, back: string, deckId: number) {
    return apiClient.patch(`/decks/${deckId}/cards/${cardId}`, { front, back });
    },
    deleteCard(cardId: number, deckId: number) {
    return apiClient.delete(`/decks/${deckId}/cards/${cardId}`);
    },
    startLearningSession(deckId: number) {
    return apiClient.post(`/decks/${deckId}/learning-session/start`, { deckId });
    },
    rateCard(cardId: number, rating: "nochmal" | "mittel" | "gut") {
    return apiClient.post(`/learning-session/rate`, { cardId, rating });
    }
}