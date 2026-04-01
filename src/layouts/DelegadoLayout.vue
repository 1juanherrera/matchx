<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Wifi, WifiOff } from 'lucide-vue-next'
import { useDelegadoStore } from '@/stores/delegado'

const router = useRouter()
const delegadoStore = useDelegadoStore()

const handleOnline = () => delegadoStore.setOnline(true)
const handleOffline = () => delegadoStore.setOnline(false)

onMounted(async () => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  await delegadoStore.initDB()
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})
</script>

<template>
  <div class="min-h-screen bg-matchx-bg-base flex flex-col">
    <!-- Header fijo -->
    <header class="fixed top-0 left-0 right-0 z-30 bg-matchx-bg-surface border-b border-matchx-border-base">
      <div class="flex items-center gap-3 px-4 py-3">
        <!-- Botón volver -->
        <button
          @click="router.push('/delegado/partidos')"
          class="p-2 rounded-lg text-matchx-text-secondary hover:text-matchx-text-primary
                 hover:bg-matchx-bg-elevated transition-colors duration-200 cursor-pointer shrink-0"
          aria-label="Volver a mis partidos"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>

        <!-- Título -->
        <div class="flex-1 min-w-0">
          <p class="text-[10px] font-semibold text-matchx-text-muted uppercase tracking-widest">
            Mesa de Control
          </p>
          <p v-if="delegadoStore.partidoActivo" class="text-sm font-bold text-matchx-text-primary leading-tight">
            Jornada {{ delegadoStore.partidoActivo.jornada }}
          </p>
        </div>

        <!-- Indicador de conexión -->
        <div class="shrink-0">
          <!-- En línea -->
          <div v-if="delegadoStore.online" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-matchx-accent-green/10 border border-matchx-accent-green/20">
            <Wifi class="w-3.5 h-3.5 text-matchx-accent-green" />
            <span class="text-[11px] font-semibold text-matchx-accent-green">EN LÍNEA</span>
          </div>

          <!-- Offline -->
          <div v-else class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-matchx-accent-orange/10 border border-matchx-accent-orange/20">
            <WifiOff class="w-3.5 h-3.5 text-matchx-accent-orange" />
            <span class="text-[11px] font-semibold text-matchx-accent-orange">OFFLINE</span>
            <span
              v-if="delegadoStore.colaOffline.length > 0"
              class="bg-matchx-accent-orange text-white text-[10px] font-bold rounded-full w-4 h-4
                     flex items-center justify-center leading-none"
            >
              {{ delegadoStore.colaOffline.length }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <!-- Contenido (padding-top = header ~57px) -->
    <main class="flex-1 pt-[57px]">
      <RouterView />
    </main>
  </div>
</template>
