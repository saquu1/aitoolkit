/**
 * ANALYTICS SYNC SERVICE
 * ======================
 * Syncs data from chat-logs to analytics database
 * Uses extraction-utils.ts for all data extraction
 * 
 * This is the SYNC LAYER that connects:
 * - RawImport (raw JSON data)
 * - ChatLog (parsed session data)
 * - AISession (analytics session data)
 */

import { db } from '@/lib/db'
import {
  extractSessionData,
  extractContentBlocks,
  extractToolCalls,
  extractFileOperations,
  extractIssuesWithDetails,
  extractFeaturesWithDetails,
  type ExtractedSessionData,
  type ExtractedContentBlock,
  type ExtractedToolCall,
  type ExtractedFileOperation,
  type ExtractedIssue,
  type ExtractedFeature
} from '@/lib/extraction-utils'

// =============================================================================
// SYNC RESULT TYPE
// =============================================================================

export interface SyncResult {
  success: boolean
  processed: number
  created: number
  updated: number
  errors: string[]
  details: {
    sessions: number
    issues: number
    features: number
    contentBlocks: number
    toolCalls: number
    fileOperations: number
  }
}

// =============================================================================
// MAIN SYNC FUNCTIONS
// =============================================================================

/**
 * Sync all chat logs to analytics
 */
export async function syncAllChatLogsToAnalytics(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    processed: 0,
    created: 0,
    updated: 0,
    errors: [],
    details: {
      sessions: 0,
      issues: 0,
      features: 0,
      contentBlocks: 0,
      toolCalls: 0,
      fileOperations: 0
    }
  }
  
  try {
    // Get all chat logs
    const chatLogs = await db.chatLog.findMany({
      orderBy: { sessionDate: 'desc' }
    })
    
    // Get all raw imports
    const rawImports = await db.rawImport.findMany({
      orderBy: { importedAt: 'desc' }
    })
    
    // Process each chat log
    for (const log of chatLogs) {
      try {
        // Find corresponding raw import
        const rawImport = rawImports.find(r => r.sourceChatId === log.sessionId)
        
        if (rawImport) {
          // Sync with raw data
          const syncResult = await syncRawImportToAnalytics(rawImport.id)
          result.details.sessions += syncResult.details.sessions
          result.details.issues += syncResult.details.issues
          result.details.features += syncResult.details.features
          result.details.contentBlocks += syncResult.details.contentBlocks
          result.details.toolCalls += syncResult.details.toolCalls
          result.details.fileOperations += syncResult.details.fileOperations
        } else {
          // Sync from chat log only (partial data)
          await syncChatLogToAnalytics(log)
          result.details.sessions++
        }
        
        result.processed++
      } catch (error) {
        result.errors.push(`Failed to sync log ${log.sessionId}: ${error}`)
      }
    }
    
    result.success = result.errors.length === 0
    return result
  } catch (error) {
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    return result
  }
}

/**
 * Sync a single raw import to analytics
 */
export async function syncRawImportToAnalytics(rawImportId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    processed: 0,
    created: 0,
    updated: 0,
    errors: [],
    details: {
      sessions: 0,
      issues: 0,
      features: 0,
      contentBlocks: 0,
      toolCalls: 0,
      fileOperations: 0
    }
  }
  
  try {
    // Get raw import
    const rawImport = await db.rawImport.findUnique({
      where: { id: rawImportId }
    })
    
    if (!rawImport) {
      result.errors.push('Raw import not found')
      return result
    }
    
    // Parse raw JSON
    const rawData = JSON.parse(rawImport.rawJson)
    
    // Check if session already exists
    const existingSession = await db.aISession.findFirst({
      where: { chatId: rawImport.sourceChatId }
    })
    
    // Extract session data
    const sessionData = extractSessionData(rawData, {
      sessionId: rawImport.sourceChatId,
      sessionDate: rawImport.importedAt,
      title: rawData.title || 'Imported Session',
      summary: rawData.summary || ''
    })
    
    // Create or update session
    let session
    if (existingSession) {
      session = await db.aISession.update({
        where: { id: existingSession.id },
        data: {
          sessionDate: sessionData.sessionDate,
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          duration: sessionData.duration,
          inputTokens: sessionData.inputTokens,
          outputTokens: sessionData.outputTokens,
          totalTokens: sessionData.totalTokens,
          estimatedCost: sessionData.estimatedCost,
          model: sessionData.model,
          category: sessionData.category,
          tags: JSON.stringify(sessionData.tags),
          title: sessionData.title,
          summary: sessionData.summary,
          updatedAt: new Date()
        }
      })
      result.updated++
    } else {
      session = await db.aISession.create({
        data: {
          chatId: rawImport.sourceChatId,
          sessionDate: sessionData.sessionDate,
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          duration: sessionData.duration,
          inputTokens: sessionData.inputTokens,
          outputTokens: sessionData.outputTokens,
          totalTokens: sessionData.totalTokens,
          estimatedCost: sessionData.estimatedCost,
          model: sessionData.model,
          category: sessionData.category,
          tags: JSON.stringify(sessionData.tags),
          title: sessionData.title,
          summary: sessionData.summary,
          status: 'completed',
          filesModified: sessionData.filesModified,
          filesCreated: sessionData.filesCreated,
          featuresImplemented: 0,
          issuesResolved: 0,
          issuesCreated: 0
        }
      })
      result.created++
    }
    
    result.details.sessions = 1
    
    // Extract messages from raw data
    const messages = extractMessages(rawData)
    
    // Extract and save content blocks
    const contentBlocks = extractContentBlocks(messages)
    for (const block of contentBlocks) {
      await db.contentBlock.create({
        data: {
          sessionId: session.id,
          blockIndex: block.blockIndex,
          blockType: block.blockType,
          content: block.content.slice(0, 50000),
          contentLength: block.contentLength,
          startedAt: block.startedAt,
          endedAt: block.endedAt,
          durationMs: block.durationMs,
          containsError: block.containsError,
          containsDecision: block.containsDecision,
          containsBacktrack: block.containsBacktrack,
          confidenceLevel: block.confidenceLevel,
          keywords: JSON.stringify(block.keywords),
          errorKeywords: JSON.stringify(block.errorKeywords),
          decisionKeywords: JSON.stringify(block.decisionKeywords),
          strategyChanges: JSON.stringify(block.strategyChanges)
        }
      })
      result.details.contentBlocks++
    }
    
    // Extract and save tool calls
    const toolCalls = extractToolCalls(messages)
    const fileOpMap = new Map<string, { created: boolean; modified: boolean; read: boolean; linesAdded: number; linesDeleted: number; editCount: number; errorCount: number }>()
    
    for (const tc of toolCalls) {
      await db.toolCall.create({
        data: {
          sessionId: session.id,
          externalCallId: tc.externalCallId,
          toolName: tc.toolName,
          description: tc.description,
          command: tc.command?.slice(0, 5000),
          filepath: tc.filepath,
          oldContent: tc.oldContent?.slice(0, 50000),
          newContent: tc.newContent?.slice(0, 50000),
          resultContent: tc.resultContent?.slice(0, 10000),
          resultStatus: tc.resultStatus,
          startedAt: tc.startedAt,
          endedAt: tc.endedAt,
          durationMs: tc.durationMs,
          isGitOperation: tc.isGitOperation,
          isBuildCommand: tc.isBuildCommand,
          hasError: tc.resultStatus === 'error'
        }
      })
      result.details.toolCalls++
      
      // Track file operations
      if (tc.filepath) {
        const existing = fileOpMap.get(tc.filepath) || { 
          created: false, modified: false, read: false, 
          linesAdded: 0, linesDeleted: 0, editCount: 0, errorCount: 0 
        }
        
        if (tc.toolName === 'WRITE') {
          existing.created = true
          existing.linesAdded += tc.newContent?.split('\n').length || 0
        }
        if (tc.toolName === 'EDIT') {
          existing.modified = true
          existing.linesAdded += tc.newContent?.split('\n').length || 0
          existing.linesDeleted += tc.oldContent?.split('\n').length || 0
          existing.editCount++
        }
        if (tc.toolName === 'READ') {
          existing.read = true
        }
        if (tc.resultStatus === 'error') {
          existing.errorCount++
        }
        
        fileOpMap.set(tc.filepath, existing)
      }
    }
    
    // Save file operations
    for (const [filepath, ops] of fileOpMap) {
      const fileType = extractFileType(filepath)
      const fileCategory = categorizeFile(filepath)
      const operation = ops.created ? 'CREATED' : ops.modified ? 'MODIFIED' : ops.read ? 'READ' : 'MODIFIED'
      
      await db.fileOperation.create({
        data: {
          sessionId: session.id,
          filepath,
          operation,
          linesAdded: ops.linesAdded,
          linesRemoved: ops.linesDeleted,
          netLines: ops.linesAdded - ops.linesDeleted,
          fileType,
          fileCategory,
          errorCount: ops.errorCount,
          editCount: ops.editCount
        }
      })
      result.details.fileOperations++
    }
    
    // Extract and save issues
    const issuesText = extractIssuesText(messages)
    const issues = extractIssuesWithDetails(issuesText, messages, toolCalls)
    for (const issue of issues) {
      await db.aIIssue.create({
        data: {
          sessionId: session.id,
          issueType: issue.issueType,
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
          status: issue.resolution ? 'resolved' : 'open',
          affectedFiles: JSON.stringify(issue.filesInvolved),
          relatedIssues: JSON.stringify(issue.relatedIssues)
        }
      })
      result.details.issues++
    }
    
    // Extract and save features
    const featuresText = extractFeaturesText(messages)
    const features = extractFeaturesWithDetails(featuresText, toolCalls, Array.from(fileOpMap.values()).map((ops, i) => ({
      filepath: Array.from(fileOpMap.keys())[i],
      operation: ops.created ? 'CREATED' as const : ops.modified ? 'MODIFIED' as const : 'READ' as const,
      linesAdded: ops.linesAdded,
      linesRemoved: ops.linesDeleted,
      netLines: ops.linesAdded - ops.linesDeleted,
      contentHash: undefined,
      contentSize: 0,
      fileType: undefined,
      fileCategory: undefined,
      errorCount: ops.errorCount,
      editCount: ops.editCount,
      tokensConsumed: 0,
      costUSD: 0
    })))
    
    for (const feature of features) {
      await db.aIFeature.create({
        data: {
          sessionId: session.id,
          featureName: feature.featureName,
          featureType: feature.featureType,
          description: feature.description,
          filesCreated: JSON.stringify(feature.filesCreated),
          filesModified: JSON.stringify(feature.filesModified),
          linesAdded: feature.linesAdded,
          linesDeleted: feature.linesDeleted
        }
      })
      result.details.features++
    }
    
    // Update session with counts
    await db.aISession.update({
      where: { id: session.id },
      data: {
        issuesCreated: result.details.issues,
        issuesResolved: issues.filter(i => i.resolution).length,
        featuresImplemented: result.details.features
      }
    })
    
    result.processed = 1
    return result
  } catch (error) {
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    return result
  }
}

/**
 * Sync a chat log (without raw data) to analytics
 */
async function syncChatLogToAnalytics(log: any): Promise<void> {
  // Check if session already exists
  const existing = await db.aISession.findFirst({
    where: { chatId: log.sessionId }
  })
  
  if (existing) {
    // Update existing session
    await db.aISession.update({
      where: { id: existing.id },
      data: {
        title: log.title,
        summary: log.summary,
        sessionDate: log.sessionDate,
        updatedAt: new Date()
      }
    })
  } else {
    // Create new session from log data
    const issuesSolved = JSON.parse(log.issuesSolved || '[]')
    const featuresAdded = JSON.parse(log.featuresAdded || '[]')
    const filesModified = JSON.parse(log.filesModified || '[]')
    
    await db.aISession.create({
      data: {
        chatId: log.sessionId,
        sessionDate: log.sessionDate,
        title: log.title,
        summary: log.summary,
        category: inferCategory(log.title, filesModified),
        tags: JSON.stringify([]),
        status: 'completed',
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        model: 'unknown',
        duration: 0,
        filesModified: filesModified.length,
        filesCreated: 0,
        featuresImplemented: featuresAdded.length,
        issuesCreated: issuesSolved.length,
        issuesResolved: issuesSolved.length
      }
    })
    
    // Create issues from log
    for (const issue of issuesSolved) {
      if (typeof issue === 'string' && issue.trim()) {
        await db.aIIssue.create({
          data: {
            sessionId: log.sessionId,
            issueType: 'other',
            severity: 'medium',
            title: issue.slice(0, 100),
            description: issue,
            status: 'resolved',
            resolvedBy: 'ai',
            resolvedAt: log.sessionDate
          }
        })
      }
    }
    
    // Create features from log
    for (const feature of featuresAdded) {
      if (typeof feature === 'string' && feature.trim()) {
        await db.aIFeature.create({
          data: {
            sessionId: log.sessionId,
            featureName: feature.slice(0, 100),
            featureType: inferFeatureType(feature),
            description: feature
          }
        })
      }
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function extractMessages(data: any): any[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (data.messages && Array.isArray(data.messages)) return data.messages
  if (data.data && typeof data.data === 'object') {
    return Object.values(data.data)
  }
  return []
}

function extractIssuesText(messages: any[]): string[] {
  const issues: string[] = []
  const errorPatterns = /error|exception|failed|failure|bug|issue|problem|warning/i
  
  for (const msg of messages) {
    if (msg.role === 'user' && msg.content) {
      const lines = msg.content.split('\n')
      for (const line of lines) {
        if (errorPatterns.test(line) && line.trim().length > 10) {
          issues.push(line.trim())
        }
      }
    }
    
    // Also check content blocks
    if (msg.content_blocks) {
      for (const block of msg.content_blocks) {
        if (block.type === 'text' && typeof block.content === 'string') {
          const lines = block.content.split('\n')
          for (const line of lines) {
            if (errorPatterns.test(line) && line.trim().length > 10) {
              issues.push(line.trim())
            }
          }
        }
      }
    }
  }
  
  return [...new Set(issues)]
}

function extractFeaturesText(messages: any[]): string[] {
  const features: string[] = []
  const featurePatterns = /implement|create|add|feature|build|develop/i
  
  for (const msg of messages) {
    if (msg.role === 'user' && msg.content) {
      const lines = msg.content.split('\n')
      for (const line of lines) {
        if (featurePatterns.test(line) && line.trim().length > 10) {
          features.push(line.trim())
        }
      }
    }
  }
  
  return [...new Set(features)]
}

function extractFileType(filepath: string): string {
  const ext = filepath.split('.').pop()?.toLowerCase() || ''
  return ext
}

function categorizeFile(filepath: string): string {
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

function inferCategory(title: string, files: string[]): string {
  const titleLower = title.toLowerCase()
  const filesStr = files.join(' ').toLowerCase()
  
  if (titleLower.includes('api') || filesStr.includes('/api/')) return 'api'
  if (titleLower.includes('ui') || titleLower.includes('component') || filesStr.includes('.tsx')) return 'frontend'
  if (titleLower.includes('database') || titleLower.includes('schema') || filesStr.includes('prisma')) return 'database'
  if (titleLower.includes('auth') || titleLower.includes('login')) return 'authentication'
  if (titleLower.includes('test')) return 'testing'
  if (titleLower.includes('bug') || titleLower.includes('fix')) return 'bugfix'
  if (titleLower.includes('refactor')) return 'refactoring'
  if (titleLower.includes('feature')) return 'feature'
  
  return 'development'
}

function inferFeatureType(featureText: string): string {
  const lower = featureText.toLowerCase()
  
  if (lower.includes('component') || lower.includes('ui')) return 'component'
  if (lower.includes('api') || lower.includes('endpoint')) return 'api'
  if (lower.includes('page') || lower.includes('route')) return 'page'
  if (lower.includes('hook')) return 'hook'
  if (lower.includes('util') || lower.includes('helper')) return 'util'
  if (lower.includes('test')) return 'test'
  
  return 'feature'
}

// =============================================================================
// INCREMENTAL SYNC
// =============================================================================

/**
 * Sync only new/updated records since last sync
 */
export async function syncIncremental(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    processed: 0,
    created: 0,
    updated: 0,
    errors: [],
    details: {
      sessions: 0,
      issues: 0,
      features: 0,
      contentBlocks: 0,
      toolCalls: 0,
      fileOperations: 0
    }
  }
  
  try {
    // Get last sync timestamp from metadata
    const lastSync = await db.systemMetadata.findUnique({
      where: { key: 'last_analytics_sync' }
    })
    
    const lastSyncDate = lastSync ? new Date(lastSync.value) : new Date(0)
    
    // Get new raw imports since last sync
    const newImports = await db.rawImport.findMany({
      where: {
        importedAt: { gte: lastSyncDate }
      }
    })
    
    // Process each new import
    for (const imp of newImports) {
      const syncResult = await syncRawImportToAnalytics(imp.id)
      result.processed += syncResult.processed
      result.created += syncResult.created
      result.updated += syncResult.updated
      result.errors.push(...syncResult.errors)
      result.details.sessions += syncResult.details.sessions
      result.details.issues += syncResult.details.issues
      result.details.features += syncResult.details.features
      result.details.contentBlocks += syncResult.details.contentBlocks
      result.details.toolCalls += syncResult.details.toolCalls
      result.details.fileOperations += syncResult.details.fileOperations
    }
    
    // Update last sync timestamp
    await db.systemMetadata.upsert({
      where: { key: 'last_analytics_sync' },
      create: { key: 'last_analytics_sync', value: new Date().toISOString() },
      update: { value: new Date().toISOString() }
    })
    
    result.success = result.errors.length === 0
    return result
  } catch (error) {
    result.success = false
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    return result
  }
}
