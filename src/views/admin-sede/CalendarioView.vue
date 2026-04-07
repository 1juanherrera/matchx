<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSedesStore } from '@/stores/sedes'
import { usePartidosStore, type EstadoPartido } from '@/stores/partidos'
import { useEquiposStore } from '@/stores/equipos'
import { useTorneosStore } from '@/stores/torneos'
import { useAuthStore } from '@/stores/auth'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { CalendarClock, CalendarPlus, Clock, MapPin, Swords } from 'lucide-vue-next'

const sedesStore = useSedesStore()
const partidosStore = usePartidosStore()
const equiposStore = useEquiposStore()
const torneosStore = useTorneosStore()
const authStore = useAuthStore()

const selectedSedeId = ref<number | null>(null)
const selectedCanchaId = ref<number | null>(null)

// Sede propia del admin_sede (desde sesión o primera de la lista)
const miSedeId = computed(() => authStore.user?.sede_id ?? sedesStore.sedesActivas[0]?.id ?? null)

// ─── Modal programar partido ──────────────────────────────────
const showModal = ref(false)
const saveError = ref('')

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
  delegado_id: 0,
  arbitro_id: 0,
})

// Solo torneos que tienen al menos un partido en la sede del admin
const torneosEnMiSede = computed(() => {
  const sedeId = miSedeId.value
  if (!sedeId) return torneosStore.torneos
  const torneoIds = new Set(
    partidosStore.partidos
      .filter(p => p.sede_id === sedeId)
      .map(p => p.torneo_id),
  )
  return torneosStore.torneos.filter(t => torneoIds.has(t.id))
})

const torneoOptions = computed(() => [
  { value: null, label: 'Sin torneo' },
  ...torneosEnMiSede.value.map(t => ({ value: t.id, label: t.nombre })),
])

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

const sameTeamError = computed(() =>
  formData.value.equipo_local_id !== 0 &&
  formData.value.equipo_visitante_id !== 0 &&
  formData.value.equipo_local_id === formData.value.equipo_visitante_id,
)

const openNew = () => {
  saveError.value = ''
  formData.value = {
    torneo_id: null,
    equipo_local_id: 0,
    equipo_visitante_id: 0,
    sede_id: miSedeId.value ?? 0,
    cancha_id: 0,
    jornada: 1,
    fecha_hora: '',
    estado: 'programado',
    goles_local: 0,
    goles_visitante: 0,
    delegado_id: 0,
    arbitro_id: 0,
  }
  showModal.value = true
}

const savePartido = async () => {
  if (!formData.value.fecha_hora) return
  if (formData.value.torneo_id && (!formData.value.equipo_local_id || !formData.value.equipo_visitante_id)) return
  if (sameTeamError.value) return
  saveError.value = ''
  try {
    await partidosStore.crearPartido({ ...formData.value })
    showModal.value = false
  } catch (err: any) {
    saveError.value = err.message ?? 'Error al programar el partido'
  }
}

onMounted(async () => {
  await Promise.all([
    sedesStore.fetchSedes(),
    partidosStore.fetchPartidos(),
    equiposStore.fetchEquipos(),
    torneosStore.fetchTorneos(),
  ])
  // Fijar a la propia sede
  selectedSedeId.value = miSedeId.value
})

const sedeOptions = computed(() =>
  sedesStore.sedesActivas.map(s => ({ value: s.id, label: s.nombre })),
)

const sedeActual = computed(() =>
  selectedSedeId.value !== null ? sedesStore.obtenerPorId(selectedSedeId.value) : null,
)

const canchaOptions = computed(() => [
  { value: null, label: 'Todas las canchas' },
  ...(sedeActual.value?.canchas.map(c => ({ value: c.id, label: c.nombre })) ?? []),
])

const partidosDeSede = computed(() =>
  selectedSedeId.value !== null
    ? partidosStore.partidos.filter(p => p.sede_id === selectedSedeId.value)
    : [],
)

const partidosFiltrados = computed(() => {
  const lista = selectedCanchaId.value !== null
    ? partidosDeSede.value.filter(p => p.cancha_id === selectedCanchaId.value)
    : partidosDeSede.value
  return [...lista].sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
})

// Agrupar por fecha (YYYY-MM-DD)
const fechaKey = (iso: string) => iso.slice(0, 10)

const partidosPorFecha = computed(() => {
  const groups: Record<string, typeof partidosFiltrados.value> = {}
  for (const p of partidosFiltrados.value) {
    const k = fechaKey(p.fecha_hora)
    if (!groups[k]) groups[k] = []
    groups[k].push(p)
  }
  return groups
})

const fechasOrdenadas = computed(() => Object.keys(partidosPorFecha.value).sort())

const nombreEquipo = (id: number) => equiposStore.obtenerPorId(id)?.nombre ?? `Equipo ${id}`
const escudoEquipo = (id: number) => equiposStore.obtenerPorId(id)?.escudo_url ?? null
const nombreCancha = (canchaId: number) =>
  sedeActual.value?.canchas.find(c => c.id === canchaId)?.nombre ?? `Cancha ${canchaId}`

const formatFechaHeader = (iso: string) => {
  const fecha = new Date(iso + 'T00:00:00')
  return fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

const estadoBadge = (estado: string): 'green' | 'orange' | 'gray' | 'blue' => {
  const map: Record<string, 'green' | 'orange' | 'gray' | 'blue'> = {
    en_curso: 'green', programado: 'blue', finalizado: 'gray', suspendido: 'orange',
  }
  return map[estado] ?? 'gray'
}

const esHoy = (iso: string) => fechaKey(iso) === fechaKey(new Date().toISOString())
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Calendario</h1>
        <p class="text-matchx-text-muted mt-1">Partidos programados en la sede</p>
      </div>
      <AppButton variant="primary" @click="openNew">
        <CalendarPlus class="w-4 h-4 mr-1.5" :stroke-width="2" />
        Programar Partido
      </AppButton>
    </div>

    <!-- Filtros -->
    <AppCard :hover="false">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppSelect
          v-model="selectedSedeId"
          :options="sedeOptions"
          label="Sede"
          @update:modelValue="selectedCanchaId = null"
        />
        <AppSelect
          v-model="selectedCanchaId"
          :options="canchaOptions"
          label="Cancha"
          :disabled="!selectedSedeId"
        />
      </div>
    </AppCard>

    <!-- Empty state -->
    <div v-if="fechasOrdenadas.length === 0"
         class="flex flex-col items-center gap-3 py-16">
      <CalendarClock class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <div class="text-center">
        <p class="text-matchx-text-secondary font-medium">No hay partidos programados</p>
        <p class="text-matchx-text-muted text-sm mt-0.5">Los partidos asignados a esta sede aparecerán aquí</p>
      </div>
    </div>

    <!-- Días -->
    <div v-else class="space-y-6">
      <div v-for="fecha in fechasOrdenadas" :key="fecha">
        <!-- Header de fecha -->
        <div class="flex items-center gap-3 mb-3">
          <div class="h-px flex-1 bg-matchx-border-base/50" />
          <div class="flex items-center gap-2 shrink-0">
            <span
              :class="[
                'text-sm font-semibold capitalize',
                esHoy(fecha) ? 'text-matchx-accent-green' : 'text-matchx-text-muted',
              ]"
            >
              {{ formatFechaHeader(fecha) }}
            </span>
            <AppBadge v-if="esHoy(fecha)" variant="green" :dot="false">Hoy</AppBadge>
          </div>
          <div class="h-px flex-1 bg-matchx-border-base/50" />
        </div>

        <!-- Partidos del día -->
        <div class="space-y-2">
          <AppCard
            v-for="partido in partidosPorFecha[fecha]"
            :key="partido.id"
            :hover="false"
          >
            <div class="flex items-center gap-4">
              <!-- Equipos -->
              <div class="flex-1 flex items-center gap-3 min-w-0">
                <!-- Local -->
                <div class="flex-1 flex items-center justify-end gap-2 min-w-0">
                  <span class="font-semibold text-matchx-text-primary text-sm truncate">
                    {{ nombreEquipo(partido.equipo_local_id) }}
                  </span>
                  <img
                    v-if="escudoEquipo(partido.equipo_local_id)"
                    :src="escudoEquipo(partido.equipo_local_id)!"
                    class="w-8 h-8 rounded-md shrink-0"
                  />
                  <div v-else class="w-8 h-8 rounded-md bg-matchx-bg-elevated border border-matchx-border-base
                                     flex items-center justify-center shrink-0">
                    <Swords class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.5" />
                  </div>
                </div>

                <!-- Marcador / VS -->
                <div class="text-center px-2 shrink-0">
                  <div
                    v-if="partido.estado === 'finalizado' || partido.estado === 'en_curso'"
                    class="text-xl font-bold font-mono text-matchx-text-primary"
                  >
                    {{ partido.goles_local }} – {{ partido.goles_visitante }}
                  </div>
                  <div v-else class="text-base font-bold font-mono text-matchx-text-muted">vs</div>
                </div>

                <!-- Visitante -->
                <div class="flex-1 flex items-center gap-2 min-w-0">
                  <img
                    v-if="escudoEquipo(partido.equipo_visitante_id)"
                    :src="escudoEquipo(partido.equipo_visitante_id)!"
                    class="w-8 h-8 rounded-md shrink-0"
                  />
                  <div v-else class="w-8 h-8 rounded-md bg-matchx-bg-elevated border border-matchx-border-base
                                     flex items-center justify-center shrink-0">
                    <Swords class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.5" />
                  </div>
                  <span class="font-semibold text-matchx-text-primary text-sm truncate">
                    {{ nombreEquipo(partido.equipo_visitante_id) }}
                  </span>
                </div>
              </div>

              <!-- Meta: hora, cancha, estado -->
              <div class="flex flex-col items-end gap-1.5 shrink-0">
                <AppBadge :variant="estadoBadge(partido.estado)">{{ partido.estado }}</AppBadge>
                <div class="flex items-center gap-1 text-xs text-matchx-text-muted">
                  <Clock class="w-3 h-3" :stroke-width="1.75" />
                  {{ formatHora(partido.fecha_hora) }}
                </div>
                <div class="flex items-center gap-1 text-xs text-matchx-text-muted">
                  <MapPin class="w-3 h-3" :stroke-width="1.75" />
                  {{ nombreCancha(partido.cancha_id) }}
                </div>
              </div>
            </div>
          </AppCard>
        </div>
      </div>
    </div>
    <!-- Modal programar partido -->
    <AppModal
      :open="showModal"
      title="Programar Partido"
      size="lg"
      @update:open="showModal = $event"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <AppSelect v-model="formData.torneo_id" :options="torneoOptions" label="Torneo (opcional)" />
        </div>
        <AppSelect v-model="formData.equipo_local_id" :options="equipoOptions" label="Equipo Local" required :disabled="!formData.torneo_id" />
        <div class="space-y-1">
          <AppSelect v-model="formData.equipo_visitante_id" :options="equipoOptions" label="Equipo Visitante" required :disabled="!formData.torneo_id" />
          <p v-if="sameTeamError" class="text-xs text-matchx-accent-orange">Local y visitante no pueden ser el mismo equipo</p>
        </div>
        <AppInput v-model="formData.fecha_hora" label="Fecha y Hora" type="datetime-local" required />
        <AppInput v-model="formData.jornada" label="Jornada" type="number" />
        <AppSelect v-model="formData.sede_id" :options="sedesOptions" label="Sede" :disabled="!!miSedeId" />
        <AppSelect
          v-model="formData.cancha_id"
          :options="canchasOptions"
          label="Cancha"
          :disabled="!formData.sede_id || canchasOptions.length === 0"
        />
      </div>
      <p v-if="saveError" class="mt-3 text-sm text-matchx-accent-orange">{{ saveError }}</p>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showModal = false">Cancelar</AppButton>
          <AppButton variant="primary" @click="savePartido">Programar</AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
