import { supabase } from './supabase'

// ── Helpers ──────────────────────────────────────────────────
async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  return user.id
}

export function formatMoney(amount) {
  return new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
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
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to   = `${year}-${String(month).padStart(2, '0')}-31`
  const { data } = await supabase
    .from('transacciones')
    .select('*, categorias_finanzas(nombre, color, icono)')
    .eq('usuario_id', userId)
    .gte('fecha', from)
    .lte('fecha', to)
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

// ── Finanzas por proyecto ─────────────────────────────────────
export async function getFinanzasProyecto(proyectoId, year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to   = `${year}-${String(month).padStart(2, '0')}-31`
  const { data } = await supabase
    .from('finanzas_proyecto')
    .select('*')
    .eq('proyecto_id', proyectoId)
    .gte('fecha', from)
    .lte('fecha', to)
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
