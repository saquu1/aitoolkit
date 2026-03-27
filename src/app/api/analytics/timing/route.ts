/**
 * ANALYTICS TIMING API
 * =====================
 * Timing chain calculation endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
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
        return await handleTimingOverview()
      
      case 'session-timing':
        return await handleSessionTiming(searchParams)
      
      case 'gap-analysis':
        return await handleGapAnalysis(searchParams)
      
      case 'idle-analysis':
        return await handleIdleAnalysis(searchParams)
      
      case 'efficiency-trends':
        return await handleEfficiencyTrends(searchParams)
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Timing API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

async function handleTimingOverview() {
  const sessions = await db.aISession.findMany({
    where: {
      duration: { gt: 0 }
    },
    orderBy: { sessionDate: 'desc' },
    take: 100
  })
  
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  const avgDuration = sessions.length > 0 ? totalDuration / sessions.length : 0
  
  // Calculate efficiency distribution
  const efficiencyBuckets = {
    high: 0,    // > 80%
    medium: 0,  // 50-80%
    low: 0      // < 50%
  }
  
  for (const session of sessions) {
    const efficiency = calculateSessionEfficiency(session)
    if (efficiency > 80) efficiencyBuckets.high++
    else if (efficiency > 50) efficiencyBuckets.medium++
    else efficiencyBuckets.low++
  }
  
  return NextResponse.json({
    success: true,
    overview: {
      totalSessions: sessions.length,
      totalDuration,
      avgDuration,
      avgDurationMinutes: avgDuration / 60,
      efficiencyBuckets,
      efficiencyDistribution: {
        high: sessions.length > 0 ? (efficiencyBuckets.high / sessions.length) * 100 : 0,
        medium: sessions.length > 0 ? (efficiencyBuckets.medium / sessions.length) * 100 : 0,
        low: sessions.length > 0 ? (efficiencyBuckets.low / sessions.length) * 100 : 0
      }
    }
  })
}

async function handleSessionTiming(searchParams: URLSearchParams) {
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
  
  const timingData = buildSessionTimingData(session)
  
  return NextResponse.json({
    success: true,
    timing: timingData
  })
}

async function handleGapAnalysis(searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '7')
  
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  const sessions = await db.aISession.findMany({
    where: {
      sessionDate: { gte: since }
    },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' }
      }
    },
    orderBy: { sessionDate: 'asc' }
  })
  
  const gapAnalysis = {
    interSessionGaps: [] as Array<{ from: Date; to: Date; duration: number }>,
    avgGapBetweenSessions: 0,
    longestGap: { from: new Date(), to: new Date(), duration: 0 },
    gapDistribution: {
      short: 0,   // < 1 hour
      medium: 0,  // 1-4 hours
      long: 0     // > 4 hours
    }
  }
  
  for (let i = 1; i < sessions.length; i++) {
    const prevSession = sessions[i - 1]
    const currSession = sessions[i]
    
    const prevEndTime = new Date(prevSession.sessionDate)
    prevEndTime.setSeconds(prevEndTime.getSeconds() + (prevSession.duration || 0))
    
    const currStartTime = new Date(currSession.sessionDate)
    const gapMs = currStartTime.getTime() - prevEndTime.getTime()
    const gapMinutes = gapMs / (1000 * 60)
    
    if (gapMinutes > 0) {
      gapAnalysis.interSessionGaps.push({
        from: prevEndTime,
        to: currStartTime,
        duration: gapMinutes
      })
      
      if (gapMinutes < 60) gapAnalysis.gapDistribution.short++
      else if (gapMinutes < 240) gapAnalysis.gapDistribution.medium++
      else gapAnalysis.gapDistribution.long++
      
      if (gapMinutes > gapAnalysis.longestGap.duration) {
        gapAnalysis.longestGap = {
          from: prevEndTime,
          to: currStartTime,
          duration: gapMinutes
        }
      }
    }
  }
  
  const totalGapDuration = gapAnalysis.interSessionGaps.reduce((sum, g) => sum + g.duration, 0)
  gapAnalysis.avgGapBetweenSessions = gapAnalysis.interSessionGaps.length > 0 
    ? totalGapDuration / gapAnalysis.interSessionGaps.length 
    : 0
  
  return NextResponse.json({
    success: true,
    gapAnalysis
  })
}

async function handleIdleAnalysis(searchParams: URLSearchParams) {
  const sessionId = searchParams.get('sessionId')
  const days = parseInt(searchParams.get('days') || '7')
  
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  const whereClause: any = sessionId 
    ? { id: sessionId }
    : { sessionDate: { gte: since } }
  
  const sessions = await db.aISession.findMany({
    where: whereClause,
    include: {
      messages: {
        orderBy: { timestamp: 'asc' }
      }
    }
  })
  
  const idleAnalysis = {
    totalIdleTime: 0,
    avgIdlePerSession: 0,
    idlePeriods: [] as Array<{
      sessionId: string
      startTime: Date
      endTime: Date
      duration: number
      type: string
    }>,
    idleHotspots: [] as Array<{ hour: number; count: number }>
  }
  
  // Initialize hourly buckets
  const hourlyIdle = new Map<number, number>()
  for (let i = 0; i < 24; i++) hourlyIdle.set(i, 0)
  
  for (const session of sessions) {
    const messages = session.messages || []
    
    for (let i = 1; i < messages.length; i++) {
      const prevMsg = messages[i - 1]
      const currMsg = messages[i]
      
      const prevTime = new Date(prevMsg.timestamp || session.sessionDate)
      const currTime = new Date(currMsg.timestamp || session.sessionDate)
      const gapMs = currTime.getTime() - prevTime.getTime()
      const gapSeconds = gapMs / 1000
      
      // Consider > 30 seconds as idle
      if (gapSeconds > 30) {
        const idlePeriod = {
          sessionId: session.id,
          startTime: prevTime,
          endTime: currTime,
          duration: gapSeconds,
          type: gapSeconds > 120 ? 'thinking' : 'processing'
        }
        
        idleAnalysis.idlePeriods.push(idlePeriod)
        idleAnalysis.totalIdleTime += gapSeconds
        
        // Track hourly distribution
        const hour = prevTime.getHours()
        hourlyIdle.set(hour, (hourlyIdle.get(hour) || 0) + gapSeconds)
      }
    }
  }
  
  idleAnalysis.avgIdlePerSession = sessions.length > 0 
    ? idleAnalysis.totalIdleTime / sessions.length 
    : 0
  
  idleAnalysis.idleHotspots = [...hourlyIdle.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
  
  return NextResponse.json({
    success: true,
    idleAnalysis,
    summary: {
      totalSessions: sessions.length,
      totalIdleTimeMinutes: idleAnalysis.totalIdleTime / 60,
      avgIdlePerSessionMinutes: idleAnalysis.avgIdlePerSession / 60,
      peakIdleHour: idleAnalysis.idleHotspots[0]?.hour || 0
    }
  })
}

async function handleEfficiencyTrends(searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '30')
  
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  const sessions = await db.aISession.findMany({
    where: {
      sessionDate: { gte: since }
    },
    orderBy: { sessionDate: 'asc' }
  })
  
  // Group by date
  const dailyData = new Map<string, {
    sessions: number
    totalDuration: number
    totalTokens: number
    totalFeatures: number
    totalIssues: number
  }>()
  
  for (const session of sessions) {
    const dateKey = session.sessionDate.toISOString().split('T')[0]
    const data = dailyData.get(dateKey) || {
      sessions: 0,
      totalDuration: 0,
      totalTokens: 0,
      totalFeatures: 0,
      totalIssues: 0
    }
    
    data.sessions++
    data.totalDuration += session.duration || 0
    data.totalTokens += session.totalTokens
    data.totalFeatures += session.featuresImplemented
    data.totalIssues += session.issuesCreated
    
    dailyData.set(dateKey, data)
  }
  
  // Calculate trends
  const trends: Array<{
    date: string
    efficiency: number
    productivity: number
    utilization: number
    rollingAvg7d: number
  }> = []
  
  const efficiencyWindow: number[] = []
  
  for (const [date, data] of [...dailyData.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const efficiency = calculateDailyEfficiency(data)
    const productivity = data.totalFeatures / Math.max(1, data.sessions) * 10
    const utilization = data.sessions > 0 ? Math.min(100, data.totalDuration / (data.sessions * 3600) * 100) : 0
    
    efficiencyWindow.push(efficiency)
    if (efficiencyWindow.length > 7) efficiencyWindow.shift()
    
    const rollingAvg7d = efficiencyWindow.reduce((a, b) => a + b, 0) / efficiencyWindow.length
    
    trends.push({
      date,
      efficiency,
      productivity,
      utilization,
      rollingAvg7d
    })
  }
  
  return NextResponse.json({
    success: true,
    trends,
    summary: {
      avgEfficiency: trends.reduce((sum, t) => sum + t.efficiency, 0) / Math.max(1, trends.length),
      avgProductivity: trends.reduce((sum, t) => sum + t.productivity, 0) / Math.max(1, trends.length),
      efficiencyTrend: calculateTrendDirection(trends.map(t => t.efficiency))
    }
  })
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateSessionEfficiency(session: any): number {
  if (!session.duration || session.duration === 0) return 100
  
  const outputScore = session.featuresImplemented * 20 + session.issuesResolved * 10
  const inputScore = session.totalTokens / 1000
  const issuePenalty = session.issuesCreated * 5
  
  const efficiency = Math.min(100, Math.max(0,
    (outputScore / Math.max(1, inputScore)) * 50 - issuePenalty + 50
  ))
  
  return Math.round(efficiency)
}

function buildSessionTimingData(session: any): any {
  const messages = session.messages || []
  
  const stages = messages.map((msg: any, index: number) => ({
    index,
    role: msg.role,
    timestamp: msg.timestamp || session.sessionDate,
    contentLength: msg.content?.length || 0
  }))
  
  // Calculate inter-message timings
  const timings = []
  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1]
    const curr = stages[i]
    const duration = curr.timestamp && prev.timestamp
      ? (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000
      : 0
    
    timings.push({
      from: prev.role,
      to: curr.role,
      duration
    })
  }
  
  return {
    sessionId: session.id,
    startTime: session.startTime || session.sessionDate,
    endTime: session.endTime || null,
    totalDuration: session.duration || 0,
    stages,
    timings,
    summary: {
      totalStages: stages.length,
      avgTimeBetweenStages: timings.length > 0 
        ? timings.reduce((sum, t) => sum + t.duration, 0) / timings.length 
        : 0
    }
  }
}

function calculateDailyEfficiency(data: {
  sessions: number
  totalDuration: number
  totalTokens: number
  totalFeatures: number
  totalIssues: number
}): number {
  if (data.sessions === 0) return 0
  
  const outputScore = data.totalFeatures * 20
  const inputScore = data.totalTokens / 1000
  const issuePenalty = data.totalIssues * 5
  
  return Math.min(100, Math.max(0,
    (outputScore / Math.max(1, inputScore)) * 50 - issuePenalty + 50
  ))
}

function calculateTrendDirection(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable'
  
  const recent = values.slice(-7)
  const older = values.slice(-14, -7)
  
  if (older.length === 0) return 'stable'
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
  
  const change = (recentAvg - olderAvg) / Math.max(1, olderAvg)
  
  if (change > 0.1) return 'up'
  if (change < -0.1) return 'down'
  return 'stable'
}
