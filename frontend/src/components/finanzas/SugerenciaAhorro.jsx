import { formatMoney } from '../../services/financeService'
import { calcMeta, fmtK } from '../../services/financeAnalytics'
import styles from './SugerenciaAhorro.module.css'

const GOALS_KEY = 'kairos-savings-goals'
const MESES_NOMBRE = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// Cuántas veces al mes ocurre cada frecuencia (para normalizar montos)
const FACTOR_MENSUAL = {
  diaria:     30,
  semanal:    30 / 7,
  quincenal:  2,
  mensual:    1,
  bimestral:  1 / 2,
  trimestral: 1 / 3,
  anual:      1 / 12,
}

function loadGoals() {
  try { return JSON.parse(localStorage.getItem(GOALS_KEY) || '[]') } catch { return [] }
}

function mensualizar(items) {
  return items.reduce((s, r) => s + Number(r.monto) * (FACTOR_MENSUAL[r.frecuencia] || 1), 0)
}

export default function SugerenciaAhorro({ recurrencias, onGoToMetas }) {
  const activos        = recurrencias.filter(r => r.activa)
  const ingresoMensual = mensualizar(activos.filter(r => r.tipo === 'ingreso'))
  const gastoMensual   = mensualizar(activos.filter(r => r.tipo === 'gasto'))
  const capacidad      = ingresoMensual - gastoMensual
  const ideal          = ingresoMensual * 0.20
  const sugerido       = Math.max(0, Math.min(capacidad, ideal))
  const goals          = loadGoals()

  if (activos.length === 0) return null

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={styles.headTitles}>
          <h2 className={styles.heading}><i className="ti ti-piggy-bank" /> Sugerencia de ahorro</h2>
          <span className={styles.subtitle}>
            Calculada con tus ingresos y gastos recurrentes normalizados al mes
          </span>
        </div>
        <button className={styles.linkBtn} onClick={onGoToMetas}>
          Gestionar metas <i className="ti ti-arrow-right" />
        </button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Ingresos fijos / mes</span>
          <span className={styles.statVal} style={{ color: '#4ade80' }}>+${fmtK(ingresoMensual)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Gastos fijos / mes</span>
          <span className={styles.statVal} style={{ color: '#f87171' }}>-${fmtK(gastoMensual)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Margen libre / mes</span>
          <span className={styles.statVal} style={{ color: capacidad >= 0 ? '#a78bfa' : '#ef4444' }}>
            {capacidad >= 0 ? '+' : '-'}${fmtK(Math.abs(capacidad))}
          </span>
        </div>
      </div>

      {capacidad <= 0 ? (
        <div className={`${styles.tip} ${styles.tipDanger}`}>
          <i className="ti ti-alert-triangle" />
          <p>
            Tus gastos fijos superan tus ingresos fijos por <strong>${formatMoney(Math.abs(capacidad))}</strong> al mes.
            Antes de ahorrar, revisa qué recurrente puedes reducir o eliminar.
          </p>
        </div>
      ) : (
        <div className={styles.tip}>
          <i className="ti ti-bulb" />
          <p>
            Cada mes te quedan <strong>${formatMoney(capacidad)}</strong> libres después de tus fijos.
            KAIROS sugiere apartar <strong className={styles.sugerido}>${formatMoney(sugerido)}</strong> al mes
            {capacidad >= ideal
              ? ' (regla del 20% de tus ingresos).'
              : ` — para llegar al 20% ideal ($${fmtK(ideal)}) necesitas liberar $${fmtK(ideal - capacidad)} de gastos fijos.`}
          </p>
        </div>
      )}

      {goals.length === 0 ? (
        <button className={styles.ctaBtn} onClick={onGoToMetas}>
          <i className="ti ti-target" /> Crear mi primera meta de ahorro
        </button>
      ) : (
        <div className={styles.goals}>
          {goals.map((g, i) => {
            const res  = calcMeta(g)
            const pct  = Math.min(100, res.progresoPct || 0)
            const done = pct >= 100
            return (
              <div key={i} className={styles.goal}>
                <div className={styles.goalTop}>
                  <span className={styles.goalName}>{g.nombre}</span>
                  <span className={styles.goalAmounts}>
                    ${fmtK(g.balanceActual || 0)} / ${fmtK(g.objetivo)}
                  </span>
                </div>
                <div className={styles.goalBarWrap}>
                  <div
                    className={styles.goalBar}
                    style={{ width: `${pct}%`, background: done ? '#22c55e' : 'var(--kairos-purple-400, #a78bfa)' }}
                  />
                </div>
                <span className={styles.goalEta}>
                  {done
                    ? '🎉 ¡Meta alcanzada!'
                    : `→ ${MESES_NOMBRE[res.fechaEstimada.getMonth()]} ${res.fechaEstimada.getFullYear()} ahorrando $${fmtK(g.ahorroMensual)}/mes`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
