import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

import { DEFAULT_LIMITS, DEFAULT_COMPANY_SETTINGS, Company, Workspace, Project } from '@/lib/tenant-types'



// Mock user ID for demo (in real app, get from session/JWT)
const DEMO_USER_ID = 'demo-user-1'

export async function GET(request: NextRequest) {
  try {
    // Get user's companies with memberships
    const userCompanies = await prisma.userCompany.findMany({
      where: { 
        userId: DEMO_USER_ID,
        status: 'active'
      },
      include: {
        company: {
          include: {
            workspaces: true,
            projects: true,
          }
        }
      }
    })

    if (userCompanies.length === 0) {
      // Create a default company for demo user
      const defaultCompany = await prisma.company.create({
        data: {
          name: 'My Organization',
          slug: 'my-org',
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          settings: JSON.stringify(DEFAULT_COMPANY_SETTINGS),
          limits: JSON.stringify(DEFAULT_LIMITS.free),
          usage: JSON.stringify({}),
        }
      })

      // Create user-company relation
      await prisma.userCompany.create({
        data: {
          userId: DEMO_USER_ID,
          companyId: defaultCompany.id,
          role: 'owner',
          status: 'active',
          joinedAt: new Date(),
        }
      })

      // Refetch
      return GET(request)
    }

    // Get the first company (or last selected)
    const currentMembership = userCompanies[0]
    const company = currentMembership.company

    // Parse JSON fields
    const companyData: Company = {
      ...company,
      settings: JSON.parse(company.settings || '{}'),
      limits: JSON.parse(company.limits || '{}'),
      usage: JSON.parse(company.usage || '{}'),
    }

    // Get workspaces
    const workspaces: Workspace[] = company.workspaces.map((w: any) => ({
      ...w,
      settings: JSON.parse(w.settings || '{}'),
    }))

    // Get projects
    const projects: Project[] = company.projects.map((p: any) => ({
      ...p,
      settings: JSON.parse(p.settings || '{}'),
      statistics: JSON.parse(p.statistics || '{}'),
    }))

    return NextResponse.json({
      companies: userCompanies.map((uc: any) => ({
        ...uc.company,
        settings: JSON.parse(uc.company.settings || '{}'),
        limits: JSON.parse(uc.company.limits || '{}'),
        usage: JSON.parse(uc.company.usage || '{}'),
      })),
      currentCompany: companyData,
      workspaces,
      projects,
      companyRole: currentMembership.role,
    })

  } catch (error) {
    console.error('Error loading tenant context:', error)
    return NextResponse.json(
      { error: 'Failed to load tenant context' },
      { status: 500 }
    )
  }
}
