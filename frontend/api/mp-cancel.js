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

  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'Falta userId.' })

  try {
    const supabase = supabaseAdmin()
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('subscription_id')
      .eq('id', userId)
      .single()

    if (!usuario?.subscription_id) {
      return res.status(400).json({ error: 'No se encontró suscripción activa.' })
    }

    const pa = new PreApproval(mpClient())
    await pa.update({
      id:   usuario.subscription_id,
      body: { status: 'cancelled' },
    })

    await supabase
      .from('usuarios')
      .update({ subscription_status: 'canceled' })
      .eq('id', userId)

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('[mp-cancel]', err?.message || err)
    res.status(500).json({ error: err?.message || 'Error al cancelar suscripción.' })
  }
}
