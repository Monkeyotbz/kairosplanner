import { useWTWStore } from '../store/wtwStore'
import styles from './WTWDashboardPage.module.css'

export default function WTWDashboardPage() {
  const { msUser, disconnect } = useWTWStore()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.welcome}>
          <h2 className={styles.greeting}>
            Buen día, {msUser?.displayName?.split(' ')[0] || 'Gabriel'}
          </h2>
          <p className={styles.sub}>KAIROS for WTW · Centro de Operaciones</p>
        </div>
        <button className={styles.disconnectBtn} onClick={disconnect}>
          <i className="ti ti-logout" /> Desconectar
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <i className="ti ti-mail" />
            <span>Tareas desde email</span>
          </div>
          <div className={styles.empty}>
            <i className="ti ti-inbox" />
            <p>Las tareas extraídas de tus correos aparecerán aquí</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <i className="ti ti-calendar" />
            <span>Próximas reuniones</span>
          </div>
          <div className={styles.empty}>
            <i className="ti ti-calendar-off" />
            <p>Tu agenda de Outlook aparecerá aquí</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <i className="ti ti-layout-kanban" />
            <span>Tablero de operaciones</span>
          </div>
          <div className={styles.empty}>
            <i className="ti ti-columns" />
            <p>Tu tablero de tareas WTW aparecerá aquí</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <i className="ti ti-brand-teams" />
            <span>Bot de Teams</span>
          </div>
          <div className={styles.empty}>
            <i className="ti ti-message-chatbot" />
            <p>Integración con Teams en configuración</p>
          </div>
        </div>
      </div>
    </div>
  )
}
