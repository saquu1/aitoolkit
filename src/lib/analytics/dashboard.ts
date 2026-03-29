/**
 * TIER 3: DASHBOARD SERVICE
 * =========================
 * File Change Heatmap, Issue Tracker Board, Efficiency Trend Charts
 */

import { db } from '@/lib/db'
import type {
  FileHeatmapData,
  CalendarHeatmapCell,
  KanbanIssue,
  EfficiencyTrend,
  FileCategory
} from './types'

// =============================================================================
// F12: FILE CHANGE HEATMAP
// =============================================================================

export async function getFileHeatmap(days: number = 30): Promise<FileHeatmapData[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  // Get all features with file modifications
  const features = await db.aIFeature.findMany({
    where: {
      createdAt: { gte: since }
    },
    include: {
      session: {
        select: {
          id: true,
          sessionDate: true
        }
      }
    }
  })
  
  // Aggregate by file
  const fileData = new Map<string, {
    paths: string[]
    changeCount: number
    linesChanged: number
    sessions: Set<string>
    issues: number
    lastModified: Date
    dailyChanges: Record<string, number>
  }>()
  
  for (const feature of features) {
    const filesCreated = JSON.parse(feature.filesCreated || '[]')
    const filesModified = JSON.parse(feature.filesModified || '[]')
    const dateKey = feature.createdAt.toISOString().split('T')[0]
    
    for (const file of [...filesCreated, ...filesModified]) {
      const existing = fileData.get(file) || {
        paths: [],
        changeCount: 0,
        linesChanged: 0,
        sessions: new Set(),
        issues: 0,
        lastModified: feature.createdAt,
        dailyChanges: {}
      }
      
      existing.changeCount++
      existing.linesChanged += (feature.linesAdded || 0) + (feature.linesDeleted || 0)
      existing.sessions.add(feature.sessionId)
      existing.lastModified = new Date(Math.max(
        existing.lastModified.getTime(),
        feature.createdAt.getTime()
      ))
      existing.dailyChanges[dateKey] = (existing.dailyChanges[dateKey] || 0) + 1
      
      fileData.set(file, existing)
    }
  }
  
  // Get issue counts per file
  const issues = await db.aIIssue.findMany({
    where: {
      createdAt: { gte: since }
    },
    select: {
      filesInvolved: true,
      sessionId: true
    }
  })
  
  for (const issue of issues) {
    try {
      const filesInvolved = JSON.parse(issue.filesInvolved || '[]')
      for (const file of filesInvolved) {
        const existing = fileData.get(file)
        if (existing) {
          existing.issues++
        }
      }
    } catch {}
  }
  
  // Convert to result
  const result: FileHeatmapData[] = []
  
  for (const [filePath, data] of fileData) {
    result.push({
      filePath,
      category: categorizeFile(filePath),
      changeCount: data.changeCount,
      linesChanged: data.linesChanged,
      sessionsInvolved: [...data.sessions],
      issuesCount: data.issues,
      lastModified: data.lastModified,
      dailyChanges: data.dailyChanges
    })
  }
  
  return result.sort((a, b) => b.changeCount - a.changeCount)
}

function categorizeFile(filePath: string): FileCategory {
  if (filePath.includes('/api/') || filePath.includes('\\api\\')) return 'api_route'
  if (filePath.includes('/app/') && filePath.includes('page.')) return 'page'
  if (filePath.includes('/components/')) return 'component'
  if (filePath.includes('/lib/') || filePath.includes('/services/')) return 'service'
  if (filePath.includes('/hooks/')) return 'hook'
  if (filePath.includes('/utils/')) return 'utility'
  if (filePath.endsWith('.d.ts') || filePath.includes('/types/')) return 'type_definition'
  if (filePath.endsWith('.config.') || filePath.includes('/config/')) return 'config'
  if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('/__tests__/')) return 'test'
  if (filePath.endsWith('.prisma') || filePath.includes('/prisma/')) return 'schema'
  if (filePath.endsWith('.css') || filePath.endsWith('.scss')) return 'style'
  return 'other'
}

export async function getCalendarHeatmap(
  days: number = 365
): Promise<CalendarHeatmapCell[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  // Get daily session counts
  const sessions = await db.aISession.findMany({
    where: {
      sessionDate: { gte: since }
    },
    select: {
      sessionDate: true
    }
  })
  
  // Group by date
  const dailyCounts = new Map<string, number>()
  
  for (const session of sessions) {
    const dateKey = session.sessionDate.toISOString().split('T')[0]
    dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1)
  }
  
  // Find max for level calculation
  const maxCount = Math.max(...dailyCounts.values(), 1)
  
  // Generate calendar cells
  const cells: CalendarHeatmapCell[] = []
  const today = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]
    const count = dailyCounts.get(dateKey) || 0
    
    // Calculate level (0-4)
    let level: 0 | 1 | 2 | 3 | 4 = 0
    if (count > 0) {
      const ratio = count / maxCount
      if (ratio < 0.25) level = 1
      else if (ratio < 0.5) level = 2
      else if (ratio < 0.75) level = 3
      else level = 4
    }
    
    cells.push({
      date: dateKey,
      count,
      level
    })
  }
  
  return cells
}

// =============================================================================
// F14: ISSUE TRACKER BOARD (KANBAN)
// =============================================================================

export async function getKanbanBoard(): Promise<{
  backlog: KanbanIssue[]
  detected: KanbanIssue[]
  in_progress: KanbanIssue[]
  testing: KanbanIssue[]
  resolved: KanbanIssue[]
}> {
  // Get all active issues
  const issues = await db.aIIssue.findMany({
    where: {
      status: { not: 'WONT_FIX' }
    },
    include: {
      session: {
        select: {
          id: true,
          title: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  // Convert to Kanban format and organize by column
  const board = {
    backlog: [] as KanbanIssue[],
    detected: [] as KanbanIssue[],
    in_progress: [] as KanbanIssue[],
    testing: [] as KanbanIssue[],
    resolved: [] as KanbanIssue[]
  }
  
  for (const issue of issues) {
    const kanbanIssue: KanbanIssue = {
      id: `kanban-${issue.id}`,
      issueId: issue.id,
      title: issue.title,
      description: issue.description || '',
      issueType: issue.issueType,
      severity: issue.severity as any,
      status: issue.status as any,
      sessionId: issue.sessionId || '',
      sessionTitle: issue.session?.title,
      column: mapStatusToColumn(issue.status),
      order: 0,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      resolvedAt: issue.resolvedAt,
      relatedIssues: [],
      relatedFiles: [],
      patterns: []
    }
    
    // Parse affected files
    try {
      kanbanIssue.relatedFiles = JSON.parse(issue.affectedFiles || '[]')
    } catch {}
    
    // Parse related issues
    try {
      kanbanIssue.relatedIssues = JSON.parse(issue.relatedIssues || '[]')
    } catch {}
    
    // Add to appropriate column
    board[kanbanIssue.column].push(kanbanIssue)
  }
  
  // Sort each column by severity (critical first)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  
  for (const column of Object.keys(board) as Array<keyof typeof board>) {
    board[column].sort((a, b) => 
      (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99)
    )
    
    // Assign order
    board[column].forEach((issue, index) => {
      issue.order = index
    })
  }
  
  return board
}

function mapStatusToColumn(status: string): KanbanIssue['column'] {
  switch (status) {
    case 'DETECTED':
    case 'detected':
      return 'detected'
    case 'IN_PROGRESS':
    case 'in_progress':
      return 'in_progress'
    case 'RESOLVED':
    case 'resolved':
      return 'resolved'
    case 'RECURRING':
    case 'recurring':
      return 'backlog'
    default:
      return 'backlog'
  }
}

export async function updateKanbanIssue(
  issueId: string,
  updates: {
    column?: KanbanIssue['column']
    order?: number
    severity?: 'low' | 'medium' | 'high' | 'critical'
  }
): Promise<{ success: boolean; issue?: KanbanIssue }> {
  try {
    // Map column back to status (Prisma enum values are uppercase)
    const statusMap: Record<KanbanIssue['column'], string> = {
      backlog: 'DETECTED',
      detected: 'DETECTED',
      in_progress: 'IN_PROGRESS',
      testing: 'IN_PROGRESS',
      resolved: 'RESOLVED'
    }
    
    const updateData: any = {}
    
    if (updates.column) {
      updateData.status = statusMap[updates.column]
    }
    if (updates.severity) {
      updateData.severity = updates.severity
    }
    
    updateData.updatedAt = new Date()
    
    if (updates.column === 'resolved') {
      updateData.resolvedAt = new Date()
    }
    
    const issue = await db.aIIssue.update({
      where: { id: issueId },
      data: updateData,
      include: {
        session: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })
    
    return {
      success: true,
      issue: {
        id: `kanban-${issue.id}`,
        issueId: issue.id,
        title: issue.title,
        description: issue.description || '',
        issueType: issue.issueType,
        severity: issue.severity as any,
        status: issue.status as any,
        sessionId: issue.sessionId || '',
        sessionTitle: issue.session?.title,
        column: mapStatusToColumn(issue.status),
        order: updates.order || 0,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        resolvedAt: issue.resolvedAt,
        relatedIssues: [],
        relatedFiles: [],
        patterns: []
      }
    }
  } catch (error) {
    return { success: false }
  }
}

export async function getIssuesBySeverity(): Promise<{
  critical: number
  high: number
  medium: number
  low: number
}> {
  const counts = await db.aIIssue.groupBy({
    by: ['severity'],
    _count: { id: true },
    where: { status: { not: 'RESOLVED' } }
  })
  
  const result = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }
  
  for (const count of counts) {
    if (count.severity in result) {
      result[count.severity as keyof typeof result] = count._count.id
    }
  }
  
  return result
}

// =============================================================================
// F15: EFFICIENCY TREND CHARTS
// =============================================================================

export async function getEfficiencyTrends(days: number = 30): Promise<EfficiencyTrend[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  // Get sessions grouped by date
  const sessions = await db.aISession.findMany({
    where: {
      sessionDate: { gte: since }
    },
    include: {
      issues: true,
      features: true
    },
    orderBy: { sessionDate: 'asc' }
  })
  
  // Group by date
  const dailyStats = new Map<string, {
    sessions: number
    tokens: number
    cost: number
    features: number
    issues: number
    issuesResolved: number
  }>()
  
  for (const session of sessions) {
    const dateKey = session.sessionDate.toISOString().split('T')[0]
    const stats = dailyStats.get(dateKey) || {
      sessions: 0,
      tokens: 0,
      cost: 0,
      features: 0,
      issues: 0,
      issuesResolved: 0
    }
    
    stats.sessions++
    stats.tokens += session.totalTokens
    stats.cost += session.estimatedCost
    stats.features += session.featuresImplemented
    stats.issues += session.issuesCreated
    stats.issuesResolved += session.issuesResolved
    
    dailyStats.set(dateKey, stats)
  }
  
  // Convert to trends with rolling averages
  const trends: EfficiencyTrend[] = []
  const sortedDates = [...dailyStats.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  
  // For rolling averages
  const rollingWindow7: number[] = []
  const rollingWindow30: number[] = []
  
  for (const [date, stats] of sortedDates) {
    const tokensPerFeature = stats.features > 0 ? stats.tokens / stats.features : 0
    const costPerFeature = stats.features > 0 ? stats.cost / stats.features : 0
    const issuesPerSession = stats.sessions > 0 ? stats.issues / stats.sessions : 0
    const resolutionRate = stats.issues > 0 ? (stats.issuesResolved / stats.issues) * 100 : 100
    const productivityScore = Math.min(100, stats.features * 20)
    
    // Update rolling windows
    rollingWindow7.push(productivityScore)
    rollingWindow30.push(productivityScore)
    if (rollingWindow7.length > 7) rollingWindow7.shift()
    if (rollingWindow30.length > 30) rollingWindow30.shift()
    
    const avg7d = rollingWindow7.reduce((a, b) => a + b, 0) / rollingWindow7.length
    const avg30d = rollingWindow30.reduce((a, b) => a + b, 0) / rollingWindow30.length
    
    trends.push({
      date,
      tokensPerFeature: Math.round(tokensPerFeature),
      costPerFeature: Math.round(costPerFeature * 10000) / 10000,
      issuesPerSession: Math.round(issuesPerSession * 10) / 10,
      resolutionRate: Math.round(resolutionRate),
      productivityScore: Math.round(productivityScore),
      rollingAvg7d: {
        tokensPerFeature: Math.round(tokensPerFeature),
        costPerFeature: Math.round(costPerFeature * 10000) / 10000,
        productivity: Math.round(avg7d)
      },
      rollingAvg30d: {
        tokensPerFeature: Math.round(tokensPerFeature),
        costPerFeature: Math.round(costPerFeature * 10000) / 10000,
        productivity: Math.round(avg30d)
      }
    })
  }
  
  return trends
}

export async function getMetricsBreakdown(): Promise<{
  byModel: Array<{ model: string; sessions: number; tokens: number; cost: number; features: number; issues: number }>
  byCategory: Array<{ category: string; sessions: number; tokens: number; cost: number; features: number; issues: number }>
  byHour: Array<{ hour: number; sessions: number; issues: number }>
  byDayOfWeek: Array<{ day: string; sessions: number; issues: number }>
}> {
  const sessions = await db.aISession.findMany({
    include: {
      issues: true,
      features: true
    },
    orderBy: { sessionDate: 'desc' },
    take: 200
  })
  
  // By model
  const byModelMap = new Map<string, { sessions: number; tokens: number; cost: number; features: number; issues: number }>()
  
  // By category
  const byCategoryMap = new Map<string, { sessions: number; tokens: number; cost: number; features: number; issues: number }>()
  
  // By hour
  const byHourMap = new Map<number, { sessions: number; issues: number }>()
  for (let i = 0; i < 24; i++) {
    byHourMap.set(i, { sessions: 0, issues: 0 })
  }
  
  // By day of week
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const byDayMap = new Map<string, { sessions: number; issues: number }>()
  for (const day of dayNames) {
    byDayMap.set(day, { sessions: 0, issues: 0 })
  }
  
  for (const session of sessions) {
    // Model aggregation
    const modelStats = byModelMap.get(session.model) || { sessions: 0, tokens: 0, cost: 0, features: 0, issues: 0 }
    modelStats.sessions++
    modelStats.tokens += session.totalTokens
    modelStats.cost += session.estimatedCost
    modelStats.features += session.featuresImplemented
    modelStats.issues += session.issuesCreated
    byModelMap.set(session.model, modelStats)
    
    // Category aggregation
    const catStats = byCategoryMap.get(session.category) || { sessions: 0, tokens: 0, cost: 0, features: 0, issues: 0 }
    catStats.sessions++
    catStats.tokens += session.totalTokens
    catStats.cost += session.estimatedCost
    catStats.features += session.featuresImplemented
    catStats.issues += session.issuesCreated
    byCategoryMap.set(session.category, catStats)
    
    // Hour aggregation
    const hour = new Date(session.startTime || session.sessionDate).getHours()
    const hourStats = byHourMap.get(hour)!
    hourStats.sessions++
    hourStats.issues += session.issuesCreated
    
    // Day aggregation
    const dayOfWeek = dayNames[new Date(session.sessionDate).getDay()]
    const dayStats = byDayMap.get(dayOfWeek)!
    dayStats.sessions++
    dayStats.issues += session.issuesCreated
  }
  
  return {
    byModel: [...byModelMap.entries()].map(([model, stats]) => ({ model, ...stats })).sort((a, b) => b.sessions - a.sessions),
    byCategory: [...byCategoryMap.entries()].map(([category, stats]) => ({ category, ...stats })).sort((a, b) => b.sessions - a.sessions),
    byHour: [...byHourMap.entries()].map(([hour, stats]) => ({ hour, ...stats })),
    byDayOfWeek: dayNames.map(day => ({ day, ...byDayMap.get(day)! }))
  }
}

// =============================================================================
// DASHBOARD OVERVIEW
// =============================================================================

export async function getDashboardOverview(): Promise<{
  summary: {
    totalSessions: number
    totalTokens: number
    totalCost: number
    totalIssues: number
    resolvedIssues: number
    totalFeatures: number
    avgEfficiency: number
  }
  recentActivity: Array<{
    type: 'session' | 'issue' | 'feature'
    title: string
    timestamp: Date
    details: string
  }>
  alerts: Array<{
    id: string
    type: string
    message: string
    severity: string
    timestamp: Date
  }>
}> {
  // Get summary stats
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const [sessions, issues, features] = await Promise.all([
    db.aISession.findMany({
      where: { sessionDate: { gte: thirtyDaysAgo } }
    }),
    db.aIIssue.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } }
    }),
    db.aIFeature.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } }
    })
  ])
  
  const totalSessions = sessions.length
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0)
  const totalCost = sessions.reduce((sum, s) => sum + s.estimatedCost, 0)
  const totalIssues = issues.length
  const resolvedIssues = issues.filter(i => i.status === 'resolved').length
  const totalFeatures = features.length
  
  // Calculate average efficiency
  const avgEfficiency = sessions.length > 0
    ? sessions.reduce((sum, s) => {
        const rate = s.issuesCreated > 0 ? (s.issuesResolved / s.issuesCreated) * 100 : 100
        return sum + Math.min(100, rate + s.featuresImplemented * 10)
      }, 0) / sessions.length
    : 0
  
  // Build recent activity
  const recentActivity: Array<{
    type: 'session' | 'issue' | 'feature'
    title: string
    timestamp: Date
    details: string
  }> = []
  
  for (const session of sessions.slice(0, 5)) {
    recentActivity.push({
      type: 'session',
      title: session.title || 'Untitled Session',
      timestamp: session.sessionDate,
      details: `${session.totalTokens.toLocaleString()} tokens, $${session.estimatedCost.toFixed(3)}`
    })
  }
  
  for (const issue of issues.slice(0, 5)) {
    recentActivity.push({
      type: 'issue',
      title: issue.title,
      timestamp: issue.createdAt,
      details: `${issue.issueType} - ${issue.severity}`
    })
  }
  
  for (const feature of features.slice(0, 5)) {
    recentActivity.push({
      type: 'feature',
      title: feature.name || feature.featureType,
      timestamp: feature.createdAt,
      details: feature.description || feature.featureType
    })
  }
  
  // Sort by timestamp
  recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  
  // Get alerts
  const patterns = await db.aIPattern.findMany({
    where: {
      status: 'active',
      severity: { in: ['high', 'critical'] }
    },
    take: 5
  })
  
  const alerts = patterns.map(p => ({
    id: p.id,
    type: 'pattern',
    message: p.patternName,
    severity: p.severity,
    timestamp: p.updatedAt
  }))
  
  return {
    summary: {
      totalSessions,
      totalTokens,
      totalCost,
      totalIssues,
      resolvedIssues,
      totalFeatures,
      avgEfficiency: Math.round(avgEfficiency)
    },
    recentActivity: recentActivity.slice(0, 10),
    alerts
  }
}
