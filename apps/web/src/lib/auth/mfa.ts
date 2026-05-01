import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  const hex = process.env.PII_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) throw new Error('PII_ENCRYPTION_KEY must be 32 bytes hex')
  return Buffer.from(hex, 'hex')
}

export function encryptSecret(plain: string): Buffer {
  const key = getEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Layout: iv(12) + tag(16) + ciphertext
  return Buffer.concat([iv, tag, encrypted])
}

export function decryptSecret(buf: Buffer): string {
  const key = getEncryptionKey()
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ciphertext = buf.subarray(28)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext) + decipher.final('utf8')
}

export function generateTotpSecret(userEmail: string): {
  secret: string
  uri: string
} {
  const totp = new OTPAuth.TOTP({
    issuer: 'BCWork',
    label: userEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  })
  return { secret: totp.secret.base32, uri: totp.toString() }
}

export function verifyTotp(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })
  const delta = totp.validate({ token, window: 1 })
  return delta !== null
}

export async function generateQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri)
}
