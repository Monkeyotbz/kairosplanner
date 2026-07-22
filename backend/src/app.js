import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import 'dotenv/config'
import googleCalendarRouter from './routes/googleCalendar.js'
import { startRenewGoogleChannelsJob } from './jobs/renewGoogleChannels.js'
import { setIo } from './socketBus.js'

const app = express()
const httpServer = createServer(app)
const ORIGINS = ['http://localhost:5173', 'http://localhost:5174']

const io = new Server(httpServer, {
  cors: { origin: ORIGINS, methods: ['GET', 'POST'] },
})
setIo(io)

app.use(cors({ origin: ORIGINS }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok', project: 'KAIROS' }))

app.use('/api/google-calendar', googleCalendarRouter)

// Presencia: proyectoId → Map<socketId, nombre>
const presence = {}

io.on('connection', (socket) => {

  socket.on('join-board', ({ proyectoId, nombre }) => {
    socket.join(`board:${proyectoId}`)
    socket.data = { proyectoId, nombre }

    if (!presence[proyectoId]) presence[proyectoId] = new Map()
    presence[proyectoId].set(socket.id, nombre)

    io.to(`board:${proyectoId}`).emit(
      'presence:update',
      Array.from(presence[proyectoId].values())
    )
  })

  const EVENTS = [
    'card:created', 'card:moved', 'card:updated', 'card:deleted',
    'column:created', 'column:updated', 'column:deleted', 'column:reordered',
    'chat:message',
  ]
  EVENTS.forEach(event => {
    socket.on(event, (payload) => {
      socket.to(`board:${socket.data?.proyectoId}`).emit(event, payload)
    })
  })

  socket.on('disconnect', () => {
    const { proyectoId } = socket.data ?? {}
    if (!proyectoId || !presence[proyectoId]) return
    presence[proyectoId].delete(socket.id)
    io.to(`board:${proyectoId}`).emit(
      'presence:update',
      Array.from(presence[proyectoId].values())
    )
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => console.log(`KAIROS backend en http://localhost:${PORT}`))

startRenewGoogleChannelsJob()
