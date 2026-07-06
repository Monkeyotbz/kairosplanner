import { useEffect, useState, useRef } from 'react'
import { useBoardStore } from '../store/boardStore'
import { useToastStore } from '../store/toastStore'
import BoardNav from '../components/layout/BoardNav'
import Board from '../components/kanban/Board'
import EmptyBoard from '../components/kanban/EmptyBoard'
import SidePanel from '../components/layout/SidePanel'
import CardDetailModal from '../components/kanban/CardDetailModal'
import styles from './BoardPage.module.css'

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function BoardPage() {
  const { proyecto, loading, error, loadBoard, cardsByColumn } = useBoardStore()
  const addToast = useToastStore(s => s.addToast)
  const toastFired = useRef(false)
  const [panelOpen, setPanelOpen] = useState(
    () => localStorage.getItem('kairos-panel') === 'true'
  )

  useEffect(() => { loadBoard() }, [loadBoard])

  useEffect(() => {
    if (loading || toastFired.current) return
    const today    = getTodayStr()
    const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
    const allCards = Object.values(cardsByColumn).flat()
    const overdue    = allCards.filter(c => c.fecha_limite && c.fecha_limite < today).length
    const dueToday   = allCards.filter(c => c.fecha_limite === today).length
    const dueTomorrow = allCards.filter(c => c.fecha_limite === tomorrow).length
    if (overdue + dueToday + dueTomorrow > 0) {
      addToast({ overdue, dueToday, dueTomorrow })
      toastFired.current = true
    }
  }, [loading, cardsByColumn, addToast])

  function togglePanel() {
    setPanelOpen(v => {
      localStorage.setItem('kairos-panel', String(!v))
      return !v
    })
  }

  if (loading) {
    return (
      <div className={styles.state}>
        <span className={styles.spinner} />
        Cargando tablero...
      </div>
    )
  }

  if (error === 'empty') return <EmptyBoard />

  if (error) {
    return (
      <div className={`${styles.state} ${styles.errorState}`}>
        <i className={`ti ti-cloud-off ${styles.errorIcon}`} aria-hidden="true" />
        <p className={styles.error}>{error}</p>
        <p className={styles.reconnecting}>
          <span className={styles.spinner} /> Reconectando automáticamente…
        </p>
        <button className={styles.retryBtn} onClick={() => loadBoard()}>
          <i className="ti ti-refresh" aria-hidden="true" /> Reintentar ahora
        </button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <BoardNav proyecto={proyecto} panelOpen={panelOpen} onTogglePanel={togglePanel} />
      <div className={styles.content}>
        <div className={styles.kanbanSide}>
          <div className={styles.boardWrapper}>
            <Board />
          </div>
        </div>
        {panelOpen && <SidePanel onClose={togglePanel} />}
      </div>
      <CardDetailModal />
    </div>
  )
}
