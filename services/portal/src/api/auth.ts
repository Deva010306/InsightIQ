/**
 * InsightIQ — Auth API Client
 * Handles login, logout, and current-user state.
 */
import apiClient from './client'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: {
    id: string
    tenant_id: string
    email: string
    display_name: string | null
    role: string
  }
}

export interface MeResponse {
  id: string
  tenant_id: string
  email: string
  display_name: string | null
  role: string
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await apiClient.post<LoginResponse>('/api/v1/auth/login', { email, password })
    return res.data
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/v1/auth/logout')
    } catch {
      // ignore
    }
  },

  async me(): Promise<MeResponse> {
    const res = await apiClient.get<MeResponse>('/api/v1/auth/me')
    return res.data
  },
}
