import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/server/routers'
import { createContext } from '@/server/context'

// El analista IA redacta un informe completo en una sola llamada: puede pasar
// del minuto. El resto de procedimientos no se ven afectados por el tope.
export const maxDuration = 120

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError({ path, error }) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`tRPC error on ${path ?? '<no-path>'}:`, error)
      }
    },
  })

export { handler as GET, handler as POST }
