'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  id: string
  email: string
  role: string
  tenantId: string | null
  mfaEnabled: boolean
}

interface AuthStore {
  user: AuthUser | null
  setUser: (user: AuthUser) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'bcw-auth',
      // Solo persiste info no sensible; el token vive en cookie httpOnly
      partialize: (state) => ({ user: state.user }),
    },
  ),
)
