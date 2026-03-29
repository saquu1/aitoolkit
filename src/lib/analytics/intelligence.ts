/**
 * TIER 2: INTELLIGENCE SERVICE
 * =============================
 * Issue Recurrence Detector, Cost Optimizer, Pattern Library
 */

import { db } from '@/lib/db'
import type {
  IssueRecurrence,
  CostAnalysis,
  CostRecommendation,
  ModelEfficiencyRecord,
  PatternLibraryEntry,
  FixTemplate,
  PreventionRule
} from './types'

// =============================================================================
// F7: ISSUE RECURRENCE DETECTOR
// =============================================================================

export async function detectIssueRecurrence(
  days: number = 30
): Promise<IssueRecurrence[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  // Get all issues with their sessions
  const issues = await db.aIIssue.findMany({
    where: {
      createdAt: { gte: since }
    },
    include: {
      session: true
    },
    orderBy: { createdAt: 'desc' }
  })
  
  // Group by signature (type + title similarity)
  const grouped = new Map<string, typeof issues>()
  
  for (const issue of issues) {
    const signature = createIssueSignature(issue.issueType, issue.title)
    const list = grouped.get(signature) || []
    list.push(issue)
    grouped.set(signature, list)
  }
  
  const recurrences: IssueRecurrence[] = []
  
  for (const [signature, issueList] of grouped) {
    if (issueList.length >= 2) {
      // Calculate cumulative cost
      const totalTokens = issueList.reduce((sum, i) => sum + (i.session?.totalTokens || 0), 0)
      const totalCost = issueList.reduce((sum, i) => sum + (i.session?.estimatedCost || 0), 0)
      const totalDuration = issueList.reduce((sum, i) => sum + (i.session?.duration || 0), 0)
      
      // Calculate trend
      const recentCount = issueList.filter(i => {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return i.createdAt >= weekAgo
      }).length
      
      const olderCount = issueList.length - recentCount
      const trend = recentCount > olderCount * 1.2 ? 'increasing' :
                    recentCount < olderCount * 0.8 ? 'decreasing' : 'stable'
      
      recurrences.push({
        id: `recurrence-${signature}`,
        patternId: `pattern-${signature}`,
        issueType: issueList[0].issueType,
        title: issueList[0].title,
        signature,
        linkedIssues: issueList.map(i => i.id),
        linkedSessions: [...new Set(issueList.map(i => i.sessionId).filter(Boolean))] as string[],
        totalOccurrences: issueList.length,
        totalTokens,
        totalCost,
        totalDuration,
        trend,
        lastOccurrence: issueList[0].createdAt,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
  }
  
  // Sort by total occurrences
  return recurrences.sort((a, b) => b.totalOccurrences - a.totalOccurrences)
}

function createIssueSignature(type: string, title: string): string {
  // Normalize title
  const normalizedTitle = title
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/\d+/g, 'N')
    .replace(/\/[\w\/.-]+/g, 'PATH')
    .split(' ')
    .slice(0, 10)
    .join(' ')
  
  return `${type}:${normalizedTitle}`
}

export async function autoLinkIssues(recurrence: IssueRecurrence): Promise<void> {
  // Update all linked issues with recurrence pattern
  for (const issueId of recurrence.linkedIssues) {
    try {
      await db.aIIssue.update({
        where: { id: issueId },
        data: {
          recurrenceCount: recurrence.totalOccurrences,
          recurrencePatternId: recurrence.patternId
        }
      })
    } catch (error) {
      console.error('Failed to auto-link issue:', error)
    }
  }
}

// =============================================================================
// F9: COST OPTIMIZER
// =============================================================================

export async function analyzeCosts(
  sessionId?: string,
  dateRange?: { start: Date; end: Date }
): Promise<CostAnalysis> {
  // Build where clause
  const where: any = {}
  if (sessionId) {
    where.id = sessionId
  }
  if (dateRange) {
    where.sessionDate = {
      gte: dateRange.start,
      lte: dateRange.end
    }
  }
  
  // Get sessions
  const sessions = await db.aISession.findMany({
    where,
    include: {
      issues: true,
      features: true
    }
  })
  
  // Analyze cache efficiency
  const cacheStats = analyzeCacheEfficiency(sessions)
  
  // Analyze waste
  const wasteAnalysis = analyzeWaste(sessions)
  
  // Generate savings projections
  const savingsProjection = generateSavingsProjection(
    sessions,
    cacheStats,
    wasteAnalysis
  )
  
  // Analyze model efficiency
  const modelEfficiency = analyzeModelEfficiency(sessions)
  
  return {
    id: `cost-analysis-${Date.now()}`,
    sessionId,
    dateRange,
    cacheStats,
    wasteAnalysis,
    savingsProjection,
    modelEfficiency,
    createdAt: new Date()
  }
}

function analyzeCacheEfficiency(sessions: any[]): CostAnalysis['cacheStats'] {
  // Simulate cache analysis based on patterns
  // In real implementation, this would track actual cache hits
  const totalRequests = sessions.length * 10 // Assume 10 API calls per session
  const cacheHits = Math.floor(totalRequests * 0.3) // Estimate 30% cache hit rate
  
  return {
    totalRequests,
    cacheHits,
    cacheMisses: totalRequests - cacheHits,
    hitRate: totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0,
    estimatedSavings: cacheHits * 0.001 // $0.001 per cached request
  }
}

function analyzeWaste(sessions: any[]): CostAnalysis['wasteAnalysis'] {
  let duplicateCalls = 0
  let unnecessaryRedos = 0
  const inefficientPatterns: string[] = []
  
  for (const session of sessions) {
    // Check for repeated similar actions
    const issues = session.issues || []
    const recurringIssues = issues.filter((i: any) => i.recurrenceCount > 1)
    duplicateCalls += recurringIssues.length
    
    // Check for high retry counts
    const highRetrySessions = issues.filter((i: any) => 
      i.errorMessage?.includes('retry') || i.errorMessage?.includes('timeout')
    )
    unnecessaryRedos += highRetrySessions.length
    
    // Detect patterns
    if (session.totalTokens > 50000 && session.featuresImplemented < 2) {
      inefficientPatterns.push(`Session ${session.id}: High token usage (${session.totalTokens}) with few features`)
    }
  }
  
  // Calculate wasted resources
  const avgTokenCost = 0.00001 // $0.00001 per token (approximate)
  const wastedTokens = duplicateCalls * 1000 + unnecessaryRedos * 500
  const wastedCost = wastedTokens * avgTokenCost
  
  return {
    duplicateCalls,
    unnecessaryRedos,
    inefficientPatterns: inefficientPatterns.slice(0, 10),
    wastedTokens,
    wastedCost
  }
}

function generateSavingsProjection(
  sessions: any[],
  cacheStats: CostAnalysis['cacheStats'],
  wasteAnalysis: CostAnalysis['wasteAnalysis']
): CostAnalysis['savingsProjection'] {
  const recommendations: CostRecommendation[] = []
  
  // Cache optimization recommendation
  if (cacheStats.hitRate < 50) {
    recommendations.push({
      id: `rec-cache-${Date.now()}`,
      type: 'cache',
      description: 'Implement response caching for repeated queries',
      potentialSavings: cacheStats.cacheMisses * 0.0005,
      effort: 'low',
      priority: 1
    })
  }
  
  // Model switch recommendation
  const avgTokensPerSession = sessions.length > 0 
    ? sessions.reduce((sum, s) => sum + s.totalTokens, 0) / sessions.length 
    : 0
  
  if (avgTokensPerSession > 20000) {
    recommendations.push({
      id: `rec-model-${Date.now()}`,
      type: 'model_switch',
      description: 'Consider using smaller models for initial drafts',
      potentialSavings: avgTokensPerSession * 0.000005 * sessions.length,
      effort: 'medium',
      priority: 2
    })
  }
  
  // Pattern optimization recommendation
  if (wasteAnalysis.inefficientPatterns.length > 0) {
    recommendations.push({
      id: `rec-pattern-${Date.now()}`,
      type: 'pattern_optimization',
      description: 'Optimize high-token sessions with few features',
      potentialSavings: wasteAnalysis.wastedCost,
      effort: 'medium',
      priority: 3
    })
  }
  
  // Batch processing recommendation
  if (sessions.length > 10) {
    recommendations.push({
      id: `rec-batch-${Date.now()}`,
      type: 'batch_processing',
      description: 'Group similar tasks for batch processing',
      potentialSavings: sessions.length * 0.05,
      effort: 'high',
      priority: 4
    })
  }
  
  const totalPotentialSavings = recommendations.reduce((sum, r) => sum + r.potentialSavings, 0)
  const weeksInMonth = 4.33
  const projectedMonthly = totalPotentialSavings * weeksInMonth
  const projectedYearly = projectedMonthly * 12
  
  return {
    potentialSavings: totalPotentialSavings,
    recommendations,
    projectedMonthly,
    projectedYearly
  }
}

function analyzeModelEfficiency(sessions: any[]): ModelEfficiencyRecord[] {
  const modelStats = new Map<string, {
    sessions: number
    totalCost: number
    totalTokens: number
    totalFeatures: number
  }>()
  
  for (const session of sessions) {
    const stats = modelStats.get(session.model) || {
      sessions: 0,
      totalCost: 0,
      totalTokens: 0,
      totalFeatures: 0
    }
    
    stats.sessions++
    stats.totalCost += session.estimatedCost || 0
    stats.totalTokens += session.totalTokens || 0
    stats.totalFeatures += session.featuresImplemented || 0
    
    modelStats.set(session.model, stats)
  }
  
  const records: ModelEfficiencyRecord[] = []
  
  for (const [model, stats] of modelStats) {
    const avgCostPerFeature = stats.totalFeatures > 0 
      ? stats.totalCost / stats.totalFeatures 
      : stats.totalCost
    const avgTokensPerFeature = stats.totalFeatures > 0 
      ? stats.totalTokens / stats.totalFeatures 
      : stats.totalTokens
    const efficiency = Math.max(0, 100 - (avgCostPerFeature * 1000 + avgTokensPerFeature / 100))
    
    let recommendation = ''
    if (efficiency < 50) {
      recommendation = 'Consider switching to a more cost-effective model'
    } else if (efficiency < 75) {
      recommendation = 'Good efficiency, monitor for optimization opportunities'
    } else {
      recommendation = 'Excellent efficiency'
    }
    
    records.push({
      model,
      sessions: stats.sessions,
      avgCostPerFeature: Math.round(avgCostPerFeature * 1000) / 1000,
      avgTokensPerFeature: Math.round(avgTokensPerFeature),
      efficiency: Math.round(efficiency),
      recommendation
    })
  }
  
  return records.sort((a, b) => b.efficiency - a.efficiency)
}

// =============================================================================
// F10: PATTERN LIBRARY
// =============================================================================

export async function getPatternLibrary(): Promise<PatternLibraryEntry[]> {
  const patterns = await db.aIPattern.findMany({
    where: { status: 'active' },
    orderBy: { occurrenceCount: 'desc' },
    take: 50
  })
  
  const entries: PatternLibraryEntry[] = []
  
  for (const pattern of patterns) {
    // Generate fix template
    const fixTemplate = generateFixTemplate(pattern)
    
    // Generate prevention rules
    const preventionRules = generatePreventionRules(pattern)
    
    entries.push({
      id: `entry-${pattern.id}`,
      patternId: pattern.id,
      name: pattern.patternName,
      type: pattern.patternType,
      description: pattern.description || '',
      fixTemplate,
      preventionRules,
      stats: {
        occurrences: pattern.occurrenceCount,
        fixesApplied: 0, // Would track from history
        successRate: calculateSuccessRate(pattern),
        avgResolutionTime: 0 // Would calculate from history
      },
      status: pattern.status as any,
      severity: pattern.severity as any,
      createdAt: pattern.createdAt,
      updatedAt: pattern.updatedAt
    })
  }
  
  return entries
}

function generateFixTemplate(pattern: any): FixTemplate {
  const type = pattern.patternType
  
  // Template based on pattern type
  const templates: Record<string, FixTemplate> = {
    recurring_issue: {
      id: `fix-${pattern.id}`,
      name: `Fix for ${pattern.patternName}`,
      description: 'Standard fix procedure for this recurring issue',
      steps: [
        { order: 1, action: 'Identify root cause', details: 'Review error logs and stack traces' },
        { order: 2, action: 'Apply fix', details: 'Implement the solution' },
        { order: 3, action: 'Verify fix', details: 'Test the fix thoroughly' },
        { order: 4, action: 'Document solution', details: 'Add to knowledge base' }
      ],
      prerequisites: ['Access to error logs', 'Code editor', 'Test environment']
    },
    frequent_file: {
      id: `fix-${pattern.id}`,
      name: `Refactor ${pattern.patternName}`,
      description: 'Refactoring guide for frequently modified file',
      steps: [
        { order: 1, action: 'Analyze file structure', details: 'Identify areas of high change frequency' },
        { order: 2, action: 'Extract components', details: 'Split into smaller, focused modules' },
        { order: 3, action: 'Add tests', details: 'Create comprehensive test coverage' },
        { order: 4, action: 'Update imports', details: 'Fix all import statements' }
      ],
      prerequisites: ['Code review approval', 'Test coverage plan']
    },
    time_pattern: {
      id: `fix-${pattern.id}`,
      name: `Time-based alert for ${pattern.patternName}`,
      description: 'Prevent issues during problematic time slots',
      steps: [
        { order: 1, action: 'Set up alert', details: 'Configure notification for problematic times' },
        { order: 2, action: 'Add checklist', details: 'Create pre-commit checklist' },
        { order: 3, action: 'Double-check changes', details: 'Review all changes before committing' }
      ],
      prerequisites: ['Notification system access']
    },
    model_issue: {
      id: `fix-${pattern.id}`,
      name: `Model optimization for ${pattern.patternName}`,
      description: 'Switch or configure model for better results',
      steps: [
        { order: 1, action: 'Analyze model performance', details: 'Review cost and quality metrics' },
        { order: 2, action: 'Select alternative model', details: 'Choose model based on task type' },
        { order: 3, action: 'Update configuration', details: 'Implement model selection logic' }
      ],
      prerequisites: ['Model access', 'Performance benchmarks']
    },
    category_issue: {
      id: `fix-${pattern.id}`,
      name: `Process improvement for ${pattern.patternName}`,
      description: 'Create checklist and process for category',
      steps: [
        { order: 1, action: 'Create checklist', details: 'List all common issues and preventions' },
        { order: 2, action: 'Add validation', details: 'Implement pre-commit hooks' },
        { order: 3, action: 'Document best practices', details: 'Create guide for team' }
      ],
      prerequisites: ['Team agreement', 'Documentation platform']
    }
  }
  
  return templates[type] || templates.recurring_issue
}

function generatePreventionRules(pattern: any): PreventionRule[] {
  const rules: PreventionRule[] = []
  
  // Generate ESLint rule if applicable
  if (pattern.patternType === 'recurring_issue' && pattern.metadata) {
    const metadata = typeof pattern.metadata === 'string' 
      ? JSON.parse(pattern.metadata) 
      : pattern.metadata
    
    if (metadata.issueType === 'typescript') {
      rules.push({
        id: `rule-${pattern.id}-ts`,
        name: `Prevent ${pattern.patternName}`,
        description: 'ESLint rule to prevent this issue',
        condition: 'TypeScript type error detected',
        action: 'Require explicit type annotation',
        eslintRule: `{
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error"
  }
}`,
        isActive: true
      })
    }
    
    if (metadata.issueType === 'runtime') {
      rules.push({
        id: `rule-${pattern.id}-runtime`,
        name: `Runtime check for ${pattern.patternName}`,
        description: 'Add runtime validation',
        condition: 'Null/undefined access detected',
        action: 'Add null checks',
        isActive: true
      })
    }
  }
  
  // Add general prevention rule
  rules.push({
    id: `rule-${pattern.id}-general`,
    name: `General prevention for ${pattern.patternName}`,
    description: 'Best practice to prevent recurrence',
    condition: 'Pattern detected',
    action: pattern.recommendation || 'Review and document',
    isActive: true
  })
  
  return rules
}

function calculateSuccessRate(pattern: any): number {
  // Calculate based on resolved vs total occurrences
  // This would need actual tracking data
  return pattern.occurrenceCount > 0 ? 75 : 0
}

export async function applyPatternFix(
  patternId: string,
  fixTemplateId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get pattern
    const pattern = await db.aIPattern.findUnique({
      where: { id: patternId }
    })
    
    if (!pattern) {
      return { success: false, message: 'Pattern not found' }
    }
    
    // Update pattern stats
    await db.aIPattern.update({
      where: { id: patternId },
      data: {
        metadata: JSON.stringify({
          ...(typeof pattern.metadata === 'string' ? JSON.parse(pattern.metadata) : pattern.metadata),
          fixesApplied: ((JSON.parse(pattern.metadata || '{}').fixesApplied || 0) + 1),
          lastFixApplied: new Date().toISOString()
        })
      }
    })
    
    return { success: true, message: 'Fix applied successfully' }
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// =============================================================================
// INTELLIGENCE OVERVIEW
// =============================================================================

export async function getIntelligenceOverview(): Promise<{
  issueRecurrences: IssueRecurrence[]
  costAnalysis: CostAnalysis
  topPatterns: PatternLibraryEntry[]
  riskScore: number
}> {
  // Get issue recurrences
  const issueRecurrences = await detectIssueRecurrence(30)
  
  // Get cost analysis
  const costAnalysis = await analyzeCosts()
  
  // Get pattern library
  const topPatterns = (await getPatternLibrary()).slice(0, 10)
  
  // Calculate risk score
  let riskScore = 100
  
  for (const rec of issueRecurrences) {
    if (rec.trend === 'increasing') riskScore -= 10
    if (rec.totalOccurrences >= 5) riskScore -= 5
  }
  
  for (const pattern of topPatterns) {
    if (pattern.severity === 'critical') riskScore -= 15
    if (pattern.severity === 'high') riskScore -= 10
    if (pattern.stats.occurrences >= 3) riskScore -= 5
  }
  
  if (costAnalysis.wasteAnalysis.wastedCost > 1) riskScore -= 10
  
  riskScore = Math.max(0, Math.min(100, riskScore))
  
  return {
    issueRecurrences: issueRecurrences.slice(0, 10),
    costAnalysis,
    topPatterns,
    riskScore
  }
}
