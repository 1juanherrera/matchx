import api from './api'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type TipoComunicado = 'general' | 'urgente' | 'informativo'

export interface Comunicado {
  id:                number
  titulo:            string
  cuerpo:            string
  tipo:              TipoComunicado
  torneo_id:         number | null
  imagen_url:        string | null
  creado_por:        number
  creado_por_nombre: string
  activo:            boolean
  created_at:        string
  updated_at:        string
}

export interface ComunicadoPayload {
  titulo:     string
  cuerpo:     string
  tipo:       TipoComunicado
  torneo_id:  number | null
  imagen_url: string | null
}

// ─── Normalización ───────────────────────────────────────────────────────────

function normalize(raw: any): Comunicado {
  return {
    id:                raw.id_comunicados    ?? raw.id,
    titulo:            raw.titulo            ?? '',
    cuerpo:            raw.cuerpo            ?? '',
    tipo:              raw.tipo              ?? 'general',
    torneo_id:         raw.torneo_id         ?? null,
    imagen_url:        raw.imagen_url        ?? null,
    creado_por:        raw.creado_por        ?? 0,
    creado_por_nombre: raw.creado_por_nombre ?? '',
    activo:            raw.activo === true || raw.activo === 1,
    created_at:        raw.created_at        ?? new Date().toISOString(),
    updated_at:        raw.updated_at        ?? new Date().toISOString(),
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const comunicadosService = {
  getAll: async (params?: { torneo_id?: number; tipo?: TipoComunicado }): Promise<Comunicado[]> => {
    const { data } = await api.get('/api/torneos/comunicados', { params })
    return (data.data ?? data).map(normalize)
  },

  create: async (payload: ComunicadoPayload): Promise<Comunicado> => {
    const { data } = await api.post('/api/torneos/comunicados', payload)
    const body = data.data ?? data
    if (body.status === 'error') throw new Error(body.message)
    return normalize(body)
  },

  update: async (id: number, payload: Partial<ComunicadoPayload>): Promise<Comunicado> => {
    const { data } = await api.put(`/api/torneos/comunicados/${id}`, payload)
    const body = data.data ?? data
    if (body.status === 'error') throw new Error(body.message)
    return normalize(body)
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/torneos/comunicados/${id}`)
  },
}
