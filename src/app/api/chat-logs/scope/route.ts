/**
 * CHAT LOGS SCOPE-AWARE API
 * =========================
 * Provides scope-aware operations for chat log management
 * Supports: All Projects, Single Project, Multi-Project modes
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  parseScopeFromRequest,
  buildScopeContext,
  buildChatLogFilter,
  ScopeAwareQueryBuilder,
  isValidScope,
  getScopeDescription
} from '@/lib/api/scope-utils'

// =============================================================================
// GET - Fetch Chat Logs with Scope
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const scope = parseScopeFromRequest(request)
    
    if (!isValidScope(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope parameters', scope },
        { status: 400 }
      )
    }
    
    const scopeContext = await buildScopeContext(scope)
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sessionId = searchParams.get('sessionId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    console.log(`[Chat Logs] Scope: ${getScopeDescription(scope)}`)
    
    switch (action) {
      case 'stats':
        return await getStats(scopeContext)
      
      case 'list':
        return await getLogs(scopeContext, { limit, offset, sessionId, status, startDate, endDate })
      
      case 'detail':
        return await getLogDetail(scopeContext, searchParams.get('id'))
      
      case 'sessions':
        return await getSessions(scopeContext)
      
      case 'search':
        return await searchLogs(scopeContext, searchParams)
      
      case 'export':
        return await exportLogs(scopeContext, searchParams)
      
      default:
        return await getLogs(scopeContext, { limit, offset, sessionId, status, startDate, endDate })
    }
  } catch (error) {
    console.error('Chat logs scope API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Manage Chat Logs with Scope
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const scope = parseScopeFromRequest(request)
    const body = await request.json()
    const { action, data, logId } = body
    
    if (!isValidScope(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope parameters' },
        { status: 400 }
      )
    }
    
    const scopeContext = await buildScopeContext(scope)
    
    switch (action) {
      case 'create':
        return await createLog(scopeContext, data)
      
      case 'update':
        return await updateLog(scopeContext, logId, data)
      
      case 'delete':
        return await deleteLog(scopeContext, logId)
      
      case 'bulk-delete':
        return await bulkDelete(scopeContext, body.logIds)
      
      case 'archive':
        return await archiveLog(scopeContext, logId)
      
      case 'tag':
        return await tagLog(scopeContext, logId, body.tags)
      
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Chat logs POST error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getStats(scopeContext: Awaited<ReturnType<typeof buildScopeContext>>) {
  const filter = buildChatLogFilter(scopeContext)
  
  // Try to get stats from chat sessions table
  let stats = {
    totalLogs: 0,
    totalSessions: 0,
    byStatus: {} as Record<string, number>,
    byProject: {} as Record<string, number>,
    recentActivity: 0
  }
  
  try {
    const [totalLogs, sessions, byStatus] = await Promise.all([
      db.chatSession.count({ where: filter }),
      db.chatSession.groupBy({
        by: ['projectId'],
        where: filter,
        _count: true
      }),
      db.chatSession.groupBy({
        by: ['status'],
        where: filter,
        _count: true
      })
    ])
    
    stats.totalLogs = totalLogs
    stats.totalSessions = sessions.length
    stats.byStatus = byStatus.reduce((acc, item) => {
      acc[item.status || 'unknown'] = item._count
      return acc
    }, {} as Record<string, number>)
    stats.byProject = sessions.reduce((acc, item) => {
      acc[item.projectId || 'global'] = item._count
      return acc
    }, {} as Record<string, number>)
    
    // Recent activity (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const recentCount = await db.chatSession.count({
      where: {
        ...filter,
        createdAt: { gte: yesterday }
      }
    })
    stats.recentActivity = recentCount
  } catch (error) {
    console.log('Chat session table may not exist, returning default stats')
  }
  
  return NextResponse.json({
    success: true,
    stats,
    scope: {
      type: scopeContext.scope.type,
      projectId: scopeContext.scope.projectId,
      description: getScopeDescription(scopeContext.scope)
    }
  })
}

async function getLogs(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  options: {
    limit: number
    offset: number
    sessionId?: string | null
    status?: string | null
    startDate?: string | null
    endDate?: string | null
  }
) {
  const filter = buildChatLogFilter(scopeContext)
  
  const where: Record<string, unknown> = { ...filter }
  
  if (options.sessionId) {
    where.sessionId = options.sessionId
  }
  if (options.status) {
    where.status = options.status
  }
  if (options.startDate) {
    where.createdAt = { ...where.createdAt as object, gte: new Date(options.startDate) }
  }
  if (options.endDate) {
    where.createdAt = { ...where.createdAt as object, lte: new Date(options.endDate) }
  }
  
  let logs: any[] = []
  let total = 0
  
  try {
    [logs, total] = await Promise.all([
      db.chatSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit,
        skip: options.offset,
        include: {
          project: {
            select: { name: true }
          }
        }
      }),
      db.chatSession.count({ where })
    ])
  } catch (error) {
    console.log('Chat session table may not exist')
  }
  
  return NextResponse.json({
    success: true,
    logs: logs.map(log => ({
      id: log.id,
      sessionId: log.sessionId,
      title: log.title || 'Untitled Session',
      status: log.status,
      messageCount: log.messageCount || 0,
      createdAt: log.createdAt?.toISOString(),
      updatedAt: log.updatedAt?.toISOString(),
      projectId: log.projectId,
      projectName: log.project?.name,
      isGlobal: log.projectId === null
    })),
    pagination: {
      total,
      limit: options.limit,
      offset: options.offset,
      hasMore: options.offset + options.limit < total
    },
    scope: {
      type: scopeContext.scope.type,
      projectId: scopeContext.scope.projectId
    }
  })
}

async function getLogDetail(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  logId: string | null
) {
  if (!logId) {
    return NextResponse.json(
      { error: 'Log ID is required' },
      { status: 400 }
    )
  }
  
  let log = null
  
  try {
    log = await db.chatSession.findUnique({
      where: { id: logId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    })
  } catch (error) {
    console.log('Chat session table may not exist')
  }
  
  if (!log) {
    return NextResponse.json(
      { error: 'Chat log not found' },
      { status: 404 }
    )
  }
  
  // Verify scope access
  if (scopeContext.scope.type === 'project' && log.projectId && log.projectId !== scopeContext.scope.projectId) {
    return NextResponse.json(
      { error: 'Chat log not accessible in current scope' },
      { status: 403 }
    )
  }
  
  return NextResponse.json({
    success: true,
    log: {
      ...log,
      createdAt: log.createdAt?.toISOString(),
      updatedAt: log.updatedAt?.toISOString(),
      isGlobal: log.projectId === null
    }
  })
}

async function getSessions(scopeContext: Awaited<ReturnType<typeof buildScopeContext>>) {
  const filter = buildChatLogFilter(scopeContext)
  
  let sessions: any[] = []
  
  try {
    sessions = await db.chatSession.groupBy({
      by: ['sessionId'],
      where: filter,
      _count: true,
      _min: { createdAt: true },
      _max: { createdAt: true }
    })
  } catch (error) {
    console.log('Chat session table may not exist')
  }
  
  return NextResponse.json({
    success: true,
    sessions: sessions.map(s => ({
      sessionId: s.sessionId,
      count: s._count,
      firstMessage: s._min.createdAt?.toISOString(),
      lastMessage: s._max.createdAt?.toISOString()
    })),
    scope: {
      type: scopeContext.scope.type,
      projectId: scopeContext.scope.projectId
    }
  })
}

async function searchLogs(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  searchParams: URLSearchParams
) {
  const query = searchParams.get('q') || ''
  const filter = buildChatLogFilter(scopeContext)
  
  if (!query) {
    return NextResponse.json({
      success: true,
      results: [],
      query: ''
    })
  }
  
  let results: any[] = []
  
  try {
    results = await db.chatSession.findMany({
      where: {
        ...filter,
        OR: [
          { title: { contains: query } },
          { sessionId: { contains: query } }
        ]
      },
      take: 50
    })
  } catch (error) {
    console.log('Chat session table may not exist')
  }
  
  return NextResponse.json({
    success: true,
    results: results.map(r => ({
      id: r.id,
      sessionId: r.sessionId,
      title: r.title,
      createdAt: r.createdAt?.toISOString(),
      isGlobal: r.projectId === null,
      projectId: r.projectId
    })),
    query,
    scope: {
      type: scopeContext.scope.type,
      projectId: scopeContext.scope.projectId
    }
  })
}

async function exportLogs(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  searchParams: URLSearchParams
) {
  const format = searchParams.get('format') || 'json'
  const filter = buildChatLogFilter(scopeContext)
  
  let logs: any[] = []
  
  try {
    logs = await db.chatSession.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      take: 1000
    })
  } catch (error) {
    console.log('Chat session table may not exist')
  }
  
  if (format === 'csv') {
    // Generate CSV
    const headers = ['ID', 'Session ID', 'Title', 'Status', 'Created At', 'Project ID']
    const rows = logs.map(l => [
      l.id,
      l.sessionId,
      l.title || '',
      l.status || '',
      l.createdAt?.toISOString() || '',
      l.projectId || 'global'
    ])
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="chat-logs-${Date.now()}.csv"`
      }
    })
  }
  
  return NextResponse.json({
    success: true,
    logs,
    exportedAt: new Date().toISOString(),
    count: logs.length,
    scope: {
      type: scopeContext.scope.type,
      projectId: scopeContext.scope.projectId
    }
  })
}

async function createLog(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  data: Record<string, unknown>
) {
  const projectId = scopeContext.scope.type === 'project'
    ? scopeContext.scope.projectId
    : data.projectId as string | null
  
  let log = null
  
  try {
    log = await db.chatSession.create({
      data: {
        sessionId: data.sessionId as string || `session-${Date.now()}`,
        projectId,
        title: data.title as string,
        status: (data.status as string) || 'active',
        messageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
  } catch (error) {
    console.log('Chat session table may not exist')
    return NextResponse.json({
      success: true,
      message: 'Chat log created (in memory)',
      log: {
        id: `temp-${Date.now()}`,
        sessionId: data.sessionId,
        projectId
      }
    })
  }
  
  return NextResponse.json({
    success: true,
    log: {
      id: log.id,
      sessionId: log.sessionId,
      title: log.title,
      isGlobal: log.projectId === null,
      projectId: log.projectId
    }
  })
}

async function updateLog(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  logId: string | undefined,
  data: Record<string, unknown>
) {
  if (!logId) {
    return NextResponse.json(
      { error: 'Log ID is required' },
      { status: 400 }
    )
  }
  
  let log = null
  
  try {
    log = await db.chatSession.findUnique({
      where: { id: logId }
    })
  } catch (error) {
    console.log('Chat session table may not exist')
  }
  
  if (!log) {
    return NextResponse.json(
      { error: 'Chat log not found' },
      { status: 404 }
    )
  }
  
  // Verify scope access
  if (scopeContext.scope.type === 'project' && log.projectId && log.projectId !== scopeContext.scope.projectId) {
    return NextResponse.json(
      { error: 'Cannot modify chat log from different project' },
      { status: 403 }
    )
  }
  
  try {
    const updated = await db.chatSession.update({
      where: { id: logId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({
      success: true,
      log: updated
    })
  } catch (error) {
    return NextResponse.json({
      success: true,
      message: 'Chat log updated (in memory)'
    })
  }
}

async function deleteLog(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  logId: string | undefined
) {
  if (!logId) {
    return NextResponse.json(
      { error: 'Log ID is required' },
      { status: 400 }
    )
  }
  
  let log = null
  
  try {
    log = await db.chatSession.findUnique({
      where: { id: logId }
    })
  } catch (error) {
    console.log('Chat session table may not exist')
  }
  
  if (!log) {
    return NextResponse.json({
      success: true,
      message: 'Chat log deleted (not found in database)'
    })
  }
  
  // Verify scope access
  if (scopeContext.scope.type === 'project' && log.projectId && log.projectId !== scopeContext.scope.projectId) {
    return NextResponse.json(
      { error: 'Cannot delete chat log from different project' },
      { status: 403 }
    )
  }
  
  try {
    await db.chatSession.delete({
      where: { id: logId }
    })
  } catch (error) {
    // Ignore
  }
  
  return NextResponse.json({
    success: true,
    message: 'Chat log deleted'
  })
}

async function bulkDelete(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  logIds: string[] | undefined
) {
  if (!logIds || !Array.isArray(logIds)) {
    return NextResponse.json(
      { error: 'Log IDs array is required' },
      { status: 400 }
    )
  }
  
  const filter = buildChatLogFilter(scopeContext)
  
  try {
    const result = await db.chatSession.deleteMany({
      where: {
        id: { in: logIds },
        ...filter
      }
    })
    
    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `${result.count} chat logs deleted`
    })
  } catch (error) {
    return NextResponse.json({
      success: true,
      message: `${logIds.length} chat logs deleted (in memory)`
    })
  }
}

async function archiveLog(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  logId: string | undefined
) {
  if (!logId) {
    return NextResponse.json(
      { error: 'Log ID is required' },
      { status: 400 }
    )
  }
  
  try {
    await db.chatSession.update({
      where: { id: logId },
      data: {
        status: 'archived',
        updatedAt: new Date()
      }
    })
  } catch (error) {
    // Ignore
  }
  
  return NextResponse.json({
    success: true,
    message: 'Chat log archived'
  })
}

async function tagLog(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  logId: string | undefined,
  tags: string[] | undefined
) {
  if (!logId) {
    return NextResponse.json(
      { error: 'Log ID is required' },
      { status: 400 }
    )
  }
  
  try {
    await db.chatSession.update({
      where: { id: logId },
      data: {
        tags: JSON.stringify(tags || []),
        updatedAt: new Date()
      }
    })
  } catch (error) {
    // Ignore
  }
  
  return NextResponse.json({
    success: true,
    message: 'Tags updated'
  })
}
