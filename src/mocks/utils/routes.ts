/**
 * Wrapper de MSW que usa la URL base del backend real.
 * Así MSW intercepta requests aunque axios apunte a http://35.x.x.x:8082
 * y el login (que no tiene handler) pasa directo al backend sin problema.
 */
import { http } from 'msw'

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

type GetHandler    = Parameters<typeof http.get>[1]
type PostHandler   = Parameters<typeof http.post>[1]
type PutHandler    = Parameters<typeof http.put>[1]
type DeleteHandler = Parameters<typeof http.delete>[1]

export const route = {
  get:    (path: string, handler: GetHandler)    => http.get(`${BASE}${path}`,    handler),
  post:   (path: string, handler: PostHandler)   => http.post(`${BASE}${path}`,   handler),
  put:    (path: string, handler: PutHandler)    => http.put(`${BASE}${path}`,    handler),
  delete: (path: string, handler: DeleteHandler) => http.delete(`${BASE}${path}`, handler),
}
