/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — SOLICITUDES DE JUGADORES
 * ═══════════════════════════════════════════════════════════════
 *
 * GET  /api/torneos/solicitudes          ?estado=pendiente|aprobado|rechazado
 * POST /api/torneos/solicitudes          body: { tipo, equipo_id, datos?, jugador_id? }
 * PUT  /api/torneos/solicitudes/:id/aprobar
 * PUT  /api/torneos/solicitudes/:id/rechazar  body: { motivo? }
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db, nextId } from '../db'
import { mockOk, mockCreated, mockNotFound, mockError } from '../utils/response'

const BASE = '/api/torneos/solicitudes'

export const solicitudesHandlers = [
  // Listar (con filtro opcional por estado y/o equipo_id)
  http.get(BASE, async ({ request }) => {
    const params   = new URL(request.url).searchParams
    const estado   = params.get('estado')
    const equipoId = params.get('equipo_id') ? Number(params.get('equipo_id')) : null
    let lista = db.solicitudes as any[]
    if (estado)   lista = lista.filter(s => s.estado === estado)
    if (equipoId) lista = lista.filter(s => s.equipo_id === equipoId)
    // Ordenar: pendientes primero, luego por fecha descendente
    lista = [...lista].sort((a, b) => {
      if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1
      if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return mockOk(lista)
  }),

  // Crear solicitud (desde capitán)
  http.post(BASE, async ({ request }) => {
    const body = await request.json() as any
    const equipo = (db.equipos as any[]).find(e => (e.id_equipos ?? e.id) === body.equipo_id)
    const nueva = {
      id: nextId('solicitudes'),
      tipo: body.tipo,
      equipo_id: body.equipo_id,
      equipo_nombre: equipo?.nombre ?? 'Equipo desconocido',
      jugador_id: body.jugador_id ?? null,
      jugador_nombre: body.jugador_id
        ? (() => {
            const j = (db.jugadores as any[]).find(j => j.id === body.jugador_id)
            return j ? `${j.nombre} ${j.apellido}` : null
          })()
        : null,
      datos: body.datos ?? null,
      estado: 'pendiente',
      solicitado_por: null,
      solicitado_por_nombre: 'Capitán',
      revisado_por: null,
      motivo_rechazo: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    db.solicitudes.push(nueva)
    return mockCreated(nueva)
  }),

  // Aprobar
  http.put(`${BASE}/:id/aprobar`, async ({ params }) => {
    const idx = (db.solicitudes as any[]).findIndex(s => s.id === Number(params.id))
    if (idx === -1) return mockNotFound('Solicitud')
    const s = db.solicitudes[idx]
    if (s.estado !== 'pendiente') return mockError('Esta solicitud ya fue procesada')
    db.solicitudes[idx] = { ...s, estado: 'aprobado', revisado_por: 2, updated_at: new Date().toISOString() }

    // Si es alta, agregar el jugador al db mock
    if (s.tipo === 'alta_jugador' && s.datos) {
      const nuevoJugador = {
        id: nextId('jugadores'),
        nombre: s.datos.nombre,
        apellido: s.datos.apellido,
        numero_camiseta: s.datos.numero_camiseta,
        posicion: s.datos.posicion,
        equipo_id: s.equipo_id,
        es_capitan: 0,
        activo: 1,
      }
      db.jugadores.push(nuevoJugador)
    }

    // Si es baja, desactivar el jugador en el db mock
    if (s.tipo === 'baja_jugador' && s.jugador_id) {
      const jIdx = (db.jugadores as any[]).findIndex(j => j.id === s.jugador_id)
      if (jIdx !== -1) db.jugadores[jIdx] = { ...db.jugadores[jIdx], activo: 0 }
    }

    return mockOk(db.solicitudes[idx])
  }),

  // Rechazar
  http.put(`${BASE}/:id/rechazar`, async ({ params, request }) => {
    const idx = (db.solicitudes as any[]).findIndex(s => s.id === Number(params.id))
    if (idx === -1) return mockNotFound('Solicitud')
    const s = db.solicitudes[idx]
    if (s.estado !== 'pendiente') return mockError('Esta solicitud ya fue procesada')
    const body = await request.json() as any
    db.solicitudes[idx] = {
      ...s,
      estado: 'rechazado',
      revisado_por: 2,
      motivo_rechazo: body.motivo ?? null,
      updated_at: new Date().toISOString(),
    }
    return mockOk(db.solicitudes[idx])
  }),
]
