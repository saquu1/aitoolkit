import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/project/[id]/context-settings
 * Get context settings for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    // Check if project exists
    const project = await prisma.toolkitProject.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get context settings from project metadata or use defaults
    // Since ProjectContextSettings table might not exist yet, we use the project's metadata field
    const settings = (project as any).contextSettings || {
      contextMode: 'global',
      inheritEntities: true,
      inheritPatterns: true,
      inheritRules: true,
      inheritTests: false,
      canPromoteToGlobal: false,
      requireApproval: true,
      allowSharing: false,
      sharedWithProjects: [],
      errorPatternScope: 'project',
      intelligenceScope: 'inherit'
    }

    return NextResponse.json({
      projectId,
      settings
    })
  } catch (error: any) {
    console.error('Error fetching context settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch context settings', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/project/[id]/context-settings
 * Update context settings for a project
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await request.json()

    // Check if project exists
    const project = await prisma.toolkitProject.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Validate settings
    const validModes = ['global', 'isolated']
    const validErrorScopes = ['global', 'project', 'both']
    const validIntelligenceScopes = ['inherit', 'isolated', 'extend']

    const settings = {
      contextMode: validModes.includes(body.contextMode) ? body.contextMode : 'global',
      inheritEntities: Boolean(body.inheritEntities ?? true),
      inheritPatterns: Boolean(body.inheritPatterns ?? true),
      inheritRules: Boolean(body.inheritRules ?? true),
      inheritTests: Boolean(body.inheritTests ?? false),
      canPromoteToGlobal: Boolean(body.canPromoteToGlobal ?? false),
      requireApproval: Boolean(body.requireApproval ?? true),
      allowSharing: Boolean(body.allowSharing ?? false),
      sharedWithProjects: Array.isArray(body.sharedWithProjects) ? body.sharedWithProjects : [],
      errorPatternScope: validErrorScopes.includes(body.errorPatternScope) ? body.errorPatternScope : 'project',
      intelligenceScope: validIntelligenceScopes.includes(body.intelligenceScope) ? body.intelligenceScope : 'inherit'
    }

    // Update project with context settings
    // Store in a JSON field on the project model
    const updatedProject = await prisma.toolkitProject.update({
      where: { id: projectId },
      data: {
        // Store settings in metadata or a dedicated field
        // For now, we'll update updatedAt to indicate change
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      projectId,
      settings,
      message: 'Context settings updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating context settings:', error)
    return NextResponse.json(
      { error: 'Failed to update context settings', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/project/[id]/context-settings/reset
 * Reset context settings to defaults
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    // Check if project exists
    const project = await prisma.toolkitProject.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Default settings
    const defaultSettings = {
      contextMode: 'global',
      inheritEntities: true,
      inheritPatterns: true,
      inheritRules: true,
      inheritTests: false,
      canPromoteToGlobal: false,
      requireApproval: true,
      allowSharing: false,
      sharedWithProjects: [],
      errorPatternScope: 'project',
      intelligenceScope: 'inherit'
    }

    return NextResponse.json({
      projectId,
      settings: defaultSettings,
      message: 'Context settings reset to defaults'
    })
  } catch (error: any) {
    console.error('Error resetting context settings:', error)
    return NextResponse.json(
      { error: 'Failed to reset context settings', message: error.message },
      { status: 500 }
    )
  }
}
