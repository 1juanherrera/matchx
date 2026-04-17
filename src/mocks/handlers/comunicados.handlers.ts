/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — COMUNICADOS / TABLÓN DE TORNEO
 * ═══════════════════════════════════════════════════════════════
 *
 * GET    /api/torneos/comunicados          ?torneo_id=&tipo=&activo=
 * POST   /api/torneos/comunicados          body: { titulo, cuerpo, tipo, torneo_id? }
 * PUT    /api/torneos/comunicados/:id      body: { titulo?, cuerpo?, tipo?, activo? }
 * DELETE /api/torneos/comunicados/:id      (soft delete — activo = 0)
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db, nextId }    from '../db'
import { mockOk, mockCreated, mockNotFound } from '../utils/response'

const BASE = '/api/torneos/comunicados'

export const comunicadosHandlers = [

  // Listar (con filtros opcionales)
  http.get(BASE, async ({ request }) => {
    const params   = new URL(request.url).searchParams
    const torneoId = params.get('torneo_id') ? Number(params.get('torneo_id')) : null
    const tipo     = params.get('tipo')
    const soloActivos = params.get('activo') !== '0'

    let lista = db.comunicados as any[]

    if (soloActivos)  lista = lista.filter(c => c.activo)
    if (torneoId)     lista = lista.filter(c => c.torneo_id === torneoId || c.torneo_id === null)
    if (tipo)         lista = lista.filter(c => c.tipo === tipo)

    // Más recientes primero; urgentes al tope
    lista = [...lista].sort((a, b) => {
      if (a.tipo === 'urgente' && b.tipo !== 'urgente') return -1
      if (a.tipo !== 'urgente' && b.tipo === 'urgente') return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return mockOk(lista)
  }),

  // Crear
  http.post(BASE, async ({ request }) => {
    const body = await request.json() as any
    const nuevo = {
      id:                 nextId('comunicados'),
      titulo:             body.titulo,
      cuerpo:             body.cuerpo,
      tipo:               body.tipo ?? 'general',
      torneo_id:          body.torneo_id ?? null,
      creado_por:         2,
      creado_por_nombre:  'Ana',
      activo:             true,
      created_at:         new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    }
    db.comunicados.push(nuevo)
    return mockCreated(nuevo)
  }),

  // Actualizar
  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const idx = (db.comunicados as any[]).findIndex(c => c.id === Number(params.id))
    if (idx === -1) return mockNotFound('Comunicado')
    const body = await request.json() as any
    db.comunicados[idx] = {
      ...db.comunicados[idx],
      ...body,
      updated_at: new Date().toISOString(),
    }
    return mockOk(db.comunicados[idx])
  }),

  // Eliminar (soft delete)
  http.delete(`${BASE}/:id`, async ({ params }) => {
    const idx = (db.comunicados as any[]).findIndex(c => c.id === Number(params.id))
    if (idx === -1) return mockNotFound('Comunicado')
    db.comunicados[idx] = { ...db.comunicados[idx], activo: false, updated_at: new Date().toISOString() }
    return mockOk({ id: Number(params.id) })
  }),
]
