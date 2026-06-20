import { useEffect, useState } from 'react'
import { getPresupuestos } from '../../services/financeService'
import { calcAlertas } from '../../services/financeAnalytics'
import styles from './AlertasFinancieras.module.css'

const TIPO_STYLE = {
  peligro:    { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  dot: '#ef4444' },
  deuda:      { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', dot: '#f97316' },
  oportunidad:{ bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', dot: '#22c55e' },
  aviso:      { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)', dot: '#eab308' },
}

export default function AlertasFinancieras({ summary, recurrencias, transacciones, year, month }) {
  const [presupuestos, setPresupuestos] = useState([])
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kairos-alerts-dismissed') || '[]') } catch { return [] }
  })

  useEffect(() => { getPresupuestos(year, month).then(setPresupuestos) }, [year, month])

  const todas = calcAlertas(summary, recurrencias, presupuestos, transacciones)
  const alertas = todas.filter(a => !dismissed.includes(a.titulo))

  function dismiss(titulo) {
    const next = [...dismissed, titulo]
    setDismissed(next)
    localStorage.setItem('kairos-alerts-dismissed', JSON.stringify(next))
  }

  if (alertas.length === 0) return null

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>
        <i className="ti ti-bell-ringing" /> Alertas inteligentes
        <span className={styles.badge}>{alertas.length}</span>
      </h2>
      <div className={styles.list}>
        {alertas.map((a, i) => {
          const st = TIPO_STYLE[a.tipo] || TIPO_STYLE.aviso
          return (
            <div key={i} className={styles.alert} style={{ background: st.bg, borderColor: st.border }}>
              <span className={styles.dot} style={{ background: st.dot }} />
              <div className={styles.body}>
                <span className={styles.emoji}>{a.emoji}</span>
                <div className={styles.text}>
                  <strong className={styles.titulo}>{a.titulo}</strong>
                  <p className={styles.mensaje}>{a.mensaje}</p>
                </div>
              </div>
              <button className={styles.close} onClick={() => dismiss(a.titulo)} title="Descartar">
                <i className="ti ti-x" />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
