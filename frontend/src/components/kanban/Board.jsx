import { useState } from 'react'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useBoardStore } from '../../store/boardStore'
import Column from './Column'
import Card from './Card'
import styles from './Board.module.css'

export default function Board() {
  const { columns, cardsByColumn, setCardsByColumn, persistMove } = useBoardStore()
  const [activeCard, setActiveCard] = useState(null)
  const [workingCards, setWorkingCards] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  function getCards() {
    return workingCards || cardsByColumn
  }

  function findColOfCard(cardId, map) {
    const m = map || getCards()
    return columns.find(col => (m[col.id] || []).some(c => c.id === cardId))?.id
  }

  function handleDragStart({ active }) {
    const card = Object.values(getCards()).flat().find(c => c.id === active.id)
    setActiveCard(card || null)
  }

  function handleDragOver({ active, over }) {
    if (!over) return
    const current = getCards()
    const srcColId = findColOfCard(active.id, current)

    // over could be a column or a card — resolve target column
    let tgtColId = columns.find(c => c.id === over.id)?.id
    if (!tgtColId) tgtColId = findColOfCard(over.id, current)

    if (!srcColId || !tgtColId || srcColId === tgtColId) return

    const card = (current[srcColId] || []).find(c => c.id === active.id)
    if (!card) return

    setWorkingCards({
      ...current,
      [srcColId]: (current[srcColId] || []).filter(c => c.id !== active.id),
      [tgtColId]: [...(current[tgtColId] || []), { ...card, columna_id: tgtColId }],
    })
  }

  async function handleDragEnd({ active }) {
    const finalCards = workingCards
    const originalCards = cardsByColumn
    setActiveCard(null)
    setWorkingCards(null)

    if (!finalCards) return

    const newColId = findColOfCard(active.id, finalCards)
    const oldColId = findColOfCard(active.id, originalCards)

    if (newColId && oldColId && newColId !== oldColId) {
      setCardsByColumn(finalCards)
      await persistMove(active.id, newColId)
    }
  }

  const displayCards = workingCards || cardsByColumn

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.board}>
        {columns.map(col => (
          <Column
            key={col.id}
            column={col}
            cards={displayCards[col.id] || []}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? <Card card={activeCard} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
