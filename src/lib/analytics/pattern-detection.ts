/**
 * PATTERN DETECTION & PREDICTION ENGINE
 * =====================================
 * Detects recurring issues, predicts potential problems, and generates warnings
 */

import { db } from '@/lib/db'

// =============================================================================
// TYPES
// =============================================================================

export interface DetectedPattern {
  id: string
  type: 'recurring_issue' | 'frequent_file' | 'time_pattern' | 'model_issue' | 'category_issue'
  title: string
  description: string
  occurrences: number
  firstSeen: Date
  lastSeen: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  relatedIssues: string[]
  recommendation: string
  metadata: Record<string, any>
}

export interface IssuePrediction {
  type: string
  probability: number
  reason: string
  preventions: string[]
  basedOn: string[]
}

export interface PatternWarning {
  id: string
  pattern: DetectedPattern
  message: string
  actionRequired: boolean
  suggestedActions: string[]
  createdAt: Date
}

// =============================================================================
// PATTERN DETECTION
// =============================================================================

export async function detectPatterns(sessionId?: string): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = []

  // 1. Detect recurring issues (same error appears multiple times)
  const recurringIssues = await detectRecurringIssues()
  patterns.push(...recurringIssues)

  // 2. Detect frequent file modifications (same file edited many times)
  const frequentFiles = await detectFrequentFileModifications()
  patterns.push(...frequentFiles)

  // 3. Detect time-based patterns (issues at specific times)
  const timePatterns = await detectTimePatterns()
  patterns.push(...timePatterns)

  // 4. Detect model-specific issues
  const modelIssues = await detectModelSpecificIssues()
  patterns.push(...modelIssues)

  // 5. Detect category-specific issues
  const categoryIssues = await detectCategoryIssues()
  patterns.push(...categoryIssues)

  // Save patterns to database
  await savePatterns(patterns)

  return patterns
}

async function detectRecurringIssues(): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = []

  // Group issues by title similarity
  const issues = await db.aIIssue.findMany({
    include: {
      session: {
        select: { sessionDate: true, title: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  })

  // Group by issue type and similar title
  const groupedByType = new Map<string, typeof issues>()

  for (const issue of issues) {
    const key = `${issue.issueType}:${issue.title.slice(0, 50)}`
    if (!groupedByType.has(key)) {
      groupedByType.set(key, [])
    }
    groupedByType.get(key)!.push(issue)
  }

  // Find recurring patterns (2+ occurrences)
  for (const [key, issueList] of groupedByType) {
    if (issueList.length >= 2) {
      const [type] = key.split(':')
      const sortedIssues = issueList.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      const unresolvedCount = issueList.filter(i => i.status !== 'resolved').length

      patterns.push({
        id: `recurring-${key.replace(/[^a-zA-Z0-9]/g, '-')}`,
        type: 'recurring_issue',
        title: `Recurring ${type} issue: ${sortedIssues[0].title.slice(0, 60)}`,
        description: `This issue has occurred ${issueList.length} times. ${unresolvedCount} remain unresolved.`,
        occurrences: issueList.length,
        firstSeen: sortedIssues[sortedIssues.length - 1].createdAt,
        lastSeen: sortedIssues[0].createdAt,
        severity: unresolvedCount > 0 ? 'high' : 'medium',
        relatedIssues: issueList.map(i => i.id),
        recommendation: generateRecommendation(type, issueList.length, unresolvedCount),
        metadata: {
          issueType: type,
          unresolvedCount,
          sampleError: sortedIssues[0].errorMessage
        }
      })
    }
  }

  return patterns
}

async function detectFrequentFileModifications(): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = []

  // Get all features with file modifications
  const features = await db.aIFeature.findMany({
    include: {
      session: {
        select: { sessionDate: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  })

  // Count file modifications
  const fileCounts = new Map<string, { count: number; sessions: string[]; types: Set<string> }>()

  for (const feature of features) {
    const filesCreated = JSON.parse(feature.filesCreated || '[]')
    const filesModified = JSON.parse(feature.filesModified || '[]')

    for (const file of [...filesCreated, ...filesModified]) {
      if (!fileCounts.has(file)) {
        fileCounts.set(file, { count: 0, sessions: [], types: new Set() })
      }
      const data = fileCounts.get(file)!
      data.count++
      data.sessions.push(feature.sessionId)
      data.types.add(feature.featureType)
    }
  }

  // Find frequently modified files (5+ modifications)
  for (const [file, data] of fileCounts) {
    if (data.count >= 5) {
      patterns.push({
        id: `frequent-file-${file.replace(/[^a-zA-Z0-9]/g, '-')}`,
        type: 'frequent_file',
        title: `Frequently modified: ${file.split('/').pop()}`,
        description: `File has been modified ${data.count} times across ${new Set(data.sessions).size} sessions`,
        occurrences: data.count,
        firstSeen: new Date(),
        lastSeen: new Date(),
        severity: data.count >= 10 ? 'high' : 'medium',
        relatedIssues: [],
        recommendation: `Consider refactoring ${file.split('/').pop()} - it may need better structure or separation of concerns`,
        metadata: {
          filePath: file,
          sessions: [...new Set(data.sessions)],
          featureTypes: [...data.types]
        }
      })
    }
  }

  return patterns
}

async function detectTimePatterns(): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = []

  // Get sessions with issues by hour
  const sessions = await db.aISession.findMany({
    where: {
      issuesCreated: { gt: 0 }
    },
    include: {
      issues: true
    },
    take: 100
  })

  // Group issues by hour
  const hourCounts = new Map<number, { total: number; types: Map<string, number> }>()

  for (const session of sessions) {
    const hour = new Date(session.startTime).getHours()
    if (!hourCounts.has(hour)) {
      hourCounts.set(hour, { total: 0, types: new Map() })
    }
    const data = hourCounts.get(hour)!
    data.total += session.issues.length

    for (const issue of session.issues) {
      data.types.set(issue.issueType, (data.types.get(issue.issueType) || 0) + 1)
    }
  }

  // Find problematic hours (significantly more issues)
  const avgIssues = sessions.reduce((sum, s) => sum + s.issues.length, 0) / 24

  for (const [hour, data] of hourCounts) {
    if (data.total > avgIssues * 1.5 && data.total >= 5) {
      const topType = [...data.types.entries()].sort((a, b) => b[1] - a[1])[0]

      patterns.push({
        id: `time-pattern-${hour}`,
        type: 'time_pattern',
        title: `Problematic time slot: ${hour}:00 - ${hour + 1}:00`,
        description: `${data.total} issues occur during this hour, mostly ${topType?.[0] || 'various'} types`,
        occurrences: data.total,
        firstSeen: new Date(),
        lastSeen: new Date(),
        severity: 'low',
        relatedIssues: [],
        recommendation: `Consider avoiding complex coding tasks during ${hour}:00-${hour + 1}:00 or be extra careful with ${topType?.[0] || 'code quality'}`,
        metadata: {
          hour,
          issueTypes: Object.fromEntries(data.types)
        }
      })
    }
  }

  return patterns
}

async function detectModelSpecificIssues(): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = []

  // Get sessions grouped by model
  const sessions = await db.aISession.findMany({
    include: {
      issues: true
    },
    take: 100
  })

  const modelStats = new Map<string, { sessions: number; issues: number; resolvedIssues: number; types: Map<string, number> }>()

  for (const session of sessions) {
    if (!modelStats.has(session.model)) {
      modelStats.set(session.model, {
        sessions: 0,
        issues: 0,
        resolvedIssues: 0,
        types: new Map()
      })
    }
    const stats = modelStats.get(session.model)!
    stats.sessions++
    stats.issues += session.issuesCreated
    stats.resolvedIssues += session.issuesResolved

    for (const issue of session.issues) {
      stats.types.set(issue.issueType, (stats.types.get(issue.issueType) || 0) + 1)
    }
  }

  // Find models with high issue rates
  for (const [model, stats] of modelStats) {
    const issueRate = stats.issues / stats.sessions

    if (issueRate >= 2 && stats.sessions >= 3) {
      const topIssueType = [...stats.types.entries()].sort((a, b) => b[1] - a[1])[0]

      patterns.push({
        id: `model-issue-${model.replace(/[^a-zA-Z0-9]/g, '-')}`,
        type: 'model_issue',
        title: `High issue rate with model: ${model}`,
        description: `${model} has an average of ${issueRate.toFixed(1)} issues per session`,
        occurrences: stats.issues,
        firstSeen: new Date(),
        lastSeen: new Date(),
        severity: issueRate >= 3 ? 'high' : 'medium',
        relatedIssues: [],
        recommendation: `Consider using a different model for ${topIssueType?.[0] || 'complex'} tasks, or add additional validation steps`,
        metadata: {
          model,
          issueRate,
          sessions: stats.sessions,
          topIssueType: topIssueType?.[0]
        }
      })
    }
  }

  return patterns
}

async function detectCategoryIssues(): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = []

  // Get sessions grouped by category
  const sessions = await db.aISession.findMany({
    include: {
      issues: true
    },
    take: 100
  })

  const categoryStats = new Map<string, { sessions: number; issues: number; types: Map<string, number> }>()

  for (const session of sessions) {
    if (!categoryStats.has(session.category)) {
      categoryStats.set(session.category, {
        sessions: 0,
        issues: 0,
        types: new Map()
      })
    }
    const stats = categoryStats.get(session.category)!
    stats.sessions++
    stats.issues += session.issues.length

    for (const issue of session.issues) {
      stats.types.set(issue.issueType, (stats.types.get(issue.issueType) || 0) + 1)
    }
  }

  // Find categories with high issue rates
  for (const [category, stats] of categoryStats) {
    const issueRate = stats.issues / stats.sessions

    if (issueRate >= 2 && stats.sessions >= 3) {
      const topIssueType = [...stats.types.entries()].sort((a, b) => b[1] - a[1])[0]

      patterns.push({
        id: `category-issue-${category}`,
        type: 'category_issue',
        title: `High issue rate in category: ${category}`,
        description: `${category} sessions have ${issueRate.toFixed(1)} issues on average, mostly ${topIssueType?.[0] || 'various'}`,
        occurrences: stats.issues,
        firstSeen: new Date(),
        lastSeen: new Date(),
        severity: 'medium',
        relatedIssues: [],
        recommendation: `Add more validation and testing for ${category} work. Consider creating a checklist for ${topIssueType?.[0] || 'common'} issues`,
        metadata: {
          category,
          issueRate,
          sessions: stats.sessions,
          topIssueType: topIssueType?.[0]
        }
      })
    }
  }

  return patterns
}

function generateRecommendation(issueType: string, occurrences: number, unresolved: number): string {
  const recommendations: Record<string, string[]> = {
    typescript: [
      'Add stricter TypeScript configuration',
      'Create type definitions for common patterns',
      'Use type guards for runtime checks'
    ],
    runtime: [
      'Add null/undefined checks',
      'Implement error boundaries',
      'Add defensive programming patterns'
    ],
    build: [
      'Pin dependency versions',
      'Add pre-build validation',
      'Use consistent Node.js version'
    ],
    auth: [
      'Implement token refresh logic',
      'Add session validation',
      'Use secure cookie settings'
    ],
    database: [
      'Add connection pooling',
      'Implement retry logic',
      'Add database health checks'
    ],
    api: [
      'Add request timeouts',
      'Implement retry with backoff',
      'Add circuit breaker pattern'
    ]
  }

  const defaultRecs = [
    'Document the solution for future reference',
    'Add tests to prevent regression',
    'Create a code snippet for reuse'
  ]

  const recs = recommendations[issueType] || defaultRecs
  const urgency = unresolved > 0 ? 'URGENT: ' : ''

  return `${urgency}${recs[Math.floor(Math.random() * recs.length)]} (${occurrences} occurrences)`
}

// =============================================================================
// PREDICTION ENGINE
// =============================================================================

export async function predictIssues(context: {
  model?: string
  category?: string
  filesToModify?: string[]
  timeOfDay?: number
}): Promise<IssuePrediction[]> {
  const predictions: IssuePrediction[] = []

  // Get historical data
  const sessions = await db.aISession.findMany({
    include: {
      issues: true
    },
    take: 100
  })

  // Predict based on model
  if (context.model) {
    const modelSessions = sessions.filter(s => s.model === context.model)
    if (modelSessions.length >= 3) {
      const avgIssues = modelSessions.reduce((sum, s) => sum + s.issuesCreated, 0) / modelSessions.length
      const topIssueType = getTopIssueType(modelSessions.flatMap(s => s.issues))

      if (avgIssues > 1) {
        predictions.push({
          type: topIssueType,
          probability: Math.min(0.9, avgIssues / 5),
          reason: `Model ${context.model} has ${avgIssues.toFixed(1)} issues per session on average`,
          preventions: getPreventions(topIssueType),
          basedOn: [`Historical data from ${modelSessions.length} sessions`]
        })
      }
    }
  }

  // Predict based on category
  if (context.category) {
    const categorySessions = sessions.filter(s => s.category === context.category)
    if (categorySessions.length >= 3) {
      const avgIssues = categorySessions.reduce((sum, s) => sum + s.issuesCreated, 0) / categorySessions.length
      const topIssueType = getTopIssueType(categorySessions.flatMap(s => s.issues))

      if (avgIssues > 1) {
        predictions.push({
          type: topIssueType,
          probability: Math.min(0.85, avgIssues / 4),
          reason: `Category "${context.category}" has ${avgIssues.toFixed(1)} issues per session`,
          preventions: getPreventions(topIssueType),
          basedOn: [`Historical data from ${categorySessions.length} sessions`]
        })
      }
    }
  }

  // Predict based on files to modify
  if (context.filesToModify && context.filesToModify.length > 0) {
    for (const file of context.filesToModify) {
      const filePattern = await checkFilePattern(file)
      if (filePattern) {
        predictions.push(filePattern)
      }
    }
  }

  // Predict based on time
  if (context.timeOfDay !== undefined) {
    const timePrediction = predictBasedOnTime(sessions, context.timeOfDay)
    if (timePrediction) {
      predictions.push(timePrediction)
    }
  }

  return predictions.sort((a, b) => b.probability - a.probability)
}

function getTopIssueType(issues: any[]): string {
  const counts = new Map<string, number>()
  for (const issue of issues) {
    counts.set(issue.issueType, (counts.get(issue.issueType) || 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || 'unknown'
}

function getPreventions(issueType: string): string[] {
  const preventions: Record<string, string[]> = {
    typescript: [
      'Run tsc --noEmit before changes',
      'Add explicit return types',
      'Use strictNullChecks'
    ],
    runtime: [
      'Add try-catch blocks',
      'Validate input data',
      'Add null checks'
    ],
    build: [
      'Run build locally first',
      'Check dependency versions',
      'Clear cache before build'
    ],
    auth: [
      'Verify token validity',
      'Check session state',
      'Test with expired tokens'
    ],
    database: [
      'Check connection status',
      'Validate query syntax',
      'Test with sample data'
    ],
    api: [
      'Test endpoint connectivity',
      'Add timeout handling',
      'Check CORS settings'
    ]
  }

  return preventions[issueType] || [
    'Test changes locally',
    'Review code before committing',
    'Add appropriate error handling'
  ]
}

async function checkFilePattern(file: string): Promise<IssuePrediction | null> {
  const features = await db.aIFeature.findMany({
    where: {
      OR: [
        { filesCreated: { contains: file } },
        { filesModified: { contains: file } }
      ]
    },
    include: {
      session: {
        include: { issues: true }
      }
    }
  })

  if (features.length >= 3) {
    const issues = features.flatMap(f => f.session.issues)
    const avgIssues = issues.length / features.length

    if (avgIssues > 0.5) {
      return {
        type: getTopIssueType(issues),
        probability: Math.min(0.75, avgIssues / 3),
        reason: `File ${file.split('/').pop()} has been modified ${features.length} times with ${issues.length} issues`,
        preventions: [
          `Review previous modifications to ${file.split('/').pop()}`,
          'Check for patterns in issues',
          'Consider refactoring if issues persist'
        ],
        basedOn: [`${features.length} previous modifications`]
      }
    }
  }

  return null
}

function predictBasedOnTime(sessions: any[], hour: number): IssuePrediction | null {
  const hourSessions = sessions.filter(s => new Date(s.startTime).getHours() === hour)

  if (hourSessions.length >= 5) {
    const avgIssues = hourSessions.reduce((sum, s) => sum + s.issuesCreated, 0) / hourSessions.length

    if (avgIssues > 1.5) {
      return {
        type: getTopIssueType(hourSessions.flatMap(s => s.issues)),
        probability: Math.min(0.6, avgIssues / 5),
        reason: `Time slot ${hour}:00-${hour + 1}:00 has higher issue rate (${avgIssues.toFixed(1)}/session)`,
        preventions: [
          'Double-check your work',
          'Take breaks during this time',
          'Avoid complex changes'
        ],
        basedOn: [`${hourSessions.length} sessions at this hour`]
      }
    }
  }

  return null
}

// =============================================================================
// DATABASE PERSISTENCE
// =============================================================================

async function savePatterns(patterns: DetectedPattern[]): Promise<void> {
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
          firstOccurrence: pattern.firstSeen,
          lastOccurrence: pattern.lastSeen,
          severity: pattern.severity,
          metadata: JSON.stringify(pattern.metadata),
          recommendation: pattern.recommendation,
          status: 'active'
        },
        update: {
          occurrenceCount: pattern.occurrences,
          lastOccurrence: pattern.lastSeen,
          severity: pattern.severity,
          status: 'active'
        }
      })
    } catch (error) {
      console.error('Failed to save pattern:', pattern.id, error)
    }
  }
}

// =============================================================================
// WARNING GENERATOR
// =============================================================================

export async function generateWarnings(): Promise<PatternWarning[]> {
  const warnings: PatternWarning[] = []

  // Get active patterns
  const patterns = await db.aIPattern.findMany({
    where: { status: 'active' },
    orderBy: { occurrenceCount: 'desc' },
    take: 20
  })

  for (const pattern of patterns) {
    const warning = createWarningFromPattern(pattern as any)
    if (warning) {
      warnings.push(warning)
    }
  }

  return warnings
}

function createWarningFromPattern(pattern: any): PatternWarning | null {
  // Only warn on significant patterns
  if (pattern.occurrenceCount < 2 && pattern.severity !== 'critical') {
    return null
  }

  let message = ''
  let actionRequired = false
  const suggestedActions: string[] = []

  switch (pattern.patternType) {
    case 'recurring_issue':
      message = `⚠️ Recurring issue detected: ${pattern.patternName}`
      actionRequired = pattern.severity === 'high' || pattern.severity === 'critical'
      suggestedActions.push(pattern.recommendation)
      suggestedActions.push('Review and document the solution')
      break

    case 'frequent_file':
      message = `📝 File modification pattern: ${pattern.patternName}`
      suggestedActions.push('Consider refactoring')
      suggestedActions.push('Add tests for stability')
      break

    case 'time_pattern':
      message = `⏰ Time-based pattern: ${pattern.patternName}`
      suggestedActions.push('Be extra careful during this time')
      break

    case 'model_issue':
      message = `🤖 Model-specific issue: ${pattern.patternName}`
      suggestedActions.push('Consider alternative model')
      suggestedActions.push('Add validation steps')
      break

    case 'category_issue':
      message = `📂 Category issue pattern: ${pattern.patternName}`
      suggestedActions.push('Create a checklist')
      suggestedActions.push('Add more testing')
      break

    default:
      return null
  }

  return {
    id: `warning-${pattern.id}`,
    pattern: pattern as DetectedPattern,
    message,
    actionRequired,
    suggestedActions,
    createdAt: new Date()
  }
}
