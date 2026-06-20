import { create } from 'zustand'
import { getMisProyectos, getBoardByProject, getMyBoard, updateCardColumn, updateCard, createCard, deleteCard, createColumn, updateColumn, deleteColumn } from '../services/boardService'
import { useAuthStore } from './authStore'
import { useToastStore } from './toastStore'
import { socket, joinBoard } from '../services/socketService'
import { saveActividad, getActividad } from '../services/actividadService'

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
  selectedCard: null,
  searchQuery: '',
  loading: true,
  error: null,

  // ── Carga inicial ───────────────────────────────────────────
  loadBoard: async (proyectoId = null) => {
    set({ loading: true, error: null })
    const targetId = proyectoId || localStorage.getItem('kairos-last-project')
    try {
      let proyecto, boardData

      if (targetId) {
        const proyectos = await getMisProyectos()
        proyecto = proyectos.find(p => p.id === targetId) || proyectos[0]
        boardData = await getBoardByProject(proyecto.id)
      } else {
        const data = await getMyBoard()
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

      set({ proyecto, board: boardData.board, columns: boardData.columns, cardsByColumn, loading: false, error: null })

      // Cargar historial de actividad
      getActividad(proyecto.id).then(items => set({ actividad: items })).catch(() => {})

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
      set({ error: err.message, loading: false })
    }
  },

  // ── Lista de proyectos ──────────────────────────────────────
  loadProyectos: async () => {
    const proyectos = await getMisProyectos()
    set({ proyectos })
  },

  // Registrar actividad propia en estado + Supabase
  _log: (descripcion) => {
    const nombre = actor()
    const userId = useAuthStore.getState().user?.id
    const proyectoId = get().proyecto?.id
    const item = makeActItem(nombre, descripcion)
    set(s => ({ actividad: [...s.actividad, item] }))
    if (proyectoId) saveActividad(proyectoId, userId, nombre, descripcion).catch(console.error)
  },

  // ── Tarjetas ────────────────────────────────────────────────
  addCard: async (columnaId, titulo) => {
    const card = await createCard({ columna_id: columnaId, titulo })
    set(s => ({ cardsByColumn: { ...s.cardsByColumn, [columnaId]: [...(s.cardsByColumn[columnaId] || []), card] } }))
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
    try {
      await updateCardColumn(cardId, toCol)
      socket.emit('card:moved', { cardId, fromCol, toCol, cardTitle: cardInfo?.titulo || '', toColName, nombre: actor() })
      get()._log(`movió "${cardInfo?.titulo || ''}"${toColName ? ` a ${toColName}` : ''}`)
    } catch (err) { console.error('Error al mover tarjeta:', err) }
  },

  removeCard: async (cardId, columnaId) => {
    const cardInfo = (get().cardsByColumn[columnaId] || []).find(c => c.id === cardId)
    set(s => ({ cardsByColumn: { ...s.cardsByColumn, [columnaId]: (s.cardsByColumn[columnaId] || []).filter(c => c.id !== cardId) } }))
    await deleteCard(cardId)
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

  editCard: async (cardId, columnaId, fields) => {
    set(s => ({
      selectedCard: s.selectedCard?.id === cardId ? { ...s.selectedCard, ...fields } : s.selectedCard,
      cardsByColumn: { ...s.cardsByColumn, [columnaId]: (s.cardsByColumn[columnaId] || []).map(c => c.id === cardId ? { ...c, ...fields } : c) },
    }))
    try {
      const updated = await updateCard(cardId, fields)
      set(s => ({
        cardsByColumn: { ...s.cardsByColumn, [columnaId]: (s.cardsByColumn[columnaId] || []).map(c => c.id === cardId ? updated : c) },
        selectedCard: s.selectedCard?.id === cardId ? updated : s.selectedCard,
      }))
      socket.emit('card:updated', { cardId, columnaId, fields })
    } catch (err) { console.error('Error al editar tarjeta:', err) }
  },

  // ── Columnas (listas) ───────────────────────────────────────
  addColumn: async (nombre) => {
    const { board, columns } = get()
    if (!board || !nombre?.trim()) return
    try {
      const col = await createColumn({ tablero_id: board.id, nombre: nombre.trim(), orden: columns.length })
      set(s => ({ columns: [...s.columns, col], cardsByColumn: { ...s.cardsByColumn, [col.id]: [] } }))
      socket.emit('column:created', { column: col, nombre: actor() })
      get()._log(`creó la lista "${col.nombre}"`)
    } catch (err) { console.error('Error al crear columna:', err) }
  },

  editColumn: async (id, fields) => {
    set(s => ({ columns: s.columns.map(c => c.id === id ? { ...c, ...fields } : c) }))
    try {
      await updateColumn(id, fields)
      socket.emit('column:updated', { colId: id, fields })
    } catch (err) { console.error('Error al editar columna:', err) }
  },

  removeColumn: async (id) => {
    const colName = get().columns.find(c => c.id === id)?.nombre || ''
    set(s => {
      const next = { ...s.cardsByColumn }
      delete next[id]
      return { columns: s.columns.filter(c => c.id !== id), cardsByColumn: next }
    })
    try {
      await deleteColumn(id)
      socket.emit('column:deleted', { colId: id, colName, nombre: actor() })
      get()._log(`eliminó la lista "${colName}"`)
    } catch (err) { console.error('Error al eliminar columna:', err) }
  },

  reorderColumns: async (orderedIds) => {
    set(s => {
      const byId = Object.fromEntries(s.columns.map(c => [c.id, c]))
      return { columns: orderedIds.map(id => byId[id]).filter(Boolean) }
    })
    try {
      await Promise.all(orderedIds.map((id, i) => updateColumn(id, { orden: i })))
      socket.emit('column:reordered', { orderedIds })
    } catch (err) { console.error('Error al reordenar columnas:', err) }
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
    try {
      const col = await createColumn({ tablero_id: board.id, nombre: `${src.nombre} (copia)`, color: src.color, orden: columns.length })
      const newCards = []
      for (const c of (cardsByColumn[colId] || [])) {
        const card = await createCard({ columna_id: col.id, titulo: c.titulo })
        const fields = {}
        if (c.descripcion)  fields.descripcion = c.descripcion
        if (c.prioridad)    fields.prioridad = c.prioridad
        if (c.fecha_limite) fields.fecha_limite = c.fecha_limite
        let final = card
        if (Object.keys(fields).length) { try { final = await updateCard(card.id, fields) } catch (_) {} }
        newCards.push(final)
      }
      set(s => ({ columns: [...s.columns, col], cardsByColumn: { ...s.cardsByColumn, [col.id]: newCards } }))
      socket.emit('column:created', { column: col, nombre: actor() })
    } catch (err) { console.error('Error al copiar lista:', err) }
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
    try {
      const cards = get().cardsByColumn[colId] || []
      await Promise.all(cards.map((c, i) => updateCard(c.id, { orden: i })))
    } catch (err) { console.error('Error al ordenar tarjetas:', err) }
  },

  setCardsByColumn: (cardsByColumn) => set({ cardsByColumn }),

  persistMove: async (cardId, newColId, fromCol) => {
    try {
      const state = get()
      const cardInfo = (state.cardsByColumn[newColId] || []).find(c => c.id === cardId)
      const toColName = state.columns.find(c => c.id === newColId)?.nombre || ''
      await updateCardColumn(cardId, newColId)
      if (fromCol) {
        socket.emit('card:moved', { cardId, fromCol, toCol: newColId, cardTitle: cardInfo?.titulo || '', toColName, nombre: actor() })
        get()._log(`movió "${cardInfo?.titulo || ''}"${toColName ? ` a ${toColName}` : ''}`)
      }
    } catch (err) { console.error('Error al mover tarjeta:', err) }
  },
}))
