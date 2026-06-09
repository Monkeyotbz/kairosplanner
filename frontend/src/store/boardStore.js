import { create } from 'zustand'
import { getMisProyectos, getBoardByProject, getMyBoard, updateCardColumn, updateCard, createCard, deleteCard, createColumn, updateColumn, deleteColumn } from '../services/boardService'

export const useBoardStore = create((set, get) => ({
  proyectos: [],
  proyecto: null,
  board: null,
  columns: [],
  cardsByColumn: {},
  selectedCard: null,
  searchQuery: '',
  loading: true,
  error: null,

  // ── Carga inicial ───────────────────────────────────────────
  loadBoard: async (proyectoId = null) => {
    set({ loading: true, error: null })
    // Memoria: si no se indica proyecto, retomar el último activo
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
        ({ proyecto, ...boardData } = data)
      }

      if (!boardData) { set({ loading: false, error: 'empty' }); return }

      // Persistir el proyecto activo para la próxima sesión
      if (proyecto?.id) localStorage.setItem('kairos-last-project', proyecto.id)

      const cardsByColumn = {}
      boardData.columns.forEach(col => { cardsByColumn[col.id] = [] })
      boardData.cards.forEach(card => {
        if (cardsByColumn[card.columna_id]) cardsByColumn[card.columna_id].push(card)
      })

      set({ proyecto, board: boardData.board, columns: boardData.columns, cardsByColumn, loading: false, error: null })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  // ── Lista de proyectos ──────────────────────────────────────
  loadProyectos: async () => {
    const proyectos = await getMisProyectos()
    set({ proyectos })
  },

  // ── Tarjetas ────────────────────────────────────────────────
  addCard: async (columnaId, titulo) => {
    const card = await createCard({ columna_id: columnaId, titulo })
    set(s => ({
      cardsByColumn: {
        ...s.cardsByColumn,
        [columnaId]: [...(s.cardsByColumn[columnaId] || []), card],
      },
    }))
    return card
  },

  // Mover una tarjeta entre columnas por id (usado por ABAD y futuras acciones)
  moveCardToColumn: async (cardId, fromCol, toCol) => {
    if (fromCol === toCol) return
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
    try { await updateCardColumn(cardId, toCol) }
    catch (err) { console.error('Error al mover tarjeta:', err) }
  },

  removeCard: async (cardId, columnaId) => {
    set(s => ({
      cardsByColumn: {
        ...s.cardsByColumn,
        [columnaId]: (s.cardsByColumn[columnaId] || []).filter(c => c.id !== cardId),
      },
    }))
    await deleteCard(cardId)
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
        [card.columna_id]: (s.cardsByColumn[card.columna_id] || []).map(
          c => c.id === card.id ? { ...c, labels } : c
        ),
      },
    }))
  },

  editCard: async (cardId, columnaId, fields) => {
    // Optimistic update — refresca la UI antes de la respuesta de Supabase
    set(s => ({
      selectedCard: s.selectedCard?.id === cardId
        ? { ...s.selectedCard, ...fields }
        : s.selectedCard,
      cardsByColumn: {
        ...s.cardsByColumn,
        [columnaId]: (s.cardsByColumn[columnaId] || []).map(c =>
          c.id === cardId ? { ...c, ...fields } : c
        ),
      },
    }))
    try {
      const updated = await updateCard(cardId, fields)
      set(s => ({
        cardsByColumn: {
          ...s.cardsByColumn,
          [columnaId]: (s.cardsByColumn[columnaId] || []).map(c => c.id === cardId ? updated : c),
        },
        selectedCard: s.selectedCard?.id === cardId ? updated : s.selectedCard,
      }))
    } catch (err) {
      console.error('Error al editar tarjeta:', err)
    }
  },

  // ── Columnas (listas) ───────────────────────────────────────
  addColumn: async (nombre) => {
    const { board, columns } = get()
    if (!board || !nombre?.trim()) return
    try {
      const col = await createColumn({ tablero_id: board.id, nombre: nombre.trim(), orden: columns.length })
      set(s => ({
        columns: [...s.columns, col],
        cardsByColumn: { ...s.cardsByColumn, [col.id]: [] },
      }))
    } catch (err) { console.error('Error al crear columna:', err) }
  },

  editColumn: async (id, fields) => {
    // Optimista
    set(s => ({ columns: s.columns.map(c => c.id === id ? { ...c, ...fields } : c) }))
    try { await updateColumn(id, fields) }
    catch (err) { console.error('Error al editar columna:', err) }
  },

  removeColumn: async (id) => {
    set(s => {
      const next = { ...s.cardsByColumn }
      delete next[id]
      return { columns: s.columns.filter(c => c.id !== id), cardsByColumn: next }
    })
    try { await deleteColumn(id) }
    catch (err) { console.error('Error al eliminar columna:', err) }
  },

  // Reordenar columnas por lista de ids (drag o menú)
  reorderColumns: async (orderedIds) => {
    set(s => {
      const byId = Object.fromEntries(s.columns.map(c => [c.id, c]))
      return { columns: orderedIds.map(id => byId[id]).filter(Boolean) }
    })
    try { await Promise.all(orderedIds.map((id, i) => updateColumn(id, { orden: i }))) }
    catch (err) { console.error('Error al reordenar columnas:', err) }
  },

  // Mover una columna una posición (-1 izquierda, +1 derecha)
  moveColumn: (colId, dir) => {
    const { columns, reorderColumns } = get()
    const idx = columns.findIndex(c => c.id === colId)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= columns.length) return
    const ids = columns.map(c => c.id)
    ;[ids[idx], ids[j]] = [ids[j], ids[idx]]
    reorderColumns(ids)
  },

  // Duplicar una columna con sus tarjetas
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
      set(s => ({
        columns: [...s.columns, col],
        cardsByColumn: { ...s.cardsByColumn, [col.id]: newCards },
      }))
    } catch (err) { console.error('Error al copiar lista:', err) }
  },

  // Ordenar las tarjetas de una columna (fecha | prioridad | nombre)
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

  persistMove: async (cardId, newColId) => {
    try { await updateCardColumn(cardId, newColId) }
    catch (err) { console.error('Error al mover tarjeta:', err) }
  },
}))
