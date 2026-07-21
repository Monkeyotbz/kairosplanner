import { useState, useRef, useEffect, useCallback } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { useChatStore } from '../../store/chatStore'
import { createProject, searchUsuarios, addMemberToProject, getProjectMembers, createInvitacion } from '../../services/boardService'
import { socket } from '../../services/socketService'
import ThemeSwitcher from './ThemeSwitcher'
import BoardSwitcher from '../kanban/BoardSwitcher'
import styles from './BoardNav.module.css'
import { IconLink, IconMessageCircle, IconPalette, IconUserPlus, IconSearch, IconAlertTriangle, IconWorld } from '@tabler/icons-react'

export default function BoardNav({ proyecto, panelOpen, onTogglePanel, filtersOpen, onToggleFilters }) {
  const { isOpen: chatOpen, toggle: toggleChat } = useChatStore()
  const { proyectos, loadBoard, loadProyectos } = useBoardStore()
  const [showSwitcher, setShowSwitcher]       = useState(false)
  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const [showNewProject, setShowNewProject]   = useState(false)
  const [showInvite, setShowInvite]           = useState(false)
  const [showTheme, setShowTheme]             = useState(false)
  const [newNombre, setNewNombre]             = useState('')
  const [saving, setSaving]                   = useState(false)
  const [showLive, setShowLive]               = useState(false)
  const [liveUsers, setLiveUsers]             = useState([])
  const menuRef = useRef(null)

  useEffect(() => {
    const COLORS = ['#5a4fcf', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899']
    socket.on('presence:update', (nombres) => {
      setLiveUsers(nombres.map((nombre, i) => ({
        id: i,
        nombre,
        color: COLORS[i % COLORS.length],
      })))
    })
    return () => { socket.off('presence:update') }
  }, [])

  // Invite state
  const [searchQ, setSearchQ]       = useState('')
  const [results, setResults]       = useState([])
  const [members, setMembers]       = useState([])
  const [adding, setAdding]         = useState(null) // userId being added
  const [added, setAdded]           = useState(null) // userId just added
  const [inviteLink, setInviteLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [linkError, setLinkError]   = useState('')

  useEffect(() => { loadProyectos() }, [loadProyectos])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowProjectMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Cargar miembros actuales y generar el enlace real al abrir invitar
  useEffect(() => {
    if (showInvite && proyecto?.id) {
      getProjectMembers(proyecto.id).then(setMembers)
      // Generar un enlace de invitación real para este proyecto
      setLinkCopied(false)
      setInviteLink('')
      setLinkError('')
      createInvitacion(proyecto.id)
        .then(id => setInviteLink(`${window.location.origin}/join/${id}`))
        .catch(err => { console.error('Error al generar el enlace:', err); setLinkError(err.message || 'No se pudo generar el enlace') })
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
        <div className={styles.projectSelector}>
          <button className={styles.projectBtn} onClick={() => setShowSwitcher(true)} title="Cambiar de tablero">
            <span className={styles.projectName}>{proyecto?.nombre ?? 'Cargando...'}</span>
            <span className={styles.chevron}>▾</span>
          </button>
        </div>

        <span className={styles.divider}>|</span>
        <button className={styles.viewBtn}><span>⊞</span> Tablero</button>
      </div>

      <div className={styles.right}>

        {/* ── OPCIÓN A — Píldora "en vivo" ── */}
        <div
          className={styles.liveIndicator}
          onMouseEnter={() => setShowLive(true)}
          onMouseLeave={() => setShowLive(false)}
        >
          <span className={styles.liveDot} />
          <span className={styles.liveText}>{liveUsers.length} en vivo</span>
          {showLive && (
            <div className={styles.liveTooltip}>
              <div className={styles.liveTooltipTitle}>En este tablero ahora</div>
              {liveUsers.map(u => (
                <div key={u.id} className={styles.liveUser}>
                  <span className={styles.liveAvatar} style={{ background: u.color }}>{u.nombre[0]}</span>
                  <span className={styles.liveUserName}>{u.nombre}</span>
                  <span className={styles.livePulse} />
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className={`${styles.action} ${filtersOpen ? styles.actionActive : ''}`}
          onClick={onToggleFilters}
        >
          ⊟ Filtrar
        </button>
        <button className={styles.inviteBtn} onClick={() => setShowInvite(true)}>+ Invitar</button>
        <button className={styles.action}>•••</button>
        <div style={{ position: 'relative' }}>
          <button
            className={`${styles.action} ${showTheme ? styles.actionActive : ''}`}
            onClick={() => setShowTheme(v => !v)}
            title="Cambiar apariencia"
          >
            <IconPalette size="1em" style={{ fontSize: 15 }} />
          </button>
          <ThemeSwitcher open={showTheme} onClose={() => setShowTheme(false)} />
        </div>
        <button
          className={`${styles.panelBtn} ${chatOpen ? styles.panelBtnActive : ''}`}
          onClick={toggleChat}
          title={chatOpen ? 'Cerrar chat' : 'Chat del proyecto'}
        >
          <IconMessageCircle size="1em" style={{ fontSize: 15 }} />
        </button>
        <button
          className={`${styles.panelBtn} ${panelOpen ? styles.panelBtnActive : ''}`}
          onClick={onTogglePanel}
          title={panelOpen ? 'Cerrar panel' : 'Abrir panel lateral'}
        >
          ◧
        </button>
      </div>

      {/* ── Modal invitar ── */}
      {showInvite && (
        <div className={styles.inviteOverlay} onClick={e => e.target === e.currentTarget && setShowInvite(false)}>
          <div className={styles.inviteModal}>
            <div className={styles.inviteHeader}>
              <div>
                <h3>Invitar al proyecto</h3>
                <p className={styles.inviteSub}>Agrega personas por su nombre o comparte el enlace del tablero</p>
              </div>
              <button onClick={() => { setShowInvite(false); setSearchQ(''); setResults([]) }} aria-label="Cerrar">✕</button>
            </div>

            {/* Buscar usuarios */}
            <span className={styles.inviteLabel}><IconUserPlus size="1em" /> Agregar personas</span>
            <div className={styles.searchWrap}>
              <IconSearch size="1em" className={styles.searchIcon} />
              <input
                className={styles.inviteSearch}
                placeholder="Buscar por nombre o correo..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                autoFocus
              />
            </div>

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

            <div className={styles.inviteDivider} />

            <span className={styles.inviteLabel}><IconLink size="1em" /> Enlace de invitación</span>
            <p className={styles.inviteHint}>Cualquier persona con este enlace se une al proyecto como miembro.</p>
            <div className={`${styles.inviteLink} ${linkError ? styles.inviteLinkError : ''}`}>
              {linkError ? <IconAlertTriangle size="1em" className={styles.inviteLinkIcon} /> : <IconWorld size="1em" className={styles.inviteLinkIcon} />}
              <span className={styles.inviteLinkText}>
                {linkError ? linkError : inviteLink ? inviteLink.replace(/^https?:\/\//, '') : 'Generando enlace…'}
              </span>
              <button
                className={`${styles.copyBtn} ${linkCopied ? styles.copyBtnDone : ''}`}
                disabled={!inviteLink}
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink)
                  setLinkCopied(true)
                  setTimeout(() => setLinkCopied(false), 2000)
                }}
              >
                {linkCopied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSwitcher && <BoardSwitcher onClose={() => setShowSwitcher(false)} />}
    </div>
  )
}
