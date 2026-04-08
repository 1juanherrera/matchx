/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRATO DE API — EVENTOS DE PARTIDO
 * BD: match_produccion.eventos_partido (PK: id_eventos_partido)
 * ═══════════════════════════════════════════════════════════════
 *
 * GET    /api/torneos/partidos/:id/eventos
 * POST   /api/torneos/eventos     body: { partido_id, tipo_evento, minuto, equipo_id, jugador_id?, es_autogol?, jugador_sale_id?, jugador_entra_id?, observaciones?, registrado_por? }
 * DELETE /api/torneos/eventos/:id
 *
 * tipo_evento: 'gol' | 'tarjeta_amarilla' | 'tarjeta_roja' | 'doble_amarilla' | 'cambio' | 'lesion' | 'penal_convertido' | 'penal_fallado' | 'var' | 'observacion'
 *
 * Campos que el frontend espera en TODA respuesta Evento:
 * id_eventos_partido, partido_id, tipo_evento, minuto,
 * equipo_id, jugador_id, creado_en
 *
 * NOTA: Al registrar un gol (tipo_evento='gol'), el backend debe
 * actualizar automáticamente goles_local o goles_visitante en la tabla
 * partidos, según el equipo_id del evento y si es autogol (es_autogol=1).
 * ═══════════════════════════════════════════════════════════════
 */
import { route as http } from '../utils/routes'
import { db, nextId } from '../db'
import { mockOk, mockCreated, mockNotFound } from '../utils/response'

export const eventosHandlers = [
  http.get('/api/torneos/partidos/:id/eventos', async ({ params }) => {
    const lista = db.eventos.filter(e => e.partido_id === Number(params.id))
    return mockOk(lista)
  }),

  http.post('/api/torneos/eventos', async ({ request }) => {
    const body  = await request.json() as any
    const nuevo = {
      id:               nextId('eventos'),
      id_eventos_partido: nextId('eventos') - 1, // mismo valor para ambos alias
      partido_id:       body.partido_id,
      tipo_evento:      body.tipo_evento,
      minuto:           body.minuto           ?? 0,
      minuto_adicional: body.minuto_adicional ?? null,
      equipo_id:        body.equipo_id        ?? null,
      jugador_id:       body.jugador_id       ?? null,
      jugador_sale_id:  body.jugador_sale_id  ?? null,
      jugador_entra_id: body.jugador_entra_id ?? null,
      es_autogol:       body.es_autogol       ?? 0,
      observaciones:    body.observaciones    ?? null,
      registrado_por:   body.registrado_por   ?? null,
      creado_en:        new Date().toISOString(),
    }
    db.eventos.push(nuevo)

    // Actualizar marcador en el partido si es gol
    if (body.tipo_evento === 'gol' || body.tipo_evento === 'penal_convertido') {
      const partido = (db.partidos as any[]).find(p => p.id === body.partido_id)
      if (partido) {
        const esAutogol = body.es_autogol === 1
        const esLocal   = partido.equipo_local_id === body.equipo_id

        if ((esLocal && !esAutogol) || (!esLocal && esAutogol)) {
          partido.goles_local = (partido.goles_local ?? 0) + 1
        } else {
          partido.goles_visitante = (partido.goles_visitante ?? 0) + 1
        }
      }
    }

    return mockCreated(nuevo)
  }),

  http.delete('/api/torneos/eventos/:id', async ({ params }) => {
    const idx = db.eventos.findIndex(e => e.id === Number(params.id))
    if (idx === -1) return mockNotFound('Evento')
    db.eventos.splice(idx, 1)
    return mockOk({ message: 'Evento eliminado correctamente' })
  }),
]
