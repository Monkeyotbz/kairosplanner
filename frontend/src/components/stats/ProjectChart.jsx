import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import styles from './ProjectChart.module.css'

const COLORS = ['#534AB7', '#378ADD', '#D4537E', '#1D9E75', '#EF9F27', '#D85A30', '#639922']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipName}>{payload[0].name}</p>
      <p className={styles.tooltipValue}>{payload[0].value}h</p>
      <p className={styles.tooltipSub}>{payload[0].payload.sesiones} sesiones</p>
    </div>
  )
}

function CustomLegend({ payload }) {
  return (
    <ul className={styles.legend}>
      {payload.map((entry, i) => (
        <li key={i} className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: entry.color }} />
          <span className={styles.legendName}>{entry.value}</span>
          <span className={styles.legendHours}>{entry.payload.horas}h</span>
        </li>
      ))}
    </ul>
  )
}

export default function ProjectChart({ data }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Tiempo por proyecto</h3>
      {!data.length
        ? <p className={styles.empty}>Sin datos aún</p>
        : (
          <ResponsiveContainer width="100%" height={210}>
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={data}
                dataKey="horas"
                nameKey="name"
                cx="42%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={3}
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                content={<CustomLegend />}
              />
            </PieChart>
          </ResponsiveContainer>
        )
      }
    </div>
  )
}
