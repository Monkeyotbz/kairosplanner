import { projectCashFlow, finDeMesActual } from './financeService'

const BALANCE_KEY = 'kairos-cashflow-saldo'

export const DEBT_KEYWORDS = ['prestamo', 'préstamo', 'deuda', 'credito', 'crédito', 'cuota', 'nu ']

const PRODUCTIVE_KW  = ['ia ', 'cursor', 'suscripción', 'suscripcion', 'herramienta', 'educacion', 'educación', 'curso', 'software', 'licencia', 'workspace', 'notion', 'figma', 'claude', 'openai']
const STRUCTURAL_KW  = ['casa', 'arriendo', 'alquiler', 'renta', 'servicio', 'mamá', 'mama', 'familia', 'agua', 'luz', 'internet', 'gas ', 'seguro', 'celular', 'gym']

function classifyDebt(name, catName) {
  const n = (name || '').toLowerCase()
  const c = (catName || '').toLowerCase()
  if (PRODUCTIVE_KW.some(k => n.includes(k) || c.includes(k)))  return 'productiva'
  if (STRUCTURAL_KW.some(k => n.includes(k) || c.includes(k)))  return 'estructural'
  return 'toxica'
}

function isDebtLike(name) {
  return DEBT_KEYWORDS.some(k => (name || '').toLowerCase().includes(k))
}

// Detecta deudas en transacciones y recurrencias, con soporte de overrides manuales
export function detectDebts(transacciones, recurrencias, overrides = {}) {
  const items = []

  transacciones.filter(t => t.tipo === 'gasto' && isDebtLike(t.concepto)).forEach(t => {
    const key = `tx-${t.id}`
    items.push({
      id: key, fuente: 'transaccion',
      concepto: t.concepto, monto: Number(t.monto),
      tipo: overrides[key] || classifyDebt(t.concepto, t.categorias_finanzas?.nombre),
    })
  })

  recurrencias.filter(r => r.tipo === 'gasto' && r.activa && isDebtLike(r.concepto)).forEach(r => {
    const key = `rec-${r.id}`
    items.push({
      id: key, fuente: 'recurrencia',
      concepto: r.concepto, monto: Number(r.monto),
      tipo: overrides[key] || classifyDebt(r.concepto, r.categorias_finanzas?.nombre),
      frecuencia: r.frecuencia,
    })
  })

  return items
}

// ── Score de Salud Financiera (0–100) ────────────────────────
export function calcHealthScore(summary, recurrencias, presupuestos, transacciones) {
  const { ingresos, gastos } = summary
  const balance = parseFloat(localStorage.getItem(BALANCE_KEY) || '0')

  // 1. Tasa de ahorro (30%)
  const tasaAhorro = ingresos > 0 ? ((ingresos - gastos) / ingresos) * 100 : 0
  const s1 = tasaAhorro < 10 ? 0 : tasaAhorro < 20 ? 50 : tasaAhorro < 30 ? 75 : 100

  // 2. Ratio deuda/ingreso (25%)
  const gastosDeuda = transacciones
    .filter(t => t.tipo === 'gasto' && isDebtLike(t.concepto))
    .reduce((s, t) => s + Number(t.monto), 0)
  const ratioDeuda = ingresos > 0 ? (gastosDeuda / ingresos) * 100 : 0
  const s2 = ratioDeuda > 50 ? 0 : ratioDeuda > 30 ? 40 : ratioDeuda > 15 ? 75 : 100

  // 3. Cobertura de emergencia (20%)
  const gastoRecMensual = recurrencias
    .filter(r => r.tipo === 'gasto' && r.activa && r.frecuencia === 'mensual')
    .reduce((s, r) => s + Number(r.monto), 0)
  const cobertura = gastoRecMensual > 0 ? balance / gastoRecMensual : 0
  const s3 = cobertura < 1 ? 20 : cobertura < 3 ? 60 : cobertura < 6 ? 90 : 100

  // 4. Cumplimiento de presupuestos (15%)
  const spentByCat = {}
  transacciones.filter(t => t.tipo === 'gasto' && t.categoria_id).forEach(t => {
    spentByCat[t.categoria_id] = (spentByCat[t.categoria_id] || 0) + Number(t.monto)
  })
  const dentroLimite = presupuestos.filter(p => (spentByCat[p.categoria_id] || 0) <= Number(p.monto_limite)).length
  const cumplimiento = presupuestos.length > 0 ? (dentroLimite / presupuestos.length) * 100 : 50
  const s4 = Math.round(cumplimiento)

  // 5. Consistencia de ingresos (10%)
  const ingresoRec = recurrencias
    .filter(r => r.tipo === 'ingreso' && r.activa && r.frecuencia === 'mensual')
    .reduce((s, r) => s + Number(r.monto), 0)
  const consistencia = ingresos > 0 ? (ingresoRec / ingresos) * 100 : 0
  const s5 = consistencia < 50 ? 40 : consistencia < 80 ? 70 : 100

  const total = Math.round(s1 * 0.30 + s2 * 0.25 + s3 * 0.20 + s4 * 0.15 + s5 * 0.10)

  return {
    total,
    indicadores: [
      {
        nombre: 'Tasa de ahorro', peso: 30, puntaje: s1,
        icono: 'ti-piggy-bank', meta: '>30% del ingreso',
        descripcion: `Ahorras el ${tasaAhorro.toFixed(1)}% de tus ingresos este mes`,
        valor: tasaAhorro, unidad: '%',
      },
      {
        nombre: 'Ratio deuda/ingreso', peso: 25, puntaje: s2,
        icono: 'ti-credit-card', meta: '<15% del ingreso',
        descripcion: `El ${ratioDeuda.toFixed(1)}% de tu ingreso va a deudas (meta: <15%)`,
        valor: ratioDeuda, unidad: '%',
      },
      {
        nombre: 'Cobertura emergencia', peso: 20, puntaje: s3,
        icono: 'ti-shield', meta: '>3 meses de gastos',
        descripcion: `Tienes ${cobertura.toFixed(1)} mes(es) de gastos en reserva`,
        valor: cobertura, unidad: 'meses',
      },
      {
        nombre: 'Presupuestos cumplidos', peso: 15, puntaje: s4,
        icono: 'ti-target', meta: '100% de categorías',
        descripcion: `${dentroLimite} de ${presupuestos.length} categorías dentro del límite`,
        valor: cumplimiento, unidad: '%',
      },
      {
        nombre: 'Consistencia ingresos', peso: 10, puntaje: s5,
        icono: 'ti-trending-up', meta: '>80% recurrente',
        descripcion: `El ${consistencia.toFixed(0)}% de tus ingresos son fijos/recurrentes`,
        valor: consistencia, unidad: '%',
      },
    ],
    _raw: { tasaAhorro, ratioDeuda, cobertura, cumplimiento, consistencia, balance, gastosDeuda, ingresos, gastos },
  }
}

// ── Alertas predictivas ───────────────────────────────────────
export function calcAlertas(summary, recurrencias, presupuestos, transacciones) {
  const alertas = []
  const { ingresos } = summary
  const balance = parseFloat(localStorage.getItem(BALANCE_KEY) || '0')

  // El mes en curso ya está materializado y descontado del balance:
  // proyectar solo eventos del mes siguiente (evita doble descuento)
  const cashFlow = projectCashFlow(recurrencias, balance, 30, finDeMesActual())

  // 1. Zona de peligro próxima (7 días)
  for (let i = 1; i <= 7; i++) {
    const pt = cashFlow[i]
    if (pt && pt.balance < 200000) {
      alertas.push({
        tipo: 'peligro', emoji: '⚠️',
        titulo: 'Zona de peligro próxima',
        mensaje: `En ${i} día(s) tu saldo proyectado llega a $${fmtK(pt.balance)}. Revisa tus recurrentes antes de esa fecha.`,
      })
      break
    }
  }

  // 2. Deuda consumiendo libertad
  const gastosDeuda = transacciones
    .filter(t => t.tipo === 'gasto' && isDebtLike(t.concepto))
    .reduce((s, t) => s + Number(t.monto), 0)
  const ratioDeuda = ingresos > 0 ? (gastosDeuda / ingresos) * 100 : 0
  if (ratioDeuda > 40) {
    alertas.push({
      tipo: 'deuda', emoji: '🔴',
      titulo: 'Deuda consumiendo tu libertad',
      mensaje: `El ${ratioDeuda.toFixed(0)}% de tu ingreso este mes fue a deudas. Lo ideal es máximo 30%. Revisa el plan de eliminación.`,
    })
  }

  // 3. Ingreso variable detectado
  const ingresoRec = recurrencias
    .filter(r => r.tipo === 'ingreso' && r.activa)
    .reduce((s, r) => s + Number(r.monto), 0)
  const extra = ingresos - ingresoRec
  if (extra > 0 && ingresoRec > 0 && extra > ingresoRec * 0.2) {
    alertas.push({
      tipo: 'oportunidad', emoji: '💡',
      titulo: 'Ingreso variable detectado',
      mensaje: `Recibiste $${fmtK(extra)} por encima de tu base recurrente. Sin un plan para ese dinero, tiende a desaparecer en gastos no planeados.`,
    })
  }

  // 4. Presupuesto fantasma
  const spentByCat = {}
  transacciones.filter(t => t.tipo === 'gasto' && t.categoria_id).forEach(t => {
    spentByCat[t.categoria_id] = (spentByCat[t.categoria_id] || 0) + Number(t.monto)
  })
  const fantasmas = presupuestos.filter(p => !spentByCat[p.categoria_id])
  if (fantasmas.length > 0) {
    const cat = fantasmas[0].categorias_finanzas?.nombre || 'una categoría'
    alertas.push({
      tipo: 'aviso', emoji: '👻',
      titulo: 'Presupuesto sin movimientos',
      mensaje: `Tu presupuesto de "${cat}" muestra $0 gastados. Puede haber gastos sin registrar en esa categoría.`,
    })
  }

  return alertas
}

// ── Plan de deuda: Avalancha vs Bola de Nieve ─────────────────
function simDeuda(lista, extraMensual) {
  const debts = lista.map(d => ({ ...d, restante: d.capital }))
  let mes = 0
  while (debts.some(d => d.restante > 0) && mes < 120) {
    mes++
    let disponible = extraMensual
    for (const d of debts) {
      if (d.restante <= 0 || disponible <= 0) continue
      const aplicado = Math.min(disponible, d.restante)
      d.restante = Math.max(0, d.restante - aplicado)
      disponible -= aplicado
      if (d.restante === 0 && !d.liquidadaEnMes) d.liquidadaEnMes = mes
    }
  }
  return { debts, meses: mes }
}

export function calcPlanDeuda(deudas, extraMensual) {
  const elegibles = deudas.filter(d => d.capital > 0)
  if (elegibles.length === 0) return { avalancha: [], bolaNieve: [], mesesAvalancha: 0, mesesBolaNieve: 0 }

  const ordenAvalanche = [...elegibles].sort((a, b) => {
    const p = { toxica: 3, estructural: 2, productiva: 1 }
    return (p[b.tipo] || 0) - (p[a.tipo] || 0)
  })
  const ra = simDeuda(ordenAvalanche, extraMensual)

  const ordenBola = [...elegibles].sort((a, b) => a.capital - b.capital)
  const rb = simDeuda(ordenBola, extraMensual)

  return { avalancha: ra.debts, bolaNieve: rb.debts, mesesAvalancha: ra.meses, mesesBolaNieve: rb.meses }
}

// ── Metas de ahorro con interés compuesto ────────────────────
export function calcMeta({ objetivo, ahorroMensual, tasaMensual = 0, balanceActual = 0 }) {
  const pendiente = Math.max(0, objetivo - balanceActual)
  if (pendiente === 0 || ahorroMensual <= 0) return { meses: 0, fechaEstimada: new Date() }

  let meses
  const r = tasaMensual / 100
  if (r > 0) {
    meses = Math.log(1 + (pendiente * r) / ahorroMensual) / Math.log(1 + r)
  } else {
    meses = pendiente / ahorroMensual
  }
  meses = Math.ceil(meses)

  const fecha = new Date()
  fecha.setMonth(fecha.getMonth() + meses)
  return { meses, fechaEstimada: fecha, progresoPct: Math.min(100, Math.round((balanceActual / objetivo) * 100)) }
}

// ── Patrimonio neto ───────────────────────────────────────────
export function calcPatrimonioNeto(balance, deudas, activos = 0) {
  const totalDeudas = deudas.reduce((s, d) => s + (d.capital || 0), 0)
  return { patrimonio: balance + activos - totalDeudas, totalDeudas, activos, balance }
}

export function proyectarPatrimonio(patrimonioActual, ahorroMensual, meses = 24) {
  const puntos = []
  let pat = patrimonioActual
  const hoy = new Date()
  for (let i = 0; i <= meses; i++) {
    const f = new Date(hoy)
    f.setMonth(hoy.getMonth() + i)
    puntos.push({ mes: i, fecha: f.toISOString().slice(0, 7), patrimonio: Math.round(pat) })
    pat += ahorroMensual
  }
  return puntos
}

// ── Distribución 50/30/20 ─────────────────────────────────────
export function calcDistribucion(summary, transacciones) {
  const { ingresos, gastos } = summary
  if (ingresos === 0) return { necesidades: 0, deudas: 0, ahorro: 0 }

  const gastosDeuda = transacciones
    .filter(t => t.tipo === 'gasto' && isDebtLike(t.concepto))
    .reduce((s, t) => s + Number(t.monto), 0)
  const gastosBase = gastos - gastosDeuda
  const ahorro = Math.max(0, ingresos - gastos)

  return {
    necesidades: Math.round((gastosBase / ingresos) * 100),
    deudas:      Math.round((gastosDeuda / ingresos) * 100),
    ahorro:      Math.round((ahorro / ingresos) * 100),
    necesidadesAbs: gastosBase,
    deudasAbs:      gastosDeuda,
    ahorroAbs:      ahorro,
  }
}

// ── Helpers ───────────────────────────────────────────────────
export function fmtK(n) {
  const abs = Math.abs(n)
  if (abs >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (abs >= 1000)    return `${(n / 1000).toFixed(0)}k`
  return String(Math.round(n))
}

export function scoreColor(score) {
  if (score < 40) return '#ef4444'
  if (score < 60) return '#f97316'
  if (score < 75) return '#eab308'
  return '#22c55e'
}

export function scoreLabel(score) {
  if (score < 40) return 'Crítico'
  if (score < 60) return 'En riesgo'
  if (score < 75) return 'Estable'
  return 'Saludable'
}
