<script setup lang="ts">
import { ref } from 'vue'
import { Eye, EyeOff, LogIn, AlertTriangle } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'

defineProps<{
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: [credentials: { username: string; password: string }]
}>()

const username    = ref('')
const password    = ref('')
const showPassword = ref(false)

const handleSubmit = () => {
  emit('submit', { username: username.value, password: password.value })
}
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="handleSubmit">
    <!-- Username -->
    <div class="space-y-1.5">
      <label for="username" class="block text-sm font-medium text-matchx-text-secondary">
        Usuario o correo
      </label>
      <input
        id="username"
        v-model="username"
        type="text"
        autocomplete="username"
        placeholder="Ej: jalbertoariza"
        class="w-full rounded-lg border border-matchx-border-base bg-matchx-bg-base px-3 py-2.5 text-base text-matchx-text-primary placeholder-matchx-text-muted transition-colors duration-150 ease-out focus:border-matchx-accent-green focus:outline-none focus:ring-2 focus:ring-matchx-accent-green/20"
      />
    </div>

    <!-- Password -->
    <div class="space-y-1.5">
      <label for="password" class="block text-sm font-medium text-matchx-text-secondary">
        Contraseña
      </label>
      <div class="relative">
        <input
          id="password"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="••••••••"
          class="w-full rounded-lg border border-matchx-border-base bg-matchx-bg-base py-2.5 pl-3 pr-10 text-base text-matchx-text-primary placeholder-matchx-text-muted transition-colors duration-150 ease-out focus:border-matchx-accent-green focus:outline-none focus:ring-2 focus:ring-matchx-accent-green/20"
        />
        <button
          type="button"
          :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-matchx-text-muted transition-colors hover:text-matchx-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchx-accent-green rounded"
          @click="showPassword = !showPassword"
        >
          <EyeOff v-if="showPassword" class="w-4 h-4" />
          <Eye v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Error -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <p v-if="error" role="alert" class="flex items-start gap-2 text-sm text-matchx-accent-orange">
        <AlertTriangle class="shrink-0 mt-0.5 w-4 h-4" />{{ error }}
      </p>
    </Transition>

    <!-- Submit -->
    <AppButton variant="primary" size="lg" class="w-full" :loading="loading" @click="handleSubmit">
      <LogIn class="w-4 h-4" />
      Iniciar sesión
    </AppButton>
  </form>
</template>
