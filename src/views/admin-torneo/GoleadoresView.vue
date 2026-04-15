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
import { Trophy, Medal, Loader2 } from 'lucide-vue-next'

const torneosStore  = useTorneosStore()
const equiposStore  = useEquiposStore()
const jugadoresStore = useJugadoresStore()
const partidosStore = usePartidosStore()

const selectedTorneoId = ref<number | null>(null)
const loading = ref(false)
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

watch(selectedTorneoId, async (torneoId) => {
  if (torneoId === null) { golesMap.value = new Map(); return }
  await cargarGoles(torneoId)
}, { immediate: false })

async function cargarGoles(torneoId: number) {
  loading.value = true
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
    loading.value = false
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

const torneoOptions = computed(() =>
  torneosStore.torneos.map(t => ({ value: t.id, label: t.nombre })),
)

const columns = [
  { key: 'pos',      label: '#',       width: '56px' },
  { key: 'jugador',  label: 'Jugador' },
  { key: 'equipo',   label: 'Equipo' },
  { key: 'goles',    label: 'Goles',   width: '80px' },
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-matchx-text-primary">Tabla de Goleadores</h1>
      <p class="text-matchx-text-muted mt-1">Goles anotados por jugador en el torneo</p>
    </div>

    <AppCard :hover="false">
      <AppSelect v-model="selectedTorneoId" :options="torneoOptions" label="Torneo" />
    </AppCard>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center gap-2 py-12 text-matchx-text-muted">
      <Loader2 class="w-5 h-5 animate-spin" :stroke-width="2" />
      <span class="text-sm">Cargando estadísticas...</span>
    </div>

    <AppDataTable
      v-else
      :columns="columns"
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
          <v-icon name="co-football" class="text-matchx-accent-orange" scale="0.75" />
          <span class="font-bold text-matchx-text-primary">{{ value }}</span>
        </div>
      </template>

      <!-- Empty -->
      <template #empty>
        <div class="flex flex-col items-center gap-2 py-4">
          <v-icon name="co-football" class="text-matchx-text-muted opacity-30" scale="2" />
          <p class="text-matchx-text-muted text-sm">No hay goles registrados en este torneo</p>
          <p class="text-matchx-text-muted text-xs">Los goles se registran desde la mesa de control</p>
        </div>
      </template>
    </AppDataTable>

    <div v-if="tablaGoleadores.length > 0" class="flex items-center gap-1.5 text-xs text-matchx-text-muted">
      <v-icon name="co-football" class="text-matchx-accent-orange" scale="0.65" />
      <span>Incluye goles en juego y penales convertidos · Autogoles no contabilizados</span>
    </div>
  </div>
</template>
