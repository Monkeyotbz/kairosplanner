import { useEffect, useState } from 'react'
import { getMySessions, getMonthlyData, getProjectData, getThisMonthStats } from '../services/statsService'
import StatCard from '../components/stats/StatCard'
import MonthlyChart from '../components/stats/MonthlyChart'
import ProjectChart from '../components/stats/ProjectChart'
import RecentSessions from '../components/stats/RecentSessions'
import styles from './ProductivityPage.module.css'

export default function ProductivityPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMySessions().then(data => {
      setSessions(data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className={styles.state}>
        <span className={styles.spinner} />
        Cargando estadísticas...
      </div>
    )
  }

  const monthStats  = getThisMonthStats(sessions)
  const monthlyData = getMonthlyData(sessions)
  const projectData = getProjectData(sessions)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Estadísticas</h1>
        <span className={styles.sub}>
          {new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* Tarjetas resumen */}
      <div className={styles.cards}>
        <StatCard icon="⏱" label="Horas este mes"       value={monthStats.totalHoras}  unit="h"   color="#378ADD" />
        <StatCard icon="🎯" label="Sesiones completadas" value={monthStats.sesiones}               color="#534AB7" />
        <StatCard icon="⚡" label="Promedio por sesión"  value={monthStats.promedioMin} unit="min" color="#EF9F27" />
        <StatCard icon="📅" label="Días activos"         value={monthStats.diasActivos}             color="#1D9E75" />
      </div>

      {/* Gráfica mensual */}
      <MonthlyChart data={monthlyData} />

      {/* Fila inferior */}
      <div className={styles.bottomRow}>
        <ProjectChart data={projectData} />
        <RecentSessions sessions={sessions} />
      </div>
    </div>
  )
}
