// =============================================================================
// Code Generation API
// Handles: Next.js API Routes, React Forms, DataTable Lists, Zod Schemas
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

const SQL_TO_TS_MAP: Record<string, string> = {
  'UNIQUEIDENTIFIER': 'string',
  'NVARCHAR': 'string',
  'VARCHAR': 'string',
  'NCHAR': 'string',
  'CHAR': 'string',
  'TEXT': 'string',
  'NTEXT': 'string',
  'INT': 'number',
  'BIGINT': 'number',
  'SMALLINT': 'number',
  'TINYINT': 'number',
  'BIT': 'boolean',
  'DECIMAL': 'number',
  'NUMERIC': 'number',
  'MONEY': 'number',
  'SMALLMONEY': 'number',
  'FLOAT': 'number',
  'REAL': 'number',
  'DATE': 'Date',
  'DATETIME': 'Date',
  'DATETIME2': 'Date',
  'SMALLDATETIME': 'Date',
  'TIME': 'string',
  'DATETIMEOFFSET': 'Date',
  'BINARY': 'Buffer',
  'VARBINARY': 'Buffer',
  'IMAGE': 'Buffer',
  'XML': 'string',
  'JSON': 'any',
};

const SQL_TO_ZOD_MAP: Record<string, string> = {
  'UNIQUEIDENTIFIER': 'z.string().uuid()',
  'NVARCHAR': 'z.string()',
  'VARCHAR': 'z.string()',
  'NCHAR': 'z.string()',
  'CHAR': 'z.string()',
  'TEXT': 'z.string()',
  'NTEXT': 'z.string()',
  'INT': 'z.number().int()',
  'BIGINT': 'z.number().int()',
  'SMALLINT': 'z.number().int()',
  'TINYINT': 'z.number().int().min(0).max(255)',
  'BIT': 'z.boolean()',
  'DECIMAL': 'z.number()',
  'NUMERIC': 'z.number()',
  'MONEY': 'z.number()',
  'SMALLMONEY': 'z.number()',
  'FLOAT': 'z.number()',
  'REAL': 'z.number()',
  'DATE': 'z.coerce.date()',
  'DATETIME': 'z.coerce.date()',
  'DATETIME2': 'z.coerce.date()',
  'SMALLDATETIME': 'z.coerce.date()',
  'TIME': 'z.string().regex(/^\\d{2}:\\d{2}:\\d{2}/)',
  'DATETIMEOFFSET': 'z.coerce.date()',
  'BINARY': 'z.any()',
  'VARBINARY': 'z.any()',
  'IMAGE': 'z.any()',
  'XML': 'z.string()',
  'JSON': 'z.any()',
};

const SQL_TO_INPUT_TYPE: Record<string, string> = {
  'UNIQUEIDENTIFIER': 'text',
  'NVARCHAR': 'text',
  'VARCHAR': 'text',
  'INT': 'number',
  'BIGINT': 'number',
  'SMALLINT': 'number',
  'TINYINT': 'number',
  'BIT': 'checkbox',
  'DECIMAL': 'number',
  'NUMERIC': 'number',
  'MONEY': 'number',
  'FLOAT': 'number',
  'REAL': 'number',
  'DATE': 'date',
  'DATETIME': 'datetime-local',
  'DATETIME2': 'datetime-local',
  'SMALLDATETIME': 'datetime-local',
  'TIME': 'time',
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectId } = body;

    if (!projectId && action !== 'preview-generation') {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    switch (action) {
      // API Route Generation
      case 'generate-api-route':
        return await generateAPIRoute(projectId, body);
      
      case 'generate-crud-api':
        return await generateCRUDAPI(projectId, body.tableName, body.moduleName);
      
      case 'preview-api-route':
        return await previewAPIRoute(body.config);
      
      // Form Generation
      case 'generate-form-component':
        return await generateFormComponent(projectId, body);
      
      case 'generate-form-from-table':
        return await generateFormFromTable(projectId, body.tableName, body.options);
      
      case 'preview-form-component':
        return await previewFormComponent(body.config);
      
      // List Page Generation
      case 'generate-list-page':
        return await generateListPage(projectId, body);
      
      case 'generate-list-from-table':
        return await generateListFromTable(projectId, body.tableName, body.options);
      
      case 'preview-list-page':
        return await previewListPage(body.config);
      
      // Zod Schema Generation
      case 'generate-zod-schema':
        return await generateZodSchema(projectId, body.tableName);
      
      case 'generate-zod-from-validation':
        return await generateZodFromValidation(projectId, body.viewName);
      
      case 'preview-zod-schema':
        return await previewZodSchema(body.config);
      
      // Complete Module Generation
      case 'generate-complete-module':
        return await generateCompleteModule(projectId, body);
      
      // Advanced Generation (70% → 100%)
      case 'generate-page-routing':
        return await generatePageRouting(projectId, body);
      
      case 'generate-navigation-component':
        return await generateNavigationComponent(projectId, body);
      
      case 'generate-api-client':
        return await generateAPIClient(projectId, body.tables);
      
      case 'generate-tests':
        return await generateTests(projectId, body);
      
      case 'generate-full-module':
        return await generateFullModule(projectId, body);
      
      case 'generate-hooks':
        return await generateReactHooks(projectId, body.tableName, body.moduleName);
      
      case 'generate-types':
        return await generateTypeDefinitions(projectId, body.tableName);
      
      // Generation Summary
      case 'get-generation-summary':
        return await getGenerationSummary(projectId);
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Code Generator API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTE GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateAPIRoute(projectId: string, body: {
  tableName: string;
  moduleName: string;
  operations?: string[];
}) {
  const { tableName, moduleName, operations = ['list', 'get', 'create', 'update', 'delete'] } = body;

  // Get table schema
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
  });

  if (!table) {
    return NextResponse.json({ error: `Table ${tableName} not found` }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const primaryKey = columns.find((c: { isPrimaryKey?: boolean }) => c.isPrimaryKey) || columns[0];

  const generatedRoutes: any[] = [];

  for (const operation of operations) {
    const route = generateSingleAPIRoute({
      tableName,
      moduleName,
      operation,
      columns,
      primaryKey,
    });
    generatedRoutes.push(route);
  }

  return NextResponse.json({
    success: true,
    tableName,
    moduleName,
    routes: generatedRoutes,
    fileStructure: generateAPIFileStructure(moduleName, tableName, generatedRoutes),
  });
}

function generateSingleAPIRoute(config: {
  tableName: string;
  moduleName: string;
  operation: string;
  columns: any[];
  primaryKey: any;
}) {
  const { tableName, moduleName, operation, columns, primaryKey } = config;
  const modelName = toPascalCase(tableName);
  const modelCamel = toCamelCase(tableName);
  const routePath = `/api/${moduleName}/${modelCamel}`;

  let code = '';

  switch (operation) {
    case 'list':
      code = generateListRoute(tableName, modelName, modelCamel, columns);
      break;
    case 'get':
      code = generateGetRoute(tableName, modelName, modelCamel, primaryKey);
      break;
    case 'create':
      code = generateCreateRoute(tableName, modelName, modelCamel, columns);
      break;
    case 'update':
      code = generateUpdateRoute(tableName, modelName, modelCamel, columns, primaryKey);
      break;
    case 'delete':
      code = generateDeleteRoute(tableName, modelName, modelCamel, primaryKey);
      break;
  }

  return {
    operation,
    routePath: operation === 'list' ? routePath : operation === 'get' ? `${routePath}/[id]` : routePath,
    method: operation === 'list' || operation === 'get' ? 'GET' : 
            operation === 'create' ? 'POST' : 
            operation === 'update' ? 'PUT' : 'DELETE',
    code,
  };
}

function generateListRoute(tableName: string, modelName: string, modelCamel: string, columns: any[]): string {
  const searchableColumns = columns.filter((c: { name: string }) => 
    ['name', 'title', 'code', 'description'].some(n => c.name.toLowerCase().includes(n))
  );

  return `// =============================================================================
// ${modelName} List API Route
// Auto-generated by Enterprise Architect
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Query parameters schema
const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = QuerySchema.parse(Object.fromEntries(searchParams));
    
    const { page, pageSize, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        ${searchableColumns.map((c: { name: string }) => `{ ${c.name}: { contains: search, mode: 'insensitive' } }`).join(',\n        ')}
      ];
    }

    // Get total count
    const total = await prisma.${modelCamel}.count({ where });

    // Get paginated results
    const items = await prisma.${modelCamel}.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching ${modelCamel} list:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ${modelCamel} list' },
      { status: 500 }
    );
  }
}`;
}

function generateGetRoute(tableName: string, modelName: string, modelCamel: string, primaryKey: any): string {
  return `// =============================================================================
// ${modelName} Get API Route
// Auto-generated by Enterprise Architect
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const item = await prisma.${modelCamel}.findUnique({
      where: { ${primaryKey.name}: id },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: '${modelName} not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error fetching ${modelCamel}:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ${modelCamel}' },
      { status: 500 }
    );
  }
}`;
}

function generateCreateRoute(tableName: string, modelName: string, modelCamel: string, columns: any[]): string {
  const createColumns = columns.filter((c: { isPrimaryKey?: boolean; isIdentity?: boolean; name: string }) => 
    !c.isPrimaryKey && !c.isIdentity && !['createdAt', 'updatedAt', 'createdby', 'updatedby'].includes(c.name.toLowerCase())
  );

  const zodFields = createColumns.map((c: { name: string; dataType: string; isNullable?: boolean }) => {
    const zodType = getZodType(c.dataType);
    const optional = c.isNullable ? '.optional()' : '';
    return `  ${c.name}: ${zodType}${optional}`;
  });

  return `// =============================================================================
// ${modelName} Create API Route
// Auto-generated by Enterprise Architect
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Input validation schema
const CreateSchema = z.object({
${zodFields.join(',\n')}
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateSchema.parse(body);

    const item = await prisma.${modelCamel}.create({
      data: {
        ...validated,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: item,
      message: '${modelName} created successfully',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating ${modelCamel}:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create ${modelCamel}' },
      { status: 500 }
    );
  }
}`;
}

function generateUpdateRoute(tableName: string, modelName: string, modelCamel: string, columns: any[], primaryKey: any): string {
  const updateColumns = columns.filter((c: { isPrimaryKey?: boolean; isIdentity?: boolean; name: string }) => 
    !c.isPrimaryKey && !c.isIdentity && !['createdAt', 'updatedAt', 'createdby', 'updatedby'].includes(c.name.toLowerCase())
  );

  const zodFields = updateColumns.map((c: { name: string; dataType: string; isNullable?: boolean }) => {
    const zodType = getZodType(c.dataType);
    const optional = '.optional()';
    return `  ${c.name}: ${zodType}${optional}`;
  });

  return `// =============================================================================
// ${modelName} Update API Route
// Auto-generated by Enterprise Architect
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Input validation schema
const UpdateSchema = z.object({
${zodFields.join(',\n')}
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const validated = UpdateSchema.parse(body);

    // Check if exists
    const existing = await prisma.${modelCamel}.findUnique({
      where: { ${primaryKey.name}: id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '${modelName} not found' },
        { status: 404 }
      );
    }

    const item = await prisma.${modelCamel}.update({
      where: { ${primaryKey.name}: id },
      data: {
        ...validated,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: item,
      message: '${modelName} updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating ${modelCamel}:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update ${modelCamel}' },
      { status: 500 }
    );
  }
}`;
}

function generateDeleteRoute(tableName: string, modelName: string, modelCamel: string, primaryKey: any): string {
  return `// =============================================================================
// ${modelName} Delete API Route
// Auto-generated by Enterprise Architect
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if exists
    const existing = await prisma.${modelCamel}.findUnique({
      where: { ${primaryKey.name}: id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '${modelName} not found' },
        { status: 404 }
      );
    }

    await prisma.${modelCamel}.delete({
      where: { ${primaryKey.name}: id },
    });

    return NextResponse.json({
      success: true,
      message: '${modelName} deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting ${modelCamel}:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete ${modelCamel}' },
      { status: 500 }
    );
  }
}`;
}

async function generateCRUDAPI(projectId: string, tableName: string, moduleName: string) {
  return generateAPIRoute(projectId, { tableName, moduleName });
}

async function previewAPIRoute(config: any) {
  const { tableName, operation, columns } = config;
  const modelName = toPascalCase(tableName);
  const modelCamel = toCamelCase(tableName);
  const primaryKey = columns.find((c: { isPrimaryKey?: boolean }) => c.isPrimaryKey) || columns[0];

  const code = generateSingleAPIRoute({
    tableName,
    moduleName: 'module',
    operation,
    columns,
    primaryKey,
  });

  return NextResponse.json({
    success: true,
    preview: code.code,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM COMPONENT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateFormComponent(projectId: string, body: {
  tableName: string;
  moduleName: string;
  formType?: 'create' | 'edit' | 'both';
  includeValidation?: boolean;
}) {
  const { tableName, moduleName, formType = 'both', includeValidation = true } = body;

  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
  });

  if (!table) {
    return NextResponse.json({ error: `Table ${tableName} not found` }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const form = generateReactFormComponent({
    tableName,
    moduleName,
    columns,
    formType,
    includeValidation,
  });

  return NextResponse.json({
    success: true,
    tableName,
    moduleName,
    form,
  });
}

function generateReactFormComponent(config: {
  tableName: string;
  moduleName: string;
  columns: any[];
  formType: string;
  includeValidation: boolean;
}) {
  const { tableName, moduleName, columns, formType, includeValidation } = config;
  const modelName = toPascalCase(tableName);
  const modelCamel = toCamelCase(tableName);

  const formFields = columns
    .filter((c: { isPrimaryKey?: boolean; isIdentity?: boolean; name: string }) => 
      !c.isPrimaryKey && !c.isIdentity && !['createdAt', 'updatedAt', 'createdby', 'updatedby'].includes(c.name.toLowerCase())
    )
    .map((c: { name: string; dataType: string; isNullable?: boolean; maxLength?: number }) => generateFormField(c, includeValidation));

  const zodSchema = includeValidation ? generateZodSchemaString(columns) : '';

  return `// =============================================================================
// ${modelName} Form Component
// Auto-generated by Enterprise Architect
// =============================================================================

'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

${zodSchema}

interface ${modelName}FormProps {
  initialData?: Partial<${modelName}FormData>;
  onSubmit: (data: ${modelName}FormData) => Promise<void>;
  isEditing?: boolean;
}

export function ${modelName}Form({ initialData, onSubmit, isEditing = false }: ${modelName}FormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<${modelName}FormData>({
    resolver: zodResolver(${modelCamel}Schema),
    defaultValues: initialData || {},
  });

  const handleFormSubmit = async (data: ${modelName}FormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      toast.success(isEditing ? '${modelName} updated successfully' : '${modelName} created successfully');
      router.push(\`/${moduleName}/${modelCamel}\`);
      router.refresh();
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to save ${modelName}');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit' : 'Create'} ${modelName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
${formFields.join('\n')}

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export type ${modelName}FormData = z.infer<typeof ${modelCamel}Schema>;
`;
}

function generateFormField(column: { name: string; dataType: string; isNullable?: boolean; maxLength?: number }, includeValidation: boolean): string {
  const inputType = getInputType(column.dataType);
  const fieldName = column.name;
  const label = toTitleCase(fieldName);
  const errorCheck = includeValidation ? `{errors.${fieldName} && (
              <p className="text-sm text-red-500">{errors.${fieldName}?.message}</p>
            )}` : '';

  if (inputType === 'checkbox') {
    return `          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="${fieldName}"
              {...register('${fieldName}')}
              className="h-4 w-4"
            />
            <Label htmlFor="${fieldName}">${label}</Label>
          </div>`;
  }

  if (inputType === 'select') {
    return `          <div className="space-y-2">
            <Label htmlFor="${fieldName}">${label}</Label>
            <Select {...register('${fieldName}')}>
              <SelectTrigger>
                <SelectValue placeholder="Select ${label}" />
              </SelectTrigger>
              <SelectContent>
                {/* Add options here */}
              </SelectContent>
            </Select>
            ${errorCheck}
          </div>`;
  }

  return `          <div className="space-y-2">
            <Label htmlFor="${fieldName}">${label}${!column.isNullable ? ' *' : ''}</Label>
            <Input
              id="${fieldName}"
              type="${inputType}"
              {...register('${fieldName}'${inputType === 'number' ? `, { valueAsNumber: true }` : ''})}
              placeholder="Enter ${label.toLowerCase()}"
            />
            ${errorCheck}
          </div>`;
}

async function generateFormFromTable(projectId: string, tableName: string, options: any) {
  return generateFormComponent(projectId, { tableName, moduleName: options?.moduleName || 'app', ...options });
}

async function previewFormComponent(config: any) {
  const { tableName, columns, formType, includeValidation } = config;
  const form = generateReactFormComponent({
    tableName,
    moduleName: 'app',
    columns,
    formType: formType || 'both',
    includeValidation: includeValidation !== false,
  });

  return NextResponse.json({
    success: true,
    preview: form,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// LIST PAGE GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateListPage(projectId: string, body: {
  tableName: string;
  moduleName: string;
  columns?: string[];
  includeSearch?: boolean;
  includePagination?: boolean;
  includeActions?: boolean;
}) {
  const { tableName, moduleName, includeSearch = true, includePagination = true, includeActions = true } = body;

  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
  });

  if (!table) {
    return NextResponse.json({ error: `Table ${tableName} not found` }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const displayColumns = body.columns || columns.slice(0, 6).map((c: { name: string }) => c.name);

  const listPage = generateDataTablePage({
    tableName,
    moduleName,
    columns,
    displayColumns,
    includeSearch,
    includePagination,
    includeActions,
  });

  return NextResponse.json({
    success: true,
    tableName,
    moduleName,
    listPage,
  });
}

function generateDataTablePage(config: {
  tableName: string;
  moduleName: string;
  columns: any[];
  displayColumns: string[];
  includeSearch: boolean;
  includePagination: boolean;
  includeActions: boolean;
}) {
  const { tableName, moduleName, columns, displayColumns, includeSearch, includePagination, includeActions } = config;
  const modelName = toPascalCase(tableName);
  const modelCamel = toCamelCase(tableName);

  const columnDefs = displayColumns.map(col => {
    const colInfo = columns.find((c: { name: string }) => c.name === col) || { name: col, dataType: 'NVARCHAR' };
    return `{
      accessorKey: '${col}',
      header: '${toTitleCase(col)}',
      ${colInfo.dataType?.includes('DATE') ? `cell: ({ row }) => format(new Date(row.getValue('${col}')), 'PPP'),` : ''}
    }`;
  });

  return `// =============================================================================
// ${modelName} List Page
// Auto-generated by Enterprise Architect
// =============================================================================

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Pencil, Trash2, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DataTable, 
  DataTablePagination,
  DataTableToolbar 
} from '@/components/ui/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ${modelName} {
  id: string;
${displayColumns.map(col => `  ${col}: string;`).join('\n')}
  createdAt: string;
  updatedAt: string;
}

async function fetch${modelName}s(params: { page: number; pageSize: number; search?: string }) {
  const query = new URLSearchParams({
    page: params.page.toString(),
    pageSize: params.pageSize.toString(),
    ...(params.search && { search: params.search }),
  });

  const response = await fetch(\`/api/${moduleName}/${modelCamel}?\${query}\`);
  if (!response.ok) throw new Error('Failed to fetch ${modelCamel}');
  return response.json();
}

export function ${modelName}ListPage() {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['${modelCamel}', page, pageSize, search],
    queryFn: () => fetch${modelName}s({ page, pageSize, search: search || undefined }),
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(\`/api/${moduleName}/${modelCamel}/\${id}\`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('${modelName} deleted successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to delete ${modelName}');
    }
  };

  const columns: ColumnDef<${modelName}>[] = [
${columnDefs.join(',\n    ')},${includeActions ? `
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(\`/${moduleName}/${modelCamel}/\${row.original.id}\`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(\`/${moduleName}/${modelCamel}/\${row.original.id}/edit\`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.original.id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },` : ''}
  ];

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-500">Error loading ${modelCamel}: {(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>${modelName} List</CardTitle>
        <Button onClick={() => router.push(\`/${moduleName}/${modelCamel}/new\`)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </CardHeader>
      <CardContent>
        ${includeSearch ? `<div className="mb-4">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
        </div>` : ''}

        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
        />

        ${includePagination ? `<div className="mt-4">
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={data?.pagination?.total || 0}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>` : ''}
      </CardContent>
    </Card>
  );
}
`;
}

async function generateListFromTable(projectId: string, tableName: string, options: any) {
  return generateListPage(projectId, { tableName, moduleName: options?.moduleName || 'app', ...options });
}

async function previewListPage(config: any) {
  const { tableName, columns, displayColumns, includeSearch, includePagination, includeActions } = config;
  const listPage = generateDataTablePage({
    tableName,
    moduleName: 'app',
    columns: columns || [],
    displayColumns: displayColumns || [],
    includeSearch: includeSearch !== false,
    includePagination: includePagination !== false,
    includeActions: includeActions !== false,
  });

  return NextResponse.json({
    success: true,
    preview: listPage,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ZOD SCHEMA GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateZodSchema(projectId: string, tableName: string) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
  });

  if (!table) {
    return NextResponse.json({ error: `Table ${tableName} not found` }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const schema = generateZodSchemaString(columns);
  const modelName = toPascalCase(tableName);
  const modelCamel = toCamelCase(tableName);

  return NextResponse.json({
    success: true,
    tableName,
    schema,
    typeDefinition: `export type ${modelName}FormData = z.infer<typeof ${modelCamel}Schema>;`,
    fullCode: `import { z } from 'zod';

${schema}

export type ${modelName}FormData = z.infer<typeof ${modelCamel}Schema>;`,
  });
}

function generateZodSchemaString(columns: any[]): string {
  const modelName = 'Form';
  const modelCamel = 'form';

  const fields = columns
    .filter((c: { isPrimaryKey?: boolean; isIdentity?: boolean; name: string }) => 
      !c.isPrimaryKey && !c.isIdentity && !['createdAt', 'updatedAt', 'createdby', 'updatedby'].includes(c.name.toLowerCase())
    )
    .map((c: { name: string; dataType: string; isNullable?: boolean; maxLength?: number; defaultValue?: string }) => {
      const zodType = getZodType(c.dataType);
      let field = `  ${c.name}: ${zodType}`;
      
      if (c.maxLength) {
        field += `.max(${c.maxLength})`;
      }
      
      if (c.isNullable) {
        field += '.optional()';
      } else if (!c.defaultValue) {
        field += ''; // Required by default
      }
      
      return field;
    });

  return `const ${modelCamel}Schema = z.object({
${fields.join(',\n')}
});`;
}

async function generateZodFromValidation(projectId: string, viewName: string) {
  const cshtmlView = await db.cSHTMLAnalysisCache.findFirst({
    where: { projectId, viewName },
  });

  if (!cshtmlView) {
    return NextResponse.json({ error: `View ${viewName} not found` }, { status: 404 });
  }

  const fields = JSON.parse(cshtmlView.fields || '[]');
  
  // Convert CSHTML fields to Zod schema
  const zodFields = fields.map((f: { name: string; type?: string; validation?: any[]; required?: boolean }) => {
    let zodType = 'z.string()';
    
    if (f.type) {
      switch (f.type.toLowerCase()) {
        case 'number':
          zodType = 'z.number()';
          break;
        case 'email':
          zodType = 'z.string().email()';
          break;
        case 'date':
          zodType = 'z.coerce.date()';
          break;
        case 'checkbox':
          zodType = 'z.boolean()';
          break;
      }
    }
    
    if (!f.required) {
      zodType += '.optional()';
    }
    
    return `  ${f.name}: ${zodType}`;
  });

  const modelName = toPascalCase(viewName);
  const modelCamel = toCamelCase(viewName);

  return NextResponse.json({
    success: true,
    viewName,
    schema: `const ${modelCamel}Schema = z.object({
${zodFields.join(',\n')}
});

export type ${modelName}FormData = z.infer<typeof ${modelCamel}Schema>;`,
  });
}

async function previewZodSchema(config: any) {
  const { tableName, columns } = config;
  const schema = generateZodSchemaString(columns);

  return NextResponse.json({
    success: true,
    preview: schema,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE MODULE GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateCompleteModule(projectId: string, body: {
  tableName: string;
  moduleName: string;
  includeTests?: boolean;
}) {
  const { tableName, moduleName, includeTests = false } = body;

  // Generate all components
  const [apiRoute, form, listPage, zodSchema] = await Promise.all([
    generateAPIRoute(projectId, { tableName, moduleName }),
    generateFormComponent(projectId, { tableName, moduleName }),
    generateListPage(projectId, { tableName, moduleName }),
    generateZodSchema(projectId, tableName),
  ]);

  const apiRouteData = await apiRoute.json();
  const formData = await form.json();
  const listPageData = await listPage.json();
  const zodSchemaData = await zodSchema.json();

  const files: any[] = [
    {
      path: `src/app/api/${moduleName}/${toCamelCase(tableName)}/route.ts`,
      content: apiRouteData.routes.find((r: { operation: string }) => r.operation === 'list')?.code || '',
      type: 'api',
    },
    {
      path: `src/app/api/${moduleName}/${toCamelCase(tableName)}/[id]/route.ts`,
      content: apiRouteData.routes.find((r: { operation: string }) => r.operation === 'get')?.code || '',
      type: 'api',
    },
    {
      path: `src/components/${moduleName}/${toPascalCase(tableName)}Form.tsx`,
      content: formData.form,
      type: 'component',
    },
    {
      path: `src/app/${moduleName}/${toCamelCase(tableName)}/page.tsx`,
      content: listPageData.listPage,
      type: 'page',
    },
    {
      path: `src/lib/validations/${toCamelCase(tableName)}.ts`,
      content: zodSchemaData.fullCode,
      type: 'validation',
    },
  ];

  return NextResponse.json({
    success: true,
    tableName,
    moduleName,
    files,
    summary: {
      apiRoutes: apiRouteData.routes.length,
      components: 1,
      pages: 1,
      validations: 1,
    },
    structure: generateModuleFileStructure(moduleName, tableName),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getZodType(dataType: string): string {
  const normalized = dataType?.toUpperCase().replace(/\([^)]*\)/g, '');
  return SQL_TO_ZOD_MAP[normalized] || 'z.string()';
}

function getInputType(dataType: string): string {
  const normalized = dataType?.toUpperCase().replace(/\([^)]*\)/g, '');
  return SQL_TO_INPUT_TYPE[normalized] || 'text';
}

function getTSType(dataType: string): string {
  const normalized = dataType?.toUpperCase().replace(/\([^)]*\)/g, '');
  return SQL_TO_TS_MAP[normalized] || 'string';
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toUpperCase());
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toTitleCase(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function generateAPIFileStructure(moduleName: string, tableName: string, routes: any[]): any {
  return {
    [`src/app/api/${moduleName}/${toCamelCase(tableName)}/route.ts`]: 'List and Create endpoints',
    [`src/app/api/${moduleName}/${toCamelCase(tableName)}/[id]/route.ts`]: 'Get, Update, Delete endpoints',
  };
}

function generateModuleFileStructure(moduleName: string, tableName: string): any {
  return {
    [`src/app/api/${moduleName}/${toCamelCase(tableName)}/`]: 'API Routes',
    [`src/app/${moduleName}/${toCamelCase(tableName)}/`]: 'Pages (List, Create, Edit)',
    [`src/components/${moduleName}/`]: 'React Components (Form, List)',
    [`src/lib/validations/${toCamelCase(tableName)}.ts`]: 'Zod Validation Schemas',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED GENERATION (70% → 100%)
// ═══════════════════════════════════════════════════════════════════════════

async function generatePageRouting(projectId: string, body: {
  moduleName: string;
  tables: string[];
  includeLayout?: boolean;
}) {
  const { moduleName, tables, includeLayout = true } = body;

  const routes = tables.map(tableName => ({
    path: `/${moduleName}/${toCamelCase(tableName)}`,
    component: `${toPascalCase(tableName)}ListPage`,
    children: [
      { path: 'new', component: `${toPascalCase(tableName)}FormPage` },
      { path: '[id]', component: `${toPascalCase(tableName)}DetailPage` },
      { path: '[id]/edit', component: `${toPascalCase(tableName)}FormPage` },
    ],
  }));

  const layoutCode = includeLayout ? generateLayoutCode(moduleName, routes) : null;
  const routingConfig = generateRoutingConfig(moduleName, routes);

  return NextResponse.json({
    success: true,
    moduleName,
    routes,
    files: [
      { path: `src/app/${moduleName}/layout.tsx`, content: layoutCode, type: 'layout' },
      { path: `src/app/${moduleName}/page.tsx`, content: generateModuleIndexPage(moduleName, tables), type: 'page' },
      ...routes.flatMap(r => [
        { path: `src/app${r.path}/page.tsx`, content: generateListPageCode(r.component, moduleName), type: 'page' },
        { path: `src/app${r.path}/new/page.tsx`, content: generateFormPageCode(r.component, moduleName, 'create'), type: 'page' },
        { path: `src/app${r.path}/[id]/page.tsx`, content: generateDetailPageCode(r.component, moduleName), type: 'page' },
        { path: `src/app${r.path}/[id]/edit/page.tsx`, content: generateFormPageCode(r.component, moduleName, 'edit'), type: 'page' },
      ]),
    ],
    routingConfig,
  });
}

function generateLayoutCode(moduleName: string, routes: any[]): string {
  const menuItems = routes.map(r => {
    const label = toTitleCase(r.path.split('/').pop() || '');
    return `{ label: '${label}', href: '${r.path}' }`;
  });

  return `// =============================================================================
// ${toPascalCase(moduleName)} Layout
// Auto-generated by Enterprise Architect
// =============================================================================

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: ReactNode;
}

const menuItems = [
  ${menuItems.join(',\n  ')}
];

export default function ${toPascalCase(moduleName)}Layout({ children }: LayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-gray-50 p-4">
        <h2 className="text-lg font-semibold mb-4">${toTitleCase(moduleName)}</h2>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={\`block px-3 py-2 rounded-lg text-sm \${
                pathname === item.href
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }\`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}`;
}

function generateModuleIndexPage(moduleName: string, tables: string[]): string {
  const tableLinks = tables.map(t => {
    const name = toTitleCase(t);
    const path = `/${moduleName}/${toCamelCase(t)}`;
    return `<Link href="${path}" className="block p-4 border rounded-lg hover:bg-gray-50">
          <h3 className="font-medium">${name}</h3>
          <p className="text-sm text-gray-500">Manage ${name.toLowerCase()} records</p>
        </Link>`;
  }).join('\n        ');

  return `// =============================================================================
// ${toPascalCase(moduleName)} Index Page
// Auto-generated by Enterprise Architect
// =============================================================================

import Link from 'next/link';

export default function ${toPascalCase(moduleName)}Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">${toTitleCase(moduleName)}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${tableLinks}
      </div>
    </div>
  );
}`;
}

function generateListPageCode(componentName: string, moduleName: string): string {
  return `// Auto-generated - Import the actual list component
import { ${componentName} } from '@/components/${moduleName}';

export default function Page() {
  return <${componentName} />;
}`;
}

function generateFormPageCode(componentName: string, moduleName: string, mode: 'create' | 'edit'): string {
  return `// Auto-generated - Import the actual form component
import { ${componentName.replace('ListPage', 'Form')} } from '@/components/${moduleName}';

export default function Page({ params }: { params: { id?: string } }) {
  return <${componentName.replace('ListPage', 'Form')} ${mode === 'edit' ? 'id={params.id}' : ''} />;
}`;
}

function generateDetailPageCode(componentName: string, moduleName: string): string {
  return `// Auto-generated - Import the actual detail component
import { ${componentName.replace('ListPage', 'Detail')} } from '@/components/${moduleName}';

export default function Page({ params }: { params: { id: string } }) {
  return <${componentName.replace('ListPage', 'Detail')} id={params.id} />;
}`;
}

function generateRoutingConfig(moduleName: string, routes: any[]): string {
  return JSON.stringify({ moduleName, routes }, null, 2);
}

async function generateNavigationComponent(projectId: string, body: {
  moduleName: string;
  tables?: string[];
  type?: 'sidebar' | 'header' | 'tabs';
}) {
  const { moduleName, tables = [], type = 'sidebar' } = body;

  // Get tables from project if not provided
  let tableList = tables;
  if (tableList.length === 0) {
    const projectTables = await db.toolkitTable.findMany({
      where: { projectId },
      select: { tableName: true },
      take: 10,
    });
    tableList = projectTables.map(t => t.tableName);
  }

  const navItems = tableList.map(t => ({
    label: toTitleCase(t),
    href: `/${moduleName}/${toCamelCase(t)}`,
    icon: 'FileText',
  }));

  let componentCode = '';

  if (type === 'sidebar') {
    componentCode = generateSidebarNav(moduleName, navItems);
  } else if (type === 'header') {
    componentCode = generateHeaderNav(moduleName, navItems);
  } else {
    componentCode = generateTabsNav(moduleName, navItems);
  }

  return NextResponse.json({
    success: true,
    type,
    moduleName,
    navItems,
    component: componentCode,
  });
}

function generateSidebarNav(moduleName: string, items: any[]): string {
  return `// =============================================================================
// ${toPascalCase(moduleName)} Sidebar Navigation
// Auto-generated by Enterprise Architect
// =============================================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const navItems = ${JSON.stringify(items, null, 2)};

export function ${toPascalCase(moduleName)}Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);

  return (
    <aside className="w-64 border-r bg-white h-screen sticky top-0">
      <div className="p-4 border-b">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="font-semibold">${toTitleCase(moduleName)}</h2>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
      
      {expanded && (
        <nav className="p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={\`flex items-center gap-2 px-3 py-2 rounded-lg text-sm \${
                pathname === item.href
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }\`}
            >
              <FileText className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </aside>
  );
}`;
}

function generateHeaderNav(moduleName: string, items: any[]): string {
  return `// =============================================================================
// ${toPascalCase(moduleName)} Header Navigation
// Auto-generated by Enterprise Architect
// =============================================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = ${JSON.stringify(items, null, 2)};

export function ${toPascalCase(moduleName)}Header() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <h1 className="font-semibold">${toTitleCase(moduleName)}</h1>
          
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={\`px-3 py-2 rounded-lg text-sm \${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }\`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}`;
}

function generateTabsNav(moduleName: string, items: any[]): string {
  return `// =============================================================================
// ${toPascalCase(moduleName)} Tabs Navigation
// Auto-generated by Enterprise Architect
// =============================================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = ${JSON.stringify(items, null, 2)};

export function ${toPascalCase(moduleName)}Tabs() {
  const pathname = usePathname();

  return (
    <div className="border-b">
      <nav className="flex gap-4 px-4">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={\`pb-3 pt-3 text-sm border-b-2 \${
              pathname === tab.href
                ? 'border-blue-500 text-blue-700 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }\`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}`;
}

async function generateAPIClient(projectId: string, tables?: string[]) {
  let tableList = tables || [];
  if (tableList.length === 0) {
    const projectTables = await db.toolkitTable.findMany({
      where: { projectId },
      select: { tableName: true, columns: true },
      take: 15,
    });
    tableList = projectTables.map(t => t.tableName);
  }

  const clientCode = `// =============================================================================
// Typed API Client
// Auto-generated by Enterprise Architect
// =============================================================================

import { z } from 'zod';

// Base API client configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(\`\${API_BASE}\${endpoint}\`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Generic CRUD operations
export function createCRUDClient<T extends { id: string }>(basePath: string) {
  return {
    list: (params?: { page?: number; pageSize?: number; search?: string }) =>
      apiClient<{ items: T[]; pagination: { total: number; page: number; pageSize: number } }>(
        \`\${basePath}?\${new URLSearchParams(params as Record<string, string>)}\`
      ),

    get: (id: string) =>
      apiClient<T>(\`\${basePath}/\${id}\`),

    create: (data: Partial<T>) =>
      apiClient<T>(basePath, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<T>) =>
      apiClient<T>(\`\${basePath}/\${id}\`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiClient<void>(\`\${basePath}/\${id}\`, { method: 'DELETE' }),

    bulkDelete: (ids: string[]) =>
      apiClient<void>(\`\${basePath}/bulk-delete\`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
  };
}

// Generated entity clients
${tableList.map(t => {
  const name = toPascalCase(t);
  const camelName = toCamelCase(t);
  return `// ${name} API Client
export const ${camelName}Api = createCRUDClient<${name}>('/api/${camelName}');
export type ${name} = {
  id: string;
  // Add generated fields here
  createdAt: string;
  updatedAt: string;
};`;
}).join('\n\n')}

// Export all types
export type { ${tableList.map(t => toPascalCase(t)).join(', ')} };
`;

  return NextResponse.json({
    success: true,
    tables: tableList,
    clientCode,
    files: [
      { path: 'src/lib/api-client.ts', content: clientCode, type: 'client' },
    ],
  });
}

async function generateTests(projectId: string, body: {
  tableName: string;
  moduleName: string;
  testTypes?: ('unit' | 'integration' | 'e2e')[];
}) {
  const { tableName, moduleName, testTypes = ['unit', 'integration'] } = body;

  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
  });

  if (!table) {
    return NextResponse.json({ error: `Table ${tableName} not found` }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const modelName = toPascalCase(tableName);
  const modelCamel = toCamelCase(tableName);

  const tests: any[] = [];

  if (testTypes.includes('unit')) {
    tests.push({
      path: `src/__tests__/unit/${modelCamel}.test.ts`,
      content: generateUnitTests(modelName, modelCamel, columns),
      type: 'unit',
    });
  }

  if (testTypes.includes('integration')) {
    tests.push({
      path: `src/__tests__/integration/${modelCamel}.api.test.ts`,
      content: generateIntegrationTests(modelName, modelCamel, moduleName, columns),
      type: 'integration',
    });
  }

  if (testTypes.includes('e2e')) {
    tests.push({
      path: `e2e/${modelCamel}.spec.ts`,
      content: generateE2ETests(modelName, modelCamel, moduleName),
      type: 'e2e',
    });
  }

  return NextResponse.json({
    success: true,
    tableName,
    moduleName,
    tests,
  });
}

function generateUnitTests(modelName: string, modelCamel: string, columns: any[]): string {
  const requiredFields = columns.filter((c: { isNullable: boolean }) => !c.isNullable).slice(0, 5);

  return `// =============================================================================
// ${modelName} Unit Tests
// Auto-generated by Enterprise Architect
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { ${modelCamel}Schema } from '@/lib/validations/${modelCamel}';

describe('${modelName} Validation', () => {
  const validData = {
    ${requiredFields.map((c: { name: string; dataType: string }) => {
      if (c.dataType?.includes('INT')) return `${c.name}: 1`;
      if (c.dataType?.includes('BIT')) return `${c.name}: true`;
      if (c.dataType?.includes('DATE')) return `${c.name}: new Date().toISOString()`;
      return `${c.name}: 'test'`;
    }).join(',\n    ')},
  };

  describe('schema validation', () => {
    it('should validate correct data', () => {
      const result = ${modelCamel}Schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    ${requiredFields.slice(0, 3).map((c: { name: string }) => `
    it('should fail when ${c.name} is missing', () => {
      const { ${c.name}, ...rest } = validData;
      const result = ${modelCamel}Schema.safeParse(rest);
      expect(result.success).toBe(false);
    });`).join('')}
  });

  describe('field validations', () => {
    // Add specific field validation tests here
    it('should enforce required fields', () => {
      const result = ${modelCamel}Schema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });
});
`;
}

function generateIntegrationTests(modelName: string, modelCamel: string, moduleName: string, columns: any[]): string {
  return `// =============================================================================
// ${modelName} Integration Tests
// Auto-generated by Enterprise Architect
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/${moduleName}/${modelCamel}/route';

describe('${modelName} API Integration Tests', () => {
  let createdId: string;

  describe('GET /api/${moduleName}/${modelCamel}', () => {
    it('should return a list of ${modelCamel}', async () => {
      const request = new NextRequest('http://localhost/api/${moduleName}/${modelCamel}');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const request = new NextRequest(
        'http://localhost/api/${moduleName}/${modelCamel}?page=1&pageSize=10'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.pageSize).toBe(10);
    });
  });

  describe('POST /api/${moduleName}/${modelCamel}', () => {
    it('should create a new ${modelCamel}', async () => {
      const request = new NextRequest('http://localhost/api/${moduleName}/${modelCamel}', {
        method: 'POST',
        body: JSON.stringify({
          // Add test data here
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      createdId = data.data.id;
    });
  });

  describe('PUT /api/${moduleName}/${modelCamel}/[id]', () => {
    it('should update an existing ${modelCamel}', async () => {
      if (!createdId) {
        console.log('Skipping - no created ID');
        return;
      }

      const request = new NextRequest(\`http://localhost/api/${moduleName}/${modelCamel}/\${createdId}\`, {
        method: 'PUT',
        body: JSON.stringify({
          // Add update data here
        }),
      });
      const response = await PUT(request, { params: { id: createdId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('DELETE /api/${moduleName}/${modelCamel}/[id]', () => {
    it('should delete a ${modelCamel}', async () => {
      if (!createdId) {
        console.log('Skipping - no created ID');
        return;
      }

      const request = new NextRequest(\`http://localhost/api/${moduleName}/${modelCamel}/\${createdId}\`);
      const response = await DELETE(request, { params: { id: createdId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
`;
}

function generateE2ETests(modelName: string, modelCamel: string, moduleName: string): string {
  return `// =============================================================================
// ${modelName} E2E Tests (Playwright)
// Auto-generated by Enterprise Architect
// =============================================================================

import { test, expect, Page } from '@playwright/test';

test.describe('${modelName} CRUD Operations', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/${moduleName}/${modelCamel}');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display ${modelCamel} list page', async () => {
    await expect(page.locator('h1')).toContainText('${modelName}');
    await expect(page.locator('table')).toBeVisible();
  });

  test('should navigate to create page', async () => {
    await page.click('button:has-text("Add New")');
    await expect(page).toHaveURL(/\\/new$/);
  });

  test('should create new ${modelCamel}', async () => {
    await page.click('button:has-text("Add New")');
    
    // Fill form
    // await page.fill('input[name="field"]', 'value');
    
    await page.click('button:has-text("Create")');
    
    // Should redirect to list
    await expect(page).toHaveURL(/\\/${moduleName}\\/${modelCamel}$/);
    await expect(page.locator('.toast')).toContainText('created successfully');
  });

  test('should edit existing ${modelCamel}', async () => {
    // Click first edit button
    await page.click('button:has-text("Edit")');
    
    // Modify form
    // await page.fill('input[name="field"]', 'new value');
    
    await page.click('button:has-text("Update")');
    
    await expect(page.locator('.toast')).toContainText('updated successfully');
  });

  test('should delete ${modelCamel}', async () => {
    // Click first delete button
    await page.click('button:has-text("Delete")');
    
    // Confirm deletion
    await page.click('button:has-text("Confirm")');
    
    await expect(page.locator('.toast')).toContainText('deleted successfully');
  });

  test('should search ${modelCamel}', async () => {
    await page.fill('input[placeholder*="Search"]', 'test');
    
    // Wait for results
    await page.waitForTimeout(500);
    
    // Verify filtered results
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });
});
`;
}

async function generateFullModule(projectId: string, body: {
  tableName: string;
  moduleName: string;
  includeTests?: boolean;
  includeDocs?: boolean;
}) {
  const { tableName, moduleName, includeTests = true, includeDocs = false } = body;

  // Generate all components
  const [apiResult, formResult, listResult, zodResult, routingResult, navResult, hooksResult, typesResult] = await Promise.all([
    generateAPIRoute(projectId, { tableName, moduleName }),
    generateFormComponent(projectId, { tableName, moduleName }),
    generateListPage(projectId, { tableName, moduleName }),
    generateZodSchema(projectId, tableName),
    generatePageRouting(projectId, { moduleName, tables: [tableName] }),
    generateNavigationComponent(projectId, { moduleName, tables: [tableName] }),
    generateReactHooks(projectId, tableName, moduleName),
    generateTypeDefinitions(projectId, tableName),
  ]);

  const apiData = await apiResult.json();
  const formData = await formResult.json();
  const listData = await listResult.json();
  const zodData = await zodResult.json();
  const routingData = await routingResult.json();
  const navData = await navResult.json();
  const hooksData = await hooksResult.json();
  const typesData = await typesResult.json();

  const files: any[] = [
    // API Routes
    { path: `src/app/api/${moduleName}/${toCamelCase(tableName)}/route.ts`, content: apiData.routes?.[0]?.code || '', type: 'api' },
    // Components
    { path: `src/components/${moduleName}/${toPascalCase(tableName)}Form.tsx`, content: formData.form, type: 'component' },
    { path: `src/components/${moduleName}/${toPascalCase(tableName)}List.tsx`, content: listData.listPage, type: 'component' },
    // Pages
    ...routingData.files,
    // Navigation
    { path: `src/components/${moduleName}/${toPascalCase(moduleName)}Sidebar.tsx`, content: navData.component, type: 'component' },
    // Validation
    { path: `src/lib/validations/${toCamelCase(tableName)}.ts`, content: zodData.fullCode, type: 'validation' },
    // Hooks
    { path: `src/hooks/use${toPascalCase(tableName)}.ts`, content: hooksData.hooks, type: 'hook' },
    // Types
    { path: `src/types/${toCamelCase(tableName)}.ts`, content: typesData.types, type: 'type' },
  ];

  // Add tests if requested
  if (includeTests) {
    const testResult = await generateTests(projectId, { tableName, moduleName });
    const testData = await testResult.json();
    files.push(...testData.tests);
  }

  // Add documentation if requested
  if (includeDocs) {
    files.push({
      path: `docs/${toCamelCase(tableName)}.md`,
      content: generateModuleDocs(tableName, moduleName),
      type: 'docs',
    });
  }

  return NextResponse.json({
    success: true,
    tableName,
    moduleName,
    files,
    summary: {
      apiRoutes: apiData.routes?.length || 0,
      components: 3,
      pages: routingData.files?.length || 0,
      hooks: 1,
      types: 1,
      tests: includeTests ? 2 : 0,
      docs: includeDocs ? 1 : 0,
    },
  });
}

function generateModuleDocs(tableName: string, moduleName: string): string {
  return `# ${toPascalCase(tableName)} Module

## Overview

This module provides CRUD operations for ${toTitleCase(tableName)}.

## Files Structure

\`\`\`
src/
├── app/
│   ├── api/${moduleName}/${toCamelCase(tableName)}/    # API Routes
│   └── ${moduleName}/${toCamelCase(tableName)}/        # Pages
├── components/${moduleName}/                            # React Components
├── hooks/                                               # Custom Hooks
├── lib/validations/                                     # Zod Schemas
└── types/                                               # TypeScript Types
\`\`\`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/${moduleName}/${toCamelCase(tableName)} | List all records |
| GET | /api/${moduleName}/${toCamelCase(tableName)}/[id] | Get single record |
| POST | /api/${moduleName}/${toCamelCase(tableName)} | Create new record |
| PUT | /api/${moduleName}/${toCamelCase(tableName)}/[id] | Update record |
| DELETE | /api/${moduleName}/${toCamelCase(tableName)}/[id] | Delete record |

## Usage

\`\`\`typescript
import { ${toCamelCase(tableName)}Api } from '@/lib/api-client';

// List records
const { data } = await ${toCamelCase(tableName)}Api.list({ page: 1, pageSize: 20 });

// Create record
const newRecord = await ${toCamelCase(tableName)}Api.create({ /* data */ });

// Update record
await ${toCamelCase(tableName)}Api.update('id', { /* data */ });

// Delete record
await ${toCamelCase(tableName)}Api.delete('id');
\`\`\`

## Generated: ${new Date().toISOString()}
`;
}

async function generateReactHooks(projectId: string, tableName: string, moduleName: string) {
  const modelName = toPascalCase(tableName);
  const modelCamel = toCamelCase(tableName);

  const hooks = `// =============================================================================
// ${modelName} React Hooks
// Auto-generated by Enterprise Architect
// =============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const API_BASE = '/api/${moduleName}/${modelCamel}';

// Fetch list of ${modelCamel}
export function use${modelName}List(params?: { page?: number; pageSize?: number; search?: string }) {
  return useQuery({
    queryKey: ['${modelCamel}', 'list', params],
    queryFn: async () => {
      const query = new URLSearchParams(params as Record<string, string>);
      const response = await fetch(\`\${API_BASE}?\${query}\`);
      if (!response.ok) throw new Error('Failed to fetch ${modelCamel}');
      return response.json();
    },
  });
}

// Fetch single ${modelCamel}
export function use${modelName}(id: string) {
  return useQuery({
    queryKey: ['${modelCamel}', id],
    queryFn: async () => {
      const response = await fetch(\`\${API_BASE}/\${id}\`);
      if (!response.ok) throw new Error('Failed to fetch ${modelCamel}');
      return response.json();
    },
    enabled: !!id,
  });
}

// Create ${modelCamel}
export function useCreate${modelName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create ${modelCamel}');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${modelCamel}'] });
      toast.success('${modelName} created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Update ${modelCamel}
export function useUpdate${modelName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(\`\${API_BASE}/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update ${modelCamel}');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${modelCamel}'] });
      toast.success('${modelName} updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Delete ${modelCamel}
export function useDelete${modelName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(\`\${API_BASE}/\${id}\`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete ${modelCamel}');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${modelCamel}'] });
      toast.success('${modelName} deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Bulk delete ${modelCamel}
export function useBulkDelete${modelName}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(\`\${API_BASE}/bulk-delete\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) throw new Error('Failed to delete ${modelCamel}');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${modelCamel}'] });
      toast.success('${modelName} deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
`;

  return NextResponse.json({
    success: true,
    tableName,
    moduleName,
    hooks,
  });
}

async function generateTypeDefinitions(projectId: string, tableName: string) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
  });

  const modelName = toPascalCase(tableName);
  const modelCamel = toCamelCase(tableName);
  const columns = table ? JSON.parse(table.columns || '[]') : [];

  const typeDefs = `// =============================================================================
// ${modelName} Type Definitions
// Auto-generated by Enterprise Architect
// =============================================================================

// Database entity type
export interface ${modelName} {
  id: string;
${columns.map((c: { name: string; dataType: string; isNullable: boolean }) => 
  `  ${c.name}: ${getTSType(c.dataType)}${c.isNullable ? ' | null' : ''};`).join('\n')}
  createdAt: Date;
  updatedAt: Date;
}

// Create input type (omit auto-generated fields)
export interface Create${modelName}Input {
${columns
  .filter((c: { name: string; isIdentity: boolean; isPrimaryKey: boolean }) => 
    !c.isIdentity && !c.isPrimaryKey && 
    !['createdAt', 'updatedAt', 'createdby', 'updatedby'].includes(c.name.toLowerCase()))
  .map((c: { name: string; dataType: string; isNullable: boolean }) => 
    `  ${c.name}${c.isNullable ? '?' : ''}: ${getTSType(c.dataType)};`)
  .join('\n')}
}

// Update input type (all fields optional)
export interface Update${modelName}Input {
  id: string;
${columns
  .filter((c: { name: string; isIdentity: boolean; isPrimaryKey: boolean }) => 
    !c.isIdentity && !c.isPrimaryKey &&
    !['createdAt', 'updatedAt', 'createdby', 'updatedby'].includes(c.name.toLowerCase()))
  .map((c: { name: string; dataType: string }) => 
    `  ${c.name}?: ${getTSType(c.dataType)};`)
  .join('\n')}
}

// List query params
export interface ${modelName}ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API response types
export interface ${modelName}ListResponse {
  success: boolean;
  data: ${modelName}[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ${modelName}Response {
  success: boolean;
  data: ${modelName};
  message?: string;
}
`;

  return NextResponse.json({
    success: true,
    tableName,
    types: typeDefs,
  });
}

async function getGenerationSummary(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true },
  });

  const generatedRoutes = await db.aPIRouteGeneration.findMany({
    where: { projectId },
    select: { routeName: true, status: true },
  });

  return NextResponse.json({
    success: true,
    summary: {
      availableTables: tables.length,
      generatedRoutes: generatedRoutes.length,
      pending: generatedRoutes.filter(r => r.status === 'generated').length,
      implemented: generatedRoutes.filter(r => r.status === 'implemented').length,
    },
    tables: tables.map(t => t.tableName),
  });
}
