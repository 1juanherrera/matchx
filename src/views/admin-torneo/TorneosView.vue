<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTorneosStore, type Torneo, type EstadoTorneo } from '@/stores/torneos'
import { useModalidadesStore } from '@/stores/modalidades'
import { useSedesStore } from '@/stores/sedes'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { Trophy, Gamepad2, CalendarRange, Gift, Users, Plus, Pencil, Trash2 } from 'lucide-vue-next'

const store = useTorneosStore()
const modalidadesStore = useModalidadesStore()
const sedesStore = useSedesStore()

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)

const formData = ref({
  nombre: '',
  descripcion: '',
  modalidad_id: 1,
  modalidad_codigo: 'F5',
  sede_id: 1,
  estado: 'programado' as EstadoTorneo,
  fecha_inicio: '',
  fecha_fin: '',
  max_equipos: 8,
  premio: '',
  imagen_url: '',
})

const estadoOptions = [
  { value: 'programado', label: 'Programado' },
  { value: 'en_curso',   label: 'En Curso' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'cancelado',  label: 'Cancelado' },
]

const modalidadOptions = computed(() =>
  modalidadesStore.modalidades.map(m => ({ value: m.id, label: `${m.nombre} (${m.codigo})` })),
)

const sedesOptions = computed(() =>
  sedesStore.sedesActivas.map(s => ({ value: s.id, label: s.nombre })),
)

const estadoBadge = (estado: string): 'green' | 'orange' | 'gray' | 'blue' => {
  const map: Record<string, 'green' | 'orange' | 'gray' | 'blue'> = {
    en_curso: 'green', programado: 'blue', finalizado: 'gray', cancelado: 'gray',
  }
  return map[estado] ?? 'gray'
}

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

onMounted(async () => {
  await Promise.all([
    store.fetchTorneos(),
    modalidadesStore.fetchModalidades(),
    sedesStore.fetchSedes(),
  ])
})

const openNew = () => {
  isEditing.value = false
  editingId.value = null
  formData.value = {
    nombre: '', descripcion: '', modalidad_id: 1, modalidad_codigo: 'F5',
    sede_id: sedesStore.sedesActivas[0]?.id ?? 1,
    estado: 'programado', fecha_inicio: '', fecha_fin: '',
    max_equipos: 8, premio: '', imagen_url: '',
  }
  showModal.value = true
}

const openEdit = (torneo: Torneo) => {
  isEditing.value = true
  editingId.value = torneo.id
  formData.value = {
    nombre: torneo.nombre,
    descripcion: torneo.descripcion,
    modalidad_id: torneo.modalidad_id,
    modalidad_codigo: torneo.modalidad_codigo,
    sede_id: torneo.sede_id,
    estado: torneo.estado,
    fecha_inicio: torneo.fecha_inicio,
    fecha_fin: torneo.fecha_fin,
    max_equipos: torneo.max_equipos,
    premio: torneo.premio,
    imagen_url: torneo.imagen_url,
  }
  showModal.value = true
}

const saveTorneo = () => {
  if (!formData.value.nombre || !formData.value.fecha_inicio || !formData.value.fecha_fin) return

  const mod = modalidadesStore.obtenerPorId(formData.value.modalidad_id)
  if (mod) formData.value.modalidad_codigo = mod.codigo

  if (isEditing.value && editingId.value !== null) {
    store.actualizarTorneo(editingId.value, { ...formData.value })
  } else {
    store.crearTorneo({ ...formData.value })
  }
  showModal.value = false
}

const deleteTorneo = (id: number) => {
  if (confirm('¿Eliminar este torneo?')) store.eliminarTorneo(id)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Torneos</h1>
        <p class="text-matchx-text-muted mt-1">Gestión de torneos</p>
      </div>
      <AppButton variant="primary" @click="openNew">
        <Plus class="w-4 h-4 mr-1.5" :stroke-width="2.5" />
        Nuevo Torneo
      </AppButton>
    </div>

    <!-- Skeleton loader -->
    <div v-if="store.loading" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
      <AppCard v-for="i in 3" :key="i" :hover="false">
        <div class="animate-pulse space-y-3">
          <div class="flex justify-between">
            <div class="h-4 bg-matchx-bg-elevated rounded w-2/3" />
            <div class="h-5 bg-matchx-bg-elevated rounded-full w-16" />
          </div>
          <div class="h-3 bg-matchx-bg-elevated rounded w-full" />
          <div class="h-px bg-matchx-border-base mt-2" />
          <div class="grid grid-cols-2 gap-2">
            <div v-for="j in 4" :key="j" class="space-y-1">
              <div class="h-2.5 bg-matchx-bg-elevated rounded w-16" />
              <div class="h-3.5 bg-matchx-bg-elevated rounded w-12" />
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <div class="h-8 bg-matchx-bg-elevated rounded flex-1" />
            <div class="h-8 bg-matchx-bg-elevated rounded w-10" />
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Empty state -->
    <div v-else-if="store.torneos.length === 0"
         class="border border-dashed border-matchx-border-base rounded-lg py-16 flex flex-col items-center gap-3">
      <Trophy class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <div class="text-center">
        <p class="text-matchx-text-secondary font-medium">No hay torneos registrados</p>
        <p class="text-matchx-text-muted text-sm mt-0.5">Crea el primer torneo para comenzar</p>
      </div>
      <AppButton variant="primary" size="sm" @click="openNew">
        <Plus class="w-3.5 h-3.5 mr-1" :stroke-width="2.5" />
        Nuevo Torneo
      </AppButton>
    </div>

    <!-- Grid de torneos -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
      <AppCard v-for="torneo in store.torneos" :key="torneo.id">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <h2 class="font-semibold text-matchx-text-primary truncate">{{ torneo.nombre }}</h2>
            <p class="text-xs text-matchx-text-muted mt-0.5 line-clamp-2">{{ torneo.descripcion }}</p>
          </div>
          <AppBadge :variant="estadoBadge(torneo.estado)" class="ml-2 shrink-0">
            {{ torneo.estado }}
          </AppBadge>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-4 border-t border-matchx-border-base pt-3">
          <div class="flex items-start gap-1.5">
            <Gamepad2 class="w-3.5 h-3.5 text-matchx-text-muted mt-0.5 shrink-0" :stroke-width="1.75" />
            <div>
              <div class="text-xs text-matchx-text-muted">Modalidad</div>
              <div class="font-medium text-matchx-accent-green text-sm">{{ torneo.modalidad_codigo }}</div>
            </div>
          </div>
          <div class="flex items-start gap-1.5">
            <Users class="w-3.5 h-3.5 text-matchx-text-muted mt-0.5 shrink-0" :stroke-width="1.75" />
            <div>
              <div class="text-xs text-matchx-text-muted">Equipos máx.</div>
              <div class="font-medium text-matchx-text-primary text-sm">{{ torneo.max_equipos }}</div>
            </div>
          </div>
          <div class="flex items-start gap-1.5">
            <CalendarRange class="w-3.5 h-3.5 text-matchx-text-muted mt-0.5 shrink-0" :stroke-width="1.75" />
            <div>
              <div class="text-xs text-matchx-text-muted">Período</div>
              <div class="text-matchx-text-secondary text-xs leading-snug">
                {{ formatFecha(torneo.fecha_inicio) }}<br />{{ formatFecha(torneo.fecha_fin) }}
              </div>
            </div>
          </div>
          <div class="flex items-start gap-1.5">
            <Gift class="w-3.5 h-3.5 text-matchx-text-muted mt-0.5 shrink-0" :stroke-width="1.75" />
            <div>
              <div class="text-xs text-matchx-text-muted">Premio</div>
              <div class="text-matchx-accent-orange font-medium text-sm">{{ torneo.premio || '—' }}</div>
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <AppButton variant="secondary" class="flex-1" size="sm" @click="openEdit(torneo)">
            <Pencil class="w-3.5 h-3.5 mr-1.5" :stroke-width="2" />
            Editar
          </AppButton>
          <AppButton variant="danger" size="sm" @click="deleteTorneo(torneo.id)" aria-label="Eliminar torneo">
            <Trash2 class="w-3.5 h-3.5" :stroke-width="2" />
          </AppButton>
        </div>
      </AppCard>
    </div>

    <!-- Modal -->
    <AppModal
      :open="showModal"
      :title="isEditing ? 'Editar Torneo' : 'Nuevo Torneo'"
      size="lg"
      @update:open="showModal = $event"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <AppInput v-model="formData.nombre" label="Nombre del torneo" placeholder="ej: Copa Bogotá F5 2026" required />
        </div>
        <div class="sm:col-span-2">
          <AppInput v-model="formData.descripcion" label="Descripción" placeholder="Descripción breve..." />
        </div>
        <AppSelect v-model="formData.modalidad_id" :options="modalidadOptions" label="Modalidad" required />
        <AppSelect v-model="formData.sede_id" :options="sedesOptions" label="Sede" required />
        <AppInput v-model="formData.fecha_inicio" label="Fecha inicio" type="date" required />
        <AppInput v-model="formData.fecha_fin" label="Fecha fin" type="date" required />
        <AppInput v-model="formData.max_equipos" label="Máx. equipos" type="number" />
        <AppInput v-model="formData.premio" label="Premio" placeholder="ej: COP 2.000.000" />
        <AppSelect v-model="formData.estado" :options="estadoOptions" label="Estado" />
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showModal = false">Cancelar</AppButton>
          <AppButton variant="primary" @click="saveTorneo">
            {{ isEditing ? 'Actualizar' : 'Crear Torneo' }}
          </AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
