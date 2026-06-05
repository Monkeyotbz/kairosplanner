import { supabase } from './supabase'

export async function getMySessions() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('sesiones_enfoque')
    .select('id, inicio, fin, segundos_reales, tipo, estado, duracion_plan_min, proyecto_id, proyectos(nombre)')
    .eq('usuario_id', user.id)
    .eq('estado', 'completada')
    .order('inicio', { ascending: false })
  return data || []
}

// ── Helpers de procesamiento ─────────────────────────────────

export function getMonthlyData(sessions) {
  const months = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es', { month: 'short' })
    months[key] = { key, label, horas: 0, sesiones: 0 }
  }
  sessions.forEach(s => {
    if (!s.segundos_reales) return
    const d = new Date(s.inicio)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (months[key]) {
      months[key].horas += s.segundos_reales / 3600
      months[key].sesiones += 1
    }
  })
  return Object.values(months).map(m => ({ ...m, horas: parseFloat(m.horas.toFixed(1)) }))
}

export function getProjectData(sessions) {
  const projects = {}
  sessions.forEach(s => {
    if (!s.segundos_reales) return
    const name = s.proyectos?.nombre || 'Sin proyecto'
    if (!projects[name]) projects[name] = { name, horas: 0, sesiones: 0 }
    projects[name].horas += s.segundos_reales / 3600
    projects[name].sesiones += 1
  })
  return Object.values(projects)
    .sort((a, b) => b.horas - a.horas)
    .map(p => ({ ...p, horas: parseFloat(p.horas.toFixed(1)) }))
}

// Segundos de enfoque acumulados por hora del día (0..23)
export function getHourlyFocus(sessions) {
  const hours = new Array(24).fill(0)
  sessions.forEach(s => {
    if (!s.segundos_reales) return
    const h = new Date(s.inicio).getHours()
    hours[h] += s.segundos_reales
  })
  return hours
}

export function getThisMonthStats(sessions) {
  const now = new Date()
  const thisMonth = sessions.filter(s => {
    const d = new Date(s.inicio)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalSeconds = thisMonth.reduce((sum, s) => sum + (s.segundos_reales || 0), 0)
  const avgSeconds = thisMonth.length ? Math.round(totalSeconds / thisMonth.length) : 0

  const diasActivos = new Set(
    thisMonth.map(s => new Date(s.inicio).toDateString())
  ).size

  return {
    totalHoras: parseFloat((totalSeconds / 3600).toFixed(1)),
    sesiones: thisMonth.length,
    promedioMin: Math.round(avgSeconds / 60),
    diasActivos,
  }
}
