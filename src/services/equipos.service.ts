import api from './api'

export interface Equipo {
  id: number
  nombre: string
  nombre_corto: string
  torneo_id: number
  color_principal: string
  color_secundario: string
  color_terciario: string
  color_cuaternario: string
  escudo_url: string
  capitan_nombre: string
  activo: number
  creado_en: string
}

function normalize(raw: any): Equipo {
  return {
    id:               raw.id_equipos     ?? raw.id,
    nombre:           raw.nombre         ?? '',
    nombre_corto:     raw.nombre_corto   ?? '',
    torneo_id:        raw.torneo_id      ?? raw.id_torneos ?? 0,
    color_principal:   raw.color_principal   ?? '',
    color_secundario:  raw.color_secundario  ?? '',
    color_terciario:   raw.color_terciario   ?? '',
    color_cuaternario: raw.color_cuaternario ?? '',
    escudo_url:       raw.url_escudo     ?? raw.escudo_url ?? raw.logo_url ?? '',
    capitan_nombre:   raw.capitan_nombre ?? '',
    activo:           raw.activo         ?? 1,
    creado_en:        raw.creado_en      ?? raw.created_at ?? '',
  }
}

export const equiposService = {
  getAll: async (): Promise<Equipo[]> => {
    const { data } = await api.get('/api/torneos/equipos')
    return (data.data ?? data).map(normalize)
  },

  getById: async (id: number): Promise<Equipo> => {
    const { data } = await api.get(`/api/torneos/equipos/${id}`)
    return normalize(data.data ?? data)
  },

  getPlantilla: (equipoId: number, torneoId: number) =>
    api.get(`/api/torneos/equipos/${equipoId}/plantilla/${torneoId}`),

  create: (payload: Partial<Equipo>) =>
    api.post('/api/torneos/equipos', payload),

  update: (id: number, payload: Partial<Equipo>) =>
    api.put(`/api/torneos/equipos/${id}`, payload),

  toggle: (id: number) =>
    api.put(`/api/torneos/equipos/${id}/toggle`, {}),
}
