import api from './api'

export type EstadoInscripcion = 'pendiente' | 'aprobada' | 'rechazada'

export interface Inscripcion {
  id: number
  torneo_id: number
  equipo_id: number
  grupo_id: number | null
  estado: EstadoInscripcion
  fecha_inscripcion: string
  aprobado_por: string | null
  fecha_aprobacion: string | null
  motivo_rechazo: string | null
  observaciones: string | null
  // datos del equipo incluidos por el backend (join)
  equipo_nombre: string
  equipo_nombre_corto: string
  equipo_color_principal: string
  equipo_color_secundario: string
  equipo_escudo_url: string
}

const estadoMap: Record<string, EstadoInscripcion> = {
  pendiente: 'pendiente',
  aprobada:  'aprobada',
  aprobado:  'aprobada',
  rechazada: 'rechazada',
  rechazado: 'rechazada',
}

function normalize(raw: any): Inscripcion {
  // El backend puede devolver equipo como string (nombre) u objeto
  const eq = (raw.equipo && typeof raw.equipo === 'object') ? raw.equipo : {}
  const equipoNombre = typeof raw.equipo === 'string'
    ? raw.equipo
    : (eq.nombre ?? raw.equipo_nombre ?? '')

  return {
    id:                      raw.id_inscripciones          ?? raw.id,
    torneo_id:               raw.torneo_id                 ?? 0,
    equipo_id:               raw.equipo_id ?? raw.id_equipos ?? 0,
    grupo_id:                raw.grupo_id  ?? raw.id_grupos  ?? null,
    estado:                  estadoMap[raw.estado]          ?? 'pendiente',
    fecha_inscripcion:       raw.fecha_inscripcion          ?? '',
    aprobado_por:            raw.aprobado_por_nombre ?? raw.aprobado_por ?? null,
    fecha_aprobacion:        raw.fecha_aprobacion           ?? null,
    motivo_rechazo:          raw.motivo_rechazo             ?? null,
    observaciones:           raw.observaciones              ?? null,
    equipo_nombre:           equipoNombre,
    equipo_nombre_corto:     eq.nombre_corto  ?? raw.equipo_nombre_corto  ?? '',
    equipo_color_principal:  eq.color_principal ?? raw.equipo_color_principal ?? '',
    equipo_color_secundario: eq.color_secundario ?? raw.equipo_color_secundario ?? '',
    equipo_escudo_url:       raw.url_escudo ?? eq.url_escudo ?? raw.equipo_escudo_url ?? '',
  }
}

export const inscripcionesService = {
  getByTorneo: async (torneoId: number): Promise<Inscripcion[]> => {
    const { data } = await api.get(`/api/torneos/torneos/${torneoId}/inscripciones`)
    return (data.data ?? data).map(normalize)
  },

  create: (torneoId: number, payload: { equipo_id: number; observaciones?: string }) =>
    api.post('/api/torneos/inscripciones', { torneo_id: torneoId, ...payload }),

  aprobar: (id: number, adminId: number) =>
    api.put(`/api/torneos/inscripciones/${id}/aprobar`, { admin_id: adminId }),

  rechazar: (id: number, motivo?: string) =>
    api.put(`/api/torneos/inscripciones/${id}/rechazar`, { motivo_rechazo: motivo }),

  delete: (id: number) =>
    api.delete(`/api/torneos/inscripciones/${id}`),
}
