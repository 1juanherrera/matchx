/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — JUGADORES
 * BD: match_produccion.jugadores (PK: id_jugadores)
 * ═══════════════════════════════════════════════════════════════
 *
 * GET    /api/torneos/jugadores               ?nombre=
 * GET    /api/torneos/jugadores/:id
 * GET    /api/torneos/jugadores/:id/torneos
 * GET    /api/torneos/jugadores/:id/estadisticas/:torneoId
 * POST   /api/torneos/jugadores               body: { nombre, apellido, tipo_documento?, numero_documento?, fecha_nacimiento?, telefono?, correo?, url_foto? }
 * PUT    /api/torneos/jugadores/:id           body: Partial<Jugador>
 * PUT    /api/torneos/jugadores/:id/toggle
 *
 * Campos que el frontend espera en TODA respuesta Jugador:
 * id_jugadores, nombre, apellido, activo
 *
 * Campos adicionales cuando se retorna en contexto de equipo/torneo (JOIN con plantilla):
 * - numero_dorsal: número de camiseta en ese torneo (tabla plantilla)
 * - posicion: posición en ese torneo (tabla plantilla)
 * - equipo_id: ID del equipo (via inscripciones → plantilla)
 *
 * NOTA: numero_camiseta y posicion NO están en la tabla jugadores,
 * están en la tabla plantilla. Al retornar jugadores de un equipo en
 * un torneo (via equipos/:id/plantilla/:torneoId), incluir estos campos.
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db, nextId } from '../db'
import { mockOk, mockCreated, mockNotFound, mockToggle } from '../utils/response'

const BASE = '/api/torneos/jugadores'

function withDbFields(raw: any) {
  return {
    // PK con nombre de BD
    id_jugadores:    raw.id,
    // Campos de la tabla jugadores
    nombre:          raw.nombre          ?? '',
    apellido:        raw.apellido        ?? '',
    tipo_documento:  raw.tipo_documento  ?? null,
    numero_documento:raw.numero_documento ?? null,
    fecha_nacimiento:raw.fecha_nacimiento ?? null,
    telefono:        raw.telefono        ?? null,
    correo:          raw.correo          ?? null,
    url_foto:        raw.url_foto        ?? null,
    activo:          raw.activo          ?? 1,
    creado_en:       raw.creado_en       ?? new Date().toISOString(),
    // Campos de plantilla incluidos por contexto (JOIN)
    numero_dorsal:   raw.numero_camiseta ?? raw.numero_dorsal ?? null,
    posicion:        raw.posicion        ?? null,
    equipo_id:       raw.equipo_id       ?? null,
  }
}

export const jugadoresHandlers = [
  http.get(BASE, async ({ request }) => {
    const nombre = new URL(request.url).searchParams.get('nombre')?.toLowerCase()
    let lista    = (db.jugadores as any[])
    if (nombre) lista = lista.filter(j => `${j.nombre} ${j.apellido}`.toLowerCase().includes(nombre))
    return mockOk(lista.map(withDbFields))
  }),

  http.get(`${BASE}/:id`, async ({ params }) => {
    const item = (db.jugadores as any[]).find(j => j.id === Number(params.id))
    return item ? mockOk(withDbFields(item)) : mockNotFound('Jugador')
  }),

  http.get(`${BASE}/:id/torneos`, async ({ params }) => {
    const jugador = (db.jugadores as any[]).find(j => j.id === Number(params.id))
    if (!jugador) return mockNotFound('Jugador')
    const torneos = db.torneos
      .filter(t => db.equipos.some((e: any) => e.id === jugador.equipo_id && e.torneo_id === t.id))
      .map(t => ({ id_torneos: t.id, nombre: t.nombre, estado: t.estado }))
    return mockOk(torneos)
  }),

  http.get(`${BASE}/:id/estadisticas/:torneoId`, async ({ params }) => {
    return mockOk({
      jugador_id:         Number(params.id),
      torneo_id:          Number(params.torneoId),
      partidos_jugados:   0,
      goles:              0,
      asistencias:        0,
      tarjetas_amarillas: 0,
      tarjetas_rojas:     0,
      minutos_jugados:    0,
    })
  }),

  http.post(BASE, async ({ request }) => {
    const body  = await request.json() as any
    const nuevo = { id: nextId('jugadores'), ...body, activo: 1, creado_en: new Date().toISOString() }
    db.jugadores.push(nuevo)
    return mockCreated(withDbFields(nuevo))
  }),

  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const idx = (db.jugadores as any[]).findIndex(j => j.id === Number(params.id))
    if (idx === -1) return mockNotFound('Jugador')
    db.jugadores[idx] = { ...db.jugadores[idx], ...await request.json() as any }
    return mockOk(withDbFields(db.jugadores[idx]))
  }),

  http.put(`${BASE}/:id/toggle`, async ({ params }) => {
    const item = (db.jugadores as any[]).find(j => j.id === Number(params.id))
    if (!item) return mockNotFound('Jugador')
    return mockToggle(item)
  }),
]
