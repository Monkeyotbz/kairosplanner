import { useMemo } from 'react'
import CalendarDay from './CalendarDay'
import styles from './CalendarGrid.module.css'

const DAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function buildMonthDays(date) {
  const year = date.getFullYear()
  const month = date.getMonth()

  // getDay() returns 0=Sun, 1=Mon...6=Sat — normalize to 0=Mon
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const days = []

  // Fill from previous month
  for (let i = firstDow - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, daysInPrevMonth - i), current: false })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month, d), current: true })
  }

  // Fill to complete 6 rows (42 cells)
  const remaining = 42 - days.length
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: new Date(year, month + 1, d), current: false })
  }

  return days
}

function toKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function CalendarGrid({ currentDate, cards, columnMap }) {
  const days = useMemo(() => buildMonthDays(currentDate), [currentDate])

  const cardsByDate = useMemo(() => {
    const map = {}
    cards.forEach(card => {
      if (!map[card.fecha_limite]) map[card.fecha_limite] = []
      map[card.fecha_limite].push(card)
    })
    return map
  }, [cards])

  const todayKey = toKey(new Date())

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {DAY_HEADERS.map(h => (
          <div key={h} className={styles.header}>{h}</div>
        ))}
        {days.map(({ date, current }) => {
          const key = toKey(date)
          return (
            <CalendarDay
              key={key}
              date={date}
              isCurrentMonth={current}
              isToday={key === todayKey}
              cards={cardsByDate[key] || []}
              columnMap={columnMap}
            />
          )
        })}
      </div>
    </div>
  )
}
