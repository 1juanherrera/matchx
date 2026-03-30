<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore } from '@/stores/equipos'
import { usePartidosStore } from '@/stores/partidos'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppDataTable from '@/components/ui/AppDataTable.vue'
import { Trophy, Medal, ChevronUp, ChevronDown, Minus } from 'lucide-vue-next'

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
  if (torneosStore.torneos.length > 0) {
    selectedTorneoId.value = torneosStore.torneos[0].id
  }
})

const torneoOptions = computed(() =>
  torneosStore.torneos.map(t => ({ value: t.id, label: t.nombre })),
)

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
    <div>
      <h1 class="text-3xl font-bold text-matchx-text-primary">Tabla de Posiciones</h1>
      <p class="text-matchx-text-muted mt-1">Clasificación actualizada automáticamente</p>
    </div>

    <AppCard :hover="false">
      <AppSelect v-model="selectedTorneoId" :options="torneoOptions" label="Torneo" />
    </AppCard>

    <AppDataTable
      :columns="columns"
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
        <div class="flex flex-col items-center gap-2 py-4">
          <Trophy class="w-10 h-10 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
          <p class="text-matchx-text-muted text-sm">No hay datos para mostrar</p>
          <p class="text-matchx-text-muted text-xs">Selecciona un torneo con partidos finalizados</p>
        </div>
      </template>
    </AppDataTable>

    <!-- Leyenda -->
    <div v-if="tablaPosicionesConPos.length > 0"
         class="flex flex-wrap gap-4 text-xs text-matchx-text-muted">
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
