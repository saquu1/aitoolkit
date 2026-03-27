/**
 * INTELLIGENCE BANK API
 * ====================
 * REST API for Phase 2 Intelligence Bank operations
 * 
 * GET Endpoints:
 * - stats: Get overall statistics
 * - entities: List entities with optional filters
 * - entity: Get single entity with intelligence data
 * - usage-stats: Get usage statistics for an entity
 * - high-priority: Get high priority entities
 * - health: Get project health score
 * - relationships: Get entity relationships
 * 
 * POST Endpoints:
 * - register-entity: Register or update an entity
 * - track-usage: Track entity usage
 * - create-relationship: Create entity relationship
 * - register-field: Register a field
 * - calculate-priority: Calculate priority for an issue
 * - scan-codebase: Scan and register all codebase entities
 */

import { NextRequest, NextResponse } from 'next/server'
import { intelligenceBank, EntityInfo, UsageInfo, FieldInfo, RelationshipInfo } from '@/lib/intelligence-bank'
import { priorityScoringEngine, IssueContext } from '@/lib/priority-scoring'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'stats'
  const entityId = request.nextUrl.searchParams.get('entityId')
  const entityType = request.nextUrl.searchParams.get('entityType')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0')

  try {
    switch (action) {
      case 'stats':
        return NextResponse.json({
          success: true,
          stats: await intelligenceBank.getStatistics()
        })

      case 'entities':
        return NextResponse.json(await listEntities(entityType, limit, offset))

      case 'entity':
        if (!entityId) {
          return NextResponse.json({ success: false, error: 'entityId required' }, { status: 400 })
        }
        const entity = await intelligenceBank.getEntityIntelligence(entityId)
        return NextResponse.json({
          success: !!entity,
          entity
        })

      case 'usage-stats':
        if (!entityId) {
          return NextResponse.json({ success: false, error: 'entityId required' }, { status: 400 })
        }
        return NextResponse.json({
          success: true,
          stats: await intelligenceBank.getUsageStats(entityId)
        })

      case 'high-priority':
        return NextResponse.json({
          success: true,
          entities: await intelligenceBank.getHighPriorityEntities(limit)
        })

      case 'health':
        return NextResponse.json({
          success: true,
          health: await priorityScoringEngine.getProjectHealthScore()
        })

      case 'relationships':
        if (!entityId) {
          return NextResponse.json({ success: false, error: 'entityId required' }, { status: 400 })
        }
        return NextResponse.json(await getEntityRelationships(entityId))

      case 'fields':
        if (!entityId) {
          return NextResponse.json({ success: false, error: 'entityId required' }, { status: 400 })
        }
        return NextResponse.json({
          success: true,
          fields: await prisma.fieldRegistry.findMany({
            where: { entityId }
          })
        })

      case 'naming-variants':
        const fieldName = request.nextUrl.searchParams.get('fieldName')
        if (!entityId || !fieldName) {
          return NextResponse.json({ success: false, error: 'entityId and fieldName required' }, { status: 400 })
        }
        return NextResponse.json({
          success: true,
          variants: await intelligenceBank.detectNamingVariants(entityId, fieldName)
        })

      case 'search':
        const query = request.nextUrl.searchParams.get('q') || ''
        return NextResponse.json(await searchEntities(query, limit))

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Intelligence Bank API Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'register-entity':
        return NextResponse.json(await registerEntity(body.entity))

      case 'track-usage':
        return NextResponse.json(await trackUsage(body.usage))

      case 'create-relationship':
        return NextResponse.json(await createRelationship(body.relationship))

      case 'register-field':
        return NextResponse.json(await registerField(body.field))

      case 'calculate-priority':
        return NextResponse.json(await calculatePriority(body.context))

      case 'scan-codebase':
        return NextResponse.json(await intelligenceBank.scanAndRegisterCodebase())

      case 'batch-priorities':
        return NextResponse.json({
          success: true,
          results: await priorityScoringEngine.batchCalculatePriorities(body.issues)
        })

      case 'recommendations':
        return NextResponse.json({
          success: true,
          recommendations: await priorityScoringEngine.getPriorityRecommendations(body.issues)
        })

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Intelligence Bank POST Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function listEntities(entityType: string | null, limit: number, offset: number) {
  const where = entityType ? { entityType } : {}
  
  const [entities, total] = await Promise.all([
    prisma.entityRegistry.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { usageCount: 'desc' }
    }),
    prisma.entityRegistry.count({ where })
  ])

  return {
    success: true,
    entities: entities.map(e => ({
      ...e,
      props: JSON.parse(e.props),
      imports: JSON.parse(e.imports),
      exports: JSON.parse(e.exports)
    })),
    total,
    hasMore: offset + limit < total
  }
}

async function registerEntity(entity: EntityInfo) {
  if (!entity.entityType || !entity.entityName || !entity.filePath) {
    return { success: false, error: 'entityType, entityName, and filePath are required' }
  }

  const entityId = await intelligenceBank.registerEntity(entity)
  return { success: true, entityId }
}

async function trackUsage(usage: UsageInfo) {
  if (!usage.entityId || !usage.usedInFile || !usage.usageType) {
    return { success: false, error: 'entityId, usedInFile, and usageType are required' }
  }

  await intelligenceBank.trackUsage(usage)
  return { success: true }
}

async function createRelationship(rel: RelationshipInfo) {
  if (!rel.sourceEntityId || !rel.targetEntityId || !rel.relationshipType) {
    return { success: false, error: 'sourceEntityId, targetEntityId, and relationshipType are required' }
  }

  await intelligenceBank.createRelationship(rel)
  return { success: true }
}

async function registerField(field: FieldInfo) {
  if (!field.entityId || !field.fieldName || !field.fieldType) {
    return { success: false, error: 'entityId, fieldName, and fieldType are required' }
  }

  const fieldId = await intelligenceBank.registerField(field)
  return { success: true, fieldId }
}

async function calculatePriority(context: IssueContext) {
  const result = await priorityScoringEngine.calculateIssuePriority(context)
  return {
    success: true,
    priority: result
  }
}

async function getEntityRelationships(entityId: string) {
  const [outgoing, incoming] = await Promise.all([
    prisma.entityRelationship.findMany({
      where: { sourceEntityId: entityId },
      include: { targetEntity: true }
    }),
    prisma.entityRelationship.findMany({
      where: { targetEntityId: entityId },
      include: { sourceEntity: true }
    })
  ])

  return {
    success: true,
    outgoing: outgoing.map(r => ({
      relationshipType: r.relationshipType,
      entity: r.targetEntity,
      hasIssues: r.hasIssues,
      dataMapping: r.dataMapping ? JSON.parse(r.dataMapping) : null
    })),
    incoming: incoming.map(r => ({
      relationshipType: r.relationshipType,
      entity: r.sourceEntity,
      hasIssues: r.hasIssues,
      dataMapping: r.dataMapping ? JSON.parse(r.dataMapping) : null
    }))
  }
}

async function searchEntities(query: string, limit: number) {
  const entities = await prisma.entityRegistry.findMany({
    where: {
      OR: [
        { entityName: { contains: query } },
        { filePath: { contains: query } },
        { moduleName: { contains: query } },
        { description: { contains: query } }
      ]
    },
    take: limit
  })

  return {
    success: true,
    query,
    entities: entities.map(e => ({
      id: e.id,
      type: e.entityType,
      name: e.entityName,
      filePath: e.filePath,
      priority: e.priority,
      usageCount: e.usageCount
    }))
  }
}
