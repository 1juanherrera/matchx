import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sancionesService, type Sancion, type TipoSancion, type EstadoSancion } from '@/services/sanciones.service'

export type { Sancion, TipoSancion, EstadoSancion }

export const useSancionesStore = defineStore('sanciones', () => {
  // Cache por clave "torneoId_equipoId"
  const porEquipo = ref<Record<string, Sancion[]>>({})
  const loading   = ref<Record<string, boolean>>({})

  const clave = (torneoId: number, equipoId: number) => `${torneoId}_${equipoId}`

  const fetchSanciones = async (torneoId: number, equipoId: number, jugadorIds: number[]) => {
    const key = clave(torneoId, equipoId)
    if (porEquipo.value[key]?.length) return
    loading.value[key] = true
    try {
      porEquipo.value[key] = await sancionesService.getByEquipo(torneoId, equipoId, jugadorIds)
    } finally {
      loading.value[key] = false
    }
  }

  /** Todas las sanciones activas/apeladas del equipo */
  const getSanciones = (torneoId: number, equipoId: number): Sancion[] =>
    porEquipo.value[clave(torneoId, equipoId)] ?? []

  /** Sanciones de un jugador específico */
  const getSancionesJugador = (torneoId: number, equipoId: number, jugadorId: number): Sancion[] =>
    getSanciones(torneoId, equipoId).filter(s => s.jugador_id === jugadorId)

  /** True si el jugador tiene al menos una suspensión activa/apelada */
  const estaSuspendido = (torneoId: number, equipoId: number, jugadorId: number): boolean =>
    getSancionesJugador(torneoId, equipoId, jugadorId)
      .some(s => s.tipo_sancion === 'suspension' && (s.estado === 'activa' || s.estado === 'apelada'))

  /** Multas pendientes (sin pagar) de un jugador */
  const multasPendientes = (torneoId: number, equipoId: number, jugadorId: number): Sancion[] =>
    getSancionesJugador(torneoId, equipoId, jugadorId)
      .filter(s => s.tipo_sancion === 'multa' && s.estado === 'activa')

  return {
    porEquipo, loading,
    fetchSanciones, getSanciones, getSancionesJugador, estaSuspendido, multasPendientes,
  }
})
