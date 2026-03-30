<script setup lang="ts">
import { computed } from 'vue'

type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'date'

interface Props {
  modelValue?: string | number
  type?: InputType
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  disabled: false,
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const inputClass = computed(() => {
  const base = 'w-full px-3 py-2 rounded-lg font-body text-matchx-text-primary placeholder-matchx-text-muted transition-colors duration-150'
  const bg = 'bg-matchx-bg-base'
  const border = props.error
    ? 'border border-matchx-accent-orange focus:border-matchx-accent-orange focus:ring-2 focus:ring-matchx-accent-orange/20'
    : 'border border-matchx-border-base focus:border-matchx-accent-green focus:ring-2 focus:ring-matchx-accent-green/20'
  const disabled = props.disabled ? 'disabled:opacity-50 disabled:cursor-not-allowed' : ''

  return `${base} ${bg} ${border} ${disabled}`
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-sm font-medium text-matchx-text-secondary">
      {{ label }}
      <span v-if="required" class="text-matchx-accent-orange">*</span>
    </label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :class="inputClass"
      @input="emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" class="text-xs text-matchx-accent-orange">
      {{ error }}
    </p>
  </div>
</template>
