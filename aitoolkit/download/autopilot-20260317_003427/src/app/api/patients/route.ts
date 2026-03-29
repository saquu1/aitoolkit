// =============================================================================
// Generated API Route - Patients
// =============================================================================
// Source: SQL DDL + SP Intelligence
// Generated: 2024-01-15
// 
// SP Intelligence Applied:
// - Validation rules from sp_Patient_Create
// - Soft delete pattern from sp_Patient_Delete
// - Pagination from sp_Patient_Search
// - Dropdown pattern from sp_Patient_Dropdown
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// =============================================================================
// Validation Schemas (from SP Intelligence)
// =============================================================================

const PatientCreateSchema = z.object({
  mrn: z.string()
    .min(3, 'MRN must be at least 3 characters')
    .max(20, 'MRN cannot exceed 20 characters')
    .regex(/^[A-Z0-9]+$/, 'MRN must contain only uppercase letters and numbers'),
  firstName: z.string()
    .min(1, 'First Name is required')
    .max(100, 'First Name cannot exceed 100 characters'),
  lastName: z.string()
    .min(1, 'Last Name is required')
    .max(100, 'Last Name cannot exceed 100 characters'),
  dateOfBirth: z.coerce.date()
    .refine(d => d <= new Date(), 'Date of Birth cannot be in the future')
    .refine(d => {
      const age = new Date().getFullYear() - d.getFullYear();
      return age <= 150;
    }, 'Invalid Date of Birth'),
  gender: z.enum(['M', 'F', 'O'], { message: 'Gender must be M, F, or O' }),
  phone: z.string().max(20).optional(),
  email: z.string().email('Invalid email format').max(100).optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
  branchId: z.string().uuid('Invalid Branch selected'),
});

const PatientUpdateSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(100).optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
});

// Error code mappings from SP
const ERROR_CODES: Record<number, { status: number; message: string }> = {
  '-1': { status: 400, message: 'Validation failed' },
  '-2': { status: 400, message: 'Invalid Branch selected' },
  '-3': { status: 400, message: 'Invalid email format' },
  '-4': { status: 400, message: 'Invalid Date of Birth' },
  '-5': { status: 409, message: 'Patient with this MRN already exists' },
  '-99': { status: 500, message: 'Internal server error' },
};

// =============================================================================
// GET /api/patients - List with Pagination (from sp_Patient_Search)
// =============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Pagination params from SP
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sortBy = searchParams.get('sortBy') || 'createdOn';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    // Filter params from SP
    const searchTerm = searchParams.get('search');
    const branchId = searchParams.get('branchId');
    const gender = searchParams.get('gender');
    
    // Build where clause with soft delete filter (from SP pattern)
    const where: any = {
      isDeleted: false, // Soft delete pattern
    };
    
    if (searchTerm) {
      where.OR = [
        { mrn: { contains: searchTerm } },
        { firstName: { contains: searchTerm } },
        { lastName: { contains: searchTerm } },
        { phone: { contains: searchTerm } },
      ];
    }
    
    if (branchId) {
      where.branchId = branchId; // Multi-tenant pattern
    }
    
    if (gender) {
      where.gender = gender;
    }
    
    // Get total count
    const total = await prisma.patient.count({ where });
    
    // Get paginated results with sorting
    const items = await prisma.patient.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });
    
    // Calculate computed fields (from SP)
    const itemsWithAge = items.map(item => ({
      ...item,
      age: new Date().getFullYear() - item.dateOfBirth.getFullYear(),
      fullName: `${item.firstName} ${item.lastName}`,
    }));
    
    return NextResponse.json({
      items: itemsWithAge,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
    
  } catch (error: any) {
    console.error('[Patients API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/patients - Create (from sp_Patient_Create)
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const data = PatientCreateSchema.parse(body);
    
    // Check branch exists (from SP validation)
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, isActive: true },
    });
    
    if (!branch) {
      return NextResponse.json(
        { error: 'Invalid Branch selected', code: -2 },
        { status: 400 }
      );
    }
    
    // Check MRN uniqueness (from SP validation)
    const existingPatient = await prisma.patient.findFirst({
      where: {
        mrn: data.mrn,
        isDeleted: false, // Only check non-deleted patients
      },
    });
    
    if (existingPatient) {
      return NextResponse.json(
        { error: 'Patient with this MRN already exists', code: -5 },
        { status: 409 }
      );
    }
    
    // Create patient
    const patient = await prisma.patient.create({
      data: {
        ...data,
        isActive: true,
        isDeleted: false,
        createdOn: new Date(),
        // createdBy: userId from auth context
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
    
    return NextResponse.json({
      ...patient,
      age: new Date().getFullYear() - patient.dateOfBirth.getFullYear(),
      fullName: `${patient.firstName} ${patient.lastName}`,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('[Patients API] POST Error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create patient', code: -99 },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT /api/patients - Update (from sp_Patient_Update)
// =============================================================================

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = PatientUpdateSchema.parse(body);
    const { id, ...updateData } = data;
    
    // Check patient exists and not deleted
    const existing = await prisma.patient.findFirst({
      where: { id, isDeleted: false },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }
    
    // Update patient
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...updateData,
        modifiedOn: new Date(),
        // modifiedBy: userId from auth context
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
    
    return NextResponse.json(patient);
    
  } catch (error: any) {
    console.error('[Patients API] PUT Error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update patient' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/patients - Soft Delete (from sp_Patient_Delete)
// =============================================================================

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }
    
    // Soft delete (from SP pattern)
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        isDeleted: true,
        modifiedOn: new Date(),
        // modifiedBy: userId from auth context
      },
    });
    
    return NextResponse.json({
      message: 'Patient deleted successfully',
      id: patient.id,
    });
    
  } catch (error: any) {
    console.error('[Patients API] DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete patient' },
      { status: 500 }
    );
  }
}
