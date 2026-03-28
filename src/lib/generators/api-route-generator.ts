/**
 * API Route Generator
 * 
 * Generates Next.js 15 App Router API routes for CRUD operations.
 * 
 * Features:
 * - GET with pagination, search, and filtering
 * - GET by ID with relation includes
 * - POST with Zod validation
 * - PUT with Zod validation
 * - DELETE with soft delete support
 * - Dropdown/Reference API for FK fields
 * - Cascade dropdown API support
 * - Bulk operations support
 */

import { prisma } from '@/lib/db';
import {
  toPrismaModelName,
  toCamelCase,
  toKebabCase,
  isNumericType,
  isStringType,
  isDateType,
  isBooleanType,
} from './type-mappings';
import type { UnifiedField } from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface APIRouteGeneratorConfig {
  projectId: string;
  tableName: string;
  includeSearch?: boolean;
  includeFilter?: boolean;
  includePagination?: boolean;
  includeRelations?: boolean;
  includeSoftDelete?: boolean;
  includeBulkOperations?: boolean;
  includeDropdownAPI?: boolean;
  includeAuditLog?: boolean;
  searchFields?: string[];
  defaultPageSize?: number;
  maxPageSize?: number;
}

export interface GeneratedAPIRoute {
  type: 'main' | 'detail' | 'dropdown' | 'cascade' | 'bulk';
  path: string;
  content: string;
  methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[];
}

export interface APIRouteGenerationResult {
  routes: GeneratedAPIRoute[];
  types: string;
  errors: string[];
  warnings: string[];
  summary: {
    tableName: string;
    routeCount: number;
    endpoints: string[];
  };
}

export interface APIField {
  name: string;
  type: string;
  isRequired: boolean;
  isNullable: boolean;
  isFK: boolean;
  fkTable?: string;
  fkColumn?: string;
  isPII: boolean;
  isPHI: boolean;
  isSearchable: boolean;
  isFilterable: boolean;
  semanticType?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate all API routes for a table
 */
export async function generateAPIRoutes(
  config: APIRouteGeneratorConfig
): Promise<APIRouteGenerationResult> {
  const result: APIRouteGenerationResult = {
    routes: [],
    types: '',
    errors: [],
    warnings: [],
    summary: {
      tableName: config.tableName,
      routeCount: 0,
      endpoints: [],
    },
  };

  try {
    // Get fields for the table
    const fields = await prisma.unifiedField.findMany({
      where: {
        projectId: config.projectId,
        tableName: config.tableName,
      },
      orderBy: { displayOrder: 'asc' },
    });

    if (fields.length === 0) {
      result.errors.push(`No fields found for table ${config.tableName}`);
      return result;
    }

    // Convert to API fields
    const apiFields = convertToAPIFields(fields, config);

    // Generate main route (list + create)
    const mainRoute = generateMainRoute(config, apiFields);
    result.routes.push(mainRoute);

    // Generate detail route (get + update + delete)
    const detailRoute = generateDetailRoute(config, apiFields);
    result.routes.push(detailRoute);

    // Generate dropdown routes for FK fields
    if (config.includeDropdownAPI) {
      const fkFields = apiFields.filter(f => f.isFK);
      for (const fkField of fkFields) {
        const dropdownRoute = await generateDropdownRoute(config, fkField);
        if (dropdownRoute) {
          result.routes.push(dropdownRoute);
        }
      }
    }

    // Generate bulk operations route
    if (config.includeBulkOperations) {
      const bulkRoute = generateBulkRoute(config, apiFields);
      result.routes.push(bulkRoute);
    }

    // Generate TypeScript types
    result.types = generateAPITypes(config, apiFields);

    // Update summary
    result.summary.routeCount = result.routes.length;
    result.summary.endpoints = result.routes.flatMap(r => 
      r.methods.map(m => `${m} /api/${toKebabCase(config.tableName)}${r.type === 'detail' ? '/[id]' : ''}`)
    );

  } catch (error: any) {
    result.errors.push(`API route generation error: ${error.message}`);
  }

  return result;
}

/**
 * Convert UnifiedField to APIField
 */
function convertToAPIFields(
  fields: UnifiedField[],
  config: APIRouteGeneratorConfig
): APIField[] {
  return fields.map(field => ({
    name: toCamelCase(field.fieldName),
    type: field.schemaDataType || 'VARCHAR',
    isRequired: !field.schemaIsNullable && !field.schemaIsPrimaryKey,
    isNullable: field.schemaIsNullable,
    isFK: field.fkIsForeignKey,
    fkTable: field.fkReferencedTable || undefined,
    fkColumn: field.fkReferencedColumn || undefined,
    isPII: field.compIsPII,
    isPHI: field.compIsPHI,
    isSearchable: config.searchFields?.includes(field.fieldName) || 
                  isStringType(field.schemaDataType || '') ||
                  field.intelSemanticType?.toLowerCase().includes('name') ||
                  field.intelSemanticType?.toLowerCase().includes('code'),
    isFilterable: field.fkIsForeignKey || 
                  isBooleanType(field.schemaDataType || '') ||
                  field.fieldName.toLowerCase().includes('status'),
    semanticType: field.intelSemanticType || undefined,
  }));
}

/**
 * Generate main route (list with pagination + create)
 */
function generateMainRoute(
  config: APIRouteGeneratorConfig,
  fields: APIField[]
): GeneratedAPIRoute {
  const modelName = toPrismaModelName(config.tableName);
  const kebabName = toKebabCase(config.tableName);
  const pkField = fields.find(f => f.name === 'id') || fields[0];
  const searchFields = fields.filter(f => f.isSearchable);
  const fkFields = fields.filter(f => f.isFK);
  const filterFields = fields.filter(f => f.isFilterable);

  const content = `/**
 * API Route: ${config.tableName}
 * Auto-generated by AI Enterprise Architect
 * 
 * Endpoints:
 * - GET  /api/${kebabName}      - List with pagination, search, filter
 * - POST /api/${kebabName}      - Create new record
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
${fkFields.length > 0 ? `// Types for FK includes` : ''}

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const createSchema = z.object({
${fields
  .filter(f => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt')
  .map(f => `  ${f.name}: ${getZodValidation(f)},`)
  .join('\n')}
});

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(${config.maxPageSize || 100}).default(${config.defaultPageSize || 20}),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
${filterFields.map(f => `  ${f.name}: z.string().optional(),`).join('\n')}
});

// ══════════════════════════════════════════════════════════════════════════════
// GET - List with pagination, search, filter
// ══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));
    
    const { page, limit, search, sortBy, sortOrder${filterFields.map(f => `, ${f.name}`).join('')} } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    ${config.includeSoftDelete ? "where.deletedAt = null; // Exclude soft-deleted records" : ''}
    
    ${config.includeSearch && searchFields.length > 0 ? `
    // Search functionality
    if (search) {
      where.OR = [
        ${searchFields.map(f => `{
          ${f.name}: { contains: search, mode: 'insensitive' }
        }`).join(',\n        ')}
      ];
    }
    ` : ''}
    
    ${filterFields.map(f => {
      if (f.isFK) {
        return `
    // Filter by ${f.name}
    if (${f.name}) {
      where.${f.name} = parseInt(${f.name});
    }`;
      } else if (isBooleanType(f.type)) {
        return `
    // Filter by ${f.name}
    if (${f.name} !== undefined) {
      where.${f.name} = ${f.name} === 'true';
    }`;
      } else {
        return `
    // Filter by ${f.name}
    if (${f.name}) {
      where.${f.name} = ${f.name};
    }`;
      }
    }).join('')}

    // Build include for relations
    const include = {
      ${fkFields.map(f => `${f.name.replace(/Id$/, '')}: true,`).join('\n      ')}
    };

    // Execute query
    const [data, total] = await Promise.all([
      prisma.${toCamelCase(modelName)}.findMany({
        where,
        skip,
        take: limit,
        ${fkFields.length > 0 ? 'include,' : ''}
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
      }),
      prisma.${toCamelCase(modelName)}.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    });
  } catch (error: any) {
    console.error('GET /api/${kebabName} error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ${kebabName}' },
      { status: 400 }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POST - Create new record
// ══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createSchema.parse(body);
    
    // Create record
    const record = await prisma.${toCamelCase(modelName)}.create({
      data: validated,
      ${fkFields.length > 0 ? `
      include: {
        ${fkFields.map(f => `${f.name.replace(/Id$/, '')}: true,`).join('\n        ')}
      }` : ''}
    });

    return NextResponse.json({
      success: true,
      data: record,
      message: '${config.tableName} created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/${kebabName} error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create ${kebabName}' },
      { status: 500 }
    );
  }
}
`;

  return {
    type: 'main',
    path: `app/api/${kebabName}/route.ts`,
    content,
    methods: ['GET', 'POST'],
  };
}

/**
 * Generate detail route (get by ID + update + delete)
 */
function generateDetailRoute(
  config: APIRouteGeneratorConfig,
  fields: APIField[]
): GeneratedAPIRoute {
  const modelName = toPrismaModelName(config.tableName);
  const kebabName = toKebabCase(config.tableName);
  const fkFields = fields.filter(f => f.isFK);

  const content = `/**
 * API Route: ${config.tableName} Detail
 * Auto-generated by AI Enterprise Architect
 * 
 * Endpoints:
 * - GET    /api/${kebabName}/[id]  - Get by ID
 * - PUT    /api/${kebabName}/[id]  - Update record
 * - DELETE /api/${kebabName}/[id]  - Delete record
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const updateSchema = z.object({
${fields
  .filter(f => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt')
  .map(f => `  ${f.name}: ${getZodValidation(f, true)},`)
  .join('\n')}
});

// ══════════════════════════════════════════════════════════════════════════════
// GET - Get by ID
// ══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const record = await prisma.${toCamelCase(modelName)}.findUnique({
      where: { id: parseInt(id) },
      ${fkFields.length > 0 ? `include: {
        ${fkFields.map(f => `${f.name.replace(/Id$/, '')}: true,`).join('\n        ')}
      }` : ''}
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: '${config.tableName} not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error: any) {
    console.error('GET /api/${kebabName}/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ${kebabName}' },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PUT - Update record
// ══════════════════════════════════════════════════════════════════════════════

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateSchema.parse(body);
    
    // Check if record exists
    const existing = await prisma.${toCamelCase(modelName)}.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '${config.tableName} not found' },
        { status: 404 }
      );
    }

    // Update record
    const record = await prisma.${toCamelCase(modelName)}.update({
      where: { id: parseInt(id) },
      data: validated,
      ${fkFields.length > 0 ? `include: {
        ${fkFields.map(f => `${f.name.replace(/Id$/, '')}: true,`).join('\n        ')}
      }` : ''}
    });

    return NextResponse.json({
      success: true,
      data: record,
      message: '${config.tableName} updated successfully',
    });
  } catch (error: any) {
    console.error('PUT /api/${kebabName}/[id] error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update ${kebabName}' },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DELETE - Delete record
// ══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if record exists
    const existing = await prisma.${toCamelCase(modelName)}.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '${config.tableName} not found' },
        { status: 404 }
      );
    }

    ${config.includeSoftDelete ? `
    // Soft delete
    await prisma.${toCamelCase(modelName)}.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() },
    });
    ` : `
    // Hard delete
    await prisma.${toCamelCase(modelName)}.delete({
      where: { id: parseInt(id) },
    });
    `}

    return NextResponse.json({
      success: true,
      message: '${config.tableName} deleted successfully',
    });
  } catch (error: any) {
    console.error('DELETE /api/${kebabName}/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete ${kebabName}' },
      { status: 500 }
    );
  }
}
`;

  return {
    type: 'detail',
    path: `app/api/${kebabName}/[id]/route.ts`,
    content,
    methods: ['GET', 'PUT', 'DELETE'],
  };
}

/**
 * Generate dropdown route for FK lookups
 */
async function generateDropdownRoute(
  config: APIRouteGeneratorConfig,
  fkField: APIField
): Promise<GeneratedAPIRoute | null> {
  if (!fkField.fkTable) return null;

  const modelName = toPrismaModelName(fkField.fkTable);
  const kebabName = toKebabCase(fkField.fkTable);
  const displayField = await guessDisplayField(fkField.fkTable);

  const content = `/**
 * Dropdown API Route: ${fkField.fkTable}
 * Auto-generated by AI Enterprise Architect
 * 
 * Endpoint:
 * - GET /api/${kebabName}/dropdown - Get all for dropdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { ${displayField}: { contains: search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.${toCamelCase(modelName)}.findMany({
      where,
      select: {
        id: true,
        ${displayField}: true,
      },
      orderBy: { ${displayField}: 'asc' },
      take: 100, // Limit dropdown items
    });

    // Transform for dropdown format
    const options = data.map(item => ({
      value: item.id,
      label: item.${displayField},
    }));

    return NextResponse.json({
      success: true,
      data: options,
    });
  } catch (error: any) {
    console.error('GET /api/${kebabName}/dropdown error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dropdown options' },
      { status: 500 }
    );
  }
}
`;

  return {
    type: 'dropdown',
    path: `app/api/${kebabName}/dropdown/route.ts`,
    content,
    methods: ['GET'],
  };
}

/**
 * Generate bulk operations route
 */
function generateBulkRoute(
  config: APIRouteGeneratorConfig,
  fields: APIField[]
): GeneratedAPIRoute {
  const modelName = toPrismaModelName(config.tableName);
  const kebabName = toKebabCase(config.tableName);

  const content = `/**
 * Bulk Operations API Route: ${config.tableName}
 * Auto-generated by AI Enterprise Architect
 * 
 * Endpoints:
 * - POST /api/${kebabName}/bulk - Bulk create
 * - PUT /api/${kebabName}/bulk - Bulk update
 * - DELETE /api/${kebabName}/bulk - Bulk delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const bulkCreateSchema = z.object({
  items: z.array(z.object({
${fields
  .filter(f => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt')
  .map(f => `    ${f.name}: ${getZodValidation(f)},`)
  .join('\n')}
  })).min(1).max(100),
});

const bulkUpdateSchema = z.object({
  ids: z.array(z.union([z.number(), z.string()])),
  data: z.object({
${fields
  .filter(f => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt')
  .map(f => `    ${f.name}: ${getZodValidation(f, true)},`)
  .join('\n')}
  }),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.union([z.number(), z.string()])),
});

// ══════════════════════════════════════════════════════════════════════════════
// POST - Bulk Create
// ══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = bulkCreateSchema.parse(body);
    
    const records = await prisma.${toCamelCase(modelName)}.createMany({
      data: items,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      created: records.count,
      message: \`\${records.count} ${kebabName} created successfully\`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/${kebabName}/bulk error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create ${kebabName}' },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PUT - Bulk Update
// ══════════════════════════════════════════════════════════════════════════════

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, data } = bulkUpdateSchema.parse(body);
    
    const records = await prisma.${toCamelCase(modelName)}.updateMany({
      where: { id: { in: ids.map(id => typeof id === 'string' ? parseInt(id) : id) } },
      data,
    });

    return NextResponse.json({
      success: true,
      updated: records.count,
      message: \`\${records.count} ${kebabName} updated successfully\`,
    });
  } catch (error: any) {
    console.error('PUT /api/${kebabName}/bulk error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update ${kebabName}' },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DELETE - Bulk Delete
// ══════════════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = bulkDeleteSchema.parse(body);
    
    ${config.includeSoftDelete ? `
    const records = await prisma.${toCamelCase(modelName)}.updateMany({
      where: { id: { in: ids.map(id => typeof id === 'string' ? parseInt(id) : id) } },
      data: { deletedAt: new Date() },
    });
    ` : `
    const records = await prisma.${toCamelCase(modelName)}.deleteMany({
      where: { id: { in: ids.map(id => typeof id === 'string' ? parseInt(id) : id) } },
    });
    `}

    return NextResponse.json({
      success: true,
      deleted: records.count,
      message: \`\${records.count} ${kebabName} deleted successfully\`,
    });
  } catch (error: any) {
    console.error('DELETE /api/${kebabName}/bulk error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete ${kebabName}' },
      { status: 500 }
    );
  }
}
`;

  return {
    type: 'bulk',
    path: `app/api/${kebabName}/bulk/route.ts`,
    content,
    methods: ['POST', 'PUT', 'DELETE'],
  };
}

/**
 * Generate TypeScript types for API
 */
function generateAPITypes(
  config: APIRouteGeneratorConfig,
  fields: APIField[]
): string {
  const modelName = toPrismaModelName(config.tableName);
  const fkFields = fields.filter(f => f.isFK);

  return `/**
 * API Types: ${config.tableName}
 * Auto-generated by AI Enterprise Architect
 */

// ══════════════════════════════════════════════════════════════════════════════
// ENTITY TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ${modelName} {
${fields.map(f => `  ${f.name}: ${getTypeScriptType(f)};`).join('\n')}
}

export interface Create${modelName}DTO {
${fields
  .filter(f => f.name !== 'id' && f.name !== 'createdAt' && f.name !== 'updatedAt')
  .map(f => `  ${f.name}${f.isNullable ? '?' : ''}: ${getTypeScriptType(f)};`)
  .join('\n')}
}

export interface Update${modelName}DTO extends Partial<Create${modelName}DTO> {
  id: number;
}

${fkFields.length > 0 ? `
export interface ${modelName}WithRelations extends ${modelName} {
${fkFields.map(f => `  ${f.name.replace(/Id$/, '')}?: ${toPrismaModelName(f.fkTable || 'unknown')};`).join('\n')}
}
` : ''}

// ══════════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ${modelName}ListResponse {
  success: boolean;
  data: ${modelName}[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ${modelName}DetailResponse {
  success: boolean;
  data: ${modelName};
}

export interface ${modelName}CreateResponse {
  success: boolean;
  data: ${modelName};
  message: string;
}

export interface ${modelName}UpdateResponse {
  success: boolean;
  data: ${modelName};
  message: string;
}

export interface ${modelName}DeleteResponse {
  success: boolean;
  message: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ${modelName}QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
${fields.filter(f => f.isFilterable).map(f => `  ${f.name}?: ${isBooleanType(f.type) ? 'boolean' : 'string'};`).join('\n')}
}
`;
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get Zod validation for a field
 */
function getZodValidation(field: APIField, optional: boolean = false): string {
  let zodType: string;

  if (field.isFK) {
    zodType = 'z.number().int().positive()';
  } else if (isNumericType(field.type)) {
    zodType = 'z.number()';
  } else if (isBooleanType(field.type)) {
    zodType = 'z.boolean()';
  } else if (isDateType(field.type)) {
    zodType = 'z.coerce.date()';
  } else {
    zodType = 'z.string()';
  }

  // Add optional/nullable modifiers
  if (optional || field.isNullable) {
    if (field.isNullable) {
      zodType += '.nullable()';
    }
    zodType += '.optional()';
  }

  // Add semantic validations
  if (field.semanticType) {
    const semantic = field.semanticType.toLowerCase();
    if (semantic.includes('email')) {
      zodType += '.email()';
    } else if (semantic.includes('url') || semantic.includes('website')) {
      zodType += '.url()';
    }
  }

  return zodType;
}

/**
 * Get TypeScript type for a field
 */
function getTypeScriptType(field: APIField): string {
  let tsType: string;

  if (field.isFK) {
    tsType = 'number';
  } else if (isNumericType(field.type)) {
    tsType = 'number';
  } else if (isBooleanType(field.type)) {
    tsType = 'boolean';
  } else if (isDateType(field.type)) {
    tsType = 'Date';
  } else {
    tsType = 'string';
  }

  if (field.isNullable) {
    tsType += ' | null';
  }

  return tsType;
}

/**
 * Guess display field for a table
 */
async function guessDisplayField(tableName: string): Promise<string> {
  // Common display field patterns
  const displayFieldPatterns = [
    'name',
    'title',
    'label',
    'description',
    'code',
  ];

  // Try to find a matching field
  for (const pattern of displayFieldPatterns) {
    const field = await prisma.unifiedField.findFirst({
      where: {
        tableName,
        fieldName: { equals: pattern, mode: 'insensitive' },
      },
    });
    if (field) return field.fieldName;
  }

  // Default to 'name' or 'id'
  return 'name';
}

// ══════════════════════════════════════════════════════════════════════════════
// CASCADE DROPDOWN GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

export interface CascadeConfig {
  parentTable: string;
  parentField: string;
  childTable: string;
  childField: string;
  displayField: string;
}

/**
 * Generate cascade dropdown API route
 */
export function generateCascadeDropdownRoute(config: CascadeConfig): GeneratedAPIRoute {
  const parentModel = toPrismaModelName(config.parentTable);
  const childModel = toPrismaModelName(config.childTable);
  const kebabChild = toKebabCase(config.childTable);

  const content = `/**
 * Cascade Dropdown API: ${config.parentTable} → ${config.childTable}
 * Auto-generated by AI Enterprise Architect
 * 
 * Endpoint:
 * - GET /api/${kebabChild}/by-${config.parentField}/[:parentId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ parentId: string }> }
) {
  try {
    const { parentId } = await params;
    
    const data = await prisma.${toCamelCase(childModel)}.findMany({
      where: {
        ${config.childField}: parseInt(parentId),
      },
      select: {
        id: true,
        ${config.displayField}: true,
      },
      orderBy: { ${config.displayField}: 'asc' },
    });

    const options = data.map(item => ({
      value: item.id,
      label: item.${config.displayField},
    }));

    return NextResponse.json({
      success: true,
      data: options,
    });
  } catch (error: any) {
    console.error('GET /api/${kebabChild}/by-${config.parentField} error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch options' },
      { status: 500 }
    );
  }
}
`;

  return {
    type: 'cascade',
    path: `app/api/${kebabChild}/by-${config.parentField}/[parentId]/route.ts`,
    content,
    methods: ['GET'],
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// FULL PROJECT API GENERATION
// ══════════════════════════════════════════════════════════════════════════════

export interface FullAPIGenerationConfig {
  projectId: string;
  includeDropdowns?: boolean;
  includeBulk?: boolean;
  includeCascade?: boolean;
  defaultPageSize?: number;
  maxPageSize?: number;
}

export interface FullAPIGenerationResult {
  success: boolean;
  routes: GeneratedAPIRoute[];
  errors: string[];
  warnings: string[];
  summary: {
    tableCount: number;
    routeCount: number;
    endpoints: string[];
  };
}

/**
 * Generate API routes for all tables in a project
 */
export async function generateAllAPIRoutes(
  config: FullAPIGenerationConfig
): Promise<FullAPIGenerationResult> {
  const result: FullAPIGenerationResult = {
    success: true,
    routes: [],
    errors: [],
    warnings: [],
    summary: {
      tableCount: 0,
      routeCount: 0,
      endpoints: [],
    },
  };

  try {
    // Get all unique tables
    const tables = await prisma.unifiedField.groupBy({
      by: ['tableName'],
      where: { projectId: config.projectId },
    });

    result.summary.tableCount = tables.length;

    // Generate routes for each table
    for (const table of tables) {
      const routeResult = await generateAPIRoutes({
        projectId: config.projectId,
        tableName: table.tableName,
        includeSearch: true,
        includeFilter: true,
        includePagination: true,
        includeRelations: true,
        includeSoftDelete: false,
        includeBulkOperations: config.includeBulk,
        includeDropdownAPI: config.includeDropdowns,
        defaultPageSize: config.defaultPageSize || 20,
        maxPageSize: config.maxPageSize || 100,
      });

      if (routeResult.errors.length > 0) {
        result.errors.push(...routeResult.errors);
      }

      result.routes.push(...routeResult.routes);
      result.warnings.push(...routeResult.warnings);
    }

    result.summary.routeCount = result.routes.length;
    result.summary.endpoints = result.routes.flatMap(r =>
      r.methods.map(m => `${m} ${r.path.replace('route.ts', '')}`)
    );

  } catch (error: any) {
    result.errors.push(`Full API generation error: ${error.message}`);
    result.success = false;
  }

  return result;
}
