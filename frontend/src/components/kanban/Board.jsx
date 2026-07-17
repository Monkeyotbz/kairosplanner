import { useState, useRef, useEffect } from 'react'
import { DndContext, DragOverlay, closestCorners, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useBoardStore } from '../../store/boardStore'
import Column from './Column'
import Card from './Card'
import styles from './Board.module.css'

export default function Board({ activeFilters }) {
  const { columns, cardsByColumn, setCardsByColumn, persistMove, searchQuery, addColumn, reorderColumns } = useBoardStore()
  const [activeCard, setActiveCard] = useState(null)
  const [workingCards, setWorkingCards] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  function getCards() {
    return workingCards || cardsByColumn
  }

  function findColOfCard(cardId, map) {
    const m = map || getCards()
    return columns.find(col => (m[col.id] || []).some(c => c.id === cardId))?.id
  }

  function handleDragStart({ active }) {
    if (active.data.current?.type === 'column') { setActiveCard(null); return }
    const card = Object.values(getCards()).flat().find(c => c.id === active.id)
    setActiveCard(card || null)
  }

  function handleDragOver({ active, over }) {
    if (active.data.current?.type === 'column') return  // las columnas se reordenan al soltar
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

  async function handleDragEnd({ active, over }) {
    // ── Reordenar columnas ──
    if (active.data.current?.type === 'column') {
      setActiveCard(null)
      setWorkingCards(null)
      if (!over) return
      const ids = columns.map(c => c.id)
      const oldIndex = ids.indexOf(active.id)
      const overColId = columns.find(c => c.id === over.id)?.id || findColOfCard(over.id, cardsByColumn)
      const newIndex = ids.indexOf(overColId)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderColumns(arrayMove(ids, oldIndex, newIndex))
      }
      return
    }

    // ── Mover tarjeta entre columnas ──
    const finalCards = workingCards
    const originalCards = cardsByColumn
    setActiveCard(null)
    setWorkingCards(null)

    if (!finalCards) return

    const newColId = findColOfCard(active.id, finalCards)
    const oldColId = findColOfCard(active.id, originalCards)

    if (newColId && oldColId && newColId !== oldColId) {
      setCardsByColumn(finalCards)
      await persistMove(active.id, newColId, oldColId)
    }
  }

  const { selectedPriorities = [], selectedTags = [], selectedMembers = [], selectedLists = [] } = activeFilters || {}
  const hasActiveFilters = selectedPriorities.length > 0 || selectedTags.length > 0 || selectedMembers.length > 0

  function matchesFilters(c) {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!c.titulo.toLowerCase().includes(q) && !(c.descripcion || '').toLowerCase().includes(q)) return false
    }
    if (selectedPriorities.length && !selectedPriorities.includes(c.prioridad)) return false
    if (selectedTags.length && !(c.labels || []).some(l => selectedTags.includes(l.id))) return false
    if (selectedMembers.length && !selectedMembers.includes(c.asignado_a)) return false
    return true
  }

  const baseCards = workingCards || cardsByColumn
  const displayCards = (searchQuery || hasActiveFilters)
    ? Object.fromEntries(
        Object.entries(baseCards).map(([colId, cards]) => [colId, cards.filter(matchesFilters)])
      )
    : baseCards

  // Filtro "por lista": las columnas no seleccionadas se ocultan del todo.
  const visibleColumns = selectedLists.length
    ? columns.filter(col => selectedLists.includes(col.id))
    : columns

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.board}>
        <SortableContext items={visibleColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
          {visibleColumns.map(col => (
            <Column
              key={col.id}
              column={col}
              cards={displayCards[col.id] || []}
            />
          ))}
        </SortableContext>
        <AddList onAdd={addColumn} />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? <Card card={activeCard} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function AddList({ onAdd }) {
  const [open, setOpen]   = useState(false)
  const [nombre, setNombre] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  function submit() {
    const v = nombre.trim()
    if (v) onAdd(v)
    setNombre('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button className={styles.addList} onClick={() => setOpen(true)}>
        <span>+</span> Añadir otra lista
      </button>
    )
  }

  return (
    <div className={styles.addListForm}>
      <input
        ref={inputRef}
        className={styles.addListInput}
        placeholder="Nombre de la lista..."
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') { setNombre(''); setOpen(false) }
        }}
        onBlur={() => { if (!nombre.trim()) setOpen(false) }}
      />
      <div className={styles.addListActions}>
        <button className={styles.addListConfirm} onMouseDown={e => e.preventDefault()} onClick={submit}>Añadir lista</button>
        <button className={styles.addListCancel} onClick={() => { setNombre(''); setOpen(false) }}>✕</button>
      </div>
    </div>
  )
}
