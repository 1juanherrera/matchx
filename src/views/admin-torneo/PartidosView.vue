<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePartidosStore, type Partido, type EstadoPartido } from '@/stores/partidos'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore } from '@/stores/equipos'
import { useSedesStore } from '@/stores/sedes'
import { useAuthStore } from '@/stores/auth'
import { useUsuariosStore } from '@/stores/usuarios'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { CalendarPlus, Trash2, Pencil, Swords, XCircle, CalendarClock, UserRoundCog, Wand2, ChevronRight, ChevronLeft, Check, Loader2, ScrollText } from 'lucide-vue-next'
import { useArbitrosDisponibilidad } from '@/composables/useArbitrosDisponibilidad'

const partidosStore = usePartidosStore()
const torneosStore = useTorneosStore()
const equiposStore = useEquiposStore()
const sedesStore = useSedesStore()
const authStore = useAuthStore()
const usuariosStore = useUsuariosStore()

// admin_torneo solo gestiona su propio torneo
const miTorneoId = computed(() => authStore.user?.torneo_id ?? null)

const selectedTorneoId = ref<number | null>(null)
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)

const formData = ref({
  torneo_id: null as number | null,
  equipo_local_id: 0,
  equipo_visitante_id: 0,
  sede_id: 0,
  cancha_id: 0,
  jornada: 1,
  fecha_hora: '',
  estado: 'programado' as EstadoPartido,
  goles_local: 0,
  goles_visitante: 0,
  delegado_id: 4,
  arbitro_id: 5,
})

onMounted(async () => {
  await Promise.all([
    partidosStore.fetchPartidos(),
    torneosStore.fetchTorneos(),
    equiposStore.fetchEquipos(),
    sedesStore.fetchSedes(),
    usuariosStore.fetchUsuarios(),
  ])
  // Fijar al propio torneo si es admin_torneo
  if (miTorneoId.value) {
    selectedTorneoId.value = miTorneoId.value
  } else if (torneosStore.torneos.length > 0) {
    selectedTorneoId.value = torneosStore.torneos[0].id
  }
})

// Selector de torneo en la lista (para filtrar partidos por jornada)
const torneoOptions = computed(() => {
  const lista = miTorneoId.value
    ? torneosStore.torneos.filter(t => t.id === miTorneoId.value)
    : torneosStore.torneos
  return lista.map(t => ({ value: t.id, label: t.nombre }))
})

// Selector de torneo en el modal (incluye opción "Sin torneo")
const torneoModalOptions = computed(() => [
  { value: null, label: 'Sin torneo' },
  ...torneoOptions.value,
])

// Si hay torneo en form, filtra equipos de ese torneo; si no, todos los equipos
const equipoOptions = computed(() => {
  const lista = formData.value.torneo_id
    ? equiposStore.equiposPorTorneo(formData.value.torneo_id)
    : equiposStore.equipos
  return lista.map(e => ({ value: e.id, label: e.nombre }))
})

const sedesOptions = computed(() =>
  sedesStore.sedesActivas.map(s => ({ value: s.id, label: s.nombre })),
)

const canchaDisponible = (canchaId: number): boolean => {
  if (!formData.value.fecha_hora) return true
  const t = new Date(formData.value.fecha_hora).getTime()
  return !partidosStore.partidos.some(p =>
    p.cancha_id === canchaId &&
    p.id !== editingId.value &&
    Math.abs(new Date(p.fecha_hora).getTime() - t) < 2 * 60 * 60 * 1000,
  )
}

const canchasOptions = computed(() => {
  const sede = sedesStore.obtenerPorId(formData.value.sede_id)
  if (!sede) return []
  return sede.canchas.map(c => ({
    value: c.id,
    label: canchaDisponible(c.id) ? c.nombre : `${c.nombre} — Ocupada`,
  }))
})

const estadoOptions = [
  { value: 'programado', label: 'Programado' },
  { value: 'en_curso',   label: 'En Curso' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'suspendido', label: 'Suspendido' },
  { value: 'aplazado',   label: 'Aplazado' },
]

const estadoBadge = (estado: string): 'green' | 'orange' | 'gray' | 'blue' => {
  const map: Record<string, 'green' | 'orange' | 'gray' | 'blue'> = {
    en_curso: 'green', programado: 'blue', finalizado: 'gray', suspendido: 'orange', aplazado: 'orange',
  }
  return map[estado] ?? 'gray'
}

// Para el modal de reasignación rápida
const { arbitrosConDisponibilidad } = useArbitrosDisponibilidad(
  () => reasignTarget.value?.fecha_hora ?? null,
  () => reasignTarget.value?.id ?? null,
)

// Para el modal de edición general
const { arbitrosConDisponibilidad: arbitrosEdicion } = useArbitrosDisponibilidad(
  () => formData.value.fecha_hora ?? null,
  () => editingId.value ?? null,
)

const formatFechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

const nombreEquipo = (id: number) => equiposStore.obtenerPorId(id)?.nombre ?? `Equipo ${id}`
const escudoEquipo = (id: number) => equiposStore.obtenerPorId(id)?.escudo_url ?? null

const partidosDelTorneo = computed(() =>
  selectedTorneoId.value !== null
    ? partidosStore.partidosPorTorneo(selectedTorneoId.value)
        .sort((a, b) => a.jornada - b.jornada || new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
    : [],
)

const jornadasUnicas = computed(() =>
  [...new Set(partidosDelTorneo.value.map(p => p.jornada))].sort((a, b) => a - b),
)

const openNew = () => {
  isEditing.value = false
  editingId.value = null
  formData.value = {
    torneo_id: miTorneoId.value ?? selectedTorneoId.value ?? null,
    equipo_local_id: 0,
    equipo_visitante_id: 0,
    sede_id: sedesStore.sedesActivas[0]?.id ?? 0,
    cancha_id: 0,
    jornada: 1,
    fecha_hora: '',
    estado: 'programado',
    goles_local: 0,
    goles_visitante: 0,
    delegado_id: 4,
    arbitro_id: 5,
  }
  showModal.value = true
}

const openEdit = (partido: Partido) => {
  isEditing.value = true
  editingId.value = partido.id
  Object.assign(formData.value, { ...partido })
  showModal.value = true
}

const sameTeamError = computed(() =>
  formData.value.equipo_local_id !== 0 &&
  formData.value.equipo_visitante_id !== 0 &&
  formData.value.equipo_local_id === formData.value.equipo_visitante_id,
)

const savePartido = () => {
  if (!formData.value.fecha_hora) return
  if (formData.value.torneo_id && (!formData.value.equipo_local_id || !formData.value.equipo_visitante_id)) return
  if (sameTeamError.value) return

  if (isEditing.value && editingId.value !== null) {
    partidosStore.actualizarPartido(editingId.value, { ...formData.value })
  } else {
    partidosStore.crearPartido({ ...formData.value })
  }
  showModal.value = false
}

const deletePartido = (id: number) => {
  if (confirm('¿Eliminar este partido?')) partidosStore.eliminarPartido(id)
}

// ── Modal: Reasignar árbitro ───────────────────────────────────────────────
const showReasignModal = ref(false)
const reasignTarget    = ref<Partido | null>(null)
const reasignMode      = ref<'ahora' | 'despues'>('ahora')
const reasignArbitroId = ref<number>(0)
const reasignLoading   = ref(false)
const reasignError     = ref('')
const reasignSuccess   = ref(false)

const openReasignModal = (partido: Partido) => {
  reasignTarget.value    = partido
  reasignMode.value      = 'ahora'
  reasignArbitroId.value = partido.arbitro_id ?? 0
  reasignError.value     = ''
  reasignSuccess.value   = false
  showReasignModal.value = true
}

const confirmarReasignacion = async () => {
  if (!reasignTarget.value) return
  reasignError.value   = ''
  reasignLoading.value = true
  try {
    if (reasignMode.value === 'ahora') {
      if (!reasignArbitroId.value) { reasignError.value = 'Selecciona un árbitro'; return }
      await partidosStore.actualizarPartido(reasignTarget.value.id, { arbitro_id: reasignArbitroId.value })
    }
    // 'despues': no se modifica el partido, solo se cierra el modal
    reasignSuccess.value = true
  } catch (err: any) {
    reasignError.value = err.response?.data?.message ?? 'Error al reasignar el árbitro'
  } finally {
    reasignLoading.value = false
  }
}

// ── Modal: Suspender partido ──────────────────────────────────────────────
const showSuspenderModal  = ref(false)
const suspenderTarget     = ref<Partido | null>(null)
const suspenderMode       = ref<'con_fecha' | 'sin_fecha'>('sin_fecha')
const suspenderNuevaFecha = ref('')
const suspenderLoading    = ref(false)
const suspenderError      = ref('')
const suspenderSuccess    = ref(false)

const openSuspenderModal = (partido: Partido) => {
  suspenderTarget.value     = partido
  suspenderMode.value       = 'sin_fecha'
  suspenderNuevaFecha.value = ''
  suspenderError.value      = ''
  suspenderSuccess.value    = false
  showSuspenderModal.value  = true
}

const confirmarSuspension = async () => {
  if (!suspenderTarget.value) return
  suspenderError.value   = ''
  suspenderLoading.value = true
  try {
    if (suspenderMode.value === 'con_fecha') {
      if (!suspenderNuevaFecha.value) { suspenderError.value = 'Selecciona la nueva fecha'; suspenderLoading.value = false; return }
      await partidosStore.actualizarPartido(suspenderTarget.value.id, {
        estado: 'aplazado',
        fecha_hora: suspenderNuevaFecha.value,
      })
    } else {
      await partidosStore.cancelarPartido(suspenderTarget.value.id)
    }
    suspenderSuccess.value = true
  } catch (err: any) {
    suspenderError.value = err.response?.data?.message ?? 'Error al suspender el partido'
  } finally {
    suspenderLoading.value = false
  }
}

// ── Generador automático de fixture ──────────────────────────────────────────
type FixtureStep = 'config' | 'preview' | 'progress'

/** Franja horaria: slot de día/hora/sede/cancha para distribuir partidos */
interface Franja {
  diasOffset: number  // 0 = mismo día inicio jornada, 1 = +1 día, etc.
  hora:       string  // 'HH:MM'
  sede_id:    number  // 0 = usar sede por defecto
  cancha_id:  number  // 0 = sin cancha asignada
}

/** Partido generado — editables en la preview antes de confirmar */
interface PartidoPreview {
  jornada:             number
  equipo_local_id:     number
  equipo_visitante_id: number
  fecha:               string   // 'YYYY-MM-DD' — editable
  hora:                string   // 'HH:MM'      — editable
  sede_id:             number   //               — editable
  cancha_id:           number   //               — editable
}

const showFixtureModal = ref(false)
const fixtureStep      = ref<FixtureStep>('config')
const fixtureConfig    = ref({
  vueltas:           1 as 1 | 2,
  fechaInicio:       '',
  diasEntreJornadas: 7,
  sede_id:           0,           // sede por defecto (fallback)
  franjas:           [{ diasOffset: 0, hora: '15:00', sede_id: 0, cancha_id: 0 }] as Franja[],
})
const fixturePreview = ref<PartidoPreview[]>([])
const fixtureCreados = ref(0)
const fixtureTotal   = ref(0)
const fixtureDone    = ref(false)
const fixtureError   = ref('')

const equiposDelTorneo = computed(() =>
  selectedTorneoId.value ? equiposStore.equiposPorTorneo(selectedTorneoId.value) : [],
)

/** Algoritmo de círculo / Berger para round-robin */
function roundRobin(ids: number[]): [number, number][][] {
  const ts  = ids.length % 2 === 0 ? [...ids] : [...ids, -1]
  const N   = ts.length
  const out: [number, number][][] = []
  for (let r = 0; r < N - 1; r++) {
    const ronda: [number, number][] = []
    for (let i = 0; i < N / 2; i++) {
      const a = ts[i], b = ts[N - 1 - i]
      if (a !== -1 && b !== -1) ronda.push([a, b])
    }
    out.push(ronda)
    const last = ts[N - 1]
    for (let i = N - 1; i > 1; i--) ts[i] = ts[i - 1]
    ts[1] = last
  }
  return out
}

const fixtureInfo = computed(() => {
  const n = equiposDelTorneo.value.length
  if (n < 2) return null
  const jornadasVuelta  = n % 2 === 0 ? n - 1 : n
  const partidosJornada = Math.floor(n / 2)
  const totalJornadas   = jornadasVuelta * fixtureConfig.value.vueltas
  const totalPartidos   = partidosJornada * totalJornadas
  return { n, jornadasVuelta, partidosJornada, totalJornadas, totalPartidos }
})

const configValida = computed(() =>
  !!fixtureConfig.value.fechaInicio && (fixtureInfo.value?.n ?? 0) >= 2,
)

// Franjas: agregar / quitar
function addFranja() {
  const last = fixtureConfig.value.franjas.at(-1)
  const nextOffset = Math.min((last?.diasOffset ?? 0) + 1, 6)
  fixtureConfig.value.franjas.push({ diasOffset: nextOffset, hora: last?.hora ?? '15:00', sede_id: last?.sede_id ?? 0, cancha_id: 0 })
}

/** Canchas disponibles para una sede dada (0 = sin opciones) */
const canchasDeSede = (sedeId: number) => {
  if (!sedeId) return []
  return sedesStore.obtenerPorId(sedeId)?.canchas.filter(c => c.disponible) ?? []
}

/** Al cambiar sede en una franja, resetear cancha */
function onFranjaSedeChange(franja: Franja) {
  franja.cancha_id = 0
}

/** Al cambiar sede en un partido del preview, resetear cancha */
function onPreviewSedeChange(m: PartidoPreview) {
  m.cancha_id = 0
}
function removeFranja(i: number) {
  if (fixtureConfig.value.franjas.length > 1) fixtureConfig.value.franjas.splice(i, 1)
}

function generarPreview() {
  const ids     = equiposDelTorneo.value.map(e => e.id)
  const rondas  = roundRobin(ids)
  const franjas = fixtureConfig.value.franjas
  const items: PartidoPreview[] = []

  const addVuelta = (vuelta: number, jorOffset: number) => {
    rondas.forEach((ronda, idx) => {
      const jornada   = idx + 1 + jorOffset
      // Fecha base de inicio de esta jornada
      const baseMs    = new Date(fixtureConfig.value.fechaInicio + 'T00:00').getTime()
      const jornadaMs = baseMs + (idx + jorOffset) * fixtureConfig.value.diasEntreJornadas * 86_400_000

      ronda.forEach(([a, b], mi) => {
        // Distribuir en franjas cíclicamente
        const franja    = franjas[mi % franjas.length]
        const sede_id   = franja.sede_id || fixtureConfig.value.sede_id || sedesStore.sedesActivas[0]?.id || 0
        const cancha_id = franja.cancha_id || 0
        // La fecha de cada match = fecha inicio jornada + diasOffset de la franja
        const fecha     = new Date(jornadaMs + (franja.diasOffset ?? 0) * 86_400_000).toISOString().slice(0, 10)
        items.push({
          jornada,
          equipo_local_id:     vuelta === 1 ? a : b,
          equipo_visitante_id: vuelta === 1 ? b : a,
          fecha,
          hora:     franja.hora,
          sede_id,
          cancha_id,
        })
      })
    })
  }

  addVuelta(1, 0)
  if (fixtureConfig.value.vueltas === 2) addVuelta(2, rondas.length)

  fixturePreview.value = items
  fixtureStep.value    = 'preview'
}

const jornadasPreview = computed(() => {
  const map = new Map<number, { jornada: number; matches: PartidoPreview[] }>()
  for (const p of fixturePreview.value) {
    if (!map.has(p.jornada)) map.set(p.jornada, { jornada: p.jornada, matches: [] })
    map.get(p.jornada)!.matches.push(p)
  }
  return [...map.values()].sort((a, b) => a.jornada - b.jornada)
})

async function crearFixture() {
  fixtureStep.value    = 'progress'
  fixtureCreados.value = 0
  fixtureTotal.value   = fixturePreview.value.length
  fixtureDone.value    = false
  fixtureError.value   = ''

  const base = {
    torneo_id:       selectedTorneoId.value,
    cancha_id:       0,
    estado:          'programado' as const,
    goles_local:     0,
    goles_visitante: 0,
    delegado_id:     0,
    arbitro_id:      0,
  }

  for (const p of fixturePreview.value) {
    try {
      await partidosStore.crearPartido({
        ...base,
        jornada:             p.jornada,
        equipo_local_id:     p.equipo_local_id,
        equipo_visitante_id: p.equipo_visitante_id,
        fecha_hora:          `${p.fecha}T${p.hora}`,
        sede_id:             p.sede_id,
        cancha_id:           p.cancha_id,
      })
      fixtureCreados.value++
    } catch {
      fixtureError.value = `Error al crear partido de la jornada ${p.jornada}`
    }
  }
  fixtureDone.value = true
}

function openFixtureModal() {
  fixtureStep.value = 'config'
  fixtureConfig.value = {
    vueltas:           1,
    fechaInicio:       '',
    diasEntreJornadas: 7,
    sede_id:           sedesStore.sedesActivas[0]?.id ?? 0,
    franjas:           [{ diasOffset: 0, hora: '15:00', sede_id: sedesStore.sedesActivas[0]?.id ?? 0, cancha_id: 0 }],
  }
  fixturePreview.value = []
  fixtureCreados.value = 0
  fixtureDone.value    = false
  fixtureError.value   = ''
  showFixtureModal.value = true
}

const sedeNombre = (id: number) => sedesStore.obtenerPorId(id)?.nombre ?? '—'

const fmtPreviewFecha = (iso: string) =>
  new Date(iso + 'T00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Partidos</h1>
        <p class="text-matchx-text-muted mt-1">Calendario y programación</p>
      </div>
      <div class="flex items-center gap-2">
        <AppButton variant="secondary" :disabled="!selectedTorneoId" @click="openFixtureModal">
          <Wand2 class="w-4 h-4 mr-1.5" :stroke-width="2" />
          Generar Fixture
        </AppButton>
        <AppButton variant="primary" :disabled="!selectedTorneoId" @click="openNew">
          <CalendarPlus class="w-4 h-4 mr-1.5" :stroke-width="2" />
          Programar Partido
        </AppButton>
      </div>
    </div>

    <!-- Selector torneo -->
    <AppCard :hover="false">
      <AppSelect v-model="selectedTorneoId" :options="torneoOptions" label="Torneo" />
    </AppCard>

    <!-- Skeleton loader -->
    <div v-if="partidosStore.loading" class="space-y-3">
      <AppCard v-for="i in 4" :key="i" :hover="false">
        <div class="animate-pulse flex items-center gap-4">
          <div class="flex-1 flex items-center gap-3">
            <div class="flex-1 flex items-center justify-end gap-2">
              <div class="h-4 bg-matchx-bg-elevated rounded w-24" />
              <div class="w-8 h-8 rounded-md bg-matchx-bg-elevated" />
            </div>
            <div class="px-4">
              <div class="h-6 bg-matchx-bg-elevated rounded w-12" />
            </div>
            <div class="flex-1 flex items-center gap-2">
              <div class="w-8 h-8 rounded-md bg-matchx-bg-elevated" />
              <div class="h-4 bg-matchx-bg-elevated rounded w-24" />
            </div>
          </div>
          <div class="flex gap-2 shrink-0">
            <div class="h-6 bg-matchx-bg-elevated rounded-full w-20" />
            <div class="h-8 bg-matchx-bg-elevated rounded w-8" />
            <div class="h-8 bg-matchx-bg-elevated rounded w-8" />
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Empty state -->
    <div v-else-if="partidosDelTorneo.length === 0"
         class="flex flex-col items-center gap-3 py-16">
      <CalendarPlus class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <div class="text-center">
        <p class="text-matchx-text-secondary font-medium">No hay partidos programados</p>
        <p class="text-matchx-text-muted text-sm mt-0.5">Programa el primer partido de este torneo</p>
      </div>
      <AppButton v-if="selectedTorneoId" variant="primary" size="sm" @click="openNew">
        <CalendarPlus class="w-3.5 h-3.5 mr-1" :stroke-width="2" />
        Programar Partido
      </AppButton>
    </div>

    <!-- Lista por jornada -->
    <div v-else class="space-y-1">
      <template v-for="jornada in jornadasUnicas" :key="jornada">
        <!-- Divisor de jornada -->
        <div class="flex items-center gap-3 mt-5 mb-2 first:mt-0">
          <div class="h-px flex-1 bg-matchx-border-base/50" />
          <span class="text-xs font-semibold text-matchx-text-muted uppercase tracking-wider shrink-0">
            Jornada {{ jornada }}
          </span>
          <div class="h-px flex-1 bg-matchx-border-base/50" />
        </div>

        <AppCard
          v-for="partido in partidosDelTorneo.filter(p => p.jornada === jornada)"
          :key="partido.id"
          :hover="false"
          class="mb-2"
        >
          <div class="flex items-center gap-4">
            <!-- Equipos y marcador -->
            <div class="flex-1 flex items-center gap-3">
              <!-- Equipo local -->
              <div class="text-right flex-1 flex items-center justify-end gap-2">
                <div class="font-semibold text-matchx-text-primary text-sm truncate">
                  {{ nombreEquipo(partido.equipo_local_id) }}
                </div>
                <img
                  v-if="escudoEquipo(partido.equipo_local_id)"
                  :src="escudoEquipo(partido.equipo_local_id)!"
                  :alt="nombreEquipo(partido.equipo_local_id)"
                  class="w-8 h-8 rounded-md shrink-0"
                />
                <div v-else class="w-8 h-8 rounded-md bg-matchx-bg-elevated border border-matchx-border-base flex items-center justify-center shrink-0">
                  <Swords class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.5" />
                </div>
              </div>

              <!-- Marcador / VS -->
              <div class="text-center px-2 shrink-0">
                <div
                  v-if="partido.estado === 'finalizado' || partido.estado === 'en_curso'"
                  class="text-2xl font-bold font-mono text-matchx-text-primary"
                >
                  {{ partido.goles_local }} – {{ partido.goles_visitante }}
                </div>
                <div v-else class="text-lg font-bold font-mono text-matchx-text-muted">vs</div>
                <div class="text-xs text-matchx-text-muted mt-0.5 whitespace-nowrap">
                  {{ formatFechaHora(partido.fecha_hora) }}
                </div>
              </div>

              <!-- Equipo visitante -->
              <div class="text-left flex-1 flex items-center gap-2">
                <img
                  v-if="escudoEquipo(partido.equipo_visitante_id)"
                  :src="escudoEquipo(partido.equipo_visitante_id)!"
                  :alt="nombreEquipo(partido.equipo_visitante_id)"
                  class="w-8 h-8 rounded-md shrink-0"
                />
                <div v-else class="w-8 h-8 rounded-md bg-matchx-bg-elevated border border-matchx-border-base flex items-center justify-center shrink-0">
                  <Swords class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.5" />
                </div>
                <div class="font-semibold text-matchx-text-primary text-sm truncate">
                  {{ nombreEquipo(partido.equipo_visitante_id) }}
                </div>
              </div>
            </div>

            <!-- Estado y acciones -->
            <div class="flex items-center gap-2 shrink-0">
              <AppBadge :variant="estadoBadge(partido.estado)">{{ partido.estado }}</AppBadge>
              <RouterLink :to="`/torneo/partidos/${partido.id}/acta`">
                <AppButton variant="secondary" size="sm" aria-label="Ver acta" title="Ver acta">
                  <ScrollText class="w-3.5 h-3.5" :stroke-width="2" />
                </AppButton>
              </RouterLink>
              <AppButton variant="secondary" size="sm" @click="openEdit(partido)" aria-label="Editar" title="Editar partido">
                <Pencil class="w-3.5 h-3.5" :stroke-width="2" />
              </AppButton>
              <AppButton
                v-if="partido.estado === 'programado'"
                variant="secondary"
                size="sm"
                @click="openReasignModal(partido)"
                aria-label="Reasignar árbitro"
                title="Reasignar árbitro"
              >
                <UserRoundCog class="w-3.5 h-3.5" :stroke-width="2" />
              </AppButton>
              <AppButton
                v-if="partido.estado === 'programado'"
                variant="danger"
                size="sm"
                @click="openSuspenderModal(partido)"
                aria-label="Suspender partido"
                title="Suspender partido"
              >
                <XCircle class="w-3.5 h-3.5" :stroke-width="2" />
              </AppButton>
              <AppButton variant="danger" size="sm" @click="deletePartido(partido.id)" aria-label="Eliminar partido" title="Eliminar">
                <Trash2 class="w-3.5 h-3.5" :stroke-width="2" />
              </AppButton>
            </div>
          </div>
        </AppCard>
      </template>
    </div>

    <!-- Modal -->
    <AppModal
      :open="showModal"
      :title="isEditing ? 'Editar Partido' : 'Programar Partido'"
      size="lg"
      @update:open="showModal = $event"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <AppSelect v-model="formData.torneo_id" :options="torneoModalOptions" label="Torneo (opcional)" />
        </div>
        <AppSelect v-model="formData.equipo_local_id" :options="equipoOptions" label="Equipo Local" required />
        <div class="space-y-1">
          <AppSelect v-model="formData.equipo_visitante_id" :options="equipoOptions" label="Equipo Visitante" required />
          <p v-if="sameTeamError" class="text-xs text-matchx-accent-orange">
            Local y visitante no pueden ser el mismo equipo
          </p>
        </div>
        <AppInput v-model="formData.jornada" label="Jornada" type="number" />
        <AppInput
          v-model="formData.fecha_hora"
          label="Fecha y Hora"
          type="datetime-local"
          required
        />
        <AppSelect v-model="formData.sede_id" :options="sedesOptions" label="Sede" />
        <AppSelect
          v-model="formData.cancha_id"
          :options="canchasOptions"
          label="Cancha"
          :disabled="canchasOptions.length === 0"
        />
        <AppSelect v-model="formData.estado" :options="estadoOptions" label="Estado" />
        <AppSelect
          v-model="formData.arbitro_id"
          :options="arbitrosEdicion.map(a => ({
            value: a.id,
            label: `${a.nombre} — ${a.ocupado ? 'Ocupado' : 'Libre'}`,
          }))"
          label="Árbitro"
          :disabled="arbitrosEdicion.length === 0"
        />
        <div v-if="formData.estado === 'finalizado' || formData.estado === 'en_curso'" class="sm:col-span-2">
          <div class="grid grid-cols-2 gap-3">
            <AppInput v-model="formData.goles_local" label="Goles Local" type="number" />
            <AppInput v-model="formData.goles_visitante" label="Goles Visitante" type="number" />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showModal = false">Cancelar</AppButton>
          <AppButton variant="primary" @click="savePartido">
            {{ isEditing ? 'Actualizar' : 'Programar' }}
          </AppButton>
        </div>
      </template>
    </AppModal>
  </div>

  <!-- ── Modal: Reasignar árbitro ─────────────────────────────────────────── -->
  <AppModal v-model:open="showReasignModal" size="sm"
    :title="reasignSuccess ? '' : 'Reasignar árbitro'"
    :close-button="true">

    <!-- Éxito -->
    <div v-if="reasignSuccess" class="flex flex-col items-center gap-4 py-4 text-center">
      <div class="w-14 h-14 rounded-full bg-matchx-accent-green/10 flex items-center justify-center">
        <UserRoundCog class="w-7 h-7 text-matchx-accent-green" :stroke-width="1.75" />
      </div>
      <div>
        <p class="font-semibold text-matchx-text-primary">
          {{ reasignMode === 'ahora' ? 'Árbitro reasignado' : 'Anotado para reasignar' }}
        </p>
        <p class="text-sm text-matchx-text-muted mt-1">
          {{ reasignMode === 'ahora'
            ? 'El nuevo árbitro ha sido asignado al partido.'
            : 'Recuerda reasignar el árbitro antes del partido.' }}
        </p>
      </div>
    </div>

    <!-- Form -->
    <template v-else>
      <!-- Toggle modo -->
      <div class="flex rounded-lg overflow-hidden border border-matchx-border-base mb-4">
        <button
          :class="['flex-1 py-2 text-sm font-medium transition-colors',
            reasignMode === 'ahora'
              ? 'bg-matchx-accent-green/10 text-matchx-accent-green'
              : 'text-matchx-text-muted hover:text-matchx-text-primary']"
          @click="reasignMode = 'ahora'"
        >
          Reasignar ahora
        </button>
        <button
          :class="['flex-1 py-2 text-sm font-medium transition-colors border-l border-matchx-border-base',
            reasignMode === 'despues'
              ? 'bg-matchx-accent-green/10 text-matchx-accent-green'
              : 'text-matchx-text-muted hover:text-matchx-text-primary']"
          @click="reasignMode = 'despues'"
        >
          Asignar después
        </button>
      </div>

      <!-- Reasignar ahora -->
      <div v-if="reasignMode === 'ahora'" class="space-y-2">
        <p class="text-sm text-matchx-text-muted mb-2">Selecciona el árbitro disponible para este partido.</p>
        <div v-if="arbitrosConDisponibilidad.length === 0" class="text-xs text-matchx-accent-orange">
          No hay árbitros activos registrados en el sistema.
        </div>
        <div v-else class="space-y-2">
          <button
            v-for="arbitro in arbitrosConDisponibilidad"
            :key="arbitro.id"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
              reasignArbitroId === arbitro.id
                ? 'border-matchx-accent-green bg-matchx-accent-green/5'
                : 'border-matchx-border-base hover:border-matchx-accent-green/40 bg-matchx-bg-base/40',
            ]"
            @click="reasignArbitroId = arbitro.id"
          >
            <span :class="['w-2 h-2 rounded-full shrink-0', arbitro.ocupado ? 'bg-matchx-accent-orange' : 'bg-matchx-accent-green']" />
            <span class="flex-1 text-sm text-matchx-text-primary">{{ arbitro.nombre }}</span>
            <span :class="['text-xs font-medium', arbitro.ocupado ? 'text-matchx-accent-orange' : 'text-matchx-accent-green']">
              {{ arbitro.ocupado ? 'Ocupado' : 'Libre' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Asignar después -->
      <div v-else class="rounded-lg bg-matchx-bg-base/50 border border-matchx-border-base p-3">
        <p class="text-sm text-matchx-text-muted">
          El partido quedará sin árbitro asignado. Recuerda reasignarlo antes de la fecha del partido.
        </p>
      </div>

      <p v-if="reasignError" class="mt-3 text-sm text-matchx-accent-orange">{{ reasignError }}</p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="showReasignModal = false">
          {{ reasignSuccess ? 'Cerrar' : 'Cancelar' }}
        </AppButton>
        <AppButton
          v-if="!reasignSuccess"
          :loading="reasignLoading"
          @click="confirmarReasignacion"
        >
          <UserRoundCog class="w-4 h-4" :stroke-width="2" />
          {{ reasignMode === 'ahora' ? 'Reasignar' : 'Confirmar' }}
        </AppButton>
      </div>
    </template>
  </AppModal>

  <!-- ── Modal: Generador de fixture ──────────────────────────────────────── -->
  <AppModal
    v-model:open="showFixtureModal"
    size="lg"
    :title="fixtureStep === 'config' ? 'Generar fixture automático'
          : fixtureStep === 'preview' ? 'Vista previa del fixture'
          : fixtureDone ? 'Fixture creado' : 'Creando fixture…'"
    :close-button="fixtureStep !== 'progress' || fixtureDone"
  >

    <!-- ─── PASO 1: Configuración ─────────────────────────────────────────── -->
    <div v-if="fixtureStep === 'config'" class="space-y-5">

      <!-- Alerta: pocos equipos -->
      <div v-if="equiposDelTorneo.length < 2"
        class="flex items-start gap-3 p-3 rounded-lg bg-matchx-accent-orange/10
               border border-matchx-accent-orange/25 text-sm text-matchx-accent-orange">
        <Swords class="w-4 h-4 mt-0.5 shrink-0" :stroke-width="1.75" />
        <span>Este torneo necesita al menos 2 equipos inscritos para generar el fixture.</span>
      </div>

      <!-- Vueltas -->
      <div>
        <p class="text-xs font-semibold text-matchx-text-muted uppercase tracking-wider mb-2">Formato</p>
        <div class="flex gap-2">
          <button
            v-for="v in [1, 2]" :key="v"
            :class="[
              'flex-1 py-2.5 px-4 rounded-lg border text-sm font-semibold transition-colors cursor-pointer',
              fixtureConfig.vueltas === v
                ? 'bg-matchx-accent-green/10 border-matchx-accent-green/40 text-matchx-accent-green'
                : 'border-matchx-border-base text-matchx-text-secondary hover:border-matchx-accent-green/30',
            ]"
            @click="fixtureConfig.vueltas = v as 1 | 2"
          >
            {{ v === 1 ? '1 vuelta' : '2 vueltas (ida y vuelta)' }}
          </button>
        </div>
      </div>

      <!-- Fecha inicio + intervalo -->
      <div class="grid grid-cols-2 gap-4">
        <AppInput
          v-model="fixtureConfig.fechaInicio"
          label="Fecha de inicio *"
          type="date"
        />
        <AppInput
          v-model="fixtureConfig.diasEntreJornadas"
          label="Días entre jornadas"
          type="number"
        />
      </div>

      <!-- Franjas horarias -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-semibold text-matchx-text-muted uppercase tracking-wider">
            Franjas horarias por jornada
          </p>
          <button
            @click="addFranja"
            class="text-xs text-matchx-accent-green hover:text-matchx-accent-green/80
                   transition-colors cursor-pointer flex items-center gap-1"
          >
            <CalendarPlus class="w-3.5 h-3.5" :stroke-width="2" />
            Agregar franja
          </button>
        </div>
        <p class="text-xs text-matchx-text-muted mb-3">
          Los partidos de cada jornada se distribuyen entre estas franjas en orden.
          Si hay más partidos que franjas, se repite el ciclo.
        </p>

        <div class="space-y-2">
          <div
            v-for="(franja, i) in fixtureConfig.franjas"
            :key="i"
            class="flex items-end gap-2 p-3 rounded-lg bg-matchx-bg-base/40 border border-matchx-border-base/60"
          >
            <!-- Badge número -->
            <span class="w-5 h-5 rounded-full bg-matchx-accent-green/15 text-matchx-accent-green
                         text-[10px] font-black flex items-center justify-center shrink-0 mb-[3px]">
              {{ i + 1 }}
            </span>

            <!-- Grid de 4 campos iguales -->
            <div class="grid grid-cols-4 gap-2 flex-1">
              <!-- Día -->
              <div>
                <label class="text-[10px] text-matchx-text-muted uppercase tracking-wider block mb-0.5">Día</label>
                <select
                  v-model.number="franja.diasOffset"
                  class="w-full bg-matchx-bg-elevated border border-matchx-border-base rounded-md
                         px-2 py-1.5 text-xs text-matchx-text-primary
                         focus:outline-none focus:border-matchx-accent-green/60 transition-colors"
                >
                  <option :value="0">Día 1</option>
                  <option v-for="d in 6" :key="d" :value="d">Día {{ d + 1 }}</option>
                </select>
              </div>

              <!-- Hora -->
              <div>
                <label class="text-[10px] text-matchx-text-muted uppercase tracking-wider block mb-0.5">Hora</label>
                <input
                  v-model="franja.hora"
                  type="time"
                  class="w-full bg-matchx-bg-elevated border border-matchx-border-base rounded-md
                         px-2 py-1.5 text-xs text-matchx-text-primary
                         focus:outline-none focus:border-matchx-accent-green/60 transition-colors"
                />
              </div>

              <!-- Sede -->
              <div>
                <label class="text-[10px] text-matchx-text-muted uppercase tracking-wider block mb-0.5">Sede</label>
                <select
                  v-model="franja.sede_id"
                  @change="onFranjaSedeChange(franja)"
                  class="w-full bg-matchx-bg-elevated border border-matchx-border-base rounded-md
                         px-2 py-1.5 text-xs text-matchx-text-primary
                         focus:outline-none focus:border-matchx-accent-green/60 transition-colors"
                >
                  <option :value="0">— Sede —</option>
                  <option v-for="s in sedesStore.sedesActivas" :key="s.id" :value="s.id">
                    {{ s.nombre }}
                  </option>
                </select>
              </div>

              <!-- Cancha -->
              <div>
                <label class="text-[10px] text-matchx-text-muted uppercase tracking-wider block mb-0.5">Cancha</label>
                <select
                  v-model="franja.cancha_id"
                  :disabled="!franja.sede_id || canchasDeSede(franja.sede_id).length === 0"
                  class="w-full bg-matchx-bg-elevated border border-matchx-border-base rounded-md
                         px-2 py-1.5 text-xs text-matchx-text-primary
                         focus:outline-none focus:border-matchx-accent-green/60 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option :value="0">— Cancha —</option>
                  <option v-for="c in canchasDeSede(franja.sede_id)" :key="c.id" :value="c.id">
                    {{ c.nombre }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Quitar franja -->
            <button
              v-if="fixtureConfig.franjas.length > 1"
              @click="removeFranja(i)"
              class="p-1.5 rounded-md text-matchx-text-muted hover:text-matchx-accent-orange
                     hover:bg-matchx-accent-orange/10 transition-colors cursor-pointer shrink-0 mb-[3px]"
            >
              <XCircle class="w-4 h-4" :stroke-width="1.75" />
            </button>
            <div v-else class="w-7 shrink-0" />
          </div>
        </div>
      </div>

      <!-- Resumen informativo -->
      <div v-if="fixtureInfo"
        class="flex items-center gap-4 p-3.5 rounded-xl
               bg-matchx-accent-green/5 border border-matchx-accent-green/15">
        <Wand2 class="w-5 h-5 text-matchx-accent-green shrink-0" :stroke-width="1.75" />
        <div class="text-sm text-matchx-text-secondary leading-relaxed">
          <span class="font-bold text-matchx-text-primary">{{ fixtureInfo.n }} equipos</span>
          &nbsp;→&nbsp;
          <span class="font-bold text-matchx-accent-green">{{ fixtureInfo.totalJornadas }} jornadas</span>,
          <span class="font-bold text-matchx-accent-green">{{ fixtureInfo.totalPartidos }} partidos</span>
          <span class="text-matchx-text-muted"> ({{ fixtureInfo.partidosJornada }} por jornada)</span>
        </div>
      </div>

      <!-- Aviso si ya hay partidos -->
      <div v-if="partidosDelTorneo.length > 0"
        class="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/8
               border border-yellow-500/20 text-sm text-yellow-400">
        <CalendarPlus class="w-4 h-4 mt-0.5 shrink-0" :stroke-width="1.75" />
        <span>
          Este torneo ya tiene <strong>{{ partidosDelTorneo.length }} partidos</strong>.
          El fixture generado se añadirá sin eliminar los existentes.
        </span>
      </div>
    </div>

    <!-- ─── PASO 2: Vista previa ──────────────────────────────────────────── -->
    <div v-else-if="fixtureStep === 'preview'" class="space-y-4">

      <!-- Resumen pill row -->
      <div class="flex flex-wrap gap-2">
        <span class="px-3 py-1 rounded-full bg-matchx-bg-elevated border border-matchx-border-base
                     text-xs font-semibold text-matchx-text-secondary">
          {{ fixtureInfo?.n }} equipos
        </span>
        <span class="px-3 py-1 rounded-full bg-matchx-accent-green/10 border border-matchx-accent-green/20
                     text-xs font-semibold text-matchx-accent-green">
          {{ fixtureInfo?.totalJornadas }} jornadas
        </span>
        <span class="px-3 py-1 rounded-full bg-matchx-accent-green/10 border border-matchx-accent-green/20
                     text-xs font-semibold text-matchx-accent-green">
          {{ fixtureInfo?.totalPartidos }} partidos
        </span>
        <span class="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20
                     text-xs font-semibold text-blue-400">
          {{ fixtureConfig.vueltas === 1 ? '1 vuelta' : '2 vueltas' }}
        </span>
      </div>

      <!-- Lista de jornadas (scroll) -->
      <div class="max-h-[52vh] overflow-y-auto space-y-4 pr-1">
        <div v-for="bloque in jornadasPreview" :key="bloque.jornada">

          <!-- Cabecera de jornada -->
          <div class="flex items-center gap-2 sticky top-0 bg-matchx-bg-surface py-1 z-10">
            <div class="h-px flex-1 bg-matchx-border-base/50" />
            <span class="text-[10px] font-bold uppercase tracking-widest text-matchx-text-muted shrink-0">
              Jornada {{ bloque.jornada }}
            </span>
            <span class="text-[10px] text-matchx-text-muted shrink-0 capitalize">
              · desde {{ fmtPreviewFecha(bloque.matches[0].fecha) }}
            </span>
            <span class="text-[10px] text-matchx-text-muted/50 shrink-0">
              · {{ bloque.matches.length }} {{ bloque.matches.length === 1 ? 'partido' : 'partidos' }}
            </span>
            <div class="h-px flex-1 bg-matchx-border-base/50" />
          </div>

          <!-- Partidos de esta jornada — editables inline -->
          <div class="space-y-2">
            <div
              v-for="m in bloque.matches"
              :key="`${m.equipo_local_id}-${m.equipo_visitante_id}`"
              class="rounded-lg border border-matchx-border-base/50 bg-matchx-bg-base/30
                     overflow-hidden"
            >
              <!-- Fila equipos -->
              <div class="flex items-center gap-2 px-3 py-2">
                <div class="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                  <img v-if="escudoEquipo(m.equipo_local_id)"
                    :src="escudoEquipo(m.equipo_local_id)!" class="w-4 h-4 rounded shrink-0" />
                  <span class="text-sm font-semibold text-matchx-text-primary truncate">
                    {{ nombreEquipo(m.equipo_local_id) }}
                  </span>
                </div>
                <span class="text-[10px] font-mono font-bold text-matchx-text-muted shrink-0 px-1">VS</span>
                <div class="flex items-center gap-1.5 flex-1 min-w-0">
                  <img v-if="escudoEquipo(m.equipo_visitante_id)"
                    :src="escudoEquipo(m.equipo_visitante_id)!" class="w-4 h-4 rounded shrink-0" />
                  <span class="text-sm font-semibold text-matchx-text-primary truncate">
                    {{ nombreEquipo(m.equipo_visitante_id) }}
                  </span>
                </div>
              </div>

              <!-- Fila controles -->
              <div class="px-3 pb-2.5 border-t border-matchx-border-base/30 pt-2 space-y-1.5">
                <!-- Fecha + Hora -->
                <div class="flex items-center gap-2">
                  <input
                    v-model="m.fecha"
                    type="date"
                    class="flex-1 min-w-0 bg-matchx-bg-elevated border border-matchx-border-base/70 rounded-md
                           px-2 py-1 text-xs text-matchx-text-primary
                           focus:outline-none focus:border-matchx-accent-green/60 transition-colors"
                  />
                  <input
                    v-model="m.hora"
                    type="time"
                    class="w-28 shrink-0 bg-matchx-bg-elevated border border-matchx-border-base/70 rounded-md
                           px-2 py-1 text-xs text-matchx-text-primary
                           focus:outline-none focus:border-matchx-accent-green/60 transition-colors"
                  />
                </div>
                <!-- Sede + Cancha -->
                <div class="flex items-center gap-2">
                  <select
                    v-model="m.sede_id"
                    @change="onPreviewSedeChange(m)"
                    class="flex-1 min-w-0 bg-matchx-bg-elevated border border-matchx-border-base/70 rounded-md
                           px-2 py-1 text-xs text-matchx-text-primary
                           focus:outline-none focus:border-matchx-accent-green/60 transition-colors"
                  >
                    <option :value="0">Sin sede</option>
                    <option v-for="s in sedesStore.sedesActivas" :key="s.id" :value="s.id">
                      {{ s.nombre }}
                    </option>
                  </select>
                  <select
                    v-model="m.cancha_id"
                    :disabled="!m.sede_id || canchasDeSede(m.sede_id).length === 0"
                    class="flex-1 min-w-0 bg-matchx-bg-elevated border border-matchx-border-base/70 rounded-md
                           px-2 py-1 text-xs text-matchx-text-primary
                           focus:outline-none focus:border-matchx-accent-green/60 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option :value="0">Sin cancha</option>
                    <option v-for="c in canchasDeSede(m.sede_id)" :key="c.id" :value="c.id">
                      {{ c.nombre }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── PASO 3: Progreso / Éxito ─────────────────────────────────────── -->
    <div v-else class="py-4 space-y-5">

      <!-- Éxito -->
      <div v-if="fixtureDone && !fixtureError" class="flex flex-col items-center gap-4 text-center">
        <div class="w-16 h-16 rounded-full bg-matchx-accent-green/10 border border-matchx-accent-green/20
                    flex items-center justify-center">
          <Check class="w-8 h-8 text-matchx-accent-green" :stroke-width="2" />
        </div>
        <div>
          <p class="text-lg font-bold text-matchx-text-primary">¡Fixture generado!</p>
          <p class="text-sm text-matchx-text-muted mt-1">
            Se crearon <strong class="text-matchx-accent-green">{{ fixtureCreados }} partidos</strong>
            en <strong class="text-matchx-accent-green">{{ fixtureInfo?.totalJornadas }} jornadas</strong>.
          </p>
        </div>
      </div>

      <!-- Error parcial -->
      <div v-else-if="fixtureDone && fixtureError"
        class="flex flex-col items-center gap-4 text-center">
        <p class="text-sm font-medium text-matchx-text-primary">
          Creados <strong class="text-matchx-accent-green">{{ fixtureCreados }}</strong>
          de {{ fixtureTotal }} partidos.
        </p>
        <p class="text-xs text-matchx-accent-orange">{{ fixtureError }}</p>
      </div>

      <!-- En progreso -->
      <template v-else>
        <div class="flex items-center gap-3">
          <Loader2 class="w-5 h-5 text-matchx-accent-green animate-spin shrink-0" :stroke-width="2" />
          <span class="text-sm text-matchx-text-secondary">
            Creando partido <strong class="text-matchx-text-primary">{{ fixtureCreados + 1 }}</strong>
            de {{ fixtureTotal }}…
          </span>
        </div>

        <!-- Barra de progreso -->
        <div class="h-2 w-full rounded-full bg-matchx-bg-elevated overflow-hidden">
          <div
            class="h-full rounded-full bg-matchx-accent-green transition-all duration-300"
            :style="{ width: `${Math.round(fixtureCreados / fixtureTotal * 100)}%` }"
          />
        </div>
        <p class="text-xs text-matchx-text-muted text-right">
          {{ Math.round(fixtureCreados / fixtureTotal * 100) }}%
        </p>
      </template>
    </div>

    <!-- ─── Footer dinámico ───────────────────────────────────────────────── -->
    <template #footer>
      <!-- Config -->
      <div v-if="fixtureStep === 'config'" class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="showFixtureModal = false">Cancelar</AppButton>
        <AppButton
          variant="primary"
          :disabled="!configValida"
          @click="generarPreview"
        >
          Ver fixture
          <ChevronRight class="w-4 h-4 ml-1" :stroke-width="2" />
        </AppButton>
      </div>

      <!-- Preview -->
      <div v-else-if="fixtureStep === 'preview'" class="flex justify-between">
        <AppButton variant="secondary" @click="fixtureStep = 'config'">
          <ChevronLeft class="w-4 h-4 mr-1" :stroke-width="2" />
          Configurar
        </AppButton>
        <AppButton variant="primary" @click="crearFixture">
          <Wand2 class="w-4 h-4 mr-1.5" :stroke-width="2" />
          Crear {{ fixtureInfo?.totalPartidos }} partidos
        </AppButton>
      </div>

      <!-- Progress done -->
      <div v-else-if="fixtureDone" class="flex justify-end">
        <AppButton variant="primary" @click="showFixtureModal = false">
          <Check class="w-4 h-4 mr-1.5" :stroke-width="2" />
          Ver partidos
        </AppButton>
      </div>
    </template>
  </AppModal>

  <!-- ── Modal: Suspender partido ──────────────────────────────────────────── -->
  <AppModal v-model:open="showSuspenderModal" size="sm"
    :title="suspenderSuccess ? '' : 'Suspender partido'"
    :close-button="true">

    <!-- Éxito -->
    <div v-if="suspenderSuccess" class="flex flex-col items-center gap-4 py-4 text-center">
      <div class="w-14 h-14 rounded-full bg-matchx-accent-green/10 flex items-center justify-center">
        <XCircle class="w-7 h-7 text-matchx-accent-green" :stroke-width="1.75" />
      </div>
      <div>
        <p class="font-semibold text-matchx-text-primary">
          {{ suspenderMode === 'con_fecha' ? 'Partido aplazado' : 'Partido suspendido' }}
        </p>
        <p class="text-sm text-matchx-text-muted mt-1">
          {{ suspenderMode === 'con_fecha'
            ? 'El partido ha sido reprogramado a la nueva fecha.'
            : 'El partido quedó suspendido. Asigna una nueva fecha cuando esté disponible.' }}
        </p>
      </div>
    </div>

    <!-- Form -->
    <template v-else>
      <!-- Toggle modo -->
      <div class="flex rounded-lg overflow-hidden border border-matchx-border-base mb-4">
        <button
          :class="['flex-1 py-2 text-sm font-medium transition-colors',
            suspenderMode === 'sin_fecha'
              ? 'bg-matchx-accent-orange/10 text-matchx-accent-orange'
              : 'text-matchx-text-muted hover:text-matchx-text-primary']"
          @click="suspenderMode = 'sin_fecha'"
        >
          Suspender
        </button>
        <button
          :class="['flex-1 py-2 text-sm font-medium transition-colors border-l border-matchx-border-base',
            suspenderMode === 'con_fecha'
              ? 'bg-matchx-accent-green/10 text-matchx-accent-green'
              : 'text-matchx-text-muted hover:text-matchx-text-primary']"
          @click="suspenderMode = 'con_fecha'"
        >
          Aplazar con fecha
        </button>
      </div>

      <!-- Sin fecha -->
      <div v-if="suspenderMode === 'sin_fecha'" class="rounded-lg bg-matchx-bg-base/50 border border-matchx-border-base p-3">
        <p class="text-sm text-matchx-text-muted">
          El partido quedará marcado como <span class="font-semibold text-matchx-accent-orange">suspendido</span>.
          Podrás asignar una nueva fecha más adelante.
        </p>
      </div>

      <!-- Con nueva fecha -->
      <div v-else class="space-y-3">
        <p class="text-sm text-matchx-text-muted">
          El partido quedará <span class="font-semibold text-matchx-accent-green">aplazado</span> a la fecha que indiques.
        </p>
        <AppInput
          v-model="suspenderNuevaFecha"
          label="Nueva fecha y hora"
          type="datetime-local"
          required
        />
      </div>

      <p v-if="suspenderError" class="mt-3 text-sm text-matchx-accent-orange">{{ suspenderError }}</p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="showSuspenderModal = false">
          {{ suspenderSuccess ? 'Cerrar' : 'Cancelar' }}
        </AppButton>
        <AppButton
          v-if="!suspenderSuccess"
          :variant="suspenderMode === 'sin_fecha' ? 'danger' : 'primary'"
          :loading="suspenderLoading"
          @click="confirmarSuspension"
        >
          <CalendarClock v-if="suspenderMode === 'con_fecha'" class="w-4 h-4" :stroke-width="2" />
          <XCircle v-else class="w-4 h-4" :stroke-width="2" />
          {{ suspenderMode === 'con_fecha' ? 'Aplazar' : 'Suspender' }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
