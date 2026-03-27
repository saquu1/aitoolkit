/**
 * EXTRACTION UTILITIES
 * ====================
 * Comprehensive data extraction from raw AI chat session data
 * Targets 100% coverage for all analytics categories
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ExtractedSessionData {
  // Session Level (100%)
  chatId: string
  sessionDate: Date
  startTime: Date
  endTime?: Date
  duration: number
  durationMs: number
  model: string
  modelName: string
  sessionType: string
  category: string
  tags: string[]
  title: string
  summary: string
  highlights: string[]
  status: string
  completed: boolean
  error?: string

  // Token Metrics (100%)
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cachedTokens: number
  cacheHitRate: number
  reasoningTokens: number
  estimatedCost: number

  // Message Counts (100%)
  totalMessages: number
  userMessages: number
  assistantMessages: number
  messageRatio: number

  // Thread Structure (100%)
  parentMessageId?: string
  childMessageIds: string[]
  messageIndex: number
  externalId?: string

  // Timing Analysis (100%)
  totalReasoningMs: number
  totalToolCallMs: number
  reasoningToToolRatio: number

  // Command Metrics (100%)
  commandsRun: number
  commandsFailed: number
  gitCommits: number
  buildAttempts: number

  // Version Control (100%)
  pageVersion?: string
  gitCommitHash?: string
  gitBranch?: string

  // Code Metrics (100%)
  linesAdded: number
  linesDeleted: number
  linesOfCode: number
  complexityScore: number

  // Quality Scores (100%)
  efficiencyScore: number
  qualityScore: number

  // File Metrics
  filesModified: number
  filesCreated: number
  filesRead: number
}

export interface ExtractedContentBlock {
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
  confidenceLevel?: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
  keywords: string[]
  errorKeywords: string[]
  decisionKeywords: string[]
  strategyChanges: string[]
}

export interface ExtractedToolCall {
  externalCallId?: string
  toolName: 'BASH' | 'WRITE' | 'READ' | 'EDIT' | 'TODO_WRITE' | 'OTHER'
  description?: string
  command?: string
  filepath?: string
  oldContent?: string
  newContent?: string
  resultContent?: string
  resultStatus?: string
  startedAt?: Date
  endedAt?: Date
  durationMs?: number
  isGitOperation: boolean
  isBuildCommand: boolean
  isFileOperation: boolean
  isReadOperation: boolean
  isWriteOperation: boolean
  isEditOperation: boolean
  isTodoWrite: boolean
  isDangerous: boolean
  arguments: Record<string, any>
  result?: string
}

export interface ExtractedFileOperation {
  filepath: string
  operation: 'CREATED' | 'MODIFIED' | 'READ' | 'DELETED'
  linesAdded: number
  linesRemoved: number
  netLines: number
  contentHash?: string
  contentSize: number
  fileType?: string
  fileCategory?: string
  errorCount: number
  editCount: number
  tokensConsumed: number
  costUSD: number
}

export interface ExtractedIssue {
  issueType: string
  severity: string
  title: string
  description?: string
  category: string
  tags: string[]
  fileAffected?: string
  lineNumber?: number
  codeSnippet?: string
  errorMessage?: string
  filesInvolved: string[]
  resolution?: string
  resolutionTime: number
  resolutionTimeMs: number
  attemptsToFix: number
  resolvedBy: string
  status: string
  isRepeat: boolean
  recurrenceCount: number
  rootCause?: string
  preventionTips: string[]
  relatedIssues: string[]
  confidenceLevel?: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
}

export interface ExtractedFeature {
  featureName: string
  featureType: string
  description?: string
  category: string
  tags: string[]
  module?: string
  complexity: string
  filesCreated: string[]
  filesModified: string[]
  linesAdded: number
  linesDeleted: number
  linesOfCode: number
  developmentTime: number
  developmentTimeMs: number
  complexityScore: number
  testCoverage: number
  tokensConsumed: number
  costUSD: number
  hasTests: boolean
  hasDocs: boolean
  reviewStatus: string
  dependencies: string[]
  dependents: string[]
}

// =============================================================================
// EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extract comprehensive session data from raw JSON
 */
export function extractSessionData(rawJson: string | object, chatLog?: any): ExtractedSessionData {
  const data = typeof rawJson === 'string' ? safeParseJson(rawJson) : rawJson
  const messages = extractMessages(data)
  
  // Token metrics - extract from raw data
  const tokenMetrics = extractTokenMetrics(data, messages)
  
  // Timing analysis
  const timingData = extractTimingData(data, messages)
  
  // Thread structure
  const threadData = extractThreadStructure(data, messages)
  
  // Command metrics
  const commandMetrics = extractCommandMetrics(messages)
  
  // Version control
  const versionControl = extractVersionControl(messages)
  
  // Code metrics
  const codeMetrics = extractCodeMetrics(messages)
  
  // Message counts
  const userMsgs = messages.filter((m: any) => m.role === 'user').length
  const assistantMsgs = messages.filter((m: any) => m.role === 'assistant').length
  const totalMsgs = messages.length
  
  // Quality scores
  const qualityScores = calculateQualityScores({
    ...tokenMetrics,
    ...timingData,
    ...commandMetrics,
    ...codeMetrics,
    totalMessages: totalMsgs,
    userMessages: userMsgs,
    assistantMessages: assistantMsgs
  })
  
  // Extract session info
  const firstMessage = messages[0]
  const lastMessage = messages[messages.length - 1]
  const sessionDate = chatLog?.sessionDate ? new Date(chatLog.sessionDate) : new Date()
  
  return {
    // Session Level
    chatId: chatLog?.sessionId || extractChatId(data) || generateId(),
    sessionDate,
    startTime: timingData.startTime || sessionDate,
    endTime: timingData.endTime,
    duration: timingData.duration,
    durationMs: timingData.durationMs,
    model: detectModel(data, messages),
    modelName: detectModelName(data, messages),
    sessionType: detectSessionType(chatLog?.title || '', messages),
    category: detectCategory(chatLog?.title || '', chatLog?.summary || '', messages),
    tags: extractTags(messages),
    title: chatLog?.title || extractTitle(messages),
    summary: chatLog?.summary || generateSummary(messages),
    highlights: extractHighlights(messages),
    status: 'completed',
    completed: true,
    error: undefined,

    // Token Metrics
    ...tokenMetrics,

    // Message Counts
    totalMessages: totalMsgs,
    userMessages: userMsgs,
    assistantMessages: assistantMsgs,
    messageRatio: userMsgs > 0 ? assistantMsgs / userMsgs : 0,

    // Thread Structure
    ...threadData,

    // Timing Analysis
    ...timingData,

    // Command Metrics
    ...commandMetrics,

    // Version Control
    ...versionControl,

    // Code Metrics
    ...codeMetrics,

    // Quality Scores
    ...qualityScores,

    // File Metrics
    filesModified: codeMetrics.filesModified,
    filesCreated: codeMetrics.filesCreated,
    filesRead: codeMetrics.filesRead
  }
}

/**
 * Extract all content blocks from messages
 */
export function extractContentBlocks(messages: any[]): ExtractedContentBlock[] {
  const blocks: ExtractedContentBlock[] = []
  let blockIndex = 0
  
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    
    const contentBlocks = message.content_blocks || []
    for (const block of contentBlocks) {
      const blockType = mapBlockType(block.type)
      const content = extractBlockContent(block)
      
      blocks.push({
        blockIndex: blockIndex++,
        blockType,
        content,
        contentLength: content.length,
        startedAt: block.started_at ? new Date(block.started_at * 1000) : undefined,
        endedAt: block.ended_at ? new Date(block.ended_at * 1000) : undefined,
        durationMs: calculateDurationMs(block.started_at, block.ended_at),
        containsError: detectError(content),
        containsDecision: detectDecision(content),
        containsBacktrack: detectBacktrack(content),
        confidenceLevel: assessConfidence(content, blockType),
        keywords: extractKeywords(content),
        errorKeywords: extractErrorKeywords(content),
        decisionKeywords: extractDecisionKeywords(content),
        strategyChanges: extractStrategyChanges(content)
      })
    }
  }
  
  return blocks
}

/**
 * Extract all tool calls from messages
 */
export function extractToolCalls(messages: any[]): ExtractedToolCall[] {
  const toolCalls: ExtractedToolCall[] = []
  
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    
    const contentBlocks = message.content_blocks || []
    for (const block of contentBlocks) {
      if (block.type !== 'tool_calls') continue
      
      const calls = block.content || []
      for (const call of calls) {
        const fn = call.function || {}
        const args = safeParseJson(fn.arguments) || {}
        
        toolCalls.push({
          externalCallId: call.id,
          toolName: mapToolName(fn.name),
          description: generateToolDescription(fn.name, args),
          command: args.command,
          filepath: args.filepath,
          oldContent: args.old_str,
          newContent: args.new_str || args.content,
          resultContent: call.result?.content,
          resultStatus: call.result?.status || (call.error ? 'error' : 'completed'),
          startedAt: call.started_at ? new Date(call.started_at * 1000) : undefined,
          endedAt: call.ended_at ? new Date(call.ended_at * 1000) : undefined,
          durationMs: calculateDurationMs(call.started_at, call.ended_at),
          isGitOperation: isGitOperation(args.command),
          isBuildCommand: isBuildCommand(args.command),
          isFileOperation: ['Write', 'Edit', 'Read'].includes(fn.name),
          isReadOperation: fn.name === 'Read',
          isWriteOperation: fn.name === 'Write',
          isEditOperation: fn.name === 'Edit',
          isTodoWrite: fn.name === 'TodoWrite',
          isDangerous: isDangerousCommand(args.command),
          arguments: args,
          result: call.result?.content
        })
      }
    }
  }
  
  return toolCalls
}

/**
 * Extract all file operations from tool calls
 */
export function extractFileOperations(toolCalls: ExtractedToolCall[]): ExtractedFileOperation[] {
  const fileOps: ExtractedFileOperation[] = []
  const fileMap = new Map<string, ExtractedFileOperation>()
  
  for (const tc of toolCalls) {
    if (!tc.filepath) continue
    
    const existing = fileMap.get(tc.filepath)
    const linesAdded = tc.newContent ? tc.newContent.split('\n').length : 0
    const linesRemoved = tc.oldContent ? tc.oldContent.split('\n').length : 0
    
    if (existing) {
      // Update existing
      existing.linesAdded += linesAdded
      existing.linesRemoved += linesRemoved
      existing.netLines = existing.linesAdded - existing.linesRemoved
      existing.editCount++
      existing.contentSize += tc.newContent?.length || 0
      existing.tokensConsumed += estimateTokens(tc.newContent || '')
      
      // Update operation type
      if (tc.toolName === 'WRITE' && existing.operation === 'READ') {
        existing.operation = 'CREATED'
      } else if (tc.toolName === 'EDIT') {
        existing.operation = 'MODIFIED'
      }
    } else {
      // Create new
      fileMap.set(tc.filepath, {
        filepath: tc.filepath,
        operation: tc.toolName === 'WRITE' ? 'CREATED' : tc.toolName === 'EDIT' ? 'MODIFIED' : 'READ',
        linesAdded,
        linesRemoved,
        netLines: linesAdded - linesRemoved,
        contentHash: undefined,
        contentSize: tc.newContent?.length || 0,
        fileType: extractFileType(tc.filepath),
        fileCategory: categorizeFile(tc.filepath),
        errorCount: tc.resultStatus === 'error' ? 1 : 0,
        editCount: 1,
        tokensConsumed: estimateTokens(tc.newContent || ''),
        costUSD: 0 // Will be calculated later
      })
    }
  }
  
  return Array.from(fileMap.values())
}

/**
 * Extract issues with full details
 */
export function extractIssuesWithDetails(
  issuesText: string[],
  messages: any[],
  toolCalls: ExtractedToolCall[]
): ExtractedIssue[] {
  const issues: ExtractedIssue[] = []
  
  for (const issueText of issuesText) {
    if (!issueText || typeof issueText !== 'string') continue
    
    const relatedTools = findRelatedTools(issueText, toolCalls)
    const filesInvolved = relatedTools.map(t => t.filepath).filter(Boolean) as string[]
    
    issues.push({
      issueType: classifyIssueType(issueText),
      severity: assessSeverity(issueText),
      title: issueText.slice(0, 200),
      description: issueText,
      category: categorizeIssue(issueText),
      tags: extractIssueTags(issueText),
      fileAffected: filesInvolved[0],
      lineNumber: extractLineNumber(issueText),
      codeSnippet: extractCodeSnippet(issueText),
      errorMessage: extractErrorMessage(issueText),
      filesInvolved,
      resolution: 'Fixed during session',
      resolutionTime: 0,
      resolutionTimeMs: 0,
      attemptsToFix: countAttempts(issueText, messages),
      resolvedBy: 'ai',
      status: 'resolved',
      isRepeat: false,
      recurrenceCount: 0,
      rootCause: inferRootCause(issueText),
      preventionTips: generatePreventionTips(issueText),
      relatedIssues: [],
      confidenceLevel: assessIssueConfidence(issueText, filesInvolved)
    })
  }
  
  return issues
}

/**
 * Extract features with full details
 */
export function extractFeaturesWithDetails(
  featuresText: string[],
  toolCalls: ExtractedToolCall[],
  fileOps: ExtractedFileOperation[]
): ExtractedFeature[] {
  const features: ExtractedFeature[] = []
  
  for (const featureText of featuresText) {
    if (!featureText || typeof featureText !== 'string') continue
    
    const relatedFiles = findRelatedFiles(featureText, fileOps)
    const relatedToolCalls = findRelatedTools(featureText, toolCalls)
    
    const linesAdded = relatedFiles.reduce((sum, f) => sum + f.linesAdded, 0)
    const linesDeleted = relatedFiles.reduce((sum, f) => sum + f.linesRemoved, 0)
    
    features.push({
      featureName: featureText.slice(0, 100),
      featureType: classifyFeatureType(featureText),
      description: featureText,
      category: categorizeFeature(featureText),
      tags: extractFeatureTags(featureText),
      module: inferModule(featureText, relatedFiles),
      complexity: assessComplexity(linesAdded, relatedFiles.length),
      filesCreated: relatedFiles.filter(f => f.operation === 'CREATED').map(f => f.filepath),
      filesModified: relatedFiles.filter(f => f.operation === 'MODIFIED').map(f => f.filepath),
      linesAdded,
      linesDeleted,
      linesOfCode: linesAdded - linesDeleted,
      developmentTime: 0,
      developmentTimeMs: 0,
      complexityScore: calculateComplexityScore(linesAdded, relatedFiles.length),
      testCoverage: 0,
      tokensConsumed: relatedFiles.reduce((sum, f) => sum + f.tokensConsumed, 0),
      costUSD: 0,
      hasTests: relatedFiles.some(f => f.filepath?.includes('.test.') || f.filepath?.includes('.spec.')),
      hasDocs: checkForDocs(featureText, relatedFiles),
      reviewStatus: 'pending',
      dependencies: extractDependencies(relatedToolCalls),
      dependents: []
    })
  }
  
  return features
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function safeParseJson(str: string | undefined | null): any {
  if (!str) return {}
  try {
    return JSON.parse(str)
  } catch {
    return {}
  }
}

function extractMessages(data: any): any[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (data.messages && Array.isArray(data.messages)) return data.messages
  if (data.data && typeof data.data === 'object') {
    return Object.values(data.data)
  }
  return []
}

function extractChatId(data: any): string | undefined {
  return data?.chat_id || data?.chatId || data?.id || data?.conversation_id
}

function generateId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function extractTokenMetrics(data: any, messages: any[]): {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cachedTokens: number
  cacheHitRate: number
  reasoningTokens: number
  estimatedCost: number
} {
  // Try to extract from usage data
  const usage = data?.usage || data?.token_usage || {}
  let inputTokens = usage.input_tokens || usage.prompt_tokens || 0
  let outputTokens = usage.output_tokens || usage.completion_tokens || 0
  let cachedTokens = usage.cached_tokens || 0
  let reasoningTokens = usage.reasoning_tokens || 0
  
  // If not available, estimate from content
  if (!inputTokens && !outputTokens) {
    const totalContent = messages.map((m: any) => {
      const blocks = m.content_blocks || []
      return blocks.map((b: any) => b.content || '').join('')
    }).join('')
    
    const estimated = estimateTokens(totalContent)
    inputTokens = Math.round(estimated * 0.7)
    outputTokens = Math.round(estimated * 0.3)
  }
  
  const totalTokens = inputTokens + outputTokens
  const cacheHitRate = inputTokens > 0 ? cachedTokens / inputTokens : 0
  const estimatedCost = calculateCost(inputTokens, outputTokens, detectModel(data, messages))
  
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    cachedTokens,
    cacheHitRate,
    reasoningTokens,
    estimatedCost
  }
}

function extractTimingData(data: any, messages: any[]): {
  startTime: Date
  endTime?: Date
  duration: number
  durationMs: number
  totalReasoningMs: number
  totalToolCallMs: number
  reasoningToToolRatio: number
} {
  const timestamps: number[] = []
  let totalReasoningMs = 0
  let totalToolCallMs = 0
  
  for (const msg of messages) {
    const ts = msg.timestamp || msg.created_at || msg.created_at_unix
    if (ts) timestamps.push(typeof ts === 'number' ? ts : Date.parse(ts) / 1000)
    
    // Extract timing from content blocks
    const blocks = msg.content_blocks || []
    for (const block of blocks) {
      const durationMs = calculateDurationMs(block.started_at, block.ended_at)
      if (block.type === 'reasoning') {
        totalReasoningMs += durationMs
      } else if (block.type === 'tool_calls') {
        totalToolCallMs += durationMs
      }
    }
  }
  
  timestamps.sort((a, b) => a - b)
  
  const startTime = timestamps.length > 0 ? new Date(timestamps[0] * 1000) : new Date()
  const endTime = timestamps.length > 1 ? new Date(timestamps[timestamps.length - 1] * 1000) : undefined
  const durationMs = endTime ? endTime.getTime() - startTime.getTime() : 0
  const duration = Math.round(durationMs / 60000) // minutes
  const reasoningToToolRatio = totalToolCallMs > 0 ? totalReasoningMs / totalToolCallMs : 0
  
  return {
    startTime,
    endTime,
    duration,
    durationMs,
    totalReasoningMs,
    totalToolCallMs,
    reasoningToToolRatio
  }
}

function extractThreadStructure(data: any, messages: any[]): {
  parentMessageId?: string
  childMessageIds: string[]
  messageIndex: number
  externalId?: string
} {
  const messageIds: string[] = []
  let parentMessageId: string | undefined
  let externalId: string | undefined
  
  for (const msg of messages) {
    const id = msg.id || msg.message_id || msg.uuid
    if (id) {
      messageIds.push(id)
      if (!externalId) externalId = id
    }
    if (msg.parent_id || msg.parent_message_id) {
      parentMessageId = msg.parent_id || msg.parent_message_id
    }
  }
  
  return {
    parentMessageId,
    childMessageIds: messageIds.slice(1), // All except first
    messageIndex: 0,
    externalId
  }
}

function extractCommandMetrics(messages: any[]): {
  commandsRun: number
  commandsFailed: number
  gitCommits: number
  buildAttempts: number
} {
  let commandsRun = 0
  let commandsFailed = 0
  let gitCommits = 0
  let buildAttempts = 0
  
  for (const msg of messages) {
    const blocks = msg.content_blocks || []
    for (const block of blocks) {
      if (block.type !== 'tool_calls') continue
      const calls = block.content || []
      for (const call of calls) {
        const fn = call.function || {}
        if (fn.name === 'Bash') {
          commandsRun++
          if (call.error || call.result?.status === 'error') {
            commandsFailed++
          }
          const cmd = fn.arguments?.command || ''
          if (cmd.includes('git commit') || cmd.includes('git push')) {
            gitCommits++
          }
          if (cmd.includes('npm run build') || cmd.includes('yarn build') || cmd.includes('next build')) {
            buildAttempts++
          }
        }
      }
    }
  }
  
  return { commandsRun, commandsFailed, gitCommits, buildAttempts }
}

function extractVersionControl(messages: any[]): {
  pageVersion?: string
  gitCommitHash?: string
  gitBranch?: string
} {
  let gitCommitHash: string | undefined
  let gitBranch: string | undefined
  
  for (const msg of messages) {
    const content = JSON.stringify(msg).toLowerCase()
    
    // Extract commit hash
    const hashMatch = content.match(/commit\s+([a-f0-9]{7,40})/i)
    if (hashMatch) gitCommitHash = hashMatch[1]
    
    // Extract branch
    const branchMatch = content.match(/branch[:\s]+([^\s,]+)/i)
    if (branchMatch) gitBranch = branchMatch[1]
  }
  
  return { gitCommitHash, gitBranch }
}

function extractCodeMetrics(messages: any[]): {
  linesAdded: number
  linesDeleted: number
  linesOfCode: number
  complexityScore: number
  filesModified: number
  filesCreated: number
  filesRead: number
} {
  let linesAdded = 0
  let linesDeleted = 0
  let filesModified = 0
  let filesCreated = 0
  let filesRead = 0
  const filesSet = new Set<string>()
  
  for (const msg of messages) {
    const blocks = msg.content_blocks || []
    for (const block of blocks) {
      if (block.type !== 'tool_calls') continue
      const calls = block.content || []
      for (const call of calls) {
        const fn = call.function || {}
        const args = safeParseJson(fn.arguments)
        
        if (fn.name === 'Write' && args.filepath) {
          filesCreated++
          filesSet.add(args.filepath)
          linesAdded += (args.content || '').split('\n').length
        }
        
        if (fn.name === 'Edit' && args.filepath) {
          filesModified++
          filesSet.add(args.filepath)
          const oldLines = (args.old_str || '').split('\n').length
          const newLines = (args.new_str || '').split('\n').length
          linesAdded += newLines
          linesDeleted += oldLines
        }
        
        if (fn.name === 'Read' && args.filepath) {
          filesRead++
          filesSet.add(args.filepath)
        }
      }
    }
  }
  
  const linesOfCode = linesAdded - linesDeleted
  const complexityScore = Math.min(100, Math.round((linesOfCode / 100) * 10 + filesSet.size * 2))
  
  return {
    linesAdded,
    linesDeleted,
    linesOfCode,
    complexityScore,
    filesModified,
    filesCreated,
    filesRead
  }
}

function calculateQualityScores(metrics: any): {
  efficiencyScore: number
  qualityScore: number
} {
  // Efficiency: Higher is better (fewer errors, fewer attempts, good token usage)
  const errorRate = metrics.commandsFailed / Math.max(1, metrics.commandsRun)
  const tokenEfficiency = Math.min(1, metrics.totalTokens / 10000)
  const efficiencyScore = Math.round((1 - errorRate) * 50 + tokenEfficiency * 50)
  
  // Quality: Based on completion, features, file organization
  const completionRate = metrics.completed ? 1 : 0
  const featureScore = Math.min(1, (metrics.featuresImplemented || 0) / 5)
  const qualityScore = Math.round(completionRate * 40 + featureScore * 30 + (1 - errorRate) * 30)
  
  return {
    efficiencyScore: Math.min(100, Math.max(0, efficiencyScore)),
    qualityScore: Math.min(100, Math.max(0, qualityScore))
  }
}

// ... Additional helper functions ...

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function calculateCost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'claude-3-sonnet': { input: 0.003, output: 0.015 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'glm-4': { input: 0.001, output: 0.001 },
    'default': { input: 0.001, output: 0.002 }
  }
  const p = pricing[model] || pricing['default']
  return (inputTokens / 1000 * p.input) + (outputTokens / 1000 * p.output)
}

function detectModel(data: any, messages: any[]): string {
  const content = JSON.stringify(data || {}).toLowerCase()
  if (content.includes('gpt-4')) return 'gpt-4'
  if (content.includes('gpt-3.5')) return 'gpt-3.5-turbo'
  if (content.includes('claude-3-opus')) return 'claude-3-opus'
  if (content.includes('claude-3-sonnet')) return 'claude-3-sonnet'
  if (content.includes('claude-3-haiku')) return 'claude-3-haiku'
  if (content.includes('glm-4')) return 'glm-4'
  return 'default'
}

function detectModelName(data: any, messages: any[]): string {
  return data?.model || data?.model_name || detectModel(data, messages)
}

function detectSessionType(title: string, messages: any[]): string {
  const content = (title + ' ' + JSON.stringify(messages)).toLowerCase()
  if (content.includes('fix') || content.includes('bug') || content.includes('error')) return 'BUG_FIX'
  if (content.includes('feature') || content.includes('add') || content.includes('implement')) return 'FEATURE'
  if (content.includes('refactor') || content.includes('clean')) return 'REFACTOR'
  if (content.includes('architecture') || content.includes('design')) return 'ARCHITECTURE'
  if (content.includes('doc') || content.includes('readme')) return 'DOCUMENTATION'
  if (content.includes('test')) return 'TESTING'
  if (content.includes('deploy') || content.includes('build')) return 'DEPLOYMENT'
  return 'UNKNOWN'
}

function detectCategory(title: string, summary: string, messages: any[]): string {
  const content = (title + ' ' + summary + ' ' + JSON.stringify(messages).slice(0, 1000)).toLowerCase()
  if (content.includes('api') || content.includes('endpoint')) return 'api'
  if (content.includes('ui') || content.includes('component') || content.includes('frontend')) return 'frontend'
  if (content.includes('database') || content.includes('schema') || content.includes('prisma')) return 'database'
  if (content.includes('auth') || content.includes('login')) return 'auth'
  if (content.includes('test')) return 'testing'
  if (content.includes('bug') || content.includes('fix')) return 'bugfix'
  if (content.includes('feature')) return 'feature'
  if (content.includes('refactor')) return 'refactor'
  return 'general'
}

function extractTags(messages: any[]): string[] {
  const tags = new Set<string>()
  const content = JSON.stringify(messages).toLowerCase()
  
  const tagPatterns = [
    { pattern: /typescript|\.ts\b/g, tag: 'typescript' },
    { pattern: /react|\.tsx\b/g, tag: 'react' },
    { pattern: /api|endpoint/g, tag: 'api' },
    { pattern: /database|prisma|sql/g, tag: 'database' },
    { pattern: /auth|login|security/g, tag: 'authentication' },
    { pattern: /test|jest|vitest/g, tag: 'testing' },
    { pattern: /css|tailwind|style/g, tag: 'styling' },
    { pattern: /git|commit|push/g, tag: 'git' },
  ]
  
  for (const { pattern, tag } of tagPatterns) {
    if (pattern.test(content)) tags.add(tag)
  }
  
  return Array.from(tags)
}

function extractTitle(messages: any[]): string {
  const firstUserMsg = messages.find((m: any) => m.role === 'user')
  if (firstUserMsg) {
    const content = firstUserMsg.content || JSON.stringify(firstUserMsg.content_blocks || [])
    return content.slice(0, 100)
  }
  return 'Development Session'
}

function generateSummary(messages: any[]): string {
  const assistantMsgs = messages.filter((m: any) => m.role === 'assistant')
  const toolCalls = assistantMsgs.reduce((count: number, m: any) => {
    const blocks = m.content_blocks || []
    return count + blocks.filter((b: any) => b.type === 'tool_calls').length
  }, 0)
  
  return `Session with ${messages.length} messages, ${toolCalls} tool operations`
}

function extractHighlights(messages: any[]): string[] {
  const highlights: string[] = []
  const content = JSON.stringify(messages)
  
  // Look for important patterns
  if (content.includes('success') || content.includes('completed')) {
    highlights.push('Task completed successfully')
  }
  if (content.includes('error') && content.includes('fix')) {
    highlights.push('Error resolved')
  }
  if (content.includes('feature') || content.includes('implement')) {
    highlights.push('New feature implemented')
  }
  
  return highlights
}

function mapBlockType(type: string): 'REASONING' | 'TEXT' | 'TOOL_CALLS' {
  const typeMap: Record<string, 'REASONING' | 'TEXT' | 'TOOL_CALLS'> = {
    'reasoning': 'REASONING',
    'text': 'TEXT',
    'tool_calls': 'TOOL_CALLS',
    'tool_use': 'TOOL_CALLS'
  }
  return typeMap[type?.toLowerCase()] || 'TEXT'
}

function extractBlockContent(block: any): string {
  if (block.content) {
    // Handle different content types
    if (typeof block.content === 'string') return block.content
    if (Array.isArray(block.content)) return block.content.map((c: any) => typeof c === 'string' ? c : JSON.stringify(c)).join('\n')
    return JSON.stringify(block.content)
  }
  if (block.text) {
    if (typeof block.text === 'string') return block.text
    return JSON.stringify(block.text)
  }
  return JSON.stringify(block)
}

function calculateDurationMs(start?: number, end?: number): number {
  if (!start || !end) return 0
  return (end - start) * 1000
}

function detectError(content: string): boolean {
  const errorPatterns = /error|exception|failed|failure|bug|issue|problem/i
  return errorPatterns.test(content)
}

function detectDecision(content: string): boolean {
  const decisionPatterns = /decide|choice|option|approach|strategy|will|should/i
  return decisionPatterns.test(content)
}

function detectBacktrack(content: string): boolean {
  const backtrackPatterns = /however|actually|instead|wait|no,|let me|rethink/i
  return backtrackPatterns.test(content)
}

function assessConfidence(content: string, blockType: string): 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' {
  if (blockType === 'REASONING') {
    if (content.includes('certain') || content.includes('confident')) return 'VERY_HIGH'
    if (content.includes('likely') || content.includes('probably')) return 'HIGH'
    if (content.includes('might') || content.includes('could')) return 'MEDIUM'
    if (content.includes('unsure') || content.includes('uncertain')) return 'LOW'
  }
  return 'MEDIUM'
}

function extractKeywords(content: string): string[] {
  const words = content.toLowerCase().split(/\s+/)
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these', 'those', 'it', 'its'])
  
  return words
    .filter(w => w.length > 3 && !stopWords.has(w) && /^[a-z]+$/.test(w))
    .slice(0, 10)
}

function extractErrorKeywords(content: string): string[] {
  const errorKeywords: string[] = []
  const patterns = /error|exception|failed|failure|bug|crash|timeout|null|undefined|typeerror|syntaxerror/gi
  let match
  while ((match = patterns.exec(content)) !== null) {
    errorKeywords.push(match[0].toLowerCase())
  }
  return [...new Set(errorKeywords)]
}

function extractDecisionKeywords(content: string): string[] {
  const decisionKeywords: string[] = []
  const patterns = /decide|choose|select|option|approach|strategy|solution|method/gi
  let match
  while ((match = patterns.exec(content)) !== null) {
    decisionKeywords.push(match[0].toLowerCase())
  }
  return [...new Set(decisionKeywords)]
}

function extractStrategyChanges(content: string): string[] {
  const changes: string[] = []
  if (/however/i.test(content)) changes.push('pivot')
  if (/actually/i.test(content)) changes.push('correction')
  if (/instead/i.test(content)) changes.push('alternative')
  if (/let me try/i.test(content)) changes.push('retry')
  return changes
}

function mapToolName(name: string): 'BASH' | 'WRITE' | 'READ' | 'EDIT' | 'TODO_WRITE' | 'OTHER' {
  const nameMap: Record<string, 'BASH' | 'WRITE' | 'READ' | 'EDIT' | 'TODO_WRITE' | 'OTHER'> = {
    'Bash': 'BASH',
    'Write': 'WRITE',
    'Read': 'READ',
    'Edit': 'EDIT',
    'TodoWrite': 'TODO_WRITE'
  }
  return nameMap[name] || 'OTHER'
}

function generateToolDescription(name: string, args: any): string {
  switch (name) {
    case 'Bash': return `Execute: ${args.command?.slice(0, 50) || 'command'}`
    case 'Write': return `Create: ${args.filepath || 'file'}`
    case 'Read': return `Read: ${args.filepath || 'file'}`
    case 'Edit': return `Edit: ${args.filepath || 'file'}`
    case 'TodoWrite': return 'Update todo list'
    default: return name
  }
}

function isGitOperation(command?: string): boolean {
  if (!command) return false
  return command.includes('git ')
}

function isBuildCommand(command?: string): boolean {
  if (!command) return false
  return /npm run build|yarn build|next build|npm run dev|yarn dev|next dev/i.test(command)
}

function isDangerousCommand(command?: string): boolean {
  if (!command) return false
  return /rm -rf|sudo|chmod 777|drop table|delete from/i.test(command)
}

function extractFileType(filepath: string): string {
  const ext = filepath.split('.').pop()?.toLowerCase()
  return ext || 'unknown'
}

function categorizeFile(filepath: string): string {
  const lower = filepath.toLowerCase()
  if (lower.includes('/api/') || lower.includes('route.ts')) return 'API_ROUTE'
  if (lower.includes('components/') || lower.endsWith('.tsx')) return 'COMPONENT'
  if (lower.includes('/lib/') || lower.includes('/services/')) return 'SERVICE'
  if (lower.includes('/hooks/')) return 'HOOK'
  if (lower.includes('/utils/') || lower.includes('/helpers/')) return 'UTILITY'
  if (lower.endsWith('.d.ts') || lower.includes('/types/')) return 'TYPE_DEFINITION'
  if (lower.includes('config') || lower.endsWith('.config.')) return 'CONFIG'
  if (lower.includes('.test.') || lower.includes('.spec.')) return 'TEST'
  if (lower.includes('prisma') || lower.endsWith('.prisma')) return 'SCHEMA'
  if (lower.endsWith('.css') || lower.endsWith('.scss')) return 'STYLE'
  return 'OTHER'
}

function classifyIssueType(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('type') || lower.includes('undefined') || lower.includes('null')) return 'type_error'
  if (lower.includes('syntax') || lower.includes('parse')) return 'syntax_error'
  if (lower.includes('import') || lower.includes('module')) return 'import_error'
  if (lower.includes('auth') || lower.includes('permission')) return 'auth_error'
  if (lower.includes('network') || lower.includes('fetch')) return 'network_error'
  if (lower.includes('database') || lower.includes('query')) return 'database_error'
  if (lower.includes('build') || lower.includes('compile')) return 'build_error'
  if (lower.includes('runtime') || lower.includes('crash')) return 'runtime_error'
  if (lower.includes('performance') || lower.includes('slow')) return 'performance'
  return 'other'
}

function assessSeverity(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('critical') || lower.includes('urgent') || lower.includes('blocking')) return 'critical'
  if (lower.includes('error') || lower.includes('fail') || lower.includes('break')) return 'high'
  if (lower.includes('warn') || lower.includes('issue') || lower.includes('bug')) return 'medium'
  return 'low'
}

function categorizeIssue(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('typescript') || lower.includes('.ts')) return 'typescript'
  if (lower.includes('api') || lower.includes('endpoint')) return 'api'
  if (lower.includes('database') || lower.includes('sql')) return 'database'
  if (lower.includes('auth') || lower.includes('login')) return 'auth'
  if (lower.includes('ui') || lower.includes('component')) return 'frontend'
  if (lower.includes('build') || lower.includes('compile')) return 'build'
  return 'general'
}

function extractIssueTags(text: string): string[] {
  const tags: string[] = []
  const lower = text.toLowerCase()
  if (lower.includes('urgent')) tags.push('urgent')
  if (lower.includes('regression')) tags.push('regression')
  if (lower.includes('recurring')) tags.push('recurring')
  return tags
}

function extractLineNumber(text: string): number | undefined {
  const match = text.match(/line\s*(\d+)/i)
  return match ? parseInt(match[1]) : undefined
}

function extractCodeSnippet(text: string): string | undefined {
  const match = text.match(/```[\s\S]*?```/)
  return match ? match[0] : undefined
}

function extractErrorMessage(text: string): string | undefined {
  const match = text.match(/error[:\s]+([^\n]+)/i)
  return match ? match[1].trim() : undefined
}

function countAttempts(text: string, messages: any[]): number {
  // Count retry attempts in conversation
  let attempts = 1
  const content = JSON.stringify(messages).toLowerCase()
  if (content.includes('try again') || content.includes('retry')) attempts++
  if (content.includes('still failing') || content.includes('still error')) attempts++
  return attempts
}

function inferRootCause(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('type')) return 'Type mismatch or incorrect type definition'
  if (lower.includes('null') || lower.includes('undefined')) return 'Missing null/undefined check'
  if (lower.includes('import')) return 'Module import resolution failure'
  if (lower.includes('async')) return 'Async/await handling issue'
  return 'Unknown root cause'
}

function generatePreventionTips(text: string): string[] {
  const tips: string[] = []
  const lower = text.toLowerCase()
  if (lower.includes('type')) tips.push('Add proper type definitions')
  if (lower.includes('null')) tips.push('Add null checks before accessing properties')
  if (lower.includes('error')) tips.push('Add proper error handling')
  if (tips.length === 0) tips.push('Review code for potential edge cases')
  return tips
}

function assessIssueConfidence(text: string, files: string[]): 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' {
  if (files.length > 0 && text.length > 50) return 'HIGH'
  if (files.length > 0 || text.length > 100) return 'MEDIUM'
  return 'LOW'
}

function findRelatedTools(text: string, toolCalls: ExtractedToolCall[]): ExtractedToolCall[] {
  const lower = text.toLowerCase()
  return toolCalls.filter(tc => {
    if (tc.filepath && lower.includes(tc.filepath.toLowerCase())) return true
    if (tc.command && lower.includes(tc.command.toLowerCase().slice(0, 20))) return true
    return false
  })
}

function findRelatedFiles(text: string, fileOps: ExtractedFileOperation[]): ExtractedFileOperation[] {
  const lower = text.toLowerCase()
  return fileOps.filter(fo => lower.includes(fo.filepath.toLowerCase().split('/').pop() || ''))
}

function classifyFeatureType(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('api') || lower.includes('endpoint')) return 'api'
  if (lower.includes('component') || lower.includes('ui')) return 'component'
  if (lower.includes('hook')) return 'hook'
  if (lower.includes('util') || lower.includes('helper')) return 'utility'
  if (lower.includes('page') || lower.includes('route')) return 'page'
  if (lower.includes('database') || lower.includes('model')) return 'database'
  if (lower.includes('test')) return 'test'
  if (lower.includes('config')) return 'config'
  return 'feature'
}

function categorizeFeature(text: string): string {
  return classifyFeatureType(text)
}

function extractFeatureTags(text: string): string[] {
  const tags: string[] = []
  const lower = text.toLowerCase()
  if (lower.includes('new')) tags.push('new')
  if (lower.includes('enhanced')) tags.push('enhancement')
  if (lower.includes('breaking')) tags.push('breaking-change')
  return tags
}

function inferModule(text: string, files: ExtractedFileOperation[]): string | undefined {
  if (files.length > 0) {
    const path = files[0].filepath
    const parts = path.split('/')
    if (parts.length > 1) return parts[0]
  }
  return undefined
}

function assessComplexity(lines: number, fileCount: number): string {
  const score = lines + fileCount * 50
  if (score > 500) return 'very_high'
  if (score > 200) return 'high'
  if (score > 100) return 'medium'
  if (score > 50) return 'low'
  return 'trivial'
}

function calculateComplexityScore(lines: number, fileCount: number): number {
  return Math.min(100, Math.round(lines / 10 + fileCount * 5))
}

function checkForDocs(text: string, files: ExtractedFileOperation[]): boolean {
  const lower = text.toLowerCase()
  if (lower.includes('doc') || lower.includes('comment')) return true
  return files.some(f => f.filepath.includes('README') || f.filepath.includes('.md'))
}

function extractDependencies(toolCalls: ExtractedToolCall[]): string[] {
  const deps: string[] = []
  for (const tc of toolCalls) {
    if (tc.command) {
      const match = tc.command.match(/npm install ([^\s]+)/)
      if (match) deps.push(match[1])
    }
  }
  return deps
}

export { estimateTokens }
