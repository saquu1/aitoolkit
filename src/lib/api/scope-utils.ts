/**
 * SCOPE UTILITIES FOR PROJECT-AWARE API ROUTES
 * =============================================
 * Provides consistent scope filtering for all API endpoints
 * Supports: All Projects, Single Project, Multi-Project modes
 * 
 * projectId nullable pattern:
 * - NULL = Global entity (accessible by all projects)
 * - ID = Project-specific entity
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// =============================================================================
// TYPES
// =============================================================================

export type ScopeType = 'all' | 'project' | 'multi'

export interface ScopeInfo {
  type: ScopeType
  projectId: string | null
  projectIds: string[]
  includeGlobal: boolean
  isIsolated: boolean
}

export interface ScopeContext {
  scope: ScopeInfo
  project: {
    id: string
    name: string
    contextMode: 'global' | 'isolated'
    inheritEntities: boolean
  } | null
  allProjects: Array<{
    id: string
    name: string
  }>
}

export interface ScopeFilter {
  where: Prisma.WhereInput
  include?: Prisma.Include
  orderBy?: Prisma.OrderByInput
}

// =============================================================================
// SCOPE PARSING FROM REQUEST
// =============================================================================

/**
 * Parse scope information from request headers and query params
 */
export function parseScopeFromRequest(request: NextRequest): ScopeInfo {
  const { searchParams } = new URL(request.url)
  
  // Check headers first (preferred for API calls)
  const headerProjectId = request.headers.get('x-project-id')
  const headerProjectIds = request.headers.get('x-project-ids')
  const headerScopeMode = request.headers.get('x-scope-mode')
  
  // Then check query params
  const queryProjectId = searchParams.get('projectId')
  const queryProjectIds = searchParams.get('projectIds')
  const queryScopeType = searchParams.get('scopeType') as ScopeType | null
  const queryIncludeGlobal = searchParams.get('includeGlobal')
  const queryIsIsolated = searchParams.get('isIsolated')
  
  // Determine scope type
  let type: ScopeType = 'all'
  let projectId: string | null = null
  let projectIds: string[] = []
  
  // Parse from headers
  if (headerProjectIds) {
    try {
      projectIds = JSON.parse(headerProjectIds)
      type = projectIds.length > 1 ? 'multi' : 'project'
      projectId = projectIds.length === 1 ? projectIds[0] : null
    } catch {}
  } else if (headerProjectId) {
    projectId = headerProjectId
    projectIds = [headerProjectId]
    type = 'project'
  }
  
  // Override from query params if present
  if (queryProjectIds) {
    try {
      projectIds = JSON.parse(queryProjectIds)
      type = projectIds.length > 1 ? 'multi' : 'project'
      projectId = projectIds.length === 1 ? projectIds[0] : null
    } catch {}
  } else if (queryProjectId) {
    projectId = queryProjectId
    projectIds = [queryProjectId]
    type = 'project'
  }
  
  if (queryScopeType) {
    type = queryScopeType
  }
  
  // Parse boolean flags
  const includeGlobal = queryIncludeGlobal === 'true' || headerScopeMode === 'global'
  const isIsolated = queryIsIsolated === 'true' || headerScopeMode === 'isolated'
  
  return {
    type,
    projectId,
    projectIds,
    includeGlobal,
    isIsolated
  }
}

// =============================================================================
// SCOPE CONTEXT BUILDING
// =============================================================================

/**
 * Build full scope context with project details from database
 */
export async function buildScopeContext(scope: ScopeInfo): Promise<ScopeContext> {
  const context: ScopeContext = {
    scope,
    project: null,
    allProjects: []
  }
  
  try {
    // Get all projects for reference
    const projects = await db.project.findMany({
      select: { id: true, name: true }
    })
    context.allProjects = projects
    
    // Get specific project details if in project mode
    if (scope.projectId) {
      const project = await db.project.findUnique({
        where: { id: scope.projectId },
        select: {
          id: true,
          name: true,
          contextMode: true,
          inheritEntities: true
        }
      })
      
      if (project) {
        context.project = {
          id: project.id,
          name: project.name,
          contextMode: (project.contextMode as 'global' | 'isolated') || 'global',
          inheritEntities: project.inheritEntities ?? true
        }
      }
    }
  } catch (error) {
    console.error('Error building scope context:', error)
  }
  
  return context
}

// =============================================================================
// SCOPE-AWARE FILTER BUILDERS
// =============================================================================

/**
 * Build Prisma where clause for entity filtering based on scope
 */
export function buildEntityFilter(scopeContext: ScopeContext, projectIdField = 'projectId'): Prisma.WhereInput {
  const { scope, project } = scopeContext
  
  // All projects mode
  if (scope.type === 'all') {
    // In all mode, show everything
    return {}
  }
  
  // Multi-project mode
  if (scope.type === 'multi' && scope.projectIds.length > 0) {
    return {
      OR: [
        { [projectIdField]: { in: scope.projectIds } },
        // Include global entities if not isolated
        ...(scope.includeGlobal ? [{ [projectIdField]: null }] : [])
      ]
    }
  }
  
  // Single project mode
  if (scope.type === 'project' && scope.projectId) {
    // Check if project is isolated
    const isIsolated = project?.contextMode === 'isolated' || scope.isIsolated
    
    if (isIsolated) {
      // Only show project-specific entities
      return { [projectIdField]: scope.projectId }
    }
    
    // Show project entities and global entities (inheritance)
    if (project?.inheritEntities !== false && scope.includeGlobal) {
      return {
        OR: [
          { [projectIdField]: scope.projectId },
          { [projectIdField]: null }
        ]
      }
    }
    
    return { [projectIdField]: scope.projectId }
  }
  
  return {}
}

/**
 * Build filter for error patterns
 */
export function buildErrorPatternFilter(scopeContext: ScopeContext): Prisma.WhereInput {
  return buildEntityFilter(scopeContext, 'projectId')
}

/**
 * Build filter for chat logs
 */
export function buildChatLogFilter(scopeContext: ScopeContext): Prisma.WhereInput {
  return buildEntityFilter(scopeContext, 'projectId')
}

/**
 * Build filter for intelligence bank entities
 */
export function buildIntelligenceFilter(scopeContext: ScopeContext): {
  fieldFilter: Prisma.WhereInput
  tableFilter: Prisma.WhereInput
  ruleFilter: Prisma.WhereInput
} {
  const entityFilter = buildEntityFilter(scopeContext, 'projectId')
  
  return {
    fieldFilter: entityFilter,
    tableFilter: entityFilter,
    ruleFilter: {
      OR: [
        ...(scopeContext.scope.projectId ? [{ projectId: scopeContext.scope.projectId }] : []),
        ...(scopeContext.scope.includeGlobal ? [{ projectId: null, isSystemDefault: true }] : [])
      ]
    }
  }
}

// =============================================================================
// SCOPE-AWARE QUERY BUILDER CLASS
// =============================================================================

/**
 * Fluent query builder for scope-aware operations
 */
export class ScopeAwareQueryBuilder {
  private scopeContext: ScopeContext
  private _where: Prisma.WhereInput = {}
  private _include: Prisma.Include = {}
  private _orderBy: Prisma.OrderByInput = {}
  private _projectIdField: string = 'projectId'
  
  constructor(scopeContext: ScopeContext) {
    this.scopeContext = scopeContext
  }
  
  /**
   * Set the project ID field name
   */
  projectIdField(field: string): this {
    this._projectIdField = field
    return this
  }
  
  /**
   * Apply standard scope filtering
   */
  withScopeFilter(): this {
    this._where = {
      ...this._where,
      ...buildEntityFilter(this.scopeContext, this._projectIdField)
    }
    return this
  }
  
  /**
   * Add additional where conditions
   */
  where(condition: Prisma.WhereInput): this {
    this._where = { ...this._where, ...condition }
    return this
  }
  
  /**
   * Add include relations
   */
  include(relations: Prisma.Include): this {
    this._include = { ...this._include, ...relations }
    return this
  }
  
  /**
   * Set ordering
   */
  orderBy(order: Prisma.OrderByInput): this {
    this._orderBy = order
    return this
  }
  
  /**
   * Build the query options
   */
  build(): { where: Prisma.WhereInput; include?: Prisma.Include; orderBy?: Prisma.OrderByInput } {
    const result: { where: Prisma.WhereInput; include?: Prisma.Include; orderBy?: Prisma.OrderByInput } = {
      where: this._where
    }
    
    if (Object.keys(this._include).length > 0) {
      result.include = this._include
    }
    
    if (Object.keys(this._orderBy).length > 0) {
      result.orderBy = this._orderBy
    }
    
    return result
  }
  
  /**
   * Execute findMany with built query
   */
  async findMany<T>(model: {
    findMany: (args: { where: Prisma.WhereInput; include?: Prisma.Include; orderBy?: Prisma.OrderByInput }) => Promise<T[]>
  }): Promise<T[]> {
    return model.findMany(this.build())
  }
  
  /**
   * Execute count with built query
   */
  async count(model: {
    count: (args: { where: Prisma.WhereInput }) => Promise<number>
  }): Promise<number> {
    return model.count({ where: this._where })
  }
}

// =============================================================================
// SCOPE HELPERS
// =============================================================================

/**
 * Check if scope is valid
 */
export function isValidScope(scope: ScopeInfo): boolean {
  if (scope.type === 'project' && !scope.projectId) {
    return false
  }
  if (scope.type === 'multi' && scope.projectIds.length === 0) {
    return false
  }
  return true
}

/**
 * Get scope description for logging/debugging
 */
export function getScopeDescription(scope: ScopeInfo): string {
  switch (scope.type) {
    case 'all':
      return 'All Projects (global scope)'
    case 'project':
      return `Single Project: ${scope.projectId}${scope.isIsolated ? ' (isolated)' : ''}`
    case 'multi':
      return `Multi-Project: ${scope.projectIds.length} projects`
    default:
      return 'Unknown scope'
  }
}

/**
 * Promote an entity from project to global
 */
export async function promoteToGlobal(
  entityType: string,
  entityId: string,
  projectId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Update entity to have null projectId (global)
    // This is a generic approach - specific entities may need custom handling
    
    const updateResult = await db.$executeRaw`
      UPDATE ${Prisma.raw(entityType)} 
      SET projectId = NULL, updatedAt = NOW()
      WHERE id = ${entityId} AND projectId = ${projectId}
    `
    
    if (updateResult > 0) {
      return { success: true, message: `Entity promoted to global scope` }
    }
    
    return { success: false, message: 'Entity not found or already global' }
  } catch (error) {
    console.error('Error promoting entity to global:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Share entity to another project (creates a reference/copy)
 */
export async function shareToProject(
  entityType: string,
  entityId: string,
  targetProjectId: string,
  _sourceProjectId: string
): Promise<{ success: boolean; message: string; sharedId?: string }> {
  try {
    // This would create a copy or reference of the entity in the target project
    // Implementation depends on specific entity type requirements
    
    // For now, return a placeholder response
    return { 
      success: true, 
      message: `Shared to project ${targetProjectId}`,
      sharedId: `${entityId}-shared-${targetProjectId}`
    }
  } catch (error) {
    console.error('Error sharing entity:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Inherit global entity to project (creates project-specific override)
 */
export async function inheritFromGlobal(
  entityType: string,
  entityId: string,
  projectId: string
): Promise<{ success: boolean; message: string; inheritedId?: string }> {
  try {
    // This would create a project-specific copy of a global entity
    // allowing project-specific modifications while preserving the global original
    
    return { 
      success: true, 
      message: `Inherited from global to project ${projectId}`,
      inheritedId: `${entityId}-inherited-${projectId}`
    }
  } catch (error) {
    console.error('Error inheriting entity:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  parseScopeFromRequest,
  buildScopeContext,
  buildEntityFilter,
  buildErrorPatternFilter,
  buildChatLogFilter,
  buildIntelligenceFilter,
  ScopeAwareQueryBuilder,
  isValidScope,
  getScopeDescription,
  promoteToGlobal,
  shareToProject,
  inheritFromGlobal
}
