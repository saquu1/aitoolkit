/**
 * AI CODING ANALYTICS API
 * =======================
 * Comprehensive analytics endpoints for AI coding session tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { 
  extractAnalyticsFromBatchResponse,
  getAnalyticsOverview,
  getRecurringPatterns,
  getCostAnalysis
} from '@/lib/analytics-extraction-service'
import { 
  getFileHeatmap,
  getCalendarHeatmap,
  getKanbanBoard,
  updateKanbanIssue
} from '@/lib/analytics/dashboard'

// =============================================================================
// GET ENDPOINTS
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'overview'
  
  try {
    // Check database connection first with timeout
    const dbCheck = await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout')), 5000))
    ]).catch((err) => {
      console.error('Database connection error:', err)
      throw new Error('Database connection failed. Please check your DATABASE_URL environment variable.')
    })
    
    switch (action) {
      case 'overview':
        return await handleOverview(searchParams)
      
      case 'sessions':
        return await handleGetSessions(searchParams)
      
      case 'session-details':
        return await handleSessionDetails(searchParams)
      
      case 'issues':
        return await handleGetIssues(searchParams)
      
      case 'features':
        return await handleGetFeatures(searchParams)
      
      case 'patterns':
        return await handleGetPatterns()
      
      case 'cost-analysis':
        return await handleCostAnalysis(searchParams)
      
      case 'dashboard':
        return await handleDashboard()
      
      case 'recurrence-matrix':
        return await handleRecurrenceMatrix()
      
      case 'efficiency-metrics':
        return await handleEfficiencyMetrics(searchParams)
      
      case 'health':
        return NextResponse.json({ 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          database: 'connected'
        })
      
      case 'file-heatmap':
        return await handleFileHeatmap(searchParams)
      
      case 'calendar-heatmap':
        return await handleCalendarHeatmap(searchParams)
      
      case 'kanban-board':
        return await handleKanbanBoard()
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      action,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// =============================================================================
// POST ENDPOINTS
// =============================================================================

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body
  
  try {
    switch (action) {
      case 'import-batch':
        return await handleImportBatch(body)
      
      case 'update-issue':
        return await handleUpdateIssue(body)
      
      case 'mark-pattern':
        return await handleMarkPattern(body)
      
      case 'generate-report':
        return await handleGenerateReport(body)
      
      case 'update-kanban-issue':
        return await handleUpdateKanbanIssue(body)
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

async function handleOverview(searchParams: URLSearchParams) {
  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
  const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
  
  try {
    const overview = await getAnalyticsOverview(startDate, endDate)
    
    return NextResponse.json({
      success: true,
      data: overview
    })
  } catch (error) {
    // Return empty state if no data or error
    return NextResponse.json({
      success: true,
      data: {
        totalSessions: 0,
        totalTokens: 0,
        totalCost: 0,
        totalIssues: 0,
        resolvedIssues: 0,
        totalFeatures: 0,
        avgDuration: 0,
        modelDistribution: {},
        categoryDistribution: {},
        issueTypeDistribution: {},
        sessions: [],
        error: error instanceof Error ? error.message : 'Failed to fetch analytics data'
      }
    })
  }
}

async function handleGetSessions(searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const category = searchParams.get('category')
  const model = searchParams.get('model')
  
  const where: any = {}
  if (category) where.category = category
  if (model) where.model = model
  
  const sessions = await db.aISession.findMany({
    where,
    include: {
      _count: {
        select: { issues: true, features: true }
      }
    },
    orderBy: { sessionDate: 'desc' },
    take: limit,
    skip: offset
  })
  
  const total = await db.aISession.count({ where })
  
  return NextResponse.json({
    success: true,
    sessions,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    }
  })
}

async function handleSessionDetails(searchParams: URLSearchParams) {
  const sessionId = searchParams.get('sessionId')
  const chatId = searchParams.get('chatId')
  
  if (!sessionId && !chatId) {
    return NextResponse.json({ error: 'sessionId or chatId required' }, { status: 400 })
  }
  
  const where = sessionId ? { id: sessionId } : { chatId }
  
  const session = await db.aISession.findFirst({
    where,
    include: {
      issues: true,
      features: true,
      costs: true,
      messages: {
        orderBy: { timestamp: 'asc' },
        take: 100
      }
    }
  })
  
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  return NextResponse.json({
    success: true,
    session
  })
}

async function handleGetIssues(searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '100')
  const type = searchParams.get('type')
  const severity = searchParams.get('severity')
  const status = searchParams.get('status')
  const recurring = searchParams.get('recurring') === 'true'
  
  const where: any = {}
  if (type) where.issueType = type
  if (severity) where.severity = severity
  if (status) where.status = status
  if (recurring) where.recurrenceCount = { gte: 1 }
  
  const issues = await db.aIIssue.findMany({
    where,
    include: {
      session: {
        select: {
          id: true,
          chatId: true,
          sessionDate: true,
          title: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })
  
  // Group by type for distribution
  const distribution = await db.aIIssue.groupBy({
    by: ['issueType'],
    _count: { id: true },
    where
  })
  
  return NextResponse.json({
    success: true,
    issues,
    distribution: distribution.map(d => ({
      type: d.issueType,
      count: d._count.id
    }))
  })
}

async function handleGetFeatures(searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '100')
  const type = searchParams.get('type')
  
  const where: any = {}
  if (type) where.featureType = type
  
  const features = await db.aIFeature.findMany({
    where,
    include: {
      session: {
        select: {
          id: true,
          sessionDate: true,
          title: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })
  
  // Group by type
  const distribution = await db.aIFeature.groupBy({
    by: ['featureType'],
    _count: { id: true }
  })
  
  return NextResponse.json({
    success: true,
    features,
    distribution: distribution.map(d => ({
      type: d.featureType,
      count: d._count.id
    }))
  })
}

async function handleGetPatterns() {
  const patterns = await getRecurringPatterns()
  
  // Also get stored patterns
  const storedPatterns = await db.aIPattern.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { occurrenceCount: 'desc' },
    take: 20
  })
  
  return NextResponse.json({
    success: true,
    patterns: {
      fromIssues: patterns,
      stored: storedPatterns
    }
  })
}

async function handleCostAnalysis(searchParams: URLSearchParams) {
  const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
  const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
  
  const analysis = await getCostAnalysis(startDate, endDate)
  
  return NextResponse.json({
    success: true,
    analysis
  })
}

async function handleDashboard() {
  // Get last 30 days of data
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const [
    sessions,
    issues,
    features,
    costs,
    patterns,
    chatLogs // Add ChatLog as fallback data source
  ] = await Promise.all([
    // Sessions
    db.aISession.findMany({
      where: { sessionDate: { gte: thirtyDaysAgo } },
      orderBy: { sessionDate: 'desc' },
      take: 50
    }),
    
    // Issues
    db.aIIssue.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      include: { session: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    
    // Features
    db.aIFeature.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    
    // Costs
    db.aICostRecord.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' },
      take: 100
    }),
    
    // Patterns
    db.aIPattern.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { occurrenceCount: 'desc' },
      take: 10
    }),
    
    // ChatLogs (fallback data source)
    db.chatLog.findMany({
      orderBy: { sessionDate: 'desc' },
      take: 100
    })
  ])
  
  // Calculate summary metrics - use ChatLog as fallback
  const totalSessions = sessions.length || chatLogs.length
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0)
  const totalCost = sessions.reduce((sum, s) => sum + s.estimatedCost, 0)
  
  // Count issues from AIIssue table, or fallback to ChatLog
  let totalIssues = issues.length
  let resolvedIssues = issues.filter(i => i.status === 'RESOLVED').length
  
  // Fallback: Count issues from ChatLog if AIIssue table is empty
  if (totalIssues === 0 && chatLogs.length > 0) {
    for (const log of chatLogs) {
      try {
        const issuesSolved = JSON.parse(log.issuesSolved || '[]')
        totalIssues += issuesSolved.length
        resolvedIssues += issuesSolved.length // Assume all in issuesSolved are resolved
      } catch {}
    }
  }
  
  // Count features from AIFeature table, or fallback to ChatLog
  let totalFeatures = features.length
  if (totalFeatures === 0 && chatLogs.length > 0) {
    for (const log of chatLogs) {
      try {
        const featuresAdded = JSON.parse(log.featuresAdded || '[]')
        totalFeatures += featuresAdded.length
      } catch {}
    }
  }
  
  // Model distribution
  const modelDistribution: Record<string, number> = {}
  for (const session of sessions) {
    modelDistribution[session.model] = (modelDistribution[session.model] || 0) + 1
  }
  
  // Issue type distribution
  const issueDistribution: Record<string, number> = {}
  for (const issue of issues) {
    issueDistribution[issue.issueType] = (issueDistribution[issue.issueType] || 0) + 1
  }
  
  // Fallback: Categorize issues from ChatLog if issue distribution is empty
  if (Object.keys(issueDistribution).length === 0 && chatLogs.length > 0) {
    for (const log of chatLogs) {
      try {
        const issuesSolved = JSON.parse(log.issuesSolved || '[]')
        for (const issue of issuesSolved) {
          // Simple categorization based on keywords
          const issueLower = issue.toLowerCase()
          let issueType = 'general'
          if (issueLower.includes('error') || issueLower.includes('exception') || issueLower.includes('crash')) issueType = 'error'
          else if (issueLower.includes('bug') || issueLower.includes('fix')) issueType = 'bug'
          else if (issueLower.includes('type') || issueLower.includes('syntax')) issueType = 'typescript'
          else if (issueLower.includes('auth') || issueLower.includes('login') || issueLower.includes('permission')) issueType = 'auth'
          else if (issueLower.includes('database') || issueLower.includes('sql') || issueLower.includes('prisma')) issueType = 'database'
          else if (issueLower.includes('api') || issueLower.includes('endpoint')) issueType = 'api'
          issueDistribution[issueType] = (issueDistribution[issueType] || 0) + 1
        }
      } catch {}
    }
  }
  
  // Category distribution
  const categoryDistribution: Record<string, number> = {}
  for (const session of sessions) {
    categoryDistribution[session.category] = (categoryDistribution[session.category] || 0) + 1
  }
  
  // Daily trend
  const dailyStats: Record<string, { sessions: number; tokens: number; cost: number }> = {}
  for (const session of sessions) {
    const dateKey = session.sessionDate.toISOString().split('T')[0]
    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = { sessions: 0, tokens: 0, cost: 0 }
    }
    dailyStats[dateKey].sessions++
    dailyStats[dateKey].tokens += session.totalTokens
    dailyStats[dateKey].cost += session.estimatedCost
  }
  
  return NextResponse.json({
    success: true,
    dashboard: {
      summary: {
        totalSessions,
        totalTokens,
        totalCost,
        totalIssues,
        resolvedIssues,
        totalFeatures,
        avgSessionDuration: sessions.length > 0 
          ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length 
          : 0
      },
      distributions: {
        models: modelDistribution,
        issues: issueDistribution,
        categories: categoryDistribution
      },
      dailyStats,
      recentSessions: sessions.slice(0, 10),
      recentIssues: issues.length > 0 ? issues.slice(0, 10) : chatLogs.flatMap((log: any) => {
        try {
          const issuesSolved = JSON.parse(log.issuesSolved || '[]')
          return issuesSolved.map((issue: string, i: number) => ({
            id: `${log.id}_issue_${i}`,
            title: issue.substring(0, 100),
            issueType: 'general',
            severity: 'medium',
            status: 'resolved',
            createdAt: log.importedAt,
            session: { title: log.title }
          }))
        } catch { return [] }
      }).slice(0, 10),
      recentFeatures: features.slice(0, 10),
      topPatterns: patterns
    }
  })
}

async function handleRecurrenceMatrix() {
  // Get issues grouped by type and title
  const issues = await db.aIIssue.findMany({
    where: { recurrenceCount: { gte: 1 } },
    include: {
      session: {
        select: { sessionDate: true }
      }
    }
  })
  
  // Build matrix
  const matrix: Record<string, { type: string; count: number; lastSeen: Date }> = {}
  
  for (const issue of issues) {
    const key = `${issue.issueType}:${issue.title.slice(0, 30)}`
    if (!matrix[key]) {
      matrix[key] = {
        type: issue.issueType,
        count: 0,
        lastSeen: issue.createdAt
      }
    }
    matrix[key].count++
    if (issue.createdAt > matrix[key].lastSeen) {
      matrix[key].lastSeen = issue.createdAt
    }
  }
  
  const sortedMatrix = Object.entries(matrix)
    .map(([key, value]) => ({
      pattern: key,
      ...value
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
  
  return NextResponse.json({
    success: true,
    matrix: sortedMatrix
  })
}

async function handleEfficiencyMetrics(searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '30')
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const sessions = await db.aISession.findMany({
    where: { sessionDate: { gte: startDate } },
    include: {
      issues: true,
      features: true
    }
  })
  
  // Calculate efficiency metrics
  const tokensPerFeature = sessions
    .filter(s => s.featuresImplemented > 0)
    .map(s => s.totalTokens / s.featuresImplemented)
  
  const tokensPerIssue = sessions
    .filter(s => s.issuesResolved > 0)
    .map(s => s.totalTokens / s.issuesResolved)
  
  const costPerFeature = sessions
    .filter(s => s.featuresImplemented > 0)
    .map(s => s.estimatedCost / s.featuresImplemented)
  
  const avgTokensPerFeature = tokensPerFeature.length > 0
    ? tokensPerFeature.reduce((a, b) => a + b, 0) / tokensPerFeature.length
    : 0
  
  const avgTokensPerIssue = tokensPerIssue.length > 0
    ? tokensPerIssue.reduce((a, b) => a + b, 0) / tokensPerIssue.length
    : 0
  
  const avgCostPerFeature = costPerFeature.length > 0
    ? costPerFeature.reduce((a, b) => a + b, 0) / costPerFeature.length
    : 0
  
  // Resolution rate
  const totalIssues = sessions.reduce((sum, s) => sum + s.issuesCreated, 0)
  const resolvedIssues = sessions.reduce((sum, s) => sum + s.issuesResolved, 0)
  const resolutionRate = totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0
  
  // Efficiency score (0-100)
  const efficiencyScore = Math.min(100, Math.round(
    (resolutionRate * 0.3) +
    (Math.min(100, 10000 / Math.max(1, avgTokensPerFeature)) * 0.3) +
    (Math.min(100, 1000 / Math.max(0.01, avgCostPerFeature)) * 0.2) +
    (Math.min(100, sessions.reduce((sum, s) => sum + s.featuresImplemented, 0) / sessions.length * 10) * 0.2)
  ))
  
  return NextResponse.json({
    success: true,
    metrics: {
      avgTokensPerFeature,
      avgTokensPerIssue,
      avgCostPerFeature,
      resolutionRate,
      efficiencyScore,
      totalSessions: sessions.length,
      totalFeatures: sessions.reduce((sum, s) => sum + s.featuresImplemented, 0),
      totalIssues,
      resolvedIssues
    }
  })
}

async function handleFileHeatmap(searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '30')
  
  const files = await getFileHeatmap(days)
  const calendar = await getCalendarHeatmap(days)
  
  // Calculate summary
  const totalFiles = files.length
  const totalChanges = files.reduce((sum, f) => sum + f.changeCount, 0)
  const totalLinesChanged = files.reduce((sum, f) => sum + f.linesChanged, 0)
  
  // Top categories
  const categoryCount: Record<string, number> = {}
  for (const file of files) {
    categoryCount[file.category] = (categoryCount[file.category] || 0) + file.changeCount
  }
  const topCategories = Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
  
  // Most changed files
  const mostChangedFiles = files
    .slice(0, 10)
    .map(f => ({ path: f.filePath, count: f.changeCount }))
  
  return NextResponse.json({
    success: true,
    files,
    calendar,
    summary: {
      totalFiles,
      totalChanges,
      totalLinesChanged,
      topCategories,
      mostChangedFiles
    }
  })
}

async function handleCalendarHeatmap(searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '365')
  
  const calendar = await getCalendarHeatmap(days)
  
  return NextResponse.json({
    success: true,
    calendar
  })
}

async function handleKanbanBoard() {
  const board = await getKanbanBoard()
  
  // Calculate stats
  const allIssues = [
    ...board.backlog,
    ...board.detected,
    ...board.in_progress,
    ...board.testing,
    ...board.resolved
  ]
  
  const bySeverity: Record<string, number> = {}
  const byType: Record<string, number> = {}
  
  for (const issue of allIssues) {
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1
    byType[issue.issueType] = (byType[issue.issueType] || 0) + 1
  }
  
  const resolvedCount = board.resolved.length
  const totalIssues = allIssues.length
  const resolutionRate = totalIssues > 0 ? (resolvedCount / totalIssues) * 100 : 0
  
  // Calculate avg resolution time
  const resolvedIssues = board.resolved.filter(i => i.resolvedAt && i.createdAt)
  let avgResolutionTime = 0
  if (resolvedIssues.length > 0) {
    const totalHours = resolvedIssues.reduce((sum, i) => {
      const created = new Date(i.createdAt).getTime()
      const resolved = new Date(i.resolvedAt!).getTime()
      return sum + (resolved - created) / (1000 * 60 * 60)
    }, 0)
    avgResolutionTime = totalHours / resolvedIssues.length
  }
  
  return NextResponse.json({
    success: true,
    board,
    stats: {
      totalIssues,
      bySeverity,
      byType,
      resolutionRate,
      avgResolutionTime
    }
  })
}

// =============================================================================
// POST HANDLERS
// =============================================================================

async function handleImportBatch(body: { chatId: string; messages: any[] }) {
  const { chatId, messages } = body
  
  if (!chatId || !messages || messages.length === 0) {
    return NextResponse.json({ error: 'chatId and messages required' }, { status: 400 })
  }
  
  const result = await extractAnalyticsFromBatchResponse(chatId, messages, {
    saveToDb: true,
    enhanceWithAI: false
  })
  
  return NextResponse.json({
    success: true,
    imported: {
      session: result.session,
      issuesCount: result.issues.length,
      featuresCount: result.features.length,
      patternsCount: result.patterns.length
    }
  })
}

async function handleUpdateIssue(body: { issueId: string; updates: any }) {
  const { issueId, updates } = body
  
  if (!issueId) {
    return NextResponse.json({ error: 'issueId required' }, { status: 400 })
  }
  
  const issue = await db.aIIssue.update({
    where: { id: issueId },
    data: {
      ...updates,
      updatedAt: new Date()
    }
  })
  
  return NextResponse.json({
    success: true,
    issue
  })
}

async function handleMarkPattern(body: { patternId: string; status: string }) {
  const { patternId, status } = body
  
  if (!patternId || !status) {
    return NextResponse.json({ error: 'patternId and status required' }, { status: 400 })
  }
  
  const pattern = await db.aIPattern.update({
    where: { id: patternId },
    data: {
      status,
      updatedAt: new Date()
    }
  })
  
  return NextResponse.json({
    success: true,
    pattern
  })
}

async function handleGenerateReport(body: { type: string; startDate: string; endDate: string }) {
  const { type, startDate, endDate } = body
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  const sessions = await db.aISession.findMany({
    where: {
      sessionDate: {
        gte: start,
        lte: end
      }
    },
    include: {
      issues: true,
      features: true,
      costs: true
    }
  })
  
  // Generate report based on type
  const report = {
    period: { start, end },
    summary: {
      totalSessions: sessions.length,
      totalTokens: sessions.reduce((sum, s) => sum + s.totalTokens, 0),
      totalCost: sessions.reduce((sum, s) => sum + s.estimatedCost, 0),
      totalFeatures: sessions.reduce((sum, s) => sum + s.featuresImplemented, 0),
      totalIssues: sessions.reduce((sum, s) => sum + s.issuesCreated, 0)
    },
    sessions: sessions.slice(0, 100)
  }
  
  return NextResponse.json({
    success: true,
    report
  })
}

async function handleUpdateKanbanIssue(body: { issueId: string; updates: { column?: string; order?: number; severity?: string } }) {
  const { issueId, updates } = body
  
  if (!issueId) {
    return NextResponse.json({ error: 'issueId required' }, { status: 400 })
  }
  
  const result = await updateKanbanIssue(issueId, updates as any)
  
  return NextResponse.json(result)
}
