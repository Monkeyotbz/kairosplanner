import { create } from 'zustand'
import {
  getMisProyectos, getBoardByProject, getMyBoard, deleteProject, getProyectoEtiquetas,
  marcarComentariosLeidos, iniciarRegistroTiempo, detenerRegistroTiempo,
  getRegistroTiempoActivo, stopRegistroTiempoBeacon,
} from '../services/boardService'
import { withRetry, isTimeoutError } from '../services/supabase'
import { enqueue, flush, hasPending } from '../services/syncQueue'
import { onReconnect, isOnline } from '../services/connection'

// Reintento automático de carga: si loadBoard falla, se reprograma solo con
// backoff (5s, 10s... máx 30s) — el usuario nunca tiene que recargar a mano.
let _retryTimer = null
let _retryAttempt = 0
let _loadedAt = 0

export const useBoardStore = create((set, get) => ({
  proyectos: [],
  proyecto: null,
  board: null,
  columns: [],
  cardsByColumn: {},
  etiquetas: [],
  selectedCard: null,
  searchQuery: '',
  loading: true,
  error: null,
  // Cronómetro de tiempo activo (a lo mucho uno por usuario a la vez).
  // Vive en el store, no en CardTimeTracker, para que la cápsula flotante
  // lo muestre aunque hayas cerrado la tarjeta.
  activeTimer: null, // { registroId, cardId, cardTitulo, columnaId, inicio }

  // ── Carga inicial ───────────────────────────────────────────
  loadBoard: async (proyectoId = null) => {
    set({ loading: true, error: null })
    // Memoria: si no se indica proyecto, retomar el último activo
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

      clearTimeout(_retryTimer)
      _retryAttempt = 0
      _loadedAt = Date.now()
      set({ proyecto, board: boardData.board, columns: boardData.columns, cardsByColumn, loading: false, error: null })

      // Etiquetas del proyecto — las usa el FilterPanel (y LabelPicker las
      // registra al crear). No bloquea la carga del tablero.
      getProyectoEtiquetas(proyecto.id).then(items => set({ etiquetas: items })).catch(() => {})

      // Retomar un cronómetro que quedó corriendo (cierre de pestaña, F5…)
      getRegistroTiempoActivo().then(registro => {
        if (!registro) return
        const card = Object.values(get().cardsByColumn).flat().find(c => c.id === registro.tarjeta_id)
        set({
          activeTimer: {
            registroId: registro.id,
            cardId: registro.tarjeta_id,
            cardTitulo: registro.tarjetas?.titulo || card?.titulo || 'Tarjeta',
            columnaId: card?.columna_id || null,
            inicio: registro.inicio,
          },
        })
      }).catch(() => {})
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
    enqueue('card.move', { id: cardId, columna_id: toCol })
  },

  removeCard: async (cardId, columnaId) => {
    set(s => ({
      cardsByColumn: {
        ...s.cardsByColumn,
        [columnaId]: (s.cardsByColumn[columnaId] || []).filter(c => c.id !== cardId),
      },
    }))
    enqueue('card.delete', { id: cardId })
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

  // Marca los comentarios de la tarjeta como leídos: persiste en Supabase
  // y limpia el indicador localmente al instante.
  markCardCommentsRead: (cardId) => {
    marcarComentariosLeidos(cardId).catch(console.error)
    const card = get().selectedCard
    set(s => ({
      selectedCard: card?.id === cardId ? { ...card, unreadComments: false } : card,
      cardsByColumn: Object.fromEntries(
        Object.entries(s.cardsByColumn).map(([colId, cards]) => [
          colId,
          cards.map(c => c.id === cardId ? { ...c, unreadComments: false } : c),
        ])
      ),
    }))
  },

  // Cronómetro por tarjeta — vive acá (no en CardTimeTracker) para que siga
  // corriendo y la cápsula flotante lo muestre aunque cierres la tarjeta.
  startCardTimer: async (cardId) => {
    if (get().activeTimer) return // ya hay uno corriendo — hay que detenerlo primero
    const card = Object.values(get().cardsByColumn).flat().find(c => c.id === cardId)
    if (!card) return
    const row = await iniciarRegistroTiempo(cardId)
    set({
      activeTimer: {
        registroId: row.id,
        cardId,
        cardTitulo: card.titulo,
        columnaId: card.columna_id,
        inicio: row.inicio,
      },
    })
  },

  stopCardTimer: async () => {
    const timer = get().activeTimer
    if (!timer) return
    const row = await detenerRegistroTiempo(timer.registroId)
    set({ activeTimer: null })
    const card = (get().cardsByColumn[timer.columnaId] || []).find(c => c.id === timer.cardId)
    const nextTotal = (card?.tiempoTotalSeg || 0) + (row.segundos_totales || 0)
    set(s => ({
      selectedCard: s.selectedCard?.id === timer.cardId ? { ...s.selectedCard, tiempoTotalSeg: nextTotal } : s.selectedCard,
      cardsByColumn: {
        ...s.cardsByColumn,
        [timer.columnaId]: (s.cardsByColumn[timer.columnaId] || []).map(c =>
          c.id === timer.cardId ? { ...c, tiempoTotalSeg: nextTotal } : c
        ),
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
    enqueue('card.update', { id: cardId, fields })
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
  },

  editColumn: async (id, fields) => {
    set(s => ({ columns: s.columns.map(c => c.id === id ? { ...c, ...fields } : c) }))
    enqueue('column.update', { id, fields })
  },

  removeColumn: async (id) => {
    set(s => {
      const next = { ...s.cardsByColumn }
      delete next[id]
      return { columns: s.columns.filter(c => c.id !== id), cardsByColumn: next }
    })
    enqueue('column.delete', { id })
  },

  // Reordenar columnas por lista de ids (drag o menú)
  reorderColumns: async (orderedIds) => {
    set(s => {
      const byId = Object.fromEntries(s.columns.map(c => [c.id, c]))
      return { columns: orderedIds.map(id => byId[id]).filter(Boolean) }
    })
    orderedIds.forEach((id, i) => enqueue('column.update', { id, fields: { orden: i } }))
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
    const cards = get().cardsByColumn[colId] || []
    cards.forEach((c, i) => enqueue('card.update', { id: c.id, fields: { orden: i } }))
  },

  setCardsByColumn: (cardsByColumn) => set({ cardsByColumn }),

  persistMove: async (cardId, newColId) => {
    enqueue('card.move', { id: cardId, columna_id: newColId })
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

// Si cierras la pestaña/navegador con un cronómetro corriendo, lo detenemos
// para que no siga contando tiempo con KAIROS cerrado. Un cierre forzado o
// un corte de energía no avisan — para eso está el "retomar" al cargar el
// tablero (arriba), que no deja cronómetros huérfanos corriendo por siempre.
if (typeof window !== 'undefined') {
  const stopIfRunning = () => {
    const timer = useBoardStore.getState().activeTimer
    if (timer) stopRegistroTiempoBeacon(timer.registroId)
  }
  window.addEventListener('pagehide', stopIfRunning)
  window.addEventListener('beforeunload', stopIfRunning)
}
