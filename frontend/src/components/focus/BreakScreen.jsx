import { useEffect, useState } from 'react'
import { useFocusStore } from '../../store/focusStore'
import { getVideos } from '../../services/focusService'
import VideoCard from './VideoCard'
import styles from './BreakScreen.module.css'

const CATEGORIAS = [
  { key: 'stretching',  label: '🤸 Stretching' },
  { key: 'respiracion', label: '🌬️ Respiración' },
  { key: 'meditacion',  label: '🧘 Meditación' },
  { key: 'caminata',   label: '🚶 Caminata' },
]

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function getVideoId(url) {
  const match = url.match(/[?&]v=([^&]+)/)
  return match ? match[1] : null
}

export default function BreakScreen() {
  const { breakSeconds, resumeSession } = useFocusStore()
  const [videos, setVideos] = useState([])
  const [categoria, setCategoria] = useState('stretching')
  const [selectedVideo, setSelectedVideo] = useState(null)

  useEffect(() => {
    getVideos().then(setVideos)
  }, [])

  const filteredVideos = videos.filter(v => v.categoria === categoria)
  const videoId = selectedVideo ? getVideoId(selectedVideo.url_youtube) : null

  function handleSelectVideo(video) {
    setSelectedVideo(prev => prev?.id === video.id ? null : video)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <span className={styles.pauseIcon}>☕</span>
        <h2 className={styles.title}>Tiempo de pausa</h2>
        <p className={styles.timer}>{formatTime(breakSeconds)}</p>
        <p className={styles.sub}>Tu cerebro te lo agradece — descansa un momento</p>
      </div>

      {/* Player embebido */}
      {selectedVideo && videoId && (
        <div className={styles.playerWrap}>
          <iframe
            className={styles.player}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title={selectedVideo.titulo}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
          <button className={styles.closePlayer} onClick={() => setSelectedVideo(null)}>✕ Cerrar video</button>
        </div>
      )}

      {/* Categorías */}
      <div className={styles.catRow}>
        {CATEGORIAS.map(c => (
          <button
            key={c.key}
            className={`${styles.catBtn} ${categoria === c.key ? styles.catActive : ''}`}
            onClick={() => { setCategoria(c.key); setSelectedVideo(null) }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Videos */}
      <div className={styles.videosRow}>
        {filteredVideos.length > 0
          ? filteredVideos.map(v => (
              <VideoCard
                key={v.id}
                video={v}
                onSelect={handleSelectVideo}
                isPlaying={selectedVideo?.id === v.id}
              />
            ))
          : <p className={styles.empty}>No hay videos en esta categoría aún.</p>
        }
      </div>

      {/* Reanudar */}
      <button
        className={styles.resumeBtn}
        onClick={() => resumeSession(selectedVideo?.id ?? null)}
      >
        ▶ Retomar sesión
      </button>
    </div>
  )
}
