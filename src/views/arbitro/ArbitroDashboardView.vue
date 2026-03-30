<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePartidosStore } from '@/stores/partidos'
import { useEquiposStore } from '@/stores/equipos'
import { useSedesStore } from '@/stores/sedes'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { Flag, CheckCircle2, CalendarClock, Calendar, Clock, MapPin, Swords } from 'lucide-vue-next'

const auth = useAuthStore()
const partidosStore = usePartidosStore()
const equiposStore = useEquiposStore()
const sedesStore = useSedesStore()

onMounted(async () => {
  await Promise.all([
    partidosStore.fetchPartidos(),
    equiposStore.fetchEquipos(),
    sedesStore.fetchSedes(),
  ])
})

const misPartidos = computed(() =>
  partidosStore.partidos.filter(p => p.arbitro_id === auth.user?.usuario_id),
)

const jugados = computed(() => misPartidos.value.filter(p => p.estado === 'finalizado').length)
const pendientes = computed(() => misPartidos.value.filter(p => p.estado === 'programado').length)

const ahora = new Date()
const proximoPartido = computed(() =>
  misPartidos.value
    .filter(p => p.estado === 'programado' && new Date(p.fecha_hora) >= ahora)
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())[0] ?? null,
)

const proximosPartidos = computed(() =>
  misPartidos.value
    .filter(p => p.estado === 'programado' && new Date(p.fecha_hora) >= ahora)
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
    .slice(0, 4),
)

const ultimosResultados = computed(() =>
  misPartidos.value
    .filter(p => p.estado === 'finalizado')
    .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
    .slice(0, 4),
)

const nombreEquipo = (id: number) => equiposStore.obtenerPorId(id)?.nombre ?? `Equipo ${id}`
const escudoEquipo = (id: number) => equiposStore.obtenerPorId(id)?.escudo_url ?? null
const nombreSede = (id: number) => sedesStore.obtenerPorId(id)?.nombre ?? `Sede ${id}`

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

const estadoBadge = (estado: string): 'green' | 'orange' | 'gray' | 'blue' => ({
  en_curso: 'green', programado: 'blue', finalizado: 'gray', suspendido: 'orange',
}[estado] ?? 'gray' as any)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-4xl font-bold text-matchx-text-primary">Dashboard</h1>
      <p class="text-matchx-text-secondary">Bienvenido, {{ auth.userName }}</p>
    </div>

    <!-- Métricas -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <AppCard>
        <div class="flex items-start justify-between">
          <div class="text-matchx-text-muted text-sm font-medium">Total Asignados</div>
          <div class="p-2 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/20">
            <Flag class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
          </div>
        </div>
        <div class="text-4xl font-bold text-matchx-accent-green mt-3">{{ misPartidos.length }}</div>
        <div class="text-xs text-matchx-text-muted mt-1">partidos en total</div>
      </AppCard>

      <AppCard>
        <div class="flex items-start justify-between">
          <div class="text-matchx-text-muted text-sm font-medium">Jugados</div>
          <div class="p-2 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/20">
            <CheckCircle2 class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
          </div>
        </div>
        <div class="text-4xl font-bold text-matchx-accent-green mt-3">{{ jugados }}</div>
        <div class="text-xs text-matchx-text-muted mt-1">{{ pendientes }} pendientes</div>
      </AppCard>

      <AppCard>
        <div class="flex items-start justify-between">
          <div class="text-matchx-text-muted text-sm font-medium">Próximo Partido</div>
          <div class="p-2 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/20">
            <CalendarClock class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
          </div>
        </div>
        <div v-if="proximoPartido" class="mt-3">
          <div class="text-sm font-semibold text-matchx-text-primary">
            {{ formatFecha(proximoPartido.fecha_hora) }}
          </div>
          <div class="text-xs text-matchx-text-muted mt-0.5">
            {{ formatHora(proximoPartido.fecha_hora) }} · {{ nombreSede(proximoPartido.sede_id) }}
          </div>
        </div>
        <div v-else class="text-sm text-matchx-text-muted mt-3">Sin programar</div>
      </AppCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Próximos -->
      <AppCard>
        <h2 class="text-lg font-semibold text-matchx-text-primary mb-4">Próximos Partidos</h2>

        <div v-if="!proximosPartidos.length" class="flex flex-col items-center py-8 gap-2">
          <CalendarClock class="w-8 h-8 text-matchx-text-muted opacity-40" :stroke-width="1.5" />
          <p class="text-matchx-text-muted text-sm">No hay partidos próximos</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="p in proximosPartidos" :key="p.id"
            class="p-3 rounded-lg bg-matchx-bg-base/30 border border-matchx-border-base/30
                   hover:border-matchx-border-base transition-colors"
          >
            <div class="flex items-center justify-between text-sm mb-1.5">
              <span class="font-medium text-matchx-text-primary truncate flex-1 text-right">
                {{ nombreEquipo(p.equipo_local_id) }}
              </span>
              <span class="text-matchx-accent-green text-xs font-mono font-bold px-3 shrink-0">VS</span>
              <span class="font-medium text-matchx-text-primary truncate flex-1">
                {{ nombreEquipo(p.equipo_visitante_id) }}
              </span>
            </div>
            <div class="flex items-center gap-3 text-xs text-matchx-text-muted">
              <span class="flex items-center gap-1">
                <Calendar class="w-3 h-3" :stroke-width="1.75" />
                {{ formatFecha(p.fecha_hora) }}
              </span>
              <span class="flex items-center gap-1">
                <Clock class="w-3 h-3" :stroke-width="1.75" />
                {{ formatHora(p.fecha_hora) }}
              </span>
              <span class="flex items-center gap-1">
                <MapPin class="w-3 h-3" :stroke-width="1.75" />
                {{ nombreSede(p.sede_id) }}
              </span>
            </div>
          </div>
        </div>
      </AppCard>

      <!-- Últimos resultados -->
      <AppCard>
        <h2 class="text-lg font-semibold text-matchx-text-primary mb-4">Últimos Resultados</h2>

        <div v-if="!ultimosResultados.length" class="flex flex-col items-center py-8 gap-2">
          <Swords class="w-8 h-8 text-matchx-text-muted opacity-40" :stroke-width="1.5" />
          <p class="text-matchx-text-muted text-sm">Sin partidos arbitrados aún</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="p in ultimosResultados" :key="p.id"
            class="p-3 rounded-lg bg-matchx-bg-base/30 border border-matchx-border-base/30
                   hover:border-matchx-border-base transition-colors"
          >
            <div class="flex items-center gap-3">
              <!-- Local -->
              <div class="flex-1 flex items-center justify-end gap-2 min-w-0">
                <span class="font-medium text-matchx-text-primary text-sm truncate">
                  {{ nombreEquipo(p.equipo_local_id) }}
                </span>
                <img v-if="escudoEquipo(p.equipo_local_id)"
                  :src="escudoEquipo(p.equipo_local_id)!" class="w-7 h-7 rounded shrink-0" />
              </div>
              <!-- Marcador -->
              <div class="text-center shrink-0 px-2">
                <div class="text-xl font-bold font-mono text-matchx-text-primary">
                  {{ p.goles_local }} – {{ p.goles_visitante }}
                </div>
                <div class="text-xs text-matchx-text-muted">{{ formatFecha(p.fecha_hora) }}</div>
              </div>
              <!-- Visitante -->
              <div class="flex-1 flex items-center gap-2 min-w-0">
                <img v-if="escudoEquipo(p.equipo_visitante_id)"
                  :src="escudoEquipo(p.equipo_visitante_id)!" class="w-7 h-7 rounded shrink-0" />
                <span class="font-medium text-matchx-text-primary text-sm truncate">
                  {{ nombreEquipo(p.equipo_visitante_id) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>
