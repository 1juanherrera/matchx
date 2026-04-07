<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSedesStore, type Cancha } from '@/stores/sedes'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { Building2, Plus, Pencil, Trash2, CheckCircle2, XCircle, Maximize2, Users } from 'lucide-vue-next'

const sedesStore = useSedesStore()

const selectedSedeId = ref<number | null>(null)
const showModal = ref(false)
const isEditing = ref(false)
const editingCanchaId = ref<number | null>(null)

const formData = ref({
  nombre: '',
  tipo: 'sintetica' as Cancha['tipo'],
  largo_metros: 105,
  ancho_metros: 68,
  capacidad: '',
  disponible: true,
})

const tipoOptions = [
  { value: 'sintetica', label: 'Sintética' },
  { value: 'natural',   label: 'Natural' },
  { value: 'cemento',   label: 'Cemento' },
  { value: 'otro',      label: 'Otro' },
]

onMounted(async () => {
  await sedesStore.fetchSedes()
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

const tipoLabel = (tipo: Cancha['tipo']) => ({
  sintetica: 'Sintética', natural: 'Natural', cemento: 'Cemento', otro: 'Otro',
}[tipo])

const tipoBadge = (tipo: Cancha['tipo']): 'green' | 'blue' | 'orange' => ({
  sintetica: 'blue' as const, natural: 'green' as const, cemento: 'orange' as const, otro: 'gray' as const,
}[tipo])

const openNew = () => {
  isEditing.value = false
  editingCanchaId.value = null
  formData.value = {
    nombre: '', tipo: 'sintetica',
    largo_metros: 105, ancho_metros: 68, capacidad: '', disponible: true,
  }
  showModal.value = true
}

const openEdit = (cancha: Cancha) => {
  isEditing.value = true
  editingCanchaId.value = cancha.id
  formData.value = {
    nombre: cancha.nombre,
    tipo: cancha.tipo,
    largo_metros: cancha.largo_metros,
    ancho_metros: cancha.ancho_metros,
    capacidad: cancha.capacidad,
    disponible: cancha.disponible,
  }
  showModal.value = true
}

const saveCancha = () => {
  if (!formData.value.nombre.trim() || selectedSedeId.value === null) return

  if (isEditing.value && editingCanchaId.value !== null) {
    sedesStore.actualizarCancha(selectedSedeId.value, editingCanchaId.value, { ...formData.value })
  } else {
    sedesStore.agregarCancha(selectedSedeId.value, { ...formData.value })
  }
  showModal.value = false
}

const toggleDisponible = (cancha: Cancha) => {
  if (selectedSedeId.value === null) return
  sedesStore.actualizarCancha(selectedSedeId.value, cancha.id, { disponible: !cancha.disponible })
}

const deleteCancha = (canchaId: number) => {
  if (selectedSedeId.value === null) return
  if (confirm('¿Eliminar esta cancha?')) {
    sedesStore.eliminarCancha(selectedSedeId.value, canchaId)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Canchas</h1>
        <p class="text-matchx-text-muted mt-1">Gestión de canchas por sede</p>
      </div>
      <AppButton variant="primary" :disabled="!selectedSedeId" @click="openNew">
        <Plus class="w-4 h-4 mr-1.5" :stroke-width="2.5" />
        Nueva Cancha
      </AppButton>
    </div>

    <!-- Selector sede -->
    <AppCard :hover="false">
      <AppSelect v-model="selectedSedeId" :options="sedeOptions" label="Sede" />
    </AppCard>

    <!-- Empty state -->
    <div v-if="!sedeActual?.canchas.length"
         class="border border-dashed border-matchx-border-base rounded-lg py-16 flex flex-col items-center gap-3">
      <Building2 class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <div class="text-center">
        <p class="text-matchx-text-secondary font-medium">No hay canchas registradas</p>
        <p class="text-matchx-text-muted text-sm mt-0.5">Agrega la primera cancha a esta sede</p>
      </div>
      <AppButton variant="primary" size="sm" @click="openNew">
        <Plus class="w-3.5 h-3.5 mr-1" :stroke-width="2.5" />
        Nueva Cancha
      </AppButton>
    </div>

    <!-- Grid de canchas -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <AppCard v-for="cancha in sedeActual?.canchas" :key="cancha.id">
        <!-- Header: nombre + disponibilidad -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <h2 class="font-semibold text-matchx-text-primary truncate">{{ cancha.nombre }}</h2>
            <AppBadge :variant="tipoBadge(cancha.tipo)" :dot="false" class="mt-1 text-xs">
              {{ tipoLabel(cancha.tipo) }}
            </AppBadge>
          </div>
          <!-- Toggle disponibilidad -->
          <button
            @click="toggleDisponible(cancha)"
            :class="[
              'ml-3 shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
              cancha.disponible
                ? 'bg-matchx-accent-green/10 text-matchx-accent-green hover:bg-matchx-accent-green/20'
                : 'bg-matchx-accent-orange/10 text-matchx-accent-orange hover:bg-matchx-accent-orange/20',
            ]"
          >
            <CheckCircle2 v-if="cancha.disponible" class="w-3.5 h-3.5" :stroke-width="2" />
            <XCircle v-else class="w-3.5 h-3.5" :stroke-width="2" />
            {{ cancha.disponible ? 'Disponible' : 'No disponible' }}
          </button>
        </div>

        <!-- Datos -->
        <div class="grid grid-cols-2 gap-2 mb-4 pt-3 border-t border-matchx-border-base">
          <div class="flex items-start gap-1.5">
            <Maximize2 class="w-3.5 h-3.5 text-matchx-text-muted mt-0.5 shrink-0" :stroke-width="1.75" />
            <div>
              <div class="text-xs text-matchx-text-muted">Dimensiones</div>
              <div class="text-sm font-medium text-matchx-text-primary">
                {{ cancha.largo_metros }}×{{ cancha.ancho_metros }} m
              </div>
            </div>
          </div>
          <div class="flex items-start gap-1.5">
            <Users class="w-3.5 h-3.5 text-matchx-text-muted mt-0.5 shrink-0" :stroke-width="1.75" />
            <div>
              <div class="text-xs text-matchx-text-muted">Capacidad</div>
              <div class="text-sm font-medium text-matchx-text-primary">
                {{ cancha.capacidad || '—' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones -->
        <div class="flex gap-2">
          <AppButton variant="secondary" class="flex-1" size="sm" @click="openEdit(cancha)">
            <Pencil class="w-3.5 h-3.5 mr-1.5" :stroke-width="2" />
            Editar
          </AppButton>
          <AppButton variant="danger" size="sm" @click="deleteCancha(cancha.id)" aria-label="Eliminar cancha">
            <Trash2 class="w-3.5 h-3.5" :stroke-width="2" />
          </AppButton>
        </div>
      </AppCard>
    </div>

    <!-- Modal -->
    <AppModal
      :open="showModal"
      :title="isEditing ? 'Editar Cancha' : 'Nueva Cancha'"
      @update:open="showModal = $event"
    >
      <div class="space-y-4">
        <AppInput v-model="formData.nombre" label="Nombre" placeholder="ej: Cancha Principal" required />
        <AppSelect v-model="formData.tipo" :options="tipoOptions" label="Tipo de superficie" />
        <div class="grid grid-cols-2 gap-3">
          <AppInput v-model="formData.largo_metros" label="Largo (m)" type="number" />
          <AppInput v-model="formData.ancho_metros" label="Ancho (m)" type="number" />
        </div>
        <AppInput v-model="formData.capacidad" label="Capacidad" placeholder="ej: 6x6" />
        <div class="flex items-center gap-3">
          <label class="text-sm font-medium text-matchx-text-secondary">Disponible</label>
          <button
            type="button"
            @click="formData.disponible = !formData.disponible"
            :class="[
              'relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none',
              formData.disponible ? 'bg-matchx-accent-green' : 'bg-matchx-border-base',
            ]"
          >
            <span
              :class="[
                'inline-block w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
                formData.disponible ? 'translate-x-6' : 'translate-x-1',
              ]"
            />
          </button>
          <span class="text-sm text-matchx-text-muted">
            {{ formData.disponible ? 'Sí' : 'No' }}
          </span>
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showModal = false">Cancelar</AppButton>
          <AppButton variant="primary" @click="saveCancha">
            {{ isEditing ? 'Actualizar' : 'Agregar' }}
          </AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
