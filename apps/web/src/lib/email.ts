import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM ?? 'BCWork <noreply@bcwork.co>'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key || key === 're_placeholder') return null
  return new Resend(key)
}

// ─── Base layout ─────────────────────────────────────────────────────────────

function baseHtml(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:24px 32px;">
            <span style="color:#06b6d4;font-size:20px;font-weight:700;letter-spacing:-0.5px;">BCWork</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              Este correo fue enviado por BCWork. Si no esperabas este mensaje, puedes ignorarlo.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">${text}</h1>`
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">${text}</p>`
}

function badge(text: string, color: 'green' | 'red' | 'blue') {
  const map = {
    green: 'background:#dcfce7;color:#166534',
    red: 'background:#fee2e2;color:#991b1b',
    blue: 'background:#dbeafe;color:#1d4ed8',
  }
  return `<span style="display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;${map[color]}">${text}</span>`
}

function ctaButton(text: string, url: string) {
  return `<a href="${url}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#06b6d4;color:#ffffff;font-size:14px;font-weight:600;border-radius:8px;text-decoration:none;">${text}</a>`
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;font-size:13px;color:#94a3b8;width:140px;">${label}</td>
    <td style="padding:8px 0;font-size:13px;color:#1e293b;font-weight:500;">${value}</td>
  </tr>`
}

// ─── Email: Ausencia aprobada ─────────────────────────────────────────────────

export async function sendAbsenceApprovedEmail({
  to,
  employeeName,
  type,
  startDate,
  endDate,
  days,
  note,
  appUrl,
}: {
  to: string
  employeeName: string
  type: string
  startDate: string
  endDate: string
  days: number
  note?: string
  appUrl: string
}) {
  const body = `
    ${h1('Solicitud de ausencia aprobada')}
    ${p(`Hola ${employeeName}, tu solicitud de ausencia ha sido ${badge('Aprobada', 'green')}`)}
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
      ${infoRow('Tipo', type)}
      ${infoRow('Desde', startDate)}
      ${infoRow('Hasta', endDate)}
      ${infoRow('Días', String(days))}
      ${note ? infoRow('Nota', note) : ''}
    </table>
    ${ctaButton('Ver mis ausencias', `${appUrl}/me/absences`)}
  `
  return getResend()?.emails.send({
    from: FROM,
    to,
    subject: 'Tu ausencia fue aprobada ✅',
    html: baseHtml('Ausencia aprobada', body),
  })
}

// ─── Email: Ausencia rechazada ────────────────────────────────────────────────

export async function sendAbsenceRejectedEmail({
  to,
  employeeName,
  type,
  startDate,
  endDate,
  note,
  appUrl,
}: {
  to: string
  employeeName: string
  type: string
  startDate: string
  endDate: string
  note?: string
  appUrl: string
}) {
  const body = `
    ${h1('Solicitud de ausencia rechazada')}
    ${p(`Hola ${employeeName}, lamentablemente tu solicitud de ausencia fue ${badge('Rechazada', 'red')}`)}
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
      ${infoRow('Tipo', type)}
      ${infoRow('Desde', startDate)}
      ${infoRow('Hasta', endDate)}
      ${note ? infoRow('Motivo', note) : ''}
    </table>
    ${p('Puedes solicitar una nueva ausencia o contactar a tu manager si tienes preguntas.')}
    ${ctaButton('Ver mis ausencias', `${appUrl}/me/absences`)}
  `
  return getResend()?.emails.send({
    from: FROM,
    to,
    subject: 'Tu ausencia no fue aprobada',
    html: baseHtml('Ausencia rechazada', body),
  })
}

// ─── Email: Nueva solicitud de ausencia (para managers) ──────────────────────

export async function sendAbsenceRequestEmail({
  to,
  managerName,
  employeeName,
  type,
  startDate,
  endDate,
  days,
  reason,
  appUrl,
}: {
  to: string
  managerName: string
  employeeName: string
  type: string
  startDate: string
  endDate: string
  days: number
  reason?: string
  appUrl: string
}) {
  const body = `
    ${h1('Nueva solicitud de ausencia')}
    ${p(`Hola ${managerName}, ${badge(employeeName, 'blue')} ha enviado una solicitud de ausencia que requiere tu revisión.`)}
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
      ${infoRow('Colaborador', employeeName)}
      ${infoRow('Tipo', type)}
      ${infoRow('Desde', startDate)}
      ${infoRow('Hasta', endDate)}
      ${infoRow('Días', String(days))}
      ${reason ? infoRow('Motivo', reason) : ''}
    </table>
    ${ctaButton('Revisar solicitud', `${appUrl}/admin/absences`)}
  `
  return getResend()?.emails.send({
    from: FROM,
    to,
    subject: `${employeeName} solicitó ${days} día${days !== 1 ? 's' : ''} de ausencia`,
    html: baseHtml('Solicitud de ausencia', body),
  })
}

// ─── Email: Bienvenida al registrarse ────────────────────────────────────────

export async function sendWelcomeEmail({
  to,
  name,
  appUrl,
}: {
  to: string
  name: string
  appUrl: string
}) {
  const body = `
    ${h1(`¡Bienvenido a BCWork, ${name}!`)}
    ${p('Tu cuenta ha sido creada exitosamente. BCWork es tu plataforma para gestionar el trabajo remoto de tu equipo de manera eficiente.')}
    ${p('Completa la configuración de tu empresa para comenzar a aprovechar todas las funcionalidades.')}
    ${ctaButton('Ir al dashboard', `${appUrl}/dashboard`)}
  `
  return getResend()?.emails.send({
    from: FROM,
    to,
    subject: '¡Bienvenido a BCWork! 🎉',
    html: baseHtml('Bienvenido a BCWork', body),
  })
}

// ─── Email: Colilla de nómina emitida ────────────────────────────────────────

export async function sendPayslipIssuedEmail({
  to,
  employeeName,
  periodLabel,
  netAmount,
  currency,
  appUrl,
}: {
  to: string
  employeeName: string
  periodLabel: string
  netAmount: number
  currency: string
  appUrl: string
}) {
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(netAmount)

  const body = `
    ${h1('Tu recibo de nómina está listo')}
    ${p(`Hola ${employeeName}, tu recibo de nómina del período ${badge(periodLabel, 'blue')} ha sido emitido.`)}
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">
      ${infoRow('Período', periodLabel)}
      ${infoRow('Neto a pagar', formatted)}
    </table>
    ${p('Ingresa a la plataforma para ver el detalle completo y confirmar recibido.')}
    ${ctaButton('Ver mi recibo', `${appUrl}/me/payslips`)}
  `
  return getResend()?.emails.send({
    from: FROM,
    to,
    subject: `Tu recibo de nómina — ${periodLabel}`,
    html: baseHtml('Recibo de nómina', body),
  })
}
