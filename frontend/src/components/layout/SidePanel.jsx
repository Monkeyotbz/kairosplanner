import { useNavigate } from 'react-router-dom'
import { useFocusStore } from '../../store/focusStore'
import { useBoardStore } from '../../store/boardStore'
import styles from './SidePanel.module.css'
import { IconArrowsMove, IconTrash, IconLayoutColumns, IconPlus } from '@tabler/icons-react'

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)    return 'hace un momento'
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

function actIcon(descripcion) {
  if (descripcion.includes('movió'))   return IconArrowsMove
  if (descripcion.includes('eliminó')) return IconTrash
  if (descripcion.includes('lista'))   return IconLayoutColumns
  return IconPlus
}

export default function SidePanel({ onClose }) {
  const navigate = useNavigate()
  const { phase, tipo, duracion_plan_min, elapsedSeconds, startBreak, finishSession } = useFocusStore()
  const actividad = useBoardStore(s => s.actividad)

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

      {/* ── Historial de actividad ── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Actividad reciente</p>
        {actividad.length === 0 ? (
          <p className={styles.actEmpty}>Sin actividad aún</p>
        ) : (
          <ul className={styles.actList}>
            {[...actividad].reverse().map(a => (
              <li key={a.id} className={styles.actItem}>
                <span className={styles.actIconWrap}>
                  {(() => { const ActIcon = actIcon(a.descripcion); return <ActIcon size="1em" /> })()}
                </span>
                <div className={styles.actBody}>
                  <span className={styles.actNombre}>{a.nombre_usuario}</span>
                  {' '}{a.descripcion}
                  <span className={styles.actTime}>{timeAgo(a.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
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
