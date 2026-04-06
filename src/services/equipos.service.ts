import api from './api'

export interface Equipo {
  id: number
  nombre: string
  torneo_id: number
  ciudad: string
  colores: string
  escudo_url: string
  activo: number
  creado_en: string
  capitan_id?: number
}

function normalize(raw: any): Equipo {
  return {
    id:        raw.id_equipos ?? raw.id,
    nombre:    raw.nombre     ?? raw.name ?? '',
    torneo_id: raw.torneo_id  ?? raw.id_torneos ?? 0,
    ciudad:    raw.ciudad     ?? '',
    colores:   raw.colores    ?? [raw.color_principal, raw.color_secundario].filter(Boolean).join(','),
    escudo_url: raw.escudo_url ?? raw.logo_url ?? '',
    activo:    raw.activo     ?? raw.activated ?? 1,
    creado_en: raw.creado_en  ?? raw.created_at ?? '',
    capitan_id: raw.capitan_id ?? undefined,
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

  create: (payload: Partial<Equipo> & { nombre_corto?: string; color_principal?: string; color_secundario?: string }) =>
    api.post('/api/torneos/equipos', payload),

  update: (id: number, payload: Partial<Equipo>) =>
    api.put(`/api/torneos/equipos/${id}`, payload),

  toggle: (id: number) =>
    api.put(`/api/torneos/equipos/${id}/toggle`, {}),
}
