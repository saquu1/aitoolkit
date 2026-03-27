// =============================================================================
// Rooms API Route
// Organization Building Module - Room CRUD Operations
// Project ID: cmmtztnf90000p680l9xcj0ol
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  CreateRoomSchema,
  QueryRoomSchema,
  validateWithZod,
} from '@/lib/validations/organization-building'

// =============================================================================
// GET /api/project/[id]/organization-building/rooms
// List all rooms with pagination, search, and filtering by building/floor
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
      floorId: searchParams.get('floorId') || undefined,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '10',
      sortBy: searchParams.get('sortBy') || 'roomName',
      sortOrder: searchParams.get('sortOrder') || 'asc',
    }

    const validation = validateWithZod(QueryRoomSchema, queryParams)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.errors },
        { status: 400 }
      )
    }

    const { buildingId, floorId, search, status, page, pageSize, sortBy, sortOrder } = validation.data!

    // Build where clause for rooms
    const where: any = {
      projectId,
      tableName: { contains: 'OrganizationRoom_' },
    }

    if (buildingId) {
      where.columns = { contains: buildingId }
    }

    if (floorId) {
      // If floorId is provided, it takes precedence for filtering
      where.columns = { contains: floorId }
    }

    if (search) {
      where.OR = [
        { tableName: { contains: search } },
        { columns: { contains: search } },
      ]
    }

    // Get total count
    const totalCount = await db.toolkitTable.count({ where })

    // Get rooms
    const rooms = await db.toolkitTable.findMany({
      where,
      orderBy: {
        [sortBy === 'roomName' ? 'tableName' : 'createdAt']: sortOrder,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Transform data and fetch building/floor names
    const transformedRooms = await Promise.all(
      rooms.map(async (r) => {
        let columns: any[] = []
        try {
          columns = JSON.parse(r.columns || '[]')
        } catch (e) {
          // ignore
        }

        const roomNameCol = columns.find((c: any) => c.name === 'roomName' || c.name === 'RoomName')
        const descriptionCol = columns.find((c: any) => c.name === 'description' || c.name === 'Description')
        const statusCol = columns.find((c: any) => c.name === 'status' || c.name === 'Status')
        const buildingIdCol = columns.find((c: any) => c.name === 'buildingId')
        const floorIdCol = columns.find((c: any) => c.name === 'floorId')

        // Get building and floor names
        let buildingName = null
        let floorName = null

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

        if (floorIdCol?.value) {
          const floor = await db.toolkitTable.findFirst({
            where: { id: floorIdCol.value },
          })
          if (floor) {
            let fColumns: any[] = []
            try {
              fColumns = JSON.parse(floor.columns || '[]')
            } catch (e) {
              // ignore
            }
            const fNameCol = fColumns.find((c: any) => c.name === 'floorName')
            floorName = fNameCol?.value
          }
        }

        return {
          id: r.id,
          roomName: roomNameCol?.value || r.tableName.replace('OrganizationRoom_', ''),
          description: descriptionCol?.value || null,
          status: statusCol?.value !== false,
          buildingId: buildingIdCol?.value || null,
          buildingName,
          floorId: floorIdCol?.value || null,
          floorName,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }
      })
    )

    return NextResponse.json({
      rooms: transformedRooms,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    })
  } catch (error: any) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rooms', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST /api/project/[id]/organization-building/rooms
// Create a new room
// =============================================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const body = await request.json()

    // Validate input
    const validation = validateWithZod(CreateRoomSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { buildingId, floorId, roomName, description, status } = validation.data!

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

    // Verify floor exists and belongs to the building
    const floor = await db.toolkitTable.findFirst({
      where: {
        id: floorId,
        projectId,
        tableName: { contains: 'OrganizationFloor' },
      },
    })

    if (!floor) {
      return NextResponse.json(
        { error: 'Floor not found' },
        { status: 404 }
      )
    }

    // Verify floor belongs to the specified building
    let floorColumns: any[] = []
    try {
      floorColumns = JSON.parse(floor.columns || '[]')
    } catch (e) {
      // ignore
    }
    const floorBuildingIdCol = floorColumns.find((c: any) => c.name === 'buildingId')

    if (floorBuildingIdCol?.value !== buildingId) {
      return NextResponse.json(
        { error: 'Floor does not belong to the specified building' },
        { status: 400 }
      )
    }

    // Check for duplicate room name within floor
    const existingRoom = await db.toolkitTable.findFirst({
      where: {
        projectId,
        tableName: `OrganizationRoom_${roomName}`,
        columns: { contains: floorId },
      },
    })

    if (existingRoom) {
      return NextResponse.json(
        { error: 'Room with this name already exists in the floor' },
        { status: 409 }
      )
    }

    // Create room record
    const room = await db.toolkitTable.create({
      data: {
        projectId,
        tableName: `OrganizationRoom_${roomName}`,
        schemaName: 'organization',
        columns: JSON.stringify([
          { name: 'id', type: 'string', primary: true },
          { name: 'buildingId', type: 'string', value: buildingId, required: true, fk: 'OrganizationBuilding.id' },
          { name: 'floorId', type: 'string', value: floorId, required: true, fk: 'OrganizationFloor.id' },
          { name: 'roomName', type: 'string', value: roomName, required: true, maxLength: 100 },
          { name: 'description', type: 'string', value: description, optional: true, maxLength: 500 },
          { name: 'status', type: 'boolean', value: status, default: true },
          { name: 'createdAt', type: 'DateTime' },
          { name: 'updatedAt', type: 'DateTime' },
          { name: 'createdBy', type: 'string', optional: true },
          { name: 'updatedBy', type: 'string', optional: true },
        ]),
        foreignKeys: JSON.stringify([
          { columns: ['buildingId'], references: 'OrganizationBuilding', referencedColumns: ['id'] },
          { columns: ['floorId'], references: 'OrganizationFloor', referencedColumns: ['id'] },
        ]),
        indexes: '[]',
        constraints: '[]',
        sourceDDL: null,
        status: 'standalone',
        linkedModule: 'Organization Building',
      },
    })

    // Get building and floor names for response
    let buildingColumns: any[] = []
    try {
      buildingColumns = JSON.parse(building.columns || '[]')
    } catch (e) {
      // ignore
    }
    const buildingNameCol = buildingColumns.find((c: any) => c.name === 'buildingName')

    const floorNameCol = floorColumns.find((c: any) => c.name === 'floorName')

    return NextResponse.json(
      {
        message: 'Room created successfully',
        room: {
          id: room.id,
          buildingId,
          buildingName: buildingNameCol?.value,
          floorId,
          floorName: floorNameCol?.value,
          roomName,
          description,
          status,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating room:', error)
    return NextResponse.json(
      { error: 'Failed to create room', message: error.message },
      { status: 500 }
    )
  }
}
