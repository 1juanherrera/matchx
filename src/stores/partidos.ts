import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { partidosService } from '@/services/partidos.service'

export type EstadoPartido = 'programado' | 'en_curso' | 'finalizado' | 'suspendido' | 'aplazado'

export interface Partido {
  id: number
  torneo_id: number | null
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
  const loading  = ref(false)
  const error    = ref<string | null>(null)

  const fetchPartidos = async () => {
    loading.value = true
    error.value   = null
    try {
      // Carga los próximos partidos; para un torneo específico usar torneosService.getPartidos(id)
      partidos.value = (await partidosService.getProximos(50)) as Partido[]
    } catch (err: any) {
      error.value = err.response?.data?.message ?? 'Error cargando partidos'
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

  const crearPartido = async (partido: Omit<Partido, 'id'>) => {
    const res = await partidosService.create(partido)
    const nuevo = res.data.data ?? res.data
    partidos.value.push(nuevo)
    return nuevo
  }

  const actualizarPartido = async (id: number, datos: Partial<Partido>) => {
    await partidosService.update(id, datos)
    const idx = partidos.value.findIndex(p => p.id === id)
    if (idx !== -1) partidos.value[idx] = { ...partidos.value[idx], ...datos }
  }

  const eliminarPartido = async (id: number) => {
    await partidosService.cambiarEstado(id, 'suspendido')
    const idx = partidos.value.findIndex(p => p.id === id)
    if (idx !== -1) partidos.value.splice(idx, 1)
  }

  return {
    partidos, loading, error,
    partidosPorTorneo, proximosPartidos,
    fetchPartidos, obtenerPorId, crearPartido, actualizarPartido, eliminarPartido,
  }
})
