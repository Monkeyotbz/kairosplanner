import { useState, useEffect, useRef } from 'react'
import { getSubtareas, createSubtarea, toggleSubtarea, deleteSubtarea } from '../../services/boardService'
import { useBoardStore } from '../../store/boardStore'
import styles from './CardChecklist.module.css'

export default function CardChecklist({ cardId, triggerAdd = 0 }) {
  const updateSelectedCardSubtasks = useBoardStore(s => s.updateSelectedCardSubtasks)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [addError, setAddError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!cardId) return
    setLoading(true)
    getSubtareas(cardId)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [cardId])

  // Trigger externo desde el botón lateral del modal
  useEffect(() => {
    if (triggerAdd > 0) setAdding(true)
  }, [triggerAdd])

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  async function handleAdd(e) {
    e.preventDefault()
    const t = newTitle.trim()
    if (!t) return
    setAddError('')
    try {
      const item = await createSubtarea(cardId, t)
      setItems(prev => [...prev, item])
      setNewTitle('')
      inputRef.current?.focus()
    } catch (err) {
      setAddError(err.message || 'Error al guardar')
    }
  }

  async function handleToggle(id, current) {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === id ? { ...i, completada: !current } : i))
    await toggleSubtarea(id, !current)
  }

  async function handleDelete(id) {
    setItems(prev => prev.filter(i => i.id !== id))
    await deleteSubtarea(id)
  }

  function cancelAdding() {
    setAdding(false)
    setNewTitle('')
    setAddError('')
  }

  const done = items.filter(i => i.completada).length
  const total = items.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  // Mantiene la tarjeta en cardsByColumn en sync (chip de progreso + filtro
  // de Subtareas), sin esperar a recargar el tablero.
  useEffect(() => {
    if (loading) return
    updateSelectedCardSubtasks(done, total)
  }, [done, total, loading])

  return (
    <div className={styles.wrap}>

      {/* Progress bar — solo si hay items */}
      {total > 0 && (
        <div className={styles.progress}>
          <span className={styles.pct}>{pct}%</span>
          <div className={styles.bar}>
            <div className={styles.fill} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.count}>{done}/{total}</span>
        </div>
      )}

      {/* Lista de subtareas */}
      {loading ? (
        <span className={styles.loadingText}>Cargando…</span>
      ) : (
        <ul className={styles.list}>
          {items.map(item => (
            <li key={item.id} className={`${styles.item} ${item.completada ? styles.itemDone : ''}`}>
              <button
                className={styles.check}
                onClick={() => handleToggle(item.id, item.completada)}
                aria-label={item.completada ? 'Marcar pendiente' : 'Marcar completada'}
              >
                <i className={item.completada ? 'ti ti-square-check-filled' : 'ti ti-square'} />
              </button>
              <span className={styles.itemText}>{item.titulo}</span>
              <button
                className={styles.del}
                onClick={() => handleDelete(item.id)}
                aria-label="Eliminar subtarea"
              >
                <i className="ti ti-x" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Formulario de nueva subtarea */}
      {adding ? (
        <form className={styles.addForm} onSubmit={handleAdd}>
          <input
            ref={inputRef}
            className={styles.addInput}
            value={newTitle}
            onChange={e => { setNewTitle(e.target.value); setAddError('') }}
            placeholder="Descripción de la subtarea…"
            onKeyDown={e => { if (e.key === 'Escape') cancelAdding() }}
          />
          {addError && <p className={styles.addError}>{addError}</p>}
          <div className={styles.addActions}>
            <button type="submit" className={styles.addConfirm} disabled={!newTitle.trim()}>
              Agregar
            </button>
            <button type="button" className={styles.addCancel} onClick={cancelAdding}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button className={styles.addBtn} onClick={() => setAdding(true)}>
          <i className="ti ti-plus" /> Agregar subtarea
        </button>
      )}

    </div>
  )
}
