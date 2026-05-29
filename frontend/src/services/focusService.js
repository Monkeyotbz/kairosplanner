import { supabase } from './supabase'

export async function createSession({ tipo, duracion_plan_min, proyecto_id }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('sesiones_enfoque')
    .insert({
      usuario_id: user.id,
      tipo,
      duracion_plan_min: duracion_plan_min || null,
      proyecto_id: proyecto_id || null,
      estado: 'activa',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeSession(sesionId) {
  const { error } = await supabase
    .from('sesiones_enfoque')
    .update({ fin: new Date().toISOString(), estado: 'completada' })
    .eq('id', sesionId)
  if (error) throw error
}

export async function cancelSession(sesionId) {
  const { error } = await supabase
    .from('sesiones_enfoque')
    .update({ fin: new Date().toISOString(), estado: 'cancelada' })
    .eq('id', sesionId)
  if (error) throw error
}

export async function createPausa(sesionId, tipoPausa = 'corta') {
  const { data, error } = await supabase
    .from('pausas_sesion')
    .insert({ sesion_id: sesionId, tipo_pausa: tipoPausa })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function endPausa(pausaId, videoId = null) {
  const { error } = await supabase
    .from('pausas_sesion')
    .update({ fin: new Date().toISOString(), ...(videoId ? { video_id: videoId } : {}) })
    .eq('id', pausaId)
  if (error) throw error
}

export async function getVideos() {
  const { data } = await supabase
    .from('videos_pausa')
    .select('*')
    .eq('activo', true)
    .order('es_predefinido', { ascending: false })
  return data || []
}

export async function getMisProyectos() {
  const { data } = await supabase
    .from('miembros')
    .select('proyecto_id, proyectos(id, nombre)')
  return (data || []).map(m => m.proyectos).filter(Boolean)
}
