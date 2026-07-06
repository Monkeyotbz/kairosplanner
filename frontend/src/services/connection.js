// Punto único de detección de "volvimos a tener conexión / foco".
// Los stores se suscriben con onReconnect(cb) y este módulo dispara los
// callbacks cuando el navegador recupera red o la pestaña vuelve a ser
// visible — los dos momentos donde antes había que hacer F5.

const listeners = new Set()

export function onReconnect(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function fire() {
  listeners.forEach(cb => {
    try { cb() } catch (err) { console.error('[connection] listener falló:', err) }
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', fire)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') fire()
  })
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}
