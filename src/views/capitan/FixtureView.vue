<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEquiposStore } from '@/stores/equipos'
import { usePartidosStore } from '@/stores/partidos'
import { useSedesStore } from '@/stores/sedes'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { CalendarRange, Calendar, Clock, MapPin, Swords, ChevronRight } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()
const equiposStore = useEquiposStore()
const partidosStore = usePartidosStore()
const sedesStore = useSedesStore()

const filtroEstado = ref<string>('todos')

const filtroOptions = [
  { value: 'todos',      label: 'Todos' },
  { value: 'programado', label: 'Próximos' },
  { value: 'finalizado', label: 'Jugados' },
]

onMounted(async () => {
  await Promise.all([
    equiposStore.fetchEquipos(),
    partidosStore.fetchPartidos(),
    sedesStore.fetchSedes(),
  ])
})

const miEquipo = computed(() =>
  equiposStore.equipos.find(e =>
    (auth.user?.equipo_id != null && e.id === auth.user.equipo_id) ||
    (import.meta.env.VITE_MOCK_API === 'true' && e.id === 1)
  ) ?? null,
)

const partidosDelEquipo = computed(() => {
  if (!miEquipo.value) return []
  const id = miEquipo.value.id
  return partidosStore.partidos.filter(p =>
    p.equipo_local_id === id || p.equipo_visitante_id === id,
  )
})

const partidosFiltrados = computed(() => {
  const lista = filtroEstado.value === 'todos'
    ? partidosDelEquipo.value
    : partidosDelEquipo.value.filter(p => p.estado === filtroEstado.value)
  return [...lista].sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
})

const jornadasUnicas = computed(() =>
  [...new Set(partidosFiltrados.value.map(p => p.jornada))].sort((a, b) => a - b),
)

const nombreEquipo = (id: number) => equiposStore.obtenerPorId(id)?.nombre ?? `Equipo ${id}`
const escudoEquipo = (id: number) => equiposStore.obtenerPorId(id)?.escudo_url ?? null
const nombreSede = (id: number) => sedesStore.obtenerPorId(id)?.nombre ?? `Sede ${id}`

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

const estadoBadge = (estado: string): 'green' | 'orange' | 'gray' | 'blue' => ({
  en_curso: 'green', programado: 'blue', suspendido: 'orange',
}[estado] ?? 'gray' as any)

// Para partidos finalizados: calcula resultado relativo al equipo del jugador
const resultadoPartido = (partido: any): { label: string; variant: 'green' | 'orange' | 'gray' } => {
  if (partido.estado !== 'finalizado') return { label: partido.estado, variant: estadoBadge(partido.estado) as any }
  const miId = miEquipo.value?.id
  const esLocal = partido.equipo_local_id === miId
  const gF = esLocal ? partido.goles_local     : partido.goles_visitante
  const gC = esLocal ? partido.goles_visitante  : partido.goles_local
  if (gF > gC) return { label: 'Ganado',  variant: 'green' }
  if (gF < gC) return { label: 'Perdido', variant: 'orange' }
  return       { label: 'Empate',  variant: 'gray' }
}

// Resaltar si es mi equipo el local o visitante
const esmiEquipo = (id: number) => miEquipo.value?.id === id
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-matchx-text-primary">Fixture</h1>
      <p class="text-matchx-text-muted mt-1">Calendario de partidos de tu equipo</p>
    </div>

    <!-- Sin equipo -->
    <div v-if="!miEquipo" class="flex flex-col items-center gap-3 py-16">
      <CalendarRange class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-muted">No tienes un equipo asignado</p>
    </div>

    <template v-else>
      <!-- Header mini equipo + filtro -->
      <div class="flex items-center gap-4">
        <img :src="miEquipo.escudo_url" :alt="miEquipo.nombre" class="w-10 h-10 rounded-lg" />
        <div class="flex-1">
          <div class="font-semibold text-matchx-text-primary">{{ miEquipo.nombre }}</div>
          <div class="text-xs text-matchx-text-muted">{{ partidosDelEquipo.length }} partidos en total</div>
        </div>
      </div>

      <AppCard :hover="false">
        <div class="max-w-xs">
          <AppSelect v-model="filtroEstado" :options="filtroOptions" label="Mostrar" />
        </div>
      </AppCard>

      <!-- Empty -->
      <div v-if="partidosFiltrados.length === 0" class="flex flex-col items-center gap-3 py-16">
        <CalendarRange class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
        <p class="text-matchx-text-muted text-sm">No hay partidos para mostrar</p>
      </div>

      <!-- Lista por jornada -->
      <div v-else class="space-y-1">
        <template v-for="jornada in jornadasUnicas" :key="jornada">
          <!-- Divisor jornada -->
          <div class="flex items-center gap-3 mt-5 mb-2 first:mt-0">
            <div class="h-px flex-1 bg-matchx-border-base/50" />
            <span class="text-xs font-semibold text-matchx-text-muted uppercase tracking-wider shrink-0">
              Jornada {{ jornada }}
            </span>
            <div class="h-px flex-1 bg-matchx-border-base/50" />
          </div>

          <AppCard
            v-for="partido in partidosFiltrados.filter(p => p.jornada === jornada)"
            :key="partido.id"
            :hover="true"
            class="mb-2 cursor-pointer"
            @click="router.push({ name: 'JugadorPartidoDetalle', params: { id: partido.id } })"
          >
            <div class="flex items-center gap-4">
              <div class="flex-1 flex items-center gap-3 min-w-0">
                <!-- Local -->
                <div class="flex-1 flex items-center justify-end gap-2 min-w-0">
                  <span
                    :class="['font-semibold text-sm truncate', esmiEquipo(partido.equipo_local_id) ? 'text-matchx-accent-green' : 'text-matchx-text-primary']"
                  >
                    {{ nombreEquipo(partido.equipo_local_id) }}
                  </span>
                  <img v-if="escudoEquipo(partido.equipo_local_id)"
                    :src="escudoEquipo(partido.equipo_local_id)!"
                    :class="['w-8 h-8 rounded-md shrink-0', esmiEquipo(partido.equipo_local_id) && 'ring-2 ring-matchx-accent-green/50']"
                  />
                  <div v-else class="w-8 h-8 rounded-md bg-matchx-bg-elevated border border-matchx-border-base
                                     flex items-center justify-center shrink-0">
                    <Swords class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.5" />
                  </div>
                </div>

                <!-- Marcador / VS -->
                <div class="text-center px-2 shrink-0">
                  <div v-if="partido.estado === 'finalizado'"
                       class="text-2xl font-bold font-mono text-matchx-text-primary">
                    {{ partido.goles_local }} – {{ partido.goles_visitante }}
                  </div>
                  <div v-else class="text-lg font-bold font-mono text-matchx-text-muted">vs</div>
                </div>

                <!-- Visitante -->
                <div class="flex-1 flex items-center gap-2 min-w-0">
                  <img v-if="escudoEquipo(partido.equipo_visitante_id)"
                    :src="escudoEquipo(partido.equipo_visitante_id)!"
                    :class="['w-8 h-8 rounded-md shrink-0', esmiEquipo(partido.equipo_visitante_id) && 'ring-2 ring-matchx-accent-green/50']"
                  />
                  <div v-else class="w-8 h-8 rounded-md bg-matchx-bg-elevated border border-matchx-border-base
                                     flex items-center justify-center shrink-0">
                    <Swords class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.5" />
                  </div>
                  <span
                    :class="['font-semibold text-sm truncate', esmiEquipo(partido.equipo_visitante_id) ? 'text-matchx-accent-green' : 'text-matchx-text-primary']"
                  >
                    {{ nombreEquipo(partido.equipo_visitante_id) }}
                  </span>
                </div>
              </div>

              <!-- Meta -->
              <div class="flex items-center gap-3 shrink-0">
                <div class="flex flex-col items-end gap-1.5">
                  <AppBadge :variant="resultadoPartido(partido).variant" :dot="false">
                    {{ resultadoPartido(partido).label }}
                  </AppBadge>
                  <div class="flex items-center gap-1 text-xs text-matchx-text-secondary">
                    <Calendar class="w-3 h-3" :stroke-width="1.75" />
                    {{ formatFecha(partido.fecha_hora) }}
                    <Clock class="w-3 h-3 ml-1" :stroke-width="1.75" />
                    {{ formatHora(partido.fecha_hora) }}
                  </div>
                  <div class="flex items-center gap-1 text-xs text-matchx-text-secondary">
                    <MapPin class="w-3 h-3" :stroke-width="1.75" />
                    {{ nombreSede(partido.sede_id) }}
                  </div>
                </div>
                <ChevronRight class="w-4 h-4 text-matchx-text-muted shrink-0" :stroke-width="2" />
              </div>
            </div>
          </AppCard>
        </template>
      </div>
    </template>
  </div>
</template>
