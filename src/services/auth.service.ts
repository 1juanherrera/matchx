import api from './api'

export const authService = {
  login: (username: string, password: string) =>
    api.post<{ token: string }>('/api/login', { username, password }),

  getMe: () => api.get('/api/user'),

  logout: () => api.post('/api/logout', {}),
}
