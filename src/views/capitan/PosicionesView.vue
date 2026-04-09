<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useEquiposStore } from '@/stores/equipos'
import { usePartidosStore } from '@/stores/partidos'
import { useTorneosStore } from '@/stores/torneos'
import AppDataTable from '@/components/ui/AppDataTable.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { Trophy, Medal, ChevronUp, ChevronDown, Minus } from 'lucide-vue-next'

const auth          = useAuthStore()
const equiposStore  = useEquiposStore()
const partidosStore = usePartidosStore()
const torneosStore  = useTorneosStore()

onMounted(async () => {
  await Promise.all([
    equiposStore.fetchEquipos(),
    partidosStore.fetchPartidos(),
    torneosStore.fetchTorneos(),
  ])
})

const miEquipo = computed(() =>
  equiposStore.equipos.find(e =>
    (auth.user?.equipo_id != null && e.id === auth.user.equipo_id) ||
    (import.meta.env.VITE_MOCK_API === 'true' && e.id === 1)
  ) ?? null,
)

const torneoActual = computed(() =>
  miEquipo.value ? torneosStore.torneos.find(t => t.id === miEquipo.value!.torneo_id) ?? null : null,
)

interface FilaPosicion {
  equipo_id: number
  nombre: string
  escudo_url: string
  pj: number; pg: number; pe: number; pp: number
  gf: number; gc: number; dg: number; pts: number
  pos: number
  esMiEquipo: boolean
}

const tablaPosiciones = computed((): FilaPosicion[] => {
  if (!miEquipo.value?.torneo_id) return []

  const equipos  = equiposStore.equiposPorTorneo(miEquipo.value.torneo_id)
  const partidos = partidosStore.partidosPorTorneo(miEquipo.value.torneo_id)
    .filter(p => p.estado === 'finalizado')

  return equipos.map(equipo => {
    const fila: FilaPosicion = {
      equipo_id: equipo.id,
      nombre:    equipo.nombre,
      escudo_url: equipo.escudo_url,
      pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0, pos: 0,
      esMiEquipo: equipo.id === miEquipo.value!.id,
    }

    for (const p of partidos) {
      const esLocal     = p.equipo_local_id    === equipo.id
      const esVisitante = p.equipo_visitante_id === equipo.id
      if (!esLocal && !esVisitante) continue

      fila.pj++
      const gF = esLocal ? p.goles_local     : p.goles_visitante
      const gC = esLocal ? p.goles_visitante  : p.goles_local
      fila.gf += gF
      fila.gc += gC

      if (gF > gC)      { fila.pg++; fila.pts += 3 }
      else if (gF === gC) { fila.pe++; fila.pts += 1 }
      else                { fila.pp++ }
    }

    fila.dg = fila.gf - fila.gc
    return fila
  })
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf)
    .map((fila, idx) => ({ ...fila, pos: idx + 1 }))
})

const miPosicion = computed(() =>
  tablaPosiciones.value.find(f => f.esMiEquipo) ?? null,
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
      <h1 class="text-3xl font-bold text-matchx-text-primary">Tabla de Posiciones</h1>
      <p class="text-matchx-text-muted mt-1">
        {{ torneoActual ? torneoActual.nombre : 'Cargando torneo...' }}
      </p>
    </div>

    <!-- Sin equipo -->
    <div v-if="!miEquipo" class="flex flex-col items-center gap-3 py-16">
      <Trophy class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-muted">No tienes un equipo asignado</p>
    </div>

    <template v-else>
      <!-- Resumen mi posición -->
      <AppCard v-if="miPosicion" :hover="false">
        <div class="flex items-center gap-4">
          <img :src="miEquipo.escudo_url" :alt="miEquipo.nombre" class="w-12 h-12 rounded-xl" />
          <div class="flex-1">
            <p class="text-xs text-matchx-text-muted uppercase tracking-wider mb-0.5">Tu posición</p>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-black text-matchx-accent-green">{{ miPosicion.pos }}°</span>
              <span class="text-matchx-text-primary font-semibold">{{ miEquipo.nombre }}</span>
            </div>
          </div>
          <!-- Stats clave -->
          <div class="hidden sm:flex items-center gap-6 text-center">
            <div>
              <p class="text-2xl font-bold text-matchx-accent-green">{{ miPosicion.pts }}</p>
              <p class="text-xs text-matchx-text-muted">Pts</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-matchx-text-primary">{{ miPosicion.pj }}</p>
              <p class="text-xs text-matchx-text-muted">PJ</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-matchx-accent-green">{{ miPosicion.pg }}</p>
              <p class="text-xs text-matchx-text-muted">PG</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-matchx-text-muted">{{ miPosicion.pe }}</p>
              <p class="text-xs text-matchx-text-muted">PE</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-matchx-accent-orange">{{ miPosicion.pp }}</p>
              <p class="text-xs text-matchx-text-muted">PP</p>
            </div>
          </div>
        </div>
      </AppCard>

      <!-- Tabla -->
      <AppDataTable :columns="columns" :rows="tablaPosiciones" row-key="equipo_id"
        :row-class="(row) => row.esMiEquipo ? 'bg-matchx-accent-green/5 border-l-2 border-matchx-accent-green' : ''"
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

        <!-- Equipo -->
        <template #cell-nombre="{ row }">
          <div class="flex items-center gap-2">
            <img :src="row.escudo_url" :alt="row.nombre" class="w-6 h-6 rounded bg-matchx-bg-elevated" />
            <span :class="[
              'font-medium',
              row.esMiEquipo ? 'text-matchx-accent-green' : row.pos <= 3 ? 'text-matchx-text-primary' : 'text-matchx-text-secondary',
            ]">
              {{ row.nombre }}
            </span>
            <span v-if="row.esMiEquipo"
              class="text-xs font-semibold text-matchx-accent-green/70 bg-matchx-accent-green/10
                     px-1.5 py-0.5 rounded">
              Tú
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
            <ChevronUp   v-if="value > 0"   class="w-3.5 h-3.5 text-matchx-accent-green"  :stroke-width="2.5" />
            <ChevronDown v-else-if="value < 0" class="w-3.5 h-3.5 text-matchx-accent-orange" :stroke-width="2.5" />
            <Minus       v-else              class="w-3.5 h-3.5 text-matchx-text-muted"    :stroke-width="2.5" />
            <span :class="value > 0 ? 'text-matchx-accent-green' : value < 0 ? 'text-matchx-accent-orange' : 'text-matchx-text-muted'"
              class="text-sm font-medium">
              {{ Math.abs(value) }}
            </span>
          </div>
        </template>

        <!-- Puntos -->
        <template #cell-pts="{ value }">
          <span class="font-bold text-base text-matchx-accent-green">{{ value }}</span>
        </template>

        <!-- Empty -->
        <template #empty>
          <div class="flex flex-col items-center gap-2 py-8">
            <Trophy class="w-10 h-10 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
            <p class="text-matchx-text-muted text-sm">No hay partidos finalizados en este torneo</p>
          </div>
        </template>
      </AppDataTable>

      <!-- Leyenda -->
      <div v-if="tablaPosiciones.length > 0"
           class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-matchx-text-muted">
        <span>PJ: Jugados</span>
        <span>PG: Ganados</span>
        <span>PE: Empatados</span>
        <span>PP: Perdidos</span>
        <span>GF: Goles a favor</span>
        <span>GC: Goles en contra</span>
        <span>DG: Diferencia</span>
        <span class="text-matchx-accent-green font-medium">PTS: Puntos</span>
      </div>
    </template>
  </div>
</template>
