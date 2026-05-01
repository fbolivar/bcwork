// Reglas de productividad por defecto (pueden sobreescribirse desde el panel admin)
const DEFAULT_PRODUCTIVE = [
  'github.com',
  'gitlab.com',
  'bitbucket.org',
  'jira.atlassian.com',
  'linear.app',
  'notion.so',
  'confluence.atlassian.com',
  'figma.com',
  'miro.com',
  'stackoverflow.com',
  'docs.google.com',
  'drive.google.com',
  'mail.google.com',
  'outlook.live.com',
  'outlook.office.com',
  'meet.google.com',
  'teams.microsoft.com',
  'zoom.us',
  'slack.com',
  'discord.com',
]

const DEFAULT_UNPRODUCTIVE = [
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'youtube.com',
  'netflix.com',
  'twitch.tv',
  'reddit.com',
  '9gag.com',
  'buzzfeed.com',
]

export function classifyDomain(
  domain: string,
  customRules: Record<string, string>,
): 'productive' | 'unproductive' | 'neutral' {
  // Reglas personalizadas tienen prioridad
  const custom = customRules[domain] ?? customRules[rootDomain(domain)]
  if (custom === 'productive') return 'productive'
  if (custom === 'unproductive') return 'unproductive'
  if (custom === 'neutral') return 'neutral'

  if (DEFAULT_PRODUCTIVE.some((d) => domain === d || domain.endsWith(`.${d}`))) return 'productive'
  if (DEFAULT_UNPRODUCTIVE.some((d) => domain === d || domain.endsWith(`.${d}`)))
    return 'unproductive'
  return 'neutral'
}

function rootDomain(domain: string): string {
  const parts = domain.split('.')
  return parts.length > 2 ? parts.slice(-2).join('.') : domain
}

export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}
