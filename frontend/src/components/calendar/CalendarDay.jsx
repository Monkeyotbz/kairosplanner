import { useBoardStore } from '../../store/boardStore'
import styles from './CalendarDay.module.css'
import { IconBrandGoogle } from '@tabler/icons-react'

const MAX_VISIBLE = 3

export default function CalendarDay({ date, isCurrentMonth, isToday, cards, googleEventos = [], columnMap }) {
  const selectCard = useBoardStore(s => s.selectCard)

  const items = [
    ...cards.map(card => ({ kind: 'card', id: card.id, titulo: card.titulo, card })),
    ...googleEventos.map(ev => ({ kind: 'google', id: ev.id, titulo: ev.titulo })),
  ]
  const visible = items.slice(0, MAX_VISIBLE)
  const overflow = items.length - MAX_VISIBLE

  return (
    <div className={`${styles.cell} ${!isCurrentMonth ? styles.dim : ''} ${isToday ? styles.today : ''}`}>
      <span className={styles.num}>{date.getDate()}</span>

      <div className={styles.chips}>
        {visible.map(item => {
          if (item.kind === 'google') {
            return (
              <span key={item.id} className={styles.chip} style={{ '--chip-bar': '#4285F4' }} title={`${item.titulo} · Google Calendar`}>
                <IconBrandGoogle size="0.8em" style={{ marginRight: 3, verticalAlign: -1 }} />
                {item.titulo}
              </span>
            )
          }
          const colColor = columnMap[item.card.columna_id]?.color || 'var(--kairos-purple-600)'
          return (
            <button
              key={item.id}
              className={styles.chip}
              style={{ '--chip-bar': colColor }}
              onClick={() => selectCard(item.card)}
              title={item.titulo}
            >
              {item.titulo}
            </button>
          )
        })}
        {overflow > 0 && (
          <span className={styles.more}>+{overflow} más</span>
        )}
      </div>

      {/* Mobile: solo badge de count si hay algo */}
      {items.length > 0 && (
        <span className={styles.badge} onClick={() => cards[0] && selectCard(cards[0])}>
          {items.length}
        </span>
      )}
    </div>
  )
}
