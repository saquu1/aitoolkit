// =============================================================================
// Organization Building API - Project-scoped Route Handler
// Handles Buildings, Floors, and Rooms CRUD operations within a project context
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// -----------------------------------------------------------------------------
// GET Handler - List entities with filtering
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity'); // buildings, floors, rooms, stats

    // Verify project exists
    const project = await prisma.toolkitProject.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Statistics endpoint
    if (entity === 'stats') {
      const [buildingsCount, floorsCount, roomsCount] = await Promise.all([
        prisma.building.count(),
        prisma.floor.count(),
        prisma.room.count()
      ]);

      const activeBuildings = await prisma.building.count({ where: { isActive: true } });
      const activeFloors = await prisma.floor.count({ where: { isActive: true } });
      const activeRooms = await prisma.room.count({ where: { isActive: true } });

      return NextResponse.json({
        projectId,
        total: { buildings: buildingsCount, floors: floorsCount, rooms: roomsCount },
        active: { buildings: activeBuildings, floors: activeFloors, rooms: activeRooms }
      });
    }

    // Get all buildings
    if (entity === 'buildings') {
      const search = searchParams.get('search');
      const isActive = searchParams.get('isActive');
      
      const whereClause: any = {};
      if (search) {
        whereClause.OR = [
          { name: { contains: search } },
          { code: { contains: search } },
          { description: { contains: search } }
        ];
      }
      if (isActive !== null) {
        whereClause.isActive = isActive === 'true';
      }

      const buildings = await prisma.building.findMany({
        where: whereClause,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { floors: true } }
        }
      });

      return NextResponse.json({ 
        projectId,
        buildings: buildings.map(b => ({
          ...b,
          floorsCount: b._count.floors
        }))
      });
    }

    // Get all floors
    if (entity === 'floors') {
      const buildingId = searchParams.get('buildingId');
      const search = searchParams.get('search');
      const isActive = searchParams.get('isActive');
      
      const whereClause: any = {};
      if (buildingId) whereClause.buildingId = buildingId;
      if (search) {
        whereClause.OR = [
          { name: { contains: search } },
          { code: { contains: search } }
        ];
      }
      if (isActive !== null) {
        whereClause.isActive = isActive === 'true';
      }

      const floors = await prisma.floor.findMany({
        where: whereClause,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          building: { select: { id: true, name: true, code: true } },
          _count: { select: { rooms: true } }
        }
      });

      return NextResponse.json({ 
        projectId,
        floors: floors.map(f => ({
          ...f,
          roomsCount: f._count.rooms
        }))
      });
    }

    // Get all rooms
    if (entity === 'rooms') {
      const floorId = searchParams.get('floorId');
      const buildingId = searchParams.get('buildingId');
      const roomType = searchParams.get('roomType');
      const search = searchParams.get('search');
      const isActive = searchParams.get('isActive');
      
      const whereClause: any = {};
      if (floorId) whereClause.floorId = floorId;
      if (roomType) whereClause.roomType = roomType;
      if (search) {
        whereClause.OR = [
          { name: { contains: search } },
          { code: { contains: search } },
          { roomNumber: { contains: search } }
        ];
      }
      if (isActive !== null) {
        whereClause.isActive = isActive === 'true';
      }
      
      // Filter by building through floor relation
      if (buildingId && !floorId) {
        whereClause.floor = { buildingId };
      }

      const rooms = await prisma.room.findMany({
        where: whereClause,
        include: {
          floor: {
            include: { building: { select: { id: true, name: true, code: true } } }
          }
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
      });

      return NextResponse.json({ projectId, rooms });
    }

    return NextResponse.json({ 
      error: 'Invalid entity. Use: buildings, floors, rooms, or stats' 
    }, { status: 400 });

  } catch (error) {
    console.error('Organization Building API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : undefined
    }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// POST Handler - Create entities
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { entity, data } = body;

    // Verify project exists
    const project = await prisma.toolkitProject.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create Building
    if (entity === 'building') {
      const building = await prisma.building.create({
        data: {
          name: data.name,
          description: data.description,
          code: data.code,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          postalCode: data.postalCode,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder ?? 0,
        }
      });
      return NextResponse.json({ success: true, building });
    }

    // Create Floor
    if (entity === 'floor') {
      // Verify building exists
      const building = await prisma.building.findUnique({
        where: { id: data.buildingId }
      });
      if (!building) {
        return NextResponse.json({ error: 'Building not found' }, { status: 404 });
      }

      const floor = await prisma.floor.create({
        data: {
          buildingId: data.buildingId,
          name: data.name,
          description: data.description,
          code: data.code,
          floorNumber: data.floorNumber,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder ?? 1,
        }
      });
      return NextResponse.json({ success: true, floor });
    }

    // Create Room
    if (entity === 'room') {
      // Verify floor exists
      const floor = await prisma.floor.findUnique({
        where: { id: data.floorId }
      });
      if (!floor) {
        return NextResponse.json({ error: 'Floor not found' }, { status: 404 });
      }

      const room = await prisma.room.create({
        data: {
          floorId: data.floorId,
          name: data.name,
          description: data.description,
          code: data.code,
          roomNumber: data.roomNumber,
          roomType: data.roomType,
          capacity: data.capacity,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder ?? 1,
        },
        include: {
          floor: {
            include: { building: { select: { id: true, name: true } } }
          }
        }
      });
      return NextResponse.json({ success: true, room });
    }

    return NextResponse.json({ 
      error: 'Invalid entity. Use: building, floor, or room' 
    }, { status: 400 });

  } catch (error) {
    console.error('Organization Building POST error:', error);
    return NextResponse.json({ 
      error: 'Failed to create entity',
      details: error instanceof Error ? error.message : undefined
    }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// PUT Handler - Update entities
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { entity, id, data } = body;

    // Verify project exists
    const project = await prisma.toolkitProject.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Update Building
    if (entity === 'building') {
      const building = await prisma.building.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          code: data.code,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          postalCode: data.postalCode,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
        }
      });
      return NextResponse.json({ success: true, building });
    }

    // Update Floor
    if (entity === 'floor') {
      const floor = await prisma.floor.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          code: data.code,
          floorNumber: data.floorNumber,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
        }
      });
      return NextResponse.json({ success: true, floor });
    }

    // Update Room
    if (entity === 'room') {
      const room = await prisma.room.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          code: data.code,
          roomNumber: data.roomNumber,
          roomType: data.roomType,
          capacity: data.capacity,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
        },
        include: {
          floor: {
            include: { building: { select: { id: true, name: true } } }
          }
        }
      });
      return NextResponse.json({ success: true, room });
    }

    return NextResponse.json({ 
      error: 'Invalid entity. Use: building, floor, or room' 
    }, { status: 400 });

  } catch (error) {
    console.error('Organization Building PUT error:', error);
    return NextResponse.json({ 
      error: 'Failed to update entity',
      details: error instanceof Error ? error.message : undefined
    }, { status: 500 });
  }
}

// -----------------------------------------------------------------------------
// DELETE Handler - Delete entities
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const id = searchParams.get('id');

    if (!entity || !id) {
      return NextResponse.json({ 
        error: 'Entity and id are required' 
      }, { status: 400 });
    }

    // Verify project exists
    const project = await prisma.toolkitProject.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete Building (cascade deletes floors and rooms)
    if (entity === 'building') {
      // Get counts before deletion for warning
      const floorsCount = await prisma.floor.count({ where: { buildingId: id } });
      const roomsCount = await prisma.room.count({
        where: { floor: { buildingId: id } }
      });

      await prisma.building.delete({ where: { id } });

      return NextResponse.json({ 
        success: true, 
        deleted: { building: 1, floors: floorsCount, rooms: roomsCount }
      });
    }

    // Delete Floor (cascade deletes rooms)
    if (entity === 'floor') {
      const roomsCount = await prisma.room.count({ where: { floorId: id } });

      await prisma.floor.delete({ where: { id } });

      return NextResponse.json({ 
        success: true, 
        deleted: { floor: 1, rooms: roomsCount }
      });
    }

    // Delete Room
    if (entity === 'room') {
      await prisma.room.delete({ where: { id } });
      return NextResponse.json({ success: true, deleted: { room: 1 } });
    }

    return NextResponse.json({ 
      error: 'Invalid entity. Use: building, floor, or room' 
    }, { status: 400 });

  } catch (error) {
    console.error('Organization Building DELETE error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete entity',
      details: error instanceof Error ? error.message : undefined
    }, { status: 500 });
  }
}
