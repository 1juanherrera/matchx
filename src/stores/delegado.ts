import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Partido } from './partidos'

export type TipoEvento =
  | 'gol_local'
  | 'gol_visitante'
  | 'amarilla_local'
  | 'amarilla_visitante'
  | 'roja_local'
  | 'roja_visitante'
  | 'lesion'
  | 'inicio'
  | 'fin_primera'
  | 'fin_partido'

export interface EventoPartido {
  id: string
  partido_id: number
  tipo: TipoEvento
  minuto: number
  timestamp: number
  sincronizado: boolean
  jugador_id?: number
  jugador_nombre?: string   // "Apellido #número"
  equipo_id?: number
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

const DB_NAME = 'matchx_delegado'
const DB_VERSION = 1
const STORE_EVENTOS = 'eventos_offline'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_EVENTOS)) {
        db.createObjectStore(STORE_EVENTOS, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function dbAdd(db: IDBDatabase, evento: EventoPartido): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EVENTOS, 'readwrite')
    tx.objectStore(STORE_EVENTOS).add(evento)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function dbGetAll(db: IDBDatabase): Promise<EventoPartido[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EVENTOS, 'readonly')
    const req = tx.objectStore(STORE_EVENTOS).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function dbDelete(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EVENTOS, 'readwrite')
    tx.objectStore(STORE_EVENTOS).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDelegadoStore = defineStore('delegado', () => {
  const partidoActivo = ref<Partido | null>(null)
  const eventos = ref<EventoPartido[]>([])
  const colaOffline = ref<EventoPartido[]>([])
  const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

  // Cronómetro
  const segundos = ref(0)
  const corriendo = ref(false)
  let intervalId: ReturnType<typeof setInterval> | null = null

  // Marcador reactivo en vivo
  const golesLocal = ref(0)
  const golesVisitante = ref(0)

  let db: IDBDatabase | null = null

  const initDB = async () => {
    try {
      db = await openDB()
      const pendientes = (await dbGetAll(db)).filter(e => !e.sincronizado)
      colaOffline.value = pendientes
    } catch {
      // IndexedDB no disponible
    }
  }

  const setPartidoActivo = (partido: Partido) => {
    partidoActivo.value = partido
    golesLocal.value = partido.goles_local
    golesVisitante.value = partido.goles_visitante
    resetCronometro()
    eventos.value = []
  }

  // ── Cronómetro ──────────────────────────────────────────────────────────────

  const iniciarCronometro = () => {
    if (corriendo.value) return
    corriendo.value = true
    intervalId = setInterval(() => { segundos.value++ }, 1000)
  }

  const pausarCronometro = () => {
    corriendo.value = false
    if (intervalId) { clearInterval(intervalId); intervalId = null }
  }

  const resetCronometro = () => {
    pausarCronometro()
    segundos.value = 0
  }

  const minutoActual = computed(() => Math.floor(segundos.value / 60))

  const formatCronometro = computed(() => {
    const m = String(Math.floor(segundos.value / 60)).padStart(2, '0')
    const s = String(segundos.value % 60).padStart(2, '0')
    return `${m}:${s}`
  })

  // ── Eventos ─────────────────────────────────────────────────────────────────

  const registrarEvento = async (
    tipo: TipoEvento,
    jugadorId?: number,
    jugadorNombre?: string,
    equipoId?: number,
  ) => {
    const evento: EventoPartido = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      partido_id: partidoActivo.value?.id ?? 0,
      tipo,
      minuto: minutoActual.value,
      timestamp: Date.now(),
      sincronizado: online.value,
      jugador_id: jugadorId,
      jugador_nombre: jugadorNombre,
      equipo_id: equipoId,
    }

    if (tipo === 'gol_local') golesLocal.value++
    if (tipo === 'gol_visitante') golesVisitante.value++

    eventos.value.unshift(evento)

    if (!online.value) {
      colaOffline.value.unshift(evento)
      if (db) await dbAdd(db, evento).catch(() => {})
    }
  }

  // ── Offline sync ─────────────────────────────────────────────────────────────

  const sincronizarCola = async () => {
    if (!online.value || !db || colaOffline.value.length === 0) return
    const pendientes = [...colaOffline.value]
    for (const ev of pendientes) {
      // En producción: POST al backend aquí
      await dbDelete(db, ev.id).catch(() => {})
      colaOffline.value = colaOffline.value.filter(e => e.id !== ev.id)
    }
  }

  const setOnline = (val: boolean) => {
    online.value = val
    if (val) sincronizarCola()
  }

  return {
    partidoActivo,
    eventos,
    colaOffline,
    online,
    segundos,
    corriendo,
    golesLocal,
    golesVisitante,
    minutoActual,
    formatCronometro,
    initDB,
    setPartidoActivo,
    iniciarCronometro,
    pausarCronometro,
    resetCronometro,
    registrarEvento,
    sincronizarCola,
    setOnline,
  }
})
