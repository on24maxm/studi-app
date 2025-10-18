import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

interface User {
    id: number;
    username: string;
}

export const useAuthStore = defineStore('auth', () => {
    const token = ref<String | null>(localStorage.getItem('authToken'));
    const user = ref<User | null>(null);

    const isAuthenticated = computed( () => !!token.value);

    function setToken(newToken: string) {
        token.value = newToken;
        localStorage.setItem('authToken', newToken)
    }

    function logout() {
        token.value = null;
        user.value = null;
        localStorage.removeItem('authToken');
    }

    return {
        token,
        user,
        isAuthenticated,
        setToken,
        logout
    }
})