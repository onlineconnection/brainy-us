import express from 'express'
import { createServer } from 'node:http'
import { createServer as createViteServer } from 'vite'
import { WebSocketServer } from 'ws'
import path from 'node:path'
import { getPlayerPack } from './questions/storage.js'
import { parseQuestionText } from './questions/parser.js'
import { publishQuestionText } from './questions/publishing.js'

const app = express()
const httpServer = createServer(app)

const PORT = Number(process.env.PORT) || 3000

app.use(express.json({ limit: '2mb' }))

// Basic API health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    application: 'Brainy US',
    server: 'Node.js',
  })
})

// Admin content APIs are development-only until authentication is implemented.
function developmentOnly(
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found.' })
  }
  next()
}

// Preview pasted questions without saving a pack.
app.post('/api/admin/offline-content/preview', developmentOnly, (req, res) => {
  const { text } = req.body ?? {}

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Question text is required.' })
  }

  const parsed = parseQuestionText(text)

  return res.json({
    success: parsed.success,
    totalBlocks: parsed.totalBlocks,
    validQuestionCount: parsed.questions.length,
    questions: parsed.questions,
    errors: parsed.errors,
  })
})

// Publish validated questions as a player pack.
app.post('/api/admin/offline-content/publish', developmentOnly, async (req, res) => {
  const { text } = req.body ?? {}

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Question text is required.' })
  }

  try {
    const result = await publishQuestionText(text)

    if (!result.success) {
      return res.status(422).json({
        error: 'Question import failed validation.',
        totalBlocks: result.parsed.totalBlocks,
        validQuestionCount: result.parsed.questions.length,
        errors: result.parsed.errors,
      })
    }

    return res.status(201).json(result)
  } catch (error) {
    console.error('Question pack publishing failed:', error)
    return res.status(500).json({
      error: 'Unable to publish question pack.',
    })
  }
})

// Download a public player question pack
app.get('/api/packs/:packId', async (req, res) => {
  try {
    const pack = await getPlayerPack(req.params.packId)

    if (!pack) {
      return res.status(404).json({
        error: 'Question pack not found.',
      })
    }

    res.setHeader('Cache-Control', 'private, no-store')
    return res.json(pack)
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid question pack ID.') {
      return res.status(400).json({
        error: 'Invalid question pack ID.',
      })
    }

    console.error('Question pack download failed:', error)

    return res.status(500).json({
      error: 'Unable to load question pack.',
    })
  }
})

// WebSocket server for real-time multiplayer
const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (socket) => {
  console.log('A player connected.')

  socket.send(JSON.stringify({
    type: 'CONNECTED',
    message: 'Connected to Brainy US game server',
  }))

  socket.on('close', () => {
    console.log('A player disconnected.')
  })
})

// Serve the React application
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist/client')))

    app.use((_req, res) => {
      res.sendFile(path.resolve('dist/client/index.html'))
    })
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    })

    app.use(vite.middlewares)

    app.use(async (req, res, next) => {
      if (req.method !== 'GET') return next()

      try {
        let html = await import('node:fs/promises')
          .then(fs => fs.readFile('index.html', 'utf-8'))

        html = await vite.transformIndexHtml(req.originalUrl, html)

        res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
      } catch (error) {
        next(error)
      }
    })
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Brainy US running at http://localhost:${PORT}`)
    console.log('API and WebSocket server are active.')
  })
}

startServer().catch(console.error)
