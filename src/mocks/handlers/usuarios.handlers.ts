/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — USUARIOS
 * BD: tabla users del sistema Laravel (PK: id_users)
 * ═══════════════════════════════════════════════════════════════
 *
 * GET    /api/torneos/usuarios                ?rol=
 * GET    /api/torneos/usuarios/delegados
 * GET    /api/torneos/usuarios/arbitros-disponibles
 * GET    /api/torneos/usuarios/:id
 * POST   /api/torneos/usuarios                body: { nombre, correo, contrasena, rol }
 * PUT    /api/torneos/usuarios/:id            body: Partial<Usuario>
 * PUT    /api/torneos/usuarios/:id/password   body: { nueva_contrasena }
 * PUT    /api/torneos/usuarios/:id/toggle
 *
 * Campos que el frontend espera en TODA respuesta Usuario:
 * id_users, username (nombre del usuario), email, telefono,
 * url_avatar, rol, activated (0|1), ultimo_acceso, creado_en
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db, nextId } from '../db'
import { mockOk, mockCreated, mockNotFound } from '../utils/response'

const BASE = '/api/torneos/usuarios'

function withDbFields(raw: any) {
  return {
    // PK con nombre de BD del sistema Laravel
    id_users:      raw.id,
    // Campos del modelo de usuarios
    username:      raw.nombre        ?? raw.username ?? '',
    email:         raw.correo        ?? raw.email ?? '',
    telefono:      raw.telefono      ?? '',
    url_avatar:    raw.url_avatar    ?? '',
    rol:           raw.rol           ?? 'publico',
    activated:     raw.activo        ?? raw.activated ?? 1,
    ultimo_acceso: raw.ultimo_acceso ?? '',
    creado_en:     raw.creado_en     ?? new Date().toISOString(),
  }
}

export const usuariosHandlers = [
  http.get(BASE, async ({ request }) => {
    const rol  = new URL(request.url).searchParams.get('rol')
    let lista  = db.usuarios as any[]
    if (rol) lista = lista.filter(u => u.rol === rol)
    return mockOk(lista.map(withDbFields))
  }),

  http.get(`${BASE}/delegados`, async () => {
    const lista = (db.usuarios as any[]).filter(u => u.rol === 'delegado')
    return mockOk(lista.map(withDbFields))
  }),

  http.get(`${BASE}/arbitros-disponibles`, async () => {
    const lista = (db.usuarios as any[]).filter(u => u.rol === 'arbitro' && u.activo === 1)
    return mockOk(lista.map(withDbFields))
  }),

  http.get(`${BASE}/:id`, async ({ params }) => {
    const item = (db.usuarios as any[]).find(u => u.id === Number(params.id))
    return item ? mockOk(withDbFields(item)) : mockNotFound('Usuario')
  }),

  http.post(BASE, async ({ request }) => {
    const body  = await request.json() as any
    const nuevo = {
      id: nextId('usuarios'),
      nombre:        body.nombre,
      correo:        body.correo,
      rol:           body.rol ?? 'publico',
      activo:        1,
      url_avatar:    '',
      telefono:      '',
      ultimo_acceso: '',
      creado_en:     new Date().toISOString(),
    }
    db.usuarios.push(nuevo)
    return mockCreated(withDbFields(nuevo))
  }),

  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const idx = (db.usuarios as any[]).findIndex(u => u.id === Number(params.id))
    if (idx === -1) return mockNotFound('Usuario')
    db.usuarios[idx] = { ...db.usuarios[idx], ...await request.json() as any }
    return mockOk(withDbFields(db.usuarios[idx]))
  }),

  http.put(`${BASE}/:id/password`, async ({ params }) => {
    const item = (db.usuarios as any[]).find(u => u.id === Number(params.id))
    if (!item) return mockNotFound('Usuario')
    return mockOk({ message: 'Contraseña actualizada correctamente' })
  }),

  http.put(`${BASE}/:id/toggle`, async ({ params }) => {
    const item = (db.usuarios as any[]).find(u => u.id === Number(params.id))
    if (!item) return mockNotFound('Usuario')
    item.activo = item.activo === 1 ? 0 : 1
    return mockOk(withDbFields(item))
  }),
]
