// Referencia compartida a la instancia de Socket.io, para que rutas y
// servicios (ej. googleCalendarSync.js) puedan emitir eventos sin
// depender directamente de app.js (evita import circular).
let ioInstance = null

export function setIo(io) {
  ioInstance = io
}

export function emitToBoard(proyectoId, event, payload) {
  if (!ioInstance || !proyectoId) return
  ioInstance.to(`board:${proyectoId}`).emit(event, payload)
}
