<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore, type Equipo } from '@/stores/equipos'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { Users, Plus, Pencil, UserMinus, AlertCircle } from 'lucide-vue-next'

const torneosStore = useTorneosStore()
const equiposStore = useEquiposStore()

const selectedTorneoId = ref<number | null>(null)
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)

const formData = ref({
  nombre: '',
  ciudad: '',
  colores: '#1a56db,#ffffff',
})

onMounted(async () => {
  await Promise.all([torneosStore.fetchTorneos(), equiposStore.fetchEquipos()])
  if (torneosStore.torneos.length > 0) {
    selectedTorneoId.value = torneosStore.torneos[0].id
  }
})

const torneoOptions = computed(() =>
  torneosStore.torneos.map(t => ({ value: t.id, label: t.nombre })),
)

const equiposDelTorneo = computed(() =>
  selectedTorneoId.value !== null
    ? equiposStore.equiposPorTorneo(selectedTorneoId.value)
    : [],
)

const torneoSeleccionado = computed(() =>
  selectedTorneoId.value !== null ? torneosStore.obtenerPorId(selectedTorneoId.value) : null,
)

const cuposOcupados = computed(() => equiposDelTorneo.value.length)
const cuposMax = computed(() => torneoSeleccionado.value?.max_equipos ?? 0)
const estaLleno = computed(() => cuposOcupados.value >= cuposMax.value)
const porcentajeCupos = computed(() =>
  cuposMax.value > 0 ? Math.min((cuposOcupados.value / cuposMax.value) * 100, 100) : 0,
)
const barColor = computed(() =>
  porcentajeCupos.value >= 100
    ? 'bg-matchx-accent-orange'
    : porcentajeCupos.value >= 75
      ? 'bg-matchx-accent-orange/70'
      : 'bg-matchx-accent-green',
)

const openNew = () => {
  isEditing.value = false
  editingId.value = null
  formData.value = { nombre: '', ciudad: '', colores: '#1a56db,#ffffff' }
  showModal.value = true
}

const openEdit = (equipo: Equipo) => {
  isEditing.value = true
  editingId.value = equipo.id
  formData.value = { nombre: equipo.nombre, ciudad: equipo.ciudad, colores: equipo.colores }
  showModal.value = true
}

const saveEquipo = () => {
  if (!formData.value.nombre.trim() || selectedTorneoId.value === null) return

  if (isEditing.value && editingId.value !== null) {
    equiposStore.actualizarEquipo(editingId.value, { ...formData.value })
  } else {
    equiposStore.crearEquipo({
      ...formData.value,
      torneo_id: selectedTorneoId.value,
      escudo_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${formData.value.nombre.replace(/\s/g, '')}`,
      activo: 1,
    })
  }
  showModal.value = false
}

const deleteEquipo = (id: number) => {
  if (confirm('¿Retirar este equipo del torneo?')) equiposStore.eliminarEquipo(id)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Inscripciones</h1>
        <p class="text-matchx-text-muted mt-1">Equipos inscritos por torneo</p>
      </div>

      <!-- Botón con tooltip cuando está lleno -->
      <div class="relative group/tooltip">
        <AppButton
          variant="primary"
          :disabled="!selectedTorneoId || estaLleno"
          @click="openNew"
        >
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

    <!-- Selector de torneo + progreso -->
    <AppCard :hover="false">
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div class="flex-1 w-full">
          <AppSelect
            v-model="selectedTorneoId"
            :options="torneoOptions"
            label="Selecciona un torneo"
          />
        </div>
        <div v-if="torneoSeleccionado" class="flex items-center gap-3 pb-1 shrink-0">
          <div class="text-sm text-matchx-text-muted">
            Cupos:
            <span
              :class="estaLleno ? 'text-matchx-accent-orange' : 'text-matchx-accent-green'"
              class="font-semibold"
            >
              {{ cuposOcupados }} / {{ cuposMax }}
            </span>
          </div>
          <AppBadge v-if="estaLleno" variant="orange">Lleno</AppBadge>
        </div>
      </div>

      <!-- Barra de progreso -->
      <div v-if="torneoSeleccionado" class="mt-3">
        <div class="h-2 bg-matchx-bg-elevated rounded-full overflow-hidden">
          <div
            :class="['h-full rounded-full transition-all duration-500', barColor]"
            :style="{ width: `${porcentajeCupos}%` }"
          />
        </div>
      </div>
    </AppCard>

    <!-- Empty state -->
    <div v-if="equiposDelTorneo.length === 0" class="flex flex-col items-center gap-3 py-16">
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

    <!-- Grid de equipos -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AppCard v-for="equipo in equiposDelTorneo" :key="equipo.id">
        <div class="flex items-center gap-3 mb-3">
          <img
            :src="equipo.escudo_url"
            :alt="equipo.nombre"
            class="w-12 h-12 rounded-lg bg-matchx-bg-elevated"
          />
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-matchx-text-primary truncate">{{ equipo.nombre }}</div>
            <div class="text-xs text-matchx-text-muted">{{ equipo.ciudad }}</div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 mb-4">
          <div
            v-for="(color, i) in equipo.colores.split(',')"
            :key="i"
            class="w-5 h-5 rounded-full border border-matchx-border-base"
            :style="{ backgroundColor: color.trim() }"
            :title="color.trim()"
          />
          <span class="text-xs text-matchx-text-muted ml-1">Colores</span>
        </div>

        <div class="flex gap-2">
          <AppButton variant="secondary" class="flex-1" size="sm" @click="openEdit(equipo)">
            <Pencil class="w-3.5 h-3.5 mr-1.5" :stroke-width="2" />
            Editar
          </AppButton>
          <AppButton variant="danger" size="sm" @click="deleteEquipo(equipo.id)" aria-label="Retirar equipo">
            <UserMinus class="w-3.5 h-3.5" :stroke-width="2" />
          </AppButton>
        </div>
      </AppCard>
    </div>

    <!-- Modal -->
    <AppModal
      :open="showModal"
      :title="isEditing ? 'Editar Equipo' : 'Inscribir Equipo'"
      @update:open="showModal = $event"
    >
      <div class="space-y-4">
        <AppInput v-model="formData.nombre" label="Nombre del equipo" placeholder="ej: Águilas FC" required />
        <AppInput v-model="formData.ciudad" label="Ciudad" placeholder="ej: Bogotá" />
        <div>
          <label class="text-sm font-medium text-matchx-text-secondary block mb-1.5">
            Colores (hex separados por coma)
          </label>
          <AppInput v-model="formData.colores" placeholder="ej: #1a56db,#ffffff" />
          <div class="flex gap-2 mt-2">
            <div
              v-for="(color, i) in formData.colores.split(',')"
              :key="i"
              class="w-6 h-6 rounded-full border border-matchx-border-base"
              :style="{ backgroundColor: color.trim() }"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showModal = false">Cancelar</AppButton>
          <AppButton variant="primary" @click="saveEquipo">
            {{ isEditing ? 'Actualizar' : 'Inscribir' }}
          </AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
