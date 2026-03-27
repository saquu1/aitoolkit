/**
 * FAST SYNC - ~50 lines
 * Lightweight alternative to /api/analytics/sync (683 lines)
 * Data Source: ChatLog table
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Helper to safely parse JSON
function safeJsonParse(str: string | null, fallback: any[] = []) {
  if (!str) return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

// GET: Quick database fetch from ChatLog
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')
  const limit = parseInt(searchParams.get('limit') || '100')

  try {
    // Calculate date filter
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const sinceStr = since.toISOString().split('T')[0]

    // Fetch from ChatLog table
    const chatLogs = await db.chatLog.findMany({
      where: {
        sessionDate: { gte: sinceStr }
      },
      orderBy: { sessionDate: 'desc' },
      take: limit
    })

    // Transform to session format
    const sessions = chatLogs.map(log => ({
      id: log.id,
      sessionId: log.sessionId,
      sessionDate: log.sessionDate,
      title: log.title,
      summary: log.summary,
      model: 'unknown',
      category: 'development',
      totalTokens: 0,
      estimatedCost: 0,
      issuesCreated: safeJsonParse(log.issuesSolved).length,
      issuesResolved: safeJsonParse(log.issuesSolved).length,
      featuresImplemented: safeJsonParse(log.featuresAdded).length,
      filesModified: safeJsonParse(log.filesModified).length,
    }))

    // Aggregate issues, features, files
    const issues: any[] = []
    const features: any[] = []
    const files: any[] = []

    for (const log of chatLogs) {
      const logIssues = safeJsonParse(log.issuesSolved)
      const logFeatures = safeJsonParse(log.featuresAdded)
      const logFiles = safeJsonParse(log.filesModified)

      logIssues.forEach((issue: string, idx: number) => {
        issues.push({
          id: `${log.id}-issue-${idx}`,
          title: typeof issue === 'string' ? issue : issue?.title || 'Unknown Issue',
          issueType: typeof issue === 'object' ? issue?.type : 'bug',
          severity: 'medium',
          status: 'resolved',
          sessionId: log.sessionId,
          session: { title: log.title },
          createdAt: log.createdAt
        })
      })

      logFeatures.forEach((feature: string, idx: number) => {
        features.push({
          id: `${log.id}-feature-${idx}`,
          featureName: typeof feature === 'string' ? feature : feature?.name || 'Unknown Feature',
          featureType: typeof feature === 'object' ? feature?.type : 'feature',
          sessionId: log.sessionId,
          session: { title: log.title },
          createdAt: log.createdAt
        })
      })

      logFiles.forEach((file: string, idx: number) => {
        files.push({
          id: `${log.id}-file-${idx}`,
          filepath: typeof file === 'string' ? file : file?.path || 'unknown',
          operation: 'modify',
          sessionId: log.sessionId,
          createdAt: log.createdAt
        })
      })
    }

    // Calculate summary
    const summary = {
      totalSessions: sessions.length,
      totalIssues: issues.length,
      totalFeatures: features.length,
      totalFiles: files.length,
      totalTokens: 0,
      totalCost: 0
    }

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        issues,
        features,
        tools: [],
        files,
        summary
      },
      _meta: { source: 'ChatLog' }
    })
  } catch (error) {
    console.error('Fast sync error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
