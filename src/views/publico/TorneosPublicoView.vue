<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTorneosStore } from '@/stores/torneos'
import { Trophy, Calendar, Users, Award, ArrowRight } from 'lucide-vue-next'

const torneosStore = useTorneosStore()
const router = useRouter()

onMounted(() => torneosStore.fetchTorneos())

const estadoConfig: Record<string, { label: string; classes: string }> = {
  en_curso:   { label: 'En curso',   classes: 'bg-matchx-accent-green text-white border border-matchx-accent-green/30' },
  programado: { label: 'Próximamente', classes: 'bg-blue-500 text-white border border-blue-500/30' },
  finalizado: { label: 'Finalizado', classes: 'bg-matchx-text-muted text-white border border-matchx-text-muted/20' },
  cancelado:  { label: 'Cancelado',  classes: 'bg-matchx-accent-orange text-white border border-matchx-accent-orange/30' },
}

const modalidadColor: Record<string, string> = {
  F5:  'bg-matchx-accent-orange text-white',
  F7:  'bg-blue-500 text-white',
  F11: 'bg-purple-500 text-white',
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

const verPosiciones = (torneoId: number) =>
  router.push({ path: '/publico/posiciones', query: { torneo: torneoId } })

const verFixture = (torneoId: number) =>
  router.push({ path: '/publico/fixture', query: { torneo: torneoId } })
</script>

<template>
  <div class="space-y-8">
    <!-- Hero -->
    <div class="text-center py-6 space-y-3">
      <div class="flex items-center justify-center gap-2 mb-2">
        <div class="h-px w-12 bg-matchx-accent-green/40" />
        <span class="text-xs font-semibold text-matchx-accent-green uppercase tracking-widest">Temporada 2026</span>
        <div class="h-px w-12 bg-matchx-accent-green/40" />
      </div>
      <h1 class="text-4xl md:text-5xl font-black text-matchx-text-primary" style="font-family: 'Fira Code', monospace; letter-spacing: -0.03em">
        Torneos <span class="text-matchx-accent-green">Activos</span>
      </h1>
      <p class="text-matchx-text-secondary text-base max-w-lg mx-auto">
        Sigue en tiempo real las competencias de fútbol sala en Colombia.
      </p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="torneosStore.loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="i in 3"
        :key="i"
        class="bg-matchx-bg-surface rounded-xl border border-matchx-border-base overflow-hidden animate-pulse"
      >
        <div class="h-36 bg-matchx-bg-elevated" />
        <div class="p-4 space-y-3">
          <div class="h-4 bg-matchx-bg-elevated rounded w-2/3" />
          <div class="h-3 bg-matchx-bg-elevated rounded w-full" />
          <div class="h-3 bg-matchx-bg-elevated rounded w-4/5" />
        </div>
      </div>
    </div>

    <!-- Torneos grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <article
        v-for="torneo in torneosStore.torneos"
        :key="torneo.id"
        class="bg-matchx-bg-surface rounded-xl border border-matchx-border-base overflow-hidden
               hover:border-matchx-accent-green/40 transition-all duration-200 group"
      >
        <!-- Image -->
        <div class="relative h-36 overflow-hidden bg-matchx-bg-elevated">
          <img
            :src="torneo.imagen_url"
            :alt="torneo.nombre"
            class="w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity duration-200"
          />
          <!-- Badges over image -->
          <div class="absolute top-3 left-3 flex gap-2">
            <span
              class="text-xs font-bold px-2 py-0.5 rounded"
              :class="modalidadColor[torneo.modalidad_codigo] ?? 'bg-matchx-text-muted/15 text-matchx-text-muted'"
            >
              {{ torneo.modalidad_codigo }}
            </span>
            <span
              class="text-xs font-semibold px-2 py-0.5 rounded"
              :class="estadoConfig[torneo.estado]?.classes ?? ''"
            >
              {{ estadoConfig[torneo.estado]?.label ?? torneo.estado }}
            </span>
          </div>
        </div>

        <!-- Content -->
        <div class="p-4 space-y-3">
          <h2 class="font-bold text-matchx-text-primary text-base leading-tight group-hover:text-matchx-accent-green transition-colors">
            {{ torneo.nombre }}
          </h2>
          <p class="text-matchx-text-muted text-sm leading-relaxed line-clamp-2">
            {{ torneo.descripcion }}
          </p>

          <div class="space-y-1.5 pt-1">
            <div class="flex items-center gap-2 text-xs text-matchx-text-muted">
              <Calendar class="w-3.5 h-3.5 shrink-0" :stroke-width="1.75" />
              <span>{{ formatDate(torneo.fecha_inicio) }} → {{ formatDate(torneo.fecha_fin) }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-matchx-text-muted">
              <Users class="w-3.5 h-3.5 shrink-0" :stroke-width="1.75" />
              <span>Hasta {{ torneo.max_equipos }} equipos</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-matchx-accent-green font-semibold">
              <Award class="w-3.5 h-3.5 shrink-0" :stroke-width="1.75" />
              <span>{{ torneo.premio }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 pt-2 border-t border-matchx-border-base">
            <button
              @click="verPosiciones(torneo.id)"
              class="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium
                     text-matchx-text-secondary hover:text-matchx-text-primary hover:bg-matchx-bg-elevated
                     transition-colors cursor-pointer"
            >
              <Trophy class="w-3.5 h-3.5" :stroke-width="1.75" />
              Posiciones
            </button>
            <button
              @click="verFixture(torneo.id)"
              class="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium
                     text-matchx-text-secondary hover:text-matchx-text-primary hover:bg-matchx-bg-elevated
                     transition-colors cursor-pointer"
            >
              <ArrowRight class="w-3.5 h-3.5" :stroke-width="1.75" />
              Fixture
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- Empty state -->
    <div
      v-if="!torneosStore.loading && torneosStore.torneos.length === 0"
      class="flex flex-col items-center gap-3 py-16 text-center"
    >
      <Trophy class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-muted">No hay torneos disponibles</p>
    </div>
  </div>
</template>
