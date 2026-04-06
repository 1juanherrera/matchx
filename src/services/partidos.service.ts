import api from './api'

export type EstadoPartido = 'programado' | 'en_curso' | 'finalizado' | 'suspendido' | 'aplazado'

export interface Partido {
  id: number
  torneo_id: number
  equipo_local_id: number
  equipo_visitante_id: number
  sede_id: number
  cancha_id: number
  jornada: number
  fecha_hora: string
  estado: EstadoPartido
  goles_local: number
  goles_visitante: number
  delegado_id: number
  arbitro_id: number
}

function normalize(raw: any): Partido {
  return {
    id:                  raw.id_partidos          ?? raw.id,
    torneo_id:           raw.torneo_id            ?? raw.id_torneos ?? 0,
    equipo_local_id:     raw.equipo_local_id      ?? raw.id_equipo_local ?? 0,
    equipo_visitante_id: raw.equipo_visitante_id  ?? raw.id_equipo_visitante ?? 0,
    sede_id:             raw.sede_id              ?? raw.id_sedes ?? 0,
    cancha_id:           raw.cancha_id            ?? raw.id_canchas ?? 0,
    jornada:             raw.jornada              ?? raw.numero_jornada ?? 0,
    fecha_hora:          raw.fecha_hora           ?? raw.fecha_hora_programada ?? '',
    estado:              raw.estado               ?? 'programado',
    goles_local:         raw.goles_local          ?? 0,
    goles_visitante:     raw.goles_visitante      ?? 0,
    delegado_id:         raw.delegado_id          ?? raw.id_delegado ?? 0,
    arbitro_id:          raw.arbitro_id           ?? raw.id_arbitro ?? 0,
  }
}

export const partidosService = {
  getProximos: async (limite = 10): Promise<Partido[]> => {
    const { data } = await api.get('/api/torneos/partidos/proximos', { params: { limite } })
    return (data.data ?? data).map(normalize)
  },

  getById: async (id: number): Promise<Partido> => {
    const { data } = await api.get(`/api/torneos/partidos/${id}`)
    return normalize(data.data ?? data)
  },

  create: (payload: Partial<Partido> & {
    fase_id?: number
    grupo_id?: number
    numero_jornada?: number
    fecha_hora_programada?: string
  }) => api.post('/api/torneos/partidos', payload),

  update: (id: number, payload: Partial<Partido>) =>
    api.put(`/api/torneos/partidos/${id}`, payload),

  iniciar: (id: number) =>
    api.put(`/api/torneos/partidos/${id}/iniciar`, {}),

  finalizar: (id: number, payload: { goles_local: number; goles_visitante: number; minutos_adicionales?: number }) =>
    api.put(`/api/torneos/partidos/${id}/finalizar`, payload),

  cambiarEstado: (id: number, estado: EstadoPartido) =>
    api.put(`/api/torneos/partidos/${id}/estado`, { estado }),

  actualizarMarcador: (id: number, goles_local: number, goles_visitante: number) =>
    api.put(`/api/torneos/partidos/${id}/marcador`, { goles_local, goles_visitante }),

  getConvocatoria: (id: number) =>
    api.get(`/api/torneos/partidos/${id}/convocatoria`),

  agregarConvocatoria: (partidoId: number, payload: {
    jugador_id: number
    equipo_id: number
    numero_dorsal?: number
    posicion?: string
    es_titular?: number
  }) => api.post(`/api/torneos/partidos/${partidoId}/convocatoria`, payload),

  removerConvocatoria: (convocatoriaId: number) =>
    api.delete(`/api/torneos/convocatoria/${convocatoriaId}`),
}
