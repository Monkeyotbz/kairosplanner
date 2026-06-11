import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()
const MODEL = 'claude-haiku-4-5-20251001'

const SYSTEM = `Eres ABAD, el asistente de inteligencia de KAIROS, una app de productividad
personal basada en la filosofía griega del Kairós (el momento oportuno).

Puedes hacer dos cosas:
1) RESPONDER consultas sobre los datos del usuario (tareas, vencimientos, enfoque, rango,
   finanzas, presupuestos mensuales, gastos por categoría).
   En español, breve y cálido (1-3 frases).
2) EJECUTAR acciones con las herramientas disponibles: crear tarjetas, mover tarjetas,
   registrar gastos e ingresos personales.

Reglas:
- Si el usuario pide CREAR/MOVER una tarjeta o REGISTRAR un gasto/ingreso, usa la herramienta.
- Para fechas relativas ("mañana", "el viernes", "en 3 días") calcula la fecha real en YYYY-MM-DD
  usando "fecha_hoy" del contexto.
- Usa nombres EXACTOS de columnas y miembros del contexto cuando existan.
- Para preguntas sobre presupuesto usa los campos "presupuestos" del contexto:
  cada ítem tiene {categoria, limite, gastado, pct, estado} donde estado es 'ok' (<75%),
  'warn' (75-99%) u 'over' (>=100%).
- Si solo es una pregunta, responde con texto sin herramientas.
- No inventes datos que no estén en el contexto.`

const TOOLS = [
  {
    name: 'crear_tarjeta',
    description: 'Crea una nueva tarjeta/tarea en el tablero Kanban.',
    input_schema: {
      type: 'object',
      properties: {
        titulo:       { type: 'string', description: 'Título de la tarjeta' },
        columna:      { type: 'string', description: 'Nombre de la lista/columna destino. Opcional.' },
        prioridad:    { type: 'string', enum: ['baja', 'normal', 'alta'] },
        fecha_limite: { type: 'string', description: 'Fecha límite YYYY-MM-DD. Opcional.' },
        descripcion:  { type: 'string', description: 'Detalles de la tarjeta. Opcional.' },
        subtareas:    { type: 'array', items: { type: 'string' } },
        participante: { type: 'string', description: 'Nombre del miembro a asignar. Opcional.' },
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
        concepto:  { type: 'string', description: 'Concepto del gasto' },
        monto:     { type: 'number', description: 'Monto del gasto' },
        categoria: { type: 'string', description: 'Categoría. Opcional.' },
      },
      required: ['concepto', 'monto'],
    },
  },
  {
    name: 'registrar_ingreso',
    description: 'Registra un ingreso personal en el módulo de Finanzas.',
    input_schema: {
      type: 'object',
      properties: {
        concepto:  { type: 'string', description: 'Concepto del ingreso' },
        monto:     { type: 'number', description: 'Monto del ingreso' },
        categoria: { type: 'string', description: 'Categoría. Opcional.' },
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
    const { question, context, history = [] } = req.body || {}
    if (!question || !question.trim()) {
      res.status(400).json({ error: 'Falta la pregunta.' })
      return
    }

    // Construir array de mensajes multi-turn.
    // El historial llega como [{role: 'user'|'abad', text: '...'}].
    // Necesitamos que empiece con un turno 'user'; descartamos mensajes ABAD al inicio.
    const claudeMessages = []
    let histStart = 0
    while (histStart < history.length && history[histStart].role !== 'user') histStart++

    for (const msg of history.slice(histStart)) {
      claudeMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text,
      })
    }

    // Pregunta actual con contexto fresco siempre en el último turno
    claudeMessages.push({
      role: 'user',
      content: `CONTEXTO del usuario (JSON):\n${JSON.stringify(context ?? {}, null, 2)}\n\nPETICIÓN: ${question.trim()}`,
    })

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM,
      tools: TOOLS,
      messages: claudeMessages,
    })

    const toolUse = message.content.find(b => b.type === 'tool_use')
    if (toolUse) {
      res.status(200).json({ action: toolUse.name, args: toolUse.input || {} })
      return
    }

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
