import { useMemo } from 'react'
import { useBoardStore } from '../../store/boardStore'
import styles from './AgendaList.module.css'

const PRIORITY_COLOR = {
  alta:   'var(--kairos-col-review)',
  normal: 'var(--kairos-col-progress)',
  baja:   'var(--kairos-text-muted)',
}

const PRIORITY_LABEL = { alta: 'Alta', normal: 'Normal', baja: 'Baja' }

function relativeLabel(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((d - today) / 86400000)

  const full = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })

  if (diff < 0) return { text: `Vencido · ${full}`, overdue: true }
  if (diff === 0) return { text: 'Hoy', overdue: false }
  if (diff === 1) return { text: `Mañana · ${full}`, overdue: false }
  if (diff <= 7)  return { text: `En ${diff} días · ${full}`, overdue: false }
  return { text: full, overdue: false }
}

function groupCards(cards) {
  const sorted = [...cards].sort((a, b) => a.fecha_limite.localeCompare(b.fecha_limite))
  const groups = []
  let lastKey = null

  sorted.forEach(card => {
    if (card.fecha_limite !== lastKey) {
      lastKey = card.fecha_limite
      const { text, overdue } = relativeLabel(lastKey)
      groups.push({ key: lastKey, text, overdue, cards: [] })
    }
    groups[groups.length - 1].cards.push(card)
  })

  return groups
}

export default function AgendaList({ cards, columnMap }) {
  const selectCard = useBoardStore(s => s.selectCard)
  const groups = useMemo(() => groupCards(cards), [cards])

  if (groups.length === 0) {
    return <div className={styles.empty}>Sin tareas con fecha límite.</div>
  }

  return (
    <div className={styles.scroll}>
      {groups.map(group => (
        <div key={group.key} className={styles.group}>
          <div className={`${styles.groupLabel} ${group.overdue ? styles.overdue : ''}`}>
            {group.text}
            <span className={styles.groupCount}>{group.cards.length}</span>
          </div>

          {group.cards.map(card => {
            const col = columnMap[card.columna_id]
            const colColor = col?.color || 'var(--kairos-purple-600)'
            return (
              <button key={card.id} className={styles.item} onClick={() => selectCard(card)}>
                <span className={styles.dot} style={{ background: colColor }} />
                <span className={styles.itemTitle}>{card.titulo}</span>

                {card.prioridad && card.prioridad !== 'normal' && (
                  <span
                    className={styles.priorityBadge}
                    style={{ color: PRIORITY_COLOR[card.prioridad] }}
                  >
                    {PRIORITY_LABEL[card.prioridad]}
                  </span>
                )}

                {col && <span className={styles.colBadge}>{col.nombre}</span>}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
