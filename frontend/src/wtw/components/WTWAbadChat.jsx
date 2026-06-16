import { useState, useRef, useEffect, useCallback } from 'react'
import { useWTWStore } from '../store/wtwStore'
import { getBoard, addCard, moveCard } from '../services/wtwKanbanService'
import { getUpcomingEvents } from '../services/wtwCalendarService'
import InfinityLogo from '../../components/layout/InfinityLogo'
import styles from './WTWAbadChat.module.css'

const STORAGE_KEY = 'kairos-wtw-abad-chat'
const MAX_HISTORY = 40

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
}
function saveHistory(msgs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_HISTORY)))
}

const norm = s => (s || '').toLowerCase()

export default function WTWAbadChat() {
  const { msUser, msToken } = useWTWStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(loadHistory)
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const listRef = useRef(null)
  const boardRef = useRef(null)

  // Precargar board para contexto
  useEffect(() => {
    if (msUser?.kairos_id) {
      getBoard(msUser.kairos_id).then(b => { boardRef.current = b })
    }
  }, [msUser?.kairos_id])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, thinking, open])

  useEffect(() => { saveHistory(messages) }, [messages])

  const addMsg = useCallback((role, text, extra = {}) => {
    setMessages(prev => [...prev, { role, text, ...extra }])
  }, [])

  async function buildContext() {
    const board = boardRef.current
    const tablero = board
      ? board.columnas.map(col => ({
          columna: col.nombre,
          color: col.color,
          tareas: board.tarjetas
            .filter(t => t.columna_id === col.id)
            .map(t => ({ id: t.id, titulo: t.titulo, prioridad: t.prioridad, fecha_limite: t.fecha_limite })),
        }))
      : []

    const reuniones = msToken ? await getUpcomingEvents(msToken, 3).catch(() => []) : []
    const reunionesFmt = reuniones.slice(0, 5).map(ev => ({
      titulo: ev.subject,
      inicio: ev.start.dateTime || ev.start.date,
      fin: ev.end.dateTime || ev.end.date,
      organizador: ev.organizer?.emailAddress?.name,
    }))

    return {
      fecha_hoy: new Date().toISOString().slice(0, 10),
      usuario: msUser?.displayName,
      tablero,
      reuniones: reunionesFmt,
    }
  }

  async function executeAction(action, args) {
    const board = boardRef.current
    if (!board) return `No se encontró el tablero.`

    if (action === 'crear_tarea') {
      let columnaId = board.columnas[0]?.id
      if (args.columna) {
        const found = board.columnas.find(c => norm(c.nombre).includes(norm(args.columna)))
        if (found) columnaId = found.id
      }
      const card = await addCard(columnaId, { titulo: args.titulo, prioridad: args.prioridad || 'media', fecha_limite: args.fecha_limite || null })
      boardRef.current = {
        ...board,
        tarjetas: [card, ...board.tarjetas],
      }
      return `Tarea "${args.titulo}" creada.`
    }

    if (action === 'mover_tarea') {
      const card = board.tarjetas.find(t => norm(t.titulo).includes(norm(args.titulo_tarea)))
      const col = board.columnas.find(c => norm(c.nombre).includes(norm(args.columna_destino)))
      if (!card) return `No encontré la tarea "${args.titulo_tarea}".`
      if (!col) return `No encontré la columna "${args.columna_destino}".`
      await moveCard(card.id, col.id)
      boardRef.current = {
        ...board,
        tarjetas: board.tarjetas.map(t => t.id === card.id ? { ...t, columna_id: col.id } : t),
      }
      return `Tarea movida a "${col.nombre}".`
    }

    return 'Acción no reconocida.'
  }

  async function submit(text) {
    const q = text?.trim() || input.trim()
    if (!q || thinking) return
    setInput('')
    addMsg('user', q)
    setThinking(true)

    try {
      const context = await buildContext()
      const history = messages.slice(-20)
      const res = await fetch('/api/wtw-abad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, context, history }),
      })
      const data = await res.json()

      if (data.action) {
        const result = await executeAction(data.action, data.args)
        addMsg('abad', result, {
          toolMeta: { toolUseId: data.toolUseId, actionName: data.action, actionArgs: data.args },
        })
      } else {
        addMsg('abad', data.answer || data.error || 'Sin respuesta.')
      }
    } catch (err) {
      addMsg('abad', 'Error al contactar al asistente.')
    } finally {
      setThinking(false)
    }
  }

  function clearChat() {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
        onClick={() => setOpen(v => !v)}
        title="ABAD — Asistente WTW"
      >
        <InfinityLogo size={24} state={thinking ? 'thinking' : open ? 'listening' : 'idle'} />
      </button>

      {/* Panel de chat */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <InfinityLogo size={20} state={thinking ? 'thinking' : 'idle'} />
              <div>
                <p className={styles.headerName}>ABAD</p>
                <p className={styles.headerSub}>Asistente WTW</p>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button onClick={clearChat} title="Limpiar chat" className={styles.iconBtn}>
                <i className="ti ti-trash" />
              </button>
              <button onClick={() => setOpen(false)} className={styles.iconBtn}>
                <i className="ti ti-x" />
              </button>
            </div>
          </div>

          <div className={styles.messages} ref={listRef}>
            {messages.length === 0 && (
              <div className={styles.welcome}>
                <p>Hola, soy ABAD. Puedo ayudarte con tus tareas y reuniones de WTW.</p>
                <div className={styles.examples}>
                  {['¿Qué tengo pendiente?', 'Crea tarea "Revisar Bad Debt" prioridad alta', '¿Cuándo es mi próxima reunión?'].map(e => (
                    <button key={e} className={styles.exampleBtn} onClick={() => submit(e)}>{e}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgAbad}`}>
                {m.role === 'abad' && <InfinityLogo size={16} state="idle" />}
                <p>{m.text}</p>
              </div>
            ))}
            {thinking && (
              <div className={`${styles.msg} ${styles.msgAbad}`}>
                <InfinityLogo size={16} state="thinking" />
                <div className={styles.dots}><span/><span/><span/></div>
              </div>
            )}
          </div>

          <form className={styles.inputRow} onSubmit={e => { e.preventDefault(); submit() }}>
            <input
              className={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pregunta o pide una acción…"
              disabled={thinking}
              autoFocus
            />
            <button type="submit" className={styles.sendBtn} disabled={!input.trim() || thinking}>
              <i className="ti ti-send" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
