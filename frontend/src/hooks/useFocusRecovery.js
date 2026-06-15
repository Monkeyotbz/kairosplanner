import { useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useFocusStore, loadCheckpoint, clearCheckpoint, saveCheckpoint } from '../store/focusStore'
import { useToastStore } from '../store/toastStore'

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

    // Recuperación adicional: buscar en DB sesiones activas sin fin que sean del usuario.
    // Cubre el caso donde finishSession falló Y el checkpoint ya no está (ej: sesión actual de 4h perdida).
    async function recoverOrphanedDbSessions() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString() // más de 5 min de antigüedad
      const { data: orphans } = await supabase
        .from('sesiones_enfoque')
        .select('id, inicio')
        .eq('usuario_id', user.id)
        .eq('estado', 'activa')
        .is('fin', null)
        .lt('inicio', cutoff)

      if (!orphans || orphans.length === 0) return

      const MAX_SESSION_MS = 8 * 60 * 60 * 1000 // cap: 8 horas

      for (const session of orphans) {
        const inicioMs = new Date(session.inicio).getTime()
        // Nunca asignar más de 8h — si el crash fue hace días el fin se capa al inicio + 8h
        const finMs = Math.min(Date.now(), inicioMs + MAX_SESSION_MS)
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
