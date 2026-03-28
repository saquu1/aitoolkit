/**
 * INTELLIGENCE SERVICE
 * ====================
 * TIER 2 Intelligence Features:
 * - F6: File Hotspot Tracker
 * - F7: Issue Recurrence Detector
 * - F8: Enhanced Session Quality Scorer
 * - F9: Cost Optimizer
 * - F10: Pattern Library
 */

import { db } from './db'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// =============================================================================
// F6: FILE HOTSPOT TRACKER
// =============================================================================

export interface FileHotspot {
  filepath: string
  sessionsCount: number
  totalEdits: number
  errorCount: number
  riskScore: number
  lastModified: Date
  avgLinesPerEdit: number
  fileCategory: string
  fileType: string
  trend: 'increasing' | 'stable' | 'decreasing'
  recommendation: string
}

export async function getFileHotspots(options: {
  days?: number
  limit?: number
  minSessions?: number
}): Promise<FileHotspot[]> {
  const { days = 30, limit = 20, minSessions = 2 } = options
  
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  // Aggregate file operations
  const fileOps = await db.fileOperation.groupBy({
    by: ['filepath', 'fileCategory', 'fileType'],
    where: {
      createdAt: { gte: since }
    },
    _count: {
      id: true
    },
    _sum: {
      linesAdded: true,
      linesRemoved: true,
      errorCount: true
    },
    _max: {
      createdAt: true
    }
  })
  
  // Get session counts per file
  const sessionCounts = await db.fileOperation.groupBy({
    by: ['filepath'],
    where: {
      createdAt: { gte: since }
    },
    _count: {
      sessionId: true
    }
  })
  
  const sessionCountMap = new Map(
    sessionCounts.map(s => [s.filepath, s._count.sessionId])
  )
  
  // Calculate risk scores
  const hotspots: FileHotspot[] = fileOps.map(fo => {
    const sessionsCount = sessionCountMap.get(fo.filepath) || 1
    const totalEdits = fo._count.id
    const errors = fo._sum.errorCount || 0
    const linesChanged = (fo._sum.linesAdded || 0) + (fo._sum.linesRemoved || 0)
    
    // Risk score formula:
    // - More sessions = higher risk (touched often)
    // - More errors = higher risk
    // - High edit count = churn risk
    const riskScore = Math.min(100, Math.round(
      (sessionsCount * 10) +
      (errors * 15) +
      (totalEdits * 2) +
      (linesChanged / 50)
    ))
    
    // Determine trend
    const trend = sessionsCount > 5 ? 'increasing' : sessionsCount > 2 ? 'stable' : 'decreasing'
    
    // Generate recommendation
    let recommendation = ''
    if (riskScore > 80) {
      recommendation = 'CRITICAL: This file is a major problem area. Consider refactoring into smaller modules.'
    } else if (riskScore > 60) {
      recommendation = 'HIGH RISK: Frequent edits suggest unstable requirements. Add more tests.'
    } else if (riskScore > 40) {
      recommendation = 'MODERATE: Monitor this file for recurring patterns.'
    } else {
      recommendation = 'LOW RISK: Healthy edit pattern.'
    }
    
    return {
      filepath: fo.filepath,
      sessionsCount,
      totalEdits,
      errorCount: errors,
      riskScore,
      lastModified: fo._max.createdAt || new Date(),
      avgLinesPerEdit: totalEdits > 0 ? Math.round(linesChanged / totalEdits) : 0,
      fileCategory: fo.fileCategory || 'OTHER',
      fileType: fo.fileType || 'unknown',
      trend,
      recommendation
    }
  })
  
  // Filter and sort by risk score
  return hotspots
    .filter(h => h.sessionsCount >= minSessions)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit)
}

// =============================================================================
// F7: ISSUE RECURRENCE DETECTOR
// =============================================================================

export interface RecurringIssue {
  patternId: string
  issueType: string
  title: string
  firstSeen: Date
  lastSeen: Date
  occurrences: number
  totalCost: number
  totalTime: number
  filesAffected: string[]
  sessions: Array<{
    sessionId: string
    date: Date
    title: string
    cost: number
  }>
  rootCause?: string
  fixSuggestion?: string
  preventionStatus: 'active' | 'inactive'
}

export async function detectRecurringIssues(options: {
  days?: number
  minOccurrences?: number
}): Promise<RecurringIssue[]> {
  const { days = 30, minOccurrences = 2 } = options
  
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  // Get all issues in the period
  const issues = await db.aIIssue.findMany({
    where: {
      createdAt: { gte: since }
    },
    include: {
      session: {
        select: {
          id: true,
          sessionDate: true,
          title: true,
          estimatedCost: true
        }
      }
    }
  })
  
  // Group by issue type and file patterns
  const issueGroups = new Map<string, typeof issues>()
  
  for (const issue of issues) {
    // Create a signature for matching
    const filesInvolved = JSON.parse(issue.filesInvolved || '[]')
    const signature = `${issue.issueType}:${filesInvolved.slice(0, 2).join(',')}`
    
    if (!issueGroups.has(signature)) {
      issueGroups.set(signature, [])
    }
    issueGroups.get(signature)!.push(issue)
  }
  
  // Build recurring issues list
  const recurring: RecurringIssue[] = []
  
  for (const [signature, group] of issueGroups) {
    if (group.length < minOccurrences) continue
    
    const sorted = group.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    
    // Calculate total cost
    const totalCost = sorted.reduce((sum, i) => {
      return sum + (i.session?.estimatedCost || 0)
    }, 0) / sorted.length // Estimate per issue
    
    // Get unique files
    const allFiles = new Set<string>()
    for (const i of sorted) {
      const files = JSON.parse(i.filesInvolved || '[]')
      files.forEach((f: string) => allFiles.add(f))
    }
    
    // Build session list
    const sessions = sorted.map(i => ({
      sessionId: i.session.id,
      date: i.session.sessionDate,
      title: i.session.title || '',
      cost: i.session.estimatedCost / sorted.length
    }))
    
    recurring.push({
      patternId: `PAT-${signature.hashCode?.() || Math.random().toString(36).slice(2, 8)}`,
      issueType: first.issueType,
      title: first.title,
      firstSeen: first.createdAt,
      lastSeen: last.createdAt,
      occurrences: sorted.length,
      totalCost,
      totalTime: sorted.length * 10, // Estimate minutes
      filesAffected: Array.from(allFiles),
      sessions,
      rootCause: first.rootCause || undefined,
      fixSuggestion: first.preventionTips ? JSON.parse(first.preventionTips)[0] : undefined,
      preventionStatus: 'inactive'
    })
  }
  
  return recurring.sort((a, b) => b.occurrences - a.occurrences)
}

// =============================================================================
// F8: ENHANCED SESSION QUALITY SCORER
// =============================================================================

export interface SessionQualityScore {
  sessionId: string
  overallScore: number
  dimensions: {
    firstAttemptRate: { score: number; weight: number; contribution: number }
    errorRate: { score: number; weight: number; contribution: number }
    backtrackRate: { score: number; weight: number; contribution: number }
    linesPerMinute: { score: number; weight: number; contribution: number }
    commandSuccess: { score: number; weight: number; contribution: number }
    reasoningEfficiency: { score: number; weight: number; contribution: number }
    gitHygiene: { score: number; weight: number; contribution: number }
  }
  comparison: {
    userAverage: number
    userBest: number
    userWorst: number
  }
  trend: 'improving' | 'stable' | 'declining'
  recommendations: string[]
}

export async function calculateSessionQualityScore(sessionId: string): Promise<SessionQualityScore> {
  const session = await db.aISession.findUnique({
    where: { id: sessionId },
    include: {
      contentBlocks: true,
      toolCalls: true,
      fileOperations: true,
      issues: true
    }
  })
  
  if (!session) {
    throw new Error('Session not found')
  }
  
  // 1. First-attempt rate: files written once, never edited again
  const fileOps = session.fileOperations
  const filesWithMultipleEdits = fileOps.filter(f => f.editCount > 1).length
  const totalFiles = fileOps.length || 1
  const firstAttemptRate = ((totalFiles - filesWithMultipleEdits) / totalFiles) * 100
  
  // 2. Error rate
  const errorRate = session.commandsRun > 0 
    ? (session.commandsFailed / session.commandsRun) * 100 
    : 0
  const errorScore = Math.max(0, 100 - errorRate * 2)
  
  // 3. Backtrack rate from content blocks
  const reasoningBlocks = session.contentBlocks.filter(b => b.blockType === 'REASONING')
  const backtrackedBlocks = reasoningBlocks.filter(b => b.containsBacktrack).length
  const backtrackRate = reasoningBlocks.length > 0 
    ? (backtrackedBlocks / reasoningBlocks.length) * 100 
    : 0
  const backtrackScore = Math.max(0, 100 - backtrackRate)
  
  // 4. Lines per minute
  const durationMinutes = session.durationMs / 60000 || 1
  const linesPerMinute = session.fileOperations.reduce((sum, f) => sum + f.linesAdded, 0) / durationMinutes
  const lpmScore = Math.min(100, linesPerMinute * 2)
  
  // 5. Command success rate
  const commandSuccess = session.commandsRun > 0 
    ? ((session.commandsRun - session.commandsFailed) / session.commandsRun) * 100 
    : 100
  
  // 6. Reasoning efficiency (reasoning to tool call ratio)
  const totalReasoningMs = session.totalReasoningMs || 0
  const totalToolCallMs = session.totalToolCallMs || 1
  const ratio = totalReasoningMs / totalToolCallMs
  // Ideal ratio is between 0.5 and 2
  const reasoningScore = ratio < 0.5 ? 100 - (0.5 - ratio) * 100 :
                         ratio > 2 ? 100 - (ratio - 2) * 20 : 100
  
  // 7. Git hygiene
  const hasCommits = session.gitCommits > 0
  const hasBranch = !!session.gitBranch
  const gitHygiene = (hasCommits ? 50 : 0) + (hasBranch ? 30 : 0) + (session.gitCommits > 0 ? 20 : 0)
  
  // Calculate weighted contributions
  const weights = {
    firstAttemptRate: 0.25,
    errorRate: 0.20,
    backtrackRate: 0.15,
    linesPerMinute: 0.15,
    commandSuccess: 0.10,
    reasoningEfficiency: 0.10,
    gitHygiene: 0.05
  }
  
  const dimensions = {
    firstAttemptRate: { score: firstAttemptRate, weight: weights.firstAttemptRate, contribution: firstAttemptRate * weights.firstAttemptRate },
    errorRate: { score: errorScore, weight: weights.errorRate, contribution: errorScore * weights.errorRate },
    backtrackRate: { score: backtrackScore, weight: weights.backtrackRate, contribution: backtrackScore * weights.backtrackRate },
    linesPerMinute: { score: lpmScore, weight: weights.linesPerMinute, contribution: lpmScore * weights.linesPerMinute },
    commandSuccess: { score: commandSuccess, weight: weights.commandSuccess, contribution: commandSuccess * weights.commandSuccess },
    reasoningEfficiency: { score: reasoningScore, weight: weights.reasoningEfficiency, contribution: reasoningScore * weights.reasoningEfficiency },
    gitHygiene: { score: gitHygiene, weight: weights.gitHygiene, contribution: gitHygiene * weights.gitHygiene }
  }
  
  const overallScore = Math.round(
    Object.values(dimensions).reduce((sum, d) => sum + d.contribution, 0)
  )
  
  // Get comparison stats
  const allSessions = await db.aISession.findMany({
    select: { efficiencyScore: true }
  })
  
  const scores = allSessions.map(s => s.efficiencyScore).filter(s => s > 0)
  const userAverage = scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : 50
  const userBest = scores.length > 0 ? Math.max(...scores) : 100
  const userWorst = scores.length > 0 ? Math.min(...scores) : 0
  
  // Generate recommendations
  const recommendations: string[] = []
  if (firstAttemptRate < 50) recommendations.push('Plan file structure before writing to reduce rework')
  if (errorRate > 20) recommendations.push('Review error patterns and add more validation')
  if (backtrackRate > 30) recommendations.push('Take more time planning before executing')
  if (linesPerMinute < 10) recommendations.push('Break down complex tasks into smaller steps')
  if (!hasCommits) recommendations.push('Commit changes regularly for better tracking')
  
  return {
    sessionId,
    overallScore,
    dimensions,
    comparison: {
      userAverage: Math.round(userAverage),
      userBest,
      userWorst
    },
    trend: overallScore > userAverage ? 'improving' : overallScore < userAverage - 10 ? 'declining' : 'stable',
    recommendations
  }
}

// =============================================================================
// F9: COST OPTIMIZER
// =============================================================================

export interface CostAnalysis {
  sessionCost: {
    promptTokens: number
    completionTokens: number
    cachedTokens: number
    cacheHitRate: number
    model: string
    cost: number
    equivalentGPT4Cost: number
  }
  costByCategory: Array<{ category: string; cost: number; percentage: number }>
  costOfRepeatIssues: Array<{ issue: string; cost: number; preventable: boolean }>
  totalWasted: number
  wastedPercentage: number
  savingsOpportunity: {
    preventRepeats: number
    improveCache: number
    reduceBacktrack: number
    total: number
  }
  recommendations: string[]
}

export async function analyzeCosts(sessionId: string): Promise<CostAnalysis> {
  const session = await db.aISession.findUnique({
    where: { id: sessionId },
    include: {
      issues: true,
      features: true,
      toolCalls: true
    }
  })
  
  if (!session) {
    throw new Error('Session not found')
  }
  
  // Basic cost info
  const promptTokens = session.inputTokens
  const completionTokens = session.outputTokens
  const cachedTokens = session.cachedTokens
  const cacheHitRate = session.inputTokens > 0 ? cachedTokens / session.inputTokens : 0
  
  // Equivalent GPT-4 cost (100x multiplier for comparison)
  const equivalentGPT4Cost = session.estimatedCost * 100
  
  // Cost by category
  const categories = await db.aISession.groupBy({
    by: ['category'],
    _sum: { estimatedCost: true }
  })
  
  const totalCost = categories.reduce((sum, c) => sum + (c._sum.estimatedCost || 0), 0)
  const costByCategory = categories.map(c => ({
    category: c.category,
    cost: c._sum.estimatedCost || 0,
    percentage: totalCost > 0 ? Math.round((c._sum.estimatedCost || 0) / totalCost * 100) : 0
  }))
  
  // Cost of repeat issues
  const recurringIssues = await detectRecurringIssues({ days: 30, minOccurrences: 2 })
  const costOfRepeatIssues = recurringIssues.slice(0, 5).map(issue => ({
    issue: issue.title.slice(0, 50),
    cost: issue.totalCost,
    preventable: true
  }))
  
  const totalWasted = costOfRepeatIssues.reduce((sum, i) => sum + i.cost, 0)
  const wastedPercentage = session.estimatedCost > 0 ? (totalWasted / session.estimatedCost) * 100 : 0
  
  // Savings opportunities
  const savingsOpportunity = {
    preventRepeats: totalWasted,
    improveCache: session.estimatedCost * 0.1 * (0.3 - cacheHitRate), // 10% of cost * improvement potential
    reduceBacktrack: session.estimatedCost * 0.05, // Estimate 5% wasted on backtracking
    total: 0
  }
  savingsOpportunity.total = savingsOpportunity.preventRepeats + savingsOpportunity.improveCache + savingsOpportunity.reduceBacktrack
  
  // Recommendations
  const recommendations: string[] = []
  if (cacheHitRate < 0.2) {
    recommendations.push(`Increase cache hit rate from ${(cacheHitRate * 100).toFixed(1)}% to 30% by reusing context`)
  }
  if (totalWasted > session.estimatedCost * 0.3) {
    recommendations.push(`$${totalWasted.toFixed(2)} wasted on repeat issues - implement prevention rules`)
  }
  if (session.commandsFailed > 2) {
    recommendations.push('Reduce failed commands by adding pre-execution validation')
  }
  
  return {
    sessionCost: {
      promptTokens,
      completionTokens,
      cachedTokens,
      cacheHitRate,
      model: session.model,
      cost: session.estimatedCost,
      equivalentGPT4Cost
    },
    costByCategory,
    costOfRepeatIssues,
    totalWasted,
    wastedPercentage,
    savingsOpportunity,
    recommendations
  }
}

// =============================================================================
// F10: PATTERN LIBRARY
// =============================================================================

export interface Pattern {
  id: string
  patternCode: string
  name: string
  status: 'active' | 'resolved' | 'monitoring'
  detection: {
    keywords: string[]
    regex?: string
    files: string[]
  }
  rootCause?: string
  fixTemplate: {
    before: string
    after: string
  }
  preventionRule?: string
  history: {
    firstSeen: Date
    occurrences: number
    lastSeen: Date
    totalCost: number
    sincePrevention: number
  }
  effectiveness: number
}

export async function createPattern(data: {
  name: string
  keywords: string[]
  regex?: string
  files?: string[]
  rootCause?: string
  fixBefore: string
  fixAfter: string
  preventionRule?: string
}): Promise<Pattern> {
  const patternCode = `PAT-${Date.now().toString(36).toUpperCase()}`
  
  const pattern = await db.aIPattern.create({
    data: {
      patternCode,
      patternName: data.name,
      patternType: 'issue',
      description: data.rootCause,
      detectionRules: JSON.stringify({
        keywords: data.keywords,
        regex: data.regex,
        files: data.files || []
      }),
      detectionRegex: data.regex,
      affectedFiles: JSON.stringify(data.files || []),
      rootCause: data.rootCause,
      detectionKeywords: JSON.stringify(data.keywords)
    }
  })
  
  return {
    id: pattern.id,
    patternCode: pattern.patternCode || patternCode,
    name: data.name,
    status: 'active',
    detection: {
      keywords: data.keywords,
      regex: data.regex,
      files: data.files || []
    },
    rootCause: data.rootCause,
    fixTemplate: {
      before: data.fixBefore,
      after: data.fixAfter
    },
    preventionRule: data.preventionRule,
    history: {
      firstSeen: new Date(),
      occurrences: 0,
      lastSeen: new Date(),
      totalCost: 0,
      sincePrevention: 0
    },
    effectiveness: 0
  }
}

export async function getPatterns(): Promise<Pattern[]> {
  const patterns = await db.aIPattern.findMany({
    orderBy: { occurrenceCount: 'desc' }
  })
  
  return patterns.map(p => ({
    id: p.id,
    patternCode: p.patternCode || `PAT-${p.id.slice(0, 6)}`,
    name: p.patternName,
    status: p.status === 'RESOLVED' ? 'resolved' : 'active',
    detection: {
      keywords: JSON.parse(p.detectionKeywords || '[]'),
      regex: p.detectionRegex || undefined,
      files: JSON.parse(p.affectedFiles || '[]')
    },
    rootCause: p.rootCause || undefined,
    fixTemplate: {
      before: '',
      after: ''
    },
    preventionRule: undefined,
    history: {
      firstSeen: p.firstSeen,
      occurrences: p.occurrenceCount,
      lastSeen: p.lastSeen,
      totalCost: p.totalCostWasted,
      sincePrevention: 0
    },
    effectiveness: p.occurrenceCount > 0 ? 100 : 0
  }))
}

// =============================================================================
// HELPER: String hashCode
// =============================================================================

declare global {
  interface String {
    hashCode?(): number
  }
}

String.prototype.hashCode = function() {
  let hash = 0
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}
