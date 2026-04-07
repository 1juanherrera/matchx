<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUsuariosStore, type Usuario } from '@/stores/usuarios'
import type { UserRole } from '@/stores/auth'
import AppCard from '@/components/ui/AppCard.vue'
import AppDataTable from '@/components/ui/AppDataTable.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'

const store = useUsuariosStore()

const showModal = ref(false)
const isEditing = ref(false)
const filterRol = ref<UserRole | ''>('')
const searchTerm = ref('')

const rolesOptions = [
  { value: '', label: 'Todos los roles' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'admin_torneo', label: 'Admin Torneo' },
  { value: 'admin_sede', label: 'Admin Sede' },
  { value: 'delegado', label: 'Delegado' },
  { value: 'arbitro', label: 'Árbitro' },
  { value: 'jugador', label: 'Jugador' },
  { value: 'publico', label: 'Público' },
]

const formData = ref({
  nombre: '',
  correo: '',
  telefono: '',
  rol: 'publico' as UserRole,
})

const editingId = ref<number | null>(null)

const columns = [
  { key: 'id', label: 'ID', width: '60px' },
  { key: 'nombre', label: 'Nombre', sortable: true },
  { key: 'correo', label: 'Correo', sortable: true },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'rol', label: 'Rol', sortable: true },
  { key: 'activo', label: 'Estado' },
]

const filteredUsuarios = computed(() => {
  let result = store.usuariosActivos

  if (filterRol.value) {
    result = result.filter(u => u.rol === filterRol.value)
  }

  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    result = result.filter(
      u =>
        u.nombre.toLowerCase().includes(term) ||
        u.correo.toLowerCase().includes(term) ||
        u.telefono.includes(term),
    )
  }

  return result
})

const rolBadgeVariant = (rol: UserRole) => {
  const variants: Record<UserRole, 'green' | 'orange' | 'blue' | 'gray' | 'red'> = {
    superadmin: 'red',
    admin_torneo: 'orange',
    admin_sede: 'blue',
    delegado: 'green',
    arbitro: 'blue',
    capitan: 'green',
    publico: 'gray',
  }
  return variants[rol]
}

onMounted(() => {
  store.fetchUsuarios()
})

const openNewModal = () => {
  isEditing.value = false
  formData.value = {
    nombre: '',
    correo: '',
    telefono: '',
    rol: 'publico',
  }
  editingId.value = null
  showModal.value = true
}

const openEditModal = (usuario: Usuario) => {
  isEditing.value = true
  formData.value = {
    nombre: usuario.nombre,
    correo: usuario.correo,
    telefono: usuario.telefono,
    rol: usuario.rol,
  }
  editingId.value = usuario.id
  showModal.value = true
}

const saveUsuario = () => {
  if (!formData.value.nombre || !formData.value.correo) {
    alert('Por favor completa todos los campos')
    return
  }

  if (isEditing.value && editingId.value) {
    store.actualizarUsuario(editingId.value, {
      nombre: formData.value.nombre,
      correo: formData.value.correo,
      telefono: formData.value.telefono,
      rol: formData.value.rol,
    })
  } else {
    store.crearUsuario({
      nombre: formData.value.nombre,
      correo: formData.value.correo,
      telefono: formData.value.telefono,
      url_avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.value.nombre.replace(/\s/g, '')}`,
      rol: formData.value.rol,
      activo: 1,
    })
  }

  showModal.value = false
}

const deleteUsuario = (id: number) => {
  if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
    store.eliminarUsuario(id)
  }
}

function removeGuiones(texto: string): string {
  return texto.replace(/_/g, ' ');
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Usuarios</h1>
        <p class="text-matchx-text-muted mt-1">Gestión de usuarios del sistema</p>
      </div>
      <AppButton variant="primary" @click="openNewModal">
        + Nuevo Usuario
      </AppButton>
    </div>

    <!-- Filters -->
    <AppCard>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AppInput
          v-model="searchTerm"
          label="Buscar"
          placeholder="Nombre, correo o teléfono..."
        />
        <AppSelect
          v-model="filterRol"
          :options="rolesOptions"
          label="Filtrar por rol"
        />
        <div class="flex items-end">
          <AppButton variant="ghost" @click="() => { filterRol = ''; searchTerm = '' }">
            Limpiar filtros
          </AppButton>
        </div>
      </div>
    </AppCard>

    <!-- Table -->
    <AppCard :hover="false">
      <AppDataTable
        :columns="columns"
        :rows="filteredUsuarios"
        row-key="id"
        :loading="store.loading"
        :empty="filteredUsuarios.length === 0"
      >
        <template #cell-rol="{ value }">
          <AppBadge :variant="rolBadgeVariant(value)">
            {{ removeGuiones(value) }}
          </AppBadge>
        </template>

        <template #cell-activo="{ row }">
          <AppBadge :variant="row.activo === 1 ? 'green' : 'gray'" :pulse="row.activo === 1">
            {{ row.activo === 1 ? 'Activo' : 'Inactivo' }}
          </AppBadge>
        </template>

        <template #actions="{ row }">
          <div class="flex gap-2">
            <AppButton
              variant="secondary"
              size="sm"
              @click="openEditModal(row)"
            >
              Editar
            </AppButton>
            <AppButton
              variant="danger"
              size="sm"
              @click="deleteUsuario(row.id)"
            >
              Eliminar
            </AppButton>
          </div>
        </template>
      </AppDataTable>
    </AppCard>

    <!-- Modal -->
    <AppModal
      :open="showModal"
      :title="`${isEditing ? 'Editar' : 'Crear'} Usuario`"
      size="lg"
      @update:open="showModal = $event"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppInput
          v-model="formData.nombre"
          label="Nombre Completo"
          placeholder="ej: Carlos Administrador"
          required
        />
        <AppInput
          v-model="formData.correo"
          label="Correo Electrónico"
          type="email"
          placeholder="ej: carlos@matchx.com"
          required
        />
        <AppInput
          v-model="formData.telefono"
          label="Teléfono"
          type="tel"
          placeholder="ej: +573001234567"
        />
        <AppSelect
          v-model="formData.rol"
          :options="rolesOptions.slice(1)"
          label="Rol"
          required
        />
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showModal = false">
            Cancelar
          </AppButton>
          <AppButton variant="primary" @click="saveUsuario">
            {{ isEditing ? 'Actualizar' : 'Crear' }}
          </AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
