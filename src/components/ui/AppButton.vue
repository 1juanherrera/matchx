<script setup lang="ts">
import { computed } from 'vue'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
})

const buttonClass = computed(() => {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-matchx-accent-green text-matchx-bg-base hover:bg-matchx-accent-green/90 active:bg-matchx-accent-green/80 focus:ring-2 focus:ring-matchx-accent-green/20',
    secondary: 'bg-matchx-bg-surface text-matchx-text-primary border border-matchx-border-base hover:bg-matchx-bg-elevated active:bg-matchx-border-base focus:ring-2 focus:ring-matchx-accent-green/20',
    ghost: 'text-matchx-text-primary hover:bg-matchx-bg-surface active:bg-matchx-bg-elevated focus:ring-2 focus:ring-matchx-accent-green/20',
    danger: 'bg-matchx-accent-orange text-matchx-bg-base hover:bg-matchx-accent-orange/90 active:bg-matchx-accent-orange/80 focus:ring-2 focus:ring-matchx-accent-orange/20',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2.5',
  }

  return `${base} ${variants[props.variant]} ${sizes[props.size]}`
})
</script>

<template>
  <button
    :class="buttonClass"
    :disabled="disabled || loading"
    type="button"
  >
    <slot />
    <svg
      v-if="loading"
      class="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  </button>
</template>
