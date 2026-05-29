import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import styles from './MonthlyChart.module.css'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      <p className={styles.tooltipValue}>{payload[0].value}h</p>
      <p className={styles.tooltipSub}>{payload[0].payload.sesiones} sesiones</p>
    </div>
  )
}

export default function MonthlyChart({ data }) {
  const max = Math.max(...data.map(d => d.horas), 1)
  const currentMonth = new Date().toLocaleDateString('es', { month: 'short' })

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Horas de enfoque por mes</h3>
      {data.every(d => d.horas === 0)
        ? <p className={styles.empty}>Aún no hay sesiones completadas. ¡Arranca tu primer Pomodoro!</p>
        : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barSize={28} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--kairos-text-muted)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--kairos-text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}h`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="horas" radius={[6, 6, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={entry.label === currentMonth ? '#534AB7' : 'rgba(127,119,221,0.35)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }
    </div>
  )
}
