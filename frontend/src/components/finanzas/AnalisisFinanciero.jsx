import { useEffect, useState, useMemo } from 'react'
import { getTransacciones, getPresupuestos, getRecurrencias, calcSummary, formatMoney } from '../../services/financeService'
import { calcHealthScore, calcDistribucion, detectDebts, calcPatrimonioNeto, fmtK, scoreColor, scoreLabel } from '../../services/financeAnalytics'
import DebtSemaphore   from './DebtSemaphore'
import PlanDeuda       from './PlanDeuda'
import MetasAhorro     from './MetasAhorro'
import PatrimonioNeto  from './PatrimonioNeto'
import styles from './AnalisisFinanciero.module.css'

const BALANCE_KEY  = 'kairos-cashflow-saldo'
const CAPITALS_KEY = 'kairos-debt-capitals'
const OVERRIDE_KEY = 'kairos-debt-overrides'

function loadCapitals()  { try { return JSON.parse(localStorage.getItem(CAPITALS_KEY) || '{}') } catch { return {} } }
function loadOverrides() { try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}') } catch { return {} } }

const DISTRIBUCION_IDEAL = { necesidades: 50, deudas: 30, ahorro: 20 }

function DistBar({ label, real, ideal, color }) {
  const ok = real <= ideal
  return (
    <div className={styles.distRow}>
      <span className={styles.distLabel}>{label}</span>
      <div className={styles.distBarWrap}>
        <div className={styles.distBarReal} style={{ width: `${Math.min(100, real)}%`, background: ok ? color : '#ef4444' }} />
        <div className={styles.distBarIdeal} style={{ left: `${ideal}%` }} />
      </div>
      <span className={`${styles.distPct} ${ok ? '' : styles.distOver}`}>{real}%</span>
      <span className={styles.distIdeal}>/ {ideal}%</span>
      {!ok && <i className="ti ti-alert-triangle" style={{ color: '#ef4444', fontSize: 12 }} />}
    </div>
  )
}

export default function AnalisisFinanciero({ year, month }) {
  const [transacciones, setTransacciones] = useState([])
  const [recurrencias, setRecurrencias]   = useState([])
  const [presupuestos, setPresupuestos]   = useState([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getTransacciones(year, month),
      getRecurrencias(),
      getPresupuestos(year, month),
    ]).then(([tx, rec, pre]) => {
      setTransacciones(tx)
      setRecurrencias(rec)
      setPresupuestos(pre)
      setLoading(false)
    })
  }, [year, month])

  const summary = useMemo(() => calcSummary(transacciones), [transacciones])
  const health  = useMemo(() => calcHealthScore(summary, recurrencias, presupuestos, transacciones), [summary, recurrencias, presupuestos, transacciones])
  const dist    = useMemo(() => calcDistribucion(summary, transacciones), [summary, transacciones])

  const balance = parseFloat(localStorage.getItem(BALANCE_KEY) || '0')
  const capitals = loadCapitals()
  const overrides = loadOverrides()
  const deudas = useMemo(() => {
    const detected = detectDebts(transacciones, recurrencias, overrides)
    return detected.map(d => ({ ...d, capital: parseFloat(capitals[d.id] || d.monto) || 0 }))
  }, [transacciones, recurrencias])

  const { patrimonio } = calcPatrimonioNeto(balance, deudas, 0)
  const ahorroMensual  = summary.ingresos - summary.gastos

  if (loading) {
    return (
      <div className={styles.loading}>
        <span className={styles.spinner} /> Cargando análisis...
      </div>
    )
  }

  const scoreCol = scoreColor(health.total)

  return (
    <div className={styles.wrap}>

      {/* ── Dashboard ejecutivo ─────────────────────────────────── */}
      <section className={styles.dashboard}>
        <h2 className={styles.dashTitle}>
          <i className="ti ti-layout-dashboard" /> Estado de mi economía
        </h2>

        <div className={styles.dashGrid}>
          {/* Score */}
          <div className={styles.dashCard} style={{ borderColor: scoreCol + '55' }}>
            <span className={styles.dashCardLabel}>Score financiero</span>
            <span className={styles.dashScore} style={{ color: scoreCol }}>{health.total}<small>/100</small></span>
            <span className={styles.dashScoreLabel} style={{ color: scoreCol }}>{scoreLabel(health.total)}</span>
          </div>

          {/* Saldo */}
          <div className={styles.dashCard}>
            <span className={styles.dashCardLabel}>Saldo en cuenta</span>
            <span className={styles.dashVal}>${fmtK(balance)}</span>
            <span className={styles.dashSub}>balance actual</span>
          </div>

          {/* Patrimonio */}
          <div className={styles.dashCard} style={{ borderColor: patrimonio < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)' }}>
            <span className={styles.dashCardLabel}>Patrimonio neto</span>
            <span className={styles.dashVal} style={{ color: patrimonio < 0 ? '#ef4444' : '#22c55e' }}>
              {patrimonio < 0 ? '-' : '+'}${fmtK(Math.abs(patrimonio))}
            </span>
            <span className={styles.dashSub}>{patrimonio < 0 ? 'en negativo' : 'activos netos'}</span>
          </div>

          {/* Ahorro del mes */}
          <div className={styles.dashCard} style={{ borderColor: ahorroMensual >= 0 ? 'rgba(167,139,250,0.3)' : 'rgba(239,68,68,0.3)' }}>
            <span className={styles.dashCardLabel}>Ahorro del mes</span>
            <span className={styles.dashVal} style={{ color: ahorroMensual >= 0 ? '#a78bfa' : '#ef4444' }}>
              {ahorroMensual >= 0 ? '+' : '-'}${fmtK(Math.abs(ahorroMensual))}
            </span>
            <span className={styles.dashSub}>ingresos − gastos</span>
          </div>
        </div>

        {/* Distribución 50/30/20 */}
        {summary.ingresos > 0 && (
          <div className={styles.dist}>
            <h3 className={styles.distTitle}>Distribución real vs ideal (50/30/20)</h3>
            <DistBar label="Necesidades" real={dist.necesidades} ideal={DISTRIBUCION_IDEAL.necesidades} color="#a78bfa" />
            <DistBar label="Deudas/metas" real={dist.deudas}      ideal={DISTRIBUCION_IDEAL.deudas}      color="#f97316" />
            <DistBar label="Ahorro"       real={dist.ahorro}       ideal={DISTRIBUCION_IDEAL.ahorro}       color="#22c55e" />
            <p className={styles.distHint}>La línea vertical muestra el ideal. Barras rojas indican categoría excedida.</p>
          </div>
        )}
      </section>

      {/* ── Semáforo de deuda ───────────────────────────────────── */}
      <DebtSemaphore transacciones={transacciones} recurrencias={recurrencias} ingresos={summary.ingresos} />

      {/* ── Plan de deuda ───────────────────────────────────────── */}
      <PlanDeuda transacciones={transacciones} recurrencias={recurrencias} ingresos={summary.ingresos} />

      {/* ── Metas de ahorro ─────────────────────────────────────── */}
      <MetasAhorro />

      {/* ── Patrimonio neto ─────────────────────────────────────── */}
      <PatrimonioNeto
        transacciones={transacciones}
        recurrencias={recurrencias}
        ahorroMensual={ahorroMensual}
      />
    </div>
  )
}
