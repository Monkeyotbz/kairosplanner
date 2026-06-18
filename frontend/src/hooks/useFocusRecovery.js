import { useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useFocusStore, loadCheckpoint, clearCheckpoint, saveCheckpoint } from '../store/focusStore'
import { heartbeatSession } from '../services/focusService'
import { useToastStore } from '../store/toastStore'

const HEARTBEAT_INTERVAL_MS = 60_000 // 60s
const ORPHAN_CUTOFF_MS      = 3 * 60_000 // sesión cuyo heartbeat tiene > 3min → huérfana

export function useFocusRecovery() {
  const addToast = useToastStore(s => s.addToast)

  // Al montar: recuperar sesión interrumpida (F5 / crash / Supabase offline al finalizar)
  useEffect(() => {
    async function recoverFromCheckpoint() {
      const ck = loadCheckpoint()
      if (!ck) return

      const { sessionId, savedAt, startedAtMs, elapsedOffset } = ck

      const elapsedAtSave = startedAtMs
        ? (elapsedOffset || 0) + Math.floor((savedAt - startedAtMs) / 1000)
        : (elapsedOffset || 0)

      if (elapsedAtSave < 30) {
        clearCheckpoint()
        return
      }

      const { error } = await supabase
        .from('sesiones_enfoque')
        .update({ fin: new Date(savedAt).toISOString(), estado: 'completada' })
        .eq('id', sessionId)
        .eq('estado', 'activa')

      if (!error) {
        clearCheckpoint()
        const minutos = Math.round(elapsedAtSave / 60)
        if (minutos > 0) addToast({ _type: 'focus-recovery', minutos, duration: 10000 })
      }
      // Si hay error (Supabase aún offline), dejamos el checkpoint para el próximo intento
    }

    // Recuperación adicional: buscar sesiones activas cuyo heartbeat (fin) es stale o inexistente.
    // Con el heartbeat activo, fin = última vez visto → duración real, no estimada.
    async function recoverOrphanedDbSessions() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const cutoff = new Date(Date.now() - ORPHAN_CUTOFF_MS).toISOString()

      // Sesiones activas donde el heartbeat es stale (fin < cutoff) O nunca hubo heartbeat (fin IS NULL),
      // Y que además empezaron antes del cutoff (evita tocar sesiones recién iniciadas).
      const { data: orphans } = await supabase
        .from('sesiones_enfoque')
        .select('id, inicio, fin')
        .eq('usuario_id', user.id)
        .eq('estado', 'activa')
        .lt('inicio', cutoff)
        .or(`fin.is.null,fin.lt.${cutoff}`)

      if (!orphans || orphans.length === 0) return

      for (const session of orphans) {
        const inicioMs = new Date(session.inicio).getTime()

        // Si hay heartbeat, esa es la duración real (precisión ~60s).
        // Si no hay heartbeat (crash muy temprano o sesión pre-heartbeat), la sesión es irrecuperable
        // → fin = inicio (0 segundos), no inflar con estimaciones.
        const finMs = session.fin
          ? Math.min(new Date(session.fin).getTime(), Date.now())
          : inicioMs

        const finEstimado = new Date(finMs).toISOString()
        const { error } = await supabase
          .from('sesiones_enfoque')
          .update({ fin: finEstimado, estado: 'completada' })
          .eq('id', session.id)

        if (!error) {
          const segundos = Math.floor((finMs - inicioMs) / 1000)
          const minutos = Math.round(segundos / 60)
          if (minutos >= 1) addToast({ _type: 'focus-recovery', minutos, duration: 10000 })
        }
      }
    }

    recoverFromCheckpoint()
    recoverOrphanedDbSessions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Heartbeat: cada 60s escribe fin=now mientras la sesión está activa.
  // Si la app crashea, la recuperación usa este timestamp en vez de estimar duración.
  useEffect(() => {
    const id = setInterval(async () => {
      const { phase, session } = useFocusStore.getState()
      if ((phase === 'active' || phase === 'break') && session?.id) {
        try { await heartbeatSession(session.id) } catch (_) {}
      }
    }, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // Antes de cerrar/recargar: actualizar checkpoint con el último tiempo conocido
  useEffect(() => {
    function handleUnload() {
      const { phase, session, elapsedSeconds, startedAtMs, elapsedOffset } = useFocusStore.getState()
      if ((phase === 'active' || phase === 'break') && session) {
        const currentElapsed = startedAtMs
          ? elapsedOffset + Math.floor((Date.now() - startedAtMs) / 1000)
          : elapsedSeconds
        saveCheckpoint({
          sessionId: session.id,
          savedAt: Date.now(),
          startedAtMs: phase === 'active' ? startedAtMs : null,
          elapsedOffset: phase === 'active' ? elapsedOffset : currentElapsed,
        })
      }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])
}
