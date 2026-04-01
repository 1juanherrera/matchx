<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore } from '@/stores/equipos'
import { usePartidosStore } from '@/stores/partidos'
import AppDataTable from '@/components/ui/AppDataTable.vue'
import { Trophy, Medal, ChevronUp, ChevronDown, Minus } from 'lucide-vue-next'

const route = useRoute()
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

// Sync query param if changes from outside
watch(() => route.query.torneo, (val) => {
  const id = Number(val)
  if (id && torneosStore.torneos.find(t => t.id === id)) {
    selectedTorneoId.value = id
  }
})

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
  pos: number
}

const tablaPosiciones = computed((): FilaPosicion[] => {
  if (selectedTorneoId.value === null) return []

  const equipos = equiposStore.equiposPorTorneo(selectedTorneoId.value)
  const partidos = partidosStore.partidosPorTorneo(selectedTorneoId.value)
    .filter(p => p.estado === 'finalizado')

  return equipos.map((equipo, _) => {
    const fila = {
      equipo_id: equipo.id,
      nombre: equipo.nombre,
      escudo_url: equipo.escudo_url,
      pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0, pos: 0,
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
  })
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf)
    .map((fila, idx) => ({ ...fila, pos: idx + 1 }))
})

const torneoActual = computed(() =>
  torneosStore.torneos.find(t => t.id === selectedTorneoId.value),
)

const columns = [
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
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-black text-matchx-text-primary" style="font-family: 'Fira Code', monospace; letter-spacing: -0.02em">
        Tabla de <span class="text-matchx-accent-green">Posiciones</span>
      </h1>
      <p class="text-matchx-text-muted mt-1 text-sm">Clasificación actualizada en tiempo real</p>
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

    <!-- Tabla -->
    <div>
      <div v-if="torneoActual" class="flex items-center gap-3 mb-3">
        <Trophy class="w-4 h-4 text-matchx-accent-green" :stroke-width="2" />
        <span class="text-sm font-semibold text-matchx-text-secondary">{{ torneoActual.nombre }}</span>
        <span class="text-xs text-matchx-text-muted">· {{ torneoActual.modalidad_codigo }}</span>
      </div>

      <AppDataTable :columns="columns" :rows="tablaPosiciones" row-key="equipo_id">
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
            <img :src="row.escudo_url" :alt="row.nombre" class="w-6 h-6 rounded bg-matchx-bg-elevated" />
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
          <div class="flex flex-col items-center gap-2 py-8">
            <Trophy class="w-10 h-10 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
            <p class="text-matchx-text-muted text-sm">No hay partidos finalizados en este torneo</p>
          </div>
        </template>
      </AppDataTable>
    </div>

    <!-- Leyenda -->
    <div
      v-if="tablaPosiciones.length > 0"
      class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-matchx-text-muted"
    >
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
</template>
