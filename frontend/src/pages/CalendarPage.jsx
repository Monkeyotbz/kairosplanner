import { useState, useMemo, useEffect } from 'react'
import { useBoardStore } from '../store/boardStore'
import CalendarGrid from '../components/calendar/CalendarGrid'
import DayBlocks    from '../components/calendar/DayBlocks'
import KairosFlow   from '../components/calendar/KairosFlow'
import CardDetailModal from '../components/kanban/CardDetailModal'
import styles from './CalendarPage.module.css'

/* ─── helpers de fecha ─────────────────────────────────────── */
function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function sameDay(a, b) { return toKey(a) === toKey(b) }
function today0() { const d = new Date(); d.setHours(0,0,0,0); return d }

const WEEK_DAYS = ['L','M','X','J','V','S','D']

/* ─── MiniCalendar (sidebar) ──────────────────────────────── */
function buildMiniMonth(date) {
  const y = date.getFullYear(), m = date.getMonth()
  const first = new Date(y, m, 1)
  const last  = new Date(y, m+1, 0)
  let startDOW = first.getDay()          // 0 = Dom
  startDOW = startDOW === 0 ? 6 : startDOW - 1  // → 0 = Lun
  const days = []
  for (let i = 0; i < startDOW; i++)
    days.push({ date: new Date(y, m, -startDOW+i+1), cur: false })
  for (let i = 1; i <= last.getDate(); i++)
    days.push({ date: new Date(y, m, i), cur: true })
  const rem = 42 - days.length
  for (let i = 1; i <= rem; i++)
    days.push({ date: new Date(y, m+1, i), cur: false })
  return days
}

function MiniCalendar({ miniDate, setMiniDate, selectedDay, setSelectedDay, cardKeys }) {
  const days = useMemo(() => buildMiniMonth(miniDate), [miniDate])
  const todayKey = toKey(today0())

  const prevMonth = () => setMiniDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))
  const nextMonth = () => setMiniDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))

  const monthLabel = miniDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <div className={styles.mini}>
      <div className={styles.miniHeader}>
        <button className={styles.miniNav} onClick={prevMonth}>‹</button>
        <span className={styles.miniMonth}>{monthLabel}</span>
        <button className={styles.miniNav} onClick={nextMonth}>›</button>
      </div>

      <div className={styles.miniGrid}>
        {WEEK_DAYS.map(d => (
          <span key={d} className={styles.miniWeekDay}>{d}</span>
        ))}
        {days.map(({ date, cur }, i) => {
          const key = toKey(date)
          const isToday    = key === todayKey
          const isSelected = sameDay(date, selectedDay)
          const hasCards   = cardKeys.has(key)
          return (
            <button
              key={i}
              className={[
                styles.miniDay,
                !cur           ? styles.miniDayDim      : '',
                isToday        ? styles.miniDayToday    : '',
                isSelected     ? styles.miniDaySelected : '',
              ].join(' ')}
              onClick={() => {
                setSelectedDay(date)
                // Si el día pertenece a otro mes, navega el mini-cal
                if (date.getMonth() !== miniDate.getMonth()) setMiniDate(new Date(date.getFullYear(), date.getMonth(), 1))
              }}
            >
              {date.getDate()}
              {hasCards && !isSelected && <span className={styles.miniDot} />}
            </button>
          )
        })}
      </div>

      <button className={styles.miniTodayBtn} onClick={() => {
        const t = today0()
        setSelectedDay(t)
        setMiniDate(new Date(t.getFullYear(), t.getMonth(), 1))
      }}>
        Hoy
      </button>
    </div>
  )
}

/* ─── CalendarPage ─────────────────────────────────────────── */
export default function CalendarPage() {
  const [view, setView]               = useState('planner')
  const [selectedDay, setSelectedDay] = useState(today0)
  const [miniDate, setMiniDate]       = useState(() => {
    const t = today0(); return new Date(t.getFullYear(), t.getMonth(), 1)
  })
  // Para CalendarGrid/AgendaList (navegan por mes)
  const [currentDate, setCurrentDate] = useState(new Date())

  const cardsByColumn = useBoardStore(s => s.cardsByColumn)
  const columns       = useBoardStore(s => s.columns)
  const selectedCard  = useBoardStore(s => s.selectedCard)
  const loading       = useBoardStore(s => s.loading)
  const loadBoard     = useBoardStore(s => s.loadBoard)

  useEffect(() => { if (!columns.length) loadBoard() }, [])

  const allCards = useMemo(() =>
    Object.values(cardsByColumn).flat().filter(c => c.fecha_limite),
    [cardsByColumn]
  )

  const columnMap = useMemo(() =>
    Object.fromEntries(columns.map(c => [c.id, c])),
    [columns]
  )

  // Set de fechas con tarjetas (para puntos en el mini-calendario)
  const cardKeys = useMemo(() => new Set(allCards.map(c => c.fecha_limite)), [allCards])

  // Navegación del planner por día
  const goToPrevDay = () => setSelectedDay(d => { const n = new Date(d); n.setDate(n.getDate()-1); return n })
  const goToNextDay = () => setSelectedDay(d => { const n = new Date(d); n.setDate(n.getDate()+1); return n })

  // Navegación del mes (para vistas Mes/Lista)
  const goToPrev = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))
  const goToNext = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDay(today0()); setMiniDate(() => { const t=today0(); return new Date(t.getFullYear(),t.getMonth(),1) }) }

  // Cuando selectedDay cambia, sincroniza el mini-cal si cambia de mes
  useEffect(() => {
    if (selectedDay.getMonth() !== miniDate.getMonth() ||
        selectedDay.getFullYear() !== miniDate.getFullYear()) {
      setMiniDate(new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1))
    }
  }, [selectedDay])

  const VIEW_TABS = [
    { id: 'planner', label: 'Flujo', icon: 'ti-infinity' },
    { id: 'month',   label: 'Mes',   icon: 'ti-calendar-month' },
    { id: 'day',     label: 'Día',   icon: 'ti-layout-list' },
  ]

  const isDayView = view === 'planner' || view === 'day'

  const monthLabel = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Agenda</h1>
          {view === 'month' && (
            <span className={styles.monthLabel}>{monthLabel}</span>
          )}
        </div>

        <div className={styles.controls}>
          {/* Tabs de vista */}
          <div className={styles.viewToggle}>
            {VIEW_TABS.map(t => (
              <button
                key={t.id}
                className={`${styles.viewBtn} ${view === t.id ? styles.viewBtnActive : ''}`}
                onClick={() => setView(t.id)}
              >
                <i className={`ti ${t.icon}`} />
                <span className={styles.viewBtnLabel}>{t.label}</span>
              </button>
            ))}
          </div>

          <button className={styles.todayBtn} onClick={goToToday}>Hoy</button>

          {/* Navegación contextual */}
          {isDayView ? (
            <div className={styles.navBtns}>
              <button className={styles.navBtn} onClick={goToPrevDay}>‹</button>
              <button className={styles.navBtn} onClick={goToNextDay}>›</button>
            </div>
          ) : (
            <div className={styles.navBtns}>
              <button className={styles.navBtn} onClick={goToPrev}>‹</button>
              <button className={styles.navBtn} onClick={goToNext}>›</button>
            </div>
          )}
        </div>
      </header>

      {/* ── Body (sidebar + main) ───────────────────────────── */}
      <div className={styles.body}>
        {/* Sidebar: mini calendario + ABAD */}
        <aside className={styles.sidebar}>
          <MiniCalendar
            miniDate={miniDate}
            setMiniDate={setMiniDate}
            selectedDay={selectedDay}
            setSelectedDay={d => { setSelectedDay(d); setView(v => v === 'month' ? 'day' : v) }}
            cardKeys={cardKeys}
          />

        </aside>

        {/* Main: vista activa */}
        <div className={styles.main}>
          {loading && !columns.length ? (
            <div className={styles.empty}>Cargando tablero…</div>
          ) : view === 'planner' ? (
            <KairosFlow
              selectedDay={selectedDay}
              cards={allCards}
              columnMap={columnMap}
            />
          ) : view === 'day' ? (
            <DayBlocks
              selectedDay={selectedDay}
              cards={allCards}
              columnMap={columnMap}
            />
          ) : (
            <CalendarGrid currentDate={currentDate} cards={allCards} columnMap={columnMap} />
          )}
        </div>
      </div>

      {selectedCard && <CardDetailModal />}
    </div>
  )
}
