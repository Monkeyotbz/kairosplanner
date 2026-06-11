import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'

function mpClient() {
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
}

function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// Mapea estados de MercadoPago a los que guardamos en Supabase
function normalizeStatus(mpStatus) {
  const map = {
    authorized: 'active',
    paused:     'past_due',
    cancelled:  'canceled',
    // 'pending' se ignora — el usuario todavía no completó el pago
  }
  return map[mpStatus] ?? null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Seguridad: secreto en query param configurado en el dashboard de MP
  const { secret, type, data } = { ...req.query, ...req.body }
  if (!secret || secret !== process.env.MP_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Solo procesamos eventos de suscripción
  if (type === 'subscription_preapproval' && data?.id) {
    try {
      const pa          = new PreApproval(mpClient())
      const preapproval = await pa.get({ id: data.id })
      const newStatus   = normalizeStatus(preapproval.status)

      if (newStatus !== null) {
        const supabase = supabaseAdmin()
        const { error } = await supabase
          .from('usuarios')
          .update({ subscription_status: newStatus })
          .eq('subscription_id', data.id)

        if (error) console.error('[mp-webhook] supabase error:', error.message)
        else console.log(`[mp-webhook] ${data.id} → ${newStatus}`)
      }
    } catch (err) {
      console.error('[mp-webhook]', err?.message || err)
    }
  }

  // MercadoPago espera siempre un 200 para no reintentar
  res.status(200).json({ received: true })
}
