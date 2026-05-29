import { useFocusStore } from '../../store/focusStore'
import styles from './ActiveTimer.module.css'

const RADIUS = 80
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ActiveTimer() {
  const { tipo, duracion_plan_min, elapsedSeconds, startBreak, finishSession, abandonSession } = useFocusStore()

  const isPomodoro = tipo === 'pomodoro'
  const totalSeconds = isPomodoro ? duracion_plan_min * 60 : null
  const displaySeconds = isPomodoro ? Math.max(0, totalSeconds - elapsedSeconds) : elapsedSeconds
  const progress = isPomodoro ? elapsedSeconds / totalSeconds : null

  const strokeOffset = progress !== null
    ? CIRCUMFERENCE * (1 - Math.min(progress, 1))
    : CIRCUMFERENCE * 0.25  // libre: show quarter ring static

  return (
    <div className={styles.wrap}>

      <div className={styles.meta}>
        <span className={styles.badge}>
          {isPomodoro ? `🍅 Pomodoro · ${duracion_plan_min} min` : '∞ Modo libre'}
        </span>
      </div>

      {/* Anillo SVG */}
      <div className={styles.ringWrap}>
        <svg viewBox="0 0 200 200" className={styles.svg}>
          {/* Track */}
          <circle
            cx="100" cy="100" r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="10"
          />
          {/* Progress */}
          <circle
            cx="100" cy="100" r={RADIUS}
            fill="none"
            stroke="url(#focusGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            transform="rotate(-90 100 100)"
            className={!isPomodoro ? styles.pulsing : ''}
          />
          <defs>
            <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#534AB7" />
              <stop offset="100%" stopColor="#378ADD" />
            </linearGradient>
          </defs>
        </svg>

        <div className={styles.timeDisplay}>
          <span className={styles.time}>{formatTime(displaySeconds)}</span>
          <span className={styles.timeLabel}>
            {isPomodoro ? 'restante' : 'transcurrido'}
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className={styles.actions}>
        <button className={styles.pauseBtn} onClick={startBreak}>
          ⏸ Pausar
        </button>
        <button className={styles.finishBtn} onClick={finishSession}>
          ✓ Terminar
        </button>
      </div>

      <button className={styles.abandonBtn} onClick={abandonSession}>
        Abandonar sesión
      </button>

    </div>
  )
}
