import api from './api'

export type TipoEventoAPI =
  | 'gol'
  | 'tarjeta_amarilla'
  | 'tarjeta_roja'
  | 'cambio'
  | 'penal_convertido'
  | 'penal_fallado'
  | 'observacion'

export interface EventoPayload {
  partido_id: number
  tipo_evento: TipoEventoAPI
  minuto: number
  equipo_id?: number
  jugador_id?: number
  es_autogol?: number
  jugador_sale_id?: number
  jugador_entra_id?: number
  observaciones?: string
  registrado_por?: number
}

export interface EventoPartidoAPI {
  id: number
  partido_id: number
  tipo_evento: TipoEventoAPI
  minuto: number
  equipo_id?: number
  jugador_id?: number
  creado_en: string
}

export const eventosService = {
  getByPartido: async (partidoId: number): Promise<EventoPartidoAPI[]> => {
    const { data } = await api.get(`/api/torneos/partidos/${partidoId}/eventos`)
    return data.data ?? data
  },

  registrar: (payload: EventoPayload) =>
    api.post('/api/torneos/eventos', payload),

  eliminar: (eventoId: number) =>
    api.delete(`/api/torneos/eventos/${eventoId}`),
}
