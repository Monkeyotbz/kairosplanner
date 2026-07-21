import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { formatMoney } from '../../services/financeService'
import { detectDebts, calcPatrimonioNeto, proyectarPatrimonio } from '../../services/financeAnalytics'
import styles from './PatrimonioNeto.module.css'
import { IconAlertTriangle, IconChartLine, IconInfoCircle, IconPencil } from '@tabler/icons-react'

const BALANCE_KEY  = 'kairos-cashflow-saldo'
const CAPITALS_KEY = 'kairos-debt-capitals'
const ACTIVOS_KEY  = 'kairos-assets-total'
const OVERRIDE_KEY = 'kairos-debt-overrides'

function loadCapitals()  { try { return JSON.parse(localStorage.getItem(CAPITALS_KEY) || '{}') } catch { return {} } }
function loadOverrides() { try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}') } catch { return {} } }

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { fecha, patrimonio } = payload[0].payload
  const isNeg = patrimonio < 0
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipFecha}>{fecha}</span>
      <span className={`${styles.tooltipVal} ${isNeg ? styles.neg : styles.pos}`}>
        {isNeg ? '-' : '+'}${formatMoney(Math.abs(patrimonio))}
      </span>
    </div>
  )
}

export default function PatrimonioNeto({ transacciones, recurrencias, ahorroMensual = 0 }) {
  const balance  = parseFloat(localStorage.getItem(BALANCE_KEY) || '0')
  const capitals = loadCapitals()
  const overrides = loadOverrides()

  const [activosRaw, setActivosRaw] = useState(() => localStorage.getItem(ACTIVOS_KEY) || '0')
  const [editActivos, setEditActivos] = useState(false)
  const activos = parseFloat(activosRaw) || 0

  const deudas = useMemo(() => {
    const detected = detectDebts(transacciones, recurrencias, overrides)
    return detected.map(d => ({
      ...d,
      capital: parseFloat(capitals[d.id] || d.monto) || 0,
    }))
  }, [transacciones, recurrencias])

  const { patrimonio, totalDeudas } = calcPatrimonioNeto(balance, deudas, activos)
  const isNeg = patrimonio < 0

  const puntos = useMemo(
    () => proyectarPatrimonio(patrimonio, ahorroMensual, 24),
    [patrimonio, ahorroMensual]
  )

  const cerosEnMes = puntos.findIndex(p => p.patrimonio >= 0)
  const ceroFecha  = cerosEnMes > 0 ? puntos[cerosEnMes]?.fecha : null

  function saveActivos(val) {
    localStorage.setItem(ACTIVOS_KEY, val)
    setActivosRaw(val)
    setEditActivos(false)
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}><IconChartLine size="1em" /> Patrimonio neto</h2>

      {/* KPIs */}
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Saldo en cuenta</span>
          <span className={styles.kpiVal}>${formatMoney(balance)}</span>
        </div>
        <span className={styles.op}>+</span>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>
            Otros activos
            <button className={styles.editBtn} onClick={() => setEditActivos(true)} title="Editar">
              <IconPencil size="1em" />
            </button>
          </span>
          {editActivos ? (
            <input
              className={styles.editInput}
              type="number"
              defaultValue={activosRaw}
              autoFocus
              onBlur={e => saveActivos(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveActivos(e.target.value)}
            />
          ) : (
            <span className={styles.kpiVal}>${formatMoney(activos)}</span>
          )}
        </div>
        <span className={styles.op}>−</span>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Total deudas</span>
          <span className={styles.kpiVal} style={{ color: '#ef4444' }}>${formatMoney(totalDeudas)}</span>
        </div>
        <span className={styles.op}>=</span>
        <div className={`${styles.kpi} ${styles.kpiResult}`}>
          <span className={styles.kpiLabel}>Patrimonio neto</span>
          <span className={`${styles.kpiValLg} ${isNeg ? styles.neg : styles.pos}`}>
            {isNeg ? '-' : '+'}${formatMoney(Math.abs(patrimonio))}
          </span>
        </div>
      </div>

      {isNeg && (
        <div className={styles.warning}>
          <IconAlertTriangle size="1em" />
          Tu patrimonio neto es negativo — tienes más deudas que activos.
          {ceroFecha && ahorroMensual > 0 && (
            <> Con tu ritmo de ahorro actual, saldrías del rojo en <strong>{ceroFecha}</strong>.</>
          )}
        </div>
      )}

      {/* Gráfica de proyección */}
      {ahorroMensual > 0 ? (
        <div className={styles.chartWrap}>
          <p className={styles.chartTitle}>Proyección a 24 meses (ahorro mensual: ${formatMoney(ahorroMensual)})</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={puntos} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="patGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fill: 'var(--kairos-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} interval={5} />
              <YAxis
                tick={{ fill: 'var(--kairos-text-muted)', fontSize: 10 }}
                tickLine={false} axisLine={false}
                tickFormatter={v => `${v < 0 ? '-' : ''}$${Math.abs(v) >= 1000000 ? `${(Math.abs(v)/1000000).toFixed(1)}M` : Math.abs(v) >= 1000 ? `${(Math.abs(v)/1000).toFixed(0)}k` : Math.abs(v)}`}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
              <ReferenceLine y={0} stroke="rgba(34,197,94,0.5)" strokeDasharray="4 3" label={{ value: 'Cero deuda', position: 'insideTopLeft', fill: '#22c55e', fontSize: 10 }} />
              <Area type="monotone" dataKey="patrimonio" stroke="#a78bfa" strokeWidth={2} fill="url(#patGrad)"
                activeDot={{ r: 4, fill: '#a78bfa', stroke: '#06040F', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className={styles.noChart}>
          <IconInfoCircle size="1em" />
          Define metas de ahorro para ver la proyección de tu patrimonio neto.
        </div>
      )}

      <p className={styles.hint}>
        Las deudas se calculan desde el <strong>Semáforo de deuda</strong>. Edita los capitales allí para mayor precisión.
      </p>
    </section>
  )
}
