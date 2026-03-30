import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type EstadoTorneo = 'programado' | 'en_curso' | 'finalizado' | 'cancelado'

export interface Torneo {
  id: number
  nombre: string
  descripcion: string
  modalidad_id: number
  modalidad_codigo: string
  sede_id: number
  estado: EstadoTorneo
  fecha_inicio: string
  fecha_fin: string
  max_equipos: number
  premio: string
  imagen_url: string
  creado_en: string
}

export const useTorneosStore = defineStore('torneos', () => {
  const torneos = ref<Torneo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchTorneos = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await import('@/data/mocks/torneos.json')
      torneos.value = data.default
    } catch (err) {
      error.value = 'Error cargando torneos'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const torneosActivos = computed(() =>
    torneos.value.filter(t => t.estado === 'en_curso'),
  )

  const obtenerPorId = (id: number) => torneos.value.find(t => t.id === id)

  const crearTorneo = (torneo: Omit<Torneo, 'id' | 'creado_en'>) => {
    const nuevo: Torneo = {
      ...torneo,
      id: Math.max(...torneos.value.map(t => t.id), 0) + 1,
      creado_en: new Date().toISOString(),
    }
    torneos.value.push(nuevo)
    return nuevo
  }

  const actualizarTorneo = (id: number, datos: Partial<Torneo>) => {
    const idx = torneos.value.findIndex(t => t.id === id)
    if (idx === -1) return false
    torneos.value[idx] = { ...torneos.value[idx], ...datos }
    return true
  }

  const eliminarTorneo = (id: number) => {
    const idx = torneos.value.findIndex(t => t.id === id)
    if (idx === -1) return false
    torneos.value.splice(idx, 1)
    return true
  }

  return {
    torneos,
    loading,
    error,
    torneosActivos,
    fetchTorneos,
    obtenerPorId,
    crearTorneo,
    actualizarTorneo,
    eliminarTorneo,
  }
})
