import { NavLink } from 'react-router-dom'
import styles from './Topbar.module.css'

export default function Topbar() {
  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.logo}>◎</span>
        <span className={styles.name}>KAIROS</span>
      </div>

      <nav className={styles.nav}>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? styles.linkActive : styles.link}>
          Espacios
        </NavLink>
        <NavLink to="/board" className={({ isActive }) => isActive ? styles.linkActive : styles.link}>
          Recientes
        </NavLink>
        <button className={styles.link}>Destacados</button>
        <button className={styles.link}>Plantillas</button>
      </nav>

      <div className={styles.actions}>
        <button className={styles.createBtn}>+ Crear</button>
        <input className={styles.search} type="text" placeholder="Buscar..." />
        <div className={styles.avatar}>U</div>
      </div>
    </header>
  )
}
