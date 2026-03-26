/**
 * TYPED DATABASE QUERIES - Tables
 * ================================
 * Type-safe Prisma queries with `satisfies` keyword
 */

import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// =============================================================================
// TABLE INCLUDE DEFINITIONS WITH `satisfies` KEYWORD
// =============================================================================

/**
 * Table with columns only
 */
const tableWithColumns = {
  // No includes needed for basic table
} satisfies Prisma.ToolkitTableInclude

/**
 * Table with all relations
 */
const tableWithRelations = {
  ToolkitProject: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ToolkitTableInclude

type TableWithRelations = Prisma.ToolkitTableGetPayload<{
  include: typeof tableWithRelations
}>

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Get all tables for a project
 */
export async function getTablesByProject(projectId: string) {
  return db.toolkitTable.findMany({
    where: { projectId },
    orderBy: { tableName: 'asc' },
  })
}

/**
 * Get a single table by ID
 */
export async function getTableById(id: string) {
  return db.toolkitTable.findUnique({
    where: { id },
  })
}

/**
 * Get table by project and name
 */
export async function getTableByProjectAndName(projectId: string, tableName: string) {
  return db.toolkitTable.findFirst({
    where: {
      projectId,
      tableName,
    },
  })
}

/**
 * Create a new table
 */
export async function createTable(data: {
  projectId: string
  tableName: string
  schemaName?: string
  columns?: any[]
  foreignKeys?: any[]
  indexes?: any[]
  constraints?: any[]
  sourceDDL?: string
  status?: string
  linkedModule?: string
}) {
  return db.toolkitTable.create({
    data: {
      id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: data.projectId,
      tableName: data.tableName,
      schemaName: data.schemaName || 'dbo',
      columns: JSON.stringify(data.columns || []),
      foreignKeys: JSON.stringify(data.foreignKeys || []),
      indexes: JSON.stringify(data.indexes || []),
      constraints: JSON.stringify(data.constraints || []),
      sourceDDL: data.sourceDDL || null,
      status: data.status || 'standalone',
      linkedModule: data.linkedModule || null,
    },
  })
}

/**
 * Update a table
 */
export async function updateTable(id: string, data: Partial<{
  tableName: string
  schemaName: string
  columns: any[]
  foreignKeys: any[]
  indexes: any[]
  constraints: any[]
  sourceDDL: string | null
  status: string
  linkedModule: string | null
}>) {
  const updateData: any = {}
  
  if (data.columns) updateData.columns = JSON.stringify(data.columns)
  if (data.foreignKeys) updateData.foreignKeys = JSON.stringify(data.foreignKeys)
  if (data.indexes) updateData.indexes = JSON.stringify(data.indexes)
  if (data.constraints) updateData.constraints = JSON.stringify(data.constraints)
  if (data.tableName !== undefined) updateData.tableName = data.tableName
  if (data.schemaName !== undefined) updateData.schemaName = data.schemaName
  if (data.sourceDDL !== undefined) updateData.sourceDDL = data.sourceDDL
  if (data.status !== undefined) updateData.status = data.status
  if (data.linkedModule !== undefined) updateData.linkedModule = data.linkedModule

  return db.toolkitTable.update({
    where: { id },
    data: updateData,
  })
}

/**
 * Delete a table
 */
export async function deleteTable(id: string) {
  return db.toolkitTable.delete({
    where: { id },
  })
}

/**
 * Count tables for a project
 */
export async function countTablesByProject(projectId: string) {
  return db.toolkitTable.count({
    where: { projectId },
  })
}

// =============================================================================
// RE-EXPORT TYPES
// =============================================================================

export type { TableWithRelations }
