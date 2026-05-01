import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { JwtPayload } from '@bcwork/shared'
import { JWT_EXPIRY_SECONDS, REFRESH_TOKEN_EXPIRY_DAYS } from '@bcwork/shared'

function getSecret(key: string) {
  const secret = process.env[key]
  if (!secret) throw new Error(`Missing env var: ${key}`)
  return new TextEncoder().encode(secret)
}

export async function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_SECONDS}s`)
    .sign(getSecret('JWT_SECRET'))
}

export async function signRefreshToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sub: userId, sid: sessionId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_EXPIRY_DAYS}d`)
    .sign(getSecret('JWT_REFRESH_SECRET'))
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret('JWT_SECRET'))
  return payload as unknown as JwtPayload
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string; sid: string }> {
  const { payload } = await jwtVerify(token, getSecret('JWT_REFRESH_SECRET'))
  if (payload['type'] !== 'refresh') throw new Error('Invalid token type')
  return { sub: payload.sub as string, sid: payload['sid'] as string }
}
