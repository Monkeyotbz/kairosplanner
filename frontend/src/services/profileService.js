import { supabase } from './supabase'

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('usuarios')
    .select('id, email, nombre, avatar_url')
    .eq('id', user.id)
    .single()
  return data || null
}

export async function updateProfileName(nombre) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data, error } = await supabase
    .from('usuarios')
    .update({ nombre: nombre.trim() })
    .eq('id', user.id)
    .select('id, email, nombre, avatar_url')
    .single()
  if (error) throw error
  return data
}

// Sube un archivo a Supabase Storage y guarda la URL pública en usuarios.avatar_url
// SQL requerido en Supabase antes de usar esta función:
//   ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS avatar_url text;
//   INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
//   CREATE POLICY "avatars_select" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
//   CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
//   CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
//   CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
export async function uploadAvatar(userId, file) {
  const ext  = file.name.split('.').pop().toLowerCase()
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  const { data, error } = await supabase
    .from('usuarios')
    .update({ avatar_url: publicUrl })
    .eq('id', userId)
    .select('id, email, nombre, avatar_url')
    .single()
  if (error) throw error
  return data
}

// Guarda una URL externa como foto de perfil (o null para quitar)
// SQL requerido: ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS avatar_url text;
export async function updateAvatarUrl(userId, url) {
  const { data, error } = await supabase
    .from('usuarios')
    .update({ avatar_url: url || null })
    .eq('id', userId)
    .select('id, email, nombre, avatar_url')
    .single()
  if (error) throw error
  return data
}
