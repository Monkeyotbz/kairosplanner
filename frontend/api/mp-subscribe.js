import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'

function mpClient() {
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
}

function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })
  if (!process.env.MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'MercadoPago no está configurado en el servidor.' })
  }

  const { userId, email, successUrl } = req.body || {}
  if (!userId || !email) return res.status(400).json({ error: 'Faltan userId o email.' })

  try {
    const pa = new PreApproval(mpClient())

    // Fecha de inicio = ahora + 5 minutos (MP requiere que sea futura)
    const start = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    const result = await pa.create({
      body: {
        reason: 'KAIROS Pro — Plan mensual',
        payer_email: email,
        back_url: successUrl,
        auto_recurring: {
          frequency:          1,
          frequency_type:     'months',
          transaction_amount: Number(process.env.MP_PLAN_AMOUNT   || 20000),
          currency_id:        process.env.MP_PLAN_CURRENCY || 'COP',
          start_date:         start,
        },
        status: 'pending',
      },
    })

    // Guardar el ID de la preaprobación para poder consultarla desde el webhook
    await supabaseAdmin()
      .from('usuarios')
      .update({ subscription_id: result.id })
      .eq('id', userId)

    res.status(200).json({ url: result.init_point })
  } catch (err) {
    console.error('[mp-subscribe]', err?.message || err)
    res.status(500).json({ error: err?.message || 'Error al crear suscripción.' })
  }
}
