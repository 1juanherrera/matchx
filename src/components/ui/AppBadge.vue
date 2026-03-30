<script setup lang="ts">
import { computed } from 'vue'

type BadgeVariant = 'green' | 'orange' | 'blue' | 'gray' | 'red'

interface Props {
  variant?: BadgeVariant
  pulse?: boolean
  dot?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'gray',
  pulse: false,
  dot: true,
})

const badgeClass = computed(() => {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium'

  const variants = {
    green: 'bg-matchx-accent-green/10 text-matchx-accent-green',
    orange: 'bg-matchx-accent-orange/10 text-matchx-accent-orange',
    blue: 'bg-blue-500/10 text-blue-400',
    gray: 'bg-matchx-text-muted/10 text-matchx-text-muted',
    red: 'bg-red-500/10 text-red-400',
  }

  return `${base} ${variants[props.variant]}`
})

const dotClass = computed(() => {
  const base = 'w-1.5 h-1.5 rounded-full'
  const colors = {
    green: 'bg-matchx-accent-green',
    orange: 'bg-matchx-accent-orange',
    blue: 'bg-blue-400',
    gray: 'bg-matchx-text-muted',
    red: 'bg-red-400',
  }
  const animation = props.pulse ? 'animate-pulse' : ''

  return `${base} ${colors[props.variant]} ${animation}`
})
</script>

<template>
  <span :class="badgeClass">
    <span v-if="dot" :class="dotClass" />
    <slot />
  </span>
</template>
