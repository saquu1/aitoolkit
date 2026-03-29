/**
 * RE-IMPORT RAW DATA API
 * ======================
 * Save raw data for existing ChatLogs that don't have raw data yet
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { saveRawDataWithTraceability } from '@/lib/raw-data-service'

const prisma = new PrismaClient()

/**
 * GET - List ChatLogs without raw data
 */
export async function GET(request: NextRequest) {
  try {
    const chatLogs = await prisma.chatLog.findMany({
      where: {
        rawDataId: null
      },
      orderBy: { importedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        sessionId: true,
        sessionDate: true,
        title: true,
        source: true,
        importedAt: true,
        issuesSolved: true,
        featuresAdded: true
      }
    })

    // Parse JSON fields for display
    const parsedLogs = chatLogs.map(log => ({
      ...log,
      issuesSolved: JSON.parse(log.issuesSolved || '[]'),
      featuresAdded: JSON.parse(log.featuresAdded || '[]'),
      issuesCount: JSON.parse(log.issuesSolved || '[]').length,
      featuresCount: JSON.parse(log.featuresAdded || '[]').length
    }))

    return NextResponse.json({
      success: true,
      count: parsedLogs.length,
      chatLogs: parsedLogs
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST - Save raw data for an existing ChatLog
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatLogId, sessionId, rawJson } = body

    if (!rawJson) {
      return NextResponse.json({
        success: false,
        error: 'rawJson is required'
      }, { status: 400 })
    }

    // Find the ChatLog by ID or sessionId
    const chatLog = await prisma.chatLog.findFirst({
      where: {
        OR: [
          { id: chatLogId },
          { sessionId: sessionId }
        ]
      }
    })

    if (!chatLog) {
      return NextResponse.json({
        success: false,
        error: 'ChatLog not found'
      }, { status: 404 })
    }

    if (chatLog.rawDataId) {
      return NextResponse.json({
        success: false,
        error: 'ChatLog already has raw data linked',
        rawDataId: chatLog.rawDataId
      }, { status: 400 })
    }

    // Parse existing data from ChatLog
    const issuesSolved = JSON.parse(chatLog.issuesSolved || '[]')
    const featuresAdded = JSON.parse(chatLog.featuresAdded || '[]')
    const filesModified = JSON.parse(chatLog.filesModified || '[]')
    const commits = JSON.parse(chatLog.commits || '[]')

    // Save raw data with traceability
    const result = await saveRawDataWithTraceability({
      sourceType: 'batch_import',
      sourceChatId: chatLog.sessionId,
      rawJson: rawJson,
      parsedData: {
        sessionId: chatLog.sessionId,
        sessionDate: chatLog.sessionDate,
        title: chatLog.title,
        summary: chatLog.summary,
        issuesSolved,
        featuresAdded,
        filesModified,
        commits,
        notes: chatLog.notes,
        source: chatLog.source
      }
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    // Update ChatLog to link to raw data
    await prisma.chatLog.update({
      where: { id: chatLog.id },
      data: { rawDataId: result.rawDataId }
    })

    return NextResponse.json({
      success: true,
      message: 'Raw data saved and linked to ChatLog',
      chatLogId: chatLog.id,
      rawDataId: result.rawDataId,
      issuesLinked: result.issuesLinked,
      featuresLinked: result.featuresLinked
    })

  } catch (error) {
    console.error('Re-import error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
