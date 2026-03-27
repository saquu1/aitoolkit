/**
 * RAW DATA API ROUTE
 * ==================
 * Query raw imported data and traceability chains
 * Save raw data without parsing
 * Includes duplicate detection before saving
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import {
  getRawDataByChatId,
  getRawDataByIssue,
  getRawDataByFeature,
  getRawDataByDate,
  getTraceabilityChain,
  getAllRawImports,
  getRawJson,
  deleteRawData,
  checkForDuplicates,
  updateRawDataTitle,
  DuplicateCheckResult
} from '@/lib/raw-data-service'

const prisma = new PrismaClient()

// POST - Save raw data without parsing (with duplicate detection)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sourceType, rawJson, sourceUrl, sourceChatId, forceSave } = body

    // Check for duplicates before saving
    if (action === 'check-duplicate') {
      if (!rawJson) {
        return NextResponse.json({
          success: false,
          error: 'rawJson is required'
        }, { status: 400 })
      }

      const rawJsonStr = typeof rawJson === 'string' ? rawJson : JSON.stringify(rawJson)
      const duplicateResult = await checkForDuplicates(rawJsonStr)

      return NextResponse.json({
        success: true,
        duplicateCheck: duplicateResult
      })
    }

    // Save raw data only (without parsing)
    if (action === 'save-raw') {
      if (!rawJson) {
        return NextResponse.json({
          success: false,
          error: 'rawJson is required'
        }, { status: 400 })
      }

      const rawJsonStr = typeof rawJson === 'string' ? rawJson : JSON.stringify(rawJson)

      // Check for duplicates unless forceSave is true
      if (!forceSave) {
        const duplicateResult = await checkForDuplicates(rawJsonStr)

        if (duplicateResult.isExactDuplicate) {
          // EXACT DUPLICATE - reject save
          return NextResponse.json({
            success: false,
            isDuplicate: true,
            duplicateType: 'exact',
            error: '⚠️ EXACT DUPLICATE DETECTED',
            message: `This data already exists in the database!`,
            existingRawDataId: duplicateResult.existingRawDataId,
            existingChatLogId: duplicateResult.existingChatLogId,
            existingTitle: duplicateResult.existingTitle,
            matchPercentage: duplicateResult.matchPercentage,
            matchedMessages: duplicateResult.matchedMessages,
            totalMessages: duplicateResult.totalMessages,
            hint: duplicateResult.hint,
            allowForceSave: duplicateResult.allowForceSave
          }, { status: 409 }) // 409 Conflict
        }

        if (duplicateResult.isPartialDuplicate) {
          // PARTIAL/EVOLVED DUPLICATE - warn but may allow save
          return NextResponse.json({
            success: false,
            isDuplicate: true,
            duplicateType: duplicateResult.duplicateType,
            error: 'ℹ️ SIMILAR DATA DETECTED',
            message: duplicateResult.duplicateType === 'evolved' 
              ? 'This appears to be an updated version of an existing conversation.'
              : 'Some messages in this data already exist.',
            existingRawDataId: duplicateResult.existingRawDataId,
            existingChatLogId: duplicateResult.existingChatLogId,
            existingTitle: duplicateResult.existingTitle,
            matchPercentage: duplicateResult.matchPercentage,
            matchedMessages: duplicateResult.matchedMessages,
            totalMessages: duplicateResult.totalMessages,
            newMessages: duplicateResult.newMessages,
            hint: duplicateResult.hint,
            allowForceSave: duplicateResult.allowForceSave
          }, { status: 409 })
        }
      }

      // No duplicate, or forceSave=true - proceed with save
      const rawData = await prisma.rawImportData.create({
        data: {
          sourceType: sourceType || 'manual',
          sourceUrl: sourceUrl || null,
          sourceChatId: sourceChatId || null,
          rawJson: rawJsonStr,
          rawSizeBytes: Buffer.byteLength(rawJsonStr, 'utf8'),
          messageCount: countMessages(rawJsonStr),
          parseStatus: 'pending'
        }
      })

      return NextResponse.json({
        success: true,
        rawDataId: rawData.id,
        message: 'Raw data saved successfully',
        isNew: true
      })
    }

    // Update parse status (called after successful parsing)
    if (action === 'update-status') {
      const { rawDataId, parseStatus, parseError } = body
      
      if (!rawDataId) {
        return NextResponse.json({
          success: false,
          error: 'rawDataId is required'
        }, { status: 400 })
      }
      
      await prisma.rawImportData.update({
        where: { id: rawDataId },
        data: {
          parseStatus: parseStatus || 'parsed',
          parseError: parseError || null,
          parsedAt: new Date()
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Parse status updated'
      })
    }

    // Parse raw data and extract analytics
    if (action === 'parse') {
      const { rawDataId } = body
      
      if (!rawDataId) {
        return NextResponse.json({
          success: false,
          error: 'rawDataId is required'
        }, { status: 400 })
      }
      
      const rawData = await prisma.rawImportData.findUnique({
        where: { id: rawDataId }
      })
      
      if (!rawData) {
        return NextResponse.json({
          success: false,
          error: 'Raw data not found'
        }, { status: 404 })
      }
      
      // Parse and extract
      try {
        const { extractAnalyticsFromBatchResponse } = await import('@/lib/analytics-extraction-service')
        
        const parsed = JSON.parse(rawData.rawJson)
        let messages = []
        
        // Extract messages from various formats
        if (parsed.data && typeof parsed.data === 'object') {
          messages = Object.values(parsed.data)
        } else if (Array.isArray(parsed.messages)) {
          messages = parsed.messages
        } else if (Array.isArray(parsed)) {
          messages = parsed
        }
        
        if (messages.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'No messages found in raw data'
          }, { status: 400 })
        }
        
        const chatId = parsed.chat_id || rawData.sourceChatId || `parsed_${rawDataId}`
        
        const result = await extractAnalyticsFromBatchResponse(chatId, messages, {
          saveToDb: true,
          enhanceWithAI: false
        })
        
        // Update raw data status
        await prisma.rawImportData.update({
          where: { id: rawDataId },
          data: {
            parseStatus: 'parsed',
            parsedAt: new Date()
          }
        })
        
        return NextResponse.json({
          success: true,
          message: 'Parsing complete',
          session: {
            title: result.session.title,
            totalTokens: result.session.totalTokens,
            filesModified: result.session.filesModified,
            filesCreated: result.session.filesCreated
          },
          featuresCount: result.features.length,
          issuesCount: result.issues.length
        })
      } catch (parseError) {
        await prisma.rawImportData.update({
          where: { id: rawDataId },
          data: {
            parseStatus: 'failed',
            parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
          }
        })
        
        return NextResponse.json({
          success: false,
          error: parseError instanceof Error ? parseError.message : 'Parse failed'
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('Error in raw data POST:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper: Count messages in raw JSON
function countMessages(rawJson: string): number {
  try {
    const parsed = JSON.parse(rawJson)
    if (Array.isArray(parsed)) return parsed.length
    if (parsed.messages && Array.isArray(parsed.messages)) return parsed.messages.length
    if (parsed.data && typeof parsed.data === 'object') return Object.keys(parsed.data).length
    return 1
  } catch {
    return 0
  }
}

// GET - Query raw data with various filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const chatId = searchParams.get('chatId')
    const issue = searchParams.get('issue')
    const feature = searchParams.get('feature')
    const date = searchParams.get('date')
    const rawDataId = searchParams.get('rawDataId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const parseStatus = (searchParams.get('parseStatus') || 'all') as 'all' | 'pending' | 'parsed' | 'failed'

    // Get all raw imports with pagination and filter
    if (action === 'list') {
      const result = await getAllRawImports({ limit, page, parseStatus })
      return NextResponse.json({
        success: true,
        imports: result.items,
        pagination: result.pagination
      })
    }

    // Get raw JSON content
    if (action === 'raw' && rawDataId) {
      const rawJson = await getRawJson(rawDataId)
      if (!rawJson) {
        return NextResponse.json({
          success: false,
          error: 'Raw data not found'
        }, { status: 404 })
      }
      
      // Return as downloadable JSON
      return new NextResponse(rawJson, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="raw-data-${rawDataId}.json"`
        }
      })
    }

    // Get traceability chain
    if (action === 'chain' && rawDataId) {
      const chain = await getTraceabilityChain(rawDataId)
      if (!chain) {
        return NextResponse.json({
          success: false,
          error: 'Raw data not found'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: true,
        chain
      })
    }

    // Get by chat ID (reverse lookup: Output → ... → Raw)
    if (chatId) {
      const result = await getRawDataByChatId(chatId)
      if (!result) {
        return NextResponse.json({
          success: false,
          error: 'No raw data found for this chat ID'
        }, { status: 404 })
      }
      
      return NextResponse.json({
        success: true,
        ...result
      })
    }

    // Get by issue (reverse lookup)
    if (issue) {
      const results = await getRawDataByIssue(issue)
      return NextResponse.json({
        success: true,
        results,
        count: results.length
      })
    }

    // Get by feature (reverse lookup)
    if (feature) {
      const results = await getRawDataByFeature(feature)
      return NextResponse.json({
        success: true,
        results,
        count: results.length
      })
    }

    // Get by date (reverse lookup)
    if (date) {
      const results = await getRawDataByDate(date)
      return NextResponse.json({
        success: true,
        results,
        count: results.length
      })
    }

    // Default: list all with pagination
    const result = await getAllRawImports({ limit, page, parseStatus })
    return NextResponse.json({
      success: true,
      imports: result.items,
      pagination: result.pagination
    })

  } catch (error) {
    console.error('Error in raw data API:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Remove raw data
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawDataId = searchParams.get('rawDataId')

    if (!rawDataId) {
      return NextResponse.json({
        success: false,
        error: 'rawDataId required'
      }, { status: 400 })
    }

    const success = await deleteRawData(rawDataId)
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete raw data'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Raw data deleted'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT - Update raw data (e.g., title)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, rawDataId, title } = body

    if (action === 'update-title') {
      if (!rawDataId || !title) {
        return NextResponse.json({
          success: false,
          error: 'rawDataId and title are required'
        }, { status: 400 })
      }

      const success = await updateRawDataTitle(rawDataId, title)
      
      if (!success) {
        return NextResponse.json({
          success: false,
          error: 'Failed to update title'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Title updated'
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
