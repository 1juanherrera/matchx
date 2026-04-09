<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import {
  LayoutDashboard, Users, Layers, Building2, Settings,
  Trophy, ClipboardList, UserCheck, CircleDot, BarChart3,
  Calendar, CalendarRange, Flag, Menu, Bell, LogOut, Sun, Moon, X, Inbox,
} from 'lucide-vue-next'

const router    = useRouter()
const authStore = useAuthStore()
const { isDark, toggle: toggleTheme } = useTheme()

const sidebarOpen  = ref(false)
const isLoggingOut = ref(false)

const rolColors: Record<string, string> = {
  superadmin:   'bg-matchx-accent-green/20 text-matchx-accent-green',
  admin_torneo: 'bg-blue-500/20 text-blue-400',
  admin_sede:   'bg-purple-500/20 text-purple-400',
  delegado:     'bg-matchx-accent-orange/20 text-matchx-accent-orange',
  arbitro:      'bg-yellow-500/20 text-yellow-400',
  jugador:      'bg-cyan-500/20 text-cyan-400',
  publico:      'bg-matchx-text-muted/20 text-matchx-text-muted',
}
const rolColor = computed(() =>
  rolColors[authStore.userRole ?? ''] ?? 'bg-matchx-text-muted/20 text-matchx-text-muted'
)
const iniciales = computed(() =>
  authStore.userName.split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase()
)

const handleLogout = async () => {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try {
    await authStore.logout()
    // La navegación a /login la maneja el watcher en App.vue
    // cuando isAuthenticated cambia a false.
  } finally {
    isLoggingOut.value = false
  }
}

const navigationItems = computed(() => {
  const role = authStore.userRole

  const dashboardRoute = role === 'admin_torneo' ? '/torneo/dashboard'
    : role === 'delegado'   ? '/delegado/partidos'
    : role === 'admin_sede' ? '/sede/dashboard'
    : role === 'arbitro'    ? '/arbitro/dashboard'
    : (role === 'capitan' || role === 'jugador') ? '/capitan/dashboard'
    : '/admin/dashboard'

  const baseItems = [
    { label: 'Dashboard', icon: LayoutDashboard, route: dashboardRoute },
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
      { label: 'Equipos',       icon: Users,         route: '/torneo/equipos' },
      { label: 'Inscripciones', icon: ClipboardList, route: '/torneo/inscripciones' },
      { label: 'Plantilla',     icon: UserCheck,     route: '/torneo/plantilla' },
      { label: 'Partidos',      icon: CircleDot,     route: '/torneo/partidos' },
      { label: 'Posiciones',    icon: BarChart3,     route: '/torneo/posiciones' },
      { label: 'Solicitudes',   icon: Inbox,         route: '/torneo/solicitudes' },
    ]
  }

  if (role === 'delegado') {
    return [{ label: 'Mis Partidos', icon: CircleDot, route: '/delegado/partidos' }]
  }

  if (role === 'admin_sede') {
    return [
      ...baseItems,
      { label: 'Canchas',    icon: Building2, route: '/sede/canchas' },
      { label: 'Calendario', icon: Calendar,  route: '/sede/calendario' },
    ]
  }

  if (role === 'arbitro') {
    return [
      ...baseItems,
      { label: 'Mis Partidos', icon: Flag, route: '/arbitro/partidos' },
    ]
  }

  if (role === 'jugador') {
    const items = [
      ...baseItems,
      { label: 'Mi Equipo',  icon: Users,         route: '/capitan/equipo' },
      { label: 'Fixture',    icon: CalendarRange, route: '/capitan/fixture' },
      { label: 'Posiciones', icon: BarChart3,     route: '/capitan/posiciones' },
    ]
    return items
  }

  return baseItems
})
</script>

<template>
  <div class="flex h-screen bg-matchx-bg-base">

    <!-- ── Overlay mobile ────────────────────────────────────────────────── -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 bg-black/50 z-30 md:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- ── Sidebar ────────────────────────────────────────────────────────── -->
    <aside
      :class="[
        'fixed md:relative w-64 h-full bg-matchx-bg-surface border-r border-matchx-border-base flex flex-col z-40 transition-transform duration-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ]"
    >
      <!-- Logo + close (mobile) -->
      <div class="p-6 border-b border-matchx-border-base flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-matchx-accent-green">matchX</h1>
          <p class="text-xs text-matchx-text-muted mt-0.5">v0.0.1 · Demo</p>
        </div>
        <button
          class="md:hidden p-1.5 rounded-lg text-matchx-text-muted hover:text-matchx-text-primary hover:bg-matchx-bg-elevated transition-colors"
          aria-label="Cerrar menú"
          @click="sidebarOpen = false"
        >
          <X class="w-4 h-4" :stroke-width="2" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto p-4 space-y-1">
        <RouterLink
          v-for="item of navigationItems"
          :key="item.route"
          :to="item.route"
          @click="sidebarOpen = false"
          :class="[
            'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors cursor-pointer',
            $route.path.startsWith(item.route)
              ? 'bg-matchx-accent-green/10 text-matchx-accent-green'
              : 'text-matchx-text-secondary hover:bg-matchx-bg-elevated hover:text-matchx-text-primary',
          ]"
        >
          <component :is="item.icon" class="w-4.5 h-4.5 shrink-0" :stroke-width="1.75" />
          <span class="text-sm font-medium">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- User section -->
      <div class="p-4 border-t border-matchx-border-base space-y-3">
        <div class="flex items-center gap-3 px-1">
          <div :class="['w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold', rolColor]">
            {{ iniciales }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-matchx-text-primary truncate">
              {{ authStore.userName }}
            </div>
            <div class="text-xs text-matchx-text-muted uppercase tracking-wide">
              {{ authStore.userRole }}
            </div>
          </div>
        </div>

        <button
          @click="handleLogout"
          :disabled="isLoggingOut"
          class="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-matchx-accent-orange/10 text-matchx-accent-orange hover:bg-matchx-accent-orange/20 transition-colors text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut class="w-4 h-4" :stroke-width="1.75" />
          Cerrar sesión
        </button>
      </div>
    </aside>

    <!-- ── Main content ───────────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">

      <!-- TopBar -->
      <header class="flex items-center gap-3 px-5 py-3 bg-matchx-bg-surface border-b border-matchx-border-base shrink-0">

        <!-- Hamburger (mobile) -->
        <button
          @click="sidebarOpen = !sidebarOpen"
          aria-label="Abrir menú"
          class="md:hidden p-2 hover:bg-matchx-bg-elevated rounded-lg transition-colors text-matchx-text-muted cursor-pointer"
        >
          <Menu class="w-5 h-5" :stroke-width="1.75" />
        </button>

        <!-- Breadcrumb — sección activa (sutil, no compite con el hero de la vista) -->
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium text-matchx-text-muted uppercase tracking-wider truncate">
            {{ $route.meta.title || 'matchX' }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1">

          <!-- Theme toggle -->
          <button
            :aria-label="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            class="p-2 hover:bg-matchx-bg-elevated rounded-lg transition-colors text-matchx-text-muted hover:text-matchx-text-primary cursor-pointer"
            @click="toggleTheme"
          >
            <Sun  v-if="!isDark" class="w-5 h-5" :stroke-width="1.75" />
            <Moon v-else          class="w-5 h-5" :stroke-width="1.75" />
          </button>

          <!-- Notifications -->
          <button
            aria-label="Notificaciones"
            class="p-2 hover:bg-matchx-bg-elevated rounded-lg transition-colors text-matchx-text-muted hover:text-matchx-text-primary cursor-pointer"
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
::-webkit-scrollbar        { width: 6px; }
::-webkit-scrollbar-track  { background: transparent; }
::-webkit-scrollbar-thumb  { background: rgb(var(--matchx-border-base)); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgb(var(--matchx-text-muted)); }
</style>
