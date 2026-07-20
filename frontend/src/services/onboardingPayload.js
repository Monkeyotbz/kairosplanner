// Orquestador del payload de El Despertar de KAIROS.
// Ejecuta los 9 pasos en orden de dependencia hacia Supabase.
// Un solo disparo al final del flujo — sin estados parciales en BD.

import { savePerfilKairos } from './perfilKairosService'
import { createCategoria, setPresupuesto } from './financeService'
import { createProjectForOnboarding, createCard, updateCard } from './boardService'

// ── Mapas de configuración ────────────────────────────────────

const FRANJA_PICO = {
  madrugador: { inicio: '06:00', fin: '10:00' },
  mañana:     { inicio: '08:00', fin: '13:00' },
  tarde:      { inicio: '14:00', fin: '19:00' },
  nocturno:   { inicio: '20:00', fin: '01:00' },
}

const DURACION_SESION = {
  sprint:   20,
  pomodoro: 30,
  flow:     50,
  deep:     90,
}

const COLUMNAS_PROYECTO = {
  trabajo:     [{ nombre: 'Backlog',    color: '#B4B2A9' }, { nombre: 'En progreso', color: '#378ADD' }, { nombre: 'En revisión', color: '#EF9F27' }, { nombre: 'Hecho',      color: '#639922' }],
  estudios:    [{ nombre: 'Backlog',    color: '#B4B2A9' }, { nombre: 'Estudiando',  color: '#378ADD' }, { nombre: 'Repasando',   color: '#EF9F27' }, { nombre: 'Dominado',   color: '#639922' }],
  negocio:     [{ nombre: 'Ideas',      color: '#B4B2A9' }, { nombre: 'En proceso',  color: '#378ADD' }, { nombre: 'Lanzado',     color: '#9b59b6' }, { nombre: 'Pausado',    color: '#95a5a6' }],
  creativo:    [{ nombre: 'Ideas',      color: '#B4B2A9' }, { nombre: 'En proceso',  color: '#e67e22' }, { nombre: 'Terminado',   color: '#639922' }, { nombre: 'Publicado',  color: '#9b59b6' }],
  personal:    [{ nombre: 'Pendiente',  color: '#B4B2A9' }, { nombre: 'En proceso',  color: '#378ADD' }, { nombre: 'Hecho',       color: '#639922' }],
  crecimiento: [{ nombre: 'Quiero',     color: '#B4B2A9' }, { nombre: 'Aprendiendo', color: '#378ADD' }, { nombre: 'Aplicando',   color: '#EF9F27' }, { nombre: 'Integrado',  color: '#639922' }],
}

const NOMBRE_PROYECTO = {
  trabajo:     'Trabajo',
  negocio:     'Mi Negocio',
  estudios:    'Estudios',
  personal:    'Proyecto Personal',
  creativo:    'Vida Creativa',
  crecimiento: 'Crecimiento',
}

const DEF_CATEGORIA_GASTO = {
  arriendo:        { nombre: 'Arriendo / Hipoteca', icono: '🏠', color: '#e74c3c' },
  alimentacion:    { nombre: 'Alimentación',         icono: '🍽️', color: '#e67e22' },
  transporte:      { nombre: 'Transporte',            icono: '🚗', color: '#3498db' },
  suscripciones:   { nombre: 'Suscripciones',         icono: '📱', color: '#9b59b6' },
  salud:           { nombre: 'Salud',                 icono: '💊', color: '#2ecc71' },
  educacion:       { nombre: 'Educación',             icono: '📚', color: '#f39c12' },
  entretenimiento: { nombre: 'Entretenimiento',       icono: '🎮', color: '#1abc9c' },
  gimnasio:        { nombre: 'Deporte / Gimnasio',    icono: '💪', color: '#27ae60' },
  deudas:          { nombre: 'Deudas / Crédito',      icono: '💳', color: '#c0392b' },
}

const DEF_CATEGORIA_INGRESO = {
  salario:   { nombre: 'Salario',         icono: '💼', color: '#27ae60' },
  freelance: { nombre: 'Freelance',        icono: '🖥️', color: '#3498db' },
  negocio:   { nombre: 'Ventas / Negocio', icono: '🚀', color: '#9b59b6' },
}

const GENERO_MAP = {
  'Lo-fi':       'lofi',
  'Jazz':        'jazz',
  'Clásica':     'clasica',
  'Piano':       'piano',
  'Ambient':     'ambient',
  'Naturaleza':  'naturaleza',
  'Synthwave':   'synthwave',
  'Electrónica': 'electronica',
}

const TASTE_KEY = 'kairos-music-taste'

// Fecha límite de tarjeta según la opción elegida
function fechaLimite(opcion) {
  const hoy = new Date()
  if (opcion === 'semana') {
    const diff = 7 - hoy.getDay()
    const fin = new Date(hoy)
    fin.setDate(hoy.getDate() + diff)
    return fin.toISOString().slice(0, 10)
  }
  if (opcion === 'mes') {
    return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10)
  }
  return null
}

// ── Payload principal ─────────────────────────────────────────

export async function ejecutarPayloadOnboarding(respuestas) {
  const now  = new Date()
  const anio = now.getFullYear()
  const mes  = now.getMonth() + 1

  // 1. UPSERT perfil_kairos
  const franja = FRANJA_PICO[respuestas.cronotipo] || FRANJA_PICO.mañana
  await savePerfilKairos({
    cronotipo:         respuestas.cronotipo,
    franja_pico:       franja,
    hora_inicio:       respuestas.hora_inicio,
    dias_descanso:     respuestas.dias_descanso || [],
    duracion_sesion:   DURACION_SESION[respuestas.ritmo] || 30,
    tipo_pausa:        respuestas.tipo_pausa,
    rango_ingreso:     respuestas.rango_ingreso || null,
    generos_musicales: (respuestas.generos || []).map(g => GENERO_MAP[g]).filter(Boolean),
    version:           2,
  })

  // 2. INSERT categorías financieras
  const categorias = {}

  const fuente = respuestas.fuente_ingreso
  if (fuente && fuente !== 'skip') {
    const keys = fuente === 'mixto' ? ['salario', 'freelance'] : [fuente]
    for (const k of keys) {
      const def = DEF_CATEGORIA_INGRESO[k]
      if (!def) continue
      try { categorias[k] = await createCategoria({ ...def, tipo: 'ingreso' }) } catch (_) {}
    }
  }

  for (const k of (respuestas.gastos_fijos || [])) {
    const def = DEF_CATEGORIA_GASTO[k]
    if (!def) continue
    try { categorias[k] = await createCategoria({ ...def, tipo: 'gasto' }) } catch (_) {}
  }

  // 3. INSERT presupuesto (primera barra activa)
  const presupCat   = respuestas.presupuesto_categoria
  const presupMonto = respuestas.presupuesto_monto
  if (presupCat && presupCat !== 'skip' && presupMonto && categorias[presupCat]?.id) {
    try {
      await setPresupuesto({ categoria_id: categorias[presupCat].id, monto_limite: presupMonto, anio, mes })
    } catch (_) {}
  }

  // 4–6. Proyectos + tableros + columnas
  let primeraColumnaId = null
  for (const contexto of (respuestas.contextos || [])) {
    const nombre = NOMBRE_PROYECTO[contexto] || 'Mi Proyecto'
    const cols   = COLUMNAS_PROYECTO[contexto] || COLUMNAS_PROYECTO.trabajo
    try {
      const { columnas } = await createProjectForOnboarding({ nombre, columnas: cols })
      if (!primeraColumnaId && columnas?.[0]?.id) primeraColumnaId = columnas[0].id
    } catch (_) {}
  }

  // 7. Primera tarjeta
  const tarea = respuestas.primera_tarea
  if (tarea?.texto?.trim() && primeraColumnaId) {
    const fl = fechaLimite(tarea.fecha)
    try {
      const card = await createCard({ columna_id: primeraColumnaId, titulo: tarea.texto.trim() })
      if (fl && card?.id) {
        await updateCard(card.id, { fecha_limite: fl }).catch(() => {})
      }
    } catch (_) {}
  }

  // 8. Seed music taste (localStorage)
  const generosClave = (respuestas.generos || []).map(g => GENERO_MAP[g]).filter(Boolean)
  try {
    const taste = JSON.parse(localStorage.getItem(TASTE_KEY) || '{}')
    generosClave.forEach(g => { taste[g] = (taste[g] || 0) + 4 })
    localStorage.setItem(TASTE_KEY, JSON.stringify(taste))
  } catch (_) {}

  // 9. Marcar como completado (lo hace el store al llamar close())
}
