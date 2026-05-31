import { useBoardStore } from '../../store/boardStore'
import styles from './CalendarDay.module.css'

const MAX_VISIBLE = 3

export default function CalendarDay({ date, isCurrentMonth, isToday, cards, columnMap }) {
  const selectCard = useBoardStore(s => s.selectCard)
  const visible = cards.slice(0, MAX_VISIBLE)
  const overflow = cards.length - MAX_VISIBLE

  return (
    <div className={`${styles.cell} ${!isCurrentMonth ? styles.dim : ''} ${isToday ? styles.today : ''}`}>
      <span className={styles.num}>{date.getDate()}</span>

      <div className={styles.chips}>
        {visible.map(card => {
          const colColor = columnMap[card.columna_id]?.color || 'var(--kairos-purple-600)'
          return (
            <button
              key={card.id}
              className={styles.chip}
              style={{ '--chip-bar': colColor }}
              onClick={() => selectCard(card)}
              title={card.titulo}
            >
              {card.titulo}
            </button>
          )
        })}
        {overflow > 0 && (
          <span className={styles.more}>+{overflow} más</span>
        )}
      </div>

      {/* Mobile: solo badge de count si hay tarjetas */}
      {cards.length > 0 && (
        <span className={styles.badge} onClick={() => selectCard(visible[0])}>
          {cards.length}
        </span>
      )}
    </div>
  )
}
