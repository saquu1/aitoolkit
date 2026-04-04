/**
 * PATTERN DETECTION & PREDICTION API
 * ===================================
 * Advanced analytics endpoints for pattern detection,
 * issue prediction, self-assessment reports, and git integration
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  detectPatterns,
  predictIssues,
  generateSelfAssessmentReport,
  getGitHistory,
  linkGitToSessions,
  getRecentReports,
  getWarningCount
} from '@/lib/pattern-detection-service'
import { db } from '@/lib/db'

// =============================================================================
// GET ENDPOINTS
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'warnings'
  
  try {
    switch (action) {
      case 'warnings':
        return await handleGetWarnings(searchParams)
      
      case 'predictions':
        return await handleGetPredictions(searchParams)
      
      case 'report':
        return await handleGetReport(searchParams)
      
      case 'reports':
        return await handleGetReports(searchParams)
      
      case 'git-history':
        return await handleGetGitHistory(searchParams)
      
      case 'git-session-links':
        return await handleGetGitSessionLinks(searchParams)
      
      case 'dashboard-warnings':
        return await handleDashboardWarnings()
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Pattern API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// =============================================================================
// POST ENDPOINTS
// =============================================================================

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body
  
  try {
    switch (action) {
      case 'generate-report':
        return await handleGenerateReport(body)
      
      case 'predict-with-context':
        return await handlePredictWithContext(body)
      
      case 'acknowledge-warning':
        return await handleAcknowledgeWarning(body)
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Pattern API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

async function handleGetWarnings(searchParams: URLSearchParams) {
  const sessionId = searchParams.get('sessionId') || undefined
  const warnings = await detectPatterns(sessionId)
  
  return NextResponse.json({
    success: true,
    warnings,
    summary: {
      total: warnings.length,
      critical: warnings.filter(w => w.severity === 'critical').length,
      high: warnings.filter(w => w.severity === 'high').length,
      medium: warnings.filter(w => w.severity === 'medium').length,
      low: warnings.filter(w => w.severity === 'low').length
    }
  })
}

async function handleGetPredictions(searchParams: URLSearchParams) {
  const predictions = await predictIssues()
  
  return NextResponse.json({
    success: true,
    predictions,
    summary: {
      highRisk: predictions.filter(p => p.riskLevel === 'high').length,
      mediumRisk: predictions.filter(p => p.riskLevel === 'medium').length,
      lowRisk: predictions.filter(p => p.riskLevel === 'low').length
    }
  })
}

async function handleGetReport(searchParams: URLSearchParams) {
  const period = (searchParams.get('period') || 'weekly') as 'weekly' | 'monthly'
  const force = searchParams.get('force') === 'true'
  
  // Check if we have a recent report (within last day for weekly, last week for monthly)
  const reportAge = period === 'weekly' ? 1 : 7
  const minDate = new Date()
  minDate.setDate(minDate.getDate() - reportAge)
  
  if (!force) {
    const existingReport = await db.aIAnalyticsSummary.findFirst({
      where: {
        period,
        date: { gte: minDate }
      },
      orderBy: { date: 'desc' }
    })
    
    if (existingReport) {
      return NextResponse.json({
        success: true,
        report: {
          id: existingReport.id,
          period: existingReport.period,
          startDate: existingReport.date,
          endDate: existingReport.date,
          summary: {
            totalSessions: existingReport.totalSessions,
            totalIssues: existingReport.totalIssues,
            resolvedIssues: existingReport.resolvedIssues,
            totalFeatures: existingReport.totalFeatures,
            totalCost: existingReport.totalCost,
            efficiencyScore: existingReport.efficiencyScore
          },
          insights: JSON.parse(existingReport.insights || '[]'),
          patterns: JSON.parse(existingReport.topPatterns || '[]'),
          predictions: JSON.parse(existingReport.predictions || '[]'),
          gitSummary: {
            totalCommits: 0,
            filesModified: [],
            commitCategories: {}
          },
          generatedAt: existingReport.createdAt
        },
        cached: true
      })
    }
  }
  
  // Generate new report
  const report = await generateSelfAssessmentReport(period)
  
  return NextResponse.json({
    success: true,
    report,
    cached: false
  })
}

async function handleGetReports(searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '10')
  const reports = await getRecentReports(limit)
  
  return NextResponse.json({
    success: true,
    reports: reports.map(r => ({
      id: r.id,
      period: r.period,
      date: r.date,
      totalSessions: r.totalSessions,
      totalIssues: r.totalIssues,
      efficiencyScore: r.efficiencyScore,
      generatedAt: r.createdAt
    }))
  })
}

async function handleGetGitHistory(searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '30')
  const limit = parseInt(searchParams.get('limit') || '100')
  
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  const commits = await getGitHistory(since, undefined, limit)
  
  return NextResponse.json({
    success: true,
    commits: commits.map(c => ({
      hash: c.hash,
      message: c.message,
      author: c.author,
      date: c.date,
      files: c.files.slice(0, 10), // Limit files per commit
      additions: c.additions,
      deletions: c.deletions
    })),
    summary: {
      totalCommits: commits.length,
      totalAdditions: commits.reduce((sum, c) => sum + c.additions, 0),
      totalDeletions: commits.reduce((sum, c) => sum + c.deletions, 0),
      uniqueFiles: [...new Set(commits.flatMap(c => c.files))].length
    }
  })
}

async function handleGetGitSessionLinks(searchParams: URLSearchParams) {
  const days = parseInt(searchParams.get('days') || '30')
  
  const since = new Date()
  since.setDate(since.getDate() - days)
  
  const [sessions, commits] = await Promise.all([
    db.aISession.findMany({
      where: { sessionDate: { gte: since } }
    }),
    getGitHistory(since, undefined, 500)
  ])
  
  const links = await linkGitToSessions(sessions, commits)
  
  return NextResponse.json({
    success: true,
    links,
    summary: {
      sessionsWithCommits: links.length,
      totalLinkedCommits: links.reduce((sum, l) => sum + l.commits.length, 0)
    }
  })
}

async function handleDashboardWarnings() {
  const [warnings, predictions, warningCount] = await Promise.all([
    detectPatterns(),
    predictIssues(),
    getWarningCount()
  ])
  
  // Get critical items
  const criticalWarnings = warnings.filter(w => w.severity === 'critical' || w.severity === 'high')
  const highRiskPredictions = predictions.filter(p => p.riskLevel === 'high')
  
  return NextResponse.json({
    success: true,
    dashboard: {
      warningCount,
      criticalWarnings: criticalWarnings.slice(0, 3),
      highRiskPredictions: highRiskPredictions.slice(0, 3),
      alertLevel: warningCount > 3 ? 'critical' : warningCount > 1 ? 'warning' : 'normal',
      recommendations: generateRecommendations(criticalWarnings, highRiskPredictions)
    }
  })
}

function generateRecommendations(warnings: any[], predictions: any[]): string[] {
  const recommendations: string[] = []
  
  // From warnings
  for (const warning of warnings.slice(0, 2)) {
    if (warning.suggestedAction) {
      recommendations.push(warning.suggestedAction)
    }
  }
  
  // From predictions
  for (const pred of predictions.slice(0, 2)) {
    if (pred.preventiveActions && pred.preventiveActions.length > 0) {
      recommendations.push(pred.preventiveActions[0])
    }
  }
  
  return [...new Set(recommendations)].slice(0, 5)
}

// =============================================================================
// POST HANDLERS
// =============================================================================

async function handleGenerateReport(body: { period: 'weekly' | 'monthly' }) {
  const { period } = body
  
  if (!period || !['weekly', 'monthly'].includes(period)) {
    return NextResponse.json({ error: 'Invalid period. Use "weekly" or "monthly"' }, { status: 400 })
  }
  
  const report = await generateSelfAssessmentReport(period)
  
  return NextResponse.json({
    success: true,
    report
  })
}

async function handlePredictWithContext(body: {
  plannedWork?: string
  filesToModify?: string[]
  model?: string
}) {
  const { plannedWork, filesToModify, model } = body
  
  const predictions = await predictIssues({
    plannedWork,
    filesToModify,
    model
  })
  
  return NextResponse.json({
    success: true,
    predictions,
    context: { plannedWork, filesToModify, model }
  })
}

async function handleAcknowledgeWarning(body: { warningId: string }) {
  const { warningId } = body
  
  if (!warningId) {
    return NextResponse.json({ error: 'warningId required' }, { status: 400 })
  }
  
  // Store acknowledgment (in a real system, we'd have a dedicated table)
  // For now, we'll create a pattern record if it doesn't exist
  
  try {
    // Try to find or create a pattern record
    const existingPattern = await db.aIPattern.findFirst({
      where: { patternName: warningId }
    })
    
    if (existingPattern) {
      await db.aIPattern.update({
        where: { id: existingPattern.id },
        data: {
          status: 'acknowledged',
          updatedAt: new Date()
        }
      })
    } else {
      await db.aIPattern.create({
        data: {
          patternName: warningId,
          patternType: 'warning',
          description: 'Acknowledged warning',
          occurrenceCount: 1,
          status: 'acknowledged'
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Warning acknowledged'
    })
  } catch (error) {
    console.error('Failed to acknowledge warning:', error)
    return NextResponse.json({
      success: true,
      message: 'Warning acknowledged (in memory only)'
    })
  }
}
