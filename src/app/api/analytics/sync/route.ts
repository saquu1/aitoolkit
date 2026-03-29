/**
 * ANALYTICS SYNC API
 * ==================
 * Sync ChatLog data to AISession/AIIssue/AIFeature tables for analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// =============================================================================
// POST /api/analytics/sync - Sync ChatLog to Analytics tables
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'sync-chatlogs':
        return await syncChatLogs()
      case 'sync-single':
        return await syncSingleChatLog(body.chatLogId)
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Analytics sync error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Sync failed'
    }, { status: 500 })
  }
}

// =============================================================================
// GET /api/analytics/sync - Get sync status
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'status'

  try {
    switch (action) {
      case 'status':
        return await getSyncStatus()
      case 'preview':
        return await previewSync()
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Analytics sync error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Sync failed'
    }, { status: 500 })
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

async function getSyncStatus() {
  const chatLogsCount = await db.chatLog.count()
  const sessionsCount = await db.aISession.count()
  const issuesCount = await db.aIIssue.count()
  const featuresCount = await db.aIFeature.count()

  return NextResponse.json({
    success: true,
    status: {
      chatLogs: chatLogsCount,
      sessions: sessionsCount,
      issues: issuesCount,
      features: featuresCount,
      needsSync: chatLogsCount > sessionsCount
    }
  })
}

async function previewSync() {
  // Get ChatLogs that haven't been synced
  const chatLogs = await db.chatLog.findMany({
    orderBy: { sessionDate: 'desc' },
    take: 10
  })

  const existingSessions = await db.aISession.findMany({
    select: { chatId: true }
  })
  const existingChatIds = new Set(existingSessions.map(s => s.chatId))

  const toSync = chatLogs.filter(log => !existingChatIds.has(log.id))

  return NextResponse.json({
    success: true,
    preview: {
      total: chatLogs.length,
      alreadySynced: chatLogs.length - toSync.length,
      toSync: toSync.length,
      samples: toSync.slice(0, 5).map(log => ({
        id: log.id,
        title: log.title,
        sessionDate: log.sessionDate,
        issuesSolved: parseJSON(log.issuesSolved).length,
        featuresAdded: parseJSON(log.featuresAdded).length,
        filesModified: parseJSON(log.filesModified).length
      }))
    }
  })
}

async function syncChatLogs() {
  // Get all ChatLogs
  const chatLogs = await db.chatLog.findMany({
    orderBy: { sessionDate: 'desc' }
  })

  // Get existing sessions
  const existingSessions = await db.aISession.findMany({
    select: { chatId: true }
  })
  const existingChatIds = new Set(existingSessions.map(s => s.chatId))

  let synced = 0
  let skipped = 0
  let errors = 0

  for (const log of chatLogs) {
    if (existingChatIds.has(log.id)) {
      skipped++
      continue
    }

    try {
      await convertChatLogToAnalytics(log)
      synced++
    } catch (error) {
      console.error(`Failed to sync ${log.id}:`, error)
      errors++
    }
  }

  return NextResponse.json({
    success: true,
    result: {
      total: chatLogs.length,
      synced,
      skipped,
      errors
    }
  })
}

async function syncSingleChatLog(chatLogId: string) {
  const log = await db.chatLog.findUnique({
    where: { id: chatLogId }
  })

  if (!log) {
    return NextResponse.json({ error: 'ChatLog not found' }, { status: 404 })
  }

  const result = await convertChatLogToAnalytics(log)

  return NextResponse.json({
    success: true,
    result
  })
}

// =============================================================================
// CONVERSION LOGIC
// =============================================================================

async function convertChatLogToAnalytics(log: any) {
  const issuesSolved = parseJSON(log.issuesSolved)
  const featuresAdded = parseJSON(log.featuresAdded)
  const filesModified = parseJSON(log.filesModified)

  // Estimate tokens based on content
  const contentLength = (log.summary || '').length +
    JSON.stringify(issuesSolved).length +
    JSON.stringify(featuresAdded).length
  const estimatedTokens = Math.ceil(contentLength / 4) + filesModified.length * 100

  // Estimate cost (using average pricing)
  const estimatedCost = estimatedTokens * 0.000005

  // Determine category
  const category = determineCategory(log.title, log.summary)
  const model = 'unknown'

  // Create session
  const sessionDate = new Date(log.sessionDate)
  const session = await db.aISession.create({
    data: {
      chatId: log.id,
      sessionDate,
      startTime: sessionDate,
      endTime: sessionDate,
      duration: estimateDuration(filesModified.length, issuesSolved.length),
      inputTokens: Math.ceil(estimatedTokens * 0.3),
      outputTokens: Math.ceil(estimatedTokens * 0.7),
      totalTokens: estimatedTokens,
      estimatedCost,
      model,
      category,
      tags: JSON.stringify(extractTags(log.title, log.summary, filesModified)),
      filesModified: filesModified.length,
      filesCreated: 0,
      featuresImplemented: featuresAdded.length,
      issuesResolved: issuesSolved.length,
      issuesCreated: issuesSolved.length,
      title: log.title || 'Development Session',
      summary: log.summary || '',
      status: 'completed'
    }
  })

  // Create issues
  for (const issue of issuesSolved) {
    if (typeof issue === 'string' && issue.trim()) {
      await db.aIIssue.create({
        data: {
          sessionId: session.id,
          issueType: determineIssueType(issue),
          severity: 'medium',
          title: issue.slice(0, 100),
          description: issue,
          status: 'resolved',
          resolvedBy: 'ai',
          resolvedAt: sessionDate
        }
      })
    }
  }

  // Create features
  for (const feature of featuresAdded) {
    if (typeof feature === 'string' && feature.trim()) {
      await db.aIFeature.create({
        data: {
          sessionId: session.id,
          featureName: extractFeatureName(feature),
          featureType: determineFeatureType(feature),
          description: feature,
          filesCreated: '[]',
          filesModified: '[]',
          linesAdded: 0,
          linesDeleted: 0
        }
      })
    }
  }

  // Create cost record
  await db.aICostRecord.create({
    data: {
      sessionId: session.id,
      date: sessionDate,
      inputTokens: Math.ceil(estimatedTokens * 0.3),
      outputTokens: Math.ceil(estimatedTokens * 0.7),
      totalCost: estimatedCost,
      model,
      linesOfCodeGenerated: filesModified.length * 50,
      featuresImplemented: featuresAdded.length,
      issuesResolved: issuesSolved.length
    }
  })

  return {
    sessionId: session.id,
    issuesCreated: issuesSolved.filter((i: any) => typeof i === 'string').length,
    featuresCreated: featuresAdded.filter((f: any) => typeof f === 'string').length
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function parseJSON(str: string | null): any[] {
  if (!str) return []
  try {
    const parsed = JSON.parse(str)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function determineCategory(title: string, summary: string): string {
  const content = (title + ' ' + summary).toLowerCase()

  if (content.includes('fix') || content.includes('bug') || content.includes('error')) {
    return 'debugging'
  }
  if (content.includes('implement') || content.includes('add') || content.includes('create')) {
    return 'feature'
  }
  if (content.includes('refactor') || content.includes('clean') || content.includes('improve')) {
    return 'refactor'
  }
  if (content.includes('test')) {
    return 'test'
  }
  if (content.includes('doc')) {
    return 'documentation'
  }

  return 'development'
}

function determineIssueType(issue: string): string {
  const lower = issue.toLowerCase()

  if (lower.includes('type') || lower.includes('typescript')) return 'typescript'
  if (lower.includes('auth') || lower.includes('unauthorized')) return 'auth'
  if (lower.includes('database') || lower.includes('sql') || lower.includes('prisma')) return 'database'
  if (lower.includes('api') || lower.includes('fetch')) return 'api'
  if (lower.includes('build') || lower.includes('compile')) return 'build'

  return 'runtime'
}

function determineFeatureType(feature: string): string {
  const lower = feature.toLowerCase()

  if (lower.includes('component') || lower.includes('ui')) return 'component'
  if (lower.includes('api') || lower.includes('route')) return 'api'
  if (lower.includes('page')) return 'page'
  if (lower.includes('hook')) return 'hook'
  if (lower.includes('websocket') || lower.includes('socket')) return 'realtime'
  if (lower.includes('test')) return 'test'

  return 'feature'
}

function extractFeatureName(feature: string): string {
  // Clean up feature string
  const cleaned = feature
    .replace(/^[-\s]+/, '')
    .replace(/\n.*/g, '')
    .slice(0, 50)

  return cleaned || 'Unknown Feature'
}

function extractTags(title: string, summary: string, files: string[]): string[] {
  const tags: Set<string> = new Set()
  const content = (title + ' ' + summary + ' ' + files.join(' ')).toLowerCase()

  if (content.includes('typescript') || content.includes('.ts')) tags.add('typescript')
  if (content.includes('react') || content.includes('.tsx')) tags.add('react')
  if (content.includes('next')) tags.add('nextjs')
  if (content.includes('prisma')) tags.add('prisma')
  if (content.includes('api')) tags.add('api')
  if (content.includes('websocket')) tags.add('websocket')
  if (content.includes('auth')) tags.add('authentication')
  if (content.includes('database') || content.includes('sql')) tags.add('database')

  return Array.from(tags)
}

function estimateDuration(files: number, issues: number): number {
  // Rough estimate: 5 min per file + 10 min per issue
  return Math.max(5, files * 5 + issues * 10)
}
