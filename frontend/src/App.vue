<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <header>
    <nav v-if="!route.meta.hideNavbar">
      <router-link to="/login">Login</router-link> |
      <router-link to="/register">Registrieren</router-link>
    </nav>
  </header>

  <main>
    <router-view></router-view>
  </main>

  <footer>
    </footer>
</template>

<style scoped></style>