// =============================================================================
// Floors API Route
// Organization Building Module - Floor CRUD Operations
// Project ID: cmmtztnf90000p680l9xcj0ol
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  CreateFloorSchema,
  QueryFloorSchema,
  validateWithZod,
} from '@/lib/validations/organization-building'

// =============================================================================
// GET /api/project/[id]/organization-building/floors
// List all floors with pagination, search, and filtering by building
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
      buildingId: searchParams.get('buildingId') || undefined,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '10',
      sortBy: searchParams.get('sortBy') || 'floorName',
      sortOrder: searchParams.get('sortOrder') || 'asc',
    }

    const validation = validateWithZod(QueryFloorSchema, queryParams)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.errors },
        { status: 400 }
      )
    }

    const { buildingId, search, status, page, pageSize, sortBy, sortOrder } = validation.data!

    // Build where clause for floors
    const where: any = {
      projectId,
      tableName: { contains: 'OrganizationFloor_' },
    }

    if (buildingId) {
      where.columns = { contains: buildingId }
    }

    if (search) {
      where.OR = [
        { tableName: { contains: search } },
        { columns: { contains: search } },
      ]
    }

    // Get total count
    const totalCount = await db.toolkitTable.count({ where })

    // Get floors
    const floors = await db.toolkitTable.findMany({
      where,
      orderBy: {
        [sortBy === 'floorName' ? 'tableName' : 'createdAt']: sortOrder,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Transform data and fetch building names
    const transformedFloors = await Promise.all(
      floors.map(async (f) => {
        let columns: any[] = []
        try {
          columns = JSON.parse(f.columns || '[]')
        } catch (e) {
          // ignore
        }

        const floorNameCol = columns.find((c: any) => c.name === 'floorName' || c.name === 'FloorName')
        const descriptionCol = columns.find((c: any) => c.name === 'description' || c.name === 'Description')
        const statusCol = columns.find((c: any) => c.name === 'status' || c.name === 'Status')
        const buildingIdCol = columns.find((c: any) => c.name === 'buildingId')

        // Get building name
        let buildingName = null
        if (buildingIdCol?.value) {
          const building = await db.toolkitTable.findFirst({
            where: { id: buildingIdCol.value },
          })
          if (building) {
            let bColumns: any[] = []
            try {
              bColumns = JSON.parse(building.columns || '[]')
            } catch (e) {
              // ignore
            }
            const bNameCol = bColumns.find((c: any) => c.name === 'buildingName')
            buildingName = bNameCol?.value
          }
        }

        return {
          id: f.id,
          floorName: floorNameCol?.value || f.tableName.replace('OrganizationFloor_', ''),
          description: descriptionCol?.value || null,
          status: statusCol?.value !== false,
          buildingId: buildingIdCol?.value || null,
          buildingName,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        }
      })
    )

    return NextResponse.json({
      floors: transformedFloors,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    })
  } catch (error: any) {
    console.error('Error fetching floors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch floors', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST /api/project/[id]/organization-building/floors
// Create a new floor
// =============================================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const body = await request.json()

    // Validate input
    const validation = validateWithZod(CreateFloorSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { buildingId, floorName, description, status } = validation.data!

    // Verify building exists
    const building = await db.toolkitTable.findFirst({
      where: {
        id: buildingId,
        projectId,
        tableName: { contains: 'OrganizationBuilding' },
      },
    })

    if (!building) {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      )
    }

    // Check for duplicate floor name within building
    const existingFloor = await db.toolkitTable.findFirst({
      where: {
        projectId,
        tableName: `OrganizationFloor_${floorName}`,
        columns: { contains: buildingId },
      },
    })

    if (existingFloor) {
      return NextResponse.json(
        { error: 'Floor with this name already exists in the building' },
        { status: 409 }
      )
    }

    // Create floor record
    const floor = await db.toolkitTable.create({
      data: {
        projectId,
        tableName: `OrganizationFloor_${floorName}`,
        schemaName: 'organization',
        columns: JSON.stringify([
          { name: 'id', type: 'string', primary: true },
          { name: 'buildingId', type: 'string', value: buildingId, required: true, fk: 'OrganizationBuilding.id' },
          { name: 'floorName', type: 'string', value: floorName, required: true, maxLength: 100 },
          { name: 'description', type: 'string', value: description, optional: true, maxLength: 500 },
          { name: 'status', type: 'boolean', value: status, default: true },
          { name: 'createdAt', type: 'DateTime' },
          { name: 'updatedAt', type: 'DateTime' },
          { name: 'createdBy', type: 'string', optional: true },
          { name: 'updatedBy', type: 'string', optional: true },
        ]),
        foreignKeys: JSON.stringify([
          { columns: ['buildingId'], references: 'OrganizationBuilding', referencedColumns: ['id'] },
        ]),
        indexes: '[]',
        constraints: '[]',
        sourceDDL: null,
        status: 'standalone',
        linkedModule: 'Organization Building',
      },
    })

    // Get building name for response
    let buildingColumns: any[] = []
    try {
      buildingColumns = JSON.parse(building.columns || '[]')
    } catch (e) {
      // ignore
    }
    const buildingNameCol = buildingColumns.find((c: any) => c.name === 'buildingName')

    return NextResponse.json(
      {
        message: 'Floor created successfully',
        floor: {
          id: floor.id,
          buildingId,
          buildingName: buildingNameCol?.value,
          floorName,
          description,
          status,
          createdAt: floor.createdAt,
          updatedAt: floor.updatedAt,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating floor:', error)
    return NextResponse.json(
      { error: 'Failed to create floor', message: error.message },
      { status: 500 }
    )
  }
}
