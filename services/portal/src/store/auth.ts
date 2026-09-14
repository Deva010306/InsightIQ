import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  isAuthenticated: boolean
  token: string | null
  user: {
    name: string
    email: string
    role: string
    initials: string
  } | null
  workspace: {
    id: string
    name: string
    abbrev: string
  } | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setWorkspace: (ws: AuthState['workspace']) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      user: null,
      workspace: null,

      login: async (email: string, password: string) => {
        try {
          // Try real API login
          const res = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          if (!res.ok) throw new Error('Login failed')
          const data: {
            access_token: string
            user: { id: string; tenant_id: string; email: string; display_name: string | null; role: string }
          } = await res.json()

          const token = data.access_token
          localStorage.setItem('insightiq_token', token)

          const displayName = data.user.display_name ?? email.split('@')[0].replace(/[._]/g, ' ')
          const name = displayName.replace(/\b\w/g, (c) => c.toUpperCase())

          set({
            isAuthenticated: true,
            token,
            user: {
              name,
              email: data.user.email,
              role: data.user.role,
              initials: name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
            },
            workspace: {
              id: data.user.tenant_id,
              name: 'Doms Stationery Co.',
              abbrev: 'DS',
            },
          })
        } catch {
          // Fallback to dev-token (works when API is offline)
          const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          localStorage.setItem('insightiq_token', 'dev-token')
          set({
            isAuthenticated: true,
            token: 'dev-token',
            user: { name, email, role: 'admin', initials: name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() },
            workspace: { id: 'ws-001', name: 'Doms Stationery Co.', abbrev: 'DS' },
          })
        }
      },

      logout: () => {
        set({ isAuthenticated: false, token: null, user: null, workspace: null })
      },

      setWorkspace: (ws) => set({ workspace: ws }),
    }),
    {
      name: 'insightiq-auth',
      partialize: (s) => ({
        isAuthenticated: s.isAuthenticated,
        token: s.token,
        user: s.user,
        workspace: s.workspace,
      }),
    }
  )
)
