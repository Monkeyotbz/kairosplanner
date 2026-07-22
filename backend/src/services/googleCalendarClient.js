import { google } from 'googleapis'
import crypto from 'crypto'
import 'dotenv/config'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email', // solo para mostrar "conectado a X" en la UI
]

function newOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  )
}

// Paso 1 del login: URL de consentimiento. access_type=offline + prompt=consent
// son obligatorios para garantizar que Google entregue un refresh_token cada vez
// (sin access_type=offline no hay refresh_token; sin prompt=consent, Google solo
// lo entrega la primera vez que esa cuenta autoriza esta app).
export function buildAuthUrl(state) {
  const client = newOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  })
}

// Paso 2: intercambia el `code` del callback por tokens.
export async function exchangeCode(code) {
  const client = newOAuthClient()
  const { tokens } = await client.getToken(code)
  return tokens // { access_token, refresh_token, expiry_date, ... }
}

// Cliente autenticado para una conexión guardada. Si el access_token
// se refresca durante la llamada, onTokenRefresh recibe los tokens
// nuevos para que el caller los persista (mismo espíritu que
// `_doRefresh()` en frontend/src/services/spotifyService.js, pero
// server-side y con refresh_token de Google en vez de PKCE).
export function clientForConnection(conexion, onTokenRefresh) {
  const client = newOAuthClient()
  client.setCredentials({
    refresh_token: conexion.refresh_token,
    access_token: conexion.access_token,
    expiry_date: conexion.access_token_expira ? new Date(conexion.access_token_expira).getTime() : undefined,
  })
  if (onTokenRefresh) {
    client.on('tokens', (tokens) => onTokenRefresh(tokens))
  }
  return client
}

export async function getAccountEmail(oauthClient) {
  const oauth2 = google.oauth2({ auth: oauthClient, version: 'v2' })
  const { data } = await oauth2.userinfo.get()
  return data.email
}

function calendarApi(oauthClient) {
  return google.calendar({ version: 'v3', auth: oauthClient })
}

// Registra un canal de notificaciones push (events.watch). Google
// cappea la expiración a un máximo (~7 días para el recurso "events").
export async function watchCalendar(oauthClient, { calendarId, channelId, channelToken, webhookUrl }) {
  const { data } = await calendarApi(oauthClient).events.watch({
    calendarId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token: channelToken,
    },
  })
  return { resourceId: data.resourceId, expiration: data.expiration ? new Date(Number(data.expiration)) : null }
}

export async function stopChannel(oauthClient, { channelId, resourceId }) {
  await calendarApi(oauthClient).channels.stop({ requestBody: { id: channelId, resourceId } })
}

// Lista eventos desde el último syncToken (incremental). Si Google
// responde 410 (token vencido), el caller debe reintentar sin
// syncToken (full resync) — se re-lanza el error tal cual para que
// el llamador distinga ese caso por el status code.
export async function listEvents(oauthClient, { calendarId, syncToken }) {
  const events = []
  let pageToken
  let nextSyncToken

  do {
    const { data } = await calendarApi(oauthClient).events.list({
      calendarId,
      syncToken: syncToken || undefined,
      singleEvents: true, // expande recurrencias a instancias individuales
      pageToken,
      ...(syncToken ? {} : { timeMin: new Date().toISOString() }), // full sync: solo desde hoy hacia adelante
    })
    events.push(...(data.items || []))
    pageToken = data.nextPageToken
    if (data.nextSyncToken) nextSyncToken = data.nextSyncToken
  } while (pageToken)

  return { events, nextSyncToken }
}

export function randomToken() {
  return crypto.randomBytes(24).toString('hex')
}

// Firma el `state` del OAuth para que el callback pueda confiar en el
// proyectoId que trae — sin esto, cualquiera podría fabricar un state
// con el proyectoId de otra persona y asociarle su propia cuenta de
// Google al conectar.
function stateSecret() {
  return process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.GOOGLE_CLIENT_SECRET
}

export function signState(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyState(state) {
  const [body, sig] = String(state || '').split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  if (payload.exp && Date.now() > payload.exp) return null
  return payload
}

export async function revokeToken(oauthClient) {
  await oauthClient.revokeCredentials()
}
