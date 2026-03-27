import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

import { DEFAULT_PROJECT_SETTINGS, DEFAULT_PROJECT_STATISTICS } from '@/lib/tenant-types'



const DEMO_USER_ID = 'demo-user-1'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const companyId = searchParams.get('companyId')

    const where: any = {}
    if (workspaceId) where.workspaceId = workspaceId
    if (companyId) where.companyId = companyId

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      projects: projects.map((p: any) => ({
        ...p,
        settings: JSON.parse(p.settings || '{}'),
        statistics: JSON.parse(p.statistics || '{}'),
      }))
    })

  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      description, 
      companyId, 
      workspaceId,
      softwareType = 'Custom' 
    } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Check for duplicate slug in company
    const existing = await prisma.project.findFirst({
      where: { companyId, slug }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Project with this name already exists in this company' },
        { status: 400 }
      )
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        companyId,
        workspaceId: workspaceId || null,
        name,
        slug,
        description,
        softwareType,
        status: 'planning',
        settings: JSON.stringify(DEFAULT_PROJECT_SETTINGS),
        statistics: JSON.stringify(DEFAULT_PROJECT_STATISTICS),
        createdBy: DEMO_USER_ID,
      }
    })

    // Create user-project relation (manager by default for creator)
    await prisma.userProject.create({
      data: {
        userId: DEMO_USER_ID,
        projectId: project.id,
        role: 'manager',
        status: 'active',
      }
    })

    return NextResponse.json({
      ...project,
      settings: JSON.parse(project.settings),
      statistics: JSON.parse(project.statistics),
    })

  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
