import { supabase } from './supabase'

const TRIAL_DAYS = 14

export async function getSubscriptionInfo() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('usuarios')
    .select('subscription_status, subscription_id')
    .eq('id', user.id)
    .single()

  const createdAt     = new Date(user.created_at)
  const now           = new Date()
  const daysSince     = (now - createdAt) / (1000 * 60 * 60 * 24)
  const trialDaysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - daysSince))

  const dbStatus = profile?.subscription_status ?? null

  let status
  if (dbStatus === 'active') {
    status = 'active'
  } else if (dbStatus === 'past_due') {
    status = 'past_due'
  } else if (dbStatus === 'canceled') {
    status = 'canceled'
  } else if (trialDaysLeft > 0) {
    status = 'trialing'
  } else {
    status = 'expired'
  }

  return {
    status,           // 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
    trialDaysLeft,
    subscriptionId:   profile?.subscription_id ?? null,
    isActive:         status === 'active' || status === 'trialing',
    userId:           user.id,
    email:            user.email,
  }
}

export async function createSubscription() {
  const info = await getSubscriptionInfo()
  if (!info) throw new Error('No autenticado')

  const res = await fetch('/api/mp-subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId:     info.userId,
      email:      info.email,
      successUrl: window.location.origin + '/billing-success',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Error al crear suscripción')
  return data.url
}

export async function cancelSubscription() {
  const info = await getSubscriptionInfo()
  if (!info) throw new Error('No autenticado')

  const res = await fetch('/api/mp-cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: info.userId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Error al cancelar')
  return true
}
