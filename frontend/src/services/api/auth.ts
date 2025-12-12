import { httpClient } from '../httpClient'
import { LoginCredentials, LoginResponse } from '@/types'

export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return httpClient.post<LoginResponse>('/auth/login', credentials)
  },

  async logout(): Promise<void> {
    return httpClient.post<void>('/auth/logout')
  },

  async getCurrentUser(): Promise<LoginResponse['user']> {
    return httpClient.get<LoginResponse['user']>('/auth/me')
  },

  async refreshToken(): Promise<{ token: string }> {
    return httpClient.post<{ token: string }>('/auth/refresh')
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    return httpClient.post<void>('/auth/change-password', data)
  },
}