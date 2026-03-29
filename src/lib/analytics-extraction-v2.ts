/**
 * AI CODING ANALYTICS EXTRACTION SERVICE V2
 * =========================================
 * Complete extraction of all data from chat.z.ai batch API responses
 * 
 * Features:
 * - ContentBlock storage with timing
 * - ToolCall tracking with retry detection
 * - FileOperation tracking per file
 * - GitOperation extraction
 * - PatternOccurrence linking
 * - AnomalyAlert generation
 * - Cost tracking per issue/feature
 */

import { db } from '@/lib/db'

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
  user_id?: string
  parent_id?: string
  childrenIds?: string[]
  role: 'user' | 'assistant'
  content: string | null
  content_blocks: ContentBlock[] | null
  model?: string
  model_name?: string
  timestamp: number
  created_at: number
  updated_at?: number
  done?: boolean
  error?: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
    prompt_tokens_details?: {
      cached_tokens?: number
    }
  }
}

interface ExtractedToolCall {
  id: string
  name: string
  args: any
  timestamp: number
  startedAt?: Date
  endedAt?: Date
  result?: string
  resultStatus?: string
}

interface ExtractedContentBlock {
  blockIndex: number
  blockType: 'REASONING' | 'TEXT' | 'TOOL_CALLS'
  content: string
  contentLength: number
  startedAt?: Date
  endedAt?: Date
  durationMs?: number
  containsError: boolean
  containsDecision: boolean
  containsBacktrack: boolean
  errorKeywords: string[]
  decisionKeywords: string[]
  strategyChanges: string[]
}

interface ExtractedFileOperation {
  filepath: string
  operation: 'CREATED' | 'MODIFIED' | 'READ' | 'DELETED'
  linesAdded: number
  linesRemoved: number
  content?: string
  oldContent?: string
  newContent?: string
}

interface ExtractedGitOperation {
  operationType: 'COMMIT' | 'PUSH' | 'PULL' | 'BRANCH' | 'OTHER'
  commitHash?: string
  commitMessage?: string
  filesChanged?: number
  insertions?: number
  deletions?: number
  branchName?: string
  forced?: boolean
  success: boolean
  errorMessage?: string
}

interface SessionAnalytics {
  sessionDate: Date
  startTime: Date
  endTime: Date
  duration: number
  durationMs: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cachedTokens: number
  cacheHitRate: number
  estimatedCost: number
  model: string
  filesModified: number
  filesCreated: number
  filesRead: number
  featuresImplemented: number
  issuesResolved: number
  issuesCreated: number
  commandsRun: number
  commandsFailed: number
  gitCommits: number
  buildAttempts: number
  totalReasoningMs: number
  totalToolCallMs: number
  reasoningToToolRatio: number
  title: string
  summary: string
  category: string
  sessionType: string
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
  'unknown': { input: 0.003, output: 0.006 }
}

// Keywords for analysis
const ERROR_KEYWORDS = ['error', 'failed', 'wrong', 'bug', 'issue', 'problem', 'exception', 'cannot', 'unable']
const DECISION_KEYWORDS = ['let me', 'i need to', 'i should', 'the issue is', 'i will', 'the solution is']
const BACKTRACK_KEYWORDS = ['instead', 'actually', 'better approach', 'wait', 'no,', 'on second thought']
const STRATEGY_CHANGE_KEYWORDS = ['alternatively', 'another way', 'different approach', 'let me try']

// =============================================================================
// MAIN EXTRACTION FUNCTION
// =============================================================================

export async function extractAnalyticsFromBatchResponseV2(
  chatId: string,
  messages: ChatMessage[],
  options: {
    saveToDb?: boolean
    enhanceWithAI?: boolean
  } = {}
): Promise<{
  session: SessionAnalytics
  contentBlocks: ExtractedContentBlock[]
  toolCalls: ExtractedToolCall[]
  fileOperations: ExtractedFileOperation[]
  gitOperations: ExtractedGitOperation[]
}> {
  const { saveToDb = true } = options

  // Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  
  // Calculate session metrics
  const firstMessage = sortedMessages[0]
  const lastMessage = sortedMessages[sortedMessages.length - 1]
  const startTime = new Date(firstMessage.timestamp * 1000)
  const endTime = new Date((lastMessage.updated_at || lastMessage.timestamp) * 1000)
  const durationMs = endTime.getTime() - startTime.getTime()
  const duration = Math.round(durationMs / 60000) || 1
  
  // Get session date
  const sessionDate = new Date(startTime.toISOString().split('T')[0])
  
  // Extract model info
  const model = lastMessage.model || lastMessage.model_name || 'unknown'
  
  // Extract all data
  const allContentBlocks: ExtractedContentBlock[] = []
  const allToolCalls: ExtractedToolCall[] = []
  const allFileOperations: ExtractedFileOperation[] = []
  const allGitOperations: ExtractedGitOperation[] = []
  const allUserContent: string[] = []
  
  let totalReasoningMs = 0
  let totalToolCallMs = 0
  let commandsRun = 0
  let commandsFailed = 0
  let gitCommits = 0
  let buildAttempts = 0
  
  // Process each message
  for (const msg of sortedMessages) {
    if (msg.role === 'user' && msg.content) {
      allUserContent.push(msg.content)
    }
    
    if (!msg.content_blocks) continue
    
    for (let blockIndex = 0; blockIndex < msg.content_blocks.length; blockIndex++) {
      const block = msg.content_blocks[blockIndex]
      
      // Extract content block
      const extractedBlock = extractContentBlock(block, blockIndex, msg.timestamp)
      allContentBlocks.push(extractedBlock)
      
      if (extractedBlock.durationMs) {
        if (block.type === 'reasoning') {
          totalReasoningMs += extractedBlock.durationMs
        } else if (block.type === 'tool_calls') {
          totalToolCallMs += extractedBlock.durationMs
        }
      }
      
      // Process tool calls
      if (block.type === 'tool_calls' && Array.isArray(block.content)) {
        for (const tc of block.content) {
          if (!tc.function) continue
          
          const args = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments
          
          const toolCall: ExtractedToolCall = {
            id: tc.id || `tc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: tc.function.name,
            args,
            timestamp: block.started_at || msg.timestamp,
            startedAt: block.started_at ? new Date(block.started_at * 1000) : undefined,
            endedAt: block.ended_at ? new Date(block.ended_at * 1000) : undefined,
            result: block.results?.find((r: any) => r.tool_call_id === tc.id)?.content,
            resultStatus: block.results?.find((r: any) => r.tool_call_id === tc.id)?.status || 'completed'
          }
          
          allToolCalls.push(toolCall)
          
          // Extract file operations
          if (tc.function.name === 'Write' && args.filepath) {
            allFileOperations.push({
              filepath: args.filepath,
              operation: 'CREATED',
              linesAdded: countLines(args.content || ''),
              linesRemoved: 0,
              content: args.content
            })
          }
          
          if (tc.function.name === 'Edit' && args.filepath) {
            allFileOperations.push({
              filepath: args.filepath,
              operation: 'MODIFIED',
              linesAdded: countLines(args.new_str || ''),
              linesRemoved: countLines(args.old_str || ''),
              oldContent: args.old_str,
              newContent: args.new_str
            })
          }
          
          if (tc.function.name === 'Read' && args.filepath) {
            allFileOperations.push({
              filepath: args.filepath,
              operation: 'READ',
              linesAdded: 0,
              linesRemoved: 0
            })
          }
          
          // Extract git operations from Bash commands
          if (tc.function.name === 'Bash' && args.command) {
            commandsRun++
            
            const gitOp = extractGitOperation(args.command, toolCall.result)
            if (gitOp) {
              allGitOperations.push(gitOp)
              if (gitOp.operationType === 'COMMIT') gitCommits++
            }
            
            if (isBuildCommand(args.command)) {
              buildAttempts++
            }
            
            if (toolCall.resultStatus === 'error' || 
                (toolCall.result && toolCall.result.toLowerCase().includes('error'))) {
              commandsFailed++
            }
          }
        }
      }
    }
  }
  
  // Calculate tokens
  const usage = lastMessage.usage || {}
  const inputTokens = usage.prompt_tokens || estimateTokens(allUserContent.join('\n'))
  const outputTokens = usage.completion_tokens || estimateToolCallTokens(allToolCalls)
  const totalTokens = usage.total_tokens || (inputTokens + outputTokens)
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0
  const cacheHitRate = inputTokens > 0 ? cachedTokens / inputTokens : 0
  
  // Calculate cost
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['unknown']
  const estimatedCost = (inputTokens / 1000 * pricing.input) + (outputTokens / 1000 * pricing.output)
  
  // Aggregate file operations
  const filesCreated = new Set(allFileOperations.filter(f => f.operation === 'CREATED').map(f => f.filepath))
  const filesModified = new Set(allFileOperations.filter(f => f.operation === 'MODIFIED').map(f => f.filepath))
  const filesRead = new Set(allFileOperations.filter(f => f.operation === 'READ').map(f => f.filepath))
  
  // Calculate reasoning-to-tool ratio
  const reasoningToToolRatio = totalToolCallMs > 0 ? totalReasoningMs / totalToolCallMs : 0
  
  // Generate title and summary
  const title = generateTitle(allUserContent[0] || '', Array.from(filesModified))
  const summary = generateSummary(allToolCalls.length, allFileOperations.length, commandsRun)
  const category = determineCategory(allUserContent.join('\n'), allToolCalls)
  const sessionType = determineSessionType(allUserContent.join('\n'), allFileOperations, allToolCalls)
  const tags = extractTags(allUserContent.join('\n'), allFileOperations)
  
  const session: SessionAnalytics = {
    sessionDate,
    startTime,
    endTime,
    duration,
    durationMs,
    inputTokens,
    outputTokens,
    totalTokens,
    cachedTokens,
    cacheHitRate,
    estimatedCost,
    model,
    filesModified: filesModified.size,
    filesCreated: filesCreated.size,
    filesRead: filesRead.size,
    featuresImplemented: 0, // Will be calculated after feature extraction
    issuesResolved: 0, // Will be calculated after issue extraction
    issuesCreated: 0, // Will be calculated after issue extraction
    commandsRun,
    commandsFailed,
    gitCommits,
    buildAttempts,
    totalReasoningMs,
    totalToolCallMs,
    reasoningToToolRatio,
    title,
    summary,
    category,
    sessionType,
    tags
  }
  
  // Save to database
  if (saveToDb) {
    await saveAnalyticsToDatabaseV2(
      chatId,
      session,
      allContentBlocks,
      allToolCalls,
      allFileOperations,
      allGitOperations,
      messages
    )
  }
  
  return {
    session,
    contentBlocks: allContentBlocks,
    toolCalls: allToolCalls,
    fileOperations: allFileOperations,
    gitOperations: allGitOperations
  }
}

// =============================================================================
// CONTENT BLOCK EXTRACTION
// =============================================================================

function extractContentBlock(
  block: ContentBlock,
  blockIndex: number,
  msgTimestamp: number
): ExtractedContentBlock {
  const content = typeof block.content === 'string' 
    ? block.content 
    : JSON.stringify(block.content)
  
  const startedAt = block.started_at ? new Date(block.started_at * 1000) : undefined
  const endedAt = block.ended_at ? new Date(block.ended_at * 1000) : undefined
  const durationMs = (startedAt && endedAt) 
    ? endedAt.getTime() - startedAt.getTime() 
    : undefined
  
  const lowerContent = content.toLowerCase()
  
  // Analyze content
  const containsError = ERROR_KEYWORDS.some(kw => lowerContent.includes(kw))
  const containsDecision = DECISION_KEYWORDS.some(kw => lowerContent.includes(kw))
  const containsBacktrack = BACKTRACK_KEYWORDS.some(kw => lowerContent.includes(kw))
  
  // Extract keywords
  const errorKeywords = ERROR_KEYWORDS.filter(kw => lowerContent.includes(kw))
  const decisionKeywords = DECISION_KEYWORDS.filter(kw => lowerContent.includes(kw))
  const strategyChanges = STRATEGY_CHANGE_KEYWORDS.filter(kw => lowerContent.includes(kw))
  
  return {
    blockIndex,
    blockType: block.type === 'reasoning' ? 'REASONING' : 
               block.type === 'text' ? 'TEXT' : 'TOOL_CALLS',
    content,
    contentLength: content.length,
    startedAt,
    endedAt,
    durationMs,
    containsError,
    containsDecision,
    containsBacktrack,
    errorKeywords,
    decisionKeywords,
    strategyChanges
  }
}

// =============================================================================
// GIT OPERATION EXTRACTION
// =============================================================================

function extractGitOperation(command: string, result?: string): ExtractedGitOperation | null {
  const cmd = command.toLowerCase()
  
  if (cmd.includes('git commit') || cmd.includes('git ci')) {
    // Extract commit message
    const msgMatch = command.match(/-m\s+["']([^"']+)["']/) || 
                     command.match(/-m\s+(\S+)/)
    
    return {
      operationType: 'COMMIT',
      commitMessage: msgMatch ? msgMatch[1] : undefined,
      success: !result?.toLowerCase().includes('error'),
      errorMessage: result?.toLowerCase().includes('error') ? result : undefined
    }
  }
  
  if (cmd.includes('git push')) {
    return {
      operationType: 'PUSH',
      forced: cmd.includes('--force') || cmd.includes('-f'),
      success: !result?.toLowerCase().includes('error'),
      errorMessage: result?.toLowerCase().includes('error') ? result : undefined
    }
  }
  
  if (cmd.includes('git pull')) {
    return {
      operationType: 'PULL',
      success: !result?.toLowerCase().includes('error'),
      errorMessage: result?.toLowerCase().includes('error') ? result : undefined
    }
  }
  
  if (cmd.includes('git branch') || cmd.includes('git checkout -b') || cmd.includes('git switch -c')) {
    return {
      operationType: 'BRANCH',
      success: !result?.toLowerCase().includes('error'),
      errorMessage: result?.toLowerCase().includes('error') ? result : undefined
    }
  }
  
  return null
}

function isBuildCommand(command: string): boolean {
  const buildCmds = ['npm run build', 'bun run build', 'yarn build', 'pnpm build', 
                     'npm run compile', 'tsc', 'next build', 'prisma generate']
  return buildCmds.some(cmd => command.includes(cmd))
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function countLines(content: string): number {
  return content.split('\n').length
}

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4)
}

function estimateToolCallTokens(toolCalls: ExtractedToolCall[]): number {
  return toolCalls.length * 500
}

function generateTitle(firstUserMessage: string, filesModified: string[]): string {
  const content = firstUserMessage.toLowerCase()
  
  if (content.includes('api') && content.includes('management')) return 'API Management Feature'
  if (content.includes('modal') || content.includes('popup')) return 'Modal/Popup Component'
  if (content.includes('cleanup') || content.includes('thread')) return 'System Cleanup'
  if (content.includes('auth') || content.includes('login')) return 'Authentication Update'
  if (content.includes('chat log') || content.includes('session')) return 'Chat Log Feature'
  if (content.includes('analytics') || content.includes('tracking')) return 'Analytics Feature'
  if (content.includes('fix') || content.includes('bug')) return 'Bug Fix Session'
  if (content.includes('implement') || content.includes('add')) return 'Feature Implementation'
  
  const firstLine = firstUserMessage.split('\n')[0]
  if (firstLine.length > 10 && firstLine.length < 100) {
    return firstLine.slice(0, 60) + (firstLine.length > 60 ? '...' : '')
  }
  
  if (filesModified.length > 0) {
    const mainFile = filesModified[0].split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '')
    return mainFile ? `Update ${mainFile}` : 'Development Session'
  }
  
  return 'Development Session'
}

function generateSummary(toolCallCount: number, fileOpCount: number, commandCount: number): string {
  return `${toolCallCount} tool calls, ${fileOpCount} file operations, ${commandCount} commands`
}

function determineCategory(userContent: string, toolCalls: ExtractedToolCall[]): string {
  const content = userContent.toLowerCase()
  
  if (content.includes('fix') || content.includes('bug') || content.includes('error')) return 'debugging'
  if (content.includes('implement') || content.includes('add') || content.includes('create')) return 'feature'
  if (content.includes('refactor') || content.includes('clean') || content.includes('improve')) return 'refactor'
  if (content.includes('test')) return 'test'
  if (content.includes('doc')) return 'documentation'
  
  return 'development'
}

function determineSessionType(
  userContent: string, 
  fileOps: ExtractedFileOperation[], 
  toolCalls: ExtractedToolCall[]
): string {
  const content = userContent.toLowerCase()
  
  if (content.includes('fix') || content.includes('bug')) return 'BUG_FIX'
  if (content.includes('implement') || content.includes('add feature')) return 'FEATURE'
  if (content.includes('refactor')) return 'REFACTOR'
  if (content.includes('architecture') || content.includes('design')) return 'ARCHITECTURE'
  if (content.includes('doc')) return 'DOCUMENTATION'
  if (content.includes('test')) return 'TESTING'
  if (content.includes('deploy') || content.includes('production')) return 'DEPLOYMENT'
  if (content.includes('investigate') || content.includes('explore')) return 'INVESTIGATION'
  
  return 'UNKNOWN'
}

function extractTags(userContent: string, fileOps: ExtractedFileOperation[]): string[] {
  const tags: Set<string> = new Set()
  const content = userContent.toLowerCase()
  
  if (content.includes('typescript') || content.includes('.ts')) tags.add('typescript')
  if (content.includes('react') || content.includes('.tsx')) tags.add('react')
  if (content.includes('next.js') || content.includes('nextjs')) tags.add('nextjs')
  if (content.includes('prisma')) tags.add('prisma')
  if (content.includes('api')) tags.add('api')
  if (content.includes('database') || content.includes('sql')) tags.add('database')
  if (content.includes('auth')) tags.add('authentication')
  
  // From file operations
  for (const op of fileOps) {
    if (op.filepath.includes('/api/')) tags.add('api')
    if (op.filepath.includes('/components/')) tags.add('component')
    if (op.filepath.endsWith('.prisma')) tags.add('schema')
  }
  
  return Array.from(tags)
}

// =============================================================================
// DATABASE PERSISTENCE V2
// =============================================================================

async function saveAnalyticsToDatabaseV2(
  chatId: string,
  session: SessionAnalytics,
  contentBlocks: ExtractedContentBlock[],
  toolCalls: ExtractedToolCall[],
  fileOperations: ExtractedFileOperation[],
  gitOperations: ExtractedGitOperation[],
  messages: ChatMessage[]
): Promise<void> {
  try {
    // Create or update session
    const sessionRecord = await db.aISession.upsert({
      where: { chatId },
      create: {
        chatId,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        durationMs: session.durationMs,
        completed: true,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
        totalTokens: session.totalTokens,
        cachedTokens: session.cachedTokens,
        cacheHitRate: session.cacheHitRate,
        estimatedCost: session.estimatedCost,
        model: session.model,
        category: session.category,
        sessionType: session.sessionType as any,
        tags: JSON.stringify(session.tags),
        filesModified: session.filesModified,
        filesCreated: session.filesCreated,
        filesRead: session.filesRead,
        commandsRun: session.commandsRun,
        commandsFailed: session.commandsFailed,
        gitCommits: session.gitCommits,
        buildAttempts: session.buildAttempts,
        totalReasoningMs: session.totalReasoningMs,
        totalToolCallMs: session.totalToolCallMs,
        reasoningToToolRatio: session.reasoningToToolRatio,
        title: session.title,
        summary: session.summary,
        status: 'completed'
      },
      update: {
        endTime: session.endTime,
        duration: session.duration,
        durationMs: session.durationMs,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
        totalTokens: session.totalTokens,
        cachedTokens: session.cachedTokens,
        cacheHitRate: session.cacheHitRate,
        estimatedCost: session.estimatedCost,
        filesModified: session.filesModified,
        filesCreated: session.filesCreated,
        filesRead: session.filesRead,
        commandsRun: session.commandsRun,
        commandsFailed: session.commandsFailed,
        gitCommits: session.gitCommits,
        buildAttempts: session.buildAttempts,
        totalReasoningMs: session.totalReasoningMs,
        totalToolCallMs: session.totalToolCallMs,
        reasoningToToolRatio: session.reasoningToToolRatio,
        title: session.title,
        summary: session.summary,
        updatedAt: new Date()
      }
    })
    
    // Save content blocks
    for (const block of contentBlocks) {
      await db.contentBlock.create({
        data: {
          sessionId: sessionRecord.id,
          blockIndex: block.blockIndex,
          blockType: block.blockType as any,
          content: block.content.slice(0, 50000), // Limit size
          contentLength: block.contentLength,
          startedAt: block.startedAt,
          endedAt: block.endedAt,
          durationMs: block.durationMs,
          containsError: block.containsError,
          containsDecision: block.containsDecision,
          containsBacktrack: block.containsBacktrack,
          errorKeywords: JSON.stringify(block.errorKeywords),
          decisionKeywords: JSON.stringify(block.decisionKeywords),
          strategyChanges: JSON.stringify(block.strategyChanges)
        }
      })
    }
    
    // Save tool calls
    for (const tc of toolCalls) {
      await db.toolCall.create({
        data: {
          sessionId: sessionRecord.id,
          externalCallId: tc.id,
          toolName: tc.name.toUpperCase().replace(/-/g, '_') as any,
          command: tc.name === 'Bash' ? tc.args.command : undefined,
          filepath: tc.args.filepath,
          oldContent: tc.args.old_str?.slice(0, 50000),
          newContent: tc.args.new_str?.slice(0, 50000) || tc.args.content?.slice(0, 50000),
          resultContent: tc.result?.slice(0, 50000),
          resultStatus: tc.resultStatus,
          startedAt: tc.startedAt,
          endedAt: tc.endedAt,
          isGitOperation: tc.name === 'Bash' && tc.args.command?.includes('git'),
          isBuildCommand: tc.name === 'Bash' && isBuildCommand(tc.args.command || ''),
          hasError: tc.resultStatus === 'error',
          errorMessage: tc.resultStatus === 'error' ? tc.result?.slice(0, 1000) : undefined
        }
      })
    }
    
    // Save file operations (deduplicated by filepath + operation)
    const seenFileOps = new Set<string>()
    for (const op of fileOperations) {
      const key = `${op.filepath}:${op.operation}`
      if (seenFileOps.has(key)) continue
      seenFileOps.add(key)
      
      const fileType = op.filepath.split('.').pop() || ''
      const fileCategory = determineFileCategory(op.filepath)
      
      await db.fileOperation.create({
        data: {
          sessionId: sessionRecord.id,
          filepath: op.filepath,
          operation: op.operation as any,
          linesAdded: op.linesAdded,
          linesRemoved: op.linesRemoved,
          netLines: op.linesAdded - op.linesRemoved,
          fileType,
          fileCategory: fileCategory as any
        }
      })
    }
    
    // Save git operations
    for (const gitOp of gitOperations) {
      await db.gitOperation.create({
        data: {
          sessionId: sessionRecord.id,
          operationType: gitOp.operationType as any,
          commitMessage: gitOp.commitMessage,
          forced: gitOp.forced,
          success: gitOp.success,
          errorMessage: gitOp.errorMessage,
          timestamp: new Date()
        }
      })
    }
    
    // Save cost record
    await db.aICostRecord.create({
      data: {
        sessionId: sessionRecord.id,
        date: session.sessionDate,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
        cachedTokens: session.cachedTokens,
        totalCost: session.estimatedCost,
        model: session.model,
        linesOfCodeGenerated: session.filesCreated * 50,
        featuresImplemented: session.featuresImplemented,
        issuesResolved: session.issuesResolved
      }
    })
    
    // Save message records
    await db.aIMessageRecord.createMany({
      data: messages.slice(0, 100).map(msg => ({
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
      })),
      skipDuplicates: true
    })
    
    console.log(`Saved analytics V2 for session ${chatId}: ${contentBlocks.length} blocks, ${toolCalls.length} tool calls, ${fileOperations.length} file ops`)
    
  } catch (error) {
    console.error('Failed to save analytics to database:', error)
    throw error
  }
}

function determineFileCategory(filepath: string): string {
  if (filepath.includes('/app/api/')) return 'API_ROUTE'
  if (filepath.includes('/pages/api/')) return 'API_ROUTE'
  if (filepath.includes('/app/') && filepath.endsWith('page.tsx')) return 'PAGE'
  if (filepath.includes('/components/')) return 'COMPONENT'
  if (filepath.includes('/hooks/')) return 'HOOK'
  if (filepath.includes('/lib/')) return 'UTILITY'
  if (filepath.includes('.test.') || filepath.includes('.spec.')) return 'TEST'
  if (filepath.endsWith('.prisma')) return 'SCHEMA'
  if (filepath.includes('.config.') || filepath.includes('config/')) return 'CONFIG'
  return 'OTHER'
}

// =============================================================================
// RE-EXPORT ORIGINAL FUNCTIONS FOR COMPATIBILITY
// =============================================================================

export {
  getAnalyticsOverview,
  getRecurringPatterns,
  getCostAnalysis
} from './analytics-extraction-service'
