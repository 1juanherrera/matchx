import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { torneosService } from '@/services/torneos.service'

export type EstadoTorneo = 'programado' | 'inscripciones_abiertas' | 'en_curso' | 'finalizado' | 'cancelado'

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
  const error   = ref<string | null>(null)

  const fetchTorneos = async () => {
    loading.value = true
    error.value   = null
    try {
      torneos.value = (await torneosService.getAll()) as Torneo[]
    } catch (err: any) {
      error.value = err.response?.data?.message ?? 'Error cargando torneos'
    } finally {
      loading.value = false
    }
  }

  const torneosActivos = computed(() =>
    torneos.value.filter(t => t.estado === 'en_curso'),
  )

  const obtenerPorId = (id: number) => torneos.value.find(t => t.id === id)

  const crearTorneo = async (torneo: Omit<Torneo, 'id' | 'creado_en'>) => {
    const res = await torneosService.create(torneo)
    const nuevo = res.data.data ?? res.data
    torneos.value.push(nuevo)
    return nuevo
  }

  const actualizarTorneo = async (id: number, datos: Partial<Torneo>) => {
    await torneosService.update(id, datos)
    const idx = torneos.value.findIndex(t => t.id === id)
    if (idx !== -1) torneos.value[idx] = { ...torneos.value[idx], ...datos }
  }

  const eliminarTorneo = async (id: number) => {
    // El backend no tiene DELETE torneo en la colección; usamos cambiarEstado a cancelado
    await torneosService.cambiarEstado(id, 'cancelado')
    const idx = torneos.value.findIndex(t => t.id === id)
    if (idx !== -1) torneos.value.splice(idx, 1)
  }

  return {
    torneos, loading, error,
    torneosActivos,
    fetchTorneos, obtenerPorId, crearTorneo, actualizarTorneo, eliminarTorneo,
  }
})
