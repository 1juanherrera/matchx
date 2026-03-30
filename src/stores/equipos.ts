import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Equipo {
  id: number
  nombre: string
  torneo_id: number
  ciudad: string
  colores: string
  escudo_url: string
  activo: number
  creado_en: string
  capitan_id?: number
}

export const useEquiposStore = defineStore('equipos', () => {
  const equipos = ref<Equipo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchEquipos = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await import('@/data/mocks/equipos.json')
      equipos.value = data.default
    } catch (err) {
      error.value = 'Error cargando equipos'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const equiposPorTorneo = computed(() => (torneoId: number) =>
    equipos.value.filter(e => e.torneo_id === torneoId && e.activo === 1),
  )

  const obtenerPorId = (id: number) => equipos.value.find(e => e.id === id)

  const crearEquipo = (equipo: Omit<Equipo, 'id' | 'creado_en'>) => {
    const nuevo: Equipo = {
      ...equipo,
      id: Math.max(...equipos.value.map(e => e.id), 0) + 1,
      creado_en: new Date().toISOString(),
    }
    equipos.value.push(nuevo)
    return nuevo
  }

  const actualizarEquipo = (id: number, datos: Partial<Equipo>) => {
    const idx = equipos.value.findIndex(e => e.id === id)
    if (idx === -1) return false
    equipos.value[idx] = { ...equipos.value[idx], ...datos }
    return true
  }

  const eliminarEquipo = (id: number) => {
    const idx = equipos.value.findIndex(e => e.id === id)
    if (idx === -1) return false
    equipos.value.splice(idx, 1)
    return true
  }

  return {
    equipos,
    loading,
    error,
    equiposPorTorneo,
    fetchEquipos,
    obtenerPorId,
    crearEquipo,
    actualizarEquipo,
    eliminarEquipo,
  }
})
