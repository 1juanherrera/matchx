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
type ModalidadCode = 'F5' | 'F7' | 'F11'

interface Slot { x: number; y: number; pos: 'portero' | 'defensa' | 'mediocampo' | 'delantero' }

// ─── FIFA card data ────────────────────────────────────────────────────────────
const POS_CODE: Record<string, string> = {
  portero: 'POR', defensa: 'DEF', mediocampo: 'MED', delantero: 'DEL',
}

function jugStats(jugId: number, pos: string) {
  const s = (seed: number) => Math.min(95, Math.max(55, ((jugId * 7 + seed * 11) % 30) + 62))
  const r = { PAC: s(1), TIR: s(2), PAS: s(3), REG: s(4), DEF: s(5), FIS: s(6) }
  if (pos === 'portero')    { r.TIR = Math.max(36, r.TIR - 22); r.DEF = Math.min(95, r.DEF + 10) }
  if (pos === 'defensa')    { r.TIR = Math.max(44, r.TIR - 12); r.DEF = Math.min(95, r.DEF + 8); r.FIS = Math.min(95, r.FIS + 5) }
  if (pos === 'mediocampo') { r.PAS = Math.min(95, r.PAS + 6);  r.REG = Math.min(95, r.REG + 4) }
  if (pos === 'delantero')  { r.TIR = Math.min(95, r.TIR + 8);  r.PAC = Math.min(95, r.PAC + 6); r.DEF = Math.max(34, r.DEF - 14) }
  const rating = Math.round(Object.values(r).reduce((a, b) => a + b, 0) / 6)
  return { rating, stats: Object.entries(r).map(([key, val]) => ({ key, val })) }
}

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
  numero:   number
  apellido: string
  nombre:   string
  pos:      string
  posCode:  string
  initials: string
  rating:   number
  stats:    { key: string; val: number }[]
  x:        number
  y:        number
  color:    string
}

function buildTokens(
  jugs: typeof jugLocal.value,
  slots: Slot[],
  color: string,
): TokenData[] {
  const sorted = sortByPos(jugs)
  return slots.map((slot, i) => {
    const j   = sorted[i]
    const jId = j?.id ?? (i + 1) * 37
    const { rating, stats } = jugStats(jId, slot.pos)
    return {
      numero:   j?.numero_camiseta ?? (i + 1),
      apellido: j?.apellido ?? '—',
      nombre:   j?.nombre   ?? '',
      pos:      slot.pos,
      posCode:  POS_CODE[slot.pos] ?? slot.pos,
      initials: `${(j?.nombre?.[0]   ?? '').toUpperCase()}${(j?.apellido?.[0] ?? '').toUpperCase()}`,
      rating,
      stats,
      x:     slot.x,
      y:     slot.y,
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

          <!-- CAPA 5: Tokens de jugadores -->
          <div
            v-for="token in allTokens"
            :key="`${token.color}-${token.x}-${token.y}`"
            class="player-token absolute z-20 flex flex-col items-center"
            :style="{ left: `${token.x}%`, top: `${token.y}%` }"
          >
            <div class="jersey-circle" :style="{ backgroundColor: token.color }">{{ token.numero }}</div>
            <span class="player-name">{{ token.apellido }}</span>

            <!-- ── Carta FIFA ── -->
            <div
              class="fifa-card"
              :class="[
                token.y > 55 ? 'card-up' : 'card-down',
                token.x < 22 ? 'card-left' : token.x > 78 ? 'card-right' : 'card-center',
              ]"
            >
              <!-- Barra de color del equipo -->
              <div class="h-1 w-full shrink-0" :style="{ backgroundColor: token.color }" />

              <!-- Cabecera: rating + posición + dorsal -->
              <div class="flex items-start justify-between px-2.5 pt-2">
                <div>
                  <div class="text-2xl font-black leading-none text-white"
                       style="font-family:'Fira Code',monospace">{{ token.rating }}</div>
                  <div class="text-[9px] font-bold tracking-widest uppercase mt-0.5"
                       :style="{ color: token.color }">{{ token.posCode }}</div>
                </div>
                <div class="text-[10px] font-bold text-white/35 mt-0.5"
                     style="font-family:'Fira Code',monospace">#{{ token.numero }}</div>
              </div>

              <!-- Avatar con iniciales -->
              <div class="flex justify-center py-2">
                <div
                  class="w-11 h-11 rounded-full flex items-center justify-center
                         text-[13px] font-black text-white border-2"
                  :style="{
                    backgroundColor: token.color + '28',
                    borderColor:     token.color + '70',
                  }"
                >{{ token.initials || '?' }}</div>
              </div>

              <!-- Nombre -->
              <div class="px-2.5 pb-1 text-center">
                <p class="text-[11px] font-black text-white uppercase tracking-wide truncate leading-tight">
                  {{ token.apellido }}
                </p>
                <p class="text-[9px] text-white/45 truncate mt-0.5 leading-none">{{ token.nombre }}</p>
              </div>

              <!-- Separador -->
              <div class="mx-2.5 mb-2" :style="{ height: '1px', backgroundColor: token.color + '35' }" />

              <!-- Stats 3×2 -->
              <div class="grid grid-cols-3 px-2 pb-2.5 gap-y-1.5">
                <div v-for="s in token.stats" :key="s.key" class="flex flex-col items-center gap-0.5">
                  <span class="text-[12px] font-black text-white leading-none"
                        style="font-family:'Fira Code',monospace">{{ s.val }}</span>
                  <span class="text-[7px] font-bold tracking-wider uppercase leading-none"
                        :style="{ color: token.color + 'bb' }">{{ s.key }}</span>
                </div>
              </div>
            </div>
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

          <!-- Headers de equipo -->
          <div class="grid grid-cols-2 gap-3 mb-5">
            <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-matchx-bg-elevated border border-matchx-border-base">
              <img :src="equipoLocal?.escudo_url" :alt="equipoLocal?.nombre"
                class="w-7 h-7 rounded-md object-contain shrink-0" />
              <div class="min-w-0">
                <p class="text-xs font-black text-matchx-text-primary truncate leading-tight">{{ equipoLocal?.nombre }}</p>
                <p class="text-[10px] text-matchx-text-muted leading-none mt-0.5">Local</p>
              </div>
            </div>
            <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-matchx-bg-elevated border border-matchx-border-base">
              <img :src="equipoVisit?.escudo_url" :alt="equipoVisit?.nombre"
                class="w-7 h-7 rounded-md object-contain shrink-0" />
              <div class="min-w-0">
                <p class="text-xs font-black text-matchx-text-primary truncate leading-tight">{{ equipoVisit?.nombre }}</p>
                <p class="text-[10px] text-matchx-text-muted leading-none mt-0.5">Visitante</p>
              </div>
            </div>
          </div>

          <!-- Posiciones alineadas -->
          <div class="space-y-5">
            <template v-for="pos in posOrder" :key="pos">
              <div v-if="lineupLocal.find(g => g.pos === pos) || lineupVisit.find(g => g.pos === pos)">

                <!-- Separador de posición -->
                <div class="flex items-center gap-2 mb-3">
                  <div class="h-px flex-1 bg-matchx-border-base/50" />
                  <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-matchx-text-muted">
                    {{ POS_LABEL[pos] }}
                  </span>
                  <div class="h-px flex-1 bg-matchx-border-base/50" />
                </div>

                <!-- Filas por posición: local izq / visitante der -->
                <div class="grid grid-cols-2 gap-x-3 gap-y-1.5">

                  <!-- Local: jugadores de esta posición -->
                  <div class="space-y-1.5">
                    <div
                      v-for="j in (lineupLocal.find(g => g.pos === pos)?.players ?? [])"
                      :key="j.id"
                      class="flex items-center gap-2 group"
                    >
                      <!-- Número + badge capitán -->
                      <div class="relative shrink-0 transition-transform duration-150 group-hover:scale-110">
                        <div
                          class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs"
                          :style="{ backgroundColor: colorLocal }"
                        >{{ j.numero_camiseta }}</div>
                        <span v-if="j.es_capitan"
                          class="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center
                                 text-[9px] font-black leading-none
                                 bg-gradient-to-b from-yellow-300 to-yellow-500 text-yellow-950
                                 ring-2 ring-matchx-bg-surface shadow-sm">C</span>
                      </div>
                      <!-- Nombre -->
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-semibold text-matchx-text-primary truncate leading-snug">{{ j.apellido }}</p>
                        <p class="text-[10px] text-matchx-text-muted truncate leading-none">{{ j.nombre }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Visitante: jugadores de esta posición -->
                  <div class="space-y-1.5">
                    <div
                      v-for="j in (lineupVisit.find(g => g.pos === pos)?.players ?? [])"
                      :key="j.id"
                      class="flex items-center gap-2 flex-row-reverse group"
                    >
                      <!-- Número + badge capitán -->
                      <div class="relative shrink-0 transition-transform duration-150 group-hover:scale-110">
                        <div
                          class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs"
                          :style="{ backgroundColor: colorVisit }"
                        >{{ j.numero_camiseta }}</div>
                        <span v-if="j.es_capitan"
                          class="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center
                                 text-[9px] font-black leading-none
                                 bg-gradient-to-b from-yellow-300 to-yellow-500 text-yellow-950
                                 ring-2 ring-matchx-bg-surface shadow-sm">C</span>
                      </div>
                      <!-- Nombre (alineado a la derecha) -->
                      <div class="min-w-0 flex-1 text-right">
                        <p class="text-xs font-semibold text-matchx-text-primary truncate leading-snug">{{ j.apellido }}</p>
                        <p class="text-[10px] text-matchx-text-muted truncate leading-none">{{ j.nombre }}</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </template>
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
  /* overflow visible para que las cartas FIFA salgan fuera del pitch */
  overflow:     visible !important;
}

/* ──────────────────────────────────────────────────────────────────────
   Superficie del campo:
   • Fondo: franjas de corte (dos verdes muy próximos → sutil)
   • Encima: dot matrix rgba(255,255,255,0.05) cada 10 px → profundidad táctica
   Las dos capas se combinan en un solo background-image multicapa.
────────────────────────────────────────────────────────────────────── */
.pitch-surface {
  /* Re-clip el verde al borde redondeado ahora que el container es overflow:visible */
  border-radius: 8px;
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
   TOKEN DE JUGADOR — flat tactical board
═══════════════════════════════════════════════════════════════════════ */
.player-token {
  transform:  translate(-50%, -50%);
  gap:        clamp(2px, 0.6vw, 4px);
  transition: transform 0.15s ease;
  /* z-index base; hover lo sube para que la carta quede encima de otros tokens */
}
.player-token:hover {
  transform: translate(-50%, -50%) scale(1.08);
  z-index: 60 !important;
}

/* ──────────────────────────────────────────────────────────────────────
   Círculo de camiseta — flat + double ring
   Sin gradiente, sin sombra acumulada.
   Ring exterior: outline blanco tenue con gap = aspecto "seleccionado".
────────────────────────────────────────────────────────────────────── */
.jersey-circle {
  width:           clamp(28px, 6vw, 44px);
  height:          clamp(28px, 6vw, 44px);
  border-radius:   50%;
  display:         flex;
  align-items:     center;
  justify-content: center;
  font-weight:     900;
  color:           #fff;
  font-size:       clamp(10px, 2.1vw, 16px);
  line-height:     1;
  /* Inner ring */
  border:          2px solid rgba(255, 255, 255, 0.55);
  /* Outer ring separado por 2 px de gap */
  outline:         1.5px solid rgba(255, 255, 255, 0.18);
  outline-offset:  2px;
}

/* ──────────────────────────────────────────────────────────────────────
   Nombre — texto directo, sin pill oscuro
────────────────────────────────────────────────────────────────────── */
.player-name {
  display:        block;
  color:          rgba(255, 255, 255, 0.92);
  font-size:      clamp(6px, 1.3vw, 9px);
  font-weight:    700;
  text-align:     center;
  white-space:    nowrap;
  overflow:       hidden;
  text-overflow:  ellipsis;
  max-width:      clamp(34px, 6vw, 52px);
  line-height:    1;
  letter-spacing: 0.04em;
  text-shadow:    0 1px 3px rgba(0, 0, 0, 0.80);
}

/* ═══════════════════════════════════════════════════════════════════════
   CARTA FIFA — aparece en hover sobre el token
═══════════════════════════════════════════════════════════════════════ */
.fifa-card {
  position:       absolute;
  width:          clamp(108px, 17vw, 136px);
  opacity:        0;
  pointer-events: none;
  transition:     opacity 0.18s ease, transform 0.18s ease;
  z-index:        80;

  display:        flex;
  flex-direction: column;

  background:     linear-gradient(155deg, #1c2a3e 0%, #0d1420 55%, #141e2d 100%);
  border:         1px solid rgba(255, 255, 255, 0.09);
  border-radius:  10px;
  overflow:       hidden;
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.80),
    0  4px 12px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.player-token:hover .fifa-card { opacity: 1; }

/* ── Posición vertical ── */
.card-up   { bottom: calc(100% + 10px); }
.card-down { top:    calc(100% + 10px); }

/* ── Alineación horizontal ── */
.card-up.card-center, .card-down.card-center {
  left:      50%;
  transform: translateX(-50%) translateY(6px);
}
.card-up.card-left, .card-down.card-left {
  left:      0;
  transform: translateY(6px);
}
.card-up.card-right, .card-down.card-right {
  right:     0;
  left:      auto;
  transform: translateY(6px);
}

/* Cartas que bajan corrigen el translateY */
.card-down.card-center { transform: translateX(-50%) translateY(-6px); }
.card-down.card-left   { transform: translateY(-6px); }
.card-down.card-right  { transform: translateY(-6px); }

/* ── Animación entrada ── */
.player-token:hover .card-up.card-center,
.player-token:hover .card-down.card-center { transform: translateX(-50%) translateY(0); }
.player-token:hover .card-up.card-left,
.player-token:hover .card-down.card-left   { transform: translateY(0); }
.player-token:hover .card-up.card-right,
.player-token:hover .card-down.card-right  { transform: translateY(0); }
</style>
