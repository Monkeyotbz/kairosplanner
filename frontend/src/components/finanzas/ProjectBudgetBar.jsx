import { useEffect, useState } from 'react'
import {
  getPresupuestoProyecto, setPresupuestoProyecto, deletePresupuestoProyecto,
  budgetState, formatMoney,
} from '../../services/financeService'
import { IconArrowDownRight, IconPencil, IconRepeat, IconTarget, IconTrash } from '@tabler/icons-react'
import styles from './ProjectBudgetBar.module.css'

const ESTADO_LABEL = {
  ok:   'En camino',
  warn: 'Cerca del tope',
  over: 'Tope excedido',
}

export default function ProjectBudgetBar({ proyectoId, gastado, year, month, monthLabel }) {
  const [budget, setBudget]   = useState(null)
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!proyectoId) return
    setEditing(false)
    getPresupuestoProyecto(proyectoId, year, month).then(b => {
      setBudget(b)
      setVal(b ? String(b.monto_limite) : '')
    })
  }, [proyectoId, year, month])

  if (!proyectoId) return null

  const limite = budget ? Number(budget.monto_limite) : 0
  const { pct, estado, restante } = budgetState(gastado, limite)
  const fill = Math.min(pct, 100)

  async function save(e) {
    e.preventDefault()
    if (!val) return
    setLoading(true)
    try {
      const b = await setPresupuestoProyecto({ proyecto_id: proyectoId, monto_limite: parseFloat(val), anio: year, mes: month })
      setBudget({ ...b, heredado: false })
      setEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function clear() {
    setBudget(null); setVal(''); setEditing(false)
    try { await deletePresupuestoProyecto(proyectoId) } catch (e) { console.error(e) }
  }

  // ── Sin tope definido y no editando → invitación sutil ──
  if (!budget && !editing) {
    return (
      <div className={styles.prompt}>
        <span className={styles.promptText}>
          <IconTarget size="1em" /> Define un tope de costos para vigilar este proyecto
        </span>
        <button className={styles.promptBtn} onClick={() => setEditing(true)}>Definir tope</button>
      </div>
    )
  }

  // ── Editando (form inline) ──
  if (editing) {
    return (
      <form className={styles.editCard} onSubmit={save}>
        <label className={styles.editLabel}>Tope de costos para {monthLabel}</label>
        <div className={styles.editRow}>
          <input
            className={styles.input}
            type="number" min="0.01" step="0.01" placeholder="0.00"
            value={val} onChange={e => setVal(e.target.value)} autoFocus
          />
          <button type="submit" className={styles.saveBtn} disabled={loading}>
            {loading ? '...' : 'Guardar'}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={() => {
            setEditing(false); setVal(budget ? String(budget.monto_limite) : '')
          }}>
            Cancelar
          </button>
        </div>
      </form>
    )
  }

  // ── Con tope: barra de progreso ──
  return (
    <div className={`${styles.card} ${styles[estado]}`}>
      <div className={styles.top}>
        <span className={styles.label}>
          <IconTarget size="1em" /> Tope de costos
          {budget?.heredado
            ? <span className={styles.recurr}><IconArrowDownRight size="1em" /> heredado</span>
            : <span className={styles.recurr}><IconRepeat size="1em" /> cada mes</span>}
        </span>
        <div className={styles.actions}>
          <button className={styles.iconBtn} title="Editar" onClick={() => setEditing(true)}>
            <IconPencil size="1em" />
          </button>
          <button className={styles.iconBtn} title="Quitar tope" onClick={clear}>
            <IconTrash size="1em" />
          </button>
        </div>
      </div>

      <div className={styles.amounts}>
        <span className={styles.spent}>${formatMoney(gastado)}</span>
        <span className={styles.limit}>/ ${formatMoney(limite)}</span>
      </div>

      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${fill}%` }} />
      </div>

      <div className={styles.foot}>
        <span className={styles.estado}>{ESTADO_LABEL[estado]}</span>
        <span className={styles.restante}>
          {restante >= 0
            ? `Quedan $${formatMoney(restante)}`
            : `+$${formatMoney(-restante)} sobre el tope`}
        </span>
      </div>
    </div>
  )
}
