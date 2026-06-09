import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useBoardStore } from '../../store/boardStore'
import Card from './Card'
import styles from './Column.module.css'

const COLORS = ['#B4B2A9', '#534AB7', '#378ADD', '#EF9F27', '#639922', '#D85A30', '#D4537E', '#14b8a6']

export default function Column({ column, cards }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: 'column' } })
  const { addCard, editColumn, removeColumn } = useBoardStore()
  const [adding, setAdding]     = useState(false)
  const [titulo, setTitulo]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameVal, setNameVal]   = useState(column.nombre)
  const inputRef  = useRef(null)
  const menuRef   = useRef(null)
  const renameRef = useRef(null)

  useEffect(() => { if (adding) inputRef.current?.focus() }, [adding])
  useEffect(() => { if (renaming) { renameRef.current?.focus(); renameRef.current?.select() } }, [renaming])
  useEffect(() => { setNameVal(column.nombre) }, [column.nombre])

  // Cerrar el menú al hacer click afuera
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

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

  function saveRename() {
    const v = nameVal.trim()
    setRenaming(false)
    if (v && v !== column.nombre) editColumn(column.id, { nombre: v })
    else setNameVal(column.nombre)
  }

  function handleDelete() {
    setMenuOpen(false)
    if (confirm(`¿Eliminar la lista "${column.nombre}" y todas sus tarjetas? Esta acción no se puede deshacer.`)) {
      removeColumn(column.id)
    }
  }

  return (
    <div className={styles.column}>
      <div className={styles.colorBar} style={{ background: column.color }} />
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.dot} style={{ background: column.color }} />
          {renaming ? (
            <input
              ref={renameRef}
              className={styles.renameInput}
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={saveRename}
              onKeyDown={e => {
                if (e.key === 'Enter') saveRename()
                if (e.key === 'Escape') { setNameVal(column.nombre); setRenaming(false) }
              }}
            />
          ) : (
            <span className={styles.name} onDoubleClick={() => setRenaming(true)} title="Doble clic para renombrar">
              {column.nombre}
            </span>
          )}
          <span className={styles.count}>{cards.length}</span>
        </div>

        <div className={styles.menuWrap} ref={menuRef}>
          <button className={styles.menu} onClick={() => setMenuOpen(v => !v)} aria-label="Acciones de la lista">•••</button>
          {menuOpen && (
            <div className={styles.menuPopover}>
              <button className={styles.menuItem} onClick={() => { setMenuOpen(false); setAdding(true) }}>
                <i className="ti ti-plus" aria-hidden="true" /> Añadir tarjeta
              </button>
              <button className={styles.menuItem} onClick={() => { setMenuOpen(false); setRenaming(true) }}>
                <i className="ti ti-pencil" aria-hidden="true" /> Renombrar lista
              </button>

              <div className={styles.menuLabel}>Color de la lista</div>
              <div className={styles.swatches}>
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`${styles.swatch} ${column.color === c ? styles.swatchActive : ''}`}
                    style={{ background: c }}
                    onClick={() => editColumn(column.id, { color: c })}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>

              <div className={styles.menuDivider} />
              <button className={`${styles.menuItem} ${styles.menuDanger}`} onClick={handleDelete}>
                <i className="ti ti-trash" aria-hidden="true" /> Eliminar lista
              </button>
            </div>
          )}
        </div>
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
