import api from './api'

export interface Modalidad {
  id: number
  nombre: string
  codigo: string
  descripcion: string
  jugadores_por_equipo: number
  duracion_minutos: number
  descanso_minutos: number
  cambios_permitidos: number
  activo: number
  reglas?: Record<string, boolean>
  creado_en: string
}

function normalize(raw: any): Modalidad {
  return {
    id:                   raw.id_modalidades ?? raw.id,
    nombre:               raw.nombre ?? raw.name ?? '',
    codigo:               raw.codigo ?? '',
    descripcion:          raw.descripcion ?? '',
    jugadores_por_equipo: raw.jugadores_por_equipo ?? 0,
    duracion_minutos:     raw.duracion_tiempo_minutos ?? raw.duracion_minutos ?? 0,
    descanso_minutos:     raw.descanso_minutos ?? 0,
    cambios_permitidos:   raw.max_cambios ?? raw.cambios_permitidos ?? 0,
    activo:               raw.activo ?? raw.activated ?? 1,
    reglas:               raw.reglas ?? {
      fuera_de_juego: false,
      arquero_puede_recibir_pase: false,
      limite_pases_atras: false,
      tarjeta_roja_automatica: false,
    },
    creado_en:            raw.creado_en ?? raw.created_at ?? '',
  }
}

export const modalidadesService = {
  getAll: async (): Promise<Modalidad[]> => {
    const { data } = await api.get('/api/torneos/modalidades')
    return (data.data ?? data).map(normalize)
  },

  getById: async (id: number): Promise<Modalidad> => {
    const { data } = await api.get(`/api/torneos/modalidades/${id}`)
    return normalize(data.data ?? data)
  },

  create: (payload: Partial<Modalidad>) =>
    api.post('/api/torneos/modalidades', payload),

  update: (id: number, payload: Partial<Modalidad>) =>
    api.put(`/api/torneos/modalidades/${id}`, payload),

  toggle: (id: number) =>
    api.put(`/api/torneos/modalidades/${id}/toggle`, {}),

  delete: (id: number) =>
    api.delete(`/api/torneos/modalidades/${id}`),
}
