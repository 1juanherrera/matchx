import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ConfiguracionItem {
  id: number
  clave: string
  valor: string | number | boolean
  tipo: 'string' | 'number' | 'boolean'
  descripcion: string
  editable: boolean
}

export const useConfiguracionStore = defineStore('configuracion', () => {
  const items = ref<ConfiguracionItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchConfiguracion = async () => {
    loading.value = true
    error.value = null
    try {
      const data = await import('@/data/mocks/configuracion_sistema.json')
      items.value = data.default
    } catch (err) {
      error.value = 'Error cargando configuración'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const itemsEditables = computed(() => items.value.filter(i => i.editable))

  const obtenerValor = (clave: string) => {
    const item = items.value.find(i => i.clave === clave)
    return item?.valor ?? null
  }

  const actualizarValor = (clave: string, nuevoValor: string | number | boolean) => {
    const idx = items.value.findIndex(i => i.clave === clave)
    if (idx === -1) return false
    const item = items.value[idx]
    if (!item.editable) return false
    item.valor = nuevoValor
    return true
  }

  return {
    items,
    loading,
    error,
    itemsEditables,
    fetchConfiguracion,
    obtenerValor,
    actualizarValor,
  }
})
