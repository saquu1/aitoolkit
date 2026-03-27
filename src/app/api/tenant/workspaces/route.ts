import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'




export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, companyId } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Check for duplicate slug in company
    const existing = await prisma.workspace.findFirst({
      where: { companyId, slug }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Workspace with this name already exists' },
        { status: 400 }
      )
    }

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        companyId,
        name,
        slug,
        description,
        settings: JSON.stringify({}),
      }
    })

    return NextResponse.json({
      ...workspace,
      settings: JSON.parse(workspace.settings),
    })

  } catch (error) {
    console.error('Error creating workspace:', error)
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const workspaces = await prisma.workspace.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      workspaces: workspaces.map((w: any) => ({
        ...w,
        settings: JSON.parse(w.settings || '{}'),
      }))
    })

  } catch (error) {
    console.error('Error fetching workspaces:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    )
  }
}
