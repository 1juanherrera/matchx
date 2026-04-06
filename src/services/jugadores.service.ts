import api from './api'

export type Posicion = 'portero' | 'defensa' | 'mediocampo' | 'delantero'

export interface Jugador {
  id: number
  nombre: string
  apellido: string
  numero_camiseta: number
  posicion: Posicion
  equipo_id: number
  activo: number
}

function normalize(raw: any): Jugador {
  return {
    id:              raw.id_jugadores ?? raw.id,
    nombre:          raw.nombre  ?? raw.name  ?? '',
    apellido:        raw.apellido ?? '',
    numero_camiseta: raw.numero_camiseta ?? raw.numero_dorsal ?? 0,
    posicion:        raw.posicion ?? 'defensa',
    equipo_id:       raw.equipo_id ?? raw.id_equipos ?? 0,
    activo:          raw.activo ?? raw.activated ?? 1,
  }
}

export const jugadoresService = {
  getAll: async (): Promise<Jugador[]> => {
    const { data } = await api.get('/api/torneos/jugadores')
    return (data.data ?? data).map(normalize)
  },

  search: async (nombre: string): Promise<Jugador[]> => {
    const { data } = await api.get('/api/torneos/jugadores', { params: { nombre } })
    return (data.data ?? data).map(normalize)
  },

  getById: async (id: number): Promise<Jugador> => {
    const { data } = await api.get(`/api/torneos/jugadores/${id}`)
    return normalize(data.data ?? data)
  },

  getTorneos: (id: number) =>
    api.get(`/api/torneos/jugadores/${id}/torneos`),

  getEstadisticas: (jugadorId: number, torneoId: number) =>
    api.get(`/api/torneos/jugadores/${jugadorId}/estadisticas/${torneoId}`),

  create: (payload: Partial<Jugador> & { tipo_documento?: string; numero_documento?: string; fecha_nacimiento?: string; telefono?: string; correo?: string }) =>
    api.post('/api/torneos/jugadores', payload),

  update: (id: number, payload: Partial<Jugador>) =>
    api.put(`/api/torneos/jugadores/${id}`, payload),

  toggle: (id: number) =>
    api.put(`/api/torneos/jugadores/${id}/toggle`, {}),
}
