import { useState, useEffect } from 'react'
import { useBoardStore } from '../../store/boardStore'
import styles from './CardTimeTracker.module.css'

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// El cronómetro vive en boardStore (activeTimer), no acá — así sigue
// corriendo y la cápsula flotante lo muestra aunque cierres la tarjeta.
export default function CardTimeTracker({ cardId }) {
  const selectedCard   = useBoardStore(s => s.selectedCard)
  const activeTimer    = useBoardStore(s => s.activeTimer)
  const startCardTimer = useBoardStore(s => s.startCardTimer)
  const stopCardTimer  = useBoardStore(s => s.stopCardTimer)
  const [now, setNow]  = useState(Date.now())

  const runningHere     = activeTimer?.cardId === cardId
  const runningElsewhere = activeTimer && !runningHere

  useEffect(() => {
    if (!runningHere) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [runningHere])

  const pastTotal = selectedCard?.tiempoTotalSeg || 0
  const liveElapsed = runningHere ? Math.floor((now - new Date(activeTimer.inicio).getTime()) / 1000) : 0
  const displayTotal = pastTotal + liveElapsed

  return (
    <div className={styles.wrap}>
      <div className={styles.total}>
        <i className={`ti ${runningHere ? 'ti-clock-play' : 'ti-clock'}`} aria-hidden="true" />
        <span>{displayTotal > 0 ? formatDuration(displayTotal) : 'Sin tiempo registrado'}</span>
        {runningHere && <span className={styles.livePulse} />}
      </div>
      {runningHere ? (
        <button className={styles.stopBtn} onClick={stopCardTimer}>
          <i className="ti ti-player-stop" aria-hidden="true" /> Detener
        </button>
      ) : runningElsewhere ? (
        <span className={styles.elsewhere} title={`Corriendo en "${activeTimer.cardTitulo}"`}>
          Corriendo en otra tarjeta
        </span>
      ) : (
        <button className={styles.startBtn} onClick={() => startCardTimer(cardId)}>
          <i className="ti ti-player-play" aria-hidden="true" /> Iniciar tiempo
        </button>
      )}
    </div>
  )
}
