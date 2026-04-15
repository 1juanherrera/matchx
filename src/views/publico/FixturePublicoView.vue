<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore } from '@/stores/equipos'
import { usePartidosStore } from '@/stores/partidos'
import { CalendarRange } from 'lucide-vue-next'
import PartidoCardVue from '@/components/ui/PartidoCard.vue'

const route         = useRoute()
const router        = useRouter()
const torneosStore  = useTorneosStore()
const equiposStore  = useEquiposStore()
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

// ─── Equipo lookup ────────────────────────────────────────────────────────────
const equipoMap = computed(() => {
  const map: Record<number, { nombre: string; escudo_url: string; color_principal: string }> = {}
  for (const e of equiposStore.equipos) {
    map[e.id] = { nombre: e.nombre, escudo_url: e.escudo_url, color_principal: e.color_principal }
  }
  return map
})

// ─── Partido enriquecido ──────────────────────────────────────────────────────
interface PartidoCard {
  id:               number
  jornada:          number
  fecha_hora:       string
  estado:           string
  goles_local:      number
  goles_visitante:  number
  localNombre:      string
  localEscudo:      string
  localColor:       string
  visitanteNombre:  string
  visitanteEscudo:  string
  visitanteColor:   string
}

const partidosPorJornada = computed(() => {
  if (selectedTorneoId.value === null) return {}

  const enriquecidos: PartidoCard[] = partidosStore.partidosPorTorneo(selectedTorneoId.value).map(p => ({
    id:              p.id,
    jornada:         p.jornada,
    fecha_hora:      p.fecha_hora,
    estado:          p.estado,
    goles_local:     p.goles_local,
    goles_visitante: p.goles_visitante,
    localNombre:     equipoMap.value[p.equipo_local_id]?.nombre      ?? 'Equipo local',
    localEscudo:     equipoMap.value[p.equipo_local_id]?.escudo_url  ?? '',
    localColor:      equipoMap.value[p.equipo_local_id]?.color_principal ?? '#00d4aa',
    visitanteNombre: equipoMap.value[p.equipo_visitante_id]?.nombre      ?? 'Equipo visitante',
    visitanteEscudo: equipoMap.value[p.equipo_visitante_id]?.escudo_url  ?? '',
    visitanteColor:  equipoMap.value[p.equipo_visitante_id]?.color_principal ?? '#ff6b35',
  }))

  const grupos: Record<number, PartidoCard[]> = {}
  for (const p of enriquecidos) {
    if (!grupos[p.jornada]) grupos[p.jornada] = []
    grupos[p.jornada].push(p)
  }
  return grupos
})

const jornadas = computed(() =>
  Object.keys(partidosPorJornada.value).map(Number).sort((a, b) => a - b),
)

// ─── Partido EN VIVO de ejemplo (hardcodeado para demo) ──────────────────────
const ejemploEnVivo: PartidoCard = {
  id:              0,        // 0 → no navega a ningún ID real
  jornada:         3,
  fecha_hora:      new Date().toISOString(),
  estado:          'en_curso',
  goles_local:     2,
  goles_visitante: 1,
  localNombre:     'Tigres FC',
  localEscudo:     '',
  localColor:      '#00d4aa',
  visitanteNombre: 'Leones SC',
  visitanteEscudo: '',
  visitanteColor:  '#ff6b35',
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div>
      <h1
        class="text-3xl font-black text-matchx-text-primary"
        style="font-family: 'Fira Code', monospace; letter-spacing: -0.02em"
      >
        Fixture & <span class="text-matchx-accent-green">Resultados</span>
      </h1>
      <p class="text-matchx-text-muted mt-1 text-sm">Partidos y marcadores de cada jornada</p>
    </div>

    <!-- ── EJEMPLO EN VIVO ──────────────────────────────────────────────────── -->
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span class="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
        </span>
        <span class="text-xs font-black text-red-400 uppercase tracking-widest">En Vivo — Demo</span>
        <div class="flex-1 h-px bg-red-400/20" />
      </div>

      <!-- Card en vivo -->
      <PartidoCardVue :partido="ejemploEnVivo" @ver="router.push('/publico/fixture')" />
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

        <!-- Cards de partidos -->
        <div class="space-y-2">
          <PartidoCardVue
            v-for="partido in partidosPorJornada[jornada]"
            :key="partido.id"
            :partido="partido"
            @ver="router.push(`/publico/partidos/${partido.id}`)"
          />
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
