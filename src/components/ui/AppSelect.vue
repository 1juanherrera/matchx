<script setup lang="ts" generic="T extends string | number">
import { ref, computed } from 'vue'

interface SelectOption {
  value: string | number
  label: string
}

interface Props {
  modelValue?: T
  options: SelectOption[]
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined as T,
  placeholder: 'Seleccionar...',
  disabled: false,
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

const isOpen = ref(false)

const selectedLabel = computed(() => {
  const option = props.options.find(opt => opt.value === props.modelValue)
  return option?.label || props.placeholder
})

const selectOption = (value: string | number) => {
  emit('update:modelValue', value as T)
  isOpen.value = false
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-matchx-text-secondary">
      {{ label }}
      <span v-if="required" class="text-matchx-accent-orange">*</span>
    </label>

    <div class="relative">
      <button
        :class="[
          'w-full px-3 py-2 rounded-lg font-body text-left text-matchx-text-primary transition-colors duration-150',
          'bg-matchx-bg-base border rounded-lg',
          error
            ? 'border-matchx-accent-orange focus:border-matchx-accent-orange focus:ring-2 focus:ring-matchx-accent-orange/20'
            : 'border-matchx-border-base hover:border-matchx-accent-green focus:border-matchx-accent-green focus:ring-2 focus:ring-matchx-accent-green/20',
          disabled && 'opacity-50 cursor-not-allowed',
        ]"
        :disabled="disabled"
        @click="isOpen = !isOpen"
      >
        <div class="flex items-center justify-between">
          <span>{{ selectedLabel }}</span>
          <svg
            :class="['w-4 h-4 transition-transform duration-150', isOpen && 'rotate-180']"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </button>

      <!-- Dropdown -->
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <div
          v-if="isOpen"
          class="absolute top-full left-0 right-0 mt-1 z-10 bg-matchx-bg-elevated border border-matchx-border-base rounded-lg shadow-lg overflow-hidden"
        >
          <button
            v-for="option in options"
            :key="option.value"
            :class="[
              'w-full px-3 py-2 text-left text-matchx-text-primary hover:bg-matchx-bg-surface transition-colors duration-150',
              modelValue === option.value && 'bg-matchx-accent-green/10 text-matchx-accent-green font-medium',
            ]"
            @click="selectOption(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </Transition>
    </div>

    <p v-if="error" class="text-xs text-matchx-accent-orange">
      {{ error }}
    </p>
  </div>
</template>
