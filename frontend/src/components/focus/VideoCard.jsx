import styles from './VideoCard.module.css'

function getVideoId(url) {
  const match = url.match(/[?&]v=([^&]+)/)
  return match ? match[1] : null
}

export default function VideoCard({ video, onSelect, isPlaying }) {
  const videoId = getVideoId(video.url_youtube)
  const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null

  return (
    <div
      className={`${styles.card} ${isPlaying ? styles.playing : ''}`}
      onClick={() => onSelect(video)}
    >
      <div className={styles.thumb}>
        {thumb
          ? <img src={thumb} alt={video.titulo} draggable={false} />
          : <div className={styles.thumbFallback}>▶</div>
        }
        <div className={styles.playOverlay}>▶</div>
      </div>
      <p className={styles.title}>{video.titulo}</p>
    </div>
  )
}
