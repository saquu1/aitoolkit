/**
 * CHAT LOG FETCH API
 * ===================
 * Fetches from chat.z.ai batch API and extracts structured logs
 * 
 * AUTHENTICATION:
 * - Get your cookie from browser DevTools (F12) > Network > click any request > Request Headers > Cookie
 * - Or look for the 'token' cookie in Application > Cookies > chat.z.ai
 */

import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { extractAnalyticsFromBatchResponse } from '@/lib/analytics-extraction-service'
import { db } from '@/lib/db'

// Chat API configuration
const CHAT_API_BASE = 'https://chat.z.ai/api/v1/chats'
const DEFAULT_CHAT_ID = '3286341f-bf13-4a10-be2d-eea782660c9d'

interface ChatMessage {
  id: string
  chat_id: string
  user_id: string
  parent_id: string
  role: 'user' | 'assistant'
  content: string | null
  content_blocks: Array<{
    type: string
    content: string | any[]
    started_at?: number
    ended_at?: number
    results?: any[]
  }> | null
  timestamp: number
  created_at: number
}

interface ExtractedLog {
  id: string
  timestamp: string
  sessionDate: string
  title: string
  summary: string
  issuesSolved: string[]
  featuresAdded: string[]
  filesModified: string[]
  commits: string[]
  notes: string
  source: string
  highlights: string[]
  technicalDetails: string
}

// Build headers for chat.z.ai API
function buildHeaders(authCookie: string): Record<string, string> {
  return {
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json',
    'Cookie': authCookie,
    'Origin': 'https://chat.z.ai',
    'Referer': 'https://chat.z.ai/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }
}

// Extract work done from content blocks
function extractFromContentBlocks(blocks: any[]): {
  filesWritten: string[]
  filesEdited: string[]
  commandsRun: string[]
  features: string[]
  issues: string[]
  technicalNotes: string[]
} {
  const result = {
    filesWritten: [] as string[],
    filesEdited: [] as string[],
    commandsRun: [] as string[],
    features: [] as string[],
    issues: [] as string[],
    technicalNotes: [] as string[]
  }

  for (const block of blocks) {
    if (block.type === 'tool_calls' && Array.isArray(block.content)) {
      for (const toolCall of block.content) {
        const func = toolCall.function
        if (!func) continue

        try {
          const args = typeof func.arguments === 'string' ? JSON.parse(func.arguments) : func.arguments

          if (func.name === 'Write' && args.filepath) {
            result.filesWritten.push(args.filepath)
            if (args.content && typeof args.content === 'string') {
              const featureMatch = args.content.match(/(?:feature|component|function|class)\s+(\w+)/i)
              if (featureMatch) {
                result.features.push(`Created ${args.filepath.split('/').pop()} - ${featureMatch[1]}`)
              }
            }
          } 
          else if (func.name === 'Edit' && args.filepath) {
            result.filesEdited.push(args.filepath)
          }
          else if (func.name === 'Bash' && args.command) {
            result.commandsRun.push(args.command)
            if (args.command.includes('git commit')) {
              const msgMatch = args.command.match(/-m\s+["'](.+?)["']/)
              if (msgMatch) {
                result.features.push(`Commit: ${msgMatch[1]}`)
              }
            }
          }
        } catch (e) {
          // Skip malformed tool calls
        }
      }
    }

    if (block.type === 'reasoning' && block.content) {
      const reasoning = block.content.toLowerCase()
      if (reasoning.includes('fix') || reasoning.includes('issue') || reasoning.includes('error')) {
        result.technicalNotes.push(block.content.slice(0, 200))
      }
    }

    if (block.type === 'text' && block.content) {
      const text = block.content
      const featurePatterns = [
        /added\s+(?:a\s+)?(?:new\s+)?(.+?)(?:feature|component|page|tab)/i,
        /created\s+(?:a\s+)?(.+?)(?:component|page|tab|feature)/i,
        /implemented\s+(.+?)(?:feature|function)/i
      ]
      
      for (const pattern of featurePatterns) {
        const match = text.match(pattern)
        if (match) {
          result.features.push(match[0])
          break
        }
      }
    }
  }

  return result
}

// Generate title from content
function generateTitle(content: string, files: string[]): string {
  if (content.includes('API') && content.includes('management')) return 'API Management Feature'
  if (content.includes('modal') || content.includes('popup')) return 'Modal/Popup Component'
  if (content.includes('cleanup') || content.includes('thread')) return 'System Cleanup'
  if (content.includes('auth') || content.includes('login')) return 'Authentication Update'
  if (content.includes('chat log') || content.includes('session')) return 'Chat Log Feature'
  
  const lines = content.split('\n').filter(l => l.trim())
  const firstLine = lines.find(l => l.length > 10 && !l.startsWith('http'))
  if (firstLine && firstLine.length < 100) {
    return firstLine.slice(0, 60) + (firstLine.length > 60 ? '...' : '')
  }
  
  if (files.length > 0) {
    const mainFile = files[0].split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '')
    return mainFile ? `Update ${mainFile}` : 'Code Update'
  }
  
  return 'Development Session'
}

// Extract issues from user messages
function extractIssues(content: string): string[] {
  const issues: string[] = []
  const lines = content.split('\n')
  
  const issuePatterns = [
    /(?:error|issue|bug|problem|fix|broken|not working|doesn't work)[:\s]+(.+)/i,
    /(\d{3}\s+(?:error|unauthorized|not found))/i,
    /(application error[^.]+)/i
  ]
  
  for (const line of lines) {
    for (const pattern of issuePatterns) {
      const match = line.match(pattern)
      if (match && match[1]) {
        issues.push(match[1].trim().slice(0, 100))
        break
      }
    }
  }
  
  return [...new Set(issues)]
}

// Parse messages and create log entries
function parseMessagesToLogs(messages: ChatMessage[]): ExtractedLog[] {
  const byDate: Record<string, ChatMessage[]> = {}
  
  for (const msg of messages) {
    const date = new Date(msg.timestamp * 1000).toISOString().split('T')[0]
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(msg)
  }
  
  const logs: ExtractedLog[] = []
  
  for (const [date, dateMessages] of Object.entries(byDate)) {
    const assistantMsgs = dateMessages.filter(m => m.role === 'assistant')
    const userMsgs = dateMessages.filter(m => m.role === 'user')
    
    if (assistantMsgs.length === 0) continue
    
    const allFilesWritten: string[] = []
    const allFilesEdited: string[] = []
    const allCommands: string[] = []
    const allFeatures: string[] = []
    const allIssues: string[] = []
    const allTechnicalNotes: string[] = []
    
    for (const msg of assistantMsgs) {
      if (msg.content_blocks) {
        const extracted = extractFromContentBlocks(msg.content_blocks)
        allFilesWritten.push(...extracted.filesWritten)
        allFilesEdited.push(...extracted.filesEdited)
        allCommands.push(...extracted.commandsRun)
        allFeatures.push(...extracted.features)
        allTechnicalNotes.push(...extracted.technicalNotes)
      }
    }
    
    for (const msg of userMsgs) {
      if (msg.content) {
        const issues = extractIssues(msg.content)
        allIssues.push(...issues)
      }
    }
    
    const uniqueFiles = [...new Set([...allFilesWritten, ...allFilesEdited])]
    const uniqueFeatures = [...new Set(allFeatures)]
    const uniqueIssues = [...new Set(allIssues)]
    
    if (uniqueFiles.length === 0 && uniqueFeatures.length === 0) continue
    
    const firstUserContent = userMsgs[0]?.content || ''
    const title = generateTitle(firstUserContent, uniqueFiles)
    const summary = `Modified ${uniqueFiles.length} files, added ${uniqueFeatures.length} features`
    
    const commits = allCommands
      .filter(c => c.includes('git push'))
      .map(c => {
        const match = c.match(/commit\s+([a-f0-9]+)/i)
        return match ? match[1].slice(0, 7) : null
      })
      .filter(Boolean) as string[]
    
    logs.push({
      id: `log_${date}_${Date.now()}`,
      timestamp: new Date(date).toISOString(),
      sessionDate: date,
      title,
      summary,
      issuesSolved: uniqueIssues.slice(0, 10),
      featuresAdded: uniqueFeatures.slice(0, 10),
      filesModified: uniqueFiles.slice(0, 20),
      commits,
      notes: allTechnicalNotes.slice(0, 3).join('\n\n'),
      source: 'chat-api',
      highlights: [],
      technicalDetails: allTechnicalNotes.join('\n\n')
    })
  }
  
  return logs.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
}

// GET - Check API status and get instructions
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const chatId = searchParams.get('chatId') || DEFAULT_CHAT_ID
  const authCookie = searchParams.get('authCookie')
  const action = searchParams.get('action') || 'test'
  
  if (!authCookie) {
    return NextResponse.json({
      success: false,
      requiresAuth: true,
      instructions: {
        title: 'Authentication Required',
        steps: [
          '1. Open chat.z.ai in your browser and login',
          '2. Open DevTools (F12) > Application > Cookies > chat.z.ai',
          '3. Find the "token" cookie and copy its value',
          '4. Or: DevTools > Network > click request > copy Cookie header',
        ],
        tip: 'The cookie contains a JWT token that looks like: token=eyJhbGci...',
        endpoint: `POST /api/chat-logs/fetch with { authCookie: "...", chatId: "${chatId}", saveToDb: true }`
      }
    })
  }
  
  try {
    // If action is 'list-chats', get all available chats
    if (action === 'list-chats') {
      const response = await fetch('https://chat.z.ai/api/v1/chats', {
        headers: buildHeaders(authCookie)
      })
      
      if (response.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Authentication failed (401). Cookie may be expired.'
        }, { status: 401 })
      }
      
      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `Failed to list chats: ${response.status}`
        }, { status: 500 })
      }
      
      const data = await response.json()
      const chats = (data.data || []).map((chat: any) => ({
        id: chat.id,
        title: chat.title || 'Untitled',
        createdAt: chat.created_at,
        messageCount: chat.childrenIds?.length || 0
      }))
      
      return NextResponse.json({
        success: true,
        chats,
        message: `Found ${chats.length} chats`
      })
    }
    
    // Default: test connection to a specific chat
    const response = await fetch(`${CHAT_API_BASE}/${chatId}`, {
      headers: buildHeaders(authCookie)
    })
    
    if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed (401). Cookie may be expired.',
        hint: 'Get a fresh cookie from your browser. Make sure to include the full Cookie header.'
      }, { status: 401 })
    }
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `API returned ${response.status}: ${response.statusText}`,
        hint: 'Try using a different chat ID or check if the chat exists.'
      }, { status: 500 })
    }
    
    const chatData = await response.json()
    const messageIds = chatData.data?.childrenIds || []
    
    return NextResponse.json({
      success: true,
      chatId,
      title: chatData.data?.title || 'Untitled Chat',
      messageCount: messageIds.length,
      messageIds: messageIds.slice(0, 200),
      hasMore: messageIds.length > 200,
      message: `✅ Connected! Found ${messageIds.length} messages. Click "Fetch All" to import.`
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
      hint: 'Check your network connection and try again.'
    }, { status: 500 })
  }
}

// POST - Fetch messages and save to BOTH ChatLog AND AISession
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      chatId = DEFAULT_CHAT_ID,
      messageIds,
      authCookie,
      autoDiscover = true,
      saveToDb = true
    } = body
    
    if (!authCookie) {
      return NextResponse.json({
        success: false,
        requiresAuth: true,
        error: 'Authentication required. Provide authCookie from browser.',
        instructions: {
          steps: [
            '1. Open chat.z.ai and login',
            '2. DevTools (F12) > Application > Cookies',
            '3. Copy the full Cookie header or just the token value',
          ]
        }
      }, { status: 401 })
    }
    
    // Step 1: Get message IDs if auto-discovering
    let finalMessageIds = messageIds
    
    if (autoDiscover || !messageIds || messageIds.length === 0) {
      const chatInfoResponse = await fetch(`${CHAT_API_BASE}/${chatId}`, {
        headers: buildHeaders(authCookie)
      })
      
      if (chatInfoResponse.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Authentication failed. Cookie expired or invalid.'
        }, { status: 401 })
      }
      
      if (!chatInfoResponse.ok) {
        return NextResponse.json({
          success: false,
          error: `Failed to fetch chat info: ${chatInfoResponse.status}`
        }, { status: 500 })
      }
      
      const chatInfo = await chatInfoResponse.json()
      finalMessageIds = chatInfo.data?.childrenIds || []
      
      if (finalMessageIds.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No messages found in this chat. Try a different chat ID.'
        }, { status: 404 })
      }
    }
    
    // Step 2: Fetch all messages from batch API
    const response = await fetch(`${CHAT_API_BASE}/${chatId}/messages/batch`, {
      method: 'POST',
      headers: buildHeaders(authCookie),
      body: JSON.stringify({ ids: finalMessageIds })
    })
    
    if (response.status === 401) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed during batch fetch.'
      }, { status: 401 })
    }
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Batch API returned ${response.status}`
      }, { status: 500 })
    }
    
    const data = await response.json()
    const messages: ChatMessage[] = Object.values(data.data || {})
    
    // Step 3: Parse into simple logs for ChatLogTab
    const logs = parseMessagesToLogs(messages)
    
    // Step 4: Enhance with AI (optional)
    let enhancedLogs = logs
    if (saveToDb && logs.length > 0) {
      try {
        const zai = await ZAI.create()
        
        enhancedLogs = await Promise.all(logs.map(async (log) => {
          const logMessages = messages.filter(m => {
            const msgDate = new Date(m.timestamp * 1000).toISOString().split('T')[0]
            return msgDate === log.sessionDate
          })
          
          const userContent = logMessages
            .filter(m => m.role === 'user')
            .map(m => m.content)
            .filter(Boolean)
            .join('\n\n')
            .slice(0, 3000)
          
          if (userContent) {
            const completion = await zai.chat.completions.create({
              messages: [
                {
                  role: 'system',
                  content: `Extract key info from this coding session. Return JSON: { "title": "...", "summary": "...", "highlights": [...] }`
                },
                {
                  role: 'user',
                  content: `Request: ${userContent}\n\nFiles: ${log.filesModified.slice(0, 10).join(', ')}`
                }
              ],
              max_tokens: 500,
              response_format: { type: 'json_object' }
            })
            
            try {
              const aiResult = JSON.parse(completion.choices[0]?.message?.content || '{}')
              if (aiResult.title) log.title = aiResult.title
              if (aiResult.summary) log.summary = aiResult.summary
              if (aiResult.highlights) log.highlights = aiResult.highlights
            } catch {}
          }
          
          return log
        }))
      } catch (aiError) {
        console.log('AI enhancement skipped')
      }
    }
    
    // Step 5: Save to BOTH ChatLog AND AISession (unified data model)
    if (saveToDb) {
      // Save to ChatLog (for ChatLogTab display)
      for (const log of enhancedLogs) {
        try {
          await db.chatLog.upsert({
            where: { id: log.id },
            create: {
              id: log.id,
              sessionId: log.id,
              sessionDate: new Date(log.sessionDate),
              title: log.title,
              summary: log.summary,
              issuesSolved: JSON.stringify(log.issuesSolved),
              featuresAdded: JSON.stringify(log.featuresAdded),
              filesModified: JSON.stringify(log.filesModified),
              commits: JSON.stringify(log.commits),
              notes: log.notes,
              source: 'chat-api-auto'
            },
            update: {
              title: log.title,
              summary: log.summary,
              issuesSolved: JSON.stringify(log.issuesSolved),
              featuresAdded: JSON.stringify(log.featuresAdded),
              filesModified: JSON.stringify(log.filesModified),
              notes: log.notes
            }
          })
        } catch (e) {
          console.log('Failed to save ChatLog:', e)
        }
      }
      
      // Save to AISession with full analytics (for Analytics Dashboard)
      try {
        await extractAnalyticsFromBatchResponse(chatId, messages, {
          saveToDb: true,
          enhanceWithAI: false
        })
      } catch (e) {
        console.log('Analytics extraction warning:', e)
      }
    }
    
    return NextResponse.json({
      success: true,
      chatId,
      messageCount: messages.length,
      logsExtracted: enhancedLogs.length,
      logs: enhancedLogs,
      savedTo: saveToDb ? ['ChatLog', 'AISession'] : [],
      message: `✅ Imported ${enhancedLogs.length} sessions from ${messages.length} messages`
    })
    
  } catch (error) {
    console.error('Fetch error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
