// =============================================================================
// Buildings API Route
// Organization Building Module - Building CRUD Operations
// Project ID: cmmtztnf90000p680l9xcj0ol
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  CreateBuildingSchema,
  QueryBuildingSchema,
  validateWithZod,
} from '@/lib/validations/organization-building'

// =============================================================================
// GET /api/project/[id]/organization-building/buildings
// List all buildings with pagination, search, and sorting
// =============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryParams = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '10',
      sortBy: searchParams.get('sortBy') || 'buildingName',
      sortOrder: searchParams.get('sortOrder') || 'asc',
    }

    const validation = validateWithZod(QueryBuildingSchema, queryParams)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.errors },
        { status: 400 }
      )
    }

    const { search, status, page, pageSize, sortBy, sortOrder } = validation.data!

    // Build where clause
    const where: any = {
      projectId,
    }

    if (search) {
      where.OR = [
        { buildingName: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (status !== undefined) {
      where.status = status
    }

    // Get total count
    const totalCount = await db.toolkitTable.count({
      where: {
        projectId,
        tableName: { contains: 'Building' },
      },
    })

    // For now, we'll use ToolkitTable to store building data as JSON
    // In production, you would use the actual OrganizationBuilding table
    const buildings = await db.toolkitTable.findMany({
      where: {
        projectId,
        tableName: { contains: 'Building' },
      },
      orderBy: {
        [sortBy === 'buildingName' ? 'tableName' : 'createdAt']: sortOrder,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Transform data
    const transformedBuildings = buildings.map((b) => {
      let columns: any[] = []
      try {
        columns = JSON.parse(b.columns || '[]')
      } catch (e) {
        // ignore
      }

      const buildingNameCol = columns.find((c: any) => c.name === 'buildingName' || c.name === 'BuildingName')
      const descriptionCol = columns.find((c: any) => c.name === 'description' || c.name === 'Description')
      const statusCol = columns.find((c: any) => c.name === 'status' || c.name === 'Status')

      return {
        id: b.id,
        buildingName: buildingNameCol?.value || b.tableName.replace('OrganizationBuilding_', ''),
        description: descriptionCol?.value || null,
        status: statusCol?.value !== false,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }
    })

    return NextResponse.json({
      buildings: transformedBuildings,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    })
  } catch (error: any) {
    console.error('Error fetching buildings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch buildings', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST /api/project/[id]/organization-building/buildings
// Create a new building
// =============================================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const body = await request.json()

    // Validate input
    const validation = validateWithZod(CreateBuildingSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { buildingName, description, status } = validation.data!

    // Check for duplicate building name within project
    const existingBuilding = await db.toolkitTable.findFirst({
      where: {
        projectId,
        tableName: `OrganizationBuilding_${buildingName}`,
      },
    })

    if (existingBuilding) {
      return NextResponse.json(
        { error: 'Building with this name already exists in the project' },
        { status: 409 }
      )
    }

    // Create building record (using ToolkitTable for storage)
    const building = await db.toolkitTable.create({
      data: {
        projectId,
        tableName: `OrganizationBuilding_${buildingName}`,
        schemaName: 'organization',
        columns: JSON.stringify([
          { name: 'id', type: 'string', primary: true },
          { name: 'buildingName', type: 'string', value: buildingName, required: true, maxLength: 100 },
          { name: 'description', type: 'string', value: description, optional: true, maxLength: 500 },
          { name: 'status', type: 'boolean', value: status, default: true },
          { name: 'createdAt', type: 'DateTime' },
          { name: 'updatedAt', type: 'DateTime' },
          { name: 'createdBy', type: 'string', optional: true },
          { name: 'updatedBy', type: 'string', optional: true },
        ]),
        foreignKeys: '[]',
        indexes: '[]',
        constraints: '[]',
        sourceDDL: null,
        status: 'standalone',
        linkedModule: 'Organization Building',
      },
    })

    return NextResponse.json(
      {
        message: 'Building created successfully',
        building: {
          id: building.id,
          buildingName,
          description,
          status,
          createdAt: building.createdAt,
          updatedAt: building.updatedAt,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating building:', error)
    return NextResponse.json(
      { error: 'Failed to create building', message: error.message },
      { status: 500 }
    )
  }
}
