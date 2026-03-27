/**
 * TIER 1: EXTRACTION SERVICE
 * ==========================
 * Deep Content Block Parser, Reasoning Analyzer, Thread Reconstructor, Timing Calculator
 */

import { db } from '@/lib/db'
import type {
  ContentBlock,
  BlockType,
  ToolName,
  ReasoningAnalysis,
  ThreadReconstruction,
  ThreadNode,
  TimingChain,
  TimingStage,
  TimingGap,
  IdlePeriod,
  FileOperation,
  FileOpType,
  FileCategory,
  ToolCallRecord,
  TopicEvolution,
  DecisionPoint,
  ErrorRecord,
  StrategyDecision,
  BacktrackRecord
} from './types'

// =============================================================================
// F1: DEEP CONTENT BLOCK PARSER
// =============================================================================

export async function parseContentBlocks(
  sessionId: string,
  messages: Array<{ role: string; content: string; timestamp?: Date }>
): Promise<ContentBlock[]> {
  const blocks: ContentBlock[] = []
  let previousEndTime: Date | null = null

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    const content = message.content
    const timestamp = message.timestamp ? new Date(message.timestamp) : new Date()
    
    // Parse block type
    const blockType = detectBlockType(content, message.role)
    
    // Extract keywords
    const keywords = extractKeywords(content)
    
    // Detect errors and backtracks
    const flags = detectErrorsAndBacktracks(content, blocks)
    
    // Parse tool calls if present
    const toolCalls = blockType === 'tool_calls' ? parseToolCalls(content) : undefined
    
    // Calculate timing
    const startTime = timestamp
    const endTime = i < messages.length - 1 
      ? new Date(messages[i + 1].timestamp || timestamp.getTime() + 30000)
      : new Date(timestamp.getTime() + 30000)
    
    const duration = endTime.getTime() - startTime.getTime()
    const gapFromPrevious = previousEndTime 
      ? startTime.getTime() - previousEndTime.getTime() 
      : 0
    
    // Analyze sentiment
    const sentiment = analyzeSentiment(content)
    
    const block: ContentBlock = {
      id: `block-${sessionId}-${i}`,
      sessionId,
      blockType,
      content: content.slice(0, 10000), // Limit stored content
      startTime,
      endTime,
      duration,
      timingMetrics: {
        processingTime: duration,
        idleTime: gapFromPrevious > 5000 ? gapFromPrevious : 0,
        gapFromPrevious
      },
      flags,
      keywords,
      sentiment,
      toolCalls,
      createdAt: new Date()
    }
    
    blocks.push(block)
    previousEndTime = endTime
  }
  
  // Save blocks to database
  await saveContentBlocks(blocks)
  
  return blocks
}

function detectBlockType(content: string, role: string): BlockType {
  if (role === 'user') return 'text'
  
  // Check for tool calls
  if (content.includes('<function_calls>') || content.includes('tool_calls') || 
      content.includes('bash\n') || content.includes('write\n') || content.includes('read\n')) {
    return 'tool_calls'
  }
  
  // Check for reasoning blocks
  if (content.includes('<thinking>') || content.includes('Let me think') || 
      content.includes('I need to') || content.includes('reasoning')) {
    return 'reasoning'
  }
  
  return 'text'
}

function extractKeywords(content: string): string[] {
  const keywords: string[] = []
  
  // Technical keywords
  const techPatterns = [
    /\b(error|bug|fix|issue|problem|solution|implement|create|update|delete|modify)\b/gi,
    /\b(api|component|function|class|module|service|hook|page|route)\b/gi,
    /\b(typescript|react|next\.js|prisma|database|sql)\b/gi,
    /\b(auth|login|session|token|user|permission)\b/gi
  ]
  
  for (const pattern of techPatterns) {
    const matches = content.match(pattern)
    if (matches) {
      keywords.push(...matches.map(m => m.toLowerCase()))
    }
  }
  
  // File paths
  const filePathPattern = /['"]([\/\w.-]+\.(ts|tsx|js|jsx|json|css|md|prisma))['"]/g
  let match
  while ((match = filePathPattern.exec(content)) !== null) {
    keywords.push(match[1])
  }
  
  // Return unique keywords, limited
  return [...new Set(keywords)].slice(0, 20)
}

function detectErrorsAndBacktracks(
  content: string, 
  previousBlocks: ContentBlock[]
): ContentBlock['flags'] {
  const flags = {
    hasError: false,
    hasBacktrack: false,
    backtrackedFrom: undefined as string | undefined,
    errorType: undefined as string | undefined,
    retryCount: 0
  }
  
  // Error patterns
  const errorPatterns = [
    { pattern: /error[:：]\s*(.+)/i, type: 'runtime' },
    { pattern: /TypeError[:：]\s*(.+)/i, type: 'typescript' },
    { pattern: /failed to compile/i, type: 'build' },
    { pattern: /cannot read properties of undefined/i, type: 'runtime' },
    { pattern: /module not found/i, type: 'build' },
    { pattern: /syntax error/i, type: 'syntax' },
    { pattern: /unauthorized|forbidden/i, type: 'auth' },
    { pattern: /connection refused|ECONNREFUSED/i, type: 'network' },
    { pattern: /prisma error|database error/i, type: 'database' }
  ]
  
  for (const { pattern, type } of errorPatterns) {
    if (pattern.test(content)) {
      flags.hasError = true
      flags.errorType = type
      break
    }
  }
  
  // Backtrack detection
  const backtrackPatterns = [
    /let me try (?:a )?(?:different|another|new) approach/i,
    /actually, let me/i,
    /scratch that/i,
    /on second thought/i,
    /wait, (?:I think|that's not right)/i,
    /I made a mistake/i,
    /let me redo/i,
    /going back to/i
  ]
  
  for (const pattern of backtrackPatterns) {
    if (pattern.test(content)) {
      flags.hasBacktrack = true
      // Find what was backtracked from
      if (previousBlocks.length > 0) {
        const lastBlock = previousBlocks[previousBlocks.length - 1]
        flags.backtrackedFrom = lastBlock.content.slice(0, 100)
      }
      break
    }
  }
  
  // Count retries (looking for repeated attempts)
  const retryPattern = /(?:try|attempt|retry)\s*(?:again|\d+|once more)/gi
  const retryMatches = content.match(retryPattern)
  flags.retryCount = retryMatches ? retryMatches.length : 0
  
  return flags
}

function parseToolCalls(content: string): ToolCallRecord[] {
  const toolCalls: ToolCallRecord[] = []
  
  // Parse different tool call formats
  const bashPattern = /<bash>\n?(.*?)\n?<\/bash>/gs
  const writePattern = /<write\s+path=["']([^"']+)["']\s*>/gs
  const readPattern = /<read>\s*<path>([^<]+)<\/path>/gs
  const editPattern = /<edit\s+.*?path=["']([^"']+)["']/gs
  
  // Extract bash commands
  let match
  while ((match = bashPattern.exec(content)) !== null) {
    toolCalls.push({
      id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      blockId: '',
      toolName: 'bash',
      input: { command: match[1].trim() },
      success: !match[1].includes('error') && !match[1].includes('failed')
    })
  }
  
  // Extract write operations
  while ((match = writePattern.exec(content)) !== null) {
    const filePath = match[1]
    const fileOp: FileOperation = {
      filePath,
      operation: categorizeFileOp(filePath, 'write'),
      category: categorizeFile(filePath),
      linesAdded: 0,
      linesRemoved: 0,
      timestamp: new Date()
    }
    
    toolCalls.push({
      id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      blockId: '',
      toolName: 'write',
      input: { path: filePath },
      fileOperations: [fileOp],
      success: true
    })
  }
  
  // Extract read operations
  while ((match = readPattern.exec(content)) !== null) {
    const filePath = match[1]
    const fileOp: FileOperation = {
      filePath,
      operation: 'read',
      category: categorizeFile(filePath),
      linesAdded: 0,
      linesRemoved: 0,
      timestamp: new Date()
    }
    
    toolCalls.push({
      id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      blockId: '',
      toolName: 'read',
      input: { path: filePath },
      fileOperations: [fileOp],
      success: true
    })
  }
  
  // Extract edit operations
  while ((match = editPattern.exec(content)) !== null) {
    const filePath = match[1]
    const fileOp: FileOperation = {
      filePath,
      operation: 'modified',
      category: categorizeFile(filePath),
      linesAdded: 0,
      linesRemoved: 0,
      timestamp: new Date()
    }
    
    toolCalls.push({
      id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      blockId: '',
      toolName: 'edit',
      input: { path: filePath },
      fileOperations: [fileOp],
      success: true
    })
  }
  
  return toolCalls
}

function categorizeFileOp(filePath: string, operation: string): FileOpType {
  if (operation === 'write') return 'created'
  if (operation === 'edit') return 'modified'
  if (operation === 'read') return 'read'
  return 'modified'
}

function categorizeFile(filePath: string): FileCategory {
  if (filePath.includes('/api/') || filePath.includes('\\api\\')) return 'api_route'
  if (filePath.includes('/app/') && filePath.includes('page.')) return 'page'
  if (filePath.includes('/components/')) return 'component'
  if (filePath.includes('/lib/') || filePath.includes('/services/')) return 'service'
  if (filePath.includes('/hooks/')) return 'hook'
  if (filePath.includes('/utils/')) return 'utility'
  if (filePath.endsWith('.d.ts') || filePath.includes('/types/')) return 'type_definition'
  if (filePath.endsWith('.config.') || filePath.includes('/config/')) return 'config'
  if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('/__tests__/')) return 'test'
  if (filePath.endsWith('.prisma') || filePath.includes('/prisma/')) return 'schema'
  if (filePath.endsWith('.css') || filePath.endsWith('.scss')) return 'style'
  return 'other'
}

function analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['success', 'completed', 'works', 'fixed', 'resolved', 'great', 'perfect', 'working']
  const negativeWords = ['error', 'failed', 'issue', 'problem', 'bug', 'wrong', 'broken', 'crash']
  
  let positiveScore = 0
  let negativeScore = 0
  
  const lowerContent = content.toLowerCase()
  
  for (const word of positiveWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    positiveScore += (lowerContent.match(regex) || []).length
  }
  
  for (const word of negativeWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    negativeScore += (lowerContent.match(regex) || []).length
  }
  
  if (positiveScore > negativeScore + 2) return 'positive'
  if (negativeScore > positiveScore + 2) return 'negative'
  return 'neutral'
}

// =============================================================================
// F3: REASONING BLOCK ANALYZER
// =============================================================================

export async function analyzeReasoningBlocks(
  sessionId: string,
  blocks: ContentBlock[]
): Promise<ReasoningAnalysis[]> {
  const analyses: ReasoningAnalysis[] = []
  
  const reasoningBlocks = blocks.filter(b => b.blockType === 'reasoning')
  
  for (const block of reasoningBlocks) {
    // Extract errors
    const errors = extractErrors(block.content)
    
    // Detect error patterns
    const errorPatterns = detectErrorPatterns(errors)
    
    // Extract strategy decisions
    const strategies = extractStrategies(block.content)
    
    // Detect backtracks
    const backtracks = detectBacktracks(block.content, blocks)
    
    // Calculate quality metrics
    const qualityMetrics = calculateReasoningQuality(
      block,
      errors,
      strategies,
      backtracks
    )
    
    const analysis: ReasoningAnalysis = {
      id: `reasoning-${block.id}`,
      blockId: block.id,
      sessionId,
      errors,
      errorPatterns,
      strategies,
      backtracks,
      qualityMetrics,
      createdAt: new Date()
    }
    
    analyses.push(analysis)
  }
  
  // Save analyses
  await saveReasoningAnalyses(analyses)
  
  return analyses
}

function extractErrors(content: string): ErrorRecord[] {
  const errors: ErrorRecord[] = []
  
  const errorPatterns = [
    { type: 'typescript', pattern: /(?:TypeError|TS\d+):\s*([^\n]+)/g },
    { type: 'runtime', pattern: /(?:Error|Exception):\s*([^\n]+)/g },
    { type: 'build', pattern: /Failed to compile[^:]*:?\s*([^\n]+)/g },
    { type: 'network', pattern: /(?:fetch|network|connection)\s*(?:error|failed)[^:]*:?\s*([^\n]+)/gi },
    { type: 'auth', pattern: /(?:unauthorized|forbidden|authentication)\s*(?:error|failed)?[^:]*:?\s*([^\n]+)/gi }
  ]
  
  for (const { type, pattern } of errorPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      errors.push({
        type,
        message: match[1].trim(),
        detectedAt: new Date()
      })
    }
  }
  
  return errors
}

function detectErrorPatterns(errors: ErrorRecord[]): string[] {
  const patterns: string[] = []
  
  // Group by type
  const byType = errors.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  for (const [type, count] of Object.entries(byType)) {
    if (count >= 2) {
      patterns.push(`recurring_${type}_errors`)
    }
  }
  
  return patterns
}

function extractStrategies(content: string): StrategyDecision[] {
  const strategies: StrategyDecision[] = []
  
  // Strategy patterns
  const strategyPatterns = [
    {
      type: 'approach' as const,
      pattern: /(?:I'll|I will|Let me|I need to)\s+(?:try|use|implement|create|fix)\s+(?:a\s+)?(?:different|new|the\s+following)\s+(?:approach|method|strategy)[:：]?\s*([^\n]+)/gi
    },
    {
      type: 'tool_selection' as const,
      pattern: /(?:using|with|via)\s+(?:the\s+)?(\w+)\s+(?:tool|function|command|method)\s+(?:to|for)\s+([^\n]+)/gi
    },
    {
      type: 'file_selection' as const,
      pattern: /(?:create|modify|update|edit)\s+(?:the\s+)?(?:file\s+)?['"]?([^'"\s]+\.[a-z]+)['"]?(?:\s+to|for)?\s*([^\n]*)/gi
    },
    {
      type: 'solution_design' as const,
      pattern: /(?:solution|fix|implementation):\s*([^\n]+)/gi
    }
  ]
  
  for (const { type, pattern } of strategyPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      strategies.push({
        id: `strategy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        description: match[1].trim(),
        reasoning: match[2]?.trim() || '',
        outcome: 'success', // Will be updated later
        confidence: 0.7
      })
    }
  }
  
  return strategies.slice(0, 10)
}

function detectBacktracks(content: string, blocks: ContentBlock[]): BacktrackRecord[] {
  const backtracks: BacktrackRecord[] = []
  
  const backtrackPatterns = [
    {
      pattern: /(?:Actually|Wait|Hmm|On second thought),?\s+(?:let me try|I should|I'll)\s+([^\n]+)/gi,
      reason: 'reconsideration'
    },
    {
      pattern: /(?:That didn't work|That failed|Error),?\s+(?:let me|I'll|trying)\s+([^\n]+)/gi,
      reason: 'error_recovery'
    },
    {
      pattern: /(?:Going back to|Returning to|Back to)\s+([^\n]+)/gi,
      reason: 'explicit_backtrack'
    }
  ]
  
  for (const { pattern, reason } of backtrackPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      backtracks.push({
        id: `backtrack-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fromPath: blocks.length > 0 ? blocks[blocks.length - 1].keywords.slice(0, 3).join(' -> ') : '',
        toPath: match[1].trim(),
        reason,
        stepsLost: 1,
        timestamp: new Date()
      })
    }
  }
  
  return backtracks
}

function calculateReasoningQuality(
  block: ContentBlock,
  errors: ErrorRecord[],
  strategies: StrategyDecision[],
  backtracks: BacktrackRecord[]
): ReasoningAnalysis['qualityMetrics'] {
  // Coherence score based on sentiment and error ratio
  const errorRatio = errors.length / Math.max(1, block.content.length / 500)
  const coherenceScore = Math.max(0, Math.min(100, 100 - errorRatio * 20))
  
  // Decision clarity based on strategy count
  const decisionClarity = Math.min(100, strategies.length * 20)
  
  // Error recovery rate
  const resolvedErrors = errors.filter(e => e.resolvedAt).length
  const errorRecoveryRate = errors.length > 0 ? (resolvedErrors / errors.length) * 100 : 100
  
  // Strategy effectiveness
  const successfulStrategies = strategies.filter(s => s.outcome === 'success').length
  const strategyEffectiveness = strategies.length > 0 
    ? (successfulStrategies / strategies.length) * 100 
    : 100
  
  return {
    coherenceScore: Math.round(coherenceScore),
    decisionClarity: Math.round(decisionClarity),
    errorRecoveryRate: Math.round(errorRecoveryRate),
    strategyEffectiveness: Math.round(strategyEffectiveness)
  }
}

// =============================================================================
// F4: THREAD RECONSTRUCTOR
// =============================================================================

export async function reconstructThread(
  sessionId: string,
  messages: Array<{ role: string; content: string; timestamp?: Date }>,
  blocks: ContentBlock[]
): Promise<ThreadReconstruction> {
  // Build visual thread tree
  const tree = buildThreadTree(messages)
  
  // Extract topic evolution
  const topics = extractTopicEvolution(messages, blocks)
  
  // Build message flow
  const messageFlow = buildMessageFlow(messages)
  
  // Identify key decisions
  const keyDecisions = identifyKeyDecisions(messages, blocks)
  
  const reconstruction: ThreadReconstruction = {
    id: `thread-${sessionId}`,
    sessionId,
    tree,
    topics,
    messageFlow,
    keyDecisions,
    createdAt: new Date()
  }
  
  // Save reconstruction
  await saveThreadReconstruction(reconstruction)
  
  return reconstruction
}

function buildThreadTree(messages: Array<{ role: string; content: string; timestamp?: Date }>): ThreadNode {
  const root: ThreadNode = {
    id: 'root',
    type: 'user',
    content: 'Session Start',
    timestamp: new Date(),
    children: []
  }
  
  let currentNode = root
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    const nodeType = message.role === 'user' ? 'user' : 
                     message.content.includes('<thinking>') ? 'reasoning' :
                     message.content.includes('error') ? 'error' : 'assistant'
    
    const node: ThreadNode = {
      id: `node-${i}`,
      type: nodeType,
      content: message.content.slice(0, 500),
      timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
      children: [],
      metadata: {
        role: message.role,
        length: message.content.length
      }
    }
    
    currentNode.children.push(node)
    currentNode = node
  }
  
  return root
}

function extractTopicEvolution(
  messages: Array<{ role: string; content: string }>,
  blocks: ContentBlock[]
): TopicEvolution[] {
  const topics: TopicEvolution[] = []
  
  // Track topic changes
  let currentTopic = ''
  let topicStartIndex = 0
  const topicKeywords: string[] = []
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    const keywords = extractKeywords(message.content)
    
    // Check for topic shift
    const newTopic = detectTopic(message.content, keywords)
    
    if (newTopic && newTopic !== currentTopic) {
      if (currentTopic) {
        topics.push({
          topic: currentTopic,
          startMessageIndex: topicStartIndex,
          endMessageIndex: i - 1,
          keywords: topicKeywords,
          relatedFiles: extractFilePaths(messages.slice(topicStartIndex, i)),
          outcomes: []
        })
      }
      
      currentTopic = newTopic
      topicStartIndex = i
      topicKeywords.length = 0
    }
    
    topicKeywords.push(...keywords)
  }
  
  // Add final topic
  if (currentTopic) {
    topics.push({
      topic: currentTopic,
      startMessageIndex: topicStartIndex,
      keywords: [...new Set(topicKeywords)].slice(0, 10),
      relatedFiles: extractFilePaths(messages.slice(topicStartIndex)),
      outcomes: []
    })
  }
  
  return topics
}

function detectTopic(content: string, keywords: string[]): string | null {
  const topicPatterns = [
    { pattern: /(?:fix|resolve|bug|error|issue)/i, topic: 'Bug Fixing' },
    { pattern: /(?:implement|create|build|add|new feature)/i, topic: 'Feature Development' },
    { pattern: /(?:refactor|restructure|cleanup|optimize)/i, topic: 'Refactoring' },
    { pattern: /(?:test|spec|coverage|testing)/i, topic: 'Testing' },
    { pattern: /(?:deploy|release|production|staging)/i, topic: 'Deployment' },
    { pattern: /(?:document|readme|doc|comment)/i, topic: 'Documentation' },
    { pattern: /(?:api|endpoint|route|controller)/i, topic: 'API Development' },
    { pattern: /(?:database|schema|migration|prisma)/i, topic: 'Database Work' },
    { pattern: /(?:ui|component|style|css|design)/i, topic: 'UI Development' }
  ]
  
  for (const { pattern, topic } of topicPatterns) {
    if (pattern.test(content)) {
      return topic
    }
  }
  
  return null
}

function extractFilePaths(messages: Array<{ role: string; content: string }>): string[] {
  const filePaths: string[] = []
  const pattern = /['"]([\/\w.-]+\.(ts|tsx|js|jsx|json|css|md|prisma))['"]/g
  
  for (const message of messages) {
    let match
    while ((match = pattern.exec(message.content)) !== null) {
      filePaths.push(match[1])
    }
  }
  
  return [...new Set(filePaths)].slice(0, 20)
}

function buildMessageFlow(
  messages: Array<{ role: string; content: string; timestamp?: Date }>
): ThreadReconstruction['messageFlow'] {
  return messages.map((message, index) => ({
    id: `flow-${index}`,
    messageIndex: index,
    type: message.role,
    summary: message.content.slice(0, 100) + (message.content.length > 100 ? '...' : ''),
    duration: 0,
    transitions: []
  }))
}

function identifyKeyDecisions(
  messages: Array<{ role: string; content: string }>,
  blocks: ContentBlock[]
): DecisionPoint[] {
  const decisions: DecisionPoint[] = []
  
  const decisionPatterns = [
    {
      pattern: /(?:I'll|I will|Let me|Going to)\s+(?:use|try|implement|create)\s+([^\n]+)/gi,
      impact: 'high' as const
    },
    {
      pattern: /(?:Decision|Chose|Selected):\s*([^\n]+)/gi,
      impact: 'high' as const
    },
    {
      pattern: /(?:approach|strategy|method):\s*([^\n]+)/gi,
      impact: 'medium' as const
    }
  ]
  
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    
    for (const { pattern, impact } of decisionPatterns) {
      let match
      while ((match = pattern.exec(message.content)) !== null) {
        decisions.push({
          id: `decision-${i}-${decisions.length}`,
          messageIndex: i,
          decision: match[1].trim(),
          alternatives: [],
          outcome: '',
          impact
        })
      }
    }
  }
  
  return decisions.slice(0, 20)
}

// =============================================================================
// F5: TIMING CHAIN CALCULATOR
// =============================================================================

export async function calculateTimingChain(
  sessionId: string,
  blocks: ContentBlock[]
): Promise<TimingChain> {
  if (blocks.length === 0) {
    return {
      id: `timing-${sessionId}`,
      sessionId,
      stages: [],
      gaps: [],
      idlePeriods: [],
      totalDuration: 0,
      activeTime: 0,
      idleTime: 0,
      efficiency: 0,
      createdAt: new Date()
    }
  }
  
  // Build timing stages
  const stages = buildTimingStages(blocks)
  
  // Detect gaps
  const gaps = detectTimingGaps(blocks)
  
  // Calculate idle periods
  const idlePeriods = calculateIdlePeriods(blocks)
  
  // Calculate overall metrics
  const totalDuration = blocks.length > 0 
    ? blocks[blocks.length - 1].endTime!.getTime() - blocks[0].startTime.getTime()
    : 0
  
  const activeTime = stages.reduce((sum, s) => sum + s.duration, 0)
  const idleTime = idlePeriods.reduce((sum, p) => sum + p.duration, 0)
  const efficiency = totalDuration > 0 ? (activeTime / totalDuration) * 100 : 0
  
  const timingChain: TimingChain = {
    id: `timing-${sessionId}`,
    sessionId,
    stages,
    gaps,
    idlePeriods,
    totalDuration,
    activeTime,
    idleTime,
    efficiency: Math.round(efficiency),
    createdAt: new Date()
  }
  
  // Save timing chain
  await saveTimingChain(timingChain)
  
  return timingChain
}

function buildTimingStages(blocks: ContentBlock[]): TimingStage[] {
  const stages: TimingStage[] = []
  
  // Group blocks by type
  const byType = new Map<BlockType, ContentBlock[]>()
  for (const block of blocks) {
    const list = byType.get(block.blockType) || []
    list.push(block)
    byType.set(block.blockType, list)
  }
  
  // Create stages from grouped blocks
  const stageOrder: BlockType[] = ['reasoning', 'tool_calls', 'text']
  let totalDuration = 0
  
  for (const type of stageOrder) {
    const typeBlocks = byType.get(type) || []
    if (typeBlocks.length > 0) {
      const duration = typeBlocks.reduce((sum, b) => sum + (b.duration || 0), 0)
      totalDuration += duration
      
      stages.push({
        name: type.replace('_', ' ').toUpperCase(),
        startTime: typeBlocks[0].startTime,
        endTime: typeBlocks[typeBlocks.length - 1].endTime!,
        duration,
        percentage: 0 // Will calculate after
      })
    }
  }
  
  // Calculate percentages
  for (const stage of stages) {
    stage.percentage = totalDuration > 0 ? Math.round((stage.duration / totalDuration) * 100) : 0
  }
  
  return stages
}

function detectTimingGaps(blocks: ContentBlock[]): TimingGap[] {
  const gaps: TimingGap[] = []
  
  // Consider gaps > 30 seconds as significant
  const GAP_THRESHOLD = 30000
  
  for (let i = 1; i < blocks.length; i++) {
    const prevBlock = blocks[i - 1]
    const currBlock = blocks[i]
    
    const gap = currBlock.timingMetrics.gapFromPrevious
    
    if (gap > GAP_THRESHOLD) {
      gaps.push({
        afterStage: prevBlock.blockType,
        beforeStage: currBlock.blockType,
        duration: gap,
        reason: gap > 120000 ? 'long_idle' : 'short_idle'
      })
    }
  }
  
  return gaps
}

function calculateIdlePeriods(blocks: ContentBlock[]): IdlePeriod[] {
  const periods: IdlePeriod[] = []
  
  // Consider idle time > 5 seconds
  const IDLE_THRESHOLD = 5000
  
  for (let i = 1; i < blocks.length; i++) {
    const prevBlock = blocks[i - 1]
    const currBlock = blocks[i]
    
    const gap = currBlock.timingMetrics.gapFromPrevious
    
    if (gap > IDLE_THRESHOLD) {
      periods.push({
        startTime: prevBlock.endTime!,
        endTime: currBlock.startTime,
        duration: gap,
        type: gap > 60000 ? 'waiting' : 'processing'
      })
    }
  }
  
  return periods
}

// =============================================================================
// DATABASE PERSISTENCE
// =============================================================================

async function saveContentBlocks(blocks: ContentBlock[]): Promise<void> {
  for (const block of blocks) {
    try {
      // Store in session metadata or a separate table
      // For now, we'll use the AICostRecord or update session
    } catch (error) {
      console.error('Failed to save block:', error)
    }
  }
}

async function saveReasoningAnalyses(analyses: ReasoningAnalysis[]): Promise<void> {
  // Store analyses - could be stored as session metadata
}

async function saveThreadReconstruction(reconstruction: ThreadReconstruction): Promise<void> {
  // Store reconstruction - could be stored as session metadata
}

async function saveTimingChain(chain: TimingChain): Promise<void> {
  // Store timing chain - could update session with timing data
  try {
    await db.aISession.update({
      where: { id: chain.sessionId },
      data: {
        duration: Math.round(chain.totalDuration / 1000), // Convert to seconds
        metadata: JSON.stringify({
          timingChain: {
            activeTime: chain.activeTime,
            idleTime: chain.idleTime,
            efficiency: chain.efficiency,
            stages: chain.stages.length,
            gaps: chain.gaps.length
          }
        })
      }
    })
  } catch (error) {
    console.error('Failed to save timing chain:', error)
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function aggregateBlocksByType(
  blocks: ContentBlock[]
): Record<BlockType, { count: number; totalDuration: number; errors: number }> {
  const result: Record<BlockType, { count: number; totalDuration: number; errors: number }> = {
    reasoning: { count: 0, totalDuration: 0, errors: 0 },
    text: { count: 0, totalDuration: 0, errors: 0 },
    tool_calls: { count: 0, totalDuration: 0, errors: 0 }
  }
  
  for (const block of blocks) {
    result[block.blockType].count++
    result[block.blockType].totalDuration += block.duration || 0
    if (block.flags.hasError) {
      result[block.blockType].errors++
    }
  }
  
  return result
}

export function calculateBlockMetrics(blocks: ContentBlock[]): {
  totalBlocks: number
  avgDuration: number
  errorRate: number
  backtrackRate: number
  toolCallCount: number
} {
  const totalBlocks = blocks.length
  const totalDuration = blocks.reduce((sum, b) => sum + (b.duration || 0), 0)
  const errors = blocks.filter(b => b.flags.hasError).length
  const backtracks = blocks.filter(b => b.flags.hasBacktrack).length
  const toolCalls = blocks.reduce((sum, b) => sum + (b.toolCalls?.length || 0), 0)
  
  return {
    totalBlocks,
    avgDuration: totalBlocks > 0 ? totalDuration / totalBlocks : 0,
    errorRate: totalBlocks > 0 ? (errors / totalBlocks) * 100 : 0,
    backtrackRate: totalBlocks > 0 ? (backtracks / totalBlocks) * 100 : 0,
    toolCallCount: toolCalls
  }
}
