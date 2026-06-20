import { useState, useMemo } from 'react'
import { formatMoney } from '../../services/financeService'
import { detectDebts, fmtK } from '../../services/financeAnalytics'
import styles from './DebtSemaphore.module.css'

const TIPO_CONFIG = {
  toxica:     { label: '🔴 Deuda tóxica',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  hint: 'Eliminar primero. Posible costo de interés alto.' },
  estructural:{ label: '🟡 Deuda estructural',   color: '#eab308', bg: 'rgba(234,179,8,0.1)',   hint: 'Obligación ineludible o con fecha de fin. Administrar.' },
  productiva: { label: '🟢 Inversión productiva', color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  hint: 'Genera retorno directo. Justificado mientras produzca ingreso.' },
}

const OVERRIDE_KEY = 'kairos-debt-overrides'

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}') } catch { return {} }
}

export default function DebtSemaphore({ transacciones, recurrencias, ingresos = 0 }) {
  const [overrides, setOverrides] = useState(loadOverrides)

  const debts = useMemo(
    () => detectDebts(transacciones, recurrencias, overrides),
    [transacciones, recurrencias, overrides]
  )

  function reclassify(id, tipo) {
    const next = { ...overrides, [id]: tipo }
    setOverrides(next)
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next))
  }

  const totals = { toxica: 0, estructural: 0, productiva: 0 }
  debts.forEach(d => { totals[d.tipo] = (totals[d.tipo] || 0) + d.monto })
  const totalDeuda = Object.values(totals).reduce((s, v) => s + v, 0)
  const libre = Math.max(0, ingresos - totalDeuda)

  if (debts.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.heading}><i className="ti ti-traffic-lights" /> Semáforo de deuda</h2>
        <div className={styles.empty}>
          <i className="ti ti-circle-check" style={{ color: '#22c55e', fontSize: 28 }} />
          <p>No se detectaron deudas este mes. ¡Excelente!</p>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}><i className="ti ti-traffic-lights" /> Semáforo de deuda</h2>

      {/* Resumen */}
      <div className={styles.resumen}>
        {Object.entries(totals).map(([tipo, val]) => {
          if (val === 0) return null
          const cfg = TIPO_CONFIG[tipo]
          return (
            <div key={tipo} className={styles.resumenRow} style={{ borderColor: cfg.color }}>
              <span className={styles.resumenLabel}>{cfg.label}</span>
              <span className={styles.resumenMonto} style={{ color: cfg.color }}>${fmtK(val)}</span>
              {ingresos > 0 && (
                <span className={styles.resumenPct}>{Math.round((val / ingresos) * 100)}%</span>
              )}
            </div>
          )
        })}
        {libre > 0 && (
          <div className={styles.resumenRow} style={{ borderColor: 'rgba(83,74,183,0.5)' }}>
            <span className={styles.resumenLabel}>💜 Capacidad libre</span>
            <span className={styles.resumenMonto} style={{ color: '#a78bfa' }}>${fmtK(libre)}</span>
            {ingresos > 0 && (
              <span className={styles.resumenPct}>{Math.round((libre / ingresos) * 100)}%</span>
            )}
          </div>
        )}
      </div>

      {/* Detalle por ítem */}
      <div className={styles.items}>
        {debts.map(d => {
          const cfg = TIPO_CONFIG[d.tipo]
          return (
            <div key={d.id} className={styles.item} style={{ background: cfg.bg, borderColor: cfg.color + '44' }}>
              <div className={styles.itemLeft}>
                <span className={styles.itemConcepto}>{d.concepto}</span>
                <span className={styles.itemHint}>{cfg.hint}</span>
              </div>
              <span className={styles.itemMonto} style={{ color: cfg.color }}>
                -${formatMoney(d.monto)}
                {d.fuente === 'recurrencia' && <small className={styles.badge}>/mes</small>}
              </span>
              <div className={styles.clasificar}>
                {Object.keys(TIPO_CONFIG).map(t => (
                  <button
                    key={t}
                    className={`${styles.chip} ${d.tipo === t ? styles.chipActive : ''}`}
                    style={d.tipo === t ? { borderColor: TIPO_CONFIG[t].color, color: TIPO_CONFIG[t].color } : {}}
                    onClick={() => reclassify(d.id, t)}
                    title={TIPO_CONFIG[t].label}
                  >
                    {t === 'toxica' ? '🔴' : t === 'estructural' ? '🟡' : '🟢'}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p className={styles.hint}>Toca los emojis para reclasificar manualmente.</p>
    </section>
  )
}
