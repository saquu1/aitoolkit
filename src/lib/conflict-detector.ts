/**
 * Conflict Detection System
 * 
 * Detects conflicts between different extraction sources and
 * provides auto-resolution capabilities.
 */

import { prisma } from "./db"

// ============================================================================
// Types
// ============================================================================

export interface ConflictSource {
  agent: string
  value: Record<string, any>
  confidence: number
  file?: string
}

export interface ConflictInput {
  projectId?: string
  entityType: 'table' | 'column' | 'fk' | 'sp' | 'view'
  entityId: string
  sources: ConflictSource[]
}

export interface DetectedConflict {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  autoResolvable: boolean
  suggestedResolution?: 'source1' | 'source2' | 'merged' | 'custom'
  suggestedValue?: Record<string, any>
  ruleId?: string
}

export interface ConflictRuleConfig {
  conflictType: string
  priority: number
  resolution: 'source1' | 'source2' | 'merged' | 'custom'
  logic?: Record<string, any>
  description?: string
}

// ============================================================================
// Critical Conflict Patterns
// ============================================================================

const CRITICAL_TYPE_PAIRS = [
  ['text_input', 'dropdown'],    // Text vs FK
  ['number_input', 'dropdown'],  // Number vs FK
  ['date_picker', 'text_input'], // Date vs Text
  ['checkbox', 'dropdown'],      // Boolean vs FK
  ['textarea', 'dropdown'],      // Long text vs FK
]

const TYPE_PRIORITY: Record<string, number> = {
  dropdown: 10,      // FK relationships are most specific
  date_picker: 8,    // Date types are specific
  number_input: 7,   // Numbers are specific
  checkbox: 6,       // Booleans are specific
  text_input: 5,     // Text is generic
  textarea: 4,       // Long text
  file_upload: 3,    // Files
  unknown: 0         // Unknown
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Detect conflicts between extraction sources
 */
export async function detectConflicts(
  input: ConflictInput
): Promise<DetectedConflict[]> {
  const conflicts: DetectedConflict[] = []
  const sources = input.sources

  if (sources.length < 2) {
    return conflicts // No conflict with single source
  }

  // Check for type mismatches
  const typeConflict = detectTypeMismatch(input)
  if (typeConflict) conflicts.push(typeConflict)

  // Check for constraint conflicts
  const constraintConflict = detectConstraintConflict(input)
  if (constraintConflict) conflicts.push(constraintConflict)

  // Check for naming conflicts
  const namingConflict = detectNamingConflict(input)
  if (namingConflict) conflicts.push(namingConflict)

  // Check for value conflicts
  const valueConflict = detectValueConflict(input)
  if (valueConflict) conflicts.push(valueConflict)

  // Store detected conflicts
  for (const conflict of conflicts) {
    await storeConflict(input, conflict, sources)
  }

  return conflicts
}

/**
 * Detect type mismatch conflicts
 */
function detectTypeMismatch(input: ConflictInput): DetectedConflict | null {
  const { sources } = input
  
  // Get UI types from each source
  const uiTypes = sources.map(s => ({
    agent: s.agent,
    type: s.value?.uiType || s.value?.uiComponent || s.value?.dataType || 'unknown',
    confidence: s.confidence
  }))

  // Check if types differ
  const uniqueTypes = new Set(uiTypes.map(t => t.type))
  
  if (uniqueTypes.size > 1) {
    const types = Array.from(uniqueTypes)
    
    // Determine severity based on critical pairs
    let severity: DetectedConflict['severity'] = 'medium'
    
    for (const [t1, t2] of CRITICAL_TYPE_PAIRS) {
      if (types.includes(t1) && types.includes(t2)) {
        severity = 'high'
        break
      }
    }
    
    // Determine suggested resolution (prefer higher priority type)
    const sortedTypes = uiTypes.sort((a, b) => {
      const priorityA = TYPE_PRIORITY[a.type] || 0
      const priorityB = TYPE_PRIORITY[b.type] || 0
      return priorityB - priorityA
    })
    
    const suggestedType = sortedTypes[0].type
    const suggestedSource = sortedTypes[0].agent
    
    return {
      type: 'type_mismatch',
      severity,
      description: `UI type conflict: ${types.join(' vs ')}. Sources: ${uiTypes.map(t => `${t.agent}(${t.type})`).join(', ')}`,
      autoResolvable: true,
      suggestedResolution: suggestedSource === sources[0].agent ? 'source1' : 'source2',
      suggestedValue: { uiType: suggestedType }
    }
  }

  return null
}

/**
 * Detect constraint conflicts (nullable, unique, etc.)
 */
function detectConstraintConflict(input: ConflictInput): DetectedConflict | null {
  const { sources } = input
  
  // Check nullable constraint
  const nullableValues = sources.map(s => ({
    agent: s.agent,
    nullable: s.value?.isNullable,
    confidence: s.confidence
  }))
  
  const uniqueNullable = new Set(nullableValues.filter(v => v.nullable !== undefined).map(v => v.nullable))
  
  if (uniqueNullable.size > 1) {
    return {
      type: 'constraint_conflict',
      severity: 'medium',
      description: `Nullable constraint conflict: Some sources say nullable=${Array.from(uniqueNullable).join('/')}`,
      autoResolvable: true,
      suggestedResolution: 'source1', // Prefer DDL source
      suggestedValue: { isNullable: false } // Prefer required
    }
  }

  // Check primary key conflict
  const pkValues = sources.map(s => ({
    agent: s.agent,
    isPK: s.value?.isPrimaryKey,
    confidence: s.confidence
  }))
  
  const uniquePK = new Set(pkValues.filter(v => v.isPK !== undefined).map(v => v.isPK))
  
  if (uniquePK.size > 1) {
    return {
      type: 'constraint_conflict',
      severity: 'critical',
      description: `Primary key conflict: Some sources say PK=${Array.from(uniquePK).join('/')}`,
      autoResolvable: false
    }
  }

  return null
}

/**
 * Detect naming conflicts
 */
function detectNamingConflict(input: ConflictInput): DetectedConflict | null {
  const { sources } = input
  
  const names = sources.map(s => ({
    agent: s.agent,
    name: s.value?.name || s.value?.columnName || s.value?.tableName,
    confidence: s.confidence
  }))
  
  const uniqueNames = new Set(names.filter(n => n.name).map(n => n.name))
  
  if (uniqueNames.size > 1) {
    return {
      type: 'naming_conflict',
      severity: 'low',
      description: `Name conflict: ${Array.from(uniqueNames).join(' vs ')}`,
      autoResolvable: false
    }
  }

  return null
}

/**
 * Detect value conflicts (default values, sizes, etc.)
 */
function detectValueConflict(input: ConflictInput): DetectedConflict | null {
  const { sources } = input
  
  // Check default value conflicts
  const defaultValues = sources.map(s => ({
    agent: s.agent,
    defaultValue: s.value?.defaultValue,
    confidence: s.confidence
  }))
  
  const uniqueDefaults = new Set(defaultValues.filter(v => v.defaultValue !== undefined).map(v => v.defaultValue))
  
  if (uniqueDefaults.size > 1) {
    return {
      type: 'value_conflict',
      severity: 'low',
      description: `Default value conflict: ${Array.from(uniqueDefaults).join(' vs ')}`,
      autoResolvable: true,
      suggestedResolution: 'source1'
    }
  }

  // Check max length conflicts
  const maxLengths = sources.map(s => ({
    agent: s.agent,
    maxLength: s.value?.maxLength || s.value?.length,
    confidence: s.confidence
  }))
  
  const uniqueLengths = new Set(maxLengths.filter(v => v.maxLength !== undefined).map(v => v.maxLength))
  
  if (uniqueLengths.size > 1) {
    const lengths = Array.from(uniqueLengths).map(Number)
    const maxLength = Math.max(...lengths)
    
    return {
      type: 'value_conflict',
      severity: 'medium',
      description: `Max length conflict: ${lengths.join(' vs ')}. Suggesting largest value: ${maxLength}`,
      autoResolvable: true,
      suggestedResolution: 'merged',
      suggestedValue: { maxLength }
    }
  }

  return null
}

/**
 * Store conflict in database
 */
async function storeConflict(
  input: ConflictInput,
  conflict: DetectedConflict,
  sources: ConflictInput['sources']
): Promise<void> {
  try {
    await prisma.extractionConflict.upsert({
      where: {
        entityType_entityId_conflictType: {
          entityType: input.entityType,
          entityId: input.entityId,
          conflictType: conflict.type
        }
      },
      create: {
        projectId: input.projectId,
        entityType: input.entityType,
        entityId: input.entityId,
        conflictType: conflict.type,
        severity: conflict.severity,
        source1Agent: sources[0].agent,
        source1Value: JSON.stringify(sources[0].value),
        source1Confidence: sources[0].confidence,
        source1File: sources[0].file,
        source2Agent: sources[1]?.agent || '',
        source2Value: JSON.stringify(sources[1]?.value || {}),
        source2Confidence: sources[1]?.confidence || 0,
        source2File: sources[1]?.file,
        status: conflict.autoResolvable ? 'auto_resolvable' : 'pending'
      },
      update: {
        severity: conflict.severity,
        source1Agent: sources[0].agent,
        source1Value: JSON.stringify(sources[0].value),
        source1Confidence: sources[0].confidence,
        source2Agent: sources[1]?.agent || '',
        source2Value: JSON.stringify(sources[1]?.value || {}),
        source2Confidence: sources[1]?.confidence || 0,
        status: conflict.autoResolvable ? 'auto_resolvable' : 'pending',
        updatedAt: new Date()
      }
    })
  } catch (error) {
    console.error('[ConflictDetector] Failed to store conflict:', error)
  }
}

/**
 * Get pending conflicts for review
 */
export async function getPendingConflicts(
  projectId?: string,
  limit: number = 50
): Promise<Array<{
  id: string
  entityType: string
  entityId: string
  conflictType: string
  severity: string
  source1Agent: string
  source1Value: string
  source2Agent: string
  source2Value: string
  status: string
}>> {
  const where: any = {
    status: { in: ['pending', 'auto_resolvable'] }
  }
  
  if (projectId) {
    where.projectId = projectId
  }
  
  return prisma.extractionConflict.findMany({
    where,
    orderBy: [
      { severity: 'asc' }, // critical first
      { createdAt: 'asc' }
    ],
    take: limit
  })
}

/**
 * Get conflict statistics
 */
export async function getConflictStats(projectId?: string): Promise<{
  total: number
  pending: number
  resolved: number
  critical: number
  high: number
  medium: number
  low: number
}> {
  const where: any = {}
  if (projectId) where.projectId = projectId
  
  const [total, pending, resolved, critical, high, medium, low] = await Promise.all([
    prisma.extractionConflict.count({ where }),
    prisma.extractionConflict.count({ where: { ...where, status: { in: ['pending', 'auto_resolvable'] } } }),
    prisma.extractionConflict.count({ where: { ...where, status: 'resolved' } }),
    prisma.extractionConflict.count({ where: { ...where, severity: 'critical' } }),
    prisma.extractionConflict.count({ where: { ...where, severity: 'high' } }),
    prisma.extractionConflict.count({ where: { ...where, severity: 'medium' } }),
    prisma.extractionConflict.count({ where: { ...where, severity: 'low' } })
  ])
  
  return { total, pending, resolved, critical, high, medium, low }
}

/**
 * Initialize default conflict rules
 */
export async function initializeDefaultRules(): Promise<void> {
  const defaultRules: ConflictRuleConfig[] = [
    {
      conflictType: 'type_mismatch',
      priority: 1,
      resolution: 'source1',
      description: 'Prefer DDL source for type conflicts'
    },
    {
      conflictType: 'constraint_conflict',
      priority: 2,
      resolution: 'source1',
      description: 'Prefer DDL source for constraint conflicts'
    },
    {
      conflictType: 'value_conflict',
      priority: 3,
      resolution: 'merged',
      description: 'Merge values for value conflicts'
    },
    {
      conflictType: 'naming_conflict',
      priority: 4,
      resolution: 'source1',
      description: 'Prefer DDL source for naming conflicts'
    }
  ]
  
  for (const rule of defaultRules) {
    await prisma.conflictRule.upsert({
      where: { name: `default_${rule.conflictType}` },
      create: {
        name: `default_${rule.conflictType}`,
        conflictType: rule.conflictType,
        priority: rule.priority,
        resolution: rule.resolution,
        description: rule.description
      },
      update: {
        priority: rule.priority,
        resolution: rule.resolution,
        description: rule.description
      }
    })
  }
}

// Export types
export type { ConflictSource as ConflictSourceType, DetectedConflict as DetectedConflictType }
