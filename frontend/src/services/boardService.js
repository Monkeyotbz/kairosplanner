import { supabase } from './supabase'

const CARD_SELECT = 'id, columna_id, titulo, descripcion, prioridad, fecha_limite, cover_url, orden, tarjeta_etiqueta(etiquetas(id, nombre, color))'

function mapCards(rawCards) {
  return (rawCards || []).map(card => ({
    ...card,
    labels: (card.tarjeta_etiqueta || []).map(te => te.etiquetas).filter(Boolean),
  }))
}

// ── Proyectos ────────────────────────────────────────────────
export async function getMisProyectos() {
  const { data } = await supabase
    .from('miembros')
    .select('rol, proyectos(id, nombre, descripcion)')
  return (data || []).map(m => ({ ...m.proyectos, rol: m.rol })).filter(Boolean)
}

export async function createProject({ nombre, descripcion = '' }) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: proyecto, error: pe } = await supabase
    .from('proyectos')
    .insert({ nombre, descripcion, creado_por: user.id })
    .select().single()
  if (pe) throw pe

  await supabase.from('miembros').insert({ proyecto_id: proyecto.id, usuario_id: user.id, rol: 'admin' })

  const { data: board } = await supabase
    .from('tableros')
    .insert({ proyecto_id: proyecto.id, nombre: 'Tablero Principal', orden: 0 })
    .select().single()

  await supabase.from('columnas').insert([
    { tablero_id: board.id, nombre: 'Backlog',      orden: 0, color: '#B4B2A9' },
    { tablero_id: board.id, nombre: 'En progreso',  orden: 1, color: '#378ADD' },
    { tablero_id: board.id, nombre: 'Revisión',     orden: 2, color: '#EF9F27' },
    { tablero_id: board.id, nombre: 'Hecho',        orden: 3, color: '#639922' },
  ])

  return proyecto
}

export async function searchUsuarios(query) {
  const { data } = await supabase
    .from('usuarios')
    .select('id, email, nombre')
    .or(`email.ilike.%${query}%,nombre.ilike.%${query}%`)
    .limit(8)
  return data || []
}

export async function addMemberToProject(proyectoId, userId) {
  const { error } = await supabase
    .from('miembros')
    .insert({ proyecto_id: proyectoId, usuario_id: userId, rol: 'miembro' })
  if (error) throw error
}

export async function getProjectMembers(proyectoId) {
  const { data } = await supabase
    .from('miembros')
    .select('usuario_id, rol, usuarios(email, nombre)')
    .eq('proyecto_id', proyectoId)
  return data || []
}

// ── Board ────────────────────────────────────────────────────
export async function getBoardByProject(proyectoId) {
  const { data: board } = await supabase
    .from('tableros')
    .select('*')
    .eq('proyecto_id', proyectoId)
    .order('orden')
    .limit(1)
    .single()
  if (!board) return null

  const { data: columns } = await supabase
    .from('columnas')
    .select('*')
    .eq('tablero_id', board.id)
    .order('orden')

  if (!columns?.length) return { board, columns: [], cards: [] }

  const { data: rawCards } = await supabase
    .from('tarjetas')
    .select(CARD_SELECT)
    .in('columna_id', columns.map(c => c.id))
    .order('orden')

  return { board, columns, cards: mapCards(rawCards) }
}

export async function getMyBoard() {
  const proyectos = await getMisProyectos()
  if (!proyectos.length) return null
  const proyecto = proyectos[0]
  const boardData = await getBoardByProject(proyecto.id)
  if (!boardData) return null
  return { proyecto, ...boardData }
}

// ── Tarjetas ─────────────────────────────────────────────────
export async function createCard({ columna_id, titulo }) {
  const { data, error } = await supabase
    .from('tarjetas')
    .insert({ columna_id, titulo, orden: 9999 })
    .select(CARD_SELECT)
    .single()
  if (error) throw error
  return { ...data, labels: (data.tarjeta_etiqueta || []).map(te => te.etiquetas).filter(Boolean) }
}

export async function deleteCard(id) {
  const { error } = await supabase.from('tarjetas').delete().eq('id', id)
  if (error) throw error
}

export async function updateCard(cardId, fields) {
  const { data, error } = await supabase
    .from('tarjetas')
    .update(fields)
    .eq('id', cardId)
    .select(CARD_SELECT)
    .single()
  if (error) throw error
  return { ...data, labels: (data.tarjeta_etiqueta || []).map(te => te.etiquetas).filter(Boolean) }
}

export async function updateCardColumn(cardId, columnId) {
  const { error } = await supabase
    .from('tarjetas')
    .update({ columna_id: columnId })
    .eq('id', cardId)
  if (error) throw error
}

// ── Entorno ──────────────────────────────────────────────────
export async function getActiveFrase() {
  const { data } = await supabase
    .from('frases_dia').select('contenido, autor')
    .eq('activa', true).limit(1).single()
  return data
}

export async function getActivePlaylist() {
  const { data } = await supabase
    .from('playlists').select('nombre, plataforma, url_externa')
    .eq('activa', true).limit(1).single()
  return data
}
