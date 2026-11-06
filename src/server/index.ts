import express from 'express'
import { createServer } from 'node:http'
import { createServer as createViteServer } from 'vite'
import { WebSocketServer, WebSocket } from 'ws'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { getPlayerPack } from './questions/storage.js'
import { parseQuestionText } from './questions/parser.js'
import { publishQuestionText } from './questions/publishing.js'

const app = express()
const httpServer = createServer(app)

const PORT = Number(process.env.PORT) || 3000

const env = loadEnv(
  process.env.NODE_ENV === 'production' ? 'production' : 'development',
  process.cwd(),
  'VITE_',
)

if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Supabase environment variables are missing.')
}

const authClient = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
)

// Verify that a request belongs to an authenticated platform administrator.
async function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const authorization = req.headers.authorization
  const accessToken = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null

  if (!accessToken) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const { data: { user }, error: authError } =
      await authClient.auth.getUser(accessToken)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    const userClient = createClient(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )

    const { data: adminRecord, error: adminError } = await userClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (adminError) {
      console.error('Admin verification failed:', adminError.message)
      return res.status(500).json({ error: 'Could not verify administrator access' })
    }

    if (!adminRecord) {
      return res.status(403).json({ error: 'Administrator access denied' })
    }

    next()
  } catch (error) {
    console.error('Admin authentication error:', error)
    return res.status(500).json({ error: 'Administrator verification failed' })
  }
}

app.use(express.json({ limit: '2mb' }))

// Basic API health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    application: 'Brainy US',
    server: 'Node.js',
  })
})

// Aggregate live player statistics. No personal player data is exposed.
app.get('/api/online-stats', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.json({
    onlinePlayers: onlinePlayers.size,
    activeConnections: wss.clients.size,
  })
})

// Admin content APIs require verified administrator access.


// Preview questions for one specific battle. IDs generated here are retained at save time.
app.post('/api/admin/battles/questions/preview', requireAdmin, (req, res) => {
  const { text } = req.body ?? {}

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Question text is required.' })
  }

  const parsed = parseQuestionText(text)

  if (!parsed.success) {
    return res.status(422).json({
      success: false,
      totalBlocks: parsed.totalBlocks,
      validQuestionCount: parsed.questions.length,
      questions: [],
      errors: parsed.errors,
    })
  }

  const questions = parsed.questions.map((question, index) => ({
    id: question.id,
    question_text: question.question,
    option_a: question.options[0].text,
    option_b: question.options[1].text,
    option_c: question.options[2].text,
    option_d: question.options[3].text,
    correct_answer: question.correctAnswerId,
    question_order: index + 1,
  }))

  return res.json({
    success: true,
    totalBlocks: parsed.totalBlocks,
    validQuestionCount: questions.length,
    questions,
    errors: [],
  })
})

// Save one complete battle, its questions and prizes in a single database transaction.
app.post('/api/admin/battles', requireAdmin, async (req, res) => {
  try {
    const { battle, text, questions, prizes } = req.body ?? {}

    if (!battle || typeof battle !== 'object' || Array.isArray(battle)) {
      return res.status(400).json({ error: 'Battle details are required.' })
    }

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'The battle question TXT content is required.' })
    }

    if (!Array.isArray(questions) || !Array.isArray(prizes)) {
      return res.status(400).json({ error: 'Previewed questions and prize allocations are required.' })
    }

    const parsed = parseQuestionText(text)

    if (!parsed.success) {
      return res.status(422).json({
        error: 'The original question file failed validation.',
        errors: parsed.errors,
      })
    }

    if (questions.length !== parsed.questions.length) {
      return res.status(422).json({ error: 'The previewed question count does not match the TXT file.' })
    }

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const questionRows = []

    for (let index = 0; index < parsed.questions.length; index++) {
      const original = parsed.questions[index]
      const submitted = questions[index]

      if (!submitted || typeof submitted !== 'object' || !uuidPattern.test(submitted.id ?? '')) {
        return res.status(422).json({ error: `Question ${index + 1} has an invalid unique ID.` })
      }

      const expected = {
        question_text: original.question,
        option_a: original.options[0].text,
        option_b: original.options[1].text,
        option_c: original.options[2].text,
        option_d: original.options[3].text,
        correct_answer: original.correctAnswerId,
        question_order: index + 1,
      }

      for (const [field, value] of Object.entries(expected)) {
        if (submitted[field] !== value) {
          return res.status(422).json({
            error: `Question ${index + 1} does not match the validated TXT file.`,
          })
        }
      }

      questionRows.push({
        id: submitted.id,
        ...expected,
      })
    }

    const maxPlayers = Number(battle.max_players)
    const winners = Number(battle.winner_count)
    const entryFee = Number(battle.entry_fee)
    const prizePool = Number(battle.prize_pool)
    const duration = Number(battle.duration_minutes)
    const seconds = Number(battle.seconds_per_question)

    if (
      typeof battle.title !== 'string' || !battle.title.trim() ||
      !Number.isInteger(maxPlayers) || maxPlayers < 1 ||
      !Number.isInteger(winners) || winners < 1 || winners > maxPlayers ||
      !Number.isFinite(entryFee) || entryFee < 0 ||
      !Number.isFinite(prizePool) || prizePool < 0 ||
      !Number.isInteger(duration) || duration < 1 ||
      !Number.isInteger(seconds) || seconds < 1
    ) {
      return res.status(422).json({ error: 'One or more battle settings are invalid.' })
    }

    if (prizePool > 0) {
      if (
        prizes.length !== winners ||
        prizes.some((prize, index) =>
          Number(prize.position) !== index + 1 ||
          !Number.isFinite(Number(prize.prize_amount)) ||
          Number(prize.prize_amount) <= 0
        )
      ) {
        return res.status(422).json({
          error: 'Enter one valid positive prize allocation for every winning position.',
        })
      }

      const totalPrizes = prizes.reduce(
        (sum, prize) => sum + Number(prize.prize_amount), 0
      )

      if (totalPrizes > prizePool) {
        return res.status(422).json({ error: 'Prize allocations exceed the prize pool.' })
      }
    } else if (prizes.length !== 0) {
      return res.status(422).json({ error: 'Prize allocations must be empty when the prize pool is zero.' })
    }

    // Hash only the ordered player-visible content and stable question IDs.
    // Correct answers are deliberately excluded from the downloadable package hash.
    const canonicalPackage = JSON.stringify(questionRows.map(question => ({
      id: question.id,
      question_order: question.question_order,
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
    })))

    const packageHash = createHash('sha256')
      .update(canonicalPackage, 'utf8')
      .digest('hex')

    const authorization = req.headers.authorization
    const accessToken = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null

    if (!accessToken) {
      return res.status(401).json({ error: 'Authentication required.' })
    }

    const userClient = createClient(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )

    const safeBattle = {
      title: battle.title.trim(),
      description: typeof battle.description === 'string' ? battle.description.trim() : '',
      category: String(battle.category ?? 'General Knowledge'),
      difficulty: String(battle.difficulty ?? 'Mixed'),
      entry_fee: entryFee,
      currency: battle.currency === 'LRD' ? 'LRD' : 'USD',
      prize_pool: prizePool,
      max_players: maxPlayers,
      winner_count: winners,
      duration_minutes: duration,
      seconds_per_question: seconds,
      registration_opens_at: battle.registration_opens_at || null,
      registration_closes_at: battle.registration_closes_at || null,
      starts_at: battle.starts_at || null,
    }

    const { data, error } = await userClient.rpc('admin_create_battle', {
      p_battle: safeBattle,
      p_questions: questionRows,
      p_prizes: prizes.map(prize => ({
        position: Number(prize.position),
        prize_amount: Number(prize.prize_amount),
      })),
      p_package_hash: packageHash,
    })

    if (error) {
      console.error('Battle creation failed:', error.message)
      return res.status(400).json({ error: error.message })
    }

    return res.status(201).json({
      success: true,
      battleId: data,
      questionCount: questionRows.length,
      questionPackageHash: packageHash,
      message: 'Battle, questions and prizes saved successfully as a draft.',
    })
  } catch (error) {
    console.error('Battle creation error:', error)
    return res.status(500).json({ error: 'An unexpected error occurred while saving the battle.' })
  }
})

// Preview pasted questions without saving a pack.
app.post('/api/admin/offline-content/preview', requireAdmin, (req, res) => {
  const { text } = req.body ?? {}

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Question text is required.' })
  }

  const parsed = parseQuestionText(text)

  if (parsed.totalBlocks > 500) {
    return res.status(422).json({
      success: false,
      error: 'A question pack cannot contain more than 500 questions.',
      totalBlocks: parsed.totalBlocks,
      validQuestionCount: parsed.questions.length,
      questions: [],
      errors: [{ line: 1, message: 'The maximum is 500 questions per pack.' }],
    })
  }

  return res.json({
    success: parsed.success,
    totalBlocks: parsed.totalBlocks,
    validQuestionCount: parsed.questions.length,
    questions: parsed.questions,
    errors: parsed.errors,
  })
})

// Publish validated questions as a player pack.
app.post('/api/admin/offline-content/publish', requireAdmin, async (req, res) => {
  const { text } = req.body ?? {}

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Question text is required.' })
  }

  const parsed = parseQuestionText(text)

  if (parsed.totalBlocks > 500) {
    return res.status(422).json({
      success: false,
      error: 'A question pack cannot contain more than 500 questions.',
      totalBlocks: parsed.totalBlocks,
      validQuestionCount: parsed.questions.length,
      errors: [{ line: 1, message: 'The maximum is 500 questions per pack.' }],
    })
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


// Download a battle-specific question package for an active registrant.
app.get('/api/battles/:battleId/question-pack', async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store')

  const authorization = req.headers.authorization
  const accessToken = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null

  if (!accessToken) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const battleId = req.params.battleId

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(battleId)) {
    return res.status(400).json({ error: 'Invalid battle ID' })
  }

  try {
    const { data: { user }, error: authError } =
      await authClient.auth.getUser(accessToken)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    const userClient = createClient(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )

    const { data, error } = await userClient.rpc(
      'get_registered_battle_questions',
      { p_battle_id: battleId },
    )

    if (error) {
      console.error('Battle question authorization failed:', error.message)
      return res.status(403).json({
        error: 'An active registration is required to download these questions.',
      })
    }

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ error: 'Battle questions are unavailable.' })
    }

    const questions = data
    const schemaVersion = 1
    const canonicalContent = JSON.stringify({
      schemaVersion,
      questions,
    })

    const contentHash = createHash('sha256')
      .update(canonicalContent, 'utf8')
      .digest('hex')

    const pack = {
      manifest: {
        format: 'brainy-us-question-pack' as const,
        schemaVersion,
        packId: battleId,
        version: 1,
        questionCount: questions.length,
        contentHash,
      },
      questions,
    }

    return res.json(pack)
  } catch (error) {
    console.error('Battle question download failed:', error)
    return res.status(500).json({
      error: 'Unable to download battle questions.',
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

// Authenticated real-time player presence
const wss = new WebSocketServer({ server: httpServer })

// One account may have multiple connections, but counts only once.
const onlinePlayers = new Map<string, Set<WebSocket>>()

function sendMessage(socket: WebSocket, payload: unknown) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload))
  }
}

function broadcastOnlineCount() {
  const payload = JSON.stringify({
    type: 'ONLINE_STATS',
    onlinePlayers: onlinePlayers.size,
  })

  for (const socket of wss.clients) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload)
    }
  }
}

wss.on('connection', (socket) => {
  let authenticatedUserId: string | null = null
  let authenticated = false
  ;(socket as WebSocket & { isAlive?: boolean }).isAlive = true

  sendMessage(socket, {
    type: 'CONNECTED',
    message: 'Authenticate to join Brainy US presence tracking.',
  })

  // Send the current aggregate count to dashboard listeners.
  sendMessage(socket, {
    type: 'ONLINE_STATS',
    onlinePlayers: onlinePlayers.size,
  })

  // Connections must authenticate before they count as online.
  const authTimeout = setTimeout(() => {
    if (!authenticated) {
      socket.close(4001, 'Authentication required')
    }
  }, 10000)

  socket.on('pong', () => {
    ;(socket as WebSocket & { isAlive?: boolean }).isAlive = true
  })

  socket.on('message', async (rawMessage) => {
    if (authenticated) return

    try {
      const message = JSON.parse(rawMessage.toString())

      if (message.type !== 'AUTH' || typeof message.accessToken !== 'string') {
        socket.close(4002, 'Invalid authentication message')
        return
      }

      if (message.accessToken.length > 8192) {
        socket.close(4002, 'Invalid access token')
        return
      }

      const { data, error } = await authClient.auth.getUser(message.accessToken)

      if (error || !data.user) {
        socket.close(4003, 'Authentication failed')
        return
      }

      if (socket.readyState !== WebSocket.OPEN) return

      authenticated = true
      authenticatedUserId = data.user.id
      clearTimeout(authTimeout)

      const connections = onlinePlayers.get(authenticatedUserId) ?? new Set<WebSocket>()
      connections.add(socket)
      onlinePlayers.set(authenticatedUserId, connections)

      sendMessage(socket, {
        type: 'AUTHENTICATED',
        message: 'Player presence tracking enabled.',
      })

      sendMessage(socket, {
        type: 'ONLINE_STATS',
        onlinePlayers: onlinePlayers.size,
      })

      broadcastOnlineCount()
    } catch {
      socket.close(4002, 'Invalid message')
    }
  })

  socket.on('close', () => {
    clearTimeout(authTimeout)

    if (!authenticatedUserId) return

    const connections = onlinePlayers.get(authenticatedUserId)
    if (!connections) return

    connections.delete(socket)

    if (connections.size === 0) {
      onlinePlayers.delete(authenticatedUserId)
    }

    broadcastOnlineCount()
  })

  socket.on('error', (error) => {
    console.error('WebSocket connection error:', error.message)
  })
})

// Detect dead connections and remove them automatically.
const heartbeatInterval = setInterval(() => {
  for (const socket of wss.clients) {
    const trackedSocket = socket as WebSocket & { isAlive?: boolean }

    if (trackedSocket.isAlive === false) {
      socket.terminate()
      continue
    }

    trackedSocket.isAlive = false
    socket.ping()
  }
}, 30000)

wss.on('close', () => clearInterval(heartbeatInterval))

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
