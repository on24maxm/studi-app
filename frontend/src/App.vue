<script setup lang="ts"></script>

<template>
  <header>
    <nav>
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
