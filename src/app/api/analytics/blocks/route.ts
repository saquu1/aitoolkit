/**
 * ANALYTICS BLOCKS API
 * ====================
 * Content block analysis endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseContentBlocks, aggregateBlocksByType, calculateBlockMetrics } from '@/lib/analytics/extraction'
import { analyzeReasoningBlocks } from '@/lib/analytics/extraction'
import { reconstructThread } from '@/lib/analytics/extraction'
import { calculateTimingChain } from '@/lib/analytics/extraction'
import { db } from '@/lib/db'

// =============================================================================
// MAIN HANDLERS
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'overview'

  try {
    switch (action) {
      case 'overview':
        return await handleBlocksOverview()
      
      case 'session-blocks':
        return await handleGetSessionBlocks(searchParams)
      
      case 'block-metrics':
        return await handleGetBlockMetrics(searchParams)
      
      case 'timing-chain':
        return await handleGetTimingChain(searchParams)
      
      case 'thread-reconstruction':
        return await handleGetThreadReconstruction(searchParams)
      
      case 'reasoning-analysis':
        return await handleGetReasoningAnalysis(searchParams)
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Blocks API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'parse-blocks':
        return await handleParseBlocks(body)
      
      case 'analyze-reasoning':
        return await handleAnalyzeReasoning(body)
      
      case 'reconstruct-thread':
        return await handleReconstructThread(body)
      
      case 'calculate-timing':
        return await handleCalculateTiming(body)
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Blocks API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// =============================================================================
// GET HANDLERS
// =============================================================================

async function handleBlocksOverview() {
  const sessions = await db.aISession.findMany({
    include: {
      messages: {
        orderBy: { timestamp: 'asc' }
      }
    },
    orderBy: { sessionDate: 'desc' },
    take: 50
  })
  
  let totalBlocks = 0
  let totalToolCalls = 0
  let totalErrors = 0
  let totalBacktracks = 0
  const blockTypeStats = {
    reasoning: { count: 0, avgDuration: 0, errors: 0 },
    text: { count: 0, avgDuration: 0, errors: 0 },
    tool_calls: { count: 0, avgDuration: 0, errors: 0 }
  }
  
  for (const session of sessions) {
    if (session.messages && session.messages.length > 0) {
      const blocks = await parseContentBlocks(session.id, session.messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      })))
      
      totalBlocks += blocks.length
      totalToolCalls += blocks.reduce((sum, b) => sum + (b.toolCalls?.length || 0), 0)
      totalErrors += blocks.filter(b => b.flags.hasError).length
      totalBacktracks += blocks.filter(b => b.flags.hasBacktrack).length
      
      const aggregated = aggregateBlocksByType(blocks)
      for (const type of ['reasoning', 'text', 'tool_calls'] as const) {
        blockTypeStats[type].count += aggregated[type].count
        blockTypeStats[type].errors += aggregated[type].errors
      }
    }
  }
  
  return NextResponse.json({
    success: true,
    overview: {
      totalSessions: sessions.length,
      totalBlocks,
      totalToolCalls,
      totalErrors,
      totalBacktracks,
      errorRate: totalBlocks > 0 ? (totalErrors / totalBlocks) * 100 : 0,
      backtrackRate: totalBlocks > 0 ? (totalBacktracks / totalBlocks) * 100 : 0,
      blockTypeStats
    }
  })
}

async function handleGetSessionBlocks(searchParams: URLSearchParams) {
  const sessionId = searchParams.get('sessionId')
  
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }
  
  const session = await db.aISession.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' }
      }
    }
  })
  
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  const blocks = await parseContentBlocks(sessionId, session.messages.map((m: any) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp
  })))
  
  return NextResponse.json({
    success: true,
    blocks,
    metrics: calculateBlockMetrics(blocks)
  })
}

async function handleGetBlockMetrics(searchParams: URLSearchParams) {
  const sessionId = searchParams.get('sessionId')
  const days = parseInt(searchParams.get('days') || '7')
  
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  const whereClause: any = {}
  if (sessionId) {
    whereClause.id = sessionId
  } else {
    whereClause.sessionDate = { gte: since }
  }
  
  const sessions = await db.aISession.findMany({
    where: whereClause,
    include: {
      messages: true
    }
  })
  
  const allMetrics: any[] = []
  
  for (const session of sessions) {
    if (session.messages && session.messages.length > 0) {
      const blocks = await parseContentBlocks(session.id, session.messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      })))
      
      allMetrics.push({
        sessionId: session.id,
        sessionTitle: session.title,
        sessionDate: session.sessionDate,
        ...calculateBlockMetrics(blocks)
      })
    }
  }
  
  const aggregated = {
    totalSessions: allMetrics.length,
    avgBlocksPerSession: allMetrics.reduce((sum, m) => sum + m.totalBlocks, 0) / Math.max(1, allMetrics.length),
    avgDuration: allMetrics.reduce((sum, m) => sum + m.avgDuration, 0) / Math.max(1, allMetrics.length),
    avgErrorRate: allMetrics.reduce((sum, m) => sum + m.errorRate, 0) / Math.max(1, allMetrics.length),
    avgBacktrackRate: allMetrics.reduce((sum, m) => sum + m.backtrackRate, 0) / Math.max(1, allMetrics.length),
    totalToolCalls: allMetrics.reduce((sum, m) => sum + m.toolCallCount, 0)
  }
  
  return NextResponse.json({
    success: true,
    metrics: allMetrics,
    aggregated
  })
}

async function handleGetTimingChain(searchParams: URLSearchParams) {
  const sessionId = searchParams.get('sessionId')
  
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }
  
  const session = await db.aISession.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' }
      }
    }
  })
  
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  const blocks = await parseContentBlocks(sessionId, session.messages.map((m: any) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp
  })))
  
  const timingChain = await calculateTimingChain(sessionId, blocks)
  
  return NextResponse.json({
    success: true,
    timingChain
  })
}

async function handleGetThreadReconstruction(searchParams: URLSearchParams) {
  const sessionId = searchParams.get('sessionId')
  
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }
  
  const session = await db.aISession.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' }
      }
    }
  })
  
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  const blocks = await parseContentBlocks(sessionId, session.messages.map((m: any) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp
  })))
  
  const reconstruction = await reconstructThread(
    sessionId,
    session.messages.map((m: any) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp
    })),
    blocks
  )
  
  return NextResponse.json({
    success: true,
    reconstruction
  })
}

async function handleGetReasoningAnalysis(searchParams: URLSearchParams) {
  const sessionId = searchParams.get('sessionId')
  
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }
  
  const session = await db.aISession.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' }
      }
    }
  })
  
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  const blocks = await parseContentBlocks(sessionId, session.messages.map((m: any) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp
  })))
  
  const analyses = await analyzeReasoningBlocks(sessionId, blocks)
  
  return NextResponse.json({
    success: true,
    analyses,
    summary: {
      totalAnalyses: analyses.length,
      avgCoherence: analyses.reduce((sum, a) => sum + a.qualityMetrics.coherenceScore, 0) / Math.max(1, analyses.length),
      avgDecisionClarity: analyses.reduce((sum, a) => sum + a.qualityMetrics.decisionClarity, 0) / Math.max(1, analyses.length),
      totalErrors: analyses.reduce((sum, a) => sum + a.errors.length, 0),
      totalBacktracks: analyses.reduce((sum, a) => sum + a.backtracks.length, 0)
    }
  })
}

// =============================================================================
// POST HANDLERS
// =============================================================================

async function handleParseBlocks(body: { sessionId: string; messages: any[] }) {
  const { sessionId, messages } = body
  
  if (!sessionId || !messages || messages.length === 0) {
    return NextResponse.json({ error: 'sessionId and messages required' }, { status: 400 })
  }
  
  const blocks = await parseContentBlocks(sessionId, messages)
  
  return NextResponse.json({
    success: true,
    blocks,
    metrics: calculateBlockMetrics(blocks)
  })
}

async function handleAnalyzeReasoning(body: { sessionId: string; messages: any[] }) {
  const { sessionId, messages } = body
  
  if (!sessionId || !messages) {
    return NextResponse.json({ error: 'sessionId and messages required' }, { status: 400 })
  }
  
  const blocks = await parseContentBlocks(sessionId, messages)
  const analyses = await analyzeReasoningBlocks(sessionId, blocks)
  
  return NextResponse.json({
    success: true,
    analyses
  })
}

async function handleReconstructThread(body: { sessionId: string; messages: any[] }) {
  const { sessionId, messages } = body
  
  if (!sessionId || !messages) {
    return NextResponse.json({ error: 'sessionId and messages required' }, { status: 400 })
  }
  
  const blocks = await parseContentBlocks(sessionId, messages)
  const reconstruction = await reconstructThread(sessionId, messages, blocks)
  
  return NextResponse.json({
    success: true,
    reconstruction
  })
}

async function handleCalculateTiming(body: { sessionId: string; messages: any[] }) {
  const { sessionId, messages } = body
  
  if (!sessionId || !messages) {
    return NextResponse.json({ error: 'sessionId and messages required' }, { status: 400 })
  }
  
  const blocks = await parseContentBlocks(sessionId, messages)
  const timingChain = await calculateTimingChain(sessionId, blocks)
  
  return NextResponse.json({
    success: true,
    timingChain
  })
}
