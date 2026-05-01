import { router } from '../trpc'
import { authRouter } from './auth'
import { platformRouter } from './platform'
import { adminRouter } from './admin'

export const appRouter = router({
  auth: authRouter,
  platform: platformRouter,
  admin: adminRouter,
})

export type AppRouter = typeof appRouter
