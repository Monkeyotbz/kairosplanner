import { useState, useMemo, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Dot,
} from 'recharts'
import { projectCashFlow, formatMoney } from '../../services/financeService'
import styles from './CashFlowChart.module.css'

const HORIZONS = [30, 60, 90]
const BALANCE_KEY = 'kairos-cashflow-saldo'

function fmtLabel(fecha) {
  const d = new Date(fecha + 'T00:00:00')
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function CustomDot(props) {
  const { cx, cy, payload } = props
  if (!payload.events?.length) return null
  return <circle cx={cx} cy={cy} r={4} fill="var(--kairos-purple-400)" stroke="#06040F" strokeWidth={2} />
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const balance = d.balance
  const isNeg = balance < 0
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{fmtLabel(d.fecha)}</div>
      <div className={`${styles.tooltipBalance} ${isNeg ? styles.tooltipNeg : styles.tooltipPos}`}>
        ${formatMoney(Math.abs(balance))} {isNeg ? '(negativo)' : ''}
      </div>
      {d.events.length > 0 && (
        <ul className={styles.tooltipEvents}>
          {d.events.map((ev, i) => (
            <li key={i} className={ev.tipo === 'ingreso' ? styles.evIngreso : styles.evGasto}>
              <span>{ev.tipo === 'ingreso' ? '+' : '-'}${formatMoney(ev.monto)}</span>
              <span>{ev.concepto}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function CashFlowChart({ recurrencias, currentMonthBalance = 0 }) {
  const [horizon, setHorizon] = useState(90)
  const [saldoRaw, setSaldoRaw] = useState(() => {
    const saved = localStorage.getItem(BALANCE_KEY)
    return saved !== null ? saved : String(currentMonthBalance)
  })
  const [editingSaldo, setEditingSaldo] = useState(false)

  const startBalance = parseFloat(saldoRaw) || 0

  const handleSaldoBlur = useCallback((val) => {
    const n = parseFloat(val)
    if (!isNaN(n)) {
      setSaldoRaw(String(n))
      localStorage.setItem(BALANCE_KEY, String(n))
    }
    setEditingSaldo(false)
  }, [])

  const points = useMemo(
    () => projectCashFlow(recurrencias, startBalance, horizon),
    [recurrencias, startBalance, horizon]
  )

  const minVal = Math.min(...points.map(p => p.balance))
  const maxVal = Math.max(...points.map(p => p.balance))
  const hasDip  = minVal < 0
  const finalBalance = points[points.length - 1]?.balance ?? startBalance

  // Muestro solo ~12 etiquetas en el eje X para no saturar
  const tickInterval = Math.floor(points.length / 12)

  const gradientId = 'cashGrad'

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={styles.headTitles}>
          <h2 className={styles.heading}>
            <i className="ti ti-trending-up" /> Flujo de caja
          </h2>
          <span className={styles.subtitle}>Proyección basada en tus recurrentes</span>
        </div>
        <div className={styles.controls}>
          {HORIZONS.map(h => (
            <button
              key={h}
              className={`${styles.horizonBtn} ${horizon === h ? styles.horizonActive : ''}`}
              onClick={() => setHorizon(h)}
            >{h}d</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Saldo inicial</span>
          {editingSaldo ? (
            <input
              className={styles.kpiInput}
              type="number"
              step="0.01"
              defaultValue={saldoRaw}
              autoFocus
              onBlur={e => handleSaldoBlur(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaldoBlur(e.target.value)}
            />
          ) : (
            <button className={styles.kpiVal} onClick={() => setEditingSaldo(true)} title="Editar saldo inicial">
              ${formatMoney(startBalance)}
              <i className="ti ti-pencil" style={{ fontSize: 11, marginLeft: 4, opacity: 0.5 }} />
            </button>
          )}
        </div>
        <div className={styles.kpiSep} />
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>En {horizon} días</span>
          <span className={`${styles.kpiVal} ${finalBalance >= 0 ? styles.kpiPos : styles.kpiNeg}`}>
            ${formatMoney(Math.abs(finalBalance))}
          </span>
        </div>
        <div className={styles.kpiSep} />
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Δ neto</span>
          <span className={`${styles.kpiDelta} ${finalBalance - startBalance >= 0 ? styles.kpiPos : styles.kpiNeg}`}>
            {finalBalance - startBalance >= 0 ? '+' : ''}${formatMoney(finalBalance - startBalance)}
          </span>
        </div>
        {hasDip && (
          <>
            <div className={styles.kpiSep} />
            <div className={`${styles.kpi} ${styles.kpiWarn}`}>
              <i className="ti ti-alert-triangle" />
              <span className={styles.kpiLabel}>Saldo negativo detectado</span>
            </div>
          </>
        )}
      </div>

      {/* Gráfica */}
      {recurrencias.filter(r => r.activa).length === 0 ? (
        <div className={styles.empty}>
          <i className="ti ti-chart-area-line" />
          <p>Agrega recurrentes para ver la proyección</p>
        </div>
      ) : (
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={points} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--kairos-purple-400)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--kairos-purple-400)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="fecha"
                tick={{ fill: 'var(--kairos-text-muted)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={tickInterval}
                tickFormatter={fmtLabel}
              />
              <YAxis
                tick={{ fill: 'var(--kairos-text-muted)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `$${Math.abs(v) >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
              {hasDip && <ReferenceLine y={0} stroke="rgba(248,113,113,0.45)" strokeDasharray="4 3" />}
              <ReferenceLine x={points[0]?.fecha} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3" label={{ value: 'Hoy', position: 'insideTopLeft', fill: 'var(--kairos-text-muted)', fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="var(--kairos-purple-400)"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={<CustomDot />}
                activeDot={{ r: 5, fill: 'var(--kairos-purple-400)', stroke: '#06040F', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
