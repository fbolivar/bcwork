import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export function getOpenRouter() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key || key === 'sk-or-v1-placeholder') return null
  return createOpenRouter({ apiKey: key })
}

export const MODELS = {
  fast: 'google/gemini-2.0-flash-exp:free',
  balanced: 'anthropic/claude-3-5-haiku',
  powerful: 'anthropic/claude-3-5-sonnet',
} as const
