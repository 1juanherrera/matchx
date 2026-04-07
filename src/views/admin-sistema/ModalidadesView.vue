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
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <AppCard v-for="modalidad in store.modalidades" :key="modalidad.id">
        <!-- Header -->
        <div class="flex items-center justify-between mb-3 pb-3 border-b border-matchx-border-base">
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-matchx-text-primary truncate">{{ modalidad.nombre }}</h2>
            <p class="text-xs text-matchx-text-muted truncate">{{ modalidad.codigo }} · {{ modalidad.descripcion }}</p>
          </div>
          <AppBadge :variant="modalidad.activo === 1 ? 'green' : 'gray'" class="ml-2 shrink-0">
            {{ modalidad.activo === 1 ? 'Activo' : 'Inactivo' }}
          </AppBadge>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-4 gap-1 mb-3 pb-3 border-b border-matchx-border-base text-center">
          <div>
            <div class="text-lg font-bold text-matchx-accent-green">{{ modalidad.jugadores_por_equipo }}</div>
            <div class="text-[10px] text-matchx-text-muted leading-tight">Jugadores</div>
          </div>
          <div>
            <div class="text-lg font-bold text-matchx-accent-green">{{ modalidad.duracion_minutos }}'</div>
            <div class="text-[10px] text-matchx-text-muted leading-tight">Duración</div>
          </div>
          <div>
            <div class="text-lg font-bold text-matchx-accent-orange">{{ modalidad.cambios_permitidos }}</div>
            <div class="text-[10px] text-matchx-text-muted leading-tight">Cambios</div>
          </div>
          <div>
            <div class="text-lg font-bold text-matchx-accent-orange">{{ modalidad.descanso_minutos }}'</div>
            <div class="text-[10px] text-matchx-text-muted leading-tight">Descanso</div>
          </div>
        </div>

        <!-- Rules -->
        <div class="mb-3">
          <h3 class="text-xs font-semibold text-matchx-text-muted uppercase tracking-wider mb-2">Reglas</h3>
          <div class="grid grid-cols-2 gap-1">
            <label class="flex items-center gap-1.5 cursor-pointer group">
              <input
                type="checkbox"
                :checked="modalidad.reglas.fuera_de_juego"
                @change="toggleRule(modalidad.id, 'fuera_de_juego')"
                class="w-3.5 h-3.5 rounded accent-matchx-accent-green shrink-0"
              />
              <span class="text-xs text-matchx-text-primary group-hover:text-matchx-accent-green transition-colors">
                Fuera de juego
              </span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer group">
              <input
                type="checkbox"
                :checked="modalidad.reglas.arquero_puede_recibir_pase"
                @change="toggleRule(modalidad.id, 'arquero_puede_recibir_pase')"
                class="w-3.5 h-3.5 rounded accent-matchx-accent-green shrink-0"
              />
              <span class="text-xs text-matchx-text-primary group-hover:text-matchx-accent-green transition-colors">
                Arquero recibe pase
              </span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer group">
              <input
                type="checkbox"
                :checked="modalidad.reglas.limite_pases_atras"
                @change="toggleRule(modalidad.id, 'limite_pases_atras')"
                class="w-3.5 h-3.5 rounded accent-matchx-accent-green shrink-0"
              />
              <span class="text-xs text-matchx-text-primary group-hover:text-matchx-accent-green transition-colors">
                Límite pases atrás
              </span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer group">
              <input
                type="checkbox"
                :checked="modalidad.reglas.tarjeta_roja_automatica"
                @change="toggleRule(modalidad.id, 'tarjeta_roja_automatica')"
                class="w-3.5 h-3.5 rounded accent-matchx-accent-green shrink-0"
              />
              <span class="text-xs text-matchx-text-primary group-hover:text-matchx-accent-green transition-colors">
                Roja automática
              </span>
            </label>
          </div>
        </div>

        <!-- Action Button -->
        <AppButton
          :variant="modalidad.activo === 1 ? 'danger' : 'primary'"
          size="sm"
          class="w-full"
          @click="toggleActivo(modalidad.id)"
        >
          {{ modalidad.activo === 1 ? 'Desactivar' : 'Activar' }}
        </AppButton>
      </AppCard>
    </div>
  </div>
</template>
