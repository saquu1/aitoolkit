/**
 * MIXED SYNC - Hybrid Approach
 * ============================
 * Combines fast data fetching with selective heavy calculations
 * - Fast: Direct DB queries for raw data
 * - Heavy: Intelligence calculations only when needed (tab-specific)
 *
 * Data Source: ChatLog table (contains: issuesSolved, featuresAdded, filesModified as JSON)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Query parameter type
type TabType = 'all' | 'overview' | 'sessions' | 'issues' | 'features' | 'tools' | 'files' | 'trends' | 'intelligence' | 'kanban' | 'automation'

// Heavy calculation tabs (require processing)
const HEAVY_TABS: TabType[] = ['all', 'intelligence', 'overview', 'trends', 'automation']

// Fast tabs (raw data only)
const FAST_TABS: TabType[] = ['sessions', 'issues', 'features', 'tools', 'files', 'kanban']

// Helper to safely parse JSON
function safeJsonParse(str: string | null, fallback: any[] = []) {
  if (!str) return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tab = (searchParams.get('tab') || 'all') as TabType
  const days = parseInt(searchParams.get('days') || '30')
  const limit = parseInt(searchParams.get('limit') || '100')

  try {
    // Calculate date filter
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString().split('T')[0]

    // FAST: Fetch from ChatLog table (the source of truth)
    const chatLogs = await db.chatLog.findMany({
      where: {
        sessionDate: { gte: sinceStr }
      },
      orderBy: { sessionDate: 'desc' },
      take: limit
    })

    // Transform ChatLog data to session format
    const sessions = chatLogs.map(log => ({
      id: log.id,
      sessionId: log.sessionId,
      sessionDate: log.sessionDate,
      title: log.title,
      summary: log.summary,
      model: 'unknown',
      category: 'development',
      totalTokens: 0,
      estimatedCost: 0,
      duration: 0,
      efficiencyScore: 50,
      issuesCreated: safeJsonParse(log.issuesSolved).length,
      issuesResolved: safeJsonParse(log.issuesSolved).length,
      featuresImplemented: safeJsonParse(log.featuresAdded).length,
      filesModified: safeJsonParse(log.filesModified).length,
    }))

    // Aggregate issues from all ChatLogs
    const issues: any[] = []
    const features: any[] = []
    const fileOps: any[] = []

    for (const log of chatLogs) {
      const logIssues = safeJsonParse(log.issuesSolved)
      const logFeatures = safeJsonParse(log.featuresAdded)
      const logFiles = safeJsonParse(log.filesModified)

      logIssues.forEach((issue: string, idx: number) => {
        issues.push({
          id: `${log.id}-issue-${idx}`,
          title: typeof issue === 'string' ? issue : issue?.title || 'Unknown Issue',
          issueType: typeof issue === 'object' ? issue?.type : 'bug',
          severity: 'medium',
          status: 'resolved',
          sessionId: log.sessionId,
          session: { title: log.title },
          createdAt: log.createdAt,
          resolvedAt: log.updatedAt
        })
      })

      logFeatures.forEach((feature: string, idx: number) => {
        features.push({
          id: `${log.id}-feature-${idx}`,
          featureName: typeof feature === 'string' ? feature : feature?.name || 'Unknown Feature',
          featureType: typeof feature === 'object' ? feature?.type : 'feature',
          sessionId: log.sessionId,
          session: { title: log.title },
          createdAt: log.createdAt
        })
      })

      logFiles.forEach((file: string, idx: number) => {
        fileOps.push({
          id: `${log.id}-file-${idx}`,
          filepath: typeof file === 'string' ? file : file?.path || 'unknown',
          operation: 'modify',
          linesAdded: 0,
          linesRemoved: 0,
          sessionId: log.sessionId,
          createdAt: log.createdAt
        })
      })
    }

    // Build response
    const response: Record<string, any> = {
      fetchedAt: new Date().toISOString(),
      approach: 'mixed',
      _meta: { fastFetch: true, heavyCalculations: HEAVY_TABS.includes(tab), source: 'ChatLog' }
    }

    // FAST PATH: Raw data (no processing)
    if (FAST_TABS.includes(tab) || tab === 'all') {
      response.sessions = sessions
      response.issues = issues
      response.features = features
      response.toolCalls = [] // Not available in ChatLog
      response.fileOperations = fileOps
    }

    // HEAVY PATH: Processed data (only when needed)
    if (HEAVY_TABS.includes(tab)) {
      response.summary = calculateSummary(sessions)
      response.distributions = calculateDistributions(sessions, issues, features)
      response.intelligence = calculateIntelligence(sessions, issues)
    }

    // Dashboard format for frontend
    if (tab === 'overview' || tab === 'all') {
      response.dashboard = {
        recentSessions: sessions.slice(0, 10),
        recentIssues: issues.slice(0, 10),
        recentFeatures: features.slice(0, 10),
        topPatterns: [],
        dailyStats: calculateDailyStats(sessions),
        distributions: calculateDistributions(sessions, issues, features),
        summary: calculateSummary(sessions)
      }
    }

    // Tab-specific processing
    if (tab === 'files' || tab === 'all') {
      response.fileHeatmap = calculateFileHeatmap(fileOps)
      response.calendar = calculateCalendarHeatmap(sessions, fileOps)
    }

    if (tab === 'kanban' || tab === 'all') {
      response.kanban = buildKanbanBoard(issues)
    }

    if (tab === 'trends' || tab === 'all') {
      response.trends = calculateTrends(sessions)
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error('Mixed sync error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// =============================================================================
// LIGHT CALCULATORS - Simplified versions for mixed approach
// =============================================================================

function calculateSummary(sessions: any[]) {
  return {
    totalSessions: sessions.length,
    totalTokens: sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0),
    totalCost: sessions.reduce((sum, s) => sum + (s.estimatedCost || 0), 0),
    totalIssues: sessions.reduce((sum, s) => sum + (s.issuesCreated || 0), 0),
    resolvedIssues: sessions.reduce((sum, s) => sum + (s.issuesResolved || 0), 0),
    totalFeatures: sessions.reduce((sum, s) => sum + (s.featuresImplemented || 0), 0),
    totalFiles: sessions.reduce((sum, s) => sum + (s.filesModified || 0), 0),
    avgDuration: sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
      : 0,
    avgEfficiency: sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.efficiencyScore || 50), 0) / sessions.length
      : 0
  }
}

function calculateDailyStats(sessions: any[]) {
  const dailyStats: Record<string, any> = {}

  for (const s of sessions) {
    const dateKey = s.sessionDate || new Date(s.sessionDate).toISOString().split('T')[0]
    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = { sessions: 0, tokens: 0, cost: 0, issues: 0, features: 0 }
    }
    dailyStats[dateKey].sessions++
    dailyStats[dateKey].tokens += s.totalTokens || 0
    dailyStats[dateKey].cost += s.estimatedCost || 0
    dailyStats[dateKey].issues += s.issuesCreated || 0
    dailyStats[dateKey].features += s.featuresImplemented || 0
  }

  return dailyStats
}

function calculateDistributions(sessions: any[], issues: any[], features: any[]) {
  const models: Record<string, number> = {}
  const categories: Record<string, number> = {}
  const issueTypes: Record<string, number> = {}
  const featureTypes: Record<string, number> = {}

  for (const s of sessions) {
    models[s.model || 'unknown'] = (models[s.model || 'unknown'] || 0) + 1
    categories[s.category || 'development'] = (categories[s.category || 'development'] || 0) + 1
  }
  for (const i of issues) {
    issueTypes[i.issueType || 'unknown'] = (issueTypes[i.issueType || 'unknown'] || 0) + 1
  }
  for (const f of features) {
    featureTypes[f.featureType || 'feature'] = (featureTypes[f.featureType || 'feature'] || 0) + 1
  }

  return { models, categories, issueTypes, featureTypes }
}

function calculateIntelligence(sessions: any[], issues: any[]) {
  const totalIssues = sessions.reduce((sum, s) => sum + (s.issuesCreated || 0), 0)
  const resolvedIssues = sessions.reduce((sum, s) => sum + (s.issuesResolved || 0), 0)
  const warningCount = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length

  return {
    riskScore: Math.round(100 - ((totalIssues - resolvedIssues) / Math.max(totalIssues, 1)) * 50 - Math.min(warningCount * 5, 30)),
    warningCount,
    unresolvedIssues: totalIssues - resolvedIssues,
    recommendations: generateRecommendations(sessions, issues)
  }
}

function calculateFileHeatmap(fileOps: any[]) {
  const heatmap: Record<string, { count: number; linesAdded: number; linesRemoved: number }> = {}

  for (const fo of fileOps) {
    const path = fo.filepath || fo.path || 'unknown'
    if (!heatmap[path]) {
      heatmap[path] = { count: 0, linesAdded: 0, linesRemoved: 0 }
    }
    heatmap[path].count++
    heatmap[path].linesAdded += fo.linesAdded || 0
    heatmap[path].linesRemoved += fo.linesRemoved || 0
  }

  return Object.entries(heatmap)
    .map(([filepath, data]) => ({ filepath, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
}

function calculateCalendarHeatmap(sessions: any[], fileOps: any[]) {
  const calendar: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[] = []
  const dailyCounts: Record<string, number> = {}

  for (const s of sessions) {
    const dateKey = s.sessionDate || (s.sessionDate && new Date(s.sessionDate).toISOString().split('T')[0])
    if (dateKey) {
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1
    }
  }

  for (const fo of fileOps) {
    const dateKey = fo.createdAt ? new Date(fo.createdAt).toISOString().split('T')[0] : null
    if (dateKey) {
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1
    }
  }

  const maxCount = Math.max(...Object.values(dailyCounts), 1)

  const today = new Date()
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    const count = dailyCounts[dateKey] || 0
    let level: 0 | 1 | 2 | 3 | 4 = 0
    if (count > 0) {
      const ratio = count / maxCount
      if (ratio < 0.25) level = 1
      else if (ratio < 0.5) level = 2
      else if (ratio < 0.75) level = 3
      else level = 4
    }
    calendar.push({ date: dateKey, count, level })
  }

  return calendar
}

function calculateTrends(sessions: any[]) {
  return sessions.slice(0, 30).map(s => ({
    date: s.sessionDate || new Date().toISOString().split('T')[0],
    tokens: s.totalTokens || 0,
    cost: s.estimatedCost || 0,
    issues: s.issuesCreated || 0,
    features: s.featuresImplemented || 0
  }))
}

function buildKanbanBoard(issues: any[]) {
  const board = { backlog: [] as any[], detected: [] as any[], in_progress: [] as any[], testing: [] as any[], resolved: [] as any[] }

  for (const issue of issues) {
    const card = {
      id: issue.id,
      issueId: issue.id,
      title: issue.title || 'Untitled',
      description: issue.description || '',
      issueType: issue.issueType || 'unknown',
      severity: issue.severity || 'medium',
      status: issue.status || 'backlog',
      sessionId: issue.sessionId || '',
      sessionTitle: issue.session?.title || '',
      column: issue.status === 'resolved' ? 'resolved' : issue.status === 'in_progress' ? 'in_progress' : issue.status === 'testing' ? 'testing' : issue.status === 'detected' ? 'detected' : 'backlog',
      order: 0,
      createdAt: issue.createdAt || new Date().toISOString(),
      updatedAt: issue.updatedAt || new Date().toISOString(),
      resolvedAt: issue.resolvedAt,
      relatedIssues: [],
      relatedFiles: [],
      patterns: []
    }

    if (issue.status === 'resolved') {
      board.resolved.push(card)
    } else if (issue.status === 'in_progress') {
      board.in_progress.push(card)
    } else if (issue.status === 'testing') {
      board.testing.push(card)
    } else if (issue.status === 'detected') {
      board.detected.push(card)
    } else {
      board.backlog.push(card)
    }
  }

  return board
}

function generateRecommendations(sessions: any[], issues: any[]) {
  const recs: string[] = []

  const criticalCount = issues.filter(i => i.severity === 'critical').length
  if (criticalCount > 3) {
    recs.push(`${criticalCount} critical issues need immediate attention`)
  }

  const totalIssues = sessions.reduce((sum, s) => sum + (s.issuesCreated || 0), 0)
  const resolvedIssues = sessions.reduce((sum, s) => sum + (s.issuesResolved || 0), 0)
  const unresolvedRate = totalIssues > 0 ? (totalIssues - resolvedIssues) / totalIssues : 0

  if (unresolvedRate > 0.3) {
    recs.push('Issue resolution rate below 70% - review workflow')
  }

  if (recs.length === 0) {
    recs.push('System performance is good - continue monitoring')
  }

  return recs
}
