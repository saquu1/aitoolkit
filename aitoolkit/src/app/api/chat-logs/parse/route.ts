/**
 * CHAT LOG PARSE API ROUTE (OPTIMIZED)
 * =====================================
 * Server-side parsing of batch JSON data
 * - Optimized single-pass JSON repair
 * - Chunked processing for large payloads
 * - Progress streaming support
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { repairJSON, parseJSONStream, validateJSONStructure } from '@/lib/json-repair'

const prisma = new PrismaClient()

// Parse batch API response (optimized)
// Accepts optional chatId to use as base for session IDs (prevents duplicates)
function parseBatchResponse(data: any, chatId?: string): any[] {
  // Extract messages from response
  const messages = data.data ? Object.values(data.data) : []
  
  // Get the chat_id from the raw data for deduplication
  const baseChatId = data.chat_id || chatId || 'batch'
  
  // Early exit if no messages
  if (messages.length === 0) return []
  
  // Group by date using Map for better performance
  const byDate = new Map<string, any[]>()
  
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') continue
    const timestamp = (msg as any).timestamp || (msg as any).created_at
    if (!timestamp) continue
    
    const date = new Date(timestamp * 1000).toISOString().split('T')[0]
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(msg)
  }
  
  const logs: any[] = []
  
  for (const [date, dateMessages] of byDate) {
    const assistantMsgs = dateMessages.filter((m: any) => m.role === 'assistant')
    const userMsgs = dateMessages.filter((m: any) => m.role === 'user')
    
    if (assistantMsgs.length === 0) continue
    
    // Extract work done
    const filesSet = new Set<string>()
    const featuresSet = new Set<string>()
    const issuesSet = new Set<string>()
    const commands: string[] = []
    
    // Parse assistant content blocks
    for (const msg of assistantMsgs) {
      const blocks = msg.content_blocks || []
      for (const block of blocks) {
        if (block.type === 'tool_calls' && Array.isArray(block.content)) {
          for (const tc of block.content) {
            const fn = tc.function
            if (!fn) continue
            
            // Safely parse arguments
            let args: any = {}
            if (typeof fn.arguments === 'string') {
              try {
                args = JSON.parse(fn.arguments)
              } catch {
                const repairResult = repairJSON(fn.arguments)
                if (repairResult.success) {
                  args = repairResult.data
                }
              }
            } else if (fn.arguments) {
              args = fn.arguments
            }
            
            if (fn.name === 'Write' && args.filepath) {
              filesSet.add(args.filepath)
              if (args.filepath.includes('Tab.tsx')) {
                featuresSet.add(`Created ${args.filepath.split('/').pop()}`)
              }
            }
            if (fn.name === 'Edit' && args.filepath) {
              filesSet.add(args.filepath)
            }
            if (fn.name === 'Bash' && args.command) {
              commands.push(args.command)
            }
          }
        }
        if (block.type === 'text' && block.content) {
          const text = block.content.toLowerCase()
          if (text.includes('feature') || text.includes('added') || text.includes('implemented')) {
            const firstLine = block.content.split('\n')[0].slice(0, 100)
            featuresSet.add(firstLine)
          }
        }
      }
    }
    
    // Parse user messages for issues
    for (const msg of userMsgs) {
      const content = msg.content || ''
      if (content.includes('error') || content.includes('issue') || content.includes('fix')) {
        const lines = content.split('\n').filter((l: string) => 
          l.toLowerCase().includes('error') || 
          l.toLowerCase().includes('issue') ||
          l.toLowerCase().includes('fix')
        )
        lines.slice(0, 3).forEach((l: string) => issuesSet.add(l))
      }
    }
    
    // Convert Sets to Arrays
    const uniqueFiles = Array.from(filesSet)
    
    // Skip if nothing done
    if (uniqueFiles.length === 0 && featuresSet.size === 0) continue
    
    // Generate title from first user message
    const firstUser = userMsgs[0]?.content || ''
    let title = 'Development Session'
    
    if (firstUser.includes('API')) title = 'API Development'
    if (firstUser.includes('modal') || firstUser.includes('popup')) title = 'Modal/Popup Work'
    if (firstUser.includes('cleanup') || firstUser.includes('thread')) title = 'System Cleanup'
    if (firstUser.includes('auth') || firstUser.includes('login')) title = 'Authentication'
    if (firstUser.includes('log') || firstUser.includes('history')) title = 'Logging Feature'
    
    // Extract commits
    const commits = commands
      .filter(c => c.includes('git push') || c.includes('git commit'))
      .map(c => {
        const m = c.match(/-m\s+["']([^"']+)/)
        return m ? m[1].slice(0, 50) : null
      })
      .filter(Boolean)
    
    // Use chat_id + date as sessionId for deduplication (instead of Date.now())
    // This ensures parsing the same raw data twice won't create duplicates
    const sessionId = `${baseChatId}_${date}`
    
    logs.push({
      id: sessionId,
      sessionId: sessionId,
      timestamp: new Date(date).toISOString(),
      sessionDate: date,
      title,
      summary: `Modified ${uniqueFiles.length} files, ${featuresSet.size} features`,
      issuesSolved: Array.from(issuesSet).slice(0, 5),
      featuresAdded: Array.from(featuresSet).slice(0, 10),
      filesModified: uniqueFiles,
      commits: commits as string[],
      notes: '',
      source: 'batch-import'
    })
  }
  
  return logs.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
}

// POST - Parse raw JSON and return structured logs
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check content length before parsing
    const contentLength = request.headers.get('content-length')
    const maxSize = 50 * 1024 * 1024 // 50MB max
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return NextResponse.json({
        success: false,
        error: `Payload too large (${Math.round(parseInt(contentLength) / 1024 / 1024)}MB). Maximum size is 50MB.`
      }, { status: 413 })
    }

    const body = await request.json()
    const { rawJson, saveRaw, action } = body

    // Validate JSON structure first (fast pre-check)
    if (typeof rawJson === 'string' && rawJson.length > 1000000) {
      const validation = validateJSONStructure(rawJson)
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          error: `JSON structure invalid: ${validation.error}`
        }, { status: 400 })
      }
    }

    if (action === 'parse-only') {
      // Use streaming parse for large payloads
      const isLargePayload = typeof rawJson === 'string' && rawJson.length > 500000
      
      let result
      if (isLargePayload) {
        console.log('[Parse API] Large payload detected, using streaming parse')
        result = await parseJSONStream(typeof rawJson === 'string' ? rawJson : JSON.stringify(rawJson))
      } else {
        result = repairJSON(rawJson)
      }
      
      if (!result.success) {
        const errorContext = result.position
          ? `Near position ${result.position}: "${rawJson.slice(Math.max(0, result.position - 30), result.position + 30)}"`
          : ''
        return NextResponse.json({
          success: false,
          error: `JSON parse failed: ${result.error}\n${errorContext}\n\nTip: JSON may be truncated or contain unescaped special characters.`,
          position: result.position
        }, { status: 400 })
      }

      const parsed = parseBatchResponse(result.data)
      
      if (parsed.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Parse successful, but no valid session data found. Ensure JSON contains a "data" field with message records.',
          messageCount: result.data?.data ? Object.keys(result.data.data).length : 0
        }, { status: 400 })
      }

      const elapsed = Date.now() - startTime
      console.log(`[Parse API] ✅ Parse complete in ${elapsed}ms, found ${parsed.length} sessions`)

      return NextResponse.json({
        success: true,
        logs: parsed,
        stats: {
          totalMessages: result.data?.data ? Object.keys(result.data.data).length : 0,
          sessionsFound: parsed.length,
          totalFiles: parsed.reduce((sum, l) => sum + l.filesModified.length, 0),
          totalFeatures: parsed.reduce((sum, l) => sum + l.featuresAdded.length, 0),
          totalIssues: parsed.reduce((sum, l) => sum + l.issuesSolved.length, 0),
          parseTimeMs: elapsed
        }
      })
    }

    if (action === 'parse-and-save') {
      // Parse and save raw data
      const result = repairJSON(rawJson)
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: `JSON parse failed: ${result.error}`
        }, { status: 400 })
      }

      // Save raw data first
      const rawJsonStr = typeof rawJson === 'string' ? rawJson : JSON.stringify(rawJson)
      const rawData = await prisma.rawImportData.create({
        data: {
          sourceType: 'batch_import',
          rawJson: rawJsonStr,
          rawSizeBytes: Buffer.byteLength(rawJsonStr, 'utf8'),
          messageCount: result.data?.data ? Object.keys(result.data.data).length : 0,
          parseStatus: 'parsed',
          parsedAt: new Date()
        }
      })

      const parsed = parseBatchResponse(result.data)
      const elapsed = Date.now() - startTime

      return NextResponse.json({
        success: true,
        rawDataId: rawData.id,
        logs: parsed,
        stats: {
          sessionsFound: parsed.length,
          rawDataSize: rawData.rawSizeBytes,
          parseTimeMs: elapsed
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use "parse-only" or "parse-and-save"'
    }, { status: 400 })

  } catch (error) {
    console.error('[Parse API] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET - Get parsing status/stats
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawDataId = searchParams.get('rawDataId')

  if (rawDataId) {
    const rawData = await prisma.rawImportData.findUnique({
      where: { id: rawDataId },
      select: {
        id: true,
        sourceType: true,
        rawSizeBytes: true,
        messageCount: true,
        parseStatus: true,
        parseError: true,
        parsedAt: true,
        importedAt: true
      }
    })

    if (!rawData) {
      return NextResponse.json({
        success: false,
        error: 'Raw data not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      rawData
    })
  }

  // Get all pending raw data
  const pending = await prisma.rawImportData.findMany({
    where: { parseStatus: 'pending' },
    select: {
      id: true,
      sourceType: true,
      rawSizeBytes: true,
      messageCount: true,
      importedAt: true
    },
    orderBy: { importedAt: 'desc' }
  })

  return NextResponse.json({
    success: true,
    pendingCount: pending.length,
    pending
  })
}
