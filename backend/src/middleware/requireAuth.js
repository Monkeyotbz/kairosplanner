import { supabase } from '../config/supabase.js'

// Valida el JWT de Supabase Auth que manda el frontend como
// `Authorization: Bearer <token>` (mismo token que ya usa supabase-js
// en el cliente). Cuelga { id, email } en req.usuario si es válido.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'No autenticado' })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return res.status(401).json({ error: 'Token inválido o expirado' })

  req.usuario = { id: data.user.id, email: data.user.email }
  next()
}
