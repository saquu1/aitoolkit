import { NextRequest, NextResponse } from 'next/server';
import { parseMySQL } from '@/lib/parsers/mysql-parser';
import { parseSqlServer } from '@/lib/sql-parser';
import { 
  ReactGeneratorEngine
} from '@/lib/parsers/react-generator';
import { GapDetectionEngine } from '@/lib/parsers/gap-detector';
import { prisma } from '@/lib/db';

interface GeneratePreviewRequest {
  tableName: string;
  viewType: 'form' | 'list' | 'detail' | 'dashboard';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // Get project with tables
    const project = await prisma.toolkitProject.findUnique({
      where: { id: projectId },
      include: {
        ToolkitTable: true,
      },
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Build tables list
    const tables = project.ToolkitTable.map(t => ({
      tableName: t.tableName,
      schemaName: t.schemaName || 'dbo',
      columnCount: t.columns ? JSON.parse(t.columns as string).length : 0,
      hasFK: t.foreignKeys ? JSON.parse(t.foreignKeys as string).length > 0 : false,
    }));
    
    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body: GeneratePreviewRequest = await request.json();
    const { tableName, viewType } = body;
    
    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }
    
    // Get project with all related data
    const project = await prisma.toolkitProject.findUnique({
      where: { id: projectId },
      include: {
        ToolkitTable: true,
        ToolkitProcedure: true,
      },
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Find the target table
    const tableData = project.ToolkitTable.find(
      t => t.tableName.toLowerCase() === tableName.toLowerCase()
    );
    
    if (!tableData) {
      return NextResponse.json(
        { error: `Table "${tableName}" not found` },
        { status: 404 }
      );
    }
    
    // Parse table data from stored JSON
    const columns = tableData.columns ? JSON.parse(tableData.columns as string) : [];
    const foreignKeys = tableData.foreignKeys ? JSON.parse(tableData.foreignKeys as string) : [];
    
    // Build table definition
    const table = {
      schemaName: tableData.schemaName || 'dbo',
      tableName: tableData.tableName,
      columns: columns.map((col: any) => ({
        name: col.name,
        dataType: col.dataType,
        isNullable: col.isNullable,
        isPrimaryKey: col.isPrimaryKey,
        isIdentity: col.isIdentity,
        maxLength: col.maxLength,
      })),
      foreignKeys: foreignKeys.map((fk: any) => ({
        columnName: fk.columnName,
        referencesTable: fk.referencesTable,
        referencesColumn: fk.referencesColumn,
      })),
    };
    
    // Create mock CSHTML view for generation
    const mockCSHTMLView = {
      viewName: `${tableName}${viewType.charAt(0).toUpperCase() + viewType.slice(1)}`,
      viewType: viewType as 'form' | 'list' | 'details' | 'dashboard',
      model: {
        name: tableName,
        linkedTable: tableName,
      },
      fields: table.columns.map((col: any, idx: number) => ({
        name: col.name,
        type: inferUIType(col.dataType, col.name),
        label: formatLabel(col.name),
        required: !col.isNullable && !col.isPrimaryKey,
        cssClass: 'form-control',
        colSpan: col.dataType.toLowerCase().includes('text') ? 12 : 6,
        order: idx,
        isPrimaryKey: col.isPrimaryKey,
        isForeignKey: table.foreignKeys.some((fk: any) => fk.columnName === col.name),
        dropdownSource: table.foreignKeys.find((fk: any) => fk.columnName === col.name)?.referencesTable,
      })),
      list: viewType === 'list' ? {
        columns: table.columns.slice(0, 8).map((col: any) => ({
          field: col.name,
          header: formatLabel(col.name),
          sortable: true,
        })),
        hasSearch: true,
        hasPagination: true,
        hasActions: true,
      } : undefined,
      source: 'generated',
    };
    
    // Create mock C# result
    const mockCSharpResult = {
      fileName: `${tableName}.cs`,
      className: tableName,
      fileType: 'model' as const,
      properties: table.columns.map((col: any) => ({
        name: col.name,
        type: mapSQLTypeToCSharp(col.dataType),
        isNullable: col.isNullable,
        isPrimaryKey: col.isPrimaryKey,
        isForeignKey: table.foreignKeys.some((fk: any) => fk.columnName === col.name),
        foreignKeyTarget: table.foreignKeys.find((fk: any) => fk.columnName === col.name)?.referencesTable,
        validations: [],
        display: {
          name: formatLabel(col.name),
          prompt: `Enter ${formatLabel(col.name).toLowerCase()}`,
        },
      })),
      relationships: table.foreignKeys.map((fk: any) => ({
        propertyName: fk.referencesTable,
        relatedEntity: fk.referencesTable,
        relationshipType: 'many-to-one' as const,
        foreignKeyProperty: fk.columnName,
      })),
      inferredTable: tableName,
    };
    
    // Run gap detection (optional, for better intelligence)
    const gapDetector = new GapDetectionEngine();
    const gapResult = gapDetector.detect(
      [mockCSharpResult],
      [table],
      [mockCSHTMLView as any]
    );
    
    // Generate components
    const generator = new ReactGeneratorEngine({
      styleSystem: 'tailwind',
      componentLibrary: 'shadcn',
      includeValidations: true,
      includeTypeScript: true,
      stateManagement: 'react-hook-form',
      dataFetching: 'tanstack-query',
      router: 'next-app',
      useArrowFunctions: true,
      includeComments: true,
    });
    
    const result = generator.generate(
      [mockCSharpResult as any],
      [table],
      [mockCSHTMLView as any],
      gapResult
    );
    
    // Filter to only the requested view type
    const filteredComponents = result.components.filter(
      c => c.viewType === viewType
    );
    
    return NextResponse.json({
      components: filteredComponents.length > 0 ? filteredComponents : result.components.slice(0, 1),
      sharedTypes: result.sharedTypes,
      apiClient: result.apiClient,
      validationSchemas: result.validationSchemas,
      summary: {
        totalComponents: result.components.length,
        totalFiles: result.summary.totalFiles,
        totalLOC: result.summary.totalLOC,
      },
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}

// Helper functions
function inferUIType(dataType: string, columnName: string): string {
  const dt = dataType.toLowerCase();
  const cn = columnName.toLowerCase();
  
  // Semantic type inference
  if (cn.includes('email')) return 'email_input';
  if (cn.includes('password')) return 'password_input';
  if (cn.includes('phone') || cn.includes('fax')) return 'phone_input';
  if (cn.includes('url') || cn.includes('website')) return 'url_input';
  if (cn.includes('photo') || cn.includes('image') || cn.includes('avatar')) return 'image_upload';
  if (cn.includes('file') || cn.includes('document') || cn.includes('attachment')) return 'file_upload';
  if (cn.includes('description') || cn.includes('notes') || cn.includes('comment')) return 'textarea';
  if (cn.includes('is') || cn.includes('has') || cn.includes('active')) return 'toggle';
  if (cn.includes('status') || cn.includes('type') || cn.includes('category')) return 'dropdown';
  if (cn.includes('price') || cn.includes('amount') || cn.includes('cost') || cn.includes('salary')) return 'currency_input';
  if (cn.includes('percent') || cn.includes('rate') || cn.includes('discount')) return 'percentage_input';
  if (cn.includes('color')) return 'color_picker';
  if (cn === 'id' || cn.endsWith('id') || cn.includes('_id')) return 'hidden';
  
  // Data type inference
  if (dt.includes('text') || dt.includes('varchar') && dt.includes('max')) return 'textarea';
  if (dt.includes('date') && dt.includes('time')) return 'datetime_picker';
  if (dt.includes('date')) return 'date_picker';
  if (dt.includes('time')) return 'time_picker';
  if (dt.includes('int') || dt.includes('decimal') || dt.includes('numeric') || dt.includes('float')) return 'number_input';
  if (dt.includes('bit') || dt.includes('bool')) return 'toggle';
  
  return 'text_input';
}

function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function mapSQLTypeToCSharp(sqlType: string): string {
  const type = sqlType.toLowerCase().split('(')[0];
  
  const mapping: Record<string, string> = {
    'int': 'int',
    'integer': 'int',
    'bigint': 'long',
    'smallint': 'short',
    'tinyint': 'byte',
    'bit': 'bool',
    'boolean': 'bool',
    'decimal': 'decimal',
    'numeric': 'decimal',
    'money': 'decimal',
    'float': 'double',
    'real': 'float',
    'date': 'DateTime',
    'datetime': 'DateTime',
    'datetime2': 'DateTime',
    'timestamp': 'DateTime',
    'time': 'TimeSpan',
    'char': 'string',
    'varchar': 'string',
    'text': 'string',
    'nvarchar': 'string',
    'ntext': 'string',
    'uniqueidentifier': 'Guid',
    'xml': 'string',
    'json': 'string',
  };
  
  return mapping[type] || 'string';
}
