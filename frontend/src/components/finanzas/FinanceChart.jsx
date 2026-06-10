import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoney } from '../../services/financeService'
import styles from './FinanceChart.module.css'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipName}>{payload[0].name}</p>
      <p className={styles.tooltipValue}>${formatMoney(payload[0].value)}</p>
    </div>
  )
}

export default function FinanceChart({ data }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Gastos por categoría</h3>

      {!data.length
        ? <p className={styles.empty}>Sin gastos este mes</p>
        : (
          <div className={styles.inner}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} stroke="none">
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <ul className={styles.legend}>
              {data.map((entry, i) => (
                <li key={i} className={styles.legendItem}>
                  <span className={styles.dot} style={{ background: entry.color }} />
                  <span className={styles.legendName}>{entry.name}</span>
                  <span className={styles.legendVal}>${formatMoney(entry.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      }
    </div>
  )
}
