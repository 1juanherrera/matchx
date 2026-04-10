<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEquiposStore } from '@/stores/equipos'
import { useJugadoresStore } from '@/stores/jugadores'
import { usePartidosStore } from '@/stores/partidos'
import { useTorneosStore } from '@/stores/torneos'
import { jugadoresService } from '@/services/jugadores.service'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import {
  UserRound, Mail, Hash, MapPin, Trophy,
  Swords, CircleDot, AlertTriangle, ArrowRight,
  Calendar, Clock, ChevronRight,
} from 'lucide-vue-next'

const router        = useRouter()
const auth          = useAuthStore()
const equiposStore  = useEquiposStore()
const jugadoresStore = useJugadoresStore()
const partidosStore  = usePartidosStore()
const torneosStore   = useTorneosStore()

// ── Estadísticas (real con fallback mock) ──────────────────────────────────
interface EstadisticasTorneo {
  partidos_jugados: number
  goles: number
  asistencias: number
  amarillas: number
  rojas: number
}

const stats       = ref<EstadisticasTorneo | null>(null)
const statsLoading = ref(false)

// Deterministic mock — reemplazar cuando el endpoint esté listo
const statsMock = (jId: number, tId: number): EstadisticasTorneo => ({
  partidos_jugados: (jId * 3  + tId * 7) % 12 + 3,
  goles:            (jId * 7  + tId * 3) % 9,
  asistencias:      (jId * 5  + tId * 2) % 7,
  amarillas:        (jId * 11 + tId)     % 4,
  rojas:            (jId * 13 + tId * 5) % 2,
})

// ── Datos del perfil ───────────────────────────────────────────────────────
const miEquipo = computed(() =>
  equiposStore.equipos.find(e =>
    (auth.user?.equipo_id != null && e.id === auth.user.equipo_id) ||
    (import.meta.env.VITE_MOCK_API === 'true' && e.id === 1),
  ) ?? null,
)

const miJugador = computed(() => {
  if (!miEquipo.value) return null
  const jugadores = jugadoresStore.jugadoresPorEquipo(miEquipo.value.id)
  if (auth.isCapitan) return jugadores.find(j => j.es_capitan === 1) ?? jugadores[0] ?? null
  // Para jugadores no capitán, intenta coincidir por nombre
  const nombre = auth.userName.split(' ')[0]?.toLowerCase() ?? ''
  return jugadores.find(j => j.nombre.toLowerCase().startsWith(nombre)) ?? jugadores[0] ?? null
})

const torneo = computed(() =>
  miEquipo.value ? torneosStore.obtenerPorId(miEquipo.value.torneo_id) : null,
)

// ── Partidos del equipo ────────────────────────────────────────────────────
const partidosDelEquipo = computed(() => {
  if (!miEquipo.value) return []
  const id = miEquipo.value.id
  return partidosStore.partidos.filter(p =>
    p.equipo_local_id === id || p.equipo_visitante_id === id,
  )
})

const ultimosResultados = computed(() =>
  partidosDelEquipo.value
    .filter(p => p.estado === 'finalizado')
    .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
    .slice(0, 4),
)

// ── Helpers visuales ──────────────────────────────────────────────────────
const posicionLabel: Record<string, string> = {
  portero:    'Portero',
  defensa:    'Defensa',
  mediocampo: 'Mediocampo',
  delantero:  'Delantero',
}

const avatarColors = [
  'from-matchx-accent-green/30 to-matchx-accent-green/10 text-matchx-accent-green border-matchx-accent-green/20',
  'from-blue-500/30 to-blue-500/10 text-blue-400 border-blue-500/20',
  'from-purple-500/30 to-purple-500/10 text-purple-400 border-purple-500/20',
  'from-matchx-accent-orange/30 to-matchx-accent-orange/10 text-matchx-accent-orange border-matchx-accent-orange/20',
]
const avatarGradient = computed(() => {
  const idx = (auth.user?.usuario_id ?? 0) % 4
  return avatarColors[idx]
})

const iniciales = computed(() =>
  auth.userName.split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase(),
)

const nombreEquipo = (id: number) => equiposStore.obtenerPorId(id)?.nombre ?? `Equipo ${id}`
const escudoEquipo = (id: number) => equiposStore.obtenerPorId(id)?.escudo_url ?? null

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })
const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

const resultadoPartido = (p: any) => {
  if (!miEquipo.value) return null
  const id      = miEquipo.value.id
  const esLocal = p.equipo_local_id === id
  const favor   = esLocal ? p.goles_local : p.goles_visitante
  const contra  = esLocal ? p.goles_visitante : p.goles_local
  if (favor > contra)  return { label: 'V', classes: 'bg-matchx-accent-green/15 text-matchx-accent-green border-matchx-accent-green/25' }
  if (favor === contra) return { label: 'E', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' }
  return { label: 'D', classes: 'bg-matchx-accent-orange/15 text-matchx-accent-orange border-matchx-accent-orange/25' }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([
    equiposStore.fetchEquipos(),
    jugadoresStore.fetchJugadores(),
    partidosStore.fetchPartidos(),
    torneosStore.fetchTorneos(),
  ])

  // Cargar estadísticas
  const jId = miJugador.value?.id ?? auth.user?.usuario_id ?? 1
  const tId = torneo.value?.id ?? auth.user?.torneo_id ?? 1

  statsLoading.value = true
  try {
    const { data } = await jugadoresService.getEstadisticas(jId, tId)
    const raw = data.data ?? data
    if (raw && (raw.partidos_jugados != null || raw.goles != null)) {
      stats.value = {
        partidos_jugados: raw.partidos_jugados ?? 0,
        goles:            raw.goles            ?? 0,
        asistencias:      raw.asistencias      ?? 0,
        amarillas:        raw.amarillas ?? raw.tarjetas_amarillas ?? 0,
        rojas:            raw.rojas     ?? raw.tarjetas_rojas     ?? 0,
      }
    } else {
      stats.value = statsMock(jId, tId)
    }
  } catch {
    stats.value = statsMock(jId, tId)
  } finally {
    statsLoading.value = false
  }
})
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">

    <!-- ── Player card ────────────────────────────────────────────────────── -->
    <AppCard :hover="false">
      <div class="flex items-start gap-5">

        <!-- Avatar -->
        <div class="relative shrink-0">
          <div :class="[
            'w-20 h-20 rounded-2xl flex items-center justify-center',
            'text-3xl font-bold bg-gradient-to-br border',
            avatarGradient,
          ]">
            {{ iniciales }}
          </div>
          <div v-if="auth.isCapitan"
            class="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center
                   text-[10px] font-black leading-none
                   bg-gradient-to-b from-yellow-300 to-yellow-500 text-yellow-950
                   ring-2 ring-matchx-bg-surface shadow-md"
            title="Capitán del equipo"
          >C</div>
        </div>

        <!-- Contenido -->
        <div class="flex-1 min-w-0">

          <!-- Nombre + badge + posición/dorsal -->
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h1 class="text-2xl font-bold text-matchx-text-primary leading-tight truncate">
                {{ auth.userName }}
              </h1>
              <div v-if="miJugador" class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="text-sm text-matchx-text-secondary">
                  {{ posicionLabel[miJugador.posicion] ?? miJugador.posicion }}
                </span>
                <span class="text-matchx-border-base select-none">·</span>
                <span class="text-sm font-bold text-matchx-accent-green font-mono tracking-wide">
                  #{{ miJugador.numero_camiseta }}
                </span>
              </div>
            </div>
            <AppBadge v-if="auth.isCapitan" variant="green" dot class="shrink-0 mt-0.5">Capitán</AppBadge>
            <AppBadge v-else variant="blue" dot class="shrink-0 mt-0.5">Jugador</AppBadge>
          </div>

          <!-- Divisor -->
          <div class="h-px bg-matchx-border-base/40 my-3" />

          <!-- Fila de afiliación -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2">

            <div class="flex items-center gap-1.5 text-sm text-matchx-text-muted">
              <Mail class="w-3.5 h-3.5 shrink-0" :stroke-width="1.75" />
              <span class="truncate">{{ auth.user?.correo ?? '—' }}</span>
            </div>

            <div v-if="miEquipo" class="flex items-center gap-1.5 text-sm text-matchx-text-secondary">
              <img v-if="miEquipo.escudo_url" :src="miEquipo.escudo_url"
                class="w-4 h-4 rounded-sm shrink-0 object-contain" />
              <span class="font-medium">{{ miEquipo.nombre }}</span>
            </div>

            <div v-if="miEquipo?.ciudad" class="flex items-center gap-1 text-sm text-matchx-text-muted">
              <MapPin class="w-3.5 h-3.5 shrink-0" :stroke-width="1.75" />
              <span>{{ miEquipo.ciudad }}</span>
            </div>

            <div v-if="torneo" class="flex items-center gap-1.5 text-sm">
              <Trophy class="w-3.5 h-3.5 text-matchx-accent-green shrink-0" :stroke-width="1.75" />
              <span class="text-matchx-accent-green/80 font-medium">{{ torneo.nombre }}</span>
            </div>

          </div>
        </div>
      </div>
    </AppCard>

    <!-- ── Estadísticas — franja full-width ──────────────────────────────── -->
    <AppCard :hover="false">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold text-matchx-text-primary flex items-center gap-2">
          <Swords class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
          Estadísticas del torneo
        </h2>
      </div>

      <!-- Skeleton -->
      <div v-if="statsLoading" class="grid grid-cols-5 gap-3">
        <div v-for="i in 5" :key="i" class="h-20 rounded-xl bg-matchx-bg-elevated animate-pulse" />
      </div>

      <div v-else-if="!stats" class="flex flex-col items-center py-8 gap-2">
        <Swords class="w-8 h-8 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
        <p class="text-matchx-text-muted text-sm">Sin datos de estadísticas</p>
      </div>

      <!-- 5 métricas en fila -->
      <div v-else class="grid grid-cols-5 gap-3">
        <div class="flex flex-col items-center gap-1.5 py-4 rounded-xl bg-matchx-bg-base/40
                    border border-matchx-border-base/50">
          <CircleDot class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.75" />
          <span class="text-2xl font-bold text-matchx-text-primary font-mono leading-none">{{ stats.partidos_jugados }}</span>
          <span class="text-[10px] text-matchx-text-muted tracking-wide uppercase">PJ</span>
        </div>
        <div class="flex flex-col items-center gap-1.5 py-4 rounded-xl bg-matchx-accent-green/5
                    border border-matchx-accent-green/15">
          <Trophy class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
          <span class="text-2xl font-bold text-matchx-accent-green font-mono leading-none">{{ stats.goles }}</span>
          <span class="text-[10px] text-matchx-accent-green/60 tracking-wide uppercase">Goles</span>
        </div>
        <div class="flex flex-col items-center gap-1.5 py-4 rounded-xl bg-blue-500/5
                    border border-blue-500/15">
          <ArrowRight class="w-4 h-4 text-blue-400" :stroke-width="1.75" />
          <span class="text-2xl font-bold text-blue-400 font-mono leading-none">{{ stats.asistencias }}</span>
          <span class="text-[10px] text-blue-400/60 tracking-wide uppercase">Asist.</span>
        </div>
        <div class="flex flex-col items-center gap-1.5 py-4 rounded-xl"
          :class="stats.amarillas > 0
            ? 'bg-yellow-500/10 border border-yellow-500/20'
            : 'bg-matchx-bg-base/40 border border-matchx-border-base/50'">
          <AlertTriangle class="w-4 h-4"
            :class="stats.amarillas > 0 ? 'text-yellow-400' : 'text-matchx-text-muted'"
            :stroke-width="1.75" />
          <span class="text-2xl font-bold font-mono leading-none"
            :class="stats.amarillas > 0 ? 'text-yellow-400' : 'text-matchx-text-muted'">
            {{ stats.amarillas }}
          </span>
          <span class="text-[10px] tracking-wide uppercase"
            :class="stats.amarillas > 0 ? 'text-yellow-400/60' : 'text-matchx-text-muted'">🟡</span>
        </div>
        <div class="flex flex-col items-center gap-1.5 py-4 rounded-xl"
          :class="stats.rojas > 0
            ? 'bg-red-500/10 border border-red-500/20'
            : 'bg-matchx-bg-base/40 border border-matchx-border-base/50'">
          <AlertTriangle class="w-4 h-4"
            :class="stats.rojas > 0 ? 'text-red-400' : 'text-matchx-text-muted'"
            :stroke-width="1.75" />
          <span class="text-2xl font-bold font-mono leading-none"
            :class="stats.rojas > 0 ? 'text-red-400' : 'text-matchx-text-muted'">
            {{ stats.rojas }}
          </span>
          <span class="text-[10px] tracking-wide uppercase"
            :class="stats.rojas > 0 ? 'text-red-400/60' : 'text-matchx-text-muted'">🔴</span>
        </div>
      </div>
    </AppCard>

    <!-- ── Últimos resultados ────────────────────────────────────────────── -->
    <AppCard :hover="false">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold text-matchx-text-primary flex items-center gap-2">
          <CircleDot class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
          Últimos resultados
        </h2>
        <button
          @click="router.push('/capitan/fixture')"
          class="flex items-center gap-1 text-xs text-matchx-accent-green hover:text-matchx-accent-green/80
                 transition-colors cursor-pointer"
        >
          Ver fixture
          <ChevronRight class="w-3.5 h-3.5" :stroke-width="2" />
        </button>
      </div>

      <div v-if="!ultimosResultados.length"
        class="flex flex-col items-center py-10 gap-2">
        <Swords class="w-8 h-8 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
        <p class="text-matchx-text-muted text-sm">Sin resultados aún</p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="p in ultimosResultados"
          :key="p.id"
          class="flex items-center gap-3 p-3 rounded-lg border transition-colors
                 bg-matchx-bg-base/30 border-matchx-border-base/40 hover:border-matchx-border-base"
        >
          <!-- Resultado badge -->
          <span
            v-if="resultadoPartido(p)"
            :class="['w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border shrink-0',
                     resultadoPartido(p)!.classes]"
          >{{ resultadoPartido(p)!.label }}</span>

          <!-- Equipos + marcador -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 text-sm">
              <div class="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                <img v-if="escudoEquipo(p.equipo_local_id)"
                  :src="escudoEquipo(p.equipo_local_id)!"
                  class="w-5 h-5 rounded shrink-0" />
                <span class="truncate"
                  :class="p.equipo_local_id === miEquipo?.id
                    ? 'font-semibold text-matchx-text-primary'
                    : 'text-matchx-text-secondary'">
                  {{ nombreEquipo(p.equipo_local_id) }}
                </span>
              </div>
              <span class="font-mono font-bold text-matchx-text-primary shrink-0 px-2">
                {{ p.goles_local }} – {{ p.goles_visitante }}
              </span>
              <div class="flex items-center gap-1.5 flex-1 min-w-0">
                <img v-if="escudoEquipo(p.equipo_visitante_id)"
                  :src="escudoEquipo(p.equipo_visitante_id)!"
                  class="w-5 h-5 rounded shrink-0" />
                <span class="truncate"
                  :class="p.equipo_visitante_id === miEquipo?.id
                    ? 'font-semibold text-matchx-text-primary'
                    : 'text-matchx-text-secondary'">
                  {{ nombreEquipo(p.equipo_visitante_id) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Fecha -->
          <div class="text-right shrink-0 hidden sm:block">
            <div class="flex items-center gap-1 text-xs text-matchx-text-muted justify-end">
              <Calendar class="w-3 h-3" :stroke-width="1.75" />
              {{ formatFecha(p.fecha_hora) }}
            </div>
            <div class="flex items-center gap-1 text-xs text-matchx-text-muted justify-end mt-0.5">
              <Clock class="w-3 h-3" :stroke-width="1.75" />
              {{ formatHora(p.fecha_hora) }}
            </div>
          </div>
        </div>
      </div>
    </AppCard>

    <!-- ── Accesos rápidos ───────────────────────────────────────────────── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        @click="router.push('/capitan/equipo')"
        class="flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer
               bg-matchx-bg-surface border-matchx-border-base
               hover:border-matchx-accent-green/40 hover:bg-matchx-accent-green/5 group"
      >
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/20
                      group-hover:bg-matchx-accent-green/15 transition-colors">
            <UserRound class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
          </div>
          <div class="text-left">
            <div class="text-sm font-medium text-matchx-text-primary">Mi Equipo</div>
            <div class="text-xs text-matchx-text-muted">Ver plantilla completa</div>
          </div>
        </div>
        <ChevronRight class="w-4 h-4 text-matchx-text-muted group-hover:text-matchx-accent-green
                             transition-colors" :stroke-width="1.75" />
      </button>

      <button
        v-if="auth.isCapitan"
        @click="router.push('/capitan/sanciones')"
        class="flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer
               bg-matchx-bg-surface border-matchx-border-base
               hover:border-matchx-accent-orange/40 hover:bg-matchx-accent-orange/5 group"
      >
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-matchx-accent-orange/10 border border-matchx-accent-orange/20
                      group-hover:bg-matchx-accent-orange/15 transition-colors">
            <AlertTriangle class="w-4 h-4 text-matchx-accent-orange" :stroke-width="1.75" />
          </div>
          <div class="text-left">
            <div class="text-sm font-medium text-matchx-text-primary">Sanciones</div>
            <div class="text-xs text-matchx-text-muted">Tarjetas y multas del equipo</div>
          </div>
        </div>
        <ChevronRight class="w-4 h-4 text-matchx-text-muted group-hover:text-matchx-accent-orange
                             transition-colors" :stroke-width="1.75" />
      </button>

      <button
        v-else
        @click="router.push('/capitan/fixture')"
        class="flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer
               bg-matchx-bg-surface border-matchx-border-base
               hover:border-blue-500/40 hover:bg-blue-500/5 group"
      >
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20
                      group-hover:bg-blue-500/15 transition-colors">
            <Calendar class="w-4 h-4 text-blue-400" :stroke-width="1.75" />
          </div>
          <div class="text-left">
            <div class="text-sm font-medium text-matchx-text-primary">Fixture</div>
            <div class="text-xs text-matchx-text-muted">Próximos partidos del torneo</div>
          </div>
        </div>
        <ChevronRight class="w-4 h-4 text-matchx-text-muted group-hover:text-blue-400
                             transition-colors" :stroke-width="1.75" />
      </button>
    </div>

  </div>
</template>
