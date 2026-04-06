import api from './api'
import type { UserRole } from '@/stores/auth'

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

function normalize(raw: any): Usuario {
  return {
    id:            raw.id_users  ?? raw.id,
    nombre:        raw.username  ?? raw.nombre  ?? raw.name ?? '',
    correo:        raw.email     ?? raw.correo  ?? '',
    telefono:      raw.telefono  ?? raw.phone   ?? '',
    url_avatar:    raw.url_avatar ?? raw.avatar ?? '',
    rol:           raw.rol       ?? raw.role    ?? 'publico',
    activo:        raw.activated ?? raw.activo  ?? 1,
    ultimo_acceso: raw.ultimo_acceso ?? raw.last_login ?? '',
    creado_en:     raw.creado_en ?? raw.created_at ?? '',
  }
}

export const usuariosService = {
  getAll: async (): Promise<Usuario[]> => {
    const { data } = await api.get('/api/torneos/usuarios')
    return (data.data ?? data).map(normalize)
  },

  getByRol: async (rol: string): Promise<Usuario[]> => {
    const { data } = await api.get('/api/torneos/usuarios', { params: { rol } })
    return (data.data ?? data).map(normalize)
  },

  getDelegados: async (): Promise<Usuario[]> => {
    const { data } = await api.get('/api/torneos/usuarios/delegados')
    return (data.data ?? data).map(normalize)
  },

  getArbitrosDisponibles: async (): Promise<Usuario[]> => {
    const { data } = await api.get('/api/torneos/usuarios/arbitros-disponibles')
    return (data.data ?? data).map(normalize)
  },

  getById: async (id: number): Promise<Usuario> => {
    const { data } = await api.get(`/api/torneos/usuarios/${id}`)
    return normalize(data.data ?? data)
  },

  create: (payload: { nombre: string; correo: string; contrasena: string; rol: UserRole }) =>
    api.post('/api/torneos/usuarios', payload),

  update: (id: number, payload: Partial<Usuario>) =>
    api.put(`/api/torneos/usuarios/${id}`, payload),

  changePassword: (id: number, nueva_contrasena: string) =>
    api.put(`/api/torneos/usuarios/${id}/password`, { nueva_contrasena }),

  toggle: (id: number) =>
    api.put(`/api/torneos/usuarios/${id}/toggle`, {}),
}
