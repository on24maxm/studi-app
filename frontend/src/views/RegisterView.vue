<script setup lang="ts">
import {ref} from 'vue'
import {useRouter} from 'vue-router'
import {useAuthStore} from '../stores/authStore'
import apiService from '../services/apiService.ts'



const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const errorMessage = ref('');

const handleRegister = async () => {
    errorMessage.value = '';
    try {
        console.log('Versuche register mit username: ' + username.value + ' und password: ' + password.value);
        await apiService.register(username.value, password.value);
        router.push('/login');
    }
    catch(error) {
        console.error('Registrierung fehlgeschlagen!', error);
        errorMessage.value = 'Registrierung fehlgeschlagen. Versuchen Sie es erneut.';
    }
}

</script>
<template>
    <div class="flex flex-col justify-center items-center w-screen h-screen gap-8 pb-20 bg-gray-100">
        <h1 class="font-sans text-6xl">Erstmal Konto erstellen min jung</h1>
        
        <form @submit.prevent="handleRegister" class="flex flex-col items-center">
            <input class="border m-2 p-1" placeholder="Benutzername" v-model="username"></input>
            <input class="border m-2 p-1" placeholder="Passwort" type="password" v-model="password"></input>
            <button type="submit" class="bg-blue-500 text-white p-2 rounded m-2">Login</button>
            <p v-if="errorMessage" class="text-red-500 font-sans text-sm">{{ errorMessage }}</p>
        </form>
        <p>Du hast bereits ein Konto? <router-link to="/login" class="text-blue-500 underline">Jetzt Einloggen!</router-link></p>
    </div>
</template>