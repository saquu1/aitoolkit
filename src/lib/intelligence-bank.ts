/**
 * INTELLIGENCE BANK SERVICE
 * ========================
 * Phase 2 of Contract Validator - Smart data storage for:
 * - Entity tracking (components, API routes, pages, hooks)
 * - Usage tracking (where/how entities are used)
 * - Relationship mapping (data flow between entities)
 * - Field intelligence (semantic types, PII/PHI detection)
 * - Naming convention detection
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// =============================================================================
// TYPES
// =============================================================================

export interface EntityInfo {
  entityType: 'component' | 'api_route' | 'page' | 'hook' | 'lib' | 'table' | 'procedure'
  entityName: string
  filePath: string
  moduleName?: string
  description?: string
  props?: string[]
  imports?: string[]
  exports?: string[]
}

export interface UsageInfo {
  entityId: string
  usedInFile: string
  usedInEntity?: string
  usageType: 'import' | 'call' | 'render' | 'extends' | 'reference'
  usageLine?: number
  usageContext?: string
  isDirectUsage?: boolean
}

export interface RelationshipInfo {
  sourceEntityId: string
  targetEntityId: string
  relationshipType: 'calls' | 'imports' | 'extends' | 'implements' | 'uses' | 'depends_on'
  dataMapping?: Record<string, any>
}

export interface FieldInfo {
  entityId: string
  fieldName: string
  fieldType: string
  isRequired?: boolean
  defaultValue?: string
  semanticType?: string
  isPII?: boolean
  isPHI?: boolean
}

export interface PriorityFactors {
  impactScore: number    // 0-100: User/business impact
  frequencyScore: number // 0-100: Usage frequency
  riskScore: number      // 0-100: Risk of breaking
  effortScore: number    // 0-100: Effort to fix (higher = more effort)
}

// =============================================================================
// INTELLIGENCE BANK SERVICE
// =============================================================================

export class IntelligenceBank {
  /**
   * Register a new entity or update existing one
   */
  async registerEntity(entity: EntityInfo): Promise<string> {
    const existing = await prisma.entityRegistry.findFirst({
      where: {
        entityType: entity.entityType,
        entityName: entity.entityName,
        filePath: entity.filePath
      }
    })

    if (existing) {
      // Update existing entity
      const updated = await prisma.entityRegistry.update({
        where: { id: existing.id },
        data: {
          moduleName: entity.moduleName,
          description: entity.description,
          props: JSON.stringify(entity.props || []),
          imports: JSON.stringify(entity.imports || []),
          exports: JSON.stringify(entity.exports || []),
          updatedAt: new Date()
        }
      })
      return updated.id
    }

    // Create new entity
    const created = await prisma.entityRegistry.create({
      data: {
        entityType: entity.entityType,
        entityName: entity.entityName,
        filePath: entity.filePath,
        moduleName: entity.moduleName,
        description: entity.description,
        props: JSON.stringify(entity.props || []),
        imports: JSON.stringify(entity.imports || []),
        exports: JSON.stringify(entity.exports || [])
      }
    })

    return created.id
  }

  /**
   * Track entity usage
   */
  async trackUsage(usage: UsageInfo): Promise<void> {
    // Check if this usage already exists
    const existing = await prisma.entityUsage.findFirst({
      where: {
        entityId: usage.entityId,
        usedInFile: usage.usedInFile,
        usageType: usage.usageType
      }
    })

    if (existing) {
      // Increment frequency
      await prisma.entityUsage.update({
        where: { id: existing.id },
        data: { 
          frequency: { increment: 1 },
          updatedAt: new Date()
        }
      })
    } else {
      // Create new usage record
      await prisma.entityUsage.create({
        data: {
          entityId: usage.entityId,
          usedInFile: usage.usedInFile,
          usedInEntity: usage.usedInEntity,
          usageType: usage.usageType,
          usageLine: usage.usageLine,
          usageContext: usage.usageContext,
          isDirectUsage: usage.isDirectUsage ?? true
        }
      })
    }

    // Update entity usage count
    await prisma.entityRegistry.update({
      where: { id: usage.entityId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date()
      }
    })
  }

  /**
   * Create or update entity relationship
   */
  async createRelationship(rel: RelationshipInfo): Promise<void> {
    const dataMapping = rel.dataMapping ? JSON.stringify(rel.dataMapping) : null

    await prisma.entityRelationship.upsert({
      where: {
        sourceEntityId_targetEntityId_relationshipType: {
          sourceEntityId: rel.sourceEntityId,
          targetEntityId: rel.targetEntityId,
          relationshipType: rel.relationshipType
        }
      },
      create: {
        sourceEntityId: rel.sourceEntityId,
        targetEntityId: rel.targetEntityId,
        relationshipType: rel.relationshipType,
        dataMapping: dataMapping ?? undefined
      },
      update: {
        dataMapping: dataMapping ?? undefined,
        lastValidated: new Date()
      }
    })
  }

  /**
   * Register a field within an entity
   */
  async registerField(field: FieldInfo): Promise<string> {
    const existing = await prisma.fieldRegistry.findFirst({
      where: {
        entityId: field.entityId,
        fieldName: field.fieldName
      }
    })

    if (existing) {
      const updated = await prisma.fieldRegistry.update({
        where: { id: existing.id },
        data: {
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          defaultValue: field.defaultValue,
          semanticType: field.semanticType,
          isPII: field.isPII,
          isPHI: field.isPHI,
          updatedAt: new Date()
        }
      })
      return updated.id
    }

    const created = await prisma.fieldRegistry.create({
      data: {
        entityId: field.entityId,
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        isRequired: field.isRequired ?? false,
        defaultValue: field.defaultValue,
        semanticType: field.semanticType,
        isPII: field.isPII ?? false,
        isPHI: field.isPHI ?? false
      }
    })

    return created.id
  }

  /**
   * Detect naming variants for a field
   */
  async detectNamingVariants(entityId: string, fieldName: string): Promise<string[]> {
    // Common naming variations
    const variants: string[] = []
    
    // Generate possible variants
    const snakeCase = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
    const camelCase = fieldName.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    const pascalCase = camelCase.charAt(0).toUpperCase() + camelCase.slice(1)
    const screamingSnake = snakeCase.toUpperCase()
    
    variants.push(fieldName, snakeCase, camelCase, pascalCase, screamingSnake)
    
    // Check if we've seen these variants in other entities
    const field = await prisma.fieldRegistry.findFirst({
      where: { entityId, fieldName }
    })
    
    if (field) {
      // Update the field with naming variants
      await prisma.fieldRegistry.update({
        where: { id: field.id },
        data: { namingVariants: JSON.stringify([...new Set(variants)]) }
      })
    }
    
    return [...new Set(variants)]
  }

  /**
   * Calculate and assign priority score
   */
  async calculatePriority(
    entityType: 'issue' | 'entity' | 'field',
    entityId: string,
    factors: PriorityFactors
  ): Promise<{ totalScore: number; priority: string }> {
    // Weight factors
    const weights = {
      impact: 0.35,
      frequency: 0.25,
      risk: 0.25,
      effort: 0.15  // Higher effort = lower priority (inverse)
    }

    // Calculate weighted total (effort is inverse - high effort = lower score)
    const totalScore = Math.round(
      factors.impactScore * weights.impact +
      factors.frequencyScore * weights.frequency +
      factors.riskScore * weights.risk +
      (100 - factors.effortScore) * weights.effort
    )

    // Determine priority level
    let priority: string
    if (totalScore >= 75) priority = 'critical'
    else if (totalScore >= 50) priority = 'high'
    else if (totalScore >= 25) priority = 'medium'
    else priority = 'low'

    // Store the score
    await prisma.priorityScore.upsert({
      where: {
        entityType_entityId: { entityType, entityId }
      },
      create: {
        entityType,
        entityId,
        impactScore: factors.impactScore,
        frequencyScore: factors.frequencyScore,
        riskScore: factors.riskScore,
        effortScore: factors.effortScore,
        totalScore,
        priority
      },
      update: {
        impactScore: factors.impactScore,
        frequencyScore: factors.frequencyScore,
        riskScore: factors.riskScore,
        effortScore: factors.effortScore,
        totalScore,
        priority
      }
    })

    // Update entity if applicable
    if (entityType === 'entity') {
      await prisma.entityRegistry.update({
        where: { id: entityId },
        data: { priority, impactScore: totalScore }
      })
    }

    return { totalScore, priority }
  }

  /**
   * Get entity with all intelligence data
   */
  async getEntityIntelligence(entityId: string) {
    const entity = await prisma.entityRegistry.findUnique({
      where: { id: entityId },
      include: {
        usages: {
          take: 20,
          orderBy: { frequency: 'desc' }
        },
        relationships: {
          include: {
            targetEntity: true
          }
        },
        relatedTo: {
          include: {
            sourceEntity: true
          }
        },
        fields: true
      }
    })

    if (!entity) return null

    return {
      ...entity,
      props: JSON.parse(entity.props),
      imports: JSON.parse(entity.imports),
      exports: JSON.parse(entity.exports),
      usages: entity.usages.map(u => ({
        ...u,
        frequency: u.frequency
      })),
      fields: entity.fields.map(f => ({
        ...f,
        namingVariants: JSON.parse(f.namingVariants)
      }))
    }
  }

  /**
   * Get all entities with high priority issues
   */
  async getHighPriorityEntities(limit: number = 20) {
    return prisma.entityRegistry.findMany({
      where: {
        OR: [
          { priority: 'critical' },
          { priority: 'high' }
        ],
        hasIssues: true
      },
      take: limit,
      orderBy: [
        { impactScore: 'desc' },
        { usageCount: 'desc' }
      ]
    })
  }

  /**
   * Get usage statistics for an entity
   */
  async getUsageStats(entityId: string) {
    const usages = await prisma.entityUsage.findMany({
      where: { entityId }
    })

    const byType = usages.reduce((acc, u) => {
      acc[u.usageType] = (acc[u.usageType] || 0) + u.frequency
      return acc
    }, {} as Record<string, number>)

    const byFile = usages.reduce((acc, u) => {
      acc[u.usedInFile] = (acc[u.usedInFile] || 0) + u.frequency
      return acc
    }, {} as Record<string, number>)

    return {
      totalUsages: usages.reduce((sum, u) => sum + u.frequency, 0),
      uniqueFiles: usages.length,
      directUsages: usages.filter(u => u.isDirectUsage).reduce((sum, u) => sum + u.frequency, 0),
      byType,
      byFile,
      topFiles: Object.entries(byFile)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([file, count]) => ({ file, count }))
    }
  }

  /**
   * Scan codebase and register all entities
   */
  async scanAndRegisterCodebase(): Promise<{
    entities: number
    relationships: number
    fields: number
  }> {
    const srcPath = path.join(process.cwd(), 'src')
    let entities = 0
    let relationships = 0
    let fields = 0

    const scanDir = async (dir: string) => {
      if (!fs.existsSync(dir)) return

      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
          if (!item.includes('node_modules') && !item.includes('.next')) {
            await scanDir(fullPath)
          }
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          const result = await this.analyzeAndRegisterFile(fullPath)
          entities += result.entities
          relationships += result.relationships
          fields += result.fields
        }
      }
    }

    await scanDir(srcPath)

    return { entities, relationships, fields }
  }

  /**
   * Analyze a single file and register its entities
   */
  async analyzeAndRegisterFile(filePath: string): Promise<{
    entities: number
    relationships: number
    fields: number
  }> {
    let entities = 0
    let relationships = 0
    let fields = 0

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const relativePath = filePath.replace(process.cwd(), '')

      // Determine entity type from file path
      let entityType: EntityInfo['entityType'] = 'lib'
      if (relativePath.includes('/app/api/')) entityType = 'api_route'
      else if (relativePath.includes('/components/')) entityType = 'component'
      else if (relativePath.includes('/hooks/')) entityType = 'hook'
      else if (relativePath.includes('/app/') && !relativePath.includes('/api/')) entityType = 'page'

      // Extract entity name from file
      const entityName = path.basename(filePath, path.extname(filePath))

      // Extract imports
      const importMatches = content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g)
      const imports: string[] = []
      for (const match of importMatches) {
        imports.push(match[1])
      }

      // Extract exports
      const exportMatches = content.matchAll(/export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/g)
      const exports: string[] = []
      for (const match of exportMatches) {
        exports.push(match[1])
      }

      // Extract props for components
      const props: string[] = []
      if (entityType === 'component') {
        const propsMatch = content.match(/interface\s+\w*Props\s*{([^}]+)}/)
        if (propsMatch) {
          const propLines = propsMatch[1].split('\n')
          for (const line of propLines) {
            const propMatch = line.match(/(\w+)\s*[?:]/)
            if (propMatch) props.push(propMatch[1])
          }
        }
      }

      // Register the entity
      const entityId = await this.registerEntity({
        entityType,
        entityName,
        filePath: relativePath,
        imports,
        exports,
        props
      })
      entities++

      // Track relationships (imports)
      for (const imp of imports) {
        if (imp.startsWith('@/')) {
          // Find the imported entity
          const importedEntity = await prisma.entityRegistry.findFirst({
            where: { filePath: { contains: imp.replace('@/', '') } }
          })
          if (importedEntity) {
            await this.createRelationship({
              sourceEntityId: entityId,
              targetEntityId: importedEntity.id,
              relationshipType: 'imports'
            })
            relationships++
          }
        }
      }

      // Register fields for API routes (extract from body/params)
      if (entityType === 'api_route') {
        const bodyMatches = content.matchAll(/const\s*{\s*([^}]+)\s*}\s*=\s*(?:await\s*)?(?:request\.)?json\(\)/g)
        for (const match of bodyMatches) {
          const fieldNames = match[1].split(',').map(f => f.trim().split(':')[0].trim())
          for (const fieldName of fieldNames) {
            if (fieldName && !fieldName.includes('=')) {
              await this.registerField({
                entityId,
                fieldName,
                fieldType: 'unknown'
              })
              fields++
            }
          }
        }
      }

    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error)
    }

    return { entities, relationships, fields }
  }

  /**
   * Get statistics about the intelligence bank
   */
  async getStatistics() {
    const [
      totalEntities,
      totalUsages,
      totalRelationships,
      totalFields,
      entitiesByType,
      priorityDistribution,
      piiFields
    ] = await Promise.all([
      prisma.entityRegistry.count(),
      prisma.entityUsage.count(),
      prisma.entityRelationship.count(),
      prisma.fieldRegistry.count(),
      prisma.entityRegistry.groupBy({
        by: ['entityType'],
        _count: true
      }),
      prisma.entityRegistry.groupBy({
        by: ['priority'],
        _count: true
      }),
      prisma.fieldRegistry.count({ where: { isPII: true } })
    ])

    return {
      totalEntities,
      totalUsages,
      totalRelationships,
      totalFields,
      entitiesByType: entitiesByType.reduce((acc, item) => {
        acc[item.entityType] = item._count
        return acc
      }, {} as Record<string, number>),
      priorityDistribution: priorityDistribution.reduce((acc, item) => {
        acc[item.priority] = item._count
        return acc
      }, {} as Record<string, number>),
      piiFields,
      highPriorityIssues: await prisma.entityRegistry.count({
        where: {
          hasIssues: true,
          priority: { in: ['critical', 'high'] }
        }
      })
    }
  }
}

// Export singleton instance
export const intelligenceBank = new IntelligenceBank()
