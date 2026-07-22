import { supabase } from '../config/supabase.js'

// Exige que req.usuario (ya validado por requireAuth) sea admin del
// proyecto indicado en :proyectoId — conectar/desconectar/forzar sync
// de Google Calendar son acciones de administración del proyecto,
// no algo que cualquier miembro deba poder hacer.
export async function requireProjectAdmin(req, res, next) {
  const proyectoId = req.params.proyectoId
  if (!proyectoId) return res.status(400).json({ error: 'Falta proyectoId' })

  const { data, error } = await supabase
    .from('miembros')
    .select('rol')
    .eq('proyecto_id', proyectoId)
    .eq('usuario_id', req.usuario.id)
    .maybeSingle()

  if (error) return res.status(500).json({ error: 'No se pudo verificar el rol' })
  if (!data || data.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo un administrador del proyecto puede hacer esto' })
  }
  next()
}
