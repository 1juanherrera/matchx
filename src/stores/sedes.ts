import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sedesService } from '@/services/sedes.service'

export interface Cancha {
  id: number
  nombre: string
  tipo: 'sintetica' | 'natural' | 'cemento' | 'otro'
  largo_metros: number
  ancho_metros: number
  capacidad: string
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
  const sedes   = ref<Sede[]>([])
  const loading = ref(false)
  const error   = ref<string | null>(null)

  const fetchSedes = async () => {
    loading.value = true
    error.value   = null
    try {
      const lista = await sedesService.getAll()
      sedes.value = (await Promise.all(lista.map(s => sedesService.getById(s.id)))) as Sede[]
    } catch (err: any) {
      error.value = err.response?.data?.message ?? 'Error cargando sedes'
    } finally {
      loading.value = false
    }
  }

  const sedesActivas = computed(() => sedes.value.filter(s => s.activo === 1))

  const crearSede = async (sede: Omit<Sede, 'id' | 'creado_en'>) => {
    const res = await sedesService.create({
      nombre:      sede.nombre,
      ciudad:      sede.ciudad,
      departamento: sede.departamento,
      direccion:   sede.direccion,
      capacidad:   sede.capacidad,
      telefono:    sede.telefono,
      email:       sede.email,
      estado:      sede.activo,
    })
    const body = res.data
    if (body.status === 'error') throw new Error(body.message)
    const nueva = body.data ?? body
    sedes.value.push({ ...sede, id: nueva.id ?? nueva.id_sedes, creado_en: nueva.creado_en ?? '' })
    return nueva
  }

  const actualizarSede = async (id: number, datos: Partial<Sede>) => {
    await sedesService.update(id, datos)
    const idx = sedes.value.findIndex(s => s.id === id)
    if (idx !== -1) sedes.value[idx] = { ...sedes.value[idx], ...datos }
  }

  const eliminarSede = async (id: number) => {
    await sedesService.toggle(id)
    const idx = sedes.value.findIndex(s => s.id === id)
    if (idx !== -1) sedes.value.splice(idx, 1)
  }

  // ─── Canchas ─────────────────────────────────────────────────────────────

  const agregarCancha = async (sedeId: number, cancha: Omit<Cancha, 'id'>) => {
    const res = await sedesService.crearCancha({
      sede_id:         sedeId,
      nombre:          cancha.nombre,
      tipo_superficie: cancha.tipo,
    })
    const nueva = res.data.data ?? res.data
    const sede  = sedes.value.find(s => s.id === sedeId)
    if (sede) {
      sede.canchas.push({ ...cancha, id: nueva.id ?? nueva.id_canchas })
    }
    return nueva
  }

  const actualizarCancha = async (sedeId: number, canchaId: number, datos: Partial<Cancha>) => {
    await sedesService.actualizarCancha(canchaId, datos)
    const sede = sedes.value.find(s => s.id === sedeId)
    if (!sede) return
    const idx = sede.canchas.findIndex(c => c.id === canchaId)
    if (idx !== -1) sede.canchas[idx] = { ...sede.canchas[idx], ...datos }
  }

  const eliminarCancha = async (sedeId: number, canchaId: number) => {
    await sedesService.eliminarCancha(canchaId)
    const sede = sedes.value.find(s => s.id === sedeId)
    if (!sede) return
    const idx = sede.canchas.findIndex(c => c.id === canchaId)
    if (idx !== -1) sede.canchas.splice(idx, 1)
  }

  const obtenerPorId = (id: number) => sedes.value.find(s => s.id === id)

  return {
    sedes, loading, error,
    sedesActivas,
    fetchSedes, crearSede, actualizarSede, eliminarSede,
    agregarCancha, actualizarCancha, eliminarCancha, obtenerPorId,
  }
})
