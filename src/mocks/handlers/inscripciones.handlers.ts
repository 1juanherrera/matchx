/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — INSCRIPCIONES
 * BD: match_produccion.inscripciones (PK: id_inscripciones)
 * ═══════════════════════════════════════════════════════════════
 *
 * GET    /api/torneos/torneos/:id/inscripciones
 * POST   /api/torneos/inscripciones           body: { torneo_id, equipo_id, observaciones? }
 * PUT    /api/torneos/inscripciones/:id/aprobar   body: { admin_id }
 * PUT    /api/torneos/inscripciones/:id/rechazar  body: { motivo_rechazo? }
 * DELETE /api/torneos/inscripciones/:id
 *
 * Campos que el frontend espera en TODA respuesta Inscripcion:
 * id_inscripciones, torneo_id, equipo_id, grupo_id, estado,
 * fecha_inscripcion, aprobado_por (nombre del admin), fecha_aprobacion,
 * motivo_rechazo, observaciones
 *
 * Campos derivados del JOIN con la tabla equipos (obligatorios):
 * equipo: {
 *   nombre, nombre_corto,
 *   color_principal, color_secundario,
 *   url_escudo
 * }
 *
 * NOTA: El backend puede devolver el equipo como objeto anidado
 * o como campos planos (equipo_nombre, equipo_color_principal, etc.).
 * El frontend soporta ambas formas. Se recomienda el objeto anidado.
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db, nextId } from '../db'
import { mockOk, mockCreated, mockNotFound } from '../utils/response'

function buildEquipoJoin(equipo_id: number) {
  const equipo = (db.equipos as any[]).find(e => e.id_equipos === equipo_id || e.id === equipo_id) ?? {}
  const colores = typeof equipo.colores === 'string' ? equipo.colores.split(',') : []
  return {
    nombre:          equipo.nombre         ?? '',
    nombre_corto:    equipo.nombre_corto   ?? (equipo.nombre ?? '').slice(0, 6).toUpperCase(),
    color_principal: equipo.color_principal  ?? colores[0] ?? '',
    color_secundario:equipo.color_secundario ?? colores[1] ?? '',
    url_escudo:      equipo.url_escudo     ?? equipo.escudo_url ?? '',
  }
}

function withDbFields(raw: any) {
  return {
    id_inscripciones: raw.id_inscripciones || raw.id,
    torneo_id:        raw.torneo_id        ?? 0,
    equipo_id:        raw.equipo_id        ?? 0,
    grupo_id:         raw.grupo_id         ?? null,
    estado:           raw.estado           ?? 'pendiente',
    fecha_inscripcion:raw.fecha_inscripcion ?? new Date().toISOString(),
    aprobado_por:     raw.aprobado_por_nombre ?? null,
    fecha_aprobacion: raw.fecha_aprobacion ?? null,
    motivo_rechazo:   raw.motivo_rechazo   ?? null,
    observaciones:    raw.observaciones    ?? null,
    // Objeto equipo anidado (JOIN con tabla equipos)
    equipo:           buildEquipoJoin(raw.equipo_id),
    // Pago de matrícula
    pago_estado:      raw.pago_estado     ?? 'pendiente',
    pago_metodo:      raw.pago_metodo     ?? null,
    pago_referencia:  raw.pago_referencia ?? null,
    pago_fecha:       raw.pago_fecha      ?? null,
  }
}

export const inscripcionesHandlers = [
  http.get('/api/torneos/torneos/:torneoId/inscripciones', async ({ params }) => {
    const lista = db.inscripciones
      .filter(i => i.torneo_id === Number(params.torneoId))
      .map(withDbFields)
    return mockOk(lista)
  }),

  http.post('/api/torneos/inscripciones', async ({ request }) => {
    const body  = await request.json() as any
    // Evitar duplicados (uk_torneo_equipo)
    const existe = db.inscripciones.find(i => i.torneo_id === body.torneo_id && i.equipo_id === body.equipo_id)
    if (existe) {
      const { mockError } = await import('../utils/response')
      return mockError('El equipo ya está inscrito en este torneo', 422)
    }
    const nueva = {
      id:               nextId('inscripciones'),
      torneo_id:        body.torneo_id,
      equipo_id:        body.equipo_id,
      grupo_id:         body.grupo_id         ?? null,
      estado:           'pendiente',
      fecha_inscripcion:new Date().toISOString(),
      aprobado_por:     null,
      aprobado_por_nombre: null,
      fecha_aprobacion: null,
      motivo_rechazo:   null,
      observaciones:    body.observaciones     ?? null,
    }
    db.inscripciones.push(nueva)
    return mockCreated(withDbFields(nueva))
  }),

  http.put('/api/torneos/inscripciones/:id/aprobar', async ({ params, request }) => {
    const idx  = db.inscripciones.findIndex(i => i.id === Number(params.id))
    if (idx === -1) return mockNotFound('Inscripción')
    const body = await request.json() as any
    const admin = (db.usuarios as any[]).find(u => u.id === body.admin_id)
    db.inscripciones[idx] = {
      ...db.inscripciones[idx],
      estado:              'aprobada',
      aprobado_por:        body.admin_id,
      aprobado_por_nombre: admin?.nombre ?? 'Admin',
      fecha_aprobacion:    new Date().toISOString(),
    }
    return mockOk(withDbFields(db.inscripciones[idx]))
  }),

  http.put('/api/torneos/inscripciones/:id/rechazar', async ({ params, request }) => {
    const idx  = db.inscripciones.findIndex(i => i.id === Number(params.id))
    if (idx === -1) return mockNotFound('Inscripción')
    const body = await request.json() as any
    db.inscripciones[idx] = {
      ...db.inscripciones[idx],
      estado:        'rechazada',
      motivo_rechazo:body.motivo_rechazo ?? null,
    }
    return mockOk(withDbFields(db.inscripciones[idx]))
  }),

  http.delete('/api/torneos/inscripciones/:id', async ({ params }) => {
    const idx = db.inscripciones.findIndex(i => i.id === Number(params.id))
    if (idx === -1) return mockNotFound('Inscripción')
    db.inscripciones.splice(idx, 1)
    return mockOk({ message: 'Inscripción eliminada correctamente' })
  }),

  // ── Pago de matrícula ──────────────────────────────────────────────────────
  http.put('/api/torneos/inscripciones/:id/pago', async ({ params, request }) => {
    const idx = db.inscripciones.findIndex(i => i.id === Number(params.id))
    if (idx === -1) return mockNotFound('Inscripción')
    const body = await request.json() as any
    db.inscripciones[idx] = {
      ...db.inscripciones[idx],
      pago_estado:     body.pago_estado     ?? 'pagado',
      pago_metodo:     body.pago_metodo     ?? null,
      pago_referencia: body.pago_referencia ?? null,
      pago_fecha:      body.pago_fecha      ?? new Date().toISOString(),
    }
    return mockOk(withDbFields(db.inscripciones[idx]))
  }),
]
