<script setup lang="ts">
interface Props {
  hover?: boolean
}

withDefaults(defineProps<Props>(), {
  hover: true,
})
</script>

<template>
  <div
    :class="[
      'bg-matchx-bg-surface border border-matchx-border-base rounded-lg p-4 transition-colors duration-150',
      hover && 'hover:bg-matchx-bg-elevated/50',
    ]"
  >
    <slot />
  </div>
</template>
