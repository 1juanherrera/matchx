<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const handleGoBack = () => {
  router.back()
}

const handleGoHome = () => {
  router.push('/login')
}
</script>

<template>
  <div class="space-y-6 text-center">
    <div class="space-y-2">
      <h1 class="text-4xl font-bold text-matchx-accent-orange">403</h1>
      <h2 class="text-2xl font-semibold text-matchx-text-primary">Acceso Denegado</h2>
      <p class="text-matchx-text-muted">No tienes permisos para acceder a esta sección</p>
    </div>

    <div class="flex gap-4 justify-center pt-4">
      <button
        @click="handleGoBack"
        class="px-6 py-2 rounded-lg border-2 border-matchx-border-base bg-matchx-bg-surface hover:border-matchx-accent-green transition-all"
      >
        Volver atrás
      </button>
      <button
        @click="handleGoHome"
        class="px-6 py-2 rounded-lg bg-matchx-accent-green text-matchx-bg-base hover:bg-matchx-accent-green/90 transition-all"
      >
        Ir a Login
      </button>
    </div>
  </div>
</template>
