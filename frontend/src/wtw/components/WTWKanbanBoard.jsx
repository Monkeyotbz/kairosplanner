import { useEffect, useState, useCallback } from 'react'
import { getBoard, addCard, moveCard, deleteCard } from '../services/wtwKanbanService'
import styles from './WTWKanbanBoard.module.css'

const PRIORIDAD_COLOR = { alta: '#ef4444', media: '#f59e0b', baja: '#22c55e' }

function CardItem({ card, columns, onMove, onDelete }) {
  const [showMove, setShowMove] = useState(false)
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.cardTitle}>{card.titulo}</span>
        <button className={styles.cardDel} onClick={() => onDelete(card.id)}>
          <i className="ti ti-x" />
        </button>
      </div>
      <div className={styles.cardMeta}>
        <span className={styles.badge} style={{ background: PRIORIDAD_COLOR[card.prioridad] + '22', color: PRIORIDAD_COLOR[card.prioridad] }}>
          {card.prioridad}
        </span>
        {card.fecha_limite && (
          <span className={styles.deadline}>
            <i className="ti ti-calendar" />
            {new Date(card.fecha_limite).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {card.descripcion?.includes('📧') && (
          <span className={styles.emailTag}><i className="ti ti-mail" /> email</span>
        )}
      </div>
      <button className={styles.moveBtn} onClick={() => setShowMove(v => !v)}>
        <i className="ti ti-arrows-move" /> Mover
      </button>
      {showMove && (
        <div className={styles.moveMenu}>
          {columns.filter(c => c.id !== card.columna_id).map(c => (
            <button key={c.id} onClick={() => { onMove(card.id, c.id); setShowMove(false) }}>
              {c.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Column({ col, cards, columns, onMove, onDelete, onAdd }) {
  const [adding, setAdding] = useState(false)
  const [titulo, setTitulo] = useState('')

  async function handleAdd(e) {
    e.preventDefault()
    if (!titulo.trim()) return
    await onAdd(col.id, titulo.trim())
    setTitulo('')
    setAdding(false)
  }

  return (
    <div className={styles.column}>
      <div className={styles.colHeader} style={{ borderTopColor: col.color || '#534AB7' }}>
        <span className={styles.colName}>{col.nombre}</span>
        <span className={styles.colCount}>{cards.length}</span>
      </div>
      <div className={styles.cardList}>
        {cards.map(c => (
          <CardItem key={c.id} card={c} columns={columns} onMove={onMove} onDelete={onDelete} />
        ))}
      </div>
      {adding ? (
        <form className={styles.addForm} onSubmit={handleAdd}>
          <input
            autoFocus
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Título de la tarea..."
            className={styles.addInput}
          />
          <div className={styles.addActions}>
            <button type="submit" className={styles.addSave}>Agregar</button>
            <button type="button" onClick={() => setAdding(false)} className={styles.addCancel}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button className={styles.addCardBtn} onClick={() => setAdding(true)}>
          <i className="ti ti-plus" /> Agregar tarea
        </button>
      )}
    </div>
  )
}

export default function WTWKanbanBoard({ userId }) {
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const data = await getBoard(userId)
    setBoard(data)
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  async function handleAdd(columnaId, titulo) {
    const card = await addCard(columnaId, { titulo })
    setBoard(b => ({ ...b, tarjetas: [card, ...b.tarjetas] }))
  }

  async function handleMove(cardId, newColumnaId) {
    await moveCard(cardId, newColumnaId)
    setBoard(b => ({
      ...b,
      tarjetas: b.tarjetas.map(c => c.id === cardId ? { ...c, columna_id: newColumnaId } : c),
    }))
  }

  async function handleDelete(cardId) {
    await deleteCard(cardId)
    setBoard(b => ({ ...b, tarjetas: b.tarjetas.filter(c => c.id !== cardId) }))
  }

  if (loading) return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <p>Cargando tablero…</p>
    </div>
  )

  if (!board) return (
    <div className={styles.empty}>
      <i className="ti ti-layout-kanban" />
      <p>No se encontró tablero. Cierra sesión y vuelve a conectar.</p>
    </div>
  )

  return (
    <div className={styles.board}>
      {board.columnas.map(col => (
        <Column
          key={col.id}
          col={col}
          cards={board.tarjetas.filter(t => t.columna_id === col.id)}
          columns={board.columnas}
          onMove={handleMove}
          onDelete={handleDelete}
          onAdd={handleAdd}
        />
      ))}
    </div>
  )
}
