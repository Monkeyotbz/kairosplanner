// ============================================================
// Cola de escrituras persistente (patrón Trello/Monday).
//
// Toda mutación del tablero se aplica a la UI al instante y se
// encola aquí. La cola vive en localStorage: sobrevive a F5, a
// cerrar la pestaña y a quedarse sin conexión. Un loop en segundo
// plano la vacía contra Supabase con backoff exponencial y se
// dispara de nuevo al recuperar red o foco (connection.js).
// ============================================================
import { supabase, isTimeoutError, withTimeout } from './supabase'
import { onReconnect } from './connection'
import { useSyncStore } from '../store/syncStore'
import { useToastStore } from '../store/toastStore'

const LS_KEY = 'kairos-sync-queue'
const MAX_DELAY = 30_000
const OP_TIMEOUT = 10_000

// ── Operaciones soportadas ───────────────────────────────────
// Escrituras mínimas e idempotentes: los INSERT llevan id generado
// en el cliente (crypto.randomUUID), así reintentar tras un éxito
// parcial produce un 23505 (duplicado) que tratamos como éxito.
const OPS = {
  'card.create':   async ({ row }) => run(supabase.from('tarjetas').insert(row)),
  'card.update':   async ({ id, fields }) => run(supabase.from('tarjetas').update(fields).eq('id', id)),
  'card.move':     async ({ id, columna_id }) => run(supabase.from('tarjetas').update({ columna_id }).eq('id', id)),
  'card.delete':   async ({ id }) => run(supabase.from('tarjetas').delete().eq('id', id)),
  'column.create': async ({ row }) => run(supabase.from('columnas').insert(row)),
  'column.update': async ({ id, fields }) => run(supabase.from('columnas').update(fields).eq('id', id)),
  'column.delete': async ({ id }) => run(supabase.from('columnas').delete().eq('id', id)),
}

async function run(query) {
  const { error } = await withTimeout(query, OP_TIMEOUT, 'syncQueue')
  if (error) throw error
}

// ── Persistencia ─────────────────────────────────────────────
function loadQueue() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '[]')
    return Array.isArray(raw) ? raw.filter(it => OPS[it.op]) : []
  } catch { return [] }
}
function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(queue)) } catch (_) {}
}

let queue = loadQueue()
let flushing = false
let retryTimer = null
let attempt = 0

function syncStatus(phase) {
  useSyncStore.getState()._update(queue.length, phase ?? (queue.length ? 'waiting' : 'idle'))
}

// ── Clasificación de errores ─────────────────────────────────
// Transitorio (red caída, timeout, 5xx, token venciendo) → reintentar.
// Permanente (RLS, FK, datos inválidos) → descartar y avisar.
function isTransient(err) {
  if (isTimeoutError(err)) return true
  if (err instanceof TypeError) return true // fetch: red caída
  const msg = String(err?.message || '')
  if (/fetch|network|load failed|jwt|token/i.test(msg)) return true
  const status = Number(err?.status)
  return status === 429 || status >= 500
}
function isDuplicate(err) {
  return err?.code === '23505'
}

// ── API ──────────────────────────────────────────────────────
export function enqueue(op, args) {
  if (!OPS[op]) { console.error('[sync] op desconocida:', op); return }

  // Coalescencia: no acumular escrituras redundantes sobre la misma fila.
  if (op === 'card.update') {
    const prev = queue.find(it => it.op === 'card.update' && it.args.id === args.id)
    if (prev) { prev.args.fields = { ...prev.args.fields, ...args.fields }; persist(); flush(); return }
  }
  if (op === 'card.move') {
    queue = queue.filter(it => !(it.op === 'card.move' && it.args.id === args.id))
  }
  if (op === 'column.update') {
    const prev = queue.find(it => it.op === 'column.update' && it.args.id === args.id)
    if (prev) { prev.args.fields = { ...prev.args.fields, ...args.fields }; persist(); flush(); return }
  }
  if (op === 'card.delete') {
    const hadCreate = queue.some(it => it.op === 'card.create' && it.args.row.id === args.id)
    queue = queue.filter(it => !(it.op.startsWith('card.') && (it.args.id === args.id || it.args.row?.id === args.id)))
    if (hadCreate) { persist(); syncStatus(); return } // nunca existió en el servidor
  }
  if (op === 'column.delete') {
    const hadCreate = queue.some(it => it.op === 'column.create' && it.args.row.id === args.id)
    queue = queue.filter(it =>
      !(it.op.startsWith('column.') && (it.args.id === args.id || it.args.row?.id === args.id)) &&
      !(it.op === 'card.create' && it.args.row.columna_id === args.id)
    )
    if (hadCreate) { persist(); syncStatus(); return }
  }

  queue.push({ op, args, ts: Date.now() })
  persist()
  flush()
}

export function hasPending() {
  return queue.length > 0
}

export async function flush() {
  if (flushing) return
  if (!queue.length) { syncStatus(); return }
  flushing = true
  clearTimeout(retryTimer); retryTimer = null
  syncStatus('saving')
  let waitTransient = false

  while (queue.length) {
    const item = queue[0]
    try {
      await OPS[item.op](item.args)
      queue.shift(); persist(); attempt = 0
    } catch (err) {
      if (isDuplicate(err) && item.op.endsWith('.create')) {
        queue.shift(); persist(); continue // ya estaba insertado — éxito
      }
      if (isTransient(err)) { waitTransient = true; break }
      // Error permanente: descartarlo no bloquea el resto de la cola.
      console.error('[sync] cambio descartado:', item.op, err)
      useToastStore.getState().addToast({
        _type: 'error',
        title: 'Un cambio no se pudo guardar',
        sub: 'La base de datos rechazó la operación. Recarga para ver el estado real.',
      })
      queue.shift(); persist()
    }
  }

  flushing = false
  if (waitTransient) {
    attempt++
    retryTimer = setTimeout(flush, Math.min(2000 * 2 ** attempt, MAX_DELAY))
    syncStatus('waiting')
  } else if (queue.length) {
    // Llegaron items mientras terminábamos — nueva pasada inmediata.
    retryTimer = setTimeout(flush, 100)
    syncStatus('saving')
  } else {
    useSyncStore.getState()._flashSaved()
    syncStatus()
  }
}

// ── Arranque ─────────────────────────────────────────────────
onReconnect(flush)
if (typeof window !== 'undefined') {
  syncStatus()
  // Espera breve al arrancar para que supabase-js cargue la sesión.
  if (queue.length) setTimeout(flush, 2500)
}
