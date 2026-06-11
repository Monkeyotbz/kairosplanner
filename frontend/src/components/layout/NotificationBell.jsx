import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '../../store/boardStore'
import { getUpcomingDeadlines } from '../../services/boardService'
import styles from './NotificationBell.module.css'

function getDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const PRIORITY_COLOR = { alta: '#f87171', normal: '#facc15', baja: '#6ee7b7' }

export default function NotificationBell({ openUp = false }) {
  const navigate = useNavigate()
  const { cardsByColumn, selectCard } = useBoardStore()
  const [open, setOpen] = useState(false)
  const [fetchedCards, setFetchedCards] = useState([])
  const panelRef = useRef(null)

  const today    = getDateStr(new Date())
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return getDateStr(d) })()

  // Carga independiente del boardStore — funciona desde cualquier página
  const loadDeadlines = useCallback(async () => {
    // Si el boardStore ya tiene datos (usuario en /board), usarlos directamente
    if (Object.keys(cardsByColumn).length > 0) {
      setFetchedCards(Object.values(cardsByColumn).flat())
      return
    }
    try {
      const cards = await getUpcomingDeadlines()
      setFetchedCards(cards)
    } catch (_) {}
  }, [cardsByColumn])

  // Carga inicial
  useEffect(() => { loadDeadlines() }, [])

  // Si el boardStore se puebla (usuario navegó a /board), sincronizar
  useEffect(() => {
    if (Object.keys(cardsByColumn).length > 0) {
      setFetchedCards(Object.values(cardsByColumn).flat())
    }
  }, [cardsByColumn])

  // Refresco periódico: cada 5 minutos cuando no está en el board
  useEffect(() => {
    const id = setInterval(() => {
      if (Object.keys(cardsByColumn).length === 0) {
        getUpcomingDeadlines().then(setFetchedCards).catch(() => {})
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [cardsByColumn])

  const { overdue, dueToday, dueTomorrow } = useMemo(() => {
    const overdue     = []
    const dueToday    = []
    const dueTomorrow = []
    fetchedCards.forEach(card => {
      if (!card.fecha_limite) return
      if (card.fecha_limite < today)           overdue.push(card)
      else if (card.fecha_limite === today)    dueToday.push(card)
      else if (card.fecha_limite === tomorrow) dueTomorrow.push(card)
    })
    return { overdue, dueToday, dueTomorrow }
  }, [fetchedCards, today, tomorrow])

  const total = overdue.length + dueToday.length + dueTomorrow.length

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function handleOpen() {
    // Refresco al abrir si no hay datos del board
    if (Object.keys(cardsByColumn).length === 0) {
      getUpcomingDeadlines().then(setFetchedCards).catch(() => {})
    }
    setOpen(v => !v)
  }

  function handleCardClick(card) {
    setOpen(false)
    navigate('/board')
    setTimeout(() => selectCard(card), 50)
  }

  return (
    <div className={styles.wrap} ref={panelRef}>
      <button
        className={`${styles.bell} ${total > 0 ? styles.bellActive : ''}`}
        onClick={handleOpen}
        title="Notificaciones de vencimiento"
        aria-label={`Notificaciones${total > 0 ? ` (${total})` : ''}`}
      >
        <i className="ti ti-bell" />
        {total > 0 && (
          <span className={`${styles.badge} ${overdue.length > 0 ? styles.badgeUrgent : ''}`}>
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className={`${styles.panel} ${openUp ? styles.panelUp : ''}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Vencimientos</span>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          {total === 0 ? (
            <div className={styles.empty}>
              <i className="ti ti-checks" />
              <span>Sin tareas por vencer</span>
            </div>
          ) : (
            <div className={styles.sections}>
              <NotifSection
                label="Vencidas"
                cards={overdue}
                accent="#f87171"
                icon="ti-alarm"
                onCardClick={handleCardClick}
              />
              <NotifSection
                label="Vence hoy"
                cards={dueToday}
                accent="#fb923c"
                icon="ti-clock-exclamation"
                onCardClick={handleCardClick}
              />
              <NotifSection
                label="Vence mañana"
                cards={dueTomorrow}
                accent="#facc15"
                icon="ti-clock"
                onCardClick={handleCardClick}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NotifSection({ label, cards, accent, icon, onCardClick }) {
  if (cards.length === 0) return null
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel} style={{ color: accent }}>
        <i className={`ti ${icon}`} />
        {label}
        <span className={styles.sectionCount}>{cards.length}</span>
      </div>
      {cards.map(card => (
        <button key={card.id} className={styles.cardItem} onClick={() => onCardClick(card)}>
          {card.prioridad && (
            <span
              className={styles.prioBar}
              style={{ background: PRIORITY_COLOR[card.prioridad] }}
            />
          )}
          <span className={styles.cardTitle}>{card.titulo}</span>
          <span className={styles.cardDate} style={{ color: accent }}>
            {card.fecha_limite}
          </span>
        </button>
      ))}
    </div>
  )
}
