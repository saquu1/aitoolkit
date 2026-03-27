/**
 * ERROR PATTERN SERVICE
 * =====================
 * Extracts and analyzes error patterns from raw AI chat data
 * 
 * Supports multiple content block types:
 * - reasoning: AI reasoning blocks
 * - text: Text content blocks
 * - tool_calls: Tool call blocks with function.name and function.arguments
 * 
 * Error Detection Sources:
 * - Direct error fields in response
 * - Status codes (non-2xx)
 * - Error messages in text content
 * - Tool result errors
 */

import { db, prisma } from './db'

// =============================================================================
// TYPES
// =============================================================================

export interface ExtractedError {
  errorType: string
  errorCategory: string
  errorCode: string | null
  errorTitle: string
  errorMessage: string
  errorStack: string | null
  toolName: string | null
  functionName: string | null
  arguments: string | null
  filePath: string | null
  sourceBlock: string
  sourceMessageId: string | null
  confidence: number
  patternSignature: string
}

export interface ErrorPatternStats {
  totalPatterns: number
  byType: Record<string, number>
  byCategory: Record<string, number>
  byStatus: Record<string, number>
  byResearchStatus: Record<string, number>
  recentPatterns: number
  resolvedPatterns: number
  recurringPatterns: number
}

// =============================================================================
// ERROR DETECTION PATTERNS
// =============================================================================

// Patterns that indicate an error
const errorPatterns = [
  // HTTP/API errors
  { pattern: /error[:\s]+(\d{3})/gi, type: 'api_error', category: 'network' },
  { pattern: /status[:\s]+(\d{3})/gi, type: 'api_error', category: 'network' },
  { pattern: /http\s+(\d{3})/gi, type: 'api_error', category: 'network' },
  { pattern: /(4\d{2}|5\d{2})\s+(?:error|not found|unauthorized|forbidden|bad request|internal server error)/gi, type: 'api_error', category: 'network' },
  
  // Authentication errors
  { pattern: /unauthorized|authentication\s+failed|invalid\s+(api\s+)?key|access\s+denied|permission\s+denied|not\s+authenticated/gi, type: 'api_error', category: 'authentication' },
  { pattern: /401|forbidden|invalid.*token|token.*expired|session.*expired/gi, type: 'api_error', category: 'authentication' },
  
  // Network errors
  { pattern: /network\s+error|connection\s+(failed|refused|timed?\s*out)|econnrefused|econnreset|enotfound|etimedout/gi, type: 'api_error', category: 'network' },
  { pattern: /fetch\s+failed|request\s+failed|request\s+timed?\s*out/gi, type: 'api_error', category: 'network' },
  
  // File operation errors
  { pattern: /enoent|file\s+not\s+found|no\s+such\s+file|cannot\s+(find|read|write|open)\s+file/gi, type: 'runtime_error', category: 'file_operation' },
  { pattern: /permission\s+denied.*file|access\s+denied.*file|file\s+already\s+exists|directory\s+not\s+(empty|found)/gi, type: 'runtime_error', category: 'file_operation' },
  { pattern: /error\s+(writing|reading|creating|deleting|moving|copying)\s+file/gi, type: 'runtime_error', category: 'file_operation' },
  
  // Database errors
  { pattern: /database\s+error|sql\s+error|query\s+failed|table\s+not\s+found|column\s+not\s+found/gi, type: 'runtime_error', category: 'database' },
  { pattern: /prisma\s+error|prismaclient\w+error|unique\s+constraint|foreign\s+key\s+violation/gi, type: 'runtime_error', category: 'database' },
  { pattern: /record\s+not\s+found|duplicate\s+(key|entry)|deadlock|lock\s+wait\s+timeout/gi, type: 'runtime_error', category: 'database' },
  
  // Parsing errors
  { pattern: /json\s+parse\s+error|unexpected\s+token|syntax\s*error|invalid\s+json|failed\s+to\s+parse/gi, type: 'runtime_error', category: 'parsing' },
  { pattern: /unexpected\s+(end\s+of\s+(input|json)|token)|malformed\s+\w+/gi, type: 'runtime_error', category: 'parsing' },
  
  // Tool execution errors
  { pattern: /tool\s+(execution\s+)?failed|tool\s+error|bash\s+command\s+failed|command\s+failed/gi, type: 'tool_error', category: 'other' },
  { pattern: /exit\s+code\s+[1-9]\d*|process\s+exited\s+with\s+code\s+[1-9]/gi, type: 'tool_error', category: 'other' },
  
  // Validation errors
  { pattern: /validation\s+error|invalid\s+\w+|missing\s+(required\s+)?field|schema\s+validation\s+failed/gi, type: 'validation_error', category: 'other' },
  { pattern: /type\s+error|type\s+mismatch|expected\s+\w+\s+but\s+got/gi, type: 'validation_error', category: 'other' },
  
  // Generic errors
  { pattern: /\berror\b[:\s]+(?:.+)/gi, type: 'unknown', category: 'other' },
  { pattern: /failed\s+to\s+\w+/gi, type: 'unknown', category: 'other' },
  { pattern: /exception[:\s]+/gi, type: 'runtime_error', category: 'other' },
]

// Patterns that are FALSE POSITIVES (error handling code, not actual errors)
const falsePositivePatterns = [
  // Error handling code
  /catch\s*\(/gi,
  /catch\s*\{/gi,
  /error\s*[:=]\s*['"`](?:error|err|e)['"`]/gi,
  /error\s*[:=]\s*(?:new\s+)?Error\(/gi,
  /throw\s+(?:new\s+)?Error/gi,
  /console\.(error|warn)\s*\(/gi,
  /\.on\s*\(\s*['"`]error['"`]/gi,
  /handleError|onError|catchError/gi,
  /error\s*[:=]\s*(?:null|undefined|false)/gi,
  /if\s*\(\s*error\s*\)/gi,
  /if\s*\(\s*!.*\)/gi,
  /return\s+{\s*error\s*:/gi,
  
  // Variable declarations
  /(?:const|let|var)\s+error\s*=/gi,
  /(?:const|let|var)\s+errors?\s*[:=]/gi,
  
  // Error type references
  /ApiError|Error\s*:/gi,
  /error:\s*{/gi,
  /{\s*error\s*}/gi,
  /error\s*\?\?/gi,
  /error\s*\|\|/gi,
  
  // Comments and documentation
  /\/\/.*error/gi,
  /\*.*error/gi,
  
  // Test-related
  /describe\s*\(['"`].*error/gi,
  /it\s*\(['"`].*error/gi,
  /test\s*\(['"`].*error/gi,
  /expect\s*\(.*error/gi,
  
  // Function names containing 'error'
  /function\s+\w*[Ee]rror/gi,
  /\w*[Ee]rror\s*\(\s*\)/gi,
]

// HTTP status code mapping
const httpStatusCodes: Record<string, string> = {
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '403': 'Forbidden',
  '404': 'Not Found',
  '405': 'Method Not Allowed',
  '408': 'Request Timeout',
  '409': 'Conflict',
  '410': 'Gone',
  '429': 'Too Many Requests',
  '500': 'Internal Server Error',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
  '504': 'Gateway Timeout',
}

// =============================================================================
// MAIN EXTRACTION FUNCTIONS
// =============================================================================

/**
 * Extract errors from raw JSON data
 * Handles all content block types: reasoning, text, tool_calls
 */
export async function extractErrorsFromRawData(
  rawDataId: string
): Promise<ExtractedError[]> {
  const rawData = await prisma.rawImportData.findUnique({
    where: { id: rawDataId },
    select: { rawJson: true, sourceChatId: true }
  })

  if (!rawData?.rawJson) {
    console.log(`[ErrorPatternService] Raw data not found: ${rawDataId}`)
    return []
  }

  let parsed: any
  try {
    parsed = JSON.parse(rawData.rawJson)
  } catch (e) {
    console.log(`[ErrorPatternService] Failed to parse raw JSON`)
    return []
  }

  const errors: ExtractedError[] = []
  const sessionId = rawData.sourceChatId

  // Extract messages from different formats
  let messages: any[] = []
  
  // Format 1: { data: { messageId: { ...message }, ... } }
  if (parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) {
    messages = Object.entries(parsed.data).map(([id, msg]) => ({
      id,
      ...(msg as object)
    }))
  }
  // Format 2: { messages: [...] }
  else if (parsed.messages && Array.isArray(parsed.messages)) {
    messages = parsed.messages
  }
  // Format 3: Array of messages
  else if (Array.isArray(parsed)) {
    messages = parsed
  }

  console.log(`[ErrorPatternService] Processing ${messages.length} messages`)

  // Process each message
  for (const message of messages) {
    const messageId = message.id || message.message_id || message.uuid
    
    // Check for direct error field
    if (message.error) {
      const extracted = extractErrorFromField(message.error, 'direct', messageId)
      if (extracted) errors.push(extracted)
    }

    // Check for non-success status
    if (message.status && !['success', 'ok', 'completed', '200', '201', '202'].includes(String(message.status).toLowerCase())) {
      const extracted = extractErrorFromStatus(message.status, messageId)
      if (extracted) errors.push(extracted)
    }

    // Process content blocks (array or object)
    const contentBlocks = message.content_blocks || message.contentBlocks || message.content
    if (Array.isArray(contentBlocks)) {
      for (const block of contentBlocks) {
        const blockErrors = extractErrorsFromContentBlock(block, messageId)
        errors.push(...blockErrors)
      }
    } else if (contentBlocks && typeof contentBlocks === 'object') {
      // Handle object-based content blocks
      for (const blockType of Object.keys(contentBlocks)) {
        const blocks = contentBlocks[blockType]
        if (Array.isArray(blocks)) {
          for (const block of blocks) {
            const blockErrors = extractErrorsFromContentBlock(
              { type: blockType, ...block },
              messageId
            )
            errors.push(...blockErrors)
          }
        }
      }
    }

    // Process tool_calls (can be at message level)
    if (message.tool_calls && Array.isArray(message.tool_calls)) {
      for (const toolCall of message.tool_calls) {
        const toolErrors = extractErrorsFromToolCall(toolCall, messageId)
        errors.push(...toolErrors)
      }
    }

    // Check results field
    if (message.results && Array.isArray(message.results)) {
      for (const result of message.results) {
        if (result.error || result.status === 'error' || result.success === false) {
          const extracted = extractErrorFromResult(result, messageId)
          if (extracted) errors.push(extracted)
        }
      }
    }
  }

  // Filter out false positives
  const filteredErrors = errors.filter(error => !isFalsePositive(error.errorMessage))
  
  console.log(`[ErrorPatternService] Found ${errors.length} potential errors, ${filteredErrors.length} after filtering`)

  return filteredErrors
}

/**
 * Extract errors from a content block
 */
function extractErrorsFromContentBlock(block: any, messageId: string | null): ExtractedError[] {
  const errors: ExtractedError[] = []
  const blockType = block.type || 'unknown'

  switch (blockType) {
    case 'reasoning':
      // Reasoning blocks may contain error mentions
      if (block.reasoning || block.content) {
        const text = block.reasoning || block.content
        const textErrors = extractErrorsFromText(text, 'reasoning', messageId)
        errors.push(...textErrors)
      }
      break

    case 'text':
      // Text blocks may contain error messages
      if (block.text || block.content) {
        const text = block.text || block.content
        const textErrors = extractErrorsFromText(text, 'text', messageId)
        errors.push(...textErrors)
      }
      break

    case 'tool_calls':
    case 'tool_call':
      // Tool call blocks
      if (block.tool_calls && Array.isArray(block.tool_calls)) {
        for (const toolCall of block.tool_calls) {
          const toolErrors = extractErrorsFromToolCall(toolCall, messageId)
          errors.push(...toolErrors)
        }
      }
      // Single tool call
      if (block.function || block.tool_name || block.name) {
        const toolErrors = extractErrorsFromToolCall(block, messageId)
        errors.push(...toolErrors)
      }
      break

    default:
      // Check for error indicators in any block type
      if (block.error) {
        const extracted = extractErrorFromField(block.error, blockType, messageId)
        if (extracted) errors.push(extracted)
      }
      if (block.text || block.content) {
        const text = block.text || block.content
        if (typeof text === 'string') {
          const textErrors = extractErrorsFromText(text, blockType, messageId)
          errors.push(...textErrors)
        }
      }
      // Check for tool_calls in any block
      if (block.tool_calls && Array.isArray(block.tool_calls)) {
        for (const toolCall of block.tool_calls) {
          const toolErrors = extractErrorsFromToolCall(toolCall, messageId)
          errors.push(...toolErrors)
        }
      }
  }

  // Check for results at block level
  if (block.results && Array.isArray(block.results)) {
    for (const result of block.results) {
      if (result.error || result.status === 'error' || result.success === false) {
        const extracted = extractErrorFromResult(result, messageId)
        if (extracted) errors.push(extracted)
      }
    }
  }

  return errors
}

/**
 * Extract errors from tool call
 */
function extractErrorsFromToolCall(toolCall: any, messageId: string | null): ExtractedError[] {
  const errors: ExtractedError[] = []
  
  const functionName = toolCall.function?.name || toolCall.name || toolCall.tool_name || ''
  const argumentsStr = toolCall.function?.arguments || toolCall.arguments || ''
  const toolName = toolCall.name || functionName

  // Parse arguments if string
  let args: any = {}
  if (typeof argumentsStr === 'string' && argumentsStr.trim()) {
    try {
      args = JSON.parse(argumentsStr)
    } catch {
      // Keep as string
    }
  } else if (typeof argumentsStr === 'object') {
    args = argumentsStr
  }

  // Check for error in tool call arguments
  if (args.error) {
    const extracted = extractErrorFromField(args.error, 'tool_calls', messageId)
    if (extracted) {
      extracted.toolName = toolName
      extracted.functionName = functionName
      extracted.arguments = typeof argumentsStr === 'string' ? argumentsStr : JSON.stringify(argumentsStr)
      errors.push(extracted)
    }
  }

  // Check for file path in arguments
  const filePath = args.file_path || args.path || args.filePath || args.file
  
  // Check for error status
  if (args.status && !['success', 'ok', 'completed'].includes(String(args.status).toLowerCase())) {
    const extracted: ExtractedError = {
      errorType: 'tool_error',
      errorCategory: categorizeFromToolName(toolName),
      errorCode: String(args.status),
      errorTitle: `Tool execution failed: ${toolName}`,
      errorMessage: args.message || args.error_message || `Tool ${toolName} returned status ${args.status}`,
      errorStack: null,
      toolName: toolName,
      functionName: functionName,
      arguments: typeof argumentsStr === 'string' ? argumentsStr : JSON.stringify(argumentsStr),
      filePath: filePath || null,
      sourceBlock: 'tool_calls',
      sourceMessageId: messageId,
      confidence: 0.9,
      patternSignature: generateSignature(`${toolName}:${args.status}`)
    }
    errors.push(extracted)
  }

  // Check for exit_code (bash commands)
  if (args.exit_code !== undefined && args.exit_code !== 0) {
    const extracted: ExtractedError = {
      errorType: 'tool_error',
      errorCategory: 'other',
      errorCode: String(args.exit_code),
      errorTitle: `Command failed with exit code ${args.exit_code}`,
      errorMessage: args.output || args.stderr || args.error || `Command exited with code ${args.exit_code}`,
      errorStack: args.stderr || null,
      toolName: toolName,
      functionName: functionName,
      arguments: typeof argumentsStr === 'string' ? argumentsStr : JSON.stringify(argumentsStr),
      filePath: filePath || null,
      sourceBlock: 'tool_calls',
      sourceMessageId: messageId,
      confidence: 0.95,
      patternSignature: generateSignature(`${toolName}:exit_${args.exit_code}`)
    }
    errors.push(extracted)
  }

  // Check for results with errors
  if (toolCall.results && Array.isArray(toolCall.results)) {
    for (const result of toolCall.results) {
      if (result.error || result.status === 'error' || result.success === false) {
        const extracted = extractErrorFromResult(result, messageId)
        if (extracted) {
          extracted.toolName = toolName
          extracted.functionName = functionName
          extracted.arguments = typeof argumentsStr === 'string' ? argumentsStr : JSON.stringify(argumentsStr)
          errors.push(extracted)
        }
      }
    }
  }

  return errors
}

/**
 * Extract errors from text content
 */
function extractErrorsFromText(text: string, blockType: string, messageId: string | null): ExtractedError[] {
  const errors: ExtractedError[] = []

  for (const { pattern, type, category } of errorPatterns) {
    const matches = Array.from(text.matchAll(pattern))
    
    for (const match of matches) {
      const matchedText = match[0]
      const contextStart = Math.max(0, match.index! - 50)
      const contextEnd = Math.min(text.length, match.index! + matchedText.length + 100)
      const context = text.substring(contextStart, contextEnd)
      
      // Extract error code if captured
      let errorCode: string | null = null
      if (match[1]) {
        errorCode = match[1]
      }

      const extracted: ExtractedError = {
        errorType: type,
        errorCategory: category,
        errorCode: errorCode,
        errorTitle: generateErrorTitle(matchedText, type, errorCode),
        errorMessage: context.trim(),
        errorStack: null,
        toolName: null,
        functionName: null,
        arguments: null,
        filePath: extractFilePath(context),
        sourceBlock: blockType,
        sourceMessageId: messageId,
        confidence: calculateConfidence(matchedText, context),
        patternSignature: generateSignature(matchedText)
      }
      
      errors.push(extracted)
    }
  }

  return errors
}

/**
 * Extract error from direct error field
 */
function extractErrorFromField(error: any, blockType: string, messageId: string | null): ExtractedError | null {
  if (!error) return null

  const errorMessage = typeof error === 'string' ? error : 
    (error.message || error.msg || error.error_message || JSON.stringify(error))
  
  const errorCode = typeof error === 'object' ? 
    (error.code || error.status || error.error_code || null) : null

  return {
    errorType: 'api_error',
    errorCategory: 'other',
    errorCode: errorCode ? String(errorCode) : null,
    errorTitle: errorMessage.substring(0, 100),
    errorMessage: errorMessage,
    errorStack: typeof error === 'object' ? (error.stack || error.trace || null) : null,
    toolName: null,
    functionName: null,
    arguments: null,
    filePath: extractFilePath(errorMessage),
    sourceBlock: blockType,
    sourceMessageId: messageId,
    confidence: 0.9,
    patternSignature: generateSignature(errorMessage)
  }
}

/**
 * Extract error from status code
 */
function extractErrorFromStatus(status: any, messageId: string | null): ExtractedError | null {
  const statusStr = String(status)
  const statusNum = parseInt(statusStr)
  
  if (isNaN(statusNum) || (statusNum >= 200 && statusNum < 300)) {
    return null
  }

  const errorTitle = httpStatusCodes[statusStr] || `HTTP Error ${statusStr}`
  
  return {
    errorType: 'api_error',
    errorCategory: statusNum === 401 || statusNum === 403 ? 'authentication' : 'network',
    errorCode: statusStr,
    errorTitle: errorTitle,
    errorMessage: `Request returned status ${statusStr}: ${errorTitle}`,
    errorStack: null,
    toolName: null,
    functionName: null,
    arguments: null,
    filePath: null,
    sourceBlock: 'status',
    sourceMessageId: messageId,
    confidence: 0.95,
    patternSignature: generateSignature(`status_${statusStr}`)
  }
}

/**
 * Extract error from result object
 */
function extractErrorFromResult(result: any, messageId: string | null): ExtractedError | null {
  if (!result.error && result.status !== 'error' && result.success !== false) {
    return null
  }

  const errorMessage = typeof result.error === 'string' ? result.error :
    (result.error?.message || result.message || result.error_message || 'Unknown error')
  
  const errorCode = result.error?.code || result.code || result.status || null

  return {
    errorType: 'tool_error',
    errorCategory: 'other',
    errorCode: errorCode ? String(errorCode) : null,
    errorTitle: errorMessage.substring(0, 100),
    errorMessage: errorMessage,
    errorStack: result.error?.stack || result.stack || null,
    toolName: result.tool_name || result.toolName || null,
    functionName: null,
    arguments: null,
    filePath: extractFilePath(errorMessage),
    sourceBlock: 'result',
    sourceMessageId: messageId,
    confidence: 0.85,
    patternSignature: generateSignature(errorMessage)
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if an error message is a false positive
 */
function isFalsePositive(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  
  for (const pattern of falsePositivePatterns) {
    if (pattern.test(message)) {
      // Check if it's actually an error or just code
      const beforeMatch = message.substring(0, message.search(pattern))
      if (beforeMatch.includes('function') || beforeMatch.includes('const') || 
          beforeMatch.includes('let ') || beforeMatch.includes('var ')) {
        return true
      }
    }
  }
  
  // Check for common code patterns that mention error but aren't errors
  if (/^(const|let|var|function|class)\s+/.test(lowerMessage)) {
    return true
  }
  
  if (/^(export|import|return|throw)\s+/.test(lowerMessage)) {
    return true
  }

  return false
}

/**
 * Generate error title from matched text
 */
function generateErrorTitle(matchedText: string, type: string, errorCode: string | null): string {
  if (errorCode && httpStatusCodes[errorCode]) {
    return httpStatusCodes[errorCode]
  }
  
  // Clean up matched text for title
  let title = matchedText
    .replace(/error[:\s]+/gi, '')
    .replace(/^(the\s+)?/i, '')
    .substring(0, 80)
    .trim()
  
  if (title.length < 10) {
    title = `${type.replace('_', ' ')} error`
  }
  
  return title.charAt(0).toUpperCase() + title.slice(1)
}

/**
 * Extract file path from error context
 */
function extractFilePath(text: string): string | null {
  // Common file path patterns
  const patterns = [
    /['"`]([\/\w\-\.]+\.\w+)['"`]/,  // Quoted paths
    /(?:file|path)[:\s]+['"`]?([\/\w\-\.]+\.\w+)/i,
    /(?:in|at|reading|writing)\s+['"`]?([\/\w\-\.]+\.\w+)/i,
    /([\/\w\-\.]+\/[\w\-\.]+\.(ts|tsx|js|jsx|json|py|md|txt))/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  
  return null
}

/**
 * Calculate confidence score for detected error
 */
function calculateConfidence(matchedText: string, context: string): number {
  let confidence = 0.7
  
  // Increase confidence for specific indicators
  if (/error[:\s]/i.test(matchedText)) confidence += 0.1
  if (/failed/i.test(context)) confidence += 0.05
  if (/exception/i.test(context)) confidence += 0.05
  if (/\d{3}/.test(matchedText)) confidence += 0.1 // HTTP status code
  if (/file|path/i.test(context)) confidence += 0.05
  
  // Decrease confidence for potential false positives
  if (/catch|handle|throw/i.test(context)) confidence -= 0.2
  if (/function|const|let|var/i.test(context)) confidence -= 0.15
  if (/example|sample|test/i.test(context)) confidence -= 0.1
  
  return Math.max(0.3, Math.min(1.0, confidence))
}

/**
 * Generate pattern signature for grouping
 */
function generateSignature(text: string): string {
  // Normalize text for signature
  let signature = text
    .toLowerCase()
    .replace(/\d+/g, 'N')           // Replace numbers
    .replace(/['"`][^'"`]*['"`]/g, "'X'")  // Replace quoted strings
    .replace(/\/[\w\/\.\-]+/g, '/path')     // Replace paths
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100)
  
  // Create hash-like signature
  let hash = 0
  for (let i = 0; i < signature.length; i++) {
    const char = signature.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return `sig_${Math.abs(hash).toString(36)}`
}

/**
 * Categorize error from tool name
 */
function categorizeFromToolName(toolName: string): string {
  const lower = toolName.toLowerCase()
  
  if (lower.includes('read') || lower.includes('write') || lower.includes('file')) {
    return 'file_operation'
  }
  if (lower.includes('bash') || lower.includes('shell') || lower.includes('exec')) {
    return 'other'
  }
  if (lower.includes('fetch') || lower.includes('http') || lower.includes('request')) {
    return 'network'
  }
  if (lower.includes('db') || lower.includes('query') || lower.includes('prisma')) {
    return 'database'
  }
  
  return 'other'
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Save extracted errors to database
 */
export async function saveErrorPatterns(
  errors: ExtractedError[],
  rawDataId?: string,
  sessionId?: string
): Promise<number> {
  let saved = 0

  for (const error of errors) {
    try {
      // Check if pattern already exists
      const existing = await prisma.errorPattern.findFirst({
        where: { patternSignature: error.patternSignature }
      })

      if (existing) {
        // Update occurrence count and last seen
        await prisma.errorPattern.update({
          where: { id: existing.id },
          data: {
            occurrenceCount: { increment: 1 },
            updatedAt: new Date()
          }
        })
      } else {
        // Create new pattern
        await prisma.errorPattern.create({
          data: {
            patternHash: `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            rawDataId: rawDataId || null,
            sessionId: sessionId || null,
            errorType: error.errorType,
            errorCategory: error.errorCategory,
            errorCode: error.errorCode,
            errorTitle: error.errorTitle,
            errorMessage: error.errorMessage,
            errorStack: error.errorStack,
            toolName: error.toolName,
            functionName: error.functionName,
            arguments: error.arguments,
            filePath: error.filePath,
            patternSignature: error.patternSignature,
            sourceBlock: error.sourceBlock,
            sourceMessageId: error.sourceMessageId,
            confidence: error.confidence,
            researchStatus: 'pending',
            firstSeen: new Date(),
            lastSeen: new Date()
          }
        })
      }
      saved++
    } catch (e) {
      console.error(`[ErrorPatternService] Failed to save error pattern:`, e)
    }
  }

  return saved
}

/**
 * Get error pattern statistics
 */
export async function getErrorPatternStats(): Promise<ErrorPatternStats> {
  const patterns = await prisma.errorPattern.findMany({
    select: {
      errorType: true,
      errorCategory: true,
      status: true,
      researchStatus: true,
      firstSeen: true
    }
  })

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const stats: ErrorPatternStats = {
    totalPatterns: patterns.length,
    byType: {},
    byCategory: {},
    byStatus: {},
    byResearchStatus: {},
    recentPatterns: 0,
    resolvedPatterns: 0,
    recurringPatterns: 0
  }

  for (const pattern of patterns) {
    // Count by type
    stats.byType[pattern.errorType] = (stats.byType[pattern.errorType] || 0) + 1
    
    // Count by category
    stats.byCategory[pattern.errorCategory] = (stats.byCategory[pattern.errorCategory] || 0) + 1
    
    // Count by status
    stats.byStatus[pattern.status] = (stats.byStatus[pattern.status] || 0) + 1
    
    // Count by research status
    stats.byResearchStatus[pattern.researchStatus] = (stats.byResearchStatus[pattern.researchStatus] || 0) + 1
    
    // Count recent
    if (new Date(pattern.firstSeen) > oneWeekAgo) {
      stats.recentPatterns++
    }
    
    // Count resolved
    if (pattern.status === 'resolved') {
      stats.resolvedPatterns++
    }
  }

  // Count recurring patterns (occurrenceCount > 1)
  const recurring = await prisma.errorPattern.count({
    where: { occurrenceCount: { gt: 1 } }
  })
  stats.recurringPatterns = recurring

  return stats
}

/**
 * Get error patterns with filters
 */
export async function getErrorPatterns(options: {
  limit?: number
  offset?: number
  status?: string
  type?: string
  category?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}): Promise<{ patterns: any[]; total: number }> {
  const {
    limit = 50,
    offset = 0,
    status,
    type,
    category,
    sortBy = 'firstSeen',
    sortOrder = 'desc'
  } = options

  const where: any = {}
  if (status) where.status = status
  if (type) where.errorType = type
  if (category) where.errorCategory = category

  const [patterns, total] = await Promise.all([
    prisma.errorPattern.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: limit,
      skip: offset
    }),
    prisma.errorPattern.count({ where })
  ])

  return { patterns, total }
}

/**
 * Analyze raw data and extract patterns
 */
export async function analyzeRawDataForErrors(rawDataId: string): Promise<{
  extracted: number
  saved: number
  patterns: ExtractedError[]
}> {
  // Extract errors
  const patterns = await extractErrorsFromRawData(rawDataId)
  
  // Get session ID from raw data
  const rawData = await prisma.rawImportData.findUnique({
    where: { id: rawDataId },
    select: { sourceChatId: true }
  })
  
  // Save to database
  const saved = await saveErrorPatterns(patterns, rawDataId, rawData?.sourceChatId || undefined)

  return {
    extracted: patterns.length,
    saved,
    patterns
  }
}

/**
 * Update error pattern status
 */
export async function updateErrorPatternStatus(
  patternHash: string,
  status: string,
  resolution?: string
): Promise<boolean> {
  try {
    await prisma.errorPattern.update({
      where: { patternHash },
      data: {
        status,
        resolution: resolution || null,
        resolvedAt: status === 'resolved' ? new Date() : null,
        updatedAt: new Date()
      }
    })
    return true
  } catch {
    return false
  }
}

/**
 * Update research status
 */
export async function updateResearchStatus(
  patternHash: string,
  researchStatus: string
): Promise<boolean> {
  const validStatuses = ['pending', 'analyzed', 'verified', 'production-ready']
  if (!validStatuses.includes(researchStatus)) {
    return false
  }
  
  try {
    await prisma.errorPattern.update({
      where: { patternHash },
      data: {
        researchStatus,
        updatedAt: new Date()
      }
    })
    return true
  } catch {
    return false
  }
}

/**
 * Analyze error patterns using AI
 */
export async function analyzeErrorPatterns(options: {
  rawDataId?: string
  useAI?: boolean
  maxPatterns?: number
}): Promise<{
  patterns: any[]
  insights: string[]
  recommendations: string[]
}> {
  const { rawDataId, useAI = false, maxPatterns = 10 } = options

  // Get patterns to analyze
  let patterns: any[]
  
  if (rawDataId) {
    patterns = await prisma.errorPattern.findMany({
      where: { rawDataId },
      take: maxPatterns
    })
  } else {
    patterns = await prisma.errorPattern.findMany({
      where: { status: 'detected' },
      orderBy: { occurrenceCount: 'desc' },
      take: maxPatterns
    })
  }

  const insights: string[] = []
  const recommendations: string[] = []

  // Generate insights
  const typeCount: Record<string, number> = {}
  const categoryCount: Record<string, number> = {}
  const toolCount: Record<string, number> = {}

  for (const pattern of patterns) {
    typeCount[pattern.errorType] = (typeCount[pattern.errorType] || 0) + 1
    categoryCount[pattern.errorCategory] = (categoryCount[pattern.errorCategory] || 0) + 1
    if (pattern.toolName) {
      toolCount[pattern.toolName] = (toolCount[pattern.toolName] || 0) + 1
    }
  }

  // Most common error type
  const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]
  if (topType) {
    insights.push(`Most common error type: ${topType[0]} (${topType[1]} occurrences)`)
  }

  // Most common category
  const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]
  if (topCategory) {
    insights.push(`Most problematic area: ${topCategory[0]} (${topCategory[1]} errors)`)
  }

  // Most error-prone tool
  const topTool = Object.entries(toolCount).sort((a, b) => b[1] - a[1])[0]
  if (topTool) {
    insights.push(`Tool with most errors: ${topTool[0]} (${topTool[1]} failures)`)
  }

  // Generate recommendations based on patterns
  if (categoryCount['authentication'] > 2) {
    recommendations.push('Consider implementing credential rotation or refreshing authentication tokens automatically')
  }
  if (categoryCount['network'] > 3) {
    recommendations.push('High network error rate detected - consider adding retry logic with exponential backoff')
  }
  if (categoryCount['file_operation'] > 2) {
    recommendations.push('File operation errors detected - ensure proper file permissions and path validations')
  }
  if (categoryCount['database'] > 2) {
    recommendations.push('Database errors detected - review connection pooling and query optimization')
  }

  // Use AI for deeper analysis if requested
  if (useAI && patterns.length > 0) {
    try {
      // Import AI SDK
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()

      const patternSummary = patterns.slice(0, 5).map(p => 
        `- ${p.errorType}: ${p.errorTitle} (${p.occurrenceCount}x)`
      ).join('\n')

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an error pattern analyzer. Provide concise insights and actionable recommendations based on error patterns.'
          },
          {
            role: 'user',
            content: `Analyze these error patterns and provide insights:\n${patternSummary}`
          }
        ]
      })

      const aiResponse = completion.choices[0]?.message?.content
      if (aiResponse) {
        insights.push(`AI Analysis: ${aiResponse.substring(0, 500)}`)
      }
    } catch (e) {
      console.error('[ErrorPatternService] AI analysis failed:', e)
    }
  }

  return {
    patterns,
    insights,
    recommendations
  }
}
