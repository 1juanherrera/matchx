import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type UserRole = 'superadmin' | 'admin_torneo' | 'admin_sede' | 'delegado' | 'arbitro' | 'capitan' | 'publico'

export interface AuthUser {
  usuario_id: number
  nombre: string
  correo: string
  rol: UserRole
  token: string
  avatar?: string
}

const STORAGE_KEY = 'matchx_session'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<AuthUser | null>(null)
  const isLoading = ref(false)

  // Load from localStorage on init
  const initSession = () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        user.value = JSON.parse(stored)
      } catch (e) {
        console.error('Failed to load session:', e)
        logout()
      }
    }
  }

  // Computed
  const isAuthenticated = computed(() => !!user.value)
  const userRole = computed(() => user.value?.rol || null)
  const userName = computed(() => user.value?.nombre || 'Usuario')

  // Methods
  const login = async (usuario_id: number, rol: UserRole) => {
    isLoading.value = true
    try {
      // Mock login delay
      await new Promise(resolve => setTimeout(resolve, 800))

      // Get user data from mock
      const users = await import('@/data/mocks/usuarios.json')
      const mockUser = users.default.find((u: any) => u.id === usuario_id && u.rol === rol)

      if (!mockUser) {
        throw new Error('Usuario no encontrado')
      }

      user.value = {
        usuario_id: mockUser.id,
        nombre: mockUser.nombre,
        correo: mockUser.correo,
        rol: mockUser.rol,
        token: `mock-token-${usuario_id}-${Date.now()}`,
        avatar: mockUser.url_avatar,
      }

      // Persist to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user.value))
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const logout = () => {
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  const hasRole = (requiredRoles: UserRole[]): boolean => {
    if (!user.value) return false
    return requiredRoles.includes(user.value.rol)
  }

  const canAccess = (allowedRoles: UserRole[]): boolean => {
    return hasRole(allowedRoles)
  }

  return {
    // State
    user,
    isLoading,

    // Computed
    isAuthenticated,
    userRole,
    userName,

    // Methods
    initSession,
    login,
    logout,
    hasRole,
    canAccess,
  }
})
