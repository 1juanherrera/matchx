import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Adjunta el JWT en cada request
api.interceptors.request.use((config) => {
  const session = localStorage.getItem('matchx_session')
  if (session) {
    try {
      const { token } = JSON.parse(session)
      if (token) config.headers.Authorization = `Bearer ${token}`
    } catch {
      // session malformada — la ignoramos
    }
  }
  return config
})

// Redirige a /login si el backend devuelve 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('matchx_session')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
