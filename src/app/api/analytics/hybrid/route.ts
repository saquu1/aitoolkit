/**
 * HYBRID SYNC ENDPOINT
 * =====================
 * Intelligently combines Fast + Heavy approaches
 * 
 * Decision Logic:
 * - Small data (< 10 sessions) → Fast path
 * - Complex queries (patterns, intelligence) → Heavy path
 * - Medium data → Hybrid (fast fetch + selective computation)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractSessionData, extractToolCalls, extractFileOperations } from '@/lib/extraction-utils'

// Pricing for cost calculation
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'default': { input: 0.001, output: 0.002 }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') || 'all'
  const days = parseInt(searchParams.get('days') || '7')
  const limit = parseInt(searchParams.get('limit') || '50')
  const forceMode = searchParams.get('mode') as 'fast' | 'heavy' | 'auto' | null

  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Step 1: Quick count to decide mode
    const sessionCount = await db.aISession.count({
      where: { sessionDate: { gte: since } }
    })

    // Step 2: Determine mode
    const mode = forceMode || determineMode(sessionCount, tab)
    
    // Step 3: Execute based on mode
    switch (mode) {
      case 'fast':
        return await fastPath(since, limit)
      case 'heavy':
        return await heavyPath(since, limit, tab)
      case 'auto':
      default:
        return await hybridPath(since, limit, tab, sessionCount)
    }
  } catch (error) {
    console.error('Hybrid sync error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      mode: 'error'
    }, { status: 500 })
  }
}

// Determine best mode based on data and query
function determineMode(sessionCount: number, tab: string): 'fast' | 'heavy' | 'auto' {
  // Small dataset - always fast
  if (sessionCount < 10) return 'fast'
  
  // Complex tabs need heavy processing
  const heavyTabs = ['intelligence', 'patterns', 'trends', 'kanban']
  if (heavyTabs.includes(tab)) return 'heavy'
  
  // Large dataset with simple query - fast
  if (sessionCount > 100 && tab === 'all') return 'fast'
  
  // Medium dataset - hybrid
  return 'auto'
}

// FAST PATH: Direct database queries, minimal processing
async function fastPath(since: Date, limit: number) {
  const [sessions, issues, features, tools, files] = await Promise.all([
    db.aISession.findMany({ where: { sessionDate: { gte: since } }, take: limit, orderBy: { sessionDate: 'desc' } }),
    db.aIIssue.findMany({ where: { createdAt: { gte: since } }, take: limit * 2 }),
    db.aIFeature.findMany({ where: { createdAt: { gte: since } }, take: limit }),
    db.toolCall.findMany({ where: { createdAt: { gte: since } }, take: limit * 5 }),
    db.fileOperation.findMany({ where: { createdAt: { gte: since } }, take: limit * 5 })
  ])

  return NextResponse.json({
    success: true,
    mode: 'fast',
    fetchedAt: new Date().toISOString(),
    data: { sessions, issues, features, tools, files, summary: { totalSessions: sessions.length, totalIssues: issues.length } }
  })
}

// HEAVY PATH: Full calculations
async function heavyPath(since: Date, limit: number, tab: string) {
  const [sessions, issues, features, tools, files] = await Promise.all([
    db.aISession.findMany({ where: { sessionDate: { gte: since } }, take: limit, orderBy: { sessionDate: 'desc' } }),
    db.aIIssue.findMany({ where: { createdAt: { gte: since } }, take: limit * 2, include: { session: { select: { id: true, title: true } } } }),
    db.aIFeature.findMany({ where: { createdAt: { gte: since } }, take: limit }),
    db.toolCall.findMany({ where: { createdAt: { gte: since } }, take: limit * 5 }),
    db.fileOperation.findMany({ where: { createdAt: { gte: since } }, take: limit * 5 })
  ])

  // Heavy calculations
  const summary = calculateSummary(sessions)
  const distributions = calculateDistributions(sessions, issues, features)
  const intelligence = calculateIntelligence(sessions, issues)
  const trends = calculateTrends(sessions)
  const kanban = buildKanbanBoard(issues)

  return NextResponse.json({
    success: true,
    mode: 'heavy',
    fetchedAt: new Date().toISOString(),
    data: {
      sessions, issues, features, tools, files,
      summary, distributions, intelligence, trends, kanban
    }
  })
}

// HYBRID PATH: Fast fetch + selective heavy computation
async function hybridPath(since: Date, limit: number, tab: string, sessionCount: number) {
  // Always do fast fetch first
  const [sessions, issues, features, tools, files] = await Promise.all([
    db.aISession.findMany({ where: { sessionDate: { gte: since } }, take: limit, orderBy: { sessionDate: 'desc' } }),
    db.aIIssue.findMany({ where: { createdAt: { gte: since } }, take: limit * 2 }),
    db.aIFeature.findMany({ where: { createdAt: { gte: since } }, take: limit }),
    db.toolCall.findMany({ where: { createdAt: { gte: since } }, take: limit * 5 }),
    db.fileOperation.findMany({ where: { createdAt: { gte: since } }, take: limit * 5 })
  ])

  // Only compute what's needed for the tab
  const response: any = {
    success: true,
    mode: 'hybrid',
    fetchedAt: new Date().toISOString(),
    data: { sessions, issues, features, tools, files }
  }

  // Add summary (cheap, always compute)
  response.data.summary = {
    totalSessions: sessions.length,
    totalIssues: issues.length,
    totalFeatures: features.length,
    totalCost: sessions.reduce((sum, s) => sum + (s.estimatedCost || 0), 0),
    totalTokens: sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0)
  }

  // Tab-specific heavy computations
  if (tab === 'all' || tab === 'intelligence') {
    response.data.intelligence = calculateIntelligence(sessions, issues)
  }
  
  if (tab === 'all' || tab === 'trends') {
    response.data.trends = calculateTrends(sessions)
  }
  
  if (tab === 'all' || tab === 'kanban') {
    response.data.kanban = buildKanbanBoard(issues)
  }

  return response
}

// Summary calculation
function calculateSummary(sessions: any[]) {
  return {
    totalSessions: sessions.length,
    totalTokens: sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0),
    totalCost: sessions.reduce((sum, s) => sum + (s.estimatedCost || 0), 0),
    totalIssues: sessions.reduce((sum, s) => sum + (s.issuesCreated || 0), 0),
    resolvedIssues: sessions.reduce((sum, s) => sum + (s.issuesResolved || 0), 0),
    totalFeatures: sessions.reduce((sum, s) => sum + (s.featuresImplemented || 0), 0),
    avgEfficiency: sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + (s.efficiencyScore || 50), 0) / sessions.length 
      : 50
  }
}

// Distribution calculation
function calculateDistributions(sessions: any[], issues: any[], features: any[]) {
  const models: Record<string, number> = {}
  const categories: Record<string, number> = {}
  
  for (const s of sessions) {
    models[s.model] = (models[s.model] || 0) + 1
    categories[s.category] = (categories[s.category] || 0) + 1
  }
  
  return { models, categories }
}

// Intelligence calculation (F6, F7, F9, F10)
function calculateIntelligence(sessions: any[], issues: any[]) {
  const totalIssues = sessions.reduce((sum, s) => sum + (s.issuesCreated || 0), 0)
  const resolvedIssues = sessions.reduce((sum, s) => sum + (s.issuesResolved || 0), 0)
  const unresolvedRate = totalIssues > 0 ? (totalIssues - resolvedIssues) / totalIssues : 0
  const warningCount = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length

  return {
    riskScore: Math.round(100 - (unresolvedRate * 50) - Math.min(warningCount * 5, 30)),
    warningCount,
    unresolvedIssues: totalIssues - resolvedIssues,
    recommendations: generateRecommendations(sessions, issues)
  }
}

// Trends calculation
function calculateTrends(sessions: any[]) {
  return sessions.slice(0, 30).map(s => ({
    date: s.sessionDate?.toISOString?.()?.split?.('T')?.[0] || new Date().toISOString().split('T')[0],
    tokens: s.totalTokens || 0,
    cost: s.estimatedCost || 0,
    issues: s.issuesCreated || 0,
    features: s.featuresImplemented || 0
  }))
}

// Kanban board builder
function buildKanbanBoard(issues: any[]) {
  const board = { backlog: [], detected: [], in_progress: [], resolved: [] }
  
  for (const issue of issues) {
    const card = { id: issue.id, title: issue.title, severity: issue.severity, type: issue.issueType }
    if (issue.status === 'resolved') board.resolved.push(card)
    else if (issue.status === 'in_progress') board.in_progress.push(card)
    else if (issue.status === 'detected') board.detected.push(card)
    else board.backlog.push(card)
  }
  
  return board
}

// Recommendations generator
function generateRecommendations(sessions: any[], issues: any[]): string[] {
  const recs: string[] = []
  const criticalCount = issues.filter(i => i.severity === 'critical').length
  
  if (criticalCount > 3) recs.push(`${criticalCount} critical issues need attention`)
  
  const unresolvedRate = sessions.reduce((sum, s) => sum + (s.issuesCreated || 0), 0) > 0
    ? (sessions.reduce((sum, s) => sum + (s.issuesCreated || 0), 0) - sessions.reduce((sum, s) => sum + (s.issuesResolved || 0), 0)) / sessions.reduce((sum, s) => sum + (s.issuesCreated || 0), 0)
    : 0
  
  if (unresolvedRate > 0.3) recs.push('Issue resolution rate below 70%')
  if (recs.length === 0) recs.push('System performance is good')
  
  return recs
}
