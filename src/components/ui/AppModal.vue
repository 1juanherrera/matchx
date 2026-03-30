<script setup lang="ts">
type ModalSize = 'sm' | 'md' | 'lg'

interface Props {
  open: boolean
  title?: string
  closeButton?: boolean
  size?: ModalSize
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  closeButton: true,
  size: 'md',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const closeModal = () => emit('update:open', false)
</script>

<template>
  <Teleport to="body">
    <Transition
      name="modal"
      @click.self="closeModal"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        @click.self="closeModal"
      >
        <div
          :class="[
            'bg-matchx-bg-elevated border border-matchx-border-base rounded-lg shadow-2xl w-full mx-4 animate-in fade-in zoom-in-95 duration-200',
            size === 'sm' && 'max-w-sm',
            size === 'md' && 'max-w-md',
            size === 'lg' && 'max-w-2xl',
          ]"
          @click.stop
        >
          <!-- Header -->
          <div v-if="title || $slots.header" class="flex items-center justify-between p-6 border-b border-matchx-border-base">
            <div v-if="$slots.header" class="flex-1">
              <slot name="header" />
            </div>
            <h2 v-else class="text-lg font-semibold text-matchx-text-primary flex-1">
              {{ title }}
            </h2>
            <button
              v-if="closeButton"
              class="ml-4 text-matchx-text-muted hover:text-matchx-text-primary transition-colors"
              @click="closeModal"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="p-6">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="p-6 border-t border-matchx-border-base">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
