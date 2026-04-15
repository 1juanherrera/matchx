<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Trophy, CalendarRange, BarChart3, Building2, Menu, X, LogIn, Target } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const menuOpen = ref(false)

const navLinks = [
  { label: 'Torneos',    icon: Trophy,        route: '/publico/torneos' },
  { label: 'Posiciones', icon: BarChart3,     route: '/publico/posiciones' },
  { label: 'Goleadores', icon: Target,        route: '/publico/goleadores' },
  { label: 'Fixture',    icon: CalendarRange, route: '/publico/fixture' },
  { label: 'Sedes',      icon: Building2,     route: '/publico/sedes' },
]

const isActive = (path: string) => route.path === path

const handleLogin = () => {
  if (authStore.isAuthenticated) {
    router.push('/')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="min-h-screen bg-matchx-bg-base text-matchx-text-primary">
    <!-- Navbar -->
    <header class="sticky top-0 z-30 bg-matchx-bg-base/95 backdrop-blur border-b border-matchx-border-base">
      <div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <!-- Logo -->
        <RouterLink to="/publico/torneos" class="flex items-center gap-2 shrink-0">
          <div class="w-7 h-7 rounded bg-matchx-accent-green flex items-center justify-center">
            <Trophy class="w-4 h-4 text-matchx-bg-base" :stroke-width="2.5" />
          </div>
          <span class="font-bold text-lg text-matchx-text-primary" style="font-family: 'Fira Code', monospace">
            Global<span class="text-matchx-accent-green">matchX</span>
          </span>
        </RouterLink>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-1">
          <RouterLink
            v-for="link in navLinks"
            :key="link.route"
            :to="link.route"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 cursor-pointer"
            :class="isActive(link.route)
              ? 'bg-matchx-accent-green/10 text-matchx-accent-green'
              : 'text-matchx-text-secondary hover:text-matchx-text-primary hover:bg-matchx-bg-surface'"
          >
            <component :is="link.icon" class="w-4 h-4" :stroke-width="1.75" />
            {{ link.label }}
          </RouterLink>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <button
            @click="handleLogin"
            class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
                   bg-matchx-accent-green text-matchx-bg-base hover:bg-matchx-accent-green/90
                   transition-colors duration-150 cursor-pointer"
          >
            <LogIn class="w-4 h-4" :stroke-width="2" />
            {{ authStore.isAuthenticated ? 'Mi Panel' : 'Iniciar Sesión' }}
          </button>

          <!-- Mobile hamburger -->
          <button
            @click="menuOpen = !menuOpen"
            class="md:hidden p-2 rounded-md text-matchx-text-secondary hover:text-matchx-text-primary
                   hover:bg-matchx-bg-surface transition-colors cursor-pointer"
            :aria-label="menuOpen ? 'Cerrar menú' : 'Abrir menú'"
          >
            <X v-if="menuOpen" class="w-5 h-5" :stroke-width="2" />
            <Menu v-else class="w-5 h-5" :stroke-width="2" />
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div
        v-if="menuOpen"
        class="md:hidden border-t border-matchx-border-base bg-matchx-bg-surface"
      >
        <nav class="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-1">
          <RouterLink
            v-for="link in navLinks"
            :key="link.route"
            :to="link.route"
            @click="menuOpen = false"
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
            :class="isActive(link.route)
              ? 'bg-matchx-accent-green/10 text-matchx-accent-green'
              : 'text-matchx-text-secondary hover:text-matchx-text-primary hover:bg-matchx-bg-elevated'"
          >
            <component :is="link.icon" class="w-4 h-4" :stroke-width="1.75" />
            {{ link.label }}
          </RouterLink>

          <button
            @click="handleLogin; menuOpen = false"
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium mt-1
                   text-matchx-accent-green hover:bg-matchx-accent-green/10 transition-colors cursor-pointer"
          >
            <LogIn class="w-4 h-4" :stroke-width="2" />
            {{ authStore.isAuthenticated ? 'Mi Panel' : 'Iniciar Sesión' }}
          </button>
        </nav>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-6xl mx-auto px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>
