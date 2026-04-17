/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — ASISTENCIAS DE JUGADORES A PARTIDOS
 * ═══════════════════════════════════════════════════════════════
 *
 * GET  /api/torneos/partidos/:partidoId/asistencia
 * PUT  /api/torneos/partidos/:partidoId/asistencia   body: { jugador_id, estado }
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db }            from '../db'
import { mockOk }        from '../utils/response'

const BASE = '/api/torneos/partidos/:partidoId/asistencia'

export const asistenciasHandlers = [

  // Obtener asistencias de un partido
  http.get(BASE, async ({ params }) => {
    const partidoId = Number(params.partidoId)
    const lista     = (db.asistencias as any[]).filter(a => a.partido_id === partidoId)
    return mockOk(lista)
  }),

  // Registrar / actualizar asistencia (upsert por partido_id + jugador_id)
  http.put(BASE, async ({ params, request }) => {
    const partidoId = Number(params.partidoId)
    const body      = await request.json() as any
    const jugadorId = Number(body.jugador_id)
    const idx       = (db.asistencias as any[]).findIndex(
      a => a.partido_id === partidoId && a.jugador_id === jugadorId
    )
    if (idx !== -1) {
      db.asistencias[idx] = { ...db.asistencias[idx], estado: body.estado }
    } else {
      ;(db.asistencias as any[]).push({ jugador_id: jugadorId, partido_id: partidoId, estado: body.estado })
    }
    const updated = (db.asistencias as any[]).find(
      a => a.partido_id === partidoId && a.jugador_id === jugadorId
    )
    return mockOk(updated)
  }),
]
