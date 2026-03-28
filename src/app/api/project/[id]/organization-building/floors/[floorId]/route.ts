// =============================================================================
// Floor Detail API Route
// Organization Building Module - Floor GET/PUT/DELETE Operations
// Project ID: cmmtztnf90000p680l9xcj0ol
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { UpdateFloorSchema, validateWithZod } from '@/lib/validations/organization-building'

// =============================================================================
// GET /api/project/[id]/organization-building/floors/[floorId]
// Get a single floor by ID
// =============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; floorId: string } }
) {
  try {
    const { id: projectId, floorId } = params

    const floor = await db.toolkitTable.findFirst({
      where: {
        id: floorId,
        projectId,
        tableName: { contains: 'OrganizationFloor' },
      },
    })

    if (!floor) {
      return NextResponse.json({ error: 'Floor not found' }, { status: 404 })
    }

    // Parse columns to extract floor data
    let columns: any[] = []
    try {
      columns = JSON.parse(floor.columns || '[]')
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

    // Get rooms count
    const roomsCount = await db.toolkitTable.count({
      where: {
        projectId,
        tableName: { contains: 'OrganizationRoom_' },
        columns: { contains: floor.id },
      },
    })

    return NextResponse.json({
      floor: {
        id: floor.id,
        floorName: floorNameCol?.value || floor.tableName.replace('OrganizationFloor_', ''),
        description: descriptionCol?.value || null,
        status: statusCol?.value !== false,
        buildingId: buildingIdCol?.value || null,
        buildingName,
        roomsCount,
        createdAt: floor.createdAt,
        updatedAt: floor.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('Error fetching floor:', error)
    return NextResponse.json(
      { error: 'Failed to fetch floor', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT /api/project/[id]/organization-building/floors/[floorId]
// Update a floor
// =============================================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; floorId: string } }
) {
  try {
    const { id: projectId, floorId } = params
    const body = await request.json()

    // Validate input
    const validation = validateWithZod(UpdateFloorSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const updateData = validation.data!

    // Check if floor exists
    const existingFloor = await db.toolkitTable.findFirst({
      where: {
        id: floorId,
        projectId,
        tableName: { contains: 'OrganizationFloor' },
      },
    })

    if (!existingFloor) {
      return NextResponse.json({ error: 'Floor not found' }, { status: 404 })
    }

    // If buildingId is being changed, verify the new building exists
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

    // Parse existing columns
    let columns: any[] = []
    try {
      columns = JSON.parse(existingFloor.columns || '[]')
    } catch (e) {
      // ignore
    }

    // Update column values
    if (updateData.buildingId !== undefined) {
      const buildingIdCol = columns.find((c: any) => c.name === 'buildingId')
      if (buildingIdCol) buildingIdCol.value = updateData.buildingId
    }

    if (updateData.floorName !== undefined) {
      const nameCol = columns.find((c: any) => c.name === 'floorName')
      if (nameCol) nameCol.value = updateData.floorName
    }

    if (updateData.description !== undefined) {
      const descCol = columns.find((c: any) => c.name === 'description')
      if (descCol) descCol.value = updateData.description
    }

    if (updateData.status !== undefined) {
      const statusCol = columns.find((c: any) => c.name === 'status')
      if (statusCol) statusCol.value = updateData.status
    }

    // Update floor record
    const updatedFloor = await db.toolkitTable.update({
      where: { id: floorId },
      data: {
        tableName: updateData.floorName
          ? `OrganizationFloor_${updateData.floorName}`
          : existingFloor.tableName,
        columns: JSON.stringify(columns),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      message: 'Floor updated successfully',
      floor: {
        id: updatedFloor.id,
        buildingId: updateData.buildingId,
        floorName: updateData.floorName,
        description: updateData.description,
        status: updateData.status,
        updatedAt: updatedFloor.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('Error updating floor:', error)
    return NextResponse.json(
      { error: 'Failed to update floor', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE /api/project/[id]/organization-building/floors/[floorId]
// Delete a floor (cascades to rooms)
// =============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; floorId: string } }
) {
  try {
    const { id: projectId, floorId } = params

    // Check if floor exists
    const existingFloor = await db.toolkitTable.findFirst({
      where: {
        id: floorId,
        projectId,
        tableName: { contains: 'OrganizationFloor' },
      },
    })

    if (!existingFloor) {
      return NextResponse.json({ error: 'Floor not found' }, { status: 404 })
    }

    // Delete related rooms first
    await db.toolkitTable.deleteMany({
      where: {
        projectId,
        tableName: { contains: 'OrganizationRoom_' },
        columns: { contains: floorId },
      },
    })

    // Delete the floor
    await db.toolkitTable.delete({
      where: { id: floorId },
    })

    return NextResponse.json({
      message: 'Floor and all related rooms deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting floor:', error)
    return NextResponse.json(
      { error: 'Failed to delete floor', message: error.message },
      { status: 500 }
    )
  }
}
