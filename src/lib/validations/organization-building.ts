// =============================================================================
// Organization Building Validation Schemas
// Zod validation for Building, Floor, Room entities
// =============================================================================

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Helper
// -----------------------------------------------------------------------------

export function validateWithZod<T extends z.ZodType<any, any, any>>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

// -----------------------------------------------------------------------------
// Building Schemas
// -----------------------------------------------------------------------------

export const buildingCreateSchema = z.object({
  name: z.string()
    .min(1, 'Building name is required')
    .max(200, 'Building name must be 200 characters or less'),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),
  code: z.string()
    .max(50, 'Code must be 50 characters or less')
    .optional()
    .nullable(),
  address: z.string()
    .max(500, 'Address must be 500 characters or less')
    .optional()
    .nullable(),
  city: z.string()
    .max(100, 'City must be 100 characters or less')
    .optional()
    .nullable(),
  state: z.string()
    .max(100, 'State must be 100 characters or less')
    .optional()
    .nullable(),
  country: z.string()
    .max(100, 'Country must be 100 characters or less')
    .optional()
    .nullable(),
  postalCode: z.string()
    .max(20, 'Postal code must be 20 characters or less')
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const buildingUpdateSchema = buildingCreateSchema.partial();

export const buildingQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 50),
  sortBy: z.enum(['name', 'createdAt', 'sortOrder']).optional().default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// -----------------------------------------------------------------------------
// Floor Schemas
// -----------------------------------------------------------------------------

export const floorCreateSchema = z.object({
  buildingId: z.string()
    .min(1, 'Building ID is required'),
  name: z.string()
    .min(1, 'Floor name is required')
    .max(200, 'Floor name must be 200 characters or less'),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),
  code: z.string()
    .max(50, 'Code must be 50 characters or less')
    .optional()
    .nullable(),
  floorNumber: z.number().int().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(1),
});

export const floorUpdateSchema = floorCreateSchema.partial().omit({ buildingId: true });

export const floorQuerySchema = z.object({
  buildingId: z.string().optional(),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 50),
  sortBy: z.enum(['name', 'floorNumber', 'sortOrder']).optional().default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// -----------------------------------------------------------------------------
// Room Schemas
// -----------------------------------------------------------------------------

export const roomTypeSchema = z.enum([
  'Office',
  'Meeting Room',
  'Conference Room',
  'Storage',
  'Restroom',
  'Break Room',
  'Server Room',
  'Reception',
  'Examination Room',
  'Operation Theater',
  'ICU',
  'Ward',
  'Laboratory',
  'Pharmacy',
  'Other'
]);

export const roomCreateSchema = z.object({
  floorId: z.string()
    .min(1, 'Floor ID is required'),
  name: z.string()
    .min(1, 'Room name is required')
    .max(200, 'Room name must be 200 characters or less'),
  description: z.string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),
  code: z.string()
    .max(50, 'Code must be 50 characters or less')
    .optional()
    .nullable(),
  roomNumber: z.string()
    .max(50, 'Room number must be 50 characters or less')
    .optional()
    .nullable(),
  roomType: roomTypeSchema.optional().nullable(),
  capacity: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(1),
});

export const roomUpdateSchema = roomCreateSchema.partial().omit({ floorId: true });

export const roomQuerySchema = z.object({
  floorId: z.string().optional(),
  buildingId: z.string().optional(),
  roomType: roomTypeSchema.optional(),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  page: z.string().optional().transform(v => v ? parseInt(v) : 1),
  limit: z.string().optional().transform(v => v ? parseInt(v) : 50),
  sortBy: z.enum(['name', 'roomNumber', 'roomType', 'sortOrder']).optional().default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type BuildingCreate = z.infer<typeof buildingCreateSchema>;
export type BuildingUpdate = z.infer<typeof buildingUpdateSchema>;
export type BuildingQuery = z.infer<typeof buildingQuerySchema>;

export type FloorCreate = z.infer<typeof floorCreateSchema>;
export type FloorUpdate = z.infer<typeof floorUpdateSchema>;
export type FloorQuery = z.infer<typeof floorQuerySchema>;

export type RoomCreate = z.infer<typeof roomCreateSchema>;
export type RoomUpdate = z.infer<typeof roomUpdateSchema>;
export type RoomQuery = z.infer<typeof roomQuerySchema>;
export type RoomType = z.infer<typeof roomTypeSchema>;

// -----------------------------------------------------------------------------
// Aliases for Route Compatibility
// -----------------------------------------------------------------------------

export const CreateBuildingSchema = buildingCreateSchema;
export const UpdateBuildingSchema = buildingUpdateSchema;
export const QueryBuildingSchema = buildingQuerySchema;

export const CreateFloorSchema = floorCreateSchema;
export const UpdateFloorSchema = floorUpdateSchema;
export const QueryFloorSchema = floorQuerySchema;

export const CreateRoomSchema = roomCreateSchema;
export const UpdateRoomSchema = roomUpdateSchema;
export const QueryRoomSchema = roomQuerySchema;
