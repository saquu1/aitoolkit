// =============================================================================
// SP-Driven Code Generation API
// =============================================================================
// Generates complete Next.js application from SP Intelligence:
// 1. Prisma Schema (with soft delete, multi-tenant, audit patterns)
// 2. TypeScript Types
// 3. Zod Validation Schemas
// 4. API Routes (with error code mappings, uniqueness checks)
// 5. React Form Components
// 6. React Data Table Components
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseSqlServer } from '@/lib/sql-parser';
import { createEnhancedSPIntelligenceEngine } from '@/lib/sp-intelligence-enhanced';
import { generateFromSPIntelligence } from '@/lib/sp-driven-code-generator';
import type { TableDef } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sql, tableName } = body;

    switch (action) {
      case 'generate-all':
        return await generateAll(sql, body.existingTables || []);
      
      case 'generate-for-table':
        return await generateForTable(sql, tableName, body.existingTables || []);
      
      case 'generate-prisma':
        return await generatePrismaOnly(sql, body.existingTables || []);
      
      case 'generate-api':
        return await generateAPIOnly(sql, tableName, body.existingTables || []);
      
      case 'generate-form':
        return await generateFormOnly(sql, tableName, body.existingTables || []);
      
      case 'generate-table':
        return await generateDataTableOnly(sql, tableName, body.existingTables || []);
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('SP Code Generation error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE ALL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

async function generateAll(sql: string, existingTables: TableDef[]) {
  // Parse SQL
  const parseResult = parseSqlServer(sql);
  const procedures = parseResult.procedures || [];
  const tables = [...parseResult.tables || [], ...existingTables];
  
  if (procedures.length === 0) {
    return NextResponse.json({ 
      error: 'No stored procedures found in SQL',
      tables: tables.length 
    }, { status: 400 });
  }
  
  // Create enhanced intelligence engine
  const engine = createEnhancedSPIntelligenceEngine(tables);
  
  // Analyze all SPs
  const intelligenceResults = procedures.map(sp => engine.analyzeProcedure(sp));
  
  // Add tablesReferenced and tablesModified for each result
  const enrichedResults = intelligenceResults.map(r => ({
    ...r,
    tablesReferenced: r.tablesReferenced || [],
    tablesModified: r.tablesModified || [],
  }));
  
  // Group SPs by table
  const spsByTable = groupSPsByTable(enrichedResults, tables);
  
  // Generate code for each table with SP intelligence
  const generatedCode: Record<string, any> = {};
  
  for (const [tableName, sps] of Object.entries(spsByTable)) {
    const table = tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
    if (!table) continue;
    
    // Merge intelligence from multiple SPs (INSERT + UPDATE + GET + DELETE)
    const mergedIntelligence = mergeSPIntelligence(sps);
    
    // Generate all components
    generatedCode[tableName] = generateFromSPIntelligence(mergedIntelligence, table, tables);
  }
  
  // Generate statistics
  const stats = {
    totalTables: Object.keys(generatedCode).length,
    totalSPs: procedures.length,
    totalValidationRules: intelligenceResults.reduce((sum, r) => sum + r.validationRules.length, 0),
    totalIndexRecommendations: intelligenceResults.reduce((sum, r) => sum + r.indexRecommendations.length, 0),
    totalMissingConstraints: intelligenceResults.reduce((sum, r) => sum + r.missingConstraints.length, 0),
    softDeleteTables: Object.values(generatedCode).filter((g: any) => g.prisma.softDeleteField).length,
    multiTenantTables: Object.values(generatedCode).filter((g: any) => g.prisma.multiTenantField).length,
    totalFormFields: Object.values(generatedCode).reduce((sum: number, g: any) => sum + g.form.fields.length, 0),
    totalGridColumns: Object.values(generatedCode).reduce((sum: number, g: any) => sum + g.table.columns.length, 0),
  };
  
  return NextResponse.json({
    success: true,
    generatedCode,
    statistics: stats,
    discoveredTables: [...new Set(intelligenceResults.flatMap(r => r.discoveredTables))],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE FOR SPECIFIC TABLE
// ═══════════════════════════════════════════════════════════════════════════

async function generateForTable(sql: string, tableName: string, existingTables: TableDef[]) {
  if (!tableName) {
    return NextResponse.json({ error: 'tableName is required' }, { status: 400 });
  }
  
  const parseResult = parseSqlServer(sql);
  const tables = [...parseResult.tables || [], ...existingTables];
  const procedures = parseResult.procedures || [];
  
  // Find the target table
  const table = tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
  if (!table) {
    return NextResponse.json({ error: `Table ${tableName} not found` }, { status: 404 });
  }
  
  // Create engine and analyze SPs
  const engine = createEnhancedSPIntelligenceEngine(tables);
  const intelligenceResults = procedures.map(sp => engine.analyzeProcedure(sp));
  
  // Find SPs related to this table
  const relatedSPs = intelligenceResults.filter(r => 
    r.tablesReferenced.some((t: string) => t.toLowerCase() === tableName.toLowerCase()) ||
    r.tablesModified.some((t: string) => t.toLowerCase() === tableName.toLowerCase())
  );
  
  if (relatedSPs.length === 0) {
    return NextResponse.json({ 
      error: `No stored procedures found for table ${tableName}`,
      availableSPs: intelligenceResults.map(r => r.procedureName)
    }, { status: 404 });
  }
  
  // Merge intelligence
  const mergedIntelligence = mergeSPIntelligence(relatedSPs);
  
  // Generate code
  const generatedCode = generateFromSPIntelligence(mergedIntelligence, table, tables);
  
  return NextResponse.json({
    success: true,
    tableName,
    generatedCode,
    relatedSPs: relatedSPs.map(r => r.procedureName),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE PRISMA ONLY
// ═══════════════════════════════════════════════════════════════════════════

async function generatePrismaOnly(sql: string, existingTables: TableDef[]) {
  const parseResult = parseSqlServer(sql);
  const tables = [...parseResult.tables || [], ...existingTables];
  const procedures = parseResult.procedures || [];
  
  const engine = createEnhancedSPIntelligenceEngine(tables);
  const intelligenceResults = procedures.map(sp => engine.analyzeProcedure(sp));
  
  const spsByTable = groupSPsByTable(intelligenceResults, tables);
  
  const prismaSchemas: Record<string, any> = {};
  
  for (const [tableName, sps] of Object.entries(spsByTable)) {
    const table = tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
    if (!table) continue;
    
    const mergedIntelligence = mergeSPIntelligence(sps);
    const generated = generateFromSPIntelligence(mergedIntelligence, table, tables);
    prismaSchemas[tableName] = generated.prisma;
  }
  
  // Generate complete Prisma file
  const fullSchema = generateFullPrismaFile(prismaSchemas, tables);
  
  return NextResponse.json({
    success: true,
    prismaSchemas,
    fullSchema,
    statistics: {
      totalModels: Object.keys(prismaSchemas).length,
      softDeleteModels: Object.values(prismaSchemas).filter((p: any) => p.softDeleteField).length,
      multiTenantModels: Object.values(prismaSchemas).filter((p: any) => p.multiTenantField).length,
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE API ONLY
// ═══════════════════════════════════════════════════════════════════════════

async function generateAPIOnly(sql: string, tableName: string, existingTables: TableDef[]) {
  if (!tableName) {
    return NextResponse.json({ error: 'tableName is required' }, { status: 400 });
  }
  
  const parseResult = parseSqlServer(sql);
  const tables = [...parseResult.tables || [], ...existingTables];
  const procedures = parseResult.procedures || [];
  
  const table = tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
  if (!table) {
    return NextResponse.json({ error: `Table ${tableName} not found` }, { status: 404 });
  }
  
  const engine = createEnhancedSPIntelligenceEngine(tables);
  const intelligenceResults = procedures.map(sp => engine.analyzeProcedure(sp));
  
  const relatedSPs = intelligenceResults.filter(r => 
    r.tablesReferenced.some((t: string) => t.toLowerCase() === tableName.toLowerCase()) ||
    r.tablesModified.some((t: string) => t.toLowerCase() === tableName.toLowerCase())
  );
  
  const mergedIntelligence = mergeSPIntelligence(relatedSPs);
  const generated = generateFromSPIntelligence(mergedIntelligence, table, tables);
  
  return NextResponse.json({
    success: true,
    tableName,
    api: generated.api,
    typescript: generated.typescript,
    zod: generated.zod,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE FORM ONLY
// ═══════════════════════════════════════════════════════════════════════════

async function generateFormOnly(sql: string, tableName: string, existingTables: TableDef[]) {
  if (!tableName) {
    return NextResponse.json({ error: 'tableName is required' }, { status: 400 });
  }
  
  const parseResult = parseSqlServer(sql);
  const tables = [...parseResult.tables || [], ...existingTables];
  const procedures = parseResult.procedures || [];
  
  const table = tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
  if (!table) {
    return NextResponse.json({ error: `Table ${tableName} not found` }, { status: 404 });
  }
  
  const engine = createEnhancedSPIntelligenceEngine(tables);
  const intelligenceResults = procedures.map(sp => engine.analyzeProcedure(sp));
  
  const relatedSPs = intelligenceResults.filter(r => 
    r.tablesReferenced.some((t: string) => t.toLowerCase() === tableName.toLowerCase()) ||
    r.tablesModified.some((t: string) => t.toLowerCase() === tableName.toLowerCase())
  );
  
  const mergedIntelligence = mergeSPIntelligence(relatedSPs);
  const generated = generateFromSPIntelligence(mergedIntelligence, table, tables);
  
  return NextResponse.json({
    success: true,
    tableName,
    form: generated.form,
    zod: generated.zod,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE DATA TABLE ONLY
// ═══════════════════════════════════════════════════════════════════════════

async function generateDataTableOnly(sql: string, tableName: string, existingTables: TableDef[]) {
  if (!tableName) {
    return NextResponse.json({ error: 'tableName is required' }, { status: 400 });
  }
  
  const parseResult = parseSqlServer(sql);
  const tables = [...parseResult.tables || [], ...existingTables];
  const procedures = parseResult.procedures || [];
  
  const table = tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
  if (!table) {
    return NextResponse.json({ error: `Table ${tableName} not found` }, { status: 404 });
  }
  
  const engine = createEnhancedSPIntelligenceEngine(tables);
  const intelligenceResults = procedures.map(sp => engine.analyzeProcedure(sp));
  
  const relatedSPs = intelligenceResults.filter(r => 
    r.tablesReferenced.some((t: string) => t.toLowerCase() === tableName.toLowerCase()) ||
    r.tablesModified.some((t: string) => t.toLowerCase() === tableName.toLowerCase())
  );
  
  const mergedIntelligence = mergeSPIntelligence(relatedSPs);
  const generated = generateFromSPIntelligence(mergedIntelligence, table, tables);
  
  return NextResponse.json({
    success: true,
    tableName,
    table: generated.table,
    typescript: generated.typescript,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function groupSPsByTable(
  intelligenceResults: any[], 
  tables: TableDef[]
): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  
  for (const intel of intelligenceResults) {
    // Find the primary table for this SP
    const primaryTable = intel.tablesModified[0] || intel.tablesReferenced[0];
    
    if (primaryTable) {
      const tableName = primaryTable.toLowerCase();
      if (!grouped[tableName]) {
        grouped[tableName] = [];
      }
      grouped[tableName].push(intel);
    }
  }
  
  return grouped;
}

function mergeSPIntelligence(sps: any[]): any {
  if (sps.length === 0) return null;
  if (sps.length === 1) return sps[0];
  
  // Merge intelligence from multiple SPs
  const merged = {
    procedureName: sps.map((s: any) => s.procedureName).join(', '),
    schemaName: sps[0].schemaName,
    actionType: sps.some((s: any) => s.actionType === 'create') ? 'create' :
                sps.some((s: any) => s.actionType === 'update') ? 'update' :
                sps.some((s: any) => s.actionType === 'delete') ? 'delete' :
                sps.some((s: any) => s.actionType === 'read') ? 'read' : 'unknown',
    moduleName: sps[0].moduleName,
    moduleConfidence: Math.max(...sps.map((s: any) => s.moduleConfidence)),
    
    // Merge arrays
    validationRules: sps.flatMap((s: any) => s.validationRules),
    indexRecommendations: sps.flatMap((s: any) => s.indexRecommendations),
    missingConstraints: sps.flatMap((s: any) => s.missingConstraints),
    uiComponentSuggestions: sps.flatMap((s: any) => s.uiComponentSuggestions),
    workflowSteps: sps.flatMap((s: any) => s.workflowSteps),
    tableRelationships: sps.flatMap((s: any) => s.tableRelationships),
    
    // Merge tables
    tablesReferenced: [...new Set(sps.flatMap((s: any) => s.tablesReferenced))],
    tablesModified: [...new Set(sps.flatMap((s: any) => s.tablesModified))],
    discoveredTables: [...new Set(sps.flatMap((s: any) => s.discoveredTables))],
    
    // Merge form mode
    formMode: {
      mode: sps.some((s: any) => s.formMode.mode === 'create') && sps.some((s: any) => s.formMode.mode === 'update') 
        ? 'both' 
        : sps.find((s: any) => s.formMode.mode !== 'unknown')?.formMode.mode || 'unknown',
      confidence: Math.max(...sps.map((s: any) => s.formMode.confidence)),
      indicators: sps.flatMap((s: any) => s.formMode.indicators),
      insertTables: [...new Set(sps.flatMap((s: any) => s.formMode.insertTables))],
      updateTables: [...new Set(sps.flatMap((s: any) => s.formMode.updateTables))],
      conditionalLogic: sps.flatMap((s: any) => s.formMode.conditionalLogic),
    },
    
    // Merge transaction pattern
    transactionPattern: {
      hasTransaction: sps.some((s: any) => s.transactionPattern.hasTransaction),
      transactionType: sps.some((s: any) => s.transactionPattern.transactionType === 'explicit') ? 'explicit' : 'implicit',
      errorHandling: sps.some((s: any) => s.transactionPattern.errorHandling === 'try_catch') ? 'try_catch' : 
                     sps.some((s: any) => s.transactionPattern.errorHandling === 'error_check') ? 'error_check' : 'none',
      riskLevel: sps.some((s: any) => s.transactionPattern.riskLevel === 'high') ? 'high' :
                 sps.some((s: any) => s.transactionPattern.riskLevel === 'medium') ? 'medium' : 'low',
      affectedTables: [...new Set(sps.flatMap((s: any) => s.transactionPattern.affectedTables))],
      rollbackConditions: sps.flatMap((s: any) => s.transactionPattern.rollbackConditions),
      savePoints: sps.flatMap((s: any) => s.transactionPattern.savePoints),
    },
    
    // Use API endpoint from first SP or generate unified
    apiEndpoint: {
      method: 'GET',
      path: `/api/${sps[0].moduleName.toLowerCase()}`,
      operation: 'CRUD',
      parameters: sps.flatMap((s: any) => s.apiEndpoint?.parameters || []),
      description: 'Generated from merged SP intelligence',
    },
    
    // Merge metrics
    complexity: Math.max(...sps.map((s: any) => s.complexity)),
    riskLevel: sps.some((s: any) => s.riskLevel === 'critical') ? 'critical' :
               sps.some((s: any) => s.riskLevel === 'high') ? 'high' :
               sps.some((s: any) => s.riskLevel === 'medium') ? 'medium' : 'low',
    
    parameters: sps.flatMap((s: any) => s.parameters),
    body: sps.map((s: any) => s.body).join('\n\n'),
  };
  
  return merged;
}

function generateFullPrismaFile(prismaSchemas: Record<string, any>, tables: TableDef[]): string {
  const lines: string[] = [];
  
  lines.push('// ─────────────────────────────────────────────────────────────');
  lines.push('// Generated Prisma Schema with SP Intelligence');
  lines.push('// ─────────────────────────────────────────────────────────────');
  lines.push(`// Generated: ${new Date().toISOString()}`);
  lines.push(`// Tables: ${Object.keys(prismaSchemas).length}`);
  lines.push('// ─────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push('generator client {');
  lines.push('  provider = "prisma-client-js"');
  lines.push('}');
  lines.push('');
  lines.push('datasource db {');
  lines.push('  provider = "sqlserver"');
  lines.push('  url      = env("DATABASE_URL")');
  lines.push('}');
  lines.push('');
  
  for (const [tableName, schema] of Object.entries(prismaSchemas)) {
    lines.push((schema as any).schema);
    lines.push('');
  }
  
  return lines.join('\n');
}
