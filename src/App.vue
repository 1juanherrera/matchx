<script setup lang="ts">
import { onBeforeMount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router    = useRouter()
const route     = useRoute()

onBeforeMount(() => {
  authStore.initSession()
})

// Cuando la sesión se destruye (logout) redirige a /login desde App.vue,
// que siempre está montado, evitando la race condition de un componente
// que se está desmontando llamando a router.replace al mismo tiempo.
watch(
  () => authStore.isAuthenticated,
  async (isAuth) => {
    if (!isAuth) {
      const isPublic =
        route.path === '/login' ||
        route.path.startsWith('/publico') ||
        route.path === '/no-autorizado'
      if (!isPublic) {
        await nextTick()
        router.replace('/login')
      }
    }
  },
)
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
