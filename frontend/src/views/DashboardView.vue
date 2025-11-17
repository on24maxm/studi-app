<script setup lang="ts">
import {ref, onMounted} from 'vue';
import {useRouter} from 'vue-router';
import {useAuthStore} from '../stores/authStore';
import apiService from '../services/apiService.ts';
import type { Deck } from '../models/deck.ts'

const router = useRouter();
const authStore = useAuthStore();


const renamingDeck = ref<Deck | null>(null);
const renameName = ref('');
const renameError = ref<string | null>(null);


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

const startRename = (deck: Deck) => {
    renamingDeck.value = deck;
    renameName.value = deck.name;
    renameError.value = null;
}

const cancelRename = () => {
    renamingDeck.value = null;
}

const confirmRename = async () => {
    if(!renameName.value.trim()) return;

    renameError.value = null;
    const deckToUpdate = renamingDeck.value;

    if(!deckToUpdate) return;

    try {
        const response = await apiService.updateDeck(deckToUpdate.id, renameName.value);

        const index = decks.value.findIndex((deck: Deck) => deck.id === deckToUpdate.id);
        if (index !== -1) {
            decks.value[index] = response.data;
        }
        await fetchDecks();
        cancelRename();
    }
    catch(error: any) {
        console.error('Ein Fehler ist aufgetreten: ', error);
        renameError.value = 'Ein Fehler ist aufgetreten';
    }
}

const deleteDeck = async (deckId: number) => {
    if(!confirm('Sicher, dass du diesen Stapel löschen willst?')) {
        return;
    }

    try {
        await apiService.deleteDeck(deckId);
        decks.value = decks.value.filter((deck: Deck) => deck.id !== deckId);
        await fetchDecks();
    }
    catch(error: any) {
        console.error('Ein Fehler beim löschen ist aufgetreten: ', error);
        renameError.value = 'Ein Fehler beim löschen ist aufgetreten';
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
            <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93]" type="submit" :disabled="isCreatingDeck"> {{ isCreatingDeck ? 'Erstelle...' : 'Erstellen'}}</button>
            <p v-if="createDeckError" class="text-red-500 font-sans text-sm">{{ createDeckError }}</p>
        </form>
        <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 outline-2 outline-[#B88A93]" @click="openCloseModalCreateDeck">Schließen</button>
        </div>
    </div>
    <div v-if="renamingDeck" class="fixed inset-0 z-50 flex flex-col justify-center items-center">
            <div class="w-[500px bg-gray-600 p-10 rounded-lg flex flex flex-col justify-center">
            <h3>Stapel umbenennen</h3>
            <input class="text-white outline-2 outline-white p-2 rounded-lg" type="text" v-model="renameName"></input>
            <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93]" @click="confirmRename">Speichern</button>
            <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93]" @click="cancelRename">Abbrechen</button>
            <p v-if="renameError">{{ renameError }}</p>
            </div>
        </div>
    <div :class="{ 'blur-lg': openDeckModal || renamingDeck, 'pointer-events-none': openDeckModal || renamingDeck }">
    <nav class="bg-[#0F2937] w-full"> <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-end"> 
                <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93] text-wrap" @click="openCloseModalCreateDeck">Stapel hinzufügen</button>
                <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 outline-2 outline-[#B88A93]" @click="logout">Logout</button>
            </div>
        </div>
    </nav>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4"> 
        <div v-if="isLoading">Lade Stapel...</div>
        <div v-else>
            <ul class="">
                <li class="flex font-sans text-[20px] flex-col justify-center flex-start pl-15 w-full gap-8 py-7 mb-5 bg-[#0F2937] rounded-2xl text-white" v-for="deck in decks" :key="deck.id">
                    <router-link :to="`/decks/${deck.id}`">{{ deck.name  }}</router-link>
                <div class="flex gap-2">
                    <button class="text-white rounded-lg m-2 pl-8 pr-8 bg-[#B88A93] text-wrap" @click="startRename(deck)">Umbennenen</button>
                    <button class="text-white rounded-lg m-2 pl-8 pr-8 outline-2 outline-[#B88A93]" @click="deleteDeck(deck.id)">Löschen</button>
                </div>
                </li>
            </ul>
            <p v-if="decks.length === 0 ">Du hast noch keine Stapel.
            </p>
        </div>
    </div>
    </div>
</template>