import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchModalidades = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await import('@/data/mocks/modalidades.json')
      modalidades.value = data.default
    } catch (err) {
      error.value = 'Error cargando modalidades'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const modalidadesActivas = computed(() => modalidades.value.filter(m => m.activo === 1))

  const actualizarReglas = (id: number, reglas: Modalidad['reglas']) => {
    const idx = modalidades.value.findIndex(m => m.id === id)
    if (idx === -1) return false
    modalidades.value[idx].reglas = reglas
    return true
  }

  const toggleActivo = (id: number) => {
    const idx = modalidades.value.findIndex(m => m.id === id)
    if (idx === -1) return false
    modalidades.value[idx].activo = modalidades.value[idx].activo === 1 ? 0 : 1
    return true
  }

  const obtenerPorId = (id: number) => modalidades.value.find(m => m.id === id)

  return {
    modalidades,
    loading,
    error,
    modalidadesActivas,
    fetchModalidades,
    actualizarReglas,
    toggleActivo,
    obtenerPorId,
  }
})
