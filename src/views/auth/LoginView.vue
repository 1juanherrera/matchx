<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Trophy, Shield, Users, Activity } from 'lucide-vue-next'
import ProfileSelector from '@/components/auth/ProfileSelector.vue'
import LoginForm from '@/components/auth/LoginForm.vue'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

type LoginStep = 'credentials' | 'select_profile'

const step      = ref<LoginStep>('credentials')
const isLoading = ref(false)
const error     = ref('')

const features = [
  { icon: Trophy,   text: 'Gestión de torneos y fases' },
  { icon: Shield,   text: 'Roles y permisos por acceso' },
  { icon: Users,    text: 'Equipos, jugadores y árbitros' },
  { icon: Activity, text: 'Mesa de control en tiempo real' },
]

const roleDestinations: Record<string, string> = {
  superadmin:   '/admin/dashboard',
  admin_torneo: '/torneo/dashboard',
  admin_sede:   '/sede/dashboard',
  delegado:     '/delegado/partidos',
  arbitro:      '/arbitro/dashboard',
  capitan:      '/capitan/dashboard',
  jugador:      '/capitan/dashboard',
  publico:      '/publico/torneos',
}

// ── Paso 1: credenciales ────────────────────────────────────────────────────
const handleCredentials = async ({ username, password }: { username: string; password: string }) => {
  error.value     = ''
  isLoading.value = true
  try {
    const needsProfile = await auth.login(username, password)
    if (needsProfile) {
      step.value = 'select_profile'
    } else {
      redirectByRole()
    }
  } catch {
    error.value = 'Credenciales incorrectas. Verifica tu usuario y contraseña.'
  } finally {
    isLoading.value = false
  }
}

// ── Paso 2: selección de perfil ─────────────────────────────────────────────
const handleProfileSelect = async (rol: string) => {
  error.value     = ''
  isLoading.value = true
  try {
    await auth.selectProfile(rol)
    redirectByRole()
  } catch {
    error.value = 'No se pudo cargar el perfil. Intenta de nuevo.'
  } finally {
    isLoading.value = false
  }
}

const handleBack = () => {
  auth.clearPending()
  step.value  = 'credentials'
  error.value = ''
}

const redirectByRole = () => {
  const role = auth.userRole ?? 'publico'
  const dest = (route.query.redirect as string) || roleDestinations[role] || '/admin/dashboard'
  router.push(dest)
}
</script>

<template>
  <!-- Full-screen split layout -->
  <div class="flex min-h-screen w-full bg-matchx-bg-base">

    <!-- ─── LEFT PANEL — Branding (hidden on mobile) ─────────────────── -->
    <aside
      class="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between border-r border-matchx-border-base bg-matchx-bg-surface p-10"
      aria-hidden="true"
    >
      <!-- Logo -->
      <div>
        <div class="mb-2 text-2xl font-bold font-heading text-matchx-accent-green">matchX</div>
        <p class="text-sm text-matchx-text-muted">Sistema de Gestión de Torneos</p>
      </div>

      <!-- Mid content -->
      <div class="space-y-8">
        <div class="space-y-2">
          <h2 class="text-3xl font-bold font-heading text-matchx-text-primary leading-tight">
            Controla cada partido<br/>desde la cancha.
          </h2>
          <p class="text-matchx-text-secondary text-sm leading-relaxed max-w-xs">
            Gestión completa de sedes, equipos y torneos con mesa de control en tiempo real para el delegado en cancha.
          </p>
        </div>

        <!-- Feature list -->
        <ul class="space-y-3">
          <li
            v-for="f in features"
            :key="f.text"
            class="flex items-center gap-3 text-sm text-matchx-text-secondary"
          >
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-matchx-border-base bg-matchx-bg-elevated text-matchx-accent-green">
              <component :is="f.icon" class="w-3.5 h-3.5" :stroke-width="2" />
            </span>
            {{ f.text }}
          </li>
        </ul>
      </div>

      <!-- Footer -->
      <p class="text-xs text-matchx-text-muted">matchX © 2026 · Mercado colombiano</p>
    </aside>

    <!-- ─── RIGHT PANEL — Form ───────────────────────────────────────── -->
    <main class="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
      <!-- El ancho se define en cada paso individualmente -->
      <div class="w-full flex flex-col items-center">

        <!-- Mobile-only logo -->
        <div class="text-center lg:hidden w-full max-w-[400px] mb-8">
          <div class="text-3xl font-bold font-heading text-matchx-accent-green">matchX</div>
          <p class="mt-1 text-sm text-matchx-text-muted">Sistema de Gestión de Torneos</p>
        </div>

        <!-- Heading + contenido por paso — cada paso controla su propio ancho -->
        <Transition
          mode="out-in"
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-x-4"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="opacity-0 -translate-x-4"
        >
          <!-- Paso 1: credenciales — ancho estrecho -->
          <div v-if="step === 'credentials'" key="step-credentials" class="w-full max-w-[400px] space-y-6">
            <div class="space-y-1">
              <h1 class="text-2xl font-bold font-heading text-matchx-text-primary">Bienvenido de vuelta</h1>
              <p class="text-sm text-matchx-text-secondary">Ingresa tus credenciales para continuar</p>
            </div>
            <LoginForm
              :loading="isLoading"
              :error="error"
              @submit="handleCredentials"
            />
          </div>

          <!-- Paso 2: selección de perfil — ancho amplio para la grid de tarjetas -->
          <div v-else key="step-profile" class="w-full max-w-3xl space-y-6">
            <div class="space-y-1">
              <h1 class="text-2xl font-bold font-heading text-matchx-text-primary">Selecciona tu perfil</h1>
              <p class="text-sm text-matchx-text-secondary">Tu cuenta tiene acceso a múltiples perfiles</p>
            </div>
            <ProfileSelector
              :profiles="auth.pendingProfiles"
              :username="auth.pendingUser?.username ?? auth.pendingUser?.email ?? ''"
              :loading="isLoading"
              :error="error"
              @select="handleProfileSelect"
              @back="handleBack"
            />
          </div>
        </Transition>

        <!-- Footer -->
        <p class="text-center mt-5 text-xs text-matchx-text-muted">
          Conectado a API REST · 35.243.241.205:8082
        </p>
      </div>
    </main>
  </div>
</template>
