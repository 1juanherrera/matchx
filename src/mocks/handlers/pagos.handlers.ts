/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — PAGOS DE TARJETAS (por torneo)
 * ═══════════════════════════════════════════════════════════════
 *
 * GET  /api/torneos/:torneoId/pagos   ?tipo=tarjeta_amarilla,tarjeta_roja
 * PUT  /api/torneos/:torneoId/pagos/:pagoId   body: { estado, metodo_pago?, numero_recibo? }
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db }            from '../db'
import { mockOk, mockNotFound } from '../utils/response'

export const pagosHandlers = [

  // Listar pagos de tarjetas de un torneo
  http.get('/api/torneos/:torneoId/pagos', async ({ params, request }) => {
    const torneoId = Number(params.torneoId)
    const tipos    = new URL(request.url).searchParams.get('tipo')?.split(',') ?? null

    let lista = (db.pagos as any[]).filter(p => p.torneo_id === torneoId)
    if (tipos) lista = lista.filter(p => tipos.includes(p.tipo_pago))

    return mockOk(lista)
  }),

  // Confirmar / condonar pago
  http.put('/api/torneos/:torneoId/pagos/:pagoId', async ({ params, request }) => {
    const pagoId = Number(params.pagoId)
    const idx    = (db.pagos as any[]).findIndex(p => p.id === pagoId)
    if (idx === -1) return mockNotFound('Pago')
    const body = await request.json() as any
    db.pagos[idx] = {
      ...db.pagos[idx],
      ...body,
      recibido_por: body.estado === 'pagado' ? 2 : db.pagos[idx].recibido_por,
      pagado_en:    body.estado === 'pagado' ? new Date().toISOString() : db.pagos[idx].pagado_en,
    }
    return mockOk(db.pagos[idx])
  }),
]
