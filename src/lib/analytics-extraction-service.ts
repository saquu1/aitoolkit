/**
 * AI CODING ANALYTICS EXTRACTION SERVICE
 * ======================================
 * Extracts comprehensive analytics from chat.z.ai batch API responses
 * 
 * Features:
 * - Token & cost estimation
 * - Issue pattern recognition
 * - Feature implementation tracking
 * - Recurrence detection
 * - AI-powered categorization
 */

import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

// =============================================================================
// TYPES
// =============================================================================

interface ContentBlock {
  type: string
  content: string | any[]
  started_at?: number
  ended_at?: number
  results?: any[]
}

interface ChatMessage {
  id: string
  chat_id: string
  user_id: string
  parent_id: string
  role: 'user' | 'assistant'
  content: string | null
  content_blocks: ContentBlock[] | null
  model?: string
  model_name?: string
  timestamp: number
  created_at: number
}

interface ExtractedToolCall {
  name: string
  args: any
  timestamp: number
}

interface ExtractedIssue {
  type: string
  severity: string
  title: string
  description?: string
  errorMessage?: string
  fileAffected?: string
  lineNumber?: number
  codeSnippet?: string
  resolution?: string
}

interface ExtractedFeature {
  name: string
  type: string
  description?: string
  filesCreated: string[]
  filesModified: string[]
  linesAdded: number
  linesDeleted: number
}

interface SessionAnalytics {
  sessionDate: Date
  startTime: Date
  endTime: Date
  duration: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  model: string
  filesModified: number
  filesCreated: number
  featuresImplemented: number
  issuesResolved: number
  issuesCreated: number
  title: string
  summary: string
  category: string
  tags: string[]
}

// =============================================================================
// MODEL PRICING (per 1k tokens)
// =============================================================================

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'glm-5': { input: 0.001, output: 0.002 },
  'glm-4': { input: 0.002, output: 0.004 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'unknown': { input: 0.003, output: 0.006 } // Default average
}

// ISSUE TYPE PATTERNS
const ISSUE_PATTERNS = {
  typescript: [
    /type ['"](.+?)['"] is (?:not assignable|missing)/i,
    /cannot find (?:name|module) ['"](.+?)['"]/i,
    /property ['"](.+?)['"] does not exist/i,
    /argument of type ['"](.+?)['"]/i,
  ],
  runtime: [
    /cannot read propert(?:y|ies) of (?:undefined|null)/i,
    /is not a function/i,
    /undefined is not/i,
    /referenceerror:/i,
    /typeerror:/i,
  ],
  build: [
    /build failed/i,
    /compilation error/i,
    /module not found/i,
    /cannot resolve/i,
  ],
  auth: [
    /401 unauthorized/i,
    /authentication failed/i,
    /session expired/i,
    /invalid (?:token|credentials)/i,
    /forbidden/i,
  ],
  database: [
    /sqlite error/i,
    /prisma error/i,
    /database connection/i,
    /foreign key constraint/i,
    /unique constraint/i,
  ],
  api: [
    /fetch failed/i,
    /network error/i,
    /api error/i,
    /request timeout/i,
    /cors/i,
  ],
}

// =============================================================================
// MAIN EXTRACTION FUNCTION
// =============================================================================

export async function extractAnalyticsFromBatchResponse(
  chatId: string,
  messages: ChatMessage[],
  options: { 
    saveToDb?: boolean
    enhanceWithAI?: boolean 
  } = {}
): Promise<{
  session: SessionAnalytics
  issues: ExtractedIssue[]
  features: ExtractedFeature[]
  patterns: string[]
}> {
  const { saveToDb = true, enhanceWithAI = true } = options

  console.log(`[EXTRACTION] Starting extraction for chatId: ${chatId}`)
  console.log(`[EXTRACTION] Total messages received: ${messages.length}`)
  
  // Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  
  // Calculate session metrics
  const firstMessage = sortedMessages[0]
  const lastMessage = sortedMessages[sortedMessages.length - 1]
  
  if (!firstMessage || !lastMessage) {
    console.error('[EXTRACTION] No messages found!')
    throw new Error('No messages to extract')
  }
  
  const startTime = new Date(firstMessage.timestamp * 1000)
  const endTime = new Date(lastMessage.timestamp * 1000)
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000) || 1
  
  console.log(`[EXTRACTION] Session time: ${startTime.toISOString()} to ${endTime.toISOString()} (${duration} min)`)
  
  // Get session date
  const sessionDate = new Date(startTime.toISOString().split('T')[0])
  
  // Extract model info
  const model = lastMessage.model || lastMessage.model_name || 'unknown'
  console.log(`[EXTRACTION] Model: ${model}`)
  
  // Extract all tool calls
  const allToolCalls: ExtractedToolCall[] = []
  const allUserContent: string[] = []
  const allReasoning: string[] = []
  
  // LOGGING: Track content_blocks presence
  let messagesWithContentBlocks = 0
  let totalContentBlocks = 0
  let totalToolCallBlocks = 0
  
  for (const msg of sortedMessages) {
    if (msg.role === 'user' && msg.content) {
      allUserContent.push(msg.content)
    }
    
    if (msg.content_blocks) {
      messagesWithContentBlocks++
      totalContentBlocks += msg.content_blocks.length
      
      for (const block of msg.content_blocks) {
        if (block.type === 'tool_calls' && Array.isArray(block.content)) {
          totalToolCallBlocks++
          for (const tc of block.content) {
            if (tc.function) {
              try {
                const args = typeof tc.function.arguments === 'string' 
                  ? JSON.parse(tc.function.arguments) 
                  : tc.function.arguments
                allToolCalls.push({
                  name: tc.function.name,
                  args,
                  timestamp: block.started_at || msg.timestamp
                })
              } catch (parseError) {
                console.error(`[EXTRACTION] Failed to parse tool call args: ${tc.function.name}`, parseError)
              }
            }
          }
        }
        
        if (block.type === 'reasoning' && typeof block.content === 'string') {
          allReasoning.push(block.content)
        }
      }
    }
  }
  
  console.log(`[EXTRACTION] Messages with content_blocks: ${messagesWithContentBlocks}/${sortedMessages.length}`)
  console.log(`[EXTRACTION] Total content_blocks: ${totalContentBlocks}`)
  console.log(`[EXTRACTION] Tool call blocks: ${totalToolCallBlocks}`)
  console.log(`[EXTRACTION] Total tool calls extracted: ${allToolCalls.length}`)
  console.log(`[EXTRACTION] User messages: ${allUserContent.length}, Reasoning blocks: ${allReasoning.length}`)
  
  // Extract files modified/created
  const filesCreated = new Set<string>()
  const filesModified = new Set<string>()
  const commands: string[] = []
  
  // LOGGING: Track tool names
  const toolNameCounts: Record<string, number> = {}
  
  for (const tc of allToolCalls) {
    toolNameCounts[tc.name] = (toolNameCounts[tc.name] || 0) + 1
    if (tc.name === 'Write' && tc.args.filepath) {
      filesCreated.add(tc.args.filepath)
    }
    if (tc.name === 'Edit' && tc.args.filepath) {
      filesModified.add(tc.args.filepath)
    }
    if (tc.name === 'Bash' && tc.args.command) {
      commands.push(tc.args.command)
    }
  }
  
  console.log(`[EXTRACTION] Tool name distribution:`, toolNameCounts)
  console.log(`[EXTRACTION] Files created: ${filesCreated.size}, modified: ${filesModified.size}`)
  console.log(`[EXTRACTION] Commands run: ${commands.length}`)
  
  // Estimate tokens (rough estimation based on content length)
  const totalContent = allUserContent.join('\n') + allReasoning.join('\n')
  const inputTokens = Math.ceil(totalContent.length / 4) // ~4 chars per token
  const outputTokens = Math.ceil(allToolCalls.length * 500 + filesCreated.size * 200 + filesModified.size * 100)
  const totalTokens = inputTokens + outputTokens
  
  console.log(`[EXTRACTION] Token estimation - Input: ${inputTokens}, Output: ${outputTokens}, Total: ${totalTokens}`)
  
  // Calculate cost
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['unknown']
  const estimatedCost = (inputTokens / 1000 * pricing.input) + (outputTokens / 1000 * pricing.output)
  
  // Extract issues from user messages
  const issues = extractIssues(allUserContent, filesModified)
  console.log(`[EXTRACTION] Issues extracted: ${issues.length}`)
  
  // Extract features from tool calls
  const features = extractFeatures(allToolCalls, Array.from(filesCreated), Array.from(filesModified))
  console.log(`[EXTRACTION] Features extracted: ${features.length}`)
  
  // Generate title and summary
  const title = generateTitle(allUserContent[0] || '', Array.from(filesModified))
  const summary = generateSummary(features, issues, allToolCalls.length)
  console.log(`[EXTRACTION] Title: ${title}`)
  
  // Determine category
  const category = determineCategory(allUserContent.join('\n'), features)
  
  // Extract tags
  const tags = extractTags(allUserContent.join('\n'), allReasoning.join('\n'), features)
  
  const session: SessionAnalytics = {
    sessionDate,
    startTime,
    endTime,
    duration,
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
    model,
    filesModified: filesModified.size,
    filesCreated: filesCreated.size,
    featuresImplemented: features.length,
    issuesResolved: issues.filter(i => i.resolution).length,
    issuesCreated: issues.length,
    title,
    summary,
    category,
    tags
  }
  
  // Detect patterns
  const patterns = detectPatterns(issues, allToolCalls)
  
  // Save to database if requested
  if (saveToDb) {
    await saveAnalyticsToDatabase(chatId, session, issues, features, messages)
  }
  
  return { session, issues, features, patterns }
}

// =============================================================================
// ISSUE EXTRACTION
// =============================================================================

function extractIssues(userMessages: string[], filesModified: Set<string>): ExtractedIssue[] {
  const issues: ExtractedIssue[] = []
  
  for (const message of userMessages) {
    const lines = message.split('\n')
    
    for (const line of lines) {
      // Check for error patterns
      for (const [type, patterns] of Object.entries(ISSUE_PATTERNS)) {
        for (const pattern of patterns) {
          if (pattern.test(line)) {
            // Extract error message
            const errorMatch = line.match(/(?:error|exception|failed)[:\s]+(.+)/i)
            const errorMessage = errorMatch ? errorMatch[1] : line.slice(0, 200)
            
            // Determine severity
            let severity = 'medium'
            if (line.toLowerCase().includes('critical') || line.toLowerCase().includes('fatal')) {
              severity = 'critical'
            } else if (line.toLowerCase().includes('error')) {
              severity = 'high'
            } else if (line.toLowerCase().includes('warning')) {
              severity = 'low'
            }
            
            // Check if resolved in this session
            const resolution = findResolution(message, filesModified)
            
            issues.push({
              type,
              severity,
              title: errorMessage.slice(0, 100),
              description: line.slice(0, 500),
              errorMessage,
              resolution
            })
            break
          }
        }
      }
    }
  }
  
  return deduplicateIssues(issues)
}

function findResolution(message: string, filesModified: Set<string>): string | undefined {
  const resolutionPatterns = [
    /fixed (?:by|with|:)\s*(.+)/i,
    /resolved\s+(.+)/i,
    /solution:\s*(.+)/i,
    /now working/i,
  ]
  
  for (const pattern of resolutionPatterns) {
    const match = message.match(pattern)
    if (match) {
      return match[1] || 'Fixed in session'
    }
  }
  
  if (filesModified.size > 0 && message.toLowerCase().includes('fixed')) {
    return `Modified ${filesModified.size} files`
  }
  
  return undefined
}

function deduplicateIssues(issues: ExtractedIssue[]): ExtractedIssue[] {
  const seen = new Map<string, ExtractedIssue>()
  
  for (const issue of issues) {
    const key = `${issue.type}:${issue.title.slice(0, 50)}`
    if (!seen.has(key)) {
      seen.set(key, issue)
    }
  }
  
  return Array.from(seen.values())
}

// =============================================================================
// FEATURE EXTRACTION
// =============================================================================

function extractFeatures(
  toolCalls: ExtractedToolCall[],
  filesCreated: string[],
  filesModified: string[]
): ExtractedFeature[] {
  const features: ExtractedFeature[] = []
  const featureMap = new Map<string, ExtractedFeature>()
  
  // Group by feature from file paths
  for (const file of filesCreated) {
    const featureName = extractFeatureName(file)
    if (featureName) {
      const existing = featureMap.get(featureName)
      if (existing) {
        existing.filesCreated.push(file)
      } else {
        featureMap.set(featureName, {
          name: featureName,
          type: determineFeatureType(file),
          description: `Created ${file.split('/').pop()}`,
          filesCreated: [file],
          filesModified: [],
          linesAdded: 0,
          linesDeleted: 0
        })
      }
    }
  }
  
  // Add modified files to features
  for (const file of filesModified) {
    const featureName = extractFeatureName(file)
    if (featureName) {
      const existing = featureMap.get(featureName)
      if (existing) {
        existing.filesModified.push(file)
      } else {
        featureMap.set(featureName, {
          name: featureName,
          type: determineFeatureType(file),
          description: `Modified ${file.split('/').pop()}`,
          filesCreated: [],
          filesModified: [file],
          linesAdded: 0,
          linesDeleted: 0
        })
      }
    }
  }
  
  return Array.from(featureMap.values())
}

function extractFeatureName(filepath: string): string | null {
  const parts = filepath.split('/')
  const filename = parts[parts.length - 1]
  
  // Extract feature name from filename
  if (filename.includes('Tab.')) {
    return filename.replace('Tab.tsx', '').replace('Tab.ts', '').replace('.', ' ')
  }
  if (filename.includes('Modal.')) {
    return filename.replace('Modal.tsx', '').replace('.', ' ') + ' Modal'
  }
  if (filename.includes('route.ts')) {
    const routeName = parts[parts.length - 2] || 'API'
    return `${routeName} API`
  }
  if (filename.endsWith('.tsx') || filename.endsWith('.ts')) {
    return filename.replace(/\.(tsx?|jsx?)$/, '')
  }
  
  return null
}

function determineFeatureType(filepath: string): string {
  if (filepath.includes('/components/')) return 'component'
  if (filepath.includes('/app/api/')) return 'api'
  if (filepath.includes('/pages/') || filepath.includes('/app/')) return 'page'
  if (filepath.includes('/hooks/')) return 'hook'
  if (filepath.includes('/lib/')) return 'util'
  if (filepath.includes('.test.') || filepath.includes('.spec.')) return 'test'
  return 'util'
}

// =============================================================================
// PATTERN DETECTION
// =============================================================================

function detectPatterns(issues: ExtractedIssue[], toolCalls: ExtractedToolCall[]): string[] {
  const patterns: string[] = []
  
  // Check for recurring issue types
  const issueTypes = issues.map(i => i.type)
  const typeCounts = issueTypes.reduce((acc, t) => {
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count >= 2) {
      patterns.push(`recurring_${type}_issues:${count}`)
    }
  }
  
  // Check for repeated file modifications
  const filesModified = toolCalls
    .filter(tc => tc.name === 'Edit')
    .map(tc => tc.args.filepath)
  
  const fileCounts = filesModified.reduce((acc, f) => {
    if (f) {
      acc[f] = (acc[f] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)
  
  for (const [file, count] of Object.entries(fileCounts)) {
    if (count >= 3) {
      patterns.push(`frequent_file_modification:${file}:${count}`)
    }
  }
  
  return patterns
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateTitle(firstUserMessage: string, filesModified: string[]): string {
  const content = firstUserMessage.toLowerCase()
  
  // Check for specific patterns
  if (content.includes('api') && content.includes('management')) return 'API Management Feature'
  if (content.includes('modal') || content.includes('popup')) return 'Modal/Popup Component'
  if (content.includes('cleanup') || content.includes('thread')) return 'System Cleanup'
  if (content.includes('auth') || content.includes('login')) return 'Authentication Update'
  if (content.includes('chat log') || content.includes('session')) return 'Chat Log Feature'
  if (content.includes('analytics') || content.includes('tracking')) return 'Analytics Feature'
  if (content.includes('fix') || content.includes('bug')) return 'Bug Fix Session'
  if (content.includes('implement') || content.includes('add')) return 'Feature Implementation'
  
  // Use first line if reasonable
  const firstLine = firstUserMessage.split('\n')[0]
  if (firstLine.length > 10 && firstLine.length < 100) {
    return firstLine.slice(0, 60) + (firstLine.length > 60 ? '...' : '')
  }
  
  // Use file names
  if (filesModified.length > 0) {
    const mainFile = filesModified[0].split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '')
    return mainFile ? `Update ${mainFile}` : 'Development Session'
  }
  
  return 'Development Session'
}

function generateSummary(features: ExtractedFeature[], issues: ExtractedIssue[], toolCallCount: number): string {
  const parts: string[] = []
  
  if (features.length > 0) {
    parts.push(`${features.length} features implemented`)
  }
  
  if (issues.length > 0) {
    const resolved = issues.filter(i => i.resolution).length
    parts.push(`${resolved}/${issues.length} issues resolved`)
  }
  
  parts.push(`${toolCallCount} operations performed`)
  
  return parts.join(', ')
}

function determineCategory(userContent: string, features: ExtractedFeature[]): string {
  const content = userContent.toLowerCase()
  
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

function extractTags(userContent: string, reasoning: string, features: ExtractedFeature[]): string[] {
  const tags: Set<string> = new Set()
  const content = (userContent + ' ' + reasoning).toLowerCase()
  
  // Technology tags
  if (content.includes('typescript') || content.includes('.ts')) tags.add('typescript')
  if (content.includes('react') || content.includes('.tsx')) tags.add('react')
  if (content.includes('next.js') || content.includes('nextjs')) tags.add('nextjs')
  if (content.includes('prisma')) tags.add('prisma')
  if (content.includes('api')) tags.add('api')
  if (content.includes('database') || content.includes('sql')) tags.add('database')
  if (content.includes('auth')) tags.add('authentication')
  if (content.includes('modal') || content.includes('popup')) tags.add('ui')
  
  // Feature type tags
  for (const feature of features) {
    if (feature.type === 'api') tags.add('api-development')
    if (feature.type === 'component') tags.add('component')
    if (feature.type === 'page') tags.add('page')
    if (feature.type === 'hook') tags.add('hooks')
  }
  
  return Array.from(tags)
}

// =============================================================================
// DATABASE PERSISTENCE (OPTIMIZED WITH BATCHED WRITES)
// =============================================================================

async function saveAnalyticsToDatabase(
  chatId: string,
  session: SessionAnalytics,
  issues: ExtractedIssue[],
  features: ExtractedFeature[],
  messages: ChatMessage[],
  allToolCalls?: ExtractedToolCall[]
): Promise<void> {
  const startTime = Date.now()
  console.log(`[DB] Starting database save for chatId: ${chatId}`)
  console.log(`[DB] Session: ${session.title}, Files: ${session.filesModified} modified, ${session.filesCreated} created`)
  console.log(`[DB] Issues: ${issues.length}, Features: ${features.length}`)
  console.log(`[DB] Messages to process: ${messages.length}`)
  
  try {
    // Create or update session
    console.log(`[DB] Creating/updating AISession...`)
    const sessionRecord = await db.aISession.upsert({
      where: { chatId },
      create: {
        chatId,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
        totalTokens: session.totalTokens,
        estimatedCost: session.estimatedCost,
        model: session.model,
        category: session.category,
        tags: JSON.stringify(session.tags),
        filesModified: session.filesModified,
        filesCreated: session.filesCreated,
        featuresImplemented: session.featuresImplemented,
        issuesResolved: session.issuesResolved,
        issuesCreated: session.issuesCreated,
        title: session.title,
        summary: session.summary,
        status: 'completed'
      },
      update: {
        endTime: session.endTime,
        duration: session.duration,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
        totalTokens: session.totalTokens,
        estimatedCost: session.estimatedCost,
        filesModified: session.filesModified,
        filesCreated: session.filesCreated,
        featuresImplemented: session.featuresImplemented,
        issuesResolved: session.issuesResolved,
        issuesCreated: session.issuesCreated,
        title: session.title,
        summary: session.summary,
        updatedAt: new Date()
      }
    })
    console.log(`[DB] ✅ AISession saved with id: ${sessionRecord.id}`)
    
    // ==========================================================================
    // SAVE CONTENT BLOCKS (Layer 3) - BATCHED
    // ==========================================================================
    console.log(`[DB] Preparing content blocks batch...`)
    let blockIndex = 0
    const contentBlocksData: any[] = []
    
    for (const msg of messages) {
      if (!msg.content_blocks) continue
      
      for (const block of msg.content_blocks) {
        const blockType = mapBlockType(block.type)
        const content = typeof block.content === 'string' 
          ? block.content 
          : JSON.stringify(block.content)
        
        // Analyze reasoning blocks for patterns
        let containsError = false
        let containsDecision = false
        let containsBacktrack = false
        let confidenceLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | null = null
        const errorKeywords: string[] = []
        const decisionKeywords: string[] = []
        const strategyChanges: string[] = []
        
        if (block.type === 'reasoning' && typeof block.content === 'string') {
          const text = block.content.toLowerCase()
          
          // Error detection
          if (text.includes('error') || text.includes('failed') || text.includes('wrong') || text.includes('bug')) {
            containsError = true
            errorKeywords.push(...extractKeywords(block.content, ['error', 'failed', 'wrong', 'bug']))
          }
          
          // Decision detection
          if (text.includes('let me') || text.includes('i need to') || text.includes('i should')) {
            containsDecision = true
            decisionKeywords.push(...extractKeywords(block.content, ['let me', 'i need to', 'i should', 'the issue is']))
          }
          
          // Backtrack detection
          if (text.includes('instead') || text.includes('actually') || text.includes('better approach')) {
            containsBacktrack = true
            strategyChanges.push(...extractKeywords(block.content, ['instead', 'actually', 'better approach', 'wait']))
          }
          
          // Confidence detection
          if (text.includes('definitely') || text.includes('certainly')) {
            confidenceLevel = 'VERY_HIGH'
          } else if (text.includes('should work') || text.includes('likely')) {
            confidenceLevel = 'HIGH'
          } else if (text.includes('might') || text.includes('possibly')) {
            confidenceLevel = 'MEDIUM'
          } else if (text.includes('maybe') || text.includes('uncertain')) {
            confidenceLevel = 'LOW'
          }
        }
        
        contentBlocksData.push({
          sessionId: sessionRecord.id,
          blockIndex: blockIndex++,
          blockType,
          content: content.slice(0, 50000), // Limit content size
          contentLength: content.length,
          startedAt: block.started_at ? new Date(block.started_at * 1000) : null,
          endedAt: block.ended_at ? new Date(block.ended_at * 1000) : null,
          durationMs: block.started_at && block.ended_at 
            ? (block.ended_at - block.started_at) * 1000 
            : null,
          containsError,
          containsDecision,
          containsBacktrack,
          confidenceLevel,
          keywords: JSON.stringify([...new Set([...errorKeywords, ...decisionKeywords, ...strategyChanges])]),
          errorKeywords: JSON.stringify(errorKeywords),
          decisionKeywords: JSON.stringify(decisionKeywords),
          strategyChanges: JSON.stringify(strategyChanges)
        })
      }
    }
    
    // Batch insert content blocks
    if (contentBlocksData.length > 0) {
      await db.contentBlock.createMany({ data: contentBlocksData, skipDuplicates: true })
    }
    console.log(`[DB] ✅ ContentBlocks saved: ${contentBlocksData.length}`)
    
    // ==========================================================================
    // SAVE TOOL CALLS (Layer 4) - BATCHED
    // ==========================================================================
    console.log(`[DB] Preparing tool calls batch...`)
    const fileOpMap = new Map<string, { created: boolean; modified: boolean; read: boolean; linesAdded: number; linesDeleted: number; editCount: number; errorCount: number }>()
    const toolCallsData: any[] = []
    
    for (const msg of messages) {
      if (!msg.content_blocks) continue
      
      for (const block of msg.content_blocks) {
        if (block.type !== 'tool_calls' || !Array.isArray(block.content)) continue
        
        for (const tc of block.content) {
          if (!tc.function) continue
          
          const toolName = mapToolName(tc.function.name)
          let args: any = {}
          try {
            args = typeof tc.function.arguments === 'string' 
              ? JSON.parse(tc.function.arguments) 
              : tc.function.arguments || {}
          } catch {
            args = {}
          }
          
          // Find result for this tool call
          const result = block.results?.find((r: any) => r.tool_call_id === tc.id)
          const resultContent = result?.content?.slice(0, 10000) || null
          const resultStatus = result?.status || 'completed'
          const hasError = resultStatus === 'error' || (resultContent?.toLowerCase().includes('error') ?? false)
          
          // Extract error message if any
          let errorMessage: string | null = null
          if (hasError && resultContent) {
            const errorMatch = resultContent.match(/error[:\s]+([^\n]+)/i)
            if (errorMatch) errorMessage = errorMatch[1].slice(0, 500)
          }
          
          // Determine operation flags
          const command = toolName === 'BASH' && args.command ? args.command : null
          const isGitOperation = command ? /\bgit\s+(commit|push|pull|branch|merge)/i.test(command) : false
          const isBuildCommand = command ? /\b(build|compile|npm\s+run\s+build|bun\s+run\s+build)/i.test(command) : false
          const isTestCommand = command ? /\b(test|jest|vitest|npm\s+test)/i.test(command) : false
          const isServerCommand = command ? /\b(dev|start|serve|npm\s+run\s+dev)/i.test(command) : false
          
          const filepath = args.filepath || null
          const oldContent = args.old_str || null
          const newContent = args.new_str || args.content || null
          
          // Track file operations
          if (filepath) {
            const existing = fileOpMap.get(filepath) || { 
              created: false, modified: false, read: false, 
              linesAdded: 0, linesDeleted: 0, editCount: 0, errorCount: 0 
            }
            
            if (toolName === 'WRITE') {
              existing.created = true
              existing.linesAdded += (newContent?.split('\n').length || 0)
            }
            if (toolName === 'EDIT') {
              existing.modified = true
              existing.linesAdded += (newContent?.split('\n').length || 0)
              existing.linesDeleted += (oldContent?.split('\n').length || 0)
              existing.editCount++
            }
            if (toolName === 'READ') {
              existing.read = true
            }
            if (hasError) {
              existing.errorCount++
            }
            
            fileOpMap.set(filepath, existing)
          }
          
          toolCallsData.push({
            sessionId: sessionRecord.id,
            externalCallId: tc.id,
            toolName,
            description: args.description || null,
            command: command?.slice(0, 5000) || null,
            filepath,
            oldContent: oldContent?.slice(0, 50000) || null,
            newContent: newContent?.slice(0, 50000) || null,
            resultContent,
            resultStatus,
            startedAt: block.started_at ? new Date(block.started_at * 1000) : null,
            endedAt: block.ended_at ? new Date(block.ended_at * 1000) : null,
            durationMs: block.started_at && block.ended_at 
              ? (block.ended_at - block.started_at) * 1000 
              : null,
            isGitOperation,
            isBuildCommand,
            isTestCommand,
            isServerCommand,
            hasError,
            errorMessage
          })
        }
      }
    }
    
    // Batch insert tool calls
    if (toolCallsData.length > 0) {
      await db.toolCall.createMany({ data: toolCallsData, skipDuplicates: true })
    }
    console.log(`[DB] ✅ ToolCalls saved: ${toolCallsData.length}`)
    
    // ==========================================================================
    // SAVE FILE OPERATIONS (Layer 5) - BATCHED
    // ==========================================================================
    console.log(`[DB] Preparing file operations batch...`)
    const fileOpsData: any[] = []
    for (const [filepath, ops] of fileOpMap) {
      const fileType = extractFileType(filepath)
      const fileCategory = categorizeFile(filepath)
      const operation = ops.created ? 'CREATED' : ops.modified ? 'MODIFIED' : ops.read ? 'READ' : 'MODIFIED'
      
      fileOpsData.push({
        sessionId: sessionRecord.id,
        filepath,
        operation,
        linesAdded: ops.linesAdded,
        linesRemoved: ops.linesDeleted,
        netLines: ops.linesAdded - ops.linesDeleted,
        fileType,
        fileCategory,
        errorCount: ops.errorCount,
        editCount: ops.editCount
      })
    }
    
    if (fileOpsData.length > 0) {
      await db.fileOperation.createMany({ data: fileOpsData, skipDuplicates: true })
    }
    console.log(`[DB] ✅ FileOperations saved: ${fileOpsData.length}`)
    
    // ==========================================================================
    // SAVE ISSUES - BATCHED
    // ==========================================================================
    console.log(`[DB] Preparing issues batch...`)
    const issuesData = issues.map(issue => ({
      sessionId: sessionRecord.id,
      issueType: issue.type,
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      errorMessage: issue.errorMessage,
      fileAffected: issue.fileAffected,
      lineNumber: issue.lineNumber,
      codeSnippet: issue.codeSnippet,
      resolution: issue.resolution,
      resolvedBy: issue.resolution ? 'ai' : undefined,
      resolvedAt: issue.resolution ? new Date() : undefined,
      status: issue.resolution ? 'RESOLVED' : 'DETECTED'
    }))
    
    if (issuesData.length > 0) {
      await db.aIIssue.createMany({ data: issuesData, skipDuplicates: true })
    }
    console.log(`[DB] ✅ Issues saved: ${issuesData.length}`)
    
    // ==========================================================================
    // SAVE FEATURES - BATCHED
    // ==========================================================================
    console.log(`[DB] Preparing features batch...`)
    const featuresData = features.map(feature => ({
      sessionId: sessionRecord.id,
      featureName: feature.name,
      featureType: feature.type,
      description: feature.description,
      filesCreated: JSON.stringify(feature.filesCreated),
      filesModified: JSON.stringify(feature.filesModified),
      linesAdded: feature.linesAdded,
      linesDeleted: feature.linesDeleted
    }))
    
    if (featuresData.length > 0) {
      await db.aIFeature.createMany({ data: featuresData, skipDuplicates: true })
    }
    console.log(`[DB] ✅ Features saved: ${featuresData.length}`)
    
    // ==========================================================================
    // SAVE COST RECORD
    // ==========================================================================
    console.log(`[DB] Saving cost record...`)
    await db.aICostRecord.create({
      data: {
        sessionId: sessionRecord.id,
        date: session.sessionDate,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
        totalCost: session.estimatedCost,
        model: session.model,
        linesOfCodeGenerated: session.filesCreated * 50, // Estimate
        featuresImplemented: session.featuresImplemented,
        issuesResolved: session.issuesResolved
      }
    })
    console.log(`[DB] ✅ CostRecord saved`)
    
    // ==========================================================================
    // SAVE MESSAGE RECORDS
    // ==========================================================================
    console.log(`[DB] Saving message records...`)
    const messageRecords = messages.slice(0, 100).map(msg => ({
      sessionId: sessionRecord.id,
      messageId: msg.id,
      role: msg.role,
      content: msg.content?.slice(0, 2000),
      hasReasoning: msg.content_blocks?.some(b => b.type === 'reasoning') || false,
      hasToolCalls: msg.content_blocks?.some(b => b.type === 'tool_calls') || false,
      hasText: msg.content_blocks?.some(b => b.type === 'text') || false,
      toolCallCount: msg.content_blocks?.filter(b => b.type === 'tool_calls')
        .reduce((acc, b) => acc + (Array.isArray(b.content) ? b.content.length : 0), 0) || 0,
      timestamp: new Date(msg.timestamp * 1000)
    }))
    
    await db.aIMessageRecord.createMany({
      data: messageRecords,
      skipDuplicates: true
    })
    console.log(`[DB] ✅ MessageRecords saved: ${messageRecords.length}`)
    
    const elapsed = Date.now() - startTime
    console.log(`[DB] ========== EXTRACTION COMPLETE (${elapsed}ms) ==========`)
    console.log(`[DB] Session: ${sessionRecord.id}`)
    console.log(`[DB] ContentBlocks: ${contentBlocksData.length}, ToolCalls: ${toolCallsData.length}, FileOps: ${fileOpsData.length}`)
    console.log(`[DB] Issues: ${issuesData.length}, Features: ${featuresData.length}`)
    
  } catch (error) {
    console.error('[DB] ❌ Failed to save analytics to database:', error)
    console.error('[DB] Error stack:', error instanceof Error ? error.stack : 'Unknown')
    throw error
  }
}

// =============================================================================
// HELPER FUNCTIONS FOR NEW MODELS
// =============================================================================

function mapBlockType(type: string): 'REASONING' | 'TEXT' | 'TOOL_CALLS' {
  switch (type?.toLowerCase()) {
    case 'reasoning': return 'REASONING'
    case 'text': return 'TEXT'
    case 'tool_calls': return 'TOOL_CALLS'
    default: return 'TEXT'
  }
}

function mapToolName(name: string): 'BASH' | 'WRITE' | 'READ' | 'EDIT' | 'TODO_WRITE' | 'OTHER' {
  switch (name?.toLowerCase()) {
    case 'bash': return 'BASH'
    case 'write': return 'WRITE'
    case 'read': return 'READ'
    case 'edit': return 'EDIT'
    case 'todowrite': return 'TODO_WRITE'
    default: return 'OTHER'
  }
}

function extractKeywords(text: string, triggers: string[]): string[] {
  const keywords: string[] = []
  const lowerText = text.toLowerCase()
  
  for (const trigger of triggers) {
    const index = lowerText.indexOf(trigger)
    if (index !== -1) {
      // Extract surrounding context (up to 50 chars after trigger)
      const start = Math.max(0, index - 10)
      const end = Math.min(text.length, index + trigger.length + 50)
      keywords.push(text.slice(start, end).trim())
    }
  }
  
  return keywords
}

function extractFileType(filepath: string): string {
  const ext = filepath.split('.').pop()?.toLowerCase() || ''
  return ext
}

function categorizeFile(filepath: string): 'API_ROUTE' | 'PAGE' | 'COMPONENT' | 'SERVICE' | 'HOOK' | 'UTILITY' | 'TYPE_DEFINITION' | 'CONFIG' | 'TEST' | 'SCHEMA' | 'STYLE' | 'OTHER' {
  const path = filepath.toLowerCase()
  
  if (path.includes('/api/') || path.includes('/routes/')) return 'API_ROUTE'
  if (path.includes('/app/') && path.includes('/page.')) return 'PAGE'
  if (path.includes('/components/')) return 'COMPONENT'
  if (path.includes('/services/') || path.includes('/lib/')) return 'SERVICE'
  if (path.includes('/hooks/')) return 'HOOK'
  if (path.includes('/utils/') || path.includes('/helpers/')) return 'UTILITY'
  if (path.endsWith('.d.ts') || path.includes('/types/')) return 'TYPE_DEFINITION'
  if (path.includes('.config.') || path.includes('/config/')) return 'CONFIG'
  if (path.includes('.test.') || path.includes('.spec.') || path.includes('/__tests__/')) return 'TEST'
  if (path.endsWith('.prisma') || path.includes('/prisma/')) return 'SCHEMA'
  if (path.endsWith('.css') || path.endsWith('.scss') || path.endsWith('.less')) return 'STYLE'
  
  return 'OTHER'
}

// =============================================================================
// ANALYTICS QUERIES
// =============================================================================

export async function getAnalyticsOverview(startDate?: Date, endDate?: Date) {
  const where: any = {}
  if (startDate || endDate) {
    where.sessionDate = {}
    if (startDate) where.sessionDate.gte = startDate
    if (endDate) where.sessionDate.lte = endDate
  }
  
  const sessions = await db.aISession.findMany({
    where,
    include: {
      issues: true,
      features: true,
      costs: true
    }
  })
  
  const totalSessions = sessions.length
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0)
  const totalCost = sessions.reduce((sum, s) => sum + s.estimatedCost, 0)
  const totalIssues = sessions.reduce((sum, s) => sum + s.issuesCreated, 0)
  const resolvedIssues = sessions.reduce((sum, s) => sum + s.issuesResolved, 0)
  const totalFeatures = sessions.reduce((sum, s) => sum + s.featuresImplemented, 0)
  const avgDuration = sessions.length > 0 
    ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length 
    : 0
  
  // Model distribution
  const modelDistribution: Record<string, number> = {}
  for (const session of sessions) {
    modelDistribution[session.model] = (modelDistribution[session.model] || 0) + 1
  }
  
  // Category distribution
  const categoryDistribution: Record<string, number> = {}
  for (const session of sessions) {
    categoryDistribution[session.category] = (categoryDistribution[session.category] || 0) + 1
  }
  
  // Issue type distribution
  const allIssues = sessions.flatMap(s => s.issues)
  const issueTypeDistribution: Record<string, number> = {}
  for (const issue of allIssues) {
    issueTypeDistribution[issue.issueType] = (issueTypeDistribution[issue.issueType] || 0) + 1
  }
  
  return {
    totalSessions,
    totalTokens,
    totalCost,
    totalIssues,
    resolvedIssues,
    totalFeatures,
    avgDuration,
    modelDistribution,
    categoryDistribution,
    issueTypeDistribution,
    sessions: sessions.slice(0, 50) // Recent 50
  }
}

export async function getRecurringPatterns() {
  // Find issues that appear multiple times
  const issues = await db.aIIssue.groupBy({
    by: ['title', 'issueType'],
    _count: {
      id: true
    },
    having: {
      id: {
        _count: {
          gte: 2
        }
      }
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 20
  })
  
  return issues.map(i => ({
    title: i.title,
    type: i.issueType,
    count: i._count.id
  }))
}

export async function getCostAnalysis(startDate?: Date, endDate?: Date) {
  const where: any = {}
  if (startDate || endDate) {
    where.date = {}
    if (startDate) where.date.gte = startDate
    if (endDate) where.date.lte = endDate
  }
  
  const costs = await db.aICostRecord.findMany({
    where,
    orderBy: { date: 'desc' }
  })
  
  const totalCost = costs.reduce((sum, c) => sum + c.totalCost, 0)
  const totalTokens = costs.reduce((sum, c) => sum + c.inputTokens + c.outputTokens, 0)
  const avgCostPerSession = costs.length > 0 ? totalCost / costs.length : 0
  
  // Cost by model
  const costByModel: Record<string, number> = {}
  for (const cost of costs) {
    costByModel[cost.model] = (costByModel[cost.model] || 0) + cost.totalCost
  }
  
  // Daily cost trend
  const dailyCosts: Record<string, number> = {}
  for (const cost of costs) {
    const dateKey = cost.date.toISOString().split('T')[0]
    dailyCosts[dateKey] = (dailyCosts[dateKey] || 0) + cost.totalCost
  }
  
  return {
    totalCost,
    totalTokens,
    avgCostPerSession,
    costByModel,
    dailyCosts,
    records: costs.slice(0, 100)
  }
}
