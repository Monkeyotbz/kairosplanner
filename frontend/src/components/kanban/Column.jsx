import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useBoardStore } from '../../store/boardStore'
import Card from './Card'
import styles from './Column.module.css'

export default function Column({ column, cards }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column' } })
  const { addCard } = useBoardStore()
  const [adding, setAdding]   = useState(false)
  const [titulo, setTitulo]   = useState('')
  const [saving, setSaving]   = useState(false)
  const inputRef              = useRef(null)

  useEffect(() => { if (adding) inputRef.current?.focus() }, [adding])

  async function handleAdd() {
    if (!titulo.trim()) return setAdding(false)
    setSaving(true)
    try {
      await addCard(column.id, titulo.trim())
      setTitulo('')
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') { setTitulo(''); setAdding(false) }
  }

  return (
    <div className={styles.column}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.dot} style={{ background: column.color }} />
          <span className={styles.name}>{column.nombre}</span>
          <span className={styles.count}>{cards.length}</span>
        </div>
        <button className={styles.menu}>•••</button>
      </div>

      <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={`${styles.cards} ${isOver ? styles.over : ''}`}>
          {cards.map(card => (
            <Card key={card.id} card={card} columnaId={column.id} />
          ))}

          {adding && (
            <div className={styles.addingCard}>
              <textarea
                ref={inputRef}
                className={styles.addingInput}
                placeholder="Nombre de la tarjeta..."
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                disabled={saving}
              />
              <div className={styles.addingActions}>
                <button className={styles.addingConfirm} onClick={handleAdd} disabled={saving}>
                  {saving ? '...' : 'Añadir'}
                </button>
                <button className={styles.addingCancel} onClick={() => { setTitulo(''); setAdding(false) }}>✕</button>
              </div>
            </div>
          )}
        </div>
      </SortableContext>

      {!adding && (
        <button className={styles.addBtn} onClick={() => setAdding(true)}>
          <span>+</span> Añadir tarjeta
        </button>
      )}
    </div>
  )
}
