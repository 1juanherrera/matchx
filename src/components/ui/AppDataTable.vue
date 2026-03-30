<script setup lang="ts" generic="T extends Record<string, any>">
import { computed, ref } from 'vue'

export interface Column<T> {
  key: keyof T
  label: string
  sortable?: boolean
  width?: string
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  loading?: boolean
  empty?: boolean
  rowKey?: keyof T
}

const props = withDefaults(defineProps<Props<any>>(), {
  loading: false,
  empty: false,
  rowKey: 'id',
})

defineSlots<{
  'cell-[key]'(props: { row: any; value: any }): any
  'actions'(props: { row: any }): any
  'empty'(): any
}>()

const sortKey = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc'>('asc')

const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows

  const sorted = [...props.rows].sort((a, b) => {
    const aVal = a[sortKey.value]
    const bVal = b[sortKey.value]

    if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })

  return sorted
})

const toggleSort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-matchx-border-base">
    <!-- Loading skeleton -->
    <div v-if="loading" class="p-8 text-center text-matchx-text-muted">
      <div class="inline-block">
        <svg class="animate-spin h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="empty || sortedRows.length === 0" class="p-12 text-center">
      <slot name="empty">
        <p class="text-matchx-text-muted">No hay datos disponibles</p>
      </slot>
    </div>

    <!-- Table -->
    <table v-else class="w-full text-left text-sm">
      <!-- Header -->
      <thead class="bg-matchx-bg-elevated border-b border-matchx-border-base sticky top-0">
        <tr>
          <th
            v-for="col in columns"
            :key="String(col.key)"
            :style="{ width: col.width }"
            class="px-4 py-3 font-semibold text-matchx-text-primary"
          >
            <button
              v-if="col.sortable"
              class="flex items-center gap-1 hover:text-matchx-accent-green transition-colors"
              @click="toggleSort(String(col.key))"
            >
              {{ col.label }}
              <svg
                v-if="sortKey === col.key"
                :class="['w-4 h-4 transition-transform', sortOrder === 'desc' && 'rotate-180']"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m0 0l-7-7m7 7l7-7" />
              </svg>
            </button>
            <span v-else>{{ col.label }}</span>
          </th>
          <th v-if="$slots.actions" class="px-4 py-3 font-semibold text-matchx-text-primary w-24">
            Acciones
          </th>
        </tr>
      </thead>

      <!-- Body -->
      <tbody>
        <tr
          v-for="(row, idx) in sortedRows"
          :key="row[props.rowKey]"
          :class="[
            'border-b border-matchx-border-base hover:bg-matchx-bg-surface/30 transition-colors duration-150',
            idx % 2 === 0 && 'bg-matchx-bg-base/20',
          ]"
        >
          <td
            v-for="col in columns"
            :key="String(col.key)"
            class="px-4 py-3 text-matchx-text-primary"
          >
            <slot :name="`cell-${String(col.key)}`" :row="row" :value="row[col.key]">
              {{ row[col.key] }}
            </slot>
          </td>
          <td v-if="$slots.actions" class="px-4 py-3">
            <slot name="actions" :row="row" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
