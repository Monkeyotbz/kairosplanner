import { useEffect, useState } from 'react'
import { useFocusStore } from '../../store/focusStore'
import { useMusicStore } from '../../store/musicStore'
import { getFocusProgress } from '../../services/rankService'
import styles from './FocusCapsule.module.css'

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FocusCapsule() {
  const {
    phase, immersive, elapsedSeconds, breakSeconds, activeTask,
    tick, tickBreak, startBreak, resumeSession, finishSession, enterImmersive,
  } = useFocusStore()

  const { spotifyTrack, ytCurrent } = useMusicStore()
  const [rank, setRank] = useState(null)

  const minimized = !immersive && (phase === 'active' || phase === 'break')

  // La cápsula es la dueña del conteo mientras está minimizada.
  useEffect(() => {
    if (!minimized || phase !== 'active') return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [minimized, phase, tick])

  useEffect(() => {
    if (!minimized || phase !== 'break') return
    const id = setInterval(tickBreak, 1000)
    return () => clearInterval(id)
  }, [minimized, phase, tickBreak])

  // Cargar el rango al aparecer
  useEffect(() => {
    if (!minimized) return
    getFocusProgress().then(setRank).catch(() => {})
  }, [minimized])

  if (!minimized) return null

  const isBreak = phase === 'break'
  const r = rank?.after?.current
  const nowPlaying = spotifyTrack?.name || ytCurrent?.nombre || null

  return (
    <div className={styles.capsule}>
      {/* Tiempo */}
      <button className={styles.timeChip} onClick={() => enterImmersive()} title="Volver al enfoque">
        <span className={`${styles.dot} ${isBreak ? styles.dotBreak : ''}`} />
        <span className={styles.time}>{formatTime(isBreak ? breakSeconds : elapsedSeconds)}</span>
      </button>

      {/* Tarea + rango */}
      <div className={styles.info}>
        <span className={styles.task}>{activeTask?.titulo || 'Sesión de enfoque'}</span>
        <div className={styles.sub}>
          {r && <span className={styles.rank}><span style={{ color: r.color }}>{r.icon}</span> {r.name}</span>}
          {nowPlaying && <span className={styles.music}><i className="ti ti-music" /> {nowPlaying}</span>}
        </div>
      </div>

      {/* Controles */}
      <div className={styles.ctrls}>
        {isBreak ? (
          <button className={styles.btn} onClick={() => resumeSession()} title="Retomar">
            <i className="ti ti-player-play" />
          </button>
        ) : (
          <button className={styles.btn} onClick={startBreak} title="Pausar">
            <i className="ti ti-player-pause" />
          </button>
        )}
        <button className={styles.btn} onClick={() => enterImmersive()} title="Expandir">
          <i className="ti ti-arrows-maximize" />
        </button>
        <button className={`${styles.btn} ${styles.btnFinish}`} onClick={() => { finishSession(); enterImmersive() }} title="Terminar">
          <i className="ti ti-check" />
        </button>
      </div>
    </div>
  )
}
