/**
 * RAW DATA SERVICE
 * ================
 * Saves raw import data with full traceability chain:
 * Raw → Date → Session → Issues → Features → Output
 * Output → Features → Issues → Session → Date → Raw
 */

import { db } from './db'
import { PrismaClient } from '@prisma/client'
import { extractAnalyticsFromBatchResponse } from './analytics-extraction-service'

const prisma = new PrismaClient()

// =============================================================================
// DUPLICATE DETECTION
// =============================================================================

export interface DuplicateCheckResult {
  isExactDuplicate: boolean        // All messages match exactly
  isPartialDuplicate: boolean      // Some messages overlap
  existingRawDataId: string | null
  existingChatLogId: string | null
  existingTitle: string | null
  matchPercentage: number          // 0-100
  matchedMessages: number
  totalMessages: number
  duplicateType: 'exact' | 'partial' | 'evolved' | 'none'
  messageDetails: {
    messageId: string
    parentId: string
    childrenIds: string
    status: 'new' | 'exact_match' | 'evolved'
  }[]
  // Additional fields for UI
  newMessages?: number             // Messages that are new (for evolved conversations)
  hint?: string                    // Helpful hint for the user
  allowForceSave?: boolean         // Whether force save is allowed
}

/**
 * Extract message keys from raw JSON for duplicate detection
 */
function extractMessageKeys(rawJson: string): Map<string, { parentId: string; childrenIds: string }> {
  const messageKeys = new Map<string, { parentId: string; childrenIds: string }>()
  
  try {
    const parsed = JSON.parse(rawJson)
    let messages: any[] = []
    
    // Handle different JSON formats
    if (parsed.data && typeof parsed.data === 'object') {
      messages = Object.values(parsed.data)
    } else if (Array.isArray(parsed.messages)) {
      messages = parsed.messages
    } else if (Array.isArray(parsed)) {
      messages = parsed
    }
    
    for (const msg of messages) {
      if (msg && msg.id) {
        const parentId = msg.parent_id || msg.parentId || 'NULL'
        const childrenIds = (msg.childrenIds || []).sort().join(',')
        messageKeys.set(msg.id, { parentId, childrenIds })
      }
    }
  } catch (e) {
    console.error('[DuplicateCheck] Error extracting message keys:', e)
  }
  
  return messageKeys
}

/**
 * Check for duplicates using RawDataLink table (faster - no need to parse rawJson)
 * This checks the MessageIdentifier links directly
 */
export async function checkForDuplicatesFast(rawJson: string): Promise<DuplicateCheckResult> {
  const result: DuplicateCheckResult = {
    isExactDuplicate: false,
    isPartialDuplicate: false,
    existingRawDataId: null,
    existingChatLogId: null,
    existingTitle: null,
    matchPercentage: 0,
    matchedMessages: 0,
    totalMessages: 0,
    duplicateType: 'none',
    messageDetails: []
  }
  
  // Extract message keys from input
  const inputKeys = extractMessageKeys(rawJson)
  result.totalMessages = inputKeys.size
  
  if (inputKeys.size === 0) {
    return result // No messages to check
  }
  
  // Build the entityName patterns to search for (format: msgId|parentId|childrenIds)
  const searchPatterns: string[] = []
  for (const [msgId, msgData] of inputKeys) {
    searchPatterns.push(`${msgId}|${msgData.parentId}|${msgData.childrenIds}`)
  }
  
  // Query RawDataLink for matching MessageIdentifier entities
  const matchingLinks = await prisma.rawDataLink.findMany({
    where: {
      entityType: 'MessageIdentifier',
      entityName: { in: searchPatterns }
    },
    select: {
      rawDataId: true,
      entityId: true,
      entityName: true
    }
  })
  
  if (matchingLinks.length === 0) {
    return result // No matches found
  }
  
  // Group matches by rawDataId
  const matchesByRawData = new Map<string, number>()
  for (const link of matchingLinks) {
    const count = matchesByRawData.get(link.rawDataId) || 0
    matchesByRawData.set(link.rawDataId, count + 1)
  }
  
  // Find best match
  let bestRawDataId = ''
  let bestMatchCount = 0
  
  for (const [rawDataId, count] of matchesByRawData) {
    if (count > bestMatchCount) {
      bestMatchCount = count
      bestRawDataId = rawDataId
    }
  }
  
  // Get total message count for the best match
  const totalMessagesInMatch = await prisma.rawDataLink.count({
    where: {
      rawDataId: bestRawDataId,
      entityType: 'MessageIdentifier'
    }
  })
  
  // Populate result
  result.matchedMessages = bestMatchCount
  result.matchPercentage = Math.round((bestMatchCount / inputKeys.size) * 100)
  result.existingRawDataId = bestRawDataId
  
  // Get chat log info
  const chatLog = await prisma.chatLog.findFirst({
    where: { rawDataId: bestRawDataId },
    select: { id: true, title: true }
  })
  
  if (chatLog) {
    result.existingChatLogId = chatLog.id
    result.existingTitle = chatLog.title || ''
  }
  
  // Determine duplicate type
  if (bestMatchCount === inputKeys.size && bestMatchCount === totalMessagesInMatch) {
    result.isExactDuplicate = true
    result.duplicateType = 'exact'
    result.hint = 'This is an exact duplicate. Click "View Raw Data" to see the existing import.'
    result.allowForceSave = false
  } else if (bestMatchCount === inputKeys.size) {
    // All input messages exist in existing data (subset)
    result.isPartialDuplicate = true
    result.duplicateType = 'partial'
    result.hint = 'All messages in this import already exist in the database.'
    result.allowForceSave = false
  } else {
    // Some messages overlap - evolved conversation
    result.isPartialDuplicate = true
    result.duplicateType = 'evolved'
    result.newMessages = inputKeys.size - bestMatchCount
    result.hint = `This is an evolved conversation with ${result.newMessages} new messages. You can save it as a new version.`
    result.allowForceSave = true
  }
  
  return result
}

/**
 * Check for duplicates before saving raw data
 * Returns detailed information about any existing duplicates
 * 
 * NOTE: Uses fast check via RawDataLink table first, falls back to rawJson parsing
 */
export async function checkForDuplicates(rawJson: string): Promise<DuplicateCheckResult> {
  // Try fast check first using RawDataLink table
  const fastResult = await checkForDuplicatesFast(rawJson)
  
  // If we found matches via fast check, return those results
  if (fastResult.matchedMessages > 0) {
    console.log(`[DuplicateCheck] Fast check found ${fastResult.matchedMessages} matches`)
    return fastResult
  }
  
  // Fallback to original method (parsing rawJson)
  // This handles cases where RawDataLinks weren't created
  const result: DuplicateCheckResult = {
    isExactDuplicate: false,
    isPartialDuplicate: false,
    existingRawDataId: null,
    existingChatLogId: null,
    existingTitle: null,
    matchPercentage: 0,
    matchedMessages: 0,
    totalMessages: 0,
    duplicateType: 'none',
    messageDetails: []
  }
  
  // Extract message keys from input
  const inputKeys = extractMessageKeys(rawJson)
  result.totalMessages = inputKeys.size
  
  if (inputKeys.size === 0) {
    return result // No messages to check
  }
  
  // Get all existing raw data
  const existingImports = await prisma.rawImportData.findMany({
    select: { id: true, rawJson: true },
    orderBy: { importedAt: 'desc' },
    take: 100 // Check last 100 imports
  })
  
  let bestMatch = {
    rawDataId: '',
    matchCount: 0,
    exactMatch: false,
    chatLogId: '',
    title: ''
  }
  
  // Check against each existing import
  for (const existing of existingImports) {
    if (!existing.rawJson) continue
    
    const existingKeys = extractMessageKeys(existing.rawJson)
    
    if (existingKeys.size === 0) continue
    
    let exactMatchCount = 0
    let evolvedCount = 0
    
    // Check each input message
    for (const [msgId, msgData] of inputKeys) {
      const existingData = existingKeys.get(msgId)
      
      if (existingData) {
        // Message ID exists in existing data
        if (existingData.parentId === msgData.parentId && existingData.childrenIds === msgData.childrenIds) {
          exactMatchCount++ // Exact duplicate
        } else {
          evolvedCount++ // Same message but connections changed
        }
      }
    }
    
    const totalMatch = exactMatchCount + evolvedCount
    
    // Check if this is a better match
    if (exactMatchCount > bestMatch.matchCount || (exactMatchCount === bestMatch.matchCount && totalMatch > bestMatch.matchCount)) {
      bestMatch = {
        rawDataId: existing.id,
        matchCount: exactMatchCount,
        exactMatch: exactMatchCount === inputKeys.size && exactMatchCount === existingKeys.size,
        chatLogId: '',
        title: ''
      }
      
      // Get chat log info
      const chatLog = await prisma.chatLog.findFirst({
        where: { rawDataId: existing.id },
        select: { id: true, title: true }
      })
      
      if (chatLog) {
        bestMatch.chatLogId = chatLog.id
        bestMatch.title = chatLog.title || ''
      }
    }
  }
  
  // Populate result
  if (bestMatch.matchCount > 0) {
    result.matchedMessages = bestMatch.matchCount
    result.matchPercentage = Math.round((bestMatch.matchCount / inputKeys.size) * 100)
    result.existingRawDataId = bestMatch.rawDataId
    result.existingChatLogId = bestMatch.chatLogId || null
    result.existingTitle = bestMatch.title || null
    
    if (bestMatch.exactMatch) {
      result.isExactDuplicate = true
      result.duplicateType = 'exact'
      result.hint = 'This is an exact duplicate. Click "View Raw Data" to see the existing import.'
      result.allowForceSave = false // Don't allow saving exact duplicates
    } else if (bestMatch.matchCount === inputKeys.size) {
      // All input messages exist in existing data (subset)
      result.isPartialDuplicate = true
      result.duplicateType = 'partial'
      result.hint = 'All messages in this import already exist in the database.'
      result.allowForceSave = false // Don't allow subset duplicates
    } else {
      // Some messages overlap - this is evolved conversation
      result.isPartialDuplicate = true
      result.duplicateType = 'evolved'
      result.newMessages = inputKeys.size - bestMatch.matchCount
      result.hint = `This is an evolved conversation with ${result.newMessages} new messages. You can save it as a new version.`
      result.allowForceSave = true // Allow saving evolved conversations
    }
  }
  
  return result
}

// Chain levels for traceability
export enum ChainLevel {
  RAW = 0,
  DATE = 1,
  SESSION = 2,
  ISSUES = 3,
  FEATURES = 4,
  OUTPUT = 5,
  MESSAGE_IDS = 6  // Message identifiers (id, parent_id, childrenIds) for deduplication
}

// Entity types that can be linked
export type LinkableEntity = 
  | 'ChatLog' 
  | 'AISession' 
  | 'AIIssue' 
  | 'AIFeature' 
  | 'ContentBlock' 
  | 'ToolCall' 
  | 'FileOperation'

// Result of saving raw data
export interface RawDataSaveResult {
  success: boolean
  rawDataId: string
  chatLogId: string
  sessionId?: string
  issuesLinked: number
  featuresLinked: number
  error?: string
}

// Input for saving raw data
export interface RawDataInput {
  sourceType: 'batch_import' | 'auto_fetch' | 'manual'
  sourceUrl?: string
  sourceChatId?: string
  rawJson: string | object
  parsedData: {
    sessionId: string
    sessionDate: string
    title: string
    summary?: string
    issuesSolved: string[]
    featuresAdded: string[]
    filesModified: string[]
    commits: string[]
    notes?: string
    source: string
  }
}

/**
 * Save raw data with full traceability chain
 * This is the main function to call when importing data
 * 
 * @param input - The raw data input
 * @param options - Options including skipFullExtraction for faster saves
 */
export async function saveRawDataWithTraceability(
  input: RawDataInput,
  options: { skipFullExtraction?: boolean } = { skipFullExtraction: true }
): Promise<RawDataSaveResult> {
  const result: RawDataSaveResult = {
    success: false,
    rawDataId: '',
    chatLogId: '',
    sessionId: input.parsedData.sessionId,
    issuesLinked: 0,
    featuresLinked: 0
  }

  try {
    // 1. Save the raw data first (Level 0)
    const rawJsonStr = typeof input.rawJson === 'string' 
      ? input.rawJson 
      : JSON.stringify(input.rawJson)
    
    const rawData = await prisma.rawImportData.create({
      data: {
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl,
        sourceChatId: input.sourceChatId,
        rawJson: rawJsonStr,
        rawSizeBytes: Buffer.byteLength(rawJsonStr, 'utf8'),
        messageCount: countMessages(rawJsonStr),
        parseStatus: 'parsed',
        parsedAt: new Date()
      }
    })
    
    result.rawDataId = rawData.id
    console.log(`[RawDataService] Saved raw data: ${rawData.id}`)

    // 2. Create ChatLog linked to raw data (Level 1 - Date, Level 2 - Session)
    const chatLog = await prisma.chatLog.create({
      data: {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: input.parsedData.sessionId,
        sessionDate: input.parsedData.sessionDate,
        title: input.parsedData.title,
        summary: input.parsedData.summary || '',
        issuesSolved: JSON.stringify(input.parsedData.issuesSolved),
        featuresAdded: JSON.stringify(input.parsedData.featuresAdded),
        filesModified: JSON.stringify(input.parsedData.filesModified),
        commits: JSON.stringify(input.parsedData.commits),
        notes: input.parsedData.notes || '',
        source: input.parsedData.source,
        rawDataId: rawData.id,
        updatedAt: new Date()
      }
    })
    
    result.chatLogId = chatLog.id
    console.log(`[RawDataService] Created ChatLog: ${chatLog.id}`)

    // 3. Create traceability links
    const links: Array<{
      chainLevel: number
      chainOrder: number
      entityType: string
      entityId: string
      entityName: string | null
      extractionPath: string | null
    }> = []

    // Level 0: Raw data
    links.push({
      chainLevel: ChainLevel.RAW,
      chainOrder: 0,
      entityType: 'RawImportData',
      entityId: `raw_${rawData.id}`,
      entityName: `Raw Import ${rawData.importedAt.toISOString()}`,
      extractionPath: '$'
    })

    // Level 1: Date
    links.push({
      chainLevel: ChainLevel.DATE,
      chainOrder: 0,
      entityType: 'SessionDate',
      entityId: `date_${chatLog.id}`,
      entityName: `Date: ${input.parsedData.sessionDate}`,
      extractionPath: '$.sessionDate'
    })

    // Level 2: Session
    links.push({
      chainLevel: ChainLevel.SESSION,
      chainOrder: 0,
      entityType: 'ChatLog',
      entityId: `session_${chatLog.id}`,
      entityName: input.parsedData.title,
      extractionPath: '$.sessionId'
    })

    // Level 3: Issues
    for (let i = 0; i < input.parsedData.issuesSolved.length; i++) {
      const issue = input.parsedData.issuesSolved[i]
      links.push({
        chainLevel: ChainLevel.ISSUES,
        chainOrder: i,
        entityType: 'Issue',
        entityId: `issue_${chatLog.id}_${i}`,
        entityName: issue.substring(0, 100), // First 100 chars
        extractionPath: `$.issuesSolved[${i}]`
      })
      result.issuesLinked++
    }

    // Level 4: Features
    for (let i = 0; i < input.parsedData.featuresAdded.length; i++) {
      const feature = input.parsedData.featuresAdded[i]
      links.push({
        chainLevel: ChainLevel.FEATURES,
        chainOrder: i,
        entityType: 'Feature',
        entityId: `feature_${chatLog.id}_${i}`,
        entityName: feature.substring(0, 100), // First 100 chars
        extractionPath: `$.featuresAdded[${i}]`
      })
      result.featuresLinked++
    }

    // Level 5: Output (files, commits)
    for (let i = 0; i < input.parsedData.filesModified.length; i++) {
      const file = input.parsedData.filesModified[i]
      links.push({
        chainLevel: ChainLevel.OUTPUT,
        chainOrder: i,
        entityType: 'FileOutput',
        entityId: `file_${chatLog.id}_${i}`,
        entityName: file,
        extractionPath: `$.filesModified[${i}]`
      })
    }

    // Level 6: Message Identifiers (for deduplication traceability)
    // Extract message IDs, parent_ids, and childrenIds from rawJson
    const messageIds = extractMessageKeys(rawJsonStr)
    let msgOrder = 0
    for (const [msgId, msgData] of messageIds) {
      links.push({
        chainLevel: ChainLevel.MESSAGE_IDS,
        chainOrder: msgOrder,
        entityType: 'MessageIdentifier',
        entityId: `msg_${msgId}`,
        entityName: `${msgId}|${msgData.parentId}|${msgData.childrenIds}`,  // Store all identifiers
        extractionPath: `$.data.${msgId}`
      })
      msgOrder++
    }

    // Batch insert all links
    await prisma.rawDataLink.createMany({
      data: links.map(link => ({
        rawDataId: rawData.id,
        ...link,
        extractionConfidence: 1.0,
        extractionMethod: 'auto'
      }))
    })

    console.log(`[RawDataService] Created ${links.length} traceability links`)

    // 4. Sync to AISession (skip full extraction for faster saves by default)
    await syncToAISession(input.parsedData, rawData.id, rawJsonStr, options.skipFullExtraction)

    result.success = true
    return result

  } catch (error) {
    console.error('[RawDataService] Error saving raw data:', error)
    result.error = error instanceof Error ? error.message : 'Unknown error'
    return result
  }
}

/**
 * Sync data to AISession for analytics dashboard
 * Now calls full extraction to create ContentBlocks, ToolCalls, FileOperations
 * 
 * IMPORTANT: This can be skipped for faster saves (set skipFullExtraction: true)
 */
async function syncToAISession(
  parsedData: RawDataInput['parsedData'],
  rawDataId: string,
  rawJson?: string,
  skipFullExtraction: boolean = false
): Promise<void> {
  try {
    console.log(`[RawDataService] Syncing to AISession...`)
    
    // If skipping full extraction, just create basic session
    if (skipFullExtraction) {
      console.log(`[RawDataService] Skipping full extraction, creating basic session only`)
      const existingSession = await db.aISession.findFirst({
        where: { chatId: parsedData.sessionId }
      })

      if (!existingSession) {
        await db.aISession.create({
          data: {
            chatId: parsedData.sessionId,
            sessionDate: new Date(parsedData.sessionDate),
            startTime: new Date(parsedData.sessionDate),
            title: parsedData.title,
            summary: parsedData.summary || '',
            duration: 0,
            totalTokens: 0,
            estimatedCost: 0,
            model: 'unknown',
            category: inferCategory(parsedData.title, parsedData.filesModified),
            sessionType: inferSessionType(parsedData.title),
            filesModified: parsedData.filesModified.length,
            filesCreated: 0,
            featuresImplemented: parsedData.featuresAdded.length,
            issuesCreated: parsedData.issuesSolved.length,
            issuesResolved: parsedData.issuesSolved.length,
            status: 'completed'
          }
        })
        console.log(`[RawDataService] Created basic AISession`)
      }
      return
    }
    
    // If we have rawJson, extract messages and run full extraction
    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson)
        
        // Extract messages from batch response format
        // Format: { data: { messageId: { ...message }, ... } }
        let messages: any[] = []
        if (parsed.data && typeof parsed.data === 'object') {
          messages = Object.values(parsed.data)
          console.log(`[RawDataService] Extracted ${messages.length} messages from rawJson`)
        } else if (Array.isArray(parsed.messages)) {
          messages = parsed.messages
          console.log(`[RawDataService] Extracted ${messages.length} messages from messages array`)
        } else if (Array.isArray(parsed)) {
          messages = parsed
          console.log(`[RawDataService] Raw JSON is array with ${messages.length} messages`)
        }
        
        if (messages.length > 0) {
          // Run full extraction which creates:
          // - AISession
          // - ContentBlocks
          // - ToolCalls
          // - FileOperations
          // - AIIssues
          // - AIFeatures
          // - AICostRecord
          // - AIMessageRecords
          console.log(`[RawDataService] Running full extraction for ${messages.length} messages...`)
          
          const result = await extractAnalyticsFromBatchResponse(
            parsedData.sessionId,
            messages,
            {
              saveToDb: true,
              enhanceWithAI: false
            }
          )
          
          console.log(`[RawDataService] Full extraction complete:`)
          console.log(`  - Title: ${result.session.title}`)
          console.log(`  - Tokens: ${result.session.totalTokens}`)
          console.log(`  - Files: ${result.session.filesModified} modified, ${result.session.filesCreated} created`)
          console.log(`  - Issues: ${result.issues.length}`)
          console.log(`  - Features: ${result.features.length}`)
          
          return // Full extraction handled everything
        }
      } catch (extractError) {
        console.error('[RawDataService] Full extraction failed, falling back to basic session:', extractError)
        // Fall through to basic session creation
      }
    }
    
    // Fallback: Create basic AISession without full extraction
    const existingSession = await db.aISession.findFirst({
      where: { chatId: parsedData.sessionId }
    })

    if (!existingSession) {
      await db.aISession.create({
        data: {
          chatId: parsedData.sessionId,
          sessionDate: new Date(parsedData.sessionDate),
          startTime: new Date(parsedData.sessionDate),
          title: parsedData.title,
          summary: parsedData.summary || '',
          duration: 0,
          totalTokens: 0,
          estimatedCost: 0,
          model: 'unknown',
          category: inferCategory(parsedData.title, parsedData.filesModified),
          sessionType: inferSessionType(parsedData.title),
          filesModified: parsedData.filesModified.length,
          filesCreated: 0,
          featuresImplemented: parsedData.featuresAdded.length,
          issuesCreated: parsedData.issuesSolved.length,
          issuesResolved: parsedData.issuesSolved.length,
          status: 'completed'
        }
      })
      console.log(`[RawDataService] Created basic AISession (no rawJson available)`)
    }
  } catch (error) {
    console.log('[RawDataService] Could not sync to AISession:', error)
    // Don't fail the whole operation
  }
}

/**
 * Get raw data by chat ID (reverse lookup: Output → ... → Raw)
 * Excludes rawJson by default for performance
 */
export async function getRawDataByChatId(chatId: string, includeRawJson: boolean = false) {
  const chatLog = await prisma.chatLog.findFirst({
    where: { sessionId: chatId },
    include: {
      rawImportData: {
        select: {
          id: true,
          sourceType: true,
          sourceUrl: true,
          sourceChatId: true,
          rawSizeBytes: true,
          messageCount: true,
          parseStatus: true,
          importedAt: true,
          parsedAt: true,
          // Only include rawJson if explicitly requested (can be large)
          ...(includeRawJson ? { rawJson: true } : {}),
          RawDataLink: {
            orderBy: [{ chainLevel: 'asc' }, { chainOrder: 'asc' }]
          }
        }
      }
    }
  })

  if (!chatLog?.rawImportData) {
    return null
  }

  return {
    chatLog,
    rawData: chatLog.rawImportData,
    traceabilityChain: buildTraceabilityChain(chatLog.rawImportData.RawDataLink)
  }
}

/**
 * Get raw data by issue (reverse lookup)
 * Excludes rawJson for performance
 */
export async function getRawDataByIssue(issueText: string) {
  const links = await prisma.rawDataLink.findMany({
    where: {
      entityType: 'Issue',
      entityName: { contains: issueText.substring(0, 50) }
    },
    include: {
      rawImportData: {
        select: {
          id: true,
          sourceType: true,
          rawSizeBytes: true,
          messageCount: true,
          parseStatus: true,
          importedAt: true,
          // Exclude rawJson for performance
          ChatLog: {
            select: {
              sessionId: true,
              sessionDate: true,
              title: true
            }
          }
        }
      }
    },
    take: 10
  })

  return links.map(link => ({
    rawDataId: link.rawDataId,
    rawData: link.rawImportData,
    chatLog: link.rawImportData?.ChatLog,
    matchedIssue: link.entityName
  }))
}

/**
 * Get raw data by feature (reverse lookup)
 * Excludes rawJson for performance
 */
export async function getRawDataByFeature(featureText: string) {
  const links = await prisma.rawDataLink.findMany({
    where: {
      entityType: 'Feature',
      entityName: { contains: featureText.substring(0, 50) }
    },
    include: {
      rawImportData: {
        select: {
          id: true,
          sourceType: true,
          rawSizeBytes: true,
          messageCount: true,
          parseStatus: true,
          importedAt: true,
          // Exclude rawJson for performance
          ChatLog: {
            select: {
              sessionId: true,
              sessionDate: true,
              title: true
            }
          }
        }
      }
    },
    take: 10
  })

  return links.map(link => ({
    rawDataId: link.rawDataId,
    rawData: link.rawImportData,
    chatLog: link.rawImportData?.ChatLog,
    matchedFeature: link.entityName
  }))
}

/**
 * Get raw data by date (reverse lookup)
 * Excludes rawJson for performance
 */
export async function getRawDataByDate(date: string) {
  const links = await prisma.rawDataLink.findMany({
    where: {
      chainLevel: ChainLevel.DATE,
      entityName: { contains: date }
    },
    include: {
      rawImportData: {
        select: {
          id: true,
          sourceType: true,
          rawSizeBytes: true,
          messageCount: true,
          parseStatus: true,
          importedAt: true,
          // Exclude rawJson for performance
          ChatLog: {
            select: {
              sessionId: true,
              sessionDate: true,
              title: true
            }
          }
        }
      }
    },
    take: 100
  })

  return links.map(link => ({
    rawDataId: link.rawDataId,
    rawData: link.rawImportData,
    chatLog: link.rawImportData?.ChatLog
  }))
}

/**
 * Get the complete traceability chain for a raw data import
 */
export async function getTraceabilityChain(rawDataId: string) {
  const rawData = await prisma.rawImportData.findUnique({
    where: { id: rawDataId },
    include: {
      RawDataLink: {
        orderBy: [{ chainLevel: 'asc' }, { chainOrder: 'asc' }]
      },
      ChatLog: true
    }
  })

  if (!rawData) {
    return null
  }

  return {
    rawData,
    chatLog: rawData.ChatLog,
    chain: buildTraceabilityChain(rawData.RawDataLink)
  }
}

/**
 * Build a readable traceability chain from links
 */
function buildTraceabilityChain(links: any[]) {
  const chain: Record<number, any[]> = {}
  
  for (const link of links) {
    if (!chain[link.chainLevel]) {
      chain[link.chainLevel] = []
    }
    chain[link.chainLevel].push({
      entityType: link.entityType,
      entityId: link.entityId,
      entityName: link.entityName,
      extractionPath: link.extractionPath
    })
  }

  return {
    raw: chain[ChainLevel.RAW] || [],
    date: chain[ChainLevel.DATE] || [],
    session: chain[ChainLevel.SESSION] || [],
    issues: chain[ChainLevel.ISSUES] || [],
    features: chain[ChainLevel.FEATURES] || [],
    output: chain[ChainLevel.OUTPUT] || [],
    messageIds: chain[ChainLevel.MESSAGE_IDS] || []  // Message identifiers for deduplication
  }
}

/**
 * Count messages in raw JSON
 */
function countMessages(rawJson: string): number {
  try {
    const parsed = JSON.parse(rawJson)
    if (Array.isArray(parsed)) return parsed.length
    if (parsed.messages && Array.isArray(parsed.messages)) return parsed.messages.length
    return 1
  } catch {
    return 0
  }
}

/**
 * Infer category from title and files
 */
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

/**
 * Infer session type from title
 */
function inferSessionType(title: string): string {
  const titleLower = title.toLowerCase()
  
  if (titleLower.includes('fix') || titleLower.includes('bug') || titleLower.includes('error')) return 'BUG_FIX'
  if (titleLower.includes('feature') || titleLower.includes('add') || titleLower.includes('implement')) return 'FEATURE'
  if (titleLower.includes('refactor') || titleLower.includes('clean') || titleLower.includes('optimize')) return 'REFACTOR'
  if (titleLower.includes('architecture') || titleLower.includes('design') || titleLower.includes('structure')) return 'ARCHITECTURE'
  if (titleLower.includes('doc') || titleLower.includes('readme') || titleLower.includes('comment')) return 'DOCUMENTATION'
  if (titleLower.includes('test')) return 'TESTING'
  if (titleLower.includes('deploy') || titleLower.includes('build') || titleLower.includes('ci')) return 'DEPLOYMENT'
  
  return 'UNKNOWN'
}

/**
 * Get raw JSON content by raw data ID
 */
export async function getRawJson(rawDataId: string): Promise<string | null> {
  const rawData = await prisma.rawImportData.findUnique({
    where: { id: rawDataId },
    select: { rawJson: true }
  })
  
  return rawData?.rawJson || null
}

/**
 * Delete raw data and all associated links
 */
export async function deleteRawData(rawDataId: string): Promise<boolean> {
  try {
    // Links will be cascade deleted
    await prisma.rawImportData.delete({
      where: { id: rawDataId }
    })
    return true
  } catch (error) {
    console.error('[RawDataService] Error deleting raw data:', error)
    return false
  }
}

/**
 * Get all raw data imports with summary
 * IMPORTANT: Excludes rawJson to avoid fetching large data
 * 
 * @param options - Pagination and filter options
 */
export async function getAllRawImports(options: {
  limit?: number
  page?: number
  parseStatus?: 'all' | 'pending' | 'parsed' | 'failed'
} = {}) {
  const { limit = 50, page = 1, parseStatus = 'all' } = options
  const skip = (page - 1) * limit
  
  // Build where clause for filter
  const where: any = {}
  if (parseStatus !== 'all') {
    where.parseStatus = parseStatus
  }
  
  // Get total count for pagination
  const totalItems = await prisma.rawImportData.count({ where })
  const totalPages = Math.ceil(totalItems / limit)
  
  const imports = await prisma.rawImportData.findMany({
    where,
    select: {
      id: true,
      sourceType: true,
      sourceChatId: true,
      sourceUrl: true,
      rawSizeBytes: true,
      messageCount: true,
      parseStatus: true,
      parseError: true,
      importedAt: true,
      parsedAt: true,
      // Exclude rawJson - can be megabytes per record!
      ChatLog: {
        select: {
          sessionId: true,
          sessionDate: true,
          title: true
        }
      },
      _count: {
        select: { RawDataLink: true }
      }
    },
    orderBy: { importedAt: 'desc' },
    skip,
    take: limit
  })

  return {
    items: imports.map(imp => ({
      id: imp.id,
      sourceType: imp.sourceType,
      sourceChatId: imp.sourceChatId,
      sourceUrl: imp.sourceUrl,
      rawSizeBytes: imp.rawSizeBytes,
      messageCount: imp.messageCount,
      parseStatus: imp.parseStatus,
      parseError: imp.parseError,
      importedAt: imp.importedAt,
      parsedAt: imp.parsedAt,
      chatLog: imp.ChatLog,
      linkCount: imp._count.RawDataLink
    })),
    pagination: {
      page,
      pageSize: limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }
}

/**
 * Update raw data title (via linked ChatLog)
 */
export async function updateRawDataTitle(rawDataId: string, title: string): Promise<boolean> {
  try {
    // Update the linked ChatLog title
    const result = await prisma.chatLog.updateMany({
      where: { rawDataId },
      data: { 
        title,
        updatedAt: new Date()
      }
    })
    return result.count > 0
  } catch (error) {
    console.error('[RawDataService] Error updating raw data title:', error)
    return false
  }
}
