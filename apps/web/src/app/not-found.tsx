import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="rounded-2xl border border-gray-200 bg-white px-10 py-12 shadow-sm">
        <p className="text-6xl font-bold tabular-nums text-gray-200">404</p>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Página no encontrada</h1>
        <p className="mt-2 text-sm text-gray-500">
          La dirección que buscas no existe o fue movida.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/me/dashboard"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ir al inicio
          </Link>
          <Link
            href="javascript:history.back()"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Volver
          </Link>
        </div>
      </div>
    </div>
  )
}
