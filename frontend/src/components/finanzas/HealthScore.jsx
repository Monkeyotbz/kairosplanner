import { useEffect, useState } from 'react'
import { getPresupuestos } from '../../services/financeService'
import { calcHealthScore, scoreColor, scoreLabel } from '../../services/financeAnalytics'
import styles from './HealthScore.module.css'
import { IconChevronUp, IconChevronDown, IconPigMoney, IconCreditCard, IconShield, IconTarget, IconTrendingUp } from '@tabler/icons-react'

const INDICATOR_ICONS = {
  'ti-piggy-bank': IconPigMoney,
  'ti-credit-card': IconCreditCard,
  'ti-shield': IconShield,
  'ti-target': IconTarget,
  'ti-trending-up': IconTrendingUp,
}

export default function HealthScore({ summary, recurrencias, transacciones, year, month }) {
  const [presupuestos, setPresupuestos] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    getPresupuestos(year, month).then(setPresupuestos)
  }, [year, month])

  const { total, indicadores } = calcHealthScore(summary, recurrencias, presupuestos, transacciones)
  const color = scoreColor(total)
  const label = scoreLabel(total)
  const dash = Math.PI * 2 * 52
  const offset = dash * (1 - total / 100)

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {/* Círculo de score */}
        <div className={styles.scoreWrap}>
          <svg width="130" height="130" viewBox="0 0 130 130" className={styles.ring}>
            <circle cx="65" cy="65" r="52" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
            <circle
              cx="65" cy="65" r="52" fill="none"
              stroke={color} strokeWidth="10"
              strokeDasharray={dash}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 65 65)"
              style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s' }}
            />
          </svg>
          <div className={styles.scoreCenter}>
            <span className={styles.scoreNum} style={{ color }}>{total}</span>
            <span className={styles.scoreOf}>/100</span>
            <span className={styles.scoreLabel} style={{ color }}>{label}</span>
          </div>
        </div>

        {/* Indicadores */}
        <div className={styles.indicators}>
          <h2 className={styles.title}>Score de Salud Financiera</h2>
          <ul className={styles.list}>
            {indicadores.map((ind, i) => {
              const c = scoreColor(ind.puntaje)
              const isOpen = expanded === i
              return (
                <li key={i} className={styles.item}>
                  <button className={styles.itemBtn} onClick={() => setExpanded(isOpen ? null : i)}>
                    {(() => { const Icon = INDICATOR_ICONS[ind.icono]; return Icon ? <Icon size="1em" className={styles.itemIcon} style={{ color: c }} /> : null })()}
                    <span className={styles.itemName}>{ind.nombre}</span>
                    <span className={styles.itemPeso}>×{ind.peso}%</span>
                    <div className={styles.barWrap}>
                      <div className={styles.bar} style={{ width: `${ind.puntaje}%`, background: c }} />
                    </div>
                    <span className={styles.itemPts} style={{ color: c }}>{ind.puntaje}pts</span>
                    {isOpen ? <IconChevronUp size="1em" className={styles.chevron} /> : <IconChevronDown size="1em" className={styles.chevron} />}
                  </button>
                  {isOpen && (
                    <div className={styles.detail}>
                      <p className={styles.detailDesc}>{ind.descripcion}</p>
                      <p className={styles.detailMeta}>Meta: {ind.meta}</p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
