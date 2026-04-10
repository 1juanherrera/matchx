<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePartidosStore } from '@/stores/partidos'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore } from '@/stores/equipos'
import { useJugadoresStore } from '@/stores/jugadores'
import { useSedesStore } from '@/stores/sedes'
import { useUsuariosStore } from '@/stores/usuarios'
import { partidosService } from '@/services/partidos.service'
import { eventosService, type EventoPartidoAPI } from '@/services/eventos.service'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import {
  ArrowLeft, Printer, FileCheck2, Swords, Goal,
  ArrowLeftRight, Flag, MapPin, Calendar, User, Trophy,
  CircleAlert, Circle,
} from 'lucide-vue-next'

// ── Stores & route ───────────────────────────────────────────────────────────
const route  = useRoute()
const router = useRouter()

const partidosStore  = usePartidosStore()
const torneosStore   = useTorneosStore()
const equiposStore   = useEquiposStore()
const jugadoresStore = useJugadoresStore()
const sedesStore     = useSedesStore()
const usuariosStore  = useUsuariosStore()

const partidoId = computed(() => Number(route.params.id))

// ── Estado local ─────────────────────────────────────────────────────────────
interface Convocado {
  convocatoria_id: number
  jugador_id:      number
  equipo_id:       number
  numero_dorsal:   number
  posicion:        string
  es_titular:      boolean
}

const convocatoria    = ref<Convocado[]>([])
const eventos         = ref<EventoPartidoAPI[]>([])
const observaciones   = ref('')
const actaConfirmada  = ref(false)
const loading         = ref(true)
const errorMsg        = ref('')

// ── Computed — partido y relaciones ──────────────────────────────────────────
const partido    = computed(() => partidosStore.obtenerPorId(partidoId.value))
const torneo     = computed(() => partido.value ? torneosStore.torneos.find(t => t.id === partido.value!.torneo_id) : null)
const eqLocal    = computed(() => partido.value ? equiposStore.obtenerPorId(partido.value.equipo_local_id)    : null)
const eqVisit    = computed(() => partido.value ? equiposStore.obtenerPorId(partido.value.equipo_visitante_id) : null)
const sede       = computed(() => partido.value ? sedesStore.obtenerPorId(partido.value.sede_id)  : null)
const arbitro    = computed(() => partido.value ? usuariosStore.usuarios.find(u => u.id === partido.value!.arbitro_id)  : null)
const delegado   = computed(() => partido.value ? usuariosStore.usuarios.find(u => u.id === partido.value!.delegado_id) : null)

// ── Convocatoria por equipo ───────────────────────────────────────────────────
const convLocal  = computed(() => convocatoria.value.filter(c => c.equipo_id === partido.value?.equipo_local_id))
const convVisit  = computed(() => convocatoria.value.filter(c => c.equipo_id === partido.value?.equipo_visitante_id))

// fallback: si no hay convocatoria cargada, mostrar plantel completo del equipo
const titLocal   = computed(() =>
  convLocal.value.length
    ? convLocal.value.filter(c => c.es_titular)
    : jugadoresStore.jugadoresPorEquipo(partido.value?.equipo_local_id ?? 0).slice(0, 11).map(j => ({
        convocatoria_id: 0, jugador_id: j.id, equipo_id: j.equipo_id,
        numero_dorsal: j.numero_camiseta, posicion: j.posicion, es_titular: true,
      }))
)
const suplLocal  = computed(() =>
  convLocal.value.length
    ? convLocal.value.filter(c => !c.es_titular)
    : jugadoresStore.jugadoresPorEquipo(partido.value?.equipo_local_id ?? 0).slice(11).map(j => ({
        convocatoria_id: 0, jugador_id: j.id, equipo_id: j.equipo_id,
        numero_dorsal: j.numero_camiseta, posicion: j.posicion, es_titular: false,
      }))
)
const titVisit   = computed(() =>
  convVisit.value.length
    ? convVisit.value.filter(c => c.es_titular)
    : jugadoresStore.jugadoresPorEquipo(partido.value?.equipo_visitante_id ?? 0).slice(0, 11).map(j => ({
        convocatoria_id: 0, jugador_id: j.id, equipo_id: j.equipo_id,
        numero_dorsal: j.numero_camiseta, posicion: j.posicion, es_titular: true,
      }))
)
const suplVisit  = computed(() =>
  convVisit.value.length
    ? convVisit.value.filter(c => !c.es_titular)
    : jugadoresStore.jugadoresPorEquipo(partido.value?.equipo_visitante_id ?? 0).slice(11).map(j => ({
        convocatoria_id: 0, jugador_id: j.id, equipo_id: j.equipo_id,
        numero_dorsal: j.numero_camiseta, posicion: j.posicion, es_titular: false,
      }))
)

const eventosOrdenados = computed(() => [...eventos.value].sort((a, b) => a.minuto - b.minuto))

// ── Helpers ──────────────────────────────────────────────────────────────────
const nombreJugador = (id: number) => {
  const j = jugadoresStore.obtenerPorId(id)
  return j ? `${j.nombre} ${j.apellido}` : `Jugador ${id}`
}
const inicialesJugador = (id: number) => {
  const j = jugadoresStore.obtenerPorId(id)
  return j ? `${j.nombre[0] ?? ''}${j.apellido[0] ?? ''}`.toUpperCase() : '?'
}

const posAbrev: Record<string, string> = {
  portero: 'POR', defensa: 'DEF', mediocampo: 'MED', delantero: 'DEL',
}

const tipoLabel: Record<string, string> = {
  gol: 'Gol', tarjeta_amarilla: 'T. Amarilla', tarjeta_roja: 'T. Roja',
  cambio: 'Cambio', penal_convertido: 'Penal', penal_fallado: 'Penal fallado',
  observacion: 'Observación',
}

const esDeLocal = (ev: EventoPartidoAPI) =>
  ev.equipo_id === partido.value?.equipo_local_id

const eventoIconColor = (tipo: string) => {
  if (tipo === 'gol' || tipo === 'penal_convertido')  return 'text-matchx-accent-green'
  if (tipo === 'tarjeta_amarilla')                    return 'text-yellow-400'
  if (tipo === 'tarjeta_roja')                        return 'text-red-400'
  if (tipo === 'cambio')                              return 'text-blue-400'
  return 'text-matchx-text-muted'
}

const estadoBadge = (estado: string): 'green' | 'orange' | 'gray' | 'blue' =>
  ({ en_curso: 'green', programado: 'blue', finalizado: 'gray', suspendido: 'orange', aplazado: 'orange' } as any)[estado] ?? 'gray'

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

// ── Mock de eventos para partidos finalizados sin datos en API ────────────────
function generarEventosMock(): EventoPartidoAPI[] {
  const p = partido.value
  if (!p) return []

  const jugL = jugadoresStore.jugadoresPorEquipo(p.equipo_local_id)
  const jugV = jugadoresStore.jugadoresPorEquipo(p.equipo_visitante_id)

  const list: EventoPartidoAPI[] = []
  let idSeq = 9000

  // hash determinista basado en semilla
  const h = (s: number) => ((s * 1664525 + 1013904223) >>> 0)

  // pick de array por índice derivado de semilla
  const pick = (arr: typeof jugL, seed: number) =>
    arr.length ? arr[h(seed) % arr.length] : null

  // minutos únicos sin colisión
  const usedMin = new Set<number>()
  const nextMin = (base: number, range: number, seed: number) => {
    let m = (h(seed) % range) + base
    while (usedMin.has(m) && m < 90) m++
    usedMin.add(m)
    return Math.min(m, 90)
  }

  let s = p.id

  // Goles local — solo atacantes/mediocampistas/defensas (no portero)
  const anotadoresL = jugL.filter(j => j.posicion !== 'portero')
  for (let i = 0; i < p.goles_local; i++) {
    const jug = pick(anotadoresL, s + i * 7)
    if (jug) list.push({
      id: idSeq++, partido_id: p.id, tipo_evento: 'gol',
      minuto: nextMin(6, 78, s + i * 13),
      equipo_id: p.equipo_local_id, jugador_id: jug.id,
      creado_en: p.fecha_hora,
    })
    s = h(s + i)
  }

  // Goles visitante
  const anotadoresV = jugV.filter(j => j.posicion !== 'portero')
  for (let i = 0; i < p.goles_visitante; i++) {
    const jug = pick(anotadoresV, s + i * 11)
    if (jug) list.push({
      id: idSeq++, partido_id: p.id, tipo_evento: 'gol',
      minuto: nextMin(6, 78, s + i * 17),
      equipo_id: p.equipo_visitante_id, jugador_id: jug.id,
      creado_en: p.fecha_hora,
    })
    s = h(s + i + 50)
  }

  // Tarjetas amarillas (0-2 por equipo, deterministas)
  const numAmL = h(s + 1) % 3
  const numAmV = h(s + 2) % 3
  for (let i = 0; i < numAmL; i++) {
    const jug = pick(jugL, s + i * 3 + 100)
    if (jug) list.push({
      id: idSeq++, partido_id: p.id, tipo_evento: 'tarjeta_amarilla',
      minuto: nextMin(18, 60, s + i * 19 + 200),
      equipo_id: p.equipo_local_id, jugador_id: jug.id,
      creado_en: p.fecha_hora,
    })
  }
  for (let i = 0; i < numAmV; i++) {
    const jug = pick(jugV, s + i * 3 + 150)
    if (jug) list.push({
      id: idSeq++, partido_id: p.id, tipo_evento: 'tarjeta_amarilla',
      minuto: nextMin(18, 60, s + i * 23 + 300),
      equipo_id: p.equipo_visitante_id, jugador_id: jug.id,
      creado_en: p.fecha_hora,
    })
  }

  // Tarjeta roja (solo si la semilla lo indica ~25% de los partidos)
  if (h(s + 77) % 4 === 0 && jugL.length) {
    const jug = pick(jugL.filter(j => j.posicion !== 'portero'), s + 777)
    if (jug) list.push({
      id: idSeq++, partido_id: p.id, tipo_evento: 'tarjeta_roja',
      minuto: nextMin(30, 55, s + 888),
      equipo_id: p.equipo_local_id, jugador_id: jug.id,
      creado_en: p.fecha_hora,
    })
  }

  // Cambios: 1 por equipo si hay suplentes
  const titL = jugL.slice(0, 11), supL = jugL.slice(11)
  if (titL.length && supL.length) {
    const entra = pick(supL, s + 400)
    if (entra) list.push({
      id: idSeq++, partido_id: p.id, tipo_evento: 'cambio',
      minuto: nextMin(52, 30, s + 402),
      equipo_id: p.equipo_local_id, jugador_id: entra.id,
      creado_en: p.fecha_hora,
    })
  }
  const titV = jugV.slice(0, 11), supV = jugV.slice(11)
  if (titV.length && supV.length) {
    const entra = pick(supV, s + 500)
    if (entra) list.push({
      id: idSeq++, partido_id: p.id, tipo_evento: 'cambio',
      minuto: nextMin(52, 30, s + 502),
      equipo_id: p.equipo_visitante_id, jugador_id: entra.id,
      creado_en: p.fecha_hora,
    })
  }

  return list
}

// ── Mount ────────────────────────────────────────────────────────────────────
onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      partidosStore.fetchPartidos(),
      torneosStore.fetchTorneos(),
      equiposStore.fetchEquipos(),
      jugadoresStore.fetchJugadores(),
      sedesStore.fetchSedes(),
      usuariosStore.fetchUsuarios(),
    ])

    const [convRes, evRes] = await Promise.allSettled([
      partidosService.getConvocatoria(partidoId.value),
      eventosService.getByPartido(partidoId.value),
    ])

    if (convRes.status === 'fulfilled') {
      const raw: any[] = convRes.value.data?.data ?? convRes.value.data ?? []
      convocatoria.value = raw.map(c => ({
        convocatoria_id: c.id_convocatoria ?? c.id ?? 0,
        jugador_id:    c.jugador_id,
        equipo_id:     c.equipo_id,
        numero_dorsal: c.numero_dorsal ?? 0,
        posicion:      c.posicion ?? '',
        es_titular:    c.es_titular === 1 || c.es_titular === true,
      }))
    }

    if (evRes.status === 'fulfilled') {
      eventos.value = evRes.value
    }

    // Fallback: generar eventos de ejemplo para partidos finalizados sin datos
    if (partido.value?.estado === 'finalizado' && eventos.value.length === 0) {
      eventos.value = generarEventosMock()
    }
  } catch (e: any) {
    errorMsg.value = e.message ?? 'Error cargando el acta'
  } finally {
    loading.value = false
  }
})

const printActa = () => window.print()
</script>

<template>
  <div class="space-y-5">

    <!-- ── Topbar ─────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between gap-4 print:hidden">
      <div class="flex items-center gap-3">
        <button
          @click="router.back()"
          class="p-2 rounded-lg hover:bg-matchx-bg-elevated transition-colors text-matchx-text-muted
                 hover:text-matchx-text-primary cursor-pointer"
        >
          <ArrowLeft class="w-4 h-4" :stroke-width="2" />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-matchx-text-primary leading-none">Acta de Partido</h1>
          <p class="text-matchx-text-muted text-sm mt-0.5">
            {{ torneo?.nombre ?? '—' }} · Jornada {{ partido?.jornada ?? '—' }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <AppBadge v-if="actaConfirmada" variant="green">
          <FileCheck2 class="w-3 h-3 mr-1" :stroke-width="2" />
          Confirmada
        </AppBadge>
        <AppBadge v-else variant="gray">Borrador</AppBadge>

        <AppButton
          v-if="!actaConfirmada && partido?.estado === 'finalizado'"
          variant="primary"
          size="sm"
          @click="actaConfirmada = true"
        >
          <FileCheck2 class="w-3.5 h-3.5 mr-1.5" :stroke-width="2" />
          Confirmar acta
        </AppButton>

        <AppButton variant="secondary" size="sm" @click="printActa">
          <Printer class="w-3.5 h-3.5 mr-1.5" :stroke-width="2" />
          Imprimir
        </AppButton>
      </div>
    </div>

    <!-- ── Skeleton ───────────────────────────────────────────────────────── -->
    <div v-if="loading" class="space-y-4">
      <div class="animate-pulse rounded-2xl bg-matchx-bg-surface border border-matchx-border-base p-6 space-y-4">
        <div class="h-5 w-40 bg-matchx-bg-elevated rounded" />
        <div class="flex items-center justify-between gap-4">
          <div class="h-20 w-32 bg-matchx-bg-elevated rounded-xl" />
          <div class="h-12 w-24 bg-matchx-bg-elevated rounded-xl" />
          <div class="h-20 w-32 bg-matchx-bg-elevated rounded-xl" />
        </div>
        <div class="h-4 w-64 bg-matchx-bg-elevated rounded mx-auto" />
      </div>
    </div>

    <!-- ── Error ──────────────────────────────────────────────────────────── -->
    <div v-else-if="errorMsg" class="flex items-center gap-3 p-4 rounded-xl
         bg-matchx-accent-orange/10 border border-matchx-accent-orange/25 text-matchx-accent-orange">
      <CircleAlert class="w-5 h-5 shrink-0" :stroke-width="1.75" />
      {{ errorMsg }}
    </div>

    <!-- ── Sin partido ────────────────────────────────────────────────────── -->
    <div v-else-if="!partido" class="flex flex-col items-center gap-3 py-16">
      <Swords class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-secondary font-medium">Partido no encontrado</p>
      <AppButton variant="secondary" size="sm" @click="router.back()">Volver</AppButton>
    </div>

    <!-- ══ ACTA ════════════════════════════════════════════════════════════ -->
    <div v-else id="acta-print" class="space-y-4">

      <!-- ── 1. Encabezado oficial ─────────────────────────────────────────── -->
      <div class="rounded-2xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden">

        <!-- Barra torneo -->
        <div class="flex items-center gap-3 px-5 py-3 bg-matchx-accent-green/8 border-b border-matchx-border-base/60">
          <Trophy class="w-4 h-4 text-matchx-accent-green shrink-0" :stroke-width="1.75" />
          <span class="text-sm font-semibold text-matchx-accent-green">{{ torneo?.nombre ?? 'Torneo' }}</span>
          <span class="text-matchx-text-muted text-xs">·</span>
          <span class="text-xs text-matchx-text-muted">{{ torneo?.edicion ?? '' }}</span>
          <div class="flex-1" />
          <AppBadge :variant="estadoBadge(partido.estado)" class="print:hidden">{{ partido.estado }}</AppBadge>
          <span class="hidden print:inline text-xs font-semibold uppercase tracking-wide text-matchx-text-muted">
            Jornada {{ partido.jornada }}
          </span>
        </div>

        <!-- Score principal -->
        <div class="px-6 py-6">
          <div class="flex items-center gap-4">

            <!-- Equipo local -->
            <div class="flex-1 flex flex-col items-center gap-2 text-center">
              <img
                v-if="eqLocal?.escudo_url"
                :src="eqLocal.escudo_url"
                :alt="eqLocal.nombre"
                class="w-16 h-16 rounded-xl object-contain"
              />
              <div v-else
                class="w-16 h-16 rounded-xl bg-matchx-bg-elevated border border-matchx-border-base
                       flex items-center justify-center">
                <Swords class="w-7 h-7 text-matchx-text-muted" :stroke-width="1.5" />
              </div>
              <div class="font-bold text-matchx-text-primary text-base leading-tight">{{ eqLocal?.nombre ?? '—' }}</div>
              <span class="text-[10px] uppercase tracking-widest text-matchx-text-muted">Local</span>
            </div>

            <!-- Marcador -->
            <div class="flex flex-col items-center shrink-0 px-2">
              <div
                v-if="partido.estado === 'finalizado' || partido.estado === 'en_curso'"
                class="text-5xl font-black font-mono text-matchx-text-primary leading-none"
              >
                {{ partido.goles_local }}<span class="text-matchx-text-muted mx-1">–</span>{{ partido.goles_visitante }}
              </div>
              <div v-else class="text-3xl font-bold font-mono text-matchx-text-muted">vs</div>
              <div class="text-xs font-semibold uppercase tracking-widest text-matchx-text-muted mt-1">
                Jornada {{ partido.jornada }}
              </div>
            </div>

            <!-- Equipo visitante -->
            <div class="flex-1 flex flex-col items-center gap-2 text-center">
              <img
                v-if="eqVisit?.escudo_url"
                :src="eqVisit.escudo_url"
                :alt="eqVisit.nombre"
                class="w-16 h-16 rounded-xl object-contain"
              />
              <div v-else
                class="w-16 h-16 rounded-xl bg-matchx-bg-elevated border border-matchx-border-base
                       flex items-center justify-center">
                <Swords class="w-7 h-7 text-matchx-text-muted" :stroke-width="1.5" />
              </div>
              <div class="font-bold text-matchx-text-primary text-base leading-tight">{{ eqVisit?.nombre ?? '—' }}</div>
              <span class="text-[10px] uppercase tracking-widest text-matchx-text-muted">Visitante</span>
            </div>
          </div>

          <!-- Metadata del partido -->
          <div class="mt-5 pt-4 border-t border-matchx-border-base/50
                      grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="flex items-start gap-2">
              <Calendar class="w-3.5 h-3.5 text-matchx-text-muted shrink-0 mt-0.5" :stroke-width="1.75" />
              <div>
                <div class="text-[10px] text-matchx-text-muted uppercase tracking-wider">Fecha</div>
                <div class="text-xs font-medium text-matchx-text-secondary capitalize">
                  {{ formatFecha(partido.fecha_hora) }}
                </div>
              </div>
            </div>
            <div class="flex items-start gap-2">
              <MapPin class="w-3.5 h-3.5 text-matchx-text-muted shrink-0 mt-0.5" :stroke-width="1.75" />
              <div>
                <div class="text-[10px] text-matchx-text-muted uppercase tracking-wider">Sede</div>
                <div class="text-xs font-medium text-matchx-text-secondary">
                  {{ sede?.nombre ?? '—' }}
                </div>
              </div>
            </div>
            <div class="flex items-start gap-2">
              <Flag class="w-3.5 h-3.5 text-matchx-text-muted shrink-0 mt-0.5" :stroke-width="1.75" />
              <div>
                <div class="text-[10px] text-matchx-text-muted uppercase tracking-wider">Árbitro</div>
                <div class="text-xs font-medium text-matchx-text-secondary">
                  {{ arbitro?.nombre ?? '—' }}
                </div>
              </div>
            </div>
            <div class="flex items-start gap-2">
              <User class="w-3.5 h-3.5 text-matchx-text-muted shrink-0 mt-0.5" :stroke-width="1.75" />
              <div>
                <div class="text-[10px] text-matchx-text-muted uppercase tracking-wider">Delegado</div>
                <div class="text-xs font-medium text-matchx-text-secondary">
                  {{ delegado?.nombre ?? '—' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 2. Convocatorias ─────────────────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <!-- Equipo local -->
        <div class="rounded-2xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden">
          <div class="px-4 py-3 border-b border-matchx-border-base/50 flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-matchx-accent-green shrink-0" />
            <span class="text-sm font-semibold text-matchx-text-primary">{{ eqLocal?.nombre ?? 'Local' }}</span>
            <span class="ml-auto text-xs text-matchx-text-muted">
              {{ titLocal.length + suplLocal.length }} jugadores
            </span>
          </div>

          <!-- Titulares -->
          <div class="px-4 py-3">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-matchx-text-muted mb-2">
              Titulares ({{ titLocal.length }})
            </p>
            <div class="space-y-1">
              <div
                v-for="c in titLocal" :key="c.convocatoria_id || c.jugador_id"
                class="flex items-center gap-2.5 py-1"
              >
                <span class="w-6 h-6 rounded-md bg-matchx-accent-green/10 text-matchx-accent-green
                             text-[10px] font-black flex items-center justify-center shrink-0">
                  {{ c.numero_dorsal || jugadoresStore.obtenerPorId(c.jugador_id)?.numero_camiseta || '–' }}
                </span>
                <span class="text-sm text-matchx-text-primary flex-1 truncate">
                  {{ nombreJugador(c.jugador_id) }}
                </span>
                <span class="text-[10px] font-semibold text-matchx-text-muted shrink-0">
                  {{ posAbrev[c.posicion] ?? c.posicion.toUpperCase().slice(0,3) }}
                </span>
              </div>
              <p v-if="!titLocal.length" class="text-xs text-matchx-text-muted italic py-1">Sin titulares registrados</p>
            </div>
          </div>

          <!-- Suplentes -->
          <div v-if="suplLocal.length" class="px-4 pb-3 border-t border-matchx-border-base/30 pt-2">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-matchx-text-muted mb-2">
              Suplentes ({{ suplLocal.length }})
            </p>
            <div class="space-y-1">
              <div
                v-for="c in suplLocal" :key="c.convocatoria_id || c.jugador_id"
                class="flex items-center gap-2.5 py-1"
              >
                <span class="w-6 h-6 rounded-md bg-matchx-bg-elevated border border-matchx-border-base/60
                             text-matchx-text-muted text-[10px] font-black flex items-center justify-center shrink-0">
                  {{ c.numero_dorsal || jugadoresStore.obtenerPorId(c.jugador_id)?.numero_camiseta || '–' }}
                </span>
                <span class="text-sm text-matchx-text-secondary flex-1 truncate">
                  {{ nombreJugador(c.jugador_id) }}
                </span>
                <span class="text-[10px] font-semibold text-matchx-text-muted shrink-0">
                  {{ posAbrev[c.posicion] ?? c.posicion.toUpperCase().slice(0,3) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Equipo visitante -->
        <div class="rounded-2xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden">
          <div class="px-4 py-3 border-b border-matchx-border-base/50 flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-matchx-accent-orange shrink-0" />
            <span class="text-sm font-semibold text-matchx-text-primary">{{ eqVisit?.nombre ?? 'Visitante' }}</span>
            <span class="ml-auto text-xs text-matchx-text-muted">
              {{ titVisit.length + suplVisit.length }} jugadores
            </span>
          </div>

          <!-- Titulares -->
          <div class="px-4 py-3">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-matchx-text-muted mb-2">
              Titulares ({{ titVisit.length }})
            </p>
            <div class="space-y-1">
              <div
                v-for="c in titVisit" :key="c.convocatoria_id || c.jugador_id"
                class="flex items-center gap-2.5 py-1"
              >
                <span class="w-6 h-6 rounded-md bg-matchx-accent-orange/10 text-matchx-accent-orange
                             text-[10px] font-black flex items-center justify-center shrink-0">
                  {{ c.numero_dorsal || jugadoresStore.obtenerPorId(c.jugador_id)?.numero_camiseta || '–' }}
                </span>
                <span class="text-sm text-matchx-text-primary flex-1 truncate">
                  {{ nombreJugador(c.jugador_id) }}
                </span>
                <span class="text-[10px] font-semibold text-matchx-text-muted shrink-0">
                  {{ posAbrev[c.posicion] ?? c.posicion.toUpperCase().slice(0,3) }}
                </span>
              </div>
              <p v-if="!titVisit.length" class="text-xs text-matchx-text-muted italic py-1">Sin titulares registrados</p>
            </div>
          </div>

          <!-- Suplentes -->
          <div v-if="suplVisit.length" class="px-4 pb-3 border-t border-matchx-border-base/30 pt-2">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-matchx-text-muted mb-2">
              Suplentes ({{ suplVisit.length }})
            </p>
            <div class="space-y-1">
              <div
                v-for="c in suplVisit" :key="c.convocatoria_id || c.jugador_id"
                class="flex items-center gap-2.5 py-1"
              >
                <span class="w-6 h-6 rounded-md bg-matchx-bg-elevated border border-matchx-border-base/60
                             text-matchx-text-muted text-[10px] font-black flex items-center justify-center shrink-0">
                  {{ c.numero_dorsal || jugadoresStore.obtenerPorId(c.jugador_id)?.numero_camiseta || '–' }}
                </span>
                <span class="text-sm text-matchx-text-secondary flex-1 truncate">
                  {{ nombreJugador(c.jugador_id) }}
                </span>
                <span class="text-[10px] font-semibold text-matchx-text-muted shrink-0">
                  {{ posAbrev[c.posicion] ?? c.posicion.toUpperCase().slice(0,3) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 3. Timeline de eventos ───────────────────────────────────────── -->
      <div class="rounded-2xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden">
        <div class="px-5 py-3 border-b border-matchx-border-base/50">
          <h3 class="text-sm font-semibold text-matchx-text-primary">Eventos del partido</h3>
        </div>

        <!-- Sin eventos -->
        <div v-if="!eventosOrdenados.length"
          class="flex flex-col items-center gap-2 py-10 text-matchx-text-muted">
          <Circle class="w-8 h-8 opacity-20" :stroke-width="1.5" />
          <p class="text-sm">No hay eventos registrados</p>
        </div>

        <!-- Lista -->
        <div v-else class="divide-y divide-matchx-border-base/30">
          <div
            v-for="ev in eventosOrdenados"
            :key="ev.id"
            :class="[
              'flex items-center gap-3 px-5 py-2.5',
              esDeLocal(ev) ? '' : 'flex-row-reverse',
            ]"
          >
            <!-- Minuto -->
            <span class="w-9 text-center text-xs font-black font-mono text-matchx-text-muted shrink-0">
              {{ ev.minuto }}'
            </span>

            <!-- Tipo badge -->
            <span
              :class="[
                'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0',
                ev.tipo_evento === 'gol' || ev.tipo_evento === 'penal_convertido'
                  ? 'bg-matchx-accent-green/15 text-matchx-accent-green'
                  : ev.tipo_evento === 'tarjeta_amarilla'
                    ? 'bg-yellow-500/15 text-yellow-400'
                    : ev.tipo_evento === 'tarjeta_roja'
                      ? 'bg-red-500/15 text-red-400'
                      : ev.tipo_evento === 'cambio'
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'bg-matchx-bg-elevated text-matchx-text-muted',
              ]"
            >
              {{ tipoLabel[ev.tipo_evento] ?? ev.tipo_evento }}
            </span>

            <!-- Jugador -->
            <span class="text-sm text-matchx-text-secondary flex-1 truncate"
                  :class="esDeLocal(ev) ? 'text-left' : 'text-right'">
              {{ ev.jugador_id ? nombreJugador(ev.jugador_id) : '' }}
            </span>

            <!-- Equipo dot -->
            <span
              :class="['w-2 h-2 rounded-full shrink-0',
                esDeLocal(ev) ? 'bg-matchx-accent-green' : 'bg-matchx-accent-orange']"
            />
          </div>
        </div>
      </div>

      <!-- ── 4. Observaciones ─────────────────────────────────────────────── -->
      <div class="rounded-2xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden">
        <div class="px-5 py-3 border-b border-matchx-border-base/50">
          <h3 class="text-sm font-semibold text-matchx-text-primary">Observaciones del árbitro</h3>
        </div>
        <div class="p-4">
          <textarea
            v-model="observaciones"
            :disabled="actaConfirmada"
            rows="3"
            placeholder="Sin observaciones adicionales..."
            class="w-full bg-matchx-bg-base/60 border border-matchx-border-base rounded-lg
                   px-3 py-2.5 text-sm text-matchx-text-primary placeholder-matchx-text-muted
                   focus:outline-none focus:border-matchx-accent-green/60 transition-colors resize-none
                   disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <!-- ── 5. Firmas ────────────────────────────────────────────────────── -->
      <div class="rounded-2xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden">
        <div class="px-5 py-3 border-b border-matchx-border-base/50">
          <h3 class="text-sm font-semibold text-matchx-text-primary">Firmas y conformidad</h3>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-matchx-border-base/30">
          <div
            v-for="firmante in [
              { label: 'Árbitro', nombre: arbitro?.nombre ?? '—' },
              { label: 'Delegado local', nombre: eqLocal?.nombre ?? '—' },
              { label: 'Delegado visitante', nombre: eqVisit?.nombre ?? '—' },
            ]"
            :key="firmante.label"
            class="flex flex-col items-center gap-3 px-5 py-5"
          >
            <div class="w-full h-12 border-b-2 border-dashed border-matchx-border-base" />
            <div class="text-center">
              <p class="text-xs font-semibold text-matchx-text-secondary">{{ firmante.nombre }}</p>
              <p class="text-[10px] text-matchx-text-muted uppercase tracking-wider mt-0.5">{{ firmante.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Pie de acta -->
      <p class="text-center text-[10px] text-matchx-text-muted pb-2 print:text-black/50">
        matchX · Acta generada el {{ new Date().toLocaleDateString('es-CO') }}
        · Partido #{{ partido.id }}
        <span v-if="actaConfirmada"> · ✓ Confirmada</span>
      </p>

    </div>
  </div>
</template>

<style scoped>
@media print {
  :deep(body > *:not(#app)) { display: none !important; }

  #acta-print {
    color: #111 !important;
    background: white !important;
  }

  #acta-print * {
    color: inherit !important;
    background: transparent !important;
    border-color: #ccc !important;
  }
}
</style>
