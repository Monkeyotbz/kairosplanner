import { useEffect, useState } from 'react'
import { useBoardStore } from '../../store/boardStore'
import styles from './CardTimerCapsule.module.css'

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Cápsula sutil siempre visible mientras haya un cronómetro corriendo,
// sin importar qué tarjeta (o qué página) tengas abierta. Mismo patrón que
// FocusCapsule, pero anclada abajo a la izquierda para no chocar con ella.
export default function CardTimerCapsule() {
  const activeTimer   = useBoardStore(s => s.activeTimer)
  const cardsByColumn = useBoardStore(s => s.cardsByColumn)
  const selectCard    = useBoardStore(s => s.selectCard)
  const stopCardTimer = useBoardStore(s => s.stopCardTimer)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!activeTimer) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [activeTimer])

  if (!activeTimer) return null

  const elapsed = Math.floor((now - new Date(activeTimer.inicio).getTime()) / 1000)

  function handleOpen() {
    const card = (cardsByColumn[activeTimer.columnaId] || []).find(c => c.id === activeTimer.cardId)
    if (card) selectCard(card)
  }

  return (
    <div className={styles.capsule}>
      <button className={styles.timeChip} onClick={handleOpen} title="Abrir tarjeta">
        <span className={styles.dot} />
        <span className={styles.time}>{formatTime(elapsed)}</span>
      </button>
      <button className={styles.task} onClick={handleOpen} title={activeTimer.cardTitulo}>
        {activeTimer.cardTitulo}
      </button>
      <button className={styles.stopBtn} onClick={stopCardTimer} title="Detener cronómetro">
        <i className="ti ti-player-stop" aria-hidden="true" />
      </button>
    </div>
  )
}
