/**
 * UNIFIED ANALYTICS DATA ENDPOINT
 * ================================
 * Single endpoint that connects chat-logs data to analytics dashboard
 * Uses extraction-utils.ts for all data extraction
 * 
 * This is the SYNC LAYER between:
 * - Chat-Logs (data source)
 * - Analytics (dashboard)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  extractSessionData,
  extractContentBlocks,
  extractToolCalls,
  extractFileOperations,
  extractIssuesWithDetails,
  extractFeaturesWithDetails,
  type ExtractedSessionData,
  type ExtractedContentBlock,
  type ExtractedToolCall,
  type ExtractedFileOperation,
  type ExtractedIssue,
  type ExtractedFeature
} from '@/lib/extraction-utils'
import {
  getFileHeatmap,
  getCalendarHeatmap,
  getKanbanBoard,
  getEfficiencyTrends,
  getMetricsBreakdown
} from '@/lib/analytics/dashboard'
import { getAnalyticsOverview, getRecurringPatterns, getCostAnalysis } from '@/lib/analytics-extraction-service'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface UnifiedAnalyticsData {
  // Session data
  sessions: ExtractedSessionData[]
  totalSessions: number
  
  // Aggregated metrics
  summary: {
    totalSessions: number
    totalTokens: number
    totalCost: number
    totalIssues: number
    resolvedIssues: number
    totalFeatures: number
    avgEfficiency: number
    avgDuration: number
  }
  
  // Distributions
  distributions: {
    models: Record<string, number>
    categories: Record<string, number>
    issueTypes: Record<string, number>
    featureTypes: Record<string, number>
  }
  
  // Trends
  trends: {
    dailyStats: Record<string, any>
    efficiencyTrends: any[]
  }
  
  // Detailed data for each tab
  contentBlocks: ExtractedContentBlock[]
  toolCalls: ExtractedToolCall[]
  fileOperations: ExtractedFileOperation[]
  issues: ExtractedIssue[]
  features: ExtractedFeature[]
  
  // Dashboard specific
  fileHeatmap: any[]
  calendarHeatmap: any[]
  kanbanBoard: any
  
  // Patterns
  patterns: any[]
}

// =============================================================================
// MAIN GET HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'all'
  const sessionId = searchParams.get('sessionId')
  const days = parseInt(searchParams.get('days') || '30')
  const limit = parseInt(searchParams.get('limit') || '100')
  
  try {
    switch (action) {
      case 'all':
        return await handleGetAllData(days, limit)
      
      case 'sessions':
        return await handleGetSessions(limit)
      
      case 'session':
        return await handleGetSession(sessionId)
      
      case 'summary':
        return await handleGetSummary(days)
      
      case 'content-blocks':
        return await handleGetContentBlocks(sessionId, limit)
      
      case 'tool-calls':
        return await handleGetToolCalls(sessionId, limit)
      
      case 'file-operations':
        return await handleGetFileOperations(sessionId, limit)
      
      case 'issues':
        return await handleGetIssues(limit)
      
      case 'features':
        return await handleGetFeatures(limit)
      
      case 'file-heatmap':
        return await handleGetFileHeatmap(days)
      
      case 'calendar-heatmap':
        return await handleGetCalendarHeatmap(days)
      
      case 'kanban':
        return await handleGetKanban()
      
      case 'patterns':
        return await handleGetPatterns()
      
      case 'trends':
        return await handleGetTrends(days)
      
      case 'intelligence':
        return await handleGetIntelligence(days)
      
      case 'sync-status':
        return await handleGetSyncStatus()
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Analytics data API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      action
    }, { status: 500 })
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * Get all analytics data in one call (for initial page load)
 */
async function handleGetAllData(days: number, limit: number) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  // Fetch all data in parallel
  const [
    dbSessions,
    dbIssues,
    dbFeatures,
    dbContentBlocks,
    dbToolCalls,
    dbFileOps,
    fileHeatmap,
    calendarHeatmap,
    kanbanBoard,
    patterns,
    efficiencyTrends
  ] = await Promise.all([
    // Sessions from database
    db.aISession.findMany({
      where: { sessionDate: { gte: since } },
      orderBy: { sessionDate: 'desc' },
      take: limit,
      include: {
        issues: true,
        features: true
      }
    }),
    
    // Issues
    db.aIIssue.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        session: { select: { id: true, title: true, sessionDate: true } }
      }
    }),
    
    // Features
    db.aIFeature.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        session: { select: { id: true, title: true, sessionDate: true } }
      }
    }),
    
    // Content blocks
    db.contentBlock.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit * 10
    }),
    
    // Tool calls
    db.toolCall.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit * 5
    }),
    
    // File operations
    db.fileOperation.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit * 5
    }),
    
    // File heatmap
    getFileHeatmap(days),
    
    // Calendar heatmap
    getCalendarHeatmap(days),
    
    // Kanban board
    getKanbanBoard(),
    
    // Patterns
    getRecurringPatterns(),
    
    // Efficiency trends
    getEfficiencyTrends(days)
  ])
  
  // Transform sessions
  const sessions = dbSessions.map(s => transformSession(s))
  
  // Calculate summary
  const summary = calculateSummary(dbSessions)
  
  // Calculate distributions
  const distributions = calculateDistributions(dbSessions, dbIssues, dbFeatures)
  
  // Calculate daily stats
  const dailyStats = calculateDailyStats(dbSessions)
  
  // Transform content blocks
  const contentBlocks = dbContentBlocks.map(b => ({
    blockIndex: b.blockIndex,
    blockType: b.blockType as 'REASONING' | 'TEXT' | 'TOOL_CALLS',
    content: b.content || '',
    contentLength: b.contentLength,
    startedAt: b.startedAt,
    endedAt: b.endedAt,
    durationMs: b.durationMs,
    containsError: b.containsError,
    containsDecision: b.containsDecision,
    containsBacktrack: b.containsBacktrack,
    confidenceLevel: b.confidenceLevel as any,
    keywords: JSON.parse(b.keywords || '[]'),
    errorKeywords: JSON.parse(b.errorKeywords || '[]'),
    decisionKeywords: JSON.parse(b.decisionKeywords || '[]'),
    strategyChanges: JSON.parse(b.strategyChanges || '[]')
  }))
  
  // Transform tool calls
  const toolCalls = dbToolCalls.map(tc => ({
    externalCallId: tc.externalCallId || undefined,
    toolName: tc.toolName as 'BASH' | 'WRITE' | 'READ' | 'EDIT' | 'TODO_WRITE' | 'OTHER',
    description: tc.description || undefined,
    command: tc.command || undefined,
    filepath: tc.filepath || undefined,
    oldContent: tc.oldContent || undefined,
    newContent: tc.newContent || undefined,
    resultContent: tc.resultContent || undefined,
    resultStatus: tc.resultStatus || undefined,
    startedAt: tc.startedAt || undefined,
    endedAt: tc.endedAt || undefined,
    durationMs: tc.durationMs || undefined,
    isGitOperation: tc.isGitOperation,
    isBuildCommand: tc.isBuildCommand,
    isFileOperation: ['WRITE', 'READ', 'EDIT'].includes(tc.toolName),
    isReadOperation: tc.toolName === 'READ',
    isWriteOperation: tc.toolName === 'WRITE',
    isEditOperation: tc.toolName === 'EDIT',
    isTodoWrite: tc.toolName === 'TODO_WRITE',
    isDangerous: tc.command ? isDangerousCommand(tc.command) : false,
    arguments: {},
    result: tc.resultContent || undefined
  }))
  
  // Transform file operations
  const fileOperations = dbFileOps.map(fo => ({
    filepath: fo.filepath,
    operation: fo.operation as 'CREATED' | 'MODIFIED' | 'READ' | 'DELETED',
    linesAdded: fo.linesAdded,
    linesRemoved: fo.linesRemoved,
    netLines: fo.netLines,
    contentHash: undefined,
    contentSize: 0,
    fileType: fo.fileType || undefined,
    fileCategory: fo.fileCategory || undefined,
    errorCount: fo.errorCount,
    editCount: fo.editCount,
    tokensConsumed: 0,
    costUSD: 0
  }))
  
  // Transform issues
  const issues = dbIssues.map(i => ({
    issueType: i.issueType,
    severity: i.severity,
    title: i.title,
    description: i.description || undefined,
    category: categorizeIssue(i.issueType),
    tags: [],
    fileAffected: i.fileAffected || undefined,
    lineNumber: i.lineNumber || undefined,
    codeSnippet: i.codeSnippet || undefined,
    errorMessage: i.errorMessage || undefined,
    filesInvolved: JSON.parse(i.affectedFiles || '[]'),
    resolution: i.resolution || undefined,
    resolutionTime: 0,
    resolutionTimeMs: 0,
    attemptsToFix: 1,
    resolvedBy: i.resolvedBy || '',
    status: i.status,
    isRepeat: false,
    recurrenceCount: 0,
    rootCause: undefined,
    preventionTips: [],
    relatedIssues: JSON.parse(i.relatedIssues || '[]'),
    confidenceLevel: 'MEDIUM' as const
  }))
  
  // Transform features
  const features = dbFeatures.map(f => ({
    featureName: f.featureName || f.featureType,
    featureType: f.featureType,
    description: f.description || undefined,
    category: categorizeFeature(f.featureType),
    tags: [],
    module: undefined,
    complexity: 'MEDIUM' as const,
    filesCreated: JSON.parse(f.filesCreated || '[]'),
    filesModified: JSON.parse(f.filesModified || '[]'),
    linesAdded: f.linesAdded,
    linesDeleted: f.linesDeleted,
    linesOfCode: f.linesAdded - f.linesDeleted,
    developmentTime: 0,
    developmentTimeMs: 0,
    complexityScore: 0,
    testCoverage: 0,
    tokensConsumed: 0,
    costUSD: 0,
    hasTests: false,
    hasDocs: false,
    reviewStatus: 'pending',
    dependencies: [],
    dependents: []
  }))
  
  // Build response
  const response: UnifiedAnalyticsData = {
    sessions,
    totalSessions: dbSessions.length,
    summary,
    distributions,
    trends: {
      dailyStats,
      efficiencyTrends
    },
    contentBlocks,
    toolCalls,
    fileOperations,
    issues,
    features,
    fileHeatmap,
    calendarHeatmap,
    kanbanBoard,
    patterns
  }
  
  return NextResponse.json({
    success: true,
    data: response,
    meta: {
      generatedAt: new Date().toISOString(),
      days,
      limit
    }
  })
}

/**
 * Get sessions list
 */
async function handleGetSessions(limit: number) {
  const sessions = await db.aISession.findMany({
    orderBy: { sessionDate: 'desc' },
    take: limit,
    include: {
      _count: {
        select: { issues: true, features: true }
      }
    }
  })
  
  return NextResponse.json({
    success: true,
    sessions: sessions.map(s => transformSession(s))
  })
}

/**
 * Get single session details
 */
async function handleGetSession(sessionId: string | null) {
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }
  
  const session = await db.aISession.findFirst({
    where: { id: sessionId },
    include: {
      issues: true,
      features: true,
      costs: true
    }
  })
  
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }
  
  // Get related content blocks
  const contentBlocks = await db.contentBlock.findMany({
    where: { sessionId: session.id },
    orderBy: { blockIndex: 'asc' }
  })
  
  // Get related tool calls
  const toolCalls = await db.toolCall.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' }
  })
  
  // Get related file operations
  const fileOps = await db.fileOperation.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' }
  })
  
  return NextResponse.json({
    success: true,
    session: transformSession(session),
    contentBlocks: contentBlocks.map(transformContentBlock),
    toolCalls: toolCalls.map(transformToolCall),
    fileOperations: fileOps.map(transformFileOp),
    issues: session.issues,
    features: session.features,
    costs: session.costs
  })
}

/**
 * Get summary statistics
 */
async function handleGetSummary(days: number) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  const sessions = await db.aISession.findMany({
    where: { sessionDate: { gte: since } }
  })
  
  return NextResponse.json({
    success: true,
    summary: calculateSummary(sessions)
  })
}

/**
 * Get content blocks
 */
async function handleGetContentBlocks(sessionId: string | null, limit: number) {
  const where = sessionId ? { sessionId } : {}
  
  const blocks = await db.contentBlock.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit
  })
  
  return NextResponse.json({
    success: true,
    contentBlocks: blocks.map(transformContentBlock)
  })
}

/**
 * Get tool calls
 */
async function handleGetToolCalls(sessionId: string | null, limit: number) {
  const where = sessionId ? { sessionId } : {}
  
  const toolCalls = await db.toolCall.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit
  })
  
  return NextResponse.json({
    success: true,
    toolCalls: toolCalls.map(transformToolCall)
  })
}

/**
 * Get file operations
 */
async function handleGetFileOperations(sessionId: string | null, limit: number) {
  const where = sessionId ? { sessionId } : {}
  
  const fileOps = await db.fileOperation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit
  })
  
  return NextResponse.json({
    success: true,
    fileOperations: fileOps.map(transformFileOp)
  })
}

/**
 * Get issues
 */
async function handleGetIssues(limit: number) {
  const issues = await db.aIIssue.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      session: {
        select: {
          id: true,
          title: true,
          sessionDate: true
        }
      }
    }
  })
  
  return NextResponse.json({
    success: true,
    issues
  })
}

/**
 * Get features
 */
async function handleGetFeatures(limit: number) {
  const features = await db.aIFeature.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      session: {
        select: {
          id: true,
          title: true,
          sessionDate: true
        }
      }
    }
  })
  
  return NextResponse.json({
    success: true,
    features
  })
}

/**
 * Get file heatmap
 */
async function handleGetFileHeatmap(days: number) {
  const heatmap = await getFileHeatmap(days)
  
  return NextResponse.json({
    success: true,
    fileHeatmap: heatmap
  })
}

/**
 * Get calendar heatmap
 */
async function handleGetCalendarHeatmap(days: number) {
  const calendar = await getCalendarHeatmap(days)
  
  return NextResponse.json({
    success: true,
    calendarHeatmap: calendar
  })
}

/**
 * Get kanban board
 */
async function handleGetKanban() {
  const board = await getKanbanBoard()
  
  return NextResponse.json({
    success: true,
    kanbanBoard: board
  })
}

/**
 * Get patterns
 */
async function handleGetPatterns() {
  const patterns = await getRecurringPatterns()
  
  // Also get stored patterns
  const storedPatterns = await db.aIPattern.findMany({
    where: { status: 'active' },
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

/**
 * Get efficiency trends
 */
async function handleGetTrends(days: number) {
  const trends = await getEfficiencyTrends(days)
  const breakdown = await getMetricsBreakdown()
  
  return NextResponse.json({
    success: true,
    trends,
    breakdown
  })
}

/**
 * Get intelligence overview (risk scores, predictions)
 */
async function handleGetIntelligence(days: number) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  // Get recent sessions for analysis
  const sessions = await db.aISession.findMany({
    where: { sessionDate: { gte: since } },
    include: { issues: true }
  })
  
  // Get patterns
  const patterns = await getRecurringPatterns()
  
  // Calculate risk score
  const totalIssues = sessions.reduce((sum, s) => sum + s.issuesCreated, 0)
  const resolvedIssues = sessions.reduce((sum, s) => sum + s.issuesResolved, 0)
  const recurringPatterns = patterns.length
  
  // Risk factors
  const unresolvedRate = totalIssues > 0 ? (totalIssues - resolvedIssues) / totalIssues : 0
  const patternRisk = Math.min(recurringPatterns * 10, 50)
  
  // Risk score (0-100, higher is better)
  const riskScore = Math.round(100 - (unresolvedRate * 50) - patternRisk)
  
  // Count warnings
  const warningCount = sessions.reduce((count, s) => {
    const sessionWarnings = s.issues.filter(i => i.severity === 'high' || i.severity === 'critical').length
    return count + sessionWarnings
  }, 0)
  
  return NextResponse.json({
    success: true,
    intelligence: {
      riskScore: Math.max(0, Math.min(100, riskScore)),
      patternCount: patterns.length,
      warningCount,
      unresolvedIssues: totalIssues - resolvedIssues,
      recommendations: generateRecommendations(patterns, sessions)
    }
  })
}

/**
 * Get sync status
 */
async function handleGetSyncStatus() {
  // Count records in each table
  const [
    sessionsCount,
    issuesCount,
    featuresCount,
    contentBlocksCount,
    toolCallsCount,
    fileOpsCount,
    chatLogsCount,
    rawImportsCount
  ] = await Promise.all([
    db.aISession.count(),
    db.aIIssue.count(),
    db.aIFeature.count(),
    db.contentBlock.count(),
    db.toolCall.count(),
    db.fileOperation.count(),
    db.chatLog.count(),
    db.rawImport.count()
  ])
  
  return NextResponse.json({
    success: true,
    syncStatus: {
      lastSync: new Date().toISOString(),
      records: {
        sessions: sessionsCount,
        issues: issuesCount,
        features: featuresCount,
        contentBlocks: contentBlocksCount,
        toolCalls: toolCallsCount,
        fileOperations: fileOpsCount,
        chatLogs: chatLogsCount,
        rawImports: rawImportsCount
      },
      health: {
        database: 'connected',
        extraction: 'ready',
        sync: 'active'
      }
    }
  })
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function transformSession(s: any): ExtractedSessionData {
  return {
    chatId: s.chatId,
    sessionDate: s.sessionDate,
    startTime: s.startTime || s.sessionDate,
    endTime: s.endTime,
    duration: s.duration || 0,
    durationMs: (s.duration || 0) * 60000,
    model: s.model,
    modelName: s.model,
    sessionType: detectSessionType(s.title, s.category),
    category: s.category,
    tags: JSON.parse(s.tags || '[]'),
    title: s.title,
    summary: s.summary || '',
    highlights: [],
    status: s.status,
    completed: s.status === 'completed',
    error: undefined,
    inputTokens: s.inputTokens,
    outputTokens: s.outputTokens,
    totalTokens: s.totalTokens,
    cachedTokens: 0,
    cacheHitRate: 0,
    reasoningTokens: 0,
    estimatedCost: s.estimatedCost,
    totalMessages: 0,
    userMessages: 0,
    assistantMessages: 0,
    messageRatio: 0,
    parentMessageId: undefined,
    childMessageIds: [],
    messageIndex: 0,
    externalId: s.chatId,
    totalReasoningMs: 0,
    totalToolCallMs: 0,
    reasoningToToolRatio: 0,
    commandsRun: 0,
    commandsFailed: 0,
    gitCommits: 0,
    buildAttempts: 0,
    pageVersion: undefined,
    gitCommitHash: undefined,
    gitBranch: undefined,
    linesAdded: 0,
    linesDeleted: 0,
    linesOfCode: 0,
    complexityScore: 0,
    efficiencyScore: 0,
    qualityScore: 0,
    filesModified: s.filesModified,
    filesCreated: s.filesCreated,
    filesRead: 0
  }
}

function transformContentBlock(b: any): ExtractedContentBlock {
  return {
    blockIndex: b.blockIndex,
    blockType: b.blockType as 'REASONING' | 'TEXT' | 'TOOL_CALLS',
    content: b.content || '',
    contentLength: b.contentLength,
    startedAt: b.startedAt || undefined,
    endedAt: b.endedAt || undefined,
    durationMs: b.durationMs || undefined,
    containsError: b.containsError,
    containsDecision: b.containsDecision,
    containsBacktrack: b.containsBacktrack,
    confidenceLevel: b.confidenceLevel as any,
    keywords: JSON.parse(b.keywords || '[]'),
    errorKeywords: JSON.parse(b.errorKeywords || '[]'),
    decisionKeywords: JSON.parse(b.decisionKeywords || '[]'),
    strategyChanges: JSON.parse(b.strategyChanges || '[]')
  }
}

function transformToolCall(tc: any): ExtractedToolCall {
  return {
    externalCallId: tc.externalCallId || undefined,
    toolName: tc.toolName as 'BASH' | 'WRITE' | 'READ' | 'EDIT' | 'TODO_WRITE' | 'OTHER',
    description: tc.description || undefined,
    command: tc.command || undefined,
    filepath: tc.filepath || undefined,
    oldContent: tc.oldContent || undefined,
    newContent: tc.newContent || undefined,
    resultContent: tc.resultContent || undefined,
    resultStatus: tc.resultStatus || undefined,
    startedAt: tc.startedAt || undefined,
    endedAt: tc.endedAt || undefined,
    durationMs: tc.durationMs || undefined,
    isGitOperation: tc.isGitOperation,
    isBuildCommand: tc.isBuildCommand,
    isFileOperation: ['WRITE', 'READ', 'EDIT'].includes(tc.toolName),
    isReadOperation: tc.toolName === 'READ',
    isWriteOperation: tc.toolName === 'WRITE',
    isEditOperation: tc.toolName === 'EDIT',
    isTodoWrite: tc.toolName === 'TODO_WRITE',
    isDangerous: tc.command ? isDangerousCommand(tc.command) : false,
    arguments: {},
    result: tc.resultContent || undefined
  }
}

function transformFileOp(fo: any): ExtractedFileOperation {
  return {
    filepath: fo.filepath,
    operation: fo.operation as 'CREATED' | 'MODIFIED' | 'READ' | 'DELETED',
    linesAdded: fo.linesAdded,
    linesRemoved: fo.linesRemoved,
    netLines: fo.netLines,
    contentHash: undefined,
    contentSize: 0,
    fileType: fo.fileType || undefined,
    fileCategory: fo.fileCategory || undefined,
    errorCount: fo.errorCount,
    editCount: fo.editCount,
    tokensConsumed: 0,
    costUSD: 0
  }
}

function calculateSummary(sessions: any[]) {
  const totalSessions = sessions.length
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0)
  const totalCost = sessions.reduce((sum, s) => sum + s.estimatedCost, 0)
  const totalIssues = sessions.reduce((sum, s) => sum + s.issuesCreated, 0)
  const resolvedIssues = sessions.reduce((sum, s) => sum + s.issuesResolved, 0)
  const totalFeatures = sessions.reduce((sum, s) => sum + s.featuresImplemented, 0)
  const avgDuration = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
    : 0
  
  const avgEfficiency = sessions.length > 0
    ? sessions.reduce((sum, s) => {
        const rate = s.issuesCreated > 0 ? (s.issuesResolved / s.issuesCreated) * 100 : 100
        return sum + Math.min(100, rate + s.featuresImplemented * 10)
      }, 0) / sessions.length
    : 0
  
  return {
    totalSessions,
    totalTokens,
    totalCost,
    totalIssues,
    resolvedIssues,
    totalFeatures,
    avgEfficiency: Math.round(avgEfficiency),
    avgDuration: Math.round(avgDuration)
  }
}

function calculateDistributions(sessions: any[], issues: any[], features: any[]) {
  const models: Record<string, number> = {}
  const categories: Record<string, number> = {}
  const issueTypes: Record<string, number> = {}
  const featureTypes: Record<string, number> = {}
  
  for (const s of sessions) {
    models[s.model] = (models[s.model] || 0) + 1
    categories[s.category] = (categories[s.category] || 0) + 1
  }
  
  for (const i of issues) {
    issueTypes[i.issueType] = (issueTypes[i.issueType] || 0) + 1
  }
  
  for (const f of features) {
    featureTypes[f.featureType] = (featureTypes[f.featureType] || 0) + 1
  }
  
  return { models, categories, issueTypes, featureTypes }
}

function calculateDailyStats(sessions: any[]) {
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
  
  return dailyStats
}

function detectSessionType(title: string, category: string): string {
  const content = (title + ' ' + category).toLowerCase()
  if (content.includes('fix') || content.includes('bug')) return 'BUG_FIX'
  if (content.includes('feature') || content.includes('add')) return 'FEATURE'
  if (content.includes('refactor')) return 'REFACTOR'
  if (content.includes('test')) return 'TESTING'
  if (content.includes('doc')) return 'DOCUMENTATION'
  return 'DEVELOPMENT'
}

function categorizeIssue(issueType: string): string {
  const categories: Record<string, string> = {
    'typescript': 'code',
    'runtime': 'code',
    'build': 'build',
    'auth': 'security',
    'database': 'data',
    'api': 'network',
    'network': 'network'
  }
  return categories[issueType] || 'general'
}

function categorizeFeature(featureType: string): string {
  const categories: Record<string, string> = {
    'component': 'frontend',
    'page': 'frontend',
    'api': 'backend',
    'hook': 'frontend',
    'util': 'infrastructure',
    'test': 'quality'
  }
  return categories[featureType] || 'general'
}

function isDangerousCommand(command: string): boolean {
  return /rm -rf|sudo|chmod 777|drop table|delete from/i.test(command)
}

function generateRecommendations(patterns: any[], sessions: any[]): string[] {
  const recommendations: string[] = []
  
  if (patterns.length > 3) {
    recommendations.push('Consider reviewing recurring issue patterns for root cause analysis')
  }
  
  const lowEfficiency = sessions.filter(s => {
    const rate = s.issuesCreated > 0 ? s.issuesResolved / s.issuesCreated : 1
    return rate < 0.5
  })
  
  if (lowEfficiency.length > sessions.length * 0.3) {
    recommendations.push('Multiple sessions have low issue resolution rates - consider breaking down complex tasks')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System performance is good - continue monitoring for patterns')
  }
  
  return recommendations
}
