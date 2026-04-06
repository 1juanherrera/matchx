import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth.service'

export type UserRole = 'superadmin' | 'admin_torneo' | 'admin_sede' | 'delegado' | 'arbitro' | 'capitan' | 'publico'

export interface AuthUser {
  usuario_id: number
  nombre: string
  correo: string
  rol: UserRole
  token: string
  avatar?: string
}

// Mapeo de roles del backend a roles internos del frontend
const rolMap: Record<string, UserRole> = {
  administrador: 'superadmin',
  admin_torneo:  'admin_torneo',
  admin_sede:    'admin_sede',
  delegado:      'delegado',
  arbitro:       'arbitro',
  capitan:       'capitan',
  publico:       'publico',
}

// Normaliza el usuario que devuelve el backend al shape interno
function normalizeUser(raw: any, token: string): AuthUser {
  const backendRol = raw.rol ?? raw.role ?? 'publico'
  return {
    usuario_id: raw.id_users ?? raw.uid ?? raw.id ?? raw.usuario_id ?? 0,
    nombre:     raw.username ?? raw.nombre ?? raw.name ?? '',
    correo:     raw.email    ?? raw.correo ?? '',
    rol:        rolMap[backendRol] ?? (backendRol as UserRole),
    token,
    avatar:     raw.url_avatar ?? raw.avatar ?? undefined,
  }
}

const STORAGE_KEY = 'matchx_session'

export const useAuthStore = defineStore('auth', () => {
  const user      = ref<AuthUser | null>(null)
  const isLoading = ref(false)

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

  const login = async (username: string, password: string) => {
    isLoading.value = true
    try {
      // POST /api/login → { status, token, user: { rol, username, permisos, ... } }
      const loginRes = await authService.login(username, password)
      const { token, user: rawUser } = loginRes.data

      if (!token) throw new Error('El servidor no devolvió un token')

      user.value = normalizeUser(rawUser ?? {}, token)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user.value))
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try { await authService.logout() } catch { /* ignorar errores de red al logout */ }
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  const hasRole    = (requiredRoles: UserRole[]): boolean =>
    !!user.value && requiredRoles.includes(user.value.rol)

  const canAccess  = (allowedRoles: UserRole[]): boolean => hasRole(allowedRoles)

  return {
    user, isLoading,
    isAuthenticated, userRole, userName,
    initSession, login, logout, hasRole, canAccess,
  }
})
