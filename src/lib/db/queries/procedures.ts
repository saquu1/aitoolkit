/**
 * TYPED DATABASE QUERIES - Stored Procedures
 * ===========================================
 * Type-safe Prisma queries with `satisfies` keyword
 */

import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// =============================================================================
// PROCEDURE INCLUDE DEFINITIONS WITH `satisfies` KEYWORD
// =============================================================================

const procedureWithRelations = {
  ToolkitProject: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ToolkitProcedureInclude

type ProcedureWithRelations = Prisma.ToolkitProcedureGetPayload<{
  include: typeof procedureWithRelations
}>

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Get all procedures for a project
 */
export async function getProceduresByProject(projectId: string) {
  return db.toolkitProcedure.findMany({
    where: { projectId },
    orderBy: { procedureName: 'asc' },
  })
}

/**
 * Get a single procedure by ID
 */
export async function getProcedureById(id: string) {
  return db.toolkitProcedure.findUnique({
    where: { id },
  })
}

/**
 * Get procedure by project and name
 */
export async function getProcedureByProjectAndName(projectId: string, procedureName: string) {
  return db.toolkitProcedure.findFirst({
    where: {
      projectId,
      procedureName,
    },
  })
}

/**
 * Create a new procedure
 */
export async function createProcedure(data: {
  projectId: string
  procedureName: string
  schemaName?: string
  parameters?: any[]
  returnType?: string
  body?: string
  operations?: any[]
  tablesAccessed?: string[]
  tablesModified?: string[]
  complexity?: number
}) {
  return db.toolkitProcedure.create({
    data: {
      id: `sp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: data.projectId,
      procedureName: data.procedureName,
      schemaName: data.schemaName || 'dbo',
      parameters: JSON.stringify(data.parameters || []),
      returnType: data.returnType || null,
      body: data.body || null,
      operations: JSON.stringify(data.operations || []),
      tablesAccessed: JSON.stringify(data.tablesAccessed || []),
      tablesModified: JSON.stringify(data.tablesModified || []),
      complexity: data.complexity || 0,
    },
  })
}

/**
 * Update a procedure
 */
export async function updateProcedure(id: string, data: Partial<{
  procedureName: string
  schemaName: string
  parameters: any[]
  returnType: string | null
  body: string | null
  operations: any[]
  tablesAccessed: string[]
  tablesModified: string[]
  complexity: number
}>) {
  const updateData: any = {}
  
  if (data.parameters) updateData.parameters = JSON.stringify(data.parameters)
  if (data.operations) updateData.operations = JSON.stringify(data.operations)
  if (data.tablesAccessed) updateData.tablesAccessed = JSON.stringify(data.tablesAccessed)
  if (data.tablesModified) updateData.tablesModified = JSON.stringify(data.tablesModified)
  if (data.procedureName !== undefined) updateData.procedureName = data.procedureName
  if (data.schemaName !== undefined) updateData.schemaName = data.schemaName
  if (data.returnType !== undefined) updateData.returnType = data.returnType
  if (data.body !== undefined) updateData.body = data.body
  if (data.complexity !== undefined) updateData.complexity = data.complexity

  return db.toolkitProcedure.update({
    where: { id },
    data: updateData,
  })
}

/**
 * Delete a procedure
 */
export async function deleteProcedure(id: string) {
  return db.toolkitProcedure.delete({
    where: { id },
  })
}

/**
 * Count procedures for a project
 */
export async function countProceduresByProject(projectId: string) {
  return db.toolkitProcedure.count({
    where: { projectId },
  })
}

// =============================================================================
// RE-EXPORT TYPES
// =============================================================================

export type { ProcedureWithRelations }
