import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Cancha {
  id: number
  nombre: string
  tipo: 'pasto_natural' | 'pasto_sintetico' | 'cemento'
  largo_metros: number
  ancho_metros: number
  capacidad: number
  disponible: boolean
}

export interface Sede {
  id: number
  nombre: string
  ciudad: string
  departamento: string
  direccion: string
  capacidad: number
  telefono: string
  email: string
  activo: number
  creado_en: string
  canchas: Cancha[]
}

export const useSedesStore = defineStore('sedes', () => {
  const sedes = ref<Sede[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchSedes = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await import('@/data/mocks/sedes.json')
      sedes.value = data.default
    } catch (err) {
      error.value = 'Error cargando sedes'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const sedesActivas = computed(() => sedes.value.filter(s => s.activo === 1))

  const crearSede = (sede: Omit<Sede, 'id' | 'creado_en'>) => {
    const nuevoId = Math.max(...sedes.value.map(s => s.id), 0) + 1
    const nuevaSede: Sede = {
      ...sede,
      id: nuevoId,
      creado_en: new Date().toISOString(),
    }
    sedes.value.push(nuevaSede)
    return nuevaSede
  }

  const actualizarSede = (id: number, datos: Partial<Sede>) => {
    const idx = sedes.value.findIndex(s => s.id === id)
    if (idx === -1) return false
    sedes.value[idx] = { ...sedes.value[idx], ...datos }
    return true
  }

  const eliminarSede = (id: number) => {
    const idx = sedes.value.findIndex(s => s.id === id)
    if (idx === -1) return false
    sedes.value.splice(idx, 1)
    return true
  }

  const agregarCancha = (sedeId: number, cancha: Omit<Cancha, 'id'>) => {
    const sede = sedes.value.find(s => s.id === sedeId)
    if (!sede) return null
    const nuevoId = Math.max(...sede.canchas.map(c => c.id), 0) + 1
    const nuevaCancha: Cancha = { ...cancha, id: nuevoId }
    sede.canchas.push(nuevaCancha)
    return nuevaCancha
  }

  const eliminarCancha = (sedeId: number, canchaId: number) => {
    const sede = sedes.value.find(s => s.id === sedeId)
    if (!sede) return false
    const idx = sede.canchas.findIndex(c => c.id === canchaId)
    if (idx === -1) return false
    sede.canchas.splice(idx, 1)
    return true
  }

  const obtenerPorId = (id: number) => sedes.value.find(s => s.id === id)

  return {
    sedes,
    loading,
    error,
    sedesActivas,
    fetchSedes,
    crearSede,
    actualizarSede,
    eliminarSede,
    agregarCancha,
    eliminarCancha,
    obtenerPorId,
  }
})
