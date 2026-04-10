import api from './api'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type EstadoMultaEquipo = 'pendiente' | 'pagada' | 'condonada'

export interface MultaEquipo {
  id:          number
  equipo_id:   number
  jugador_id:  number
  motivo:      string
  valor:       number              // monto en COP
  estado:      EstadoMultaEquipo
  creado_por:  number              // user_id del capitán que la creó
  creado_en:   string              // ISO date
}

export interface MultaEquipoInput {
  jugador_id: number
  motivo:     string
  valor:      number
}

// ─── Normalización ───────────────────────────────────────────────────────────

function normalize(raw: any): MultaEquipo {
  return {
    id:         raw.id_multas_equipo ?? raw.id,
    equipo_id:  raw.equipo_id        ?? raw.id_equipos,
    jugador_id: raw.jugador_id       ?? raw.id_jugadores,
    motivo:     raw.motivo           ?? '',
    valor:      Number(raw.valor     ?? 0),
    estado:     raw.estado           ?? 'pendiente',
    creado_por: raw.creado_por       ?? raw.id_usuarios ?? 0,
    creado_en:  raw.creado_en        ?? raw.created_at ?? new Date().toISOString(),
  }
}

// ─── Mock determinístico ─────────────────────────────────────────────────────
/**
 * Simula multas internas creadas por el capitán del equipo.
 * IMPORTANTE: estas multas NO son del torneo. Son reglas internas del equipo.
 * Ejemplos: llegó tarde al entrenamiento, no asistió a la reunión, etc.
 *
 * jugadorId % 6:
 *   2 → multa pendiente $30.000 (inasistencia al entrenamiento)
 *   3 → multa pendiente $15.000 (llegó tarde al partido)
 *   0,1,4,5 → sin multa interna pendiente
 */
let mockIdCounter = 8000

function mockMultas(equipoId: number, jugadorIds: number[]): MultaEquipo[] {
  return jugadorIds
    .flatMap((jugadorId, i) => {
      const bucket = jugadorId % 6
      if (bucket === 2) {
        return [{
          id:         8000 + i,
          equipo_id:  equipoId,
          jugador_id: jugadorId,
          motivo:     'Inasistencia al entrenamiento sin justificación',
          valor:      30000,
          estado:     'pendiente' as const,
          creado_por: 0,
          creado_en:  new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        }]
      }
      if (bucket === 3) {
        return [{
          id:         8100 + i,
          equipo_id:  equipoId,
          jugador_id: jugadorId,
          motivo:     'Llegó tarde al partido sin avisar',
          valor:      15000,
          estado:     'pendiente' as const,
          creado_por: 0,
          creado_en:  new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        }]
      }
      return []
    })
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const multasEquipoService = {
  /**
   * Obtiene todas las multas internas del equipo (cualquier estado).
   * GET /api/equipos/{equipoId}/multas
   */
  getByEquipo: async (equipoId: number, jugadorIds: number[]): Promise<MultaEquipo[]> => {
    try {
      const { data } = await api.get(`/api/equipos/${equipoId}/multas`)
      const lista = (data.data ?? data) as any[]
      if (lista.length > 0) return lista.map(normalize)
      throw new Error('empty')
    } catch {
      return mockMultas(equipoId, jugadorIds)
    }
  },

  /**
   * Crea una nueva multa interna.
   * POST /api/equipos/{equipoId}/multas
   * Body: { jugador_id, motivo, valor }
   */
  crear: async (equipoId: number, input: MultaEquipoInput): Promise<MultaEquipo> => {
    try {
      const { data } = await api.post(`/api/equipos/${equipoId}/multas`, input)
      return normalize(data.data ?? data)
    } catch {
      // Fallback optimista — el store actualizará localmente
      return normalize({ id: ++mockIdCounter, equipo_id: equipoId, ...input, estado: 'pendiente', creado_en: new Date().toISOString() })
    }
  },

  /**
   * Actualiza el estado de una multa (pagada / condonada).
   * PUT /api/equipos/{equipoId}/multas/{id}
   * Body: { estado }
   */
  actualizarEstado: (equipoId: number, multaId: number, estado: EstadoMultaEquipo) =>
    api.put(`/api/equipos/${equipoId}/multas/${multaId}`, { estado }),
}
