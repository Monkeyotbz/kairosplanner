import { supabase } from '../config/supabase.js'
import { registerWatchChannel } from '../services/googleCalendarSync.js'

const CHECK_EVERY_MS = 60 * 60_000 // cada hora
const RENEW_WITHIN_MS = 24 * 60 * 60_000 // renueva lo que expire en <24h (o ya expiró)

async function tick() {
  const cutoff = new Date(Date.now() + RENEW_WITHIN_MS).toISOString()
  const { data: conexiones, error } = await supabase
    .from('google_calendar_conexiones')
    .select('*')
    .eq('estado', 'activo')
    .or(`channel_expira.is.null,channel_expira.lt.${cutoff}`)
  if (error) { console.error('Error buscando canales de Google Calendar por renovar:', error); return }

  for (const conexion of conexiones || []) {
    try {
      await registerWatchChannel(conexion)
      console.log(`Canal de Google Calendar renovado para proyecto ${conexion.proyecto_id}`)
    } catch (err) {
      console.error(`No se pudo renovar el canal del proyecto ${conexion.proyecto_id}:`, err.message || err)
    }
  }
}

// Self-healing: si el proceso estuvo caído y algún canal expiró sin
// renovarse, el próximo tick (a más tardar 1h después de levantar) lo
// vuelve a registrar solo. No requiere intervención manual.
export function startRenewGoogleChannelsJob() {
  tick()
  setInterval(tick, CHECK_EVERY_MS)
}
