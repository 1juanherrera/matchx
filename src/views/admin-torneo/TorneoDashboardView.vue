<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore } from '@/stores/equipos'
import { usePartidosStore } from '@/stores/partidos'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const welcomeMessage = computed(() => {
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'
  return `${greeting}, ${authStore.userName}`
})
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { Trophy, Users, Swords, CalendarClock, Calendar, Clock } from 'lucide-vue-next'

const torneosStore = useTorneosStore()
const equiposStore = useEquiposStore()
const partidosStore = usePartidosStore()

onMounted(async () => {
  await Promise.all([
    torneosStore.fetchTorneos(),
    equiposStore.fetchEquipos(),
    partidosStore.fetchPartidos(),
  ])
})

const estadoBadge = (estado: string): 'green' | 'orange' | 'gray' | 'blue' => {
  const map: Record<string, 'green' | 'orange' | 'gray' | 'blue'> = {
    en_curso: 'green', programado: 'blue', finalizado: 'gray', cancelado: 'gray',
  }
  return map[estado] ?? 'gray'
}

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

const nombreEquipo = (id: number) =>
  equiposStore.obtenerPorId(id)?.nombre ?? `Equipo ${id}`

const partidosJugados = computed(() =>
  partidosStore.partidos.filter(p => p.estado === 'finalizado').length,
)
const partidosPendientes = computed(() =>
  partidosStore.partidos.filter(p => p.estado === 'programado').length,
)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-matchx-text-primary">{{ welcomeMessage }}</h1>
      <p class="text-matchx-text-secondary text-sm">Panel de administración de torneos</p>
    </div>

    <!-- Métricas -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <AppCard>
        <div class="flex items-start justify-between">
          <div class="text-matchx-text-muted text-sm font-medium">Torneos Activos</div>
          <div class="p-2 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/20">
            <Trophy class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
          </div>
        </div>
        <div class="text-4xl font-bold text-matchx-accent-green mt-3">
          {{ torneosStore.torneosActivos.length }}
        </div>
        <div class="text-xs text-matchx-text-muted mt-1">{{ torneosStore.torneos.length }} total</div>
      </AppCard>

      <AppCard>
        <div class="flex items-start justify-between">
          <div class="text-matchx-text-muted text-sm font-medium">Equipos Inscritos</div>
          <div class="p-2 rounded-lg bg-matchx-accent-orange/10 border border-matchx-accent-orange/20">
            <Users class="w-4 h-4 text-matchx-accent-orange" :stroke-width="1.75" />
          </div>
        </div>
        <div class="text-4xl font-bold text-matchx-accent-orange mt-3">
          {{ equiposStore.equipos.filter(e => e.activo === 1).length }}
        </div>
        <div class="text-xs text-matchx-text-muted mt-1">en todos los torneos</div>
      </AppCard>

      <AppCard>
        <div class="flex items-start justify-between">
          <div class="text-matchx-text-muted text-sm font-medium">Partidos Jugados</div>
          <div class="p-2 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/20">
            <Swords class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
          </div>
        </div>
        <div class="text-4xl font-bold text-matchx-accent-green mt-3">
          {{ partidosJugados }}
        </div>
        <div class="text-xs text-matchx-text-muted mt-1">{{ partidosPendientes }} pendientes</div>
      </AppCard>

      <AppCard>
        <div class="flex items-start justify-between">
          <div class="text-matchx-text-muted text-sm font-medium">Próximo Partido</div>
          <div class="p-2 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/20">
            <CalendarClock class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
          </div>
        </div>
        <div v-if="partidosStore.proximosPartidos.length" class="mt-3">
          <div class="text-sm font-semibold text-matchx-text-primary">
            {{ formatFecha(partidosStore.proximosPartidos[0].fecha_hora) }}
          </div>
          <div class="text-xs text-matchx-text-muted mt-0.5">
            {{ formatHora(partidosStore.proximosPartidos[0].fecha_hora) }}
          </div>
        </div>
        <div v-else class="text-sm text-matchx-text-muted mt-3">Sin programar</div>
      </AppCard>
    </div>

    <!-- Torneos + Próximos partidos -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Torneos -->
      <AppCard>
        <h2 class="text-lg font-semibold text-matchx-text-primary mb-4">Todos los Torneos</h2>

        <!-- Empty state -->
        <div v-if="torneosStore.torneos.length === 0"
             class="flex flex-col items-center py-8 gap-2">
          <Trophy class="w-8 h-8 text-matchx-text-muted opacity-40" :stroke-width="1.5" />
          <p class="text-matchx-text-muted text-sm">No hay torneos registrados</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="torneo in torneosStore.torneos"
            :key="torneo.id"
            class="flex items-center justify-between p-3 rounded-lg bg-matchx-bg-base/30
                   border border-matchx-border-base/30 hover:border-matchx-border-base
                   transition-colors duration-150"
          >
            <div class="flex-1 min-w-0">
              <div class="font-medium text-matchx-text-primary text-sm truncate">{{ torneo.nombre }}</div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="font-mono text-xs text-matchx-accent-green/80
                             bg-matchx-accent-green/5 border border-matchx-accent-green/15
                             rounded px-1.5 py-0.5">
                  {{ torneo.modalidad_codigo }}
                </span>
                <span class="text-xs text-matchx-text-muted">
                  {{ formatFecha(torneo.fecha_inicio) }} — {{ formatFecha(torneo.fecha_fin) }}
                </span>
              </div>
            </div>
            <AppBadge :variant="estadoBadge(torneo.estado)" class="ml-3 shrink-0">
              {{ torneo.estado }}
            </AppBadge>
          </div>
        </div>
      </AppCard>

      <!-- Próximos partidos -->
      <AppCard>
        <h2 class="text-lg font-semibold text-matchx-text-primary mb-4">Próximos Partidos</h2>

        <!-- Empty state -->
        <div v-if="partidosStore.proximosPartidos.length === 0"
             class="flex flex-col items-center py-8 gap-2">
          <CalendarClock class="w-8 h-8 text-matchx-text-muted opacity-40" :stroke-width="1.5" />
          <p class="text-matchx-text-muted text-sm">No hay partidos programados</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="partido in partidosStore.proximosPartidos"
            :key="partido.id"
            class="p-3 rounded-lg bg-matchx-bg-base/30 border border-matchx-border-base/30
                   hover:border-matchx-border-base transition-colors duration-200"
          >
            <div class="flex items-center justify-between text-sm mb-2">
              <span class="font-medium text-matchx-text-primary flex-1 text-right truncate">
                {{ nombreEquipo(partido.equipo_local_id) }}
              </span>
              <span class="text-matchx-accent-green text-xs font-mono font-bold px-3 shrink-0">VS</span>
              <span class="font-medium text-matchx-text-primary flex-1 text-left truncate">
                {{ nombreEquipo(partido.equipo_visitante_id) }}
              </span>
            </div>
            <div class="flex items-center justify-center gap-1.5 text-xs text-matchx-text-muted">
              <Calendar class="w-3 h-3" :stroke-width="1.75" />
              <span>{{ formatFecha(partido.fecha_hora) }}</span>
              <Clock class="w-3 h-3 ml-1" :stroke-width="1.75" />
              <span>{{ formatHora(partido.fecha_hora) }}</span>
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>
