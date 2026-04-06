import api from './api'

export interface Cancha {
  id: number
  sede_id: number
  nombre: string
  tipo: string
  largo_metros?: number
  ancho_metros?: number
  capacidad?: number
  disponible: boolean
}

export interface Sede {
  id: number
  nombre: string
  ciudad: string
  departamento: string
  direccion: string
  capacidad: number
  telefono: string
  email: string
  activo: number
  creado_en: string
  canchas: Cancha[]
}

function normalizeCancha(raw: any): Cancha {
  return {
    id:           raw.id_canchas    ?? raw.id,
    sede_id:      raw.sede_id       ?? raw.id_sedes ?? 0,
    nombre:       raw.nombre        ?? raw.name ?? '',
    tipo:         raw.tipo_superficie ?? raw.tipo ?? '',
    largo_metros: raw.largo_metros,
    ancho_metros: raw.ancho_metros,
    capacidad:    raw.capacidad,
    disponible:   raw.disponible    ?? raw.activo === 1 ?? true,
  }
}

function normalizeSede(raw: any): Sede {
  return {
    id:           raw.id_sedes  ?? raw.id,
    nombre:       raw.name      ?? raw.nombre ?? '',
    ciudad:       raw.ciudad    ?? raw.ubicacion?.ciudad ?? '',
    departamento: raw.departamento ?? raw.ubicacion?.departamento ?? '',
    direccion:    raw.direccion_principal ?? raw.ubicacion?.direccion_principal ?? raw.direccion ?? '',
    capacidad:    raw.capacidad ?? 0,
    telefono:     raw.telefono  ?? raw.ubicacion?.telefono ?? '',
    email:        raw.email     ?? '',
    activo:       raw.estado    ?? raw.activo ?? 1,
    creado_en:    raw.creado_en ?? raw.created_at ?? '',
    canchas:      (raw.canchas ?? []).map(normalizeCancha),
  }
}

export const sedesService = {
  getAll: async (): Promise<Sede[]> => {
    const { data } = await api.get('/api/torneos/sedes')
    return (data.data ?? data).map(normalizeSede)
  },

  getById: async (id: number): Promise<Sede> => {
    const { data } = await api.get(`/api/torneos/sedes/${id}`)
    return normalizeSede(data.data ?? data)
  },

  getCanchas: async (sedeId: number): Promise<Cancha[]> => {
    const { data } = await api.get(`/api/torneos/sedes/${sedeId}/canchas`)
    return (data.data ?? data).map(normalizeCancha)
  },

  create: (payload: {
    nombre: string
    nombre_comercial?: string
    descripcion?: string
    email?: string
    web?: string
    estado?: number
    direccion?: string
    barrio?: string
    telefono?: string
    celular?: string
  }) => api.post('/api/torneos/sedes', payload),

  update: (id: number, payload: Partial<Sede> & { barrio?: string; celular?: string }) =>
    api.put(`/api/torneos/sedes/${id}`, payload),

  toggle: (id: number) =>
    api.put(`/api/torneos/sedes/${id}/toggle`, {}),

  // ─── Canchas ─────────────────────────────────────────────────────────────
  crearCancha: (payload: { sede_id: number; nombre: string; tipo_superficie?: string }) =>
    api.post('/api/torneos/canchas', payload),

  actualizarCancha: (canchaId: number, payload: Partial<Cancha>) =>
    api.put(`/api/torneos/canchas/${canchaId}`, payload),

  toggleCancha: (canchaId: number) =>
    api.put(`/api/torneos/canchas/${canchaId}/toggle`, {}),

  eliminarCancha: (canchaId: number) =>
    api.delete(`/api/torneos/canchas/${canchaId}`),
}
