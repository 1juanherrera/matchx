import { defineStore } from 'pinia'
import { ref } from 'vue'
import { comunicadosService, type Comunicado, type ComunicadoPayload } from '@/services/comunicados.service'

export type { Comunicado, ComunicadoPayload }

export const useComunicadosStore = defineStore('comunicados', () => {
  const comunicados = ref<Comunicado[]>([])
  const loading     = ref(false)

  const sortFn = (a: Comunicado, b: Comunicado) => {
    if (a.tipo === 'urgente' && b.tipo !== 'urgente') return -1
    if (a.tipo !== 'urgente' && b.tipo === 'urgente') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }

  const fetchComunicados = async (torneoId?: number) => {
    loading.value = true
    try {
      const data = await comunicadosService.getAll(
        torneoId ? { torneo_id: torneoId } : undefined
      )
      comunicados.value = data.sort(sortFn)
    } finally {
      loading.value = false
    }
  }

  const crearComunicado = async (payload: ComunicadoPayload): Promise<Comunicado> => {
    const nuevo = await comunicadosService.create(payload)
    // Insertar al inicio y mantener urgentes primero
    comunicados.value = [nuevo, ...comunicados.value].sort(sortFn)
    return nuevo
  }

  const actualizarComunicado = async (id: number, payload: Partial<ComunicadoPayload>): Promise<void> => {
    const actualizado = await comunicadosService.update(id, payload)
    const idx = comunicados.value.findIndex(c => c.id === id)
    if (idx !== -1) comunicados.value[idx] = actualizado
  }

  const eliminarComunicado = async (id: number): Promise<void> => {
    await comunicadosService.delete(id)
    comunicados.value = comunicados.value.filter(c => c.id !== id)
  }

  return {
    comunicados,
    loading,
    fetchComunicados,
    crearComunicado,
    actualizarComunicado,
    eliminarComunicado,
  }
})
