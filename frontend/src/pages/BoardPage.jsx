import { useEffect } from 'react'
import { useBoardStore } from '../store/boardStore'
import BoardNav from '../components/layout/BoardNav'
import QuoteStrip from '../components/entorno/QuoteStrip'
import Board from '../components/kanban/Board'
import styles from './BoardPage.module.css'

export default function BoardPage() {
  const { proyecto, loading, error, loadBoard } = useBoardStore()

  useEffect(() => { loadBoard() }, [loadBoard])

  if (loading) {
    return (
      <div className={styles.state}>
        <span className={styles.spinner} />
        Cargando tablero...
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.state}>
        <p className={styles.error}>{error}</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <BoardNav proyecto={proyecto} />
      <QuoteStrip />
      <div className={styles.boardWrapper}>
        <Board />
      </div>
    </div>
  )
}
