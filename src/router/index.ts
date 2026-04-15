import { createRouter, createWebHistory, RouteRecordRaw, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/stores/auth'

// Lazy load views
const LoginView = () => import('@/views/auth/LoginView.vue')

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
    redirect: () => {
      const auth = useAuthStore()
      if (!auth.isAuthenticated) auth.initSession()
      if (!auth.isAuthenticated) return '/publico/torneos'
      const role = auth.userRole
      if (role === 'admin_torneo') return '/torneo/dashboard'
      if (role === 'delegado') return '/delegado/partidos'
      if (role === 'admin_sede') return '/sede/dashboard'
      if (role === 'arbitro') return '/arbitro/dashboard'
      if (role === 'jugador') return '/capitan/dashboard'
      return '/admin/dashboard'
    },
  },
  {
    path: '/publico',
    component: () => import('@/layouts/PublicLayout.vue'),
    meta: { requiresAuth: false },
    children: [
      {
        path: '',
        redirect: '/publico/torneos',
      },
      {
        path: 'torneos',
        name: 'PublicoTorneos',
        component: () => import('@/views/publico/TorneosPublicoView.vue'),
        meta: { title: 'Torneos', requiresAuth: false },
      },
      {
        path: 'posiciones',
        name: 'PublicoPosiciones',
        component: () => import('@/views/publico/PosicionesPublicoView.vue'),
        meta: { title: 'Tabla de Posiciones', requiresAuth: false },
      },
      {
        path: 'fixture',
        name: 'PublicoFixture',
        component: () => import('@/views/publico/FixturePublicoView.vue'),
        meta: { title: 'Fixture y Resultados', requiresAuth: false },
      },
      {
        path: 'goleadores',
        name: 'PublicoGoleadores',
        component: () => import('@/views/publico/GoleadoresPublicoView.vue'),
        meta: { title: 'Goleadores', requiresAuth: false },
      },
      {
        path: 'sedes',
        name: 'PublicoSedes',
        component: () => import('@/views/publico/SedesPublicoView.vue'),
        meta: { title: 'Sedes', requiresAuth: false },
      },
      {
        path: 'partidos/:id',
        name: 'PublicoPartidoDetalle',
        component: () => import('@/views/publico/PartidoDetallePublicoView.vue'),
        meta: { title: 'Detalle Partido', requiresAuth: false },
      },
    ],
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
        component: () => import('@/views/admin-torneo/TorneoDashboardView.vue'),
        meta: { title: 'Dashboard', requiereRol: ['admin_torneo'] },
      },
      {
        path: 'torneos',
        name: 'TorneosTorneos',
        component: () => import('@/views/admin-torneo/TorneosView.vue'),
        meta: { title: 'Torneos', requiereRol: ['admin_torneo'] },
      },
      {
        path: 'equipos',
        name: 'TorneoEquipos',
        component: () => import('@/views/admin-torneo/EquiposView.vue'),
        meta: { title: 'Equipos', requiereRol: ['admin_torneo'] },
      },
      {
        path: 'inscripciones',
        name: 'TorneoInscripciones',
        component: () => import('@/views/admin-torneo/InscripcionesView.vue'),
        meta: { title: 'Inscripciones', requiereRol: ['admin_torneo'] },
      },
      {
        path: 'plantilla',
        name: 'TorneoPlantilla',
        component: () => import('@/views/admin-torneo/PlantillaView.vue'),
        meta: { title: 'Plantilla', requiereRol: ['admin_torneo'] },
      },
      {
        path: 'partidos',
        name: 'TorneoPartidos',
        component: () => import('@/views/admin-torneo/PartidosView.vue'),
        meta: { title: 'Partidos', requiereRol: ['admin_torneo'] },
      },
      {
        path: 'partidos/:id/acta',
        name: 'TorneoActaPartido',
        component: () => import('@/views/admin-torneo/ActaPartidoView.vue'),
        meta: { title: 'Acta de Partido', requiereRol: ['admin_torneo'] },
      },
      {
        path: 'posiciones',
        name: 'TorneoPosiciones',
        component: () => import('@/views/admin-torneo/PosicionesView.vue'),
        meta: { title: 'Tabla de Posiciones', requiereRol: ['admin_torneo'] },
      },
      {
        path: 'goleadores',
        name: 'TorneoGoleadores',
        component: () => import('@/views/admin-torneo/GoleadoresView.vue'),
        meta: { title: 'Goleadores', requiereRol: ['admin_torneo'] },
      },
      {
        path: 'solicitudes',
        name: 'TorneoSolicitudes',
        component: () => import('@/views/admin-torneo/SolicitudesView.vue'),
        meta: { title: 'Solicitudes', requiereRol: ['admin_torneo'] },
      },
      {
        path: 'sanciones',
        name: 'TorneoSanciones',
        component: () => import('@/views/admin-torneo/SancionesView.vue'),
        meta: { title: 'Sanciones', requiereRol: ['admin_torneo'] },
      },
    ],
  },
  {
    path: '/sede',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: {
      layout: 'AppLayout',
      requiereRol: ['admin_sede'],
    },
    children: [
      {
        path: 'dashboard',
        name: 'SedeDashboard',
        component: () => import('@/views/admin-sede/SedeDashboardView.vue'),
        meta: { title: 'Dashboard', requiereRol: ['admin_sede'] },
      },
      {
        path: 'canchas',
        name: 'SedeCanchas',
        component: () => import('@/views/admin-sede/CanchasView.vue'),
        meta: { title: 'Canchas', requiereRol: ['admin_sede'] },
      },
      {
        path: 'calendario',
        name: 'SedeCalendario',
        component: () => import('@/views/admin-sede/CalendarioView.vue'),
        meta: { title: 'Calendario', requiereRol: ['admin_sede'] },
      },
    ],
  },
  {
    path: '/arbitro',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { layout: 'AppLayout', requiereRol: ['arbitro'] },
    children: [
      {
        path: 'dashboard',
        name: 'ArbitroDashboard',
        component: () => import('@/views/arbitro/ArbitroDashboardView.vue'),
        meta: { title: 'Dashboard', requiereRol: ['arbitro'] },
      },
      {
        path: 'partidos',
        name: 'ArbitroPartidos',
        component: () => import('@/views/arbitro/MisPartidosView.vue'),
        meta: { title: 'Mis Partidos', requiereRol: ['arbitro'] },
      },
    ],
  },
  {
    path: '/capitan',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { layout: 'AppLayout', requiereRol: ['jugador'] },
    children: [
      {
        path: 'dashboard',
        name: 'JugadorDashboard',
        component: () => import('@/views/capitan/CapitanDashboardView.vue'),
        meta: { title: 'Dashboard', requiereRol: ['jugador'] },
      },
      {
        path: 'equipo',
        name: 'JugadorEquipo',
        component: () => import('@/views/capitan/MiEquipoView.vue'),
        meta: { title: 'Mi Equipo', requiereRol: ['jugador'] },
      },
      {
        path: 'fixture',
        name: 'JugadorFixture',
        component: () => import('@/views/capitan/FixtureView.vue'),
        meta: { title: 'Fixture', requiereRol: ['jugador'] },
      },
      {
        path: 'posiciones',
        name: 'JugadorPosiciones',
        component: () => import('@/views/capitan/PosicionesView.vue'),
        meta: { title: 'Tabla de Posiciones', requiereRol: ['jugador'] },
      },
      {
        path: 'goleadores',
        name: 'JugadorGoleadores',
        component: () => import('@/views/capitan/GoleadoresView.vue'),
        meta: { title: 'Goleadores', requiereRol: ['jugador'] },
      },
      {
        path: 'sanciones',
        name: 'CapitanSanciones',
        component: () => import('@/views/capitan/SancionesView.vue'),
        meta: { title: 'Sanciones', requiereRol: ['jugador'] },
      },
      {
        path: 'perfil',
        name: 'CapitanPerfil',
        component: () => import('@/views/capitan/PerfilView.vue'),
        meta: { title: 'Mi Perfil', requiereRol: ['jugador'] },
      },
      {
        path: 'partidos/:id',
        name: 'JugadorPartidoDetalle',
        component: () => import('@/views/publico/PartidoDetallePublicoView.vue'),
        meta: { title: 'Detalle del Partido', requiereRol: ['jugador'] },
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
        component: () => import('@/views/delegado/MisPartidosView.vue'),
        meta: {
          title: 'Mis Partidos',
          requiereRol: ['delegado'],
        },
      },
    ],
  },
  {
    path: '/delegado/en-vivo',
    component: () => import('@/layouts/DelegadoLayout.vue'),
    meta: { requiereRol: ['delegado'] },
    children: [
      {
        path: ':id',
        name: 'DelegadoEnVivo',
        component: () => import('@/views/delegado/EnVivoView.vue'),
        meta: {
          title: 'Mesa de Control',
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

  const isPublicRoute =
    to.path === '/login' ||
    to.path === '/no-autorizado' ||
    to.path.startsWith('/publico') ||
    to.meta.requiresAuth === false

  // Solo restaurar sesión desde localStorage cuando se navega a rutas protegidas.
  // En rutas públicas (especialmente /login tras logout) NO se debe llamar
  // initSession(), ya que podría restaurar una sesión aún no limpiada y causar
  // una redirección involuntaria de vuelta al dashboard.
  if (!authStore.isAuthenticated && !isPublicRoute) {
    authStore.initSession()
  }

  const isAuthenticated = authStore.isAuthenticated

  // Redirect to login if not authenticated and trying to access protected route
  if (!isPublicRoute && !isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // Redirect to home if trying to access login while authenticated
  if (isPublicRoute && isAuthenticated && to.path === '/login') {
    const role = authStore.userRole
    if (role === 'admin_torneo') return { path: '/torneo/dashboard' }
    if (role === 'delegado') return { path: '/delegado/partidos' }
    if (role === 'admin_sede') return { path: '/sede/dashboard' }
    if (role === 'arbitro') return { path: '/arbitro/dashboard' }
    if (role === 'jugador') return { path: '/capitan/dashboard' }
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
