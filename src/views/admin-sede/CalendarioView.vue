<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSedesStore } from '@/stores/sedes'
import { usePartidosStore } from '@/stores/partidos'
import { useEquiposStore } from '@/stores/equipos'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { CalendarClock, Clock, MapPin, Swords } from 'lucide-vue-next'

const sedesStore = useSedesStore()
const partidosStore = usePartidosStore()
const equiposStore = useEquiposStore()

const selectedSedeId = ref<number | null>(null)
const selectedCanchaId = ref<number | null>(null)

onMounted(async () => {
  await Promise.all([
    sedesStore.fetchSedes(),
    partidosStore.fetchPartidos(),
    equiposStore.fetchEquipos(),
  ])
  if (sedesStore.sedesActivas.length > 0) {
    selectedSedeId.value = sedesStore.sedesActivas[0].id
  }
})

const sedeOptions = computed(() =>
  sedesStore.sedesActivas.map(s => ({ value: s.id, label: s.nombre })),
)

const sedeActual = computed(() =>
  selectedSedeId.value !== null ? sedesStore.obtenerPorId(selectedSedeId.value) : null,
)

const canchaOptions = computed(() => [
  { value: null, label: 'Todas las canchas' },
  ...(sedeActual.value?.canchas.map(c => ({ value: c.id, label: c.nombre })) ?? []),
])

const partidosDeSede = computed(() =>
  selectedSedeId.value !== null
    ? partidosStore.partidos.filter(p => p.sede_id === selectedSedeId.value)
    : [],
)

const partidosFiltrados = computed(() => {
  const lista = selectedCanchaId.value !== null
    ? partidosDeSede.value.filter(p => p.cancha_id === selectedCanchaId.value)
    : partidosDeSede.value
  return [...lista].sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
})

// Agrupar por fecha (YYYY-MM-DD)
const fechaKey = (iso: string) => iso.slice(0, 10)

const partidosPorFecha = computed(() => {
  const groups: Record<string, typeof partidosFiltrados.value> = {}
  for (const p of partidosFiltrados.value) {
    const k = fechaKey(p.fecha_hora)
    if (!groups[k]) groups[k] = []
    groups[k].push(p)
  }
  return groups
})

const fechasOrdenadas = computed(() => Object.keys(partidosPorFecha.value).sort())

const nombreEquipo = (id: number) => equiposStore.obtenerPorId(id)?.nombre ?? `Equipo ${id}`
const escudoEquipo = (id: number) => equiposStore.obtenerPorId(id)?.escudo_url ?? null
const nombreCancha = (canchaId: number) =>
  sedeActual.value?.canchas.find(c => c.id === canchaId)?.nombre ?? `Cancha ${canchaId}`

const formatFechaHeader = (iso: string) => {
  const fecha = new Date(iso + 'T00:00:00')
  return fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

const estadoBadge = (estado: string): 'green' | 'orange' | 'gray' | 'blue' => {
  const map: Record<string, 'green' | 'orange' | 'gray' | 'blue'> = {
    en_curso: 'green', programado: 'blue', finalizado: 'gray', suspendido: 'orange',
  }
  return map[estado] ?? 'gray'
}

const esHoy = (iso: string) => fechaKey(iso) === fechaKey(new Date().toISOString())
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-matchx-text-primary">Calendario</h1>
      <p class="text-matchx-text-muted mt-1">Partidos programados en la sede</p>
    </div>

    <!-- Filtros -->
    <AppCard :hover="false">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppSelect
          v-model="selectedSedeId"
          :options="sedeOptions"
          label="Sede"
          @update:modelValue="selectedCanchaId = null"
        />
        <AppSelect
          v-model="selectedCanchaId"
          :options="canchaOptions"
          label="Cancha"
          :disabled="!selectedSedeId"
        />
      </div>
    </AppCard>

    <!-- Empty state -->
    <div v-if="fechasOrdenadas.length === 0"
         class="flex flex-col items-center gap-3 py-16">
      <CalendarClock class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <div class="text-center">
        <p class="text-matchx-text-secondary font-medium">No hay partidos programados</p>
        <p class="text-matchx-text-muted text-sm mt-0.5">Los partidos asignados a esta sede aparecerán aquí</p>
      </div>
    </div>

    <!-- Días -->
    <div v-else class="space-y-6">
      <div v-for="fecha in fechasOrdenadas" :key="fecha">
        <!-- Header de fecha -->
        <div class="flex items-center gap-3 mb-3">
          <div class="h-px flex-1 bg-matchx-border-base/50" />
          <div class="flex items-center gap-2 shrink-0">
            <span
              :class="[
                'text-sm font-semibold capitalize',
                esHoy(fecha) ? 'text-matchx-accent-green' : 'text-matchx-text-muted',
              ]"
            >
              {{ formatFechaHeader(fecha) }}
            </span>
            <AppBadge v-if="esHoy(fecha)" variant="green" :dot="false">Hoy</AppBadge>
          </div>
          <div class="h-px flex-1 bg-matchx-border-base/50" />
        </div>

        <!-- Partidos del día -->
        <div class="space-y-2">
          <AppCard
            v-for="partido in partidosPorFecha[fecha]"
            :key="partido.id"
            :hover="false"
          >
            <div class="flex items-center gap-4">
              <!-- Equipos -->
              <div class="flex-1 flex items-center gap-3 min-w-0">
                <!-- Local -->
                <div class="flex-1 flex items-center justify-end gap-2 min-w-0">
                  <span class="font-semibold text-matchx-text-primary text-sm truncate">
                    {{ nombreEquipo(partido.equipo_local_id) }}
                  </span>
                  <img
                    v-if="escudoEquipo(partido.equipo_local_id)"
                    :src="escudoEquipo(partido.equipo_local_id)!"
                    class="w-8 h-8 rounded-md shrink-0"
                  />
                  <div v-else class="w-8 h-8 rounded-md bg-matchx-bg-elevated border border-matchx-border-base
                                     flex items-center justify-center shrink-0">
                    <Swords class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.5" />
                  </div>
                </div>

                <!-- Marcador / VS -->
                <div class="text-center px-2 shrink-0">
                  <div
                    v-if="partido.estado === 'finalizado' || partido.estado === 'en_curso'"
                    class="text-xl font-bold font-mono text-matchx-text-primary"
                  >
                    {{ partido.goles_local }} – {{ partido.goles_visitante }}
                  </div>
                  <div v-else class="text-base font-bold font-mono text-matchx-text-muted">vs</div>
                </div>

                <!-- Visitante -->
                <div class="flex-1 flex items-center gap-2 min-w-0">
                  <img
                    v-if="escudoEquipo(partido.equipo_visitante_id)"
                    :src="escudoEquipo(partido.equipo_visitante_id)!"
                    class="w-8 h-8 rounded-md shrink-0"
                  />
                  <div v-else class="w-8 h-8 rounded-md bg-matchx-bg-elevated border border-matchx-border-base
                                     flex items-center justify-center shrink-0">
                    <Swords class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.5" />
                  </div>
                  <span class="font-semibold text-matchx-text-primary text-sm truncate">
                    {{ nombreEquipo(partido.equipo_visitante_id) }}
                  </span>
                </div>
              </div>

              <!-- Meta: hora, cancha, estado -->
              <div class="flex flex-col items-end gap-1.5 shrink-0">
                <AppBadge :variant="estadoBadge(partido.estado)">{{ partido.estado }}</AppBadge>
                <div class="flex items-center gap-1 text-xs text-matchx-text-muted">
                  <Clock class="w-3 h-3" :stroke-width="1.75" />
                  {{ formatHora(partido.fecha_hora) }}
                </div>
                <div class="flex items-center gap-1 text-xs text-matchx-text-muted">
                  <MapPin class="w-3 h-3" :stroke-width="1.75" />
                  {{ nombreCancha(partido.cancha_id) }}
                </div>
              </div>
            </div>
          </AppCard>
        </div>
      </div>
    </div>
  </div>
</template>
