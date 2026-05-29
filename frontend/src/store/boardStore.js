import { create } from 'zustand'
import { getMyBoard, updateCardColumn } from '../services/boardService'

export const useBoardStore = create((set, get) => ({
  proyecto: null,
  board: null,
  columns: [],
  cardsByColumn: {},
  loading: true,
  error: null,

  loadBoard: async () => {
    set({ loading: true, error: null })
    try {
      const data = await getMyBoard()
      if (!data) { set({ loading: false, error: 'No se encontró ningún tablero.' }); return }

      const cardsByColumn = {}
      data.columns.forEach(col => { cardsByColumn[col.id] = [] })
      data.cards.forEach(card => {
        if (cardsByColumn[card.columna_id]) cardsByColumn[card.columna_id].push(card)
      })

      set({ proyecto: data.proyecto, board: data.board, columns: data.columns, cardsByColumn, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  setCardsByColumn: (cardsByColumn) => set({ cardsByColumn }),

  persistMove: async (cardId, newColId) => {
    try {
      await updateCardColumn(cardId, newColId)
    } catch (err) {
      console.error('Error al mover tarjeta:', err)
    }
  },
}))
