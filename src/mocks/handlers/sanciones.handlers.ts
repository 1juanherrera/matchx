/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — SANCIONES DE JUGADORES
 * ═══════════════════════════════════════════════════════════════
 *
 * GET  /api/torneos/sanciones   ?torneo_id=&equipo_id=&estado=activa,apelada
 * PUT  /api/torneos/sanciones/:id   body: { estado?, partidos_sancion?, motivo? }
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db }            from '../db'
import { mockOk, mockNotFound } from '../utils/response'

const BASE = '/api/torneos/sanciones'

export const sancionesHandlers = [

  // Listar con filtros opcionales
  http.get(BASE, async ({ request }) => {
    const params   = new URL(request.url).searchParams
    const torneoId = params.get('torneo_id') ? Number(params.get('torneo_id')) : null
    const equipoId = params.get('equipo_id') ? Number(params.get('equipo_id')) : null
    const estados  = params.get('estado')?.split(',') ?? null

    let lista = db.sanciones as any[]

    if (torneoId) lista = lista.filter(s => s.torneo_id === torneoId)
    if (equipoId) lista = lista.filter(s => s.equipo_id === equipoId)
    if (estados)  lista = lista.filter(s => estados.includes(s.estado))

    // Más recientes primero; activas antes que cumplidas
    lista = [...lista].sort((a, b) => {
      const prioridad = (e: string) => e === 'activa' ? 0 : e === 'apelada' ? 1 : 2
      const pd = prioridad(a.estado) - prioridad(b.estado)
      if (pd !== 0) return pd
      return new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
    })

    return mockOk(lista)
  }),

  // Actualizar sanción (cambiar estado, reducir partidos, etc.)
  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const idx = (db.sanciones as any[]).findIndex(s => s.id === Number(params.id))
    if (idx === -1) return mockNotFound('Sanción')
    const body = await request.json() as any
    db.sanciones[idx] = {
      ...db.sanciones[idx],
      ...body,
      updated_at: new Date().toISOString(),
    }
    return mockOk(db.sanciones[idx])
  }),
]
