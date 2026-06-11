// Hook de Text-to-Speech para ABAD.
// Selecciona la mejor voz española disponible en el navegador,
// persiste la preferencia de mute y expone controles limpios.

import { useState, useEffect, useRef, useCallback } from 'react'

const MUTE_KEY = 'kairos-abad-muted'

// Voces en orden de preferencia — latinas primero
const VOICE_PRIORITY = [
  v => /google/i.test(v.name)    && /es-US|es-419|es-MX|es-CO|es-AR|es-CL/i.test(v.lang),
  v => /microsoft/i.test(v.name) && /sabina|jorge|paloma|francisca|pablo/i.test(v.name),
  v => /microsoft/i.test(v.name) && /es-US|es-419|es-MX|es-CO|es-AR/i.test(v.lang),
  v => /es-US|es-419|es-MX|es-CO|es-AR|es-CL|es-PE/i.test(v.lang),
  v => /google/i.test(v.name)    && v.lang.startsWith('es'),
  v => /microsoft/i.test(v.name) && v.lang.startsWith('es'),
  v => v.lang.startsWith('es'),
]

export function useSpeech({ rate = 0.93, pitch = 1.05 } = {}) {
  const [isSpeaking,   setIsSpeaking]   = useState(false)
  const [isMuted,      setIsMuted]      = useState(() => {
    try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false }
  })
  const bestVoiceRef = useRef(null)
  const synthRef     = useRef(null)

  // Cargar y seleccionar la mejor voz
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    synthRef.current = window.speechSynthesis

    function pickBestVoice() {
      const voices = synthRef.current.getVoices()
      if (!voices.length) return
      for (const test of VOICE_PRIORITY) {
        const found = voices.find(test)
        if (found) { bestVoiceRef.current = found; return }
      }
    }

    pickBestVoice()
    synthRef.current.onvoiceschanged = pickBestVoice
    return () => {
      if (synthRef.current) synthRef.current.onvoiceschanged = null
    }
  }, [])

  // Devuelve true si el habla comenzó; false si está silenciado / TTS no disponible.
  // onEnd se llama cuando el utterance termina (o falla).
  const speak = useCallback((text, { onEnd } = {}) => {
    if (!text?.trim() || isMuted || !synthRef.current) return false
    try {
      synthRef.current.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang  = bestVoiceRef.current?.lang || 'es-MX'
      u.rate  = rate
      u.pitch = pitch
      if (bestVoiceRef.current) u.voice = bestVoiceRef.current
      u.onstart = () => setIsSpeaking(true)
      u.onend   = () => { setIsSpeaking(false); onEnd?.() }
      u.onerror = () => { setIsSpeaking(false); onEnd?.() }
      synthRef.current.speak(u)
      return true
    } catch (_) { return false }
  }, [isMuted, rate, pitch])

  const cancel = useCallback(() => {
    try { synthRef.current?.cancel() } catch (_) {}
    setIsSpeaking(false)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev
      try { localStorage.setItem(MUTE_KEY, next ? '1' : '0') } catch (_) {}
      if (next) { try { synthRef.current?.cancel() } catch (_) {} }
      return next
    })
  }, [])

  return { speak, cancel, isSpeaking, isMuted, toggleMute }
}
