import { useEffect, useState } from 'react'
import { useFocusStore } from '../../store/focusStore'
import { getMisProyectos } from '../../services/focusService'
import styles from './ModeSelector.module.css'

const DURACIONES = [25, 45, 60, 90]

export default function ModeSelector() {
  const { startSession } = useFocusStore()
  const [tipo, setTipo] = useState('libre')
  const [duracion, setDuracion] = useState(25)
  const [proyectoId, setProyectoId] = useState('')
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMisProyectos().then(setProyectos)
  }, [])

  async function handleStart() {
    setLoading(true)
    setError('')
    try {
      await startSession({
        tipo,
        duracion_plan_min: tipo === 'pomodoro' ? duracion : null,
        proyecto_id: proyectoId || null,
      })
    } catch (err) {
      setError(err.message || 'Error al iniciar la sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.icon}>◎</span>
          <h1 className={styles.title}>Modo Enfoque</h1>
          <p className={styles.sub}>Elige cómo quieres trabajar hoy</p>
        </div>

        {/* Selector de modo */}
        <div className={styles.modeRow}>
          <button
            className={`${styles.modeBtn} ${tipo === 'pomodoro' ? styles.modeActive : ''}`}
            onClick={() => setTipo('pomodoro')}
          >
            <span className={styles.modeIcon}>🍅</span>
            <span className={styles.modeName}>Pomodoro</span>
            <span className={styles.modeDesc}>Intervalos con pausas</span>
          </button>

          <button
            className={`${styles.modeBtn} ${tipo === 'libre' ? styles.modeActive : ''}`}
            onClick={() => setTipo('libre')}
          >
            <span className={styles.modeIcon}>∞</span>
            <span className={styles.modeName}>Libre</span>
            <span className={styles.modeDesc}>Sin límite de tiempo</span>
          </button>
        </div>

        {/* Duración (solo Pomodoro) */}
        {tipo === 'pomodoro' && (
          <div className={styles.section}>
            <label className={styles.label}>Duración del bloque</label>
            <div className={styles.duracionRow}>
              {DURACIONES.map(d => (
                <button
                  key={d}
                  className={`${styles.durBtn} ${duracion === d ? styles.durActive : ''}`}
                  onClick={() => setDuracion(d)}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Proyecto */}
        <div className={styles.section}>
          <label className={styles.label}>Proyecto <span className={styles.optional}>(opcional)</span></label>
          <select
            className={styles.select}
            value={proyectoId}
            onChange={e => setProyectoId(e.target.value)}
          >
            <option value="">Sin proyecto</option>
            {proyectos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        {error && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center' }}>{error}</p>}

        <button className={styles.startBtn} onClick={handleStart} disabled={loading}>
          {loading ? 'Iniciando...' : '▶  Iniciar sesión de enfoque'}
        </button>
      </div>
    </div>
  )
}
