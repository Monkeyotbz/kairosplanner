import { supabase } from './supabase'

const EVENT_SELECT = 'id, proyecto_id, tarjeta_id, subtarea_id, titulo, fecha_inicio, fecha_fin, tipo'

// ── Eventos de calendario (time-blocking) ────────────────────

// Eventos cuyo inicio cae en [fromISO, toISO)
export async function getEventos(proyectoId, fromISO, toISO) {
  const { data, error } = await supabase
    .from('eventos_calendario')
    .select(EVENT_SELECT)
    .eq('proyecto_id', proyectoId)
    .gte('fecha_inicio', fromISO)
    .lt('fecha_inicio', toISO)
    .order('fecha_inicio')
  if (error) throw error
  return data || []
}

export async function createEvento({ proyecto_id, tarjeta_id = null, subtarea_id = null, titulo, fecha_inicio, fecha_fin, tipo = 'tarea' }) {
  const { data, error } = await supabase
    .from('eventos_calendario')
    .insert({ proyecto_id, tarjeta_id, subtarea_id, titulo, fecha_inicio, fecha_fin, tipo })
    .select(EVENT_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updateEvento(id, fields) {
  const { data, error } = await supabase
    .from('eventos_calendario')
    .update(fields)
    .eq('id', id)
    .select(EVENT_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function deleteEvento(id) {
  const { error } = await supabase.from('eventos_calendario').delete().eq('id', id)
  if (error) throw error
}
