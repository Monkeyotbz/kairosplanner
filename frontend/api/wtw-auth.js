import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const { code, redirect_uri } = await req.json()

  if (!code || !redirect_uri) {
    return new Response(JSON.stringify({ error: 'Missing code or redirect_uri' }), { status: 400 })
  }

  const clientId     = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'Azure credentials not configured' }), { status: 500 })
  }

  try {
    // 1. Intercambiar código por token
    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        code,
        redirect_uri,
        grant_type:    'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error)

    // 2. Obtener perfil del usuario desde Microsoft Graph
    const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()

    const user = {
      id:          profile.id,
      displayName: profile.displayName,
      email:       profile.mail || profile.userPrincipalName,
      jobTitle:    profile.jobTitle || null,
    }

    // 3. Upsert usuario en Supabase WTW
    const supabase = createClient(
      process.env.WTW_SUPABASE_URL,
      process.env.WTW_SUPABASE_SERVICE_KEY,
    )

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString()

    const { data: dbUser, error: upsertError } = await supabase
      .from('usuarios_wtw')
      .upsert({
        ms_id:            user.id,
        email:            user.email,
        nombre:           user.displayName,
        cargo:            user.jobTitle,
        ms_access_token:  tokenData.access_token,
        ms_refresh_token: tokenData.refresh_token || null,
        token_expires_at: expiresAt,
      }, { onConflict: 'ms_id' })
      .select('id')
      .single()

    if (upsertError) throw upsertError

    // 4. Crear tablero inicial si es usuario nuevo
    const { count } = await supabase
      .from('tableros_wtw')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', dbUser.id)

    if (count === 0) {
      const { data: tablero } = await supabase
        .from('tableros_wtw')
        .insert({ usuario_id: dbUser.id, nombre: 'Mis Operaciones' })
        .select('id')
        .single()

      if (tablero) {
        await supabase.from('columnas_wtw').insert([
          { tablero_id: tablero.id, nombre: 'Por hacer',   orden: 0, color: '#534AB7' },
          { tablero_id: tablero.id, nombre: 'En progreso', orden: 1, color: '#0ea5e9' },
          { tablero_id: tablero.id, nombre: 'En revisión', orden: 2, color: '#f59e0b' },
          { tablero_id: tablero.id, nombre: 'Completado',  orden: 3, color: '#22c55e' },
        ])
      }
    }

    return new Response(JSON.stringify({
      access_token:  tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in:    tokenData.expires_in,
      user: { ...user, kairos_id: dbUser.id },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[wtw-auth]', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
