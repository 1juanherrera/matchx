import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  multasEquipoService,
  type MultaEquipo,
  type MultaEquipoInput,
  type EstadoMultaEquipo,
} from '@/services/multas-equipo.service'

export type { MultaEquipo, EstadoMultaEquipo }

export const useMultasEquipoStore = defineStore('multasEquipo', () => {
  const porEquipo = ref<Record<number, MultaEquipo[]>>({})
  const loading   = ref<Record<number, boolean>>({})

  const fetchMultas = async (equipoId: number, jugadorIds: number[]) => {
    if (porEquipo.value[equipoId]?.length) return
    loading.value[equipoId] = true
    try {
      porEquipo.value[equipoId] = await multasEquipoService.getByEquipo(equipoId, jugadorIds)
    } finally {
      loading.value[equipoId] = false
    }
  }

  const crearMulta = async (equipoId: number, input: MultaEquipoInput): Promise<void> => {
    const nueva = await multasEquipoService.crear(equipoId, input)
    porEquipo.value[equipoId] = [...(porEquipo.value[equipoId] ?? []), nueva]
  }

  const actualizarEstado = async (
    equipoId: number,
    multaId: number,
    estado: EstadoMultaEquipo,
  ): Promise<void> => {
    // Actualización optimista
    const lista = porEquipo.value[equipoId] ?? []
    const idx = lista.findIndex(m => m.id === multaId)
    if (idx !== -1) lista[idx] = { ...lista[idx], estado }
    porEquipo.value[equipoId] = [...lista]
    try {
      await multasEquipoService.actualizarEstado(equipoId, multaId, estado)
    } catch { /* estado local persiste */ }
  }

  const getMultas = (equipoId: number): MultaEquipo[] =>
    porEquipo.value[equipoId] ?? []

  const getMultasJugador = (equipoId: number, jugadorId: number): MultaEquipo[] =>
    getMultas(equipoId).filter(m => m.jugador_id === jugadorId)

  const getMultasPendientes = (equipoId: number): MultaEquipo[] =>
    getMultas(equipoId).filter(m => m.estado === 'pendiente')

  return {
    porEquipo, loading,
    fetchMultas, crearMulta, actualizarEstado,
    getMultas, getMultasJugador, getMultasPendientes,
  }
})
