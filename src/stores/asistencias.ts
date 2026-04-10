import { defineStore } from 'pinia'
import { ref } from 'vue'
import { asistenciasService, type Asistencia, type EstadoAsistencia } from '@/services/asistencias.service'

export type { EstadoAsistencia }

export const useAsistenciasStore = defineStore('asistencias', () => {
  const porPartido = ref<Record<number, Asistencia[]>>({})
  const loading    = ref<Record<number, boolean>>({})

  /**
   * Carga asistencias de un partido.
   * jugadorIds se necesita para el mock determinístico cuando el backend no responde.
   */
  const fetchAsistencias = async (partidoId: number, jugadorIds: number[]) => {
    if (porPartido.value[partidoId]?.length) return   // ya cargado en esta sesión
    loading.value[partidoId] = true
    try {
      porPartido.value[partidoId] = await asistenciasService.getByPartido(partidoId, jugadorIds)
    } finally {
      loading.value[partidoId] = false
    }
  }

  const actualizarEstado = async (partidoId: number, jugadorId: number, estado: EstadoAsistencia) => {
    const lista = porPartido.value[partidoId] ?? []
    const idx   = lista.findIndex(a => a.jugador_id === jugadorId)
    if (idx !== -1) lista[idx] = { ...lista[idx], estado }
    else lista.push({ jugador_id: jugadorId, partido_id: partidoId, estado })
    porPartido.value[partidoId] = [...lista]
    try {
      await asistenciasService.registrar(partidoId, jugadorId, estado)
    } catch { /* fallo silencioso — estado local persiste */ }
  }

  const getAsistencias = (partidoId: number): Asistencia[] =>
    porPartido.value[partidoId] ?? []

  const getEstado = (partidoId: number, jugadorId: number): EstadoAsistencia =>
    porPartido.value[partidoId]?.find(a => a.jugador_id === jugadorId)?.estado ?? 'pendiente'

  return {
    porPartido, loading,
    fetchAsistencias, actualizarEstado, getAsistencias, getEstado,
  }
})
