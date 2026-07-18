import { supabase, getAccessTokenSync } from './supabase'

const CARD_SELECT = 'id, columna_id, titulo, descripcion, prioridad, fecha_limite, cover_url, orden, asignado_a, ' +
  'tarjeta_etiqueta(etiquetas(id, nombre, color)), subtareas(id, completada), ' +
  'comentarios(creado_en), comentario_lecturas(ultima_lectura), registros_tiempo(segundos_totales)'

// RLS ya limita comentario_lecturas y registros_tiempo a las filas del
// usuario actual, así que estos campos embebidos nunca exponen datos de
// otros miembros del proyecto.
function mapCard(card) {
  const subs = card.subtareas || []
  const comentarios = card.comentarios || []
  const ultimaLectura = card.comentario_lecturas?.[0]?.ultima_lectura || null
  const tiempos = card.registros_tiempo || []
  return {
    ...card,
    labels: (card.tarjeta_etiqueta || []).map(te => te.etiquetas).filter(Boolean),
    subtaskTotal: subs.length,
    subtaskDone:  subs.filter(s => s.completada).length,
    unreadComments: comentarios.some(c => !ultimaLectura || new Date(c.creado_en) > new Date(ultimaLectura)),
    tiempoTotalSeg: tiempos.reduce((sum, r) => sum + (r.segundos_totales || 0), 0),
  }
}

function mapCards(rawCards) {
  return (rawCards || []).map(mapCard)
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

// Versión del onboarding: acepta columnas personalizadas y devuelve IDs
export async function createProjectForOnboarding({ nombre, descripcion = '', columnas }) {
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

  const colRows = columnas.map((col, i) => ({
    tablero_id: board.id,
    nombre: col.nombre,
    color:  col.color,
    orden:  i,
  }))
  const { data: cols } = await supabase.from('columnas').insert(colRows).select()

  return { proyecto, board, columnas: cols || [] }
}

export async function deleteProject(proyectoId) {
  const { error } = await supabase.from('proyectos').delete().eq('id', proyectoId)
  if (error) throw error
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

// ── Invitaciones por enlace ──────────────────────────────────
export async function createInvitacion(proyectoId) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('invitaciones')
    .insert({ proyecto_id: proyectoId, creado_por: user.id })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

// Canjea la invitación (RPC SECURITY DEFINER). Devuelve el proyecto_id
// al que quedaste unido.
export async function acceptInvitation(inviteId) {
  const { data, error } = await supabase.rpc('accept_invitation', { invite_id: inviteId })
  if (error) throw error
  return data
}

// En dos pasos a propósito: el FK de miembros apunta a auth.users, no a
// la tabla pública usuarios, así que el embed `usuarios(email, nombre)`
// devolvía null y la UI mostraba "Sin miembros" / Asignar vacío.
export async function getProjectMembers(proyectoId) {
  const { data: membersData } = await supabase
    .from('miembros')
    .select('usuario_id, rol')
    .eq('proyecto_id', proyectoId)
  if (!membersData?.length) return []

  const { data: usersData } = await supabase
    .from('usuarios')
    .select('id, email, nombre')
    .in('id', membersData.map(m => m.usuario_id))

  return membersData.map(m => ({
    ...m,
    usuarios: usersData?.find(u => u.id === m.usuario_id) || null,
  }))
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

// ── Vencimientos (independiente del boardStore) ──────────────
let _deadlinesCache = null
let _deadlinesCacheAt = 0
const DEADLINES_TTL = 5 * 60_000

export async function getUpcomingDeadlines({ bust = false } = {}) {
  if (!bust && _deadlinesCache && Date.now() - _deadlinesCacheAt < DEADLINES_TTL) {
    return _deadlinesCache
  }

  // Paso 1: IDs de columnas del usuario (projects → boards → columns)
  const { data: memberData } = await supabase
    .from('miembros')
    .select('proyectos(tableros(columnas(id)))')
  const columnIds = []
  ;(memberData || []).forEach(m => {
    ;(m.proyectos?.tableros || []).forEach(t => {
      ;(t.columnas || []).forEach(c => columnIds.push(c.id))
    })
  })
  if (!columnIds.length) {
    _deadlinesCache = []
    _deadlinesCacheAt = Date.now()
    return []
  }

  // Paso 2: tarjetas con fecha_limite hasta mañana
  const d = new Date(); d.setDate(d.getDate() + 1)
  const tomorrowStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  const { data } = await supabase
    .from('tarjetas')
    .select('id, titulo, prioridad, fecha_limite, columna_id')
    .in('columna_id', columnIds)
    .not('fecha_limite', 'is', null)
    .lte('fecha_limite', tomorrowStr)

  _deadlinesCache = data || []
  _deadlinesCacheAt = Date.now()
  return _deadlinesCache
}

// ── Tarjetas ─────────────────────────────────────────────────
export async function createCard({ columna_id, titulo }) {
  const { data, error } = await supabase
    .from('tarjetas')
    .insert({ columna_id, titulo, orden: 9999 })
    .select(CARD_SELECT)
    .single()
  if (error) throw error
  return mapCard(data)
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
  return mapCard(data)
}

export async function updateCardColumn(cardId, columnId) {
  const { error } = await supabase
    .from('tarjetas')
    .update({ columna_id: columnId })
    .eq('id', cardId)
  if (error) throw error
}

// ── Columnas (listas) ────────────────────────────────────────
export async function createColumn({ tablero_id, nombre, color = '#534AB7', orden = 9999 }) {
  const { data, error } = await supabase
    .from('columnas')
    .insert({ tablero_id, nombre, color, orden })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateColumn(id, fields) {
  const { data, error } = await supabase
    .from('columnas')
    .update(fields)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteColumn(id) {
  const { error } = await supabase.from('columnas').delete().eq('id', id)
  if (error) throw error
}

// ── Etiquetas ────────────────────────────────────────────────
export async function getProyectoEtiquetas(proyectoId) {
  const { data, error } = await supabase
    .from('etiquetas')
    .select('id, nombre, color')
    .eq('proyecto_id', proyectoId)
    .order('nombre')
  if (error) throw error
  return data || []
}

export async function createEtiqueta(proyectoId, nombre, color) {
  const { data, error } = await supabase
    .from('etiquetas')
    .insert({ proyecto_id: proyectoId, nombre, color })
    .select('id, nombre, color')
    .single()
  if (error) throw error
  return data
}

export async function addEtiquetaToCard(tarjetaId, etiquetaId) {
  const { error } = await supabase
    .from('tarjeta_etiqueta')
    .insert({ tarjeta_id: tarjetaId, etiqueta_id: etiquetaId })
  if (error && error.code !== '23505') throw error // ignore duplicate
}

export async function removeEtiquetaFromCard(tarjetaId, etiquetaId) {
  const { error } = await supabase
    .from('tarjeta_etiqueta')
    .delete()
    .eq('tarjeta_id', tarjetaId)
    .eq('etiqueta_id', etiquetaId)
  if (error) throw error
}

// ── Comentarios ───────────────────────────────────────────────
export async function getComentarios(tarjetaId) {
  const { data, error } = await supabase
    .from('comentarios')
    .select('id, contenido, creado_en, autor_id')
    .eq('tarjeta_id', tarjetaId)
    .order('creado_en')
  if (error) throw error
  return data || []
}

export async function addComentario(tarjetaId, contenido) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('comentarios')
    .insert({ tarjeta_id: tarjetaId, contenido, autor_id: user.id })
    .select('id, contenido, creado_en, autor_id')
    .single()
  if (error) throw error
  return data
}

export async function deleteComentario(id) {
  const { error } = await supabase.from('comentarios').delete().eq('id', id)
  if (error) throw error
}

// Marca como "leídos" los comentarios de una tarjeta para el usuario actual.
export async function marcarComentariosLeidos(tarjetaId) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('comentario_lecturas')
    .upsert({ usuario_id: user.id, tarjeta_id: tarjetaId, ultima_lectura: new Date().toISOString() })
  if (error) throw error
}

// ── Tiempo registrado ────────────────────────────────────────
export async function iniciarRegistroTiempo(tarjetaId) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('registros_tiempo')
    .insert({ tarjeta_id: tarjetaId, usuario_id: user.id, inicio: new Date().toISOString() })
    .select('id, inicio, fin')
    .single()
  if (error) throw error
  return data
}

export async function detenerRegistroTiempo(id) {
  const { data, error } = await supabase
    .from('registros_tiempo')
    .update({ fin: new Date().toISOString() })
    .eq('id', id)
    .select('id, inicio, fin, segundos_totales')
    .single()
  if (error) throw error
  return data
}

// El cronómetro que quedó corriendo (fin=null) de una visita anterior —
// para restaurarlo en la cápsula flotante aunque hayas cerrado la tarjeta
// o recargado la página. RLS limita el resultado al usuario actual.
export async function getRegistroTiempoActivo() {
  const { data, error } = await supabase
    .from('registros_tiempo')
    .select('id, tarjeta_id, inicio, tarjetas(titulo)')
    .is('fin', null)
    .order('inicio', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// Cierra el registro activo al cerrar la pestaña/navegador. Un `fetch`
// normal (el que usa supabase-js) no tiene garantía de completarse una vez
// que la página empieza a descargarse — `keepalive` sí, así que se arma la
// petición REST a mano en vez de pasar por el cliente.
export function stopRegistroTiempoBeacon(registroId) {
  const token = getAccessTokenSync()
  if (!token) return
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/registros_tiempo?id=eq.${registroId}`
  fetch(url, {
    method: 'PATCH',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ fin: new Date().toISOString() }),
  }).catch(() => {})
}

// ── Subtareas ────────────────────────────────────────────────
export async function getSubtareas(tarjetaId) {
  const { data, error } = await supabase
    .from('subtareas')
    .select('id, titulo, completada, orden')
    .eq('tarjeta_id', tarjetaId)
    .order('orden')
  if (error) throw error
  return data || []
}

// Subtareas de varias tarjetas en una sola consulta (para el planner)
export async function getSubtareasForCards(cardIds) {
  if (!cardIds.length) return []
  const { data, error } = await supabase
    .from('subtareas')
    .select('id, tarjeta_id, titulo, completada, orden')
    .in('tarjeta_id', cardIds)
    .order('orden')
  if (error) throw error
  return data || []
}

export async function createSubtarea(tarjetaId, titulo) {
  const { data, error } = await supabase
    .from('subtareas')
    .insert({ tarjeta_id: tarjetaId, titulo })
    .select('id, titulo, completada, orden')
    .single()
  if (error) throw error
  return data
}

export async function toggleSubtarea(id, completada) {
  const { error } = await supabase
    .from('subtareas')
    .update({ completada })
    .eq('id', id)
  if (error) throw error
}

export async function deleteSubtarea(id) {
  const { error } = await supabase
    .from('subtareas')
    .delete()
    .eq('id', id)
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
