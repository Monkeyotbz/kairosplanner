import { useEffect } from 'react'
import { useFocusStore } from '../../store/focusStore'
import { useMusicStore } from '../../store/musicStore'
import { useKairosVoice } from '../../hooks/useKairosVoice'
import { pauseApi, resumeApi, nextApi, prevApi } from '../../services/spotifyService'
import InfinityLogo from '../layout/InfinityLogo'
import FocusCelebration from './FocusCelebration'
import styles from './ImmersiveFocus.module.css'

const RADIUS = 130
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const PRIORITY = {
  baja:   { label: 'Baja prioridad',   color: '#86efac' },
  normal: { label: 'Prioridad normal', color: 'var(--kairos-purple-200)' },
  alta:   { label: 'Alta prioridad',   color: '#fca07a' },
}

export default function ImmersiveFocus() {
  const {
    immersive, phase, tipo, duracion_plan_min, elapsedSeconds, breakSeconds,
    activeTask, session, totalBreaks, tick, tickBreak, startBreak, resumeSession, finishSession,
    abandonSession, exitImmersive, reset,
  } = useFocusStore()

  const {
    spotifyTrack, spotifyPlaying, spotifyDeviceId, setSpotifyPlaying,
    ytPlaylists, ytCurrent, setYtCurrent, setShowPlayer, ytPlaying,
  } = useMusicStore()

  // Asistente de voz KAIROS — protagonista del enfoque
  const { isListening, transcript, toggleListening } = useKairosVoice({
    onResult: (text) => console.log('KAIROS procesando comando:', text),
  })
  const assistantState = isListening ? 'listening' : (spotifyPlaying || ytPlaying) ? 'pulsing' : 'idle'

  // Ticks propios — solo cuando inmersivo, para no duplicar el conteo de FocusPage
  useEffect(() => {
    if (!immersive || phase !== 'active') return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [immersive, phase, tick])

  useEffect(() => {
    if (!immersive || phase !== 'break') return
    const id = setInterval(tickBreak, 1000)
    return () => clearInterval(id)
  }, [immersive, phase, tickBreak])

  // Pomodoro: pausa automática al completar el bloque
  useEffect(() => {
    if (!immersive || phase !== 'active' || tipo !== 'pomodoro' || !duracion_plan_min) return
    if (elapsedSeconds >= duracion_plan_min * 60) startBreak()
  }, [immersive, elapsedSeconds, phase, tipo, duracion_plan_min, startBreak])

  // ESC = minimizar (la sesión sigue corriendo)
  useEffect(() => {
    if (!immersive) return
    function onKey(e) { if (e.key === 'Escape') exitImmersive() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [immersive, exitImmersive])

  if (!immersive) return null

  const isPomodoro = tipo === 'pomodoro'
  const totalSeconds = isPomodoro ? duracion_plan_min * 60 : null
  const displaySeconds = isPomodoro ? Math.max(0, totalSeconds - elapsedSeconds) : elapsedSeconds
  const progress = isPomodoro ? Math.min(elapsedSeconds / totalSeconds, 1) : null
  const strokeOffset = progress !== null ? CIRCUMFERENCE * (1 - progress) : CIRCUMFERENCE * 0.25
  const prio = activeTask?.prioridad ? PRIORITY[activeTask.prioridad] : null

  const nowPlaying = spotifyTrack
    ? `${spotifyTrack.name} · ${spotifyTrack.artists?.map(a => a.name).join(', ')}`
    : ytCurrent ? ytCurrent.nombre : null

  async function toggleSpotify() {
    try {
      if (spotifyPlaying) await pauseApi(spotifyDeviceId)
      else                await resumeApi(spotifyDeviceId)
      setSpotifyPlaying(!spotifyPlaying)
    } catch (_) {}
  }

  function openFullPlayer() {
    setShowPlayer(true)
    exitImmersive()   // el panel completo vive fuera del overlay
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.glow} aria-hidden="true" />

      {/* Barra superior */}
      <div className={styles.topBar}>
        <button className={styles.minBtn} onClick={exitImmersive} title="Minimizar (Esc)">
          <i className="ti ti-arrows-minimize" aria-hidden="true" /> Minimizar
        </button>
        <button className={styles.exitBtn} onClick={abandonSession} title="Salir y descartar la sesión">
          <i className="ti ti-x" aria-hidden="true" /> Salir
        </button>
      </div>

      {/* Contenido central según la fase */}
      {phase === 'complete' ? (
        <div className={styles.center}>
          <FocusCelebration
            elapsedSeconds={elapsedSeconds}
            sessionId={session?.id}
            totalBreaks={totalBreaks}
            onDone={reset}
            doneLabel="Finalizar"
          />
        </div>
      ) : phase === 'break' ? (
        <div className={styles.center}>
          <span className={styles.phaseTag}>☕ Pausa</span>
          <div className={styles.breakTime}>{formatTime(breakSeconds)}</div>
          <p className={styles.taskDesc}>Respira un momento. Tu cerebro consolida lo trabajado.</p>
          <button className={styles.primaryBtn} onClick={() => resumeSession()}>
            <i className="ti ti-player-play" aria-hidden="true" /> Retomar enfoque
          </button>
        </div>
      ) : (
        <div className={styles.center}>
          {/* Asistente de IA KAIROS — toca para hablar */}
          <button
            className={`${styles.assistant} ${isListening ? styles.assistantOn : ''}`}
            onClick={toggleListening}
            title="Habla con KAIROS"
          >
            <div className={styles.assistantGlow} aria-hidden="true" />
            <InfinityLogo size={116} state={assistantState} />
            <div className={`${styles.wave} ${isListening ? styles.waveOn : ''}`}>
              <span /><span /><span /><span /><span />
            </div>
            <span className={styles.assistantLabel}>
              {isListening ? 'Escuchando…' : 'KAIROS Intelligence'}
            </span>
          </button>

          {isListening && transcript && (
            <p className={styles.transcript}>{transcript}</p>
          )}

          <h1 className={styles.taskTitle}>{activeTask?.titulo || 'Sesión de enfoque'}</h1>
          {prio && <span className={styles.prioChip} style={{ color: prio.color }}>{prio.label}</span>}
          {activeTask?.descripcion && <p className={styles.taskDesc}>{activeTask.descripcion}</p>}

          {/* Anillo del timer */}
          <div className={styles.ringWrap}>
            <svg viewBox="0 0 300 300" className={styles.svg}>
              <circle cx="150" cy="150" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
              <circle
                cx="150" cy="150" r={RADIUS} fill="none"
                stroke="url(#immGrad)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeOffset}
                transform="rotate(-90 150 150)"
                className={!isPomodoro ? styles.pulsing : ''}
              />
              <defs>
                <linearGradient id="immGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: 'var(--kairos-purple-600)' }} />
                  <stop offset="100%" style={{ stopColor: 'var(--kairos-purple-400)' }} />
                </linearGradient>
              </defs>
            </svg>
            <div className={styles.timeDisplay}>
              <span className={styles.time}>{formatTime(displaySeconds)}</span>
              <span className={styles.timeLabel}>{isPomodoro ? 'restante' : 'transcurrido'}</span>
            </div>
          </div>

          {/* Acciones de sesión */}
          <div className={styles.actions}>
            <button className={styles.pauseBtn} onClick={startBreak}>
              <i className="ti ti-player-pause" aria-hidden="true" /> Pausar
            </button>
            <button className={styles.finishBtn} onClick={finishSession}>
              <i className="ti ti-player-stop" aria-hidden="true" /> Terminar
            </button>
          </div>
        </div>
      )}

      {/* Barra de música */}
      <div className={styles.musicBar}>
        <div className={styles.musicNow}>
          <i className="ti ti-music" aria-hidden="true" />
          <span className={styles.musicText}>{nowPlaying || 'Sin música'}</span>
        </div>

        {spotifyTrack ? (
          <div className={styles.musicCtrls}>
            <button className={styles.musicBtn} onClick={() => prevApi(spotifyDeviceId).catch(() => {})}>
              <i className="ti ti-player-skip-back" aria-hidden="true" />
            </button>
            <button className={styles.musicBtnMain} onClick={toggleSpotify}>
              <i className={spotifyPlaying ? 'ti ti-player-pause' : 'ti ti-player-play'} aria-hidden="true" />
            </button>
            <button className={styles.musicBtn} onClick={() => nextApi(spotifyDeviceId).catch(() => {})}>
              <i className="ti ti-player-skip-forward" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className={styles.musicChips}>
            {ytPlaylists.slice(0, 3).map(pl => (
              <button
                key={pl.id}
                className={`${styles.musicChip} ${ytCurrent?.id === pl.id ? styles.musicChipActive : ''}`}
                onClick={() => setYtCurrent(ytCurrent?.id === pl.id ? null : pl)}
              >
                {pl.nombre}
              </button>
            ))}
          </div>
        )}

        <button className={styles.musicOpen} onClick={openFullPlayer} title="Abrir reproductor completo">
          <i className="ti ti-adjustments-horizontal" aria-hidden="true" /> Más música
        </button>
      </div>
    </div>
  )
}
