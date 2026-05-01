import { router } from '../trpc'
import { authRouter } from './auth'
import { platformRouter } from './platform'
import { adminRouter } from './admin'
import { managerRouter } from './manager'
import { employeeRouter } from './employee'

export const appRouter = router({
  auth: authRouter,
  platform: platformRouter,
  admin: adminRouter,
  manager: managerRouter,
  employee: employeeRouter,
})

export type AppRouter = typeof appRouter
