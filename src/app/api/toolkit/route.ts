// =============================================================================
// Schema Toolkit API - Main Route
// Handles SQL parsing and all generation operations
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseSqlServer, analyzeFKDependencies } from '@/lib/sql-parser';
import { generatePrismaSchema, generatePrismaWithComments } from '@/lib/prisma-generator';
import { generateERD, generateFocusedERD, generateDataFlowDiagram as generateERDDataFlow } from '@/lib/erd-generator';
import { 
  generateDocumentation, 
  generateDataDictionaryCSV, 
  generateJSONSchema,
  generateOpenAPISchema,
  generateUserStories,
  userStoriesToMarkdown
} from '@/lib/doc-generator';
import { 
  generateUATCases, 
  uatToMarkdown, 
  uatToCSV
} from '@/lib/uat-generator';
import {
  generateDataFlowDiagram,
  generateCRUDFlowDiagram,
  generateCRUDSequenceDiagram,
  generateModuleDependencyDiagram,
  generateDataTypeDistributionPie
} from '@/lib/flow-generator';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sql, projectName, options, tableIndex } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Parse SQL if provided
    let parseResult = null;
    let tables: any[] = [];
    let procedures: any[] = [];

    if (sql) {
      parseResult = parseSqlServer(sql);
      tables = parseResult.tables;
      procedures = parseResult.storedProcedures;
    }

    switch (action) {
      case 'parse':
        if (!sql) {
          return NextResponse.json({ error: 'SQL is required for parsing' }, { status: 400 });
        }
        return NextResponse.json({
          success: true,
          parseResult: {
            tables: tables,
            storedProcedures: procedures,
            errors: parseResult.errors,
            warnings: parseResult.warnings,
            stats: parseResult.stats
          }
        });

      case 'generate-prisma':
        if (!sql) {
          return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
        }
        const prismaSchema = generatePrismaSchema(tables, options);
        return NextResponse.json({
          success: true,
          schema: prismaSchema,
          tableCount: tables.length
        });

      case 'generate-prisma-comments':
        if (!sql) {
          return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
        }
        const prismaWithComments = generatePrismaWithComments(tables, options);
        return NextResponse.json({
          success: true,
          schema: prismaWithComments,
          tableCount: tables.length
        });

      case 'generate-erd':
        if (!sql) {
          return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
        }
        const erd = generateERD(tables, options);
        return NextResponse.json({
          success: true,
          erd: erd,
          tableCount: tables.length
        });

      case 'generate-erd-focused':
        if (!sql || tableIndex === undefined) {
          return NextResponse.json({ error: 'SQL and tableIndex are required' }, { status: 400 });
        }
        const focusTable = tables[tableIndex];
        if (!focusTable) {
          return NextResponse.json({ error: 'Table not found' }, { status: 400 });
        }
        const focusedERD = generateFocusedERD(tables, focusTable.tableName, 1);
        return NextResponse.json({
          success: true,
          erd: focusedERD,
          tableName: focusTable.tableName
        });

      case 'generate-documentation':
        if (!sql) {
          return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
        }
        const docs = generateDocumentation(tables, projectName || 'Database Schema', options);
        return NextResponse.json({
          success: true,
          documentation: docs,
          tableCount: tables.length
        });

      case 'generate-data-dictionary':
        if (!sql) {
          return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
        }
        const csv = generateDataDictionaryCSV(tables);
        return NextResponse.json({
          success: true,
          csv: csv,
          tableCount: tables.length
        });

      case 'generate-json-schema':
        if (!sql) {
          return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
        }
        const jsonSchema = generateJSONSchema(tables);
        return NextResponse.json({
          success: true,
          schema: jsonSchema,
          tableCount: tables.length
        });

      case 'generate-openapi':
        if (!sql) {
          return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
        }
        const openApi = generateOpenAPISchema(tables, options?.apiVersion || '1.0.0');
        return NextResponse.json({
          success: true,
          schema: openApi,
          tableCount: tables.length
        });

      case 'generate-uat':
        if (!sql) {
          return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
        }
        const uatCases = generateUATCases(tables);
        const format = options?.format || 'json';
        
        if (format === 'markdown') {
          return NextResponse.json({
            success: true,
            markdown: uatToMarkdown(uatCases),
            cases: uatCases,
            count: uatCases.length
          });
        } else if (format === 'csv') {
          return NextResponse.json({
            success: true,
            csv: uatToCSV(uatCases),
            count: uatCases.length
          });
        }
        return NextResponse.json({
          success: true,
          cases: uatCases,
          count: uatCases.length
        });

      case 'generate-user-stories':
        if (!sql) {
          return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
        }
        const stories = generateUserStories(tables);
        return NextResponse.json({
          success: true,
          markdown: userStoriesToMarkdown(stories),
          stories: stories,
          count: stories.length
        });

      case 'generate-flow':
        if (!sql) {
          return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
        }
        const flowType = options?.flowType || 'data';
        let flow = '';
        
        if (flowType === 'data') {
          flow = generateDataFlowDiagram(tables);
        } else if (flowType === 'module') {
          flow = generateModuleDependencyDiagram(tables);
        } else if (flowType === 'datatype') {
          flow = generateDataTypeDistributionPie(tables);
        }
        
        return NextResponse.json({
          success: true,
          flow: flow,
          flowType: flowType,
          tableCount: tables.length
        });

      case 'generate-crud-flow':
        if (!sql || tableIndex === undefined) {
          return NextResponse.json({ error: 'SQL and tableIndex are required' }, { status: 400 });
        }
        const crudTable = tables[tableIndex];
        if (!crudTable) {
          return NextResponse.json({ error: 'Table not found' }, { status: 400 });
        }
        const crudFlow = generateCRUDFlowDiagram(crudTable.tableName, crudTable.columns);
        return NextResponse.json({
          success: true,
          flow: crudFlow,
          tableName: crudTable.tableName
        });

      case 'generate-sequence':
        if (!sql || tableIndex === undefined) {
          return NextResponse.json({ error: 'SQL and tableIndex are required' }, { status: 400 });
        }
        const seqTable = tables[tableIndex];
        if (!seqTable) {
          return NextResponse.json({ error: 'Table not found' }, { status: 400 });
        }
        const sequence = generateCRUDSequenceDiagram(seqTable.tableName);
        return NextResponse.json({
          success: true,
          sequence: sequence,
          tableName: seqTable.tableName
        });

      case 'analyze-fk':
        if (!sql) {
          return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
        }
        const fkAnalysis = analyzeFKDependencies(tables);
        return NextResponse.json({
          success: true,
          analysis: {
            totalFKs: tables.reduce((a, t) => a + t.foreignKeys.length, 0),
            missingTables: fkAnalysis.missingTables,
            resolutionOrder: fkAnalysis.resolutionOrder,
            dependencyChains: Array.from(fkAnalysis.dependencyGraph.entries()).map(([table, deps]) => ({
              table,
              dependencies: deps
            }))
          }
        });

      case 'generate-all':
        if (!sql) {
          return NextResponse.json({ error: 'SQL is required' }, { status: 400 });
        }
        
        const allResults = {
          parseResult: {
            tables: tables,
            storedProcedures: procedures,
            errors: parseResult.errors,
            warnings: parseResult.warnings,
            stats: parseResult.stats
          },
          prismaSchema: generatePrismaSchema(tables, options),
          erd: generateERD(tables),
          documentation: generateDocumentation(tables, projectName || 'Database Schema'),
          uatCases: generateUATCases(tables),
          userStories: generateUserStories(tables),
          dataFlow: generateDataFlowDiagram(tables)
        };
        
        return NextResponse.json({
          success: true,
          results: allResults
        });

      case 'save-project':
        if (!sql || !projectName) {
          return NextResponse.json({ error: 'SQL and projectName are required' }, { status: 400 });
        }
        
        // Create project in database
        const project = await prisma.toolkitProject.create({
          data: {
            name: projectName,
            description: body.description || '',
            softwareType: body.softwareType || 'Custom',
            rawSql: sql,
            tables: {
              create: tables.map(t => ({
                tableName: t.tableName,
                schemaName: t.schemaName || 'dbo',
                columns: JSON.stringify(t.columns),
                foreignKeys: JSON.stringify(t.foreignKeys),
                indexes: JSON.stringify(t.indexes || []),
                constraints: JSON.stringify(t.checkConstraints || []),
                sourceDDL: t.sourceDDL || ''
              }))
            },
            procedures: {
              create: procedures.map(p => ({
                procedureName: p.procedureName,
                schemaName: p.schemaName || 'dbo',
                parameters: JSON.stringify(p.parameters),
                returnType: p.returnType || '',
                body: p.body || '',
                operations: JSON.stringify(p.operations || []),
                tablesAccessed: JSON.stringify(p.tablesAccessed || []),
                tablesModified: JSON.stringify(p.tablesModified || []),
                complexity: p.complexity || 0
              }))
            }
          },
          include: {
            tables: true,
            procedures: true
          }
        });
        
        return NextResponse.json({
          success: true,
          project: project,
          stats: parseResult.stats
        });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Toolkit API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'list-projects':
        const projects = await prisma.toolkitProject.findMany({
          include: {
            _count: {
              select: { tables: true, procedures: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ success: true, projects });
        
      case 'get-project':
        const projectId = searchParams.get('projectId');
        if (!projectId) {
          return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }
        const project = await prisma.toolkitProject.findUnique({
          where: { id: projectId },
          include: {
            tables: true,
            procedures: true
          }
        });
        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, project });
        
      case 'list-artifacts':
        const artifactProjectId = searchParams.get('projectId');
        if (!artifactProjectId) {
          return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }
        const artifacts = await prisma.toolkitArtifact.findMany({
          where: { projectId: artifactProjectId },
          orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ success: true, artifacts });
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Toolkit API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    
    await prisma.toolkitProject.delete({
      where: { id: projectId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Toolkit API error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
