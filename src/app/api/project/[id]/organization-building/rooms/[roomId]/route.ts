// =============================================================================
// Room Detail API Route
// Organization Building Module - Room GET/PUT/DELETE Operations
// Project ID: cmmtztnf90000p680l9xcj0ol
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { UpdateRoomSchema, validateWithZod } from '@/lib/validations/organization-building'

// =============================================================================
// GET /api/project/[id]/organization-building/rooms/[roomId]
// Get a single room by ID
// =============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roomId: string } }
) {
  try {
    const { id: projectId, roomId } = params

    const room = await db.toolkitTable.findFirst({
      where: {
        id: roomId,
        projectId,
        tableName: { contains: 'OrganizationRoom' },
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Parse columns to extract room data
    let columns: any[] = []
    try {
      columns = JSON.parse(room.columns || '[]')
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

    return NextResponse.json({
      room: {
        id: room.id,
        roomName: roomNameCol?.value || room.tableName.replace('OrganizationRoom_', ''),
        description: descriptionCol?.value || null,
        status: statusCol?.value !== false,
        buildingId: buildingIdCol?.value || null,
        buildingName,
        floorId: floorIdCol?.value || null,
        floorName,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('Error fetching room:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT /api/project/[id]/organization-building/rooms/[roomId]
// Update a room
// =============================================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; roomId: string } }
) {
  try {
    const { id: projectId, roomId } = params
    const body = await request.json()

    // Validate input
    const validation = validateWithZod(UpdateRoomSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const updateData = validation.data!

    // Check if room exists
    const existingRoom = await db.toolkitTable.findFirst({
      where: {
        id: roomId,
        projectId,
        tableName: { contains: 'OrganizationRoom' },
      },
    })

    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // If buildingId or floorId is being changed, verify the new references
    if (updateData.buildingId) {
      const building = await db.toolkitTable.findFirst({
        where: {
          id: updateData.buildingId,
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
    }

    if (updateData.floorId) {
      const floor = await db.toolkitTable.findFirst({
        where: {
          id: updateData.floorId,
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

      // Verify floor belongs to the building (if buildingId is being changed too)
      let floorColumns: any[] = []
      try {
        floorColumns = JSON.parse(floor.columns || '[]')
      } catch (e) {
        // ignore
      }
      const floorBuildingIdCol = floorColumns.find((c: any) => c.name === 'buildingId')

      // Use the new buildingId if provided, otherwise use the existing one
      let currentColumns: any[] = []
      try {
        currentColumns = JSON.parse(existingRoom.columns || '[]')
      } catch (e) {
        // ignore
      }
      const currentBuildingIdCol = currentColumns.find((c: any) => c.name === 'buildingId')
      const targetBuildingId = updateData.buildingId || currentBuildingIdCol?.value

      if (floorBuildingIdCol?.value !== targetBuildingId) {
        return NextResponse.json(
          { error: 'Floor does not belong to the specified building' },
          { status: 400 }
        )
      }
    }

    // Parse existing columns
    let columns: any[] = []
    try {
      columns = JSON.parse(existingRoom.columns || '[]')
    } catch (e) {
      // ignore
    }

    // Update column values
    if (updateData.buildingId !== undefined) {
      const buildingIdCol = columns.find((c: any) => c.name === 'buildingId')
      if (buildingIdCol) buildingIdCol.value = updateData.buildingId
    }

    if (updateData.floorId !== undefined) {
      const floorIdCol = columns.find((c: any) => c.name === 'floorId')
      if (floorIdCol) floorIdCol.value = updateData.floorId
    }

    if (updateData.roomName !== undefined) {
      const nameCol = columns.find((c: any) => c.name === 'roomName')
      if (nameCol) nameCol.value = updateData.roomName
    }

    if (updateData.description !== undefined) {
      const descCol = columns.find((c: any) => c.name === 'description')
      if (descCol) descCol.value = updateData.description
    }

    if (updateData.status !== undefined) {
      const statusCol = columns.find((c: any) => c.name === 'status')
      if (statusCol) statusCol.value = updateData.status
    }

    // Update room record
    const updatedRoom = await db.toolkitTable.update({
      where: { id: roomId },
      data: {
        tableName: updateData.roomName
          ? `OrganizationRoom_${updateData.roomName}`
          : existingRoom.tableName,
        columns: JSON.stringify(columns),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      message: 'Room updated successfully',
      room: {
        id: updatedRoom.id,
        buildingId: updateData.buildingId,
        floorId: updateData.floorId,
        roomName: updateData.roomName,
        description: updateData.description,
        status: updateData.status,
        updatedAt: updatedRoom.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('Error updating room:', error)
    return NextResponse.json(
      { error: 'Failed to update room', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE /api/project/[id]/organization-building/rooms/[roomId]
// Delete a room
// =============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; roomId: string } }
) {
  try {
    const { id: projectId, roomId } = params

    // Check if room exists
    const existingRoom = await db.toolkitTable.findFirst({
      where: {
        id: roomId,
        projectId,
        tableName: { contains: 'OrganizationRoom' },
      },
    })

    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Delete the room
    await db.toolkitTable.delete({
      where: { id: roomId },
    })

    return NextResponse.json({
      message: 'Room deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting room:', error)
    return NextResponse.json(
      { error: 'Failed to delete room', message: error.message },
      { status: 500 }
    )
  }
}
