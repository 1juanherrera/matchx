<script setup lang="ts">
import { computed } from 'vue'

type Position = 'goalkeeper' | 'defense' | 'midfielder' | 'forward'

interface Props {
  position: Position
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
})

// Posiciones en formación 4-2-3-1 (campo visual)
const positionConfig: Record<Position, {
  label: string
  number: number
  accent: string
  description: string
  svgIcon: string
}> = {
  goalkeeper: {
    label: 'ARQUERO',
    number: 1,
    accent: 'matchx-accent-orange',
    description: 'Portero de cancha',
    svgIcon: 'M12 2c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10-4.5-10-10-10zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z',
  },
  defense: {
    label: 'DEFENSA',
    number: 4,
    accent: 'matchx-accent-green',
    description: 'Protege la cancha',
    svgIcon: 'M12 2l10 6v6c0 5.5-3.8 10.7-9 11.9C5.8 24.7 2 19.5 2 14V8l10-6z',
  },
  midfielder: {
    label: 'CENTROCAMPO',
    number: 8,
    accent: 'matchx-accent-green',
    description: 'Controla el juego',
    svgIcon: 'M12 2l10 10-10 10-10-10 10-10zm0 5l5 5-5 5-5-5 5-5z',
  },
  forward: {
    label: 'DELANTERO',
    number: 9,
    accent: 'matchx-accent-orange',
    description: 'Ataca y anota',
    svgIcon: 'M7 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z',
  },
}

const config = computed(() => positionConfig[props.position])
</script>

<template>
  <button
    class="group relative h-32 w-32 transition-all duration-200"
    :class="[
      selected ? 'scale-110' : 'hover:scale-105 active:scale-95',
    ]"
  >
    <!-- Border + Background -->
    <div
      :class="[
        'absolute inset-0 rounded-lg border-2 transition-all duration-200',
        'bg-matchx-bg-surface',
        selected
          ? `border-${config.accent} bg-${config.accent}/5 shadow-lg ring-2 ring-offset-2 ring-offset-matchx-bg-base ring-${config.accent}`
          : 'border-matchx-border-base hover:border-matchx-accent-green'
      ]"
    />

    <!-- Content -->
    <div class="relative z-10 flex h-full flex-col items-center justify-between p-3">
      <!-- Jersey Number -->
      <div :class="`text-3xl font-bold font-heading text-${config.accent}`">
        {{ config.number }}
      </div>

      <!-- SVG Icon (Custom) -->
      <svg class="h-8 w-8" :class="`text-${config.accent}`" fill="currentColor" viewBox="0 0 24 24">
        <path :d="config.svgIcon" />
      </svg>

      <!-- Label -->
      <div class="text-center">
        <div class="text-xs font-bold font-heading text-matchx-text-primary leading-tight">
          {{ config.label }}
        </div>
      </div>
    </div>

    <!-- Hover indicator line -->
    <div
      class="absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 transition-all duration-200"
      :class="`bg-${config.accent}`"
      :style="{ width: selected ? '80%' : '0%' }"
    />
  </button>
</template>
