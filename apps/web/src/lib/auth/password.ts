import bcrypt from 'bcryptjs'
import { PASSWORD_HISTORY_COUNT } from '@bcwork/shared'

const BCRYPT_COST = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// Verifica que la nueva contraseña no esté en las últimas N del historial
export async function isPasswordInHistory(plain: string, hashes: string[]): Promise<boolean> {
  const recent = hashes.slice(0, PASSWORD_HISTORY_COUNT)
  const checks = await Promise.all(recent.map((h) => bcrypt.compare(plain, h)))
  return checks.some(Boolean)
}

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 12) return 'Mínimo 12 caracteres'
  if (!/[A-Z]/.test(password)) return 'Debe contener al menos una mayúscula'
  if (!/[a-z]/.test(password)) return 'Debe contener al menos una minúscula'
  if (!/[0-9]/.test(password)) return 'Debe contener al menos un número'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Debe contener al menos un carácter especial'
  return null
}
