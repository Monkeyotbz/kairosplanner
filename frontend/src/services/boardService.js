import { supabase } from './supabase'

export async function getMyBoard() {
  const { data: membership } = await supabase
    .from('miembros')
    .select('proyecto_id, proyectos(id, nombre)')
    .limit(1)
    .single()

  if (!membership) return null

  const { data: board } = await supabase
    .from('tableros')
    .select('*')
    .eq('proyecto_id', membership.proyecto_id)
    .order('orden')
    .limit(1)
    .single()

  if (!board) return null

  const { data: columns } = await supabase
    .from('columnas')
    .select('*')
    .eq('tablero_id', board.id)
    .order('orden')

  if (!columns?.length) return { proyecto: membership.proyectos, board, columns: [], cards: [] }

  const { data: rawCards } = await supabase
    .from('tarjetas')
    .select('id, columna_id, titulo, prioridad, fecha_limite, cover_url, orden, tarjeta_etiqueta(etiquetas(id, nombre, color))')
    .in('columna_id', columns.map(c => c.id))
    .order('orden')

  const cards = (rawCards || []).map(card => ({
    ...card,
    labels: (card.tarjeta_etiqueta || []).map(te => te.etiquetas).filter(Boolean),
  }))

  return { proyecto: membership.proyectos, board, columns, cards }
}

export async function updateCardColumn(cardId, columnId) {
  const { error } = await supabase
    .from('tarjetas')
    .update({ columna_id: columnId })
    .eq('id', cardId)
  if (error) throw error
}

export async function getActiveFrase() {
  const { data } = await supabase
    .from('frases_dia')
    .select('contenido, autor')
    .eq('activa', true)
    .limit(1)
    .single()
  return data
}

export async function getActivePlaylist() {
  const { data } = await supabase
    .from('playlists')
    .select('nombre, plataforma, url_externa')
    .eq('activa', true)
    .limit(1)
    .single()
  return data
}
