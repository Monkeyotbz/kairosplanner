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
  return (
    <aside className={styles.sidebar}>
      {NAV_ITEMS.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon}>{icon}</span>
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}

      {/* Separador + acceso dev al onboarding */}
      <div className={styles.spacer} />
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
