import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveFrase } from '../../services/boardService'
import { useMusicStore } from '../../store/musicStore'
import { useAuthStore } from '../../store/authStore'
import { useAbadStore } from '../../store/abadStore'
import { getFocusProgress } from '../../services/rankService'
import { pauseApi, resumeApi, nextApi, setVolumeApi } from '../../services/spotifyService'
import NotificationBell from './NotificationBell'
import InfinityLogo from './InfinityLogo'
import styles from './Dock.module.css'
import { IconMusic, IconPlayerSkipForward, IconVolume, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react'

export default function Dock() {
  const navigate = useNavigate()
  const [frase, setFrase]   = useState(null)
  const [rank, setRank]     = useState(null)
  const [volume, setVolume] = useState(65)

  const {
    showPlayer, setShowPlayer,
    spotifyTrack, spotifyPlaying, spotifyDeviceId, setSpotifyPlaying,
    ytCurrent, ytPlaying,
  } = useMusicStore()
  const profile     = useAuthStore(s => s.profile)
  const musicActive = useMusicStore(s => s.spotifyPlaying || s.ytPlaying)

  // ABAD vive en su propio panel de chat — el logo lo abre/cierra
  const abadOpen     = useAbadStore(s => s.isOpen)
  const abadThinking = useAbadStore(s => s.thinking)
  const toggleAbad   = useAbadStore(s => s.toggle)

  useEffect(() => { getActiveFrase().then(setFrase).catch(() => {}) }, [])
  useEffect(() => { getFocusProgress().then(setRank).catch(() => {}) }, [])

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
  const assistantState = (abadOpen || abadThinking || musicActive) ? 'pulsing' : 'idle'
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
            className={`${styles.abad} ${abadOpen ? styles.abadOn : ''}`}
            onClick={toggleAbad}
            title="ABAD — chatea con KAIROS"
            aria-label="Abrir asistente ABAD"
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
                  {spotifyPlaying ? <IconPlayerPause size="1em" /> : <IconPlayerPlay size="1em" />}
                </button>
                <button className={styles.miniCtrl} onClick={skipSpotify} title="Siguiente">
                  <IconPlayerSkipForward size="1em" />
                </button>
                <div className={styles.vol}>
                  <IconVolume size="1em" />
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
          <IconMusic size="1em" />
          <span className={styles.musicBtnLabel}>Música</span>
        </button>
      </div>
    </div>
  )
}
