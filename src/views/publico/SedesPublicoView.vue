<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSedesStore } from '@/stores/sedes'
import { Building2, MapPin, Phone, Mail, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-vue-next'

const sedesStore = useSedesStore()
onMounted(() => sedesStore.fetchSedes())

const expandedSede = ref<number | null>(null)

const toggleSede = (id: number) => {
  expandedSede.value = expandedSede.value === id ? null : id
}

const tipoCancha: Record<string, string> = {
  pasto_natural:   'Pasto Natural',
  pasto_sintetico: 'Pasto Sintético',
  cemento:         'Cemento',
  parquet:         'Parquet',
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-black text-matchx-text-primary" style="font-family: 'Fira Code', monospace; letter-spacing: -0.02em">
        Sedes & <span class="text-matchx-accent-green">Canchas</span>
      </h1>
      <p class="text-matchx-text-muted mt-1 text-sm">Instalaciones donde se juegan los torneos</p>
    </div>

    <!-- Loading -->
    <div v-if="sedesStore.loading" class="space-y-3">
      <div
        v-for="i in 3"
        :key="i"
        class="bg-matchx-bg-surface rounded-xl border border-matchx-border-base p-5 animate-pulse"
      >
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 bg-matchx-bg-elevated rounded-lg shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-matchx-bg-elevated rounded w-1/2" />
            <div class="h-3 bg-matchx-bg-elevated rounded w-3/4" />
            <div class="h-3 bg-matchx-bg-elevated rounded w-1/3" />
          </div>
        </div>
      </div>
    </div>

    <!-- Sedes list -->
    <div v-else class="space-y-3">
      <div
        v-for="sede in sedesStore.sedes"
        :key="sede.id"
        class="bg-matchx-bg-surface rounded-xl border border-matchx-border-base overflow-hidden
               hover:border-matchx-accent-green/30 transition-colors duration-200"
      >
        <!-- Sede header (clickable) -->
        <button
          @click="toggleSede(sede.id)"
          class="w-full flex items-start gap-4 p-5 text-left cursor-pointer"
        >
          <!-- Icon -->
          <div class="w-10 h-10 rounded-lg bg-matchx-accent-green/10 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 class="w-5 h-5 text-matchx-accent-green" :stroke-width="1.75" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <h2 class="font-bold text-matchx-text-primary text-base leading-tight">
                {{ sede.nombre }}
              </h2>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-xs text-matchx-text-muted bg-matchx-bg-elevated px-2 py-0.5 rounded">
                  {{ sede.canchas?.length ?? 0 }} canchas
                </span>
                <ChevronDown
                  v-if="expandedSede !== sede.id"
                  class="w-4 h-4 text-matchx-text-muted"
                  :stroke-width="2"
                />
                <ChevronUp
                  v-else
                  class="w-4 h-4 text-matchx-accent-green"
                  :stroke-width="2"
                />
              </div>
            </div>

            <div class="mt-2 space-y-1">
              <div class="flex items-center gap-1.5 text-sm text-matchx-text-secondary">
                <MapPin class="w-3.5 h-3.5 shrink-0 text-matchx-text-muted" :stroke-width="1.75" />
                <span class="truncate">{{ sede.direccion }}, {{ sede.ciudad }}, {{ sede.departamento }}</span>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-1.5 text-xs text-matchx-text-muted">
                  <Phone class="w-3 h-3 shrink-0" :stroke-width="1.75" />
                  <span>{{ sede.telefono }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-xs text-matchx-text-muted">
                  <Mail class="w-3 h-3 shrink-0" :stroke-width="1.75" />
                  <span class="truncate">{{ sede.email }}</span>
                </div>
              </div>
            </div>
          </div>
        </button>

        <!-- Canchas (expandible) -->
        <div
          v-if="expandedSede === sede.id && sede.canchas && sede.canchas.length > 0"
          class="border-t border-matchx-border-base bg-matchx-bg-base/40 px-5 pb-4 pt-3"
        >
          <p class="text-xs font-semibold text-matchx-text-muted uppercase tracking-wider mb-3">
            Canchas disponibles
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="cancha in sede.canchas"
              :key="cancha.id"
              class="flex items-start gap-3 bg-matchx-bg-surface rounded-lg p-3 border border-matchx-border-base"
            >
              <div
                class="w-2 h-2 rounded-full mt-1.5 shrink-0"
                :class="cancha.disponible ? 'bg-matchx-accent-green' : 'bg-matchx-accent-orange'"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-semibold text-matchx-text-primary truncate">
                    {{ cancha.nombre }}
                  </span>
                  <div class="flex items-center gap-1 shrink-0"
                    :class="cancha.disponible ? 'text-matchx-accent-green' : 'text-matchx-accent-orange'">
                    <CheckCircle2 v-if="cancha.disponible" class="w-3.5 h-3.5" :stroke-width="2" />
                    <XCircle v-else class="w-3.5 h-3.5" :stroke-width="2" />
                    <span class="text-xs font-medium">
                      {{ cancha.disponible ? 'Disponible' : 'No disponible' }}
                    </span>
                  </div>
                </div>
                <div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-matchx-text-muted">
                  <span>{{ tipoCancha[cancha.tipo] ?? cancha.tipo }}</span>
                  <span>{{ cancha.largo_metros }}×{{ cancha.ancho_metros }} m</span>
                  <span>{{ cancha.capacidad.toLocaleString('es-CO') }} espectadores</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="!sedesStore.loading && sedesStore.sedes.length === 0"
      class="flex flex-col items-center gap-3 py-16 text-center"
    >
      <Building2 class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-muted">No hay sedes registradas</p>
    </div>
  </div>
</template>
