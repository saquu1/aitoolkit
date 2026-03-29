import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

// GET - List all projects or get a single project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('id')
    const includeFiles = searchParams.get('includeFiles') === 'true'
    const includeStats = searchParams.get('includeStats') === 'true'

    if (projectId) {
      // Get single project with optional includes
      const project = await prisma.toolkitProject.findUnique({
        where: { id: projectId },
        include: {
          ToolkitFile: includeFiles ? {
            orderBy: { createdAt: 'desc' }
          } : false,
          ToolkitTable: includeStats,
          ToolkitProcedure: includeStats,
          CSHTMLAnalysisCache: includeStats,
          _count: {
            select: {
              ToolkitFile: true,
              ToolkitTable: true,
              ToolkitProcedure: true,
              CSHTMLAnalysisCache: true
            }
          }
        }
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      return NextResponse.json({ project })
    }

    // List all projects
    const projects = await prisma.toolkitProject.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            ToolkitFile: true,
            ToolkitTable: true,
            ToolkitProcedure: true,
            CSHTMLAnalysisCache: true
          }
        }
      }
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, softwareType, targetTemplate, color, icon } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    // Check if project with same name exists
    const existing = await prisma.toolkitProject.findFirst({
      where: { name: name.trim() }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Project with this name already exists' },
        { status: 400 }
      )
    }

    // Generate a unique ID for the project
    const projectId = randomUUID()

    const project = await prisma.toolkitProject.create({
      data: {
        id: projectId,
        name: name.trim(),
        description: description?.trim() || null,
        softwareType: softwareType || 'Custom',
        targetTemplate: targetTemplate || 'nextjs-react',
        color: color || '#3b82f6',
        icon: icon || 'Database',
        rawSql: '',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

// PUT - Update a project
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, softwareType, targetTemplate, color, icon, status } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Check if project exists
    const existing = await prisma.toolkitProject.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // If name is being changed, check for duplicates
    if (name && name !== existing.name) {
      const duplicate = await prisma.toolkitProject.findFirst({
        where: {
          name: name.trim(),
          NOT: { id }
        }
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Project with this name already exists' },
          { status: 400 }
        )
      }
    }

    const project = await prisma.toolkitProject.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(softwareType && { softwareType }),
        ...(targetTemplate && { targetTemplate }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(status && { status })
      }
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a project and all its files
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('id')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Check if project exists
    const existing = await prisma.toolkitProject.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            files: true,
            tables: true,
            procedures: true
          }
        }
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Delete project (cascade will delete all related files)
    await prisma.toolkitProject.delete({
      where: { id: projectId }
    })

    return NextResponse.json({
      success: true,
      deletedCounts: existing._count
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
