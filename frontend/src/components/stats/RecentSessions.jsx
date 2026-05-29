import styles from './RecentSessions.module.css'

function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(isoStr) {
  const d = new Date(isoStr)
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

export default function RecentSessions({ sessions }) {
  const recent = sessions.slice(0, 8)

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Sesiones recientes</h3>
      {!recent.length
        ? <p className={styles.empty}>Sin sesiones aún</p>
        : (
          <ul className={styles.list}>
            {recent.map(s => (
              <li key={s.id} className={styles.item}>
                <span className={styles.typeIcon}>
                  {s.tipo === 'pomodoro' ? '🍅' : '∞'}
                </span>
                <div className={styles.info}>
                  <span className={styles.project}>
                    {s.proyectos?.nombre || 'Sin proyecto'}
                  </span>
                  <span className={styles.date}>{formatDate(s.inicio)}</span>
                </div>
                <span className={styles.duration}>
                  {formatDuration(s.segundos_reales)}
                </span>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  )
}
