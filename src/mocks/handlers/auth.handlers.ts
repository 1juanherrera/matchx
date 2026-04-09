/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — AUTH
 * ═══════════════════════════════════════════════════════════════
 *
 * POST   /api/login    body: { username, password, selectedRole? }
 * POST   /api/logout
 *
 * Respuesta login exitoso:
 * { token: string, user: { id, username, email, rol, url_avatar } }
 *
 * Respuesta login fallido: HTTP 422 (NO 401 — el interceptor de axios
 * redirige a /login en cualquier 401, por eso se usa 422 para credenciales
 * incorrectas y así el catch del LoginView puede mostrar el error).
 *
 * IDs de usuarios (coinciden con arbitro_id / delegado_id en partidos):
 *   1=superadmin  2=admin_torneo  3=admin_sede
 *   4=delegado    5=arbitro       6=capitan    7=publico
 * ═══════════════════════════════════════════════════════════════
 */
import { HttpResponse } from 'msw'
import { route as http } from '../utils/routes'
import { db } from '../db'

const DELAY_MS = import.meta.env.VITE_MOCK_DELAY ? Number(import.meta.env.VITE_MOCK_DELAY) : 300
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// JWT mínimo estático — 3 segmentos requeridos para decodeJwtPayload()
// eyJhbGciOiJIUzI1NiJ9 = {"alg":"HS256"}  |  eyJzdWIiOiJtb2NrIn0 = {"sub":"mock"}
const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtb2NrIn0.mock_matchx'

export const authHandlers = [
  http.post('/api/login', async ({ request }) => {
    await sleep(DELAY_MS)
    const body  = await request.json() as any
    const input = (body.username ?? body.email ?? '').toLowerCase().trim()

    console.info('[MSW] POST /api/login — input:', input)

    const usuario = (db.usuarios as any[]).find(u =>
      u.correo.toLowerCase() === input ||
      u.nombre.toLowerCase() === input
    )

    if (!usuario) {
      // 422 en vez de 401 — el interceptor de axios solo redirige a /login en 401,
      // así el catch del LoginView puede capturar el error y mostrar el mensaje.
      return HttpResponse.json(
        { message: 'Credenciales incorrectas. Verifica tu correo.' },
        { status: 422 }
      )
    }

    const jugadorRecord = (db.jugadores as any[]).find(j => j.usuario_id === usuario.id)

    return HttpResponse.json({
      token: FAKE_TOKEN,
      user: {
        id:         usuario.id,
        username:   usuario.nombre,
        email:      usuario.correo,
        rol:        usuario.rol,
        url_avatar: usuario.url_avatar ?? null,
        equipo_id:  jugadorRecord?.equipo_id ?? undefined,
        es_capitan: jugadorRecord?.es_capitan ?? 0,
      },
    })
  }),

  http.post('/api/logout', async () => {
    await sleep(DELAY_MS)
    return HttpResponse.json({ message: 'Sesión cerrada correctamente' })
  }),

  // GET /api/user NO se mockea — si el backend real lo maneja, pasa directo.
  // No incluir un handler que devuelva 401 ya que el interceptor de axios
  // haría logout automático al cargar cualquier vista protegida.
]
