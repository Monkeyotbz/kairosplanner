import { useEffect, useState } from 'react'
import { getMisProyectos } from '../../services/focusService'
import { getFinanzasProyecto, addFinanzaProyecto, deleteFinanzaProyecto, calcSummary, formatMoney } from '../../services/financeService'
import FinanceSummary from './FinanceSummary'
import ProjectBudgetBar from './ProjectBudgetBar'
import ProjectROI from './ProjectROI'
import styles from './ProyectoFinanzas.module.css'

const today = new Date().toISOString().slice(0, 10)

function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export default function ProyectoFinanzas({ year, month }) {
  const [proyectos, setProyectos]   = useState([])
  const [proyectoId, setProyectoId] = useState('')
  const [items, setItems]           = useState([])
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ concepto: '', monto: '', tipo: 'ingreso', fecha: today })
  const [loading, setLoading]       = useState(false)
  const [version, setVersion]       = useState(0)  // bump → recalcula ROI

  useEffect(() => {
    getMisProyectos().then(ps => {
      setProyectos(ps)
      if (ps.length) setProyectoId(ps[0].id)
    })
  }, [])

  useEffect(() => {
    if (!proyectoId) return
    getFinanzasProyecto(proyectoId, year, month).then(setItems)
  }, [proyectoId, year, month])

  const summary = calcSummary(items, 'ingreso', 'costo')
  const margen  = summary.ingresos > 0 ? ((summary.balance / summary.ingresos) * 100).toFixed(0) : 0

  async function handleAdd(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await addFinanzaProyecto({ proyecto_id: proyectoId, ...form, monto: parseFloat(form.monto) })
      setForm({ concepto: '', monto: '', tipo: 'ingreso', fecha: today })
      setShowForm(false)
      getFinanzasProyecto(proyectoId, year, month).then(setItems)
      setVersion(v => v + 1)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar?')) return
    await deleteFinanzaProyecto(id)
    getFinanzasProyecto(proyectoId, year, month).then(setItems)
    setVersion(v => v + 1)
  }

  return (
    <div className={styles.wrap}>
      {/* Selector de proyecto */}
      <select className={styles.projectSelect} value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
        {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>

      {/* Summary con margen */}
      <div className={styles.summaryRow}>
        <FinanceSummary ingresos={summary.ingresos} gastos={summary.gastos} balance={summary.balance} />
        <div className={styles.margenCard}>
          <span className={styles.margenLabel}>Margen</span>
          <span className={`${styles.margenVal} ${Number(margen) >= 0 ? styles.green : styles.red}`}>
            {margen}%
          </span>
        </div>
      </div>

      {/* Tiempo = Dinero: ROI del proyecto */}
      <ProjectROI proyectoId={proyectoId} version={version} />

      {/* Tope de costos del proyecto */}
      <ProjectBudgetBar proyectoId={proyectoId} gastado={summary.gastos} />

      {/* Lista */}
      <div className={styles.listCard}>
        <div className={styles.listHeader}>
          <h3 className={styles.listTitle}>Movimientos del proyecto</h3>
          <button className={styles.addBtn} onClick={() => setShowForm(v => !v)}>+ Agregar</button>
        </div>

        {showForm && (
          <form className={styles.inlineForm} onSubmit={handleAdd}>
            <div className={styles.tipoRow}>
              {['ingreso', 'costo'].map(t => (
                <button key={t} type="button"
                  className={`${styles.tipoBtn} ${form.tipo === t ? (t === 'ingreso' ? styles.activeIngreso : styles.activeCosto) : ''}`}
                  onClick={() => setForm(f => ({ ...f, tipo: t }))}
                >
                  {t === 'ingreso' ? '↑ Ingreso' : '↓ Costo'}
                </button>
              ))}
            </div>
            <div className={styles.formRow}>
              <input className={styles.input} placeholder="Concepto" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} required />
              <input className={styles.input} type="number" min="0.01" step="0.01" placeholder="Monto" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} required />
              <input className={styles.input} type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
              <button className={styles.saveBtn} type="submit" disabled={loading}>
                {loading ? '...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}

        {!items.length
          ? <p className={styles.empty}>Sin movimientos este mes para este proyecto.</p>
          : (
            <ul className={styles.list}>
              {items.map(item => (
                <li key={item.id} className={styles.item}>
                  <span className={`${styles.typeBadge} ${item.tipo === 'ingreso' ? styles.badgeIngreso : styles.badgeCosto}`}>
                    {item.tipo === 'ingreso' ? '↑' : '↓'}
                  </span>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemConcepto}>{item.concepto}</span>
                    <span className={styles.itemDate}>{formatDate(item.fecha)}</span>
                  </div>
                  <span className={`${styles.itemMonto} ${item.tipo === 'ingreso' ? styles.green : styles.red}`}>
                    {item.tipo === 'ingreso' ? '+' : '-'}${formatMoney(item.monto)}
                  </span>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)}>✕</button>
                </li>
              ))}
            </ul>
          )
        }
      </div>
    </div>
  )
}
