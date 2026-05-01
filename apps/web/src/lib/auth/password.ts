import { randomBytes } from 'crypto'
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

export function generateRandomPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const symbols = '!@#$&*'
  const all = upper + lower + digits + symbols
  const bytes = randomBytes(16)
  const chars: string[] = [
    upper[bytes[0]! % upper.length]!,
    lower[bytes[1]! % lower.length]!,
    digits[bytes[2]! % digits.length]!,
    symbols[bytes[3]! % symbols.length]!,
    ...Array.from({ length: 8 }, (_, i) => all[bytes[i + 4]! % all.length]!),
  ]
  const shuffle = randomBytes(12)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffle[i]! % (i + 1)
    const tmp = chars[i]!
    chars[i] = chars[j]!
    chars[j] = tmp
  }
  return chars.join('')
}

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 12) return 'Mínimo 12 caracteres'
  if (!/[A-Z]/.test(password)) return 'Debe contener al menos una mayúscula'
  if (!/[a-z]/.test(password)) return 'Debe contener al menos una minúscula'
  if (!/[0-9]/.test(password)) return 'Debe contener al menos un número'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Debe contener al menos un carácter especial'
  return null
}
