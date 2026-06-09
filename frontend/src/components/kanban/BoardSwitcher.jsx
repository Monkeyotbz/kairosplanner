import { useState, useEffect, useMemo } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { createProject } from '../../services/boardService'
import styles from './BoardSwitcher.module.css'

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
  const { proyectos, proyecto, loadBoard, loadProyectos } = useBoardStore()
  const [query, setQuery]       = useState('')
  const [creating, setCreating] = useState(false)
  const [nombre, setNombre]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [recent, setRecent]     = useState(loadRecent())

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
    return (
      <button className={`${styles.card} ${active ? styles.cardActive : ''}`} onClick={() => selectBoard(p.id)}>
        <div className={styles.cover} style={{ background: coverGradient(p.id || p.nombre) }}>
          {active && <span className={styles.activeBadge}>● Activo</span>}
        </div>
        <div className={styles.cardName}>{p.nombre}</div>
      </button>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.searchWrap}>
            <i className="ti ti-search" aria-hidden="true" />
            <input
              className={styles.search}
              placeholder="Buscar tableros..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Cerrar"><i className="ti ti-x" /></button>
        </div>

        <div className={styles.body}>
          {recentBoards.length > 0 && (
            <section className={styles.section}>
              <p className={styles.sectionTitle}><i className="ti ti-clock" /> Recientes</p>
              <div className={styles.grid}>
                {recentBoards.map(p => <BoardCard key={p.id} p={p} />)}
              </div>
            </section>
          )}

          <section className={styles.section}>
            <p className={styles.sectionTitle}><i className="ti ti-layout-board" /> {query.trim() ? 'Resultados' : 'Todos tus tableros'}</p>
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
                    <i className="ti ti-plus" aria-hidden="true" />
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
