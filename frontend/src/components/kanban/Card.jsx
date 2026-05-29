import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useBoardStore } from '../../store/boardStore'
import styles from './Card.module.css'

function formatDate(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function getPriorityColor(prioridad) {
  if (prioridad === 'alta') return '#D85A30'
  if (prioridad === 'baja') return '#639922'
  return null
}

export default function Card({ card, columnaId, isOverlay = false }) {
  const { removeCard } = useBoardStore()
  const [hovered, setHovered] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.3 : 1,
    cursor: isOverlay ? 'grabbing' : 'grab',
  }

  const priorityColor = getPriorityColor(card.prioridad)
  const dateStr = formatDate(card.fecha_limite)

  function handleDelete(e) {
    e.stopPropagation()
    removeCard(card.id, columnaId)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Drag handle + delete */}
      <div className={styles.cardActions} style={{ opacity: hovered && !isDragging ? 1 : 0 }}>
        <button className={styles.deleteBtn} onClick={handleDelete} title="Eliminar tarjeta">✕</button>
      </div>

      <div className={styles.dragArea} {...attributes} {...listeners}>
        {card.cover_url && (
          <div className={styles.cover}>
            <img src={card.cover_url} alt="" draggable={false} />
          </div>
        )}

        <div className={styles.body}>
          {card.labels?.length > 0 && (
            <div className={styles.labels}>
              {card.labels.map(label => (
                <span
                  key={label.id}
                  className={styles.label}
                  style={{ background: `${label.color}22`, color: label.color, border: `1px solid ${label.color}44` }}
                >
                  {label.nombre}
                </span>
              ))}
            </div>
          )}

          <p className={styles.title}>{card.titulo}</p>

          <div className={styles.footer}>
            <div className={styles.meta}>
              {dateStr && (
                <span className={styles.metaChip} style={priorityColor ? { color: priorityColor } : undefined}>
                  <span className={styles.metaIcon}>⊡</span>
                  {dateStr}
                </span>
              )}
            </div>
            <div className={styles.avatar}>U</div>
          </div>
        </div>
      </div>
    </div>
  )
}
