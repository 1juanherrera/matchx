/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — TORNEOS
 * BD: match_produccion.torneos (PK: id_torneos)
 * ═══════════════════════════════════════════════════════════════
 *
 * GET    /api/torneos/torneos                  ?estado=borrador|inscripciones_abiertas|en_curso|finalizado|cancelado
 * GET    /api/torneos/torneos/:id
 * POST   /api/torneos/torneos                  body: { nombre, edicion, categoria, modalidad_id, fecha_inicio, fecha_fin, fecha_limite_inscripcion, max_equipos, min_jugadores, max_jugadores, admin_id, descripcion?, reglamento?, url_banner?, valor_matricula?, valor_tarjeta_amarilla?, valor_tarjeta_roja?, multa_inasistencia?, valor_jugador_tardio?, amarillas_para_suspension?, partidos_suspension_roja?, inscripcion_publica?, marcador_publico? }
 * PUT    /api/torneos/torneos/:id              body: Partial<Torneo>
 * PUT    /api/torneos/torneos/:id/estado       body: { estado: 'borrador'|'inscripciones_abiertas'|'en_curso'|'finalizado'|'cancelado' }
 * POST   /api/torneos/torneos/:id/sedes        body: { sede_id }
 * DELETE /api/torneos/torneos/:id/sedes/:sedeId
 * GET    /api/torneos/torneos/:id/partidos
 * GET    /api/torneos/torneos/:id/inscripciones
 * GET    /api/torneos/torneos/:id/goleadores   ?limite=10
 * GET    /api/torneos/torneos/:id/fairplay
 * GET    /api/torneos/fases/:faseId/posiciones
 *
 * Campos que el frontend espera en TODA respuesta Torneo:
 * id_torneos, nombre, edicion, categoria, descripcion, reglamento,
 * modalidad_id, admin_id, equipos_inscritos, estado,
 * fecha_inicio, fecha_fin, fecha_limite_inscripcion,
 * inscripcion_publica (0|1), marcador_publico (0|1),
 * valor_matricula, valor_tarjeta_amarilla, valor_tarjeta_roja,
 * multa_inasistencia, valor_jugador_tardio,
 * amarillas_para_suspension, partidos_suspension_roja,
 * min_jugadores, max_jugadores, max_equipos, url_banner, creado_en
 *
 * Campos adicionales derivados (JOIN o calculados por el backend):
 * - modalidad_codigo: código de la modalidad (ej: 'F5', 'F7', 'F11') desde tabla modalidades
 * - modalidad: nombre de la modalidad desde tabla modalidades
 * - administrador: nombre del admin desde tabla usuarios (usando admin_id)
 * - equipos_inscritos: COUNT de inscripciones aprobadas para este torneo
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db, nextId } from '../db'
import { mockOk, mockCreated, mockNotFound, mockError } from '../utils/response'

const BASE = '/api/torneos/torneos'

const MODALIDAD_MAP: Record<number, { codigo: string; nombre: string }> = {
  1: { codigo: 'F5',  nombre: 'Fútbol 5' },
  2: { codigo: 'F7',  nombre: 'Fútbol 7' },
  3: { codigo: 'F11', nombre: 'Fútbol 11' },
}

function withDbFields(raw: any) {
  const mod = MODALIDAD_MAP[raw.modalidad_id] ?? { codigo: 'F5', nombre: 'Fútbol 5' }
  return {
    // PK con nombre de BD
    id_torneos:                raw.id,
    // Campos de la tabla torneos
    nombre:                    raw.nombre                    ?? '',
    edicion:                   raw.edicion                   ?? '2026',
    categoria:                 raw.categoria                 ?? 'Abierta',
    descripcion:               raw.descripcion               ?? '',
    reglamento:                raw.reglamento                ?? '',
    modalidad_id:              raw.modalidad_id              ?? 1,
    estado:                    raw.estado                    ?? 'borrador',
    fecha_inicio:              raw.fecha_inicio              ?? '',
    fecha_fin:                 raw.fecha_fin                 ?? '',
    fecha_limite_inscripcion:  raw.fecha_limite_inscripcion  ?? raw.fecha_inicio ?? '',
    inscripcion_publica:       raw.inscripcion_publica       ?? 1,
    marcador_publico:          raw.marcador_publico          ?? 1,
    valor_matricula:           Number(raw.valor_matricula           ?? 0),
    valor_tarjeta_amarilla:    Number(raw.valor_tarjeta_amarilla    ?? 0),
    valor_tarjeta_roja:        Number(raw.valor_tarjeta_roja        ?? 0),
    multa_inasistencia:        Number(raw.multa_inasistencia        ?? 0),
    valor_jugador_tardio:      Number(raw.valor_jugador_tardio      ?? 0),
    amarillas_para_suspension: raw.amarillas_para_suspension ?? 3,
    partidos_suspension_roja:  raw.partidos_suspension_roja  ?? 1,
    min_jugadores:             raw.min_jugadores             ?? 5,
    max_jugadores:             raw.max_jugadores             ?? 25,
    max_equipos:               raw.max_equipos               ?? 0,
    admin_id:                  raw.admin_id                  ?? 1,
    url_banner:                raw.url_banner                ?? raw.imagen_url ?? '',
    creado_en:                 raw.creado_en                 ?? new Date().toISOString(),
    // Campos derivados (JOIN que debe hacer el backend)
    modalidad_codigo:          raw.modalidad_codigo          ?? mod.codigo,
    modalidad:                 raw.modalidad                 ?? mod.nombre,
    administrador:             raw.administrador             ?? 'Carlos Administrador',
    equipos_inscritos:         raw.equipos_inscritos         ?? db.inscripciones.filter(i => i.torneo_id === raw.id && i.estado === 'aprobada').length,
  }
}

const ESTADOS_VALIDOS = ['borrador', 'inscripciones_abiertas', 'en_curso', 'finalizado', 'cancelado']

export const torneosHandlers = [
  http.get(BASE, async ({ request }) => {
    const estado = new URL(request.url).searchParams.get('estado')
    let lista    = db.torneos.map(withDbFields)
    if (estado) lista = lista.filter(t => t.estado === estado)
    return mockOk(lista)
  }),

  http.get(`${BASE}/:id`, async ({ params }) => {
    const item = db.torneos.find(t => t.id === Number(params.id))
    return item ? mockOk(withDbFields(item)) : mockNotFound('Torneo')
  }),

  http.post(BASE, async ({ request }) => {
    const body  = await request.json() as any
    const nuevo = { id: nextId('torneos'), ...body, estado: body.estado ?? 'borrador', creado_en: new Date().toISOString() }
    db.torneos.push(nuevo)
    return mockCreated(withDbFields(nuevo))
  }),

  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const idx = db.torneos.findIndex(t => t.id === Number(params.id))
    if (idx === -1) return mockNotFound('Torneo')
    db.torneos[idx] = { ...db.torneos[idx], ...await request.json() as any }
    return mockOk(withDbFields(db.torneos[idx]))
  }),

  http.put(`${BASE}/:id/estado`, async ({ params, request }) => {
    const idx = db.torneos.findIndex(t => t.id === Number(params.id))
    if (idx === -1) return mockNotFound('Torneo')
    const { estado } = await request.json() as any
    if (!ESTADOS_VALIDOS.includes(estado)) return mockError('Estado inválido')
    db.torneos[idx].estado = estado
    return mockOk(withDbFields(db.torneos[idx]))
  }),

  http.post(`${BASE}/:torneoId/sedes`, async () => mockOk({ message: 'Sede asignada correctamente' })),

  http.delete(`${BASE}/:torneoId/sedes/:sedeId`, async () => mockOk({ message: 'Sede removida correctamente' })),

  http.get(`${BASE}/:id/partidos`, async ({ params }) => {
    const lista = (db.partidos as any[]).filter(p => p.torneo_id === Number(params.id))
    return mockOk(lista)
  }),


  http.get(`${BASE}/:id/goleadores`, async () => mockOk([])),

  http.get(`${BASE}/:id/fairplay`, async () => mockOk([])),

  // Tabla de posiciones calculada dinámicamente desde los partidos finalizados de la fase
  http.get('/api/torneos/fases/:faseId/posiciones', async ({ params }) => {
    const faseId   = Number(params.faseId)
    const partidos = (db.partidos as any[]).filter(
      p => p.fase_id === faseId && p.estado === 'finalizado'
    )

    // Acumular stats por equipo
    const stats: Record<number, {
      equipo_id: number; pj: number; v: number; e: number; d: number;
      gf: number; gc: number; pts: number;
    }> = {}

    function ensure(id: number) {
      if (!stats[id]) stats[id] = { equipo_id: id, pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0, pts: 0 }
    }

    for (const p of partidos) {
      const { equipo_local_id: loc, equipo_visitante_id: vis, goles_local: gl, goles_visitante: gv } = p
      ensure(loc); ensure(vis)

      stats[loc].pj++;  stats[vis].pj++
      stats[loc].gf += gl; stats[loc].gc += gv
      stats[vis].gf += gv; stats[vis].gc += gl

      if (gl > gv) {
        stats[loc].v++; stats[loc].pts += 3
        stats[vis].d++
      } else if (gl < gv) {
        stats[vis].v++; stats[vis].pts += 3
        stats[loc].d++
      } else {
        stats[loc].e++; stats[loc].pts++
        stats[vis].e++; stats[vis].pts++
      }
    }

    const tabla = Object.values(stats)
      .sort((a, b) => b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf)
      .map((s, idx) => ({
        id_tabla_posiciones: idx + 1,
        fase_id:             faseId,
        grupo_id:            null,
        equipo_id:           s.equipo_id,
        partidos_jugados:    s.pj,
        victorias:           s.v,
        empates:             s.e,
        derrotas:            s.d,
        goles_favor:         s.gf,
        goles_contra:        s.gc,
        diferencia_goles:    s.gf - s.gc,
        puntos:              s.pts,
        tarjetas_amarillas:  0,
        tarjetas_rojas:      0,
      }))

    return mockOk(tabla)
  }),
]
