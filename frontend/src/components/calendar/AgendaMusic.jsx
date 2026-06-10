import { useState } from 'react'
import { useMusicStore } from '../../store/musicStore'
import { recommend, bumpTaste, generoCover, GENRES, topGenero } from '../../services/musicCatalog'
import styles from './AgendaMusic.module.css'

export default function AgendaMusic() {
  const ytCurrent     = useMusicStore(s => s.ytCurrent)
  const setYtCurrent  = useMusicStore(s => s.setYtCurrent)
  const spotifyTrack  = useMusicStore(s => s.spotifyTrack)
  const setShowPlayer = useMusicStore(s => s.setShowPlayer)

  // Pedimos de más y filtramos lo que suena en el render (sin duplicar)
  const [recs, setRecs] = useState(() => recommend(6))
  const shuffle = () => setRecs(recommend(6))
  const shown = recs.filter(r => r.id !== ytCurrent?.id).slice(0, 4)

  function play(rec) {
    if (ytCurrent?.id === rec.id) { setYtCurrent(null); return }
    setYtCurrent(rec)
    bumpTaste(rec.genero)
  }

  const top    = topGenero()
  const cover  = spotifyTrack?.album?.images?.[0]?.url
  const artist = spotifyTrack?.artists?.map(a => a.name).join(', ')

  return (
    <div className={styles.dock}>
      <div className={styles.head}>
        <span className={styles.label}><i className="ti ti-music" /> Música de enfoque</span>
        <button className={styles.expand} onClick={() => setShowPlayer(true)} title="Abrir reproductor">
          <i className="ti ti-arrows-diagonal" />
        </button>
      </div>

      {/* Sonando ahora */}
      {ytCurrent ? (
        <div className={styles.now}>
          <span className={styles.eq}><i /><i /><i /></span>
          <span className={styles.nowName}>{ytCurrent.nombre}</span>
          <button className={styles.stop} onClick={() => setYtCurrent(null)} title="Detener">
            <i className="ti ti-player-stop" />
          </button>
        </div>
      ) : spotifyTrack ? (
        <div className={styles.now}>
          {cover && <img src={cover} className={styles.nowCover} alt="" />}
          <span className={styles.nowName}>
            {spotifyTrack.name}{artist && <span className={styles.nowArtist}>{artist}</span>}
          </span>
        </div>
      ) : null}

      {/* Recomendado para ti (varía + aprende del gusto) */}
      <div className={styles.recHead}>
        <span className={styles.recTitle}>
          {top ? `Porque te gusta ${GENRES[top]?.label}` : 'Recomendado para ti'}
        </span>
        <button className={styles.shuffle} onClick={shuffle} title="Variar recomendaciones">
          <i className="ti ti-refresh" />
        </button>
      </div>

      <div className={styles.grid}>
        {shown.map(rec => {
          const g = GENRES[rec.genero]
          return (
            <button
              key={rec.id}
              className={styles.tile}
              style={{ '--cover': generoCover(rec.genero) }}
              onClick={() => play(rec)}
              title={rec.nombre}
            >
              <span className={styles.emoji}>{g?.emoji || '🎵'}</span>
              <span className={styles.tileOverlay}><i className="ti ti-player-play" /></span>
              <span className={styles.tileName}>{rec.nombre}</span>
            </button>
          )
        })}
      </div>

      <button className={styles.openBtn} onClick={() => setShowPlayer(true)}>
        <i className="ti ti-playlist" /> Reproductor completo
      </button>
    </div>
  )
}
