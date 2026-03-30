<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSedesStore, type Sede, type Cancha } from '@/stores/sedes'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'

const store = useSedesStore()

// ─── UI state ────────────────────────────────────────────────
const expandedSede = ref<number | null>(null)
const showInactivas = ref(false)
const showSedeModal = ref(false)
const showCanchasModal = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const selectedSedeId = ref<number | null>(null)

// ─── Sede form ───────────────────────────────────────────────
const sedeForm = ref({
  nombre: '',
  ciudad: '',
  departamento: '',
  direccion: '',
  capacidad: 0,
  telefono: '',
  email: '',
})

const sedeFormErrors = ref({
  nombre: '',
  ciudad: '',
  departamento: '',
  direccion: '',
  email: '',
})

// ─── Cancha form ─────────────────────────────────────────────
const canchaForm = ref({
  nombre: '',
  tipo: 'pasto_sintetico' as Cancha['tipo'],
  largo_metros: 100,
  ancho_metros: 64,
  capacidad: 1000,
  disponible: true,
})

const tipoCanchaOptions = [
  { value: 'pasto_natural', label: 'Pasto Natural' },
  { value: 'pasto_sintetico', label: 'Pasto Sintético' },
  { value: 'cemento', label: 'Cemento' },
]

// ─── Computed ────────────────────────────────────────────────
const sedesVisibles = computed(() => {
  return showInactivas.value ? store.sedes : store.sedesActivas
})

const selectedSede = computed(() =>
  selectedSedeId.value !== null ? store.obtenerPorId(selectedSedeId.value) : null,
)

// ─── Sede CRUD ───────────────────────────────────────────────
const openNewSedeModal = () => {
  isEditing.value = false
  editingId.value = null
  sedeForm.value = {
    nombre: '',
    ciudad: '',
    departamento: '',
    direccion: '',
    capacidad: 0,
    telefono: '',
    email: '',
  }
  sedeFormErrors.value = { nombre: '', ciudad: '', departamento: '', direccion: '', email: '' }
  showSedeModal.value = true
}

const openEditSedeModal = (sede: Sede) => {
  isEditing.value = true
  editingId.value = sede.id
  sedeForm.value = {
    nombre: sede.nombre,
    ciudad: sede.ciudad,
    departamento: sede.departamento,
    direccion: sede.direccion,
    capacidad: sede.capacidad,
    telefono: sede.telefono,
    email: sede.email,
  }
  sedeFormErrors.value = { nombre: '', ciudad: '', departamento: '', direccion: '', email: '' }
  showSedeModal.value = true
}

const validateSedeForm = () => {
  let valid = true
  sedeFormErrors.value = { nombre: '', ciudad: '', departamento: '', direccion: '', email: '' }

  if (!sedeForm.value.nombre.trim()) {
    sedeFormErrors.value.nombre = 'El nombre es requerido'
    valid = false
  }
  if (!sedeForm.value.ciudad.trim()) {
    sedeFormErrors.value.ciudad = 'La ciudad es requerida'
    valid = false
  }
  if (!sedeForm.value.departamento.trim()) {
    sedeFormErrors.value.departamento = 'El departamento es requerido'
    valid = false
  }
  if (!sedeForm.value.direccion.trim()) {
    sedeFormErrors.value.direccion = 'La dirección es requerida'
    valid = false
  }
  if (sedeForm.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sedeForm.value.email)) {
    sedeFormErrors.value.email = 'Correo inválido'
    valid = false
  }
  return valid
}

const saveSede = () => {
  if (!validateSedeForm()) return

  if (isEditing.value && editingId.value !== null) {
    store.actualizarSede(editingId.value, { ...sedeForm.value })
  } else {
    store.crearSede({
      ...sedeForm.value,
      activo: 1,
      canchas: [],
    })
  }
  showSedeModal.value = false
}

const toggleActivoSede = (sede: Sede) => {
  store.actualizarSede(sede.id, { activo: sede.activo === 1 ? 0 : 1 })
}

// ─── Canchas ─────────────────────────────────────────────────
const openCanchasModal = (sede: Sede) => {
  selectedSedeId.value = sede.id
  canchaForm.value = {
    nombre: '',
    tipo: 'pasto_sintetico',
    largo_metros: 100,
    ancho_metros: 64,
    capacidad: 1000,
    disponible: true,
  }
  showCanchasModal.value = true
}

const addCancha = () => {
  if (!canchaForm.value.nombre.trim() || selectedSedeId.value === null) return
  store.agregarCancha(selectedSedeId.value, { ...canchaForm.value })
  canchaForm.value = {
    nombre: '',
    tipo: 'pasto_sintetico',
    largo_metros: 100,
    ancho_metros: 64,
    capacidad: 1000,
    disponible: true,
  }
}

const removeCancha = (sedeId: number, canchaId: number) => {
  store.eliminarCancha(sedeId, canchaId)
}

const toggleDisponible = (sedeId: number, cancha: Cancha) => {
  const sede = store.obtenerPorId(sedeId)
  if (!sede) return
  const idx = sede.canchas.findIndex(c => c.id === cancha.id)
  if (idx === -1) return
  sede.canchas[idx] = { ...cancha, disponible: !cancha.disponible }
}

const tipoCanchaLabel = (tipo: Cancha['tipo']) => {
  const labels = {
    pasto_natural: 'Natural',
    pasto_sintetico: 'Sintético',
    cemento: 'Cemento',
  }
  return labels[tipo]
}

onMounted(() => {
  store.fetchSedes()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Sedes</h1>
        <p class="text-matchx-text-muted mt-1">Gestión de sedes y canchas</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Toggle inactivas -->
        <button
          :class="[
            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors duration-150 cursor-pointer',
            showInactivas
              ? 'bg-matchx-accent-green/10 border-matchx-accent-green/40 text-matchx-accent-green'
              : 'bg-matchx-bg-surface border-matchx-border-base text-matchx-text-muted hover:text-matchx-text-primary',
          ]"
          @click="showInactivas = !showInactivas"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
          Ver inactivas
        </button>
        <AppButton variant="primary" @click="openNewSedeModal">
          + Nueva Sede
        </AppButton>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="text-center py-12">
      <svg class="animate-spin h-8 w-8 text-matchx-accent-green mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>

    <!-- Empty state -->
    <AppCard v-else-if="sedesVisibles.length === 0">
      <div class="text-center py-8">
        <svg class="w-12 h-12 text-matchx-text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p class="text-matchx-text-muted">No hay sedes registradas</p>
        <AppButton variant="primary" class="mt-4" @click="openNewSedeModal">
          Crear primera sede
        </AppButton>
      </div>
    </AppCard>

    <!-- Sedes Grid -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AppCard
        v-for="sede in sedesVisibles"
        :key="sede.id"
        :class="sede.activo === 0 && 'opacity-60'"
      >
        <!-- Header -->
        <div class="flex items-start justify-between mb-4 pb-4 border-b border-matchx-border-base">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-semibold text-matchx-text-primary truncate">{{ sede.nombre }}</h2>
              <AppBadge v-if="sede.activo === 0" variant="gray" :pulse="false">Inactiva</AppBadge>
            </div>
            <p class="text-sm text-matchx-text-muted mt-0.5">{{ sede.ciudad }}, {{ sede.departamento }}</p>
            <p class="text-xs text-matchx-text-muted mt-0.5">{{ sede.direccion }}</p>
          </div>
          <AppBadge variant="green" class="ml-3 shrink-0">
            {{ sede.canchas.length }} canchas
          </AppBadge>
        </div>

        <!-- Info -->
        <div class="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-matchx-border-base text-sm">
          <div>
            <div class="text-xs text-matchx-text-muted mb-0.5">Capacidad</div>
            <div class="font-semibold text-matchx-accent-green">{{ sede.capacidad.toLocaleString() }}</div>
          </div>
          <div>
            <div class="text-xs text-matchx-text-muted mb-0.5">Teléfono</div>
            <div class="text-matchx-text-primary">{{ sede.telefono || '—' }}</div>
          </div>
          <div class="col-span-2">
            <div class="text-xs text-matchx-text-muted mb-0.5">Correo</div>
            <div class="text-matchx-text-primary truncate">{{ sede.email || '—' }}</div>
          </div>
        </div>

        <!-- Canchas expandibles -->
        <div class="mb-4">
          <button
            class="flex items-center justify-between w-full text-sm font-medium text-matchx-text-secondary hover:text-matchx-accent-green transition-colors duration-150 cursor-pointer"
            @click="expandedSede = expandedSede === sede.id ? null : sede.id"
          >
            <span>Canchas ({{ sede.canchas.length }})</span>
            <svg
              :class="['w-4 h-4 transition-transform duration-150', expandedSede === sede.id && 'rotate-180']"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div v-if="expandedSede === sede.id" class="mt-2 space-y-2">
            <div
              v-if="sede.canchas.length === 0"
              class="text-center py-3 text-xs text-matchx-text-muted bg-matchx-bg-base/30 rounded-lg"
            >
              Sin canchas registradas
            </div>
            <div
              v-for="cancha in sede.canchas"
              :key="cancha.id"
              class="p-3 rounded-lg bg-matchx-bg-base/30 border border-matchx-border-base/30 flex items-center justify-between gap-2"
            >
              <div class="flex-1 min-w-0">
                <div class="font-medium text-matchx-text-primary text-sm truncate">{{ cancha.nombre }}</div>
                <div class="text-xs text-matchx-text-muted mt-0.5">
                  {{ tipoCanchaLabel(cancha.tipo) }} · {{ cancha.largo_metros }}×{{ cancha.ancho_metros }}m
                </div>
              </div>
              <AppBadge :variant="cancha.disponible ? 'green' : 'orange'" :dot="false" class="shrink-0">
                {{ cancha.disponible ? 'Disponible' : 'Ocupada' }}
              </AppBadge>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <AppButton variant="secondary" class="flex-1" @click="openEditSedeModal(sede)">
            Editar
          </AppButton>
          <AppButton variant="secondary" class="flex-1" @click="openCanchasModal(sede)">
            Canchas
          </AppButton>
          <AppButton
            :variant="sede.activo === 1 ? 'danger' : 'ghost'"
            size="sm"
            @click="toggleActivoSede(sede)"
          >
            {{ sede.activo === 1 ? 'Desactivar' : 'Activar' }}
          </AppButton>
        </div>
      </AppCard>
    </div>

    <!-- ── Modal Crear / Editar Sede ────────────────────────── -->
    <AppModal
      :open="showSedeModal"
      :title="isEditing ? 'Editar Sede' : 'Nueva Sede'"
      size="lg"
      @update:open="showSedeModal = $event"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">
          <AppInput
            v-model="sedeForm.nombre"
            label="Nombre de la sede"
            placeholder="ej: Estadio El Campín"
            required
            :error="sedeFormErrors.nombre"
          />
        </div>
        <AppInput
          v-model="sedeForm.ciudad"
          label="Ciudad"
          placeholder="ej: Bogotá"
          required
          :error="sedeFormErrors.ciudad"
        />
        <AppInput
          v-model="sedeForm.departamento"
          label="Departamento"
          placeholder="ej: Cundinamarca"
          required
          :error="sedeFormErrors.departamento"
        />
        <div class="sm:col-span-2">
          <AppInput
            v-model="sedeForm.direccion"
            label="Dirección"
            placeholder="ej: Carrera 30 No. 57-60"
            required
            :error="sedeFormErrors.direccion"
          />
        </div>
        <AppInput
          v-model="sedeForm.capacidad"
          label="Capacidad"
          type="number"
          placeholder="ej: 5000"
        />
        <AppInput
          v-model="sedeForm.telefono"
          label="Teléfono"
          type="tel"
          placeholder="ej: +573001234567"
        />
        <div class="sm:col-span-2">
          <AppInput
            v-model="sedeForm.email"
            label="Correo electrónico"
            type="email"
            placeholder="ej: info@sede.com"
            :error="sedeFormErrors.email"
          />
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showSedeModal = false">Cancelar</AppButton>
          <AppButton variant="primary" @click="saveSede">
            {{ isEditing ? 'Actualizar' : 'Crear Sede' }}
          </AppButton>
        </div>
      </template>
    </AppModal>

    <!-- ── Modal Gestión de Canchas ─────────────────────────── -->
    <AppModal
      :open="showCanchasModal"
      :title="selectedSede ? `Canchas — ${selectedSede.nombre}` : 'Canchas'"
      size="lg"
      @update:open="showCanchasModal = $event"
    >
      <div class="space-y-5">
        <!-- Lista de canchas existentes -->
        <div class="space-y-2">
          <div
            v-if="!selectedSede || selectedSede.canchas.length === 0"
            class="text-center py-4 text-sm text-matchx-text-muted bg-matchx-bg-base/30 rounded-lg"
          >
            No hay canchas registradas para esta sede
          </div>
          <div
            v-for="cancha in selectedSede?.canchas"
            :key="cancha.id"
            class="flex items-center gap-3 p-3 rounded-lg bg-matchx-bg-base/30 border border-matchx-border-base/30 group"
          >
            <div class="flex-1 min-w-0">
              <div class="font-medium text-matchx-text-primary text-sm">{{ cancha.nombre }}</div>
              <div class="text-xs text-matchx-text-muted mt-0.5">
                {{ tipoCanchaLabel(cancha.tipo) }} · {{ cancha.largo_metros }}×{{ cancha.ancho_metros }}m · cap. {{ cancha.capacidad.toLocaleString() }}
              </div>
            </div>
            <button
              :class="[
                'text-xs px-2.5 py-1 rounded-full border transition-colors duration-150 cursor-pointer shrink-0',
                cancha.disponible
                  ? 'text-matchx-accent-green border-matchx-accent-green/30 hover:bg-matchx-accent-green/10'
                  : 'text-matchx-accent-orange border-matchx-accent-orange/30 hover:bg-matchx-accent-orange/10',
              ]"
              @click="selectedSedeId !== null && toggleDisponible(selectedSedeId, cancha)"
            >
              {{ cancha.disponible ? 'Disponible' : 'Ocupada' }}
            </button>
            <button
              class="text-matchx-text-muted hover:text-matchx-accent-orange transition-colors duration-150 cursor-pointer opacity-0 group-hover:opacity-100"
              title="Eliminar cancha"
              @click="selectedSedeId !== null && removeCancha(selectedSedeId, cancha.id)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Formulario agregar cancha -->
        <div class="border-t border-matchx-border-base pt-4 space-y-3">
          <h3 class="text-sm font-semibold text-matchx-text-secondary">Agregar cancha</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <AppInput
                v-model="canchaForm.nombre"
                label="Nombre"
                placeholder="ej: Cancha Principal"
              />
            </div>
            <AppSelect
              v-model="canchaForm.tipo"
              :options="tipoCanchaOptions"
              label="Tipo de superficie"
            />
            <AppInput
              v-model="canchaForm.capacidad"
              label="Capacidad (espectadores)"
              type="number"
              placeholder="ej: 1000"
            />
            <AppInput
              v-model="canchaForm.largo_metros"
              label="Largo (metros)"
              type="number"
              placeholder="ej: 100"
            />
            <AppInput
              v-model="canchaForm.ancho_metros"
              label="Ancho (metros)"
              type="number"
              placeholder="ej: 64"
            />
          </div>
          <AppButton
            variant="primary"
            :disabled="!canchaForm.nombre.trim()"
            @click="addCancha"
          >
            + Agregar cancha
          </AppButton>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <AppButton variant="secondary" @click="showCanchasModal = false">Cerrar</AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
