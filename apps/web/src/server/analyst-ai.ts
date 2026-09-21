import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { getOpenRouter } from '@/lib/ai/openrouter'
import type { Hechos } from './analyst'

/**
 * Analista IA — la interpretación.
 *
 * Recibe los hechos calculados en `analyst.ts` y devuelve un informe
 * estructurado: resumen ejecutivo, hallazgos, lectura por persona,
 * recomendaciones y un texto listo para gerencia. El modelo no consulta la
 * base de datos ni ve eventos: solo lo que hay en `Hechos`.
 */

export const MODELO_ANALISTA = process.env.AI_MODEL || 'anthropic/claude-sonnet-5'

export const InformeSchema = z.object({
  resumen_ejecutivo: z
    .string()
    .describe(
      '3 a 5 frases para gerencia: qué pasó en el periodo, qué cambió y qué requiere decisión.',
    ),
  hallazgos: z
    .array(
      z.object({
        titulo: z.string(),
        detalle: z.string().describe('Con las cifras que lo sustentan.'),
        severidad: z.enum(['alta', 'media', 'baja', 'positiva']),
        personas: z.array(z.string()).describe('Nombres de las personas implicadas, si aplica.'),
      }),
    )
    .max(8),
  tendencias: z
    .string()
    .describe('Lectura de la evolución semanal y del cambio frente al periodo anterior.'),
  personas: z
    .array(
      z.object({
        userId: z.string(),
        nombre: z.string(),
        diagnostico: z.string().describe('Una o dos frases sobre su comportamiento en el periodo.'),
        recomendacion: z
          .string()
          .describe('Acción concreta para su líder, o "mantener" si va bien.'),
        prioridad: z.enum(['alta', 'media', 'baja']),
      }),
    )
    .describe(
      'Solo las personas que merecen una nota: riesgos, cambios notables o desempeño destacado.',
    ),
  recomendaciones: z
    .array(
      z.object({
        accion: z.string(),
        por_que: z.string(),
        impacto: z.enum(['alto', 'medio', 'bajo']),
      }),
    )
    .max(6)
    .describe('Decisiones para la administración, ordenadas por impacto.'),
  informe_gerencia: z
    .string()
    .describe(
      'Informe completo en Markdown para enviar a gerencia: título, periodo, resumen, indicadores clave con comparación, hallazgos, personas a seguir, recomendaciones y próximos pasos. Sin encabezados de nivel 1.',
    ),
})

export type Informe = z.infer<typeof InformeSchema>

const SISTEMA = `Eres el analista de personas de BCWork, una plataforma colombiana de gestión del teletrabajo. Asesoras a la administración de una empresa a partir de datos de actividad de sus equipos de trabajo.

Reglas:
- Trabajas SOLO con los hechos que recibes. No inventes cifras ni causas. Si un dato falta, dilo.
- Escribe en español de Colombia, claro y directo, para gerentes que no son técnicos. Usa cifras concretas (horas, porcentajes, puntos porcentuales, días).
- "Productividad" es el porcentaje del tiempo activo en aplicaciones que la empresa clasificó como productivas; "efectividad" excluye el tiempo neutral. Aclara cuando una brecha pueda deberse a la clasificación de aplicaciones y no a las personas.
- Sé prudente con las conclusiones sobre personas: los datos muestran comportamiento del computador, no desempeño ni intención. Recomienda conversar y verificar antes de sancionar. Una persona sin datos puede tener el agente caído.
- Ten presente la ley colombiana: jornada máxima (Ley 2101), desconexión digital (Ley 2191) y habeas data (Ley 1581). Marca sobrecarga y trabajo fuera de horario como riesgo para la empresa, no solo para la persona.
- Prioriza: primero lo que requiere decisión, después lo que va bien. No repitas la misma señal en varios apartados.
- El informe para gerencia debe poder enviarse tal cual: tono profesional, sin emojis, sin referencias a "el modelo" ni a "la IA".`

function contexto(hechos: Hechos): string {
  // Se manda el JSON completo: es compacto (una fila por persona) y así el
  // modelo puede citar cualquier cifra sin que tengamos que adivinar cuáles.
  return JSON.stringify(hechos)
}

export async function generarInforme(hechos: Hechos): Promise<Informe> {
  const openrouter = getOpenRouter()
  if (!openrouter) throw new Error('Falta configurar OPENROUTER_API_KEY para el analista IA.')
  const { object } = await generateObject({
    model: openrouter(MODELO_ANALISTA),
    schema: InformeSchema,
    system: SISTEMA,
    prompt: `Analiza el siguiente periodo de ${hechos.period.weeks} semanas (${hechos.period.from} a ${hechos.period.to}) comparado con el anterior (${hechos.period.previousFrom} a ${hechos.period.previousTo}) de la empresa ${hechos.company}. Las "signals" ya vienen calculadas por reglas: úsalas como punto de partida, contrástalas con las cifras y añade lo que las reglas no ven (patrones entre personas, departamentos, evolución semanal).\n\nHECHOS:\n${contexto(hechos)}`,
    temperature: 0.3,
  })
  return object
}

export async function responderPregunta(
  hechos: Hechos,
  informe: Informe | null,
  pregunta: string,
): Promise<string> {
  const openrouter = getOpenRouter()
  if (!openrouter) throw new Error('Falta configurar OPENROUTER_API_KEY para el analista IA.')
  const { text } = await generateText({
    model: openrouter(MODELO_ANALISTA),
    system: SISTEMA,
    prompt: `HECHOS del periodo ${hechos.period.from} a ${hechos.period.to}:\n${contexto(hechos)}\n\n${informe ? `INFORME YA GENERADO:\n${JSON.stringify(informe)}\n\n` : ''}Pregunta del administrador: ${pregunta}\n\nResponde en Markdown breve, con las cifras que sustentan la respuesta.`,
    temperature: 0.3,
  })
  return text
}
