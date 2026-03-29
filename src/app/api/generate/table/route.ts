/**
 * Table Generation API Route
 * 
 * POST /api/generate/table
 * Generates React data table components with TanStack Table
 * 
 * Body:
 * - projectId: string (required)
 * - tableName: string (required)
 * - options: object (optional)
 *   - includeActions: boolean
 *   - includeSearch: boolean
 *   - includeFilters: boolean
 *   - includePagination: boolean
 *   - includeExport: boolean
 *   - includeRowSelection: boolean
 *   - pageSize: number
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateReactTable, type ReactTableGeneratorConfig } from '@/lib/generators/react-table-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, tableName, options = {} } = body;

    if (!projectId || !tableName) {
      return NextResponse.json(
        { error: 'projectId and tableName are required' },
        { status: 400 }
      );
    }

    const config: ReactTableGeneratorConfig = {
      projectId,
      tableName,
      includeActions: options.includeActions !== false,
      includeSearch: options.includeSearch !== false,
      includeFilters: options.includeFilters !== false,
      includePagination: options.includePagination !== false,
      includeExport: options.includeExport !== false,
      includeRowSelection: options.includeRowSelection || false,
      includeBulkActions: options.includeBulkActions || false,
      pageSize: options.pageSize || 10,
      pageSizeOptions: options.pageSizeOptions || [10, 20, 30, 50],
    };

    const result = await generateReactTable(config);

    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: 'Generation failed', details: result.errors },
        { status: 400 }
      );
    }

    // Build artifacts
    const artifacts = [
      {
        type: 'component',
        name: `${toPascalCase(tableName)}Table.tsx`,
        path: `components/tables/${kebabCase(tableName)}-table.tsx`,
        content: result.tableComponent,
        language: 'typescript',
        imports: result.imports,
      },
    ];

    if (result.columnDefs) {
      artifacts.push({
        type: 'columns',
        name: `${toPascalCase(tableName)}Columns.ts`,
        path: `lib/tables/${kebabCase(tableName)}-columns.ts`,
        content: result.columnDefs,
        language: 'typescript',
      });
    }

    if (result.types) {
      artifacts.push({
        type: 'types',
        name: `${toPascalCase(tableName)}TableTypes.ts`,
        path: `types/tables/${kebabCase(tableName)}-table.ts`,
        content: result.types,
        language: 'typescript',
      });
    }

    return NextResponse.json({
      success: true,
      artifacts,
      columns: result.columns,
      warnings: result.warnings,
      generatedAt: new Date().toISOString(),
      summary: {
        tableName,
        columnCount: result.columns.length,
        hasFKColumns: result.columns.some(c => c.cellType === 'fk'),
        hasDateColumns: result.columns.some(c => c.cellType === 'date' || c.cellType === 'datetime'),
        hasBooleanColumns: result.columns.some(c => c.cellType === 'boolean'),
      },
    });

  } catch (error: any) {
    console.error('Table generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/generate/table',
    description: 'Generate React data table components with TanStack Table',
    requiredParams: ['projectId', 'tableName'],
    options: {
      includeActions: {
        type: 'boolean',
        default: true,
        description: 'Include actions column (view, edit, delete)',
      },
      includeSearch: {
        type: 'boolean',
        default: true,
        description: 'Include global search functionality',
      },
      includeFilters: {
        type: 'boolean',
        default: true,
        description: 'Include column filters',
      },
      includePagination: {
        type: 'boolean',
        default: true,
        description: 'Include pagination controls',
      },
      includeExport: {
        type: 'boolean',
        default: true,
        description: 'Include export button',
      },
      includeRowSelection: {
        type: 'boolean',
        default: false,
        description: 'Include row selection checkboxes',
      },
      pageSize: {
        type: 'number',
        default: 10,
        description: 'Default page size',
      },
    },
    features: [
      'TanStack Table v8 integration',
      'Column definitions from UnifiedField',
      'FK lookups (show name instead of id)',
      'Date formatting',
      'Boolean badges',
      'Action column (view, edit, delete)',
      'Global search',
      'Column filters',
      'Pagination',
      'Export functionality',
      'Row selection',
      'Column visibility toggle',
    ],
    exampleRequest: {
      projectId: 'proj_abc123',
      tableName: 'Organization',
      options: {
        includeActions: true,
        includeSearch: true,
        pageSize: 20,
      },
    },
  });
}

function kebabCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]/g, '-')
    .toLowerCase();
}

function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}
