import { useState } from 'react'
import { formatMoney } from '../../services/financeService'
import { calcMeta } from '../../services/financeAnalytics'
import styles from './MetasAhorro.module.css'

const GOALS_KEY = 'kairos-savings-goals'
const MESES_NOMBRE = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function loadGoals() {
  try { return JSON.parse(localStorage.getItem(GOALS_KEY) || '[]') } catch { return [] }
}

function fechaLabel(d) {
  return `${MESES_NOMBRE[d.getMonth()]} ${d.getFullYear()}`
}

const EMPTY = { nombre: '', objetivo: '', ahorroMensual: '', tasaMensual: '', balanceActual: '' }

export default function MetasAhorro() {
  const [goals, setGoals]       = useState(loadGoals)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [editIdx, setEditIdx]   = useState(null)

  function persist(list) {
    setGoals(list)
    localStorage.setItem(GOALS_KEY, JSON.stringify(list))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const g = {
      nombre:       form.nombre.trim(),
      objetivo:     parseFloat(form.objetivo) || 0,
      ahorroMensual:parseFloat(form.ahorroMensual) || 0,
      tasaMensual:  parseFloat(form.tasaMensual) || 0,
      balanceActual:parseFloat(form.balanceActual) || 0,
    }
    if (!g.nombre || g.objetivo <= 0) return
    if (editIdx !== null) {
      const next = goals.map((x, i) => i === editIdx ? g : x)
      persist(next)
      setEditIdx(null)
    } else {
      persist([...goals, g])
    }
    setForm(EMPTY)
    setShowForm(false)
  }

  function remove(i) {
    persist(goals.filter((_, idx) => idx !== i))
  }

  function startEdit(i) {
    const g = goals[i]
    setForm({
      nombre:        g.nombre,
      objetivo:      String(g.objetivo),
      ahorroMensual: String(g.ahorroMensual),
      tasaMensual:   String(g.tasaMensual || ''),
      balanceActual: String(g.balanceActual || ''),
    })
    setEditIdx(i)
    setShowForm(true)
  }

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.heading}><i className="ti ti-rocket" /> Metas de ahorro</h2>
        <button className={styles.addBtn} onClick={() => { setForm(EMPTY); setEditIdx(null); setShowForm(true) }}>
          + Nueva meta
        </button>
      </div>

      {goals.length === 0 && !showForm && (
        <div className={styles.empty}>
          <i className="ti ti-target" style={{ fontSize: 28, color: 'var(--kairos-purple-400, #a78bfa)' }} />
          <p>Define tu primera meta de ahorro y KAIROS calcula cuándo la alcanzas.</p>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <label className={styles.fieldFull}>
              <span>Nombre de la meta</span>
              <input
                className={styles.input}
                placeholder="ej: Fondo de emergencia"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Objetivo ($)</span>
              <input
                className={styles.input}
                type="number"
                min="1"
                placeholder="3000000"
                value={form.objetivo}
                onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Ahorro mensual ($)</span>
              <input
                className={styles.input}
                type="number"
                min="1"
                placeholder="500000"
                value={form.ahorroMensual}
                onChange={e => setForm(f => ({ ...f, ahorroMensual: e.target.value }))}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Tasa interés mensual (%, opcional)</span>
              <input
                className={styles.input}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.8"
                value={form.tasaMensual}
                onChange={e => setForm(f => ({ ...f, tasaMensual: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span>Ya ahorré ($)</span>
              <input
                className={styles.input}
                type="number"
                min="0"
                placeholder="0"
                value={form.balanceActual}
                onChange={e => setForm(f => ({ ...f, balanceActual: e.target.value }))}
              />
            </label>
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => { setShowForm(false); setEditIdx(null) }}>
              Cancelar
            </button>
            <button type="submit" className={styles.saveBtn}>
              {editIdx !== null ? 'Guardar cambios' : 'Crear meta'}
            </button>
          </div>
        </form>
      )}

      {/* Tarjetas de metas */}
      <div className={styles.cards}>
        {goals.map((g, i) => {
          const res = calcMeta(g)
          const pct = Math.min(100, res.progresoPct || 0)
          const done = pct >= 100
          return (
            <div key={i} className={`${styles.card} ${done ? styles.cardDone : ''}`}>
              <div className={styles.cardTop}>
                <span className={styles.cardNombre}>{g.nombre}</span>
                <div className={styles.cardActions}>
                  <button className={styles.iconBtn} onClick={() => startEdit(i)} title="Editar">
                    <i className="ti ti-pencil" />
                  </button>
                  <button className={styles.iconBtn} onClick={() => remove(i)} title="Eliminar">
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>

              <div className={styles.cardAmounts}>
                <span className={styles.cardCurrent}>${formatMoney(g.balanceActual || 0)}</span>
                <span className={styles.cardSep}>/</span>
                <span className={styles.cardGoal}>${formatMoney(g.objetivo)}</span>
              </div>

              <div className={styles.progressWrap}>
                <div
                  className={styles.progress}
                  style={{ width: `${pct}%`, background: done ? '#22c55e' : 'var(--kairos-purple-400, #a78bfa)' }}
                />
              </div>

              <div className={styles.cardMeta}>
                {done ? (
                  <span className={styles.doneTag}>🎉 ¡Meta alcanzada!</span>
                ) : (
                  <>
                    <span>Ahorrando ${formatMoney(g.ahorroMensual)}/mes</span>
                    {g.tasaMensual > 0 && <span> al {g.tasaMensual}% mensual</span>}
                    <span className={styles.fecha}>→ {fechaLabel(res.fechaEstimada)} ({res.meses} meses)</span>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
