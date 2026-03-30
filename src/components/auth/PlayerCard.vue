<script setup lang="ts">
import { computed } from 'vue'
import type { UserRole } from '@/stores/auth'

interface Props {
  id: number
  nombre: string
  rol: UserRole
  avatar: string
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
})

const emit = defineEmits<{
  select: [id: number]
}>()

const roleNumber: Record<UserRole, number> = {
  superadmin: 1,
  admin_torneo: 4,
  admin_sede: 4,
  delegado: 8,
  arbitro: 7,
  capitan: 10,
  publico: 11,
}

const jerseyNumber = computed(() => roleNumber[props.rol])

const fullName = computed(() => {
  const [firstName, ...rest] = props.nombre.split(' ')
  return {
    first: firstName,
    last: rest.join(' '),
  }
})
</script>

<template>
  <button
    @click="emit('select', id)"
    class="group relative transition-all duration-200 active:scale-95"
    :class="selected ? 'scale-105' : 'hover:scale-102'"
  >
    <!-- Card Container -->
    <div
      :class="[
        'rounded-lg p-4 transition-all duration-200',
        'border-2 bg-gradient-to-b from-matchx-bg-surface to-matchx-bg-base',
        selected
          ? 'border-matchx-accent-green shadow-lg ring-2 ring-offset-2 ring-offset-matchx-bg-base ring-matchx-accent-green'
          : 'border-matchx-border-base hover:border-matchx-accent-green/50'
      ]"
    >
      <!-- Jersey Number - Top Right -->
      <div class="absolute right-3 top-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-full border border-matchx-border-base bg-matchx-accent-green/10">
          <span class="text-xs font-bold font-heading text-matchx-accent-green">
            {{ jerseyNumber }}
          </span>
        </div>
      </div>

      <!-- Avatar Circle -->
      <div class="mb-3 flex justify-center">
        <img
          :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatar}`"
          :alt="nombre"
          class="h-24 w-24 rounded-full border-2 border-matchx-border-base transition-all duration-200"
          :class="selected && 'border-matchx-accent-green shadow-lg'"
        />
      </div>

      <!-- Name -->
      <div class="mb-2 text-center">
        <div class="text-xs text-matchx-text-muted">{{ fullName.last }}</div>
        <div class="text-sm font-bold font-heading text-matchx-text-primary">
          {{ fullName.first }}
        </div>
      </div>

      <!-- Position Badge -->
      <div class="flex justify-center">
        <div
          :class="[
            'rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200',
            'border border-matchx-border-base bg-matchx-accent-green/10 text-matchx-accent-green',
            selected && 'bg-matchx-accent-green/20 border-matchx-accent-green'
          ]"
        >
          {{ rol }}
        </div>
      </div>

      <!-- Selection indicator line -->
      <div
        v-if="selected"
        class="absolute bottom-0 left-1/2 h-1 w-3/4 -translate-x-1/2 rounded-t-full bg-gradient-to-r from-transparent via-matchx-accent-green to-transparent"
      />
    </div>
  </button>
</template>
