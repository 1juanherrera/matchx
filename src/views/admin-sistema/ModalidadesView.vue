<script setup lang="ts">
import { onMounted } from 'vue'
import { useModalidadesStore, type Modalidad } from '@/stores/modalidades'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'

const store = useModalidadesStore()

onMounted(() => {
  store.fetchModalidades()
})

const toggleRule = (modalidadId: number, ruleKey: keyof Modalidad['reglas']) => {
  const modalidad = store.obtenerPorId(modalidadId)
  if (!modalidad) return

  const newReglas = {
    ...modalidad.reglas,
    [ruleKey]: !modalidad.reglas[ruleKey],
  }
  store.actualizarReglas(modalidadId, newReglas)
}

const toggleActivo = (id: number) => {
  store.toggleActivo(id)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-matchx-text-primary">Modalidades</h1>
      <p class="text-matchx-text-muted mt-1">Configuración de modalidades de fútbol</p>
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

    <!-- Modalidades Grid -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AppCard v-for="modalidad in store.modalidades" :key="modalidad.id">
        <!-- Header -->
        <div class="flex items-start justify-between mb-4 pb-4 border-b border-matchx-border-base">
          <div>
            <h2 class="text-xl font-semibold text-matchx-text-primary">{{ modalidad.nombre }}</h2>
            <p class="text-sm text-matchx-text-muted">{{ modalidad.codigo }} - {{ modalidad.descripcion }}</p>
          </div>
          <AppBadge :variant="modalidad.activo === 1 ? 'green' : 'gray'">
            {{ modalidad.activo === 1 ? 'Activo' : 'Inactivo' }}
          </AppBadge>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-matchx-border-base">
          <div class="text-center">
            <div class="text-2xl font-bold text-matchx-accent-green">{{ modalidad.jugadores_por_equipo }}</div>
            <div class="text-xs text-matchx-text-muted">Jugadores por equipo</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-matchx-accent-green">{{ modalidad.duracion_minutos }}'</div>
            <div class="text-xs text-matchx-text-muted">Duración</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-matchx-accent-orange">{{ modalidad.cambios_permitidos }}</div>
            <div class="text-xs text-matchx-text-muted">Cambios</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-matchx-accent-orange">{{ modalidad.descanso_minutos }}'</div>
            <div class="text-xs text-matchx-text-muted">Descanso</div>
          </div>
        </div>

        <!-- Rules -->
        <div class="space-y-2 mb-4">
          <h3 class="text-sm font-semibold text-matchx-text-secondary">Reglas</h3>
          <div class="space-y-2">
            <label class="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                :checked="modalidad.reglas.fuera_de_juego"
                @change="toggleRule(modalidad.id, 'fuera_de_juego')"
                class="w-4 h-4 rounded accent-matchx-accent-green"
              />
              <span class="text-sm text-matchx-text-primary group-hover:text-matchx-accent-green transition-colors">
                Fuera de juego
              </span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                :checked="modalidad.reglas.arquero_puede_recibir_pase"
                @change="toggleRule(modalidad.id, 'arquero_puede_recibir_pase')"
                class="w-4 h-4 rounded accent-matchx-accent-green"
              />
              <span class="text-sm text-matchx-text-primary group-hover:text-matchx-accent-green transition-colors">
                Arquero recibe pase
              </span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                :checked="modalidad.reglas.limite_pases_atras"
                @change="toggleRule(modalidad.id, 'limite_pases_atras')"
                class="w-4 h-4 rounded accent-matchx-accent-green"
              />
              <span class="text-sm text-matchx-text-primary group-hover:text-matchx-accent-green transition-colors">
                Límite pases atrás
              </span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                :checked="modalidad.reglas.tarjeta_roja_automatica"
                @change="toggleRule(modalidad.id, 'tarjeta_roja_automatica')"
                class="w-4 h-4 rounded accent-matchx-accent-green"
              />
              <span class="text-sm text-matchx-text-primary group-hover:text-matchx-accent-green transition-colors">
                Roja automática
              </span>
            </label>
          </div>
        </div>

        <!-- Action Button -->
        <AppButton
          :variant="modalidad.activo === 1 ? 'danger' : 'primary'"
          class="w-full"
          @click="toggleActivo(modalidad.id)"
        >
          {{ modalidad.activo === 1 ? 'Desactivar' : 'Activar' }}
        </AppButton>
      </AppCard>
    </div>
  </div>
</template>
