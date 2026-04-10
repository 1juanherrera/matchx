import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserRole } from './auth'
import { usuariosService } from '@/services/usuarios.service'

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
  const loading  = ref(false)
  const error    = ref<string | null>(null)

  // Mock árbitro adicional para dev — remover cuando el backend tenga este usuario real
  const MOCK_ARBITRO: Usuario = {
    id: 9997, nombre: 'Roberto Méndez', correo: 'roberto@matchx.com',
    telefono: '3001234567', url_avatar: '', rol: 'arbitro',
    activo: 1, ultimo_acceso: '', creado_en: '',
  }

  const fetchUsuarios = async () => {
    loading.value = true
    error.value   = null
    try {
      const result = (await usuariosService.getAll()) as Usuario[]
      // Inyectar mock si el backend aún no lo tiene
      const yaTiene = result.some(u => u.correo === MOCK_ARBITRO.correo)
      usuarios.value = yaTiene ? result : [...result, MOCK_ARBITRO]
    } catch (err: any) {
      error.value = err.response?.data?.message ?? 'Error cargando usuarios'
    } finally {
      loading.value = false
    }
  }

  const usuariosActivos = computed(() => usuarios.value.filter(u => u.activo === 1))

  const usuariosPorRol = (rol: UserRole) => computed(() => usuarios.value.filter(u => u.rol === rol))

  const crearUsuario = async (usuario: Omit<Usuario, 'id' | 'creado_en' | 'ultimo_acceso'> & { contrasena?: string }) => {
    const res = await usuariosService.create({
      nombre:     usuario.nombre,
      correo:     usuario.correo,
      contrasena: usuario.contrasena ?? 'Temporal123*',
      rol:        usuario.rol,
    })
    const nuevo = res.data.data ?? res.data
    usuarios.value.push({
      ...usuario,
      id:           nuevo.id ?? nuevo.id_users,
      creado_en:    nuevo.creado_en  ?? new Date().toISOString(),
      ultimo_acceso: nuevo.ultimo_acceso ?? new Date().toISOString(),
    })
    return nuevo
  }

  const actualizarUsuario = async (id: number, datos: Partial<Usuario>) => {
    await usuariosService.update(id, datos)
    const idx = usuarios.value.findIndex(u => u.id === id)
    if (idx !== -1) usuarios.value[idx] = { ...usuarios.value[idx], ...datos }
  }

  const eliminarUsuario = async (id: number) => {
    await usuariosService.toggle(id)
    const idx = usuarios.value.findIndex(u => u.id === id)
    if (idx !== -1) usuarios.value.splice(idx, 1)
  }

  const desactivarUsuario = async (id: number) => {
    await usuariosService.toggle(id)
    const idx = usuarios.value.findIndex(u => u.id === id)
    if (idx !== -1) usuarios.value[idx].activo = 0
  }

  const obtenerPorId = (id: number) => usuarios.value.find(u => u.id === id)

  return {
    usuarios, loading, error,
    usuariosActivos, usuariosPorRol,
    fetchUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, desactivarUsuario, obtenerPorId,
  }
})
