import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type EstadoPartido = 'programado' | 'en_curso' | 'finalizado' | 'suspendido'

export interface Partido {
  id: number
  torneo_id: number
  equipo_local_id: number
  equipo_visitante_id: number
  sede_id: number
  cancha_id: number
  jornada: number
  fecha_hora: string
  estado: EstadoPartido
  goles_local: number
  goles_visitante: number
  delegado_id: number
  arbitro_id: number
}

export const usePartidosStore = defineStore('partidos', () => {
  const partidos = ref<Partido[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchPartidos = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await import('@/data/mocks/partidos.json')
      partidos.value = data.default as Partido[]
    } catch (err) {
      error.value = 'Error cargando partidos'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const partidosPorTorneo = computed(() => (torneoId: number) =>
    partidos.value.filter(p => p.torneo_id === torneoId),
  )

  const proximosPartidos = computed(() =>
    partidos.value
      .filter(p => p.estado === 'programado')
      .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
      .slice(0, 5),
  )

  const obtenerPorId = (id: number) => partidos.value.find(p => p.id === id)

  const crearPartido = (partido: Omit<Partido, 'id'>) => {
    const nuevo: Partido = {
      ...partido,
      id: Math.max(...partidos.value.map(p => p.id), 0) + 1,
    }
    partidos.value.push(nuevo)
    return nuevo
  }

  const actualizarPartido = (id: number, datos: Partial<Partido>) => {
    const idx = partidos.value.findIndex(p => p.id === id)
    if (idx === -1) return false
    partidos.value[idx] = { ...partidos.value[idx], ...datos }
    return true
  }

  const eliminarPartido = (id: number) => {
    const idx = partidos.value.findIndex(p => p.id === id)
    if (idx === -1) return false
    partidos.value.splice(idx, 1)
    return true
  }

  return {
    partidos,
    loading,
    error,
    partidosPorTorneo,
    proximosPartidos,
    fetchPartidos,
    obtenerPorId,
    crearPartido,
    actualizarPartido,
    eliminarPartido,
  }
})
