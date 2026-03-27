/**
 * PROJECTS API ROUTE
 * ===================
 * Uses all 3 principles:
 * 1. Error Handler - centralized error handling
 * 2. Typed Queries - `satisfies Prisma.*Include`
 * 3. Route Registry - routes defined in config/routes.ts
 * 
 * MEMORY OPTIMIZED:
 * - Cursor-based pagination for large datasets
 * - Offset-based pagination for traditional navigation
 * - Summary-only mode for lightweight listings
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, ApiError, requireAuth } from '@/lib/errors'
import {
  getProjects,
  getProjectById,
  getProjectWithRelations,
  createProject,
  updateProject,
  deleteProject,
  getProjectStats,
} from '@/lib/db/queries/projects'
import { db } from '@/lib/db'
import {
  getPaginationParams,
  apiSuccess,
  apiError,
  type PaginationRequest,
} from '@/lib/api/paginated-response'

// =============================================================================
// HELPER: Build pagination where clause
// =============================================================================

function getPaginationWhere(params: PaginationRequest, filters: Record<string, string | undefined>) {
  const where: Record<string, unknown> = {}
  
  // Filter by status
  if (filters.status) {
    where.status = filters.status
  }
  
  // Filter by software type
  if (filters.softwareType) {
    where.softwareType = filters.softwareType
  }
  
  // Search filter
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ]
  }
  
  // Cursor pagination - exclude items before cursor
  if (params.mode === 'cursor' && params.cursor) {
    const cursorId = Buffer.from(params.cursor, 'base64url').toString('utf-8')
    where.id = { lt: cursorId } // Assuming descending order
  }
  
  return where
}

// =============================================================================
// GET - List projects or get single project (WITH PAGINATION)
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // GET is public for the home page API Management tab
    // POST/PUT/DELETE still require auth via their own requireAuth() calls

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('id')
    const includeFiles = searchParams.get('includeFiles') === 'true'
    const includeStats = searchParams.get('includeStats') === 'true'
    
    // NEW: Check for paginated list request
    const paginated = searchParams.get('paginated') === 'true'
    const summaryOnly = searchParams.get('summary') === 'true'

    // Get single project
    if (projectId) {
      const project = includeFiles
        ? await getProjectWithRelations(projectId)
        : await getProjectById(projectId)

      if (!project) {
        throw ApiError.notFound('Project not found')
      }

      // Optionally include stats
      let stats = null
      if (includeStats) {
        stats = await getProjectStats(projectId)
      }

      return NextResponse.json({
        project,
        ...(stats && { stats }),
      })
    }

    // PAGINATED LIST - Memory efficient for large datasets
    if (paginated) {
      const params = getPaginationParams(request)
      const filters = {
        status: searchParams.get('status') || undefined,
        softwareType: searchParams.get('softwareType') || undefined,
        search: searchParams.get('search') || undefined,
      }
      
      const where = getPaginationWhere(params, filters)
      
      // Summary-only mode for lightweight listings
      const select = summaryOnly ? {
        id: true,
        name: true,
        description: true,
        softwareType: true,
        status: true,
        color: true,
        icon: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { files: true, tables: true } },
      } : undefined
      
      // Get total count for pagination
      const totalCount = await db.project.count({ where })
      
      // Execute paginated query
      if (params.mode === 'cursor') {
        const take = params.limit + 1 // Take one extra to detect hasMore
        
        const projects = await db.project.findMany({
          where,
          select,
          take,
          skip: params.cursor ? 1 : 0,
          cursor: params.cursor ? { id: Buffer.from(params.cursor, 'base64url').toString('utf-8') } : undefined,
          orderBy: { createdAt: 'desc' },
        })
        
        const hasMore = projects.length > params.limit
        const data = hasMore ? projects.slice(0, -1) : projects
        const nextCursor = hasMore && data.length > 0
          ? Buffer.from(data[data.length - 1].id).toString('base64url')
          : null
        
        return apiSuccess(data, {
          pagination: {
            hasMore,
            hasPrevious: !!params.cursor,
            nextCursor,
            previousCursor: null,
            pageSize: params.limit,
          },
          meta: { totalCount },
        })
      }
      
      // Offset pagination
      const projects = await db.project.findMany({
        where,
        select,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: { createdAt: 'desc' },
      })
      
      const totalPages = Math.ceil(totalCount / params.pageSize)
      
      return apiSuccess(projects, {
        pagination: {
          hasMore: params.page < totalPages,
          hasPrevious: params.page > 1,
          nextCursor: null,
          previousCursor: null,
          totalCount,
          page: params.page,
          pageSize: params.pageSize,
          totalPages,
        },
      })
    }

    // LEGACY: List all projects (non-paginated, for backward compatibility)
    const projects = await getProjects()

    return NextResponse.json({ projects })

  } catch (error) {
    return handleApiError(error)
  }
}

// =============================================================================
// POST - Create a new project
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth()

    const body = await request.json()
    const { name, description, softwareType, targetTemplate, color, icon } = body

    // Validate required fields
    if (!name || !name.trim()) {
      throw ApiError.badRequest('Project name is required')
    }

    // Create project using typed query
    const project = await createProject({
      name: name.trim(),
      description: description?.trim() || null,
      softwareType: softwareType || 'Custom',
      targetTemplate: targetTemplate || 'nextjs-react',
      color: color || '#3b82f6',
      icon: icon || 'Database',
    })

    return NextResponse.json({ project }, { status: 201 })

  } catch (error) {
    return handleApiError(error)
  }
}

// =============================================================================
// PUT - Update a project
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth()

    const body = await request.json()
    const { id, name, description, softwareType, targetTemplate, color, icon, status } = body

    if (!id) {
      throw ApiError.badRequest('Project ID is required')
    }

    // Check if project exists
    const existing = await getProjectById(id)
    if (!existing) {
      throw ApiError.notFound('Project not found')
    }

    // If name is being changed, check for duplicates
    if (name && name !== existing.name) {
      // Duplicate check would go here if needed
    }

    // Update project using typed query
    const project = await updateProject(id, {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(softwareType && { softwareType }),
      ...(targetTemplate && { targetTemplate }),
      ...(color && { color }),
      ...(icon && { icon }),
      ...(status && { status }),
    })

    return NextResponse.json({ project })

  } catch (error) {
    return handleApiError(error)
  }
}

// =============================================================================
// DELETE - Delete a project
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth()

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('id')

    if (!projectId) {
      throw ApiError.badRequest('Project ID is required')
    }

    // Check if project exists
    const existing = await getProjectById(projectId)
    if (!existing) {
      throw ApiError.notFound('Project not found')
    }

    // Delete project (cascade handles related files)
    await deleteProject(projectId)

    return NextResponse.json({
      success: true,
      message: 'Project deleted',
    })

  } catch (error) {
    return handleApiError(error)
  }
}
