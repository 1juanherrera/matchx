/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — MODALIDADES
 * BD: match_produccion.modalidades (PK: id_modalidades)
 * ═══════════════════════════════════════════════════════════════
 *
 * GET    /api/torneos/modalidades
 * GET    /api/torneos/modalidades/:id
 * POST   /api/torneos/modalidades   body: { nombre, codigo, jugadores_por_equipo, duracion_tiempo_minutos, numero_tiempos, max_cambios, descripcion?, activo? }
 * PUT    /api/torneos/modalidades/:id  body: Partial<Modalidad>
 * PUT    /api/torneos/modalidades/:id/toggle
 * DELETE /api/torneos/modalidades/:id
 *
 * Campos que el frontend espera en TODA respuesta Modalidad:
 * id_modalidades, nombre, codigo, descripcion,
 * jugadores_por_equipo, duracion_tiempo_minutos, numero_tiempos,
 * max_cambios, activo, creado_en
 *
 * NOTA: La tabla modalidades en BD NO tiene los campos `codigo`
 * ni `descripcion`. Se recomienda agregarlos:
 *   ALTER TABLE modalidades ADD codigo varchar(10) NOT NULL COMMENT 'Ej: F5, F7, F11';
 *   ALTER TABLE modalidades ADD descripcion text COMMENT 'Descripción de la modalidad';
 * El frontend los usa extensamente para mostrar información al usuario.
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db, nextId } from '../db'
import { mockOk, mockCreated, mockNotFound, mockToggle } from '../utils/response'

const BASE = '/api/torneos/modalidades'

function withDbFields(raw: any) {
  return {
    // PK con nombre de BD
    id_modalidades:       raw.id,
    // Campos de la tabla modalidades
    nombre:               raw.nombre               ?? '',
    jugadores_por_equipo: raw.jugadores_por_equipo ?? 0,
    duracion_tiempo_minutos: raw.duracion_minutos  ?? raw.duracion_tiempo_minutos ?? 45,
    numero_tiempos:       raw.numero_tiempos       ?? 2,
    max_cambios:          raw.cambios_permitidos   ?? raw.max_cambios ?? 5,
    activo:               raw.activo               ?? 1,
    creado_en:            raw.creado_en            ?? new Date().toISOString(),
    // Campos ADICIONALES recomendados (agregar a la tabla)
    codigo:               raw.codigo               ?? '',
    descripcion:          raw.descripcion          ?? '',
  }
}

export const modalidadesHandlers = [
  http.get(BASE, async () => {
    return mockOk((db.modalidades as any[]).map(withDbFields))
  }),

  http.get(`${BASE}/:id`, async ({ params }) => {
    const item = (db.modalidades as any[]).find(m => m.id === Number(params.id))
    return item ? mockOk(withDbFields(item)) : mockNotFound('Modalidad')
  }),

  http.post(BASE, async ({ request }) => {
    const body  = await request.json() as any
    const nueva = { id: nextId('modalidades'), ...body, activo: 1, creado_en: new Date().toISOString() }
    db.modalidades.push(nueva)
    return mockCreated(withDbFields(nueva))
  }),

  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const idx = (db.modalidades as any[]).findIndex(m => m.id === Number(params.id))
    if (idx === -1) return mockNotFound('Modalidad')
    db.modalidades[idx] = { ...db.modalidades[idx], ...await request.json() as any }
    return mockOk(withDbFields(db.modalidades[idx]))
  }),

  http.put(`${BASE}/:id/toggle`, async ({ params }) => {
    const item = (db.modalidades as any[]).find(m => m.id === Number(params.id))
    if (!item) return mockNotFound('Modalidad')
    return mockToggle(item)
  }),

  http.delete(`${BASE}/:id`, async ({ params }) => {
    const idx = (db.modalidades as any[]).findIndex(m => m.id === Number(params.id))
    if (idx === -1) return mockNotFound('Modalidad')
    db.modalidades.splice(idx, 1)
    return mockOk({ message: 'Modalidad eliminada correctamente' })
  }),
]
