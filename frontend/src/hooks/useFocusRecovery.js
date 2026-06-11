import { useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useFocusStore, loadCheckpoint, clearCheckpoint, saveCheckpoint } from '../store/focusStore'
import { useToastStore } from '../store/toastStore'

export function useFocusRecovery() {
  const addToast = useToastStore(s => s.addToast)

  // Al montar: detectar sesión huérfana (F5 / crash / cierre de pestaña)
  useEffect(() => {
    async function recover() {
      const ck = loadCheckpoint()
      if (!ck) return

      const { sessionId, savedAt, startedAtMs, elapsedOffset } = ck

      // Calcular los segundos que tenía cuando se interrumpió
      const elapsedAtSave = startedAtMs
        ? (elapsedOffset || 0) + Math.floor((savedAt - startedAtMs) / 1000)
        : (elapsedOffset || 0)

      if (elapsedAtSave < 30) {
        clearCheckpoint()
        return
      }

      // Completar la sesión en Supabase usando el fin = momento del F5
      const { error } = await supabase
        .from('sesiones_enfoque')
        .update({ fin: new Date(savedAt).toISOString(), estado: 'completada' })
        .eq('id', sessionId)
        .eq('estado', 'activa')

      clearCheckpoint()

      if (!error) {
        const minutos = Math.round(elapsedAtSave / 60)
        if (minutos > 0) {
          addToast({
            _type: 'focus-recovery',
            minutos,
            duration: 10000,
          })
        }
      }
    }
    recover()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Antes de cerrar/recargar: guardar checkpoint con el último tiempo conocido
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
