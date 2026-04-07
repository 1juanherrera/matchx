import api from './api'

export type EstadoTorneo = 'borrador' | 'inscripciones_abiertas' | 'en_curso' | 'finalizado' | 'cancelado'

export interface Torneo {
  id: number
  nombre: string
  edicion: string
  categoria: string
  descripcion: string
  reglamento: string
  modalidad_id: number
  modalidad_codigo: string
  modalidad: string
  admin_id: number
  administrador: string
  equipos_inscritos: number
  estado: EstadoTorneo
  fecha_inicio: string
  fecha_fin: string
  fecha_limite_inscripcion: string
  inscripcion_publica: number
  marcador_publico: number
  valor_matricula: number
  valor_tarjeta_amarilla: number
  valor_tarjeta_roja: number
  multa_inasistencia: number
  valor_jugador_tardio: number
  amarillas_para_suspension: number
  partidos_suspension_roja: number
  min_jugadores: number
  max_jugadores: number
  max_equipos: number
  url_banner: string
  creado_en: string
}

function normalize(raw: any): Torneo {
  return {
    id:                        raw.id_torneos    ?? raw.id,
    nombre:                    raw.nombre        ?? '',
    edicion:                   raw.edicion       ?? '',
    categoria:                 raw.categoria     ?? '',
    descripcion:               raw.descripcion   ?? '',
    reglamento:                raw.reglamento    ?? '',
    modalidad_id:              Number(raw.modalidad_id  ?? raw.id_modalidades ?? 0),
    modalidad_codigo:          raw.modalidad_codigo ?? raw.modalidad?.codigo ?? '',
    modalidad:                 typeof raw.modalidad === 'string' ? raw.modalidad : (raw.modalidad?.nombre ?? ''),
    admin_id:                  raw.admin_id      ?? 0,
    administrador:             raw.administrador ?? '',
    equipos_inscritos:         raw.equipos_inscritos ?? 0,
    estado:                    raw.estado        ?? 'borrador',
    fecha_inicio:              raw.fecha_inicio  ?? '',
    fecha_fin:                 raw.fecha_fin     ?? '',
    fecha_limite_inscripcion:  raw.fecha_limite_inscripcion ?? '',
    inscripcion_publica:       raw.inscripcion_publica ?? 0,
    marcador_publico:          raw.marcador_publico    ?? 0,
    valor_matricula:           Number(raw.valor_matricula           ?? 0),
    valor_tarjeta_amarilla:    Number(raw.valor_tarjeta_amarilla    ?? 0),
    valor_tarjeta_roja:        Number(raw.valor_tarjeta_roja        ?? 0),
    multa_inasistencia:        Number(raw.multa_inasistencia        ?? 0),
    valor_jugador_tardio:      Number(raw.valor_jugador_tardio      ?? 0),
    amarillas_para_suspension: raw.amarillas_para_suspension ?? 3,
    partidos_suspension_roja:  raw.partidos_suspension_roja  ?? 1,
    min_jugadores:             raw.min_jugadores ?? 1,
    max_jugadores:             raw.max_jugadores ?? 25,
    max_equipos:               raw.max_equipos   ?? 0,
    url_banner:                raw.url_banner    ?? '',
    creado_en:                 raw.creado_en     ?? raw.created_at ?? '',
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

  create: (payload: Partial<Torneo>) => api.post('/api/torneos/torneos', payload),

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
