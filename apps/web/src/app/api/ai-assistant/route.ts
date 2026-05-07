import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { getOpenRouter, MODELS } from '@/lib/ai/openrouter'
import { getDb } from '@/lib/db'
import { getAccessTokenFromHeaders } from '@/lib/auth/session'
import { verifyAccessToken } from '@/lib/auth/jwt'

export const runtime = 'nodejs'
export const maxDuration = 60

async function fetchHRContext(tenantId: string): Promise<string> {
  const db = getDb()
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const [usersRes, absencesRes, goalsRes, reviewsRes] = await Promise.all([
    db.from('users').select('id, name, role, status').eq('tenant_id', tenantId),
    (db as any)
      .from('absence_requests')
      .select('id, status, start_date, end_date, type, user_id')
      .eq('tenant_id', tenantId)
      .gte('created_at', weekAgo),
    (db as any)
      .from('goals')
      .select('id, title, status, progress, due_date, user_id')
      .eq('tenant_id', tenantId)
      .limit(20),
    (db as any)
      .from('performance_reviews')
      .select('id, status, review_period, user_id')
      .eq('tenant_id', tenantId)
      .gte('created_at', weekAgo)
      .limit(10),
  ])

  const users = usersRes.data ?? []
  const absences = absencesRes.data ?? []
  const goals = goalsRes.data ?? []
  const reviews = reviewsRes.data ?? []

  const active = users.filter((u: any) => u.status === 'active')
  const admins = users.filter((u: any) => u.role === 'admin')
  const pendingAbsences = absences.filter((a: any) => a.status === 'pending')
  const approvedAbsences = absences.filter((a: any) => a.status === 'approved')
  const openGoals = goals.filter(
    (g: any) => g.status === 'in_progress' || g.status === 'not_started',
  )
  const pendingReviews = reviews.filter(
    (r: any) => r.status === 'pending' || r.status === 'in_progress',
  )

  const lines: string[] = [
    `=== CONTEXTO HR DE LA EMPRESA (fecha: ${today}) ===`,
    ``,
    `EMPLEADOS:`,
    `  - Total: ${users.length} | Activos: ${active.length} | Admins/managers: ${admins.length}`,
    ``,
    `AUSENCIAS (últimos 7 días):`,
    `  - Pendientes de aprobación: ${pendingAbsences.length}`,
    `  - Aprobadas: ${approvedAbsences.length}`,
    `  - Total solicitudes: ${absences.length}`,
  ]

  if (pendingAbsences.length > 0) {
    lines.push(`  - Solicitudes pendientes:`)
    pendingAbsences.slice(0, 5).forEach((a: any) => {
      lines.push(`    * Tipo: ${a.type}, Desde: ${a.start_date} hasta: ${a.end_date}`)
    })
  }

  lines.push(``)
  lines.push(`OBJETIVOS:`)
  lines.push(
    `  - Total objetivos: ${goals.length} | En progreso o sin iniciar: ${openGoals.length}`,
  )
  if (openGoals.length > 0) {
    openGoals.slice(0, 5).forEach((g: any) => {
      lines.push(
        `  - "${g.title}" — progreso: ${g.progress ?? 0}% | vence: ${g.due_date ?? 'sin fecha'}`,
      )
    })
  }

  lines.push(``)
  lines.push(`EVALUACIONES DE DESEMPEÑO (recientes):`)
  lines.push(`  - Total: ${reviews.length} | Pendientes: ${pendingReviews.length}`)

  lines.push(``)
  lines.push(`=== FIN DE CONTEXTO ===`)

  return lines.join('\n')
}

export async function POST(req: Request) {
  const openrouter = getOpenRouter()
  if (!openrouter) {
    return Response.json(
      { error: 'AI no configurado. Agrega OPENROUTER_API_KEY en las variables de entorno.' },
      { status: 503 },
    )
  }

  const token = getAccessTokenFromHeaders(req.headers)
  if (!token) return Response.json({ error: 'No autorizado' }, { status: 401 })

  let payload: Awaited<ReturnType<typeof verifyAccessToken>>
  try {
    payload = await verifyAccessToken(token)
  } catch {
    return Response.json({ error: 'Token inválido' }, { status: 401 })
  }

  const tenantId = payload.tid
  const userName = payload.email ?? 'Administrador'

  const hrContext = await fetchHRContext(tenantId)

  const { messages }: { messages: UIMessage[] } = await req.json()

  const SYSTEM_PROMPT = `Eres el Asistente HR de BCWork, una plataforma de gestión de talento humano para empresas latinoamericanas.

Tienes acceso en tiempo real a los datos de HR de la empresa del usuario que te está consultando. Usa ese contexto para dar respuestas precisas y útiles.

El usuario se llama: ${userName}

${hrContext}

INSTRUCCIONES:
- Responde siempre en español
- Sé conciso y directo — el usuario es un administrador ocupado
- Usa los datos de contexto para responder preguntas sobre empleados, ausencias, objetivos, etc.
- Si no tienes datos suficientes para responder algo, dilo claramente
- Puedes sugerir acciones concretas cuando sea apropiado (ej: "Tienes X solicitudes pendientes de aprobar en /admin/absences")
- Usa formato markdown ligero cuando ayude (listas, negritas)
- No inventes datos que no estén en el contexto`

  const result = streamText({
    model: openrouter(MODELS.balanced),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
