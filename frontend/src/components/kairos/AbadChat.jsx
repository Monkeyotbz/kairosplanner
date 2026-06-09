import { useState, useEffect, useRef } from 'react'
import { useAbadStore } from '../../store/abadStore'
import { useBoardStore } from '../../store/boardStore'
import { useKairosVoice } from '../../hooks/useKairosVoice'
import { getProjectMembers, createSubtarea } from '../../services/boardService'
import { addTransaccion, getCategorias } from '../../services/financeService'
import { getFocusProgress } from '../../services/rankService'
import InfinityLogo from '../layout/InfinityLogo'
import styles from './AbadChat.module.css'

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const norm = s => (s || '').toString().trim().toLowerCase()

const EXAMPLES = [
  '¿Qué tengo pendiente hoy?',
  'Crea una tarjeta "Llamar al cliente" para mañana, prioridad alta',
  'Mueve "Diseñar logo" a Hecho',
  'Registra un gasto de 50 en herramientas',
]

export default function AbadChat() {
  const { isOpen, close, messages, addMessage, thinking, setThinking } = useAbadStore()
  const [input, setInput] = useState('')
  const [rank, setRank]   = useState(null)
  const listRef = useRef(null)

  const { isListening, transcript, toggleListening } = useKairosVoice({
    onResult: (text) => submit(text),
  })

  useEffect(() => { getFocusProgress().then(setRank).catch(() => {}) }, [])

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, thinking, isOpen])

  if (!isOpen) return null

  function speak(text) {
    try {
      if (!('speechSynthesis' in window) || !text) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'es-ES'
      window.speechSynthesis.speak(u)
    } catch (_) {}
  }

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
    try {
      if (proyecto?.id) {
        const m = await getProjectMembers(proyecto.id)
        miembros = m.map(x => x.usuarios?.nombre || x.usuarios?.email).filter(Boolean)
      }
    } catch (_) {}
    try { categorias = (await getCategorias()).map(c => c.nombre) } catch (_) {}

    return {
      fecha_hoy: todayStr,
      proyecto: proyecto?.nombre || null,
      columnas: (columns || []).map(c => c.nombre),
      miembros,
      categorias_gasto: categorias,
      rango: rank?.after?.current?.name || null,
      racha_dias: rank?.streak ?? 0,
      xp_total_min: rank?.after?.totalMinutes ?? 0,
      tareas: { vencidas, hoy, manana },
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
      if (args.prioridad)        extras.push(`prioridad ${args.prioridad}`)
      if (args.fecha_limite)     extras.push(`para el ${args.fecha_limite}`)
      if (args.subtareas?.length) extras.push(`${args.subtareas.length} subtarea${args.subtareas.length > 1 ? 's' : ''}`)
      if (fields.asignado_a)     extras.push(`asignada a ${args.participante}`)
      return `Listo, creé "${args.titulo}" en ${col.nombre}${extras.length ? ' · ' + extras.join(', ') : ''}.`
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

    if (action === 'registrar_gasto') {
      try {
        let categoria_id = null
        if (args.categoria) {
          const cats = await getCategorias()
          const n = norm(args.categoria)
          categoria_id = cats.find(c => norm(c.nombre).includes(n) || n.includes(norm(c.nombre)))?.id || null
        }
        await addTransaccion({ concepto: args.concepto, monto: Number(args.monto), tipo: 'gasto', categoria_id, fecha: ymd(new Date()) })
        return `Registré un gasto de $${args.monto} en "${args.concepto}".`
      } catch (_) {
        return 'No pude registrar el gasto.'
      }
    }
    return 'No reconocí esa acción.'
  }

  async function submit(text) {
    const q = (text || '').trim()
    if (!q || thinking) return
    setInput('')
    addMessage('user', q)
    setThinking(true)
    try {
      const context = await buildContext()
      const res = await fetch('/api/abad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, context }),
      })
      const data = await res.json().catch(() => ({}))
      let reply
      if (!res.ok)            reply = data.error || 'ABAD no está disponible ahora mismo.'
      else if (data.action)  reply = await executeAction(data.action, data.args || {})
      else                   reply = data.answer || 'No tengo una respuesta para eso.'
      addMessage('abad', reply)
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
        <button className={styles.close} onClick={close} aria-label="Cerrar"><i className="ti ti-x" /></button>
      </div>

      <div className={styles.messages} ref={listRef}>
        {messages.length === 0 && (
          <div className={styles.welcome}>
            <p className={styles.welcomeText}>Habla o escribe. Puedo responder sobre tus tareas y también crear/mover tarjetas o registrar gastos.</p>
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
