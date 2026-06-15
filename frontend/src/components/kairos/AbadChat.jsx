import { useState, useEffect, useRef } from 'react'
import { useAbadStore } from '../../store/abadStore'
import { useBoardStore } from '../../store/boardStore'
import { useKairosVoice } from '../../hooks/useKairosVoice'
import { useSpeech } from '../../hooks/useSpeech'
import { getProjectMembers, createSubtarea } from '../../services/boardService'
import {
  addTransaccion, getCategorias,
  getPresupuestos, getTransacciones, calcBudgetProgress, calcSummary,
} from '../../services/financeService'
import { getFocusProgress } from '../../services/rankService'
import InfinityLogo from '../layout/InfinityLogo'
import styles from './AbadChat.module.css'

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const norm = s => (s || '').toString().trim().toLowerCase()
const ALERT_KEY = 'kairos-abad-alert-date'

const EXAMPLES = [
  '¿Qué tengo pendiente hoy?',
  'Crea "Llamar al cliente" para mañana, prioridad alta',
  '¿Cómo va mi presupuesto este mes?',
  'Registra un ingreso de 500 por "Freelance"',
]

export default function AbadChat() {
  const { isOpen, close, messages, addMessage, thinking, setThinking } = useAbadStore()
  const [input, setInput] = useState('')
  const [rank, setRank]   = useState(null)
  const listRef = useRef(null)

  const { isListening, transcript, toggleListening, startListening, stopListening } = useKairosVoice({
    onResult: (text) => submit(text),
  })
  const { speak, cancel: cancelSpeech, isMuted, toggleMute } = useSpeech()

  useEffect(() => { getFocusProgress().then(setRank).catch(() => {}) }, [])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, thinking, isOpen])

  // Al abrir: escuchar + alerta proactiva de presupuesto (una vez al día)
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => startListening(), 350)

      // Alerta proactiva solo si la conversación está en blanco y no se alertó hoy
      const today = new Date().toISOString().slice(0, 10)
      if (messages.length === 0 && localStorage.getItem(ALERT_KEY) !== today) {
        const now = new Date()
        Promise.all([
          getTransacciones(now.getFullYear(), now.getMonth() + 1),
          getPresupuestos(now.getFullYear(), now.getMonth() + 1),
        ]).then(([trans, pres]) => {
          const progress = calcBudgetProgress(pres, trans)
          const alerts = progress.filter(b => b.estado !== 'ok')
          if (!alerts.length) return
          const parts = alerts.slice(0, 3).map(b => {
            const name = b.categorias_finanzas?.nombre || 'una categoría'
            const label = b.estado === 'over' ? 'excedida' : 'en alerta'
            return `${name} al ${Math.round(b.pct)}% (${label})`
          })
          const msg = `Hola. Antes de que preguntes: este mes tienes ${parts.join(', ')}.`
          addMessage('abad', msg)
          speak(msg)
          localStorage.setItem(ALERT_KEY, today)
        }).catch(() => {})
      }

      return () => clearTimeout(t)
    }
    stopListening()
    cancelSpeech()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (!isListening || !transcript.trim()) return
    const t = setTimeout(() => stopListening(), 2000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, isListening])

  if (!isOpen) return null

  async function buildContext() {
    const { cardsByColumn, columns, proyecto } = useBoardStore.getState()
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayStr = ymd(today)
    const tmrw = new Date(today); tmrw.setDate(today.getDate() + 1)
    const tmrwStr = ymd(tmrw)
    const all = Object.values(cardsByColumn || {}).flat()
    const fmt = c => ({ titulo: c.titulo, fecha: c.fecha_limite, prioridad: c.prioridad || 'normal', columna: columns?.find(col => col.id === c.columna_id)?.nombre })
    const vencidas = all.filter(c => c.fecha_limite && c.fecha_limite < todayStr).map(fmt)
    const hoy      = all.filter(c => c.fecha_limite === todayStr).map(fmt)
    const manana   = all.filter(c => c.fecha_limite === tmrwStr).map(fmt)

    let miembros = []
    let categorias = []
    let presupuestosCtx = []
    let summaryCtx = { ingresos: 0, gastos: 0, balance: 0 }

    const now = new Date()
    const [miembrosResult, categoriasResult, transResult, presResult] = await Promise.allSettled([
      proyecto?.id ? getProjectMembers(proyecto.id) : Promise.resolve([]),
      getCategorias(),
      getTransacciones(now.getFullYear(), now.getMonth() + 1),
      getPresupuestos(now.getFullYear(), now.getMonth() + 1),
    ])

    if (miembrosResult.status === 'fulfilled') {
      miembros = (miembrosResult.value || []).map(x => x.usuarios?.nombre || x.usuarios?.email).filter(Boolean)
    }
    if (categoriasResult.status === 'fulfilled') {
      categorias = (categoriasResult.value || []).map(c => c.nombre)
    }
    if (transResult.status === 'fulfilled' && presResult.status === 'fulfilled') {
      const trans = transResult.value || []
      const pres  = presResult.value || []
      summaryCtx = calcSummary(trans)
      presupuestosCtx = calcBudgetProgress(pres, trans).map(b => ({
        categoria: b.categorias_finanzas?.nombre || '?',
        limite:    b.limite,
        gastado:   b.gastado,
        pct:       Math.round(b.pct),
        estado:    b.estado,
      }))
    }

    // Todas las tarjetas del tablero por columna (sin filtro de fecha)
    const tablero_actual = {}
    for (const col of (columns || [])) {
      const cards = (cardsByColumn[col.id] || []).map(c => ({
        titulo: c.titulo,
        prioridad: c.prioridad || 'normal',
        ...(c.fecha_limite ? { fecha: c.fecha_limite } : {}),
      }))
      if (cards.length) tablero_actual[col.nombre] = cards
    }

    return {
      fecha_hoy:         todayStr,
      proyecto:          proyecto?.nombre || null,
      columnas:          (columns || []).map(c => c.nombre),
      tablero_actual,
      miembros,
      categorias_gasto:  categorias,
      rango:             rank?.after?.current?.name || null,
      racha_dias:        rank?.streak ?? 0,
      xp_total_min:      rank?.after?.totalMinutes ?? 0,
      tareas:            { vencidas, hoy, manana },
      ingresos_mes:      summaryCtx.ingresos,
      gastos_mes:        summaryCtx.gastos,
      balance_mes:       summaryCtx.balance,
      presupuestos:      presupuestosCtx,
    }
  }

  async function executeAction(action, args) {
    const store = useBoardStore.getState()
    const { columns, cardsByColumn, proyecto } = store

    const findColumn = (name) => {
      if (!columns.length) return null
      if (!name) return columns[0]
      const n = norm(name)
      return columns.find(c => norm(c.nombre) === n)
        || columns.find(c => norm(c.nombre).includes(n) || n.includes(norm(c.nombre)))
        || columns[0]
    }
    const findCard = (title) => {
      const n = norm(title)
      for (const col of columns) {
        const card = (cardsByColumn[col.id] || []).find(c => norm(c.titulo).includes(n) || n.includes(norm(c.titulo)))
        if (card) return { card, colId: col.id }
      }
      return null
    }

    if (action === 'crear_tarjeta') {
      const col = findColumn(args.columna)
      if (!col) return 'Primero abre un tablero para poder crear tarjetas.'
      const card = await store.addCard(col.id, args.titulo)
      if (!card) return 'No pude crear la tarjeta.'
      const fields = {}
      if (args.descripcion)  fields.descripcion = args.descripcion
      if (args.prioridad)    fields.prioridad = args.prioridad
      if (args.fecha_limite) fields.fecha_limite = args.fecha_limite
      if (args.participante && proyecto?.id) {
        try {
          const members = await getProjectMembers(proyecto.id)
          const n = norm(args.participante)
          const m = members.find(x => norm(x.usuarios?.nombre).includes(n) || norm(x.usuarios?.email).includes(n))
          if (m) fields.asignado_a = m.usuario_id
        } catch (_) {}
      }
      if (Object.keys(fields).length) await store.editCard(card.id, col.id, fields)
      if (Array.isArray(args.subtareas)) {
        for (const sub of args.subtareas) {
          if (sub && sub.trim()) { try { await createSubtarea(card.id, sub.trim()) } catch (_) {} }
        }
      }
      const extras = []
      if (args.prioridad)         extras.push(`prioridad ${args.prioridad}`)
      if (args.fecha_limite)      extras.push(`para el ${args.fecha_limite}`)
      if (args.subtareas?.length) extras.push(`${args.subtareas.length} subtarea${args.subtareas.length > 1 ? 's' : ''}`)
      if (fields.asignado_a)      extras.push(`asignada a ${args.participante}`)
      return `Listo, creé "${args.titulo}" en ${col.nombre}${extras.length ? ' · ' + extras.join(', ') : ''}.`
    }

    if (action === 'agregar_subtarea') {
      if (!columns.length) return 'Primero abre un tablero.'
      const found = findCard(args.titulo_tarjeta)
      if (!found) return `No encontré la tarjeta "${args.titulo_tarjeta}".`
      try {
        await createSubtarea(found.card.id, (args.subtarea || '').trim())
        return `Agregué la subtarea "${args.subtarea}" a "${found.card.titulo}".`
      } catch (_) {
        return 'No pude agregar la subtarea.'
      }
    }

    if (action === 'mover_tarjeta') {
      if (!columns.length) return 'Primero abre un tablero.'
      const found = findCard(args.titulo_tarjeta)
      const toCol = findColumn(args.columna_destino)
      if (!found) return `No encontré la tarjeta "${args.titulo_tarjeta}".`
      if (!toCol)  return `No encontré la lista "${args.columna_destino}".`
      if (found.colId === toCol.id) return `"${found.card.titulo}" ya está en ${toCol.nombre}.`
      await store.moveCardToColumn(found.card.id, found.colId, toCol.id)
      return `Moví "${found.card.titulo}" a ${toCol.nombre}.`
    }

    if (action === 'registrar_gasto' || action === 'registrar_ingreso') {
      const tipo = action === 'registrar_gasto' ? 'gasto' : 'ingreso'
      try {
        let categoria_id = null
        if (args.categoria) {
          const cats = await getCategorias()
          const n = norm(args.categoria)
          categoria_id = cats.find(c => norm(c.nombre).includes(n) || n.includes(norm(c.nombre)))?.id || null
        }
        await addTransaccion({ concepto: args.concepto, monto: Number(args.monto), tipo, categoria_id, fecha: ymd(new Date()) })
        return `Registré ${tipo === 'gasto' ? 'un gasto' : 'un ingreso'} de $${args.monto} por "${args.concepto}".`
      } catch (_) {
        return `No pude registrar el ${tipo}.`
      }
    }

    return 'No reconocí esa acción.'
  }

  async function submit(text) {
    const q = (text || '').trim()
    if (!q || thinking) return
    setInput('')
    // Capturar historial ANTES de agregar el nuevo mensaje
    const history = messages.slice(-8)
    addMessage('user', q)
    setThinking(true)
    try {
      const context = await buildContext()
      const res = await fetch('/api/abad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, context, history }),
      })
      const data = await res.json().catch(() => ({}))
      let reply
      let toolMeta = null
      if (!res.ok) {
        reply = data.error || 'ABAD no está disponible ahora mismo.'
      } else if (data.action) {
        reply = await executeAction(data.action, data.args || {})
        if (data.toolUseId) {
          toolMeta = { toolUseId: data.toolUseId, actionName: data.action, actionArgs: data.args || {} }
        }
      } else {
        reply = data.answer || 'No tengo una respuesta para eso.'
      }
      addMessage('abad', reply, toolMeta)
      speak(reply)
    } catch (_) {
      addMessage('abad', 'No pude conectar con ABAD. ¿Está desplegado el servidor (Vercel) con la API key?')
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <InfinityLogo size={34} state={isListening ? 'listening' : thinking ? 'pulsing' : 'idle'} />
          <div>
            <p className={styles.title}>ABAD</p>
            <p className={styles.sub}>Inteligencia de KAIROS</p>
          </div>
        </div>
        <button
          className={styles.muteBtn}
          onClick={toggleMute}
          title={isMuted ? 'Activar voz de ABAD' : 'Silenciar voz de ABAD'}
          aria-label={isMuted ? 'Activar voz' : 'Silenciar voz'}
        >
          <i className={isMuted ? 'ti ti-volume-3' : 'ti ti-volume'} />
        </button>
        <button className={styles.close} onClick={close} aria-label="Cerrar"><i className="ti ti-x" /></button>
      </div>

      <div className={styles.messages} ref={listRef}>
        {messages.length === 0 && (
          <div className={styles.welcome}>
            <p className={styles.welcomeText}>Habla o escribe. Puedo responder sobre tus tareas, finanzas y también crear/mover tarjetas o registrar movimientos.</p>
            <div className={styles.examples}>
              {EXAMPLES.map(ex => (
                <button key={ex} className={styles.example} onClick={() => submit(ex)}>{ex}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgAbad}`}>
            {m.text}
          </div>
        ))}

        {thinking && (
          <div className={`${styles.msg} ${styles.msgAbad} ${styles.typing}`}>
            <span /><span /><span />
          </div>
        )}
      </div>

      <div className={styles.inputRow}>
        <button
          className={`${styles.mic} ${isListening ? styles.micOn : ''}`}
          onClick={toggleListening}
          title={isListening ? 'Detener' : 'Hablar'}
        >
          <i className={isListening ? 'ti ti-microphone-filled' : 'ti ti-microphone'} />
        </button>
        <input
          className={styles.input}
          placeholder={isListening ? (transcript || 'Escuchando…') : 'Escribe o pulsa el micrófono…'}
          value={isListening ? transcript : input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(input) }}
          disabled={isListening}
        />
        <button className={styles.send} onClick={() => submit(input)} disabled={!input.trim() || thinking} title="Enviar">
          <i className="ti ti-send" />
        </button>
      </div>
    </div>
  )
}
