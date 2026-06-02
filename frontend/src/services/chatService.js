import { supabase } from './supabase'

const MSG_SELECT = 'id, contenido, created_at, usuario_id, usuarios(nombre, email, avatar_url)'

export async function getMessages(proyectoId, limit = 60) {
  const { data, error } = await supabase
    .from('mensajes')
    .select(MSG_SELECT)
    .eq('proyecto_id', proyectoId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).reverse()
}

export async function sendMessage(proyectoId, usuarioId, contenido) {
  const { data, error } = await supabase
    .from('mensajes')
    .insert({ proyecto_id: proyectoId, usuario_id: usuarioId, contenido })
    .select(MSG_SELECT)
    .single()
  if (error) throw error
  return data
}

export function subscribeToMessages(proyectoId, onMessage) {
  return supabase
    .channel(`chat-${proyectoId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `proyecto_id=eq.${proyectoId}` },
      async (payload) => {
        // Fetch completo para obtener datos del usuario
        const { data } = await supabase
          .from('mensajes')
          .select(MSG_SELECT)
          .eq('id', payload.new.id)
          .single()
        if (data) onMessage(data)
      }
    )
    .subscribe()
}
