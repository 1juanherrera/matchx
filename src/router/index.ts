import { createRouter, createWebHistory, RouteRecordRaw, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/stores/auth'

// Lazy load views
const LoginView = () => import('@/views/auth/LoginView.vue')

// Layouts
const AuthLayout = () => import('@/layouts/AuthLayout.vue')

declare module 'vue-router' {
  interface RouteMeta {
    layout?: string
    requiresAuth?: boolean
    requiereRol?: UserRole[]
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: {
      layout: 'AuthLayout',
      requiresAuth: false,
    },
  },
  {
    path: '/',
    redirect: '/admin/dashboard',
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: {
      layout: 'AppLayout',
      requiereRol: ['superadmin'],
    },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin-sistema/DashboardView.vue'),
        meta: {
          title: 'Dashboard',
          requiereRol: ['superadmin'],
        },
      },
      {
        path: 'usuarios',
        name: 'AdminUsuarios',
        component: () => import('@/views/admin-sistema/UsuariosView.vue'),
        meta: {
          title: 'Usuarios',
          requiereRol: ['superadmin'],
        },
      },
      {
        path: 'modalidades',
        name: 'AdminModalidades',
        component: () => import('@/views/admin-sistema/ModalidadesView.vue'),
        meta: {
          title: 'Modalidades',
          requiereRol: ['superadmin'],
        },
      },
      {
        path: 'sedes',
        name: 'AdminSedes',
        component: () => import('@/views/admin-sistema/SedesView.vue'),
        meta: {
          title: 'Sedes',
          requiereRol: ['superadmin'],
        },
      },
      {
        path: 'configuracion',
        name: 'AdminConfiguracion',
        component: () => import('@/views/admin-sistema/ConfiguracionView.vue'),
        meta: {
          title: 'Configuración',
          requiereRol: ['superadmin'],
        },
      },
    ],
  },
  {
    path: '/torneo',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: {
      layout: 'AppLayout',
      requiereRol: ['admin_torneo'],
    },
    children: [
      {
        path: 'dashboard',
        name: 'TorneoDashboard',
        component: () => import('@/views/admin-sistema/DashboardView.vue'),
        meta: {
          title: 'Dashboard Torneo',
          requiereRol: ['admin_torneo'],
        },
      },
    ],
  },
  {
    path: '/delegado',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: {
      layout: 'AppLayout',
      requiereRol: ['delegado'],
    },
    children: [
      {
        path: 'partidos',
        name: 'DelegadoPartidos',
        component: () => import('@/views/admin-sistema/DashboardView.vue'),
        meta: {
          title: 'Mis Partidos',
          requiereRol: ['delegado'],
        },
      },
    ],
  },
  {
    path: '/no-autorizado',
    name: 'NoAutorizado',
    component: () => import('@/views/auth/NoAutorizadoView.vue'),
    meta: {
      layout: 'AuthLayout',
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Global navigation guard
router.beforeEach((to: RouteLocationNormalized, _from: RouteLocationNormalized) => {
  const authStore = useAuthStore()

  // Initialize session from localStorage
  if (!authStore.isAuthenticated) {
    authStore.initSession()
  }

  const isPublicRoute = to.path === '/login' || to.path === '/no-autorizado'
  const isAuthenticated = authStore.isAuthenticated

  // Redirect to login if not authenticated and trying to access protected route
  if (!isPublicRoute && !isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // Redirect to home if trying to access login while authenticated
  if (isPublicRoute && isAuthenticated && to.path === '/login') {
    return { path: '/admin/dashboard' }
  }

  // Check role-based access
  const requiredRoles = (to.meta.requiereRol || []) as UserRole[]
  if (requiredRoles.length > 0 && isAuthenticated) {
    if (!authStore.canAccess(requiredRoles)) {
      return { name: 'NoAutorizado' }
    }
  }
})

export default router
