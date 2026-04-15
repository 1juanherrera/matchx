import _torneos       from '@/data/mocks/torneos.json'
import _equipos       from '@/data/mocks/equipos.json'
import _jugadores     from '@/data/mocks/jugadores.json'
import _partidos      from '@/data/mocks/partidos.json'
import _sedes         from '@/data/mocks/sedes.json'
import _modalidades   from '@/data/mocks/modalidades.json'
import _usuarios      from '@/data/mocks/usuarios.json'
import _inscripciones from '@/data/mocks/inscripciones.json'
import _solicitudes   from '@/data/mocks/solicitudes.json'
import _eventos       from '@/data/mocks/eventos.json'

function seed<T>(data: T[]): T[] {
  return JSON.parse(JSON.stringify(data))
}

function maxId(arr: any[]): number {
  return arr.length ? Math.max(...arr.map(x => x.id_equipos ?? x.id_inscripciones ?? x.id ?? 0)) : 0
}

const counters: Record<string, number> = {
  torneos:       maxId(_torneos as any[]),
  equipos:       maxId(_equipos as any[]),
  jugadores:     maxId(_jugadores as any[]),
  partidos:      maxId(_partidos as any[]),
  sedes:         maxId(_sedes as any[]),
  canchas:       302,
  modalidades:   maxId(_modalidades as any[]),
  usuarios:      maxId(_usuarios as any[]),
  inscripciones: maxId(_inscripciones as any[]),
  solicitudes:   maxId(_solicitudes as any[]),
  eventos:       maxId(_eventos as any[]),
  convocatorias: 0,
}

export function nextId(entity: string): number {
  counters[entity] = (counters[entity] ?? 0) + 1
  return counters[entity]
}

export const db = {
  torneos:       seed(_torneos as any[]),
  equipos:       seed(_equipos as any[]),
  jugadores:     seed(_jugadores as any[]),
  partidos:      seed(_partidos as any[]),
  sedes:         seed(_sedes as any[]),
  modalidades:   seed(_modalidades as any[]),
  usuarios:      seed(_usuarios as any[]),
  inscripciones: seed(_inscripciones as any[]),
  solicitudes:   seed(_solicitudes as any[]),
  eventos:       seed(_eventos as any[]),
  convocatorias: [] as any[],
}
