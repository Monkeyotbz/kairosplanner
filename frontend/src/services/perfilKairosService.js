import { supabase } from './supabase'

export async function getPerfilKairos() {
  const { data, error } = await supabase
    .from('perfil_kairos')
    .select('datos')
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data?.datos ?? null
}

export async function savePerfilKairos(datos) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('perfil_kairos')
    .upsert(
      { usuario_id: user.id, datos },
      { onConflict: 'usuario_id' }
    )
  if (error) throw error
}
