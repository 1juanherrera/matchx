import api from './api'

export type EstadoTorneo = 'programado' | 'inscripciones_abiertas' | 'en_curso' | 'finalizado' | 'cancelado'

export interface Torneo {
  id: number
  nombre: string
  descripcion: string
  modalidad_id: number
  modalidad_codigo: string
  sede_id: number
  estado: EstadoTorneo
  fecha_inicio: string
  fecha_fin: string
  max_equipos: number
  premio: string
  imagen_url: string
  creado_en: string
}

function normalize(raw: any): Torneo {
  return {
    id:               raw.id_torneos    ?? raw.id,
    nombre:           raw.nombre        ?? raw.name ?? '',
    descripcion:      raw.descripcion   ?? '',
    modalidad_id:     raw.modalidad_id  ?? raw.id_modalidades ?? 0,
    modalidad_codigo: raw.modalidad_codigo ?? raw.modalidad?.codigo ?? '',
    sede_id:          raw.sede_id       ?? raw.id_sedes ?? 0,
    estado:           raw.estado        ?? 'programado',
    fecha_inicio:     raw.fecha_inicio  ?? '',
    fecha_fin:        raw.fecha_fin     ?? '',
    max_equipos:      raw.max_equipos   ?? raw.max_jugadores ?? 0,
    premio:           raw.premio        ?? '',
    imagen_url:       raw.imagen_url    ?? raw.logo_url ?? '',
    creado_en:        raw.creado_en     ?? raw.created_at ?? '',
  }
}

export const torneosService = {
  getAll: async (estado?: string): Promise<Torneo[]> => {
    const { data } = await api.get('/api/torneos/torneos', estado ? { params: { estado } } : {})
    return (data.data ?? data).map(normalize)
  },

  getById: async (id: number): Promise<Torneo> => {
    const { data } = await api.get(`/api/torneos/torneos/${id}`)
    return normalize(data.data ?? data)
  },

  create: (payload: Partial<Torneo> & {
    edicion?: string
    categoria?: string
    fecha_limite_inscripcion?: string
    admin_id?: number
    inscripcion_publica?: number
    marcador_publico?: number
    valor_matricula?: number
    amarillas_para_suspension?: number
    partidos_suspension_roja?: number
    min_jugadores?: number
  }) => api.post('/api/torneos/torneos', payload),

  update: (id: number, payload: Partial<Torneo>) =>
    api.put(`/api/torneos/torneos/${id}`, payload),

  cambiarEstado: (id: number, estado: EstadoTorneo) =>
    api.put(`/api/torneos/torneos/${id}/estado`, { estado }),

  asignarSede: (torneoId: number, sedeId: number) =>
    api.post(`/api/torneos/torneos/${torneoId}/sedes`, { sede_id: sedeId }),

  quitarSede: (torneoId: number, sedeId: number) =>
    api.delete(`/api/torneos/torneos/${torneoId}/sedes/${sedeId}`),

  getFases: (id: number) =>
    api.get(`/api/torneos/torneos/${id}/fases`),

  getInscripciones: (id: number) =>
    api.get(`/api/torneos/torneos/${id}/inscripciones`),

  getPartidos: (id: number) =>
    api.get(`/api/torneos/torneos/${id}/partidos`),

  getGoleadores: (id: number, limite = 10) =>
    api.get(`/api/torneos/torneos/${id}/goleadores`, { params: { limite } }),

  getFairplay: (id: number) =>
    api.get(`/api/torneos/torneos/${id}/fairplay`),

  getPosiciones: (faseId: number) =>
    api.get(`/api/torneos/fases/${faseId}/posiciones`),
}
