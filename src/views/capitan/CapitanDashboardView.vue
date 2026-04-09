<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useEquiposStore } from '@/stores/equipos'
import { useJugadoresStore } from '@/stores/jugadores'
import { usePartidosStore } from '@/stores/partidos'
import { useTorneosStore } from '@/stores/torneos'
import AppCard from '@/components/ui/AppCard.vue'
import { Users, Swords, Trophy, CalendarClock, Calendar, Clock } from 'lucide-vue-next'

const auth = useAuthStore()

const welcomeMessage = computed(() => {
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'
  return `${greeting}, ${auth.userName}`
})
const equiposStore = useEquiposStore()
const jugadoresStore = useJugadoresStore()
const partidosStore = usePartidosStore()
const torneosStore = useTorneosStore()

onMounted(async () => {
  await Promise.all([
    equiposStore.fetchEquipos(),
    jugadoresStore.fetchJugadores(),
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

const jugadores = computed(() =>
  miEquipo.value ? jugadoresStore.jugadoresPorEquipo(miEquipo.value.id) : [],
)

const partidosDelEquipo = computed(() => {
  if (!miEquipo.value) return []
  const id = miEquipo.value.id
  return partidosStore.partidos.filter(p =>
    p.equipo_local_id === id || p.equipo_visitante_id === id,
  )
})

const ahora = new Date()
const proximosPartidos = computed(() =>
  partidosDelEquipo.value
    .filter(p => p.estado === 'programado' && new Date(p.fecha_hora) >= ahora)
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
    .slice(0, 4),
)

const ultimosResultados = computed(() =>
  partidosDelEquipo.value
    .filter(p => p.estado === 'finalizado')
    .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
    .slice(0, 4),
)

// Estadísticas del equipo en partidos finalizados
const stats = computed(() => {
  if (!miEquipo.value) return { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 }
  const id = miEquipo.value.id
  const finalizados = partidosDelEquipo.value.filter(p => p.estado === 'finalizado')
  let pg = 0, pe = 0, pp = 0, gf = 0, gc = 0
  for (const p of finalizados) {
    const esLocal = p.equipo_local_id === id
    const favor = esLocal ? p.goles_local : p.goles_visitante
    const contra = esLocal ? p.goles_visitante : p.goles_local
    gf += favor; gc += contra
    if (favor > contra) pg++
    else if (favor === contra) pe++
    else pp++
  }
  return { pj: finalizados.length, pg, pe, pp, gf, gc, pts: pg * 3 + pe }
})

const torneo = computed(() =>
  miEquipo.value ? torneosStore.obtenerPorId(miEquipo.value.torneo_id) : null,
)

const nombreEquipo = (id: number) => equiposStore.obtenerPorId(id)?.nombre ?? `Equipo ${id}`
const escudoEquipo = (id: number) => equiposStore.obtenerPorId(id)?.escudo_url ?? null

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-matchx-text-primary">{{ welcomeMessage }}</h1>
      <p class="text-matchx-text-secondary text-sm">Panel de tu equipo</p>
    </div>

    <!-- Sin equipo asignado -->
    <div v-if="!miEquipo" class="flex flex-col items-center gap-3 py-16">
      <Trophy class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-muted">No tienes un equipo asignado aún</p>
    </div>

    <template v-else>
      <!-- Header equipo -->
      <AppCard :hover="false">
        <div class="flex items-center gap-4">
          <img :src="miEquipo.escudo_url" :alt="miEquipo.nombre"
               class="w-16 h-16 rounded-xl" />
          <div class="flex-1">
            <h2 class="text-2xl font-bold text-matchx-text-primary">{{ miEquipo.nombre }}</h2>
            <p class="text-matchx-text-muted text-sm mt-0.5">{{ miEquipo.ciudad }}</p>
            <div v-if="torneo" class="flex items-center gap-2 mt-2">
              <span class="font-mono text-xs text-matchx-accent-green/80 bg-matchx-accent-green/5
                           border border-matchx-accent-green/15 rounded px-1.5 py-0.5">
                {{ torneo.modalidad_codigo }}
              </span>
              <span class="text-xs text-matchx-text-muted">{{ torneo.nombre }}</span>
            </div>
          </div>
          <div class="flex gap-2">
            <div
              v-for="(color, i) in [miEquipo.color_principal, miEquipo.color_secundario, miEquipo.color_terciario].filter(Boolean)"
              :key="i"
              class="w-6 h-6 rounded-full border border-matchx-border-base"
              :style="{ backgroundColor: color }"
            />
          </div>
        </div>
      </AppCard>

      <!-- Métricas -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AppCard>
          <div class="flex items-start justify-between">
            <div class="text-matchx-text-muted text-sm font-medium">Jugadores</div>
            <div class="p-2 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/20">
              <Users class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
            </div>
          </div>
          <div class="text-4xl font-bold text-matchx-accent-green mt-3">{{ jugadores.length }}</div>
          <div class="text-xs text-matchx-text-muted mt-1">en plantilla</div>
        </AppCard>

        <AppCard>
          <div class="flex items-start justify-between">
            <div class="text-matchx-text-muted text-sm font-medium">Puntos</div>
            <div class="p-2 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/20">
              <Trophy class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
            </div>
          </div>
          <div class="text-4xl font-bold text-matchx-accent-green mt-3">{{ stats.pts }}</div>
          <div class="text-xs text-matchx-text-muted mt-1">{{ stats.pj }} jugados</div>
        </AppCard>

        <AppCard>
          <div class="flex items-start justify-between">
            <div class="text-matchx-text-muted text-sm font-medium">Ganados</div>
            <div class="p-2 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/20">
              <Swords class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
            </div>
          </div>
          <div class="text-4xl font-bold text-matchx-accent-green mt-3">{{ stats.pg }}</div>
          <div class="text-xs text-matchx-text-muted mt-1">{{ stats.pp }} perdidos</div>
        </AppCard>

        <AppCard>
          <div class="flex items-start justify-between">
            <div class="text-matchx-text-muted text-sm font-medium">Goles a Favor</div>
            <div class="p-2 rounded-lg bg-matchx-accent-orange/10 border border-matchx-accent-orange/20">
              <Swords class="w-4 h-4 text-matchx-accent-orange" :stroke-width="1.75" />
            </div>
          </div>
          <div class="text-4xl font-bold text-matchx-accent-orange mt-3">{{ stats.gf }}</div>
          <div class="text-xs text-matchx-text-muted mt-1">{{ stats.gc }} en contra</div>
        </AppCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Próximos -->
        <AppCard>
          <h2 class="text-lg font-semibold text-matchx-text-primary mb-4">Próximos Partidos</h2>

          <div v-if="!proximosPartidos.length" class="flex flex-col items-center py-8 gap-2">
            <CalendarClock class="w-8 h-8 text-matchx-text-muted opacity-40" :stroke-width="1.5" />
            <p class="text-matchx-text-muted text-sm">No hay partidos próximos</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="p in proximosPartidos" :key="p.id"
              class="p-3 rounded-lg bg-matchx-bg-base/30 border border-matchx-border-base/30
                     hover:border-matchx-border-base transition-colors"
            >
              <div class="flex items-center justify-between text-sm mb-1.5">
                <span class="font-medium truncate flex-1 text-right"
                  :class="p.equipo_local_id === miEquipo.id ? 'text-matchx-accent-green' : 'text-matchx-text-primary'">
                  {{ nombreEquipo(p.equipo_local_id) }}
                </span>
                <span class="text-matchx-accent-green text-xs font-mono font-bold px-3 shrink-0">VS</span>
                <span class="font-medium truncate flex-1"
                  :class="p.equipo_visitante_id === miEquipo.id ? 'text-matchx-accent-green' : 'text-matchx-text-primary'">
                  {{ nombreEquipo(p.equipo_visitante_id) }}
                </span>
              </div>
              <div class="flex items-center justify-center gap-3 text-xs text-matchx-text-muted">
                <span class="flex items-center gap-1">
                  <Calendar class="w-3 h-3" :stroke-width="1.75" />
                  {{ formatFecha(p.fecha_hora) }}
                </span>
                <span class="flex items-center gap-1">
                  <Clock class="w-3 h-3" :stroke-width="1.75" />
                  {{ formatHora(p.fecha_hora) }}
                </span>
              </div>
            </div>
          </div>
        </AppCard>

        <!-- Últimos resultados -->
        <AppCard>
          <h2 class="text-lg font-semibold text-matchx-text-primary mb-4">Últimos Resultados</h2>

          <div v-if="!ultimosResultados.length" class="flex flex-col items-center py-8 gap-2">
            <Swords class="w-8 h-8 text-matchx-text-muted opacity-40" :stroke-width="1.5" />
            <p class="text-matchx-text-muted text-sm">Sin resultados aún</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="p in ultimosResultados" :key="p.id"
              class="p-3 rounded-lg bg-matchx-bg-base/30 border border-matchx-border-base/30
                     hover:border-matchx-border-base transition-colors"
            >
              <div class="flex items-center gap-3">
                <div class="flex-1 flex items-center justify-end gap-2 min-w-0">
                  <span class="font-medium text-sm truncate"
                    :class="p.equipo_local_id === miEquipo.id ? 'text-matchx-accent-green' : 'text-matchx-text-primary'">
                    {{ nombreEquipo(p.equipo_local_id) }}
                  </span>
                  <img v-if="escudoEquipo(p.equipo_local_id)"
                    :src="escudoEquipo(p.equipo_local_id)!" class="w-7 h-7 rounded shrink-0" />
                </div>
                <div class="text-center shrink-0 px-2">
                  <div class="text-xl font-bold font-mono text-matchx-text-primary">
                    {{ p.goles_local }} – {{ p.goles_visitante }}
                  </div>
                  <div class="text-xs text-matchx-text-muted">{{ formatFecha(p.fecha_hora) }}</div>
                </div>
                <div class="flex-1 flex items-center gap-2 min-w-0">
                  <img v-if="escudoEquipo(p.equipo_visitante_id)"
                    :src="escudoEquipo(p.equipo_visitante_id)!" class="w-7 h-7 rounded shrink-0" />
                  <span class="font-medium text-sm truncate"
                    :class="p.equipo_visitante_id === miEquipo.id ? 'text-matchx-accent-green' : 'text-matchx-text-primary'">
                    {{ nombreEquipo(p.equipo_visitante_id) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </AppCard>
      </div>
    </template>
  </div>
</template>
