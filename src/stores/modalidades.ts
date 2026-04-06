import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { modalidadesService } from '@/services/modalidades.service'

export interface Modalidad {
  id: number
  nombre: string
  codigo: string
  descripcion: string
  jugadores_por_equipo: number
  duracion_minutos: number
  descanso_minutos: number
  cambios_permitidos: number
  activo: number
  reglas: {
    fuera_de_juego: boolean
    arquero_puede_recibir_pase: boolean
    limite_pases_atras: boolean
    tarjeta_roja_automatica: boolean
  }
  creado_en: string
}

export const useModalidadesStore = defineStore('modalidades', () => {
  const modalidades = ref<Modalidad[]>([])
  const loading     = ref(false)
  const error       = ref<string | null>(null)

  const fetchModalidades = async () => {
    loading.value = true
    error.value   = null
    try {
      modalidades.value = (await modalidadesService.getAll()) as Modalidad[]
    } catch (err: any) {
      error.value = err.response?.data?.message ?? 'Error cargando modalidades'
    } finally {
      loading.value = false
    }
  }

  const modalidadesActivas = computed(() => modalidades.value.filter(m => m.activo === 1))

  const actualizarReglas = async (id: number, reglas: Modalidad['reglas']) => {
    await modalidadesService.update(id, { reglas } as any)
    const idx = modalidades.value.findIndex(m => m.id === id)
    if (idx !== -1) modalidades.value[idx].reglas = reglas
  }

  const toggleActivo = async (id: number) => {
    await modalidadesService.toggle(id)
    const idx = modalidades.value.findIndex(m => m.id === id)
    if (idx !== -1) modalidades.value[idx].activo = modalidades.value[idx].activo === 1 ? 0 : 1
  }

  const obtenerPorId = (id: number) => modalidades.value.find(m => m.id === id)

  return {
    modalidades, loading, error,
    modalidadesActivas,
    fetchModalidades, actualizarReglas, toggleActivo, obtenerPorId,
  }
})
