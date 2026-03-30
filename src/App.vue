<script setup lang="ts">
import { onBeforeMount } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Initialize auth on app load
onBeforeMount(() => {
  authStore.initSession()
})
</script>

<template>
  <div class="min-h-screen bg-matchx-bg-base text-matchx-text-primary">
    <RouterView />
  </div>
</template>

<style>
/* Global styles */
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}
</style>
