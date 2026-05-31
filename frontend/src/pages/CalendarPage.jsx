import { useState, useMemo, useEffect } from 'react'
import { useBoardStore } from '../store/boardStore'
import CalendarGrid from '../components/calendar/CalendarGrid'
import AgendaList from '../components/calendar/AgendaList'
import CardDetailModal from '../components/kanban/CardDetailModal'
import styles from './CalendarPage.module.css'

export default function CalendarPage() {
  const [view, setView] = useState('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  const cardsByColumn = useBoardStore(s => s.cardsByColumn)
  const columns = useBoardStore(s => s.columns)
  const selectedCard = useBoardStore(s => s.selectedCard)
  const loading = useBoardStore(s => s.loading)
  const loadBoard = useBoardStore(s => s.loadBoard)

  useEffect(() => {
    if (!columns.length) loadBoard()
  }, [])

  const allCards = useMemo(() =>
    Object.values(cardsByColumn).flat().filter(c => c.fecha_limite),
    [cardsByColumn]
  )

  const columnMap = useMemo(() =>
    Object.fromEntries(columns.map(c => [c.id, c])),
    [columns]
  )

  const goToPrev = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const goToNext = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  const monthLabel = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Agenda</h1>
          <span className={styles.monthLabel}>{monthLabel}</span>
        </div>
        <div className={styles.controls}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${view === 'month' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('month')}
            >Mes</button>
            <button
              className={`${styles.viewBtn} ${view === 'agenda' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('agenda')}
            >Lista</button>
          </div>
          <button className={styles.todayBtn} onClick={goToToday}>Hoy</button>
          <div className={styles.navBtns}>
            <button className={styles.navBtn} onClick={goToPrev}>‹</button>
            <button className={styles.navBtn} onClick={goToNext}>›</button>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        {loading && !columns.length ? (
          <div className={styles.empty}>Cargando tablero…</div>
        ) : allCards.length === 0 && !loading ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>◫</span>
            <p>Ninguna tarjeta tiene fecha límite todavía.</p>
            <p className={styles.emptyHint}>Ábrelas desde el Tablero y asígnales una fecha.</p>
          </div>
        ) : view === 'month' ? (
          <CalendarGrid
            currentDate={currentDate}
            cards={allCards}
            columnMap={columnMap}
          />
        ) : (
          <AgendaList
            cards={allCards}
            columnMap={columnMap}
          />
        )}
      </div>

      {selectedCard && <CardDetailModal />}
    </div>
  )
}
