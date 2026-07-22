import crypto from 'crypto'
import { supabase } from '../config/supabase.js'
import { clientForConnection, listEvents, watchCalendar, randomToken } from './googleCalendarClient.js'
import { emitToBoard } from '../socketBus.js'

// Convierte un evento de la Google Calendar API a una fila de
// eventos_calendario. Los eventos "de todo el día" vienen con
// {date: 'YYYY-MM-DD'} en vez de {dateTime: ISO} — se representan
// como medianoche a medianoche del día siguiente.
function mapEventToRow(proyectoId, gEvent) {
  const start = gEvent.start?.dateTime || (gEvent.start?.date ? `${gEvent.start.date}T00:00:00` : null)
  const endRaw = gEvent.end?.dateTime || (gEvent.end?.date ? `${gEvent.end.date}T00:00:00` : null)
  return {
    proyecto_id: proyectoId,
    titulo: gEvent.summary || '(sin título)',
    fecha_inicio: start,
    fecha_fin: endRaw,
    tipo: 'evento',
    origen: 'google',
    google_event_id: gEvent.id,
    google_etag: gEvent.etag || null,
  }
}

async function persistConexion(conexionId, fields) {
  await supabase
    .from('google_calendar_conexiones')
    .update({ ...fields, actualizado_at: new Date().toISOString() })
    .eq('id', conexionId)
}

async function deleteByGoogleIds(proyectoId, googleEventIds) {
  if (!googleEventIds.length) return
  await supabase
    .from('eventos_calendario')
    .delete()
    .eq('proyecto_id', proyectoId)
    .in('google_event_id', googleEventIds)
}

async function upsertEvents(proyectoId, events) {
  if (!events.length) return
  const rows = events.map((e) => mapEventToRow(proyectoId, e))
  const { error } = await supabase
    .from('eventos_calendario')
    .upsert(rows, { onConflict: 'proyecto_id,google_event_id' })
  if (error) throw error
}

// Reemplaza TODO el estado de eventos_calendario (origen=google) de
// este proyecto por lo que Google devuelve ahora mismo. Se usa en la
// primera sincronización tras conectar, y como fallback cuando el
// syncToken guardado ya no es válido (Google responde 410).
async function fullResync(conexion, oauthClient) {
  const { events, nextSyncToken } = await listEvents(oauthClient, {
    calendarId: conexion.google_calendar_id,
  })
  const vigentes = events.filter((e) => e.status !== 'cancelled')
  await upsertEvents(conexion.proyecto_id, vigentes)

  const idsVigentes = vigentes.map((e) => e.id)
  let borrarQuery = supabase
    .from('eventos_calendario')
    .delete()
    .eq('proyecto_id', conexion.proyecto_id)
    .eq('origen', 'google')
  if (idsVigentes.length) borrarQuery = borrarQuery.not('google_event_id', 'in', `(${idsVigentes.join(',')})`)
  await borrarQuery

  return nextSyncToken
}

// Reconciliación incremental: trae solo lo que cambió desde el
// último sync_token guardado. Si Google dice que el token ya no
// sirve (410), cae a fullResync. Se usa tanto desde el webhook como
// desde el botón "Sincronizar ahora" y desde el job de renovación.
export async function reconcile(conexion) {
  let refreshedTokens = null
  const oauthClient = clientForConnection(conexion, (tokens) => { refreshedTokens = tokens })

  try {
    let nextSyncToken
    if (conexion.sync_token) {
      try {
        const { events, nextSyncToken: token } = await listEvents(oauthClient, {
          calendarId: conexion.google_calendar_id,
          syncToken: conexion.sync_token,
        })
        const cancelados = events.filter((e) => e.status === 'cancelled').map((e) => e.id)
        const vigentes = events.filter((e) => e.status !== 'cancelled')
        await deleteByGoogleIds(conexion.proyecto_id, cancelados)
        await upsertEvents(conexion.proyecto_id, vigentes)
        nextSyncToken = token
      } catch (err) {
        if (err?.code === 410 || err?.response?.status === 410) {
          nextSyncToken = await fullResync(conexion, oauthClient)
        } else {
          throw err
        }
      }
    } else {
      nextSyncToken = await fullResync(conexion, oauthClient)
    }

    await persistConexion(conexion.id, {
      sync_token: nextSyncToken || conexion.sync_token,
      ultima_sync_at: new Date().toISOString(),
      estado: 'activo',
      ultimo_error: null,
      ...(refreshedTokens?.access_token ? {
        access_token: refreshedTokens.access_token,
        access_token_expira: refreshedTokens.expiry_date ? new Date(refreshedTokens.expiry_date).toISOString() : null,
      } : {}),
    })

    // Avisa en vivo a quien tenga el calendario de este proyecto
    // abierto — así no hace falta recargar la página para ver lo
    // que se acaba de traer de Google.
    emitToBoard(conexion.proyecto_id, 'calendar:synced', { at: new Date().toISOString() })
  } catch (err) {
    const revocado = err?.message?.includes('invalid_grant')
    await persistConexion(conexion.id, {
      estado: revocado ? 'revocado' : 'error',
      ultimo_error: err?.message || String(err),
    })
    throw err
  }
}

// Registra (o renueva) el canal de notificaciones push de Google para
// esta conexión. Google cappea la expiración a un máximo (~7 días
// para el recurso "events"), así que esto se vuelve a llamar tanto
// al conectar como periódicamente desde el job de renovación.
export async function registerWatchChannel(conexion) {
  const oauthClient = clientForConnection(conexion)
  const channelId = crypto.randomUUID()
  const channelToken = randomToken()
  const webhookUrl = `${process.env.GOOGLE_WEBHOOK_BASE_URL}/api/google-calendar/webhook`

  const { resourceId, expiration } = await watchCalendar(oauthClient, {
    calendarId: conexion.google_calendar_id,
    channelId,
    channelToken,
    webhookUrl,
  })

  await persistConexion(conexion.id, {
    channel_id: channelId,
    resource_id: resourceId,
    channel_token: channelToken,
    channel_expira: expiration ? expiration.toISOString() : null,
  })
}
