import { supabase } from './supabase'

// ── Helpers ──────────────────────────────────────────────────
async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user.id
}

export function formatMoney(amount) {
  return new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

// Rango [primer día del mes, primer día del mes siguiente) — seguro para
// meses de 28/29/30 días (evita fechas inválidas como 2026-06-31).
function monthRange(year, month) {
  const from      = `${year}-${String(month).padStart(2, '0')}-01`
  const nextYear  = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const toExcl    = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
  return { from, toExcl }
}

// ── Categorías ───────────────────────────────────────────────
export async function getCategorias() {
  const userId = await getUserId()
  const { data } = await supabase
    .from('categorias_finanzas')
    .select('*')
    .or(`es_predefinida.eq.true,usuario_id.eq.${userId}`)
    .order('tipo')
    .order('nombre')
  return data || []
}

// ── Transacciones personales ─────────────────────────────────
export async function getTransacciones(year, month) {
  const userId = await getUserId()
  const { from, toExcl } = monthRange(year, month)
  const { data } = await supabase
    .from('transacciones')
    .select('*, categorias_finanzas(nombre, color, icono)')
    .eq('usuario_id', userId)
    .gte('fecha', from)
    .lt('fecha', toExcl)
    .order('fecha', { ascending: false })
  return data || []
}

export async function addTransaccion({ concepto, monto, tipo, categoria_id, fecha }) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('transacciones')
    .insert({ usuario_id: userId, concepto, monto, tipo, categoria_id, fecha })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTransaccion(id) {
  const { error } = await supabase.from('transacciones').delete().eq('id', id)
  if (error) throw error
}

// ── Presupuestos (Zero-Based Budgeting) — por mes con herencia ─
// Devuelve, para cada categoría, el presupuesto EFECTIVO del mes:
// el valor propio del mes, o el del mes anterior más reciente
// (heredado). Marca `heredado: true` cuando no es propio del mes.
export async function getPresupuestos(year, month) {
  const userId = await getUserId()
  const { data } = await supabase
    .from('presupuestos')
    .select('*, categorias_finanzas(nombre, color, icono)')
    .eq('usuario_id', userId)

  const target = year * 12 + month
  const byCat = {}
  for (const r of data || []) {
    const ord = r.anio * 12 + r.mes
    if (ord > target) continue // definido en un mes futuro → no aplica aún
    const cur = byCat[r.categoria_id]
    if (!cur || ord > (cur.anio * 12 + cur.mes)) byCat[r.categoria_id] = r
  }
  return Object.values(byCat).map(r => ({
    ...r,
    heredado: !(r.anio === year && r.mes === month),
  }))
}

// Upsert del valor para UN mes concreto (crea override de ese mes)
export async function setPresupuesto({ categoria_id, monto_limite, anio, mes }) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('presupuestos')
    .upsert(
      { usuario_id: userId, categoria_id, monto_limite, anio, mes },
      { onConflict: 'usuario_id,categoria_id,anio,mes' }
    )
    .select('*, categorias_finanzas(nombre, color, icono)')
    .single()
  if (error) throw error
  return data
}

// Eliminar = quita la categoría del presupuesto por completo (todos los meses)
export async function deletePresupuestoCategoria(categoria_id) {
  const userId = await getUserId()
  const { error } = await supabase
    .from('presupuestos')
    .delete()
    .eq('usuario_id', userId)
    .eq('categoria_id', categoria_id)
  if (error) throw error
}

// Estado de un presupuesto. 'ok' (<75%), 'warn' (75-99%), 'over' (>=100%)
export function budgetState(gastado, limite) {
  const pct    = limite > 0 ? (gastado / limite) * 100 : 0
  const estado = pct >= 100 ? 'over' : pct >= 75 ? 'warn' : 'ok'
  return { pct, estado, restante: limite - gastado }
}

// Cruza presupuestos con los gastos del mes para calcular progreso.
export function calcBudgetProgress(presupuestos, transacciones) {
  const spentByCat = {}
  transacciones
    .filter(t => t.tipo === 'gasto' && t.categoria_id)
    .forEach(t => {
      spentByCat[t.categoria_id] = (spentByCat[t.categoria_id] || 0) + Number(t.monto)
    })

  return presupuestos
    .map(p => {
      const limite  = Number(p.monto_limite)
      const gastado = spentByCat[p.categoria_id] || 0
      return { ...p, limite, gastado, ...budgetState(gastado, limite) }
    })
    .sort((a, b) => b.pct - a.pct)
}

// ── Tope de costos por proyecto — por mes con herencia ───────
export async function getPresupuestoProyecto(proyectoId, year, month) {
  const { data } = await supabase
    .from('presupuestos_proyecto')
    .select('*')
    .eq('proyecto_id', proyectoId)

  const target = year * 12 + month
  let efectivo = null
  for (const r of data || []) {
    const ord = r.anio * 12 + r.mes
    if (ord > target) continue
    if (!efectivo || ord > (efectivo.anio * 12 + efectivo.mes)) efectivo = r
  }
  if (!efectivo) return null
  return { ...efectivo, heredado: !(efectivo.anio === year && efectivo.mes === month) }
}

export async function setPresupuestoProyecto({ proyecto_id, monto_limite, anio, mes }) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('presupuestos_proyecto')
    .upsert({ proyecto_id, usuario_id: userId, monto_limite, anio, mes }, { onConflict: 'proyecto_id,anio,mes' })
    .select()
    .single()
  if (error) throw error
  return data
}

// Eliminar = quita el tope del proyecto por completo (todos los meses)
export async function deletePresupuestoProyecto(proyectoId) {
  const { error } = await supabase.from('presupuestos_proyecto').delete().eq('proyecto_id', proyectoId)
  if (error) throw error
}

// ── Tiempo = Dinero: ROI del proyecto ────────────────────────
// Cruza las horas de Modo Enfoque (sesiones completadas) con los
// ingresos/costos del proyecto para calcular la tarifa real $/hora.
// Acumulado (all-time), no mensual: así refleja la rentabilidad real.
export async function getProyectoROI(proyectoId) {
  // Horas de enfoque completadas
  const { data: sesiones } = await supabase
    .from('sesiones_enfoque')
    .select('segundos_reales')
    .eq('proyecto_id', proyectoId)
    .eq('estado', 'completada')
  const segundos = (sesiones || []).reduce((s, x) => s + (x.segundos_reales || 0), 0)
  const horas    = segundos / 3600

  // Ingresos y costos del proyecto (acumulado)
  const { data: fin } = await supabase
    .from('finanzas_proyecto')
    .select('monto, tipo')
    .eq('proyecto_id', proyectoId)
  const ingreso = (fin || []).filter(f => f.tipo === 'ingreso').reduce((s, f) => s + Number(f.monto), 0)
  const costo   = (fin || []).filter(f => f.tipo === 'costo').reduce((s, f) => s + Number(f.monto), 0)

  const ganancia        = ingreso - costo
  const tarifaReal      = horas > 0 ? ingreso / horas : 0   // $/hora bruto
  const gananciaPorHora = horas > 0 ? ganancia / horas : 0  // $/hora neto

  return { segundos, horas, ingreso, costo, ganancia, tarifaReal, gananciaPorHora }
}

// ── Finanzas por proyecto ─────────────────────────────────────
export async function getFinanzasProyecto(proyectoId, year, month) {
  const { from, toExcl } = monthRange(year, month)
  const { data } = await supabase
    .from('finanzas_proyecto')
    .select('*')
    .eq('proyecto_id', proyectoId)
    .gte('fecha', from)
    .lt('fecha', toExcl)
    .order('fecha', { ascending: false })
  return data || []
}

export async function addFinanzaProyecto({ proyecto_id, concepto, monto, tipo, fecha }) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('finanzas_proyecto')
    .insert({ proyecto_id, usuario_id: userId, concepto, monto, tipo, fecha })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFinanzaProyecto(id) {
  const { error } = await supabase.from('finanzas_proyecto').delete().eq('id', id)
  if (error) throw error
}

// ── Cálculos ─────────────────────────────────────────────────
export function calcSummary(items, tipoIngreso = 'ingreso', tipoGasto = 'gasto') {
  const ingresos = items.filter(t => t.tipo === tipoIngreso).reduce((s, t) => s + Number(t.monto), 0)
  const gastos   = items.filter(t => t.tipo === tipoGasto).reduce((s, t) => s + Number(t.monto), 0)
  return { ingresos, gastos, balance: ingresos - gastos }
}

export function calcByCategoria(transacciones) {
  const map = {}
  transacciones
    .filter(t => t.tipo === 'gasto')
    .forEach(t => {
      const name  = t.categorias_finanzas?.nombre || 'Sin categoría'
      const color = t.categorias_finanzas?.color  || '#6b7280'
      if (!map[name]) map[name] = { name, color, value: 0 }
      map[name].value += Number(t.monto)
    })
  return Object.values(map).sort((a, b) => b.value - a.value)
}
