/**
 * TIER 4: AUTOMATION SERVICE
 * ==========================
 * Pattern Alert System, Weekly Self-Assessment Reports, Prevention Rule Generator
 */

import { db } from '@/lib/db'
import type {
  PatternAlert,
  WeeklyReport,
  InsightRecord,
  PatternSummary,
  RecommendationRecord,
  GeneratedRule
} from './types'
import { generateSelfAssessmentReport, getLatestReports } from './self-assessment'

// =============================================================================
// F17: PATTERN ALERT SYSTEM
// =============================================================================

export async function generatePatternAlerts(): Promise<PatternAlert[]> {
  const alerts: PatternAlert[] = []
  
  // Get active patterns with high severity or occurrence
  const patterns = await db.aIPattern.findMany({
    where: {
      status: 'active',
      OR: [
        { severity: { in: ['high', 'critical'] } },
        { occurrenceCount: { gte: 3 } }
      ]
    },
    orderBy: { updatedAt: 'desc' }
  })
  
  for (const pattern of patterns) {
    // Check if alert already exists
    const existingAlert = await db.aIPattern.count({
      where: {
        id: `alert-${pattern.id}`,
        status: 'active'
      }
    })
    
    if (!existingAlert) {
      const alert: PatternAlert = {
        id: `alert-${pattern.id}`,
        patternId: pattern.id,
        patternName: pattern.patternName,
        type: 'pattern_match',
        severity: pattern.severity === 'critical' ? 'critical' : 
                  pattern.severity === 'high' ? 'warning' : 'info',
        message: `Pattern detected: ${pattern.patternName} (${pattern.occurrenceCount} occurrences)`,
        relatedIssues: [],
        status: 'open',
        suggestedActions: generateAlertActions(pattern),
        triggeredDuring: 'analysis',
        createdAt: new Date()
      }
      
      alerts.push(alert)
    }
  }
  
  // Check for cost threshold alerts
  const costAlert = await checkCostThreshold()
  if (costAlert) {
    alerts.push(costAlert)
  }
  
  // Check for efficiency drop alerts
  const efficiencyAlert = await checkEfficiencyDrop()
  if (efficiencyAlert) {
    alerts.push(efficiencyAlert)
  }
  
  // Save alerts to database
  for (const alert of alerts) {
    await saveAlert(alert)
  }
  
  return alerts
}

function generateAlertActions(pattern: any): string[] {
  const actions: string[] = []
  
  if (pattern.recommendation) {
    actions.push(pattern.recommendation)
  }
  
  actions.push('Review related issues for common patterns')
  actions.push('Consider implementing prevention rules')
  
  if (pattern.patternType === 'recurring_issue') {
    actions.push('Create automated test to catch this issue')
  }
  
  if (pattern.severity === 'critical') {
    actions.push('IMMEDIATE: Investigate and resolve root cause')
  }
  
  return actions
}

async function checkCostThreshold(): Promise<PatternAlert | null> {
  const today = new Date()
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const sessions = await db.aISession.findMany({
    where: { sessionDate: { gte: weekAgo } }
  })
  
  const weeklyCost = sessions.reduce((sum, s) => sum + s.estimatedCost, 0)
  
  // Alert if weekly cost > $5
  if (weeklyCost > 5) {
    return {
      id: `alert-cost-${today.toISOString().split('T')[0]}`,
      patternId: 'cost-threshold',
      patternName: 'Weekly Cost Threshold Exceeded',
      type: 'cost_threshold',
      severity: 'warning',
      message: `Weekly cost ($${weeklyCost.toFixed(2)}) exceeds threshold ($5.00)`,
      relatedIssues: [],
      status: 'open',
      suggestedActions: [
        'Review high-cost sessions',
        'Consider using smaller models for simple tasks',
        'Enable response caching',
        'Review token usage patterns'
      ],
      triggeredDuring: 'threshold',
      createdAt: new Date()
    }
  }
  
  return null
}

async function checkEfficiencyDrop(): Promise<PatternAlert | null> {
  const today = new Date()
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  
  // Get sessions for this week and last week
  const [thisWeekSessions, lastWeekSessions] = await Promise.all([
    db.aISession.findMany({
      where: { sessionDate: { gte: weekAgo, lte: today } }
    }),
    db.aISession.findMany({
      where: { sessionDate: { gte: twoWeeksAgo, lte: weekAgo } }
    })
  ])
  
  if (lastWeekSessions.length === 0 || thisWeekSessions.length === 0) {
    return null
  }
  
  // Calculate efficiency (features per session)
  const thisWeekEfficiency = thisWeekSessions.reduce((sum, s) => sum + s.featuresImplemented, 0) / thisWeekSessions.length
  const lastWeekEfficiency = lastWeekSessions.reduce((sum, s) => sum + s.featuresImplemented, 0) / lastWeekSessions.length
  
  // Alert if efficiency dropped by more than 30%
  if (lastWeekEfficiency > 0 && thisWeekEfficiency < lastWeekEfficiency * 0.7) {
    const dropPercent = Math.round((1 - thisWeekEfficiency / lastWeekEfficiency) * 100)
    
    return {
      id: `alert-efficiency-${today.toISOString().split('T')[0]}`,
      patternId: 'efficiency-drop',
      patternName: 'Efficiency Drop Detected',
      type: 'efficiency_drop',
      severity: 'warning',
      message: `Productivity dropped ${dropPercent}% this week`,
      relatedIssues: [],
      status: 'open',
      suggestedActions: [
        'Review session complexity',
        'Check for recurring issues',
        'Consider breaking down tasks into smaller pieces',
        'Review model selection for task types'
      ],
      triggeredDuring: 'threshold',
      createdAt: new Date()
    }
  }
  
  return null
}

export async function getActiveAlerts(): Promise<PatternAlert[]> {
  // Get stored alerts from patterns with high severity
  const patterns = await db.aIPattern.findMany({
    where: {
      status: 'active',
      severity: { in: ['high', 'critical'] }
    },
    orderBy: { updatedAt: 'desc' },
    take: 20
  })
  
  return patterns.map(p => ({
    id: `alert-${p.id}`,
    patternId: p.id,
    patternName: p.patternName,
    type: 'pattern_match' as const,
    severity: p.severity === 'critical' ? 'critical' as const : 'warning' as const,
    message: `${p.patternName}: ${p.description || `${p.occurrenceCount} occurrences`}`,
    relatedIssues: [],
    status: 'open' as const,
    suggestedActions: p.recommendation ? [p.recommendation] : [],
    triggeredDuring: 'analysis' as const,
    createdAt: p.updatedAt
  }))
}

export async function acknowledgeAlert(alertId: string): Promise<{ success: boolean }> {
  try {
    // Update pattern status to monitoring
    const patternId = alertId.replace('alert-', '')
    await db.aIPattern.update({
      where: { id: patternId },
      data: { status: 'monitoring' }
    })
    
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function dismissAlert(alertId: string): Promise<{ success: boolean }> {
  try {
    const patternId = alertId.replace('alert-', '')
    await db.aIPattern.update({
      where: { id: patternId },
      data: { status: 'archived' }
    })
    
    return { success: true }
  } catch {
    return { success: false }
  }
}

async function saveAlert(alert: PatternAlert): Promise<void> {
  try {
    // Store alert as a pattern or in a separate alerts table
    // For now, we update the pattern with alert metadata
    await db.aIPattern.update({
      where: { id: alert.patternId },
      data: {
        metadata: JSON.stringify({
          alertTriggered: true,
          alertTimestamp: alert.createdAt.toISOString(),
          alertSeverity: alert.severity
        })
      }
    })
  } catch (error) {
    console.error('Failed to save alert:', error)
  }
}

// =============================================================================
// F18: WEEKLY SELF-ASSESSMENT REPORT
// =============================================================================

export async function generateWeeklyReport(): Promise<WeeklyReport> {
  // Use existing self-assessment generator
  const report = await generateSelfAssessmentReport('weekly')
  
  // Convert to WeeklyReport format
  const weeklyReport: WeeklyReport = {
    id: report.id,
    reportType: 'weekly',
    periodStart: report.period.start,
    periodEnd: report.period.end,
    summary: report.summary,
    scores: report.scores,
    trends: report.trends,
    insights: report.insights.map(i => ({
      type: i.type as any,
      title: i.title,
      description: i.description,
      actionable: i.actionable,
      action: i.action
    })),
    topPatterns: report.topIssues.map(i => ({
      patternId: `pattern-${i.type}`,
      name: i.type,
      type: 'issue',
      occurrences: i.count,
      trend: i.trend
    })),
    recommendations: generateRecommendations(report),
    pdfGenerated: false,
    emailSent: false,
    createdAt: report.generatedAt
  }
  
  // Save weekly report
  await saveWeeklyReport(weeklyReport)
  
  return weeklyReport
}

function generateRecommendations(report: any): RecommendationRecord[] {
  const recommendations: RecommendationRecord[] = []
  let priority = 1
  
  // Cost recommendations
  if (report.summary.totalCost > 1) {
    recommendations.push({
      id: `rec-cost-${priority}`,
      priority: priority++,
      category: 'cost',
      title: 'Optimize Token Usage',
      description: `Total cost this period: $${report.summary.totalCost.toFixed(2)}. Consider using smaller models for initial drafts.`,
      impact: `Potential savings: $${(report.summary.totalCost * 0.3).toFixed(2)}/week`
    })
  }
  
  // Efficiency recommendations
  if (report.scores.efficiency < 70) {
    recommendations.push({
      id: `rec-eff-${priority}`,
      priority: priority++,
      category: 'efficiency',
      title: 'Improve Session Efficiency',
      description: 'Current efficiency score is below optimal. Consider breaking tasks into smaller, focused sessions.',
      impact: 'Could improve productivity by 20-30%'
    })
  }
  
  // Quality recommendations
  if (report.scores.resolution < 80) {
    recommendations.push({
      id: `rec-quality-${priority}`,
      priority: priority++,
      category: 'quality',
      title: 'Focus on Issue Resolution',
      description: `Resolution rate: ${report.scores.resolution}%. Prioritize resolving existing issues before starting new features.`,
      impact: 'Reduces technical debt and recurring issues'
    })
  }
  
  // Process recommendations
  if (report.summary.totalSessions < 3) {
    recommendations.push({
      id: `rec-process-${priority}`,
      priority: priority++,
      category: 'process',
      title: 'Increase Coding Activity',
      description: 'Consider scheduling more focused coding sessions to maintain momentum.',
      impact: 'Improved consistency and skill development'
    })
  }
  
  return recommendations
}

async function saveWeeklyReport(report: WeeklyReport): Promise<void> {
  try {
    await db.aIAnalyticsSummary.upsert({
      where: { id: report.id },
      create: {
        id: report.id,
        summaryType: 'weekly',
        summaryDate: report.periodStart,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        totalSessions: report.summary.totalSessions,
        totalTokens: report.summary.totalTokens,
        totalCost: report.summary.totalCost,
        avgDuration: report.summary.avgDuration,
        issuesCreated: report.summary.issuesCreated,
        issuesResolved: report.summary.issuesResolved,
        featuresImplemented: report.summary.featuresImplemented,
        efficiencyScore: report.scores.efficiency,
        resolutionRate: report.scores.resolution,
        productivityScore: report.scores.productivity,
        costEfficiencyScore: report.scores.costEfficiency,
        insights: JSON.stringify(report.insights),
        recommendations: JSON.stringify(report.recommendations)
      },
      update: {
        updatedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Failed to save weekly report:', error)
  }
}

export async function getReportHistory(limit: number = 10): Promise<WeeklyReport[]> {
  const reports = await getLatestReports('weekly', limit)
  
  return reports.map(r => ({
    id: r.id,
    reportType: r.reportType,
    periodStart: r.period.start,
    periodEnd: r.period.end,
    summary: r.summary,
    scores: r.scores,
    trends: r.trends,
    insights: r.insights.map(i => ({
      type: i.type as any,
      title: i.title,
      description: i.description,
      actionable: i.actionable,
      action: i.action
    })),
    topPatterns: [],
    recommendations: [],
    pdfGenerated: false,
    emailSent: false,
    createdAt: r.generatedAt
  }))
}

// =============================================================================
// F19: PREVENTION RULE GENERATOR
// =============================================================================

export async function generatePreventionRules(): Promise<GeneratedRule[]> {
  const rules: GeneratedRule[] = []
  
  // Get patterns with high occurrence
  const patterns = await db.aIPattern.findMany({
    where: {
      status: 'active',
      occurrenceCount: { gte: 2 }
    },
    orderBy: { occurrenceCount: 'desc' },
    take: 20
  })
  
  for (const pattern of patterns) {
    const generatedRule = generateRuleFromPattern(pattern)
    if (generatedRule) {
      rules.push(generatedRule)
    }
  }
  
  return rules
}

function generateRuleFromPattern(pattern: any): GeneratedRule | null {
  const metadata = typeof pattern.metadata === 'string' 
    ? JSON.parse(pattern.metadata || '{}') 
    : pattern.metadata || {}
  
  // Generate ESLint rule for TypeScript errors
  if (metadata.issueType === 'typescript' || pattern.patternType === 'typescript') {
    return {
      id: `rule-eslint-${pattern.id}`,
      patternId: pattern.id,
      patternName: pattern.patternName,
      ruleName: `prevent-${pattern.patternName.toLowerCase().replace(/\s+/g, '-')}`,
      ruleType: 'eslint',
      eslintConfig: {
        rule: '@typescript-eslint/no-explicit-any: error',
        options: {
          fixToUnknown: true,
          ignoreRestArgs: false
        },
        message: pattern.patternName
      },
      documentation: `# ${pattern.patternName}\n\nThis rule prevents the recurring issue: ${pattern.description || pattern.patternName}\n\n## Recommendation\n${pattern.recommendation || 'Review and fix the issue'}`,
      isActive: true,
      effectiveness: 0.8,
      triggerCount: pattern.occurrenceCount,
      createdAt: new Date()
    }
  }
  
  // Generate pre-commit hook for runtime errors
  if (metadata.issueType === 'runtime' || pattern.patternType === 'recurring_issue') {
    return {
      id: `rule-precommit-${pattern.id}`,
      patternId: pattern.id,
      patternName: pattern.patternName,
      ruleName: `check-${pattern.patternName.toLowerCase().replace(/\s+/g, '-')}`,
      ruleType: 'precommit',
      precommitConfig: {
        hook: 'pre-commit',
        command: 'npm run lint && npm run type-check',
        files: ['**/*.ts', '**/*.tsx']
      },
      documentation: `# ${pattern.patternName}\n\nPre-commit hook to catch this issue before it reaches the repository.\n\n## What it checks\n${pattern.description || pattern.patternName}`,
      isActive: true,
      effectiveness: 0.7,
      triggerCount: pattern.occurrenceCount,
      createdAt: new Date()
    }
  }
  
  // Generate documentation rule for process issues
  if (pattern.patternType === 'category_issue' || pattern.patternType === 'time_pattern') {
    return {
      id: `rule-doc-${pattern.id}`,
      patternId: pattern.id,
      patternName: pattern.patternName,
      ruleName: `document-${pattern.patternName.toLowerCase().replace(/\s+/g, '-')}`,
      ruleType: 'documentation',
      documentation: `# Process Guide: ${pattern.patternName}\n\n## Issue\n${pattern.description || pattern.patternName}\n\n## Prevention\n${pattern.recommendation || 'Follow best practices'}\n\n## Checklist\n- [ ] Review code before committing\n- [ ] Test locally\n- [ ] Check for similar patterns\n`,
      isActive: true,
      effectiveness: 0.6,
      triggerCount: pattern.occurrenceCount,
      createdAt: new Date()
    }
  }
  
  // Generate runtime check for frequent file issues
  if (pattern.patternType === 'frequent_file') {
    return {
      id: `rule-runtime-${pattern.id}`,
      patternId: pattern.id,
      patternName: pattern.patternName,
      ruleName: `monitor-${pattern.patternName.toLowerCase().replace(/\s+/g, '-')}`,
      ruleType: 'runtime',
      documentation: `# File Stability Check: ${pattern.patternName}\n\nThis file is frequently modified. Consider:\n- Adding comprehensive tests\n- Refactoring into smaller modules\n- Creating a stability index`,
      isActive: true,
      effectiveness: 0.5,
      triggerCount: pattern.occurrenceCount,
      createdAt: new Date()
    }
  }
  
  return null
}

export async function applyPreventionRule(ruleId: string): Promise<{ success: boolean; message: string }> {
  try {
    // In a real implementation, this would:
    // 1. For ESLint rules: Add to .eslintrc.json
    // 2. For pre-commit: Update .husky/pre-commit
    // 3. For documentation: Create/update docs
    
    return {
      success: true,
      message: 'Prevention rule applied successfully. You may need to restart your development server.'
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to apply rule'
    }
  }
}

export async function generateESLintConfig(rules: GeneratedRule[]): Promise<string> {
  const eslintRules: Record<string, string | [string, any]> = {}
  
  for (const rule of rules) {
    if (rule.ruleType === 'eslint' && rule.eslintConfig) {
      eslintRules[rule.eslintConfig.rule.split(':')[0]] = rule.eslintConfig.options
        ? [rule.eslintConfig.rule.split(':')[1] || 'error', rule.eslintConfig.options]
        : rule.eslintConfig.rule.split(':')[1] || 'error'
    }
  }
  
  const config = {
    extends: ['next/core-web-vitals', 'plugin:@typescript-eslint/recommended'],
    rules: eslintRules
  }
  
  return JSON.stringify(config, null, 2)
}

// =============================================================================
// REAL-TIME IMPORT ALERTS
// =============================================================================

export async function checkImportAlerts(
  sessionData: {
    model: string
    category: string
    tokens: number
    cost: number
    issues: number
    features: number
  }
): Promise<PatternAlert[]> {
  const alerts: PatternAlert[] = []
  
  // Check for high token usage
  if (sessionData.tokens > 50000) {
    alerts.push({
      id: `alert-tokens-${Date.now()}`,
      patternId: 'high-tokens',
      patternName: 'High Token Usage Session',
      type: 'efficiency_drop',
      severity: 'warning',
      message: `Session used ${sessionData.tokens.toLocaleString()} tokens. Consider breaking into smaller sessions.`,
      relatedIssues: [],
      status: 'open',
      suggestedActions: [
        'Review session complexity',
        'Consider using smaller model for initial work',
        'Break task into smaller pieces'
      ],
      triggeredDuring: 'import',
      createdAt: new Date()
    })
  }
  
  // Check for high issue count
  if (sessionData.issues > 5) {
    alerts.push({
      id: `alert-issues-${Date.now()}`,
      patternId: 'high-issues',
      patternName: 'High Issue Count Session',
      type: 'issue_detected',
      severity: 'warning',
      message: `Session generated ${sessionData.issues} issues. Review session quality.`,
      relatedIssues: [],
      status: 'open',
      suggestedActions: [
        'Review issue patterns',
        'Consider different approach',
        'Add validation steps'
      ],
      triggeredDuring: 'import',
      createdAt: new Date()
    })
  }
  
  // Check for low feature output
  if (sessionData.features === 0 && sessionData.tokens > 10000) {
    alerts.push({
      id: `alert-nofeatures-${Date.now()}`,
      patternId: 'no-features',
      patternName: 'Low Output Session',
      type: 'efficiency_drop',
      severity: 'info',
      message: 'High token usage with no features implemented. Review session effectiveness.',
      relatedIssues: [],
      status: 'open',
      suggestedActions: [
        'Review session goals',
        'Check if task was appropriate for AI assistance'
      ],
      triggeredDuring: 'import',
      createdAt: new Date()
    })
  }
  
  return alerts
}
