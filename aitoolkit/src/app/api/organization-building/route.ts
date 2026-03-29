import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// =============================================================================
// Organization Building API - Unified Route Handler
// Handles Buildings, Floors, and Rooms CRUD operations
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity'); // buildings, floors, rooms
    const id = searchParams.get('id');
    const buildingId = searchParams.get('buildingId');
    const floorId = searchParams.get('floorId');

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
        total: { buildings: buildingsCount, floors: floorsCount, rooms: roomsCount },
        active: { buildings: activeBuildings, floors: activeFloors, rooms: activeRooms }
      });
    }

    // Get all buildings
    if (entity === 'buildings' && !id) {
      const buildings = await prisma.building.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
      });
      return NextResponse.json({ buildings });
    }

    // Get single building with stats
    if (entity === 'buildings' && id) {
      const building = await prisma.building.findUnique({ where: { id } });
      if (!building) {
        return NextResponse.json({ error: 'Building not found' }, { status: 404 });
      }
      const floorsCount = await prisma.floor.count({ where: { buildingId: id } });
      return NextResponse.json({ building, floorsCount });
    }

    // Get all floors
    if (entity === 'floors' && !id) {
      const whereClause: any = {};
      if (buildingId) whereClause.buildingId = buildingId;
      
      const floors = await prisma.floor.findMany({
        where: whereClause,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
      });
      return NextResponse.json({ floors });
    }

    // Get single floor with rooms count
    if (entity === 'floors' && id) {
      const floor = await prisma.floor.findUnique({ where: { id } });
      if (!floor) {
        return NextResponse.json({ error: 'Floor not found' }, { status: 404 });
      }
      const roomsCount = await prisma.room.count({ where: { floorId: id } });
      return NextResponse.json({ floor, roomsCount });
    }

    // Get all rooms
    if (entity === 'rooms' && !id) {
      const whereClause: any = {};
      if (floorId) whereClause.floorId = floorId;
      
      const rooms = await prisma.room.findMany({
        where: whereClause,
        include: {
          floor: {
            include: { building: true }
          }
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
      });
      return NextResponse.json({ rooms });
    }

    // Get single room
    if (entity === 'rooms' && id) {
      const room = await prisma.room.findUnique({
        where: { id },
        include: {
          floor: {
            include: { building: true }
          }
        }
      });
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
      return NextResponse.json({ room });
    }

    return NextResponse.json({ error: 'Invalid entity' }, { status: 400 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const data = await request.json();

    // Create building
    if (entity === 'buildings') {
      const building = await prisma.building.create({
        data: {
          name: data.name,
          description: data.description || null,
          code: data.code || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          postalCode: data.postalCode || null,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder || 0
        }
      });
      return NextResponse.json({ building, message: 'Building created successfully' });
    }

    // Create floor
    if (entity === 'floors') {
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
          description: data.description || null,
          code: data.code || null,
          floorNumber: data.floorNumber || null,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder || 1
        }
      });
      return NextResponse.json({ floor, message: 'Floor created successfully' });
    }

    // Create room
    if (entity === 'rooms') {
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
          description: data.description || null,
          code: data.code || null,
          roomNumber: data.roomNumber || null,
          capacity: data.capacity || null,
          roomType: data.roomType || null,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder || 1
        }
      });
      return NextResponse.json({ room, message: 'Room created successfully' });
    }

    return NextResponse.json({ error: 'Invalid entity' }, { status: 400 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Failed to create data' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const id = searchParams.get('id');
    const data = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Update building
    if (entity === 'buildings') {
      const building = await prisma.building.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description || null,
          code: data.code || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          postalCode: data.postalCode || null,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder || 1
        }
      });
      return NextResponse.json({ building, message: 'Building updated successfully' });
    }

    // Update floor
    if (entity === 'floors') {
      const floor = await prisma.floor.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description || null,
          code: data.code || null,
          floorNumber: data.floorNumber || null,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder || 1
        }
      });
      return NextResponse.json({ floor, message: 'Floor updated successfully' });
    }

    // Update room
    if (entity === 'rooms') {
      const room = await prisma.room.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description || null,
          code: data.code || null,
          roomNumber: data.roomNumber || null,
          capacity: data.capacity || null,
          roomType: data.roomType || null,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder || 1
        }
      });
      return NextResponse.json({ room, message: 'Room updated successfully' });
    }

    return NextResponse.json({ error: 'Invalid entity' }, { status: 400 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Delete building
    if (entity === 'buildings') {
      const floorsCount = await prisma.floor.count({ where: { buildingId: id } });
      if (floorsCount > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete building. It has associated floors.' 
        }, { status: 400 });
      }
      await prisma.building.delete({ where: { id } });
      return NextResponse.json({ message: 'Building deleted successfully' });
    }

    // Delete floor
    if (entity === 'floors') {
      const roomsCount = await prisma.room.count({ where: { floorId: id } });
      if (roomsCount > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete floor. It has associated rooms.' 
        }, { status: 400 });
      }
      await prisma.floor.delete({ where: { id } });
      return NextResponse.json({ message: 'Floor deleted successfully' });
    }

    // Delete room
    if (entity === 'rooms') {
      await prisma.room.delete({ where: { id } });
      return NextResponse.json({ message: 'Room deleted successfully' });
    }

    return NextResponse.json({ error: 'Invalid entity' }, { status: 400 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
  }
}
