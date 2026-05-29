import express from 'express'
import cors from 'cors'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok', project: 'KAIROS' }))

app.listen(PORT, () => {
  console.log(`KAIROS backend running on http://localhost:${PORT}`)
})
