import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserRole } from './auth'

export interface Usuario {
  id: number
  nombre: string
  correo: string
  telefono: string
  url_avatar: string
  rol: UserRole
  activo: number
  ultimo_acceso: string
  creado_en: string
}

export const useUsuariosStore = defineStore('usuarios', () => {
  const usuarios = ref<Usuario[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchUsuarios = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await import('@/data/mocks/usuarios.json')
      usuarios.value = data.default
    } catch (err) {
      error.value = 'Error cargando usuarios'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const usuariosActivos = computed(() => usuarios.value.filter(u => u.activo === 1))

  const usuariosPorRol = (rol: UserRole) => computed(() => usuarios.value.filter(u => u.rol === rol))

  const crearUsuario = (usuario: Omit<Usuario, 'id' | 'creado_en' | 'ultimo_acceso'>) => {
    const nuevoId = Math.max(...usuarios.value.map(u => u.id), 0) + 1
    const nuevoUsuario: Usuario = {
      ...usuario,
      id: nuevoId,
      creado_en: new Date().toISOString(),
      ultimo_acceso: new Date().toISOString(),
    }
    usuarios.value.push(nuevoUsuario)
    return nuevoUsuario
  }

  const actualizarUsuario = (id: number, datos: Partial<Usuario>) => {
    const idx = usuarios.value.findIndex(u => u.id === id)
    if (idx === -1) return false
    usuarios.value[idx] = { ...usuarios.value[idx], ...datos }
    return true
  }

  const eliminarUsuario = (id: number) => {
    const idx = usuarios.value.findIndex(u => u.id === id)
    if (idx === -1) return false
    usuarios.value.splice(idx, 1)
    return true
  }

  const desactivarUsuario = (id: number) => {
    return actualizarUsuario(id, { activo: 0 })
  }

  const obtenerPorId = (id: number) => usuarios.value.find(u => u.id === id)

  return {
    usuarios,
    loading,
    error,
    usuariosActivos,
    usuariosPorRol,
    fetchUsuarios,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    desactivarUsuario,
    obtenerPorId,
  }
})
