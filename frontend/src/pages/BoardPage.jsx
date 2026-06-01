import { useEffect, useState } from 'react'
import { useBoardStore } from '../store/boardStore'
import BoardNav from '../components/layout/BoardNav'
import Board from '../components/kanban/Board'
import EmptyBoard from '../components/kanban/EmptyBoard'
import SidePanel from '../components/layout/SidePanel'
import CardDetailModal from '../components/kanban/CardDetailModal'
import styles from './BoardPage.module.css'

export default function BoardPage() {
  const { proyecto, loading, error, loadBoard } = useBoardStore()
  const [panelOpen, setPanelOpen] = useState(
    () => localStorage.getItem('kairos-panel') === 'true'
  )

  useEffect(() => { loadBoard() }, [loadBoard])

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
      <div className={styles.state}>
        <p className={styles.error}>{error}</p>
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
