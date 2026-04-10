import api from './api'

export type EstadoAsistencia = 'confirmado' | 'ausente' | 'no_habilitado' | 'pendiente'

export interface Asistencia {
  jugador_id: number
  partido_id: number
  estado: EstadoAsistencia
}

function normalize(raw: any, partidoId: number): Asistencia {
  return {
    jugador_id: raw.jugador_id ?? raw.id_jugadores ?? 0,
    partido_id: raw.partido_id ?? raw.id_partidos ?? partidoId,
    estado:     raw.estado ?? 'pendiente',
  }
}

/**
 * Mock determinístico: misma combinación partido+jugador → mismo estado siempre.
 * Se usa como fallback mientras el backend no tenga el endpoint.
 * Distribución aproximada: 60% confirmado · 30% ausente · 10% pendiente
 */
function estadoMock(partidoId: number, jugadorId: number): EstadoAsistencia {
  const hash = (partidoId * 17 + jugadorId * 31) % 10
  if (hash <= 5) return 'confirmado'   // 0-5 → 60% confirmado
  if (hash <= 7) return 'ausente'      // 6-7 → 20% ausente (no se presentó)
  if (hash === 8) return 'no_habilitado' // 8  → 10% sancionado
  return 'pendiente'                    // 9  → 10% pendiente
}

export const asistenciasService = {
  getByPartido: async (partidoId: number, jugadorIds: number[]): Promise<Asistencia[]> => {
    try {
      const { data } = await api.get(`/api/torneos/partidos/${partidoId}/asistencia`)
      const lista = (data.data ?? data) as any[]
      if (lista.length > 0) return lista.map(r => normalize(r, partidoId))
      // Backend devolvió vacío → usar mock mientras no haya datos reales
      throw new Error('empty')
    } catch {
      return jugadorIds.map(id => ({
        jugador_id: id,
        partido_id: partidoId,
        estado: estadoMock(partidoId, id),
      }))
    }
  },

  registrar: (partidoId: number, jugadorId: number, estado: EstadoAsistencia) =>
    api.put(`/api/torneos/partidos/${partidoId}/asistencia`, { jugador_id: jugadorId, estado }),
}
