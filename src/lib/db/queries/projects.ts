/**
 * TYPED DATABASE QUERIES - Projects
 * ==================================
 * Type-safe Prisma queries with `satisfies` keyword
 * 
 * Principle 2 of 3: `satisfies Prisma.*Include` prevents relation name errors at compile time
 */

import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// =============================================================================
// PROJECT INCLUDE DEFINITIONS WITH `satisfies` KEYWORD
// =============================================================================

/**
 * Project with counts - use this for list views
 * ⭐ The `satisfies` keyword ensures TypeScript catches wrong relation names
 */
const projectWithCounts = {
  _count: {
    select: {
      ToolkitFile: true,
      ToolkitTable: true,
      ToolkitProcedure: true,
      CSHTMLAnalysisCache: true,
    },
  },
} satisfies Prisma.ToolkitProjectInclude

type ProjectWithCounts = Prisma.ToolkitProjectGetPayload<{
  include: typeof projectWithCounts
}>

/**
 * Project with all relations - use this for detail views
 * ⭐ If you mistype a relation name, TypeScript will ERROR at compile time
 */
const projectWithRelations = {
  ToolkitFile: {
    orderBy: { createdAt: 'desc' as const },
  },
  ToolkitTable: true,
  ToolkitProcedure: true,
  CSHTMLAnalysisCache: true,
  StoredProcedureCache: true,
  _count: {
    select: {
      ToolkitFile: true,
      ToolkitTable: true,
      ToolkitProcedure: true,
      CSHTMLAnalysisCache: true,
    },
  },
} satisfies Prisma.ToolkitProjectInclude

type ProjectWithRelations = Prisma.ToolkitProjectGetPayload<{
  include: typeof projectWithRelations
}>

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Get all projects with counts
 */
export async function getProjects(): Promise<ProjectWithCounts[]> {
  return db.toolkitProject.findMany({
    orderBy: { updatedAt: 'desc' },
    include: projectWithCounts,
  })
}

/**
 * Get a single project by ID with counts
 */
export async function getProjectById(id: string): Promise<ProjectWithCounts | null> {
  return db.toolkitProject.findUnique({
    where: { id },
    include: projectWithCounts,
  })
}

/**
 * Get a project with all relations
 */
export async function getProjectWithRelations(id: string): Promise<ProjectWithRelations | null> {
  return db.toolkitProject.findUnique({
    where: { id },
    include: projectWithRelations,
  })
}

/**
 * Create a new project
 */
export async function createProject(data: {
  name: string
  description?: string | null
  softwareType?: string
  targetTemplate?: string
  color?: string
  icon?: string
}): Promise<ProjectWithCounts> {
  return db.toolkitProject.create({
    data: {
      id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description || null,
      softwareType: data.softwareType || 'Custom',
      targetTemplate: data.targetTemplate || 'nextjs-react',
      color: data.color || '#3b82f6',
      icon: data.icon || 'Database',
      status: 'active',
    },
    include: projectWithCounts,
  })
}

/**
 * Update a project
 */
export async function updateProject(
  id: string,
  data: Partial<{
    name: string
    description: string | null
    softwareType: string
    targetTemplate: string
    color: string
    icon: string
    status: string
  }>
): Promise<ProjectWithCounts> {
  return db.toolkitProject.update({
    where: { id },
    data,
    include: projectWithCounts,
  })
}

/**
 * Delete a project
 */
export async function deleteProject(id: string): Promise<void> {
  await db.toolkitProject.delete({
    where: { id },
  })
}

/**
 * Get project stats
 */
export async function getProjectStats(id: string) {
  const [fileCount, tableCount, procedureCount, viewCount] = await Promise.all([
    db.toolkitFile.count({ where: { projectId: id } }),
    db.toolkitTable.count({ where: { projectId: id } }),
    db.toolkitProcedure.count({ where: { projectId: id } }),
    db.cSHTMLAnalysisCache.count({ where: { projectId: id } }),
  ])

  return {
    fileCount,
    tableCount,
    procedureCount,
    viewCount,
    total: fileCount + tableCount + procedureCount + viewCount,
  }
}

// =============================================================================
// RE-EXPORT TYPES
// =============================================================================

export type { ProjectWithCounts, ProjectWithRelations }
