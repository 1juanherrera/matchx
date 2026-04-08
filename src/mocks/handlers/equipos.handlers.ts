/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — EQUIPOS
 * BD: match_produccion.equipos (PK: id_equipos)
 * ═══════════════════════════════════════════════════════════════
 *
 * GET    /api/torneos/equipos
 * GET    /api/torneos/equipos/:id
 * GET    /api/torneos/equipos/:id/plantilla/:torneoId
 * POST   /api/torneos/equipos     body: { nombre, nombre_corto, color_principal, color_secundario, color_terciario, color_cuaternario, url_escudo?, capitan_id? }
 * PUT    /api/torneos/equipos/:id body: Partial<Equipo>
 * PUT    /api/torneos/equipos/:id/toggle
 *
 * Campos que el frontend espera en TODA respuesta Equipo:
 * id_equipos, nombre, nombre_corto, url_escudo,
 * color_principal, color_secundario, color_terciario, color_cuaternario,
 * activo, creado_en
 *
 * Campos derivados (JOIN o calculados por el backend):
 * - capitan_nombre: nombre del usuario capitan usando capitan_id → tabla usuarios
 * - torneo_id: se incluye cuando el equipo viene del contexto de una inscripción
 *
 * NOTA: equipos no tiene torneo_id en BD. La relación
 * equipo ↔ torneo está en la tabla inscripciones.
 * Al listar equipos por torneo, incluir torneo_id del contexto.
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db, nextId } from '../db'
import { mockOk, mockCreated, mockNotFound, mockToggle } from '../utils/response'

const BASE = '/api/torneos/equipos'

function withDbFields(raw: any) {
  // Parsear `colores: "hex1,hex2"` del seed legacy si existe
  const colores = typeof raw.colores === 'string' ? raw.colores.split(',') : []
  return {
    // PK con nombre de BD
    id_equipos:        raw.id_equipos || raw.id,
    // Campos de la tabla equipos
    nombre:            raw.nombre            ?? '',
    nombre_corto:      raw.nombre_corto      ?? (raw.nombre ?? '').slice(0, 6).toUpperCase(),
    url_escudo:        raw.url_escudo        ?? raw.escudo_url ?? '',
    color_principal:   raw.color_principal   ?? colores[0] ?? '#000000',
    color_secundario:  raw.color_secundario  ?? colores[1] ?? '#ffffff',
    color_terciario:   raw.color_terciario   ?? '',
    color_cuaternario: raw.color_cuaternario ?? '',
    capitan_id:        raw.capitan_id        ?? null,
    activo:            raw.activo            ?? 1,
    creado_en:         raw.creado_en         ?? new Date().toISOString(),
    // Campos derivados (JOIN que debe hacer el backend)
    capitan_nombre:    raw.capitan_nombre    ?? '',
    torneo_id:         raw.torneo_id         ?? 0,
  }
}

export const equiposHandlers = [
  http.get(BASE, async () => mockOk(db.equipos.map(withDbFields))),

  http.get(`${BASE}/:id`, async ({ params }) => {
    const item = db.equipos.find(e => (e.id_equipos || e.id) === Number(params.id))
    return item ? mockOk(withDbFields(item)) : mockNotFound('Equipo')
  }),

  // Plantilla del equipo en un torneo — retorna jugadores con datos de plantilla incluidos
  // El backend debe JOIN jugadores + plantilla + inscripciones filtrando por equipo y torneo
  http.get(`${BASE}/:equipoId/plantilla/:torneoId`, async ({ params }) => {
    const lista = (db.jugadores as any[])
      .filter(j => j.equipo_id === Number(params.equipoId))
      .map(j => ({
        id_jugadores:    j.id,
        nombre:          j.nombre,
        apellido:        j.apellido,
        url_foto:        j.url_foto      ?? null,
        activo:          j.activo        ?? 1,
        equipo_id:       j.equipo_id,
        // Datos de plantilla (JOIN con tabla plantilla)
        numero_dorsal:   j.numero_camiseta ?? j.numero_dorsal ?? null,
        posicion:        j.posicion        ?? null,
        es_capitan:      j.es_capitan      ?? 0,
        estado:          'activo',
      }))
    return mockOk(lista)
  }),

  http.post(BASE, async ({ request }) => {
    const body  = await request.json() as any
    const nuevo = { id: nextId('equipos'), ...body, activo: 1, creado_en: new Date().toISOString() }
    db.equipos.push(nuevo)
    return mockCreated(withDbFields(nuevo))
  }),

  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const idx = db.equipos.findIndex(e => (e.id_equipos || e.id) === Number(params.id))
    if (idx === -1) return mockNotFound('Equipo')
    db.equipos[idx] = { ...db.equipos[idx], ...await request.json() as any }
    return mockOk(withDbFields(db.equipos[idx]))
  }),

  http.put(`${BASE}/:id/toggle`, async ({ params }) => {
    const item = db.equipos.find(e => (e.id_equipos || e.id) === Number(params.id))
    if (!item) return mockNotFound('Equipo')
    return mockToggle(item)
  }),
]
