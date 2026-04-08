import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { equiposService } from '@/services/equipos.service'

export interface Equipo {
  id: number
  nombre: string
  nombre_corto: string
  torneo_id: number
  color_principal: string
  color_secundario: string
  color_terciario: string
  color_cuaternario: string
  escudo_url: string
  capitan_nombre: string
  capitan_id: number | null
  activo: number
  creado_en: string
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
    const raw = res.data.data ?? res.data
    // El backend no devuelve torneo_id — lo tomamos del payload enviado
    const nuevo: Equipo = {
      id:               raw.id_equipos  ?? raw.id ?? 0,
      nombre:           raw.nombre      ?? equipo.nombre,
      nombre_corto:     raw.nombre_corto ?? equipo.nombre_corto,
      torneo_id:        equipo.torneo_id,
      color_principal:   raw.color_principal   ?? equipo.color_principal,
      color_secundario:  raw.color_secundario  ?? equipo.color_secundario,
      color_terciario:   raw.color_terciario   ?? equipo.color_terciario,
      color_cuaternario: raw.color_cuaternario ?? equipo.color_cuaternario,
      escudo_url:       raw.url_escudo  ?? raw.escudo_url ?? equipo.escudo_url,
      capitan_nombre:   raw.capitan_nombre ?? '',
      capitan_id:       raw.capitan_id ?? null,
      activo:           raw.activo ?? 1,
      creado_en:        raw.creado_en ?? '',
    }
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
