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
})

export type Informe = z.infer<typeof InformeSchema> & { informe_gerencia: string }

const SISTEMA = `Eres el analista de personas de BCWork, una plataforma colombiana de gestión del teletrabajo. Asesoras a la administración de una empresa a partir de datos de actividad de sus equipos de trabajo.

Reglas:
- Trabajas SOLO con los hechos que recibes. No inventes cifras ni causas. Si un dato falta, dilo.
- Escribe en español de Colombia, claro y directo, para gerentes que no son técnicos. Usa cifras concretas (horas, porcentajes, puntos porcentuales, días).
- "Productividad" es el porcentaje del tiempo activo en aplicaciones que la empresa clasificó como productivas; "efectividad" excluye el tiempo neutral. Aclara cuando una brecha pueda deberse a la clasificación de aplicaciones y no a las personas.
- Sé prudente con las conclusiones sobre personas: los datos muestran comportamiento del computador, no desempeño ni intención. Recomienda conversar y verificar antes de sancionar. Una persona sin datos puede tener el agente caído.
- Ten presente la ley colombiana: jornada máxima (Ley 2101), desconexión digital (Ley 2191) y habeas data (Ley 1581). Marca sobrecarga y trabajo fuera de horario como riesgo para la empresa, no solo para la persona.
- Prioriza: primero lo que requiere decisión, después lo que va bien. No repitas la misma señal en varios apartados.
- El informe para gerencia debe poder enviarse tal cual: tono profesional, sin emojis, sin referencias a "el modelo" ni a "la IA".`

/**
 * Sin razonamiento extendido: Claude Sonnet 5 lo trae activado por defecto en
 * OpenRouter y se gastaba todo el presupuesto de salida "pensando" (6000
 * tokens de razonamiento, 0 de respuesta). Los hechos ya vienen digeridos;
 * lo que hace falta es redactar, no deliberar.
 */
function modelo(openrouter: NonNullable<ReturnType<typeof getOpenRouter>>) {
  return openrouter(MODELO_ANALISTA, { reasoning: { enabled: false, effort: 'none' } })
}

function contexto(hechos: Hechos): string {
  // Se manda el JSON completo: es compacto (una fila por persona) y así el
  // modelo puede citar cualquier cifra sin que tengamos que adivinar cuáles.
  return JSON.stringify(hechos)
}

export async function generarInforme(hechos: Hechos): Promise<Informe> {
  const openrouter = getOpenRouter()
  if (!openrouter) throw new Error('Falta configurar OPENROUTER_API_KEY para el analista IA.')
  const model = modelo(openrouter)
  const encabezado = `Periodo de ${hechos.period.weeks} semanas (${hechos.period.from} a ${hechos.period.to}) comparado con el anterior (${hechos.period.previousFrom} a ${hechos.period.previousTo}) de la empresa ${hechos.company}. Las "signals" ya vienen calculadas por reglas: úsalas como punto de partida, contrástalas con las cifras y añade lo que las reglas no ven (patrones entre personas, departamentos, evolución semanal).`

  // Dos llamadas en paralelo: el análisis estructurado y el informe en prosa.
  // Juntas en una sola respuesta tardaban tres minutos y se truncaban.
  const [estructura, prosa] = await Promise.all([
    generateObject({
      model,
      schema: InformeSchema,
      system: SISTEMA,
      prompt: `${encabezado}

Entrega el análisis estructurado. En "personas" incluye solo a quienes merecen una nota (máximo 10). Sé concreto y breve en cada campo.

HECHOS:
${contexto(hechos)}`,
      temperature: 0.3,
      maxOutputTokens: 6000,
    }),
    generateText({
      model,
      system: SISTEMA,
      prompt: `${encabezado}

Redacta el informe para gerencia en Markdown, listo para enviar: título (encabezado de nivel 2), periodo, resumen ejecutivo, tabla de indicadores clave con comparación frente al periodo anterior, hallazgos principales, personas a seguir (con cifras), recomendaciones priorizadas y próximos pasos. Entre 500 y 900 palabras. Sin encabezados de nivel 1.

HECHOS:
${contexto(hechos)}`,
      temperature: 0.3,
      maxOutputTokens: 3000,
    }),
  ])
  return { ...estructura.object, informe_gerencia: prosa.text.trim() }
}

export async function responderPregunta(
  hechos: Hechos,
  informe: Informe | null,
  pregunta: string,
): Promise<string> {
  const openrouter = getOpenRouter()
  if (!openrouter) throw new Error('Falta configurar OPENROUTER_API_KEY para el analista IA.')
  const { text } = await generateText({
    model: modelo(openrouter),
    system: SISTEMA,
    prompt: `HECHOS del periodo ${hechos.period.from} a ${hechos.period.to}:\n${contexto(hechos)}\n\n${informe ? `INFORME YA GENERADO:\n${JSON.stringify(informe)}\n\n` : ''}Pregunta del administrador: ${pregunta}\n\nResponde en Markdown breve, con las cifras que sustentan la respuesta.`,
    temperature: 0.3,
    maxOutputTokens: 1500,
  })
  return text
}
