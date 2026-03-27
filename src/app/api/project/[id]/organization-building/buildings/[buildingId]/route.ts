// =============================================================================
// Building Detail API Route
// Organization Building Module - Building GET/PUT/DELETE Operations
// Project ID: cmmtztnf90000p680l9xcj0ol
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { UpdateBuildingSchema, validateWithZod } from '@/lib/validations/organization-building'

// =============================================================================
// GET /api/project/[id]/organization-building/buildings/[buildingId]
// Get a single building by ID
// =============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; buildingId: string } }
) {
  try {
    const { id: projectId, buildingId } = params

    const building = await db.toolkitTable.findFirst({
      where: {
        id: buildingId,
        projectId,
      },
    })

    if (!building) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 })
    }

    // Parse columns to extract building data
    let columns: any[] = []
    try {
      columns = JSON.parse(building.columns || '[]')
    } catch (e) {
      // ignore
    }

    const buildingNameCol = columns.find((c: any) => c.name === 'buildingName' || c.name === 'BuildingName')
    const descriptionCol = columns.find((c: any) => c.name === 'description' || c.name === 'Description')
    const statusCol = columns.find((c: any) => c.name === 'status' || c.name === 'Status')

    // Get related floors count
    const floorsCount = await db.toolkitTable.count({
      where: {
        projectId,
        tableName: { contains: 'OrganizationFloor_' },
        columns: { contains: building.id },
      },
    })

    return NextResponse.json({
      building: {
        id: building.id,
        buildingName: buildingNameCol?.value || building.tableName.replace('OrganizationBuilding_', ''),
        description: descriptionCol?.value || null,
        status: statusCol?.value !== false,
        floorsCount,
        createdAt: building.createdAt,
        updatedAt: building.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('Error fetching building:', error)
    return NextResponse.json(
      { error: 'Failed to fetch building', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT /api/project/[id]/organization-building/buildings/[buildingId]
// Update a building
// =============================================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; buildingId: string } }
) {
  try {
    const { id: projectId, buildingId } = params
    const body = await request.json()

    // Validate input
    const validation = validateWithZod(UpdateBuildingSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const updateData = validation.data!

    // Check if building exists
    const existingBuilding = await db.toolkitTable.findFirst({
      where: {
        id: buildingId,
        projectId,
      },
    })

    if (!existingBuilding) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 })
    }

    // Parse existing columns
    let columns: any[] = []
    try {
      columns = JSON.parse(existingBuilding.columns || '[]')
    } catch (e) {
      // ignore
    }

    // Update column values
    if (updateData.buildingName !== undefined) {
      const nameCol = columns.find((c: any) => c.name === 'buildingName')
      if (nameCol) nameCol.value = updateData.buildingName
    }

    if (updateData.description !== undefined) {
      const descCol = columns.find((c: any) => c.name === 'description')
      if (descCol) descCol.value = updateData.description
    }

    if (updateData.status !== undefined) {
      const statusCol = columns.find((c: any) => c.name === 'status')
      if (statusCol) statusCol.value = updateData.status
    }

    // Update building record
    const updatedBuilding = await db.toolkitTable.update({
      where: { id: buildingId },
      data: {
        tableName: updateData.buildingName
          ? `OrganizationBuilding_${updateData.buildingName}`
          : existingBuilding.tableName,
        columns: JSON.stringify(columns),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      message: 'Building updated successfully',
      building: {
        id: updatedBuilding.id,
        buildingName: updateData.buildingName || columns.find((c: any) => c.name === 'buildingName')?.value,
        description: updateData.description,
        status: updateData.status,
        updatedAt: updatedBuilding.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('Error updating building:', error)
    return NextResponse.json(
      { error: 'Failed to update building', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE /api/project/[id]/organization-building/buildings/[buildingId]
// Delete a building (cascades to floors and rooms)
// =============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; buildingId: string } }
) {
  try {
    const { id: projectId, buildingId } = params

    // Check if building exists
    const existingBuilding = await db.toolkitTable.findFirst({
      where: {
        id: buildingId,
        projectId,
      },
    })

    if (!existingBuilding) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 })
    }

    // Delete related floors and rooms (cascade delete)
    // First delete rooms
    await db.toolkitTable.deleteMany({
      where: {
        projectId,
        tableName: { contains: 'OrganizationRoom_' },
        columns: { contains: buildingId },
      },
    })

    // Then delete floors
    await db.toolkitTable.deleteMany({
      where: {
        projectId,
        tableName: { contains: 'OrganizationFloor_' },
        columns: { contains: buildingId },
      },
    })

    // Finally delete the building
    await db.toolkitTable.delete({
      where: { id: buildingId },
    })

    return NextResponse.json({
      message: 'Building and all related floors and rooms deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting building:', error)
    return NextResponse.json(
      { error: 'Failed to delete building', message: error.message },
      { status: 500 }
    )
  }
}
