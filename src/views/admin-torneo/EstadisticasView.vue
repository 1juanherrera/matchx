<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore } from '@/stores/equipos'
import { useJugadoresStore } from '@/stores/jugadores'
import { usePartidosStore } from '@/stores/partidos'
import { eventosService } from '@/services/eventos.service'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppDataTable from '@/components/ui/AppDataTable.vue'
import { Trophy, Medal, ChevronUp, ChevronDown, Minus, Loader2, BarChart3, Target } from 'lucide-vue-next'

const torneosStore = useTorneosStore()
const equiposStore = useEquiposStore()
const jugadoresStore = useJugadoresStore()
const partidosStore = usePartidosStore()

const selectedTorneoId = ref<number | null>(null)
const activeTab = ref<'posiciones' | 'goleadores'>('posiciones')

// ==========================================
// ESTADO COMPARTIDO
// ==========================================
onMounted(async () => {
  await Promise.all([
    torneosStore.fetchTorneos(),
    equiposStore.fetchEquipos(),
    jugadoresStore.fetchJugadores(),
    partidosStore.fetchPartidos(),
  ])
  if (torneosStore.torneos.length > 0) {
    selectedTorneoId.value = torneosStore.torneos[0].id
  }
})

const torneoOptions = computed(() =>
  torneosStore.torneos.map(t => ({ value: t.id, label: t.nombre })),
)

// ==========================================
// TABLA DE POSICIONES
// ==========================================
interface FilaPosicion {
  equipo_id: number
  nombre: string
  escudo_url: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  dg: number
  pts: number
}

const tablaPosiciones = computed((): FilaPosicion[] => {
  if (selectedTorneoId.value === null) return []

  const equipos = equiposStore.equiposPorTorneo(selectedTorneoId.value)
  const partidos = partidosStore.partidosPorTorneo(selectedTorneoId.value)
    .filter(p => p.estado === 'finalizado')

  return equipos.map(equipo => {
    const fila: FilaPosicion = {
      equipo_id: equipo.id,
      nombre: equipo.nombre,
      escudo_url: equipo.escudo_url,
      pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0,
    }

    for (const p of partidos) {
      const esLocal = p.equipo_local_id === equipo.id
      const esVisitante = p.equipo_visitante_id === equipo.id
      if (!esLocal && !esVisitante) continue

      fila.pj++
      const golesFavor = esLocal ? p.goles_local : p.goles_visitante
      const golesContra = esLocal ? p.goles_visitante : p.goles_local
      fila.gf += golesFavor
      fila.gc += golesContra

      if (golesFavor > golesContra) { fila.pg++; fila.pts += 3 }
      else if (golesFavor === golesContra) { fila.pe++; fila.pts += 1 }
      else { fila.pp++ }
    }

    fila.dg = fila.gf - fila.gc
    return fila
  }).sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf)
})

const tablaPosicionesConPos = computed(() =>
  tablaPosiciones.value.map((fila, idx) => ({ ...fila, pos: idx + 1 })),
)

const posColumns = [
  { key: 'pos',    label: '#',   width: '48px' },
  { key: 'nombre', label: 'Equipo' },
  { key: 'pj',    label: 'PJ',  width: '48px' },
  { key: 'pg',    label: 'PG',  width: '48px' },
  { key: 'pe',    label: 'PE',  width: '48px' },
  { key: 'pp',    label: 'PP',  width: '48px' },
  { key: 'gf',    label: 'GF',  width: '48px' },
  { key: 'gc',    label: 'GC',  width: '48px' },
  { key: 'dg',    label: 'DG',  width: '56px' },
  { key: 'pts',   label: 'PTS', width: '56px' },
]

// ==========================================
// TABLA DE GOLEADORES
// ==========================================
const loadingGoles = ref(false)
const golesMap = ref<Map<number, number>>(new Map())

// Avatar helpers
const avatarColors = [
  'bg-matchx-accent-green/20 text-matchx-accent-green',
  'bg-matchx-accent-orange/20 text-matchx-accent-orange',
  'bg-blue-500/20 text-blue-400',
  'bg-purple-500/20 text-purple-400',
]
const avatarColor = (id: number) => avatarColors[id % 4]
const iniciales = (nombre: string, apellido: string) =>
  `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()

watch(selectedTorneoId, async (torneoId) => {
  if (torneoId === null) { golesMap.value = new Map(); return }
  await cargarGoles(torneoId)
}, { immediate: false })

async function cargarGoles(torneoId: number) {
  loadingGoles.value = true
  const mapa = new Map<number, number>()
  try {
    const partidos = partidosStore.partidosPorTorneo(torneoId)
      .filter(p => p.estado === 'finalizado')
    const resultados = await Promise.all(
      partidos.map(p => eventosService.getByPartido(p.id).catch(() => [])),
    )
    for (const eventos of resultados) {
      for (const ev of eventos) {
        const esGol = ev.tipo_evento === 'gol' || ev.tipo_evento === 'penal_convertido'
        const esAutogol = (ev as any).es_autogol === 1
        if (esGol && ev.jugador_id && !esAutogol) {
          mapa.set(ev.jugador_id, (mapa.get(ev.jugador_id) ?? 0) + 1)
        }
      }
    }
  } finally {
    golesMap.value = mapa
    loadingGoles.value = false
  }
}

interface FilaGoleador {
  pos: number
  jugador_id: number
  nombre: string
  apellido: string
  equipo_id: number
  equipo_nombre: string
  escudo_url: string
  goles: number
}

const tablaGoleadores = computed((): FilaGoleador[] => {
  if (selectedTorneoId.value === null || golesMap.value.size === 0) return []
  const filas: FilaGoleador[] = []
  for (const [jugadorId, goles] of golesMap.value.entries()) {
    const jugador = jugadoresStore.obtenerPorId(jugadorId)
    if (!jugador) continue
    const equipo = equiposStore.equipos.find(e => e.id === jugador.equipo_id)
    filas.push({
      pos: 0,
      jugador_id: jugadorId,
      nombre: jugador.nombre,
      apellido: jugador.apellido,
      equipo_id: jugador.equipo_id,
      equipo_nombre: equipo?.nombre ?? '—',
      escudo_url: equipo?.escudo_url ?? '',
      goles,
    })
  }
  return filas
    .sort((a, b) => b.goles - a.goles || a.apellido.localeCompare(b.apellido))
    .map((f, idx) => ({ ...f, pos: idx + 1 }))
})

const golColumns = [
  { key: 'pos',      label: '#',       width: '56px' },
  { key: 'jugador',  label: 'Jugador' },
  { key: 'equipo',   label: 'Equipo' },
  { key: 'goles',    label: 'Goles',   width: '80px' },
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Estadísticas</h1>
        <p class="text-matchx-text-muted mt-1">Tabla de posiciones y goleadores del torneo</p>
      </div>

      <!-- Selector de Tab -->
      <div class="flex bg-matchx-bg-surface p-1 rounded-lg border border-matchx-border-base shrink-0">
        <button
          @click="activeTab = 'posiciones'"
          :class="[
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'posiciones'
              ? 'bg-matchx-accent-green text-matchx-bg-base'
              : 'text-matchx-text-secondary hover:text-matchx-text-primary hover:bg-matchx-bg-elevated'
          ]"
        >
          <BarChart3 class="w-4 h-4" :stroke-width="2" />
          Posiciones
        </button>
        <button
          @click="activeTab = 'goleadores'"
          :class="[
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'goleadores'
              ? 'bg-matchx-accent-green text-matchx-bg-base'
              : 'text-matchx-text-secondary hover:text-matchx-text-primary hover:bg-matchx-bg-elevated'
          ]"
        >
          <v-icon name="co-football" scale="0.9" />
          Goleadores
        </button>
      </div>
    </div>

    <AppCard :hover="false">
      <AppSelect v-model="selectedTorneoId" :options="torneoOptions" label="Torneo" />
    </AppCard>

    <!-- VISTA POSICIONES -->
    <div v-if="activeTab === 'posiciones'" class="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <AppDataTable
        :columns="posColumns"
        :rows="tablaPosicionesConPos"
        row-key="equipo_id"
      >
        <!-- Posición -->
        <template #cell-pos="{ value }">
          <div class="flex items-center justify-center">
            <Trophy v-if="value === 1" class="w-4 h-4 text-matchx-accent-green" :stroke-width="2" />
            <Medal v-else-if="value === 2" class="w-4 h-4 text-matchx-text-secondary" :stroke-width="2" />
            <Medal v-else-if="value === 3" class="w-4 h-4 text-matchx-accent-orange" :stroke-width="2" />
            <span v-else class="text-sm text-matchx-text-muted font-medium">{{ value }}</span>
          </div>
        </template>

        <!-- Equipo -->
        <template #cell-nombre="{ row }">
          <div class="flex items-center gap-2">
            <img v-if="row.escudo_url" :src="row.escudo_url" :alt="row.nombre" class="w-6 h-6 rounded bg-matchx-bg-elevated shrink-0" />
            <div v-else class="w-6 h-6 rounded bg-matchx-bg-elevated shrink-0 flex items-center justify-center">
              <Trophy class="w-3 h-3 text-matchx-text-muted" />
            </div>
            <span
              :class="[
                'font-medium',
                row.pos <= 3 ? 'text-matchx-text-primary' : 'text-matchx-text-secondary',
              ]"
            >
              {{ row.nombre }}
            </span>
          </div>
        </template>

        <!-- PG verde -->
        <template #cell-pg="{ value }">
          <span class="text-matchx-accent-green font-medium">{{ value }}</span>
        </template>

        <!-- PP naranja -->
        <template #cell-pp="{ value }">
          <span class="text-matchx-accent-orange">{{ value }}</span>
        </template>

        <!-- Diferencia de goles -->
        <template #cell-dg="{ value }">
          <div class="flex items-center gap-0.5">
            <ChevronUp v-if="value > 0" class="w-3.5 h-3.5 text-matchx-accent-green shrink-0" :stroke-width="2.5" />
            <ChevronDown v-else-if="value < 0" class="w-3.5 h-3.5 text-matchx-accent-orange shrink-0" :stroke-width="2.5" />
            <Minus v-else class="w-3.5 h-3.5 text-matchx-text-muted shrink-0" :stroke-width="2.5" />
            <span
              :class="value > 0 ? 'text-matchx-accent-green' : value < 0 ? 'text-matchx-accent-orange' : 'text-matchx-text-muted'"
              class="text-sm font-medium"
            >
              {{ Math.abs(value) }}
            </span>
          </div>
        </template>

        <!-- Puntos -->
        <template #cell-pts="{ value }">
          <span class="font-bold text-base text-matchx-accent-green">{{ value }}</span>
        </template>

        <!-- Empty state -->
        <template #empty>
          <div class="flex flex-col items-center gap-2 py-4">
            <Trophy class="w-10 h-10 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
            <p class="text-matchx-text-muted text-sm">No hay datos para mostrar</p>
            <p class="text-matchx-text-muted text-xs">Selecciona un torneo con partidos finalizados</p>
          </div>
        </template>
      </AppDataTable>

      <div v-if="tablaPosicionesConPos.length > 0"
           class="flex flex-wrap gap-4 text-xs text-matchx-text-muted mt-4">
        <span>PJ: Jugados</span>
        <span>PG: Ganados</span>
        <span>PE: Empatados</span>
        <span>PP: Perdidos</span>
        <span>GF: Goles a favor</span>
        <span>GC: Goles en contra</span>
        <span>DG: Diferencia</span>
        <span class="text-matchx-accent-green font-medium">PTS: Puntos</span>
      </div>
    </div>

    <!-- VISTA GOLEADORES -->
    <div v-else-if="activeTab === 'goleadores'" class="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <!-- Loading -->
      <div v-if="loadingGoles" class="flex items-center justify-center gap-2 py-12 text-matchx-text-muted bg-matchx-bg-surface rounded-lg border border-matchx-border-base">
        <Loader2 class="w-5 h-5 animate-spin" :stroke-width="2" />
        <span class="text-sm">Cargando estadísticas...</span>
      </div>

      <AppDataTable
        v-else
        :columns="golColumns"
        :rows="tablaGoleadores"
        row-key="jugador_id"
      >
        <!-- Posición -->
        <template #cell-pos="{ value }">
          <div class="flex items-center justify-center">
            <Trophy v-if="value === 1" class="w-4 h-4 text-matchx-accent-green" :stroke-width="2" />
            <Medal  v-else-if="value === 2" class="w-4 h-4 text-matchx-text-secondary" :stroke-width="2" />
            <Medal  v-else-if="value === 3" class="w-4 h-4 text-matchx-accent-orange"  :stroke-width="2" />
            <span v-else class="text-sm text-matchx-text-muted font-medium">{{ value }}</span>
          </div>
        </template>

        <!-- Jugador -->
        <template #cell-jugador="{ row }">
          <div class="flex items-center gap-2.5">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              :class="avatarColor(row.jugador_id)"
            >
              {{ iniciales(row.nombre, row.apellido) }}
            </div>
            <span class="font-medium text-matchx-text-primary">
              {{ row.nombre }} {{ row.apellido }}
            </span>
          </div>
        </template>

        <!-- Equipo -->
        <template #cell-equipo="{ row }">
          <div class="flex items-center gap-2">
            <img
              v-if="row.escudo_url"
              :src="row.escudo_url"
              :alt="row.equipo_nombre"
              class="w-5 h-5 rounded bg-matchx-bg-elevated shrink-0"
            />
            <span class="text-matchx-text-secondary text-sm">{{ row.equipo_nombre }}</span>
          </div>
        </template>

        <!-- Goles -->
        <template #cell-goles="{ value }">
          <div class="flex items-center gap-1.5">
            <v-icon name="co-football" class="text-matchx-accent-orange" scale="0.9" />
            <span class="font-bold text-matchx-text-primary">{{ value }}</span>
          </div>
        </template>

        <!-- Empty -->
        <template #empty>
          <div class="flex flex-col items-center gap-2 py-4">
            <v-icon name="co-football" class="text-matchx-accent-orange" scale="0.9" />
            <p class="text-matchx-text-muted text-sm">No hay goles registrados en este torneo</p>
            <p class="text-matchx-text-muted text-xs">Los goles se registran desde la mesa de control</p>
          </div>
        </template>
      </AppDataTable>

      <div v-if="tablaGoleadores.length > 0" class="flex items-center gap-1.5 text-xs text-matchx-text-muted mt-4">
        <CoFootball class="w-3.5 h-3.5 text-matchx-accent-orange" />
        <span>Incluye goles en juego y penales convertidos · Autogoles no contabilizados</span>
      </div>
    </div>
  </div>
</template>
