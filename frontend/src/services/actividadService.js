import { supabase } from './supabase'

export async function saveActividad(proyectoId, usuarioId, nombreUsuario, descripcion) {
  await supabase
    .from('actividad')
    .insert({ proyecto_id: proyectoId, usuario_id: usuarioId, nombre_usuario: nombreUsuario, descripcion })
}

export async function getActividad(proyectoId, limit = 30) {
  const { data } = await supabase
    .from('actividad')
    .select('id, nombre_usuario, descripcion, created_at')
    .eq('proyecto_id', proyectoId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data || []).reverse()
}
