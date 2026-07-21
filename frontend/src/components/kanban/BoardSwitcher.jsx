import { useState, useEffect, useMemo } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { createProject } from '../../services/boardService'
import styles from './BoardSwitcher.module.css'
import { IconClock, IconLayoutBoard, IconPlus, IconSearch, IconTrash, IconX } from '@tabler/icons-react'

// Portada determinista por tablero (gradiente derivado del id/nombre)
function coverGradient(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  const h2 = (h + 45) % 360
  return `linear-gradient(135deg, hsl(${h} 58% 46%), hsl(${h2} 62% 38%))`
}

const RECENT_KEY = 'kairos-recent-boards'
function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function pushRecent(id) {
  const next = [id, ...loadRecent().filter(x => x !== id)].slice(0, 8)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch (_) {}
  return next
}

export default function BoardSwitcher({ onClose }) {
  const { proyectos, proyecto, loadBoard, loadProyectos, removeProyecto } = useBoardStore()
  const [query, setQuery]         = useState('')
  const [creating, setCreating]   = useState(false)
  const [nombre, setNombre]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [recent, setRecent]       = useState(loadRecent())
  const [confirmId, setConfirmId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => { loadProyectos() }, [loadProyectos])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? proyectos.filter(p => p.nombre?.toLowerCase().includes(q)) : proyectos
  }, [proyectos, query])

  const recentBoards = useMemo(() => {
    if (query.trim()) return []
    return recent.map(id => proyectos.find(p => p.id === id)).filter(Boolean).slice(0, 4)
  }, [recent, proyectos, query])

  function selectBoard(id) {
    setRecent(pushRecent(id))
    loadBoard(id)
    onClose()
  }

  async function handleDelete(id) {
    setDeletingId(id)
    try {
      await removeProyecto(id)
    } catch (err) {
      console.error('Error al eliminar tablero:', err)
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    setSaving(true)
    try {
      const p = await createProject({ nombre: nombre.trim() })
      await loadProyectos()
      selectBoard(p.id)
    } finally {
      setSaving(false)
    }
  }

  function BoardCard({ p }) {
    const active = p.id === proyecto?.id
    const canDelete = p.rol === 'admin'
    const confirming = confirmId === p.id
    const deleting = deletingId === p.id

    return (
      <div
        className={`${styles.card} ${active ? styles.cardActive : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => { if (!confirming) selectBoard(p.id) }}
        onKeyDown={e => { if (!confirming && (e.key === 'Enter' || e.key === ' ')) selectBoard(p.id) }}
      >
        <div className={styles.cover} style={{ background: coverGradient(p.id || p.nombre) }}>
          {active && <span className={styles.activeBadge}>● Activo</span>}
          {canDelete && !confirming && (
            <button
              className={styles.deleteBtn}
              title="Eliminar tablero"
              onClick={e => { e.stopPropagation(); setConfirmId(p.id) }}
            >
              <IconTrash size="1em" aria-hidden="true" />
            </button>
          )}
        </div>

        {confirming ? (
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmText}>¿Eliminar "{p.nombre}"?</p>
            <div className={styles.createActions}>
              <button
                type="button"
                className={styles.confirmDelete}
                disabled={deleting}
                onClick={() => handleDelete(p.id)}
              >
                {deleting ? '...' : 'Eliminar'}
              </button>
              <button type="button" className={styles.createCancel} onClick={() => setConfirmId(null)}>✕</button>
            </div>
          </div>
        ) : (
          <div className={styles.cardName}>{p.nombre}</div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.searchWrap}>
            <IconSearch size="1em" aria-hidden="true" />
            <input
              className={styles.search}
              placeholder="Buscar tableros..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Cerrar"><IconX size="1em" /></button>
        </div>

        <div className={styles.body}>
          {recentBoards.length > 0 && (
            <section className={styles.section}>
              <p className={styles.sectionTitle}><IconClock size="1em" /> Recientes</p>
              <div className={styles.grid}>
                {recentBoards.map(p => <BoardCard key={p.id} p={p} />)}
              </div>
            </section>
          )}

          <section className={styles.section}>
            <p className={styles.sectionTitle}><IconLayoutBoard size="1em" /> {query.trim() ? 'Resultados' : 'Todos tus tableros'}</p>
            <div className={styles.grid}>
              {filtered.map(p => <BoardCard key={p.id} p={p} />)}

              {!query.trim() && (
                creating ? (
                  <form className={styles.createCard} onSubmit={handleCreate}>
                    <input
                      className={styles.createInput}
                      placeholder="Nombre del tablero..."
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      autoFocus
                    />
                    <div className={styles.createActions}>
                      <button type="submit" className={styles.createConfirm} disabled={saving}>
                        {saving ? '...' : 'Crear'}
                      </button>
                      <button type="button" className={styles.createCancel} onClick={() => { setCreating(false); setNombre('') }}>✕</button>
                    </div>
                  </form>
                ) : (
                  <button className={styles.newCard} onClick={() => setCreating(true)}>
                    <IconPlus size="1em" aria-hidden="true" />
                    <span>Crear tablero</span>
                  </button>
                )
              )}

              {query.trim() && filtered.length === 0 && (
                <p className={styles.empty}>No se encontró ningún tablero con "{query}".</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
