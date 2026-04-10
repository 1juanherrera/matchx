import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  pagosService,
  type Pago,
  type ConfirmarPagoInput,
  type EstadoPago,
} from '@/services/pagos.service'

export type { Pago, EstadoPago }

export const usePagosStore = defineStore('pagos', () => {
  // Cache por torneoId
  const porTorneo = ref<Record<number, Pago[]>>({})
  const loading   = ref<Record<number, boolean>>({})

  const fetchPagos = async (
    torneoId: number,
    equipos: { equipo_id: number; jugador_ids: number[] }[],
    valorAmarilla: number,
    valorRoja: number,
  ) => {
    if (porTorneo.value[torneoId]?.length) return
    loading.value[torneoId] = true
    try {
      porTorneo.value[torneoId] = await pagosService.getByTorneo(
        torneoId, equipos, valorAmarilla, valorRoja,
      )
    } finally {
      loading.value[torneoId] = false
    }
  }

  const getPagos = (torneoId: number): Pago[] =>
    porTorneo.value[torneoId] ?? []

  const getPendientes = (torneoId: number): Pago[] =>
    getPagos(torneoId).filter(p => p.estado === 'pendiente')

  const getHistorial = (torneoId: number): Pago[] =>
    getPagos(torneoId).filter(p => p.estado !== 'pendiente')

  /** Actualiza el estado localmente (optimista) y llama al API */
  const _actualizarLocal = (torneoId: number, pagoId: number, cambios: Partial<Pago>) => {
    const lista = porTorneo.value[torneoId] ?? []
    const idx = lista.findIndex(p => p.id === pagoId)
    if (idx !== -1) {
      lista[idx] = { ...lista[idx], ...cambios, pagado_en: new Date().toISOString() }
      porTorneo.value[torneoId] = [...lista]
    }
  }

  const confirmarPago = async (
    torneoId: number,
    pagoId: number,
    input: ConfirmarPagoInput,
    adminId: number,
  ) => {
    _actualizarLocal(torneoId, pagoId, {
      estado: 'pagado',
      recibido_por: adminId,
      metodo_pago: input.metodo_pago,
      numero_recibo: input.numero_recibo,
    })
    try {
      await pagosService.confirmar(torneoId, pagoId, input)
    } catch { /* estado local persiste */ }
  }

  const condonarPago = async (torneoId: number, pagoId: number) => {
    _actualizarLocal(torneoId, pagoId, { estado: 'condonado' })
    try {
      await pagosService.condonar(torneoId, pagoId)
    } catch { /* estado local persiste */ }
  }

  return {
    porTorneo, loading,
    fetchPagos, getPagos, getPendientes, getHistorial,
    confirmarPago, condonarPago,
  }
})
