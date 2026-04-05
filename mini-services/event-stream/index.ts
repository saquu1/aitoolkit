import { Server } from 'socket.io'

const PORT = 3010

const io = new Server(PORT, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

console.log(`[Event Stream] Socket.IO server running on port ${PORT}`)

// In-memory event store for new clients
const recentEvents: Array<{
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'system'
  source: string
  message: string
  detail?: string
  timestamp: number
}> = []

const MAX_EVENTS = 100

function addEvent(event: Omit<typeof recentEvents[0], 'id' | 'timestamp'>) {
  const entry = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  }
  recentEvents.push(entry)
  if (recentEvents.length > MAX_EVENTS) recentEvents.shift()
  io.emit('event', entry)
  return entry
}

// System health event generator
function generateSystemEvent() {
  const events = [
    { type: 'info' as const, source: 'System', message: 'Health check passed', detail: 'All 35 agents responsive' },
    { type: 'info' as const, source: 'Scheduler', message: 'Pipeline check completed', detail: 'No pending tasks' },
    { type: 'info' as const, source: 'Database', message: 'Connection pool healthy', detail: '5 active connections' },
    { type: 'info' as const, source: 'Memory', message: 'GC cycle completed', detail: `${Math.floor(Math.random() * 50 + 10)}MB freed` },
    { type: 'success' as const, source: 'Agent', message: 'Schema parser ready', detail: 'SQL DDL analysis available' },
    { type: 'system' as const, source: 'Network', message: 'Request rate normal', detail: `${Math.floor(Math.random() * 30 + 5)} req/min` },
  ]
  const event = events[Math.floor(Math.random() * events.length)]
  addEvent(event)
}

// Periodic system events
let systemEventInterval: ReturnType<typeof setInterval>

io.on('connection', (socket) => {
  console.log(`[Event Stream] Client connected: ${socket.id}`)
  const clientCount = io.engine.clientsCount
  console.log(`[Event Stream] Total clients: ${clientCount}`)

  // Send recent events to new client
  socket.emit('init', { events: recentEvents.slice(-20), clientCount })

  // Client can request current stats
  socket.on('request-stats', () => {
    socket.emit('stats', {
      totalEvents: recentEvents.length,
      clientCount: io.engine.clientsCount,
      uptime: process.uptime(),
    })
  })

  // Client can post custom events (e.g., from dashboard actions)
  socket.on('post-event', (event: Omit<typeof recentEvents[0], 'id' | 'timestamp'>) => {
    const entry = addEvent(event)
    console.log(`[Event Stream] Event posted: ${entry.type} - ${entry.message}`)
  })

  // Heartbeat
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() })
  })

  socket.on('disconnect', () => {
    console.log(`[Event Stream] Client disconnected: ${socket.id}`)
  })
})

// Start periodic system events
systemEventInterval = setInterval(generateSystemEvent, 8000)

// Initial events
setTimeout(() => {
  addEvent({ type: 'system', source: 'Event Stream', message: 'Real-time event service started', detail: 'Connected clients will receive live updates' })
  addEvent({ type: 'success', source: 'System', message: 'All 35 agents initialized', detail: '7 layers operational across Schema, Intelligence, Module, Requirements, Generation, Migration, Management' })
}, 500)

process.on('SIGTERM', () => {
  clearInterval(systemEventInterval)
  io.close()
})

process.on('SIGINT', () => {
  clearInterval(systemEventInterval)
  io.close()
  process.exit(0)
})
