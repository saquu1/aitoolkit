import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

import { DEFAULT_LIMITS, DEFAULT_COMPANY_SETTINGS } from '@/lib/tenant-types'



const DEMO_USER_ID = 'demo-user-1'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, slug, subscriptionTier = 'free' } = body

    // Generate slug from name if not provided
    const companySlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Check if slug already exists
    const existing = await prisma.company.findUnique({
      where: { slug: companySlug }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Company with this name already exists' },
        { status: 400 }
      )
    }

    // Create company
    const company = await prisma.company.create({
      data: {
        name,
        slug: companySlug,
        subscriptionTier,
        subscriptionStatus: 'active',
        settings: JSON.stringify(DEFAULT_COMPANY_SETTINGS),
        limits: JSON.stringify(DEFAULT_LIMITS[subscriptionTier as keyof typeof DEFAULT_LIMITS] || DEFAULT_LIMITS.free),
        usage: JSON.stringify({}),
      }
    })

    // Create user-company relation (owner)
    await prisma.userCompany.create({
      data: {
        userId: DEMO_USER_ID,
        companyId: company.id,
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
      }
    })

    return NextResponse.json({
      ...company,
      settings: JSON.parse(company.settings),
      limits: JSON.parse(company.limits),
      usage: JSON.parse(company.usage),
    })

  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    )
  }
}
