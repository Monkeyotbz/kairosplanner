import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Evita promesas colgadas: si la query no resuelve en `ms`, rechaza con
// Error('timeout:<label>') para que el caller pueda salir del loading.
export function withTimeout(promise, ms = 10000, label = 'supabase') {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout:${label}`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export function isTimeoutError(err) {
  return typeof err?.message === 'string' && err.message.startsWith('timeout:')
}

// Reintenta una operación con backoff exponencial antes de rendirse.
// `factory` debe ser una FUNCIÓN que devuelva una promesa nueva por intento.
export async function withRetry(factory, { retries = 2, ms = 10000, baseDelay = 1000, label = 'supabase' } = {}) {
  let lastErr
  for (let i = 0; i <= retries; i++) {
    try {
      return await withTimeout(factory(), ms, label)
    } catch (err) {
      lastErr = err
      if (i < retries) await new Promise(r => setTimeout(r, baseDelay * 2 ** i))
    }
  }
  throw lastErr
}

// Los navegadores suspenden los timers de pestañas en segundo plano, así que
// supabase-js no llega a refrescar el token y al volver las queries fallan o
// se cuelgan hasta un F5. Al recuperar el foco forzamos el ciclo de refresh.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}
