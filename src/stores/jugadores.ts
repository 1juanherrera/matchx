import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type Posicion = 'portero' | 'defensa' | 'mediocampo' | 'delantero'

export interface Jugador {
  id: number
  nombre: string
  apellido: string
  numero_camiseta: number
  posicion: Posicion
  equipo_id: number
  activo: number
}

export const useJugadoresStore = defineStore('jugadores', () => {
  const jugadores = ref<Jugador[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchJugadores = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await import('@/data/mocks/jugadores.json')
      jugadores.value = data.default as Jugador[]
    } catch (err) {
      error.value = 'Error cargando jugadores'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const jugadoresPorEquipo = computed(() => (equipoId: number) =>
    jugadores.value.filter(j => j.equipo_id === equipoId && j.activo === 1),
  )

  const obtenerPorId = (id: number) => jugadores.value.find(j => j.id === id)

  const crearJugador = (jugador: Omit<Jugador, 'id'>) => {
    const nuevo: Jugador = {
      ...jugador,
      id: Math.max(...jugadores.value.map(j => j.id), 0) + 1,
    }
    jugadores.value.push(nuevo)
    return nuevo
  }

  const actualizarJugador = (id: number, datos: Partial<Jugador>) => {
    const idx = jugadores.value.findIndex(j => j.id === id)
    if (idx === -1) return false
    jugadores.value[idx] = { ...jugadores.value[idx], ...datos }
    return true
  }

  const eliminarJugador = (id: number) => {
    const idx = jugadores.value.findIndex(j => j.id === id)
    if (idx === -1) return false
    jugadores.value.splice(idx, 1)
    return true
  }

  return {
    jugadores,
    loading,
    error,
    jugadoresPorEquipo,
    fetchJugadores,
    obtenerPorId,
    crearJugador,
    actualizarJugador,
    eliminarJugador,
  }
})
