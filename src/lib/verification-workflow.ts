/**
 * Verification Workflow System
 * 
 * Manages user verification of low-confidence entities.
 * Provides queue management, approval/rejection workflows, and statistics.
 * 
 * Task: TASK-2.8 - Verification Workflow
 * Gap ID: GAP-009 (Opus)
 */

import { prisma } from "./db"

// ============================================================================
// Types
// ============================================================================

export interface VerificationItem {
  id: string
  projectId: string | null
  itemType: 'column' | 'fk' | 'sp' | 'view' | 'module' | 'rule' | 'table'
  itemId: string
  itemName: string
  itemData: Record<string, any>
  confidence: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'type_inference' | 'fk_resolution' | 'naming' | 'business_logic' | 'general'
  suggestedValue: Record<string, any> | null
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'deferred'
  reviewedBy: string | null
  reviewedAt: Date | null
  reviewNotes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface VerificationQueueStats {
  total: number
  pending: number
  approved: number
  rejected: number
  deferred: number
  critical: number
  highPriority: number
  avgConfidence: number
  byCategory: Record<string, number>
  byType: Record<string, number>
  oldestPending: Date | null
  estimatedReviewTime: number // minutes
}

export interface VerificationDecision {
  itemId: string
  decision: 'approve' | 'reject' | 'defer'
  reviewedBy: string
  notes?: string
  correctedValue?: Record<string, any>
}

export interface BulkVerificationResult {
  processed: number
  approved: number
  rejected: number
  deferred: number
  errors: string[]
}

export interface VerificationRule {
  id: string
  name: string
  description: string
  itemType: string
  condition: VerificationCondition
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  autoApprove: boolean
  autoReject: boolean
  active: boolean
}

export interface VerificationCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_null' | 'is_not_null'
  value: any
}

export interface VerificationSuggestion {
  itemId: string
  suggestion: string
  confidence: number
  reasoning: string
  alternatives: Array<{
    value: any
    confidence: number
    reason: string
  }>
}

// ============================================================================
// Queue Management Functions
// ============================================================================

/**
 * Add item to verification queue
 */
export async function addToVerificationQueue(
  item: Omit<VerificationItem, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'reviewedBy' | 'reviewedAt' | 'reviewNotes'>
): Promise<VerificationItem> {
  // Check if item already exists
  const existing = await prisma.verificationItem.findUnique({
    where: {
      itemType_itemId: {
        itemType: item.itemType,
        itemId: item.itemId
      }
    }
  })
  
  if (existing) {
    // Update existing item
    const updated = await prisma.verificationItem.update({
      where: { id: existing.id },
      data: {
        itemData: JSON.stringify(item.itemData),
        confidence: item.confidence,
        priority: item.priority,
        category: item.category,
        suggestedValue: item.suggestedValue ? JSON.stringify(item.suggestedValue) : null,
        reason: item.reason,
        projectId: item.projectId
      }
    })
    
    return mapToVerificationItem(updated)
  }
  
  // Create new item
  const created = await prisma.verificationItem.create({
    data: {
      projectId: item.projectId,
      itemType: item.itemType,
      itemId: item.itemId,
      itemName: item.itemName,
      itemData: JSON.stringify(item.itemData),
      confidence: item.confidence,
      priority: item.priority,
      category: item.category,
      suggestedValue: item.suggestedValue ? JSON.stringify(item.suggestedValue) : null,
      reason: item.reason,
      status: 'pending'
    }
  })
  
  return mapToVerificationItem(created)
}

/**
 * Get verification queue for a project
 */
export async function getVerificationQueue(
  projectId?: string,
  options?: {
    status?: 'pending' | 'approved' | 'rejected' | 'deferred'
    priority?: 'critical' | 'high' | 'medium' | 'low'
    category?: string
    itemType?: string
    limit?: number
    offset?: number
  }
): Promise<VerificationItem[]> {
  const where: any = {}
  
  if (projectId) where.projectId = projectId
  if (options?.status) where.status = options.status
  if (options?.priority) where.priority = options.priority
  if (options?.category) where.category = options.category
  if (options?.itemType) where.itemType = options.itemType
  
  const items = await prisma.verificationItem.findMany({
    where,
    orderBy: [
      { priority: 'asc' }, // critical first (assuming alphabetical order works)
      { confidence: 'asc' },
      { createdAt: 'asc' }
    ],
    take: options?.limit || 50,
    skip: options?.offset || 0
  })
  
  return items.map(mapToVerificationItem)
}

/**
 * Get a specific verification item
 */
export async function getVerificationItem(
  itemType: string,
  itemId: string
): Promise<VerificationItem | null> {
  const item = await prisma.verificationItem.findUnique({
    where: {
      itemType_itemId: {
        itemType,
        itemId
      }
    }
  })
  
  return item ? mapToVerificationItem(item) : null
}

/**
 * Get next item for review (priority-based)
 */
export async function getNextForReview(
  projectId?: string,
  userId?: string
): Promise<VerificationItem | null> {
  const where: any = { status: 'pending' }
  if (projectId) where.projectId = projectId
  
  // Priority order: critical > high > medium > low
  const priorityOrder = ['critical', 'high', 'medium', 'low']
  
  for (const priority of priorityOrder) {
    const item = await prisma.verificationItem.findFirst({
      where: { ...where, priority },
      orderBy: { confidence: 'asc' }
    })
    
    if (item) return mapToVerificationItem(item)
  }
  
  return null
}

// ============================================================================
// Decision Functions
// ============================================================================

/**
 * Process verification decision
 */
export async function processVerificationDecision(
  decision: VerificationDecision
): Promise<VerificationItem> {
  const item = await prisma.verificationItem.findUnique({
    where: { id: decision.itemId }
  })
  
  if (!item) {
    throw new Error(`Verification item not found: ${decision.itemId}`)
  }
  
  if (item.status !== 'pending') {
    throw new Error(`Item already ${item.status}`)
  }
  
  const status = decision.decision === 'approve' ? 'approved' :
                 decision.decision === 'reject' ? 'rejected' : 'deferred'
  
  // Update the verification item
  const updated = await prisma.verificationItem.update({
    where: { id: decision.itemId },
    data: {
      status,
      reviewedBy: decision.reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: decision.notes || null
    }
  })
  
  // Apply the decision to the underlying entity
  if (decision.decision === 'approve' && decision.correctedValue) {
    await applyCorrection(item.itemType, item.itemId, decision.correctedValue)
  }
  
  // Update confidence score
  await updateConfidenceAfterVerification(
    item.itemType,
    item.itemId,
    decision.decision
  )
  
  return mapToVerificationItem(updated)
}

/**
 * Apply bulk verification decisions
 */
export async function bulkProcessDecisions(
  decisions: VerificationDecision[]
): Promise<BulkVerificationResult> {
  const result: BulkVerificationResult = {
    processed: 0,
    approved: 0,
    rejected: 0,
    deferred: 0,
    errors: []
  }
  
  for (const decision of decisions) {
    try {
      const item = await processVerificationDecision(decision)
      result.processed++
      
      if (item.status === 'approved') result.approved++
      else if (item.status === 'rejected') result.rejected++
      else if (item.status === 'deferred') result.deferred++
    } catch (error) {
      result.errors.push(`Failed to process ${decision.itemId}: ${error}`)
    }
  }
  
  return result
}

/**
 * Apply correction to entity
 */
async function applyCorrection(
  itemType: string,
  itemId: string,
  correctedValue: Record<string, any>
): Promise<void> {
  switch (itemType) {
    case 'column':
      await prisma.toolkitColumn.update({
        where: { id: itemId },
        data: correctedValue
      })
      break
    
    case 'table':
      await prisma.toolkitTable.update({
        where: { id: itemId },
        data: correctedValue
      })
      break
    
    case 'fk':
      await prisma.toolkitFK.update({
        where: { id: itemId },
        data: correctedValue
      })
      break
    
    case 'sp':
      await prisma.toolkitSP.update({
        where: { id: itemId },
        data: correctedValue
      })
      break
    
    case 'view':
      await prisma.toolkitView.update({
        where: { id: itemId },
        data: correctedValue
      })
      break
    
    default:
      console.warn(`[VerificationWorkflow] Unknown item type: ${itemType}`)
  }
}

/**
 * Update confidence after verification
 */
async function updateConfidenceAfterVerification(
  itemType: string,
  itemId: string,
  decision: 'approve' | 'reject' | 'defer'
): Promise<void> {
  try {
    const confidenceChange = decision === 'approve' ? 1.0 :
                             decision === 'reject' ? -0.5 : 0
    
    await prisma.confidenceScore.updateMany({
      where: {
        entityType: itemType,
        entityId: itemId
      },
      data: {
        score: decision === 'approve' ? 1.0 : 0.3,
        confidence: decision === 'approve' ? 'high' : 'low',
        verifiedAt: new Date(),
        verifiedBy: 'user'
      }
    })
  } catch (error) {
    console.warn('[VerificationWorkflow] Failed to update confidence:', error)
  }
}

// ============================================================================
// Statistics Functions
// ============================================================================

/**
 * Get verification queue statistics
 */
export async function getQueueStatistics(projectId?: string): Promise<VerificationQueueStats> {
  const where: any = {}
  if (projectId) where.projectId = projectId
  
  const items = await prisma.verificationItem.findMany({ where })
  
  const pending = items.filter(i => i.status === 'pending')
  const approved = items.filter(i => i.status === 'approved')
  const rejected = items.filter(i => i.status === 'rejected')
  const deferred = items.filter(i => i.status === 'deferred')
  const critical = items.filter(i => i.priority === 'critical' && i.status === 'pending')
  const highPriority = items.filter(i => i.priority === 'high' && i.status === 'pending')
  
  // Calculate by category
  const byCategory: Record<string, number> = {}
  for (const item of items) {
    byCategory[item.category] = (byCategory[item.category] || 0) + 1
  }
  
  // Calculate by type
  const byType: Record<string, number> = {}
  for (const item of items) {
    byType[item.itemType] = (byType[item.itemType] || 0) + 1
  }
  
  // Find oldest pending
  const oldestPending = pending.length > 0
    ? new Date(Math.min(...pending.map(i => new Date(i.createdAt).getTime())))
    : null
  
  // Estimate review time (assuming 2 minutes per item)
  const estimatedReviewTime = pending.length * 2
  
  return {
    total: items.length,
    pending: pending.length,
    approved: approved.length,
    rejected: rejected.length,
    deferred: deferred.length,
    critical: critical.length,
    highPriority: highPriority.length,
    avgConfidence: items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + i.confidence, 0) / items.length * 100) / 100
      : 0,
    byCategory,
    byType,
    oldestPending,
    estimatedReviewTime
  }
}

/**
 * Get verification history for a user
 */
export async function getUserVerificationHistory(
  userId: string,
  limit: number = 50
): Promise<VerificationItem[]> {
  const items = await prisma.verificationItem.findMany({
    where: { reviewedBy: userId },
    orderBy: { reviewedAt: 'desc' },
    take: limit
  })
  
  return items.map(mapToVerificationItem)
}

/**
 * Get verification trends over time
 */
export async function getVerificationTrends(
  projectId?: string,
  days: number = 30
): Promise<Array<{
  date: string
  pending: number
  approved: number
  rejected: number
  deferred: number
}>> {
  const where: any = {}
  if (projectId) where.projectId = projectId
  
  const items = await prisma.verificationItem.findMany({
    where,
    orderBy: { createdAt: 'asc' }
  })
  
  const trends: Array<{
    date: string
    pending: number
    approved: number
    rejected: number
    deferred: number
  }> = []
  
  const now = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const dateStart = new Date(dateStr)
    const dateEnd = new Date(dateStart)
    dateEnd.setDate(dateEnd.getDate() + 1)
    
    const dayItems = items.filter(item => {
      const createdAt = new Date(item.createdAt)
      return createdAt >= dateStart && createdAt < dateEnd
    })
    
    trends.push({
      date: dateStr,
      pending: dayItems.filter(i => i.status === 'pending').length,
      approved: dayItems.filter(i => i.status === 'approved').length,
      rejected: dayItems.filter(i => i.status === 'rejected').length,
      deferred: dayItems.filter(i => i.status === 'deferred').length
    })
  }
  
  return trends
}

// ============================================================================
// Auto-Verification Functions
// ============================================================================

/**
 * Check if item can be auto-verified
 */
export function canAutoVerify(item: VerificationItem): {
  canAuto: boolean
  action?: 'approve' | 'reject'
  reason?: string
} {
  // High confidence items can be auto-approved
  if (item.confidence >= 0.95) {
    return {
      canAuto: true,
      action: 'approve',
      reason: 'High confidence (>= 95%)'
    }
  }
  
  // Very low confidence with no suggested value can be flagged
  if (item.confidence < 0.2 && !item.suggestedValue) {
    return {
      canAuto: false,
      reason: 'Very low confidence requires manual review'
    }
  }
  
  // Items with clear suggested values and decent confidence
  if (item.confidence >= 0.8 && item.suggestedValue) {
    return {
      canAuto: true,
      action: 'approve',
      reason: 'High confidence with suggested value'
    }
  }
  
  return { canAuto: false }
}

/**
 * Auto-approve eligible items
 */
export async function autoApproveEligible(
  projectId?: string,
  autoApproveBy?: string
): Promise<{ approved: number; skipped: number }> {
  const where: any = { status: 'pending' }
  if (projectId) where.projectId = projectId
  
  const items = await prisma.verificationItem.findMany({ where })
  
  let approved = 0
  let skipped = 0
  
  for (const item of items) {
    const verificationItem = mapToVerificationItem(item)
    const check = canAutoVerify(verificationItem)
    
    if (check.canAuto && check.action === 'approve') {
      await processVerificationDecision({
        itemId: item.id,
        decision: 'approve',
        reviewedBy: autoApproveBy || 'auto_verifier',
        notes: check.reason
      })
      approved++
    } else {
      skipped++
    }
  }
  
  return { approved, skipped }
}

// ============================================================================
// Suggestion Functions
// ============================================================================

/**
 * Generate verification suggestions for an item
 */
export async function generateSuggestions(
  item: VerificationItem
): Promise<VerificationSuggestion> {
  // Analyze item data to generate suggestions
  const alternatives: VerificationSuggestion['alternatives'] = []
  
  switch (item.itemType) {
    case 'column':
      // Suggest data type based on column name patterns
      if (item.itemData.columnName) {
        const name = item.itemData.columnName.toLowerCase()
        
        if (name.includes('id') && !name.includes('identity')) {
          alternatives.push({
            value: { dataType: 'bigint', isFK: true },
            confidence: 0.8,
            reason: 'Column name suggests foreign key'
          })
        }
        
        if (name.includes('date') || name.includes('time')) {
          alternatives.push({
            value: { dataType: 'datetime' },
            confidence: 0.85,
            reason: 'Column name suggests date/time'
          })
        }
        
        if (name.includes('amount') || name.includes('price') || name.includes('cost')) {
          alternatives.push({
            value: { dataType: 'decimal', precision: 18, scale: 2 },
            confidence: 0.85,
            reason: 'Column name suggests monetary value'
          })
        }
        
        if (name.includes('is_') || name.includes('has_')) {
          alternatives.push({
            value: { dataType: 'bit', isNullable: false, defaultValue: 0 },
            confidence: 0.9,
            reason: 'Column name suggests boolean flag'
          })
        }
      }
      break
    
    case 'fk':
      // Suggest FK resolution based on naming patterns
      if (item.itemData.fromColumn) {
        const column = item.itemData.fromColumn.toLowerCase()
        
        if (column.endsWith('id')) {
          const possibleTable = column.replace(/id$/i, '')
          alternatives.push({
            value: { 
              toTable: possibleTable,
              toColumn: 'Id'
            },
            confidence: 0.7,
            reason: 'FK column name suggests target table'
          })
        }
      }
      break
  }
  
  // Determine best suggestion
  const bestAlternative = alternatives.sort((a, b) => b.confidence - a.confidence)[0]
  
  return {
    itemId: item.id,
    suggestion: bestAlternative ? JSON.stringify(bestAlternative.value) : 'Manual review required',
    confidence: bestAlternative?.confidence || item.confidence,
    reasoning: bestAlternative?.reason || 'Unable to generate automatic suggestion',
    alternatives
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map database record to VerificationItem
 */
function mapToVerificationItem(record: any): VerificationItem {
  return {
    id: record.id,
    projectId: record.projectId,
    itemType: record.itemType,
    itemId: record.itemId,
    itemName: record.itemName,
    itemData: typeof record.itemData === 'string' ? JSON.parse(record.itemData) : record.itemData,
    confidence: record.confidence,
    priority: record.priority,
    category: record.category,
    suggestedValue: record.suggestedValue 
      ? (typeof record.suggestedValue === 'string' ? JSON.parse(record.suggestedValue) : record.suggestedValue)
      : null,
    reason: record.reason,
    status: record.status,
    reviewedBy: record.reviewedBy,
    reviewedAt: record.reviewedAt ? new Date(record.reviewedAt) : null,
    reviewNotes: record.reviewNotes,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  }
}

/**
 * Create verification items from low-confidence entities
 */
export async function createFromLowConfidenceEntities(
  projectId?: string
): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = []
  let created = 0
  
  // Get low confidence scores
  const lowConfidence = await prisma.confidenceScore.findMany({
    where: {
      confidence: { in: ['low', 'unverified'] },
      ...(projectId ? { projectId } : {})
    }
  })
  
  for (const score of lowConfidence) {
    try {
      // Get entity details
      let itemName = score.entityId
      let itemData: Record<string, any> = {}
      
      switch (score.entityType) {
        case 'column':
          const column = await prisma.toolkitColumn.findUnique({
            where: { id: score.entityId }
          })
          if (column) {
            itemName = column.columnName
            itemData = {
              tableName: column.tableName,
              dataType: column.dataType,
              isNullable: column.isNullable,
              isPK: column.isPK,
              isFK: column.isFK
            }
          }
          break
        
        case 'table':
          const table = await prisma.toolkitTable.findUnique({
            where: { id: score.entityId }
          })
          if (table) {
            itemName = table.tableName
            itemData = {
              schema: table.tableSchema,
              rowCount: table.rowCount,
              columnCount: table.columnCount
            }
          }
          break
        
        case 'fk':
          const fk = await prisma.toolkitFK.findUnique({
            where: { id: score.entityId }
          })
          if (fk) {
            itemName = fk.fkName
            itemData = {
              fromTable: fk.fromTable,
              fromColumn: fk.fromColumn,
              toTable: fk.toTable,
              toColumn: fk.toColumn
            }
          }
          break
      }
      
      // Determine priority based on confidence
      let priority: 'critical' | 'high' | 'medium' | 'low'
      if (score.confidence === 'unverified' || score.score < 0.3) {
        priority = 'critical'
      } else if (score.score < 0.5) {
        priority = 'high'
      } else if (score.score < 0.7) {
        priority = 'medium'
      } else {
        priority = 'low'
      }
      
      await addToVerificationQueue({
        projectId: score.projectId,
        itemType: score.entityType as any,
        itemId: score.entityId,
        itemName,
        itemData,
        confidence: score.score,
        priority,
        category: 'general',
        suggestedValue: null,
        reason: `Low confidence score: ${Math.round(score.score * 100)}%`
      })
      
      created++
    } catch (error) {
      errors.push(`Failed to create verification for ${score.entityId}: ${error}`)
    }
  }
  
  return { created, errors }
}

// ============================================================================
// Export Types
// ============================================================================

export type { 
  VerificationItem as VerificationItemType, 
  VerificationQueueStats as VerificationQueueStatsType,
  VerificationDecision as VerificationDecisionType
}
