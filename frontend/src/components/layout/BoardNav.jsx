import { useState, useRef, useEffect, useCallback } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { createProject, searchUsuarios, addMemberToProject, getProjectMembers } from '../../services/boardService'
import styles from './BoardNav.module.css'

export default function BoardNav({ proyecto }) {
  const { proyectos, loadBoard, loadProyectos } = useBoardStore()
  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const [showNewProject, setShowNewProject]   = useState(false)
  const [showInvite, setShowInvite]           = useState(false)
  const [newNombre, setNewNombre]             = useState('')
  const [saving, setSaving]                   = useState(false)
  const menuRef = useRef(null)

  // Invite state
  const [searchQ, setSearchQ]       = useState('')
  const [results, setResults]       = useState([])
  const [members, setMembers]       = useState([])
  const [adding, setAdding]         = useState(null) // userId being added
  const [added, setAdded]           = useState(null) // userId just added

  useEffect(() => { loadProyectos() }, [loadProyectos])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowProjectMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Cargar miembros actuales al abrir invitar
  useEffect(() => {
    if (showInvite && proyecto?.id) {
      getProjectMembers(proyecto.id).then(setMembers)
    }
  }, [showInvite, proyecto?.id])

  // Buscar usuarios con debounce
  useEffect(() => {
    if (searchQ.length < 2) { setResults([]); return }
    const t = setTimeout(() => {
      searchUsuarios(searchQ).then(setResults)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ])

  async function handleCreateProject(e) {
    e.preventDefault()
    if (!newNombre.trim()) return
    setSaving(true)
    try {
      const p = await createProject({ nombre: newNombre.trim() })
      await loadProyectos()
      await loadBoard(p.id)
      setNewNombre('')
      setShowNewProject(false)
      setShowProjectMenu(false)
    } finally { setSaving(false) }
  }

  async function handleAddMember(user) {
    setAdding(user.id)
    try {
      await addMemberToProject(proyecto.id, user.id)
      setAdded(user.id)
      setMembers(prev => [...prev, { usuario_id: user.id, rol: 'miembro', usuarios: user }])
      setTimeout(() => setAdded(null), 2000)
    } finally { setAdding(null) }
  }

  const isMember = (userId) => members.some(m => m.usuario_id === userId)

  return (
    <div className={styles.boardnav}>
      <div className={styles.left}>
        <div className={styles.projectSelector} ref={menuRef}>
          <button className={styles.projectBtn} onClick={() => setShowProjectMenu(v => !v)}>
            <span className={styles.projectName}>{proyecto?.nombre ?? 'Cargando...'}</span>
            <span className={styles.chevron}>{showProjectMenu ? '▲' : '▼'}</span>
          </button>

          {showProjectMenu && (
            <div className={styles.projectMenu}>
              <p className={styles.menuLabel}>Mis proyectos</p>
              {proyectos.map(p => (
                <button
                  key={p.id}
                  className={`${styles.menuItem} ${p.id === proyecto?.id ? styles.menuItemActive : ''}`}
                  onClick={() => { setShowProjectMenu(false); loadBoard(p.id) }}
                >
                  <span className={styles.menuItemDot} />
                  {p.nombre}
                </button>
              ))}
              <div className={styles.menuDivider} />
              {showNewProject
                ? (
                  <form className={styles.newProjectForm} onSubmit={handleCreateProject}>
                    <input className={styles.newProjectInput} placeholder="Nombre del proyecto" value={newNombre} onChange={e => setNewNombre(e.target.value)} autoFocus />
                    <button className={styles.newProjectSave} type="submit" disabled={saving}>{saving ? '...' : 'Crear'}</button>
                  </form>
                )
                : <button className={styles.menuItemNew} onClick={() => setShowNewProject(true)}>+ Nuevo proyecto</button>
              }
            </div>
          )}
        </div>

        <span className={styles.divider}>|</span>
        <button className={styles.viewBtn}><span>⊞</span> Tablero</button>
      </div>

      <div className={styles.right}>
        <button className={styles.action}>⊟ Filtrar</button>
        <button className={styles.inviteBtn} onClick={() => setShowInvite(true)}>+ Invitar</button>
        <button className={styles.action}>•••</button>
      </div>

      {/* ── Modal invitar ── */}
      {showInvite && (
        <div className={styles.inviteOverlay} onClick={e => e.target === e.currentTarget && setShowInvite(false)}>
          <div className={styles.inviteModal}>
            <div className={styles.inviteHeader}>
              <h3>Invitar al proyecto</h3>
              <button onClick={() => { setShowInvite(false); setSearchQ(''); setResults([]) }}>✕</button>
            </div>

            {/* Buscar usuarios */}
            <input
              className={styles.inviteSearch}
              placeholder="Buscar por nombre o correo..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              autoFocus
            />

            {/* Resultados de búsqueda */}
            {results.length > 0 && (
              <ul className={styles.searchResults}>
                {results.map(u => (
                  <li key={u.id} className={styles.searchItem}>
                    <div className={styles.userAvatar}>{u.nombre?.[0]?.toUpperCase() || u.email[0].toUpperCase()}</div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{u.nombre}</span>
                      <span className={styles.userEmail}>{u.email}</span>
                    </div>
                    {isMember(u.id)
                      ? <span className={styles.alreadyMember}>Ya es miembro</span>
                      : (
                        <button
                          className={`${styles.addMemberBtn} ${added === u.id ? styles.addedBtn : ''}`}
                          onClick={() => handleAddMember(u)}
                          disabled={adding === u.id}
                        >
                          {adding === u.id ? '...' : added === u.id ? '✓ Agregado' : '+ Agregar'}
                        </button>
                      )
                    }
                  </li>
                ))}
              </ul>
            )}

            {searchQ.length >= 2 && results.length === 0 && (
              <p className={styles.noResults}>No se encontró ningún usuario con "{searchQ}"</p>
            )}

            {/* Miembros actuales */}
            {members.length > 0 && (
              <div className={styles.currentMembers}>
                <p className={styles.membersLabel}>Miembros actuales ({members.length})</p>
                {members.map(m => (
                  <div key={m.usuario_id} className={styles.memberItem}>
                    <div className={styles.userAvatar}>{m.usuarios?.nombre?.[0]?.toUpperCase() || m.usuarios?.email?.[0]?.toUpperCase() || '?'}</div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{m.usuarios?.nombre || m.usuarios?.email || 'Usuario'}</span>
                      <span className={styles.roleBadge}>{m.rol}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.inviteLink}>
              <span className={styles.inviteLinkText}>kairosplanner.vercel.app</span>
              <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText('https://kairosplanner.vercel.app')}>Copiar enlace</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
