<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useEquiposStore } from '@/stores/equipos'
import { useJugadoresStore, type Jugador, type Posicion } from '@/stores/jugadores'
import { useTorneosStore } from '@/stores/torneos'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { UserRound, Search, Plus, Pencil, Trash2, Users } from 'lucide-vue-next'

const torneosStore = useTorneosStore()
const equiposStore = useEquiposStore()
const jugadoresStore = useJugadoresStore()

const selectedTorneoId = ref<number | null>(null)
const selectedEquipoId = ref<number | null>(null)
const searchQuery = ref('')
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)

const formData = ref({
  nombre: '',
  apellido: '',
  numero_camiseta: 1,
  posicion: 'mediocampo' as Posicion,
})

const posicionOptions = [
  { value: 'portero',    label: 'Portero' },
  { value: 'defensa',    label: 'Defensa' },
  { value: 'mediocampo', label: 'Mediocampo' },
  { value: 'delantero',  label: 'Delantero' },
]

const posicionBadge = (pos: Posicion): 'green' | 'blue' | 'orange' | 'gray' => {
  const map: Record<Posicion, 'green' | 'blue' | 'orange' | 'gray'> = {
    portero: 'orange', defensa: 'blue', mediocampo: 'green', delantero: 'orange',
  }
  return map[pos] ?? 'gray'
}

// Color rotation for avatar based on id
const avatarColors = [
  'bg-matchx-accent-green/20 text-matchx-accent-green',
  'bg-matchx-accent-orange/20 text-matchx-accent-orange',
  'bg-blue-500/20 text-blue-400',
  'bg-purple-500/20 text-purple-400',
]
const avatarColor = (id: number) => avatarColors[id % 4]
const initiales = (nombre: string, apellido: string) =>
  `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()

onMounted(async () => {
  await Promise.all([
    torneosStore.fetchTorneos(),
    equiposStore.fetchEquipos(),
    jugadoresStore.fetchJugadores(),
  ])
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

const equipoOptions = computed(() =>
  equiposDelTorneo.value.map(e => ({ value: e.id, label: e.nombre })),
)

const jugadoresDelEquipo = computed(() =>
  selectedEquipoId.value !== null
    ? jugadoresStore.jugadoresPorEquipo(selectedEquipoId.value)
    : [],
)

const showSearch = computed(() => jugadoresDelEquipo.value.length > 4)

const jugadoresFiltrados = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const lista = jugadoresDelEquipo.value.sort((a, b) => a.numero_camiseta - b.numero_camiseta)
  if (!q) return lista
  return lista.filter(j =>
    `${j.nombre} ${j.apellido}`.toLowerCase().includes(q) ||
    String(j.numero_camiseta).includes(q),
  )
})

const equipoSeleccionado = computed(() =>
  selectedEquipoId.value !== null ? equiposStore.obtenerPorId(selectedEquipoId.value) : null,
)

const openNew = () => {
  isEditing.value = false
  editingId.value = null
  formData.value = { nombre: '', apellido: '', numero_camiseta: 1, posicion: 'mediocampo' }
  showModal.value = true
}

const openEdit = (jugador: Jugador) => {
  isEditing.value = true
  editingId.value = jugador.id
  formData.value = {
    nombre: jugador.nombre,
    apellido: jugador.apellido,
    numero_camiseta: jugador.numero_camiseta,
    posicion: jugador.posicion,
  }
  showModal.value = true
}

const saveJugador = () => {
  if (!formData.value.nombre.trim() || selectedEquipoId.value === null) return

  if (isEditing.value && editingId.value !== null) {
    jugadoresStore.actualizarJugador(editingId.value, { ...formData.value })
  } else {
    jugadoresStore.crearJugador({
      ...formData.value,
      equipo_id: selectedEquipoId.value,
      activo: 1,
    })
  }
  showModal.value = false
}

const deleteJugador = (id: number) => {
  if (confirm('¿Eliminar este jugador?')) jugadoresStore.eliminarJugador(id)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Plantilla</h1>
        <p class="text-matchx-text-muted mt-1">Jugadores por equipo</p>
      </div>
      <AppButton
        variant="primary"
        :disabled="!selectedEquipoId"
        @click="openNew"
      >
        <Plus class="w-4 h-4 mr-1.5" :stroke-width="2.5" />
        Agregar Jugador
      </AppButton>
    </div>

    <!-- Filtros -->
    <AppCard :hover="false">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppSelect
          v-model="selectedTorneoId"
          :options="torneoOptions"
          label="Torneo"
          @update:modelValue="selectedEquipoId = null; searchQuery = ''"
        />
        <AppSelect
          v-model="selectedEquipoId"
          :options="equipoOptions"
          label="Equipo"
          :disabled="!selectedTorneoId || equipoOptions.length === 0"
          placeholder="Selecciona un equipo..."
          @update:modelValue="searchQuery = ''"
        />
      </div>
    </AppCard>

    <!-- Cabecera equipo -->
    <AppCard v-if="equipoSeleccionado" :hover="false">
      <div class="flex items-center gap-3">
        <img
          :src="equipoSeleccionado.escudo_url"
          :alt="equipoSeleccionado.nombre"
          class="w-10 h-10 rounded-lg"
        />
        <div class="flex-1">
          <div class="font-semibold text-matchx-text-primary">{{ equipoSeleccionado.nombre }}</div>
          <div class="text-xs text-matchx-text-muted">{{ equipoSeleccionado.ciudad }}</div>
        </div>
        <AppBadge variant="green">
          <Users class="w-3 h-3 mr-1" :stroke-width="2" />
          {{ jugadoresDelEquipo.length }} jugadores
        </AppBadge>
      </div>
    </AppCard>

    <!-- Empty: sin equipo seleccionado -->
    <div v-if="!selectedEquipoId" class="flex flex-col items-center gap-2 py-16">
      <UserRound class="w-10 h-10 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-muted text-sm">Selecciona un torneo y equipo para ver su plantilla</p>
    </div>

    <template v-else>
      <!-- Búsqueda -->
      <div v-if="showSearch" class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-matchx-text-muted" :stroke-width="1.75" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nombre o número..."
          class="w-full pl-9 pr-4 py-2 rounded-lg bg-matchx-bg-surface border border-matchx-border-base
                 text-matchx-text-primary placeholder:text-matchx-text-muted text-sm
                 focus:outline-none focus:border-matchx-accent-green transition-colors"
        />
      </div>

      <!-- Empty: sin jugadores -->
      <div v-if="jugadoresDelEquipo.length === 0" class="flex flex-col items-center gap-2 py-12">
        <UserRound class="w-10 h-10 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
        <p class="text-matchx-text-muted text-sm">No hay jugadores en este equipo</p>
        <AppButton variant="primary" size="sm" @click="openNew">
          <Plus class="w-3.5 h-3.5 mr-1" :stroke-width="2.5" />
          Agregar primer jugador
        </AppButton>
      </div>

      <!-- Empty: sin resultados de búsqueda -->
      <div v-else-if="jugadoresFiltrados.length === 0"
           class="text-center py-8 text-matchx-text-muted text-sm">
        Sin resultados para "{{ searchQuery }}"
      </div>

      <!-- Lista de jugadores -->
      <AppCard v-else :hover="false">
        <div class="space-y-1">
          <div
            v-for="jugador in jugadoresFiltrados"
            :key="jugador.id"
            class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-matchx-bg-base/30 transition-colors group"
          >
            <!-- Avatar con iniciales -->
            <div
              :class="['w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0', avatarColor(jugador.id)]"
            >
              {{ initiales(jugador.nombre, jugador.apellido) }}
            </div>

            <!-- Nombre + número/posición -->
            <div class="flex-1 min-w-0">
              <div class="font-medium text-matchx-text-primary text-sm truncate">
                {{ jugador.nombre }} {{ jugador.apellido }}
              </div>
              <div class="text-xs text-matchx-text-muted">#{{ jugador.numero_camiseta }}</div>
            </div>

            <AppBadge :variant="posicionBadge(jugador.posicion)" :dot="false">
              {{ jugador.posicion }}
            </AppBadge>

            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <AppButton variant="secondary" size="sm" @click="openEdit(jugador)" aria-label="Editar jugador">
                <Pencil class="w-3.5 h-3.5" :stroke-width="2" />
              </AppButton>
              <AppButton variant="danger" size="sm" @click="deleteJugador(jugador.id)" aria-label="Eliminar jugador">
                <Trash2 class="w-3.5 h-3.5" :stroke-width="2" />
              </AppButton>
            </div>
          </div>
        </div>
      </AppCard>
    </template>

    <!-- Modal -->
    <AppModal
      :open="showModal"
      :title="isEditing ? 'Editar Jugador' : 'Agregar Jugador'"
      @update:open="showModal = $event"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <AppInput v-model="formData.nombre" label="Nombre" placeholder="ej: Carlos" required />
          <AppInput v-model="formData.apellido" label="Apellido" placeholder="ej: Ramírez" required />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <AppInput v-model="formData.numero_camiseta" label="N° Camiseta" type="number" />
          <AppSelect v-model="formData.posicion" :options="posicionOptions" label="Posición" />
        </div>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showModal = false">Cancelar</AppButton>
          <AppButton variant="primary" @click="saveJugador">
            {{ isEditing ? 'Actualizar' : 'Agregar' }}
          </AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
