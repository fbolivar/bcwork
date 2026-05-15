export interface SlackBlock {
  type: string
  [key: string]: unknown
}

export async function sendSlackMessage(
  webhookUrl: string,
  text: string,
  blocks?: SlackBlock[],
): Promise<void> {
  const body = blocks ? { text, blocks } : { text }
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Slack webhook failed: HTTP ${res.status}`)
  }
}

export function buildAbsenceReviewedBlocks(params: {
  employeeName: string
  type: string
  startDate: string
  endDate: string
  days: number
  status: 'approved' | 'rejected'
  reviewerName: string
  note?: string
  appUrl: string
}): SlackBlock[] {
  const emoji = params.status === 'approved' ? '✅' : '❌'
  const statusLabel = params.status === 'approved' ? 'Aprobada' : 'Rechazada'
  const typeLabel =
    params.type === 'vacation'
      ? 'Vacaciones'
      : params.type === 'sick'
        ? 'Incapacidad'
        : params.type === 'personal'
          ? 'Permiso personal'
          : params.type

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} Ausencia ${statusLabel}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Empleado:*\n${params.employeeName}` },
        { type: 'mrkdwn', text: `*Tipo:*\n${typeLabel}` },
        {
          type: 'mrkdwn',
          text: `*Período:*\n${params.startDate} → ${params.endDate} (${params.days} día${params.days !== 1 ? 's' : ''})`,
        },
        { type: 'mrkdwn', text: `*Revisado por:*\n${params.reviewerName}` },
      ],
    },
    ...(params.note
      ? [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Nota:* ${params.note}` },
          },
        ]
      : []),
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Ver en BCWork', emoji: true },
          url: `${params.appUrl}/admin/absences`,
          action_id: 'view_absence',
        },
      ],
    },
  ]
}

export function buildAbsenceRequestedBlocks(params: {
  employeeName: string
  type: string
  startDate: string
  endDate: string
  days: number
  appUrl: string
}): SlackBlock[] {
  const typeLabel =
    params.type === 'vacation'
      ? 'Vacaciones'
      : params.type === 'sick'
        ? 'Incapacidad'
        : params.type === 'personal'
          ? 'Permiso personal'
          : params.type

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📋 Nueva solicitud de ausencia',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Empleado:*\n${params.employeeName}` },
        { type: 'mrkdwn', text: `*Tipo:*\n${typeLabel}` },
        {
          type: 'mrkdwn',
          text: `*Período:*\n${params.startDate} → ${params.endDate} (${params.days} día${params.days !== 1 ? 's' : ''})`,
        },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Revisar solicitud ›', emoji: true },
          url: `${params.appUrl}/admin/absences`,
          action_id: 'review_absence',
          style: 'primary',
        },
      ],
    },
  ]
}
