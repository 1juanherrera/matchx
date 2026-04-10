import api from './api'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type TipoSancion   = 'suspension' | 'multa' | 'descalificacion' | 'amonestacion'
export type EstadoSancion = 'activa' | 'apelada' | 'anulada' | 'cumplida'

export interface Sancion {
  id:               number
  torneo_id:        number
  jugador_id:       number
  equipo_id:        number
  evento_id:        number | null
  tipo_sancion:     TipoSancion
  partidos_sancion: number   // partidos restantes de suspensión
  valor_multa:      number   // monto en COP, 0 si no aplica
  estado:           EstadoSancion
  motivo:           string
  creado_en:        string   // ISO date
}

// ─── Normalización ───────────────────────────────────────────────────────────
// El backend Laravel usa prefijos tipo id_sanciones, id_torneos, etc.

function normalize(raw: any): Sancion {
  return {
    id:               raw.id_sanciones    ?? raw.id,
    torneo_id:        raw.torneo_id       ?? raw.id_torneos,
    jugador_id:       raw.jugador_id      ?? raw.id_jugadores,
    equipo_id:        raw.equipo_id       ?? raw.id_equipos,
    evento_id:        raw.evento_id       ?? raw.id_eventos ?? null,
    tipo_sancion:     raw.tipo_sancion,
    partidos_sancion: raw.partidos_sancion ?? 0,
    valor_multa:      raw.valor_multa     ?? 0,
    estado:           raw.estado,
    motivo:           raw.motivo          ?? '',
    creado_en:        raw.creado_en       ?? raw.created_at ?? new Date().toISOString(),
  }
}

// ─── Mock determinístico ─────────────────────────────────────────────────────
/**
 * Suspensiones desactivadas por ahora — el torneo actual solo maneja tarjetas con cobro.
 * Cuando se active la funcionalidad de suspensiones, este mock se reactivará.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mockSanciones(_torneoId: number, _equipoId: number, _jugadorIds: number[]): Sancion[] {
  return []
}

// ─── Mock pagos pendientes de tarjetas ───────────────────────────────────────
/**
 * Simula pagos pendientes por tarjetas (amarilla/roja) del torneo.
 * Corresponde a la tabla `pagos` con tipo_pago = 'tarjeta_amarilla' | 'tarjeta_roja'.
 * El jugador queda bloqueado_deuda hasta que el equipo pague al admin.
 *
 * hash = (jugadorId * 11 + torneoId * 3) % 8:
 *   0 → pago pendiente amarilla
 *   1 → pago pendiente roja
 *   2-7 → sin pago pendiente
 */
export interface PagoPendienteTarjeta {
  jugador_id: number
  tipo:  'tarjeta_amarilla' | 'tarjeta_roja'
  valor: number   // precio configurado en el torneo
}

export function pagosPendientesMock(
  torneoId: number,
  jugadorIds: number[],
  valorAmarilla: number,
  valorRoja: number,
): PagoPendienteTarjeta[] {
  return jugadorIds.flatMap(jugadorId => {
    const hash = (jugadorId * 11 + torneoId * 3) % 8
    if (hash === 0 && valorAmarilla > 0)
      return [{ jugador_id: jugadorId, tipo: 'tarjeta_amarilla' as const, valor: valorAmarilla }]
    if (hash === 1 && valorRoja > 0)
      return [{ jugador_id: jugadorId, tipo: 'tarjeta_roja' as const, valor: valorRoja }]
    return []
  })
}

/**
 * Devuelve un conteo determinístico de amarillas acumuladas por jugador.
 * Usa el hash (jugadorId * 13 + torneoId * 7) % amarillasMax
 */
export function amarillasMock(torneoId: number, jugadorId: number, amarillasMax: number): number {
  if (!amarillasMax || amarillasMax <= 0) return 0
  return (jugadorId * 13 + torneoId * 7) % amarillasMax
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const sancionesService = {
  /**
   * Obtiene sanciones activas/apeladas del equipo en un torneo.
   * Endpoint esperado: GET /api/torneos/sanciones?equipo_id=X&torneo_id=Y
   * Sólo devuelve estados activa | apelada (las cumplidas/anuladas no interesan al capitán).
   */
  getByEquipo: async (
    torneoId: number,
    equipoId: number,
    jugadorIds: number[],
  ): Promise<Sancion[]> => {
    try {
      const { data } = await api.get('/api/torneos/sanciones', {
        params: { equipo_id: equipoId, torneo_id: torneoId, estado: 'activa,apelada' },
      })
      const lista = (data.data ?? data) as any[]
      if (lista.length > 0) return lista.map(normalize)
      throw new Error('empty')
    } catch {
      return mockSanciones(torneoId, equipoId, jugadorIds)
    }
  },
}
