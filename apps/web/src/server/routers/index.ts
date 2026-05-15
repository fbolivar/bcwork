import { router } from '../trpc'
import { authRouter } from './auth'
import { platformRouter } from './platform'
import { adminRouter } from './admin'
import { managerRouter } from './manager'
import { employeeRouter } from './employee'
import { notificationsRouter } from './notifications'
import { integrationsRouter } from './integrations'
import { billingRouter } from './billing'

export const appRouter = router({
  auth: authRouter,
  platform: platformRouter,
  admin: adminRouter,
  manager: managerRouter,
  employee: employeeRouter,
  notifications: notificationsRouter,
  integrations: integrationsRouter,
  billing: billingRouter,
})

export type AppRouter = typeof appRouter
