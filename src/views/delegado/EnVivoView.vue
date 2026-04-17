<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePartidosStore } from '@/stores/partidos'
import { useEquiposStore } from '@/stores/equipos'
import { useJugadoresStore } from '@/stores/jugadores'
import type { Jugador, Posicion } from '@/stores/jugadores'
import { useDelegadoStore } from '@/stores/delegado'
import type { TipoEvento } from '@/stores/delegado'
import AppBadge from '@/components/ui/AppBadge.vue'
import {
  Play, Pause, RotateCcw, Target, Square, AlertCircle,
  CircleDot, Swords, WifiOff, Clock, Users, FileText,
  Radio, X,
} from 'lucide-vue-next'

const route = useRoute()
const partidosStore = usePartidosStore()
const equiposStore = useEquiposStore()
const jugadoresStore = useJugadoresStore()
const delegadoStore = useDelegadoStore()

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'control' | 'alineaciones' | 'resumen'
const tabActiva = ref<Tab>('control')

const tabs: { id: Tab; label: string; icon: typeof Radio }[] = [
  { id: 'control',      label: 'Control',     icon: Radio },
  { id: 'alineaciones', label: 'Alineaciones', icon: Users },
  { id: 'resumen',      label: 'Resumen',      icon: FileText },
]

// ── Bottom sheet state ────────────────────────────────────────────────────────

interface AccionPendiente {
  tipo: TipoEvento
  equipoId: number | null  // null = lesion (ambos equipos)
  label: string
}
const accionPendiente = ref<AccionPendiente | null>(null)

interface JugadorSheet extends Jugador {
  _equipo: 'local' | 'visitante'
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([
    partidosStore.fetchPartidos(),
    equiposStore.fetchEquipos(),
    jugadoresStore.fetchJugadores(),
  ])
  const id = Number(route.params.id)
  const p = partidosStore.obtenerPorId(id)
  if (p) delegadoStore.setPartidoActivo(p)
})

onUnmounted(() => delegadoStore.pausarCronometro())

// ── Core computed ─────────────────────────────────────────────────────────────

const partido = computed(() => delegadoStore.partidoActivo)

const equipoLocal = computed(() =>
  partido.value ? equiposStore.obtenerPorId(partido.value.equipo_local_id) : null,
)
const equipoVisitante = computed(() =>
  partido.value ? equiposStore.obtenerPorId(partido.value.equipo_visitante_id) : null,
)

const jugadoresLocal = computed(() =>
  partido.value ? jugadoresStore.jugadoresPorEquipo(partido.value.equipo_local_id) : [],
)
const jugadoresVisitante = computed(() =>
  partido.value ? jugadoresStore.jugadoresPorEquipo(partido.value.equipo_visitante_id) : [],
)

// ── Cards per player ──────────────────────────────────────────────────────────

const tarjetasPorJugador = computed(() => {
  const map: Record<number, { amarillas: number; roja: boolean }> = {}
  for (const ev of delegadoStore.eventos) {
    if (!ev.jugador_id) continue
    if (!map[ev.jugador_id]) map[ev.jugador_id] = { amarillas: 0, roja: false }
    if (ev.tipo === 'amarilla_local' || ev.tipo === 'amarilla_visitante')
      map[ev.jugador_id].amarillas++
    if (ev.tipo === 'roja_local' || ev.tipo === 'roja_visitante')
      map[ev.jugador_id].roja = true
  }
  return map
})

const estadoJugador = (id: number): 'normal' | 'amarilla' | 'expulsado' => {
  const t = tarjetasPorJugador.value[id]
  if (!t) return 'normal'
  if (t.roja || t.amarillas >= 2) return 'expulsado'
  if (t.amarillas >= 1) return 'amarilla'
  return 'normal'
}

// ── Field grouping ────────────────────────────────────────────────────────────

const posicionOrder: Record<Posicion, number> = {
  portero: 0, defensa: 1, mediocampo: 2, delantero: 3,
}

const groupByPosition = (jugadores: Jugador[]) => ({
  portero:    jugadores.filter(j => j.posicion === 'portero'),
  defensa:    jugadores.filter(j => j.posicion === 'defensa'),
  mediocampo: jugadores.filter(j => j.posicion === 'mediocampo'),
  delantero:  jugadores.filter(j => j.posicion === 'delantero'),
})

// ── Action flow ───────────────────────────────────────────────────────────────

const LABEL_ACCION: Record<TipoEvento, string> = {
  gol_local:          'Gol — Local',
  gol_visitante:      'Gol — Visitante',
  amarilla_local:     'Amarilla — Local',
  amarilla_visitante: 'Amarilla — Visitante',
  roja_local:         'Roja — Local',
  roja_visitante:     'Roja — Visitante',
  lesion:             'Lesión / Incidencia',
  inicio:             'Inicio partido',
  fin_primera:        'Fin 1ª mitad',
  fin_partido:        'Fin partido',
}

// Actions that need player selection
const ACCIONES_CON_JUGADOR: TipoEvento[] = [
  'gol_local', 'gol_visitante',
  'amarilla_local', 'amarilla_visitante',
  'roja_local', 'roja_visitante',
  'lesion',
]

const iniciarAccion = (tipo: TipoEvento) => {
  if (!partido.value) return
  if (!ACCIONES_CON_JUGADOR.includes(tipo)) {
    delegadoStore.registrarEvento(tipo)
    return
  }
  const equipoId = tipo.includes('_local')
    ? partido.value.equipo_local_id
    : tipo.includes('_visitante')
    ? partido.value.equipo_visitante_id
    : null
  accionPendiente.value = { tipo, equipoId, label: LABEL_ACCION[tipo] }
}

const confirmarJugador = async (jugador: JugadorSheet) => {
  if (!accionPendiente.value) return
  await delegadoStore.registrarEvento(
    accionPendiente.value.tipo,
    jugador.id,
    `${jugador.apellido} #${jugador.numero_camiseta}`,
    jugador.equipo_id,
  )
  accionPendiente.value = null
}

const cancelarAccion = () => { accionPendiente.value = null }

// Players shown in bottom sheet
const jugadoresSheet = computed((): JugadorSheet[] => {
  if (!accionPendiente.value || !partido.value) return []
  const { tipo, equipoId } = accionPendiente.value

  if (tipo === 'lesion') {
    const locales: JugadorSheet[] = [...jugadoresLocal.value]
      .sort((a, b) => posicionOrder[a.posicion] - posicionOrder[b.posicion])
      .map(j => ({ ...j, _equipo: 'local' }))
    const visitantes: JugadorSheet[] = [...jugadoresVisitante.value]
      .sort((a, b) => posicionOrder[a.posicion] - posicionOrder[b.posicion])
      .map(j => ({ ...j, _equipo: 'visitante' }))
    return [...locales, ...visitantes]
  }

  const esLocal = equipoId === partido.value.equipo_local_id
  const lista = esLocal ? jugadoresLocal.value : jugadoresVisitante.value
  return [...lista]
    .sort((a, b) => posicionOrder[a.posicion] - posicionOrder[b.posicion])
    .map(j => ({ ...j, _equipo: esLocal ? 'local' : 'visitante' } as JugadorSheet))
})

const showTeamHeaders = computed(() => accionPendiente.value?.tipo === 'lesion')

// ── Timeline / Resumen helpers ────────────────────────────────────────────────

type EventoColor = 'green' | 'orange' | 'yellow' | 'red' | 'blue' | 'gray'

const colorEvento = (tipo: TipoEvento): EventoColor => {
  if (tipo === 'gol_local')        return 'green'
  if (tipo === 'gol_visitante')    return 'orange'
  if (tipo.startsWith('amarilla')) return 'yellow'
  if (tipo.startsWith('roja'))     return 'red'
  if (tipo === 'lesion')           return 'blue'
  return 'gray'
}

const colorClasses: Record<EventoColor, string> = {
  green:  'bg-matchx-accent-green/10 text-matchx-accent-green border-matchx-accent-green/25',
  orange: 'bg-matchx-accent-orange/10 text-matchx-accent-orange border-matchx-accent-orange/25',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',
  red:    'bg-red-500/10 text-red-400 border-red-500/25',
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/25',
  gray:   'bg-matchx-bg-elevated text-matchx-text-muted border-matchx-border-base',
}

// Resumen computed
const goles = computed(() =>
  delegadoStore.eventos.filter(e => e.tipo === 'gol_local' || e.tipo === 'gol_visitante')
    .sort((a, b) => a.minuto - b.minuto),
)
const amarillas = computed(() =>
  delegadoStore.eventos.filter(e => e.tipo === 'amarilla_local' || e.tipo === 'amarilla_visitante')
    .sort((a, b) => a.minuto - b.minuto),
)
const rojas = computed(() =>
  delegadoStore.eventos.filter(e => e.tipo === 'roja_local' || e.tipo === 'roja_visitante')
    .sort((a, b) => a.minuto - b.minuto),
)
const lesiones = computed(() =>
  delegadoStore.eventos.filter(e => e.tipo === 'lesion')
    .sort((a, b) => a.minuto - b.minuto),
)
const eventosCronologicos = computed(() =>
  [...delegadoStore.eventos].sort((a, b) => a.minuto - b.minuto || a.timestamp - b.timestamp),
)

const countPorTipo = (tipo: TipoEvento) =>
  delegadoStore.eventos.filter(e => e.tipo === tipo).length

const formatFechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
const formatHoraCorta = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <!-- Sin partido -->
  <div v-if="!partido" class="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6">
    <CircleDot class="w-10 h-10 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
    <p class="text-matchx-text-muted text-sm text-center">Partido no encontrado o no asignado.</p>
  </div>

  <div v-else>

    <!-- ══════════════════════════════════════════════════════════════
         STICKY: Marcador + Cronómetro
         ══════════════════════════════════════════════════════════════ -->
    <div class="sticky top-[57px] z-20 bg-matchx-bg-surface border-b border-matchx-border-base">

      <!-- Marcador -->
      <div class="flex items-center gap-2 px-4 pt-3 pb-1.5">
        <!-- Local -->
        <div class="flex-1 flex items-center gap-2 min-w-0">
          <img v-if="equipoLocal?.escudo_url" :src="equipoLocal.escudo_url" class="w-7 h-7 rounded-lg shrink-0" />
          <div v-else class="w-7 h-7 rounded-lg bg-matchx-bg-elevated border border-matchx-border-base flex items-center justify-center shrink-0">
            <Swords class="w-3.5 h-3.5 text-matchx-text-muted" :stroke-width="1.5" />
          </div>
          <span class="text-sm font-bold text-matchx-text-primary truncate">{{ equipoLocal?.nombre }}</span>
        </div>

        <!-- Score -->
        <div class="flex items-center gap-2.5 shrink-0 px-1">
          <span class="text-3xl font-black font-mono tabular-nums text-matchx-accent-green">
            {{ delegadoStore.golesLocal }}
          </span>
          <span class="text-xl font-black text-matchx-text-muted">–</span>
          <span class="text-3xl font-black font-mono tabular-nums text-matchx-accent-orange">
            {{ delegadoStore.golesVisitante }}
          </span>
        </div>

        <!-- Visitante -->
        <div class="flex-1 flex items-center justify-end gap-2 min-w-0">
          <span class="text-sm font-bold text-matchx-text-primary truncate text-right">{{ equipoVisitante?.nombre }}</span>
          <img v-if="equipoVisitante?.escudo_url" :src="equipoVisitante.escudo_url" class="w-7 h-7 rounded-lg shrink-0" />
          <div v-else class="w-7 h-7 rounded-lg bg-matchx-bg-elevated border border-matchx-border-base flex items-center justify-center shrink-0">
            <Swords class="w-3.5 h-3.5 text-matchx-text-muted" :stroke-width="1.5" />
          </div>
        </div>
      </div>

      <!-- Cronómetro -->
      <div class="flex items-center justify-center gap-2.5 px-4 pb-3">
        <div class="flex items-center gap-1.5 bg-matchx-bg-base rounded-lg px-3 py-1.5">
          <Clock class="w-3.5 h-3.5 text-matchx-text-muted" :stroke-width="1.5" />
          <span
            class="font-mono font-bold tabular-nums text-lg leading-none"
            :class="delegadoStore.corriendo ? 'text-matchx-accent-green' : 'text-matchx-text-primary'"
          >
            {{ delegadoStore.formatCronometro }}
          </span>
          <span v-if="delegadoStore.corriendo" class="w-1.5 h-1.5 rounded-full bg-matchx-accent-green animate-pulse" />
        </div>
        <button
          @click="delegadoStore.corriendo ? delegadoStore.pausarCronometro() : delegadoStore.iniciarCronometro()"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-sm cursor-pointer transition-colors min-h-[36px]"
          :class="delegadoStore.corriendo
            ? 'bg-matchx-bg-elevated border border-matchx-border-base text-matchx-text-secondary hover:text-matchx-text-primary'
            : 'bg-matchx-accent-green text-matchx-bg-base'"
        >
          <Play v-if="!delegadoStore.corriendo" class="w-3.5 h-3.5" fill="currentColor" />
          <Pause v-else class="w-3.5 h-3.5" />
          {{ delegadoStore.corriendo ? 'Pausar' : 'Iniciar' }}
        </button>
        <button
          @click="delegadoStore.resetCronometro()"
          class="p-2 rounded-lg bg-matchx-bg-elevated border border-matchx-border-base text-matchx-text-muted hover:text-matchx-text-primary cursor-pointer transition-colors min-h-[36px]"
          aria-label="Reiniciar cronómetro"
        >
          <RotateCcw class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════
         TAB BAR
         ══════════════════════════════════════════════════════════════ -->
    <div class="flex bg-matchx-bg-surface border-b border-matchx-border-base">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="tabActiva = tab.id"
        class="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold
               transition-colors cursor-pointer min-h-[44px]"
        :class="tabActiva === tab.id
          ? 'text-matchx-accent-green border-b-2 border-matchx-accent-green'
          : 'text-matchx-text-muted hover:text-matchx-text-secondary'"
      >
        <component :is="tab.icon" class="w-3.5 h-3.5" :stroke-width="2" />
        {{ tab.label }}
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════════
         TAB: CONTROL
         ══════════════════════════════════════════════════════════════ -->
    <div v-if="tabActiva === 'control'" class="p-4 pb-8 space-y-5">

      <!-- Action buttons -->
      <div>
        <p class="text-[11px] font-semibold text-matchx-text-muted uppercase tracking-widest mb-3">
          Registrar evento
        </p>
        <div class="grid grid-cols-2 gap-3">

          <button @click="iniciarAccion('gol_local')"
            class="flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl
                   bg-matchx-accent-green/10 border-2 border-matchx-accent-green/40
                   text-matchx-accent-green font-bold cursor-pointer
                   transition-all duration-150 active:scale-95 active:bg-matchx-accent-green/20 min-h-[80px]">
            <v-icon name="co-football" scale="0.9" />
            <span class="text-sm text-center leading-tight">Gol<br>Local</span>
          </button>

          <button @click="iniciarAccion('gol_visitante')"
            class="flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl
                   bg-matchx-accent-orange/10 border-2 border-matchx-accent-orange/40
                   text-matchx-accent-orange font-bold cursor-pointer
                   transition-all duration-150 active:scale-95 active:bg-matchx-accent-orange/20 min-h-[80px]">
            <v-icon name="co-football" scale="0.9" />
            <span class="text-sm text-center leading-tight">Gol<br>Visitante</span>
          </button>

          <button @click="iniciarAccion('amarilla_local')"
            class="flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl
                   bg-yellow-500/10 border-2 border-yellow-500/40
                   text-yellow-400 font-bold cursor-pointer
                   transition-all duration-150 active:scale-95 active:bg-yellow-500/20 min-h-[80px]">
            <Square class="w-7 h-7" :stroke-width="2" fill="currentColor" />
            <span class="text-sm text-center leading-tight">Amarilla<br>Local</span>
          </button>

          <button @click="iniciarAccion('amarilla_visitante')"
            class="flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl
                   bg-yellow-500/10 border-2 border-yellow-500/40
                   text-yellow-400 font-bold cursor-pointer
                   transition-all duration-150 active:scale-95 active:bg-yellow-500/20 min-h-[80px]">
            <Square class="w-7 h-7" :stroke-width="2" fill="currentColor" />
            <span class="text-sm text-center leading-tight">Amarilla<br>Visitante</span>
          </button>

          <button @click="iniciarAccion('roja_local')"
            class="flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl
                   bg-red-500/10 border-2 border-red-500/40
                   text-red-400 font-bold cursor-pointer
                   transition-all duration-150 active:scale-95 active:bg-red-500/20 min-h-[80px]">
            <Square class="w-7 h-7" :stroke-width="2" fill="currentColor" />
            <span class="text-sm text-center leading-tight">Roja<br>Local</span>
          </button>

          <button @click="iniciarAccion('roja_visitante')"
            class="flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl
                   bg-red-500/10 border-2 border-red-500/40
                   text-red-400 font-bold cursor-pointer
                   transition-all duration-150 active:scale-95 active:bg-red-500/20 min-h-[80px]">
            <Square class="w-7 h-7" :stroke-width="2" fill="currentColor" />
            <span class="text-sm text-center leading-tight">Roja<br>Visitante</span>
          </button>

          <button @click="iniciarAccion('lesion')"
            class="col-span-2 flex items-center justify-center gap-2 py-4 rounded-2xl
                   bg-blue-500/10 border-2 border-blue-500/30
                   text-blue-400 font-bold cursor-pointer
                   transition-all duration-150 active:scale-95 active:bg-blue-500/20 min-h-[52px]">
            <AlertCircle class="w-5 h-5" :stroke-width="2" />
            Lesión / Incidencia
          </button>
        </div>
      </div>

      <!-- Controles de partido -->
      <div>
        <p class="text-[11px] font-semibold text-matchx-text-muted uppercase tracking-widest mb-2">
          Control del partido
        </p>
        <div class="flex gap-2">
          <button
            v-for="(tipo, label) in ({ inicio: 'Inicio', fin_primera: 'Fin 1ª', fin_partido: 'Fin partido' } as Record<TipoEvento, string>)"
            :key="tipo"
            @click="iniciarAccion(tipo as TipoEvento)"
            class="flex-1 py-3 rounded-xl bg-matchx-bg-elevated border border-matchx-border-base
                   text-matchx-text-secondary text-xs font-semibold uppercase tracking-wide
                   cursor-pointer transition-colors hover:text-matchx-text-primary min-h-[44px]"
          >
            {{ label }}
          </button>
        </div>
      </div>

      <!-- Banner offline -->
      <div
        v-if="!delegadoStore.online && delegadoStore.colaOffline.length > 0"
        class="flex items-center gap-3 px-4 py-3 rounded-xl
               bg-matchx-accent-orange/10 border border-matchx-accent-orange/30"
      >
        <WifiOff class="w-5 h-5 text-matchx-accent-orange shrink-0" />
        <div>
          <p class="text-sm font-semibold text-matchx-accent-orange">Sin conexión</p>
          <p class="text-xs text-matchx-accent-orange/70 mt-0.5">
            {{ delegadoStore.colaOffline.length }} evento{{ delegadoStore.colaOffline.length !== 1 ? 's' : '' }}
            pendiente{{ delegadoStore.colaOffline.length !== 1 ? 's' : '' }} de sincronizar
          </p>
        </div>
      </div>

      <!-- Últimos eventos (mini-timeline) -->
      <div v-if="delegadoStore.eventos.length > 0">
        <p class="text-[11px] font-semibold text-matchx-text-muted uppercase tracking-widest mb-2">
          Últimos eventos
        </p>
        <div class="space-y-1.5">
          <div
            v-for="ev in delegadoStore.eventos.slice(0, 5)"
            :key="ev.id"
            class="flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs"
            :class="colorClasses[colorEvento(ev.tipo)]"
          >
            <span class="font-black font-mono w-7 text-right shrink-0">{{ ev.minuto }}'</span>
            <Target v-if="ev.tipo === 'gol_local' || ev.tipo === 'gol_visitante'" class="w-3.5 h-3.5 shrink-0" :stroke-width="2" />
            <Square v-else-if="ev.tipo.startsWith('amarilla') || ev.tipo.startsWith('roja')" class="w-3.5 h-3.5 shrink-0" :stroke-width="2" fill="currentColor" />
            <AlertCircle v-else-if="ev.tipo === 'lesion'" class="w-3.5 h-3.5 shrink-0" :stroke-width="2" />
            <CircleDot v-else class="w-3.5 h-3.5 shrink-0" :stroke-width="2" />
            <span class="font-semibold flex-1 truncate">{{ LABEL_ACCION[ev.tipo] }}</span>
            <span v-if="ev.jugador_nombre" class="opacity-70 shrink-0 truncate max-w-[80px]">
              {{ ev.jugador_nombre }}
            </span>
            <WifiOff v-if="!ev.sincronizado" class="w-3 h-3 shrink-0 opacity-50" />
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════
         TAB: ALINEACIONES
         ══════════════════════════════════════════════════════════════ -->
    <div v-if="tabActiva === 'alineaciones'" class="p-4 pb-8">

      <!-- Leyenda -->
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4 text-xs text-matchx-text-muted">
        <span class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-matchx-accent-green/80" />
          {{ equipoLocal?.nombre ?? 'Local' }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-matchx-accent-orange/80" />
          {{ equipoVisitante?.nombre ?? 'Visitante' }}
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full border-2 border-yellow-400" />
          Amarilla
        </span>
        <span class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full border-2 border-red-500 opacity-50" />
          Expulsado
        </span>
      </div>

      <!-- Campo de fútbol -->
      <div
        class="relative rounded-2xl overflow-hidden border border-green-900"
        style="height: 560px; background: linear-gradient(180deg, #1a5c1a 0%, #1e6b1e 50%, #1a5c1a 100%)"
      >
        <!-- Líneas del campo -->
        <!-- Área local (arriba) -->
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-14 border-b-2 border-x-2 border-white/20 rounded-b-xl" />
        <!-- Línea central -->
        <div class="absolute top-1/2 left-4 right-4 h-px bg-white/25 -translate-y-px" />
        <!-- Círculo central -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/20" />
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/40" />
        <!-- Área visitante (abajo) -->
        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-14 border-t-2 border-x-2 border-white/20 rounded-t-xl" />

        <!-- Nombre visitante -->
        <div class="absolute top-2 right-3 text-[10px] font-bold text-white/50 uppercase tracking-wider text-right">
          {{ equipoVisitante?.nombre }}
        </div>
        <!-- Nombre local -->
        <div class="absolute bottom-2 left-3 text-[10px] font-bold text-white/50 uppercase tracking-wider">
          {{ equipoLocal?.nombre }}
        </div>

        <!-- ── Mitad VISITANTE (arriba, portero al tope) ── -->
        <div class="absolute top-0 left-0 right-0 h-1/2 flex flex-col justify-around items-center py-4">
          <!-- Portero visitante (arriba, línea de gol) -->
          <div class="flex justify-center gap-6">
            <div
              v-for="j in groupByPosition(jugadoresVisitante).portero"
              :key="j.id"
              class="flex flex-col items-center gap-0.5"
            >
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 transition-all"
                :class="[
                  'bg-matchx-accent-orange/80',
                  estadoJugador(j.id) === 'amarilla'  ? 'ring-2 ring-yellow-400' : '',
                  estadoJugador(j.id) === 'expulsado' ? 'ring-2 ring-red-500 opacity-40' : '',
                ]"
              >{{ j.numero_camiseta }}</div>
              <span class="text-[9px] text-white/80 font-medium leading-tight max-w-[44px] text-center truncate">
                {{ j.apellido }}
              </span>
            </div>
          </div>
          <!-- Defensas visitante -->
          <div class="flex justify-center gap-5">
            <div
              v-for="j in groupByPosition(jugadoresVisitante).defensa"
              :key="j.id"
              class="flex flex-col items-center gap-0.5"
            >
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 transition-all"
                :class="[
                  'bg-matchx-accent-orange/80',
                  estadoJugador(j.id) === 'amarilla'  ? 'ring-2 ring-yellow-400' : '',
                  estadoJugador(j.id) === 'expulsado' ? 'ring-2 ring-red-500 opacity-40' : '',
                ]"
              >{{ j.numero_camiseta }}</div>
              <span class="text-[9px] text-white/80 font-medium leading-tight max-w-[44px] text-center truncate">{{ j.apellido }}</span>
            </div>
          </div>
          <!-- Mediocampo visitante -->
          <div class="flex justify-center gap-5">
            <div
              v-for="j in groupByPosition(jugadoresVisitante).mediocampo"
              :key="j.id"
              class="flex flex-col items-center gap-0.5"
            >
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 transition-all"
                :class="[
                  'bg-matchx-accent-orange/80',
                  estadoJugador(j.id) === 'amarilla'  ? 'ring-2 ring-yellow-400' : '',
                  estadoJugador(j.id) === 'expulsado' ? 'ring-2 ring-red-500 opacity-40' : '',
                ]"
              >{{ j.numero_camiseta }}</div>
              <span class="text-[9px] text-white/80 font-medium leading-tight max-w-[44px] text-center truncate">{{ j.apellido }}</span>
            </div>
          </div>
          <!-- Delanteros visitante (cerca de la línea central) -->
          <div class="flex justify-center gap-5">
            <div
              v-for="j in groupByPosition(jugadoresVisitante).delantero"
              :key="j.id"
              class="flex flex-col items-center gap-0.5"
            >
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 transition-all"
                :class="[
                  'bg-matchx-accent-orange/80',
                  estadoJugador(j.id) === 'amarilla'  ? 'ring-2 ring-yellow-400' : '',
                  estadoJugador(j.id) === 'expulsado' ? 'ring-2 ring-red-500 opacity-40' : '',
                ]"
              >{{ j.numero_camiseta }}</div>
              <span class="text-[9px] text-white/80 font-medium leading-tight max-w-[44px] text-center truncate">{{ j.apellido }}</span>
            </div>
          </div>
        </div>

        <!-- ── Mitad LOCAL (abajo, portero en el fondo) ── -->
        <div class="absolute bottom-0 left-0 right-0 h-1/2 flex flex-col-reverse justify-around items-center py-4">
          <!-- Portero local (abajo) — primero en flex-col-reverse = al fondo -->
          <div class="flex justify-center gap-6">
            <div
              v-for="j in groupByPosition(jugadoresLocal).portero"
              :key="j.id"
              class="flex flex-col items-center gap-0.5"
            >
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all"
                :class="[
                  'bg-matchx-accent-green/90 text-matchx-bg-base',
                  estadoJugador(j.id) === 'amarilla'  ? 'ring-2 ring-yellow-400' : '',
                  estadoJugador(j.id) === 'expulsado' ? 'ring-2 ring-red-500 opacity-40' : '',
                ]"
              >{{ j.numero_camiseta }}</div>
              <span class="text-[9px] text-white/80 font-medium leading-tight max-w-[44px] text-center truncate">{{ j.apellido }}</span>
            </div>
          </div>
          <!-- Defensas local -->
          <div class="flex justify-center gap-5">
            <div
              v-for="j in groupByPosition(jugadoresLocal).defensa"
              :key="j.id"
              class="flex flex-col items-center gap-0.5"
            >
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all"
                :class="[
                  'bg-matchx-accent-green/90 text-matchx-bg-base',
                  estadoJugador(j.id) === 'amarilla'  ? 'ring-2 ring-yellow-400' : '',
                  estadoJugador(j.id) === 'expulsado' ? 'ring-2 ring-red-500 opacity-40' : '',
                ]"
              >{{ j.numero_camiseta }}</div>
              <span class="text-[9px] text-white/80 font-medium leading-tight max-w-[44px] text-center truncate">{{ j.apellido }}</span>
            </div>
          </div>
          <!-- Mediocampo local -->
          <div class="flex justify-center gap-5">
            <div
              v-for="j in groupByPosition(jugadoresLocal).mediocampo"
              :key="j.id"
              class="flex flex-col items-center gap-0.5"
            >
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all"
                :class="[
                  'bg-matchx-accent-green/90 text-matchx-bg-base',
                  estadoJugador(j.id) === 'amarilla'  ? 'ring-2 ring-yellow-400' : '',
                  estadoJugador(j.id) === 'expulsado' ? 'ring-2 ring-red-500 opacity-40' : '',
                ]"
              >{{ j.numero_camiseta }}</div>
              <span class="text-[9px] text-white/80 font-medium leading-tight max-w-[44px] text-center truncate">{{ j.apellido }}</span>
            </div>
          </div>
          <!-- Delanteros local (cerca de línea central) -->
          <div class="flex justify-center gap-5">
            <div
              v-for="j in groupByPosition(jugadoresLocal).delantero"
              :key="j.id"
              class="flex flex-col items-center gap-0.5"
            >
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all"
                :class="[
                  'bg-matchx-accent-green/90 text-matchx-bg-base',
                  estadoJugador(j.id) === 'amarilla'  ? 'ring-2 ring-yellow-400' : '',
                  estadoJugador(j.id) === 'expulsado' ? 'ring-2 ring-red-500 opacity-40' : '',
                ]"
              >{{ j.numero_camiseta }}</div>
              <span class="text-[9px] text-white/80 font-medium leading-tight max-w-[44px] text-center truncate">{{ j.apellido }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Plantillas detalladas debajo del campo -->
      <div class="grid grid-cols-2 gap-3 mt-4">
        <!-- Local -->
        <div class="bg-matchx-bg-surface rounded-xl border border-matchx-border-base overflow-hidden">
          <div class="flex items-center gap-2 px-3 py-2.5 border-b border-matchx-border-base">
            <span class="w-2.5 h-2.5 rounded-full bg-matchx-accent-green shrink-0" />
            <span class="text-xs font-bold text-matchx-text-primary truncate">{{ equipoLocal?.nombre }}</span>
          </div>
          <div class="divide-y divide-matchx-border-base/50">
            <div
              v-for="j in [...jugadoresLocal].sort((a,b) => posicionOrder[a.posicion] - posicionOrder[b.posicion])"
              :key="j.id"
              class="flex items-center gap-2 px-3 py-2"
              :class="estadoJugador(j.id) === 'expulsado' ? 'opacity-40' : ''"
            >
              <span class="text-xs font-black font-mono text-matchx-accent-green w-5 text-right shrink-0">
                {{ j.numero_camiseta }}
              </span>
              <span class="text-xs text-matchx-text-primary flex-1 truncate">{{ j.apellido }}</span>
              <Square v-if="estadoJugador(j.id) === 'amarilla'" class="w-3 h-3 text-yellow-400 shrink-0" fill="currentColor" />
              <Square v-if="estadoJugador(j.id) === 'expulsado'" class="w-3 h-3 text-red-400 shrink-0" fill="currentColor" />
            </div>
          </div>
        </div>

        <!-- Visitante -->
        <div class="bg-matchx-bg-surface rounded-xl border border-matchx-border-base overflow-hidden">
          <div class="flex items-center gap-2 px-3 py-2.5 border-b border-matchx-border-base">
            <span class="w-2.5 h-2.5 rounded-full bg-matchx-accent-orange shrink-0" />
            <span class="text-xs font-bold text-matchx-text-primary truncate">{{ equipoVisitante?.nombre }}</span>
          </div>
          <div class="divide-y divide-matchx-border-base/50">
            <div
              v-for="j in [...jugadoresVisitante].sort((a,b) => posicionOrder[a.posicion] - posicionOrder[b.posicion])"
              :key="j.id"
              class="flex items-center gap-2 px-3 py-2"
              :class="estadoJugador(j.id) === 'expulsado' ? 'opacity-40' : ''"
            >
              <span class="text-xs font-black font-mono text-matchx-accent-orange w-5 text-right shrink-0">
                {{ j.numero_camiseta }}
              </span>
              <span class="text-xs text-matchx-text-primary flex-1 truncate">{{ j.apellido }}</span>
              <Square v-if="estadoJugador(j.id) === 'amarilla'" class="w-3 h-3 text-yellow-400 shrink-0" fill="currentColor" />
              <Square v-if="estadoJugador(j.id) === 'expulsado'" class="w-3 h-3 text-red-400 shrink-0" fill="currentColor" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════
         TAB: RESUMEN
         ══════════════════════════════════════════════════════════════ -->
    <div v-if="tabActiva === 'resumen'" class="p-4 pb-8 space-y-5">

      <!-- Acta header -->
      <div class="bg-matchx-bg-surface rounded-xl border border-matchx-border-base p-4 text-center">
        <p class="text-[11px] text-matchx-text-muted uppercase tracking-widest">
          {{ formatFechaCorta(partido.fecha_hora) }} · {{ formatHoraCorta(partido.fecha_hora) }}
        </p>
        <div class="flex items-center justify-center gap-3 mt-2">
          <img v-if="equipoLocal?.escudo_url" :src="equipoLocal.escudo_url" class="w-8 h-8 rounded-lg" />
          <div class="flex items-center gap-2">
            <span class="text-4xl font-black font-mono text-matchx-accent-green tabular-nums">
              {{ delegadoStore.golesLocal }}
            </span>
            <span class="text-2xl font-black text-matchx-text-muted">–</span>
            <span class="text-4xl font-black font-mono text-matchx-accent-orange tabular-nums">
              {{ delegadoStore.golesVisitante }}
            </span>
          </div>
          <img v-if="equipoVisitante?.escudo_url" :src="equipoVisitante.escudo_url" class="w-8 h-8 rounded-lg" />
        </div>
        <div class="flex items-center justify-center gap-3 mt-1">
          <span class="text-xs font-semibold text-matchx-text-secondary">{{ equipoLocal?.nombre }}</span>
          <span class="text-xs text-matchx-text-muted">vs</span>
          <span class="text-xs font-semibold text-matchx-text-secondary">{{ equipoVisitante?.nombre }}</span>
        </div>
        <p class="text-xs text-matchx-text-muted mt-1.5">Jornada {{ partido.jornada }}</p>
      </div>

      <!-- Estadísticas tabla -->
      <div class="bg-matchx-bg-surface rounded-xl border border-matchx-border-base overflow-hidden">
        <div class="px-4 py-2.5 border-b border-matchx-border-base flex items-center justify-between">
          <span class="text-[11px] font-bold text-matchx-text-muted uppercase tracking-widest">Estadísticas</span>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-matchx-border-base/50">
              <th class="px-4 py-2 text-matchx-accent-green font-bold text-center text-xs">Local</th>
              <th class="px-3 py-2 text-matchx-text-muted text-center text-[11px] font-medium"></th>
              <th class="px-4 py-2 text-matchx-accent-orange font-bold text-center text-xs">Visitante</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-matchx-border-base/50">
              <td class="px-4 py-2.5 text-matchx-accent-green font-black text-xl text-center tabular-nums">{{ delegadoStore.golesLocal }}</td>
              <td class="px-3 py-2.5 text-matchx-text-muted text-[11px] text-center font-medium">Goles</td>
              <td class="px-4 py-2.5 text-matchx-accent-orange font-black text-xl text-center tabular-nums">{{ delegadoStore.golesVisitante }}</td>
            </tr>
            <tr class="border-b border-matchx-border-base/50">
              <td class="px-4 py-2.5 text-yellow-400 font-bold text-center tabular-nums">{{ countPorTipo('amarilla_local') }}</td>
              <td class="px-3 py-2.5 text-matchx-text-muted text-[11px] text-center font-medium">Amarillas</td>
              <td class="px-4 py-2.5 text-yellow-400 font-bold text-center tabular-nums">{{ countPorTipo('amarilla_visitante') }}</td>
            </tr>
            <tr class="border-b border-matchx-border-base/50">
              <td class="px-4 py-2.5 text-red-400 font-bold text-center tabular-nums">{{ countPorTipo('roja_local') }}</td>
              <td class="px-3 py-2.5 text-matchx-text-muted text-[11px] text-center font-medium">Rojas</td>
              <td class="px-4 py-2.5 text-red-400 font-bold text-center tabular-nums">{{ countPorTipo('roja_visitante') }}</td>
            </tr>
            <tr>
              <td colspan="3" class="px-4 py-2.5 text-blue-400 font-medium text-center text-sm">
                {{ lesiones.length }} Lesión{{ lesiones.length !== 1 ? 'es' : '' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Goles -->
      <div v-if="goles.length > 0">
        <div class="flex items-center gap-2 mb-2.5">
          <v-icon class="w-4 h-4 text-matchx-text-secondary" name="co-football" scale="0.9" />
          <p class="text-sm font-bold text-matchx-text-primary">Goles ({{ goles.length }})</p>
        </div>
        <div class="space-y-1.5">
          <div v-for="ev in goles" :key="ev.id"
               class="flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs"
               :class="colorClasses[colorEvento(ev.tipo)]">
            <span class="font-black font-mono w-7 text-right shrink-0">{{ ev.minuto }}'</span>
            <v-icon name="co-football" scale="0.9" />
            <span class="font-semibold flex-1 truncate">{{ ev.jugador_nombre ?? '—' }}</span>
            <span class="opacity-60 shrink-0 text-[10px]">
              {{ ev.tipo === 'gol_local' ? equipoLocal?.nombre : equipoVisitante?.nombre }}
            </span>
          </div>
        </div>
      </div>

      <!-- Tarjetas amarillas -->
      <div v-if="amarillas.length > 0">
        <div class="flex items-center gap-2 mb-2.5">
          <Square class="w-4 h-4 text-yellow-400" :stroke-width="2" fill="currentColor" />
          <p class="text-sm font-bold text-matchx-text-primary">Amarillas ({{ amarillas.length }})</p>
        </div>
        <div class="space-y-1.5">
          <div v-for="ev in amarillas" :key="ev.id"
               class="flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/25">
            <span class="font-black font-mono w-7 text-right shrink-0">{{ ev.minuto }}'</span>
            <Square class="w-3.5 h-3.5 shrink-0" :stroke-width="2" fill="currentColor" />
            <span class="font-semibold flex-1 truncate">{{ ev.jugador_nombre ?? '—' }}</span>
            <span class="opacity-60 shrink-0 text-[10px]">
              {{ ev.tipo === 'amarilla_local' ? equipoLocal?.nombre : equipoVisitante?.nombre }}
            </span>
          </div>
        </div>
      </div>

      <!-- Tarjetas rojas -->
      <div v-if="rojas.length > 0">
        <div class="flex items-center gap-2 mb-2.5">
          <Square class="w-4 h-4 text-red-400" :stroke-width="2" fill="currentColor" />
          <p class="text-sm font-bold text-matchx-text-primary">Rojas ({{ rojas.length }})</p>
        </div>
        <div class="space-y-1.5">
          <div v-for="ev in rojas" :key="ev.id"
               class="flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs bg-red-500/10 text-red-400 border-red-500/25">
            <span class="font-black font-mono w-7 text-right shrink-0">{{ ev.minuto }}'</span>
            <Square class="w-3.5 h-3.5 shrink-0" :stroke-width="2" fill="currentColor" />
            <span class="font-semibold flex-1 truncate">{{ ev.jugador_nombre ?? '—' }}</span>
            <span class="opacity-60 shrink-0 text-[10px]">
              {{ ev.tipo === 'roja_local' ? equipoLocal?.nombre : equipoVisitante?.nombre }}
            </span>
          </div>
        </div>
      </div>

      <!-- Lesiones -->
      <div v-if="lesiones.length > 0">
        <div class="flex items-center gap-2 mb-2.5">
          <AlertCircle class="w-4 h-4 text-blue-400" :stroke-width="2" />
          <p class="text-sm font-bold text-matchx-text-primary">Lesiones / Incidencias ({{ lesiones.length }})</p>
        </div>
        <div class="space-y-1.5">
          <div v-for="ev in lesiones" :key="ev.id"
               class="flex items-center gap-3 px-3 py-2.5 rounded-xl border text-xs bg-blue-500/10 text-blue-400 border-blue-500/25">
            <span class="font-black font-mono w-7 text-right shrink-0">{{ ev.minuto }}'</span>
            <AlertCircle class="w-3.5 h-3.5 shrink-0" :stroke-width="2" />
            <span class="font-semibold flex-1 truncate">{{ ev.jugador_nombre ?? '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Timeline completo -->
      <div v-if="eventosCronologicos.length > 0">
        <p class="text-[11px] font-bold text-matchx-text-muted uppercase tracking-widest mb-2.5">
          Timeline completo
        </p>
        <div class="space-y-1.5">
          <div
            v-for="ev in eventosCronologicos"
            :key="ev.id"
            class="flex items-center gap-3 px-3 py-2 rounded-xl border text-xs"
            :class="colorClasses[colorEvento(ev.tipo)]"
          >
            <span class="font-black font-mono w-7 text-right shrink-0">{{ ev.minuto }}'</span>
            <Target v-if="ev.tipo === 'gol_local' || ev.tipo === 'gol_visitante'" class="w-3.5 h-3.5 shrink-0" :stroke-width="2" />
            <Square v-else-if="ev.tipo.startsWith('amarilla') || ev.tipo.startsWith('roja')" class="w-3.5 h-3.5 shrink-0" :stroke-width="2" fill="currentColor" />
            <AlertCircle v-else-if="ev.tipo === 'lesion'" class="w-3.5 h-3.5 shrink-0" :stroke-width="2" />
            <CircleDot v-else class="w-3.5 h-3.5 shrink-0" :stroke-width="2" />
            <span class="font-semibold flex-1 truncate">{{ LABEL_ACCION[ev.tipo] }}</span>
            <span v-if="ev.jugador_nombre" class="opacity-60 truncate max-w-[90px] shrink-0">{{ ev.jugador_nombre }}</span>
            <WifiOff v-if="!ev.sincronizado" class="w-3 h-3 shrink-0 opacity-50" />
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="delegadoStore.eventos.length === 0" class="flex flex-col items-center gap-2 py-10 text-center">
        <FileText class="w-10 h-10 text-matchx-text-muted opacity-25 mx-auto" :stroke-width="1.5" />
        <p class="text-sm text-matchx-text-muted">Sin eventos registrados aún</p>
        <p class="text-xs text-matchx-text-muted/70">Los eventos aparecerán aquí una vez que registres acciones del partido</p>
      </div>
    </div>

  </div>

  <!-- ══════════════════════════════════════════════════════════════
       BOTTOM SHEET: Selector de jugador
       ══════════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="accionPendiente" class="fixed inset-0 z-50 flex items-end">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/70 backdrop-blur-sm"
          @click="cancelarAccion"
        />

        <!-- Panel -->
        <div class="sheet-panel relative w-full bg-matchx-bg-elevated rounded-t-2xl border-t border-matchx-border-base max-h-[78vh] flex flex-col shadow-2xl">

          <!-- Drag handle -->
          <div class="flex justify-center pt-3 pb-1 shrink-0">
            <div class="w-10 h-1 rounded-full bg-matchx-border-base" />
          </div>

          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-3 border-b border-matchx-border-base shrink-0">
            <div>
              <p class="text-[10px] text-matchx-text-muted uppercase tracking-widest font-semibold">
                Selecciona un jugador
              </p>
              <p class="text-base font-black text-matchx-text-primary mt-0.5">
                {{ accionPendiente.label }}
              </p>
            </div>
            <button
              @click="cancelarAccion"
              class="p-2 rounded-xl bg-matchx-bg-surface border border-matchx-border-base
                     text-matchx-text-muted hover:text-matchx-text-primary cursor-pointer
                     transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Cancelar"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Players list -->
          <div class="overflow-y-auto flex-1">
            <template v-for="(jugador, idx) in jugadoresSheet" :key="jugador.id">

              <!-- Team header (only for lesion) -->
              <div
                v-if="showTeamHeaders && (idx === 0 || jugadoresSheet[idx - 1]._equipo !== jugador._equipo)"
                class="px-5 py-2 text-[11px] font-bold uppercase tracking-widest border-b border-matchx-border-base"
                :class="jugador._equipo === 'local'
                  ? 'bg-matchx-accent-green/5 text-matchx-accent-green'
                  : 'bg-matchx-accent-orange/5 text-matchx-accent-orange'"
              >
                {{ jugador._equipo === 'local' ? equipoLocal?.nombre : equipoVisitante?.nombre }}
              </div>

              <!-- Player row -->
              <button
                @click="confirmarJugador(jugador)"
                :disabled="estadoJugador(jugador.id) === 'expulsado'"
                class="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-matchx-bg-surface
                       transition-colors cursor-pointer text-left min-h-[60px]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       border-b border-matchx-border-base/40 last:border-b-0"
              >
                <!-- Número camiseta -->
                <div
                  class="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black shrink-0 transition-all"
                  :class="[
                    jugador._equipo === 'local'
                      ? 'bg-matchx-accent-green/15 text-matchx-accent-green'
                      : 'bg-matchx-accent-orange/15 text-matchx-accent-orange',
                    estadoJugador(jugador.id) === 'amarilla'  ? 'ring-2 ring-yellow-400' : '',
                    estadoJugador(jugador.id) === 'expulsado' ? 'ring-2 ring-red-500'    : '',
                  ]"
                >
                  {{ jugador.numero_camiseta }}
                </div>

                <!-- Nombre + posición -->
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-matchx-text-primary text-sm truncate">
                    {{ jugador.nombre }} {{ jugador.apellido }}
                  </p>
                  <p class="text-xs text-matchx-text-muted capitalize mt-0.5">{{ jugador.posicion }}</p>
                </div>

                <!-- Estado tarjeta -->
                <div class="shrink-0 flex items-center gap-1">
                  <template v-if="estadoJugador(jugador.id) === 'expulsado'">
                    <Square class="w-4 h-4 text-red-400" fill="currentColor" />
                    <span class="text-xs text-red-400 font-semibold">Expulsado</span>
                  </template>
                  <Square v-else-if="estadoJugador(jugador.id) === 'amarilla'" class="w-4 h-4 text-yellow-400" fill="currentColor" />
                </div>
              </button>
            </template>
          </div>

          <!-- Cancel -->
          <div class="px-5 py-4 border-t border-matchx-border-base shrink-0">
            <button
              @click="cancelarAccion"
              class="w-full py-3 text-matchx-text-secondary text-sm font-semibold
                     hover:text-matchx-text-primary transition-colors cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.25s ease;
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
</style>
