<script setup lang="ts">
import {ref, onMounted} from 'vue';
import {useRouter} from 'vue-router';
import {useAuthStore} from '../stores/authStore';
import apiService from '../services/apiService.ts';
import type { Deck } from '@/backend/src/models/deck.ts'

const router = useRouter();
const authStore = useAuthStore();

const decks = ref<Deck[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

const fetchDecks = async () => {
    isLoading.value = true;
    error.value = null;
    try {
        const response = await apiService.getDecks();
        decks.value = response.data;
    }
    catch(error: any) {
        console.error('Ein Fehler ist aufgetreten: ', error);
        error.value = "Ein Fehler ist aufgetreten";
        if (err.response && err.response.status === 401) {
            authStore.logout();
            router.push('/login');
        }
    }
    finally {
        isLoading.value = false;
    }
}

onMounted(()=> {
    fetchDecks();
})

const logout = () => {
    authStore.logout();
    router.push('login');
}



</script>

<template>
    <h1> Dashboard: </h1>
    <div v-if="isLoading">Lade Stapel...</div>
    <div v-else>
        <h2> Deine Stapel: </h2>
        <ul>
            <li class="flex flex-col justify-center items-center w-screen gap-8 pb-20 bg-gray-100" v-for="deck in decks" :key="deck.id">{{ deck.name }}</li>
        </ul>
        <p v-if="decks.length === 0 ">Du hast noch keine Stapel.
        </p>
        <button class="bg-blue-500 text-white p-2 rounded m-2" @click="logout">Logout</button>
    </div>

</template>