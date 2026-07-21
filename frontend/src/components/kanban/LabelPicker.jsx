import { useState, useEffect, useRef } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { getProyectoEtiquetas, createEtiqueta, addEtiquetaToCard, removeEtiquetaFromCard } from '../../services/boardService'
import styles from './LabelPicker.module.css'

const PRESET_COLORS = [
  '#639922', '#378ADD', '#EF9F27', '#D85A30',
  '#D4537E', '#534AB7', '#1D9E75', '#B4B2A9',
]

export default function LabelPicker({ onClose, style }) {
  const { selectedCard, proyecto, updateSelectedCardLabels, addEtiqueta } = useBoardStore()
  const [labels, setLabels]       = useState([])
  const [creating, setCreating]   = useState(false)
  const [newName, setNewName]     = useState('')
  const [newColor, setNewColor]   = useState(PRESET_COLORS[0])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (proyecto?.id) getProyectoEtiquetas(proyecto.id).then(setLabels)
  }, [proyecto?.id])

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  // Cerrar al hacer click afuera
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const cardLabelIds = new Set((selectedCard?.labels || []).map(l => l.id))

  async function handleToggle(label) {
    const isActive = cardLabelIds.has(label.id)
    const currentLabels = selectedCard?.labels || []
    let nextLabels

    if (isActive) {
      nextLabels = currentLabels.filter(l => l.id !== label.id)
      await removeEtiquetaFromCard(selectedCard.id, label.id)
    } else {
      nextLabels = [...currentLabels, label]
      await addEtiquetaToCard(selectedCard.id, label.id)
    }
    updateSelectedCardLabels(nextLabels)
  }

  async function handleCreate(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name || !proyecto?.id) return
    setSaving(true)
    setError('')
    try {
      const label = await createEtiqueta(proyecto.id, name, newColor)
      setLabels(prev => [...prev, label])
      addEtiqueta(label) // el FilterPanel la ve sin recargar el tablero
      setNewName('')
      setCreating(false)
    } catch (err) {
      console.error('Error al crear etiqueta:', err)
      setError(err.message || 'No se pudo crear la etiqueta')
    } finally { setSaving(false) }
  }

  return (
    <div className={styles.popover} ref={ref} style={style}>
      <div className={styles.header}>
        <span>Etiquetas</span>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div className={styles.list}>
        {labels.length === 0 && !creating && (
          <p className={styles.empty}>Sin etiquetas. Crea una.</p>
        )}
        {labels.map(label => {
          const active = cardLabelIds.has(label.id)
          return (
            <button
              key={label.id}
              className={`${styles.labelRow} ${active ? styles.labelActive : ''}`}
              onClick={() => handleToggle(label)}
            >
              <span className={styles.swatch} style={{ background: label.color }} />
              <span className={styles.labelName}>{label.nombre}</span>
              {active && <span className={styles.check}>✓</span>}
            </button>
          )
        })}
      </div>

      {creating ? (
        <form className={styles.createForm} onSubmit={handleCreate}>
          <input
            ref={inputRef}
            className={styles.nameInput}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nombre de la etiqueta"
            onKeyDown={e => e.key === 'Escape' && setCreating(false)}
          />
          {error && <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0' }}>{error}</p>}
          <div className={styles.colorRow}>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={`${styles.colorDot} ${newColor === c ? styles.colorDotActive : ''}`}
                style={{ background: c }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.createBtn} disabled={!newName.trim() || saving}>
              {saving ? '…' : 'Crear'}
            </button>
            <button type="button" className={styles.cancelBtn} onClick={() => setCreating(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button className={styles.newBtn} onClick={() => setCreating(true)}>
          + Nueva etiqueta
        </button>
      )}
    </div>
  )
}
