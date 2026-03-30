<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSedesStore, type Sede } from '@/stores/sedes'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { Settings } from 'lucide-vue-next'

const store = useSedesStore()
const expandedSede = ref<number | null>(null)

onMounted(() => {
  store.fetchSedes()
})

const toggleExpand = (sedeId: number) => {
  expandedSede.value = expandedSede.value === sedeId ? null : sedeId
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Sedes</h1>
        <p class="text-matchx-text-muted mt-1">Gestión de sedes y canchas</p>
      </div>
      <AppButton variant="primary">
        + Nueva Sede
      </AppButton>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="text-center py-12">
      <div class="inline-block">
        <svg class="animate-spin h-8 w-8 text-matchx-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    </div>

    <!-- Sedes Grid -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AppCard v-for="sede in store.sedesActivas" :key="sede.id">
        <!-- Header -->
        <div class="flex items-start justify-between mb-4 pb-4 border-b border-matchx-border-base">
          <div class="flex-1">
            <h2 class="text-lg font-semibold text-matchx-text-primary">{{ sede.nombre }}</h2>
            <p class="text-sm text-matchx-text-muted mt-1">{{ sede.ciudad }}, {{ sede.departamento }}</p>
            <p class="text-xs text-matchx-text-muted mt-1">📍 {{ sede.direccion }}</p>
          </div>
          <AppBadge variant="green">
            {{ sede.canchas.length }} canchas
          </AppBadge>
        </div>

        <!-- Info -->
        <div class="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-matchx-border-base">
          <div>
            <div class="text-xs text-matchx-text-muted">Capacidad</div>
            <div class="text-lg font-semibold text-matchx-accent-green">{{ sede.capacidad.toLocaleString() }}</div>
          </div>
          <div>
            <div class="text-xs text-matchx-text-muted">Contacto</div>
            <div class="text-sm text-matchx-text-primary">{{ sede.telefono }}</div>
          </div>
        </div>

        <!-- Canchas -->
        <div class="space-y-2 mb-4">
          <button
            class="flex items-center justify-between w-full text-sm font-medium text-matchx-text-secondary hover:text-matchx-accent-green transition-colors"
            @click="toggleExpand(sede.id)"
          >
            <span>Canchas</span>
            <svg
              :class="['w-4 h-4 transition-transform', expandedSede === sede.id && 'rotate-180']"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>

          <div v-if="expandedSede === sede.id" class="space-y-2 mt-2">
            <div
              v-for="cancha in sede.canchas"
              :key="cancha.id"
              class="p-3 rounded-lg bg-matchx-bg-base/30 border border-matchx-border-base/30"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="font-medium text-matchx-text-primary">{{ cancha.nombre }}</div>
                  <div class="text-xs text-matchx-text-muted mt-1">
                    {{ cancha.tipo.replace('_', ' ') }} • {{ cancha.largo_metros }}x{{ cancha.ancho_metros }}m
                  </div>
                </div>
                <div class="text-right">
                  <AppBadge
                    :variant="cancha.disponible ? 'green' : 'orange'"
                    :dot="false"
                  >
                    {{ cancha.disponible ? 'Disponible' : 'Ocupada' }}
                  </AppBadge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <AppButton variant="secondary" class="flex-1">
            Editar
          </AppButton>
          <AppButton variant="ghost" aria-label="Configurar sede">
            <Settings class="w-4 h-4" :stroke-width="1.75" />
          </AppButton>
        </div>
      </AppCard>
    </div>
  </div>
</template>
