import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { getEventos, createEvento, deleteEvento, updateEvento } from '../../services/calendarService'
import { getMySessions, getHourlyFocus } from '../../services/statsService'
import { getSubtareasForCards, toggleSubtarea } from '../../services/boardService'
import InfinityLogo from '../layout/InfinityLogo'
import KairosSeal from './KairosSeal'
import styles from './KairosFlow.module.css'
import { IconAlertTriangle, IconCards, IconCheckbox, IconCornerDownRight, IconSparkles, IconFlag, IconChevronDown, IconChevronRight, IconSquareCheckFilled, IconSquare } from '@tabler/icons-react'

/* ─── helpers ──────────────────────────────────────────────── */
function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function today0() { const d = new Date(); d.setHours(0,0,0,0); return d }
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)) }
function snapHalf(h) { return Math.round(h * 2) / 2 }

const START_HOUR = 6
const END_HOUR   = 24
const SPAN       = END_HOUR - START_HOUR
const HOURS      = Array.from({ length: SPAN }, (_, i) => START_HOUR + i)
const DEFAULT_DUR = 1
const MIN_DUR     = 0.5
const MIN_FOCUS_SECONDS = 1800

const PRIORITY_META = {
  alta:   { label: 'Alta',   color: 'var(--kairos-col-review)' },
  normal: { label: 'Normal', color: 'var(--kairos-col-progress)' },
  baja:   { label: 'Baja',   color: 'var(--kairos-text-muted)' },
}

function gauss(x, mu, sigma) { return Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) }
function defaultEnergy() {
  const map = {}
  for (let h = START_HOUR; h <= END_HOUR; h++) map[h] = Math.min(1, Math.max(gauss(h, 11, 2.3), 0.55 * gauss(h, 16.5, 2.0)))
  return { energy: map, peak: 11, isReal: false }
}
function deriveEnergy(sessions) {
  const focus = getHourlyFocus(sessions)
  const total = focus.reduce((a, b) => a + b, 0)
  if (total < MIN_FOCUS_SECONDS) return defaultEnergy()
  const smooth = h => (focus[h-1] || 0) * 0.25 + focus[h] * 0.5 + (focus[h+1] || 0) * 0.25
  let max = 0
  for (let h = START_HOUR; h <= END_HOUR; h++) max = Math.max(max, smooth(h))
  if (max === 0) return defaultEnergy()
  const map = {}
  let peak = START_HOUR, peakVal = -1
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    const v = smooth(h) / max
    map[h] = v
    if (v > peakVal) { peakVal = v; peak = h }
  }
  return { energy: map, peak, isReal: true }
}
function kairosWindow(energy) {
  const hi = HOURS.filter(h => energy[h] >= 0.72)
  if (!hi.length) return null
  return { start: Math.min(...hi), end: Math.max(...hi) + 1 }
}
function hourToPct(h) { return ((h - START_HOUR) / SPAN) * 100 }
function fmtHour(h) { return `${String(Math.floor(h)).padStart(2,'0')}:00` }
function fmtHalfHour(h) { return `${String(Math.floor(h)).padStart(2,'0')}:${h % 1 ? '30' : '00'}` }
function fmtTime(d) { return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
function hourFloatOf(dateStr) { const d = new Date(dateStr); return d.getHours() + d.getMinutes()/60 }
function hourToISO(day, h) {
  const d = new Date(day)
  d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0)
  return d.toISOString()
}

function guardianMessage({ isToday, isPast, nowHour, win, hasUrgent, plannedCount, isReal }) {
  if (isPast) return 'Un día que ya fluyó. Mira hacia adelante.'
  if (!win) {
    if (plannedCount > 0) return `Tienes ${plannedCount} bloque${plannedCount>1?'s':''} reservado${plannedCount>1?'s':''}. Tu día ya tiene forma.`
    return 'Completa algunas sesiones de enfoque y KAIROS calculará tu ventana de máxima energía.'
  }
  if (!isToday) {
    if (plannedCount > 0) return `Tienes ${plannedCount} bloque${plannedCount>1?'s':''} reservado${plannedCount>1?'s':''}. Tu día ya tiene forma.`
    return `Planifica este día alrededor de tu ventana Kairos, cerca de las ${fmtHour(win.start)}.`
  }
  if (hasUrgent) return `Tienes algo importante hoy — agéndalo dentro de tu ventana Kairos (${fmtHour(win.start)}–${fmtHour(win.end)}).`
  if (nowHour < win.start) return `${isReal ? 'Según tu historial, tu' : 'Tu'} Kairos despierta cerca de las ${fmtHour(win.start)}. Reserva tu tarea más difícil para entonces.`
  if (nowHour >= win.start && nowHour < win.end) return 'Estás en tu Kairos. Este es el momento — protégelo de interrupciones.'
  return 'Tu pico ya pasó. Buen momento para cerrar pendientes ligeros.'
}

/* ─── componente ───────────────────────────────────────────── */
export default function KairosFlow({ selectedDay, cards, columnMap }) {
  const selectCard    = useBoardStore(s => s.selectCard)
  const proyecto      = useBoardStore(s => s.proyecto)
  const cardsByColumn = useBoardStore(s => s.cardsByColumn)

  const railRef = useRef(null)

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  // Energía real
  const [sessions, setSessions] = useState([])
  useEffect(() => { getMySessions().then(setSessions).catch(() => setSessions([])) }, [])
  const { energy, isReal } = useMemo(() => deriveEnergy(sessions), [sessions])
  const win = useMemo(() => kairosWindow(energy), [energy])

  // Subtareas de todas las tarjetas (cache local)
  const [subsByCard, setSubsByCard] = useState({})
  useEffect(() => {
    const ids = Object.values(cardsByColumn).flat().map(c => c.id)
    if (!ids.length) { setSubsByCard({}); return }
    getSubtareasForCards(ids).then(rows => {
      const by = {}
      rows.forEach(s => { (by[s.tarjeta_id] ||= []).push(s) })
      setSubsByCard(by)
    }).catch(() => {})
  }, [cardsByColumn])

  const cardSubs    = useCallback(id => subsByCard[id] || [], [subsByCard])
  const pendingSubs = useCallback(id => cardSubs(id).filter(s => !s.completada), [cardSubs])

  async function toggleSub(sub) {
    setSubsByCard(prev => ({
      ...prev,
      [sub.tarjeta_id]: (prev[sub.tarjeta_id] || []).map(s => s.id === sub.id ? { ...s, completada: !s.completada } : s),
    }))
    try { await toggleSubtarea(sub.id, !sub.completada) }
    catch (e) { console.error('Error al marcar subtarea:', e) }
  }

  // Eventos agendados
  const [eventos, setEventos]   = useState([])
  const [error, setError]       = useState(null)
  const [dropHour, setDropHour] = useState(null)

  const load = useCallback(async () => {
    if (!proyecto?.id) { setEventos([]); return }
    const start = new Date(selectedDay); start.setHours(0,0,0,0)
    const end   = new Date(start); end.setDate(end.getDate()+1)
    try { setEventos(await getEventos(proyecto.id, start.toISOString(), end.toISOString())); setError(null) }
    catch (e) { console.error('Error cargando eventos:', e); setEventos([]) }
  }, [proyecto?.id, selectedDay])
  useEffect(() => { load() }, [load])

  const selKey   = toKey(selectedDay)
  const todayKey = toKey(today0())
  const isToday  = selKey === todayKey
  const isPast   = selectedDay < today0() && !isToday

  const cardById = useMemo(() => {
    const m = {}
    Object.values(cardsByColumn).flat().forEach(c => { m[c.id] = c })
    return m
  }, [cardsByColumn])

  const dayCards  = useMemo(() => cards.filter(c => c.fecha_limite === selKey), [cards, selKey])
  const hasUrgent = dayCards.some(c => c.prioridad === 'alta')

  // Lo ya agendado: ids de tarjetas (sin subtarea) y de subtareas
  const scheduledCardIds = useMemo(() => new Set(eventos.filter(e => !e.subtarea_id).map(e => e.tarjeta_id).filter(Boolean)), [eventos])
  const scheduledSubIds  = useMemo(() => new Set(eventos.map(e => e.subtarea_id).filter(Boolean)), [eventos])

  const trayCards = useMemo(() => {
    const all = Object.values(cardsByColumn).flat()
    return all
      .filter(c => !scheduledCardIds.has(c.id))
      .sort((a, b) => (b.fecha_limite === selKey) - (a.fecha_limite === selKey))
  }, [cardsByColumn, scheduledCardIds, selKey])

  const [expandedTray, setExpandedTray] = useState(() => new Set())
  function toggleExpand(cardId) {
    setExpandedTray(prev => {
      const next = new Set(prev)
      next.has(cardId) ? next.delete(cardId) : next.add(cardId)
      return next
    })
  }

  const railGradient = useMemo(() => {
    const stops = []
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const alpha = (0.04 + (energy[h] ?? 0) * 0.5).toFixed(3)
      stops.push(`rgba(127, 119, 221, ${alpha}) ${hourToPct(h).toFixed(1)}%`)
    }
    return `linear-gradient(to bottom, ${stops.join(', ')})`
  }, [energy])

  const nowHourFloat = now.getHours() + now.getMinutes()/60
  const nowVisible   = isToday && nowHourFloat >= START_HOUR && nowHourFloat <= END_HOUR
  const nowPct       = hourToPct(nowHourFloat)

  const guardian = guardianMessage({ isToday, isPast, nowHour: nowHourFloat, win, hasUrgent, plannedCount: eventos.length, isReal })

  const weekday = selectedDay.toLocaleDateString('es-ES', { weekday: 'long' })
  const dayNum  = selectedDay.getDate()
  const month   = selectedDay.toLocaleDateString('es-ES', { month: 'long' })

  /* ── Crear desde bandeja (tarjeta o subtarea) ── */
  function hourFromClientY(clientY) {
    const rect = railRef.current.getBoundingClientRect()
    const pct = clamp((clientY - rect.top) / rect.height, 0, 1)
    return snapHalf(START_HOUR + pct * SPAN)
  }
  function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropHour(hourFromClientY(e.clientY)) }
  function handleDragLeave() { setDropHour(null) }

  async function handleDrop(e) {
    e.preventDefault()
    const data = e.dataTransfer.getData('text/plain')
    const targetHour = clamp(hourFromClientY(e.clientY), START_HOUR, END_HOUR - DEFAULT_DUR)
    setDropHour(null)
    if (!data || !proyecto?.id) return

    let card = null, sub = null
    if (data.startsWith('sub:')) {
      const [, subId, cardId] = data.split(':')
      card = cardById[cardId]
      sub = (subsByCard[cardId] || []).find(s => s.id === subId)
    } else {
      const cardId = data.startsWith('card:') ? data.slice(5) : data
      card = cardById[cardId]
    }
    if (!card) return

    const titulo = sub ? sub.titulo : card.titulo
    const fecha_inicio = hourToISO(selectedDay, targetHour)
    const fecha_fin    = hourToISO(selectedDay, targetHour + DEFAULT_DUR)
    const optimistic = {
      id: `tmp-${Date.now()}`, proyecto_id: proyecto.id, tarjeta_id: card.id, subtarea_id: sub?.id || null,
      titulo, fecha_inicio, fecha_fin, tipo: 'tarea',
    }
    setEventos(prev => [...prev, optimistic])
    try {
      await createEvento({ proyecto_id: proyecto.id, tarjeta_id: card.id, subtarea_id: sub?.id || null, titulo, fecha_inicio, fecha_fin })
      load()
    } catch (err) {
      console.error('Error al agendar:', err)
      setEventos(prev => prev.filter(ev => ev.id !== optimistic.id))
      setError('No se pudo guardar el bloque. ¿Ejecutaste el SQL de subtarea_id y las políticas RLS?')
    }
  }

  async function removeEvento(id) {
    setEventos(prev => prev.filter(ev => ev.id !== id))
    try { await deleteEvento(id) }
    catch (err) { console.error('Error al quitar evento:', err); load() }
  }

  /* ── Mover / redimensionar bloques ── */
  const [editing, setEditing] = useState(null)
  function beginEdit(e, ev, mode) {
    if (String(ev.id).startsWith('tmp-')) return
    e.stopPropagation()
    const sH = hourFloatOf(ev.fecha_inicio)
    const eH = ev.fecha_fin ? hourFloatOf(ev.fecha_fin) : sH + DEFAULT_DUR
    setEditing({ id: ev.id, mode, origStart: sH, origEnd: eH, startY: e.clientY, startH: sH, endH: eH, moved: false })
  }
  useEffect(() => {
    if (!editing) return
    function onMove(e) {
      const rect = railRef.current?.getBoundingClientRect()
      if (!rect) return
      const deltaH = ((e.clientY - editing.startY) / rect.height) * SPAN
      const moved = editing.moved || Math.abs(deltaH) > 0.12
      let startH = editing.startH, endH = editing.endH
      if (editing.mode === 'move') {
        const dur = editing.origEnd - editing.origStart
        startH = clamp(snapHalf(editing.origStart + deltaH), START_HOUR, END_HOUR - dur)
        endH = startH + dur
      } else {
        endH = clamp(snapHalf(editing.origEnd + deltaH), editing.origStart + MIN_DUR, END_HOUR)
        startH = editing.origStart
      }
      setEditing(prev => prev && ({ ...prev, startH, endH, moved }))
    }
    async function onUp() {
      const ed = editing
      setEditing(null)
      if (!ed) return
      if (!ed.moved) {
        const ev = eventos.find(x => x.id === ed.id)
        const card = ev?.tarjeta_id ? cardById[ev.tarjeta_id] : null
        if (card) selectCard(card)
        return
      }
      const fecha_inicio = hourToISO(selectedDay, ed.startH)
      const fecha_fin    = hourToISO(selectedDay, ed.endH)
      setEventos(prev => prev.map(x => x.id === ed.id ? { ...x, fecha_inicio, fecha_fin } : x))
      try { await updateEvento(ed.id, { fecha_inicio, fecha_fin }) }
      catch (err) { console.error('Error al actualizar evento:', err); load() }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [editing, eventos, cardById, selectedDay, selectCard, load])

  /* ── Popover de checklist (bloque de tarjeta) ── */
  const [checklist, setChecklist] = useState(null) // { cardId, x, y }
  function openChecklist(e, cardId) {
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    const W = 240, H = 320, m = 8
    // Preferir a la derecha del badge; si no cabe, a la izquierda
    let x = r.right + m
    if (x + W > window.innerWidth - m) x = r.left - W - m
    x = Math.max(m, x)
    // Vertical: alinear con el badge y mantener dentro de la ventana
    let y = Math.min(r.top, window.innerHeight - H - m)
    y = Math.max(m, y)
    setChecklist({ cardId, x, y })
  }

  return (
    <div className={styles.flow}>
      {/* ── Cabecera ── */}
      <header className={styles.header}>
        <KairosSeal date={selectedDay} size={72} />
        <div className={styles.headerText}>
          <h2 className={styles.date}>
            <span className={styles.weekday}>{weekday}</span>
            <span className={styles.dayNum}>{dayNum}</span>
            <span className={styles.month}>de {month}</span>
            {isToday && <span className={styles.todayTag}>Hoy</span>}
          </h2>
          <p className={styles.guardian}><span className={styles.guardianMark}>∞</span>{guardian}</p>
        </div>
      </header>

      {error && <div className={styles.error}><IconAlertTriangle size="1em" /> {error}</div>}

      {/* ── Bandeja ── */}
      <div className={styles.tray}>
        <span className={styles.trayLabel}>
          <IconCards size="1em" /> Arrastra tarjetas o subtareas a la corriente
        </span>
        <div className={styles.trayScroll}>
          {trayCards.length === 0 ? (
            <span className={styles.trayEmpty}>Todo agendado ✓</span>
          ) : trayCards.map(card => {
            const col = columnMap[card.columna_id]
            const due = card.fecha_limite === selKey
            const subs = pendingSubs(card.id).filter(s => !scheduledSubIds.has(s.id))
            const expanded = expandedTray.has(card.id)
            return (
              <div key={card.id} className={styles.trayGroup}>
                <button
                  className={styles.trayCard} draggable
                  onDragStart={e => { e.dataTransfer.setData('text/plain', `card:${card.id}`); e.dataTransfer.effectAllowed = 'move' }}
                  onClick={() => selectCard(card)}
                  title="Arrastra al carril · click para abrir"
                >
                  <span className={styles.trayBar} style={{ background: col?.color || 'var(--kairos-purple-600)' }} />
                  <span className={styles.trayTitle}>{card.titulo}</span>
                  {due && <IconFlag size="1em" className={styles.trayDue} title="Vence este día" />}
                  {subs.length > 0 && (
                    <span
                      className={styles.trayExpand}
                      onClick={e => { e.stopPropagation(); toggleExpand(card.id) }}
                      title="Ver subtareas"
                    >
                      {expanded ? <IconChevronDown size="1em" /> : <IconChevronRight size="1em" />} {subs.length}
                    </span>
                  )}
                </button>

                {/* Subtareas arrastrables */}
                {expanded && subs.map(sub => (
                  <button
                    key={sub.id} className={styles.traySub} draggable
                    onDragStart={e => { e.dataTransfer.setData('text/plain', `sub:${sub.id}:${card.id}`); e.dataTransfer.effectAllowed = 'move' }}
                    title="Arrastra al carril"
                  >
                    <IconCornerDownRight size="1em" />
                    <span className={styles.traySubTitle}>{sub.titulo}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── La Corriente ── */}
      <div className={styles.stream}>
        <div className={styles.hours}>
          {HOURS.map(h => (
            <div key={h} className={styles.hourLabel} style={{ height: 'var(--row-h)' }}>{String(h).padStart(2, '0')}</div>
          ))}
        </div>

        <div
          className={`${styles.rail} ${dropHour != null ? styles.railDragOver : ''}`}
          ref={railRef}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        >
          <div className={styles.railEnergy} style={{ background: railGradient }} />
          {HOURS.map(h => <div key={h} className={styles.hourLine} style={{ top: `${hourToPct(h)}%` }} />)}

          {win && (
            <div className={styles.kairosWindow} style={{ top: `${hourToPct(win.start)}%`, height: `${hourToPct(win.end) - hourToPct(win.start)}%` }}>
              <span className={styles.kairosWindowLabel}>
                <IconSparkles size="1em" /> Ventana Kairos
                {isReal && <span className={styles.kairosReal}>· según tu historial</span>}
              </span>
              <span className={styles.kairosWindowTime}>{fmtHour(win.start)} – {fmtHour(win.end)}</span>
            </div>
          )}

          {/* Bloques */}
          {eventos.map(ev => {
            const isEd = editing?.id === ev.id
            const sH = isEd ? editing.startH : hourFloatOf(ev.fecha_inicio)
            const eH = isEd ? editing.endH : (ev.fecha_fin ? hourFloatOf(ev.fecha_fin) : sH + DEFAULT_DUR)
            const card = ev.tarjeta_id ? cardById[ev.tarjeta_id] : null
            const col  = card ? columnMap[card.columna_id] : null
            const color = col?.color || 'var(--kairos-purple-600)'
            const top = hourToPct(sH)
            const height = Math.max(hourToPct(eH) - top, 3.2)

            // ¿bloque de subtarea?
            const sub = ev.subtarea_id ? (subsByCard[ev.tarjeta_id] || []).find(s => s.id === ev.subtarea_id) : null
            // progreso de checklist (solo bloques de tarjeta)
            const subs = !ev.subtarea_id && card ? cardSubs(card.id) : []
            const done = subs.filter(s => s.completada).length

            return (
              <div
                key={ev.id}
                className={`${styles.block} ${isEd ? styles.blockEditing : ''} ${sub?.completada ? styles.blockDone : ''}`}
                style={{ top: `${top}%`, height: `${height}%`, borderLeftColor: color }}
                onPointerDown={e => beginEdit(e, ev, 'move')}
                role="button" title="Arrastra para mover · click para abrir"
              >
                {sub && (
                  <button
                    className={styles.blockCheck}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); toggleSub(sub) }}
                    title={sub.completada ? 'Marcar pendiente' : 'Marcar completada'}
                  >
                    {sub.completada ? <IconSquareCheckFilled size="1em" /> : <IconSquare size="1em" />}
                  </button>
                )}
                <span className={styles.blockTime}>{fmtHalfHour(snapHalf(sH))}</span>
                <span className={styles.blockTitle}>{ev.titulo}</span>

                {subs.length > 0 && (
                  <button
                    className={styles.blockProgress}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => openChecklist(e, card.id)}
                    title="Ver subtareas"
                  >
                    <IconCheckbox size="1em" /> {done}/{subs.length}
                  </button>
                )}

                <button
                  className={styles.blockRemove}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); removeEvento(ev.id) }}
                  title="Quitar del calendario"
                >✕</button>
                <div className={styles.blockResize} onPointerDown={e => beginEdit(e, ev, 'resize')} title="Arrastra para cambiar la duración" />
              </div>
            )
          })}

          {dropHour != null && (
            <div className={styles.dropLine} style={{ top: `${hourToPct(dropHour)}%` }}>
              <span className={styles.dropLineLabel}>{fmtHalfHour(dropHour)}</span>
            </div>
          )}

          {nowVisible && (
            <div className={styles.nowNode} style={{ top: `${nowPct}%` }}>
              <div className={styles.nowLine} />
              <div className={styles.nowMarker}><InfinityLogo size={34} state="pulsing" /></div>
              <span className={styles.nowTime}>{fmtTime(now)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Popover de checklist ── */}
      {checklist && (
        <>
          <div className={styles.popoverOverlay} onClick={() => setChecklist(null)} />
          <div className={styles.checklistPop} style={{ left: checklist.x, top: checklist.y }}>
            <div className={styles.checklistHead}>
              <span>{cardById[checklist.cardId]?.titulo}</span>
              <button onClick={() => setChecklist(null)}>✕</button>
            </div>
            <ul className={styles.checklistList}>
              {cardSubs(checklist.cardId).map(sub => (
                <li key={sub.id} className={`${styles.checklistItem} ${sub.completada ? styles.checklistDone : ''}`}>
                  <button className={styles.checklistCheck} onClick={() => toggleSub(sub)}>
                    {sub.completada ? <IconSquareCheckFilled size="1em" /> : <IconSquare size="1em" />}
                  </button>
                  <span>{sub.titulo}</span>
                </li>
              ))}
              {cardSubs(checklist.cardId).length === 0 && (
                <li className={styles.checklistEmpty}>Sin subtareas</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
