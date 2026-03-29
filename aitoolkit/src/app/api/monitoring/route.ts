/**
 * Monitoring API Routes
 * TASK-5.2: Monitoring & Observability
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  metricsCollector,
  metricsStore,
  startTimer
} from '@/lib/monitoring/metrics'

// GET /api/monitoring
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')

  switch (action) {
    case 'system':
      return getSystemMetrics()
    case 'requests':
      return getRequestMetrics()
    case 'agents':
      return getAgentMetrics()
    case 'metrics':
      return getMetricsList(request)
    case 'summary':
      return getMetricSummary(request)
    case 'dashboard':
      return getDashboardData()
    default:
      return NextResponse.json({
        error: 'Invalid action',
        availableActions: ['system', 'requests', 'agents', 'metrics', 'summary', 'dashboard']
      }, { status: 400 })
  }
}

/**
 * Get system metrics
 */
async function getSystemMetrics() {
  const metrics = metricsCollector.getSystemMetrics()

  return NextResponse.json({
    success: true,
    data: metrics
  })
}

/**
 * Get request metrics
 */
async function getRequestMetrics() {
  const metrics = metricsCollector.getRequestMetrics()

  return NextResponse.json({
    success: true,
    data: metrics
  })
}

/**
 * Get agent metrics
 */
async function getAgentMetrics() {
  const metrics = metricsCollector.getAgentMetrics()

  return NextResponse.json({
    success: true,
    data: metrics
  })
}

/**
 * Get list of all metrics
 */
async function getMetricsList(request: NextRequest) {
  const prefix = request.nextUrl.searchParams.get('prefix') || undefined

  const names = metricsStore.getAllNames()

  const filteredNames = prefix
    ? names.filter(n => n.startsWith(prefix))
    : names

  return NextResponse.json({
    success: true,
    data: {
      metrics: filteredNames,
      count: filteredNames.length
    }
  })
}

/**
 * Get metric summary
 */
async function getMetricSummary(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  const tagsStr = request.nextUrl.searchParams.get('tags')

  if (!name) {
    return NextResponse.json({
      error: 'Missing metric name'
    }, { status: 400 })
  }

  const tags = tagsStr ? JSON.parse(tagsStr) : {}
  const summary = metricsStore.getSummary(name, tags)

  return NextResponse.json({
    success: true,
    data: summary
  })
}

/**
 * Get dashboard data (aggregated for UI)
 */
async function getDashboardData() {
  const timer = startTimer('monitoring.dashboard')

  const systemMetrics = metricsCollector.getSystemMetrics()
  const requestMetrics = metricsCollector.getRequestMetrics()
  const agentMetrics = metricsCollector.getAgentMetrics()

  // Calculate health score
  let healthScore = 100
  if (systemMetrics.memory.percentage > 90) healthScore -= 20
  else if (systemMetrics.memory.percentage > 80) healthScore -= 10
  if (requestMetrics.avgResponseTime > 1000) healthScore -= 15
  else if (requestMetrics.avgResponseTime > 500) healthScore -= 5

  const duration = timer.end()

  return NextResponse.json({
    success: true,
    data: {
      healthScore: Math.max(0, healthScore),
      system: systemMetrics,
      requests: requestMetrics,
      agents: agentMetrics,
      generatedAt: new Date().toISOString(),
      generationTime: duration
    }
  })
}

// POST /api/monitoring
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'record':
        return recordMetric(body)
      case 'reset':
        return resetMetrics()
      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['record', 'reset']
        }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to process request',
      message: error.message
    }, { status: 500 })
  }
}

/**
 * Record a custom metric
 */
async function recordMetric(body: any) {
  const { name, value, tags } = body

  if (!name || typeof value !== 'number') {
    return NextResponse.json({
      error: 'Missing name or value'
    }, { status: 400 })
  }

  metricsStore.add(name, value, tags || {})

  return NextResponse.json({
    success: true,
    message: 'Metric recorded'
  })
}

/**
 * Reset all metrics
 */
async function resetMetrics() {
  metricsCollector.reset()

  return NextResponse.json({
    success: true,
    message: 'Metrics reset'
  })
}
