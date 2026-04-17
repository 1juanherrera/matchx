/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — MULTAS INTERNAS DE EQUIPO
 * ═══════════════════════════════════════════════════════════════
 *
 * GET  /api/equipos/:equipoId/multas
 * POST /api/equipos/:equipoId/multas   body: { jugador_id, motivo, valor }
 * PUT  /api/equipos/:equipoId/multas/:id   body: { estado }
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db, nextId }    from '../db'
import { mockOk, mockCreated, mockNotFound } from '../utils/response'

export const multasEquipoHandlers = [

  // Listar multas del equipo
  http.get('/api/equipos/:equipoId/multas', async ({ params }) => {
    const equipoId = Number(params.equipoId)
    const lista    = (db.multasEquipo as any[]).filter(m => m.equipo_id === equipoId)
    return mockOk(lista)
  }),

  // Crear multa interna
  http.post('/api/equipos/:equipoId/multas', async ({ params, request }) => {
    const equipoId = Number(params.equipoId)
    const body     = await request.json() as any
    const nueva = {
      id:         nextId('multasEquipo'),
      equipo_id:  equipoId,
      jugador_id: body.jugador_id,
      motivo:     body.motivo,
      valor:      Number(body.valor ?? 0),
      estado:     'pendiente',
      creado_por: 0,
      creado_en:  new Date().toISOString(),
    }
    ;(db.multasEquipo as any[]).push(nueva)
    return mockCreated(nueva)
  }),

  // Actualizar estado de multa
  http.put('/api/equipos/:equipoId/multas/:id', async ({ params, request }) => {
    const id  = Number(params.id)
    const idx = (db.multasEquipo as any[]).findIndex(m => m.id === id)
    if (idx === -1) return mockNotFound('Multa')
    const body = await request.json() as any
    db.multasEquipo[idx] = { ...db.multasEquipo[idx], ...body }
    return mockOk(db.multasEquipo[idx])
  }),
]
