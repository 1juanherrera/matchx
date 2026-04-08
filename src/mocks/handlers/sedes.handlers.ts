/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — SEDES Y CANCHAS
 * BD: sedes_db.sedes (PK: id_sedes) + match_produccion.canchas (PK: id_canchas)
 * ═══════════════════════════════════════════════════════════════
 *
 * GET    /api/torneos/sedes
 * GET    /api/torneos/sedes/:id              (incluye canchas en el objeto)
 * GET    /api/torneos/sedes/:id/canchas
 * POST   /api/torneos/sedes                  body: { nombre, nombre_comercial?, descripcion?, email?, web?, estado?, direccion?, barrio?, telefono?, celular?, ciudad?, departamento?, capacidad? }
 * PUT    /api/torneos/sedes/:id              body: Partial<Sede>
 * PUT    /api/torneos/sedes/:id/toggle
 * POST   /api/torneos/canchas                body: { sede_id, nombre, tipo_superficie?, largo_metros?, ancho_metros?, capacidad? }
 * PUT    /api/torneos/canchas/:id            body: Partial<Cancha>
 * PUT    /api/torneos/canchas/:id/toggle     (cambia el campo activo)
 * DELETE /api/torneos/canchas/:id
 *
 * Campos que el frontend espera en TODA respuesta Sede:
 * id_sedes, name (nombre de la sede), ciudad, departamento,
 * direccion, capacidad, telefono, email, estado (0|1), creado_en,
 * canchas: []
 *
 * Campos que el frontend espera en TODA respuesta Cancha:
 * id_canchas, sede_id, nombre, tipo_superficie, largo_metros,
 * ancho_metros, capacidad, activo (0|1)
 *
 * NOTA IMPORTANTE: Las sedes viven en una BD separada.
 * El campo `activo` del frontend se mapea desde `estado` de la BD de sedes.
 * El nombre del frontend usa 'name' (campo real de BD) no 'nombre'.
 * Las canchas (tabla match_produccion.canchas) no tienen campo `disponible`,
 * solo `activo`. El frontend lee: disponible = activo === 1.
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db, nextId } from '../db'
import { mockOk, mockCreated, mockNotFound } from '../utils/response'

function withCanchaDbFields(raw: any, sedeId?: number) {
  return {
    id_canchas:      raw.id,
    sede_id:         sedeId ?? raw.sede_id ?? 0,
    nombre:          raw.nombre          ?? '',
    tipo_superficie: raw.tipo_superficie ?? raw.tipo ?? 'sintetica',
    largo_metros:    raw.largo_metros    ?? 0,
    ancho_metros:    raw.ancho_metros    ?? 0,
    capacidad:       raw.capacidad       ?? 0,
    activo:          raw.disponible !== undefined ? (raw.disponible ? 1 : 0) : (raw.activo ?? 1),
    creado_en:       raw.creado_en       ?? new Date().toISOString(),
  }
}

function withSedeDbFields(raw: any) {
  return {
    id_sedes:        raw.id,
    // BD de sedes usa `name`, no `nombre`
    name:            raw.nombre          ?? raw.name ?? '',
    nombre_comercial:raw.nombre_comercial ?? raw.nombre ?? '',
    descripcion:     raw.descripcion     ?? '',
    email:           raw.email           ?? '',
    web:             raw.web             ?? '',
    // `estado` en la BD de sedes (0=inactivo, 1=activo)
    estado:          raw.activo          ?? raw.estado ?? 1,
    ciudad:          raw.ciudad          ?? '',
    departamento:    raw.departamento    ?? '',
    direccion:       raw.direccion       ?? '',
    capacidad:       raw.capacidad       ?? 0,
    telefono:        raw.telefono        ?? '',
    creado_en:       raw.creado_en       ?? new Date().toISOString(),
    canchas:         (raw.canchas ?? []).map((c: any) => withCanchaDbFields(c, raw.id)),
  }
}

export const sedesHandlers = [
  http.get('/api/torneos/sedes', async () => {
    return mockOk((db.sedes as any[]).map(withSedeDbFields))
  }),

  http.get('/api/torneos/sedes/:id', async ({ params }) => {
    const item = (db.sedes as any[]).find(s => s.id === Number(params.id))
    return item ? mockOk(withSedeDbFields(item)) : mockNotFound('Sede')
  }),

  http.get('/api/torneos/sedes/:id/canchas', async ({ params }) => {
    const sede = (db.sedes as any[]).find(s => s.id === Number(params.id))
    if (!sede) return mockNotFound('Sede')
    const canchas = (sede.canchas ?? []).map((c: any) => withCanchaDbFields(c, sede.id))
    return mockOk(canchas)
  }),

  http.post('/api/torneos/sedes', async ({ request }) => {
    const body  = await request.json() as any
    const nueva = { id: nextId('sedes'), ...body, activo: body.estado ?? 1, canchas: [], creado_en: new Date().toISOString() }
    db.sedes.push(nueva)
    return mockCreated(withSedeDbFields(nueva))
  }),

  http.put('/api/torneos/sedes/:id', async ({ params, request }) => {
    const idx = (db.sedes as any[]).findIndex(s => s.id === Number(params.id))
    if (idx === -1) return mockNotFound('Sede')
    db.sedes[idx] = { ...db.sedes[idx], ...await request.json() as any }
    return mockOk(withSedeDbFields(db.sedes[idx]))
  }),

  http.put('/api/torneos/sedes/:id/toggle', async ({ params }) => {
    const item = (db.sedes as any[]).find(s => s.id === Number(params.id))
    if (!item) return mockNotFound('Sede')
    item.activo = item.activo === 1 ? 0 : 1
    return mockOk(withSedeDbFields(item))
  }),

  // ─── Canchas ─────────────────────────────────────────────────────────────
  http.post('/api/torneos/canchas', async ({ request }) => {
    const body  = await request.json() as any
    const sedeIdx = (db.sedes as any[]).findIndex(s => s.id === body.sede_id)
    const nueva = { id: nextId('canchas'), ...body, activo: 1, creado_en: new Date().toISOString() }
    if (sedeIdx !== -1) {
      db.sedes[sedeIdx].canchas = db.sedes[sedeIdx].canchas ?? []
      db.sedes[sedeIdx].canchas.push(nueva)
    }
    return mockCreated(withCanchaDbFields(nueva, body.sede_id))
  }),

  http.put('/api/torneos/canchas/:id', async ({ params, request }) => {
    const canchaId = Number(params.id)
    const body     = await request.json() as any
    for (const sede of db.sedes as any[]) {
      const idx = (sede.canchas ?? []).findIndex((c: any) => c.id === canchaId)
      if (idx !== -1) {
        sede.canchas[idx] = { ...sede.canchas[idx], ...body }
        return mockOk(withCanchaDbFields(sede.canchas[idx], sede.id))
      }
    }
    return mockNotFound('Cancha')
  }),

  http.put('/api/torneos/canchas/:id/toggle', async ({ params }) => {
    const canchaId = Number(params.id)
    for (const sede of db.sedes as any[]) {
      const cancha = (sede.canchas ?? []).find((c: any) => c.id === canchaId)
      if (cancha) {
        // Canchas no tienen `disponible` en BD, solo `activo`
        if (cancha.disponible !== undefined) {
          cancha.disponible = !cancha.disponible
          cancha.activo = cancha.disponible ? 1 : 0
        } else {
          cancha.activo = cancha.activo === 1 ? 0 : 1
        }
        return mockOk(withCanchaDbFields(cancha, sede.id))
      }
    }
    return mockNotFound('Cancha')
  }),

  http.delete('/api/torneos/canchas/:id', async ({ params }) => {
    const canchaId = Number(params.id)
    for (const sede of db.sedes as any[]) {
      const idx = (sede.canchas ?? []).findIndex((c: any) => c.id === canchaId)
      if (idx !== -1) {
        sede.canchas.splice(idx, 1)
        return mockOk({ message: 'Cancha eliminada correctamente' })
      }
    }
    return mockNotFound('Cancha')
  }),
]
