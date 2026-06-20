import { io } from 'socket.io-client'

const socket = io('http://localhost:3001', { autoConnect: false })

export function joinBoard(proyectoId, nombre) {
  if (!socket.connected) socket.connect()
  socket.emit('join-board', { proyectoId, nombre })
}

export function leaveBoard() {
  socket.disconnect()
}

export { socket }
