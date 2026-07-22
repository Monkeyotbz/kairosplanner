import { Router } from 'express'
import 'dotenv/config'
import { supabase } from '../config/supabase.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireProjectAdmin } from '../middleware/requireProjectAdmin.js'
import { requireProjectMember } from '../middleware/requireProjectMember.js'
import {
  buildAuthUrl, exchangeCode, clientForConnection, getAccountEmail,
  signState, verifyState, stopChannel, revokeToken,
} from '../services/googleCalendarClient.js'
import { reconcile, registerWatchChannel } from '../services/googleCalendarSync.js'

const router = Router()
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

router.get('/:proyectoId/oauth/start', requireAuth, requireProjectAdmin, (req, res) => {
  const state = signState({
    proyectoId: req.params.proyectoId,
    usuarioId: req.usuario.id,
    nonce: Math.random().toString(36).slice(2),
    exp: Date.now() + 10 * 60_000,
  })
  res.json({ authUrl: buildAuthUrl(state) })
})

router.get('/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query

  if (error) {
    return res.redirect(`${FRONTEND_URL}/calendar?google_calendar=error&reason=${encodeURIComponent(String(error))}`)
  }

  const payload = verifyState(state)
  if (!payload) {
    return res.redirect(`${FRONTEND_URL}/calendar?google_calendar=error&reason=invalid_state`)
  }

  try {
    const tokens = await exchangeCode(code)
    if (!tokens.refresh_token) {
      // Pasa si el usuario ya había autorizado esta app antes y Google
      // no reemitió un refresh_token nuevo (no debería pasar gracias a
      // prompt=consent, pero se cubre por las dudas).
      return res.redirect(`${FRONTEND_URL}/calendar?google_calendar=error&reason=no_refresh_token`)
    }

    const tempClient = clientForConnection({ refresh_token: tokens.refresh_token, access_token: tokens.access_token })
    const email = await getAccountEmail(tempClient)

    const { data: conexion, error: dbError } = await supabase
      .from('google_calendar_conexiones')
      .upsert({
        proyecto_id: payload.proyectoId,
        google_calendar_id: 'primary',
        google_account_email: email,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        access_token_expira: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        estado: 'activo',
        ultimo_error: null,
        creado_por: payload.usuarioId,
      }, { onConflict: 'proyecto_id' })
      .select()
      .single()
    if (dbError) throw dbError

    await reconcile(conexion)
    // El canal de tiempo real es "mejor esfuerzo": si falla (ej. no hay
    // GOOGLE_WEBHOOK_BASE_URL público todavía, como en desarrollo local
    // sin ngrok), la conexión sigue siendo válida — solo falta la parte
    // en vivo. No debe tumbar la conexión que sí funcionó.
    try { await registerWatchChannel(conexion) }
    catch (watchErr) { console.error('No se pudo registrar el canal en tiempo real (no bloqueante):', watchErr.message || watchErr) }

    return res.redirect(`${FRONTEND_URL}/calendar?google_calendar=connected`)
  } catch (err) {
    console.error('Error en Google Calendar OAuth callback:', err.message || err)
    return res.redirect(`${FRONTEND_URL}/calendar?google_calendar=error&reason=server_error`)
  }
})

router.post('/webhook', async (req, res) => {
  // Responder rápido siempre — Google reintenta con backoff si no
  // recibe 200, así que cualquier payload desconocido/no válido se
  // reconoce y se descarta sin generar reintentos.
  res.status(200).end()

  const channelId = req.header('X-Goog-Channel-ID')
  const resourceState = req.header('X-Goog-Resource-State')
  const channelToken = req.header('X-Goog-Channel-Token')
  if (!channelId || resourceState === 'sync') return // mensaje de confirmación al crear el canal, ignorar

  try {
    const { data: conexion } = await supabase
      .from('google_calendar_conexiones')
      .select('*')
      .eq('channel_id', channelId)
      .maybeSingle()
    if (!conexion || conexion.channel_token !== channelToken) return // canal desconocido o token no coincide

    await reconcile(conexion)
  } catch (err) {
    console.error('Error procesando webhook de Google Calendar:', err.message || err)
  }
})

router.get('/:proyectoId/status', requireAuth, requireProjectMember, async (req, res) => {
  const { data } = await supabase
    .from('google_calendar_conexiones')
    .select('google_account_email, google_calendar_id, estado, ultimo_error, ultima_sync_at, creado_at')
    .eq('proyecto_id', req.params.proyectoId)
    .maybeSingle()
  res.json({ conectado: !!data, conexion: data || null })
})

router.post('/:proyectoId/sync-now', requireAuth, requireProjectAdmin, async (req, res) => {
  const { data: conexion, error } = await supabase
    .from('google_calendar_conexiones')
    .select('*')
    .eq('proyecto_id', req.params.proyectoId)
    .maybeSingle()
  if (error || !conexion) return res.status(404).json({ error: 'No hay una conexión de Google Calendar para este proyecto' })

  try {
    await reconcile(conexion)
  } catch (err) {
    return res.status(502).json({ error: err.message || 'No se pudo sincronizar con Google Calendar' })
  }

  // Igual que en oauth/callback: el canal en tiempo real es "mejor
  // esfuerzo", no debe hacer fallar un sync manual que sí funcionó.
  if (!conexion.channel_id || !conexion.channel_expira || new Date(conexion.channel_expira) < new Date()) {
    try { await registerWatchChannel(conexion) }
    catch (watchErr) { console.error('No se pudo registrar el canal en tiempo real (no bloqueante):', watchErr.message || watchErr) }
  }

  res.json({ ok: true })
})

router.delete('/:proyectoId', requireAuth, requireProjectAdmin, async (req, res) => {
  const { data: conexion } = await supabase
    .from('google_calendar_conexiones')
    .select('*')
    .eq('proyecto_id', req.params.proyectoId)
    .maybeSingle()
  if (!conexion) return res.status(404).json({ error: 'No hay conexión que desconectar' })

  try {
    const oauthClient = clientForConnection(conexion)
    if (conexion.channel_id && conexion.resource_id) {
      await stopChannel(oauthClient, { channelId: conexion.channel_id, resourceId: conexion.resource_id }).catch(() => {})
    }
    await revokeToken(oauthClient).catch(() => {}) // si ya estaba revocado por el usuario, ignorar
  } finally {
    await supabase.from('google_calendar_conexiones').delete().eq('proyecto_id', req.params.proyectoId)
  }
  res.json({ ok: true })
})

export default router
