import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/organizations
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (id) {
    const item = await prisma.organization.findUnique({ where: { id } });
    return NextResponse.json(item);
  }

  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const where = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  } : {};

  const [items, total] = await Promise.all([
    prisma.organization.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
    prisma.organization.count({ where })
  ]);

  return NextResponse.json({ items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

// POST /api/organizations
export async function POST(request: NextRequest) {
  const body = await request.json();
  const item = await prisma.organization.create({ data: body });
  return NextResponse.json(item, { status: 201 });
}

// PUT /api/organizations
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...data } = body;
  const item = await prisma.organization.update({ where: { id }, data });
  return NextResponse.json(item);
}

// DELETE /api/organizations
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  await prisma.organization.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
