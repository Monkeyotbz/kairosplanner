import { useToastStore } from '../../store/toastStore'
import styles from './ToastContainer.module.css'
import { IconClockCheck, IconCloudOff, IconAlarm, IconBell } from '@tabler/icons-react'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()
  if (toasts.length === 0) return null

  return (
    <div className={styles.container}>
      {toasts.map(toast => {
        if (toast._type === 'focus-recovery') return <FocusRecoveryToast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        if (toast._type === 'board-activity') return <BoardActivityToast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        if (toast._type === 'error')          return <ErrorToast         key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        return <DeadlineToast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      })}
    </div>
  )
}

function FocusRecoveryToast({ toast, onClose }) {
  return (
    <div className={`${styles.toast} ${styles.recovery}`}>
      <div className={styles.iconWrap}>
        <IconClockCheck size="1em" />
      </div>
      <div className={styles.body}>
        <p className={styles.title}>Sesión de enfoque recuperada</p>
        <p className={styles.sub}>{toast.minutos} min guardados en tus estadísticas</p>
      </div>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
    </div>
  )
}

function BoardActivityToast({ toast, onClose }) {
  return (
    <div className={`${styles.toast} ${styles.activity}`}>
      <div className={styles.iconWrap}>
        <i className={`ti ${toast.icon || 'ti-activity'}`} />
      </div>
      <div className={styles.body}>
        <p className={styles.title}>{toast.text}</p>
      </div>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
    </div>
  )
}

function ErrorToast({ toast, onClose }) {
  return (
    <div className={`${styles.toast} ${styles.urgent}`}>
      <div className={styles.iconWrap}>
        <IconCloudOff size="1em" />
      </div>
      <div className={styles.body}>
        <p className={styles.title}>{toast.title || 'Algo salió mal'}</p>
        <p className={styles.sub}>{toast.sub}</p>
      </div>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
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
        {isUrgent ? <IconAlarm size="1em" /> : <IconBell size="1em" />}
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
