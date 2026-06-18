import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic()
const MODEL = 'claude-haiku-4-5-20251001'

const SYSTEM = `Eres el agente de procesamiento de correos de KAIROS for WTW.
Tu única función es analizar un email y extraer la tarea accionable que contiene.

Responde SIEMPRE con un JSON válido con esta estructura exacta:
{
  "es_accionable": true | false,
  "titulo": "título corto y claro de la tarea (máx 80 chars)",
  "descripcion": "qué hay que hacer exactamente, en una frase",
  "prioridad": "alta" | "media" | "baja",
  "fecha_limite": "YYYY-MM-DD" | null,
  "razon_prioridad": "por qué tiene esa prioridad"
}

Criterios de prioridad:
- alta: remitente es cliente externo, hay deadline explícito hoy/mañana, dice "urgente"/"ASAP"
- media: hay deadline esta semana o es de un jefe/colega directo
- baja: FYI, sin deadline claro, info general

Si el email es solo informativo (sin acción requerida), devuelve es_accionable: false.
Nunca proceses adjuntos ni datos financieros de clientes — solo el texto del email.
Responde SOLO el JSON, sin markdown ni explicación.`

export default async function handler(req) {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const { from, subject, body, receivedAt, userId } = await req.json()

  if (!from || !subject || !userId) {
    return Response.json({ error: 'Missing required fields: from, subject, userId' }, { status: 400 })
  }

  try {
    const userPrompt = `Email recibido:
De: ${from}
Asunto: ${subject}
Fecha: ${receivedAt || new Date().toISOString()}

Cuerpo (solo texto plano):
${(body || '').slice(0, 2000)}`

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = response.content[0]?.text?.trim() || '{}'
    const analysis = JSON.parse(raw)

    if (!analysis.es_accionable) {
      return Response.json({ created: false, reason: 'Email no accionable' })
    }

    // Insertar tarea en Supabase
    const supabase = createClient(
      process.env.WTW_SUPABASE_URL,
      process.env.WTW_SUPABASE_SERVICE_KEY,
    )

    // Buscar el tablero principal del usuario (primer tablero activo)
    const { data: tableros } = await supabase
      .from('tableros_wtw')
      .select('id')
      .eq('usuario_id', userId)
      .limit(1)
      .single()

    if (!tableros) {
      return Response.json({ error: 'No se encontró tablero para el usuario' }, { status: 404 })
    }

    // Buscar la primera columna (Por hacer / To Do)
    const { data: columna } = await supabase
      .from('columnas_wtw')
      .select('id')
      .eq('tablero_id', tableros.id)
      .order('orden', { ascending: true })
      .limit(1)
      .single()

    if (!columna) {
      return Response.json({ error: 'No se encontró columna en el tablero' }, { status: 404 })
    }

    const { data: tarjeta, error: insertError } = await supabase
      .from('tarjetas_wtw')
      .insert({
        columna_id:   columna.id,
        titulo:       analysis.titulo,
        descripcion:  `${analysis.descripcion}\n\n📧 Origen: ${from}`,
        prioridad:    analysis.prioridad,
        fecha_limite: analysis.fecha_limite || null,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return Response.json({
      created:  true,
      task: {
        id:          tarjeta.id,
        titulo:      tarjeta.titulo,
        prioridad:   tarjeta.prioridad,
        fecha_limite: tarjeta.fecha_limite,
      },
    })
  } catch (err) {
    console.error('[ingest-email]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
