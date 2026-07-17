import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatMoney } from '../../services/financeService'
import { calcMeta, fmtK } from '../../services/financeAnalytics'
import styles from './CalculadoraAhorro.module.css'

const GOALS_KEY = 'kairos-savings-goals'
const MESES_NOMBRE = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// Paleta categórica validada (validate_palette.js, modo dark): una línea por meta
const SERIE_COLORS = ['#8b5cf6', '#16a34a', '#ef4444']
const PCT_CHIPS = [10, 15, 20, 30]

const FACTOR_MENSUAL = {
  diaria: 30, semanal: 30 / 7, quincenal: 2, mensual: 1,
  bimestral: 1 / 2, trimestral: 1 / 3, anual: 1 / 12,
}

function loadGoals() {
  try { return JSON.parse(localStorage.getItem(GOALS_KEY) || '[]') } catch { return [] }
}

function mensualizar(items) {
  return items.reduce((s, r) => s + Number(r.monto) * (FACTOR_MENSUAL[r.frecuencia] || 1), 0)
}

// Serie de acumulado mes a mes para una meta (con interés compuesto opcional),
// topada en el objetivo para que la línea se aplane al alcanzarla.
function metaSerie(g, months) {
  const vals = []
  let acc = Number(g.balanceActual) || 0
  const r = (g.tasaMensual || 0) / 100
  for (let m = 0; m <= months; m++) {
    vals.push(Math.round(Math.min(acc, g.objetivo)))
    acc = acc * (1 + r) + (Number(g.ahorroMensual) || 0)
  }
  return vals
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: p.stroke }} />
          <span className={styles.tooltipName}>{p.name}</span>
          <span className={styles.tooltipVal}>${formatMoney(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const EMPTY_FORM = { nombre: '', porcentaje: 20, objetivo: '', balanceActual: '', tasaMensual: '' }

export default function CalculadoraAhorro({ recurrencias }) {
  const [goals, setGoals]       = useState(loadGoals)
  const [pct, setPct]           = useState(20)
  const [showForm, setShowForm] = useState(false)
  const [editIdx, setEditIdx]   = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)

  const activos     = recurrencias.filter(r => r.activa)
  const salario     = mensualizar(activos.filter(r => r.tipo === 'ingreso'))
  const gastosFijos = mensualizar(activos.filter(r => r.tipo === 'gasto'))
  const margen      = salario - gastosFijos

  // Solo las metas por porcentaje viven aquí; las de monto fijo siguen en Análisis
  const metasPct = goals.filter(g => g.porcentaje > 0)
  const comprometido = metasPct.reduce((s, g) => s + (Number(g.ahorroMensual) || 0), 0)
  const libre = Math.max(0, margen - comprometido)

  const simMonto = salario * (pct / 100)

  function persist(list) {
    setGoals(list)
    localStorage.setItem(GOALS_KEY, JSON.stringify(list))
  }

  function openNew(prefPct) {
    setForm({ ...EMPTY_FORM, porcentaje: prefPct ?? pct })
    setEditIdx(null)
    setShowForm(true)
  }

  function openEdit(g) {
    const idx = goals.indexOf(g)
    setForm({
      nombre:        g.nombre,
      porcentaje:    g.porcentaje,
      objetivo:      String(g.objetivo),
      balanceActual: String(g.balanceActual || ''),
      tasaMensual:   String(g.tasaMensual || ''),
    })
    setEditIdx(idx)
    setShowForm(true)
  }

  function handleSave(e) {
    e.preventDefault()
    const g = {
      nombre:        form.nombre.trim(),
      porcentaje:    Math.max(1, Math.min(80, parseFloat(form.porcentaje) || 0)),
      objetivo:      parseFloat(form.objetivo) || 0,
      balanceActual: parseFloat(form.balanceActual) || 0,
      tasaMensual:   parseFloat(form.tasaMensual) || 0,
    }
    if (!g.nombre || g.objetivo <= 0) return
    // El monto mensual se deriva del % sobre el salario recurrente actual
    g.ahorroMensual = Math.round(salario * (g.porcentaje / 100))
    if (editIdx !== null) persist(goals.map((x, i) => i === editIdx ? g : x))
    else persist([...goals, g])
    setShowForm(false)
    setEditIdx(null)
  }

  function remove(g) {
    persist(goals.filter(x => x !== g))
  }

  // ── Proyección para el gráfico ─────────────────────────────
  const chartMetas = metasPct.slice(0, SERIE_COLORS.length)
  const { points, horizon } = useMemo(() => {
    const etas = chartMetas.map(g => calcMeta(g).meses)
    const horizon = Math.min(36, Math.max(12, ...etas.map(m => m + 2), 12))
    const series = chartMetas.length > 0
      ? chartMetas.map(g => metaSerie(g, horizon))
      : [(() => {
          const vals = []
          for (let m = 0; m <= horizon; m++) vals.push(Math.round(simMonto * m))
          return vals
        })()]
    const now = new Date()
    const points = []
    for (let m = 0; m <= horizon; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() + m, 1)
      const label = d.getMonth() === 0 || m === 0
        ? `${MESES_NOMBRE[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
        : MESES_NOMBRE[d.getMonth()]
      const pt = { label }
      series.forEach((vals, i) => { pt[`s${i}`] = vals[m] })
      points.push(pt)
    }
    return { points, horizon }
  }, [chartMetas, simMonto])

  const serieNames = chartMetas.length > 0
    ? chartMetas.map(g => g.nombre)
    : [`Simulación ${pct}%`]

  if (salario <= 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.heading}><i className="ti ti-calculator" /> Calculadora de ahorro</h2>
        <div className={styles.empty}>
          <i className="ti ti-cash" />
          <p>Agrega tu salario como <strong>recurrente de tipo ingreso</strong> y aquí podrás
          definir metas de ahorro como porcentaje de lo que ganas.</p>
        </div>
      </section>
    )
  }

  const excede = simMonto > margen

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={styles.headTitles}>
          <h2 className={styles.heading}><i className="ti ti-calculator" /> Calculadora de ahorro</h2>
          <span className={styles.subtitle}>
            Define metas como % de tu ingreso recurrente (${fmtK(salario)}/mes) y mide su proyección
          </span>
        </div>
        <button className={styles.addBtn} onClick={() => openNew()}>+ Meta por %</button>
      </div>

      {/* ── Simulador ──────────────────────────────────────────── */}
      <div className={styles.simulator}>
        <div className={styles.simTop}>
          <div className={styles.simChips}>
            {PCT_CHIPS.map(p => (
              <button
                key={p}
                className={`${styles.chip} ${pct === p ? styles.chipActive : ''}`}
                onClick={() => setPct(p)}
              >{p}%</button>
            ))}
          </div>
          <div className={styles.simValue}>
            <span className={styles.simPct}>{pct}%</span>
            <span className={styles.simMonto} style={{ color: excede ? '#ef4444' : 'var(--kairos-purple-400, #a78bfa)' }}>
              = ${formatMoney(Math.round(simMonto))}/mes
            </span>
          </div>
        </div>
        <input
          className={styles.slider}
          type="range" min="1" max="60" step="1"
          value={pct}
          onChange={e => setPct(parseInt(e.target.value))}
        />
        <div className={styles.simMeta}>
          {excede ? (
            <span className={styles.simWarn}>
              <i className="ti ti-alert-triangle" /> Supera tu margen libre (${fmtK(margen)}/mes después de gastos fijos)
            </span>
          ) : (
            <span>
              Deja ${fmtK(margen - simMonto)} libres al mes · en 12 meses acumulas <strong>${fmtK(simMonto * 12)}</strong>,
              en 24 <strong>${fmtK(simMonto * 24)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* ── Distribución del salario ───────────────────────────── */}
      <div className={styles.distWrap}>
        <span className={styles.distTitle}>Cómo se reparte tu salario</span>
        <div className={styles.distBar}>
          {[
            { label: 'Gastos fijos', val: Math.min(gastosFijos, salario), color: '#ef4444' },
            { label: 'Ahorro en metas', val: Math.min(comprometido, Math.max(0, salario - gastosFijos)), color: '#8b5cf6' },
            { label: 'Libre', val: libre, color: '#16a34a' },
          ].filter(s => s.val > 0).map(s => (
            <div
              key={s.label}
              className={styles.distSeg}
              style={{ width: `${(s.val / salario) * 100}%`, background: s.color }}
              title={`${s.label}: $${formatMoney(Math.round(s.val))} (${Math.round((s.val / salario) * 100)}%)`}
            />
          ))}
        </div>
        <div className={styles.distLegend}>
          {[
            { label: 'Gastos fijos', val: gastosFijos, color: '#ef4444' },
            { label: 'Ahorro en metas', val: comprometido, color: '#8b5cf6' },
            { label: 'Libre', val: libre, color: '#16a34a' },
          ].map(s => (
            <span key={s.label} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: s.color }} />
              {s.label} · <strong>${fmtK(s.val)}</strong> ({salario > 0 ? Math.round((s.val / salario) * 100) : 0}%)
            </span>
          ))}
        </div>
      </div>

      {/* ── Metas por porcentaje ───────────────────────────────── */}
      {metasPct.length > 0 && (
        <div className={styles.metas}>
          {metasPct.map((g, i) => {
            const res  = calcMeta(g)
            const prog = Math.min(100, res.progresoPct || 0)
            const done = prog >= 100
            const color = SERIE_COLORS[i % SERIE_COLORS.length]
            return (
              <div key={`${g.nombre}-${i}`} className={styles.meta}>
                <div className={styles.metaTop}>
                  <span className={styles.metaDot} style={{ background: color }} />
                  <span className={styles.metaNombre}>{g.nombre}</span>
                  <span className={styles.metaPct}>{g.porcentaje}% del salario</span>
                  <div className={styles.metaActions}>
                    <button className={styles.iconBtn} onClick={() => openEdit(g)} title="Editar">
                      <i className="ti ti-pencil" />
                    </button>
                    <button className={styles.iconBtn} onClick={() => remove(g)} title="Eliminar">
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>
                <div className={styles.metaBarWrap}>
                  <div className={styles.metaBar} style={{ width: `${prog}%`, background: done ? '#16a34a' : color }} />
                </div>
                <div className={styles.metaInfo}>
                  <span>${fmtK(g.balanceActual || 0)} / ${fmtK(g.objetivo)}</span>
                  <span>${fmtK(g.ahorroMensual)}/mes</span>
                  <span className={styles.metaEta}>
                    {done ? '🎉 alcanzada' : `→ ${MESES_NOMBRE[res.fechaEstimada.getMonth()]} ${res.fechaEstimada.getFullYear()}`}
                  </span>
                </div>
              </div>
            )
          })}
          {metasPct.length > SERIE_COLORS.length && (
            <p className={styles.metaOverflow}>
              El gráfico muestra las primeras {SERIE_COLORS.length} metas.
            </p>
          )}
        </div>
      )}

      {/* ── Gráfico de proyección ──────────────────────────────── */}
      <div className={styles.chartWrap}>
        <span className={styles.chartTitle}>
          {chartMetas.length > 0
            ? `Proyección de tus metas (${horizon} meses)`
            : `Proyección simulada al ${pct}% (${horizon} meses)`}
        </span>
        <div className={styles.chartLegend}>
          {serieNames.map((n, i) => (
            <span key={n} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: SERIE_COLORS[i] }} />
              {n}
            </span>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--kairos-text-muted)', fontSize: 10 }}
              axisLine={false} tickLine={false}
              interval={Math.max(0, Math.floor(points.length / 8) - 1)}
            />
            <YAxis
              tick={{ fill: 'var(--kairos-text-muted)', fontSize: 10 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => `$${fmtK(v)}`}
              width={52}
            />
            <Tooltip content={<ChartTooltip />} />
            {serieNames.map((n, i) => (
              <Line
                key={n}
                type="monotone"
                dataKey={`s${i}`}
                name={n}
                stroke={SERIE_COLORS[i]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--kairos-page-bg, #06040F)' }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Formulario de meta ─────────────────────────────────── */}
      {showForm && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <form className={styles.modal} onSubmit={handleSave}>
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>{editIdx !== null ? 'Editar meta' : 'Nueva meta por porcentaje'}</span>
              <button type="button" className={styles.closeBtn} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <label className={styles.field}>
              <span>Nombre</span>
              <input
                className={styles.input}
                placeholder="ej: Fondo de emergencia"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                required
              />
            </label>

            <label className={styles.field}>
              <span>% de tu salario → <strong className={styles.fieldCalc}>
                ${formatMoney(Math.round(salario * ((parseFloat(form.porcentaje) || 0) / 100)))}/mes
              </strong></span>
              <div className={styles.pctRow}>
                <input
                  className={styles.slider}
                  type="range" min="1" max="60" step="1"
                  value={form.porcentaje}
                  onChange={e => setForm(f => ({ ...f, porcentaje: parseInt(e.target.value) }))}
                />
                <span className={styles.pctVal}>{form.porcentaje}%</span>
              </div>
            </label>

            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span>Objetivo ($)</span>
                <input
                  className={styles.input} type="number" min="1" placeholder="5000000"
                  value={form.objetivo}
                  onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))}
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Ya ahorré ($)</span>
                <input
                  className={styles.input} type="number" min="0" placeholder="0"
                  value={form.balanceActual}
                  onChange={e => setForm(f => ({ ...f, balanceActual: e.target.value }))}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>Tasa interés mensual (%, opcional — CDT, cuenta remunerada…)</span>
              <input
                className={styles.input} type="number" step="0.01" min="0" placeholder="0.8"
                value={form.tasaMensual}
                onChange={e => setForm(f => ({ ...f, tasaMensual: e.target.value }))}
              />
            </label>

            <div className={styles.formActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className={styles.saveBtn}>
                {editIdx !== null ? 'Guardar cambios' : 'Crear meta'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
