<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  LayoutDashboard, Users, Layers, Building2, Settings,
  Trophy, ClipboardList, UserCheck, CircleDot, BarChart3,
  Radio, Calendar, Menu, Bell, LogOut,
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const sidebarOpen = ref(false)

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const navigationItems = computed(() => {
  const role = authStore.userRole

  const baseItems = [
    { label: 'Dashboard', icon: LayoutDashboard, route: '/admin/dashboard' },
  ]

  if (role === 'superadmin') {
    return [
      ...baseItems,
      { label: 'Usuarios',      icon: Users,         route: '/admin/usuarios' },
      { label: 'Modalidades',   icon: Layers,        route: '/admin/modalidades' },
      { label: 'Sedes',         icon: Building2,     route: '/admin/sedes' },
      { label: 'Configuración', icon: Settings,      route: '/admin/configuracion' },
    ]
  }

  if (role === 'admin_torneo') {
    return [
      ...baseItems,
      { label: 'Torneos',       icon: Trophy,        route: '/torneo/torneos' },
      { label: 'Inscripciones', icon: ClipboardList, route: '/torneo/inscripciones' },
      { label: 'Plantilla',     icon: UserCheck,     route: '/torneo/plantilla' },
      { label: 'Partidos',      icon: CircleDot,     route: '/torneo/partidos' },
      { label: 'Posiciones',    icon: BarChart3,     route: '/torneo/posiciones' },
    ]
  }

  if (role === 'delegado') {
    return [
      ...baseItems,
      { label: 'Mis Partidos', icon: CircleDot, route: '/delegado/partidos' },
      { label: 'En Vivo',      icon: Radio,     route: '/delegado/en-vivo' },
    ]
  }

  if (role === 'admin_sede') {
    return [
      ...baseItems,
      { label: 'Canchas',    icon: Building2, route: '/sede/canchas' },
      { label: 'Calendario', icon: Calendar,  route: '/sede/calendario' },
    ]
  }

  return baseItems
})
</script>

<template>
  <div class="flex h-screen bg-matchx-bg-base">
    <!-- Sidebar -->
    <aside
      :class="[
        'fixed md:relative w-64 h-full bg-matchx-bg-surface border-r border-matchx-border-base flex flex-col transition-all duration-200 z-40',
        sidebarOpen ? 'left-0' : 'left-full md:left-0',
      ]"
    >
      <!-- Logo -->
      <div class="p-6 border-b border-matchx-border-base">
        <h1 class="text-2xl font-bold text-matchx-accent-green">matchX</h1>
        <p class="text-xs text-matchx-text-muted mt-1">v0.0.1 • Demo</p>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto p-4 space-y-2">
        <RouterLink
          v-for="item of navigationItems"
          :key="item.route"
          :to="item.route"
          @click="sidebarOpen = false"
          :class="[
            'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
            $route.path.startsWith(item.route)
              ? 'bg-matchx-accent-green/10 text-matchx-accent-green'
              : 'text-matchx-text-secondary hover:bg-matchx-bg-elevated',
          ]"
        >
          <component :is="item.icon" class="w-5 h-5 shrink-0" :stroke-width="1.75" />
          <span class="font-medium">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- User section -->
      <div class="p-4 border-t border-matchx-border-base space-y-4">
        <div class="flex items-center gap-3">
          <img
            :src="authStore.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'"
            :alt="authStore.userName"
            class="w-10 h-10 rounded-full"
          />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-matchx-text-primary truncate">
              {{ authStore.userName }}
            </div>
            <div class="text-xs text-matchx-text-muted uppercase">{{ authStore.userRole }}</div>
          </div>
        </div>

        <button
          @click="handleLogout"
          class="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-matchx-accent-orange/10 text-matchx-accent-orange hover:bg-matchx-accent-orange/20 transition-colors text-sm font-medium"
        >
          <LogOut class="w-4 h-4" :stroke-width="1.75" />
          Cerrar sesión
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Topbar -->
      <header class="flex items-center justify-between px-6 py-4 bg-matchx-bg-surface border-b border-matchx-border-base">
        <button
          @click="sidebarOpen = !sidebarOpen"
          aria-label="Abrir menú"
          class="md:hidden p-2 hover:bg-matchx-bg-elevated rounded-lg transition-colors text-matchx-text-secondary"
        >
          <Menu class="w-5 h-5" :stroke-width="1.75" />
        </button>

        <div class="flex-1 ml-4">
          <h2 class="text-lg font-semibold text-matchx-text-primary">
            {{ $route.meta.title || 'matchX' }}
          </h2>
        </div>

        <div class="flex items-center gap-4">
          <button
            aria-label="Notificaciones"
            class="p-2 hover:bg-matchx-bg-elevated rounded-lg transition-colors text-matchx-text-secondary"
          >
            <Bell class="w-5 h-5" :stroke-width="1.75" />
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: theme('colors.matchx.border-base');
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: theme('colors.matchx.text-muted');
}
</style>
