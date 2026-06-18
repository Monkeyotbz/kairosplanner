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
   agregar subtareas a tarjetas existentes, registrar gastos e ingresos personales.

Reglas:
- Si el usuario pide CREAR/MOVER una tarjeta o AGREGAR una subtarea o REGISTRAR un gasto/ingreso, usa la herramienta.
- Para agregar una subtarea a una tarjeta que ACABAS DE CREAR en este mismo chat, usa "agregar_subtarea" con el título exacto que usaste al crearla.
- Para fechas relativas ("mañana", "el viernes", "en 3 días") calcula la fecha real en YYYY-MM-DD
  usando "fecha_hoy" del contexto.
- Usa nombres EXACTOS de columnas y miembros del contexto cuando existan.
- El contexto incluye "tablero_actual" con TODAS las tarjetas del tablero por columna (sin filtro de fecha).
  Úsalo para buscar tarjetas por nombre antes de usar una herramienta.
- Para preguntas sobre presupuesto usa los campos "presupuestos" del contexto:
  cada ítem tiene {categoria, limite, gastado, pct, estado} donde estado es 'ok' (<75%),
  'warn' (75-99%) u 'over' (>=100%).
- Si solo es una pregunta, responde con texto sin herramientas.
- No inventes datos que no estén en el contexto o el historial de esta conversación.`

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
    name: 'agregar_subtarea',
    description: 'Agrega una subtarea a una tarjeta existente en el tablero.',
    input_schema: {
      type: 'object',
      properties: {
        titulo_tarjeta: { type: 'string', description: 'Título (o parte) de la tarjeta existente' },
        subtarea:       { type: 'string', description: 'Texto de la nueva subtarea' },
      },
      required: ['titulo_tarjeta', 'subtarea'],
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

    // Construir array de mensajes multi-turn con soporte para tool_use/tool_result.
    // Los mensajes normales: {role: 'user'|'abad', text: '...'}.
    // Los mensajes de herramienta: {role: 'abad', text: '...', toolMeta: {toolUseId, actionName, actionArgs}}.
    // toolMeta se reconstruye como el par correcto assistant(tool_use) + user(tool_result).
    const claudeMessages = []
    let histStart = 0
    while (histStart < history.length && history[histStart].role !== 'user') histStart++

    let pendingToolResult = null

    for (const msg of history.slice(histStart)) {
      if (msg.toolMeta?.toolUseId) {
        // Reconstruir el par tool_use → tool_result
        claudeMessages.push({
          role: 'assistant',
          content: [{
            type: 'tool_use',
            id: msg.toolMeta.toolUseId,
            name: msg.toolMeta.actionName,
            input: msg.toolMeta.actionArgs || {},
          }],
        })
        pendingToolResult = { tool_use_id: msg.toolMeta.toolUseId, content: msg.text }
      } else if (pendingToolResult) {
        // El siguiente mensaje (usuario) después de un tool_result:
        // combinarlos en un solo turno user para mantener alternancia correcta.
        if (msg.role === 'user') {
          claudeMessages.push({
            role: 'user',
            content: [
              { type: 'tool_result', tool_use_id: pendingToolResult.tool_use_id, content: pendingToolResult.content },
              { type: 'text', text: msg.text },
            ],
          })
        } else {
          claudeMessages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: pendingToolResult.tool_use_id, content: pendingToolResult.content }] })
          claudeMessages.push({ role: 'assistant', content: msg.text })
        }
        pendingToolResult = null
      } else {
        claudeMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text,
        })
      }
    }

    // Pregunta actual con contexto fresco — si hay un tool_result pendiente, combinarlo
    const currentContent = `CONTEXTO del usuario (JSON):\n${JSON.stringify(context ?? {}, null, 2)}\n\nPETICIÓN: ${question.trim()}`
    if (pendingToolResult) {
      claudeMessages.push({
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: pendingToolResult.tool_use_id, content: pendingToolResult.content },
          { type: 'text', text: currentContent },
        ],
      })
    } else {
      claudeMessages.push({ role: 'user', content: currentContent })
    }

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM,
      tools: TOOLS,
      messages: claudeMessages,
    })

    const toolUse = message.content.find(b => b.type === 'tool_use')
    if (toolUse) {
      res.status(200).json({ action: toolUse.name, args: toolUse.input || {}, toolUseId: toolUse.id })
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
