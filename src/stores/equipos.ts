import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { equiposService } from '@/services/equipos.service'

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
  const error   = ref<string | null>(null)

  const fetchEquipos = async () => {
    loading.value = true
    error.value   = null
    try {
      equipos.value = (await equiposService.getAll()) as Equipo[]
    } catch (err: any) {
      error.value = err.response?.data?.message ?? 'Error cargando equipos'
    } finally {
      loading.value = false
    }
  }

  const equiposPorTorneo = computed(() => (torneoId: number) =>
    equipos.value.filter(e => e.torneo_id === torneoId && e.activo === 1),
  )

  const obtenerPorId = (id: number) => equipos.value.find(e => e.id === id)

  const crearEquipo = async (equipo: Omit<Equipo, 'id' | 'creado_en'>) => {
    const res = await equiposService.create(equipo)
    const nuevo = res.data.data ?? res.data
    equipos.value.push(nuevo)
    return nuevo
  }

  const actualizarEquipo = async (id: number, datos: Partial<Equipo>) => {
    await equiposService.update(id, datos)
    const idx = equipos.value.findIndex(e => e.id === id)
    if (idx !== -1) equipos.value[idx] = { ...equipos.value[idx], ...datos }
  }

  const eliminarEquipo = async (id: number) => {
    await equiposService.toggle(id)
    const idx = equipos.value.findIndex(e => e.id === id)
    if (idx !== -1) equipos.value.splice(idx, 1)
  }

  return {
    equipos, loading, error,
    equiposPorTorneo,
    fetchEquipos, obtenerPorId, crearEquipo, actualizarEquipo, eliminarEquipo,
  }
})
