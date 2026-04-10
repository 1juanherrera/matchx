import api from './api'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type TipoPago   = 'tarjeta_amarilla' | 'tarjeta_roja'
export type EstadoPago = 'pendiente' | 'pagado' | 'condonado'
export type MetodoPago = 'efectivo' | 'nequi' | 'transferencia' | 'daviplata' | 'otro'

export interface Pago {
  id:             number
  torneo_id:      number
  equipo_id:      number
  jugador_id:     number
  tipo_pago:      TipoPago
  valor:          number
  estado:         EstadoPago
  recibido_por:   number | null   // user_id del admin que confirmó
  metodo_pago:    MetodoPago | null
  numero_recibo:  string | null
  creado_en:      string
  pagado_en:      string | null
}

export interface ConfirmarPagoInput {
  metodo_pago:   MetodoPago
  numero_recibo: string
}

// ─── Normalización ───────────────────────────────────────────────────────────

function normalize(raw: any): Pago {
  return {
    id:            raw.id_pagos      ?? raw.id,
    torneo_id:     raw.torneo_id     ?? raw.id_torneos,
    equipo_id:     raw.equipo_id     ?? raw.id_equipos,
    jugador_id:    raw.jugador_id    ?? raw.id_jugadores,
    tipo_pago:     raw.tipo_pago,
    valor:         Number(raw.valor  ?? 0),
    estado:        raw.estado        ?? 'pendiente',
    recibido_por:  raw.recibido_por  ?? null,
    metodo_pago:   raw.metodo_pago   ?? null,
    numero_recibo: raw.numero_recibo ?? null,
    creado_en:     raw.creado_en     ?? raw.created_at ?? new Date().toISOString(),
    pagado_en:     raw.pagado_en     ?? raw.updated_at ?? null,
  }
}

// ─── Mock determinístico ─────────────────────────────────────────────────────
/**
 * Genera pagos pendientes y un historial de pagos ya confirmados.
 * hash = (jugadorId * 11 + torneoId * 3) % 8
 *   0 → pendiente amarilla
 *   1 → pendiente roja
 *   2 → ya pagada (historial) amarilla
 *   3 → ya pagada (historial) roja
 *   4-7 → sin pago
 *
 * Solo genera pagos si el torneo tiene precio asignado para ese tipo.
 */
function mockPagos(
  torneoId: number,
  equipos: { equipo_id: number; jugador_ids: number[] }[],
  valorAmarilla: number,
  valorRoja: number,
): Pago[] {
  const resultado: Pago[] = []
  let idCounter = 7000

  equipos.forEach(({ equipo_id, jugador_ids }) => {
    jugador_ids.forEach(jugadorId => {
      const hash = (jugadorId * 11 + torneoId * 3) % 8

      if (hash === 0 && valorAmarilla > 0) {
        resultado.push({
          id: idCounter++, torneo_id: torneoId, equipo_id, jugador_id: jugadorId,
          tipo_pago: 'tarjeta_amarilla', valor: valorAmarilla,
          estado: 'pendiente', recibido_por: null, metodo_pago: null, numero_recibo: null,
          creado_en: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), pagado_en: null,
        })
      } else if (hash === 1 && valorRoja > 0) {
        resultado.push({
          id: idCounter++, torneo_id: torneoId, equipo_id, jugador_id: jugadorId,
          tipo_pago: 'tarjeta_roja', valor: valorRoja,
          estado: 'pendiente', recibido_por: null, metodo_pago: null, numero_recibo: null,
          creado_en: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), pagado_en: null,
        })
      } else if (hash === 2 && valorAmarilla > 0) {
        resultado.push({
          id: idCounter++, torneo_id: torneoId, equipo_id, jugador_id: jugadorId,
          tipo_pago: 'tarjeta_amarilla', valor: valorAmarilla,
          estado: 'pagado', recibido_por: 1, metodo_pago: 'efectivo', numero_recibo: `REC-${jugadorId}`,
          creado_en: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
          pagado_en:  new Date(Date.now() - 8  * 24 * 3600 * 1000).toISOString(),
        })
      } else if (hash === 3 && valorRoja > 0) {
        resultado.push({
          id: idCounter++, torneo_id: torneoId, equipo_id, jugador_id: jugadorId,
          tipo_pago: 'tarjeta_roja', valor: valorRoja,
          estado: 'pagado', recibido_por: 1, metodo_pago: 'nequi', numero_recibo: `REC-${jugadorId}`,
          creado_en: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
          pagado_en:  new Date(Date.now() - 9  * 24 * 3600 * 1000).toISOString(),
        })
      }
    })
  })
  return resultado
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const pagosService = {
  /**
   * Obtiene todos los pagos de tarjetas de un torneo (pendientes + historial).
   * GET /api/torneos/{torneoId}/pagos?tipo=tarjeta_amarilla,tarjeta_roja
   */
  getByTorneo: async (
    torneoId: number,
    equipos: { equipo_id: number; jugador_ids: number[] }[],
    valorAmarilla: number,
    valorRoja: number,
  ): Promise<Pago[]> => {
    try {
      const { data } = await api.get(`/api/torneos/${torneoId}/pagos`, {
        params: { tipo: 'tarjeta_amarilla,tarjeta_roja' },
      })
      const lista = (data.data ?? data) as any[]
      if (lista.length > 0) return lista.map(normalize)
      throw new Error('empty')
    } catch {
      return mockPagos(torneoId, equipos, valorAmarilla, valorRoja)
    }
  },

  /**
   * Confirma que el pago fue recibido.
   * PUT /api/torneos/{torneoId}/pagos/{pagoId}
   * Body: { estado: 'pagado', metodo_pago, numero_recibo }
   */
  confirmar: (torneoId: number, pagoId: number, input: ConfirmarPagoInput) =>
    api.put(`/api/torneos/${torneoId}/pagos/${pagoId}`, {
      estado: 'pagado',
      ...input,
    }),

  /**
   * Condona el pago (admin lo exime).
   * PUT /api/torneos/{torneoId}/pagos/{pagoId}
   * Body: { estado: 'condonado' }
   */
  condonar: (torneoId: number, pagoId: number) =>
    api.put(`/api/torneos/${torneoId}/pagos/${pagoId}`, { estado: 'condonado' }),
}
