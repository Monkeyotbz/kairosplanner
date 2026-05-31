import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { createProject } from '../../services/boardService'
import { signOut } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import { useBoardStore } from '../../store/boardStore'
import ThemeSwitcher from './ThemeSwitcher'
import styles from './Topbar.module.css'

export default function Topbar() {
  const navigate = useNavigate()
  const { user, clearUser } = useAuthStore()
  const { loadBoard, loadProyectos } = useBoardStore()

  const [showModal, setShowModal]   = useState(false)
  const [nombre, setNombre]         = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showTheme, setShowTheme]   = useState(false)
  const userMenuRef = useRef(null)

  const initial = user?.email?.[0]?.toUpperCase() ?? 'U'

  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    setSaving(true)
    setError('')
    try {
      const proyecto = await createProject({ nombre: nombre.trim() })
      await loadProyectos()
      await loadBoard(proyecto.id)
      setNombre('')
      setShowModal(false)
      navigate('/board')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    setShowUserMenu(false)
    await signOut()
    clearUser()
    navigate('/login')
  }

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.logo}>◎</span>
          <span className={styles.name}>KAIROS</span>
        </div>

        <nav className={styles.nav}>
          <NavLink to="/board"        className={({ isActive }) => isActive ? styles.linkActive : styles.link}>Tableros</NavLink>
          <NavLink to="/focus"        className={({ isActive }) => isActive ? styles.linkActive : styles.link}>Enfoque</NavLink>
          <NavLink to="/productivity" className={({ isActive }) => isActive ? styles.linkActive : styles.link}>Stats</NavLink>
          <NavLink to="/finanzas"     className={({ isActive }) => isActive ? styles.linkActive : styles.link}>Finanzas</NavLink>
        </nav>

        <div className={styles.actions}>
          <button className={styles.createBtn} onClick={() => { setShowModal(true); setError('') }}>
            + Crear
          </button>
          <input className={styles.search} type="text" placeholder="Buscar..." />

          {/* Selector de tema — solo visible en móvil (en desktop está en BoardNav) */}
          <div className={styles.themeMobileWrap}>
            <button
              className={`${styles.themeBtn} ${showTheme ? styles.themeBtnActive : ''}`}
              onClick={() => setShowTheme(v => !v)}
              title="Apariencia"
            >
              <i className="ti ti-palette" />
            </button>
            <ThemeSwitcher open={showTheme} onClose={() => setShowTheme(false)} />
          </div>

          {/* Avatar con menú */}
          <div className={styles.avatarWrap} ref={userMenuRef}>
            <button className={styles.avatar} onClick={() => setShowUserMenu(v => !v)}>
              {initial}
            </button>

            {showUserMenu && (
              <div className={styles.userMenu}>
                <div className={styles.userMenuInfo}>
                  <span className={styles.userMenuAvatar}>{initial}</span>
                  <div>
                    <p className={styles.userMenuEmail}>{user?.email}</p>
                    <p className={styles.userMenuRole}>Cuenta personal</p>
                  </div>
                </div>
                <div className={styles.userMenuDivider} />
                <button className={styles.logoutBtn} onClick={handleLogout}>
                  ↪ Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal nuevo proyecto */}
      {showModal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Nuevo proyecto</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className={styles.form}>
              <input
                className={styles.input}
                placeholder="Nombre del proyecto"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                autoFocus
                required
              />
              {error && <p className={styles.formError}>{error}</p>}
              <button className={styles.submitBtn} type="submit" disabled={saving || !nombre.trim()}>
                {saving ? 'Creando...' : '▶ Crear proyecto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
