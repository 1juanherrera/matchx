<script setup lang="ts">
import { ref, computed } from 'vue'
import { Eye, EyeOff, LogIn, ArrowRight, AlertTriangle } from 'lucide-vue-next'
import type { UserRole } from '@/stores/auth'
import AppButton from '@/components/ui/AppButton.vue'

const props = defineProps<{
  role: UserRole | null
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: [credentials: { username: string; password: string; role: UserRole }]
}>()

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const isPublic = computed(() => props.role === 'publico')


// Usernames de prueba por rol (para el placeholder del campo email)
const usernameByRole: Record<UserRole, string> = {
  superadmin:   'superadmin',
  admin_torneo: 'ana@matchx.com',
  admin_sede:   'juan@matchx.com',
  delegado:     'miguel@matchx.com',
  arbitro:      'pedro@matchx.com',
  capitan:      'luis@matchx.com',
  publico:      '',
}

const handleSubmit = () => {
  if (!props.role) return
  emit('submit', { username: email.value, password: password.value, role: props.role })
}
</script>

<template>
  <Transition
    mode="out-in"
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <!-- Public role: single CTA -->
    <div v-if="isPublic" :key="'public'" class="space-y-4">
      <div class="rounded-lg border border-matchx-border-base bg-matchx-bg-surface/40 p-4 text-center">
        <p class="text-sm text-matchx-text-secondary">
          Accede como visitante para ver torneos, resultados y estadísticas sin necesidad de cuenta.
        </p>
      </div>

      <!-- Error -->
      <p v-if="error" role="alert" class="flex items-start gap-2 text-sm text-matchx-accent-orange">
        <AlertTriangle class="shrink-0 mt-0.5 w-4 h-4" />{{ error }}
      </p>

      <AppButton
        variant="primary"
        size="lg"
        class="w-full"
        :loading="loading"
        @click="handleSubmit"
      >
        <ArrowRight class="w-4 h-4" />
        Explorar sin cuenta
      </AppButton>
    </div>

    <!-- Authenticated roles: email + password -->
    <form
      v-else-if="role"
      :key="role"
      class="space-y-4"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <!-- Email field -->
      <div class="space-y-1.5">
        <label for="email" class="block text-sm font-medium text-matchx-text-secondary">
          Correo electrónico
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          :placeholder="usernameByRole[role]"
          class="w-full rounded-lg border border-matchx-border-base bg-matchx-bg-base px-3 py-2.5 text-base text-matchx-text-primary placeholder-matchx-text-muted transition-colors duration-150 ease-out focus:border-matchx-accent-green focus:outline-none focus:ring-2 focus:ring-matchx-accent-green/20"
        />
      </div>

      <!-- Password field -->
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
            placeholder="Cualquier valor funciona (demo)"
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

      <!-- Error message -->
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
      <AppButton
        variant="primary"
        size="lg"
        class="w-full"
        :loading="loading"
        @click="handleSubmit"
      >
        <LogIn class="w-4 h-4" />
        Iniciar sesión
      </AppButton>

      <p class="text-center text-xs text-matchx-text-muted">
        Ej: jalbertoariza / jandy0512
      </p>
    </form>
  </Transition>
</template>
