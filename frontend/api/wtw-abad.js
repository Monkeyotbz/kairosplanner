import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()
const MODEL = 'claude-haiku-4-5-20251001'

const SYSTEM = `Eres ABAD, el asistente de inteligencia de KAIROS for WTW.
Apoyas a Gabriel Carvajal en su rol de operaciones en Willis Towers Watson Colombia.

Puedes hacer dos cosas:
1) RESPONDER consultas sobre sus tareas, reuniones, colegas y operaciones WTW. En español, breve y directo (1-3 frases).
2) EJECUTAR acciones con las herramientas disponibles: crear tareas, mover tareas en el tablero.

Reglas:
- Si el usuario pide CREAR o MOVER una tarea, usa la herramienta correspondiente.
- Para fechas relativas ("mañana", "el viernes") calcula la fecha real en YYYY-MM-DD usando "fecha_hoy" del contexto.
- Usa nombres EXACTOS de columnas del contexto cuando existan.
- El contexto incluye el tablero WTW completo (columnas + tarjetas) y las próximas reuniones de Outlook.
- Para preguntas sobre reuniones usa el campo "reuniones" del contexto.
- Si solo es una pregunta, responde con texto sin herramientas.
- No inventes datos que no estén en el contexto.
- Cuando hables de prioridad usa: alta, media, baja.`

const TOOLS = [
  {
    name: 'crear_tarea',
    description: 'Crea una nueva tarea en el tablero WTW.',
    input_schema: {
      type: 'object',
      properties: {
        titulo:       { type: 'string', description: 'Título de la tarea' },
        columna:      { type: 'string', description: 'Nombre de la columna destino. Opcional, default: primera columna.' },
        prioridad:    { type: 'string', enum: ['alta', 'media', 'baja'] },
        fecha_limite: { type: 'string', description: 'Fecha límite YYYY-MM-DD. Opcional.' },
      },
      required: ['titulo'],
    },
  },
  {
    name: 'mover_tarea',
    description: 'Mueve una tarea existente a otra columna del tablero WTW.',
    input_schema: {
      type: 'object',
      properties: {
        titulo_tarea:    { type: 'string', description: 'Título o parte del título de la tarea a mover' },
        columna_destino: { type: 'string', description: 'Nombre de la columna destino' },
      },
      required: ['titulo_tarea', 'columna_destino'],
    },
  },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }
  if (!process.env.ANTHROPIC_API_KEY) { res.status(500).json({ error: 'Falta ANTHROPIC_API_KEY' }); return }

  try {
    const { question, context, history = [] } = req.body || {}
    if (!question?.trim()) { res.status(400).json({ error: 'Falta la pregunta.' }); return }

    const claudeMessages = []
    let histStart = 0
    while (histStart < history.length && history[histStart].role !== 'user') histStart++

    let pendingToolResult = null
    for (const msg of history.slice(histStart)) {
      if (msg.toolMeta?.toolUseId) {
        claudeMessages.push({ role: 'assistant', content: [{ type: 'tool_use', id: msg.toolMeta.toolUseId, name: msg.toolMeta.actionName, input: msg.toolMeta.actionArgs || {} }] })
        pendingToolResult = { tool_use_id: msg.toolMeta.toolUseId, content: msg.text }
      } else if (pendingToolResult) {
        if (msg.role === 'user') {
          claudeMessages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: pendingToolResult.tool_use_id, content: pendingToolResult.content }, { type: 'text', text: msg.text }] })
        } else {
          claudeMessages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: pendingToolResult.tool_use_id, content: pendingToolResult.content }] })
          claudeMessages.push({ role: 'assistant', content: msg.text })
        }
        pendingToolResult = null
      } else {
        claudeMessages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text })
      }
    }

    const currentContent = `CONTEXTO WTW (JSON):\n${JSON.stringify(context ?? {}, null, 2)}\n\nPETICIÓN: ${question.trim()}`
    if (pendingToolResult) {
      claudeMessages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: pendingToolResult.tool_use_id, content: pendingToolResult.content }, { type: 'text', text: currentContent }] })
    } else {
      claudeMessages.push({ role: 'user', content: currentContent })
    }

    const message = await client.messages.create({ model: MODEL, max_tokens: 600, system: SYSTEM, tools: TOOLS, messages: claudeMessages })

    const toolUse = message.content.find(b => b.type === 'tool_use')
    if (toolUse) { res.status(200).json({ action: toolUse.name, args: toolUse.input || {}, toolUseId: toolUse.id }); return }

    const answer = message.content.filter(b => b.type === 'text').map(b => b.text).join(' ').trim()
    res.status(200).json({ answer })
  } catch (err) {
    console.error('[wtw-abad]', err?.message || err)
    res.status(500).json({ error: err?.message || 'Error del asistente.' })
  }
}
