import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth.service'

export type UserRole =
  | 'superadmin'
  | 'admin_torneo'
  | 'admin_sede'
  | 'delegado'
  | 'arbitro'
  | 'jugador'
  | 'publico'

export interface AuthUser {
  usuario_id: number
  nombre: string
  correo: string
  rol: UserRole
  token: string
  avatar?: string
  torneo_id?: number   // solo admin_torneo: torneo que administra
  sede_id?: number     // solo admin_sede: sede que administra
  equipo_id?: number   // jugador: equipo al que pertenece
  es_capitan?: number  // jugador: 1 si es capitán de su equipo
}

export interface AuthProfile {
  id_profiles: number
  rol: string
  nombre: string
}

// Mapeo de roles del backend a roles internos del frontend
const rolMap: Record<string, UserRole> = {
  administrador: 'superadmin',
  admin_torneo:  'admin_torneo',
  admin_sede:    'admin_sede',
  delegado:      'delegado',
  arbitro:       'arbitro',
  capitan:       'jugador',  // el backend puede seguir enviando 'capitan', lo normalizamos a 'jugador'
  jugador:       'jugador',
  publico:       'publico',
}

function decodeJwtPayload(token: string): any {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return {} }
}

function normalizeUser(raw: any, token: string): AuthUser {
  const jwt = decodeJwtPayload(token)
  const backendRol = raw.rol ?? raw.role ?? 'publico'
  return {
    usuario_id: raw.id_users ?? raw.uid ?? raw.id ?? raw.usuario_id ?? jwt.uid ?? jwt.id ?? jwt.sub ?? 0,
    nombre:     raw.username ?? raw.nombre ?? raw.name ?? '',
    correo:     raw.email    ?? raw.correo ?? '',
    rol:        rolMap[backendRol] ?? (backendRol as UserRole),
    token,
    avatar:     raw.url_avatar ?? raw.avatar ?? undefined,
    torneo_id:  raw.torneo_id ?? raw.id_torneos ?? undefined,
    sede_id:    raw.sede_id   ?? raw.id_sedes   ?? undefined,
    equipo_id:  raw.equipo_id ?? raw.id_equipos ?? undefined,
    es_capitan: raw.es_capitan ?? 0,
  }
}

const STORAGE_KEY = 'matchx_session'

export const useAuthStore = defineStore('auth', () => {
  const user      = ref<AuthUser | null>(null)
  const isLoading = ref(false)

  // Estado intermedio del flujo select_profile
  const pendingProfiles    = ref<AuthProfile[]>([])
  const pendingUser        = ref<{ username: string; email: string } | null>(null)
  const pendingCredentials = ref<{ username: string; password: string } | null>(null)
  const requiresProfile    = computed(() => pendingProfiles.value.length > 0)

  const initSession = () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        user.value = JSON.parse(stored)
      } catch {
        logout()
      }
    }
  }

  const isAuthenticated = computed(() => !!user.value)
  const userRole        = computed(() => user.value?.rol ?? null)
  const userName        = computed(() => user.value?.nombre ?? 'Usuario')
  const isCapitan       = computed(() => user.value?.rol === 'jugador' && user.value?.es_capitan === 1)

  /**
   * Paso 1: envía credenciales.
   * Si el backend responde con status "select_profile", almacena los perfiles
   * y retorna true para que la vista muestre el selector.
   * Si responde con token directamente, cierra la sesión en un solo paso.
   */
  const login = async (username: string, password: string): Promise<boolean> => {
    isLoading.value = true
    try {
      const res  = await authService.login(username, password)
      const data = res.data as any

      if (data.status === 'select_profile') {
        pendingProfiles.value    = data.profiles ?? []
        pendingUser.value        = data.user ?? null
        pendingCredentials.value = { username, password }
        return true // indica que hay que seleccionar perfil
      }

      // Login directo (si el backend devuelve token sin selección de perfil)
      const { token, user: rawUser } = data
      if (!token) throw new Error('El servidor no devolvió un token')
      user.value = normalizeUser(rawUser ?? {}, token)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user.value))
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Paso 2: selecciona un perfil — reutiliza /api/login con selectedRole.
   */
  const selectProfile = async (selectedRole: string): Promise<void> => {
    if (!pendingCredentials.value) throw new Error('No hay credenciales pendientes')
    isLoading.value = true
    try {
      const { username, password } = pendingCredentials.value
      const res  = await authService.login(username, password, selectedRole)
      const data = res.data as any
      const { token, user: rawUser } = data

      if (!token) throw new Error('El servidor no devolvió un token al seleccionar perfil')

      user.value = normalizeUser(rawUser ?? {}, token)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user.value))
      // Limpiar estado pendiente
      pendingProfiles.value    = []
      pendingUser.value        = null
      pendingCredentials.value = null
    } finally {
      isLoading.value = false
    }
  }

  const clearPending = () => {
    pendingProfiles.value    = []
    pendingUser.value        = null
    pendingCredentials.value = null
  }

  const logout = async () => {
    try { await authService.logout() } catch { /* ignorar errores de red al logout */ }
    user.value               = null
    pendingProfiles.value    = []
    pendingUser.value        = null
    pendingCredentials.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  const hasRole   = (requiredRoles: UserRole[]): boolean =>
    !!user.value && requiredRoles.includes(user.value.rol)

  const canAccess = (allowedRoles: UserRole[]): boolean => hasRole(allowedRoles)

  return {
    user, isLoading,
    pendingProfiles, pendingUser, requiresProfile,
    isAuthenticated, userRole, userName, isCapitan,
    initSession, login, selectProfile, clearPending, logout, hasRole, canAccess,
  }
})
