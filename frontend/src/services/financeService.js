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

export async function createCategoria({ nombre, tipo, icono = '💰', color = '#534AB7' }) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('categorias_finanzas')
    .insert({ usuario_id: userId, nombre, tipo, icono, color, es_predefinida: false })
    .select()
    .single()
  if (error) throw error
  return data
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

export async function updateTransaccion(id, fields) {
  const { data, error } = await supabase
    .from('transacciones')
    .update(fields)
    .eq('id', id)
    .select('*, categorias_finanzas(nombre, color, icono)')
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

// ── Recurrencias (pagos / ingresos periódicos) ───────────────
export async function getRecurrencias() {
  const userId = await getUserId()
  const { data } = await supabase
    .from('recurrencias')
    .select('*, categorias_finanzas(nombre, icono, color)')
    .eq('usuario_id', userId)
    .order('creado_en')
  return data || []
}

export async function addRecurrencia(fields) {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('recurrencias')
    .insert({ ...fields, usuario_id: userId })
    .select('*, categorias_finanzas(nombre, icono, color)')
    .single()
  if (error) throw error
  return data
}

export async function updateRecurrencia(id, fields) {
  const { data, error } = await supabase
    .from('recurrencias')
    .update(fields)
    .eq('id', id)
    .select('*, categorias_finanzas(nombre, icono, color)')
    .single()
  if (error) throw error
  return data
}

export async function deleteRecurrencia(id) {
  const { error } = await supabase.from('recurrencias').delete().eq('id', id)
  if (error) throw error
}

// ── Cash-flow forecasting (función pura, sin Supabase) ────────
// Devuelve un array de 91 puntos (hoy + 90 días) con el saldo acumulado.
// Cada punto incluye `events` — lista de recurrencias que disparan ese día.

function mesOffset(inicio, date) {
  return (date.getFullYear() - inicio.getFullYear()) * 12 + (date.getMonth() - inicio.getMonth())
}

function safeDay(date, dia) {
  const ultimo = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return date.getDate() === Math.min(dia, ultimo)
}

function firesOn(r, date) {
  const inicio = new Date(r.fecha_inicio + 'T00:00:00')
  if (date < inicio) return false
  if (r.fecha_fin && date > new Date(r.fecha_fin + 'T00:00:00')) return false

  const diaRef = r.dia_del_mes || inicio.getDate()
  const diffDias = Math.round((date - inicio) / 86400000)

  switch (r.frecuencia) {
    case 'diaria':      return true
    case 'semanal':     return diffDias % 7 === 0
    case 'quincenal':   return diffDias % 14 === 0
    case 'mensual':     return safeDay(date, diaRef)
    case 'bimestral':   return mesOffset(inicio, date) % 2 === 0  && safeDay(date, diaRef)
    case 'trimestral':  return mesOffset(inicio, date) % 3 === 0  && safeDay(date, diaRef)
    case 'anual':       return date.getMonth() === inicio.getMonth() && safeDay(date, diaRef)
    default:            return false
  }
}

export function projectCashFlow(recurrencias, startBalance = 0, days = 90) {
  const points = []
  let balance = startBalance
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const active = recurrencias.filter(r => r.activa)

  for (let i = 0; i <= days; i++) {
    const date = new Date(today.getTime())
    date.setDate(today.getDate() + i)
    date.setHours(0, 0, 0, 0)

    const events = []
    active.forEach(r => {
      if (!firesOn(r, date)) return
      balance += r.tipo === 'ingreso' ? Number(r.monto) : -Number(r.monto)
      events.push({ concepto: r.concepto, monto: Number(r.monto), tipo: r.tipo })
    })

    points.push({
      fecha: date.toISOString().slice(0, 10),
      balance: Math.round(balance * 100) / 100,
      events,
    })
  }
  return points
}

// ── Materialización: recurrentes → transacciones reales ──────
// Al abrir Finanzas se inserta como transacciones el MES EN CURSO COMPLETO
// de cada recurrente activo (incluidas fechas futuras del mes: el salario
// del día 20 se ve desde el día 1, como plan del mes). Si el monto cambió,
// el movimiento se edita directamente. Borrar un movimiento auto no lo
// revive (ultima_materializacion avanza al fin de mes). Meses que nunca se
// abrieron no se backfillean.
// Requiere correr backend/database/materializacion_recurrencias.sql.

function isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isMissingColumn(error) {
  return !!error && (error.code === '42703' || error.code === 'PGRST204' ||
    /recurrencia_id|ultima_materializacion/i.test(error.message || ''))
}

export async function materializeRecurrencias() {
  try {
    const userId = await getUserId()
    const { data: recs, error: recErr } = await supabase
      .from('recurrencias')
      .select('*')
      .eq('usuario_id', userId)
      .eq('activa', true)
    if (recErr || !recs?.length) return { inserted: 0, needsSql: false }

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const finMes    = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)

    const rows = []
    for (const r of recs) {
      let desde = inicioMes
      if (r.ultima_materializacion) {
        const sig = new Date(r.ultima_materializacion + 'T00:00:00')
        sig.setDate(sig.getDate() + 1)
        if (sig > desde) desde = sig
      }
      for (let d = new Date(desde); d <= finMes; d.setDate(d.getDate() + 1)) {
        if (!firesOn(r, d)) continue
        rows.push({
          usuario_id:     userId,
          concepto:       r.concepto,
          monto:          r.monto,
          tipo:           r.tipo,
          categoria_id:   r.categoria_id,
          fecha:          isoLocal(d),
          recurrencia_id: r.id,
        })
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase
        .from('transacciones')
        .upsert(rows, { onConflict: 'recurrencia_id,fecha', ignoreDuplicates: true })
      if (error) return { inserted: 0, needsSql: isMissingColumn(error) }
    }

    const { error: updErr } = await supabase
      .from('recurrencias')
      .update({ ultima_materializacion: isoLocal(finMes) })
      .eq('usuario_id', userId)
      .eq('activa', true)
    if (updErr) return { inserted: rows.length, needsSql: isMissingColumn(updErr) }

    return { inserted: rows.length, needsSql: false }
  } catch {
    return { inserted: 0, needsSql: false }
  }
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
