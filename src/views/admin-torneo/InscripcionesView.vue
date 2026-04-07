<script setup lang="ts">
import { ref, computed, watch, onMounted, triggerRef } from 'vue'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore } from '@/stores/equipos'
import { inscripcionesService, type Inscripcion, type EstadoInscripcion } from '@/services/inscripciones.service'
import { useAuthStore } from '@/stores/auth'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { Users, Plus, UserMinus, AlertCircle, CheckCircle, XCircle } from 'lucide-vue-next'

const torneosStore  = useTorneosStore()
const equiposStore  = useEquiposStore()
const authStore     = useAuthStore()

const selectedTorneoId = ref<number | null>(null)
const inscripciones    = ref<Inscripcion[]>([])
const loadingInsc      = ref(false)
const showModal        = ref(false)
const saveError        = ref('')

const formData = ref({
  equipo_id:     0,
  observaciones: '',
})

// ── Cargar inscripciones al cambiar de torneo ───────────────────
const cargarInscripciones = async () => {
  if (!selectedTorneoId.value) return
  loadingInsc.value = true
  try {
    inscripciones.value = await inscripcionesService.getByTorneo(selectedTorneoId.value)
  } catch {
    inscripciones.value = []
  } finally {
    loadingInsc.value = false
  }
}

watch(selectedTorneoId, cargarInscripciones)

onMounted(async () => {
  await Promise.all([torneosStore.fetchTorneos(), equiposStore.fetchEquipos()])
  if (torneosStore.torneos.length > 0) {
    selectedTorneoId.value = torneosStore.torneos[0].id
  }
})

// ── Computed ────────────────────────────────────────────────────
const torneoOptions = computed(() =>
  torneosStore.torneos.map(t => ({ value: t.id, label: t.nombre })),
)

const torneoSeleccionado = computed(() =>
  selectedTorneoId.value !== null ? torneosStore.obtenerPorId(selectedTorneoId.value) : null,
)

const cuposOcupados = computed(() => inscripciones.value.filter(i => i.estado !== 'rechazada').length)
const cuposMax      = computed(() => torneoSeleccionado.value?.max_equipos ?? 0)
const estaLleno     = computed(() => cuposMax.value > 0 && cuposOcupados.value >= cuposMax.value)
const porcentajeCupos = computed(() =>
  cuposMax.value > 0 ? Math.min((cuposOcupados.value / cuposMax.value) * 100, 100) : 0,
)
const barColor = computed(() =>
  porcentajeCupos.value >= 100 ? 'bg-matchx-accent-orange'
  : porcentajeCupos.value >= 75 ? 'bg-matchx-accent-orange/70'
  : 'bg-matchx-accent-green',
)

// Equipos que aún no están inscritos (activos)
const equiposDisponibles = computed(() => {
  const inscritosIds = new Set(inscripciones.value.map(i => i.equipo_id))
  return equiposStore.equipos
    .filter(e => e.activo === 1 && !inscritosIds.has(e.id))
    .map(e => ({ value: e.id, label: e.nombre }))
})

// ── Helpers badge ───────────────────────────────────────────────
const estadoBadge = (estado: EstadoInscripcion): 'green' | 'orange' | 'gray' => {
  if (estado === 'aprobada')  return 'green'
  if (estado === 'rechazada') return 'orange'
  return 'gray'
}

const estadoLabel: Record<EstadoInscripcion, string> = {
  pendiente: 'Pendiente',
  aprobada:  'Aprobada',
  rechazada: 'Rechazada',
}

// ── Acciones ────────────────────────────────────────────────────
const openNew = () => {
  formData.value = { equipo_id: equiposDisponibles.value[0]?.value ?? 0, observaciones: '' }
  saveError.value = ''
  showModal.value = true
}

const saveInscripcion = async () => {
  if (!formData.value.equipo_id || !selectedTorneoId.value) return
  saveError.value = ''
  try {
    await inscripcionesService.create(selectedTorneoId.value, {
      equipo_id:     formData.value.equipo_id,
      observaciones: formData.value.observaciones || undefined,
    })
    showModal.value = false
    await cargarInscripciones()
  } catch (err: any) {
    saveError.value = err.response?.data?.message ?? 'Error al inscribir el equipo'
  }
}

const cambiarEstado = async (insc: Inscripcion, estado: EstadoInscripcion) => {
  try {
    if (estado === 'aprobada') {
      await inscripcionesService.aprobar(insc.id, authStore.user?.usuario_id ?? 0)
    } else if (estado === 'rechazada') {
      await inscripcionesService.rechazar(insc.id)
    }
    // Actualizar en el array y forzar reactividad con triggerRef
    const idx = inscripciones.value.findIndex(i => i.id === insc.id)
    if (idx !== -1) {
      inscripciones.value[idx] = { ...inscripciones.value[idx], estado }
      triggerRef(inscripciones)
    }
  } catch (err: any) {
    console.error('Error cambiando estado:', err)
  }
}

const retirar = async (insc: Inscripcion) => {
  if (!confirm(`¿Retirar a ${insc.equipo_nombre} del torneo?`)) return
  try {
    await inscripcionesService.delete(insc.id)
    inscripciones.value = inscripciones.value.filter(i => i.id !== insc.id)
  } catch {/* silencioso */}
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Inscripciones</h1>
        <p class="text-matchx-text-muted mt-1">Equipos inscritos por torneo</p>
      </div>

      <div class="relative group/tooltip">
        <AppButton variant="primary" :disabled="!selectedTorneoId || estaLleno" @click="openNew">
          <Plus class="w-4 h-4 mr-1.5" :stroke-width="2.5" />
          Inscribir Equipo
        </AppButton>
        <div
          v-if="estaLleno && selectedTorneoId"
          class="hidden group-hover/tooltip:flex absolute right-0 top-full mt-2 z-20
                 items-center gap-1.5 whitespace-nowrap
                 bg-matchx-bg-elevated border border-matchx-border-base rounded-lg px-3 py-2
                 text-xs text-matchx-text-secondary shadow-lg"
        >
          <AlertCircle class="w-3.5 h-3.5 text-matchx-accent-orange shrink-0" :stroke-width="2" />
          Torneo completo — máximo {{ cuposMax }} equipos
        </div>
      </div>
    </div>

    <!-- Selector torneo + progreso -->
    <AppCard :hover="false">
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div class="flex-1 w-full">
          <AppSelect v-model="selectedTorneoId" :options="torneoOptions" label="Selecciona un torneo" />
        </div>
        <div v-if="torneoSeleccionado" class="flex items-center gap-3 pb-1 shrink-0">
          <div class="text-sm text-matchx-text-muted">
            Inscritos:
            <span :class="estaLleno ? 'text-matchx-accent-orange' : 'text-matchx-accent-green'" class="font-semibold">
              {{ cuposOcupados }}{{ cuposMax > 0 ? ` / ${cuposMax}` : '' }}
            </span>
          </div>
          <AppBadge v-if="estaLleno" variant="orange">Lleno</AppBadge>
        </div>
      </div>

      <div v-if="torneoSeleccionado && cuposMax > 0" class="mt-3">
        <div class="h-2 bg-matchx-bg-elevated rounded-full overflow-hidden">
          <div :class="['h-full rounded-full transition-all duration-500', barColor]" :style="{ width: `${porcentajeCupos}%` }" />
        </div>
      </div>
    </AppCard>

    <!-- Skeleton -->
    <div v-if="loadingInsc" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AppCard v-for="i in 3" :key="i" :hover="false">
        <div class="animate-pulse space-y-3">
          <div class="flex gap-3">
            <div class="w-12 h-12 bg-matchx-bg-elevated rounded-lg shrink-0" />
            <div class="flex-1 space-y-2 pt-1">
              <div class="h-3.5 bg-matchx-bg-elevated rounded w-3/4" />
              <div class="h-2.5 bg-matchx-bg-elevated rounded w-1/2" />
            </div>
          </div>
          <div class="h-8 bg-matchx-bg-elevated rounded" />
        </div>
      </AppCard>
    </div>

    <!-- Empty -->
    <div v-else-if="inscripciones.length === 0" class="flex flex-col items-center gap-3 py-16">
      <Users class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <div class="text-center">
        <p class="text-matchx-text-secondary font-medium">No hay equipos inscritos</p>
        <p class="text-matchx-text-muted text-sm mt-0.5">Inscribe el primer equipo en este torneo</p>
      </div>
      <AppButton v-if="!estaLleno && selectedTorneoId" variant="primary" size="sm" @click="openNew">
        <Plus class="w-3.5 h-3.5 mr-1" :stroke-width="2.5" />
        Inscribir Equipo
      </AppButton>
    </div>

    <!-- Grid inscripciones -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AppCard v-for="insc in inscripciones" :key="insc.id">

        <!-- Avatar + nombre -->
        <div class="flex items-center gap-3 mb-3">
          <div
            v-if="insc.equipo_escudo_url"
            class="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-matchx-bg-elevated"
          >
            <img :src="insc.equipo_escudo_url" :alt="insc.equipo_nombre" class="w-full h-full object-cover" />
          </div>
          <div
            v-else
            class="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-lg select-none"
            :style="{ background: `linear-gradient(135deg, ${insc.equipo_color_principal || '#1a56db'}, ${insc.equipo_color_secundario || '#ffffff'})` }"
          >
            {{ insc.equipo_nombre_corto || insc.equipo_nombre.slice(0, 2).toUpperCase() }}
          </div>

          <div class="flex-1 min-w-0">
            <div class="font-semibold text-matchx-text-primary truncate">{{ insc.equipo_nombre }}</div>
            <div class="text-xs text-matchx-text-muted truncate">
              {{ insc.equipo_nombre_corto ? `(${insc.equipo_nombre_corto})` : '' }}
              {{ insc.fecha_inscripcion ? `· ${insc.fecha_inscripcion.slice(0, 10)}` : '' }}
            </div>
          </div>

          <AppBadge :variant="estadoBadge(insc.estado)" class="shrink-0">
            {{ estadoLabel[insc.estado] }}
          </AppBadge>
        </div>

        <!-- Observaciones -->
        <p v-if="insc.observaciones" class="text-xs text-matchx-text-muted mb-3 line-clamp-2">
          {{ insc.observaciones }}
        </p>

        <!-- Colores -->
        <div class="flex items-center gap-2 mb-4">
          <div class="w-4 h-4 rounded-full border border-matchx-border-base shrink-0"
               :style="{ backgroundColor: insc.equipo_color_principal || '#ccc' }" />
          <div class="w-4 h-4 rounded-full border border-matchx-border-base shrink-0"
               :style="{ backgroundColor: insc.equipo_color_secundario || '#ccc' }" />
        </div>

        <!-- Acciones por estado -->
        <div class="flex gap-2">
          <template v-if="insc.estado === 'pendiente'">
            <AppButton variant="primary" size="sm" class="flex-1" @click="cambiarEstado(insc, 'aprobada')">
              <CheckCircle class="w-3.5 h-3.5 mr-1" :stroke-width="2" /> Aprobar
            </AppButton>
            <AppButton variant="danger" size="sm" @click="cambiarEstado(insc, 'rechazada')">
              <XCircle class="w-3.5 h-3.5" :stroke-width="2" />
            </AppButton>
          </template>
          <template v-else-if="insc.estado === 'aprobada'">
            <div class="flex-1 flex items-center gap-1.5 text-xs text-matchx-accent-green font-medium px-1">
              <CheckCircle class="w-3.5 h-3.5 shrink-0" :stroke-width="2" /> Inscripción aprobada
            </div>
            <AppButton variant="danger" size="sm" @click="retirar(insc)">
              <UserMinus class="w-3.5 h-3.5" :stroke-width="2" />
            </AppButton>
          </template>
          <template v-else>
            <div class="flex-1 flex items-center gap-1.5 text-xs text-matchx-accent-orange font-medium px-1">
              <XCircle class="w-3.5 h-3.5 shrink-0" :stroke-width="2" /> Rechazada
            </div>
            <AppButton variant="danger" size="sm" @click="retirar(insc)">
              <UserMinus class="w-3.5 h-3.5" :stroke-width="2" />
            </AppButton>
          </template>
        </div>

      </AppCard>
    </div>

    <!-- Modal inscribir -->
    <AppModal :open="showModal" title="Inscribir Equipo" @update:open="showModal = $event">
      <div class="space-y-4">

        <div v-if="equiposDisponibles.length === 0" class="flex items-start gap-2 rounded-lg border border-matchx-accent-orange/30 bg-matchx-accent-orange/10 p-3">
          <AlertCircle class="w-4 h-4 text-matchx-accent-orange shrink-0 mt-0.5" :stroke-width="2" />
          <div class="text-sm text-matchx-text-secondary">
            Todos los equipos registrados ya están inscritos en este torneo.
            <br/>
            <span class="text-matchx-text-muted text-xs">Ve a <strong class="text-matchx-accent-green">Equipos</strong> para crear nuevos equipos antes de inscribirlos.</span>
          </div>
        </div>

        <template v-else>
          <AppSelect
            v-model="formData.equipo_id"
            :options="equiposDisponibles"
            label="Equipo"
            required
          />
          <div>
            <label class="text-sm font-medium text-matchx-text-secondary block mb-1.5">Observaciones (opcional)</label>
            <textarea
              v-model="formData.observaciones"
              rows="3"
              placeholder="Notas sobre la inscripción..."
              class="w-full px-3 py-2 rounded-lg bg-matchx-bg-base border border-matchx-border-base text-matchx-text-primary text-sm resize-none focus:outline-none focus:border-matchx-accent-green transition-colors"
            />
          </div>
        </template>

        <p v-if="saveError" class="text-sm text-matchx-accent-orange flex items-center gap-1.5">
          <AlertCircle class="w-3.5 h-3.5 shrink-0" :stroke-width="2" />
          {{ saveError }}
        </p>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showModal = false">Cancelar</AppButton>
          <AppButton variant="primary" :disabled="!formData.equipo_id" @click="saveInscripcion">
            Inscribir
          </AppButton>
        </div>
      </template>
    </AppModal>

  </div>
</template>
