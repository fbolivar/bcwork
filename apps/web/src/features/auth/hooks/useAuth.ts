'use client'

import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc-client'
import { useAuthStore } from '@/features/auth/store/authStore'

export function useAuth() {
  const router = useRouter()
  const { setUser, clearUser } = useAuthStore()

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      // Almacenar tokens en cookies httpOnly via respuesta del servidor
      // El access token se guarda en cookie desde el server action wrapper
      setUser(data.user)
      if (data.mustChangePassword) {
        router.push('/change-password')
      } else {
        router.push(getDashboard(data.user.role))
      }
    },
  })

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      clearUser()
      router.push('/login')
    },
  })

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  return {
    user: meQuery.data,
    isLoading: meQuery.isLoading,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  }
}

function getDashboard(role: string): string {
  switch (role) {
    case 'platform_admin':
      return '/super-admin'
    case 'tenant_admin':
      return '/admin/dashboard'
    case 'manager':
      return '/manager/dashboard'
    default:
      return '/me/dashboard'
  }
}
