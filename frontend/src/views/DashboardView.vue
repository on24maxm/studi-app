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

const checkIfLogin = () => {
    if(!authStore.isAuthenticated) {
        router.push('/login');
    }
}


onMounted(()=> {
    checkIfLogin();
    fetchDecks();
})

const logout = () => {
    authStore.logout();
    router.push('login');
}



</script>

<template>
    <nav class="bg-[#0F2937] w-full"> <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-end"> 
                <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 outline-2 outline-[#B88A93]" @click="logout">Logout</button>
            </div>
        </div>
    </nav>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4"> 
        <div v-if="isLoading">Lade Stapel...</div>
        <div v-else>
            <ul class="">
                <li class="flex font-sans text-[20px] flex-col justify-center flex-start pl-15 w-full gap-8 py-7 mb-5 bg-[#0F2937] rounded-2xl text-white" v-for="deck in decks" :key="deck.id">{{ deck.name }}</li>
            </ul>
            <p v-if="decks.length === 0 ">Du hast noch keine Stapel.
            </p>
        </div>
    </div>
</template>