import { supabase } from '../config/supabase.js'

// Exige que req.usuario (ya validado por requireAuth) pertenezca al
// proyecto de :proyectoId, con cualquier rol — a diferencia de
// requireProjectAdmin.js, esto es para lecturas (ej. ver el estado
// de la conexión de Google Calendar) que cualquier miembro puede ver.
export async function requireProjectMember(req, res, next) {
  const proyectoId = req.params.proyectoId
  if (!proyectoId) return res.status(400).json({ error: 'Falta proyectoId' })

  const { data, error } = await supabase
    .from('miembros')
    .select('rol')
    .eq('proyecto_id', proyectoId)
    .eq('usuario_id', req.usuario.id)
    .maybeSingle()

  if (error) return res.status(500).json({ error: 'No se pudo verificar membresía' })
  if (!data) return res.status(403).json({ error: 'No perteneces a este proyecto' })
  next()
}
