<template>
    <div v-if="createCardModal" class="fixed inset-0 z-50 flex flex-col justify-center items-center">
        <div class="w-[850px bg-gray-600 p-10 rounded-lg flex flex flex-col">
        <form @submit.prevent="addCard" class="flex flex-col gap-y-4 w-full">
            <textarea class="min-h-[100px] min-w-[600px] text-white outline-2 outline-white p-2 rounded-lg text-wrap" v-model="cardFrontText" placeholder="Vorderseite eingeben" required></textarea>
            <textarea class="min-h-[100px] min-w-[600px] text-white outline-2 outline-white p-2 rounded-lg" v-model="cardBackText" placeholder="Rückseite eingeben" required></textarea>
            <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93]" type="submit" :disabled="isCreatingCard"> {{ isCreatingCard ? 'Erstelle...' : 'Erstellen'}}</button>
            <p v-if="createCardError" class="text-red-500 font-sans text-sm">{{ createCardError }}</p>
        </form>
        <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 outline-2 outline-[#B88A93]" @click="openCloseModalCreateCard">Schließen</button>
        <p v-if="createCardSuccess" class="text-green-500 font-sans text-sm">Karte erfolgreich hinzugefügt!</p>
        </div>
    </div>
    <div :class="{ createCardModal, 'pointer-events-none': createCardModal }">
        <nav class="bg-[#0F2937] w-full">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-end">
                <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93]" @click="startLearning">Lernsitzung starten</button>
                <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93]" @click="openCloseModalCreateCard">Neue Karte hinzufügen</button>
                <router-link to="/dashboard" class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93] text-wrap">Zum
                    Dashboard</router-link>
                <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 outline-2 outline-[#B88A93]"
                    @click="logout">Logout</button>
            </div>
        </div>
    </nav>
    <div class="flex">
        <div v-if="deckIsLoading || cardsLoading">Lade Stapel...</div>
        <div v-else-if="error">Ein Fehler ist aufgetreten</div>
        <div v-else-if="deck" class="w-[500px] h-full pl-2">
            <h1 class="font-sans text-2xl pb-2">{{ deck.name }}</h1>
            <h2 class="font-sans">Karten in diesem Stapel:</h2>
            <ul>
                <li v-for="card in cards" :key="card.id" @click="showCardDetailsFunc(card)" class="border-2 border-gray-300 mb-2 rounded-lg">
                    <div class="card-front pl-2" >Vorderseite: {{ card.front }}</div>
                    <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93]" @click="deleteCard(card.id)">Löschen</button>
                </li>
            </ul>
            <p v-if="cards.length === 0">Dieser Stapel enthält noch keine Karten.</p>
        </div>
        <div v-else>
            <p>Stapel nicht gefunden.</p>
        </div>
        <div v-if="showCardDetails" class="flex-1 h-full pl-8 pt-2 overflow-y-auto">
            <h2 class="font-sans text-2xl pb-2">Kartendetails</h2>
            <h3>Vorderseite</h3>
            <textarea class="min-h-[100px] min-w-[600px] outline-2 outline-black p-2 rounded-lg" v-model="cardDetailViewFront">{{ cardDetailViewFront }}</textarea>
            <h3>Rückseite</h3>
            <textarea class="min-h-[100px] min-w-[600px] outline-2 outline-black p-2 rounded-lg" v-model="cardDetailViewBack">{{ cardDetailViewBack }}</textarea>
            <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93]" @click="confirmEditCard">Änderungen speichern</button>
        </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiService from '../services/apiService';
import { useAuthStore } from '../stores/authStore';
import type { Deck } from '../models/deck';
import type { Card } from '../models/card';

const router = useRouter();
const authStore = useAuthStore();

const route = useRoute();
const deck = ref<Deck | null>(null);
const cards = ref<Card[]>([]);
const deckIsLoading = ref(true);
const cardsLoading = ref(true);
const error = ref<string | null>(null);
const showCardDetails = ref<boolean>(false);

const cardFrontText = ref('');
const cardBackText = ref('');
const isCreatingCard = ref(false);
const createCardError = ref<string | null>(null);
const createCardModal = ref(false);
const createCardSuccess = ref(false);

const editingCard = ref<Card | null>(null);
const cardDetailViewFront = ref<string>('');
const cardDetailViewBack = ref<string>('');
const editCardError = ref<string | null>(null);


const deckId = computed(() => Number(route.params.deckId));

const showCardDetailsFunc = (card: Card) => {
    if(showCardDetails.value === false) {
        showCardDetails.value = true;
        editingCard.value = card;
        cardDetailViewFront.value = card.front;
        cardDetailViewBack.value = card.back;
        return;
    }
    showCardDetails.value = false;
}

const confirmEditCard = async () => {
    if(!editingCard.value || !cardDetailViewBack.value.trim() || !cardDetailViewFront.value.trim() || !deck.value) return;

    editCardError.value = null;
    const cardToUpdate = editingCard.value;

    try {
        const response = await apiService.updateCard(cardToUpdate.id, cardDetailViewFront.value, cardDetailViewBack.value, deckId.value);
        fetchCards();
        showCardDetails.value = false;
        editingCard.value = null;
    } catch (error: any) {
        console.error('Fehler beim Karte ändern', error);
        editCardError.value = 'Fehler beim Karte ändern';
    }
}

const deleteCard = async (cardId: number) => {
    if (!confirm('Sicher, dass du diese Karte löschen möchtest?') || !deck.value) return;

    try {
        await apiService.deleteCard(cardId, deckId.value);
        fetchCards();
    } catch (err: any) {
        console.error("Fehler beim Löschen der Karte:", err);
        alert("Karte konnte nicht gelöscht werden.");
    }
};

const addCard = async () => {
    if (!cardFrontText.value.trim() || !cardBackText.value.trim() || !deckId.value) {
      createCardError.value = "Vorder- und Rückseite dürfen nicht leer sein.";
      return;
    }

    isCreatingCard.value = true;
    createCardError.value = null;

    try {
        const response = await apiService.createCard(deckId.value, cardFrontText.value, cardBackText.value);
        cards.value.push(response.data);
        cardFrontText.value = '';
        cardBackText.value = '';
        await fetchCards();
    } catch (error: any) {
        console.error('Ein Fehler ist aufgetreten: ', error);
        createCardError.value = 'Ein Fehler ist aufgetreten';
    } finally {
        isCreatingCard.value = false;
        createCardSuccess.value = true;
        setTimeout(() => {
            createCardSuccess.value = false;
        }, 3000);
    }
}

const openCloseModalCreateCard = () => {
    if(createCardModal.value === false) {
        createCardModal.value = true;
        return;
    }
    createCardModal.value = false;
    createCardError.value = null;
    cardFrontText.value = '';
    cardBackText.value = '';
}

const fetchCards = async () => {
  if (!deckId.value) return;
  cardsLoading.value = true;
  error.value = null;
  try {
    const response = await apiService.getCardsForDeck(deckId.value);
    cards.value = response.data;
    console.log('cards: ' + cards.value);
  } catch (err) {
    console.error("Fehler beim Laden der Karten:", err);
    error.value = "Karten konnten nicht geladen werden.";
  } finally {
    cardsLoading.value = false;
  }
};

const fetchDeckDetails = async () => {
  if (!deckId.value) return;
  deckIsLoading.value = true;
  error.value = null;
  try {
    const response = await apiService.getDeckById(deckId.value);
    deck.value = response.data;
  } catch (err: any) {
    console.error("Fehler beim Laden des Decks:", err);
    error.value = "Deck konnte nicht geladen werden.";
    if (err.response && err.response.status === 404) {
      error.value = "Stapel nicht gefunden.";
    }
    deck.value = null;
  } finally {
  }
};

const startLearning = async () => {
    if (!deckId.value) return;
    if(cards.value.length === 0) {
        alert("Dieser Stapel enthält noch keine Karten.");
        return;
    }
    console.log(`Starte Lernsitzung für Deck ${deckId.value}`);
    try {
        router.push(`/learn/${deckId.value}`);

    } catch (err) {
        console.error("Fehler beim Starten der Lernsitzung:", err);
        alert("Lernsitzung konnte nicht gestartet werden.");
    }
};


onMounted(async () => {
  await fetchDeckDetails();
  if (deck.value) {
      await fetchCards();
  }
  deckIsLoading.value = false;
});


const logout = () => {
    authStore.logout();
    router.push('/login');
}
</script>