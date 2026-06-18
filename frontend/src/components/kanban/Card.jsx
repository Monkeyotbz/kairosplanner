import { useState, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useBoardStore } from '../../store/boardStore'
import { useFocusStore } from '../../store/focusStore'
import styles from './Card.module.css'

const PRIORITY_MAP = {
  alta: { label: 'Alta', cls: styles.priorityAlta },
  baja: { label: 'Baja', cls: styles.priorityBaja },
}

function getDeadlineInfo(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(dateStr + 'T00:00:00')
  const diff  = Math.round((due - today) / 86400000)
  if (diff < 0)   return { label: 'Atrasada',       status: 'overdue' }
  if (diff === 0) return { label: 'Hoy',             status: 'today' }
  if (diff === 1) return { label: 'Mañana',          status: 'soon' }
  if (diff <= 6)  return { label: `En ${diff} días`, status: 'upcoming' }
  return {
    label: due.toLocaleDateString('es', { day: 'numeric', month: 'short' }),
    status: 'normal',
  }
}

export default function Card({ card, columnaId, isOverlay = false }) {
  const { removeCard, selectCard } = useBoardStore()
  const [hovered, setHovered] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, data: { type: 'card' } })
  const pointerPos = useRef(null)

  const immersive  = useFocusStore(s => s.immersive)
  const focusPhase = useFocusStore(s => s.phase)
  const activeTask = useFocusStore(s => s.activeTask)
  const spotlight   = !isOverlay && !immersive && (focusPhase === 'active' || focusPhase === 'break') && !!activeTask
  const isFocusTask = spotlight && activeTask.id === card.id

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.3 : (spotlight && !isFocusTask ? 0.32 : 1),
    cursor: isOverlay ? 'grabbing' : 'grab',
  }

  const priority    = PRIORITY_MAP[card.prioridad]
  const deadline    = getDeadlineInfo(card.fecha_limite)
  const hasSubs     = card.subtaskTotal > 0
  const allDone     = hasSubs && card.subtaskDone === card.subtaskTotal

  function handleDelete(e) {
    e.stopPropagation()
    removeCard(card.id, columnaId)
  }

  function handlePointerDown(e) {
    pointerPos.current = { x: e.clientX, y: e.clientY }
  }

  function handleClick(e) {
    if (isOverlay || !pointerPos.current) return
    const dx = Math.abs(e.clientX - pointerPos.current.x)
    const dy = Math.abs(e.clientY - pointerPos.current.y)
    if (dx < 5 && dy < 5) selectCard(card)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        styles.card,
        isDragging   ? styles.dragging   : '',
        spotlight    ? styles.spotlight  : '',
        isFocusTask  ? styles.focusTask  : '',
        priority     ? priority.cls      : '',
      ].join(' ')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <div className={styles.cardActions} style={{ opacity: hovered && !isDragging ? 1 : 0 }}>
        <button className={styles.deleteBtn} onClick={handleDelete} title="Eliminar tarjeta">✕</button>
      </div>

      <div className={styles.dragArea} {...attributes} {...listeners}>
        {card.cover_url && (
          <div className={styles.cover}>
            <img
              src={card.cover_url}
              alt=""
              draggable={false}
              onError={e => { e.currentTarget.parentElement.style.display = 'none' }}
            />
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
              {deadline && (
                <span className={`${styles.deadlineChip} ${styles['deadline_' + deadline.status]}`}>
                  <i className="ti ti-calendar-event" />
                  {deadline.label}
                </span>
              )}

              {hasSubs && (
                <span className={`${styles.subsChip} ${allDone ? styles.subsChipDone : ''}`}>
                  <i className={`ti ${allDone ? 'ti-circle-check' : 'ti-checkbox'}`} />
                  {card.subtaskDone}/{card.subtaskTotal}
                </span>
              )}
            </div>

            {priority && (
              <span className={`${styles.priorityChip} ${card.prioridad === 'alta' ? styles.priorityChipAlta : styles.priorityChipBaja}`}>
                {priority.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
