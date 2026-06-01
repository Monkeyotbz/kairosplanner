import { create } from 'zustand'
import { getMisProyectos, getBoardByProject, getMyBoard, updateCardColumn, updateCard, createCard, deleteCard } from '../services/boardService'

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
    try {
      let proyecto, boardData

      if (proyectoId) {
        const proyectos = await getMisProyectos()
        proyecto = proyectos.find(p => p.id === proyectoId) || proyectos[0]
        boardData = await getBoardByProject(proyecto.id)
      } else {
        const data = await getMyBoard()
        if (!data) { set({ loading: false, error: 'empty' }); return }
        ({ proyecto, ...boardData } = data)
      }

      if (!boardData) { set({ loading: false, error: 'empty' }); return }

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
    try {
      const updated = await updateCard(cardId, fields)
      set(s => ({
        cardsByColumn: {
          ...s.cardsByColumn,
          [columnaId]: (s.cardsByColumn[columnaId] || []).map(c => c.id === cardId ? updated : c),
        },
        selectedCard: updated,
      }))
    } catch (err) {
      console.error('Error al editar tarjeta:', err)
    }
  },

  setCardsByColumn: (cardsByColumn) => set({ cardsByColumn }),

  persistMove: async (cardId, newColId) => {
    try { await updateCardColumn(cardId, newColId) }
    catch (err) { console.error('Error al mover tarjeta:', err) }
  },
}))
