import { useState, useRef, useEffect } from 'react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useBoardStore } from '../../store/boardStore'
import Card from './Card'
import styles from './Column.module.css'

const COLORS = ['#B4B2A9', '#534AB7', '#378ADD', '#EF9F27', '#639922', '#D85A30', '#D4537E', '#14b8a6']

export default function Column({ column, cards }) {
  const { addCard, editColumn, removeColumn, duplicateColumn, moveColumn, sortColumnCards } = useBoardStore()
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: column.id, data: { type: 'column' } })

  const [adding, setAdding]     = useState(false)
  const [titulo, setTitulo]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameVal, setNameVal]   = useState(column.nombre)
  const inputRef  = useRef(null)
  const menuRef   = useRef(null)
  const renameRef = useRef(null)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  useEffect(() => { if (adding) inputRef.current?.focus() }, [adding])
  useEffect(() => { if (renaming) { renameRef.current?.focus(); renameRef.current?.select() } }, [renaming])
  useEffect(() => { setNameVal(column.nombre) }, [column.nombre])

  useEffect(() => {
    if (!menuOpen) return
    function onClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  async function handleAdd() {
    if (!titulo.trim()) return setAdding(false)
    setSaving(true)
    try { await addCard(column.id, titulo.trim()); setTitulo(''); setAdding(false) }
    finally { setSaving(false) }
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
    <div ref={setNodeRef} style={style} className={styles.column}>
      <div className={styles.colorBar} style={{ background: column.color }} />

      <div className={styles.header}>
        <div className={`${styles.headerLeft} ${styles.dragHandle}`} {...attributes} {...listeners}>
          <span className={styles.dot} style={{ background: column.color }} />
          {renaming ? (
            <input
              ref={renameRef}
              className={styles.renameInput}
              value={nameVal}
              onPointerDown={e => e.stopPropagation()}
              onChange={e => setNameVal(e.target.value)}
              onBlur={saveRename}
              onKeyDown={e => {
                if (e.key === 'Enter') saveRename()
                if (e.key === 'Escape') { setNameVal(column.nombre); setRenaming(false) }
              }}
            />
          ) : (
            <span className={styles.name} onDoubleClick={() => setRenaming(true)} title="Arrastra para reordenar · doble clic para renombrar">
              {column.nombre}
            </span>
          )}
          <span className={styles.count}>{cards.length}</span>
        </div>

        <div className={styles.menuWrap} ref={menuRef} onPointerDown={e => e.stopPropagation()}>
          <button className={styles.menu} onClick={() => setMenuOpen(v => !v)} aria-label="Acciones de la lista">•••</button>
          {menuOpen && (
            <div className={styles.menuPopover}>
              <button className={styles.menuItem} onClick={() => { setMenuOpen(false); setAdding(true) }}>
                <i className="ti ti-plus" aria-hidden="true" /> Añadir tarjeta
              </button>
              <button className={styles.menuItem} onClick={() => { setMenuOpen(false); setRenaming(true) }}>
                <i className="ti ti-pencil" aria-hidden="true" /> Renombrar lista
              </button>
              <button className={styles.menuItem} onClick={() => { setMenuOpen(false); duplicateColumn(column.id) }}>
                <i className="ti ti-copy" aria-hidden="true" /> Copiar lista
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

              <div className={styles.menuLabel}>Mover lista</div>
              <div className={styles.menuRow}>
                <button className={styles.menuChip} onClick={() => { setMenuOpen(false); moveColumn(column.id, -1) }}>
                  <i className="ti ti-arrow-left" /> Izquierda
                </button>
                <button className={styles.menuChip} onClick={() => { setMenuOpen(false); moveColumn(column.id, 1) }}>
                  Derecha <i className="ti ti-arrow-right" />
                </button>
              </div>

              <div className={styles.menuLabel}>Ordenar tarjetas por</div>
              <div className={styles.menuRow}>
                <button className={styles.menuChip} onClick={() => { setMenuOpen(false); sortColumnCards(column.id, 'fecha') }}>Fecha</button>
                <button className={styles.menuChip} onClick={() => { setMenuOpen(false); sortColumnCards(column.id, 'prioridad') }}>Prioridad</button>
                <button className={styles.menuChip} onClick={() => { setMenuOpen(false); sortColumnCards(column.id, 'nombre') }}>Nombre</button>
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
        <div className={styles.cards}>
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
