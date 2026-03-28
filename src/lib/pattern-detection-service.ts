/**
 * AI CODING PATTERN DETECTION & PREDICTION ENGINE
 * ================================================
 * Advanced analytics for pattern detection, issue prediction,
 * self-assessment reports, and git integration
 */

import { db } from '@/lib/db'
import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

// =============================================================================
// TYPES
// =============================================================================

interface PatternWarning {
  id: string
  type: 'recurring_issue' | 'frequent_file' | 'time_pattern' | 'model_issue'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  occurrenceCount: number
  lastOccurred: Date
  suggestedAction: string
  relatedIssues: string[]
  confidence: number
}

interface IssuePrediction {
  id: string
  issueType: string
  probability: number
  riskLevel: 'low' | 'medium' | 'high'
  predictedTrigger: string
  preventiveActions: string[]
  basedOn: string[]
  confidence: number
}

interface SelfAssessmentReport {
  id: string
  period: 'weekly' | 'monthly'
  startDate: Date
  endDate: Date
  summary: {
    totalSessions: number
    totalIssues: number
    resolvedIssues: number
    totalFeatures: number
    totalCost: number
    efficiencyScore: number
  }
  insights: {
    category: string
    insight: string
    recommendation: string
    priority: 'low' | 'medium' | 'high'
  }[]
  patterns: PatternWarning[]
  predictions: IssuePrediction[]
  gitSummary: {
    totalCommits: number
    filesModified: string[]
    commitCategories: Record<string, number>
  }
  generatedAt: Date
}

interface GitCommit {
  hash: string
  message: string
  author: string
  date: Date
  files: string[]
  additions: number
  deletions: number
}

interface SessionGitLink {
  sessionId: string
  sessionDate: Date
  commits: GitCommit[]
  filesMatched: string[]
  confidence: number
}

// =============================================================================
// PATTERN DETECTION ENGINE
// =============================================================================

export async function detectPatterns(sessionId?: string): Promise<PatternWarning[]> {
  const warnings: PatternWarning[] = []
  
  try {
    // Get issues from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const issues = await db.aIIssue.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        ...(sessionId && { sessionId })
      },
      include: {
        session: {
          select: {
            sessionDate: true,
            title: true,
            model: true
          }
        }
      }
    })
    
    // 1. Detect recurring issues by title similarity
    const titleGroups = new Map<string, typeof issues>()
    for (const issue of issues) {
      const key = issue.title.toLowerCase().slice(0, 50)
      if (!titleGroups.has(key)) {
        titleGroups.set(key, [])
      }
      titleGroups.get(key)!.push(issue)
    }
    
    for (const [title, group] of titleGroups) {
      if (group.length >= 2) {
        const unresolved = group.filter(i => i.status !== 'resolved')
        warnings.push({
          id: `pattern-recurring-${title.slice(0, 20)}`,
          type: 'recurring_issue',
          severity: unresolved.length > 0 ? 'high' : 'medium',
          title: `Recurring Issue: ${title.slice(0, 60)}...`,
          description: `This issue has occurred ${group.length} times in the last 30 days. ${unresolved.length} remain unresolved.`,
          occurrenceCount: group.length,
          lastOccurred: group[group.length - 1].createdAt,
          suggestedAction: unresolved.length > 0 
            ? 'Consider a root cause analysis and permanent fix'
            : 'Document the resolution pattern for future reference',
          relatedIssues: group.map(i => i.id),
          confidence: 0.85 + (group.length * 0.03)
        })
      }
    }
    
    // 2. Detect issue type patterns
    const typeGroups = new Map<string, typeof issues>()
    for (const issue of issues) {
      if (!typeGroups.has(issue.issueType)) {
        typeGroups.set(issue.issueType, [])
      }
      typeGroups.get(issue.issueType)!.push(issue)
    }
    
    for (const [type, group] of typeGroups) {
      if (group.length >= 3) {
        const resolutionRate = group.filter(i => i.status === 'resolved').length / group.length
        warnings.push({
          id: `pattern-type-${type}`,
          type: 'recurring_issue',
          severity: resolutionRate < 0.5 ? 'high' : 'medium',
          title: `Frequent ${type} issues`,
          description: `${group.length} ${type} issues detected. Resolution rate: ${Math.round(resolutionRate * 100)}%`,
          occurrenceCount: group.length,
          lastOccurred: group[group.length - 1].createdAt,
          suggestedAction: getIssueTypeSuggestion(type),
          relatedIssues: group.slice(-5).map(i => i.id),
          confidence: 0.8
        })
      }
    }
    
    // 3. Detect time-based patterns (issues at specific times)
    const hourCounts = new Map<number, number>()
    for (const issue of issues) {
      const hour = new Date(issue.createdAt).getHours()
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1)
    }
    
    const avgCount = issues.length / 24
    for (const [hour, count] of hourCounts) {
      if (count > avgCount * 2 && count >= 3) {
        warnings.push({
          id: `pattern-time-${hour}`,
          type: 'time_pattern',
          severity: 'low',
          title: `High issue frequency at ${hour}:00`,
          description: `${count} issues detected around ${hour}:00. This might indicate fatigue or environmental factors.`,
          occurrenceCount: count,
          lastOccurred: new Date(),
          suggestedAction: 'Consider taking breaks during this time or reviewing the working environment',
          relatedIssues: [],
          confidence: 0.6
        })
      }
    }
    
    // 4. Detect model-specific issues
    const sessions = await db.aISession.findMany({
      where: { sessionDate: { gte: thirtyDaysAgo } },
      include: {
        issues: true
      }
    })
    
    const modelIssueRate = new Map<string, { total: number; issues: number }>()
    for (const session of sessions) {
      const model = session.model || 'unknown'
      const current = modelIssueRate.get(model) || { total: 0, issues: 0 }
      current.total++
      current.issues += session.issuesCreated
      modelIssueRate.set(model, current)
    }
    
    for (const [model, stats] of modelIssueRate) {
      if (stats.total >= 3) {
        const issueRate = stats.issues / stats.total
        if (issueRate > 2) {
          warnings.push({
            id: `pattern-model-${model}`,
            type: 'model_issue',
            severity: 'medium',
            title: `High issue rate with ${model}`,
            description: `Model ${model} has an average of ${issueRate.toFixed(1)} issues per session`,
            occurrenceCount: stats.total,
            lastOccurred: new Date(),
            suggestedAction: `Consider using a different model for complex tasks, or review prompts used with ${model}`,
            relatedIssues: [],
            confidence: 0.7
          })
        }
      }
    }
    
    // Sort by severity and confidence
    warnings.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
    
  } catch (error) {
    console.error('Pattern detection error:', error)
  }
  
  return warnings
}

function getIssueTypeSuggestion(type: string): string {
  const suggestions: Record<string, string> = {
    typescript: 'Consider adding stricter TypeScript configuration or running type checks more frequently',
    runtime: 'Add more unit tests and implement proper error handling',
    build: 'Review dependency versions and build configuration',
    auth: 'Implement proper session management and token refresh logic',
    database: 'Review database schema and add proper indexes',
    api: 'Add API response caching and implement retry logic'
  }
  return suggestions[type] || 'Review the pattern and implement preventive measures'
}

// =============================================================================
// PREDICTION ENGINE
// =============================================================================

export async function predictIssues(context?: {
  plannedWork?: string
  filesToModify?: string[]
  model?: string
}): Promise<IssuePrediction[]> {
  const predictions: IssuePrediction[] = []
  
  try {
    // Get historical data
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const [issues, sessions, features] = await Promise.all([
      db.aIIssue.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } }
      }),
      db.aISession.findMany({
        where: { sessionDate: { gte: thirtyDaysAgo } }
      }),
      db.aIFeature.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } }
      })
    ])
    
    // 1. Predict based on issue type frequency
    const issueTypeCounts = new Map<string, number>()
    for (const issue of issues) {
      issueTypeCounts.set(issue.issueType, (issueTypeCounts.get(issue.issueType) || 0) + 1)
    }
    
    const totalIssues = issues.length || 1
    for (const [type, count] of issueTypeCounts) {
      const probability = count / totalIssues
      if (probability >= 0.1) {
        predictions.push({
          id: `pred-type-${type}`,
          issueType: type,
          probability: Math.round(probability * 100),
          riskLevel: probability > 0.3 ? 'high' : probability > 0.15 ? 'medium' : 'low',
          predictedTrigger: `Any coding session has a ${Math.round(probability * 100)}% chance of encountering ${type} issues`,
          preventiveActions: getPreventiveActions(type),
          basedOn: [`${count} occurrences in the last 30 days`],
          confidence: Math.min(0.9, 0.5 + (count * 0.05))
        })
      }
    }
    
    // 2. Predict based on context (if provided)
    if (context?.plannedWork) {
      const work = context.plannedWork.toLowerCase()
      
      // Check for keywords that might predict issues
      const keywordPredictions: Record<string, { types: string[]; risk: number }> = {
        'api': { types: ['api', 'typescript'], risk: 0.3 },
        'database': { types: ['database', 'runtime'], risk: 0.25 },
        'auth': { types: ['auth', 'api'], risk: 0.35 },
        'migration': { types: ['database', 'build'], risk: 0.4 },
        'refactor': { types: ['typescript', 'runtime'], risk: 0.3 },
        'deploy': { types: ['build', 'api'], risk: 0.35 }
      }
      
      for (const [keyword, prediction] of Object.entries(keywordPredictions)) {
        if (work.includes(keyword)) {
          for (const type of prediction.types) {
            const existing = predictions.find(p => p.issueType === type)
            if (existing) {
              existing.probability = Math.min(100, existing.probability + prediction.risk * 100)
              existing.basedOn.push(`Planned work contains "${keyword}"`)
            } else {
              predictions.push({
                id: `pred-context-${type}`,
                issueType: type,
                probability: Math.round(prediction.risk * 100),
                riskLevel: prediction.risk > 0.3 ? 'high' : 'medium',
                predictedTrigger: `Working with ${keyword} often leads to ${type} issues`,
                preventiveActions: getPreventiveActions(type),
                basedOn: [`Planned work involves ${keyword}`],
                confidence: 0.6
              })
            }
          }
        }
      }
    }
    
    // 3. Predict based on files to modify (if provided)
    if (context?.filesToModify && context.filesToModify.length > 0) {
      // Check if these files have had issues before
      const fileIssues = new Map<string, number>()
      
      for (const issue of issues) {
        if (issue.fileAffected) {
          fileIssues.set(issue.fileAffected, (fileIssues.get(issue.fileAffected) || 0) + 1)
        }
      }
      
      for (const file of context.filesToModify) {
        const issueCount = fileIssues.get(file) || 0
        if (issueCount >= 2) {
          predictions.push({
            id: `pred-file-${file.slice(0, 30)}`,
            issueType: 'recurring',
            probability: Math.min(80, 30 + issueCount * 10),
            riskLevel: issueCount >= 3 ? 'high' : 'medium',
            predictedTrigger: `File ${file} has had ${issueCount} issues in the past`,
            preventiveActions: [
              `Review previous issues in ${file}`,
              'Consider refactoring if the file has high complexity',
              'Add tests before making changes'
            ],
            basedOn: [`${issueCount} historical issues in this file`],
            confidence: 0.75
          })
        }
      }
    }
    
    // 4. Session frequency prediction
    const avgIssuesPerSession = sessions.length > 0 
      ? issues.length / sessions.length 
      : 0
    
    if (avgIssuesPerSession > 1) {
      predictions.push({
        id: 'pred-session-freq',
        issueType: 'general',
        probability: Math.round(Math.min(90, avgIssuesPerSession * 25)),
        riskLevel: avgIssuesPerSession > 3 ? 'high' : 'medium',
        predictedTrigger: `Average of ${avgIssuesPerSession.toFixed(1)} issues per session`,
        preventiveActions: [
          'Plan sessions with clear, focused goals',
          'Break large tasks into smaller ones',
          'Review code before asking for AI assistance'
        ],
        basedOn: [`Historical average: ${avgIssuesPerSession.toFixed(1)} issues/session`],
        confidence: 0.7
      })
    }
    
    // Sort by probability
    predictions.sort((a, b) => b.probability - a.probability)
    
  } catch (error) {
    console.error('Prediction engine error:', error)
  }
  
  return predictions
}

function getPreventiveActions(issueType: string): string[] {
  const actions: Record<string, string[]> = {
    typescript: [
      'Run type check before making changes',
      'Use strict TypeScript configuration',
      'Enable incremental type checking'
    ],
    runtime: [
      'Add comprehensive unit tests',
      'Implement error boundaries',
      'Use proper error handling patterns'
    ],
    build: [
      'Clear build cache before building',
      'Check for dependency conflicts',
      'Use consistent Node.js version'
    ],
    auth: [
      'Test authentication flows thoroughly',
      'Implement proper session refresh',
      'Use secure token storage'
    ],
    database: [
      'Backup before schema changes',
      'Test migrations on copy first',
      'Add proper indexes'
    ],
    api: [
      'Add request timeout handling',
      'Implement retry logic',
      'Validate API responses'
    ]
  }
  return actions[issueType] || ['Review best practices for this area']
}

// =============================================================================
// SELF-ASSESSMENT REPORT GENERATOR
// =============================================================================

export async function generateSelfAssessmentReport(
  period: 'weekly' | 'monthly',
  projectId?: string
): Promise<SelfAssessmentReport> {
  const endDate = new Date()
  const startDate = new Date()
  
  if (period === 'weekly') {
    startDate.setDate(startDate.getDate() - 7)
  } else {
    startDate.setMonth(startDate.getMonth() - 1)
  }
  
  const reportId = `report-${period}-${startDate.toISOString().split('T')[0]}`
  
  try {
    // Get session data
    const sessions = await db.aISession.findMany({
      where: {
        sessionDate: { gte: startDate, lte: endDate }
      },
      include: {
        issues: true,
        features: true
      }
    })
    
    const issues = sessions.flatMap(s => s.issues)
    const features = sessions.flatMap(s => s.features)
    
    // Calculate summary
    const summary = {
      totalSessions: sessions.length,
      totalIssues: issues.length,
      resolvedIssues: issues.filter(i => i.status === 'resolved').length,
      totalFeatures: features.length,
      totalCost: sessions.reduce((sum, s) => sum + s.estimatedCost, 0),
      efficiencyScore: calculateEfficiencyScore(sessions, issues, features)
    }
    
    // Generate insights
    const insights = generateInsights(sessions, issues, features, period)
    
    // Get patterns and predictions
    const patterns = await detectPatterns()
    const predictions = await predictIssues()
    
    // Get git summary
    const gitSummary = await getGitSummary(startDate, endDate)
    
    const report: SelfAssessmentReport = {
      id: reportId,
      period,
      startDate,
      endDate,
      summary,
      insights,
      patterns: patterns.slice(0, 5),
      predictions: predictions.slice(0, 5),
      gitSummary,
      generatedAt: new Date()
    }
    
    // Save report to database
    await saveReport(report)
    
    return report
    
  } catch (error) {
    console.error('Report generation error:', error)
    throw error
  }
}

function calculateEfficiencyScore(
  sessions: any[],
  issues: any[],
  features: any[]
): number {
  if (sessions.length === 0) return 0
  
  const resolutionRate = issues.length > 0 
    ? issues.filter(i => i.status === 'resolved').length / issues.length 
    : 1
  
  const featuresPerSession = features.length / sessions.length
  const avgCostPerFeature = features.length > 0 
    ? sessions.reduce((sum, s) => sum + s.estimatedCost, 0) / features.length 
    : 0
  
  // Score components (0-100 each)
  const resolutionScore = resolutionRate * 100
  const productivityScore = Math.min(100, featuresPerSession * 30)
  const costEfficiencyScore = Math.min(100, Math.max(0, 100 - avgCostPerFeature * 1000))
  
  return Math.round((resolutionScore * 0.4) + (productivityScore * 0.3) + (costEfficiencyScore * 0.3))
}

function generateInsights(
  sessions: any[],
  issues: any[],
  features: any[],
  period: 'weekly' | 'monthly'
): SelfAssessmentReport['insights'] {
  const insights: SelfAssessmentReport['insights'] = []
  
  // Session patterns
  if (sessions.length > 0) {
    const avgDuration = sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
    if (avgDuration > 60) {
      insights.push({
        category: 'Productivity',
        insight: `Average session duration is ${Math.round(avgDuration)} minutes`,
        recommendation: 'Consider breaking long sessions into focused sprints',
        priority: 'medium'
      })
    }
    
    // Most productive day
    const dayProductivity = new Map<string, number>()
    for (const session of sessions) {
      const day = new Date(session.sessionDate).toLocaleDateString('en', { weekday: 'long' })
      dayProductivity.set(day, (dayProductivity.get(day) || 0) + session.featuresImplemented)
    }
    
    let bestDay = ''
    let bestCount = 0
    for (const [day, count] of dayProductivity) {
      if (count > bestCount) {
        bestCount = count
        bestDay = day
      }
    }
    
    if (bestDay) {
      insights.push({
        category: 'Productivity',
        insight: `${bestDay}s are your most productive days`,
        recommendation: `Schedule complex tasks for ${bestDay}s when possible`,
        priority: 'low'
      })
    }
  }
  
  // Issue patterns
  if (issues.length > 0) {
    const unresolvedRate = issues.filter(i => i.status !== 'resolved').length / issues.length
    if (unresolvedRate > 0.3) {
      insights.push({
        category: 'Quality',
        insight: `${Math.round(unresolvedRate * 100)}% of issues remain unresolved`,
        recommendation: 'Dedicate time to resolve pending issues before starting new work',
        priority: 'high'
      })
    }
    
    // Most common issue type
    const typeCounts = new Map<string, number>()
    for (const issue of issues) {
      typeCounts.set(issue.issueType, (typeCounts.get(issue.issueType) || 0) + 1)
    }
    
    let topType = ''
    let topCount = 0
    for (const [type, count] of typeCounts) {
      if (count > topCount) {
        topCount = count
        topType = type
      }
    }
    
    if (topType && topCount >= 3) {
      insights.push({
        category: 'Quality',
        insight: `${topType} issues are most common (${topCount} occurrences)`,
        recommendation: getIssueTypeSuggestion(topType),
        priority: 'medium'
      })
    }
  }
  
  // Cost insights
  if (sessions.length > 0) {
    const totalCost = sessions.reduce((sum, s) => sum + s.estimatedCost, 0)
    const costPerFeature = features.length > 0 ? totalCost / features.length : 0
    
    if (costPerFeature > 0.1) {
      insights.push({
        category: 'Cost',
        insight: `Average cost per feature: $${costPerFeature.toFixed(3)}`,
        recommendation: 'Consider using smaller models for simpler tasks to reduce costs',
        priority: 'medium'
      })
    }
    
    // Model usage
    const modelCounts = new Map<string, number>()
    for (const session of sessions) {
      modelCounts.set(session.model, (modelCounts.get(session.model) || 0) + 1)
    }
    
    if (modelCounts.size > 1) {
      let mostUsed = ''
      let mostCount = 0
      for (const [model, count] of modelCounts) {
        if (count > mostCount) {
          mostCount = count
          mostUsed = model
        }
      }
      
      insights.push({
        category: 'Usage',
        insight: `Primary model: ${mostUsed} (${Math.round(mostCount / sessions.length * 100)}% of sessions)`,
        recommendation: 'Experiment with different models for different task types',
        priority: 'low'
      })
    }
  }
  
  // Feature velocity
  if (features.length > 0 && period === 'weekly') {
    const dailyFeatures = new Map<string, number>()
    for (const feature of features) {
      const date = feature.createdAt.toISOString().split('T')[0]
      dailyFeatures.set(date, (dailyFeatures.get(date) || 0) + 1)
    }
    
    const avgDaily = features.length / 7
    insights.push({
      category: 'Velocity',
      insight: `Average of ${avgDaily.toFixed(1)} features implemented per day`,
      recommendation: avgDaily < 1 ? 'Focus on smaller, incremental improvements' : 'Maintain this pace for consistent progress',
      priority: 'low'
    })
  }
  
  return insights
}

async function saveReport(report: SelfAssessmentReport): Promise<void> {
  try {
    await db.aIAnalyticsSummary.upsert({
      where: { id: report.id },
      create: {
        id: report.id,
        date: report.endDate,
        period: report.period,
        totalSessions: report.summary.totalSessions,
        totalIssues: report.summary.totalIssues,
        resolvedIssues: report.summary.resolvedIssues,
        totalFeatures: report.summary.totalFeatures,
        totalCost: report.summary.totalCost,
        avgSessionDuration: 0,
        efficiencyScore: report.summary.efficiencyScore,
        topPatterns: JSON.stringify(report.patterns),
        predictions: JSON.stringify(report.predictions),
        insights: JSON.stringify(report.insights),
        recommendations: JSON.stringify(report.insights.map(i => i.recommendation))
      },
      update: {
        totalSessions: report.summary.totalSessions,
        totalIssues: report.summary.totalIssues,
        resolvedIssues: report.summary.resolvedIssues,
        totalFeatures: report.summary.totalFeatures,
        totalCost: report.summary.totalCost,
        efficiencyScore: report.summary.efficiencyScore,
        topPatterns: JSON.stringify(report.patterns),
        predictions: JSON.stringify(report.predictions),
        insights: JSON.stringify(report.insights),
        updatedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Failed to save report:', error)
  }
}

// =============================================================================
// GIT INTEGRATION
// =============================================================================

export async function getGitHistory(
  since?: Date,
  until?: Date,
  limit: number = 100
): Promise<GitCommit[]> {
  const commits: GitCommit[] = []
  
  try {
    const projectPath = process.cwd()
    
    // Check if it's a git repository
    if (!existsSync(join(projectPath, '.git'))) {
      console.log('Not a git repository')
      return []
    }
    
    // Build git log command
    let gitCmd = `git log --pretty=format:"%H|%s|%an|%at" --numstat --no-merges -n ${limit}`
    
    if (since) {
      gitCmd += ` --since="${since.toISOString()}"`
    }
    if (until) {
      gitCmd += ` --until="${until.toISOString()}"`
    }
    
    const output = execSync(gitCmd, { 
      cwd: projectPath,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    })
    
    // Parse the output
    const lines = output.split('\n')
    let currentCommit: Partial<GitCommit> | null = null
    
    for (const line of lines) {
      if (line.includes('|')) {
        // This is a commit header line
        const [hash, message, author, timestamp] = line.split('|')
        
        if (currentCommit && currentCommit.hash) {
          commits.push(currentCommit as GitCommit)
        }
        
        currentCommit = {
          hash,
          message,
          author,
          date: new Date(parseInt(timestamp) * 1000),
          files: [],
          additions: 0,
          deletions: 0
        }
      } else if (line.trim() && currentCommit) {
        // This is a numstat line (additions deletions filename)
        const parts = line.trim().split('\t')
        if (parts.length >= 3) {
          const additions = parseInt(parts[0]) || 0
          const deletions = parseInt(parts[1]) || 0
          const file = parts[2]
          
          currentCommit.files!.push(file)
          currentCommit.additions! += additions
          currentCommit.deletions! += deletions
        }
      }
    }
    
    // Don't forget the last commit
    if (currentCommit && currentCommit.hash) {
      commits.push(currentCommit as GitCommit)
    }
    
  } catch (error) {
    console.error('Git history error:', error)
  }
  
  return commits
}

export async function getGitSummary(
  since: Date,
  until: Date
): Promise<SelfAssessmentReport['gitSummary']> {
  try {
    const commits = await getGitHistory(since, until, 500)
    
    const filesModified = [...new Set(commits.flatMap(c => c.files))]
    
    const commitCategories: Record<string, number> = {}
    for (const commit of commits) {
      const msg = commit.message.toLowerCase()
      let category = 'other'
      
      if (msg.includes('fix') || msg.includes('bug')) {
        category = 'bugfix'
      } else if (msg.includes('feat') || msg.includes('add')) {
        category = 'feature'
      } else if (msg.includes('refactor')) {
        category = 'refactor'
      } else if (msg.includes('docs') || msg.includes('doc')) {
        category = 'documentation'
      } else if (msg.includes('test')) {
        category = 'test'
      } else if (msg.includes('style') || msg.includes('format')) {
        category = 'style'
      } else if (msg.includes('perf')) {
        category = 'performance'
      }
      
      commitCategories[category] = (commitCategories[category] || 0) + 1
    }
    
    return {
      totalCommits: commits.length,
      filesModified: filesModified.slice(0, 50), // Top 50 files
      commitCategories
    }
    
  } catch (error) {
    console.error('Git summary error:', error)
    return {
      totalCommits: 0,
      filesModified: [],
      commitCategories: {}
    }
  }
}

export async function linkGitToSessions(
  sessions: any[],
  commits: GitCommit[]
): Promise<SessionGitLink[]> {
  const links: SessionGitLink[] = []
  
  for (const session of sessions) {
    const sessionDate = new Date(session.sessionDate)
    const sessionDateStr = sessionDate.toISOString().split('T')[0]
    
    // Find commits on the same day
    const matchingCommits = commits.filter(c => {
      const commitDate = c.date.toISOString().split('T')[0]
      return commitDate === sessionDateStr
    })
    
    if (matchingCommits.length > 0) {
      // Check for file matches
      const sessionFiles = session.filesModified ? 
        (typeof session.filesModified === 'string' ? 
          JSON.parse(session.filesModified) : session.filesModified) : []
      
      const commitFiles = matchingCommits.flatMap(c => c.files)
      const filesMatched = sessionFiles.filter((f: string) => 
        commitFiles.some((cf: string) => cf.includes(f.split('/').pop() || ''))
      )
      
      const confidence = filesMatched.length > 0 ? 
        Math.min(1, filesMatched.length / Math.max(sessionFiles.length, 1)) : 
        0.5
      
      links.push({
        sessionId: session.id,
        sessionDate,
        commits: matchingCommits,
        filesMatched,
        confidence
      })
    }
  }
  
  return links
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export async function getRecentReports(limit: number = 10): Promise<any[]> {
  try {
    return await db.aIAnalyticsSummary.findMany({
      orderBy: { date: 'desc' },
      take: limit
    })
  } catch (error) {
    console.error('Failed to get recent reports:', error)
    return []
  }
}

export async function getWarningCount(): Promise<number> {
  const patterns = await detectPatterns()
  return patterns.filter(p => p.severity === 'high' || p.severity === 'critical').length
}
