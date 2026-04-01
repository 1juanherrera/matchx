<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePartidosStore } from '@/stores/partidos'
import { useEquiposStore } from '@/stores/equipos'
import { useJugadoresStore } from '@/stores/jugadores'
import { useTorneosStore } from '@/stores/torneos'
import { useSedesStore } from '@/stores/sedes'
import { ArrowLeft, Calendar, MapPin, Clock, Users, BarChart3 } from 'lucide-vue-next'

const route  = useRoute()
const router = useRouter()
const partidoId = Number(route.params.id)

const partidosStore  = usePartidosStore()
const equiposStore   = useEquiposStore()
const jugadoresStore = useJugadoresStore()
const torneosStore   = useTorneosStore()
const sedesStore     = useSedesStore()

onMounted(() =>
  Promise.all([
    partidosStore.fetchPartidos(),
    equiposStore.fetchEquipos(),
    jugadoresStore.fetchJugadores(),
    torneosStore.fetchTorneos(),
    sedesStore.fetchSedes(),
  ]),
)

// ─── Entities ────────────────────────────────────────────────────────────────
const partido        = computed(() => partidosStore.partidos.find(p => p.id === partidoId))
const equipoLocal    = computed(() => equiposStore.equipos.find(e => e.id === partido.value?.equipo_local_id))
const equipoVisit    = computed(() => equiposStore.equipos.find(e => e.id === partido.value?.equipo_visitante_id))
const torneo         = computed(() => torneosStore.torneos.find(t => t.id === partido.value?.torneo_id))
const sede           = computed(() => sedesStore.sedes.find(s => s.id === partido.value?.sede_id))
const jugLocal       = computed(() => partido.value ? jugadoresStore.jugadoresPorEquipo(partido.value.equipo_local_id) : [])
const jugVisit       = computed(() => partido.value ? jugadoresStore.jugadoresPorEquipo(partido.value.equipo_visitante_id) : [])

// ─── Colors ───────────────────────────────────────────────────────────────────
const colorLocal = computed(() => equipoLocal.value?.colores?.split(',')[0] ?? '#00d4aa')
const colorVisit = computed(() => equipoVisit.value?.colores?.split(',')[0] ?? '#ff6b35')

// ─── Formation templates (fixed per modality) ─────────────────────────────────
// Coordinates: x = 0-100% of field width, y = 0-100% of full field height (top=0)
// Local occupies y: 50-100%, Visitante y: 0-50% (mirrored)

type ModalidadCode = 'F5' | 'F7' | 'F11'

interface Slot { x: number; y: number; pos: 'portero' | 'defensa' | 'mediocampo' | 'delantero' }

// Visitante = espejo vertical exacto (y → 100 - y)
// Local ocupa y: 55–90%, Visitante y: 10–45%
const FORMATION_LOCAL: Record<ModalidadCode, Slot[]> = {
  // F5 — 1·2·2
  F5: [
    { x: 50, y: 88, pos: 'portero' },
    { x: 30, y: 74, pos: 'defensa' },
    { x: 70, y: 74, pos: 'defensa' },
    { x: 30, y: 60, pos: 'delantero' },
    { x: 70, y: 60, pos: 'delantero' },
  ],
  // F7 — 1·3·3
  F7: [
    { x: 50, y: 88, pos: 'portero' },
    { x: 18, y: 75, pos: 'defensa' },
    { x: 50, y: 75, pos: 'defensa' },
    { x: 82, y: 75, pos: 'defensa' },
    { x: 18, y: 62, pos: 'delantero' },
    { x: 50, y: 62, pos: 'delantero' },
    { x: 82, y: 62, pos: 'delantero' },
  ],
  // F11 — 1·4·3·3
  F11: [
    { x: 50, y: 88, pos: 'portero' },
    { x: 13, y: 77, pos: 'defensa' },
    { x: 37, y: 77, pos: 'defensa' },
    { x: 63, y: 77, pos: 'defensa' },
    { x: 87, y: 77, pos: 'defensa' },
    { x: 22, y: 67, pos: 'mediocampo' },
    { x: 50, y: 67, pos: 'mediocampo' },
    { x: 78, y: 67, pos: 'mediocampo' },
    { x: 18, y: 57, pos: 'delantero' },
    { x: 50, y: 57, pos: 'delantero' },
    { x: 82, y: 57, pos: 'delantero' },
  ],
}

// ─── Player assignment to slots ───────────────────────────────────────────────
const posOrder = ['portero', 'defensa', 'mediocampo', 'delantero'] as const

const sortByPos = (jugs: typeof jugLocal.value) =>
  [...jugs].sort((a, b) => posOrder.indexOf(a.posicion) - posOrder.indexOf(b.posicion))

interface TokenData {
  numero: number
  apellido: string
  nombre: string
  pos: string
  x: number
  y: number
  color: string
}

function buildTokens(
  jugs: typeof jugLocal.value,
  slots: Slot[],
  color: string,
): TokenData[] {
  const sorted = sortByPos(jugs)
  return slots.map((slot, i) => {
    const j = sorted[i]
    return {
      numero:   j?.numero_camiseta ?? (i + 1),
      apellido: j?.apellido ?? '—',
      nombre:   j?.nombre ?? '',
      pos:      slot.pos,
      x:        slot.x,
      y:        slot.y,
      color,
    }
  })
}

const modalidad = computed<ModalidadCode>(() =>
  (torneo.value?.modalidad_codigo as ModalidadCode) ?? 'F5',
)

const slotsLocal   = computed(() => FORMATION_LOCAL[modalidad.value] ?? FORMATION_LOCAL.F5)
const slotsVisit   = computed(() =>
  slotsLocal.value.map(s => ({ ...s, y: 100 - s.y })),
)

const tokensLocal  = computed(() => buildTokens(jugLocal.value, slotsLocal.value, colorLocal.value))
const tokensVisit  = computed(() => buildTokens(jugVisit.value, slotsVisit.value, colorVisit.value))
const allTokens    = computed(() => [...tokensVisit.value, ...tokensLocal.value])

// ─── Lineup lists (grouped by position) ──────────────────────────────────────
type PosKey = 'portero' | 'defensa' | 'mediocampo' | 'delantero'
const POS_LABEL: Record<PosKey, string> = { portero: 'Portero', defensa: 'Defensas', mediocampo: 'Mediocampistas', delantero: 'Delanteros' }

const groupPlayers = (jugs: typeof jugLocal.value) =>
  posOrder.map(pos => ({
    pos,
    label: POS_LABEL[pos],
    players: jugs.filter(j => j.posicion === pos),
  })).filter(g => g.players.length > 0)

const lineupLocal  = computed(() => groupPlayers(jugLocal.value))
const lineupVisit  = computed(() => groupPlayers(jugVisit.value))

// ─── Stats rows ───────────────────────────────────────────────────────────────
const statsRows = computed(() => {
  if (!partido.value) return []
  const p = partido.value
  const f = (slots: Slot[], pos: string) => slots.filter(s => s.pos === pos).length
  return [
    { label: 'Goles',          local: p.goles_local,                     visitante: p.goles_visitante },
    { label: 'Jugadores',      local: jugLocal.value.length,              visitante: jugVisit.value.length },
    { label: 'Defensas',       local: f(slotsLocal.value, 'defensa'),     visitante: f(slotsVisit.value, 'defensa') },
    { label: 'Mediocampistas', local: f(slotsLocal.value, 'mediocampo'), visitante: f(slotsVisit.value, 'mediocampo') },
    { label: 'Delanteros',     local: f(slotsLocal.value, 'delantero'),  visitante: f(slotsVisit.value, 'delantero') },
  ]
})

const statBar = (a: number, b: number) => {
  const t = a + b
  return t === 0 ? { l: 50, r: 50 } : { l: Math.round(a / t * 100), r: Math.round(b / t * 100) }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const activeTab = ref<'lineup' | 'stats'>('lineup')
</script>

<template>
  <div class="space-y-5 pb-10 max-w-2xl mx-auto">

    <!-- Back -->
    <button
      @click="router.back()"
      class="flex items-center gap-1.5 text-sm text-matchx-text-muted hover:text-matchx-text-primary
             transition-colors cursor-pointer"
    >
      <ArrowLeft class="w-4 h-4" :stroke-width="2" />
      Volver
    </button>

    <!-- Not found -->
    <div v-if="!partido && !partidosStore.loading" class="py-20 text-center text-matchx-text-muted">
      Partido no encontrado
    </div>

    <template v-if="partido">

      <!-- ══════════════════════════════════════════════════
           MATCH HEADER
      ══════════════════════════════════════════════════ -->
      <div class="rounded-2xl border border-matchx-border-base overflow-hidden bg-matchx-bg-surface">

        <!-- Torneo / jornada bar -->
        <div class="flex items-center justify-between px-4 py-2 bg-matchx-bg-elevated border-b border-matchx-border-base">
          <span class="text-xs text-matchx-text-muted font-medium tracking-wide">
            {{ torneo?.nombre }} &nbsp;·&nbsp; Jornada {{ partido.jornada }}
          </span>
          <span
            class="text-[11px] font-bold px-2.5 py-0.5 rounded-full tracking-wide"
            :class="partido.estado === 'finalizado'
              ? 'bg-matchx-accent-green/15 text-matchx-accent-green'
              : 'bg-blue-500/15 text-blue-400'"
          >
            {{ partido.estado === 'finalizado' ? 'Finalizado' : 'Programado' }}
          </span>
        </div>

        <!-- Teams + score -->
        <div class="grid grid-cols-3 items-center gap-3 px-4 py-6">
          <!-- Local -->
          <div class="flex flex-col items-center gap-2 text-center">
            <div class="w-16 h-16 rounded-xl bg-matchx-bg-elevated flex items-center justify-center p-1.5 border border-matchx-border-base">
              <img :src="equipoLocal?.escudo_url" :alt="equipoLocal?.nombre" class="w-full h-full object-contain" />
            </div>
            <span class="text-sm font-bold text-matchx-text-primary leading-tight">{{ equipoLocal?.nombre }}</span>
            <span class="text-[11px] text-matchx-text-muted font-medium tracking-wider uppercase">Local</span>
          </div>

          <!-- Score / VS -->
          <div class="flex flex-col items-center gap-1">
            <div v-if="partido.estado === 'finalizado'" class="flex items-center gap-1">
              <span
                class="text-5xl font-black leading-none"
                style="font-family:'Fira Code',monospace; letter-spacing:-0.04em"
                :style="{ color: colorLocal }"
              >{{ partido.goles_local }}</span>
              <span class="text-3xl font-bold text-matchx-border-base mx-1">-</span>
              <span
                class="text-5xl font-black leading-none"
                style="font-family:'Fira Code',monospace; letter-spacing:-0.04em"
                :style="{ color: colorVisit }"
              >{{ partido.goles_visitante }}</span>
            </div>
            <div v-else
              class="text-3xl font-black text-matchx-text-muted"
              style="font-family:'Fira Code',monospace; letter-spacing:0.08em"
            >VS</div>
            <div class="flex items-center gap-1 text-xs text-matchx-text-muted mt-1">
              <Clock class="w-3 h-3" :stroke-width="1.75" />
              {{ fmtHora(partido.fecha_hora) }}
            </div>
          </div>

          <!-- Visitante -->
          <div class="flex flex-col items-center gap-2 text-center">
            <div class="w-16 h-16 rounded-xl bg-matchx-bg-elevated flex items-center justify-center p-1.5 border border-matchx-border-base">
              <img :src="equipoVisit?.escudo_url" :alt="equipoVisit?.nombre" class="w-full h-full object-contain" />
            </div>
            <span class="text-sm font-bold text-matchx-text-primary leading-tight">{{ equipoVisit?.nombre }}</span>
            <span class="text-[11px] text-matchx-text-muted font-medium tracking-wider uppercase">Visitante</span>
          </div>
        </div>

        <!-- Meta -->
        <div class="flex flex-wrap justify-center gap-x-5 gap-y-1 px-4 pb-4 text-xs text-matchx-text-muted">
          <span class="flex items-center gap-1.5">
            <Calendar class="w-3.5 h-3.5" :stroke-width="1.75" />
            <span class="capitalize">{{ fmtFecha(partido.fecha_hora) }}</span>
          </span>
          <span v-if="sede" class="flex items-center gap-1.5">
            <MapPin class="w-3.5 h-3.5" :stroke-width="1.75" />
            {{ sede.nombre }}, {{ sede.ciudad }}
          </span>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════
           FOOTBALL PITCH
      ══════════════════════════════════════════════════ -->
      <div class="rounded-2xl border border-matchx-border-base overflow-hidden bg-matchx-bg-surface p-4">

        <!-- Header row -->
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs font-bold text-matchx-text-muted uppercase tracking-widest">Campo de Juego</span>
          <div class="flex items-center gap-4 text-xs text-matchx-text-secondary">
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded-full border-2 border-white/30" :style="{ backgroundColor: colorLocal }" />
              {{ equipoLocal?.nombre }} 
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-3 h-3 rounded-full border-2 border-white/30" :style="{ backgroundColor: colorVisit }" />
              {{ equipoVisit?.nombre }} 
            </span>
          </div>
        </div>

        <!-- ┌─ PITCH — aspect-ratio 2:3, max 600 px ──────────────────────────┐ -->
        <div class="pitch-container relative w-full mx-auto select-none overflow-hidden rounded-lg">

          <!-- CAPA 1 + 2: Franjas de corte (linear-gradient) + dot matrix encima -->
          <div class="pitch-surface absolute inset-0" />

          <!-- CAPA 3: Líneas del campo — SVG con stroke 1 px exacto -->
          <svg
            class="absolute inset-0 w-full h-full pitch-lines"
            viewBox="0 0 68 105"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <!-- Un único <g> con herencia de stroke; vector-effect por CSS -->
            <g stroke="rgba(255,255,255,0.40)" fill="none">
              <rect x="2"     y="2"    width="64"    height="101"  /><!-- Borde exterior -->
              <line x1="2"    y1="52.5" x2="66"    y2="52.5"      /><!-- Línea de medio campo -->
              <circle cx="34" cy="52.5" r="9.15"                  /><!-- Círculo central -->
              <path   d="M 26.5 18.5 A 9.15 9.15 0 0 1 41.5 18.5"/><!-- Arco penal sup. -->
              <rect x="13.84" y="2"    width="40.32" height="16.5" /><!-- Área penal sup. -->
              <rect x="24.84" y="2"    width="18.32" height="5.5"  /><!-- Área chica sup. -->
              <path   d="M 26.5 86.5 A 9.15 9.15 0 0 0 41.5 86.5"/><!-- Arco penal inf. -->
              <rect x="13.84" y="86.5" width="40.32" height="16.5" /><!-- Área penal inf. -->
              <rect x="24.84" y="97.5" width="18.32" height="5.5"  /><!-- Área chica inf. -->
            </g>
            <!-- Puntos de penalti y central: llenos, sin trazo -->
            <circle cx="34" cy="52.5" r="0.75" fill="rgba(255,255,255,0.45)" />
            <circle cx="34" cy="13"   r="0.75" fill="rgba(255,255,255,0.45)" />
            <circle cx="34" cy="92"   r="0.75" fill="rgba(255,255,255,0.45)" />
          </svg>

          <!-- CAPA 4: Etiqueta de equipo visitante (arriba) -->
          <span class="pitch-team-label absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none z-10">
            {{ equipoVisit?.nombre }}
          </span>
          <!-- CAPA 4: Etiqueta de equipo local (abajo) -->
          <span class="pitch-team-label absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none z-10">
            {{ equipoLocal?.nombre }}
          </span>

          <!-- CAPA 5: Tokens de jugadores — v-for original mantenido -->
          <div
            v-for="token in allTokens"
            :key="`${token.color}-${token.x}-${token.y}`"
            class="player-token absolute z-20 flex flex-col items-center"
            :style="{ left: `${token.x}%`, top: `${token.y}%` }"
          >
            <!-- Círculo con glossy gradient + anillo de equipo -->
            <div
              class="jersey-circle"
              :style="{
                backgroundColor: token.color,
                backgroundImage: 'linear-gradient(145deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.06) 48%, rgba(0,0,0,0.28) 100%)',
                boxShadow: `0 0 0 2.5px rgba(255,255,255,0.22), inset 0 2px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(0,0,0,0.28)`,
              }"
            >{{ token.numero }}</div>

            <!-- Apellido en pill oscuro — sin necesidad de text-shadow -->
            <span class="player-name">{{ token.apellido }}</span>
          </div>

        </div>
        <!-- └────────────────────────────────────────────────────────────────┘ -->
      </div>

      <!-- ══════════════════════════════════════════════════
           TABS — Alineación / Estadísticas
      ══════════════════════════════════════════════════ -->
      <div class="rounded-2xl border border-matchx-border-base overflow-hidden bg-matchx-bg-surface">

        <!-- Tab strip -->
        <div class="flex border-b border-matchx-border-base bg-matchx-bg-elevated">
          <button
            @click="activeTab = 'lineup'"
            class="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold
                   transition-all duration-150 cursor-pointer border-b-2"
            :class="activeTab === 'lineup'
              ? 'text-matchx-accent-green border-matchx-accent-green'
              : 'text-matchx-text-muted border-transparent hover:text-matchx-text-primary'"
          >
            <Users class="w-4 h-4" :stroke-width="2" />
            Alineación
          </button>
          <button
            @click="activeTab = 'stats'"
            class="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold
                   transition-all duration-150 cursor-pointer border-b-2"
            :class="activeTab === 'stats'
              ? 'text-matchx-accent-green border-matchx-accent-green'
              : 'text-matchx-text-muted border-transparent hover:text-matchx-text-primary'"
          >
            <BarChart3 class="w-4 h-4" :stroke-width="2" />
            Estadísticas
          </button>
        </div>

        <!-- ── LINEUP TAB ── -->
        <div v-if="activeTab === 'lineup'" class="p-4">
          <div class="grid grid-cols-2 gap-6">

            <!-- Local column -->
            <div>
              <div class="flex items-center gap-2 mb-4 pb-2 border-b border-matchx-border-base">
                <span class="w-3 h-3 rounded-full shrink-0 border border-white/20" :style="{ backgroundColor: colorLocal }" />
                <span class="text-xs font-black text-matchx-text-primary uppercase tracking-wider truncate">
                  {{ equipoLocal?.nombre }}
                </span>
              </div>

              <div v-for="group in lineupLocal" :key="group.pos" class="mb-4">
                <p class="text-[10px] font-bold text-matchx-text-muted uppercase tracking-widest mb-2">
                  {{ group.label }}
                </p>
                <div class="space-y-2">
                  <div
                    v-for="j in group.players"
                    :key="j.id"
                    class="flex items-center gap-2"
                  >
                    <div
                      class="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[11px] shrink-0"
                      :style="{ backgroundColor: colorLocal, boxShadow: `0 0 0 2px rgba(255,255,255,0.1)` }"
                    >{{ j.numero_camiseta }}</div>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-bold text-matchx-text-primary leading-tight truncate">{{ j.apellido }}</p>
                      <p class="text-[10px] text-matchx-text-muted leading-none">{{ j.nombre }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Visitante column -->
            <div>
              <div class="flex items-center gap-2 mb-4 pb-2 border-b border-matchx-border-base">
                <span class="w-3 h-3 rounded-full shrink-0 border border-white/20" :style="{ backgroundColor: colorVisit }" />
                <span class="text-xs font-black text-matchx-text-primary uppercase tracking-wider truncate">
                  {{ equipoVisit?.nombre }}
                </span>
              </div>

              <div v-for="group in lineupVisit" :key="group.pos" class="mb-4">
                <p class="text-[10px] font-bold text-matchx-text-muted uppercase tracking-widest mb-2">
                  {{ group.label }}
                </p>
                <div class="space-y-2">
                  <div
                    v-for="j in group.players"
                    :key="j.id"
                    class="flex items-center gap-2"
                  >
                    <div
                      class="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[11px] shrink-0"
                      :style="{ backgroundColor: colorVisit, boxShadow: `0 0 0 2px rgba(255,255,255,0.1)` }"
                    >{{ j.numero_camiseta }}</div>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-bold text-matchx-text-primary leading-tight truncate">{{ j.apellido }}</p>
                      <p class="text-[10px] text-matchx-text-muted leading-none">{{ j.nombre }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── STATS TAB ── -->
        <div v-else class="p-4 space-y-5">


          <!-- Stat bars -->
          <div class="space-y-4">
            <!-- Header -->
            <div class="grid grid-cols-3 text-[10px] font-bold text-matchx-text-muted uppercase tracking-widest">
              <span class="truncate">{{ equipoLocal?.nombre }}</span>
              <span class="text-center">Estadística</span>
              <span class="text-right truncate">{{ equipoVisit?.nombre }}</span>
            </div>

            <div
              v-for="stat in statsRows"
              :key="stat.label"
              class="space-y-1.5"
            >
              <div class="grid grid-cols-3 items-center">
                <span
                  class="text-base font-black leading-none"
                  style="font-family:'Fira Code',monospace"
                  :style="{ color: colorLocal }"
                >{{ stat.local }}</span>
                <span class="text-center text-xs text-matchx-text-muted font-medium">{{ stat.label }}</span>
                <span
                  class="text-base font-black leading-none text-right"
                  style="font-family:'Fira Code',monospace"
                  :style="{ color: colorVisit }"
                >{{ stat.visitante }}</span>
              </div>

              <!-- Dual bar -->
              <div class="h-1.5 flex gap-px rounded-full overflow-hidden bg-matchx-bg-elevated">
                <div
                  class="h-full rounded-full transition-all duration-700"
                  :style="{
                    width:           `${statBar(stat.local, stat.visitante).l}%`,
                    backgroundColor: colorLocal,
                    opacity:         0.9,
                  }"
                />
                <div
                  class="h-full rounded-full flex-1 transition-all duration-700"
                  :style="{
                    backgroundColor: colorVisit,
                    opacity:         0.9,
                  }"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

    </template>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════
   PITCH — "Analista de Datos" / Dark Pro
   Estética: limpia, oscura, sin efectos brillantes.
   Solo franjas de corte, dot matrix tenue y líneas finas.
═══════════════════════════════════════════════════════════════════════ */

/* Contenedor responsivo 2:3, bloqueado a 600 px de alto en móvil */
.pitch-container {
  aspect-ratio: 2 / 3;
  max-height:   600px;
}

/* ──────────────────────────────────────────────────────────────────────
   Superficie del campo:
   • Fondo: franjas de corte (dos verdes muy próximos → sutil)
   • Encima: dot matrix rgba(255,255,255,0.05) cada 10 px → profundidad táctica
   Las dos capas se combinan en un solo background-image multicapa.
────────────────────────────────────────────────────────────────────── */
.pitch-surface {
  /* Capa 1 (superior): dot matrix */
  /* Capa 2 (inferior): franjas de corte */
  background-color: #163518;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.055) 1px, transparent 1px),
    repeating-linear-gradient(
      to bottom,
      #1a3d1c 0%,
      #1a3d1c 50%,
      #163518 50%,
      #163518 100%
    );
  /* background-size independiente por capa:
     capa 1 (dots) → celda de 10 × 10 px
     capa 2 (franjas) → cada ciclo ocupa 80 px de alto               */
  background-size: 10px 10px, 100% 80px;
}

/* ──────────────────────────────────────────────────────────────────────
   Líneas del campo — 1 px exacto en pantalla, sin importar el zoom.
   vector-effect: non-scaling-stroke garantiza grosor constante.
────────────────────────────────────────────────────────────────────── */
.pitch-lines g *,
.pitch-lines rect,
.pitch-lines line,
.pitch-lines circle,
.pitch-lines path {
  vector-effect:  non-scaling-stroke;
  stroke-width:   1px;
}

/* ──────────────────────────────────────────────────────────────────────
   Etiqueta de equipo — texto fantasma, no distrae
────────────────────────────────────────────────────────────────────── */
.pitch-team-label {
  color:          rgba(255, 255, 255, 0.14);
  font-size:      clamp(5px, 1.1vw, 8px);
  font-weight:    700;
  text-transform: uppercase;
  letter-spacing: 0.20em;
  white-space:    nowrap;
}

/* ═══════════════════════════════════════════════════════════════════════
   TOKEN DE JUGADOR — más grande y más bonito
═══════════════════════════════════════════════════════════════════════ */
.player-token {
  transform: translate(-50%, -50%);
  gap:       clamp(2px, 0.65vw, 5px);
  filter:
    drop-shadow(0px 6px 18px rgba(0, 0, 0, 0.85))
    drop-shadow(0px 2px  5px rgba(0, 0, 0, 0.65));
  transition: filter 0.15s ease;
}
.player-token:hover {
  filter:
    drop-shadow(0px 8px 22px rgba(0, 0, 0, 0.90))
    drop-shadow(0px 3px  7px rgba(0, 0, 0, 0.70));
}

/* ──────────────────────────────────────────────────────────────────────
   Círculo de camiseta — glossy, grande
   30–48 px (era 22–33 px, +45%)
────────────────────────────────────────────────────────────────────── */
.jersey-circle {
  width:           clamp(30px, 6.5vw, 48px);
  height:          clamp(30px, 6.5vw, 48px);
  border-radius:   50%;
  display:         flex;
  align-items:     center;
  justify-content: center;
  font-weight:     900;
  color:           #fff;
  font-size:       clamp(11px, 2.3vw, 17px);
  line-height:     1;
  border:          2px solid rgba(255, 255, 255, 0.50);
}

/* ──────────────────────────────────────────────────────────────────────
   Chip de nombre — fondo oscuro semitransparente
   Reemplaza text-shadow; da contraste real sobre cualquier verde.
────────────────────────────────────────────────────────────────────── */
.player-name {
  display:        block;
  color:          #fff;
  font-size:      clamp(7px, 1.4vw, 10px);
  font-weight:    700;
  text-align:     center;
  white-space:    nowrap;
  overflow:       hidden;
  text-overflow:  ellipsis;
  max-width:      clamp(36px, 6.5vw, 54px);
  line-height:    1;
  letter-spacing: 0.03em;
  background:     rgba(0, 0, 0, 0.60);
  border-radius:  3px;
  padding:        2px 5px;
}
</style>
