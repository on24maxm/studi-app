<script setup lang="ts">
import {ref, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {useAuthStore} from '../stores/authStore'
import apiService from '../services/apiService.ts'

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const errorMessage = ref('');

onMounted(() => {
    if (authStore.isAuthenticated) {
        router.push('/dashboard');
    }
})

const handlelogin = async () => {
    errorMessage.value = '';
    try {
            const response = await apiService.login(username.value, password.value);
            
            if(response.data && response.data.token) {
                authStore.setToken(response.data.token);
                router.push('/dashboard');
            }
            else{
                errorMessage.value = 'Anmeldung fehlgeschlagen. Versuchen Sie es erneut.';
            }
    }
    catch(error) {
        console.error('Anmeldung fehlgeschlagen!', error);
        errorMessage.value = 'Anmeldung fehlgeschlagen. Versuchen Sie es erneut.';
    }
}

</script>
<template>
    <div class="flex flex-col justify-center items-center w-screen h-screen gap-8 pb-20 bg-gray-100">
        <h1 class="font-sans text-6xl">Erstmal einloggen min jung</h1>
        
        <form @submit.prevent="handlelogin" class="flex flex-col items-center">
            <input class="border m-2 p-1" placeholder="Benutzername" v-model="username"></input>
            <input class="border m-2 p-1" placeholder="Passwort" type="password" v-model="password"></input>
            <button type="submit" class="bg-blue-500 text-white p-2 rounded m-2">Login</button>
            <p v-if="errorMessage" class="text-red-500 font-sans text-sm">{{ errorMessage }}</p>
        </form>
        <p>Noch kein Konto? <router-link to="/register" class="text-blue-500 underline">Registrieren</router-link></p>
    </div>
</template>