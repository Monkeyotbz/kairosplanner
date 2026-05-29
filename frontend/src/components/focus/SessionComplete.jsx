import { useFocusStore } from '../../store/focusStore'
import styles from './SessionComplete.module.css'

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function SessionComplete() {
  const { elapsedSeconds, totalBreaks, tipo, duracion_plan_min, reset } = useFocusStore()

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <span className={styles.emoji}>🎉</span>
        <h2 className={styles.title}>¡Sesión completada!</h2>
        <p className={styles.sub}>Gran trabajo. Cada sesión te acerca más a tus metas.</p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatTime(elapsedSeconds)}</span>
            <span className={styles.statLabel}>Tiempo trabajado</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>{totalBreaks}</span>
            <span className={styles.statLabel}>Pausas tomadas</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {tipo === 'pomodoro' ? `Pomodoro ${duracion_plan_min}min` : 'Libre'}
            </span>
            <span className={styles.statLabel}>Modo</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.newBtn} onClick={reset}>
            ▶ Nueva sesión
          </button>
        </div>
      </div>
    </div>
  )
}
