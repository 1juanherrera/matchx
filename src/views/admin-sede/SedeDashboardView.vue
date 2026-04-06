<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSedesStore } from '@/stores/sedes'
import { usePartidosStore } from '@/stores/partidos'
import { useEquiposStore } from '@/stores/equipos'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const welcomeMessage = computed(() => {
  const h = new Date().getHours()
  const greeting = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'
  return `${greeting}, ${authStore.userName}`
})
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { Building2, CheckCircle2, XCircle, CalendarClock, Calendar, Clock, Swords } from 'lucide-vue-next'

const sedesStore = useSedesStore()
const partidosStore = usePartidosStore()
const equiposStore = useEquiposStore()

const selectedSedeId = ref<number | null>(null)

onMounted(async () => {
  await Promise.all([
    sedesStore.fetchSedes(),
    partidosStore.fetchPartidos(),
    equiposStore.fetchEquipos(),
  ])
  if (sedesStore.sedesActivas.length > 0) {
    selectedSedeId.value = sedesStore.sedesActivas[0].id
  }
})

const sedeOptions = computed(() =>
  sedesStore.sedesActivas.map(s => ({ value: s.id, label: s.nombre })),
)

const sedeActual = computed(() =>
  selectedSedeId.value !== null ? sedesStore.obtenerPorId(selectedSedeId.value) : null,
)

const canchasDisponibles = computed(() =>
  sedeActual.value?.canchas.filter(c => c.disponible).length ?? 0,
)

const partidosDeSede = computed(() =>
  selectedSedeId.value !== null
    ? partidosStore.partidos.filter(p => p.sede_id === selectedSedeId.value)
    : [],
)

const ahora = new Date()
const inicioSemana = new Date(ahora)
inicioSemana.setDate(ahora.getDate() - ahora.getDay())
const finSemana = new Date(inicioSemana)
finSemana.setDate(inicioSemana.getDate() + 6)

const partidosSemana = computed(() =>
  partidosDeSede.value.filter(p => {
    const fecha = new Date(p.fecha_hora)
    return fecha >= inicioSemana && fecha <= finSemana
  }),
)

const proximosPartidos = computed(() =>
  partidosDeSede.value
    .filter(p => p.estado === 'programado' && new Date(p.fecha_hora) >= ahora)
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
    .slice(0, 5),
)

const nombreEquipo = (id: number) => equiposStore.obtenerPorId(id)?.nombre ?? `Equipo ${id}`
const nombreCancha = (canchaId: number) =>
  sedeActual.value?.canchas.find(c => c.id === canchaId)?.nombre ?? `Cancha ${canchaId}`

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

const tipoLabel = (tipo: string) => ({
  pasto_natural: 'Natural', pasto_sintetico: 'Sintético', cemento: 'Cemento',
}[tipo] ?? tipo)

const tipoBadge = (tipo: string): 'green' | 'blue' | 'orange' => ({
  pasto_natural: 'green' as const, pasto_sintetico: 'blue' as const, cemento: 'orange' as const,
}[tipo] ?? 'gray' as any)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-matchx-text-primary">{{ welcomeMessage }}</h1>
      <p class="text-matchx-text-secondary text-sm">Panel de administración de sede</p>
    </div>

    <!-- Selector sede -->
    <AppCard :hover="false">
      <AppSelect v-model="selectedSedeId" :options="sedeOptions" label="Sede" />
    </AppCard>

    <!-- Métricas -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <AppCard>
        <div class="flex items-start justify-between">
          <div class="text-matchx-text-muted text-sm font-medium">Total Canchas</div>
          <div class="p-2 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/20">
            <Building2 class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
          </div>
        </div>
        <div class="text-4xl font-bold text-matchx-accent-green mt-3">
          {{ sedeActual?.canchas.length ?? 0 }}
        </div>
        <div class="text-xs text-matchx-text-muted mt-1">en esta sede</div>
      </AppCard>

      <AppCard>
        <div class="flex items-start justify-between">
          <div class="text-matchx-text-muted text-sm font-medium">Disponibles</div>
          <div class="p-2 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/20">
            <CheckCircle2 class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
          </div>
        </div>
        <div class="text-4xl font-bold text-matchx-accent-green mt-3">
          {{ canchasDisponibles }}
        </div>
        <div class="text-xs text-matchx-text-muted mt-1">
          {{ (sedeActual?.canchas.length ?? 0) - canchasDisponibles }} no disponibles
        </div>
      </AppCard>

      <AppCard>
        <div class="flex items-start justify-between">
          <div class="text-matchx-text-muted text-sm font-medium">Partidos Esta Semana</div>
          <div class="p-2 rounded-lg bg-matchx-accent-orange/10 border border-matchx-accent-orange/20">
            <Swords class="w-4 h-4 text-matchx-accent-orange" :stroke-width="1.75" />
          </div>
        </div>
        <div class="text-4xl font-bold text-matchx-accent-orange mt-3">
          {{ partidosSemana.length }}
        </div>
        <div class="text-xs text-matchx-text-muted mt-1">{{ partidosDeSede.length }} total</div>
      </AppCard>

      <AppCard>
        <div class="flex items-start justify-between">
          <div class="text-matchx-text-muted text-sm font-medium">Próximo Partido</div>
          <div class="p-2 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/20">
            <CalendarClock class="w-4 h-4 text-matchx-accent-green" :stroke-width="1.75" />
          </div>
        </div>
        <div v-if="proximosPartidos.length" class="mt-3">
          <div class="text-sm font-semibold text-matchx-text-primary">
            {{ formatFecha(proximosPartidos[0].fecha_hora) }}
          </div>
          <div class="text-xs text-matchx-text-muted mt-0.5">
            {{ formatHora(proximosPartidos[0].fecha_hora) }} · {{ nombreCancha(proximosPartidos[0].cancha_id) }}
          </div>
        </div>
        <div v-else class="text-sm text-matchx-text-muted mt-3">Sin programar</div>
      </AppCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Canchas -->
      <AppCard>
        <h2 class="text-lg font-semibold text-matchx-text-primary mb-4">Canchas</h2>

        <div v-if="!sedeActual?.canchas.length"
             class="flex flex-col items-center py-8 gap-2">
          <Building2 class="w-8 h-8 text-matchx-text-muted opacity-40" :stroke-width="1.5" />
          <p class="text-matchx-text-muted text-sm">No hay canchas registradas</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="cancha in sedeActual?.canchas"
            :key="cancha.id"
            class="flex items-center justify-between p-3 rounded-lg bg-matchx-bg-base/30
                   border border-matchx-border-base/30 hover:border-matchx-border-base transition-colors"
          >
            <div class="flex-1 min-w-0">
              <div class="font-medium text-matchx-text-primary text-sm">{{ cancha.nombre }}</div>
              <div class="flex items-center gap-2 mt-0.5">
                <AppBadge :variant="tipoBadge(cancha.tipo)" :dot="false" class="text-xs">
                  {{ tipoLabel(cancha.tipo) }}
                </AppBadge>
                <span class="text-xs text-matchx-text-muted">
                  {{ cancha.largo_metros }}×{{ cancha.ancho_metros }}m
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 ml-3 shrink-0">
              <CheckCircle2 v-if="cancha.disponible"
                class="w-4 h-4 text-matchx-accent-green" :stroke-width="2" />
              <XCircle v-else
                class="w-4 h-4 text-matchx-accent-orange" :stroke-width="2" />
              <span :class="cancha.disponible ? 'text-matchx-accent-green' : 'text-matchx-accent-orange'"
                    class="text-xs font-medium">
                {{ cancha.disponible ? 'Disponible' : 'No disponible' }}
              </span>
            </div>
          </div>
        </div>
      </AppCard>

      <!-- Próximos partidos -->
      <AppCard>
        <h2 class="text-lg font-semibold text-matchx-text-primary mb-4">Próximos Partidos</h2>

        <div v-if="proximosPartidos.length === 0"
             class="flex flex-col items-center py-8 gap-2">
          <CalendarClock class="w-8 h-8 text-matchx-text-muted opacity-40" :stroke-width="1.5" />
          <p class="text-matchx-text-muted text-sm">No hay partidos programados</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="partido in proximosPartidos"
            :key="partido.id"
            class="p-3 rounded-lg bg-matchx-bg-base/30 border border-matchx-border-base/30
                   hover:border-matchx-border-base transition-colors"
          >
            <div class="flex items-center justify-between text-sm mb-1.5">
              <span class="font-medium text-matchx-text-primary flex-1 text-right truncate">
                {{ nombreEquipo(partido.equipo_local_id) }}
              </span>
              <span class="text-matchx-accent-green text-xs font-mono font-bold px-3 shrink-0">VS</span>
              <span class="font-medium text-matchx-text-primary flex-1 truncate">
                {{ nombreEquipo(partido.equipo_visitante_id) }}
              </span>
            </div>
            <div class="flex items-center gap-3 text-xs text-matchx-text-muted">
              <span class="flex items-center gap-1">
                <Calendar class="w-3 h-3" :stroke-width="1.75" />
                {{ formatFecha(partido.fecha_hora) }}
              </span>
              <span class="flex items-center gap-1">
                <Clock class="w-3 h-3" :stroke-width="1.75" />
                {{ formatHora(partido.fecha_hora) }}
              </span>
              <span class="font-mono text-matchx-accent-green/80 bg-matchx-accent-green/5
                           border border-matchx-accent-green/15 rounded px-1.5 py-0.5">
                {{ nombreCancha(partido.cancha_id) }}
              </span>
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>
