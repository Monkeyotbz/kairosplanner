import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import KairosAssistant from '../kairos/KairosAssistant'
import styles from './AppShell.module.css'

export default function AppShell() {
  return (
    <div className={styles.shell}>
      <Topbar />
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
      {/* Asistente Flotante Global */}
      <KairosAssistant />
    </div>
  )
}
