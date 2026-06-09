import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveFrase } from '../../services/boardService'
import { useMusicStore } from '../../store/musicStore'
import { useAuthStore } from '../../store/authStore'
import { useBoardStore } from '../../store/boardStore'
import { useKairosVoice } from '../../hooks/useKairosVoice'
import { getFocusProgress } from '../../services/rankService'
import { pauseApi, resumeApi, nextApi, setVolumeApi } from '../../services/spotifyService'
import NotificationBell from './NotificationBell'
import InfinityLogo from './InfinityLogo'
import styles from './Dock.module.css'

export default function Dock() {
  const navigate = useNavigate()
  const [frase, setFrase]   = useState(null)
  const [rank, setRank]     = useState(null)
  const [volume, setVolume] = useState(65)
  const [abadThinking, setAbadThinking] = useState(false)
  const [abadAnswer, setAbadAnswer]     = useState('')

  const {
    showPlayer, setShowPlayer,
    spotifyTrack, spotifyPlaying, spotifyDeviceId, setSpotifyPlaying,
    ytCurrent, ytPlaying,
  } = useMusicStore()
  const profile     = useAuthStore(s => s.profile)
  const musicActive = useMusicStore(s => s.spotifyPlaying || s.ytPlaying)

  const { isListening, toggleListening, transcript } = useKairosVoice({
    onResult: (text) => handleCommand(text),
  })

  useEffect(() => { getActiveFrase().then(setFrase).catch(() => {}) }, [])
  useEffect(() => { getFocusProgress().then(setRank).catch(() => {}) }, [])

  // ── ABAD: arma el contexto del usuario y consulta al asistente ──
  function ymd(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function buildContext() {
    const { cardsByColumn, columns, proyecto } = useBoardStore.getState()
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayStr = ymd(today)
    const tmrw = new Date(today); tmrw.setDate(today.getDate() + 1)
    const tmrwStr = ymd(tmrw)
    const all = Object.values(cardsByColumn || {}).flat()
    const fmt = c => ({
      titulo: c.titulo,
      fecha: c.fecha_limite,
      prioridad: c.prioridad || 'normal',
      columna: columns?.find(col => col.id === c.columna_id)?.nombre,
    })
    const vencidas = all.filter(c => c.fecha_limite && c.fecha_limite < todayStr).map(fmt)
    const hoy      = all.filter(c => c.fecha_limite === todayStr).map(fmt)
    const manana   = all.filter(c => c.fecha_limite === tmrwStr).map(fmt)
    return {
      fecha_hoy: todayStr,
      proyecto: proyecto?.nombre || null,
      rango: rank?.after?.current?.name || null,
      racha_dias: rank?.streak ?? 0,
      xp_total_min: rank?.after?.totalMinutes ?? 0,
      tareas: { vencidas, hoy, manana },
    }
  }

  function speak(text) {
    try {
      if (!('speechSynthesis' in window) || !text) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'es-ES'
      window.speechSynthesis.speak(u)
    } catch (_) {}
  }

  async function handleCommand(text) {
    if (!text || !text.trim()) return
    setAbadAnswer('')
    setAbadThinking(true)
    try {
      const res = await fetch('/api/abad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, context: buildContext() }),
      })
      const data = await res.json().catch(() => ({}))
      const answer = res.ok
        ? (data.answer || 'No tengo una respuesta para eso todavía.')
        : (data.error || 'ABAD no está disponible ahora mismo.')
      setAbadAnswer(answer)
      speak(answer)
      setTimeout(() => setAbadAnswer(a => (a === answer ? '' : a)), 12000)
    } catch (_) {
      setAbadAnswer('No pude conectar con ABAD. ¿Está desplegado el servidor?')
    } finally {
      setAbadThinking(false)
    }
  }

  function handleAbadClick() {
    setAbadAnswer('')
    toggleListening()
  }

  async function toggleSpotify() {
    try {
      if (spotifyPlaying) await pauseApi(spotifyDeviceId)
      else                await resumeApi(spotifyDeviceId)
      setSpotifyPlaying(!spotifyPlaying)
    } catch (_) {}
  }
  async function skipSpotify()  { try { await nextApi(spotifyDeviceId) } catch (_) {} }
  async function changeVolume(v) {
    setVolume(v)
    try { await setVolumeApi(v, spotifyDeviceId) } catch (_) {}
  }

  const hasSpotify     = !!spotifyTrack
  const hasYt          = !!ytCurrent && ytPlaying
  const assistantState = isListening ? 'listening' : musicActive ? 'pulsing' : 'idle'
  const xp             = rank?.after?.totalMinutes ?? 0
  const rankCurrent    = rank?.after?.current
  const initials       = (profile?.nombre || profile?.email || '?')[0].toUpperCase()

  return (
    <div className={styles.dock}>
      {/* ── Izquierda: frase del día ── */}
      <div className={styles.left}>
        <span className={styles.fraseIcon}>✦</span>
        <span className={styles.frase}>
          {frase ? `"${frase.contenido}" — ${frase.autor}` : 'Cargando frase del día…'}
        </span>
      </div>

      {/* ── Centro: notificaciones · ABAD · XP/avatar ── */}
      <div className={styles.center}>
        <div className={styles.notif}>
          <NotificationBell openUp />
        </div>

        <div className={styles.abadWrap}>
          <button
            className={`${styles.abad} ${isListening ? styles.abadOn : ''}`}
            onClick={handleAbadClick}
            title="ABAD — habla con KAIROS"
            aria-label="Asistente de voz KAIROS"
          >
            <span className={styles.abadGlow} aria-hidden="true" />
            <InfinityLogo size={48} state={assistantState} />
          </button>
        </div>

        <button className={styles.xpChip} onClick={() => navigate('/entorno')} title="Tu perfil y rango">
          {rankCurrent && (
            <span className={styles.xpIcon} style={{ color: rankCurrent.color }} title={rankCurrent.name}>
              {rankCurrent.icon}
            </span>
          )}
          <span className={styles.xpVal}>{xp.toLocaleString('es')}</span>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} className={styles.avatar} alt="" />
            : <span className={styles.avatarFallback}>{initials}</span>}
        </button>
      </div>

      {/* ── Derecha: música + volumen ── */}
      <div className={styles.right}>
        {(hasSpotify || hasYt) && (
          <div className={styles.mini}>
            <span className={styles.miniDot} style={{ background: hasSpotify ? '#1DB954' : '#ff4444' }} />
            <button className={styles.miniInfo} onClick={() => setShowPlayer(true)} title="Abrir reproductor">
              <span className={styles.miniTrack}>{hasSpotify ? spotifyTrack.name : ytCurrent.nombre}</span>
              {hasSpotify && spotifyTrack.artists?.[0]?.name && (
                <span className={styles.miniArtist}>{spotifyTrack.artists[0].name}</span>
              )}
            </button>
            {hasSpotify && (
              <>
                <button className={styles.miniCtrl} onClick={toggleSpotify} title={spotifyPlaying ? 'Pausar' : 'Reproducir'}>
                  <i className={spotifyPlaying ? 'ti ti-player-pause' : 'ti ti-player-play'} />
                </button>
                <button className={styles.miniCtrl} onClick={skipSpotify} title="Siguiente">
                  <i className="ti ti-player-skip-forward" />
                </button>
                <div className={styles.vol}>
                  <i className="ti ti-volume" />
                  <input
                    type="range" min="0" max="100" value={volume}
                    className={styles.volSlider}
                    onChange={e => changeVolume(Number(e.target.value))}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <button
          className={`${styles.musicBtn} ${showPlayer ? styles.musicBtnActive : ''}`}
          onClick={() => setShowPlayer(!showPlayer)}
          title="Música"
        >
          <i className="ti ti-music" />
          <span className={styles.musicBtnLabel}>Música</span>
        </button>
      </div>

      {/* Burbuja de ABAD: transcripción en vivo · pensando · respuesta */}
      {(isListening && transcript) || abadThinking || abadAnswer ? (
        <div className={`${styles.transcript} ${abadAnswer ? styles.transcriptAnswer : ''}`}>
          {isListening && transcript
            ? transcript
            : abadThinking
              ? '✦ ABAD está pensando…'
              : abadAnswer}
        </div>
      ) : null}
    </div>
  )
}
