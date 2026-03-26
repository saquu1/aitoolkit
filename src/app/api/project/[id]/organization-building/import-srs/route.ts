// =============================================================================
// Import SRS API Route
// Organization Building Module - Combined SRS Import
// Project ID: cmmtztnf90000p680l9xcj0ol
// =============================================================================
// This API accepts SRS content and generates:
// 1. Table schema definitions (stored in ToolkitTable)
// 2. Validation rules (Zod schemas)
// 3. SOP rules (stored in UnifiedSOPRule)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { HIERARCHICAL_CRUD_SOP } from '@/lib/validations/organization-building'

// =============================================================================
// Types
// =============================================================================

interface SRSImportRequest {
  srsContent?: string
  srsFile?: string
  generateSchema: boolean
  generateValidation: boolean
  generateSOP: boolean
  module: 'building' | 'floor' | 'room' | 'all'
}

interface GeneratedArtifact {
  type: 'schema' | 'validation' | 'sop'
  name: string
  content: string
  status: 'created' | 'skipped' | 'error'
  error?: string
}

// =============================================================================
// Schema Generation
// =============================================================================

function generateBuildingSchema(projectId: string): GeneratedArtifact {
  return {
    type: 'schema',
    name: 'OrganizationBuilding',
    content: JSON.stringify({
      tableName: 'OrganizationBuilding',
      columns: [
        { name: 'id', type: 'string', primary: true, default: 'cuid()' },
        { name: 'buildingName', type: 'string', required: true, maxLength: 100, unique: true },
        { name: 'description', type: 'string', optional: true, maxLength: 500 },
        { name: 'status', type: 'boolean', default: true },
        { name: 'createdAt', type: 'DateTime', default: 'now()' },
        { name: 'updatedAt', type: 'DateTime', updatedAt: true },
        { name: 'createdBy', type: 'string', optional: true },
        { name: 'updatedBy', type: 'string', optional: true },
      ],
      indexes: [
        { columns: ['buildingName'] },
        { columns: ['status'] },
        { columns: ['createdAt'] },
      ],
    }, null, 2),
    status: 'created',
  }
}

function generateFloorSchema(projectId: string): GeneratedArtifact {
  return {
    type: 'schema',
    name: 'OrganizationFloor',
    content: JSON.stringify({
      tableName: 'OrganizationFloor',
      columns: [
        { name: 'id', type: 'string', primary: true, default: 'cuid()' },
        { name: 'projectId', type: 'string', required: true },
        { name: 'buildingId', type: 'string', required: true, fk: 'OrganizationBuilding.id', cascadeDelete: true },
        { name: 'floorName', type: 'string', required: true, maxLength: 100 },
        { name: 'description', type: 'string', optional: true, maxLength: 500 },
        { name: 'status', type: 'boolean', default: true },
        { name: 'createdAt', type: 'DateTime', default: 'now()' },
        { name: 'updatedAt', type: 'DateTime', updatedAt: true },
        { name: 'createdBy', type: 'string', optional: true },
        { name: 'updatedBy', type: 'string', optional: true },
      ],
      foreignKeys: [
        { columns: ['buildingId'], references: 'OrganizationBuilding', referencedColumns: ['id'], onDelete: 'CASCADE' },
      ],
      indexes: [
        { columns: ['projectId'] },
        { columns: ['buildingId'] },
        { columns: ['floorName'] },
        { columns: ['status'] },
      ],
      unique: [
        { columns: ['buildingId', 'floorName'] },
      ],
    }, null, 2),
    status: 'created',
  }
}

function generateRoomSchema(projectId: string): GeneratedArtifact {
  return {
    type: 'schema',
    name: 'OrganizationRoom',
    content: JSON.stringify({
      tableName: 'OrganizationRoom',
      columns: [
        { name: 'id', type: 'string', primary: true, default: 'cuid()' },
        { name: 'projectId', type: 'string', required: true },
        { name: 'buildingId', type: 'string', required: true, fk: 'OrganizationBuilding.id', cascadeDelete: true },
        { name: 'floorId', type: 'string', required: true, fk: 'OrganizationFloor.id', cascadeDelete: true },
        { name: 'roomName', type: 'string', required: true, maxLength: 100 },
        { name: 'description', type: 'string', optional: true, maxLength: 500 },
        { name: 'status', type: 'boolean', default: true },
        { name: 'createdAt', type: 'DateTime', default: 'now()' },
        { name: 'updatedAt', type: 'DateTime', updatedAt: true },
        { name: 'createdBy', type: 'string', optional: true },
        { name: 'updatedBy', type: 'string', optional: true },
      ],
      foreignKeys: [
        { columns: ['buildingId'], references: 'OrganizationBuilding', referencedColumns: ['id'], onDelete: 'CASCADE' },
        { columns: ['floorId'], references: 'OrganizationFloor', referencedColumns: ['id'], onDelete: 'CASCADE' },
      ],
      indexes: [
        { columns: ['projectId'] },
        { columns: ['buildingId'] },
        { columns: ['floorId'] },
        { columns: ['roomName'] },
        { columns: ['status'] },
      ],
      unique: [
        { columns: ['floorId', 'roomName'] },
      ],
    }, null, 2),
    status: 'created',
  }
}

// =============================================================================
// Validation Generation
// =============================================================================

function generateValidationSchema(entity: string): GeneratedArtifact {
  const schemas: Record<string, string> = {
    Building: `// Building Validation Schema
import { z } from 'zod'

export const CreateBuildingSchema = z.object({
  buildingName: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  status: z.boolean().default(true),
})

export const UpdateBuildingSchema = CreateBuildingSchema.partial()

export const QueryBuildingSchema = z.object({
  search: z.string().optional(),
  status: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(['buildingName', 'description', 'status', 'createdAt']).default('buildingName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})`,

    Floor: `// Floor Validation Schema
import { z } from 'zod'

export const CreateFloorSchema = z.object({
  buildingId: z.string().min(1),
  floorName: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  status: z.boolean().default(true),
})

export const UpdateFloorSchema = CreateFloorSchema.partial()

export const QueryFloorSchema = z.object({
  buildingId: z.string().optional(),
  search: z.string().optional(),
  status: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(['floorName', 'buildingName', 'status', 'createdAt']).default('floorName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})`,

    Room: `// Room Validation Schema
import { z } from 'zod'

export const CreateRoomSchema = z.object({
  buildingId: z.string().min(1),
  floorId: z.string().min(1),
  roomName: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  status: z.boolean().default(true),
}).refine(
  (data) => data.buildingId && data.floorId,
  { message: 'Both Building ID and Floor ID are required' }
)

export const UpdateRoomSchema = CreateRoomSchema.partial()

export const QueryRoomSchema = z.object({
  buildingId: z.string().optional(),
  floorId: z.string().optional(),
  search: z.string().optional(),
  status: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(['roomName', 'buildingName', 'floorName', 'status', 'createdAt']).default('roomName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})`,
  }

  return {
    type: 'validation',
    name: `Organization${entity}Validation`,
    content: schemas[entity] || '',
    status: 'created',
  }
}

// =============================================================================
// SOP Generation
// =============================================================================

const SOP_RULES_TO_GENERATE = [
  {
    sopId: 'SOP-HIERARCHICAL-CRUD',
    name: 'Hierarchical CRUD Pattern',
    description: 'Parent-child-grandchild tables should follow cascading dropdown pattern',
    category: 'forms',
    priority: 90,
    appliesTo: 'hierarchical_forms',
    condition: { hasParentFK: true, hasGrandchildFK: true },
    expectedValue: 'Cascading dropdowns: Select Parent -> Child dropdown populates -> Create Grandchild',
    sourceDocument: 'Organization Building SRS V1.7',
  },
  {
    sopId: 'SOP-ORG-STATUS-DEFAULT',
    name: 'Status Default to Active',
    description: 'Status field should default to true (active) for all new entities',
    category: 'forms',
    priority: 75,
    appliesTo: 'OrganizationBuilding,OrganizationFloor,OrganizationRoom',
    condition: { fieldName: 'status', fieldType: 'checkbox' },
    expectedValue: 'status defaults to true',
    sourceDocument: 'Organization Building SRS V1.7',
  },
  {
    sopId: 'SOP-ORG-CASCADE-DELETE',
    name: 'Cascade Delete for Hierarchies',
    description: 'Deleting parent should cascade delete all children',
    category: 'database',
    priority: 90,
    appliesTo: 'OrganizationBuilding,OrganizationFloor',
    condition: { hasCascadeDelete: true },
    expectedValue: 'ON DELETE CASCADE for FK relationships',
    sourceDocument: 'Organization Building SRS V1.7',
  },
]

async function generateSOPRules(projectId: string): Promise<GeneratedArtifact[]> {
  const artifacts: GeneratedArtifact[] = []

  for (const rule of SOP_RULES_TO_GENERATE) {
    try {
      // Check if rule already exists
      const existing = await db.unifiedSOPRule.findUnique({
        where: { sopId: rule.sopId }
      })

      if (existing) {
        artifacts.push({
          type: 'sop',
          name: rule.sopId,
          content: JSON.stringify(rule, null, 2),
          status: 'skipped',
        })
        continue
      }

      // Create the rule
      await db.unifiedSOPRule.create({
        data: {
          projectId,
          sopId: rule.sopId,
          name: rule.name,
          description: rule.description,
          category: rule.category,
          priority: rule.priority,
          isActive: true,
          appliesTo: rule.appliesTo,
          condition: JSON.stringify(rule.condition),
          expectedValue: rule.expectedValue,
          sourceDocument: rule.sourceDocument,
          sourceVersion: 'V1.7',
          isSystemDefault: false,
          isCustom: false,
        }
      })

      artifacts.push({
        type: 'sop',
        name: rule.sopId,
        content: JSON.stringify(rule, null, 2),
        status: 'created',
      })
    } catch (error: any) {
      artifacts.push({
        type: 'sop',
        name: rule.sopId,
        content: '',
        status: 'error',
        error: error.message,
      })
    }
  }

  return artifacts
}

// =============================================================================
// Store Schema in ToolkitTable
// =============================================================================

async function storeSchemaInToolkitTable(
  projectId: string,
  schema: GeneratedArtifact
): Promise<GeneratedArtifact> {
  try {
    const schemaData = JSON.parse(schema.content)

    // Check if table already exists
    const existing = await db.toolkitTable.findFirst({
      where: {
        projectId,
        tableName: schemaData.tableName,
      },
    })

    if (existing) {
      return {
        ...schema,
        status: 'skipped',
      }
    }

    // Create the table entry
    await db.toolkitTable.create({
      data: {
        projectId,
        tableName: schemaData.tableName,
        schemaName: 'organization',
        columns: JSON.stringify(schemaData.columns),
        foreignKeys: JSON.stringify(schemaData.foreignKeys || []),
        indexes: JSON.stringify(schemaData.indexes || []),
        constraints: JSON.stringify(schemaData.constraints || []),
        sourceDDL: null,
        status: 'standalone',
        linkedModule: 'Organization Building',
      },
    })

    return {
      ...schema,
      status: 'created',
    }
  } catch (error: any) {
    return {
      ...schema,
      status: 'error',
      error: error.message,
    }
  }
}

// =============================================================================
// API Route Handler
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const body: SRSImportRequest = await request.json()

    const {
      srsContent,
      generateSchema = true,
      generateValidation = true,
      generateSOP = true,
      module = 'all',
    } = body

    const artifacts: GeneratedArtifact[] = []

    // Generate Schema
    if (generateSchema) {
      const schemas: GeneratedArtifact[] = []

      if (module === 'all' || module === 'building') {
        const buildingSchema = generateBuildingSchema(projectId)
        const stored = await storeSchemaInToolkitTable(projectId, buildingSchema)
        schemas.push(stored)
      }

      if (module === 'all' || module === 'floor') {
        const floorSchema = generateFloorSchema(projectId)
        const stored = await storeSchemaInToolkitTable(projectId, floorSchema)
        schemas.push(stored)
      }

      if (module === 'all' || module === 'room') {
        const roomSchema = generateRoomSchema(projectId)
        const stored = await storeSchemaInToolkitTable(projectId, roomSchema)
        schemas.push(stored)
      }

      artifacts.push(...schemas)
    }

    // Generate Validation
    if (generateValidation) {
      const entities = module === 'all' ? ['Building', 'Floor', 'Room'] : 
        module === 'building' ? ['Building'] :
        module === 'floor' ? ['Floor'] : ['Room']

      for (const entity of entities) {
        artifacts.push(generateValidationSchema(entity))
      }
    }

    // Generate SOP Rules
    if (generateSOP) {
      const sopArtifacts = await generateSOPRules(projectId)
      artifacts.push(...sopArtifacts)
    }

    // Calculate summary
    const summary = {
      total: artifacts.length,
      created: artifacts.filter(a => a.status === 'created').length,
      skipped: artifacts.filter(a => a.status === 'skipped').length,
      errors: artifacts.filter(a => a.status === 'error').length,
    }

    return NextResponse.json({
      message: 'SRS import completed',
      projectId,
      module,
      summary,
      artifacts: artifacts.map(a => ({
        type: a.type,
        name: a.name,
        status: a.status,
        error: a.error,
      })),
      generatedFiles: {
        schemas: artifacts.filter(a => a.type === 'schema').map(a => a.content),
        validations: artifacts.filter(a => a.type === 'validation').map(a => a.content),
      },
    })
  } catch (error: any) {
    console.error('Error importing SRS:', error)
    return NextResponse.json(
      { error: 'Failed to import SRS', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// GET - Get import status and available options
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    // Check existing tables
    const existingTables = await db.toolkitTable.findMany({
      where: {
        projectId,
        tableName: { contains: 'Organization' },
      },
      select: {
        tableName: true,
        status: true,
      },
    })

    // Check existing SOP rules
    const existingSOPs = await db.unifiedSOPRule.findMany({
      where: {
        projectId,
        sopId: { contains: 'SOP-ORG' },
      },
      select: {
        sopId: true,
        name: true,
      },
    })

    return NextResponse.json({
      projectId,
      status: {
        tables: {
          OrganizationBuilding: existingTables.some(t => t.tableName.includes('Building')),
          OrganizationFloor: existingTables.some(t => t.tableName.includes('Floor')),
          OrganizationRoom: existingTables.some(t => t.tableName.includes('Room')),
        },
        sopRules: existingSOPs.length,
        existingTables: existingTables.map(t => t.tableName),
        existingSOPs: existingSOPs.map(s => ({ id: s.sopId, name: s.name })),
      },
      options: {
        modules: ['building', 'floor', 'room', 'all'],
        actions: {
          generateSchema: 'Generate table schema definitions',
          generateValidation: 'Generate Zod validation schemas',
          generateSOP: 'Generate SOP rules for the module',
        },
      },
    })
  } catch (error: any) {
    console.error('Error getting import status:', error)
    return NextResponse.json(
      { error: 'Failed to get import status', message: error.message },
      { status: 500 }
    )
  }
}
