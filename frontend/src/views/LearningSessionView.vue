<template>
  <nav class="bg-[#0F2937] w-full">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-end">
                <router-link to="/dashboard" class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93] text-wrap">Zum
                    Dashboard</router-link>
                  <router-link :to="`/decks/${deckId}`" class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93] text-wrap">Zum Deck</router-link>
                <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 outline-2 outline-[#B88A93]"
                    @click="logout">Logout</button>
            </div>
        </div>
    </nav>
    <div class="learning-session">
    <div v-if="isLoading">Lade Lernsitzung...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else-if="currentCard">
      <div class="card-display flex flex-col justify-center items-center w-screen mt-10">
        <p>Vorderseite:</p>
        <div class="h-[300px] w-[650px] card-side front text-center border-2 border-gray-300 mb-5 p-4 rounded-lg">
          {{ currentCard.front }}
        </div>
        <p v-if="showBack">Rückseite:</p>
        <div v-if="showBack" class="h-[300px] w-[650px] card-side back text-center border-2 border-gray-300 mb-5 p-4 rounded-lg">
          {{ currentCard.back }}
        </div>
        <div v-if="!showBack" class="h-[300px] w-[650px] mb-5 p-4">
        </div>
      </div>

      <div class="controls flex justify-center items-center">
        <button v-if="!showBack" class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-[#B88A93]" @click="revealCard">Aufdecken</button>
        <div v-if="showBack" class="rating-buttons ">
          <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-red-500" @click="rate('nochmal')">Nochmal (1m)</button>
          <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-yellow-500" @click="rate('mittel')">Mittel (6m)</button>
          <button class="text-white p-2 rounded-lg m-2 pl-8 pr-8 bg-green-500" @click="rate('gut')">Gut</button>
        </div>
      </div>
    </div>
    <div v-else>
      <p>Glückwunsch! Alle Karten für heute gelernt.</p>
      <router-link to="/dashboard">Zurück zum Dashboard</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiService from '@/services/apiService';
import type { Card } from '@/models/card';
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();

const route = useRoute();
const router = useRouter();
const isLoading = ref(true);
const error = ref<string | null>(null);
const currentCard = ref<Card | null>(null);
const showBack = ref(false);

const deckId = computed(() => Number(route.params.deckId));

const startSession = async () => {
  if (!deckId.value) {
    error.value = "Keine Stapel-ID gefunden.";
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  error.value = null;
  showBack.value = false;
  try {
    const response = await apiService.startLearningSession(deckId.value);
    currentCard.value = response.data.nextCard || response.data;
    if (!currentCard.value) {
      console.log("Keine Karten zum Lernen vorhanden.");
    }
  } catch (err) {
    console.error("Fehler beim Starten der Lernsitzung:", err);
    error.value = "Lernsitzung konnte nicht gestartet werden.";
  } finally {
    isLoading.value = false;
  }
};

const revealCard = () => {
  showBack.value = true;
};

const rate = async (rating: "nochmal" | "mittel" | "gut") => {
  if (!currentCard.value) return;

  isLoading.value = true;
  error.value = null;
  showBack.value = false;

  try {
    const response = await apiService.rateCard(currentCard.value.id, rating);
    currentCard.value = response.data.nextCard;
    if (!currentCard.value) {
      console.log("Sitzung beendet.");
    }
  } catch (err) {
    console.error("Fehler beim Bewerten der Karte:", err);
    error.value = "Karte konnte nicht bewertet werden.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  startSession();
});

const logout = () => {
    authStore.logout();
    router.push('/login');
}
</script>