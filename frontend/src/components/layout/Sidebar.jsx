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
    </aside>
  )
}
