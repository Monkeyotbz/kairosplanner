import Anthropic from '@anthropic-ai/sdk'

// La API key vive SOLO en el servidor (variable de entorno en Vercel).
const client = new Anthropic() // lee ANTHROPIC_API_KEY del entorno

// Modelo más económico/rápido — ideal para respuestas de voz en tiempo real.
const MODEL = 'claude-haiku-4-5'

const SYSTEM = `Eres ABAD, el asistente de inteligencia de KAIROS, una app de productividad
personal basada en la filosofía griega del Kairós (el momento oportuno).

Puedes hacer dos cosas:
1) RESPONDER consultas sobre los datos del usuario (tareas, vencimientos, enfoque, rango)
   con base en el CONTEXTO que se te entrega. En español, breve y cálido (1-3 frases).
2) EJECUTAR acciones con las herramientas disponibles: crear tarjetas (con prioridad, fecha,
   descripción, subtareas y participante), mover tarjetas de lista, y registrar gastos.

Reglas:
- Si el usuario pide CREAR/MOVER una tarjeta o REGISTRAR un gasto, usa la herramienta adecuada.
- Para fechas relativas ("mañana", "el viernes", "en 3 días") calcula la fecha real en formato
  YYYY-MM-DD usando "fecha_hoy" del contexto.
- Usa los nombres EXACTOS de columnas y miembros que aparecen en el contexto cuando existan.
- Si solo es una pregunta, responde con texto (sin herramientas), en español y breve.
- No inventes datos que no estén en el contexto.`

const TOOLS = [
  {
    name: 'crear_tarjeta',
    description: 'Crea una nueva tarjeta/tarea en el tablero Kanban. Úsala cuando el usuario pida crear, agregar o añadir una tarjeta, tarea o pendiente.',
    input_schema: {
      type: 'object',
      properties: {
        titulo:       { type: 'string', description: 'Título de la tarjeta' },
        columna:      { type: 'string', description: 'Nombre de la lista/columna destino (ej. Backlog, En progreso). Opcional; si no, va a la primera.' },
        prioridad:    { type: 'string', enum: ['baja', 'normal', 'alta'], description: 'Prioridad de la tarjeta. Opcional.' },
        fecha_limite: { type: 'string', description: 'Fecha límite en formato YYYY-MM-DD. Opcional.' },
        descripcion:  { type: 'string', description: 'Descripción o detalles de la tarjeta. Opcional.' },
        subtareas:    { type: 'array', items: { type: 'string' }, description: 'Lista de subtareas. Opcional.' },
        participante: { type: 'string', description: 'Nombre del miembro del proyecto a asignar. Opcional.' },
      },
      required: ['titulo'],
    },
  },
  {
    name: 'mover_tarjeta',
    description: 'Mueve una tarjeta existente a otra lista/columna del tablero.',
    input_schema: {
      type: 'object',
      properties: {
        titulo_tarjeta:  { type: 'string', description: 'Título (o parte) de la tarjeta a mover' },
        columna_destino: { type: 'string', description: 'Nombre de la lista/columna destino' },
      },
      required: ['titulo_tarjeta', 'columna_destino'],
    },
  },
  {
    name: 'registrar_gasto',
    description: 'Registra un gasto personal en el módulo de Finanzas.',
    input_schema: {
      type: 'object',
      properties: {
        concepto:  { type: 'string', description: 'Concepto o descripción del gasto' },
        monto:     { type: 'number', description: 'Monto del gasto (número)' },
        categoria: { type: 'string', description: 'Categoría del gasto. Opcional.' },
      },
      required: ['concepto', 'monto'],
    },
  },
]

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
      `PETICIÓN: ${question.trim()}`

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM,
      tools: TOOLS,
      messages: [{ role: 'user', content: userContent }],
    })

    // ¿Decidió ejecutar una acción?
    const toolUse = message.content.find(b => b.type === 'tool_use')
    if (toolUse) {
      res.status(200).json({ action: toolUse.name, args: toolUse.input || {} })
      return
    }

    // Si no, respuesta de texto (consulta)
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
