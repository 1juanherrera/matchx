import { computed } from 'vue'
import { useUsuariosStore } from '@/stores/usuarios'
import { usePartidosStore } from '@/stores/partidos'

/**
 * Dado un partido objetivo (fecha + id), devuelve la lista de árbitros activos
 * enriquecida con su disponibilidad: libre si no tiene otro partido programado
 * dentro de una ventana de ±4 horas.
 */
export function useArbitrosDisponibilidad(
  getFechaHora: () => string | null | undefined,
  getExcludePartidoId: () => number | null | undefined = () => null,
  getExcludeArbitroId: () => number | null | undefined = () => null,
) {
  const usuariosStore = useUsuariosStore()
  const partidosStore = usePartidosStore()

  const arbitrosConDisponibilidad = computed(() => {
    const fechaHora       = getFechaHora()
    const excludePartidoId = getExcludePartidoId()
    const excludeArbitroId = getExcludeArbitroId()

    return usuariosStore.usuarios
      .filter(u => u.rol === 'arbitro' && u.activo === 1 && u.id !== excludeArbitroId)
      .map(u => {
        let ocupado = false
        if (fechaHora) {
          const t = new Date(fechaHora).getTime()
          ocupado = partidosStore.partidos.some(p =>
            p.arbitro_id === u.id &&
            p.id !== excludePartidoId &&
            p.estado === 'programado' &&
            Math.abs(new Date(p.fecha_hora).getTime() - t) < 4 * 60 * 60 * 1000,
          )
        }
        return { ...u, ocupado }
      })
      .sort((a, b) => Number(a.ocupado) - Number(b.ocupado)) // libres primero
  })

  return { arbitrosConDisponibilidad }
}
