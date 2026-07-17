import { create } from 'zustand'
import { getMisProyectos, getBoardByProject, getMyBoard, deleteProject, getProyectoEtiquetas } from '../services/boardService'
import { withRetry, isTimeoutError } from '../services/supabase'
import { enqueue, flush, hasPending } from '../services/syncQueue'
import { onReconnect, isOnline } from '../services/connection'
import { useAuthStore } from './authStore'
import { useToastStore } from './toastStore'
import { socket, joinBoard } from '../services/socketService'
import { getActividad, saveActividad } from '../services/actividadService'

// Reintento automático de carga: si loadBoard falla, se reprograma solo con
// backoff (5s, 10s... máx 30s) — el usuario nunca tiene que recargar a mano.
let _retryTimer = null
let _retryAttempt = 0
let _loadedAt = 0

function actor() {
  const { nombre, email } = useAuthStore.getState().profile ?? {}
  return nombre || email || 'Alguien'
}

function notify(icon, text) {
  useToastStore.getState().addToast({ _type: 'board-activity', icon, text, duration: 4000 })
}

function makeActItem(nombre, descripcion) {
  return { id: `${Date.now()}-${Math.random()}`, nombre_usuario: nombre, descripcion, created_at: new Date().toISOString() }
}

export const useBoardStore = create((set, get) => ({
  proyectos: [],
  proyecto: null,
  board: null,
  columns: [],
  cardsByColumn: {},
  actividad: [],
  etiquetas: [],
  selectedCard: null,
  searchQuery: '',
  loading: true,
  error: null,

  // ── Carga inicial ───────────────────────────────────────────
  loadBoard: async (proyectoId = null) => {
    set({ loading: true, error: null })
    const targetId = proyectoId || localStorage.getItem('kairos-last-project')
    try {
      // Cambios locales pendientes primero: si leyéramos antes de vaciar la
      // cola, el servidor devolvería datos viejos y pisaría la UI optimista.
      if (hasPending() && isOnline()) await flush()

      let proyecto, boardData

      if (targetId) {
        const proyectos = await withRetry(() => getMisProyectos(), { ms: 12000, label: 'getMisProyectos' })
        if (!proyectos.length) { set({ loading: false, error: 'empty' }); return }
        proyecto = proyectos.find(p => p.id === targetId) || proyectos[0]
        boardData = await withRetry(() => getBoardByProject(proyecto.id), { ms: 12000, label: 'getBoardByProject' })
      } else {
        const data = await withRetry(() => getMyBoard(), { ms: 12000, label: 'getMyBoard' })
        if (!data) { set({ loading: false, error: 'empty' }); return }
        ;({ proyecto, ...boardData } = data)
      }

      if (!boardData) { set({ loading: false, error: 'empty' }); return }

      if (proyecto?.id) localStorage.setItem('kairos-last-project', proyecto.id)

      const cardsByColumn = {}
      boardData.columns.forEach(col => { cardsByColumn[col.id] = [] })
      boardData.cards.forEach(card => {
        if (cardsByColumn[card.columna_id]) cardsByColumn[card.columna_id].push(card)
      })

      clearTimeout(_retryTimer)
      _retryAttempt = 0
      _loadedAt = Date.now()
      set({ proyecto, board: boardData.board, columns: boardData.columns, cardsByColumn, loading: false, error: null })

      // Cargar historial de actividad
      getActividad(proyecto.id).then(items => set({ actividad: items })).catch(() => {})

      // Cargar etiquetas del proyecto (para FilterPanel y LabelPicker)
      getProyectoEtiquetas(proyecto.id).then(items => set({ etiquetas: items })).catch(() => {})

      // ── Unirse a la sala de Socket.io ──
      const { nombre, email } = useAuthStore.getState().profile ?? {}
      joinBoard(proyecto.id, nombre || email || 'Anónimo')

      // ── Escuchar eventos de otros usuarios ──
      socket.off('card:created').on('card:created', ({ columnaId, card, colName, nombre }) => {
        const item = makeActItem(nombre, `creó "${card.titulo}"${colName ? ` en ${colName}` : ''}`)
        set(s => ({
          cardsByColumn: { ...s.cardsByColumn, [columnaId]: [...(s.cardsByColumn[columnaId] ?? []), card] },
          actividad: [...s.actividad, item],
        }))
        notify('ti-plus', `${nombre} ${item.descripcion}`)
      })

      socket.off('card:moved').on('card:moved', ({ cardId, fromCol, toCol, cardTitle, toColName, nombre }) => {
        const item = makeActItem(nombre, `movió "${cardTitle}"${toColName ? ` a ${toColName}` : ''}`)
        set(s => {
          const card = (s.cardsByColumn[fromCol] ?? []).find(c => c.id === cardId)
          if (!card) return { actividad: [...s.actividad, item] }
          return {
            cardsByColumn: {
              ...s.cardsByColumn,
              [fromCol]: (s.cardsByColumn[fromCol] ?? []).filter(c => c.id !== cardId),
              [toCol]:   [...(s.cardsByColumn[toCol] ?? []), { ...card, columna_id: toCol }],
            },
            actividad: [...s.actividad, item],
          }
        })
        notify('ti-arrows-move', `${nombre} ${item.descripcion}`)
      })

      socket.off('card:updated').on('card:updated', ({ cardId, columnaId, fields }) => {
        set(s => ({
          cardsByColumn: {
            ...s.cardsByColumn,
            [columnaId]: (s.cardsByColumn[columnaId] ?? []).map(c =>
              c.id === cardId ? { ...c, ...fields } : c
            ),
          },
        }))
      })

      socket.off('card:deleted').on('card:deleted', ({ cardId, columnaId, cardTitle, nombre }) => {
        const item = makeActItem(nombre, `eliminó "${cardTitle}"`)
        set(s => ({
          cardsByColumn: { ...s.cardsByColumn, [columnaId]: (s.cardsByColumn[columnaId] ?? []).filter(c => c.id !== cardId) },
          actividad: [...s.actividad, item],
        }))
        notify('ti-trash', `${nombre} ${item.descripcion}`)
      })

      socket.off('column:created').on('column:created', ({ column, nombre }) => {
        const item = makeActItem(nombre, `creó la lista "${column.nombre}"`)
        set(s => ({
          columns: [...s.columns, column],
          cardsByColumn: { ...s.cardsByColumn, [column.id]: [] },
          actividad: [...s.actividad, item],
        }))
        notify('ti-layout-columns', `${nombre} ${item.descripcion}`)
      })

      socket.off('column:updated').on('column:updated', ({ colId, fields }) => {
        set(s => ({ columns: s.columns.map(c => c.id === colId ? { ...c, ...fields } : c) }))
      })

      socket.off('column:deleted').on('column:deleted', ({ colId, colName, nombre }) => {
        const item = makeActItem(nombre, `eliminó la lista "${colName}"`)
        set(s => {
          const next = { ...s.cardsByColumn }
          delete next[colId]
          return { columns: s.columns.filter(c => c.id !== colId), cardsByColumn: next, actividad: [...s.actividad, item] }
        })
        notify('ti-trash', `${nombre} ${item.descripcion}`)
      })

      socket.off('column:reordered').on('column:reordered', ({ orderedIds }) => {
        set(s => ({ columns: orderedIds.map(id => s.columns.find(c => c.id === id)).filter(Boolean) }))
      })

    } catch (err) {
      console.error('Error al cargar tablero:', err)

      // Reprogramar reintento automático con backoff
      _retryAttempt++
      clearTimeout(_retryTimer)
      _retryTimer = setTimeout(() => {
        const s = get()
        if (!s.loading && s.error && s.error !== 'empty') s.loadBoard(proyectoId)
      }, Math.min(5000 * _retryAttempt, 30000))

      // Si ya hay un tablero en pantalla, no lo tapamos con un error:
      // se sigue trabajando con la copia local y la cola sincroniza después.
      if (get().board) {
        set({ loading: false })
        return
      }
      const message = isTimeoutError(err)
        ? 'Sin conexión con la base de datos.'
        : err.message
      set({ error: message, loading: false })
    }
  },

  // ── Lista de proyectos ──────────────────────────────────────
  loadProyectos: async () => {
    const proyectos = await getMisProyectos()
    set({ proyectos })
  },

  // Registra una etiqueta recién creada (LabelPicker) para que el
  // FilterPanel la vea sin tener que recargar el tablero.
  addEtiqueta: (etiqueta) => set(s => ({ etiquetas: [...s.etiquetas, etiqueta] })),

  // Registrar actividad propia en estado + Supabase
  _log: (descripcion) => {
    const nombre = actor()
    const userId = useAuthStore.getState().user?.id
    const proyectoId = get().proyecto?.id
    const item = makeActItem(nombre, descripcion)
    set(s => ({ actividad: [...s.actividad, item] }))
    if (proyectoId) saveActividad(proyectoId, userId, nombre, descripcion).catch(console.error)
  },

  // Elimina un proyecto/tablero por completo (cascade en Supabase)
  removeProyecto: async (proyectoId) => {
    await deleteProject(proyectoId)
    const { proyecto, proyectos } = get()
    const restantes = proyectos.filter(p => p.id !== proyectoId)
    set({ proyectos: restantes })

    if (proyecto?.id === proyectoId) {
      localStorage.removeItem('kairos-last-project')
      if (restantes.length) {
        await get().loadBoard(restantes[0].id)
      } else {
        set({ proyecto: null, board: null, columns: [], cardsByColumn: {}, error: 'empty' })
      }
    }
  },

  // ── Tarjetas ────────────────────────────────────────────────
  // Todas las mutaciones son locales al instante y se persisten vía la cola
  // de sincronización (syncQueue) — funcionan aun sin conexión.
  addCard: async (columnaId, titulo) => {
    const row = { id: crypto.randomUUID(), columna_id: columnaId, titulo, orden: 9999 }
    enqueue('card.create', { row })
    const card = { ...row, labels: [], subtaskTotal: 0, subtaskDone: 0 }
    set(s => ({
      cardsByColumn: {
        ...s.cardsByColumn,
        [columnaId]: [...(s.cardsByColumn[columnaId] || []), card],
      },
    }))
    const colName = get().columns.find(c => c.id === columnaId)?.nombre || ''
    socket.emit('card:created', { columnaId, card, colName, nombre: actor() })
    get()._log(`creó "${card.titulo}"${colName ? ` en ${colName}` : ''}`)
    return card
  },

  moveCardToColumn: async (cardId, fromCol, toCol) => {
    if (fromCol === toCol) return
    const state = get()
    const cardInfo = (state.cardsByColumn[fromCol] || []).find(c => c.id === cardId)
    const toColName = state.columns.find(c => c.id === toCol)?.nombre || ''
    set(s => {
      const card = (s.cardsByColumn[fromCol] || []).find(c => c.id === cardId)
      if (!card) return {}
      return {
        cardsByColumn: {
          ...s.cardsByColumn,
          [fromCol]: (s.cardsByColumn[fromCol] || []).filter(c => c.id !== cardId),
          [toCol]: [...(s.cardsByColumn[toCol] || []), { ...card, columna_id: toCol }],
        },
      }
    })
    enqueue('card.move', { id: cardId, columna_id: toCol })
    socket.emit('card:moved', { cardId, fromCol, toCol, cardTitle: cardInfo?.titulo || '', toColName, nombre: actor() })
    get()._log(`movió "${cardInfo?.titulo || ''}"${toColName ? ` a ${toColName}` : ''}`)
  },

  removeCard: async (cardId, columnaId) => {
    const cardInfo = (get().cardsByColumn[columnaId] || []).find(c => c.id === cardId)
    set(s => ({
      cardsByColumn: {
        ...s.cardsByColumn,
        [columnaId]: (s.cardsByColumn[columnaId] || []).filter(c => c.id !== cardId),
      },
    }))
    enqueue('card.delete', { id: cardId })
    socket.emit('card:deleted', { cardId, columnaId, cardTitle: cardInfo?.titulo || '', nombre: actor() })
    get()._log(`eliminó "${cardInfo?.titulo || ''}"`)
  },

  selectCard: (card) => set({ selectedCard: card }),
  clearSelectedCard: () => set({ selectedCard: null }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  updateSelectedCardLabels: (labels) => {
    const card = get().selectedCard
    if (!card) return
    set(s => ({
      selectedCard: { ...card, labels },
      cardsByColumn: {
        ...s.cardsByColumn,
        [card.columna_id]: (s.cardsByColumn[card.columna_id] || []).map(c => c.id === card.id ? { ...c, labels } : c),
      },
    }))
  },

  // Mantiene subtaskDone/subtaskTotal en sync con el checklist real, para
  // que el filtro de "Subtareas" y el chip de la tarjeta no queden
  // desactualizados hasta recargar el tablero.
  updateSelectedCardSubtasks: (subtaskDone, subtaskTotal) => {
    const card = get().selectedCard
    if (!card) return
    set(s => ({
      selectedCard: { ...card, subtaskDone, subtaskTotal },
      cardsByColumn: {
        ...s.cardsByColumn,
        [card.columna_id]: (s.cardsByColumn[card.columna_id] || []).map(c =>
          c.id === card.id ? { ...c, subtaskDone, subtaskTotal } : c
        ),
      },
    }))
  },

  editCard: async (cardId, columnaId, fields) => {
    // Optimistic update — la cola persiste en segundo plano
    set(s => ({
      selectedCard: s.selectedCard?.id === cardId ? { ...s.selectedCard, ...fields } : s.selectedCard,
      cardsByColumn: { ...s.cardsByColumn, [columnaId]: (s.cardsByColumn[columnaId] || []).map(c => c.id === cardId ? { ...c, ...fields } : c) },
    }))
    enqueue('card.update', { id: cardId, fields })
    socket.emit('card:updated', { cardId, columnaId, fields })
  },

  // ── Columnas (listas) ───────────────────────────────────────
  addColumn: async (nombre) => {
    const { board, columns } = get()
    if (!board || !nombre?.trim()) return
    const row = { id: crypto.randomUUID(), tablero_id: board.id, nombre: nombre.trim(), color: '#534AB7', orden: columns.length }
    enqueue('column.create', { row })
    set(s => ({
      columns: [...s.columns, row],
      cardsByColumn: { ...s.cardsByColumn, [row.id]: [] },
    }))
    socket.emit('column:created', { column: row, nombre: actor() })
    get()._log(`creó la lista "${row.nombre}"`)
  },

  editColumn: async (id, fields) => {
    set(s => ({ columns: s.columns.map(c => c.id === id ? { ...c, ...fields } : c) }))
    enqueue('column.update', { id, fields })
    socket.emit('column:updated', { colId: id, fields })
  },

  removeColumn: async (id) => {
    const colName = get().columns.find(c => c.id === id)?.nombre || ''
    set(s => {
      const next = { ...s.cardsByColumn }
      delete next[id]
      return { columns: s.columns.filter(c => c.id !== id), cardsByColumn: next }
    })
    enqueue('column.delete', { id })
    socket.emit('column:deleted', { colId: id, colName, nombre: actor() })
    get()._log(`eliminó la lista "${colName}"`)
  },

  reorderColumns: async (orderedIds) => {
    set(s => {
      const byId = Object.fromEntries(s.columns.map(c => [c.id, c]))
      return { columns: orderedIds.map(id => byId[id]).filter(Boolean) }
    })
    orderedIds.forEach((id, i) => enqueue('column.update', { id, fields: { orden: i } }))
    socket.emit('column:reordered', { orderedIds })
  },

  moveColumn: (colId, dir) => {
    const { columns, reorderColumns } = get()
    const idx = columns.findIndex(c => c.id === colId)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= columns.length) return
    const ids = columns.map(c => c.id)
    ;[ids[idx], ids[j]] = [ids[j], ids[idx]]
    reorderColumns(ids)
  },

  duplicateColumn: async (colId) => {
    const { board, columns, cardsByColumn } = get()
    const src = columns.find(c => c.id === colId)
    if (!board || !src) return
    const col = { id: crypto.randomUUID(), tablero_id: board.id, nombre: `${src.nombre} (copia)`, color: src.color, orden: columns.length }
    enqueue('column.create', { row: col })
    const newCards = (cardsByColumn[colId] || []).map((c, i) => {
      const row = { id: crypto.randomUUID(), columna_id: col.id, titulo: c.titulo, orden: i }
      if (c.descripcion)  row.descripcion = c.descripcion
      if (c.prioridad)    row.prioridad = c.prioridad
      if (c.fecha_limite) row.fecha_limite = c.fecha_limite
      enqueue('card.create', { row })
      return { ...row, labels: [], subtaskTotal: 0, subtaskDone: 0 }
    })
    set(s => ({
      columns: [...s.columns, col],
      cardsByColumn: { ...s.cardsByColumn, [col.id]: newCards },
    }))
    socket.emit('column:created', { column: col, nombre: actor() })
  },

  sortColumnCards: async (colId, by) => {
    const PRIO = { alta: 0, normal: 1, baja: 2 }
    set(s => {
      const cards = [...(s.cardsByColumn[colId] || [])]
      cards.sort((a, b) => {
        if (by === 'nombre')    return (a.titulo || '').localeCompare(b.titulo || '')
        if (by === 'prioridad') return (PRIO[a.prioridad] ?? 1) - (PRIO[b.prioridad] ?? 1)
        if (by === 'fecha')     return (a.fecha_limite || '9999-99-99').localeCompare(b.fecha_limite || '9999-99-99')
        return 0
      })
      return { cardsByColumn: { ...s.cardsByColumn, [colId]: cards } }
    })
    const cards = get().cardsByColumn[colId] || []
    cards.forEach((c, i) => enqueue('card.update', { id: c.id, fields: { orden: i } }))
  },

  setCardsByColumn: (cardsByColumn) => set({ cardsByColumn }),

  persistMove: async (cardId, newColId, fromCol) => {
    const state = get()
    const cardInfo = (state.cardsByColumn[newColId] || []).find(c => c.id === cardId)
    const toColName = state.columns.find(c => c.id === newColId)?.nombre || ''
    enqueue('card.move', { id: cardId, columna_id: newColId })
    if (fromCol) {
      socket.emit('card:moved', { cardId, fromCol, toCol: newColId, cardTitle: cardInfo?.titulo || '', toColName, nombre: actor() })
      get()._log(`movió "${cardInfo?.titulo || ''}"${toColName ? ` a ${toColName}` : ''}`)
    }
  },
}))

// Al recuperar conexión o foco: recargar solo si hay error visible o si los
// datos llevan >5 min sin refrescarse (la cola ya se vació sola en syncQueue).
onReconnect(() => {
  const s = useBoardStore.getState()
  if (s.loading) return
  const stale = _loadedAt > 0 && Date.now() - _loadedAt > 5 * 60_000
  if ((s.error && s.error !== 'empty') || stale) s.loadBoard()
})
