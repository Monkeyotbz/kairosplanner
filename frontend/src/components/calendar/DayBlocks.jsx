import { useMemo, useState, useEffect, useCallback } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { getEventos } from '../../services/calendarService'
import { socket } from '../../services/socketService'
import KairosSeal from './KairosSeal'
import styles from './DayBlocks.module.css'
import { IconAlertTriangle, IconClock, IconConfetti, IconFlag, IconBrandGoogle } from '@tabler/icons-react'

/* ─── helpers ──────────────────────────────────────────────── */
function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function today0() { const d = new Date(); d.setHours(0,0,0,0); return d }
function fmtTime(d) { return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
function fmtDur(min) {
  if (min <= 0) return ''
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

// Curva de energía por hora (pico mañana ~11h y tarde ~16:30h)
function gauss(x, mu, sigma) { return Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) }
function energyAt(h) { return Math.min(1, Math.max(gauss(h, 11, 2.3), 0.55 * gauss(h, 16.5, 2.0))) }
function energyLevel(h) {
  const e = energyAt(h)
  if (e >= 0.72) return { key: 'pico',   label: 'Pico',   color: '#34d399' }
  if (e >= 0.40) return { key: 'activo', label: 'Activo', color: '#60a5fa' }
  return { key: 'bajo', label: 'Suave', color: '#fbbf24' }
}

const PURPLE = 'var(--kairos-purple-500, #7f77dd)'

/* ─── componente ───────────────────────────────────────────── */
export default function DayBlocks({ selectedDay, cards, columnMap }) {
  const proyecto      = useBoardStore(s => s.proyecto)
  const cardsByColumn = useBoardStore(s => s.cardsByColumn)
  const selectCard    = useBoardStore(s => s.selectCard)

  const [eventos, setEventos] = useState([])

  const cardById = useMemo(() => {
    const m = {}
    Object.values(cardsByColumn).flat().forEach(c => { m[c.id] = c })
    return m
  }, [cardsByColumn])

  const load = useCallback(async () => {
    if (!proyecto?.id) { setEventos([]); return }
    const start = new Date(selectedDay); start.setHours(0,0,0,0)
    const end   = new Date(start); end.setDate(end.getDate()+1)
    try { setEventos(await getEventos(proyecto.id, start.toISOString(), end.toISOString())) }
    catch { setEventos([]) }
  }, [proyecto?.id, selectedDay])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    socket.on('calendar:synced', load)
    return () => { socket.off('calendar:synced', load) }
  }, [load])

  const dayKey  = toKey(selectedDay)
  const isToday = dayKey === toKey(today0())

  // Bloques agendados (con hora)
  const scheduled = useMemo(() => {
    return eventos.map(ev => {
      const card  = ev.tarjeta_id ? cardById[ev.tarjeta_id] : null
      const col   = card ? columnMap[card.columna_id] : null
      const start = new Date(ev.fecha_inicio)
      const end   = ev.fecha_fin ? new Date(ev.fecha_fin) : null
      const sH    = start.getHours() + start.getMinutes() / 60
      const durMin = end ? (end - start) / 60000 : 0
      const isGoogle = ev.origen === 'google'
      return {
        id: ev.id, kind: 'evento', title: ev.titulo,
        color: isGoogle ? '#4285F4' : (col?.color || PURPLE), colName: col?.nombre,
        start, end, sH, durMin, cardId: card?.id || null, isGoogle,
      }
    }).sort((a, b) => a.sH - b.sH)
  }, [eventos, cardById, columnMap])

  // Pendientes que vencen hoy y no están agendados
  const scheduledCardIds = useMemo(
    () => new Set(eventos.filter(e => !e.subtarea_id).map(e => e.tarjeta_id).filter(Boolean)),
    [eventos]
  )
  const pendientes = useMemo(() => {
    return cards
      .filter(c => c.fecha_limite === dayKey && !scheduledCardIds.has(c.id))
      .map(c => {
        const col = columnMap[c.columna_id]
        return {
          id: `card-${c.id}`, kind: 'pendiente', title: c.titulo,
          color: col?.color || PURPLE, colName: col?.nombre,
          cardId: c.id, prioridad: c.prioridad,
        }
      })
  }, [cards, dayKey, scheduledCardIds, columnMap])

  const weekday = selectedDay.toLocaleDateString('es-ES', { weekday: 'long' })
  const month   = selectedDay.toLocaleDateString('es-ES', { month: 'long' })
  const total   = scheduled.length + pendientes.length

  function openCard(cardId) {
    const card = cardId && cardById[cardId]
    if (card) selectCard(card)
  }

  return (
    <div className={styles.day}>
      {/* Cabecera */}
      <header className={styles.head}>
        <KairosSeal date={selectedDay} size={64} />
        <div className={styles.headText}>
          <h2 className={styles.date}>
            <span className={styles.weekday}>{weekday}</span>
            <span className={styles.dayNum}>{selectedDay.getDate()}</span>
            <span className={styles.month}>de {month}</span>
            {isToday && <span className={styles.todayTag}>Hoy</span>}
          </h2>
          <p className={styles.summary}>
            {total === 0
              ? 'Día libre — sin bloques ni pendientes.'
              : `${scheduled.length} bloque${scheduled.length === 1 ? '' : 's'}` +
                (pendientes.length ? ` · ${pendientes.length} pendiente${pendientes.length === 1 ? '' : 's'}` : '')}
          </p>
        </div>
      </header>

      {/* Bloques flexibles — apilados sin huecos horarios */}
      <div className={styles.stack}>
        {total === 0 && (
          <div className={styles.empty}>
            <IconConfetti size="1em" />
            <p className={styles.emptyTitle}>Nada agendado este día</p>
            <p className={styles.emptyHint}>
              Ve a <strong>Flujo</strong> y arrastra una tarjeta a tu ventana Kairos, o asígnale fecha desde el Tablero.
            </p>
          </div>
        )}

        {scheduled.map(b => {
          const en = energyLevel(b.sH)
          return (
            <button
              key={b.id}
              className={styles.block}
              style={{ '--accent': b.color }}
              onClick={() => openCard(b.cardId)}
              title={b.isGoogle ? `${b.title} · sincronizado desde Google Calendar` : (b.cardId ? 'Abrir tarjeta' : b.title)}
            >
              <span className={styles.timePill}>
                {fmtTime(b.start)}{b.end && <span className={styles.timeEnd}>{fmtTime(b.end)}</span>}
              </span>
              <span className={styles.accentBar} />
              <div className={styles.body}>
                <span className={styles.title}>
                  {b.isGoogle && <IconBrandGoogle size="0.85em" style={{ marginRight: 4, verticalAlign: -1 }} />}
                  {b.title}
                </span>
                <span className={styles.meta}>
                  {b.colName && <span className={styles.colChip}>{b.colName}</span>}
                  {b.durMin > 0 && <span className={styles.dur}><IconClock size="1em" /> {fmtDur(b.durMin)}</span>}
                </span>
              </div>
              <span className={styles.energy} style={{ '--en': en.color }} title={`Energía: ${en.label}`}>
                <span className={styles.energyDot} /> {en.label}
              </span>
            </button>
          )
        })}

        {pendientes.length > 0 && (
          <div className={styles.pendingGroup}>
            <span className={styles.pendingLabel}><IconFlag size="1em" /> Vence hoy · sin hora</span>
            {pendientes.map(p => (
              <button
                key={p.id}
                className={`${styles.block} ${styles.blockPending}`}
                style={{ '--accent': p.color }}
                onClick={() => openCard(p.cardId)}
                title="Abrir tarjeta"
              >
                <span className={styles.timePill}>Sin hora</span>
                <span className={styles.accentBar} />
                <div className={styles.body}>
                  <span className={styles.title}>{p.title}</span>
                  <span className={styles.meta}>
                    {p.colName && <span className={styles.colChip}>{p.colName}</span>}
                    {p.prioridad === 'alta' && <span className={styles.urgent}><IconAlertTriangle size="1em" /> Alta</span>}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
