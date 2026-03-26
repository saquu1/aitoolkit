/**
 * Conflict Resolution System
 * 
 * Provides manual and automatic conflict resolution capabilities.
 */

import { prisma } from "./db"

// ============================================================================
// Types
// ============================================================================

export interface ResolutionInput {
  conflictId: string
  resolution: 'source1' | 'source2' | 'merged' | 'custom'
  customValue?: Record<string, any>
  resolvedBy: string // User ID or 'auto_resolver'
  notes?: string
}

export interface ResolutionResult {
  success: boolean
  resolvedValue?: Record<string, any>
  message?: string
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Resolve a conflict
 */
export async function resolveConflict(input: ResolutionInput): Promise<ResolutionResult> {
  try {
    const conflict = await prisma.extractionConflict.findUnique({
      where: { id: input.conflictId }
    })

    if (!conflict) {
      return { success: false, message: "Conflict not found" }
    }

    if (conflict.status === 'resolved') {
      return { success: false, message: "Conflict already resolved" }
    }

    let resolvedValue: Record<string, any>

    switch (input.resolution) {
      case 'source1':
        resolvedValue = typeof conflict.source1Value === 'string' 
          ? JSON.parse(conflict.source1Value)
          : conflict.source1Value
        break
      case 'source2':
        resolvedValue = typeof conflict.source2Value === 'string'
          ? JSON.parse(conflict.source2Value)
          : conflict.source2Value
        break
      case 'merged':
        resolvedValue = mergeValues(
          typeof conflict.source1Value === 'string' ? JSON.parse(conflict.source1Value) : conflict.source1Value,
          typeof conflict.source2Value === 'string' ? JSON.parse(conflict.source2Value) : conflict.source2Value
        )
        break
      case 'custom':
        resolvedValue = input.customValue || {}
        break
    }

    // Update the conflict
    await prisma.extractionConflict.update({
      where: { id: input.conflictId },
      data: {
        status: 'resolved',
        resolution: input.resolution,
        resolvedValue: JSON.stringify(resolvedValue),
        resolvedBy: input.resolvedBy,
        resolvedAt: new Date(),
        resolutionNotes: input.notes
      }
    })

    // Apply the resolution to the original entity
    await applyResolution(conflict.entityType, conflict.entityId, resolvedValue)

    return { success: true, resolvedValue }
  } catch (error) {
    console.error('[ConflictResolver] Error resolving conflict:', error)
    return { success: false, message: String(error) }
  }
}

/**
 * Auto-resolve conflicts that have applicable rules
 */
export async function autoResolveConflicts(): Promise<{
  total: number
  resolved: number
  errors: string[]
}> {
  const results = { total: 0, resolved: 0, errors: [] as string[] }
  
  try {
    // Get conflicts that can be auto-resolved
    const conflicts = await prisma.extractionConflict.findMany({
      where: {
        OR: [
          { status: 'auto_resolvable' },
          { status: 'pending' }
        ]
      }
    })
    
    results.total = conflicts.length
    
    // Get active rules ordered by priority
    const rules = await prisma.conflictRule.findMany({
      where: { active: true },
      orderBy: { priority: 'asc' }
    })

    for (const conflict of conflicts) {
      const rule = rules.find(r => r.conflictType === conflict.conflictType)
      
      if (rule) {
        const result = await resolveConflict({
          conflictId: conflict.id,
          resolution: rule.resolution as ResolutionInput['resolution'],
          resolvedBy: 'auto_resolver'
        })
        
        if (result.success) {
          results.resolved++
        } else {
          results.errors.push(`Failed to resolve ${conflict.id}: ${result.message}`)
        }
      }
    }
    
    return results
  } catch (error) {
    results.errors.push(String(error))
    return results
  }
}

/**
 * Get resolution statistics for a project
 */
export async function getResolutionStats(projectId?: string): Promise<{
  pending: number
  resolved: number
  dismissed: number
  autoResolvable: number
  bySeverity: Record<string, number>
}> {
  const where: any = {}
  if (projectId) where.projectId = projectId
  
  const [pending, resolved, dismissed, autoResolvable] = await Promise.all([
    prisma.extractionConflict.count({ where: { ...where, status: 'pending' } }),
    prisma.extractionConflict.count({ where: { ...where, status: 'resolved' } }),
    prisma.extractionConflict.count({ where: { ...where, status: 'dismissed' } }),
    prisma.extractionConflict.count({ where: { ...where, status: 'auto_resolvable' } })
  ])
  
  const severityCounts = await prisma.extractionConflict.groupBy({
    by: ['severity'],
    where,
    _count: true
  })
  
  const bySeverity: Record<string, number> = {}
  for (const item of severityCounts as any) {
    bySeverity[item.severity] = item._count
  }
  
  return { pending, resolved, dismissed, autoResolvable, bySeverity }
}

/**
 * Dismiss a conflict
 */
export async function dismissConflict(
  conflictId: string,
  dismissedBy: string,
  reason?: string
): Promise<boolean> {
  try {
    await prisma.extractionConflict.update({
      where: { id: conflictId },
      data: {
        status: 'dismissed',
        resolvedBy: dismissedBy,
        resolvedAt: new Date(),
        resolutionNotes: reason || 'Dismissed by user'
      }
    })
    
    return true
  } catch (error) {
    console.error('[ConflictResolver] Error dismissing conflict:', error)
    return false
  }
}

/**
 * Get conflicts for a specific entity
 */
export async function getEntityConflicts(
  entityType: string,
  entityId: string
): Promise<any[]> {
  return prisma.extractionConflict.findMany({
    where: {
      entityType,
      entityId
    },
    orderBy: [
      { severity: 'asc' },
      { createdAt: 'desc' }
    ]
  })
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Merge values from two sources
 */
function mergeValues(
  source1: Record<string, any>,
  source2: Record<string, any>
): Record<string, any> {
  const merged = { ...source2 }
  
  // Override with source1 values if they exist
  for (const [key, value] of Object.entries(source1)) {
    if (value !== null && value !== undefined && value !== '') {
      merged[key] = value
    }
  }
  
  return merged
}

/**
 * Apply resolution to the original entity
 */
async function applyResolution(
  entityType: string,
  entityId: string,
  resolvedValue: Record<string, any>
): Promise<void> {
  switch (entityType) {
    case 'column':
      // Update column intelligence cache
      try {
        await prisma.columnIntelligenceCache.update({
          where: { id: entityId },
          data: resolvedValue
        })
      } catch (e) {
        // Entity might not exist in cache
        console.warn('[ConflictResolver] Could not apply resolution to column:', entityId)
      }
      break
    case 'table':
      try {
        await prisma.toolkitTable.update({
          where: { id: entityId },
          data: resolvedValue
        })
      } catch (e) {
        console.warn('[ConflictResolver] Could not apply resolution to table:', entityId)
      }
      break
    case 'sp':
      try {
        await prisma.storedProcedureCache.update({
          where: { id: entityId },
          data: resolvedValue
        })
      } catch (e) {
        console.warn('[ConflictResolver] Could not apply resolution to SP:', entityId)
      }
      break
    case 'view':
      try {
        await prisma.viewIntelligenceCache.update({
          where: { id: entityId },
          data: resolvedValue
        })
      } catch (e) {
        console.warn('[ConflictResolver] Could not apply resolution to view:', entityId)
      }
      break
  }
}

// Export types
export type { ResolutionInput as ResolutionInputType, ResolutionResult as ResolutionResultType }
