import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { torneosService } from '@/services/torneos.service'

export type EstadoTorneo = 'borrador' | 'inscripciones_abiertas' | 'en_curso' | 'finalizado' | 'cancelado'

export interface Torneo {
  id: number
  nombre: string
  edicion: string
  categoria: string
  descripcion: string
  reglamento: string
  modalidad_id: number
  modalidad_codigo: string
  modalidad: string
  admin_id: number
  administrador: string
  equipos_inscritos: number
  estado: EstadoTorneo
  fecha_inicio: string
  fecha_fin: string
  fecha_limite_inscripcion: string
  inscripcion_publica: number
  marcador_publico: number
  valor_matricula: number
  valor_tarjeta_amarilla: number
  valor_tarjeta_roja: number
  multa_inasistencia: number
  valor_jugador_tardio: number
  amarillas_para_suspension: number
  partidos_suspension_roja: number
  min_jugadores: number
  max_jugadores: number
  max_equipos: number
  url_banner: string
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
