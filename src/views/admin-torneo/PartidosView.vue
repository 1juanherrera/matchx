<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePartidosStore, type Partido, type EstadoPartido } from '@/stores/partidos'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore } from '@/stores/equipos'
import { useSedesStore } from '@/stores/sedes'
import { useAuthStore } from '@/stores/auth'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { CalendarPlus, Calendar, Clock, Trash2, Pencil, Swords } from 'lucide-vue-next'

const partidosStore = usePartidosStore()
const torneosStore = useTorneosStore()
const equiposStore = useEquiposStore()
const sedesStore = useSedesStore()
const authStore = useAuthStore()

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
]

const estadoBadge = (estado: string): 'green' | 'orange' | 'gray' | 'blue' => {
  const map: Record<string, 'green' | 'orange' | 'gray' | 'blue'> = {
    en_curso: 'green', programado: 'blue', finalizado: 'gray', suspendido: 'orange',
  }
  return map[estado] ?? 'gray'
}

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
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Partidos</h1>
        <p class="text-matchx-text-muted mt-1">Calendario y programación</p>
      </div>
      <AppButton variant="primary" :disabled="!selectedTorneoId" @click="openNew">
        <CalendarPlus class="w-4 h-4 mr-1.5" :stroke-width="2" />
        Programar Partido
      </AppButton>
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
              <AppButton variant="secondary" size="sm" @click="openEdit(partido)" aria-label="Editar partido">
                <Pencil class="w-3.5 h-3.5" :stroke-width="2" />
              </AppButton>
              <AppButton variant="danger" size="sm" @click="deletePartido(partido.id)" aria-label="Eliminar partido">
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
</template>
