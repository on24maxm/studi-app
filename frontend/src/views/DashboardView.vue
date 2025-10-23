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

const newDeckName = ref('');
const isCreatingDeck = ref(false);
const createDeckError = ref<string | null>(null);
const openDeckModal = ref(false);

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
        if (error.response && error.response.status === 401) {
            authStore.logout();
            router.push('/login');
        }
    }
    finally {
        isLoading.value = false;
    }
}

const openCloseModalCreateDeck = () => {
    if(openDeckModal.value === false) {
        openDeckModal.value = true;
        return;
    }
    openDeckModal.value = false;
    createDeckError.value = null;
    newDeckName.value = '';
}


const createNewDeck = async () => {
    if(!newDeckName.value.trim()) return;

    isCreatingDeck.value = true;
    createDeckError.value = null;

    try {
        const response = await apiService.createDeck(newDeckName.value);
        console.log('😈 response value: ' + response.data)
        decks.value.push(response.data);
        newDeckName.value = '';
        await fetchDecks();
        openCloseModalCreateDeck();
    } catch (error: any) {
        console.error('Ein Fehler ist aufgetreten: ', error);
        createDeckError.value = 'Ein Fehler ist aufgetreten';
    } finally {
        isCreatingDeck.value = false;
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
    <div v-if="openDeckModal" class="fixed inset-0 z-50 flex flex-col justify-center items-center">
        <div class="w-[500px bg-gray-600 p-10 rounded-lg flex flex flex-col justify-center">
        <form @submit.prevent="createNewDeck" class="">
            <input class="text-white outline-2 outline-white p-2 rounded-lg" type="text" v-model="newDeckName" placeholder="Stapelname eingeben" required></input>
            <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93]" type="submit" :disabled="isCreating"> {{ isCreating ? 'Erstelle...' : 'Erstellen'}}</button>
            <p v-if="createDeckError" class="text-red-500 font-sans text-sm">{{ createDeckError }}</p>
        </form>
        <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 outline-2 outline-[#B88A93]" @click="openCloseModalCreateDeck">Schließen</button>
        </div>

    </div>
    <div :class="{ 'blur-lg': openDeckModal, 'pointer-events-none': openDeckModal }">
    <nav class="bg-[#0F2937] w-full"> <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-end"> 
                <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 outline-2 outline-[#B88A93]" @click="logout">Logout</button>
                <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93] text-wrap" @click="openCloseModalCreateDeck">Stapel hinzufügen</button>
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
    </div>
</template>