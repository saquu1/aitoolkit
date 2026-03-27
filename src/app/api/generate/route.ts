/**
 * Code Generation API Route
 * 
 * Handles generation requests for:
 * - React Form Components
 * - React Data Table Components
 * - Full CRUD Pages
 * - API Routes (CRUD, Dropdowns, Cascade)
 * - Validation Schemas
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateReactForm, generateModelForm } from '@/lib/generators/react-form-generator';
import { generateReactTable, generateModelTable } from '@/lib/generators/react-table-generator';
import { generatePages, generateFullCRUD } from '@/lib/generators/react-page-generator';
import { generatePrismaSchema } from '@/lib/generators/prisma-generator';
import { generateTypeScriptTypes, generateModelTypeScript } from '@/lib/generators/typescript-generator';
import { generateZodSchemas, generateModelZod } from '@/lib/generators/zod-generator';
import { 
  generateAPIRoutes, 
  generateAllAPIRoutes,
  generateCascadeDropdownRoute 
} from '@/lib/generators/api-route-generator';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface GenerateRequest {
  projectId: string;
  tableName?: string;
  artifactType: 'form' | 'table' | 'page' | 'full-crud' | 'prisma' | 'typescript' | 'zod' | 'api' | 'api-all' | 'all';
  options?: Record<string, any>;
}

interface GeneratedArtifact {
  type: string;
  name: string;
  path: string;
  content: string;
  language: string;
}

interface GenerationResponse {
  success: boolean;
  artifacts: GeneratedArtifact[];
  errors: string[];
  warnings: string[];
  summary: {
    totalFiles: number;
    generatedAt: string;
    projectId: string;
    tableName?: string;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const body: GenerateRequest = await request.json();
  const { projectId, tableName, artifactType, options = {} } = body;

  const response: GenerationResponse = {
    success: false,
    artifacts: [],
    errors: [],
    warnings: [],
    summary: {
      totalFiles: 0,
      generatedAt: new Date().toISOString(),
      projectId,
      tableName,
    },
  };

  try {
    if (!projectId) {
      response.errors.push('projectId is required');
      return NextResponse.json(response, { status: 400 });
    }

    switch (artifactType) {
      case 'form':
        await handleFormGeneration(projectId, tableName!, options, response);
        break;
      case 'table':
        await handleTableGeneration(projectId, tableName!, options, response);
        break;
      case 'page':
        await handlePageGeneration(projectId, tableName!, options, response);
        break;
      case 'full-crud':
        await handleFullCRUDGeneration(projectId, tableName!, options, response);
        break;
      case 'prisma':
        await handlePrismaGeneration(projectId, tableName, options, response);
        break;
      case 'typescript':
        await handleTypeScriptGeneration(projectId, tableName, options, response);
        break;
      case 'zod':
        await handleZodGeneration(projectId, tableName, options, response);
        break;
      case 'api':
        await handleAPIGeneration(projectId, tableName!, options, response);
        break;
      case 'api-all':
        await handleAllAPIGeneration(projectId, options, response);
        break;
      case 'all':
        await handleAllGeneration(projectId, tableName!, options, response);
        break;
      default:
        response.errors.push(`Unknown artifact type: ${artifactType}`);
    }

    response.success = response.errors.length === 0;
    response.summary.totalFiles = response.artifacts.length;

  } catch (error: any) {
    response.errors.push(`Generation failed: ${error.message}`);
  }

  return NextResponse.json(response);
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERATION HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Handle form component generation
 */
async function handleFormGeneration(
  projectId: string,
  tableName: string,
  options: Record<string, any>,
  response: GenerationResponse
): Promise<void> {
  if (!tableName) {
    response.errors.push('tableName is required for form generation');
    return;
  }

  const result = await generateModelForm(projectId, tableName, options);

  if (result.errors.length > 0) {
    response.errors.push(...result.errors);
    return;
  }

  response.artifacts.push({
    type: 'component',
    name: `${tableName}-form.tsx`,
    path: `components/forms/${kebabCase(tableName)}-form.tsx`,
    content: result.component,
    language: 'typescript',
  });

  if (result.types) {
    response.artifacts.push({
      type: 'types',
      name: `${tableName}-form-types.ts`,
      path: `types/forms/${kebabCase(tableName)}-form.ts`,
      content: result.types,
      language: 'typescript',
    });
  }
}

/**
 * Handle data table generation
 */
async function handleTableGeneration(
  projectId: string,
  tableName: string,
  options: Record<string, any>,
  response: GenerationResponse
): Promise<void> {
  if (!tableName) {
    response.errors.push('tableName is required for table generation');
    return;
  }

  const result = await generateModelTable(projectId, tableName, options);

  if (result.errors.length > 0) {
    response.errors.push(...result.errors);
    return;
  }

  response.artifacts.push({
    type: 'component',
    name: `${tableName}-table.tsx`,
    path: `components/tables/${kebabCase(tableName)}-table.tsx`,
    content: result.component,
    language: 'typescript',
  });

  if (result.types) {
    response.artifacts.push({
      type: 'types',
      name: `${tableName}-table-types.ts`,
      path: `types/tables/${kebabCase(tableName)}-table.ts`,
      content: result.types,
      language: 'typescript',
    });
  }
}

/**
 * Handle page generation
 */
async function handlePageGeneration(
  projectId: string,
  tableName: string,
  options: Record<string, any>,
  response: GenerationResponse
): Promise<void> {
  if (!tableName) {
    response.errors.push('tableName is required for page generation');
    return;
  }

  const result = await generatePages({
    projectId,
    tableName,
    pageType: options.pageType || 'list',
    ...options,
  });

  if (result.errors.length > 0) {
    response.errors.push(...result.errors);
    return;
  }

  for (const page of result.pages) {
    response.artifacts.push({
      type: page.type,
      name: page.path.split('/').pop() || 'page.tsx',
      path: page.path,
      content: page.content,
      language: 'typescript',
    });
  }
}

/**
 * Handle full CRUD generation
 */
async function handleFullCRUDGeneration(
  projectId: string,
  tableName: string,
  options: Record<string, any>,
  response: GenerationResponse
): Promise<void> {
  if (!tableName) {
    response.errors.push('tableName is required for full CRUD generation');
    return;
  }

  // Generate all artifacts
  const result = await generateFullCRUD(projectId, tableName, options);

  if (result.errors.length > 0) {
    response.errors.push(...result.errors);
  }

  for (const page of result.pages) {
    response.artifacts.push({
      type: page.type,
      name: page.path.split('/').pop() || 'page.tsx',
      path: page.path,
      content: page.content,
      language: 'typescript',
    });
  }

  // Also generate form and table components
  const formResult = await generateModelForm(projectId, tableName, options);
  if (formResult.component) {
    response.artifacts.push({
      type: 'component',
      name: `${tableName}-form.tsx`,
      path: `components/forms/${kebabCase(tableName)}-form.tsx`,
      content: formResult.component,
      language: 'typescript',
    });
  }

  const tableResult = await generateModelTable(projectId, tableName, options);
  if (tableResult.component) {
    response.artifacts.push({
      type: 'component',
      name: `${tableName}-table.tsx`,
      path: `components/tables/${kebabCase(tableName)}-table.tsx`,
      content: tableResult.component,
      language: 'typescript',
    });
  }
}

/**
 * Handle Prisma schema generation
 */
async function handlePrismaGeneration(
  projectId: string,
  tableName: string | undefined,
  options: Record<string, any>,
  response: GenerationResponse
): Promise<void> {
  const result = await generatePrismaSchema({
    projectId,
    database: options.database || 'sqlite',
    includeAuditFields: true,
    includeRelations: true,
    includeIndexes: true,
    includeDocumentation: true,
    ...options,
  });

  if (result.errors.length > 0) {
    response.errors.push(...result.errors);
    return;
  }

  response.artifacts.push({
    type: 'schema',
    name: 'schema.prisma',
    path: 'prisma/schema.prisma',
    content: result.schema,
    language: 'prisma',
  });

  response.warnings.push(...result.warnings);
}

/**
 * Handle TypeScript types generation
 */
async function handleTypeScriptGeneration(
  projectId: string,
  tableName: string | undefined,
  options: Record<string, any>,
  response: GenerationResponse
): Promise<void> {
  const config = {
    projectId,
    tableName,
    includeRelations: true,
    includeEnums: true,
    includeUtils: true,
    ...options,
  };

  const result = await generateTypeScriptTypes(config);

  if (result.errors.length > 0) {
    response.errors.push(...result.errors);
    return;
  }

  response.artifacts.push({
    type: 'types',
    name: tableName ? `${tableName}.ts` : 'types.ts',
    path: tableName ? `types/${kebabCase(tableName)}.ts` : 'types/index.ts',
    content: result.content,
    language: 'typescript',
  });

  response.warnings.push(...result.warnings);
}

/**
 * Handle Zod schemas generation
 */
async function handleZodGeneration(
  projectId: string,
  tableName: string | undefined,
  options: Record<string, any>,
  response: GenerationResponse
): Promise<void> {
  const config = {
    projectId,
    tableName,
    includeCreateSchema: true,
    includeUpdateSchema: true,
    includeIdSchema: true,
    includeMessages: true,
    ...options,
  };

  const result = await generateZodSchemas(config);

  if (result.errors.length > 0) {
    response.errors.push(...result.errors);
    return;
  }

  response.artifacts.push({
    type: 'validation',
    name: tableName ? `${tableName}.ts` : 'validations.ts',
    path: tableName ? `lib/validations/${kebabCase(tableName)}.ts` : 'lib/validations/index.ts',
    content: result.content,
    language: 'typescript',
  });

  response.warnings.push(...result.warnings);
}

/**
 * Handle all artifacts generation
 */
async function handleAllGeneration(
  projectId: string,
  tableName: string,
  options: Record<string, any>,
  response: GenerationResponse
): Promise<void> {
  // Generate everything
  await handlePrismaGeneration(projectId, tableName, options, response);
  await handleTypeScriptGeneration(projectId, tableName, options, response);
  await handleZodGeneration(projectId, tableName, options, response);
  await handleFormGeneration(projectId, tableName, options, response);
  await handleTableGeneration(projectId, tableName, options, response);
  await handlePageGeneration(projectId, tableName, { ...options, pageType: 'full-crud' }, response);
  await handleAPIGeneration(projectId, tableName, options, response);
}

/**
 * Handle API route generation for a single table
 */
async function handleAPIGeneration(
  projectId: string,
  tableName: string,
  options: Record<string, any>,
  response: GenerationResponse
): Promise<void> {
  if (!tableName) {
    response.errors.push('tableName is required for API route generation');
    return;
  }

  const result = await generateAPIRoutes({
    projectId,
    tableName,
    includeSearch: options.includeSearch !== false,
    includeFilter: options.includeFilter !== false,
    includePagination: options.includePagination !== false,
    includeRelations: options.includeRelations !== false,
    includeBulkOperations: options.includeBulkOperations !== false,
    includeDropdownAPI: options.includeDropdownAPI !== false,
    defaultPageSize: options.defaultPageSize || 20,
    maxPageSize: options.maxPageSize || 100,
    ...options,
  });

  if (result.errors.length > 0) {
    response.errors.push(...result.errors);
  }

  // Add each generated route as an artifact
  for (const route of result.routes) {
    response.artifacts.push({
      type: 'api',
      name: route.path.split('/').pop() || 'route.ts',
      path: route.path,
      content: route.content,
      language: 'typescript',
    });
  }

  // Add generated types if available
  if (result.types) {
    response.artifacts.push({
      type: 'types',
      name: `${tableName}-api-types.ts`,
      path: `types/api/${kebabCase(tableName)}.ts`,
      content: result.types,
      language: 'typescript',
    });
  }

  response.warnings.push(...result.warnings);
}

/**
 * Handle API route generation for all tables
 */
async function handleAllAPIGeneration(
  projectId: string,
  options: Record<string, any>,
  response: GenerationResponse
): Promise<void> {
  const result = await generateAllAPIRoutes({
    projectId,
    includeDropdowns: options.includeDropdowns !== false,
    includeBulk: options.includeBulk !== false,
    includeCascade: options.includeCascade !== false,
    defaultPageSize: options.defaultPageSize || 20,
    maxPageSize: options.maxPageSize || 100,
  });

  if (result.errors.length > 0) {
    response.errors.push(...result.errors);
  }

  // Add each generated route as an artifact
  for (const route of result.routes) {
    response.artifacts.push({
      type: 'api',
      name: route.path.split('/').pop() || 'route.ts',
      path: route.path,
      content: route.content,
      language: 'typescript',
    });
  }

  response.warnings.push(...result.warnings);
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

function kebabCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]/g, '-')
    .toLowerCase();
}

// ══════════════════════════════════════════════════════════════════════════════
// GET HANDLER - Get generation status
// ══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');
  const tableName = searchParams.get('tableName');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // Return generation options and status
  return NextResponse.json({
    projectId,
    tableName,
    availableArtifactTypes: [
      { type: 'form', description: 'React form component with React Hook Form' },
      { type: 'table', description: 'Data table with TanStack Table' },
      { type: 'page', description: 'CRUD page (list, create, edit, detail)' },
      { type: 'full-crud', description: 'Complete CRUD with all pages and components' },
      { type: 'prisma', description: 'Prisma schema' },
      { type: 'typescript', description: 'TypeScript type definitions' },
      { type: 'zod', description: 'Zod validation schemas' },
      { type: 'api', description: 'API routes for a single table (CRUD, dropdowns)' },
      { type: 'api-all', description: 'API routes for all tables in project' },
      { type: 'all', description: 'All artifacts combined' },
    ],
    supportedOptions: {
      form: {
        formType: ['create', 'edit', 'both'],
        useModal: ['true', 'false'],
        responsiveLayout: ['true', 'false'],
        columns: [1, 2, 3],
      },
      table: {
        includeActions: ['true', 'false'],
        includeSearch: ['true', 'false'],
        includePagination: ['true', 'false'],
        includeExport: ['true', 'false'],
        pageSize: [10, 20, 50, 100],
      },
      prisma: {
        database: ['sqlite', 'mysql', 'postgresql', 'sqlserver'],
        includeAuditFields: ['true', 'false'],
        includeSoftDelete: ['true', 'false'],
      },
      api: {
        includeSearch: ['true', 'false'],
        includeFilter: ['true', 'false'],
        includePagination: ['true', 'false'],
        includeRelations: ['true', 'false'],
        includeBulkOperations: ['true', 'false'],
        includeDropdownAPI: ['true', 'false'],
        defaultPageSize: [10, 20, 50, 100],
        maxPageSize: [50, 100, 200, 500],
      },
    },
  });
}
