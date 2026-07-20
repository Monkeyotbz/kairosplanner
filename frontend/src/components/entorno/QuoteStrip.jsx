import { useEffect, useState } from 'react'
import { getActiveFrase } from '../../services/boardService'
import { useMusicStore } from '../../store/musicStore'
import { pauseApi, resumeApi, nextApi } from '../../services/spotifyService'
import styles from './QuoteStrip.module.css'
import { IconMusic, IconPlayerSkipForward, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react'

export default function QuoteStrip() {
  const [frase, setFrase] = useState(null)

  const {
    showPlayer, setShowPlayer, activeTab,
    spotifyTrack, spotifyPlaying, spotifyDeviceId, setSpotifyPlaying,
    ytCurrent, ytPlaying,
  } = useMusicStore()

  useEffect(() => { getActiveFrase().then(setFrase) }, [])

  // ── Mini Spotify controls ────────────────────────────────────
  async function toggleSpotify() {
    try {
      if (spotifyPlaying) await pauseApi(spotifyDeviceId)
      else                await resumeApi(spotifyDeviceId)
      setSpotifyPlaying(!spotifyPlaying)
    } catch (_) {}
  }

  async function skipSpotify() {
    try { await nextApi(spotifyDeviceId) } catch (_) {}
  }

  const spTrackName = spotifyTrack?.name || ''
  const spArtist    = spotifyTrack?.artists?.[0]?.name || ''
  const hasSpotify  = !!spotifyTrack
  const hasYt       = !!ytCurrent && ytPlaying

  return (
    <div className={styles.strip}>
      {/* Left: Quote */}
      <div className={styles.left}>
        <span className={styles.icon}>✦</span>
        {frase
          ? <span className={styles.quote}>"{frase.contenido}" — {frase.autor}</span>
          : <span className={styles.quote}>Cargando frase del día…</span>
        }
      </div>

      {/* Right: Music mini-player */}
      <div className={styles.right}>
        {hasSpotify && (
          <div className={styles.miniPlayer}>
            <span className={styles.playlistDot} style={{ background: '#1DB954' }} />
            <button className={styles.miniInfo} onClick={() => setShowPlayer(true)} title="Abrir player">
              <span className={styles.miniTrack}>{spTrackName}</span>
              {spArtist && <span className={styles.miniArtist}>{spArtist}</span>}
            </button>
            <button className={styles.miniCtrl} onClick={toggleSpotify} title={spotifyPlaying ? 'Pausar' : 'Reproducir'}>
              {spotifyPlaying ? <IconPlayerPause size="1em" /> : <IconPlayerPlay size="1em" />}
            </button>
            <button className={styles.miniCtrl} onClick={skipSpotify} title="Siguiente">
              <IconPlayerSkipForward size="1em" />
            </button>
          </div>
        )}

        {!hasSpotify && hasYt && (
          <div className={styles.miniPlayer}>
            <span className={styles.playlistDot} style={{ background: '#ff4444' }} />
            <button className={styles.miniInfo} onClick={() => setShowPlayer(true)} title="Abrir player">
              <span className={styles.miniTrack}>{ytCurrent.nombre}</span>
            </button>
            <button className={styles.miniCtrl} onClick={() => setShowPlayer(true)} title="Abrir player">
              <IconMusic size="1em" />
            </button>
          </div>
        )}

        {!hasSpotify && !hasYt && (
          <button
            className={`${styles.musicToggle} ${showPlayer ? styles.musicToggleActive : ''}`}
            onClick={() => setShowPlayer(!showPlayer)}
            title="Música"
          >
            <IconMusic size="1em" />
            <span>Música</span>
          </button>
        )}
      </div>
    </div>
  )
}
