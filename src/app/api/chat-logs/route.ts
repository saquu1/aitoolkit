/**
 * CHAT LOG API ROUTE
 * ==================
 * Memory-optimized with pagination support
 * 
 * Features:
 * - Cursor-based pagination for infinite scroll
 * - Offset-based pagination for traditional navigation
 * - Summary-only mode for lightweight listings
 * - Stores and retrieves chat session logs in SQLite database
 * - Syncs to AISession for analytics
 * - Saves raw data with full traceability chain
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'
import { extractAnalyticsFromBatchResponse } from '@/lib/analytics-extraction-service'
import { saveRawDataWithTraceability } from '@/lib/raw-data-service'
import {
  getPaginationParams,
  apiSuccess,
  apiError,
} from '@/lib/api/paginated-response'

const prisma = new PrismaClient()

// Generate unique ID
function generateId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// =============================================================================
// GET - Retrieve logs with PAGINATION (Memory Optimized)
// =============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const source = searchParams.get('source')
    const summaryOnly = searchParams.get('summary') === 'true'
    const logId = searchParams.get('id')
    
    // NEW: Pagination parameters
    const paginated = searchParams.get('paginated') === 'true'

    // Get single log by ID (for lazy loading)
    if (logId) {
      const log = await prisma.chatLog.findUnique({
        where: { id: logId }
      })
      
      if (!log) {
        return NextResponse.json({
          success: false,
          error: 'Log not found'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: true,
        log: {
          id: log.id,
          sessionId: log.sessionId,
          timestamp: log.importedAt.toISOString(),
          sessionDate: log.sessionDate,
          title: log.title,
          summary: log.summary,
          issuesSolved: JSON.parse(log.issuesSolved),
          featuresAdded: JSON.parse(log.featuresAdded),
          filesModified: JSON.parse(log.filesModified),
          commits: JSON.parse(log.commits),
          notes: log.notes,
          source: log.source
        }
      })
    }

    // Build where clause
    const where: any = {}
    if (dateFrom || dateTo) {
      where.sessionDate = {}
      if (dateFrom) where.sessionDate.gte = dateFrom
      if (dateTo) where.sessionDate.lte = dateTo
    }
    if (source) {
      where.source = source
    }

    // PAGINATED LIST - Memory efficient for large datasets
    if (paginated) {
      const params = getPaginationParams(request)
      const searchFilter = searchParams.get('search')
      
      // Add search filter
      if (searchFilter) {
        where.OR = [
          { title: { contains: searchFilter, mode: 'insensitive' } },
          { summary: { contains: searchFilter, mode: 'insensitive' } },
        ]
      }
      
      // Summary-only mode for lightweight listings
      const select = summaryOnly ? {
        id: true,
        sessionId: true,
        sessionDate: true,
        title: true,
        source: true,
        importedAt: true,
        // Get counts only, not full arrays
        issuesSolved: true,
        featuresAdded: true,
      } : undefined
      
      // Get total count
      const totalCount = await prisma.chatLog.count({ where })
      
      // Cursor-based pagination
      if (params.mode === 'cursor') {
        const take = params.limit + 1
        
        const logs = await prisma.chatLog.findMany({
          where,
          select,
          take,
          skip: params.cursor ? 1 : 0,
          cursor: params.cursor ? { id: Buffer.from(params.cursor, 'base64url').toString('utf-8') } : undefined,
          orderBy: { sessionDate: 'desc' },
        })
        
        const hasMore = logs.length > params.limit
        const data = hasMore ? logs.slice(0, -1) : logs
        const nextCursor = hasMore && data.length > 0
          ? Buffer.from(data[data.length - 1].id).toString('base64url')
          : null
        
        // Format data
        const formattedData = summaryOnly 
          ? data.map(log => ({
              id: log.id,
              sessionId: log.sessionId,
              timestamp: log.importedAt.toISOString(),
              sessionDate: log.sessionDate,
              title: log.title,
              source: log.source,
              issuesCount: JSON.parse(log.issuesSolved).length,
              featuresCount: JSON.parse(log.featuresAdded).length,
            }))
          : data.map(log => ({
              id: log.id,
              sessionId: log.sessionId,
              timestamp: log.importedAt.toISOString(),
              sessionDate: log.sessionDate,
              title: log.title,
              summary: log.summary,
              issuesSolved: JSON.parse(log.issuesSolved),
              featuresAdded: JSON.parse(log.featuresAdded),
              filesModified: JSON.parse(log.filesModified || '[]'),
              commits: JSON.parse(log.commits || '[]'),
              notes: log.notes,
              source: log.source
            }))
        
        return apiSuccess(formattedData, {
          pagination: {
            hasMore,
            hasPrevious: !!params.cursor,
            nextCursor,
            previousCursor: null,
            pageSize: params.limit,
          },
          meta: { totalCount, summaryOnly },
        })
      }
      
      // Offset pagination
      const logs = await prisma.chatLog.findMany({
        where,
        select,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: { sessionDate: 'desc' },
      })
      
      const totalPages = Math.ceil(totalCount / params.pageSize)
      
      // Format data
      const formattedLogs = summaryOnly 
        ? logs.map(log => ({
            id: log.id,
            sessionId: log.sessionId,
            timestamp: log.importedAt.toISOString(),
            sessionDate: log.sessionDate,
            title: log.title,
            source: log.source,
            issuesCount: JSON.parse(log.issuesSolved).length,
            featuresCount: JSON.parse(log.featuresAdded).length,
          }))
        : logs.map(log => ({
            id: log.id,
            sessionId: log.sessionId,
            timestamp: log.importedAt.toISOString(),
            sessionDate: log.sessionDate,
            title: log.title,
            summary: log.summary,
            issuesSolved: JSON.parse(log.issuesSolved),
            featuresAdded: JSON.parse(log.featuresAdded),
            filesModified: JSON.parse(log.filesModified || '[]'),
            commits: JSON.parse(log.commits || '[]'),
            notes: log.notes,
            source: log.source
          }))
      
      return apiSuccess(formattedLogs, {
        pagination: {
          hasMore: params.page < totalPages,
          hasPrevious: params.page > 1,
          nextCursor: null,
          previousCursor: null,
          totalCount,
          page: params.page,
          pageSize: params.pageSize,
          totalPages,
        },
        meta: { summaryOnly },
      })
    }

    // LEGACY: Summary-only mode for fast loading (backward compatible)
    if (summaryOnly) {
      const limit = parseInt(searchParams.get('limit') || '100')
      const logs = await prisma.chatLog.findMany({
        where,
        select: {
          id: true,
          sessionId: true,
          sessionDate: true,
          title: true,
          source: true,
          importedAt: true,
          issuesSolved: true,
          featuresAdded: true,
        },
        orderBy: { sessionDate: 'desc' },
        take: limit
      })

      const summaries = logs.map(log => ({
        id: log.id,
        sessionId: log.sessionId,
        timestamp: log.importedAt.toISOString(),
        sessionDate: log.sessionDate,
        title: log.title,
        source: log.source,
        issuesCount: JSON.parse(log.issuesSolved).length,
        featuresCount: JSON.parse(log.featuresAdded).length,
      }))

      return NextResponse.json({
        success: true,
        logs: summaries,
        source: 'database',
        total: summaries.length,
        summaryOnly: true
      })
    }

    // LEGACY: Full mode (default) - return all data with limit
    const limit = parseInt(searchParams.get('limit') || '100')
    const logs = await prisma.chatLog.findMany({
      where,
      orderBy: { sessionDate: 'desc' },
      take: limit
    })

    const parsedLogs = logs.map(log => ({
      id: log.id,
      sessionId: log.sessionId,
      timestamp: log.importedAt.toISOString(),
      sessionDate: log.sessionDate,
      title: log.title,
      summary: log.summary,
      issuesSolved: JSON.parse(log.issuesSolved),
      featuresAdded: JSON.parse(log.featuresAdded),
      filesModified: JSON.parse(log.filesModified),
      commits: JSON.parse(log.commits),
      notes: log.notes,
      source: log.source
    }))

    return NextResponse.json({
      success: true,
      logs: parsedLogs,
      source: 'database',
      total: parsedLogs.length
    })
  } catch (error) {
    console.error('Error fetching chat logs:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs: [],
      source: 'error'
    }, { status: 500 })
  }
}

// POST - Create or update a log (single log or import batch)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a batch import
    if (Array.isArray(body.logs)) {
      return await handleBatchImport(body.logs, body.source || 'import', body.rawJson, body.linkToRawId)
    }

    // Single log creation/update
    const {
      id,
      sessionId,
      sessionDate,
      title,
      summary,
      issuesSolved = [],
      featuresAdded = [],
      filesModified = [],
      commits = [],
      notes = '',
      source = 'manual'
    } = body

    const logId = id || generateId()
    const logSessionId = sessionId || logId

    // Check for existing log by sessionId (primary) or id
    const existingLog = await prisma.chatLog.findFirst({
      where: { 
        OR: [
          { id: logId }, 
          { sessionId: logSessionId }
        ] 
      }
    })

    const logData = {
      id: existingLog?.id || logId,  // Use existing ID if found
      sessionId: logSessionId,
      sessionDate: sessionDate || new Date().toISOString().split('T')[0],
      title: title || 'Chat Session',
      summary: summary || '',
      issuesSolved: JSON.stringify(issuesSolved),
      featuresAdded: JSON.stringify(featuresAdded),
      filesModified: JSON.stringify(filesModified),
      commits: JSON.stringify(commits),
      notes: notes || '',
      source,
      updatedAt: new Date()
    }

    let log
    if (existingLog) {
      // Update existing log
      log = await prisma.chatLog.update({
        where: { id: existingLog.id },
        data: logData
      })
      console.log(`[ChatLog API] Updated existing log: ${existingLog.id}`)
    } else {
      // Create new log
      log = await prisma.chatLog.create({
        data: logData as any
      })
      console.log(`[ChatLog API] Created new log: ${logId}`)
    }

    return NextResponse.json({
      success: true,
      log: {
        id: log.id,
        sessionId: log.sessionId,
        timestamp: log.importedAt.toISOString(),
        sessionDate: log.sessionDate,
        title: log.title,
        summary: log.summary,
        issuesSolved: JSON.parse(log.issuesSolved),
        featuresAdded: JSON.parse(log.featuresAdded),
        filesModified: JSON.parse(log.filesModified),
        commits: JSON.parse(log.commits),
        notes: log.notes,
        source: log.source
      }
    })

  } catch (error) {
    console.error('Error saving chat log:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Handle batch import of logs - saves raw data with full traceability
// IMPORTANT: If linkToRawId is provided, we link to existing RawImportData instead of creating new one
async function handleBatchImport(logs: any[], source: string, rawJson?: string, linkToRawId?: string) {
  try {
    const results = {
      imported: 0,
      skipped: 0,
      updated: 0,
      analyticsCreated: 0,
      rawDataSaved: 0,
      linkedToExisting: 0,
      errors: [] as string[]
    }

    // If linkToRawId is provided, verify it exists and update its status
    let existingRawData: any = null
    if (linkToRawId) {
      existingRawData = await prisma.rawImportData.findUnique({
        where: { id: linkToRawId }
      })
      
      if (existingRawData) {
        console.log(`[ChatLog API] Linking to existing RawImportData: ${linkToRawId}`)
        // Update parse status to parsed
        await prisma.rawImportData.update({
          where: { id: linkToRawId },
          data: {
            parseStatus: 'parsed',
            parsedAt: new Date()
          }
        })
      } else {
        console.log(`[ChatLog API] Warning: linkToRawId ${linkToRawId} not found, will create new raw data`)
      }
    }

    for (const log of logs) {
      try {
        const logId = log.id || generateId()
        const logSessionId = log.sessionId || logId

        // Check if already exists by sessionId (for deduplication)
        const existing = await prisma.chatLog.findFirst({
          where: {
            OR: [
              { id: logId },
              { sessionId: logSessionId }
            ]
          }
        })

        // Determine rawDataId to use
        const rawDataIdToUse = existingRawData ? linkToRawId : null

        if (existing) {
          // Update existing log instead of skipping
          const logData: any = {
            sessionDate: log.sessionDate || existing.sessionDate,
            title: log.title || existing.title,
            summary: log.summary || existing.summary,
            issuesSolved: JSON.stringify(log.issuesSolved || []),
            featuresAdded: JSON.stringify(log.featuresAdded || []),
            filesModified: JSON.stringify(log.filesModified || []),
            commits: JSON.stringify(log.commits || []),
            notes: log.notes || existing.notes,
            source: source,
            updatedAt: new Date()
          }
          
          // Link to existing raw data if provided
          if (rawDataIdToUse && !existing.rawDataId) {
            logData.rawDataId = rawDataIdToUse
          }
          
          await prisma.chatLog.update({
            where: { id: existing.id },
            data: logData
          })
          
          results.updated++
          results.linkedToExisting++
          console.log(`[ChatLog API] Updated existing log: ${existing.id} (sessionId: ${logSessionId})`)
          continue
        }

        // NEW LOG: If we have an existing RawImportData to link to, use it directly
        if (existingRawData) {
          // Create ChatLog linked to existing RawImportData
          const chatLog = await prisma.chatLog.create({
            data: {
              id: logId,
              sessionId: logSessionId,
              sessionDate: log.sessionDate || new Date().toISOString().split('T')[0],
              title: log.title || 'Chat Session',
              summary: log.summary || '',
              issuesSolved: JSON.stringify(log.issuesSolved || []),
              featuresAdded: JSON.stringify(log.featuresAdded || []),
              filesModified: JSON.stringify(log.filesModified || []),
              commits: JSON.stringify(log.commits || []),
              notes: log.notes || '',
              source: source,
              rawDataId: linkToRawId,
              updatedAt: new Date()
            }
          })
          
          // Create traceability links for the existing raw data
          await createTraceabilityLinks(linkToRawId!, chatLog.id, log)
          
          results.imported++
          results.linkedToExisting++
          console.log(`[ChatLog API] Created ChatLog ${chatLog.id} linked to existing RawImportData ${linkToRawId}`)
          continue
        }

        // FALLBACK: No existing RawImportData - save with new raw data and traceability chain
        const rawJsonToSave = rawJson || (logs.length > 0 ? JSON.stringify(logs) : null)
        
        const rawResult = await saveRawDataWithTraceability({
          sourceType: source === 'batch_import' ? 'batch_import' : source === 'auto_fetch' ? 'auto_fetch' : 'manual',
          sourceChatId: logSessionId,
          rawJson: rawJsonToSave || log,
          parsedData: {
            sessionId: logSessionId,
            sessionDate: log.sessionDate || new Date().toISOString().split('T')[0],
            title: log.title || 'Chat Session',
            summary: log.summary || '',
            issuesSolved: log.issuesSolved || [],
            featuresAdded: log.featuresAdded || [],
            filesModified: log.filesModified || [],
            commits: log.commits || [],
            notes: log.notes || '',
            source: source
          }
        })

        if (rawResult.success) {
          results.imported++
          results.rawDataSaved++
          if (rawResult.sessionId) results.analyticsCreated++
        } else {
          results.errors.push(`Failed to save raw data for: ${log.title || log.id || 'unknown'} - ${rawResult.error}`)
        }

      } catch (e) {
        results.errors.push(`Failed to import log: ${log.title || log.id || 'unknown'}`)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Imported ${results.imported} logs, updated ${results.updated} existing, linked ${results.linkedToExisting} to existing raw data, saved ${results.rawDataSaved} new raw imports`
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Create traceability links for existing raw data
async function createTraceabilityLinks(rawDataId: string, chatLogId: string, log: any) {
  try {
    const links: Array<{
      chainLevel: number
      chainOrder: number
      entityType: string
      entityId: string
      entityName: string | null
      extractionPath: string | null
    }> = []

    // Level 0: Raw data reference
    links.push({
      chainLevel: 0,
      chainOrder: 0,
      entityType: 'RawImportData',
      entityId: `raw_${rawDataId}`,
      entityName: `Linked Raw Import`,
      extractionPath: '$'
    })

    // Level 1: Date
    links.push({
      chainLevel: 1,
      chainOrder: 0,
      entityType: 'SessionDate',
      entityId: `date_${chatLogId}`,
      entityName: `Date: ${log.sessionDate || new Date().toISOString().split('T')[0]}`,
      extractionPath: '$.sessionDate'
    })

    // Level 2: Session
    links.push({
      chainLevel: 2,
      chainOrder: 0,
      entityType: 'ChatLog',
      entityId: `session_${chatLogId}`,
      entityName: log.title || 'Chat Session',
      extractionPath: '$.sessionId'
    })

    // Level 3: Issues
    const issues = log.issuesSolved || []
    for (let i = 0; i < issues.length; i++) {
      links.push({
        chainLevel: 3,
        chainOrder: i,
        entityType: 'Issue',
        entityId: `issue_${chatLogId}_${i}`,
        entityName: issues[i]?.substring?.(0, 100) || String(issues[i]).substring(0, 100),
        extractionPath: `$.issuesSolved[${i}]`
      })
    }

    // Level 4: Features
    const features = log.featuresAdded || []
    for (let i = 0; i < features.length; i++) {
      links.push({
        chainLevel: 4,
        chainOrder: i,
        entityType: 'Feature',
        entityId: `feature_${chatLogId}_${i}`,
        entityName: features[i]?.substring?.(0, 100) || String(features[i]).substring(0, 100),
        extractionPath: `$.featuresAdded[${i}]`
      })
    }

    // Level 5: Output (files)
    const files = log.filesModified || []
    for (let i = 0; i < files.length; i++) {
      links.push({
        chainLevel: 5,
        chainOrder: i,
        entityType: 'FileOutput',
        entityId: `file_${chatLogId}_${i}`,
        entityName: files[i],
        extractionPath: `$.filesModified[${i}]`
      })
    }

    // Batch insert links
    await prisma.rawDataLink.createMany({
      data: links.map(link => ({
        rawDataId,
        ...link,
        extractionConfidence: 1.0,
        extractionMethod: 'auto'
      })),
      skipDuplicates: true
    })

    console.log(`[ChatLog API] Created ${links.length} traceability links for ${rawDataId}`)
  } catch (error) {
    console.error('[ChatLog API] Error creating traceability links:', error)
  }
}

// Infer category from title and files
function inferCategory(title: string, files: string[]): string {
  const titleLower = title.toLowerCase()
  const filesStr = files.join(' ').toLowerCase()
  
  if (titleLower.includes('api') || filesStr.includes('/api/')) return 'api'
  if (titleLower.includes('ui') || titleLower.includes('component') || filesStr.includes('.tsx')) return 'frontend'
  if (titleLower.includes('database') || titleLower.includes('schema') || filesStr.includes('prisma')) return 'database'
  if (titleLower.includes('auth') || titleLower.includes('login')) return 'authentication'
  if (titleLower.includes('test')) return 'testing'
  if (titleLower.includes('bug') || titleLower.includes('fix')) return 'bugfix'
  if (titleLower.includes('refactor')) return 'refactoring'
  if (titleLower.includes('feature')) return 'feature'
  
  return 'development'
}

// DELETE - Remove a log
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const logId = searchParams.get('id')
    const sessionId = searchParams.get('sessionId')

    if (!logId && !sessionId) {
      return NextResponse.json({ error: 'Log ID or sessionId required' }, { status: 400 })
    }

    if (logId) {
      await prisma.chatLog.delete({ where: { id: logId } })
    } else if (sessionId) {
      await prisma.chatLog.delete({ where: { sessionId } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
