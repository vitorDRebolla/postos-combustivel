<template>
  <v-app>
    <v-app-bar color="primary" flat>
      <v-app-bar-title>Postos de Combustível</v-app-bar-title>
    </v-app-bar>

    <v-main>
      <PostosPage />
    </v-main>
  </v-app>
</template>

<script setup>
import PostosPage from './components/PostosPage.vue'
</script>
