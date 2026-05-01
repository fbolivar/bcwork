// Este archivo es un alias para el cliente de servicio.
// NO usamos Supabase Auth — la auth propia está en /lib/auth/*.
// Mantener por compatibilidad con rutas que lo importen.
export { getDb as createClient } from '@/lib/db'
