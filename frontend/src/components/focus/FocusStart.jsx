import { useEffect, useState } from 'react'
import { useFocusStore } from '../../store/focusStore'
import { getMisProyectos } from '../../services/focusService'
import { getFocusProgress } from '../../services/rankService'
import styles from './FocusStart.module.css'

export default function FocusStart() {
  const { startSession, enterImmersive } = useFocusStore()
  const [proyectos, setProyectos] = useState([])
  const [proyectoId, setProyectoId] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [progress, setProgress] = useState(null)

  useEffect(() => { getMisProyectos().then(setProyectos).catch(() => {}) }, [])
  useEffect(() => { getFocusProgress().then(setProgress).catch(() => {}) }, [])

  async function handleEnter() {
    setLoading(true); setError('')
    try {
      await startSession({ tipo: 'libre', duracion_plan_min: null, proyecto_id: proyectoId || null })
      enterImmersive()
    } catch (e) {
      setError(e.message || 'No se pudo iniciar la sesión.')
      setLoading(false)
    }
  }

  const rank = progress?.after?.current
  const next = progress?.after?.next

  return (
    <div className={styles.wrap}>
      <div className={styles.aura} aria-hidden="true" />

      {/* Saludo de rango */}
      {rank && (
        <div className={styles.rankTeaser}>
          <span className={styles.rankIcon} style={{ color: rank.color }}>{rank.icon}</span>
          <div className={styles.rankInfo}>
            <span className={styles.rankName}>{rank.name}</span>
            <div className={styles.rankBar}>
              <div
                className={styles.rankFill}
                style={{ width: `${progress.after.progress * 100}%`, background: `linear-gradient(90deg, ${rank.color}, #378ADD)` }}
              />
            </div>
            <span className={styles.rankMeta}>
              {next ? `Faltan ${progress.after.minToNext} min para ${next.name}` : 'Rango máximo ✦'}
              {progress.streak > 0 && `  ·  🔥 ${progress.streak} día${progress.streak > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      )}

      <div className={styles.hero}>
        <span className={styles.symbol}>◎</span>
        <h1 className={styles.title}>Entra en tu Kairós</h1>
        <p className={styles.sub}>Un espacio sin distracciones para tu momento de máxima capacidad.</p>
      </div>

      {/* Proyecto opcional */}
      <div className={styles.field}>
        <label className={styles.label}>Enfocar en un proyecto <span className={styles.optional}>(opcional)</span></label>
        <select className={styles.select} value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
          <option value="">Sin proyecto</option>
          {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.enterBtn} onClick={handleEnter} disabled={loading}>
        {loading ? 'Entrando…' : '◐  Entrar en enfoque'}
      </button>
      <p className={styles.hint}>Flujo libre, sin cronómetro de cuenta regresiva. Tú marcas el ritmo.</p>
    </div>
  )
}
