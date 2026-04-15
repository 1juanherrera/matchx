<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore } from '@/stores/equipos'
import { useJugadoresStore } from '@/stores/jugadores'
import { usePartidosStore } from '@/stores/partidos'
import { eventosService } from '@/services/eventos.service'
import { Loader2, ShieldAlert } from 'lucide-vue-next'

const route = useRoute()
const torneosStore = useTorneosStore()
const equiposStore = useEquiposStore()
const jugadoresStore = useJugadoresStore()
const partidosStore = usePartidosStore()

const selectedTorneoId = ref<number | null>(null)
const loading = ref(false)

// jugador_id → cantidad de goles
const golesMap = ref<Map<number, number>>(new Map())

// Avatar helpers (patrón estándar del proyecto)
const avatarColors = [
  'bg-matchx-accent-green/20 text-matchx-accent-green',
  'bg-matchx-accent-orange/20 text-matchx-accent-orange',
  'bg-blue-500/20 text-blue-400',
  'bg-purple-500/20 text-purple-400',
]
const avatarColor = (id: number) => avatarColors[id % 4]
const iniciales = (nombre: string, apellido: string) =>
  `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()

// ── Carga de datos ────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([
    torneosStore.fetchTorneos(),
    equiposStore.fetchEquipos(),
    jugadoresStore.fetchJugadores(),
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

// Al cambiar de torneo, recalcular goles
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
        const tieneJugador = !!ev.jugador_id
        // es_autogol no está en EventoPartidoAPI tipado, pero el backend puede enviarlo
        const esAutogol = (ev as any).es_autogol === 1
        if (esGol && tieneJugador && !esAutogol) {
          mapa.set(ev.jugador_id!, (mapa.get(ev.jugador_id!) ?? 0) + 1)
        }
      }
    }
  } finally {
    golesMap.value = mapa
    loading.value = false
  }
}

// ── Tabla goleadores ──────────────────────────────────────────────────────────

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

const torneoActual = computed(() =>
  torneosStore.torneos.find(t => t.id === selectedTorneoId.value),
)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-black text-matchx-text-primary" style="font-family: 'Fira Code', monospace; letter-spacing: -0.02em">
        Tabla de <span class="text-matchx-accent-orange">Goleadores</span>
      </h1>
      <p class="text-matchx-text-muted mt-1 text-sm">Estadísticas de goles por jugador en cada torneo</p>
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
            ? 'bg-matchx-accent-orange/10 text-matchx-accent-orange border-matchx-accent-orange/40'
            : 'text-matchx-text-secondary border-matchx-border-base hover:border-matchx-accent-orange/20 hover:text-matchx-text-primary'"
        >
          {{ torneo.nombre }}
        </button>
      </div>
    </div>

    <!-- Tabla -->
    <div>
      <div v-if="torneoActual" class="flex items-center gap-3 mb-3">
        <v-icon name="co-football" class="text-matchx-accent-orange" scale="0.9" />
        <span class="text-sm font-semibold text-matchx-text-secondary">{{ torneoActual.nombre }}</span>
        <span class="text-xs text-matchx-text-muted">· {{ torneoActual.modalidad_codigo }}</span>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center gap-2 py-12 text-matchx-text-muted">
        <Loader2 class="w-5 h-5 animate-spin" :stroke-width="2" />
        <span class="text-sm">Cargando estadísticas...</span>
      </div>

      <!-- Tabla con datos -->
      <div v-else-if="tablaGoleadores.length > 0" class="bg-matchx-bg-surface rounded-xl border border-matchx-border-base overflow-hidden">
        <!-- Podio top 3 -->
        <div class="grid grid-cols-3 gap-px bg-matchx-border-base border-b border-matchx-border-base">
          <div
            v-for="goleador in tablaGoleadores.slice(0, 3)"
            :key="goleador.jugador_id"
            class="bg-matchx-bg-surface p-4 flex flex-col items-center gap-2 text-center"
            :class="goleador.pos === 1 ? 'bg-matchx-accent-orange/5' : ''"
          >
            <!-- Avatar -->
            <div class="relative">
              <div
                class="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
                :class="avatarColor(goleador.jugador_id)"
              >
                {{ iniciales(goleador.nombre, goleador.apellido) }}
              </div>
              <!-- Posición badge -->
              <div
                class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                :class="{
                  'bg-matchx-accent-orange text-matchx-bg-base': goleador.pos === 1,
                  'bg-matchx-text-secondary text-matchx-bg-base': goleador.pos === 2,
                  'bg-amber-700 text-white': goleador.pos === 3,
                }"
              >
                {{ goleador.pos }}
              </div>
            </div>

            <!-- Goles -->
            <div class="text-2xl font-black" :class="goleador.pos === 1 ? 'text-matchx-accent-orange' : 'text-matchx-text-primary'">
              {{ goleador.goles }}
              <span class="text-xs font-medium text-matchx-text-muted ml-0.5">gols</span>
            </div>

            <!-- Nombre -->
            <div>
              <p class="text-sm font-semibold text-matchx-text-primary leading-tight">
                {{ goleador.nombre }} {{ goleador.apellido }}
              </p>
              <div class="flex items-center justify-center gap-1 mt-0.5">
                <img
                  v-if="goleador.escudo_url"
                  :src="goleador.escudo_url"
                  :alt="goleador.equipo_nombre"
                  class="w-3.5 h-3.5 rounded"
                />
                <p class="text-xs text-matchx-text-muted">{{ goleador.equipo_nombre }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Resto de la tabla -->
        <div v-if="tablaGoleadores.length > 3">
          <div
            v-for="goleador in tablaGoleadores.slice(3)"
            :key="goleador.jugador_id"
            class="flex items-center gap-3 px-4 py-3 border-b border-matchx-border-base last:border-0
                   hover:bg-matchx-bg-elevated transition-colors duration-100"
          >
            <!-- Posición -->
            <span class="w-7 text-center text-sm font-medium text-matchx-text-muted shrink-0">
              {{ goleador.pos }}
            </span>

            <!-- Avatar -->
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              :class="avatarColor(goleador.jugador_id)"
            >
              {{ iniciales(goleador.nombre, goleador.apellido) }}
            </div>

            <!-- Nombre + equipo -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-matchx-text-primary truncate">
                {{ goleador.nombre }} {{ goleador.apellido }}
              </p>
              <div class="flex items-center gap-1 mt-0.5">
                <img
                  v-if="goleador.escudo_url"
                  :src="goleador.escudo_url"
                  :alt="goleador.equipo_nombre"
                  class="w-3 h-3 rounded"
                />
                <p class="text-xs text-matchx-text-muted truncate">{{ goleador.equipo_nombre }}</p>
              </div>
            </div>

            <!-- Goles -->
            <div class="flex items-center gap-1.5 shrink-0">
              <v-icon name="co-football" class="text-matchx-accent-orange" scale="0.75" />
              <span class="text-base font-bold text-matchx-text-primary">{{ goleador.goles }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="flex flex-col items-center gap-3 py-12 bg-matchx-bg-surface rounded-xl border border-matchx-border-base">
        <v-icon name="co-football" class="text-matchx-text-muted opacity-30" scale="2.5" />
        <p class="text-matchx-text-muted text-sm">No hay goles registrados en este torneo todavía</p>
      </div>
    </div>

    <!-- Leyenda -->
    <div v-if="tablaGoleadores.length > 0" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-matchx-text-muted">
      <div class="flex items-center gap-1">
        <v-icon name="co-football" class="text-matchx-accent-orange" scale="0.65" />
        <span>Incluye goles en juego y penales convertidos</span>
      </div>
      <span>· Autogoles no contabilizados</span>
    </div>
  </div>
</template>
