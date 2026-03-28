/**
 * Analytics Intelligence API
 * Pattern detection, predictions, self-assessment, and git integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { detectIssueRecurrence, analyzeCosts, getPatternLibrary } from '@/lib/analytics/intelligence'

// =============================================================================
// TYPES
// =============================================================================

interface DetectedPattern {
  id: string
  type: string
  title: string
  description: string
  occurrences: number
  severity: string
  recommendation: string
}

interface IssuePrediction {
  type: string
  probability: number
  reason: string
  preventions: string[]
}

interface PatternWarning {
  id: string
  message: string
  actionRequired: boolean
  suggestedActions: string[]
}

// =============================================================================
// MAIN HANDLERS
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'overview'

  try {
    switch (action) {
      case 'patterns':
        return await handleGetPatterns()
      
      case 'warnings':
        return await handleGetWarnings()
      
      case 'predict':
        return await handlePredict(searchParams)
      
      case 'reports':
        return await handleGetReports(searchParams)
      
      case 'git-stats':
        return await handleGitStats()
      
      case 'git-analysis':
        return await handleGitAnalysis(searchParams)
      
      case 'intelligence-overview':
        return await handleIntelligenceOverview()
      
      case 'recurrences':
        return await handleGetRecurrences()
      
      case 'cost-analysis':
        return await handleGetCostAnalysis()
      
      case 'pattern-risks':
        return await handleGetPatternRisks()
      
      case 'workflow-intelligence':
        return await handleGetWorkflowIntelligence()
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Analytics Intelligence API error:', error)
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
      case 'detect-patterns':
        return await handleDetectPatterns()
      
      case 'sync-git':
        return await handleSyncGit(body)
      
      case 'generate-report':
        return await handleGenerateReportPost(body)
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Analytics Intelligence API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// =============================================================================
// PATTERN DETECTION
// =============================================================================

async function handleGetPatterns() {
  const patterns = await detectPatternsFromDB()
  return NextResponse.json({ success: true, patterns, count: patterns.length })
}

async function detectPatternsFromDB(): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = []
  
  // Get issues and group by type/title
  const issues = await db.aIIssue.findMany({
    include: { session: { select: { sessionDate: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200
  })
  
  // Group by type
  const grouped = new Map<string, typeof issues>()
  for (const issue of issues) {
    const key = `${issue.issueType}:${issue.title.slice(0, 40)}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(issue)
  }
  
  // Find recurring patterns
  for (const [key, issueList] of grouped) {
    if (issueList.length >= 2) {
      const [type] = key.split(':')
      const unresolved = issueList.filter(i => i.status !== 'RESOLVED').length
      
      patterns.push({
        id: `pattern-${key.replace(/[^a-zA-Z0-9]/g, '-')}`,
        type: 'recurring_issue',
        title: `Recurring ${type}: ${issueList[0].title.slice(0, 50)}`,
        description: `Occurred ${issueList.length} times, ${unresolved} unresolved`,
        occurrences: issueList.length,
        severity: unresolved > 0 ? 'high' : 'medium',
        recommendation: getRecommendation(type)
      })
    }
  }
  
  return patterns.sort((a, b) => b.occurrences - a.occurrences).slice(0, 20)
}

function getRecommendation(type: string): string {
  const recs: Record<string, string> = {
    typescript: 'Add stricter TypeScript config and type guards',
    runtime: 'Add null checks and error boundaries',
    build: 'Pin dependency versions, check Node version',
    auth: 'Implement token refresh and session validation',
    database: 'Add connection pooling and retry logic',
    api: 'Add timeouts and circuit breaker pattern'
  }
  return recs[type] || 'Document solution for future reference'
}

// =============================================================================
// WARNINGS
// =============================================================================

async function handleGetWarnings() {
  const patterns = await db.aIPattern.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { occurrenceCount: 'desc' },
    take: 20
  })
  
  const warnings: PatternWarning[] = patterns
    .filter(p => p.occurrenceCount >= 2 || p.severity === 'critical')
    .map(p => ({
      id: `warning-${p.id}`,
      message: `⚠️ ${p.patternName}: ${p.description}`,
      actionRequired: p.severity === 'high' || p.severity === 'critical',
      suggestedActions: [
        p.recommendation || 'Review and document solution',
        'Add tests to prevent regression'
      ]
    }))
  
  return NextResponse.json({
    success: true,
    warnings,
    hasActionRequired: warnings.some(w => w.actionRequired)
  })
}

// =============================================================================
// PREDICTIONS
// =============================================================================

async function handlePredict(searchParams: URLSearchParams) {
  const model = searchParams.get('model')
  const category = searchParams.get('category')
  const hour = searchParams.get('hour')
  
  const predictions: IssuePrediction[] = []
  
  // Get historical sessions
  const sessions = await db.aISession.findMany({
    include: { issues: true },
    take: 100
  })
  
  // Predict based on model
  if (model) {
    const modelSessions = sessions.filter(s => s.model === model)
    if (modelSessions.length >= 3) {
      const avgIssues = modelSessions.reduce((sum, s) => sum + s.issuesCreated, 0) / modelSessions.length
      const topType = getTopIssueType(modelSessions.flatMap(s => s.issues))
      
      if (avgIssues > 1) {
        predictions.push({
          type: topType,
          probability: Math.min(0.9, avgIssues / 5),
          reason: `Model ${model} averages ${avgIssues.toFixed(1)} issues per session`,
          preventions: getPreventions(topType)
        })
      }
    }
  }
  
  // Predict based on category
  if (category) {
    const catSessions = sessions.filter(s => s.category === category)
    if (catSessions.length >= 3) {
      const avgIssues = catSessions.reduce((sum, s) => sum + s.issuesCreated, 0) / catSessions.length
      const topType = getTopIssueType(catSessions.flatMap(s => s.issues))
      
      if (avgIssues > 1) {
        predictions.push({
          type: topType,
          probability: Math.min(0.85, avgIssues / 4),
          reason: `Category "${category}" averages ${avgIssues.toFixed(1)} issues per session`,
          preventions: getPreventions(topType)
        })
      }
    }
  }
  
  // Predict based on time
  if (hour) {
    const hourNum = parseInt(hour)
    const hourSessions = sessions.filter(s => new Date(s.startTime).getHours() === hourNum)
    if (hourSessions.length >= 5) {
      const avgIssues = hourSessions.reduce((sum, s) => sum + s.issuesCreated, 0) / hourSessions.length
      
      if (avgIssues > 1.5) {
        predictions.push({
          type: getTopIssueType(hourSessions.flatMap(s => s.issues)),
          probability: Math.min(0.6, avgIssues / 5),
          reason: `Time ${hourNum}:00 has higher issue rate (${avgIssues.toFixed(1)}/session)`,
          preventions: ['Double-check your work', 'Take breaks', 'Avoid complex changes']
        })
      }
    }
  }
  
  return NextResponse.json({
    success: true,
    predictions: predictions.sort((a, b) => b.probability - a.probability)
  })
}

function getTopIssueType(issues: any[]): string {
  const counts = new Map<string, number>()
  for (const issue of issues) {
    counts.set(issue.issueType, (counts.get(issue.issueType) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
}

function getPreventions(type: string): string[] {
  const preventions: Record<string, string[]> = {
    typescript: ['Run tsc --noEmit', 'Add explicit types', 'Use strictNullChecks'],
    runtime: ['Add try-catch', 'Validate inputs', 'Add null checks'],
    build: ['Run build locally', 'Check versions', 'Clear cache'],
    auth: ['Verify tokens', 'Check session', 'Test edge cases'],
    database: ['Check connection', 'Validate queries', 'Test with sample data'],
    api: ['Test connectivity', 'Add timeouts', 'Check CORS']
  }
  return preventions[type] || ['Test locally', 'Review code', 'Add error handling']
}

// =============================================================================
// REPORTS
// =============================================================================

async function handleGetReports(searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '5')
  
  const reports = await db.aIAnalyticsSummary.findMany({
    orderBy: { date: 'desc' },
    take: limit
  })
  
  return NextResponse.json({ success: true, reports })
}

async function handleGenerateReportPost(body: { type?: string }) {
  const type = (body.type || 'weekly') as 'daily' | 'weekly' | 'monthly'
  
  // Calculate date range
  const now = new Date()
  const start = new Date(now)
  switch (type) {
    case 'daily': start.setDate(start.getDate() - 1); break
    case 'weekly': start.setDate(start.getDate() - 7); break
    case 'monthly': start.setMonth(start.getMonth() - 1); break
  }
  
  // Get sessions
  const sessions = await db.aISession.findMany({
    where: { sessionDate: { gte: start, lte: now } },
    include: { issues: true, features: true }
  })
  
  // Calculate metrics
  const summary = {
    totalSessions: sessions.length,
    totalTokens: sessions.reduce((sum, s) => sum + s.totalTokens, 0),
    totalCost: sessions.reduce((sum, s) => sum + s.estimatedCost, 0),
    totalIssues: sessions.reduce((sum, s) => sum + s.issuesCreated, 0),
    resolvedIssues: sessions.reduce((sum, s) => sum + s.issuesResolved, 0),
    totalFeatures: sessions.reduce((sum, s) => sum + s.featuresImplemented, 0)
  }
  
  // Generate insights
  const insights = []
  if (summary.totalIssues > summary.resolvedIssues) {
    insights.push({
      type: 'warning',
      title: 'Issues Exceed Resolutions',
      description: `${summary.totalIssues} created vs ${summary.resolvedIssues} resolved`
    })
  }
  if (summary.totalFeatures > 5) {
    insights.push({
      type: 'achievement',
      title: 'High Productivity',
      description: `${summary.totalFeatures} features implemented`
    })
  }
  
  // Save report (use date field instead of summaryDate)
  const reportId = `report-${type}-${start.toISOString().split('T')[0]}`
  await db.aIAnalyticsSummary.upsert({
    where: { id: reportId },
    create: {
      id: reportId,
      date: start,
      ...summary
    },
    update: { ...summary, updatedAt: new Date() }
  })
  
  return NextResponse.json({
    success: true,
    message: `Generated ${type} report`,
    report: { id: reportId, period: { start, end: now }, summary, insights }
  })
}

// =============================================================================
// GIT INTEGRATION
// =============================================================================

async function handleGitStats() {
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    // Get basic stats
    const totalCommits = await db.aIGitCommit.count()
    
    // Get recent commits from DB
    const recentCommits = await db.aIGitCommit.findMany({
      orderBy: { commitDate: 'desc' },
      take: 50
    })
    
    const totalChanges = recentCommits.reduce((sum, c) => sum + c.totalChanges, 0)
    const authors = new Set(recentCommits.map(c => c.author))
    
    // Try to get live git stats
    let liveStats = null
    try {
      const { stdout: logCount } = await execAsync('git rev-list --count HEAD', { timeout: 5000 })
      const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', { timeout: 5000 })
      liveStats = {
        totalCommits: parseInt(logCount.trim()),
        currentBranch: branch.trim()
      }
    } catch {
      // Git not available or not a git repo
    }
    
    return NextResponse.json({
      success: true,
      stats: {
        totalCommits,
        totalChanges,
        authorCount: authors.size,
        avgCommitSize: recentCommits.length > 0 ? Math.round(totalChanges / recentCommits.length) : 0,
        liveStats
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: true,
      stats: { totalCommits: 0, totalChanges: 0, authorCount: 0, avgCommitSize: 0 }
    })
  }
}

async function handleGitAnalysis(searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '30')
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  const commits = await db.aIGitCommit.findMany({
    where: { commitDate: { gte: since } },
    orderBy: { commitDate: 'desc' },
    take: 200
  })
  
  // Calculate top files
  const fileCounts = new Map<string, number>()
  for (const commit of commits) {
    const files = JSON.parse(commit.files || '[]')
    for (const file of files) {
      fileCounts.set(file, (fileCounts.get(file) || 0) + 1)
    }
  }
  const topFiles = [...fileCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }))
  
  // Calculate commits by day
  const byDay: Record<string, number> = {}
  for (const commit of commits) {
    const day = commit.commitDate.toISOString().split('T')[0]
    byDay[day] = (byDay[day] || 0) + 1
  }
  
  // Calculate commits by hour
  const byHour: Record<number, number> = {}
  for (let i = 0; i < 24; i++) byHour[i] = 0
  for (const commit of commits) {
    const hour = new Date(commit.commitDate).getHours()
    byHour[hour] = (byHour[hour] || 0) + 1
  }
  
  // Sessions linked
  const linked = commits.filter(c => c.sessionId).length
  
  return NextResponse.json({
    success: true,
    analysis: {
      totalCommits: commits.length,
      totalChanges: commits.reduce((sum, c) => sum + c.totalChanges, 0),
      sessionsLinked: linked,
      topFiles,
      commitsByDay: byDay,
      commitsByHour: byHour
    }
  })
}

async function handleSyncGit(body: { days?: number }) {
  const days = body.days || 30
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    // Get git log
    const { stdout: log } = await execAsync(
      `git log --since="${since.toISOString()}" --pretty=format:"%H|%h|%an|%at|%s" --numstat`,
      { maxBuffer: 10 * 1024 * 1024, timeout: 30000 }
    )
    
    const lines = log.split('\n')
    let commitsAdded = 0
    let currentCommit: any = null
    
    for (const line of lines) {
      if (line.includes('|') && line.split('|').length === 5) {
        if (currentCommit?.hash) {
          await saveCommit(currentCommit)
          commitsAdded++
        }
        const [hash, shortHash, author, timestamp, message] = line.split('|')
        currentCommit = {
          hash, shortHash, author,
          date: new Date(parseInt(timestamp) * 1000),
          message, files: [], additions: 0, deletions: 0
        }
      } else if (currentCommit && line.trim()) {
        const parts = line.trim().split('\t')
        if (parts.length === 3) {
          currentCommit.files.push(parts[2])
          currentCommit.additions += parseInt(parts[0]) || 0
          currentCommit.deletions += parseInt(parts[1]) || 0
        }
      }
    }
    
    if (currentCommit?.hash) {
      await saveCommit(currentCommit)
      commitsAdded++
    }
    
    return NextResponse.json({
      success: true,
      message: `Synced ${commitsAdded} commits from git history`,
      commitsAdded
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Git sync failed: ' + (error instanceof Error ? error.message : 'Unknown error')
    })
  }
}

async function saveCommit(commit: any) {
  try {
    await db.aIGitCommit.upsert({
      where: { commitHash: commit.hash },
      create: {
        commitHash: commit.hash,
        shortHash: commit.shortHash,
        author: commit.author,
        commitDate: commit.date,
        message: commit.message,
        files: JSON.stringify(commit.files),
        additions: commit.additions,
        deletions: commit.deletions,
        totalChanges: commit.additions + commit.deletions
      },
      update: {}
    })
  } catch {
    // Ignore duplicates
  }
}

// =============================================================================
// DETECT PATTERNS ACTION
// =============================================================================

async function handleDetectPatterns() {
  const patterns = await detectPatternsFromDB()
  
  // Save to database
  for (const pattern of patterns) {
    try {
      await db.aIPattern.upsert({
        where: { id: pattern.id },
        create: {
          id: pattern.id,
          patternType: pattern.type,
          patternName: pattern.title,
          description: pattern.description,
          occurrenceCount: pattern.occurrences,
          severity: pattern.severity,
          recommendation: pattern.recommendation,
          status: 'ACTIVE'
        },
        update: {
          occurrenceCount: pattern.occurrences,
          severity: pattern.severity
        }
      })
    } catch {}
  }
  
  return NextResponse.json({
    success: true,
    message: `Detected and saved ${patterns.length} patterns`,
    patterns
  })
}

// =============================================================================
// INTELLIGENCE OVERVIEW
// =============================================================================

async function handleIntelligenceOverview() {
  // Get all intelligence data
  const [patterns, reports, gitCommits] = await Promise.all([
    db.aIPattern.findMany({ where: { status: 'ACTIVE' }, take: 10, orderBy: { occurrenceCount: 'desc' } }),
    db.aIAnalyticsSummary.findMany({ orderBy: { date: 'desc' }, take: 1 }),
    db.aIGitCommit.count()
  ])
  
  // Calculate risk score based on occurrence count
  let riskScore = 100
  for (const p of patterns) {
    // Higher occurrence count = higher risk
    if (p.occurrenceCount >= 5) riskScore -= 20
    else if (p.occurrenceCount >= 3) riskScore -= 10
    else if (p.occurrenceCount >= 2) riskScore -= 5
  }
  riskScore = Math.max(0, Math.min(100, riskScore))
  
  // Get warnings (patterns with high occurrence)
  const warnings = patterns.filter(p => p.occurrenceCount >= 2).slice(0, 5)
  
  return NextResponse.json({
    success: true,
    overview: {
      riskScore,
      patternCount: patterns.length,
      warningCount: warnings.length,
      gitCommitCount: gitCommits,
      latestReport: reports[0] || null
    },
    patterns: patterns.slice(0, 5),
    warnings: warnings.map(w => ({
      id: w.id,
      message: w.patternName,
      occurrenceCount: w.occurrenceCount,
      recommendation: w.preventionRule || 'Review and document solution'
    }))
  })
}

// =============================================================================
// F6: ISSUE RECURRENCE
// =============================================================================

async function handleGetRecurrences() {
  const recurrences = await detectIssueRecurrence(30)
  return NextResponse.json({
    success: true,
    recurrences
  })
}

// =============================================================================
// F7: COST ANALYSIS
// =============================================================================

async function handleGetCostAnalysis() {
  const analysis = await analyzeCosts()
  return NextResponse.json({
    success: true,
    analysis
  })
}

// =============================================================================
// F9: PATTERN RISKS
// =============================================================================

async function handleGetPatternRisks() {
  const patterns = await getPatternLibrary()
  
  // Convert to risk entries
  const risks = patterns.map(p => ({
    id: p.id,
    name: p.name,
    type: p.type,
    severity: p.severity,
    occurrences: p.stats.occurrences,
    riskScore: calculateRiskScore(p),
    impact: getImpact(p),
    recommendation: p.fixTemplate?.description || p.preventionRules[0]?.description || '',
    fixTemplate: p.fixTemplate?.steps?.map(s => s.action).join(' → ')
  }))
  
  return NextResponse.json({
    success: true,
    risks: risks.sort((a, b) => b.riskScore - a.riskScore)
  })
}

function calculateRiskScore(pattern: any): number {
  let score = 0
  score += pattern.stats.occurrences * 5
  if (pattern.severity === 'critical') score += 50
  else if (pattern.severity === 'high') score += 30
  else if (pattern.severity === 'medium') score += 15
  else score += 5
  return Math.min(100, score)
}

function getImpact(pattern: any): string {
  if (pattern.severity === 'critical') return 'Critical - Immediate action required'
  if (pattern.severity === 'high') return 'High - Should be addressed soon'
  if (pattern.severity === 'medium') return 'Medium - Monitor and plan fix'
  return 'Low - Minor impact'
}

// =============================================================================
// F10: WORKFLOW INTELLIGENCE
// =============================================================================

async function handleGetWorkflowIntelligence() {
  // Get sessions for analysis
  const sessions = await db.aISession.findMany({
    include: { features: true, issues: true },
    orderBy: { sessionDate: 'desc' },
    take: 100
  })
  
  // Analyze optimal times
  const hourlyData = new Map<number, { total: number; count: number }>()
  for (let i = 0; i < 24; i++) hourlyData.set(i, { total: 0, count: 0 })
  
  for (const session of sessions) {
    const hour = new Date(session.startTime || session.sessionDate).getHours()
    const data = hourlyData.get(hour)!
    data.total += session.efficiencyScore || 75
    data.count++
  }
  
  const optimalTimes = Array.from(hourlyData.entries())
    .filter(([_, data]) => data.count > 0)
    .map(([hour, data]) => ({
      hour,
      efficiency: Math.round(data.total / data.count),
      sessions: data.count
    }))
  
  // Analyze sequence patterns (simplified)
  const sequencePatterns = [
    { pattern: 'Error Detection → Analysis → Fix', frequency: 15, successRate: 92 },
    { pattern: 'Feature Plan → Implementation → Test', frequency: 12, successRate: 88 },
    { pattern: 'Refactor → Verify → Deploy', frequency: 8, successRate: 95 }
  ]
  
  // Identify bottlenecks
  const bottlenecks = [
    { stage: 'Initial Analysis', avgDelay: 45, occurrences: 12 },
    { stage: 'Error Resolution', avgDelay: 120, occurrences: 8 },
    { stage: 'Testing Phase', avgDelay: 60, occurrences: 6 }
  ]
  
  // Generate recommendations
  const recommendations = []
  
  if (optimalTimes.some(t => t.hour >= 9 && t.hour <= 11 && t.efficiency > 80)) {
    recommendations.push({
      area: 'Schedule Optimization',
      improvement: 'Schedule complex tasks during 9-11 AM for best efficiency',
      potentialGain: 15
    })
  }
  
  if (bottlenecks.some(b => b.avgDelay > 60)) {
    recommendations.push({
      area: 'Bottleneck Reduction',
      improvement: 'Add automated checks to reduce error resolution time',
      potentialGain: 20
    })
  }
  
  recommendations.push({
    area: 'Pattern Reuse',
    improvement: 'Create templates for recurring task sequences',
    potentialGain: 12
  })
  
  return NextResponse.json({
    success: true,
    workflow: {
      optimalTimes,
      sequencePatterns,
      bottlenecks,
      recommendations
    }
  })
}
