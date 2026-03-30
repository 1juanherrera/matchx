<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePartidosStore } from '@/stores/partidos'
import { useEquiposStore } from '@/stores/equipos'
import { useSedesStore } from '@/stores/sedes'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { Flag, Calendar, Clock, MapPin, Swords } from 'lucide-vue-next'

const auth = useAuthStore()
const partidosStore = usePartidosStore()
const equiposStore = useEquiposStore()
const sedesStore = useSedesStore()

const filtroEstado = ref<string>('todos')

const filtroOptions = [
  { value: 'todos',      label: 'Todos' },
  { value: 'programado', label: 'Programados' },
  { value: 'finalizado', label: 'Finalizados' },
  { value: 'suspendido', label: 'Suspendidos' },
]

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

const partidosFiltrados = computed(() => {
  const lista = filtroEstado.value === 'todos'
    ? misPartidos.value
    : misPartidos.value.filter(p => p.estado === filtroEstado.value)
  return [...lista].sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
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
  en_curso: 'green', programado: 'blue', finalizado: 'gray', suspendido: 'orange',
}[estado] ?? 'gray' as any)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-matchx-text-primary">Mis Partidos</h1>
      <p class="text-matchx-text-muted mt-1">Partidos asignados como árbitro</p>
    </div>

    <!-- Filtro -->
    <AppCard :hover="false">
      <div class="max-w-xs">
        <AppSelect v-model="filtroEstado" :options="filtroOptions" label="Filtrar por estado" />
      </div>
    </AppCard>

    <!-- Empty state -->
    <div v-if="partidosFiltrados.length === 0" class="flex flex-col items-center gap-3 py-16">
      <Flag class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <div class="text-center">
        <p class="text-matchx-text-secondary font-medium">No hay partidos</p>
        <p class="text-matchx-text-muted text-sm mt-0.5">
          {{ filtroEstado === 'todos' ? 'No tienes partidos asignados' : `Sin partidos ${filtroEstado}s` }}
        </p>
      </div>
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
          :hover="false"
          class="mb-2"
        >
          <div class="flex items-center gap-4">
            <!-- Equipos y marcador -->
            <div class="flex-1 flex items-center gap-3 min-w-0">
              <!-- Local -->
              <div class="flex-1 flex items-center justify-end gap-2 min-w-0">
                <span class="font-semibold text-matchx-text-primary text-sm truncate">
                  {{ nombreEquipo(partido.equipo_local_id) }}
                </span>
                <img v-if="escudoEquipo(partido.equipo_local_id)"
                  :src="escudoEquipo(partido.equipo_local_id)!"
                  class="w-8 h-8 rounded-md shrink-0" />
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
                  class="w-8 h-8 rounded-md shrink-0" />
                <div v-else class="w-8 h-8 rounded-md bg-matchx-bg-elevated border border-matchx-border-base
                                   flex items-center justify-center shrink-0">
                  <Swords class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.5" />
                </div>
                <span class="font-semibold text-matchx-text-primary text-sm truncate">
                  {{ nombreEquipo(partido.equipo_visitante_id) }}
                </span>
              </div>
            </div>

            <!-- Meta: estado, fecha, sede -->
            <div class="flex flex-col items-end gap-1.5 shrink-0">
              <AppBadge :variant="estadoBadge(partido.estado)">{{ partido.estado }}</AppBadge>
              <div class="flex items-center gap-1 text-xs text-matchx-text-muted">
                <Calendar class="w-3 h-3" :stroke-width="1.75" />
                {{ formatFecha(partido.fecha_hora) }}
                <Clock class="w-3 h-3 ml-1" :stroke-width="1.75" />
                {{ formatHora(partido.fecha_hora) }}
              </div>
              <div class="flex items-center gap-1 text-xs text-matchx-text-muted">
                <MapPin class="w-3 h-3" :stroke-width="1.75" />
                {{ nombreSede(partido.sede_id) }}
              </div>
            </div>
          </div>
        </AppCard>
      </template>
    </div>
  </div>
</template>
