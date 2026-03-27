/**
 * ANALYTICS DEBUG API
 * ====================
 * Debug endpoint to inspect actual message format from chat.z.ai
 * and test extraction step by step
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const CHAT_API_BASE = 'https://chat.z.ai/api/v1/chats'

interface ChatMessage {
  id: string
  chat_id: string
  user_id: string
  parent_id: string
  role: 'user' | 'assistant'
  content: string | null
  content_blocks: any[] | null
  model?: string
  model_name?: string
  timestamp: number
  created_at: number
}

function buildHeaders(authCookie: string): Record<string, string> {
  return {
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json',
    'Cookie': authCookie,
    'Origin': 'https://chat.z.ai',
    'Referer': 'https://chat.z.ai/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'help'
  
  if (action === 'help') {
    return NextResponse.json({
      endpoints: {
        'test-connection': '/api/analytics/debug?action=test-connection&authCookie=YOUR_COOKIE&chatId=CHAT_ID',
        'inspect-messages': '/api/analytics/debug?action=inspect-messages&authCookie=YOUR_COOKIE&chatId=CHAT_ID',
        'analyze-structure': '/api/analytics/debug?action=analyze-structure&authCookie=YOUR_COOKIE&chatId=CHAT_ID',
        'test-extraction': '/api/analytics/debug?action=test-extraction&authCookie=YOUR_COOKIE&chatId=CHAT_ID',
        'db-stats': '/api/analytics/debug?action=db-stats',
      },
      instructions: [
        '1. Get your auth cookie from browser DevTools',
        '2. Use test-connection to verify API access',
        '3. Use inspect-messages to see raw message format',
        '4. Use analyze-structure to understand content_blocks',
        '5. Use test-extraction to run extraction with logging',
      ]
    })
  }
  
  const authCookie = searchParams.get('authCookie')
  const chatId = searchParams.get('chatId') || '3286341f-bf13-4a10-be2d-eea782660c9d'
  
  if (action === 'db-stats') {
    return await getDbStats()
  }
  
  if (!authCookie) {
    return NextResponse.json({
      error: 'authCookie required',
      hint: 'Get cookie from browser DevTools > Application > Cookies > chat.z.ai > token'
    }, { status: 400 })
  }
  
  switch (action) {
    case 'test-connection':
      return await testConnection(authCookie, chatId)
    case 'inspect-messages':
      return await inspectMessages(authCookie, chatId)
    case 'analyze-structure':
      return await analyzeStructure(authCookie, chatId)
    case 'test-extraction':
      return await testExtraction(authCookie, chatId)
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

async function getDbStats() {
  try {
    const stats = {
      sessions: await db.aISession.count(),
      contentBlocks: await db.contentBlock.count(),
      toolCalls: await db.toolCall.count(),
      fileOperations: await db.fileOperation.count(),
      messageRecords: await db.aIMessageRecord.count(),
      issues: await db.aIIssue.count(),
      features: await db.aIFeature.count(),
      costRecords: await db.aICostRecord.count(),
      chatLogs: await db.chatLog.count(),
    }
    
    // Get latest session with children
    const latestSession = await db.aISession.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            messages: true,
            issues: true,
            features: true,
          }
        }
      }
    })
    
    return NextResponse.json({
      stats,
      latestSession,
      diagnosis: stats.contentBlocks === 0 
        ? '❌ No content blocks saved - extraction failing on content_blocks'
        : '✅ Content blocks exist',
      recommendation: stats.contentBlocks === 0
        ? 'Check message format from chat.z.ai - content_blocks may be null or different structure'
        : 'Extraction working correctly'
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Database error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

async function testConnection(authCookie: string, chatId: string) {
  try {
    console.log('[DEBUG] Testing connection to chat.z.ai...')
    
    // Get chat info
    const chatInfoResponse = await fetch(`${CHAT_API_BASE}/${chatId}`, {
      headers: buildHeaders(authCookie)
    })
    
    if (chatInfoResponse.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed (401)',
        hint: 'Cookie expired or invalid. Get a fresh cookie from browser.'
      }, { status: 401 })
    }
    
    if (!chatInfoResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `Chat info failed: ${chatInfoResponse.status}`
      }, { status: 500 })
    }
    
    const chatInfo = await chatInfoResponse.json()
    const messageIds = chatInfo.data?.childrenIds || []
    
    console.log(`[DEBUG] Found ${messageIds.length} messages in chat`)
    
    return NextResponse.json({
      success: true,
      chatId,
      title: chatInfo.data?.title,
      messageCount: messageIds.length,
      messageIdsPreview: messageIds.slice(0, 5),
      message: `✅ Connected! Found ${messageIds.length} messages.`
    })
  } catch (error) {
    console.error('[DEBUG] Connection error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Connection failed'
    }, { status: 500 })
  }
}

async function inspectMessages(authCookie: string, chatId: string) {
  try {
    console.log('[DEBUG] Fetching messages for inspection...')
    
    // Get message IDs
    const chatInfoResponse = await fetch(`${CHAT_API_BASE}/${chatId}`, {
      headers: buildHeaders(authCookie)
    })
    
    if (!chatInfoResponse.ok) {
      return NextResponse.json({
        error: `Chat info failed: ${chatInfoResponse.status}`
      }, { status: 500 })
    }
    
    const chatInfo = await chatInfoResponse.json()
    const messageIds = (chatInfo.data?.childrenIds || []).slice(0, 20) // First 20 only
    
    if (messageIds.length === 0) {
      return NextResponse.json({
        error: 'No messages found in this chat'
      }, { status: 404 })
    }
    
    // Fetch messages
    const batchResponse = await fetch(`${CHAT_API_BASE}/${chatId}/messages/batch`, {
      method: 'POST',
      headers: buildHeaders(authCookie),
      body: JSON.stringify({ ids: messageIds })
    })
    
    if (!batchResponse.ok) {
      return NextResponse.json({
        error: `Batch fetch failed: ${batchResponse.status}`
      }, { status: 500 })
    }
    
    const data = await batchResponse.json()
    const messages: ChatMessage[] = Object.values(data.data || {})
    
    console.log(`[DEBUG] Fetched ${messages.length} messages`)
    
    // Analyze message structure
    const analysis = {
      totalMessages: messages.length,
      userMessages: messages.filter(m => m.role === 'user').length,
      assistantMessages: messages.filter(m => m.role === 'assistant').length,
      messagesWithContent: messages.filter(m => m.content).length,
      messagesWithContentBlocks: messages.filter(m => m.content_blocks && m.content_blocks.length > 0).length,
      messagesWithNullContentBlocks: messages.filter(m => m.content_blocks === null).length,
      messagesWithEmptyContentBlocks: messages.filter(m => m.content_blocks && m.content_blocks.length === 0).length,
    }
    
    // Get sample messages
    const sampleUser = messages.find(m => m.role === 'user')
    const sampleAssistant = messages.find(m => m.role === 'assistant')
    
    // Analyze content_blocks structure
    let contentBlocksAnalysis: any = {
      types: {},
      sampleToolCall: null,
      sampleReasoning: null,
      sampleText: null,
    }
    
    for (const msg of messages) {
      if (msg.content_blocks && msg.content_blocks.length > 0) {
        for (const block of msg.content_blocks) {
          const type = block.type || 'unknown'
          contentBlocksAnalysis.types[type] = (contentBlocksAnalysis.types[type] || 0) + 1
          
          if (type === 'tool_calls' && !contentBlocksAnalysis.sampleToolCall && block.content) {
            contentBlocksAnalysis.sampleToolCall = {
              type: block.type,
              hasContent: !!block.content,
              contentType: Array.isArray(block.content) ? 'array' : typeof block.content,
              sample: Array.isArray(block.content) 
                ? block.content.slice(0, 2).map((tc: any) => ({
                    id: tc.id,
                    functionName: tc.function?.name,
                    hasArgs: !!tc.function?.arguments
                  }))
                : (typeof block.content === 'string' ? block.content.slice(0, 200) : block.content)
            }
          }
          
          if (type === 'reasoning' && !contentBlocksAnalysis.sampleReasoning) {
            contentBlocksAnalysis.sampleReasoning = {
              type: block.type,
              contentLength: typeof block.content === 'string' ? block.content.length : 0,
              preview: typeof block.content === 'string' ? block.content.slice(0, 300) : null
            }
          }
          
          if (type === 'text' && !contentBlocksAnalysis.sampleText) {
            contentBlocksAnalysis.sampleText = {
              type: block.type,
              contentLength: typeof block.content === 'string' ? block.content.length : 0,
              preview: typeof block.content === 'string' ? block.content.slice(0, 200) : null
            }
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      analysis,
      contentBlocksAnalysis,
      sampleUserMessage: sampleUser ? {
        id: sampleUser.id,
        role: sampleUser.role,
        hasContent: !!sampleUser.content,
        contentPreview: sampleUser.content?.slice(0, 300),
        hasContentBlocks: !!sampleUser.content_blocks,
        contentBlocksCount: sampleUser.content_blocks?.length || 0,
      } : null,
      sampleAssistantMessage: sampleAssistant ? {
        id: sampleAssistant.id,
        role: sampleAssistant.role,
        hasContent: !!sampleAssistant.content,
        contentPreview: sampleAssistant.content?.slice(0, 200),
        hasContentBlocks: !!sampleAssistant.content_blocks,
        contentBlocksCount: sampleAssistant.content_blocks?.length || 0,
        contentBlocksTypes: sampleAssistant.content_blocks?.map((b: any) => b.type) || [],
      } : null,
      rawMessageKeys: messages[0] ? Object.keys(messages[0]) : [],
      diagnosis: analysis.messagesWithContentBlocks === 0
        ? '❌ No messages have content_blocks - extraction will fail!'
        : `✅ ${analysis.messagesWithContentBlocks} messages have content_blocks`
    })
  } catch (error) {
    console.error('[DEBUG] Inspection error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Inspection failed',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

async function analyzeStructure(authCookie: string, chatId: string) {
  try {
    console.log('[DEBUG] Analyzing detailed structure...')
    
    // Get message IDs
    const chatInfoResponse = await fetch(`${CHAT_API_BASE}/${chatId}`, {
      headers: buildHeaders(authCookie)
    })
    
    if (!chatInfoResponse.ok) {
      return NextResponse.json({ error: `Chat info failed: ${chatInfoResponse.status}` }, { status: 500 })
    }
    
    const chatInfo = await chatInfoResponse.json()
    const messageIds = (chatInfo.data?.childrenIds || []).slice(0, 10)
    
    if (messageIds.length === 0) {
      return NextResponse.json({ error: 'No messages found' }, { status: 404 })
    }
    
    // Fetch messages
    const batchResponse = await fetch(`${CHAT_API_BASE}/${chatId}/messages/batch`, {
      method: 'POST',
      headers: buildHeaders(authCookie),
      body: JSON.stringify({ ids: messageIds })
    })
    
    if (!batchResponse.ok) {
      return NextResponse.json({ error: `Batch fetch failed: ${batchResponse.status}` }, { status: 500 })
    }
    
    const data = await batchResponse.json()
    const messages: ChatMessage[] = Object.values(data.data || {})
    
    // Find first assistant message with content_blocks
    const assistantWithBlocks = messages.find(m => 
      m.role === 'assistant' && m.content_blocks && m.content_blocks.length > 0
    )
    
    if (!assistantWithBlocks) {
      // Check what we actually have
      return NextResponse.json({
        success: false,
        error: 'No assistant messages with content_blocks found',
        whatWeHave: {
          totalMessages: messages.length,
          assistantMessages: messages.filter(m => m.role === 'assistant').length,
          sampleAssistant: messages.filter(m => m.role === 'assistant')[0] 
            ? {
                keys: Object.keys(messages.filter(m => m.role === 'assistant')[0]),
                content_blocks: messages.filter(m => m.role === 'assistant')[0].content_blocks,
                content: messages.filter(m => m.role === 'assistant')[0].content?.slice(0, 500)
              }
            : null
        },
        possibleCauses: [
          'API response format changed',
          'Different chat has different format',
          'Authentication issue',
          'No tool calls in this chat session'
        ]
      })
    }
    
    // Deep analyze the content_blocks
    const blocksAnalysis = assistantWithBlocks.content_blocks!.map((block: any, idx: number) => {
      const analysis: any = {
        index: idx,
        type: block.type,
        keys: Object.keys(block),
      }
      
      if (block.type === 'tool_calls') {
        analysis.contentIsArray = Array.isArray(block.content)
        analysis.contentLength = Array.isArray(block.content) ? block.content.length : 0
        
        if (Array.isArray(block.content) && block.content.length > 0) {
          const firstToolCall = block.content[0]
          analysis.firstToolCall = {
            keys: Object.keys(firstToolCall),
            hasFunction: !!firstToolCall.function,
            functionName: firstToolCall.function?.name,
            argumentsType: typeof firstToolCall.function?.arguments,
            argumentsPreview: typeof firstToolCall.function?.arguments === 'string'
              ? firstToolCall.function.arguments.slice(0, 200)
              : firstToolCall.function?.arguments
          }
        }
      } else if (block.type === 'reasoning') {
        analysis.contentLength = typeof block.content === 'string' ? block.content.length : 0
        analysis.preview = typeof block.content === 'string' ? block.content.slice(0, 300) : null
      } else if (block.type === 'text') {
        analysis.contentLength = typeof block.content === 'string' ? block.content.length : 0
        analysis.preview = typeof block.content === 'string' ? block.content.slice(0, 200) : null
      } else {
        analysis.raw = JSON.stringify(block).slice(0, 500)
      }
      
      return analysis
    })
    
    return NextResponse.json({
      success: true,
      messageId: assistantWithBlocks.id,
      messageRole: assistantWithBlocks.role,
      model: assistantWithBlocks.model,
      modelName: assistantWithBlocks.model_name,
      timestamp: assistantWithBlocks.timestamp,
      totalBlocks: assistantWithBlocks.content_blocks!.length,
      blockTypes: assistantWithBlocks.content_blocks!.map((b: any) => b.type),
      blocksAnalysis,
      extractionCompatibility: {
        toolCallsDetected: blocksAnalysis.filter((b: any) => b.type === 'tool_calls').length,
        reasoningDetected: blocksAnalysis.filter((b: any) => b.type === 'reasoning').length,
        textDetected: blocksAnalysis.filter((b: any) => b.type === 'text').length,
        expectedFormat: blocksAnalysis.some((b: any) => b.type === 'tool_calls' && b.contentIsArray)
          ? '✅ Matches expected format'
          : '❌ Different format - extraction may need adjustment'
      }
    })
  } catch (error) {
    console.error('[DEBUG] Structure analysis error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Analysis failed',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

async function testExtraction(authCookie: string, chatId: string) {
  try {
    console.log('[DEBUG] Testing extraction with full logging...')
    
    // Import extraction function
    const { extractAnalyticsFromBatchResponse } = await import('@/lib/analytics-extraction-service')
    
    // Get message IDs
    const chatInfoResponse = await fetch(`${CHAT_API_BASE}/${chatId}`, {
      headers: buildHeaders(authCookie)
    })
    
    if (!chatInfoResponse.ok) {
      return NextResponse.json({ error: `Chat info failed: ${chatInfoResponse.status}` }, { status: 500 })
    }
    
    const chatInfo = await chatInfoResponse.json()
    const messageIds = (chatInfo.data?.childrenIds || []).slice(0, 50) // First 50 for test
    
    if (messageIds.length === 0) {
      return NextResponse.json({ error: 'No messages found' }, { status: 404 })
    }
    
    // Fetch messages
    console.log(`[DEBUG] Fetching ${messageIds.length} messages...`)
    const batchResponse = await fetch(`${CHAT_API_BASE}/${chatId}/messages/batch`, {
      method: 'POST',
      headers: buildHeaders(authCookie),
      body: JSON.stringify({ ids: messageIds })
    })
    
    if (!batchResponse.ok) {
      return NextResponse.json({ error: `Batch fetch failed: ${batchResponse.status}` }, { status: 500 })
    }
    
    const data = await batchResponse.json()
    const messages: ChatMessage[] = Object.values(data.data || {})
    
    console.log(`[DEBUG] Fetched ${messages.length} messages`)
    console.log(`[DEBUG] Messages with content_blocks: ${messages.filter(m => m.content_blocks?.length).length}`)
    
    // Pre-extraction analysis
    const preAnalysis = {
      totalMessages: messages.length,
      withContentBlocks: messages.filter(m => m.content_blocks && m.content_blocks.length > 0).length,
      toolCallsCount: messages.reduce((acc, m) => {
        if (!m.content_blocks) return acc
        for (const block of m.content_blocks) {
          if (block.type === 'tool_calls' && Array.isArray(block.content)) {
            acc += block.content.length
          }
        }
        return acc
      }, 0),
      uniqueToolNames: [...new Set(messages.flatMap(m => 
        (m.content_blocks || [])
          .filter((b: any) => b.type === 'tool_calls' && Array.isArray(b.content))
          .flatMap((b: any) => b.content.map((tc: any) => tc.function?.name))
          .filter(Boolean)
      ))],
    }
    
    console.log('[DEBUG] Pre-extraction analysis:', preAnalysis)
    
    // Run extraction WITHOUT saving to DB (just test)
    const testChatId = `test_${chatId}_${Date.now()}`
    
    let extractionResult
    let extractionError
    
    try {
      console.log('[DEBUG] Running extraction...')
      extractionResult = await extractAnalyticsFromBatchResponse(testChatId, messages, {
        saveToDb: false, // Don't save, just test
        enhanceWithAI: false
      })
      console.log('[DEBUG] Extraction completed:', {
        session: extractionResult.session,
        issuesCount: extractionResult.issues.length,
        featuresCount: extractionResult.features.length,
        patternsCount: extractionResult.patterns.length
      })
    } catch (e) {
      extractionError = e
      console.error('[DEBUG] Extraction failed:', e)
    }
    
    return NextResponse.json({
      success: !extractionError,
      preAnalysis,
      extractionResult: extractionResult ? {
        session: {
          title: extractionResult.session.title,
          model: extractionResult.session.model,
          totalTokens: extractionResult.session.totalTokens,
          inputTokens: extractionResult.session.inputTokens,
          outputTokens: extractionResult.session.outputTokens,
          estimatedCost: extractionResult.session.estimatedCost,
          filesModified: extractionResult.session.filesModified,
          filesCreated: extractionResult.session.filesCreated,
          featuresImplemented: extractionResult.session.featuresImplemented,
          issuesCreated: extractionResult.session.issuesCreated,
          category: extractionResult.session.category,
          duration: extractionResult.session.duration,
        },
        issuesCount: extractionResult.issues.length,
        issuesPreview: extractionResult.issues.slice(0, 3),
        featuresCount: extractionResult.features.length,
        featuresPreview: extractionResult.features.slice(0, 3),
        patternsCount: extractionResult.patterns.length,
        patternsPreview: extractionResult.patterns.slice(0, 5),
      } : null,
      extractionError: extractionError ? {
        message: extractionError instanceof Error ? extractionError.message : 'Unknown error',
        stack: extractionError instanceof Error ? extractionError.stack : undefined
      } : null,
      diagnosis: preAnalysis.withContentBlocks === 0
        ? '❌ No content_blocks in messages - cannot extract tool calls'
        : preAnalysis.toolCallsCount === 0
          ? '⚠️ No tool calls found - session may not have file operations'
          : extractionError
            ? `❌ Extraction failed: ${extractionError instanceof Error ? extractionError.message : 'Unknown'}`
            : '✅ Extraction successful!'
    })
  } catch (error) {
    console.error('[DEBUG] Test extraction error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Test failed',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
