import Anthropic from '@anthropic-ai/sdk'

// La API key vive SOLO en el servidor (variable de entorno en Vercel).
const client = new Anthropic() // lee ANTHROPIC_API_KEY del entorno

// Modelo más económico/rápido — ideal para respuestas de voz en tiempo real.
const MODEL = 'claude-haiku-4-5'

const SYSTEM = `Eres ABAD, el asistente de inteligencia de KAIROS, una app de productividad
personal basada en la filosofía griega del Kairós (el momento oportuno).

Reglas:
- Respondes SIEMPRE en español, breve y cálido (1 a 3 frases), pensado para leerse en voz alta.
- Solo respondes con base en el CONTEXTO del usuario que se te entrega (tareas, vencimientos,
  enfoque, rango). No inventes datos que no estén en el contexto.
- Si te piden modificar algo (crear/mover tarjetas, registrar gastos), responde amablemente que
  esa acción por voz llegará muy pronto, y ofrece la información que sí tengas.
- Si no hay datos relevantes, dilo con naturalidad y anima a la persona.
- Responde solo con la respuesta final: sin razonamiento, sin preámbulos, sin listas largas.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'Falta configurar ANTHROPIC_API_KEY en el servidor.' })
    return
  }

  try {
    const { question, context } = req.body || {}
    if (!question || !question.trim()) {
      res.status(400).json({ error: 'Falta la pregunta.' })
      return
    }

    const userContent =
      `CONTEXTO del usuario (JSON):\n${JSON.stringify(context ?? {}, null, 2)}\n\n` +
      `PREGUNTA: ${question.trim()}`

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    })

    const answer = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join(' ')
      .trim()

    res.status(200).json({ answer })
  } catch (err) {
    console.error('[abad] error:', err?.message || err)
    res.status(500).json({ error: err?.message || 'Error del asistente.' })
  }
}
