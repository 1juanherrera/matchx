<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useConfiguracionStore } from '@/stores/configuracion'
import AppCard from '@/components/ui/AppCard.vue'
import AppDataTable from '@/components/ui/AppDataTable.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'

const store = useConfiguracionStore()
const showEditModal = ref(false)
const editingClave = ref('')
const editingValor = ref('')

const columns = [
  { key: 'clave', label: 'Parámetro', sortable: true, width: '180px' },
  { key: 'descripcion', label: 'Descripción', sortable: true },
  { key: 'valor', label: 'Valor', sortable: true },
  { key: 'tipo', label: 'Tipo', width: '80px' },
]

onMounted(() => {
  store.fetchConfiguracion()
})

const openEditModal = (clave: string, valor: any) => {
  editingClave.value = clave
  editingValor.value = String(valor)
  showEditModal.value = true
}

const saveEdit = () => {
  const item = store.items.find(i => i.clave === editingClave.value)
  if (!item) return

  let convertedValue: string | number | boolean = editingValor.value

  if (item.tipo === 'number') {
    convertedValue = Number(editingValor.value)
  } else if (item.tipo === 'boolean') {
    convertedValue = editingValor.value === 'true'
  }

  store.actualizarValor(editingClave.value, convertedValue)
  showEditModal.value = false
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-matchx-text-primary">Configuración del Sistema</h1>
      <p class="text-matchx-text-muted mt-1">Parámetros globales de la aplicación</p>
    </div>

    <!-- Info Card -->
    <AppCard>
      <p class="text-sm text-matchx-text-secondary">
        Desde aquí puedes configurar los parámetros globales del sistema. Cambios aquí afectarán a toda la aplicación.
      </p>
    </AppCard>

    <!-- Configuration Table -->
    <AppCard :hover="false">
      <AppDataTable
        :columns="columns"
        :rows="store.items"
        row-key="id"
        :loading="store.loading"
        :empty="store.items.length === 0"
      >
        <template #cell-valor="{ row }">
          <span class="font-mono text-sm text-matchx-accent-green">{{ row.valor }}</span>
        </template>

        <template #cell-tipo="{ row }">
          <span class="text-xs px-2 py-1 rounded bg-matchx-bg-base text-matchx-text-secondary">
            {{ row.tipo }}
          </span>
        </template>

        <template #actions="{ row }">
          <AppButton
            :disabled="!row.editable"
            variant="secondary"
            size="sm"
            @click="openEditModal(row.clave, row.valor)"
          >
            {{ row.editable ? 'Editar' : 'Bloqueado' }}
          </AppButton>
        </template>
      </AppDataTable>
    </AppCard>

    <!-- Edit Modal -->
    <AppModal
      :open="showEditModal"
      title="Editar Configuración"
      @update:open="showEditModal = $event"
    >
      <div class="space-y-4">
        <div>
          <div class="text-sm font-medium text-matchx-text-secondary mb-2">Parámetro</div>
          <div class="text-lg font-semibold text-matchx-text-primary">{{ editingClave }}</div>
        </div>

        <AppInput
          v-model="editingValor"
          label="Valor"
          placeholder="Ingresa el nuevo valor"
        />
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showEditModal = false">
            Cancelar
          </AppButton>
          <AppButton variant="primary" @click="saveEdit">
            Guardar Cambios
          </AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
