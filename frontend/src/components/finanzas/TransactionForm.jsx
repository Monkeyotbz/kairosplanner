import { useEffect, useState } from 'react'
import { getCategorias, addTransaccion } from '../../services/financeService'
import styles from './TransactionForm.module.css'

export default function TransactionForm({ onSaved, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const [tipo, setTipo]           = useState('gasto')
  const [concepto, setConcepto]   = useState('')
  const [monto, setMonto]         = useState('')
  const [categoriaId, setCatId]   = useState('')
  const [fecha, setFecha]         = useState(today)
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => { getCategorias().then(setCategorias) }, [])

  const catsFiltradas = categorias.filter(c => c.tipo === tipo)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!concepto || !monto || !fecha) return setError('Completa todos los campos.')
    setLoading(true)
    setError('')
    try {
      await addTransaccion({ concepto, monto: parseFloat(monto), tipo, categoria_id: categoriaId || null, fecha })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Nuevo movimiento</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Tipo toggle */}
          <div className={styles.tipoRow}>
            <button
              type="button"
              className={`${styles.tipoBtn} ${tipo === 'gasto' ? styles.tipoBtnGasto : ''}`}
              onClick={() => { setTipo('gasto'); setCatId('') }}
            >
              ↓ Gasto
            </button>
            <button
              type="button"
              className={`${styles.tipoBtn} ${tipo === 'ingreso' ? styles.tipoBtnIngreso : ''}`}
              onClick={() => { setTipo('ingreso'); setCatId('') }}
            >
              ↑ Ingreso
            </button>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Concepto</label>
            <input className={styles.input} placeholder="Ej: Alquiler, Sueldo..." value={concepto} onChange={e => setConcepto(e.target.value)} required />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Monto</label>
              <input className={styles.input} type="number" min="0.01" step="0.01" placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Fecha</label>
              <input className={styles.input} type="date" value={fecha} onChange={e => setFecha(e.target.value)} required />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Categoría <span className={styles.opt}>(opcional)</span></label>
            <select className={styles.select} value={categoriaId} onChange={e => setCatId(e.target.value)}>
              <option value="">Sin categoría</option>
              {catsFiltradas.map(c => (
                <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
              ))}
            </select>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
