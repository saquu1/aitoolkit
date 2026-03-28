/**
 * Metrics Collector Service
 * Collects and aggregates system metrics for monitoring
 * 
 * TASK-5.2: Monitoring & Observability
 * Part of Phase 5: Production & Scale
 */

// Types
export interface MetricPoint {
  name: string
  value: number
  timestamp: Date
  tags: Record<string, string>
}

export interface MetricSummary {
  name: string
  count: number
  sum: number
  avg: number
  min: number
  max: number
  p50: number
  p95: number
  p99: number
}

export interface SystemMetrics {
  timestamp: Date
  cpu: {
    usage: number
    loadAvg: number[]
  }
  memory: {
    used: number
    total: number
    free: number
    percentage: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  process: {
    uptime: number
    pid: number
    version: string
  }
  requests: {
    total: number
    successful: number
    failed: number
    avgResponseTime: number
  }
  database: {
    connections: number
    activeQueries: number
    avgQueryTime: number
  }
}

export interface AgentMetrics {
  agentId: string
  agentName: string
  runs: number
  successes: number
  failures: number
  avgDuration: number
  avgItemsProcessed: number
  lastRun: Date | null
}

// In-memory metrics storage (replace with Redis in production)
class MetricsStore {
  private metrics: Map<string, MetricPoint[]> = new Map()
  private maxPoints = 1000

  add(name: string, value: number, tags: Record<string, string> = {}): void {
    const key = this.buildKey(name, tags)
    const points = this.metrics.get(key) || []

    points.push({
      name,
      value,
      timestamp: new Date(),
      tags
    })

    // Trim to max size
    if (points.length > this.maxPoints) {
      points.shift()
    }

    this.metrics.set(key, points)
  }

  get(name: string, tags: Record<string, string> = {}): MetricPoint[] {
    const key = this.buildKey(name, tags)
    return this.metrics.get(key) || []
  }

  getSummary(name: string, tags: Record<string, string> = {}): MetricSummary | null {
    const points = this.get(name, tags)
    if (points.length === 0) return null

    const values = points.map(p => p.value).sort((a, b) => a - b)

    return {
      name,
      count: values.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: this.percentile(values, 50),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99)
    }
  }

  getAllNames(): string[] {
    const names = new Set<string>()
    for (const key of this.metrics.keys()) {
      const name = key.split(':')[0]
      names.add(name)
    }
    return Array.from(names)
  }

  clear(name?: string): void {
    if (name) {
      // Clear all keys with this name
      for (const key of this.metrics.keys()) {
        if (key.startsWith(name + ':')) {
          this.metrics.delete(key)
        }
      }
    } else {
      this.metrics.clear()
    }
  }

  private buildKey(name: string, tags: Record<string, string>): string {
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',')
    return `${name}:${tagStr}`
  }

  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0
    const idx = Math.ceil((p / 100) * sortedValues.length) - 1
    return sortedValues[Math.max(0, idx)]
  }
}

// Singleton store
export const metricsStore = new MetricsStore()

/**
 * Metrics Collector Class
 */
export class MetricsCollector {
  private requestCount = 0
  private successCount = 0
  private failureCount = 0
  private responseTimes: number[] = []
  private maxResponseTimes = 1000

  /**
   * Record a request
   */
  recordRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number
  ): void {
    this.requestCount++
    this.responseTimes.push(durationMs)

    if (this.responseTimes.length > this.maxResponseTimes) {
      this.responseTimes.shift()
    }

    if (statusCode >= 200 && statusCode < 400) {
      this.successCount++
    } else {
      this.failureCount++
    }

    // Store in metrics
    metricsStore.add('http.requests', 1, { method, path })
    metricsStore.add('http.response_time', durationMs, { method, path })
    metricsStore.add('http.status', statusCode, { method, path })
  }

  /**
   * Record agent execution
   */
  recordAgentExecution(
    agentId: string,
    agentName: string,
    success: boolean,
    durationMs: number,
    itemsProcessed: number
  ): void {
    metricsStore.add('agent.runs', 1, { agentId, agentName })
    metricsStore.add('agent.duration', durationMs, { agentId, agentName })
    metricsStore.add('agent.items_processed', itemsProcessed, { agentId, agentName })

    if (success) {
      metricsStore.add('agent.successes', 1, { agentId, agentName })
    } else {
      metricsStore.add('agent.failures', 1, { agentId, agentName })
    }
  }

  /**
   * Record database operation
   */
  recordDatabaseOperation(
    operation: string,
    table: string,
    durationMs: number
  ): void {
    metricsStore.add('db.operations', 1, { operation, table })
    metricsStore.add('db.duration', durationMs, { operation, table })
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage()

    // Calculate CPU percentage (approximate)
    const cpuUsage = process.cpuUsage()
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000 / Math.max(1, process.uptime())

    // Get OS memory info
    let totalMem = 0
    let freeMem = 0
    let loadAvg: number[] = [0, 0, 0]

    try {
      const os = require('os')
      totalMem = os.totalmem()
      freeMem = os.freemem()
      loadAvg = process.platform !== 'win32' ? os.loadavg() : [0, 0, 0]
    } catch {
      // OS module not available
    }

    return {
      timestamp: new Date(),
      cpu: {
        usage: cpuPercent,
        loadAvg
      },
      memory: {
        used: memUsage.rss,
        total: totalMem,
        free: freeMem,
        percentage: totalMem > 0 ? (memUsage.rss / totalMem) * 100 : 0,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      },
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        version: process.version
      },
      requests: {
        total: this.requestCount,
        successful: this.successCount,
        failed: this.failureCount,
        avgResponseTime: this.responseTimes.length > 0
          ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
          : 0
      },
      database: {
        connections: 0, // Would be populated from connection pool
        activeQueries: 0,
        avgQueryTime: 0
      }
    }
  }

  /**
   * Get agent metrics summary
   */
  getAgentMetrics(): AgentMetrics[] {
    const agentNames = new Map<string, { id: string; name: string }>()

    // Extract unique agents from metrics
    const runsMetrics = metricsStore.get('agent.runs')
    for (const point of runsMetrics) {
      const agentId = point.tags.agentId
      const agentName = point.tags.agentName
      if (!agentNames.has(agentId)) {
        agentNames.set(agentId, { id: agentId, name: agentName })
      }
    }

    const result: AgentMetrics[] = []

    for (const [agentId, info] of agentNames) {
      const runs = metricsStore.getSummary('agent.runs', { agentId, agentName: info.name })
      const successes = metricsStore.getSummary('agent.successes', { agentId, agentName: info.name })
      const failures = metricsStore.getSummary('agent.failures', { agentId, agentName: info.name })
      const duration = metricsStore.getSummary('agent.duration', { agentId, agentName: info.name })
      const items = metricsStore.getSummary('agent.items_processed', { agentId, agentName: info.name })

      result.push({
        agentId,
        agentName: info.name,
        runs: runs?.count || 0,
        successes: successes?.count || 0,
        failures: failures?.count || 0,
        avgDuration: duration?.avg || 0,
        avgItemsProcessed: items?.avg || 0,
        lastRun: runs ? new Date() : null
      })
    }

    return result
  }

  /**
   * Get request metrics
   */
  getRequestMetrics(): {
    total: number
    byMethod: Record<string, number>
    byStatus: Record<string, number>
    avgResponseTime: number
    p95ResponseTime: number
  } {
    const byMethod: Record<string, number> = {}
    const byStatus: Record<string, number> = {}

    const requests = metricsStore.get('http.requests')
    for (const point of requests) {
      const method = point.tags.method || 'UNKNOWN'
      byMethod[method] = (byMethod[method] || 0) + 1
    }

    const statuses = metricsStore.get('http.status')
    for (const point of statuses) {
      const status = String(point.value)
      byStatus[status] = (byStatus[status] || 0) + 1
    }

    const responseTimeSummary = metricsStore.getSummary('http.response_time')

    return {
      total: this.requestCount,
      byMethod,
      byStatus,
      avgResponseTime: responseTimeSummary?.avg || 0,
      p95ResponseTime: responseTimeSummary?.p95 || 0
    }
  }

  /**
   * Reset counters
   */
  reset(): void {
    this.requestCount = 0
    this.successCount = 0
    this.failureCount = 0
    this.responseTimes = []
    metricsStore.clear()
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector()

/**
 * Timing helper for measuring execution duration
 */
export class Timer {
  private startTime: number
  private name: string
  private tags: Record<string, string>

  constructor(name: string, tags: Record<string, string> = {}) {
    this.name = name
    this.tags = tags
    this.startTime = Date.now()
  }

  end(): number {
    const duration = Date.now() - this.startTime
    metricsStore.add(`${this.name}.duration`, duration, this.tags)
    return duration
  }
}

/**
 * Start a timer
 */
export function startTimer(name: string, tags: Record<string, string> = {}): Timer {
  return new Timer(name, tags)
}

/**
 * Middleware for tracking request metrics
 */
export function withMetrics(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const startTime = Date.now()
    const url = new URL(req.url)
    const method = req.method
    const path = url.pathname

    try {
      const response = await handler(req)
      const duration = Date.now() - startTime

      metricsCollector.recordRequest(method, path, response.status, duration)

      return response
    } catch (error: any) {
      const duration = Date.now() - startTime

      metricsCollector.recordRequest(method, path, 500, duration)

      throw error
    }
  }
}
