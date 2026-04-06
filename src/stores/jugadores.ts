import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { jugadoresService } from '@/services/jugadores.service'

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
  const loading   = ref(false)
  const error     = ref<string | null>(null)

  const fetchJugadores = async () => {
    loading.value = true
    error.value   = null
    try {
      jugadores.value = (await jugadoresService.getAll()) as Jugador[]
    } catch (err: any) {
      error.value = err.response?.data?.message ?? 'Error cargando jugadores'
    } finally {
      loading.value = false
    }
  }

  const jugadoresPorEquipo = computed(() => (equipoId: number) =>
    jugadores.value.filter(j => j.equipo_id === equipoId && j.activo === 1),
  )

  const obtenerPorId = (id: number) => jugadores.value.find(j => j.id === id)

  const crearJugador = async (jugador: Omit<Jugador, 'id'>) => {
    const res = await jugadoresService.create(jugador)
    const nuevo = res.data.data ?? res.data
    jugadores.value.push(nuevo)
    return nuevo
  }

  const actualizarJugador = async (id: number, datos: Partial<Jugador>) => {
    await jugadoresService.update(id, datos)
    const idx = jugadores.value.findIndex(j => j.id === id)
    if (idx !== -1) jugadores.value[idx] = { ...jugadores.value[idx], ...datos }
  }

  const eliminarJugador = async (id: number) => {
    await jugadoresService.toggle(id)
    const idx = jugadores.value.findIndex(j => j.id === id)
    if (idx !== -1) jugadores.value.splice(idx, 1)
  }

  return {
    jugadores, loading, error,
    jugadoresPorEquipo,
    fetchJugadores, obtenerPorId, crearJugador, actualizarJugador, eliminarJugador,
  }
})
