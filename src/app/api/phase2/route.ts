/**
 * API Routes for Phase 2: Quality & Intelligence
 * 
 * Handles:
 * - Incremental Parsing (TASK-2.5)
 * - Version Comparison (TASK-2.6)
 * - Parse Cache (TASK-2.7)
 * - Verification Workflow (TASK-2.8)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Import Phase 2 libraries
import {
  calculateFileDiff,
  applyIncrementalChanges,
  getIncrementalChanges,
  getChangeStatistics,
  rollbackToVersion
} from '@/lib/incremental-parser'

import {
  createVersion,
  compareVersions,
  getVersionHistory,
  getVersionDetails,
  cleanupOldVersions
} from '@/lib/version-comparison'

import {
  getCachedParse,
  cacheParseResult,
  cacheParseError,
  invalidateProjectCache,
  invalidateCacheByFileType,
  getCacheStats,
  getCachedFiles,
  cleanupCache,
  clearProjectCache,
  calculateHash,
  invalidateCacheEntry
} from '@/lib/parse-cache'

import {
  addToVerificationQueue,
  getVerificationQueue,
  getVerificationItem,
  getNextForReview,
  processVerificationDecision,
  bulkProcessDecisions,
  getQueueStatistics,
  getUserVerificationHistory,
  getVerificationTrends,
  autoApproveEligible,
  generateSuggestions,
  createFromLowConfidenceEntities
} from '@/lib/verification-workflow'

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      // ================== Incremental Parsing ==================
      case 'get-changes':
        return await handleGetChanges(searchParams)
      
      case 'change-stats':
        return await handleChangeStats(searchParams)
      
      // ================== Version Comparison ==================
      case 'version-history':
        return await handleVersionHistory(searchParams)
      
      case 'version-details':
        return await handleVersionDetails(searchParams)
      
      case 'compare-versions':
        return await handleCompareVersions(searchParams)
      
      // ================== Parse Cache ==================
      case 'cache-stats':
        return await handleCacheStats(searchParams)
      
      case 'cached-files':
        return await handleCachedFiles(searchParams)
      
      case 'get-cache':
        return await handleGetCache(searchParams)
      
      // ================== Verification Workflow ==================
      case 'verification-queue':
        return await handleVerificationQueue(searchParams)
      
      case 'verification-item':
        return await handleVerificationItem(searchParams)
      
      case 'verification-stats':
        return await handleVerificationStats(searchParams)
      
      case 'next-for-review':
        return await handleNextForReview(searchParams)
      
      case 'verification-history':
        return await handleVerificationHistory(searchParams)
      
      case 'verification-trends':
        return await handleVerificationTrends(searchParams)
      
      case 'verification-suggestions':
        return await handleVerificationSuggestions(searchParams)
      
      // ================== Default ==================
      default:
        return NextResponse.json({
          actions: [
            'Incremental Parsing: get-changes, change-stats',
            'Version Comparison: version-history, version-details, compare-versions',
            'Parse Cache: cache-stats, cached-files, get-cache',
            'Verification: verification-queue, verification-item, verification-stats, next-for-review, verification-history, verification-trends, verification-suggestions'
          ]
        })
    }
  } catch (error) {
    console.error('[Phase2 API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      // ================== Incremental Parsing ==================
      case 'calculate-diff':
        return await handleCalculateDiff(body)
      
      case 'apply-changes':
        return await handleApplyChanges(body)
      
      case 'rollback':
        return await handleRollback(body)
      
      // ================== Version Comparison ==================
      case 'create-version':
        return await handleCreateVersion(body)
      
      case 'cleanup-versions':
        return await handleCleanupVersions(body)
      
      // ================== Parse Cache ==================
      case 'cache-parse':
        return await handleCacheParse(body)
      
      case 'cache-error':
        return await handleCacheError(body)
      
      case 'invalidate-cache':
        return await handleInvalidateCache(body)
      
      case 'clear-cache':
        return await handleClearCache(body)
      
      case 'cleanup-cache':
        return await handleCleanupCache(body)
      
      // ================== Verification Workflow ==================
      case 'add-to-queue':
        return await handleAddToQueue(body)
      
      case 'process-decision':
        return await handleProcessDecision(body)
      
      case 'bulk-decision':
        return await handleBulkDecision(body)
      
      case 'auto-approve':
        return await handleAutoApprove(body)
      
      case 'create-from-low-confidence':
        return await handleCreateFromLowConfidence(body)
      
      default:
        return NextResponse.json(
          { error: 'Unknown action', availableActions: [
            'calculate-diff', 'apply-changes', 'rollback',
            'create-version', 'cleanup-versions',
            'cache-parse', 'cache-error', 'invalidate-cache', 'clear-cache', 'cleanup-cache',
            'add-to-queue', 'process-decision', 'bulk-decision', 'auto-approve', 'create-from-low-confidence'
          ]},
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Phase2 API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: String(error) },
      { status: 500 }
    )
  }
}

// ============================================================================
// Incremental Parsing Handlers
// ============================================================================

async function handleGetChanges(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const versionFrom = searchParams.get('versionFrom') 
    ? parseInt(searchParams.get('versionFrom')!)
    : undefined
  const versionTo = searchParams.get('versionTo')
    ? parseInt(searchParams.get('versionTo')!)
    : undefined
  
  const changes = await getIncrementalChanges(projectId, versionFrom, versionTo)
  return NextResponse.json({ changes, count: changes.length })
}

async function handleChangeStats(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const stats = await getChangeStatistics(projectId)
  return NextResponse.json(stats)
}

async function handleCalculateDiff(body: any) {
  const { oldContent, newContent, filePath, fileType } = body
  
  if (!filePath || !fileType) {
    return NextResponse.json({ error: 'filePath and fileType required' }, { status: 400 })
  }
  
  const diff = await calculateFileDiff(oldContent || null, newContent || null, filePath, fileType)
  return NextResponse.json(diff)
}

async function handleApplyChanges(body: any) {
  const { projectId, diffs } = body
  
  if (!projectId || !diffs) {
    return NextResponse.json({ error: 'projectId and diffs required' }, { status: 400 })
  }
  
  // Note: parseFunction should be provided by the caller in a real scenario
  const result = await applyIncrementalChanges(projectId, diffs, async () => [])
  return NextResponse.json(result)
}

async function handleRollback(body: any) {
  const { projectId, targetVersion } = body
  
  if (!projectId || !targetVersion) {
    return NextResponse.json({ error: 'projectId and targetVersion required' }, { status: 400 })
  }
  
  const result = await rollbackToVersion(projectId, targetVersion)
  return NextResponse.json(result)
}

// ============================================================================
// Version Comparison Handlers
// ============================================================================

async function handleVersionHistory(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
  const history = await getVersionHistory(projectId, limit)
  return NextResponse.json(history)
}

async function handleVersionDetails(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  const version = searchParams.get('version')
  
  if (!projectId || !version) {
    return NextResponse.json({ error: 'projectId and version required' }, { status: 400 })
  }
  
  const details = await getVersionDetails(projectId, parseInt(version))
  return NextResponse.json(details || { error: 'Version not found' })
}

async function handleCompareVersions(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  const versionFrom = searchParams.get('versionFrom')
  const versionTo = searchParams.get('versionTo')
  
  if (!projectId || !versionFrom || !versionTo) {
    return NextResponse.json({ error: 'projectId, versionFrom, and versionTo required' }, { status: 400 })
  }
  
  const comparison = await compareVersions(projectId, parseInt(versionFrom), parseInt(versionTo))
  return NextResponse.json(comparison)
}

async function handleCreateVersion(body: any) {
  const { projectId, name, description, createdBy, isAutoSave } = body
  
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const result = await createVersion(projectId, name, description, createdBy, isAutoSave)
  return NextResponse.json(result)
}

async function handleCleanupVersions(body: any) {
  const { projectId, keepVersions } = body
  
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const result = await cleanupOldVersions(projectId, keepVersions || 10)
  return NextResponse.json(result)
}

// ============================================================================
// Parse Cache Handlers
// ============================================================================

async function handleCacheStats(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const stats = await getCacheStats(projectId)
  return NextResponse.json(stats)
}

async function handleCachedFiles(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const fileType = searchParams.get('fileType') || undefined
  const files = await getCachedFiles(projectId, fileType)
  return NextResponse.json(files)
}

async function handleGetCache(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId')
  const filePath = searchParams.get('filePath')
  const contentHash = searchParams.get('contentHash') || undefined
  
  if (!projectId || !filePath) {
    return NextResponse.json({ error: 'projectId and filePath required' }, { status: 400 })
  }
  
  const cache = await getCachedParse(projectId, filePath, contentHash)
  return NextResponse.json(cache || { error: 'Cache not found' })
}

async function handleCacheParse(body: any) {
  const { projectId, filePath, fileType, content, parseResult, parseDuration } = body
  
  if (!projectId || !filePath || !fileType || !content) {
    return NextResponse.json({ error: 'projectId, filePath, fileType, and content required' }, { status: 400 })
  }
  
  const contentHash = calculateHash(content)
  const result = await cacheParseResult(
    projectId,
    filePath,
    fileType,
    contentHash,
    parseResult || { entities: [], metadata: {}, errors: [], warnings: [] },
    parseDuration || 0
  )
  
  return NextResponse.json(result)
}

async function handleCacheError(body: any) {
  const { projectId, filePath, fileType, content, errorMessage, parseDuration } = body
  
  if (!projectId || !filePath || !errorMessage) {
    return NextResponse.json({ error: 'projectId, filePath, and errorMessage required' }, { status: 400 })
  }
  
  const contentHash = content ? calculateHash(content) : ''
  await cacheParseError(projectId, filePath, fileType, contentHash, errorMessage, parseDuration || 0)
  
  return NextResponse.json({ success: true })
}

async function handleInvalidateCache(body: any) {
  const { projectId, fileType, cacheId } = body
  
  if (cacheId) {
    await invalidateCacheEntry(cacheId)
    return NextResponse.json({ success: true, invalidated: 1 })
  }
  
  if (!projectId) {
    return NextResponse.json({ error: 'projectId or cacheId required' }, { status: 400 })
  }
  
  if (fileType) {
    const result = await invalidateCacheByFileType(projectId, fileType)
    return NextResponse.json(result)
  }
  
  const result = await invalidateProjectCache(projectId)
  return NextResponse.json(result)
}

async function handleClearCache(body: any) {
  const { projectId } = body
  
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }
  
  const result = await clearProjectCache(projectId)
  return NextResponse.json(result)
}

async function handleCleanupCache(body: any) {
  const { projectId, maxAge } = body
  const result = await cleanupCache(projectId, maxAge)
  return NextResponse.json(result)
}

// ============================================================================
// Verification Workflow Handlers
// ============================================================================

async function handleVerificationQueue(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId') || undefined
  const status = searchParams.get('status') as any || undefined
  const priority = searchParams.get('priority') as any || undefined
  const category = searchParams.get('category') || undefined
  const itemType = searchParams.get('itemType') || undefined
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
  
  const queue = await getVerificationQueue(projectId, {
    status,
    priority,
    category,
    itemType,
    limit,
    offset
  })
  
  return NextResponse.json(queue)
}

async function handleVerificationItem(searchParams: URLSearchParams) {
  const itemType = searchParams.get('itemType')
  const itemId = searchParams.get('itemId')
  
  if (!itemType || !itemId) {
    return NextResponse.json({ error: 'itemType and itemId required' }, { status: 400 })
  }
  
  const item = await getVerificationItem(itemType, itemId)
  return NextResponse.json(item || { error: 'Item not found' })
}

async function handleVerificationStats(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId') || undefined
  const stats = await getQueueStatistics(projectId)
  return NextResponse.json(stats)
}

async function handleNextForReview(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId') || undefined
  const userId = searchParams.get('userId') || undefined
  const item = await getNextForReview(projectId, userId)
  return NextResponse.json(item || { error: 'No items pending review' })
}

async function handleVerificationHistory(searchParams: URLSearchParams) {
  const userId = searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }
  
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
  const history = await getUserVerificationHistory(userId, limit)
  return NextResponse.json(history)
}

async function handleVerificationTrends(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId') || undefined
  const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30
  const trends = await getVerificationTrends(projectId, days)
  return NextResponse.json(trends)
}

async function handleVerificationSuggestions(searchParams: URLSearchParams) {
  const itemType = searchParams.get('itemType')
  const itemId = searchParams.get('itemId')
  
  if (!itemType || !itemId) {
    return NextResponse.json({ error: 'itemType and itemId required' }, { status: 400 })
  }
  
  const item = await getVerificationItem(itemType, itemId)
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }
  
  const suggestions = await generateSuggestions(item)
  return NextResponse.json(suggestions)
}

async function handleAddToQueue(body: any) {
  const { projectId, itemType, itemId, itemName, itemData, confidence, priority, category, suggestedValue, reason } = body
  
  if (!itemType || !itemId || !itemName) {
    return NextResponse.json({ error: 'itemType, itemId, and itemName required' }, { status: 400 })
  }
  
  const item = await addToVerificationQueue({
    projectId,
    itemType,
    itemId,
    itemName,
    itemData: itemData || {},
    confidence: confidence || 0.5,
    priority: priority || 'medium',
    category: category || 'general',
    suggestedValue: suggestedValue || null,
    reason: reason || null
  })
  
  return NextResponse.json(item)
}

async function handleProcessDecision(body: any) {
  const { itemId, decision, reviewedBy, notes, correctedValue } = body
  
  if (!itemId || !decision || !reviewedBy) {
    return NextResponse.json({ error: 'itemId, decision, and reviewedBy required' }, { status: 400 })
  }
  
  const item = await processVerificationDecision({
    itemId,
    decision,
    reviewedBy,
    notes,
    correctedValue
  })
  
  return NextResponse.json(item)
}

async function handleBulkDecision(body: any) {
  const { decisions } = body
  
  if (!decisions || !Array.isArray(decisions)) {
    return NextResponse.json({ error: 'decisions array required' }, { status: 400 })
  }
  
  const result = await bulkProcessDecisions(decisions)
  return NextResponse.json(result)
}

async function handleAutoApprove(body: any) {
  const { projectId, autoApproveBy } = body
  const result = await autoApproveEligible(projectId, autoApproveBy)
  return NextResponse.json(result)
}

async function handleCreateFromLowConfidence(body: any) {
  const { projectId } = body
  const result = await createFromLowConfidenceEntities(projectId)
  return NextResponse.json(result)
}
