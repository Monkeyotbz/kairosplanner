import { useToastStore } from '../../store/toastStore'
import styles from './ToastContainer.module.css'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()
  if (toasts.length === 0) return null

  return (
    <div className={styles.container}>
      {toasts.map(toast => (
        <DeadlineToast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function DeadlineToast({ toast, onClose }) {
  const { overdue = 0, dueToday = 0, dueTomorrow = 0 } = toast

  const groups = [
    overdue    > 0 && { label: `${overdue} vencida${overdue > 1 ? 's' : ''}`,      color: '#f87171' },
    dueToday   > 0 && { label: `${dueToday} hoy`,                                   color: '#fb923c' },
    dueTomorrow > 0 && { label: `${dueTomorrow} mañana`,                             color: '#facc15' },
  ].filter(Boolean)

  const isUrgent = overdue > 0

  return (
    <div className={`${styles.toast} ${isUrgent ? styles.urgent : styles.warning}`}>
      <div className={styles.iconWrap}>
        <i className={`ti ${isUrgent ? 'ti-alarm' : 'ti-bell'}`} />
      </div>
      <div className={styles.body}>
        <p className={styles.title}>Vencimientos pendientes</p>
        <div className={styles.groups}>
          {groups.map((g, i) => (
            <span key={i}>
              {i > 0 && <span className={styles.dot}>·</span>}
              <span style={{ color: g.color, fontWeight: 600 }}>{g.label}</span>
            </span>
          ))}
        </div>
      </div>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
    </div>
  )
}
