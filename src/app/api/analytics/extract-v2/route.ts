/**
 * Analytics Extraction V2 API
 * Full extraction with ContentBlock, ToolCall, FileOperation, GitOperation storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { extractAnalyticsFromBatchResponseV2 } from '@/lib/analytics-extraction-v2'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatId, messages, saveToDb = true } = body
    
    if (!chatId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ 
        error: 'chatId and messages array are required' 
      }, { status: 400 })
    }
    
    const result = await extractAnalyticsFromBatchResponseV2(chatId, messages, { saveToDb })
    
    return NextResponse.json({
      success: true,
      session: result.session,
      counts: {
        contentBlocks: result.contentBlocks.length,
        toolCalls: result.toolCalls.length,
        fileOperations: result.fileOperations.length,
        gitOperations: result.gitOperations.length
      }
    })
    
  } catch (error) {
    console.error('Analytics extraction V2 error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
