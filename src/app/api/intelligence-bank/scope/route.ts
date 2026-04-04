/**
 * INTELLIGENCE BANK SCOPE-AWARE API
 * ==================================
 * Provides scope-aware CRUD operations for the Intelligence Bank
 * Supports: All Projects, Single Project, Multi-Project modes
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  parseScopeFromRequest,
  buildScopeContext,
  buildIntelligenceFilter,
  ScopeAwareQueryBuilder,
  isValidScope,
  getScopeDescription
} from '@/lib/api/scope-utils'

// =============================================================================
// GET - Fetch Intelligence Bank Data with Scope
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const scope = parseScopeFromRequest(request)
    
    // Validate scope
    if (!isValidScope(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope parameters', scope },
        { status: 400 }
      )
    }
    
    const scopeContext = await buildScopeContext(scope)
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'stats'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    console.log(`[Intelligence Bank] Scope: ${getScopeDescription(scope)}`)
    
    switch (action) {
      case 'stats':
        return await getStats(scopeContext)
      
      case 'entities':
        return await getEntities(scopeContext, limit, offset)
      
      case 'patterns':
        return await getPatterns(scopeContext, searchParams)
      
      case 'search':
        return await searchEntities(scopeContext, searchParams)
      
      case 'tables':
        return await getTables(scopeContext)
      
      case 'rules':
        return await getSOPRules(scopeContext)
      
      default:
        return await getStats(scopeContext)
    }
  } catch (error) {
    console.error('Intelligence Bank scope API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Create/Update Intelligence Bank Data with Scope
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const scope = parseScopeFromRequest(request)
    const body = await request.json()
    const { action, data } = body
    
    if (!isValidScope(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope parameters' },
        { status: 400 }
      )
    }
    
    const scopeContext = await buildScopeContext(scope)
    
    switch (action) {
      case 'create':
        return await createEntity(scopeContext, data)
      
      case 'update':
        return await updateEntity(scopeContext, data)
      
      case 'promote':
        return await promoteEntity(scopeContext, data)
      
      case 'share':
        return await shareEntity(scopeContext, data)
      
      case 'inherit':
        return await inheritEntity(scopeContext, data)
      
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Intelligence Bank POST error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getStats(scopeContext: ReturnType<typeof buildScopeContext> extends Promise<infer T> ? T : never) {
  const ctx = await scopeContext
  const filters = buildIntelligenceFilter(ctx)
  
  // Get counts
  const [totalEntities, totalFields, totalPatterns, totalRules] = await Promise.all([
    db.unifiedField.count({ where: filters.fieldFilter }),
    db.unifiedField.count({ where: filters.fieldFilter }),
    db.errorPattern.count({ where: { projectId: ctx.scope.projectId } }),
    db.unifiedSOPRule.count({ where: filters.ruleFilter })
  ])
  
  // Get entity type breakdown
  const entitiesByType = await db.unifiedField.groupBy({
    by: ['intelSemanticType'],
    where: filters.fieldFilter,
    _count: true
  })
  
  return NextResponse.json({
    success: true,
    stats: {
      total: totalEntities,
      byType: entitiesByType.reduce((acc, item) => {
        acc[item.intelSemanticType || 'unknown'] = item._count
        return acc
      }, {} as Record<string, number>)
    },
    summary: {
      totalFields,
      totalPatterns,
      totalRules,
      fkFields: 0,
      piiFields: 0,
      phiFields: 0,
      averageConfidence: 0.75,
      compliance: { resolved: 0, errors: 0, warnings: 0 }
    },
    scope: {
      type: ctx.scope.type,
      projectId: ctx.scope.projectId,
      description: getScopeDescription(ctx.scope)
    }
  })
}

async function getEntities(
  scopeContext: ReturnType<typeof buildScopeContext> extends Promise<infer T> ? T : never,
  limit: number,
  offset: number
) {
  const ctx = await scopeContext
  const filters = buildIntelligenceFilter(ctx)
  
  const queryBuilder = new ScopeAwareQueryBuilder(ctx)
    .projectIdField('projectId')
    .withScopeFilter()
    .orderBy({ qualifiedName: 'asc' })
  
  const [entities, total] = await Promise.all([
    db.unifiedField.findMany({
      where: filters.fieldFilter,
      take: limit,
      skip: offset,
      orderBy: { qualifiedName: 'asc' },
    }),
    db.unifiedField.count({ where: filters.fieldFilter })
  ])
  
  return NextResponse.json({
    success: true,
    entities: entities.map(e => ({
      id: e.id,
      name: e.fieldName,
      tableName: e.tableName,
      qualifiedName: e.qualifiedName,
      type: e.intelSemanticType,
      isGlobal: e.projectId === null,
      confidence: e.metaOverallConfidence,
      projectId: e.projectId
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    },
    scope: {
      type: ctx.scope.type,
      projectId: ctx.scope.projectId
    }
  })
}

async function getPatterns(
  scopeContext: ReturnType<typeof buildScopeContext> extends Promise<infer T> ? T : never,
  searchParams: URLSearchParams
) {
  const ctx = await scopeContext
  const severity = searchParams.get('severity')
  const type = searchParams.get('type')
  
  const where: Record<string, unknown> = {}
  
  // Apply scope filter
  if (ctx.scope.type === 'project' && ctx.scope.projectId) {
    where.projectId = ctx.scope.projectId
  } else if (ctx.scope.type === 'multi' && ctx.scope.projectIds.length > 0) {
    where.projectId = { in: ctx.scope.projectIds }
  }
  
  // Apply additional filters
  if (severity) where.severity = severity
  if (type) where.errorType = type
  
  const patterns = await db.errorPattern.findMany({
    where,
    orderBy: { occurrenceCount: 'desc' },
    take: 100
  })
  
  return NextResponse.json({
    success: true,
    patterns,
    scope: {
      type: ctx.scope.type,
      projectId: ctx.scope.projectId
    }
  })
}

async function searchEntities(
  scopeContext: ReturnType<typeof buildScopeContext> extends Promise<infer T> ? T : never,
  searchParams: URLSearchParams
) {
  const ctx = await scopeContext
  const query = searchParams.get('q') || ''
  const filters = buildIntelligenceFilter(ctx)
  
  if (!query) {
    return NextResponse.json({
      success: true,
      results: [],
      query: ''
    })
  }
  
  const results = await db.unifiedField.findMany({
    where: {
      ...filters.fieldFilter,
      OR: [
        { fieldName: { contains: query } },
        { tableName: { contains: query } },
        { qualifiedName: { contains: query } },
        { intelBusinessMeaning: { contains: query } }
      ]
    },
    take: 50
  })
  
  return NextResponse.json({
    success: true,
    results: results.map(r => ({
      id: r.id,
      name: r.fieldName,
      tableName: r.tableName,
      qualifiedName: r.qualifiedName,
      type: r.intelSemanticType,
      isGlobal: r.projectId === null,
      projectId: r.projectId
    })),
    query,
    scope: {
      type: ctx.scope.type,
      projectId: ctx.scope.projectId
    }
  })
}

async function getTables(scopeContext: ReturnType<typeof buildScopeContext> extends Promise<infer T> ? T : never) {
  const ctx = await scopeContext
  const filters = buildIntelligenceFilter(ctx)
  
  const tables = await db.unifiedTable.findMany({
    where: filters.tableFilter,
    orderBy: { tableName: 'asc' }
  })
  
  return NextResponse.json({
    success: true,
    tables: tables.map(t => ({
      id: t.id,
      name: t.tableName,
      schema: t.tableSchema,
      rowCount: t.approximateRowCount,
      columnCount: t.columnCount,
      isGlobal: t.projectId === null,
      projectId: t.projectId
    })),
    scope: {
      type: ctx.scope.type,
      projectId: ctx.scope.projectId
    }
  })
}

async function getSOPRules(scopeContext: ReturnType<typeof buildScopeContext> extends Promise<infer T> ? T : never) {
  const ctx = await scopeContext
  const filters = buildIntelligenceFilter(ctx)
  
  const rules = await db.unifiedSOPRule.findMany({
    where: filters.ruleFilter,
    orderBy: [
      { priority: 'desc' },
      { category: 'asc' }
    ]
  })
  
  return NextResponse.json({
    success: true,
    rules: rules.map(r => ({
      id: r.id,
      sopId: r.sopId,
      name: r.name,
      category: r.category,
      priority: r.priority,
      isActive: r.isActive,
      isSystemDefault: r.isSystemDefault,
      isGlobal: r.projectId === null,
      projectId: r.projectId
    })),
    scope: {
      type: ctx.scope.type,
      projectId: ctx.scope.projectId
    }
  })
}

async function createEntity(
  scopeContext: ReturnType<typeof buildScopeContext> extends Promise<infer T> ? T : never,
  data: Record<string, unknown>
) {
  const ctx = await scopeContext
  
  // Determine project ID for new entity
  const projectId = ctx.scope.type === 'project' 
    ? ctx.scope.projectId 
    : data.projectId as string | null
  
  const entity = await db.unifiedField.create({
    data: {
      id: `field-${Date.now()}`,
      projectId,
      fieldName: data.name as string,
      tableName: data.tableName as string,
      qualifiedName: `${data.tableName}.${data.name}`,
      intelSemanticType: data.type as string,
      metaOverallConfidence: 0.5,
      metaEnrichmentComplete: 0,
      metaNeedsReview: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })
  
  return NextResponse.json({
    success: true,
    entity: {
      id: entity.id,
      name: entity.fieldName,
      tableName: entity.tableName,
      isGlobal: entity.projectId === null,
      projectId: entity.projectId
    }
  })
}

async function updateEntity(
  scopeContext: ReturnType<typeof buildScopeContext> extends Promise<infer T> ? T : never,
  data: Record<string, unknown>
) {
  const ctx = await scopeContext
  const { id, ...updates } = data
  
  if (!id) {
    return NextResponse.json(
      { error: 'Entity ID is required' },
      { status: 400 }
    )
  }
  
  // Verify entity is in scope
  const existing = await db.unifiedField.findUnique({
    where: { id: id as string }
  })
  
  if (!existing) {
    return NextResponse.json(
      { error: 'Entity not found' },
      { status: 404 }
    )
  }
  
  // Check if entity is accessible in current scope
  if (ctx.scope.type === 'project' && existing.projectId && existing.projectId !== ctx.scope.projectId) {
    return NextResponse.json(
      { error: 'Entity not accessible in current scope' },
      { status: 403 }
    )
  }
  
  const updated = await db.unifiedField.update({
    where: { id: id as string },
    data: {
      ...updates,
      updatedAt: new Date()
    }
  })
  
  return NextResponse.json({
    success: true,
    entity: updated
  })
}

async function promoteEntity(
  scopeContext: ReturnType<typeof buildScopeContext> extends Promise<infer T> ? T : never,
  data: Record<string, unknown>
) {
  const ctx = await scopeContext
  const { id } = data
  
  if (!id) {
    return NextResponse.json(
      { error: 'Entity ID is required' },
      { status: 400 }
    )
  }
  
  // Verify entity exists and belongs to current project
  const existing = await db.unifiedField.findUnique({
    where: { id: id as string }
  })
  
  if (!existing) {
    return NextResponse.json(
      { error: 'Entity not found' },
      { status: 404 }
    )
  }
  
  if (existing.projectId === null) {
    return NextResponse.json(
      { error: 'Entity is already global' },
      { status: 400 }
    )
  }
  
  if (ctx.scope.type === 'project' && existing.projectId !== ctx.scope.projectId) {
    return NextResponse.json(
      { error: 'Cannot promote entity from different project' },
      { status: 403 }
    )
  }
  
  // Promote to global
  const promoted = await db.unifiedField.update({
    where: { id: id as string },
    data: {
      projectId: null,
      updatedAt: new Date()
    }
  })
  
  return NextResponse.json({
    success: true,
    message: 'Entity promoted to global scope',
    entity: {
      id: promoted.id,
      name: promoted.fieldName,
      isGlobal: true
    }
  })
}

async function shareEntity(
  scopeContext: ReturnType<typeof buildScopeContext> extends Promise<infer T> ? T : never,
  data: Record<string, unknown>
) {
  const ctx = await scopeContext
  const { id, targetProjectId } = data
  
  if (!id || !targetProjectId) {
    return NextResponse.json(
      { error: 'Entity ID and target project ID are required' },
      { status: 400 }
    )
  }
  
  // Verify target project exists
  const targetProject = await db.project.findUnique({
    where: { id: targetProjectId as string }
  })
  
  if (!targetProject) {
    return NextResponse.json(
      { error: 'Target project not found' },
      { status: 404 }
    )
  }
  
  // Get source entity
  const source = await db.unifiedField.findUnique({
    where: { id: id as string }
  })
  
  if (!source) {
    return NextResponse.json(
      { error: 'Source entity not found' },
      { status: 404 }
    )
  }
  
  // Create a copy in target project
  const shared = await db.unifiedField.create({
    data: {
      id: `${source.id}-shared-${targetProjectId}`,
      projectId: targetProjectId as string,
      fieldName: source.fieldName,
      tableName: source.tableName,
      qualifiedName: source.qualifiedName,
      intelSemanticType: source.intelSemanticType,
      intelBusinessMeaning: source.intelBusinessMeaning,
      metaOverallConfidence: source.metaOverallConfidence,
      metaEnrichmentComplete: source.metaEnrichmentComplete,
      metaNeedsReview: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })
  
  return NextResponse.json({
    success: true,
    message: `Entity shared to project ${targetProjectId}`,
    entity: {
      id: shared.id,
      name: shared.fieldName,
      projectId: shared.projectId
    }
  })
}

async function inheritEntity(
  scopeContext: ReturnType<typeof buildScopeContext> extends Promise<infer T> ? T : never,
  data: Record<string, unknown>
) {
  const ctx = await scopeContext
  const { id } = data
  
  if (!id) {
    return NextResponse.json(
      { error: 'Entity ID is required' },
      { status: 400 }
    )
  }
  
  if (ctx.scope.type !== 'project' || !ctx.scope.projectId) {
    return NextResponse.json(
      { error: 'Project scope required for inheritance' },
      { status: 400 }
    )
  }
  
  // Get global entity
  const globalEntity = await db.unifiedField.findUnique({
    where: { id: id as string }
  })
  
  if (!globalEntity || globalEntity.projectId !== null) {
    return NextResponse.json(
      { error: 'Entity not found or not a global entity' },
      { status: 404 }
    )
  }
  
  // Create project-specific copy
  const inherited = await db.unifiedField.create({
    data: {
      id: `${globalEntity.id}-inherited-${ctx.scope.projectId}`,
      projectId: ctx.scope.projectId,
      fieldName: globalEntity.fieldName,
      tableName: globalEntity.tableName,
      qualifiedName: globalEntity.qualifiedName,
      intelSemanticType: globalEntity.intelSemanticType,
      intelBusinessMeaning: globalEntity.intelBusinessMeaning,
      metaOverallConfidence: globalEntity.metaOverallConfidence,
      metaEnrichmentComplete: globalEntity.metaEnrichmentComplete,
      metaNeedsReview: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })
  
  return NextResponse.json({
    success: true,
    message: 'Global entity inherited to project',
    entity: {
      id: inherited.id,
      name: inherited.fieldName,
      projectId: inherited.projectId,
      inheritedFrom: globalEntity.id
    }
  })
}
