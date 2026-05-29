import { useState } from 'react'
import { createProject } from '../../services/boardService'
import { useBoardStore } from '../../store/boardStore'
import styles from './EmptyBoard.module.css'

const TEMPLATES = [
  { icon: '🎵', nombre: 'Producción Musical',   descripcion: 'Gestiona composición, grabación, mezcla y lanzamiento' },
  { icon: '💻', nombre: 'Desarrollo Web',        descripcion: 'Frontend, backend, QA y deploy organizados' },
  { icon: '📣', nombre: 'Campaña de Marketing',  descripcion: 'Estrategia, contenido, publicación y análisis' },
  { icon: '🎯', nombre: 'Proyecto Personal',     descripcion: 'Organiza cualquier proyecto a tu manera' },
]

export default function EmptyBoard() {
  const { loadBoard, loadProyectos } = useBoardStore()
  const [nombre, setNombre]       = useState('')
  const [descripcion, setDesc]    = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  function applyTemplate(t) {
    setNombre(t.nombre)
    setDesc(t.descripcion)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!nombre.trim()) return setError('El nombre del proyecto es requerido.')
    setLoading(true)
    setError('')
    try {
      const proyecto = await createProject({ nombre: nombre.trim(), descripcion: descripcion.trim() })
      await loadProyectos()
      await loadBoard(proyecto.id)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.content}>
        <span className={styles.bigIcon}>◎</span>
        <h1 className={styles.title}>Crea tu primer proyecto</h1>
        <p className={styles.sub}>Organiza cualquier proyecto — desde una producción musical hasta el lanzamiento de un producto.</p>

        <div className={styles.templates}>
          {TEMPLATES.map(t => (
            <button key={t.nombre} className={styles.template} onClick={() => applyTemplate(t)}>
              <span className={styles.templateIcon}>{t.icon}</span>
              <span className={styles.templateName}>{t.nombre}</span>
            </button>
          ))}
        </div>

        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.field}>
            <label className={styles.label}>Nombre del proyecto</label>
            <input
              className={styles.input}
              placeholder="Ej: Álbum Vol. 1, App KAIROS, Campaña Q3..."
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Descripción <span className={styles.opt}>(opcional)</span></label>
            <input
              className={styles.input}
              placeholder="¿De qué trata este proyecto?"
              value={descripcion}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.createBtn} type="submit" disabled={loading}>
            {loading ? 'Creando...' : '▶ Crear proyecto'}
          </button>
        </form>
      </div>
    </div>
  )
}
