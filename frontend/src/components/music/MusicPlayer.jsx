import { useState, useEffect, useRef, useCallback } from 'react'
import { useMusicStore } from '../../store/musicStore'
import { useChatStore } from '../../store/chatStore'
import {
  initiateLogin, isConnected, disconnectSpotify,
  initSDKPlayer, playPlaylist, pauseApi, resumeApi, nextApi, prevApi, setVolumeApi,
  getMe, getPlaylists,
} from '../../services/spotifyService'
import styles from './MusicPlayer.module.css'
import { IconMusic, IconPlayerPlay, IconPlayerSkipBack, IconPlayerSkipForward, IconPlayerStop, IconPlaylist, IconPlus, IconUnlink, IconVolume, IconX, IconPlayerPause } from '@tabler/icons-react'

// ── YouTube helpers ───────────────────────────────────────────
function extractYtInfo(url) {
  const listMatch  = url.match(/[?&]list=([^&]+)/)
  const videoMatch = url.match(/(?:v=|youtu\.be\/)([^?&]+)/)
  if (listMatch)  return { type: 'playlist', id: listMatch[1] }
  if (videoMatch) return { type: 'video',    id: videoMatch[1] }
  return null
}
function ytEmbedUrl(info) {
  if (!info) return ''
  const origin = typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : ''
  if (info.type === 'playlist')
    return `https://www.youtube.com/embed/videoseries?list=${info.id}&autoplay=1&loop=1&enablejsapi=1${origin}`
  return `https://www.youtube.com/embed/${info.id}?autoplay=1&loop=1&playlist=${info.id}&enablejsapi=1${origin}`
}

// ── Spotify track helpers ─────────────────────────────────────
function trackName(track) { return track?.name || '' }
function trackArtist(track) { return track?.artists?.map(a => a.name).join(', ') || '' }
function trackCover(track) { return track?.album?.images?.[0]?.url || '' }
function msToMin(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function MusicPlayer() {
  const {
    showPlayer, setShowPlayer, activeTab, setActiveTab,
    spotifyUser, setSpotifyUser, spotifyPlaylists, setSpotifyPlaylists,
    spotifyTrack, spotifyPlaying, spotifyDeviceId, spotifyError,
    setSpotifyPlayback, setSpotifyPlaying, setSpotifyDeviceId, setSpotifyError, clearSpotify,
    ytPlaylists, ytCurrent, setYtCurrent, addYtPlaylist, removeYtPlaylist,
    ytVolume, setYtVolume,
  } = useMusicStore()

  const [sdkReady,   setSdkReady]   = useState(false)
  const [sdkLoading, setSdkLoading] = useState(false)
  const [ytUrl,      setYtUrl]      = useState('')
  const [ytName,     setYtName]     = useState('')
  const [ytAddErr,   setYtAddErr]   = useState('')
  const [volume,     setVolume]     = useState(65)
  const playerRef = useRef(null)

  // ── YouTube IFrame API (para control de volumen) ──
  const ytPlayerRef = useRef(null)
  const ytIframeRef = useRef(null)

  // Cargar la API una sola vez
  useEffect(() => {
    if (window.YT || document.getElementById('yt-iframe-api')) return
    const tag = document.createElement('script')
    tag.id = 'yt-iframe-api'
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }, [])

  // (Re)crear el player al cambiar de pista; aplicar volumen al estar listo
  useEffect(() => {
    if (!ytCurrent || !ytIframeRef.current) { ytPlayerRef.current = null; return }
    let cancelled = false
    const build = () => {
      if (cancelled) return
      if (!window.YT?.Player) { setTimeout(build, 250); return }
      try { ytPlayerRef.current?.destroy?.() } catch (_) {}
      try {
        ytPlayerRef.current = new window.YT.Player(ytIframeRef.current, {
          events: { onReady: e => { try { e.target.setVolume(ytVolume) } catch (_) {} } },
        })
      } catch (_) {}
    }
    build()
    return () => { cancelled = true }
  }, [ytCurrent?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Aplicar cambios de volumen
  useEffect(() => {
    try { ytPlayerRef.current?.setVolume?.(ytVolume) } catch (_) {}
  }, [ytVolume])

  // Auto-init Spotify SDK when connected + panel opens
  useEffect(() => {
    if (!isConnected() || sdkReady || sdkLoading) return
    initSpotifySDK()
  }, [showPlayer]) // eslint-disable-line react-hooks/exhaustive-deps

  // Restore Spotify user/playlists from localStorage tokens on mount
  useEffect(() => {
    if (!isConnected() || spotifyUser) return
    Promise.all([getMe(), getPlaylists()])
      .then(([user, pls]) => { setSpotifyUser(user); setSpotifyPlaylists(pls) })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const initSpotifySDK = useCallback(async () => {
    setSdkLoading(true)
    try {
      const p = await initSDKPlayer({
        onReady: (deviceId) => {
          setSdkReady(!!deviceId)
          if (deviceId) setSpotifyDeviceId(deviceId)
          setSdkLoading(false)
        },
        onStateChange: (state) => {
          if (!state) return
          setSpotifyPlayback(
            state.track_window?.current_track || null,
            !state.paused,
            null,
          )
        },
        onError: (msg) => {
          setSpotifyError(msg)
          setSdkLoading(false)
        },
      })
      playerRef.current = p
    } catch (e) {
      setSpotifyError(e.message)
      setSdkLoading(false)
    }
  }, [setSpotifyDeviceId, setSpotifyPlayback, setSpotifyError])

  // ── Spotify controls ─────────────────────────────────────────
  async function handlePlayPlaylist(pl) {
    if (!spotifyDeviceId) { setSpotifyError('Player no listo — espera un momento'); return }
    try {
      setSpotifyError(null)
      await playPlaylist(pl.uri, spotifyDeviceId)
    } catch (e) { setSpotifyError(e.message) }
  }

  async function handleToggle() {
    try {
      if (spotifyPlaying) await pauseApi(spotifyDeviceId)
      else                await resumeApi(spotifyDeviceId)
      setSpotifyPlaying(!spotifyPlaying)
    } catch (e) { setSpotifyError(e.message) }
  }

  async function handleNext()     { try { await nextApi(spotifyDeviceId)  } catch (_) {} }
  async function handlePrev()     { try { await prevApi(spotifyDeviceId)  } catch (_) {} }
  async function handleVolume(v)  {
    setVolume(v)
    try { await setVolumeApi(v, spotifyDeviceId) } catch (_) {}
  }

  function handleDisconnect() {
    disconnectSpotify()
    clearSpotify()
    setSdkReady(false)
    playerRef.current = null
  }

  // ── YouTube ──────────────────────────────────────────────────
  function handleAddYt(e) {
    e.preventDefault()
    setYtAddErr('')
    const info = extractYtInfo(ytUrl.trim())
    if (!info) { setYtAddErr('URL de YouTube no válida'); return }
    const name = ytName.trim() || `YouTube ${ytPlaylists.length + 1}`
    addYtPlaylist({ id: `yt_${Date.now()}`, nombre: name, url: ytUrl.trim() })
    setYtUrl(''); setYtName('')
  }

  // ── Render ────────────────────────────────────────────────────
  const ytInfo      = ytCurrent ? extractYtInfo(ytCurrent.url) : null
  const embedUrl    = ytEmbedUrl(ytInfo)
  const spConnected = isConnected() && !!spotifyUser
  const chatOpen    = useChatStore(s => s.isOpen)

  return (
    <div
      className={`${styles.panel} ${showPlayer ? styles.panelVisible : styles.panelHidden}`}
      style={{ right: chatOpen ? '316px' : '16px' }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'spotify' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('spotify')}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Spotify
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'youtube' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('youtube')}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
              <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
            </svg>
            YouTube
          </button>
        </div>
        <button className={styles.closeBtn} onClick={() => setShowPlayer(false)}>
          <IconX size="1em" />
        </button>
      </div>

      {/* ── SPOTIFY TAB ── */}
      {activeTab === 'spotify' && (
        <div className={styles.tabContent}>
          {!spConnected ? (
            // Not connected
            <div className={styles.connectWrap}>
              <div className={styles.spotifyLogo}>
                <svg viewBox="0 0 24 24" width="40" height="40" fill="#1DB954">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
              <p className={styles.connectTitle}>Conecta Spotify</p>
              <p className={styles.connectSub}>Necesitas cuenta Spotify Premium para reproducción en la app.</p>
              <button className={styles.spotifyBtn} onClick={() => initiateLogin().catch(e => setSpotifyError(e.message))}>
                Conectar con Spotify
              </button>
              {spotifyError && <p className={styles.errorMsg}>{spotifyError}</p>}
            </div>
          ) : (
            // Connected
            <>
              {/* User info */}
              <div className={styles.spUser}>
                {spotifyUser.images?.[0]?.url
                  ? <img src={spotifyUser.images[0].url} className={styles.spAvatar} alt="" />
                  : <div className={styles.spAvatarFallback}>{spotifyUser.display_name?.[0]}</div>
                }
                <div>
                  <p className={styles.spUserName}>{spotifyUser.display_name}</p>
                  <p className={styles.spUserSub}>
                    {sdkLoading ? 'Iniciando player…' : sdkReady ? '● Player activo' : 'Player no listo'}
                  </p>
                </div>
                <button className={styles.disconnectBtn} onClick={handleDisconnect} title="Desconectar">
                  <IconUnlink size="1em" />
                </button>
              </div>

              {/* Current track */}
              {spotifyTrack ? (
                <div className={styles.nowPlaying}>
                  {trackCover(spotifyTrack) && (
                    <img src={trackCover(spotifyTrack)} className={styles.trackCover} alt="" />
                  )}
                  <div className={styles.trackInfo}>
                    <p className={styles.trackName}>{trackName(spotifyTrack)}</p>
                    <p className={styles.trackArtist}>{trackArtist(spotifyTrack)}</p>
                    {spotifyTrack.duration_ms && (
                      <p className={styles.trackDuration}>{msToMin(spotifyTrack.duration_ms)}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.noTrack}>Selecciona una playlist para empezar</div>
              )}

              {/* Controls */}
              <div className={styles.controls}>
                <button className={styles.ctrlBtn} onClick={handlePrev}><IconPlayerSkipBack size="1em" /></button>
                <button className={`${styles.ctrlBtn} ${styles.ctrlBtnMain}`} onClick={handleToggle} disabled={!sdkReady}>
                  {spotifyPlaying ? <IconPlayerPause size="1em" /> : <IconPlayerPlay size="1em" />}
                </button>
                <button className={styles.ctrlBtn} onClick={handleNext}><IconPlayerSkipForward size="1em" /></button>
                <div className={styles.volWrap}>
                  <IconVolume size="1em" style={{ fontSize: 13, color: 'var(--kairos-text-muted)' }} />
                  <input
                    type="range" min="0" max="100" value={volume}
                    className={styles.volSlider}
                    onChange={e => handleVolume(Number(e.target.value))}
                  />
                </div>
              </div>

              {spotifyError && <p className={styles.errorMsg}>{spotifyError}</p>}

              {/* Playlists */}
              {spotifyPlaylists.length > 0 && (
                <div className={styles.plSection}>
                  <p className={styles.plSectionTitle}>Mis playlists</p>
                  <div className={styles.plList}>
                    {spotifyPlaylists.map(pl => (
                      <button key={pl.id} className={styles.plItem} onClick={() => handlePlayPlaylist(pl)}>
                        {pl.images?.[0]?.url
                          ? <img src={pl.images[0].url} className={styles.plThumb} alt="" />
                          : <div className={styles.plThumbFallback}><IconMusic size="1em" /></div>
                        }
                        <div className={styles.plInfo}>
                          <span className={styles.plName}>{pl.name}</span>
                          <span className={styles.plTracks}>{pl.tracks?.total ?? '–'} canciones</span>
                        </div>
                        <IconPlayerPlay size="1em" style={{ fontSize: 13, color: 'var(--kairos-text-muted)', flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── YOUTUBE TAB ── */}
      {activeTab === 'youtube' && (
        <div className={styles.tabContent}>
          {/* Embedded player — always mounted when ytCurrent is set, hidden only visually */}
          {ytCurrent && ytInfo && (
            <div className={styles.ytPlayerWrap}>
              <iframe
                key={embedUrl}
                id="kairos-yt-iframe"
                ref={ytIframeRef}
                src={embedUrl}
                className={styles.ytIframe}
                title={ytCurrent.nombre}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
              <p className={styles.ytNowPlaying}>
                <span className={styles.ytDot} /> {ytCurrent.nombre}
                <button className={styles.ytStopBtn} onClick={() => setYtCurrent(null)}>
                  <IconPlayerStop size="1em" />
                </button>
              </p>
              <div className={styles.volWrap}>
                <IconVolume size="1em" style={{ fontSize: 13, color: 'var(--kairos-text-muted)' }} />
                <input
                  type="range" min="0" max="100" value={ytVolume}
                  className={styles.volSlider}
                  onChange={e => setYtVolume(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Playlist grid */}
          <div className={styles.plSection}>
            <p className={styles.plSectionTitle}>Playlists de enfoque</p>
            <div className={styles.ytGrid}>
              {ytPlaylists.map(pl => {
                const info = extractYtInfo(pl.url)
                const thumb = info?.type === 'video'
                  ? `https://img.youtube.com/vi/${info.id}/hqdefault.jpg`
                  : null
                const isPlaying = ytCurrent?.id === pl.id
                return (
                  <div key={pl.id} className={`${styles.ytCard} ${isPlaying ? styles.ytCardActive : ''}`}>
                    <div className={styles.ytThumbWrap} onClick={() => setYtCurrent(isPlaying ? null : pl)}>
                      {thumb
                        ? <img
                            src={thumb}
                            className={styles.ytThumb}
                            alt={pl.nombre}
                            loading="lazy"
                            onError={e => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none' }}
                          />
                        : <div className={styles.ytThumbFallback}><IconPlaylist size="1em" /></div>
                      }
                      <div className={styles.ytThumbOverlay}>
                        {isPlaying ? <IconPlayerStop size="1em" /> : <IconPlayerPlay size="1em" />}
                      </div>
                    </div>
                    <div className={styles.ytCardMeta}>
                      <span className={styles.ytCardName}>{pl.nombre}</span>
                      {pl.id.startsWith('yt_') && Number(pl.id.replace('yt_', '')) > 5 && (
                        <button className={styles.ytDeleteBtn} onClick={() => removeYtPlaylist(pl.id)}>
                          <IconX size="1em" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Add URL */}
          <div className={styles.plSection}>
            <p className={styles.plSectionTitle}>Agregar playlist</p>
            <form className={styles.ytAddForm} onSubmit={handleAddYt}>
              <input
                className={styles.ytInput}
                value={ytUrl}
                onChange={e => { setYtUrl(e.target.value); setYtAddErr('') }}
                placeholder="URL de YouTube (video o playlist)"
              />
              <input
                className={styles.ytInput}
                value={ytName}
                onChange={e => setYtName(e.target.value)}
                placeholder="Nombre (opcional)"
              />
              {ytAddErr && <p className={styles.errorMsg}>{ytAddErr}</p>}
              <button type="submit" className={styles.ytAddBtn} disabled={!ytUrl.trim()}>
                <IconPlus size="1em" /> Agregar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
