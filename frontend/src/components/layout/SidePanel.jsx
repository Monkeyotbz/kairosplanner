import { useNavigate } from 'react-router-dom'
import { useFocusStore } from '../../store/focusStore'
import styles from './SidePanel.module.css'

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function SidePanel({ onClose }) {
  const navigate = useNavigate()
  const { phase, tipo, duracion_plan_min, elapsedSeconds, startBreak, finishSession } = useFocusStore()

  const isActive   = phase === 'active'
  const isPomodoro = tipo === 'pomodoro'
  const totalSec   = isPomodoro ? duracion_plan_min * 60 : null
  const displaySec = isPomodoro ? Math.max(0, totalSec - elapsedSeconds) : elapsedSeconds

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Panel</span>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar panel">✕</button>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Modo Enfoque</p>

        {isActive ? (
          <div className={styles.timerWidget}>
            <span className={styles.timerBadge}>
              {isPomodoro ? `🍅 ${duracion_plan_min} min` : '∞ Modo libre'}
            </span>
            <span className={styles.timerTime}>{formatTime(displaySec)}</span>
            <span className={styles.timerLabel}>{isPomodoro ? 'restante' : 'transcurrido'}</span>
            <div className={styles.timerActions}>
              <button className={styles.timerPause}  onClick={startBreak}>⏸ Pausar</button>
              <button className={styles.timerFinish} onClick={finishSession}>✓ Terminar</button>
            </div>
          </div>
        ) : (
          <button className={styles.startFocusBtn} onClick={() => navigate('/focus')}>
            ◎ Iniciar sesión de enfoque
          </button>
        )}
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Entorno</p>
        <div className={styles.musicCard}>
          <span className={styles.musicIcon}>🎵</span>
          <div>
            <p className={styles.musicTitle}>Música · Próximamente</p>
            <p className={styles.musicSub}>Spotify & YouTube</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
