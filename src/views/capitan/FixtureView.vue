<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEquiposStore } from '@/stores/equipos'
import { usePartidosStore, type Partido } from '@/stores/partidos'
import { useSedesStore } from '@/stores/sedes'
import { useJugadoresStore } from '@/stores/jugadores'
import { useAsistenciasStore, type EstadoAsistencia } from '@/stores/asistencias'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { CalendarRange, Calendar, Clock, MapPin, Swords, ChevronRight, ClipboardList, Check, X, Minus, ShieldOff } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()
const equiposStore = useEquiposStore()
const partidosStore = usePartidosStore()
const sedesStore = useSedesStore()
const jugadoresStore = useJugadoresStore()
const asistenciasStore = useAsistenciasStore()

const filtroEstado = ref<string>('todos')

const filtroOptions = [
  { value: 'todos',      label: 'Todos' },
  { value: 'programado', label: 'Próximos' },
  { value: 'finalizado', label: 'Jugados' },
]

onMounted(async () => {
  await Promise.all([
    equiposStore.fetchEquipos(),
    partidosStore.fetchPartidos(),
    sedesStore.fetchSedes(),
    jugadoresStore.fetchJugadores(),
  ])
  // Pre-cargar convocatorias de partidos finalizados
  const equipoId = auth.user?.equipo_id ?? (import.meta.env.VITE_MOCK_API === 'true' ? 1 : null)
  if (!equipoId) return
  const jugadoresIds = jugadoresStore.jugadoresPorEquipo(equipoId).map(j => j.id)
  if (!jugadoresIds.length) return
  const finalizados = partidosStore.partidos.filter(p =>
    (p.equipo_local_id === equipoId || p.equipo_visitante_id === equipoId) &&
    (p.estado === 'finalizado' || p.estado === 'suspendido'),
  )
  await Promise.all(finalizados.map(p => asistenciasStore.fetchAsistencias(p.id, jugadoresIds)))
})

// ── Modal asistencia ──────────────────────────────────────────────────────
const showAsistencia    = ref(false)
const asistenciaPartido = ref<Partido | null>(null)

const jugadoresEquipo = computed(() =>
  miEquipo.value ? jugadoresStore.jugadoresPorEquipo(miEquipo.value.id) : [],
)

const asistenciaEditable = computed(() =>
  asistenciaPartido.value?.estado === 'programado' || asistenciaPartido.value?.estado === 'en_curso',
)

const resumenAsistencia = computed(() => {
  if (!asistenciaPartido.value) return { confirmado: 0, ausente: 0, no_habilitado: 0, pendiente: 0 }
  const lista = asistenciasStore.getAsistencias(asistenciaPartido.value.id)
  const pendienteCount = jugadoresEquipo.value.length - lista.filter(a => a.estado !== 'pendiente').length
  return {
    confirmado:    lista.filter(a => a.estado === 'confirmado').length,
    ausente:       lista.filter(a => a.estado === 'ausente').length,
    no_habilitado: lista.filter(a => a.estado === 'no_habilitado').length,
    // En partido histórico, los pendientes se cuentan como ausentes
    pendiente: asistenciaEditable.value ? pendienteCount : 0,
    ausenteTotal: lista.filter(a => a.estado === 'ausente').length
      + (!asistenciaEditable.value ? pendienteCount : 0),
  }
})

const openAsistencia = async (partido: Partido, event: Event) => {
  event.stopPropagation()
  asistenciaPartido.value = partido
  showAsistencia.value    = true
  await asistenciasStore.fetchAsistencias(partido.id, jugadoresEquipo.value.map(j => j.id))
}

const setEstado = (jugadorId: number, estado: EstadoAsistencia) => {
  if (!asistenciaPartido.value || !asistenciaEditable.value) return
  asistenciasStore.actualizarEstado(asistenciaPartido.value.id, jugadorId, estado)
}

/** En partidos finalizados, pendiente equivale a ausente */
const getEstadoEfectivo = (jugadorId: number): EstadoAsistencia => {
  if (!asistenciaPartido.value) return 'pendiente'
  const estado = asistenciasStore.getEstado(asistenciaPartido.value.id, jugadorId)
  return (!asistenciaEditable.value && estado === 'pendiente') ? 'ausente' : estado
}

const estadoConfig: Record<EstadoAsistencia, { label: string; icon: any; activeClass: string }> = {
  confirmado:    { label: 'Presente',       icon: Check,     activeClass: 'bg-matchx-accent-green/15 text-matchx-accent-green border-matchx-accent-green/40' },
  ausente:       { label: 'Ausente',        icon: X,         activeClass: 'bg-matchx-accent-orange/15 text-matchx-accent-orange border-matchx-accent-orange/40' },
  no_habilitado: { label: 'No habilitado',  icon: ShieldOff, activeClass: 'bg-red-500/10 text-red-400 border-red-500/30' },
  pendiente:     { label: 'Pendiente',      icon: Minus,     activeClass: 'bg-matchx-bg-elevated text-matchx-text-secondary border-matchx-border-base' },
}

const asistenciaResumenPartido = (partidoId: number) => {
  const lista = asistenciasStore.getAsistencias(partidoId)
  if (!lista.length) return null
  const habilitados = lista.filter(a => a.estado === 'confirmado').length
  const total = jugadoresEquipo.value.length
  return { confirmados: habilitados, total }
}

const miEquipo = computed(() =>
  equiposStore.equipos.find(e =>
    (auth.user?.equipo_id != null && e.id === auth.user.equipo_id) ||
    (import.meta.env.VITE_MOCK_API === 'true' && e.id === 1)
  ) ?? null,
)

const partidosDelEquipo = computed(() => {
  if (!miEquipo.value) return []
  const id = miEquipo.value.id
  return partidosStore.partidos.filter(p =>
    p.equipo_local_id === id || p.equipo_visitante_id === id,
  )
})

const partidosFiltrados = computed(() => {
  const lista = filtroEstado.value === 'todos'
    ? partidosDelEquipo.value
    : partidosDelEquipo.value.filter(p => p.estado === filtroEstado.value)
  return [...lista].sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
})

const jornadasUnicas = computed(() =>
  [...new Set(partidosFiltrados.value.map(p => p.jornada))].sort((a, b) => a - b),
)

const nombreEquipo = (id: number) => equiposStore.obtenerPorId(id)?.nombre ?? `Equipo ${id}`
const escudoEquipo = (id: number) => equiposStore.obtenerPorId(id)?.escudo_url ?? null
const nombreSede = (id: number) => sedesStore.obtenerPorId(id)?.nombre ?? `Sede ${id}`

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

const estadoBadge = (estado: string): 'green' | 'orange' | 'gray' | 'blue' => ({
  en_curso: 'green', programado: 'blue', suspendido: 'orange',
}[estado] ?? 'gray' as any)

// Para partidos finalizados: calcula resultado relativo al equipo del jugador
const resultadoPartido = (partido: any): { label: string; variant: 'green' | 'orange' | 'gray' } => {
  if (partido.estado !== 'finalizado') return { label: partido.estado, variant: estadoBadge(partido.estado) as any }
  const miId = miEquipo.value?.id
  const esLocal = partido.equipo_local_id === miId
  const gF = esLocal ? partido.goles_local     : partido.goles_visitante
  const gC = esLocal ? partido.goles_visitante  : partido.goles_local
  if (gF > gC) return { label: 'Ganado',  variant: 'green' }
  if (gF < gC) return { label: 'Perdido', variant: 'orange' }
  return       { label: 'Empate',  variant: 'gray' }
}

// Resaltar si es mi equipo el local o visitante
const esmiEquipo = (id: number) => miEquipo.value?.id === id
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-matchx-text-primary">Fixture</h1>
      <p class="text-matchx-text-muted mt-1">Calendario de partidos de tu equipo</p>
    </div>

    <!-- Sin equipo -->
    <div v-if="!miEquipo" class="flex flex-col items-center gap-3 py-16">
      <CalendarRange class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-muted">No tienes un equipo asignado</p>
    </div>

    <template v-else>
      <!-- Header mini equipo + filtro -->
      <div class="flex items-center gap-4">
        <img :src="miEquipo.escudo_url" :alt="miEquipo.nombre" class="w-10 h-10 rounded-lg" />
        <div class="flex-1">
          <div class="font-semibold text-matchx-text-primary">{{ miEquipo.nombre }}</div>
          <div class="text-xs text-matchx-text-muted">{{ partidosDelEquipo.length }} partidos en total</div>
        </div>
      </div>

      <AppCard :hover="false">
        <div class="max-w-xs">
          <AppSelect v-model="filtroEstado" :options="filtroOptions" label="Mostrar" />
        </div>
      </AppCard>

      <!-- Empty -->
      <div v-if="partidosFiltrados.length === 0" class="flex flex-col items-center gap-3 py-16">
        <CalendarRange class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
        <p class="text-matchx-text-muted text-sm">No hay partidos para mostrar</p>
      </div>

      <!-- Lista por jornada -->
      <div v-else class="space-y-1">
        <template v-for="jornada in jornadasUnicas" :key="jornada">
          <!-- Divisor jornada -->
          <div class="flex items-center gap-3 mt-5 mb-2 first:mt-0">
            <div class="h-px flex-1 bg-matchx-border-base/50" />
            <span class="text-xs font-semibold text-matchx-text-muted uppercase tracking-wider shrink-0">
              Jornada {{ jornada }}
            </span>
            <div class="h-px flex-1 bg-matchx-border-base/50" />
          </div>

          <AppCard
            v-for="partido in partidosFiltrados.filter(p => p.jornada === jornada)"
            :key="partido.id"
            :hover="true"
            class="mb-2 cursor-pointer"
            @click="router.push({ name: 'JugadorPartidoDetalle', params: { id: partido.id } })"
          >
            <div class="flex items-center gap-4">
              <div class="flex-1 flex items-center gap-3 min-w-0">
                <!-- Local -->
                <div class="flex-1 flex items-center justify-end gap-2 min-w-0">
                  <span
                    :class="['font-semibold text-sm truncate', esmiEquipo(partido.equipo_local_id) ? 'text-matchx-accent-green' : 'text-matchx-text-primary']"
                  >
                    {{ nombreEquipo(partido.equipo_local_id) }}
                  </span>
                  <img v-if="escudoEquipo(partido.equipo_local_id)"
                    :src="escudoEquipo(partido.equipo_local_id)!"
                    :class="['w-8 h-8 rounded-md shrink-0', esmiEquipo(partido.equipo_local_id) && 'ring-2 ring-matchx-accent-green/50']"
                  />
                  <div v-else class="w-8 h-8 rounded-md bg-matchx-bg-elevated border border-matchx-border-base
                                     flex items-center justify-center shrink-0">
                    <Swords class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.5" />
                  </div>
                </div>

                <!-- Marcador / VS -->
                <div class="text-center px-2 shrink-0">
                  <div v-if="partido.estado === 'finalizado'"
                       class="text-2xl font-bold font-mono text-matchx-text-primary">
                    {{ partido.goles_local }} – {{ partido.goles_visitante }}
                  </div>
                  <div v-else class="text-lg font-bold font-mono text-matchx-text-muted">vs</div>
                </div>

                <!-- Visitante -->
                <div class="flex-1 flex items-center gap-2 min-w-0">
                  <img v-if="escudoEquipo(partido.equipo_visitante_id)"
                    :src="escudoEquipo(partido.equipo_visitante_id)!"
                    :class="['w-8 h-8 rounded-md shrink-0', esmiEquipo(partido.equipo_visitante_id) && 'ring-2 ring-matchx-accent-green/50']"
                  />
                  <div v-else class="w-8 h-8 rounded-md bg-matchx-bg-elevated border border-matchx-border-base
                                     flex items-center justify-center shrink-0">
                    <Swords class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.5" />
                  </div>
                  <span
                    :class="['font-semibold text-sm truncate', esmiEquipo(partido.equipo_visitante_id) ? 'text-matchx-accent-green' : 'text-matchx-text-primary']"
                  >
                    {{ nombreEquipo(partido.equipo_visitante_id) }}
                  </span>
                </div>
              </div>

              <!-- Meta -->
              <div class="flex items-center gap-3 shrink-0">
                <div class="flex flex-col items-end gap-1.5">
                  <AppBadge :variant="resultadoPartido(partido).variant" :dot="false">
                    {{ resultadoPartido(partido).label }}
                  </AppBadge>
                  <div class="flex items-center gap-1 text-xs text-matchx-text-secondary">
                    <Calendar class="w-3 h-3" :stroke-width="1.75" />
                    {{ formatFecha(partido.fecha_hora) }}
                    <Clock class="w-3 h-3 ml-1" :stroke-width="1.75" />
                    {{ formatHora(partido.fecha_hora) }}
                  </div>
                  <div class="flex items-center gap-1 text-xs text-matchx-text-secondary">
                    <MapPin class="w-3 h-3" :stroke-width="1.75" />
                    {{ nombreSede(partido.sede_id) }}
                  </div>
                  <!-- Resumen convocatoria si ya hay datos -->
                  <div v-if="asistenciaResumenPartido(partido.id)" class="flex items-center gap-1 text-xs text-matchx-accent-green">
                    <Check class="w-3 h-3" :stroke-width="2.5" />
                    {{ asistenciaResumenPartido(partido.id)!.confirmados }}/{{ asistenciaResumenPartido(partido.id)!.total }} habilitados
                  </div>
                </div>

                <!-- Botón asistencia (solo capitán) -->
                <button
                  v-if="auth.isCapitan"
                  class="shrink-0 p-2 rounded-lg border border-matchx-border-base
                         text-matchx-text-muted hover:text-matchx-accent-green
                         hover:border-matchx-accent-green/40 hover:bg-matchx-accent-green/5
                         transition-colors"
                  title="Convocatoria"
                  @click="openAsistencia(partido, $event)"
                >
                  <ClipboardList class="w-4 h-4" :stroke-width="1.75" />
                </button>

                <ChevronRight class="w-4 h-4 text-matchx-text-muted shrink-0" :stroke-width="2" />
              </div>
            </div>
          </AppCard>
        </template>
      </div>
    </template>
  </div>

  <!-- ── Modal: Asistencia ──────────────────────────────────────────────── -->
  <AppModal v-model:open="showAsistencia" size="md"
    :title="asistenciaPartido ? `Convocatoria · Jornada ${asistenciaPartido.jornada}` : 'Convocatoria'"
    :close-button="true">

    <template v-if="asistenciaPartido">
      <!-- Equipos -->
      <div class="flex items-center justify-center gap-3 py-2 mb-4">
        <span :class="['text-sm font-semibold', esmiEquipo(asistenciaPartido.equipo_local_id) ? 'text-matchx-accent-green' : 'text-matchx-text-muted']">
          {{ nombreEquipo(asistenciaPartido.equipo_local_id) }}
        </span>
        <span class="text-xs text-matchx-text-muted font-mono">vs</span>
        <span :class="['text-sm font-semibold', esmiEquipo(asistenciaPartido.equipo_visitante_id) ? 'text-matchx-accent-green' : 'text-matchx-text-muted']">
          {{ nombreEquipo(asistenciaPartido.equipo_visitante_id) }}
        </span>
      </div>

      <!-- Resumen -->
      <div class="grid grid-cols-3 gap-2 mb-4">
        <div class="flex flex-col items-center gap-0.5 py-2 rounded-lg bg-matchx-accent-green/5 border border-matchx-accent-green/20">
          <span class="text-lg font-bold text-matchx-accent-green">{{ resumenAsistencia.confirmado }}</span>
          <span class="text-[10px] text-matchx-text-muted uppercase tracking-wide">Presentes</span>
        </div>
        <div class="flex flex-col items-center gap-0.5 py-2 rounded-lg bg-matchx-accent-orange/5 border border-matchx-accent-orange/20">
          <span class="text-lg font-bold text-matchx-accent-orange">{{ resumenAsistencia.ausenteTotal }}</span>
          <span class="text-[10px] text-matchx-text-muted uppercase tracking-wide">Ausentes</span>
        </div>
        <div class="flex flex-col items-center gap-0.5 py-2 rounded-lg bg-red-500/5 border border-red-500/20">
          <span class="text-lg font-bold text-red-400">{{ resumenAsistencia.no_habilitado }}</span>
          <span class="text-[10px] text-matchx-text-muted uppercase tracking-wide">No habilit.</span>
        </div>
      </div>

      <!-- Hint edición -->
      <p v-if="asistenciaEditable" class="text-xs text-matchx-text-muted mb-3">
        Selecciona el estado de cada jugador para este partido.
      </p>
      <p v-else class="text-xs text-matchx-text-muted mb-3 flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-matchx-text-muted shrink-0" />
        Histórico — partido {{ asistenciaPartido.estado }}
      </p>

      <!-- Lista jugadores -->
      <div class="space-y-2">
        <div
          v-for="jugador in jugadoresEquipo"
          :key="jugador.id"
          class="flex items-center gap-3"
        >
          <!-- Avatar -->
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      bg-matchx-bg-elevated text-matchx-text-muted">
            {{ jugador.nombre[0] }}{{ jugador.apellido[0] }}
          </div>

          <!-- Nombre -->
          <div class="flex-1 min-w-0">
            <span class="text-sm text-matchx-text-primary truncate block">
              {{ jugador.nombre }} {{ jugador.apellido }}
            </span>
            <span class="text-xs text-matchx-text-muted">#{{ jugador.numero_camiseta }} · {{ jugador.posicion }}</span>
          </div>

          <!-- 4 botones explícitos (editable) -->
          <div v-if="asistenciaEditable" class="flex items-center gap-1 shrink-0">
            <button
              v-for="opcion in (['confirmado', 'ausente', 'no_habilitado', 'pendiente'] as EstadoAsistencia[])"
              :key="opcion"
              :title="estadoConfig[opcion].label"
              :class="[
                'w-7 h-7 rounded-lg border flex items-center justify-center transition-colors',
                getEstadoEfectivo(jugador.id) === opcion
                  ? estadoConfig[opcion].activeClass
                  : 'border-matchx-border-base text-matchx-text-muted hover:border-matchx-accent-green/30',
              ]"
              @click="setEstado(jugador.id, opcion)"
            >
              <component :is="estadoConfig[opcion].icon" class="w-3.5 h-3.5" :stroke-width="2.5" />
            </button>
          </div>

          <!-- Badge solo lectura (histórico) -->
          <span
            v-else
            :class="[
              'flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium shrink-0',
              estadoConfig[getEstadoEfectivo(jugador.id)].activeClass,
            ]"
          >
            <component :is="estadoConfig[getEstadoEfectivo(jugador.id)].icon" class="w-3 h-3" :stroke-width="2.5" />
            {{ estadoConfig[getEstadoEfectivo(jugador.id)].label }}
          </span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <button
          class="px-4 py-2 rounded-lg text-sm font-medium bg-matchx-bg-elevated text-matchx-text-secondary
                 hover:text-matchx-text-primary transition-colors"
          @click="showAsistencia = false"
        >
          Cerrar
        </button>
      </div>
    </template>
  </AppModal>
</template>
