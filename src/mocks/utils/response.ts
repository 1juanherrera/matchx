import { HttpResponse } from 'msw'

const DELAY_MS = import.meta.env.VITE_MOCK_DELAY ? Number(import.meta.env.VITE_MOCK_DELAY) : 300

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function mockOk<T>(payload: T, status = 200) {
  await sleep(DELAY_MS)
  return HttpResponse.json({ data: payload, status: 'ok' }, { status })
}

export async function mockCreated<T>(payload: T) {
  return mockOk(payload, 201)
}

export async function mockError(message: string, status = 422) {
  await sleep(DELAY_MS)
  return HttpResponse.json({ message, errors: { _general: [message] } }, { status })
}

export async function mockNotFound(entity = 'Recurso') {
  return mockError(`${entity} no encontrado`, 404)
}

export async function mockToggle(item: any) {
  item.activo = item.activo === 1 ? 0 : 1
  return mockOk(item)
}
