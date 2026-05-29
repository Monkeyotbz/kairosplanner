import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import Card from './Card'
import styles from './Column.module.css'

export default function Column({ column, cards }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column' },
  })

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
        <div
          ref={setNodeRef}
          className={`${styles.cards} ${isOver ? styles.over : ''}`}
        >
          {cards.map(card => (
            <Card key={card.id} card={card} />
          ))}
        </div>
      </SortableContext>

      <button className={styles.addBtn}>
        <span>+</span> Añadir tarjeta
      </button>
    </div>
  )
}
