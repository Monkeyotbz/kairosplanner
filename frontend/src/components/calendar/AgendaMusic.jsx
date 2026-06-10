import { useState, useRef } from 'react'
import { useMusicStore } from '../../store/musicStore'
import { recommend, bumpTaste, GENRES, FOCUS_CATALOG } from '../../services/musicCatalog'
import { playPlaylist, pauseApi, resumeApi, nextApi, prevApi, setVolumeApi } from '../../services/spotifyService'
import styles from './AgendaMusic.module.css'

export default function AgendaMusic() {
  const ytCurrent     = useMusicStore(s => s.ytCurrent)
  const setYtCurrent  = useMusicStore(s => s.setYtCurrent)
  const spotifyTrack  = useMusicStore(s => s.spotifyTrack)
  const spotifyPlaying = useMusicStore(s => s.spotifyPlaying)
  const setSpotifyPlaying = useMusicStore(s => s.setSpotifyPlaying)
  const spotifyUser      = useMusicStore(s => s.spotifyUser)
  const spotifyPlaylists = useMusicStore(s => s.spotifyPlaylists)
  const spotifyDeviceId  = useMusicStore(s => s.spotifyDeviceId)
  const ytVolume      = useMusicStore(s => s.ytVolume)
  const setYtVolume   = useMusicStore(s => s.setYtVolume)
  const setShowPlayer = useMusicStore(s => s.setShowPlayer)
  const setActiveTab  = useMusicStore(s => s.setActiveTab)

  const [source, setSource] = useState('youtube')
  const [volume, setVolume] = useState(65)
  const lastYt = useRef(null)

  const isSpotify = source === 'spotify'

  // ── YouTube (radios del catálogo) ──
  function playYt(t) { if (t) { setYtCurrent(t); bumpTaste(t.genero); lastYt.current = t } }
  function ytToggle() {
    if (ytCurrent) { lastYt.current = ytCurrent; setYtCurrent(null) }
    else playYt(lastYt.current || recommend(1)[0])
  }
  function ytStep(dir) {
    const i = FOCUS_CATALOG.findIndex(t => t.id === ytCurrent?.id)
    const n = FOCUS_CATALOG.length
    playYt(FOCUS_CATALOG[(((i < 0 ? 0 : i) + dir) % n + n) % n])
  }
  function ytShuffle() { playYt(recommend(1)[0]) }

  // ── Spotify ──
  function openSpotifyFull() { setActiveTab('spotify'); setShowPlayer(true) }
  async function playSpotify(pl) {
    if (!spotifyDeviceId) { openSpotifyFull(); return }
    try { await playPlaylist(pl.uri, spotifyDeviceId) } catch { openSpotifyFull() }
  }
  async function spToggle() {
    try {
      if (spotifyPlaying) await pauseApi(spotifyDeviceId)
      else                await resumeApi(spotifyDeviceId)
      setSpotifyPlaying(!spotifyPlaying)
    } catch { openSpotifyFull() }
  }
  async function spStep(dir) {
    try { dir > 0 ? await nextApi(spotifyDeviceId) : await prevApi(spotifyDeviceId) } catch {}
  }
  function spShuffle() {
    if (spotifyPlaylists.length) playSpotify(spotifyPlaylists[Math.floor(Math.random() * spotifyPlaylists.length)])
  }
  async function changeVol(v) { setVolume(v); try { await setVolumeApi(v, spotifyDeviceId) } catch {} }

  // ── Estado unificado por fuente ──
  const playing = isSpotify ? spotifyPlaying : !!ytCurrent
  const onShuffle = isSpotify ? spShuffle : ytShuffle
  const onPrev    = isSpotify ? () => spStep(-1) : () => ytStep(-1)
  const onNext    = isSpotify ? () => spStep(1)  : () => ytStep(1)
  const onToggle  = isSpotify ? spToggle : ytToggle

  const title = isSpotify
    ? (spotifyTrack?.name || (spotifyUser ? 'Elige una playlist' : 'Spotify'))
    : (ytCurrent?.nombre || 'Elige una pista')
  const artist = isSpotify
    ? (spotifyTrack?.artists?.map(a => a.name).join(', ') || '')
    : (ytCurrent ? (GENRES[ytCurrent.genero]?.label || 'Radio de enfoque') : 'YouTube · radios de enfoque')

  const spotifyDisconnected = isSpotify && !spotifyUser

  return (
    <div className={styles.dock}>
      <div className={styles.head}>
        <span className={styles.label}><i className="ti ti-music" /> Música de enfoque</span>
        <button className={styles.expand} onClick={() => setShowPlayer(true)} title="Abrir reproductor">
          <i className="ti ti-arrows-diagonal" />
        </button>
      </div>

      {/* Fuente */}
      <div className={styles.sources}>
        <button className={`${styles.src} ${!isSpotify ? styles.srcActive : ''}`} onClick={() => setSource('youtube')}>
          <i className="ti ti-brand-youtube" /> YouTube
        </button>
        <button className={`${styles.src} ${isSpotify ? styles.srcActive : ''}`} onClick={() => setSource('spotify')}>
          <i className="ti ti-brand-spotify" /> Spotify
        </button>
      </div>

      {spotifyDisconnected ? (
        <div className={styles.connect}>
          <i className="ti ti-brand-spotify" />
          <p className={styles.connectText}>Conecta Spotify para controlar tus playlists aquí.</p>
          <button className={styles.connectBtn} onClick={openSpotifyFull}>Conectar Spotify</button>
        </div>
      ) : (
        <>
          {/* Controles de transporte */}
          <div className={styles.controls}>
            <button className={styles.ctrl} onClick={onShuffle} title="Aleatorio"><i className="ti ti-arrows-shuffle" /></button>
            <button className={styles.ctrl} onClick={onPrev} title="Anterior"><i className="ti ti-player-skip-back" /></button>
            <button className={`${styles.ctrl} ${styles.ctrlMain}`} onClick={onToggle} title={playing ? 'Pausar' : 'Reproducir'}>
              <i className={playing ? 'ti ti-player-pause' : 'ti ti-player-play'} />
            </button>
            <button className={styles.ctrl} onClick={onNext} title="Siguiente"><i className="ti ti-player-skip-forward" /></button>
            <button className={styles.ctrl} title="Reproductor completo" onClick={() => setShowPlayer(true)}><i className="ti ti-list" /></button>
          </div>

          {/* Volumen (ambas fuentes) */}
          <div className={styles.volRow}>
            <i className="ti ti-volume" />
            <input
              className={styles.volSlider}
              type="range" min="0" max="100"
              value={isSpotify ? volume : ytVolume}
              onChange={e => {
                const v = Number(e.target.value)
                isSpotify ? changeVol(v) : setYtVolume(v)
              }}
            />
          </div>

          {/* Pista actual */}
          <div className={styles.meta}>
            <span className={styles.metaTitle}>{title}</span>
            {artist && <span className={styles.metaArtist}>{artist}</span>}
          </div>
        </>
      )}

      <button className={styles.openBtn} onClick={() => setShowPlayer(true)}>
        <i className="ti ti-playlist" /> Reproductor completo
      </button>
    </div>
  )
}
