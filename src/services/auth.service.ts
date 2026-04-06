import api from './api'

export const authService = {
  login: (username: string, password: string, selectedRole?: string) =>
    api.post('/api/login', selectedRole
      ? { username, password, selectedRole }
      : { username, password }
    ),

  getMe: () => api.get('/api/user'),

  logout: () => api.post('/api/logout', {}),
}
