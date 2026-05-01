import { router } from '../trpc'
import { authRouter } from './auth'
import { platformRouter } from './platform'

export const appRouter = router({
  auth: authRouter,
  platform: platformRouter,
})

export type AppRouter = typeof appRouter
