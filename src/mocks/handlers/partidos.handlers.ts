/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — PARTIDOS
 * BD: match_produccion.partidos (PK: id_partidos)
 * ═══════════════════════════════════════════════════════════════
 *
 * GET    /api/torneos/partidos/proximos        ?limite=5
 * GET    /api/torneos/partidos/:id
 * POST   /api/torneos/partidos                 body: { torneo_id, fase_id, equipo_local_id, equipo_visitante_id, sede_id, cancha_id, numero_jornada?, fecha_hora_programada, delegado_id?, arbitro_id?, grupo_id? }
 * PUT    /api/torneos/partidos/:id             body: Partial<Partido>
 * PUT    /api/torneos/partidos/:id/iniciar
 * PUT    /api/torneos/partidos/:id/finalizar   body: { goles_local, goles_visitante, minutos_adicionales? }
 * PUT    /api/torneos/partidos/:id/estado      body: { estado }
 * PUT    /api/torneos/partidos/:id/marcador    body: { goles_local, goles_visitante }
 * GET    /api/torneos/partidos/:id/convocatoria
 * POST   /api/torneos/partidos/:id/convocatoria body: { jugador_id, equipo_id, numero_dorsal?, posicion?, es_titular? }
 * DELETE /api/torneos/convocatoria/:id
 *
 * Campos que el frontend espera en TODA respuesta Partido:
 * id_partidos, torneo_id, equipo_local_id, equipo_visitante_id,
 * sede_id, cancha_id, numero_jornada, fecha_hora_programada,
 * estado, goles_local, goles_visitante, delegado_id, arbitro_id
 *
 * NOTA: el frontend mapea fecha_hora_programada → fecha_hora
 * y numero_jornada → jornada en su normalize().
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db, nextId } from '../db'
import { mockOk, mockCreated, mockNotFound, mockError } from '../utils/response'

const BASE = '/api/torneos/partidos'

const ESTADOS_VALIDOS = ['programado', 'en_curso', 'finalizado', 'suspendido', 'aplazado', 'cancelado', 'walkover']

function withDbFields(raw: any) {
  return {
    // PK con nombre de BD
    id_partidos:           raw.id,
    // Campos de la tabla partidos
    torneo_id:             raw.torneo_id            ?? 0,
    fase_id:               raw.fase_id              ?? 1,
    grupo_id:              raw.grupo_id             ?? null,
    numero_jornada:        raw.jornada              ?? raw.numero_jornada ?? 0,
    equipo_local_id:       raw.equipo_local_id      ?? 0,
    equipo_visitante_id:   raw.equipo_visitante_id  ?? 0,
    sede_id:               raw.sede_id              ?? 0,
    cancha_id:             raw.cancha_id            ?? 0,
    fecha_hora_programada: raw.fecha_hora           ?? raw.fecha_hora_programada ?? '',
    fecha_hora_inicio:     raw.fecha_hora_inicio    ?? null,
    fecha_hora_fin:        raw.fecha_hora_fin       ?? null,
    estado:                raw.estado               ?? 'programado',
    goles_local:           raw.goles_local          ?? 0,
    goles_visitante:       raw.goles_visitante      ?? 0,
    penaltis_local:        raw.penaltis_local        ?? null,
    penaltis_visitante:    raw.penaltis_visitante    ?? null,
    minutos_adicionales:   raw.minutos_adicionales  ?? 0,
    arbitro_id:            raw.arbitro_id           ?? null,
    delegado_id:           raw.delegado_id          ?? null,
  }
}

export const partidosHandlers = [
  // Todos los partidos — soporta ?arbitro_id= ?delegado_id= ?torneo_id= ?estado=
  http.get(BASE, async ({ request }) => {
    const url         = new URL(request.url)
    const arbitroId   = url.searchParams.get('arbitro_id')
    const delegadoId  = url.searchParams.get('delegado_id')
    const torneoId    = url.searchParams.get('torneo_id')
    const estado      = url.searchParams.get('estado')

    let lista = db.partidos as any[]
    if (arbitroId)  lista = lista.filter(p => p.arbitro_id  === Number(arbitroId))
    if (delegadoId) lista = lista.filter(p => p.delegado_id === Number(delegadoId))
    if (torneoId)   lista = lista.filter(p => p.torneo_id   === Number(torneoId))
    if (estado)     lista = lista.filter(p => p.estado === estado)

    return mockOk(lista.map(withDbFields))
  }),

  http.get(`${BASE}/proximos`, async ({ request }) => {
    const limite = Number(new URL(request.url).searchParams.get('limite') ?? 5)
    const lista  = (db.partidos as any[])
      .filter(p => p.estado !== 'finalizado')
      .sort((a, b) => new Date(a.fecha_hora ?? a.fecha_hora_programada).getTime() - new Date(b.fecha_hora ?? b.fecha_hora_programada).getTime())
      .slice(0, limite)
    return mockOk(lista.map(withDbFields))
  }),

  http.get(`${BASE}/:id`, async ({ params }) => {
    const item = (db.partidos as any[]).find(p => p.id === Number(params.id))
    return item ? mockOk(withDbFields(item)) : mockNotFound('Partido')
  }),

  http.post(BASE, async ({ request }) => {
    const body  = await request.json() as any
    const nuevo = {
      id: nextId('partidos'), ...body,
      estado: 'programado',
      goles_local: 0, goles_visitante: 0,
      creado_en: new Date().toISOString(),
    }
    db.partidos.push(nuevo)
    return mockCreated(withDbFields(nuevo))
  }),

  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const idx = (db.partidos as any[]).findIndex(p => p.id === Number(params.id))
    if (idx === -1) return mockNotFound('Partido')
    db.partidos[idx] = { ...db.partidos[idx], ...await request.json() as any }
    return mockOk(withDbFields(db.partidos[idx]))
  }),

  http.put(`${BASE}/:id/iniciar`, async ({ params }) => {
    const item = (db.partidos as any[]).find(p => p.id === Number(params.id))
    if (!item) return mockNotFound('Partido')
    item.estado = 'en_curso'
    item.fecha_hora_inicio = new Date().toISOString()
    return mockOk(withDbFields(item))
  }),

  http.put(`${BASE}/:id/finalizar`, async ({ params, request }) => {
    const item = (db.partidos as any[]).find(p => p.id === Number(params.id))
    if (!item) return mockNotFound('Partido')
    const body = await request.json() as any
    item.estado             = 'finalizado'
    item.goles_local        = body.goles_local        ?? item.goles_local
    item.goles_visitante    = body.goles_visitante     ?? item.goles_visitante
    item.minutos_adicionales= body.minutos_adicionales ?? 0
    item.fecha_hora_fin     = new Date().toISOString()
    return mockOk(withDbFields(item))
  }),

  http.put(`${BASE}/:id/estado`, async ({ params, request }) => {
    const item = (db.partidos as any[]).find(p => p.id === Number(params.id))
    if (!item) return mockNotFound('Partido')
    const { estado } = await request.json() as any
    if (!ESTADOS_VALIDOS.includes(estado)) return mockError('Estado inválido')
    item.estado = estado
    return mockOk(withDbFields(item))
  }),

  http.put(`${BASE}/:id/marcador`, async ({ params, request }) => {
    const item = (db.partidos as any[]).find(p => p.id === Number(params.id))
    if (!item) return mockNotFound('Partido')
    const body = await request.json() as any
    item.goles_local     = body.goles_local
    item.goles_visitante = body.goles_visitante
    return mockOk(withDbFields(item))
  }),

  http.get(`${BASE}/:id/convocatoria`, async ({ params }) => {
    const lista = db.convocatorias.filter(c => c.partido_id === Number(params.id))
    return mockOk(lista)
  }),

  http.post(`${BASE}/:id/convocatoria`, async ({ params, request }) => {
    const body  = await request.json() as any
    const nueva = { id: nextId('convocatorias'), partido_id: Number(params.id), ...body }
    db.convocatorias.push(nueva)
    return mockCreated(nueva)
  }),

  http.delete('/api/torneos/convocatoria/:id', async ({ params }) => {
    const idx = db.convocatorias.findIndex(c => c.id === Number(params.id))
    if (idx === -1) return mockNotFound('Convocatoria')
    db.convocatorias.splice(idx, 1)
    return mockOk({ message: 'Eliminado correctamente' })
  }),
]
