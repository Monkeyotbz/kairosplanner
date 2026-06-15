import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/board',        icon: '⊞', label: 'Tablero' },
  { to: '/focus',        icon: '◎', label: 'Enfoque' },
  { to: '/productivity', icon: '◈', label: 'Stats' },
  { to: '/finanzas',     icon: '◑', label: 'Finanzas' },
  { to: '/calendar',     icon: '◫', label: 'Agenda' },
  { to: '/entorno',      icon: '◉', label: 'Perfil' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('kairos-sidebar-collapsed') === 'true'
  )

  function toggleCollapse() {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem('kairos-sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {NAV_ITEMS.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          title={collapsed ? label : undefined}
          className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon}>{icon}</span>
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}

      <div className={styles.spacer} />

      {/* Toggle collapse — solo desktop */}
      <button
        className={styles.collapseBtn}
        onClick={toggleCollapse}
        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        <span className={styles.collapseIcon}>{collapsed ? '›' : '‹'}</span>
      </button>

      {/* Separador + acceso dev al onboarding */}
      <NavLink
        to="/onboarding-preview"
        className={({ isActive }) => `${styles.item} ${styles.devItem} ${isActive ? styles.devActive : ''}`}
        title="Vista previa del Onboarding"
      >
        <span className={styles.icon}>✦</span>
        <span className={styles.label}>Dev</span>
      </NavLink>
    </aside>
  )
}
