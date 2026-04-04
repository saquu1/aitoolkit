import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'




const DEMO_USER_ID = 'demo-user-1'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this company
    const membership = await prisma.userCompany.findFirst({
      where: {
        userId: DEMO_USER_ID,
        companyId,
        status: 'active',
      },
      include: {
        Company: {
          include: {
            Workspace: true,
            Project: true,
          }
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied to this company' },
        { status: 403 }
      )
    }

    const company = membership.Company

    return NextResponse.json({
      company: {
        ...company,
        settings: JSON.parse(company.settings || '{}'),
        limits: JSON.parse(company.limits || '{}'),
        usage: JSON.parse(company.usage || '{}'),
      },
      workspaces: company.Workspace.map((w: any) => ({
        ...w,
        settings: JSON.parse(w.settings || '{}'),
      })),
      projects: company.Project.map((p: any) => ({
        ...p,
        settings: JSON.parse(p.settings || '{}'),
        statistics: JSON.parse(p.statistics || '{}'),
      })),
      role: membership.role,
    })

  } catch (error) {
    console.error('Error switching company:', error)
    return NextResponse.json(
      { error: 'Failed to switch company' },
      { status: 500 }
    )
  }
}
