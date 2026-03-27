// =============================================================================
// Integrated Pipeline API
// =============================================================================
// Complete end-to-end pipeline:
// Upload (SQL/CSHTML/SP) → Parse → Intelligence → Generate → Export
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseSqlServer } from '@/lib/sql-parser';
import { CSHTMLParser } from '@/lib/cshtml-parser';
import type { TableDef } from '@/lib/types';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface PipelineRequest {
  files: {
    name: string;
    content: string;
    type: 'sql_ddl' | 'sql_sp' | 'razor_view' | 'javascript' | 'auto';
  }[];
  options?: {
    generatePrisma?: boolean;
    generateTypes?: boolean;
    generateZod?: boolean;
    generateAPI?: boolean;
    generateForm?: boolean;
    generateTable?: boolean;
    generatePages?: boolean;
    targetFramework?: 'nextjs' | 'nestjs' | 'express';
  };
}

export interface PipelineResult {
  success: boolean;
  
  // Stage 1: Parsing
  parsing: {
    tables: TableDef[];
    storedProcedures: any[];
    views: any[];
    statistics: {
      totalFiles: number;
      tablesFound: number;
      spsFound: number;
      viewsFound: number;
      parseErrors: string[];
    };
  };
  
  // Stage 2: Intelligence
  intelligence: {
    statistics: {
      totalValidationRules: number;
      totalIndexRecommendations: number;
      modulesIdentified: string[];
    };
  };
  
  // Stage 3: Generation
  generation: {
    prisma?: string;
    typescript?: { name: string; content: string }[];
    api?: { name: string; content: string }[];
    components?: { name: string; content: string }[];
  };
  
  // Stage 4: Export Ready
  export: {
    files: {
      path: string;
      name: string;
      content: string;
      type: 'prisma' | 'typescript' | 'api' | 'component' | 'page' | 'hook';
    }[];
    statistics: {
      totalFiles: number;
      totalLines: number;
      byType: Record<string, number>;
    };
  };
  
  // Errors and warnings
  errors: string[];
  warnings: string[];
}

// =============================================================================
// MAIN PIPELINE HANDLER
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const body: PipelineRequest = await req.json();
    const { files, options = {} } = body;
    
    // Default options
    const opts = {
      generatePrisma: true,
      generateTypes: true,
      generateZod: true,
      generateAPI: true,
      generateForm: true,
      generateTable: true,
      generatePages: true,
      targetFramework: 'nextjs' as const,
      ...options
    };
    
    const result: PipelineResult = {
      success: true,
      parsing: {
        tables: [],
        storedProcedures: [],
        views: [],
        statistics: {
          totalFiles: files.length,
          tablesFound: 0,
          spsFound: 0,
          viewsFound: 0,
          parseErrors: []
        }
      },
      intelligence: {
        statistics: {
          totalValidationRules: 0,
          totalIndexRecommendations: 0,
          modulesIdentified: []
        }
      },
      generation: {},
      export: {
        files: [],
        statistics: {
          totalFiles: 0,
          totalLines: 0,
          byType: {}
        }
      },
      errors: [],
      warnings: []
    };
    
    // =========================================================================
    // STAGE 1: PARSING
    // =========================================================================
    
    console.log('[Pipeline] Stage 1: Parsing files...');
    
    // Separate files by type
    const sqlDDLFiles = files.filter(f => 
      f.type === 'sql_ddl' || 
      (f.type === 'auto' && isDDLFile(f.content, f.name))
    );
    const spFiles = files.filter(f => 
      f.type === 'sql_sp' || 
      (f.type === 'auto' && isSPFile(f.content, f.name))
    );
    const cshtmlFiles = files.filter(f => 
      f.type === 'razor_view' || 
      (f.type === 'auto' && f.name.endsWith('.cshtml'))
    );
    
    // Parse DDL files
    for (const file of sqlDDLFiles) {
      try {
        const parseResult = parseSqlServer(file.content);
        result.parsing.tables.push(...parseResult.tables);
        result.parsing.statistics.tablesFound += parseResult.tables.length;
        
        if (parseResult.storedProcedures && parseResult.storedProcedures.length > 0) {
          result.parsing.storedProcedures.push(...parseResult.storedProcedures);
          result.parsing.statistics.spsFound += parseResult.storedProcedures.length;
        }
      } catch (error: any) {
        result.parsing.statistics.parseErrors.push(`DDL Parse Error (${file.name}): ${error.message}`);
      }
    }
    
    // Parse SP files (count only for now)
    result.parsing.statistics.spsFound += spFiles.length;
    
    // Parse CSHTML files
    for (const file of cshtmlFiles) {
      try {
        const parser = new CSHTMLParser(file.content, file.name);
        const cshtmlResult = parser.parse();
        result.parsing.views.push(cshtmlResult);
        result.parsing.statistics.viewsFound++;
      } catch (error: any) {
        result.parsing.statistics.parseErrors.push(`CSHTML Parse Error (${file.name}): ${error.message}`);
      }
    }
    
    console.log(`[Pipeline] Parsed: ${result.parsing.tables.length} tables, ${result.parsing.storedProcedures.length} SPs, ${result.parsing.views.length} views`);
    
    // =========================================================================
    // STAGE 2: INTELLIGENCE AGGREGATION
    // =========================================================================
    
    console.log('[Pipeline] Stage 2: Aggregating intelligence...');
    
    // Count validation rules from SPs
    for (const sp of result.parsing.storedProcedures) {
      if (sp.body) {
        const nullChecks = (sp.body.match(/IF\s+@(\w+)\s+IS\s+NULL/gi) || []).length;
        result.intelligence.statistics.totalValidationRules += nullChecks;
      }
    }
    
    // Count index recommendations from table analysis
    for (const table of result.parsing.tables) {
      result.intelligence.statistics.totalIndexRecommendations += table.indexes?.length || 0;
    }
    
    console.log(`[Pipeline] Intelligence: ${result.intelligence.statistics.totalValidationRules} validation rules, ${result.intelligence.statistics.totalIndexRecommendations} index recommendations`);
    
    // =========================================================================
    // STAGE 3: CODE GENERATION
    // =========================================================================
    
    console.log('[Pipeline] Stage 3: Generating code...');
    
    // Generate Prisma schema
    if (opts.generatePrisma && result.parsing.tables.length > 0) {
      result.generation.prisma = generatePrismaSchema(result.parsing.tables);
    }
    
    // Generate TypeScript types
    if (opts.generateTypes) {
      result.generation.typescript = result.parsing.tables.map(table => ({
        name: `${toCamelCase(table.tableName)}.ts`,
        content: generateTypeScriptTypes(table)
      }));
    }
    
    // Generate API routes
    if (opts.generateAPI) {
      result.generation.api = result.parsing.tables.map(table => ({
        name: `route.ts`,
        content: generateAPIRoute(table)
      }));
    }
    
    // Generate React components
    if (opts.generateForm || opts.generateTable) {
      result.generation.components = [];
      for (const table of result.parsing.tables) {
        if (opts.generateForm) {
          result.generation.components.push({
            name: `${toPascalSingular(table.tableName)}Form.tsx`,
            content: generateFormComponent(table)
          });
        }
        if (opts.generateTable) {
          result.generation.components.push({
            name: `${toPascalSingular(table.tableName)}Table.tsx`,
            content: generateTableComponent(table)
          });
        }
      }
    }
    
    console.log(`[Pipeline] Generated code for ${result.parsing.tables.length} tables`);
    
    // =========================================================================
    // STAGE 4: EXPORT PREPARATION
    // =========================================================================
    
    console.log('[Pipeline] Stage 4: Preparing export files...');
    
    // Add Prisma schema
    if (result.generation.prisma) {
      result.export.files.push({
        path: '/prisma/schema.prisma',
        name: 'schema.prisma',
        content: result.generation.prisma,
        type: 'prisma'
      });
    }
    
    // Add TypeScript files
    if (result.generation.typescript) {
      for (const ts of result.generation.typescript) {
        result.export.files.push({
          path: `/src/types/${ts.name}`,
          name: ts.name,
          content: ts.content,
          type: 'typescript'
        });
      }
    }
    
    // Add API routes
    if (result.generation.api) {
      for (const api of result.generation.api) {
        const tableName = api.name.replace('.ts', '');
        result.export.files.push({
          path: `/src/app/api/${tableName}/route.ts`,
          name: 'route.ts',
          content: api.content,
          type: 'api'
        });
      }
    }
    
    // Add React components
    if (result.generation.components) {
      for (const comp of result.generation.components) {
        const varName = comp.name.replace(/Form\.tsx|Table\.tsx/, '').toLowerCase();
        result.export.files.push({
          path: `/src/components/${varName}s/${comp.name}`,
          name: comp.name,
          content: comp.content,
          type: 'component'
        });
      }
    }
    
    // Calculate statistics
    result.export.statistics.totalFiles = result.export.files.length;
    result.export.statistics.totalLines = result.export.files.reduce(
      (sum, f) => sum + f.content.split('\n').length, 0
    );
    result.export.statistics.byType = result.export.files.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`[Pipeline] Export ready: ${result.export.statistics.totalFiles} files, ${result.export.statistics.totalLines} lines`);
    
    // Set success based on errors
    result.success = result.errors.length === 0;
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('[Pipeline] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function isDDLFile(content: string, name: string): boolean {
  const upper = content.toUpperCase();
  return upper.includes('CREATE TABLE') || 
         upper.includes('ALTER TABLE') ||
         upper.includes('CREATE INDEX') ||
         (name.toLowerCase().endsWith('.sql') && !upper.includes('CREATE PROCEDURE'));
}

function isSPFile(content: string, name: string): boolean {
  const upper = content.toUpperCase();
  return upper.includes('CREATE PROCEDURE') ||
         upper.includes('CREATE PROC') ||
         upper.includes('ALTER PROCEDURE') ||
         upper.includes('ALTER PROC');
}

function generatePrismaSchema(tables: TableDef[]): string {
  const lines: string[] = [
    '// Generated by AI Enterprise Architect',
    '// Source: SQL Server DDL',
    '',
    'datasource db {',
    '  provider = "sqlserver"',
    '  url      = env("DATABASE_URL")',
    '}',
    '',
    'generator client {',
    '  provider = "prisma-client-js"',
    '}',
    ''
  ];
  
  for (const table of tables) {
    const modelName = toPascalSingular(table.tableName);
    lines.push(`model ${modelName} {`);
    
    for (const col of table.columns) {
      const prismaType = sqlToPrismaType(col.dataType);
      const attrs: string[] = [];
      
      if (col.isPrimaryKey) {
        attrs.push('@id');
        if (col.dataType === 'UNIQUEIDENTIFIER') {
          attrs.push('@default(uuid())');
        } else if (col.isIdentity) {
          attrs.push('@default(autoincrement())');
        }
      }
      
      if (col.nullable && !col.isPrimaryKey) {
        attrs.push('?');
      }
      
      const fieldName = toCamelCase(col.name);
      const attrStr = attrs.length ? ' ' + attrs.join('') : '';
      lines.push(`  ${fieldName.padEnd(20)} ${prismaType}${attrStr}`);
    }
    
    lines.push('');
    lines.push(`  @@map("${table.tableName}")`);
    lines.push('}');
    lines.push('');
  }
  
  return lines.join('\n');
}

function generateTypeScriptTypes(table: TableDef): string {
  const typeName = toPascalSingular(table.tableName);
  const lines: string[] = [
    `// Generated types for ${table.tableName}`,
    '',
    `export interface ${typeName} {`
  ];
  
  for (const col of table.columns) {
    const tsType = sqlToTsType(col.dataType);
    const optional = col.nullable ? '?' : '';
    const fieldName = toCamelCase(col.name);
    lines.push(`  ${fieldName}${optional}: ${tsType};`);
  }
  
  lines.push('}');
  lines.push('');
  lines.push(`export type ${typeName}CreateInput = Omit<${typeName}, '${table.columns.find(c => c.isPrimaryKey)?.name || 'id'}'>;`);
  lines.push(`export type ${typeName}UpdateInput = Partial<${typeName}CreateInput> & { id: string };`);
  
  return lines.join('\n');
}

function generateAPIRoute(table: TableDef): string {
  const typeName = toPascalSingular(table.tableName);
  const varName = toCamelCase(table.tableName);
  const pkCol = table.columns.find(c => c.isPrimaryKey);
  
  return `// Generated API route for ${table.tableName}
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/${varName} - List all
export async function GET(req: NextRequest) {
  try {
    const items = await prisma.${varName}.findMany({
      orderBy: { ${pkCol ? toCamelCase(pkCol.name) : 'id'} : 'desc' }
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ${typeName}' }, { status: 500 });
  }
}

// POST /api/${varName} - Create
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const item = await prisma.${varName}.create({ data });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create ${typeName}' }, { status: 500 });
  }
}
`;
}

function generateFormComponent(table: TableDef): string {
  const typeName = toPascalSingular(table.tableName);
  const varName = toCamelCase(table.tableName);
  const editableCols = table.columns.filter(c => !c.isPrimaryKey && !c.isIdentity);
  
  return `"use client";

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ${typeName} } from '@/types/${varName}';

interface ${typeName}FormProps {
  initialData?: ${typeName};
  onSubmit: (data: Partial<${typeName}>) => Promise<void>;
}

export function ${typeName}Form({ initialData, onSubmit }: ${typeName}FormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: initialData || {}
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>${typeName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          ${editableCols.map(col => {
            const fieldName = toCamelCase(col.name);
            const label = formatLabel(col.name);
            return `<div>
              <label className="block text-sm font-medium mb-1">${label}</label>
              <Input {...register('${fieldName}')} />
            </div>`;
          }).join('\n          ')}
          <Button type="submit">Save</Button>
        </form>
      </CardContent>
    </Card>
  );
}
`;
}

function generateTableComponent(table: TableDef): string {
  const typeName = toPascalSingular(table.tableName);
  const varName = toCamelCase(table.tableName);
  const displayCols = table.columns.slice(0, 6); // First 6 columns
  
  return `"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ${typeName} } from '@/types/${varName}';

interface ${typeName}TableProps {
  data: ${typeName}[];
  onEdit?: (item: ${typeName}) => void;
  onDelete?: (item: ${typeName}) => void;
}

export function ${typeName}Table({ data, onEdit, onDelete }: ${typeName}TableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>${typeName} List</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              ${displayCols.map(col => `<TableHead>${formatLabel(col.name)}</TableHead>`).join('\n              ')}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                ${displayCols.map(col => `<TableCell>{item.${toCamelCase(col.name)}}}</TableCell>`).join('\n                ')}
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => onEdit?.(item)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete?.(item)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
`;
}

function sqlToPrismaType(sqlType: string): string {
  const type = sqlType.toUpperCase();
  
  if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(type)) return 'Int';
  if (['DECIMAL', 'NUMERIC', 'MONEY', 'SMALLMONEY'].includes(type)) return 'Decimal';
  if (['FLOAT', 'REAL'].includes(type)) return 'Float';
  if (['BIT'].includes(type)) return 'Boolean';
  if (['DATE'].includes(type)) return 'DateTime';
  if (['DATETIME', 'DATETIME2', 'SMALLDATETIME'].includes(type)) return 'DateTime';
  if (['UNIQUEIDENTIFIER'].includes(type)) return 'String';
  if (['NVARCHAR', 'VARCHAR', 'NCHAR', 'CHAR', 'TEXT', 'NTEXT'].includes(type)) return 'String';
  
  return 'String';
}

function sqlToTsType(sqlType: string): string {
  const type = sqlType.toUpperCase();
  
  if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(type)) return 'number';
  if (['DECIMAL', 'NUMERIC', 'MONEY', 'FLOAT', 'REAL'].includes(type)) return 'number';
  if (['BIT'].includes(type)) return 'boolean';
  if (['DATE', 'DATETIME', 'DATETIME2', 'SMALLDATETIME'].includes(type)) return 'Date';
  if (['UNIQUEIDENTIFIER'].includes(type)) return 'string';
  
  return 'string';
}

function toCamelCase(name: string): string {
  return name.replace(/[_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toLowerCase());
}

function toPascalSingular(name: string): string {
  let pascal = name.replace(/[_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toUpperCase());
  
  // Singularize
  if (pascal.endsWith('ies')) return pascal.slice(0, -3) + 'y';
  if (pascal.endsWith('ses')) return pascal.slice(0, -2);
  if (pascal.endsWith('s') && !pascal.endsWith('ss')) return pascal.slice(0, -1);
  
  return pascal;
}

function formatLabel(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}
