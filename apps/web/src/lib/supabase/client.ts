// Stub — no usamos Supabase Auth en el cliente.
// Exportamos solo para compatibilidad con imports del template.
export function createClient() {
  throw new Error('Use trpc client for data fetching, not Supabase client directly')
}
