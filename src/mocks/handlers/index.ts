// ─── Control granular de mocks ────────────────────────────────────────────────
// Comentar una línea → ese dominio pasa al backend real (passthrough automático).
// El worker usa onUnhandledRequest: 'bypass', así que nada explota si el backend
// aún no tiene el endpoint implementado.
// ─────────────────────────────────────────────────────────────────────────────
import { authHandlers }          from './auth.handlers'
import { torneosHandlers }       from './torneos.handlers'
import { equiposHandlers }       from './equipos.handlers'
import { jugadoresHandlers }     from './jugadores.handlers'
import { partidosHandlers }      from './partidos.handlers'
import { sedesHandlers }         from './sedes.handlers'
import { modalidadesHandlers }   from './modalidades.handlers'
import { usuariosHandlers }      from './usuarios.handlers'
import { eventosHandlers }       from './eventos.handlers'
import { inscripcionesHandlers } from './inscripciones.handlers'
import { solicitudesHandlers }   from './solicitudes.handlers'
import { comunicadosHandlers }   from './comunicados.handlers'
import { sancionesHandlers }     from './sanciones.handlers'
import { pagosHandlers }         from './pagos.handlers'
import { multasEquipoHandlers }  from './multas-equipo.handlers'
import { asistenciasHandlers }   from './asistencias.handlers'

export const handlers = [
  ...authHandlers,
  ...torneosHandlers,
  ...equiposHandlers,
  ...jugadoresHandlers,
  ...partidosHandlers,
  ...sedesHandlers,
  ...modalidadesHandlers,
  ...usuariosHandlers,
  ...eventosHandlers,
  ...inscripcionesHandlers,
  ...solicitudesHandlers,
  ...comunicadosHandlers,
  ...sancionesHandlers,
  ...pagosHandlers,
  ...multasEquipoHandlers,
  ...asistenciasHandlers,
]
