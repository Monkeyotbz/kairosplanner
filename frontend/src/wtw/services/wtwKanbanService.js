import { supabaseWTW } from './supabaseWTW'

export async function getBoard(userId) {
  const { data: tablero, error } = await supabaseWTW
    .from('tableros_wtw')
    .select('id, nombre')
    .eq('usuario_id', userId)
    .limit(1)
    .single()
  if (error || !tablero) return null

  const { data: columnas } = await supabaseWTW
    .from('columnas_wtw')
    .select('id, nombre, orden, color')
    .eq('tablero_id', tablero.id)
    .order('orden')

  const colIds = (columnas || []).map(c => c.id)
  const { data: tarjetas } = colIds.length
    ? await supabaseWTW
        .from('tarjetas_wtw')
        .select('id, columna_id, titulo, descripcion, prioridad, fecha_limite, created_at')
        .in('columna_id', colIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  return { tablero, columnas: columnas || [], tarjetas: tarjetas || [] }
}

export async function addCard(columnaId, { titulo, prioridad = 'media', fecha_limite = null }) {
  const { data, error } = await supabaseWTW
    .from('tarjetas_wtw')
    .insert({ columna_id: columnaId, titulo, prioridad, fecha_limite })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function moveCard(cardId, newColumnaId) {
  const { error } = await supabaseWTW
    .from('tarjetas_wtw')
    .update({ columna_id: newColumnaId })
    .eq('id', cardId)
  if (error) throw error
}

export async function deleteCard(cardId) {
  const { error } = await supabaseWTW
    .from('tarjetas_wtw')
    .delete()
    .eq('id', cardId)
  if (error) throw error
}
