<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore } from '@/stores/equipos'
import { usePartidosStore } from '@/stores/partidos'
import { CalendarRange, Clock, CheckCircle2, ArrowRight } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const torneosStore = useTorneosStore()
const equiposStore = useEquiposStore()
const partidosStore = usePartidosStore()

const selectedTorneoId = ref<number | null>(null)

onMounted(async () => {
  await Promise.all([
    torneosStore.fetchTorneos(),
    equiposStore.fetchEquipos(),
    partidosStore.fetchPartidos(),
  ])
  const queryTorneo = Number(route.query.torneo)
  if (queryTorneo && torneosStore.torneos.find(t => t.id === queryTorneo)) {
    selectedTorneoId.value = queryTorneo
  } else if (torneosStore.torneos.length > 0) {
    selectedTorneoId.value = torneosStore.torneos[0].id
  }
})

watch(() => route.query.torneo, (val) => {
  const id = Number(val)
  if (id && torneosStore.torneos.find(t => t.id === id)) {
    selectedTorneoId.value = id
  }
})

const equipoMap = computed(() => {
  const map: Record<number, { nombre: string; escudo_url: string }> = {}
  for (const e of equiposStore.equipos) {
    map[e.id] = { nombre: e.nombre, escudo_url: e.escudo_url }
  }
  return map
})

interface PartidoConEquipos {
  id: number
  jornada: number
  fecha_hora: string
  estado: string
  goles_local: number
  goles_visitante: number
  localNombre: string
  localEscudo: string
  visitanteNombre: string
  visitanteEscudo: string
}

const partidosPorJornada = computed(() => {
  if (selectedTorneoId.value === null) return {}

  const partidos = partidosStore.partidosPorTorneo(selectedTorneoId.value)

  const enriquecidos: PartidoConEquipos[] = partidos.map(p => ({
    id: p.id,
    jornada: p.jornada,
    fecha_hora: p.fecha_hora,
    estado: p.estado,
    goles_local: p.goles_local,
    goles_visitante: p.goles_visitante,
    localNombre: equipoMap.value[p.equipo_local_id]?.nombre ?? 'Equipo',
    localEscudo: equipoMap.value[p.equipo_local_id]?.escudo_url ?? '',
    visitanteNombre: equipoMap.value[p.equipo_visitante_id]?.nombre ?? 'Equipo',
    visitanteEscudo: equipoMap.value[p.equipo_visitante_id]?.escudo_url ?? '',
  }))

  const grupos: Record<number, PartidoConEquipos[]> = {}
  for (const p of enriquecidos) {
    if (!grupos[p.jornada]) grupos[p.jornada] = []
    grupos[p.jornada].push(p)
  }
  return grupos
})

const jornadas = computed(() =>
  Object.keys(partidosPorJornada.value).map(Number).sort((a, b) => a - b),
)

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'short', day: '2-digit', month: 'short',
  })

const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-black text-matchx-text-primary" style="font-family: 'Fira Code', monospace; letter-spacing: -0.02em">
        Fixture & <span class="text-matchx-accent-green">Resultados</span>
      </h1>
      <p class="text-matchx-text-muted mt-1 text-sm">Partidos y marcadores de cada jornada</p>
    </div>

    <!-- Selector de torneo -->
    <div class="bg-matchx-bg-surface rounded-xl border border-matchx-border-base p-4">
      <label class="block text-xs font-semibold text-matchx-text-muted uppercase tracking-wider mb-2">
        Torneo
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="torneo in torneosStore.torneos"
          :key="torneo.id"
          @click="selectedTorneoId = torneo.id"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer border"
          :class="selectedTorneoId === torneo.id
            ? 'bg-matchx-accent-green/10 text-matchx-accent-green border-matchx-accent-green/40'
            : 'text-matchx-text-secondary border-matchx-border-base hover:border-matchx-accent-green/20 hover:text-matchx-text-primary'"
        >
          {{ torneo.nombre }}
        </button>
      </div>
    </div>

    <!-- Jornadas -->
    <div v-if="jornadas.length > 0" class="space-y-6">
      <div v-for="jornada in jornadas" :key="jornada">
        <!-- Jornada divider -->
        <div class="flex items-center gap-3 mb-3">
          <div class="h-px flex-1 bg-matchx-border-base/50" />
          <span class="text-xs font-semibold text-matchx-text-muted uppercase tracking-wider">
            Jornada {{ jornada }}
          </span>
          <div class="h-px flex-1 bg-matchx-border-base/50" />
        </div>

        <!-- Partidos de la jornada -->
        <div class="space-y-2">
          <div
            v-for="partido in partidosPorJornada[jornada]"
            :key="partido.id"
            class="bg-matchx-bg-surface rounded-xl border border-matchx-border-base overflow-hidden"
            :class="partido.estado === 'finalizado' ? 'border-matchx-border-base' : 'border-blue-500/20'"
          >
            <!-- Estado bar -->
            <div
              class="h-0.5 w-full"
              :class="partido.estado === 'finalizado' ? 'bg-matchx-accent-green/30' : 'bg-blue-500/30'"
            />

            <div class="p-4">
              <!-- Meta info -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-1.5 text-xs text-matchx-text-muted">
                  <CalendarRange class="w-3.5 h-3.5" :stroke-width="1.75" />
                  <span>{{ formatFecha(partido.fecha_hora) }}</span>
                  <Clock class="w-3 h-3 ml-1" :stroke-width="1.75" />
                  <span>{{ formatHora(partido.fecha_hora) }}</span>
                </div>
                <div class="flex items-center gap-1 text-xs font-semibold"
                  :class="partido.estado === 'finalizado' ? 'text-matchx-accent-green' : 'text-blue-400'">
                  <CheckCircle2 v-if="partido.estado === 'finalizado'" class="w-3.5 h-3.5" :stroke-width="2" />
                  <Clock v-else class="w-3.5 h-3.5" :stroke-width="2" />
                  {{ partido.estado === 'finalizado' ? 'Finalizado' : 'Programado' }}
                </div>
              </div>

              <!-- Equipos + marcador -->
              <div class="flex items-center gap-3">
                <!-- Local -->
                <div class="flex-1 flex items-center gap-2 justify-end">
                  <span class="text-sm font-semibold text-matchx-text-primary text-right leading-tight">
                    {{ partido.localNombre }}
                  </span>
                  <img
                    :src="partido.localEscudo"
                    :alt="partido.localNombre"
                    class="w-8 h-8 rounded bg-matchx-bg-elevated shrink-0"
                  />
                </div>

                <!-- Marcador -->
                <div class="flex items-center gap-1 shrink-0">
                  <div
                    class="w-9 h-9 flex items-center justify-center rounded-lg font-black text-lg"
                    :class="partido.estado === 'finalizado'
                      ? 'bg-matchx-bg-elevated text-matchx-text-primary'
                      : 'bg-matchx-bg-elevated text-matchx-text-muted'"
                  >
                    {{ partido.estado === 'finalizado' ? partido.goles_local : '-' }}
                  </div>
                  <span class="text-matchx-text-muted text-sm font-bold">:</span>
                  <div
                    class="w-9 h-9 flex items-center justify-center rounded-lg font-black text-lg"
                    :class="partido.estado === 'finalizado'
                      ? 'bg-matchx-bg-elevated text-matchx-text-primary'
                      : 'bg-matchx-bg-elevated text-matchx-text-muted'"
                  >
                    {{ partido.estado === 'finalizado' ? partido.goles_visitante : '-' }}
                  </div>
                </div>

                <!-- Visitante -->
                <div class="flex-1 flex items-center gap-2">
                  <img
                    :src="partido.visitanteEscudo"
                    :alt="partido.visitanteNombre"
                    class="w-8 h-8 rounded bg-matchx-bg-elevated shrink-0"
                  />
                  <span class="text-sm font-semibold text-matchx-text-primary leading-tight">
                    {{ partido.visitanteNombre }}
                  </span>
                </div>
              </div>

              <!-- Ver detalle -->
              <div class="mt-3 pt-3 border-t border-matchx-border-base flex justify-end">
                <button
                  @click="router.push(`/publico/partidos/${partido.id}`)"
                  class="flex items-center gap-1.5 text-xs font-semibold text-matchx-accent-green
                         hover:opacity-70 transition-opacity cursor-pointer"
                >
                  Ver alineación y estadísticas
                  <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!torneosStore.loading"
      class="flex flex-col items-center gap-3 py-16 text-center"
    >
      <CalendarRange class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-muted">No hay partidos programados en este torneo</p>
    </div>
  </div>
</template>
