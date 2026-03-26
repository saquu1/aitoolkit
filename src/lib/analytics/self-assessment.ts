/**
 * SELF-ASSESSMENT REPORT GENERATOR
 * =================================
 * Auto-generates weekly/monthly insights and performance reports
 */

import { db } from '@/lib/db'

// =============================================================================
// TYPES
// =============================================================================

export interface SelfAssessmentReport {
  id: string
  reportType: 'daily' | 'weekly' | 'monthly'
  period: {
    start: Date
    end: Date
  }
  generatedAt: Date
  
  // Summary metrics
  summary: {
    totalSessions: number
    totalTokens: number
    totalCost: number
    avgDuration: number
    issuesResolved: number
    issuesCreated: number
    featuresImplemented: number
    filesModified: number
  }
  
  // Performance scores
  scores: {
    efficiency: number      // 0-100
    resolution: number      // Issue resolution rate
    productivity: number    // Features per session
    costEfficiency: number  // Cost per feature
    improvement: number     // Compared to previous period
  }
  
  // Trend analysis
  trends: {
    sessionsTrend: number   // % change
    costTrend: number
    issuesTrend: number
    featuresTrend: number
  }
  
  // Top patterns
  topIssues: Array<{
    type: string
    count: number
    trend: 'up' | 'down' | 'stable'
  }>
  
  topModels: Array<{
    model: string
    sessions: number
    avgIssues: number
    avgCost: number
  }>
  
  topCategories: Array<{
    category: string
    sessions: number
    avgIssues: number
  }>
  
  // Insights
  insights: Array<{
    type: 'achievement' | 'warning' | 'recommendation' | 'pattern'
    title: string
    description: string
    actionable: boolean
    action?: string
  }>
  
  // Goals tracking
  goals?: {
    targetCostPerFeature?: number
    actualCostPerFeature: number
    targetResolutionRate?: number
    actualResolutionRate: number
    targetSessionsPerWeek?: number
    actualSessionsPerWeek: number
  }
  
  // Comparison with previous period
  comparison?: {
    previousPeriod: { start: Date; end: Date }
    metrics: Record<string, { before: number; after: number; change: number }>
  }
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

export async function generateSelfAssessmentReport(
  type: 'daily' | 'weekly' | 'monthly' = 'weekly',
  customRange?: { start: Date; end: Date }
): Promise<SelfAssessmentReport> {
  const now = new Date()
  let periodStart: Date
  let periodEnd: Date = now
  
  // Calculate period
  if (customRange) {
    periodStart = customRange.start
    periodEnd = customRange.end
  } else {
    switch (type) {
      case 'daily':
        periodStart = new Date(now)
        periodStart.setDate(periodStart.getDate() - 1)
        break
      case 'weekly':
        periodStart = new Date(now)
        periodStart.setDate(periodStart.getDate() - 7)
        break
      case 'monthly':
        periodStart = new Date(now)
        periodStart.setMonth(periodStart.getMonth() - 1)
        break
    }
  }
  
  // Fetch sessions for the period
  const sessions = await db.aISession.findMany({
    where: {
      sessionDate: {
        gte: periodStart,
        lte: periodEnd
      }
    },
    include: {
      issues: true,
      features: true
    }
  })
  
  // Fetch previous period for comparison
  const previousPeriodStart = new Date(periodStart)
  const previousPeriodEnd = new Date(periodStart)
  switch (type) {
    case 'daily':
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 1)
      break
    case 'weekly':
      previousPeriodStart.setDate(previousPeriodStart.getDate() - 7)
      break
    case 'monthly':
      previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1)
      break
  }
  
  const previousSessions = await db.aISession.findMany({
    where: {
      sessionDate: {
        gte: previousPeriodStart,
        lte: previousPeriodEnd
      }
    },
    include: {
      issues: true,
      features: true
    }
  })
  
  // Calculate summary metrics
  const summary = calculateSummary(sessions)
  
  // Calculate scores
  const scores = calculateScores(sessions, previousSessions)
  
  // Calculate trends
  const trends = calculateTrends(sessions, previousSessions)
  
  // Get top issues
  const topIssues = getTopIssues(sessions, previousSessions)
  
  // Get top models
  const topModels = getTopModels(sessions)
  
  // Get top categories
  const topCategories = getTopCategories(sessions)
  
  // Generate insights
  const insights = generateInsights(summary, scores, trends, topIssues, sessions, previousSessions)
  
  // Calculate goals
  const goals = calculateGoals(sessions, type)
  
  // Generate comparison
  const comparison = generateComparison(sessions, previousSessions, previousPeriodStart, previousPeriodEnd)
  
  const report: SelfAssessmentReport = {
    id: `report-${type}-${periodStart.toISOString().split('T')[0]}`,
    reportType: type,
    period: { start: periodStart, end: periodEnd },
    generatedAt: now,
    summary,
    scores,
    trends,
    topIssues,
    topModels,
    topCategories,
    insights,
    goals,
    comparison
  }
  
  // Save report to database
  await saveReport(report)
  
  return report
}

// =============================================================================
// CALCULATIONS
// =============================================================================

function calculateSummary(sessions: any[]) {
  const totalSessions = sessions.length
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0)
  const totalCost = sessions.reduce((sum, s) => sum + s.estimatedCost, 0)
  const avgDuration = totalSessions > 0 
    ? sessions.reduce((sum, s) => sum + s.duration, 0) / totalSessions 
    : 0
  const issuesResolved = sessions.reduce((sum, s) => sum + s.issuesResolved, 0)
  const issuesCreated = sessions.reduce((sum, s) => sum + s.issuesCreated, 0)
  const featuresImplemented = sessions.reduce((sum, s) => sum + s.featuresImplemented, 0)
  const filesModified = sessions.reduce((sum, s) => sum + s.filesModified + s.filesCreated, 0)
  
  return {
    totalSessions,
    totalTokens,
    totalCost,
    avgDuration,
    issuesResolved,
    issuesCreated,
    featuresImplemented,
    filesModified
  }
}

function calculateScores(sessions: any[], previousSessions: any[]): SelfAssessmentReport['scores'] {
  const current = calculateSummary(sessions)
  const previous = calculateSummary(previousSessions)
  
  // Efficiency score (based on tokens per feature, time per feature)
  const tokensPerFeature = current.featuresImplemented > 0 
    ? current.totalTokens / current.featuresImplemented 
    : 0
  const efficiencyScore = Math.min(100, Math.max(0, 
    100 - (tokensPerFeature / 10000) * 50 // Lower is better
  ))
  
  // Resolution rate
  const resolutionRate = current.issuesCreated > 0 
    ? (current.issuesResolved / current.issuesCreated) * 100 
    : 100
  
  // Productivity (features per session)
  const featuresPerSession = current.totalSessions > 0 
    ? current.featuresImplemented / current.totalSessions 
    : 0
  const productivityScore = Math.min(100, featuresPerSession * 30)
  
  // Cost efficiency
  const costPerFeature = current.featuresImplemented > 0 
    ? current.totalCost / current.featuresImplemented 
    : 0
  const costEfficiencyScore = Math.min(100, Math.max(0,
    100 - (costPerFeature * 1000) // Lower is better
  ))
  
  // Improvement compared to previous period
  const previousResolution = previous.issuesCreated > 0 
    ? (previous.issuesResolved / previous.issuesCreated) * 100 
    : 100
  const improvement = resolutionRate - previousResolution
  
  return {
    efficiency: Math.round(efficiencyScore),
    resolution: Math.round(resolutionRate),
    productivity: Math.round(productivityScore),
    costEfficiency: Math.round(costEfficiencyScore),
    improvement: Math.round(improvement)
  }
}

function calculateTrends(sessions: any[], previousSessions: any[]): SelfAssessmentReport['trends'] {
  const current = calculateSummary(sessions)
  const previous = calculateSummary(previousSessions)
  
  const calcTrend = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }
  
  return {
    sessionsTrend: calcTrend(current.totalSessions, previous.totalSessions),
    costTrend: calcTrend(current.totalCost, previous.totalCost),
    issuesTrend: calcTrend(current.issuesCreated, previous.issuesCreated),
    featuresTrend: calcTrend(current.featuresImplemented, previous.featuresImplemented)
  }
}

function getTopIssues(sessions: any[], previousSessions: any[]): SelfAssessmentReport['topIssues'] {
  const currentIssues = sessions.flatMap(s => s.issues)
  const previousIssues = previousSessions.flatMap(s => s.issues)
  
  // Count by type
  const currentCounts = new Map<string, number>()
  const previousCounts = new Map<string, number>()
  
  for (const issue of currentIssues) {
    currentCounts.set(issue.issueType, (currentCounts.get(issue.issueType) || 0) + 1)
  }
  for (const issue of previousIssues) {
    previousCounts.set(issue.issueType, (previousCounts.get(issue.issueType) || 0) + 1)
  }
  
  // Sort and get top 5
  const sorted = [...currentCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  
  return sorted.map(([type, count]) => {
    const prevCount = previousCounts.get(type) || 0
    const trend: 'up' | 'down' | 'stable' = 
      count > prevCount * 1.1 ? 'up' : 
      count < prevCount * 0.9 ? 'down' : 'stable'
    
    return { type, count, trend }
  })
}

function getTopModels(sessions: any[]): SelfAssessmentReport['topModels'] {
  const modelStats = new Map<string, { sessions: number; issues: number; cost: number }>()
  
  for (const session of sessions) {
    const stats = modelStats.get(session.model) || { sessions: 0, issues: 0, cost: 0 }
    stats.sessions++
    stats.issues += session.issuesCreated
    stats.cost += session.estimatedCost
    modelStats.set(session.model, stats)
  }
  
  return [...modelStats.entries()]
    .sort((a, b) => b[1].sessions - a[1].sessions)
    .slice(0, 5)
    .map(([model, stats]) => ({
      model,
      sessions: stats.sessions,
      avgIssues: stats.sessions > 0 ? Math.round(stats.issues / stats.sessions * 10) / 10 : 0,
      avgCost: stats.sessions > 0 ? Math.round(stats.cost / stats.sessions * 1000) / 1000 : 0
    }))
}

function getTopCategories(sessions: any[]): SelfAssessmentReport['topCategories'] {
  const categoryStats = new Map<string, { sessions: number; issues: number }>()
  
  for (const session of sessions) {
    const stats = categoryStats.get(session.category) || { sessions: 0, issues: 0 }
    stats.sessions++
    stats.issues += session.issuesCreated
    categoryStats.set(session.category, stats)
  }
  
  return [...categoryStats.entries()]
    .sort((a, b) => b[1].sessions - a[1].sessions)
    .slice(0, 5)
    .map(([category, stats]) => ({
      category,
      sessions: stats.sessions,
      avgIssues: stats.sessions > 0 ? Math.round(stats.issues / stats.sessions * 10) / 10 : 0
    }))
}

function generateInsights(
  summary: any,
  scores: any,
  trends: any,
  topIssues: any[],
  sessions: any[],
  previousSessions: any[]
): SelfAssessmentReport['insights'] {
  const insights: SelfAssessmentReport['insights'] = []
  
  // Achievement: High resolution rate
  if (scores.resolution >= 80) {
    insights.push({
      type: 'achievement',
      title: `Excellent Issue Resolution: ${scores.resolution}%`,
      description: `You resolved ${summary.issuesResolved} of ${summary.issuesCreated} issues this period`,
      actionable: false
    })
  }
  
  // Achievement: Productivity increase
  if (trends.featuresTrend > 20) {
    insights.push({
      type: 'achievement',
      title: `Productivity Up ${trends.featuresTrend}%`,
      description: `You implemented ${summary.featuresImplemented} features, compared to previous period`,
      actionable: false
    })
  }
  
  // Warning: Increasing issues
  if (trends.issuesTrend > 30) {
    insights.push({
      type: 'warning',
      title: `Issue Rate Increased ${trends.issuesTrend}%`,
      description: `Consider reviewing your workflow to identify root causes`,
      actionable: true,
      action: 'Review recurring issue patterns'
    })
  }
  
  // Warning: Cost increase
  if (trends.costTrend > 50) {
    insights.push({
      type: 'warning',
      title: `Cost Increased ${trends.costTrend}%`,
      description: `Total cost: $${summary.totalCost.toFixed(2)}. Consider using smaller models for simple tasks.`,
      actionable: true,
      action: 'Analyze cost by model and category'
    })
  }
  
  // Pattern: Top issue type
  if (topIssues.length > 0 && topIssues[0].trend === 'up') {
    insights.push({
      type: 'pattern',
      title: `Rising ${topIssues[0].type} Issues`,
      description: `${topIssues[0].type} issues have increased. Consider preventive measures.`,
      actionable: true,
      action: `Review ${topIssues[0].type} prevention strategies`
    })
  }
  
  // Recommendation: Session frequency
  const avgSessionsPerDay = summary.totalSessions / 7
  if (avgSessionsPerDay < 1) {
    insights.push({
      type: 'recommendation',
      title: 'Increase Coding Sessions',
      description: `Only ${summary.totalSessions} sessions this week. Regular practice improves efficiency.`,
      actionable: true,
      action: 'Plan more focused coding sessions'
    })
  }
  
  // Recommendation: Cost optimization
  const costPerFeature = summary.featuresImplemented > 0 
    ? summary.totalCost / summary.featuresImplemented 
    : 0
  if (costPerFeature > 0.1) {
    insights.push({
      type: 'recommendation',
      title: 'Optimize Cost Per Feature',
      description: `Current: $${costPerFeature.toFixed(3)}/feature. Target: $0.05/feature.`,
      actionable: true,
      action: 'Use smaller models for initial drafts, larger for refinement'
    })
  }
  
  return insights
}

function calculateGoals(sessions: any[], type: string): SelfAssessmentReport['goals'] {
  const summary = calculateSummary(sessions)
  
  const costPerFeature = summary.featuresImplemented > 0 
    ? summary.totalCost / summary.featuresImplemented 
    : 0
  
  const resolutionRate = summary.issuesCreated > 0 
    ? (summary.issuesResolved / summary.issuesCreated) * 100 
    : 100
  
  const sessionsPerWeek = type === 'weekly' 
    ? summary.totalSessions 
    : summary.totalSessions / 4
  
  return {
    targetCostPerFeature: 0.05,
    actualCostPerFeature: Math.round(costPerFeature * 1000) / 1000,
    targetResolutionRate: 85,
    actualResolutionRate: Math.round(resolutionRate),
    targetSessionsPerWeek: 5,
    actualSessionsPerWeek: Math.round(sessionsPerWeek * 10) / 10
  }
}

function generateComparison(
  sessions: any[],
  previousSessions: any[],
  prevStart: Date,
  prevEnd: Date
): SelfAssessmentReport['comparison'] {
  const current = calculateSummary(sessions)
  const previous = calculateSummary(previousSessions)
  
  const metrics: Record<string, { before: number; after: number; change: number }> = {
    sessions: {
      before: previous.totalSessions,
      after: current.totalSessions,
      change: current.totalSessions - previous.totalSessions
    },
    tokens: {
      before: previous.totalTokens,
      after: current.totalTokens,
      change: current.totalTokens - previous.totalTokens
    },
    cost: {
      before: previous.totalCost,
      after: current.totalCost,
      change: current.totalCost - previous.totalCost
    },
    issues: {
      before: previous.issuesCreated,
      after: current.issuesCreated,
      change: current.issuesCreated - previous.issuesCreated
    },
    features: {
      before: previous.featuresImplemented,
      after: current.featuresImplemented,
      change: current.featuresImplemented - previous.featuresImplemented
    }
  }
  
  return {
    previousPeriod: { start: prevStart, end: prevEnd },
    metrics
  }
}

// =============================================================================
// DATABASE PERSISTENCE
// =============================================================================

async function saveReport(report: SelfAssessmentReport): Promise<void> {
  try {
    await db.aIAnalyticsSummary.upsert({
      where: { id: report.id },
      create: {
        id: report.id,
        summaryType: report.reportType,
        summaryDate: report.period.start,
        periodStart: report.period.start,
        periodEnd: report.period.end,
        totalSessions: report.summary.totalSessions,
        totalTokens: report.summary.totalTokens,
        totalCost: report.summary.totalCost,
        avgDuration: report.summary.avgDuration,
        issuesCreated: report.summary.issuesCreated,
        issuesResolved: report.summary.issuesResolved,
        featuresImplemented: report.summary.featuresImplemented,
        filesModified: report.summary.filesModified,
        efficiencyScore: report.scores.efficiency,
        resolutionRate: report.scores.resolution,
        productivityScore: report.scores.productivity,
        costEfficiencyScore: report.scores.costEfficiency,
        improvementScore: report.scores.improvement,
        sessionTrend: report.trends.sessionsTrend,
        costTrend: report.trends.costTrend,
        issuesTrend: report.trends.issuesTrend,
        featuresTrend: report.trends.featuresTrend,
        topIssues: JSON.stringify(report.topIssues),
        topModels: JSON.stringify(report.topModels),
        topCategories: JSON.stringify(report.topCategories),
        insights: JSON.stringify(report.insights),
        goals: JSON.stringify(report.goals),
        comparison: JSON.stringify(report.comparison)
      },
      update: {
        totalSessions: report.summary.totalSessions,
        totalTokens: report.summary.totalTokens,
        totalCost: report.summary.totalCost,
        updatedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Failed to save report:', error)
  }
}

// =============================================================================
// RETRIEVAL
// =============================================================================

export async function getLatestReports(type?: 'daily' | 'weekly' | 'monthly', limit: number = 5) {
  const where: any = {}
  if (type) where.summaryType = type
  
  const reports = await db.aIAnalyticsSummary.findMany({
    where,
    orderBy: { summaryDate: 'desc' },
    take: limit
  })
  
  return reports.map(r => ({
    id: r.id,
    reportType: r.summaryType as 'daily' | 'weekly' | 'monthly',
    period: {
      start: r.periodStart,
      end: r.periodEnd
    },
    generatedAt: r.createdAt,
    summary: {
      totalSessions: r.totalSessions,
      totalTokens: r.totalTokens,
      totalCost: r.totalCost,
      avgDuration: r.avgDuration,
      issuesResolved: r.issuesResolved,
      issuesCreated: r.issuesCreated,
      featuresImplemented: r.featuresImplemented,
      filesModified: r.filesModified
    },
    scores: {
      efficiency: r.efficiencyScore,
      resolution: r.resolutionRate,
      productivity: r.productivityScore,
      costEfficiency: r.costEfficiencyScore,
      improvement: r.improvementScore
    },
    trends: {
      sessionsTrend: r.sessionTrend,
      costTrend: r.costTrend,
      issuesTrend: r.issuesTrend,
      featuresTrend: r.featuresTrend
    },
    topIssues: JSON.parse(r.topIssues || '[]'),
    topModels: JSON.parse(r.topModels || '[]'),
    topCategories: JSON.parse(r.topCategories || '[]'),
    insights: JSON.parse(r.insights || '[]')
  }))
}
