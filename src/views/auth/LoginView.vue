<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/stores/auth'
import { Trophy, Shield, Users, Activity } from 'lucide-vue-next'
import RoleSelector from '@/components/auth/RoleSelector.vue'
import LoginForm from '@/components/auth/LoginForm.vue'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const selectedRole = ref<UserRole | null>(null)
const isLoading    = ref(false)
const error        = ref('')

const features = [
  { icon: Trophy,   text: 'Gestión de torneos y fases' },
  { icon: Shield,   text: 'Roles y permisos por acceso' },
  { icon: Users,    text: 'Equipos, jugadores y árbitros' },
  { icon: Activity, text: 'Mesa de control en tiempo real' },
]

const handleSubmit = async ({ userId, role }: { userId: number; role: UserRole }) => {
  error.value    = ''
  isLoading.value = true
  try {
    await auth.login(userId, role)
    const roleDestinations: Record<string, string> = {
      superadmin:   '/admin/dashboard',
      admin_torneo: '/torneo/dashboard',
      admin_sede:   '/sede/dashboard',
      delegado:     '/delegado/partidos',
      arbitro:      '/arbitro/dashboard',
      capitan:      '/capitan/dashboard',
      publico:      '/admin/dashboard',
    }
    const dest = (route.query.redirect as string) || roleDestinations[role] || '/admin/dashboard'
    router.push(dest)
  } catch {
    error.value = 'Error al iniciar sesión. Intenta de nuevo.'
  } finally {
    isLoading.value = false
  }
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
        <div class="mb-2 text-2xl font-bold font-heading text-matchx-accent-green">
          matchX
        </div>
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
      <p class="text-xs text-matchx-text-muted">
        matchX © 2026 · Mercado colombiano
      </p>
    </aside>

    <!-- ─── RIGHT PANEL — Form ───────────────────────────────────────── -->
    <main class="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
      <div class="w-full max-w-[400px] space-y-8">

        <!-- Mobile-only logo -->
        <div class="text-center lg:hidden">
          <div class="text-3xl font-bold font-heading text-matchx-accent-green">matchX</div>
          <p class="mt-1 text-sm text-matchx-text-muted">Sistema de Gestión de Torneos</p>
        </div>

        <!-- Heading -->
        <div class="space-y-1">
          <h1 class="text-2xl font-bold font-heading text-matchx-text-primary">
            Bienvenido de vuelta
          </h1>
          <p class="text-sm text-matchx-text-secondary">
            Selecciona tu rol para acceder al sistema
          </p>
        </div>

        <!-- Role selector -->
        <RoleSelector v-model="selectedRole" />

        <!-- Form — solo aparece cuando hay rol seleccionado -->
        <Transition
          mode="out-in"
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-3"
          leave-active-class="transition duration-100 ease-in"
          leave-to-class="opacity-0"
        >
          <div v-if="selectedRole" :key="selectedRole">
            <!-- Divider -->
            <div class="flex items-center gap-3 mb-6">
              <div class="h-px flex-1 bg-matchx-border-base" />
              <span class="text-xs text-matchx-text-muted">credenciales</span>
              <div class="h-px flex-1 bg-matchx-border-base" />
            </div>
            <LoginForm
              :role="selectedRole"
              :loading="isLoading"
              :error="error"
              @submit="handleSubmit"
            />
          </div>
        </Transition>

        <!-- Footer -->
        <p class="text-center text-xs text-matchx-text-muted">
          Prototipo demo — datos simulados con mocks JSON
        </p>
      </div>
    </main>
  </div>
</template>
