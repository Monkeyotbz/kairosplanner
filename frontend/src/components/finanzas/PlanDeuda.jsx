import { useState, useMemo } from 'react'
import { formatMoney } from '../../services/financeService'
import { detectDebts, calcPlanDeuda } from '../../services/financeAnalytics'
import styles from './PlanDeuda.module.css'

const CAPITALS_KEY  = 'kairos-debt-capitals'
const OVERRIDE_KEY  = 'kairos-debt-overrides'

function loadCapitals()  { try { return JSON.parse(localStorage.getItem(CAPITALS_KEY) || '{}') } catch { return {} } }
function loadOverrides() { try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}') } catch { return {} } }

const MESES_LABEL = ['', 'Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fechaEn(meses) {
  const d = new Date()
  d.setMonth(d.getMonth() + meses)
  return `${MESES_LABEL[d.getMonth() + 1]} ${d.getFullYear()}`
}

export default function PlanDeuda({ transacciones, recurrencias, ingresos = 0 }) {
  const [capitals, setCapitals] = useState(loadCapitals)
  const [extraMensual, setExtraMensual] = useState(() => {
    const v = localStorage.getItem('kairos-plan-extra')
    return v ? parseFloat(v) : 0
  })
  const [metodo, setMetodo] = useState('avalancha')
  const [editExtra, setEditExtra] = useState(false)

  const overrides = loadOverrides()
  const detected  = useMemo(() => detectDebts(transacciones, recurrencias, overrides), [transacciones, recurrencias, overrides])

  const deudas = detected
    .filter(d => d.tipo !== 'productiva')
    .map(d => ({
      ...d,
      capital: parseFloat(capitals[d.id] || d.monto) || 0,
      pagoMinimo: d.fuente === 'recurrencia' ? d.monto : 0,
    }))

  const plan = useMemo(() => calcPlanDeuda(deudas, extraMensual), [deudas, extraMensual])
  const lista = metodo === 'avalancha' ? plan.avalancha : plan.bolaNieve
  const meses = metodo === 'avalancha' ? plan.mesesAvalancha : plan.mesesBolaNieve

  function setCapital(id, val) {
    const next = { ...capitals, [id]: val }
    setCapitals(next)
    localStorage.setItem(CAPITALS_KEY, JSON.stringify(next))
  }

  function saveExtra(val) {
    const n = parseFloat(val) || 0
    setExtraMensual(n)
    localStorage.setItem('kairos-plan-extra', String(n))
    setEditExtra(false)
  }

  if (detected.filter(d => d.tipo !== 'productiva').length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.heading}><i className="ti ti-mountain" /> Plan de eliminación de deuda</h2>
        <div className={styles.empty}>
          <i className="ti ti-circle-check" style={{ color: '#22c55e', fontSize: 28 }} />
          <p>No se detectaron deudas elegibles para el plan.</p>
          <p className={styles.emptyHint}>Las deudas productivas (herramientas, cursos) se excluyen automáticamente.</p>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}><i className="ti ti-mountain" /> Plan de eliminación de deuda</h2>

      {/* Control de pago extra */}
      <div className={styles.extraRow}>
        <span className={styles.extraLabel}>Pago extra disponible / mes:</span>
        {editExtra ? (
          <input
            className={styles.extraInput}
            type="number"
            defaultValue={extraMensual || ''}
            placeholder="ej: 700000"
            autoFocus
            onBlur={e => saveExtra(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveExtra(e.target.value)}
          />
        ) : (
          <button className={styles.extraBtn} onClick={() => setEditExtra(true)}>
            ${formatMoney(extraMensual)}
            <i className="ti ti-pencil" style={{ fontSize: 11, opacity: 0.5, marginLeft: 4 }} />
          </button>
        )}
      </div>

      {/* Selector de método */}
      <div className={styles.metodos}>
        <button
          className={`${styles.metodoBtn} ${metodo === 'avalancha' ? styles.metodoActive : ''}`}
          onClick={() => setMetodo('avalancha')}
        >
          <span className={styles.metodoIcon}>🏔️</span>
          <span className={styles.metodoName}>Avalancha</span>
          <span className={styles.metodoDesc}>Mayor interés primero · ahorra dinero</span>
          <span className={styles.metodoMeses}>{plan.mesesAvalancha}m</span>
        </button>
        <button
          className={`${styles.metodoBtn} ${metodo === 'bolaNieve' ? styles.metodoActive : ''}`}
          onClick={() => setMetodo('bolaNieve')}
        >
          <span className={styles.metodoIcon}>⛄</span>
          <span className={styles.metodoName}>Bola de nieve</span>
          <span className={styles.metodoDesc}>Menor deuda primero · más motivador</span>
          <span className={styles.metodoMeses}>{plan.mesesBolaNieve}m</span>
        </button>
      </div>

      {metodo === 'avalancha' && (
        <p className={styles.tip}>El método Avalancha minimiza el total pagado. Ideal si los préstamos tienen interés.</p>
      )}
      {metodo === 'bolaNieve' && (
        <p className={styles.tip}>La Bola de Nieve da victorias rápidas. Ideal si necesitas motivación continua.</p>
      )}

      {/* Lista de deudas */}
      <div className={styles.deudas}>
        {(metodo === 'avalancha' ? plan.avalancha : plan.bolaNieve).length === 0
          ? (
            <div className={styles.noExtra}>
              <i className="ti ti-info-circle" />
              Define un pago extra mensual para ver cuándo quedarías libre de deuda.
            </div>
          )
          : lista.map((d, i) => {
            const pct = d.capital > 0 ? Math.max(0, Math.min(100, ((d.capital - d.restante) / d.capital) * 100)) : 0
            const libre = d.restante <= 0
            return (
              <div key={d.id} className={`${styles.deudaItem} ${libre ? styles.libre : ''}`}>
                <div className={styles.deudaOrder}>{i + 1}</div>
                <div className={styles.deudaInfo}>
                  <div className={styles.deudaTop}>
                    <span className={styles.deudaConcepto}>{d.concepto}</span>
                    {libre && <span className={styles.tagLibre}>✓ Liquidada</span>}
                    {!libre && d.liquidadaEnMes && (
                      <span className={styles.tagFecha}>~ {fechaEn(d.liquidadaEnMes)}</span>
                    )}
                  </div>
                  <div className={styles.deudaCapRow}>
                    <span className={styles.deudaCapLabel}>Capital:</span>
                    <button
                      className={styles.deudaCapVal}
                      onClick={() => {
                        const v = prompt(`Capital total de "${d.concepto}":`, String(d.capital))
                        if (v !== null) setCapital(d.id, v)
                      }}
                      title="Editar capital"
                    >
                      ${formatMoney(d.capital)}
                      <i className="ti ti-pencil" style={{ fontSize: 10, opacity: 0.4, marginLeft: 3 }} />
                    </button>
                  </div>
                  <div className={styles.barWrap}>
                    <div className={styles.bar} style={{ width: `${pct}%`, background: libre ? '#22c55e' : '#a78bfa' }} />
                  </div>
                </div>
              </div>
            )
          })
        }
      </div>

      {meses > 0 && (
        <div className={styles.resumen}>
          <i className="ti ti-flag-3" />
          Con este plan quedarías libre de deuda en <strong>{meses} mes{meses !== 1 ? 'es' : ''}</strong>
          {' '}({fechaEn(meses)}).
        </div>
      )}
    </section>
  )
}
