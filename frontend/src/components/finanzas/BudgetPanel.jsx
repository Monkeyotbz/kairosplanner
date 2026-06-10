import { useEffect, useState } from 'react'
import {
  getPresupuestos, setPresupuesto, deletePresupuestoCategoria,
  getCategorias, calcBudgetProgress, formatMoney,
} from '../../services/financeService'
import styles from './BudgetPanel.module.css'

const ESTADO_LABEL = {
  ok:   'En camino',
  warn: 'Cerca del límite',
  over: 'Excedido',
}

export default function BudgetPanel({ transacciones, year, month, monthLabel }) {
  const [presupuestos, setPresupuestos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [formFor, setFormFor]   = useState(null) // null = cerrado | {} nuevo | presupuesto a editar

  async function load() {
    setLoading(true)
    const data = await getPresupuestos(year, month)
    setPresupuestos(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [year, month])

  const progreso = calcBudgetProgress(presupuestos, transacciones)

  async function handleDelete(categoriaId) {
    setPresupuestos(prev => prev.filter(p => p.categoria_id !== categoriaId))
    try { await deletePresupuestoCategoria(categoriaId) } catch (e) { console.error(e); load() }
  }

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={styles.headTitles}>
          <h2 className={styles.heading}>
            <i className="ti ti-target" /> Presupuestos
          </h2>
          <span className={styles.subtitle}>
            <i className="ti ti-repeat" /> Cada mes hereda el valor anterior · {monthLabel}
          </span>
        </div>
        <button className={styles.addBtn} onClick={() => setFormFor({})}>
          + Presupuesto
        </button>
      </div>

      {loading ? (
        <div className={styles.state}><span className={styles.spinner} /> Cargando...</div>
      ) : progreso.length === 0 ? (
        <div className={styles.empty}>
          <i className="ti ti-target-arrow" />
          <p className={styles.emptyTitle}>Aún no defines presupuestos</p>
          <p className={styles.emptyText}>
            Fija un límite mensual por categoría (ej. $500 en Software) y KAIROS te avisará
            sutilmente al acercarte.
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {progreso.map(p => {
            const cat  = p.categorias_finanzas || {}
            const fill = Math.min(p.pct, 100)
            return (
              <div key={p.categoria_id} className={`${styles.card} ${styles[p.estado]}`}>
                <div className={styles.cardTop}>
                  <span className={styles.catName}>
                    <span className={styles.catIcon}>{cat.icono || '◈'}</span>
                    {cat.nombre || 'Categoría'}
                    {p.heredado && (
                      <span className={styles.heredado} title="Valor heredado de un mes anterior. Edítalo para fijar uno propio.">
                        <i className="ti ti-arrow-down-right" /> heredado
                      </span>
                    )}
                  </span>
                  <div className={styles.cardActions}>
                    <button className={styles.iconBtn} title="Editar este mes" onClick={() => setFormFor(p)}>
                      <i className="ti ti-pencil" />
                    </button>
                    <button className={styles.iconBtn} title="Eliminar (todos los meses)" onClick={() => handleDelete(p.categoria_id)}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>

                <div className={styles.amounts}>
                  <span className={styles.spent}>${formatMoney(p.gastado)}</span>
                  <span className={styles.limit}>/ ${formatMoney(p.limite)}</span>
                </div>

                <div className={styles.track}>
                  <div className={styles.fill} style={{ width: `${fill}%` }} />
                </div>

                <div className={styles.cardFoot}>
                  <span className={styles.estado}>{ESTADO_LABEL[p.estado]}</span>
                  <span className={styles.restante}>
                    {p.restante >= 0
                      ? `Quedan $${formatMoney(p.restante)}`
                      : `+$${formatMoney(-p.restante)} de más`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {formFor && (
        <BudgetForm
          editing={formFor.categoria_id ? formFor : null}
          existentes={presupuestos.map(p => p.categoria_id)}
          year={year} month={month} monthLabel={monthLabel}
          onSaved={() => { setFormFor(null); load() }}
          onClose={() => setFormFor(null)}
        />
      )}
    </section>
  )
}

// ── Formulario (modal) ───────────────────────────────────────
function BudgetForm({ editing, existentes, year, month, monthLabel, onSaved, onClose }) {
  const [categorias, setCategorias] = useState([])
  const [categoriaId, setCatId]     = useState(editing?.categoria_id || '')
  const [monto, setMonto]           = useState(editing ? String(editing.monto_limite) : '')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => { getCategorias().then(setCategorias) }, [])

  // Solo categorías de gasto; al crear, excluye las que ya tienen presupuesto
  const opciones = categorias.filter(c =>
    c.tipo === 'gasto' && (editing || !existentes.includes(c.id))
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!categoriaId || !monto) return setError('Elige categoría y monto.')
    setLoading(true)
    setError('')
    try {
      await setPresupuesto({ categoria_id: categoriaId, monto_limite: parseFloat(monto), anio: year, mes: month })
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
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>
            {editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Categoría</label>
            <select
              className={styles.select}
              value={categoriaId}
              onChange={e => setCatId(e.target.value)}
              disabled={!!editing}
            >
              <option value="">Elige una categoría…</option>
              {opciones.map(c => (
                <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
              ))}
            </select>
            {!editing && opciones.length === 0 && (
              <p className={styles.hint}>Todas tus categorías de gasto ya tienen presupuesto.</p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Límite para {monthLabel}</label>
            <input
              className={styles.input}
              type="number" min="0.01" step="0.01" placeholder="0.00"
              value={monto}
              onChange={e => setMonto(e.target.value)}
            />
            <p className={styles.hint}>
              Aplica desde {monthLabel} en adelante; los meses anteriores no cambian.
            </p>
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
