import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseSqlServer } from '@/lib/sql-parser'
import { 
  SQLConstraintParser, 
  CrossReferenceEngine,
  parseTableConstraints,
  crossReferenceCSharpWithSQL,
  TableConstraintIntelligence,
  CrossReferenceIntelligence,
  ValidationGap
} from '@/lib/sql-constraint-intelligence'
import { parseCSharp } from '@/lib/parsers/csharp-parser'

// =============================================================================
// Cross-Reference API - C# ↔ SQL Constraint Intelligence
// =============================================================================

const sqlConstraintParser = new SQLConstraintParser()
const crossReferenceEngine = new CrossReferenceEngine()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, projectId, tableName, csharpContent, sqlContent } = body

    switch (action) {
      case 'cross-reference-table':
        return await crossReferenceTable(projectId, tableName)
      
      case 'cross-reference-all':
        return await crossReferenceAll(projectId)
      
      case 'parse-sql-constraints':
        return await parseSQLConstraints(sqlContent, tableName)
      
      case 'cross-reference-contents':
        return await crossReferenceContents(csharpContent, sqlContent, tableName)
      
      case 'gap-analysis':
        return await gapAnalysis(projectId, tableName)
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Cross-reference error:', error)
    return NextResponse.json({ 
      error: error.message || 'Cross-reference failed',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * Cross-reference a single table's SQL constraints with C# models
 */
async function crossReferenceTable(projectId: string, tableName: string) {
  // Get SQL table from database
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName }
  })

  if (!table) {
    return NextResponse.json({ 
      error: `Table '${tableName}' not found in project` 
    }, { status: 404 })
  }

  // Parse SQL constraints
  const sqlTable = {
    schemaName: table.schemaName || 'dbo',
    tableName: table.tableName,
    columns: JSON.parse(table.columns || '[]'),
    foreignKeys: JSON.parse(table.foreignKeys || '[]'),
    indexes: JSON.parse(table.indexes || '[]'),
    checkConstraints: JSON.parse(table.constraints || '[]'),
  }

  const constraintIntelligence = parseTableConstraints(sqlTable)

  // Find C# model files
  const csharpFiles = await db.toolkitFile.findMany({
    where: {
      projectId,
      fileName: { endsWith: '.cs' }
    }
  })

  // Parse C# models and find matching model
  let matchedModel: any = null
  const csharpProperties = new Map()

  for (const file of csharpFiles) {
    if (!file.content) continue
    
    try {
      const parsed = parseCSharp(file.content, file.fileName)
      
      // Check if this model matches the table
      const inferredTable = parsed.inferredTable?.toLowerCase()
      if (inferredTable === tableName.toLowerCase()) {
        matchedModel = parsed
        
        // Extract properties for cross-reference
        for (const prop of parsed.properties) {
          csharpProperties.set(prop.name, {
            isRequired: prop.isRequired,
            maxLength: prop.maxLength,
            minLength: prop.minLength,
            range: prop.range,
            pattern: prop.pattern,
            email: prop.validationAttributes.some(v => v.type === 'email'),
            phone: prop.validationAttributes.some(v => v.type === 'phone'),
            url: prop.validationAttributes.some(v => v.type === 'url'),
            isUnique: prop.isPrimaryKey,
            isPII: prop.dataAnnotations.some(a => a.name === 'PersonalData'),
            regulations: [],
          })
        }
        break
      }
    } catch (e) {
      // Skip unparseable files
    }
  }

  // Perform cross-reference
  const crossRef = crossReferenceCSharpWithSQL(csharpProperties, sqlTable)

  // Calculate summary
  const gaps = crossRef.flatMap(r => r.gaps)
  const criticalGaps = gaps.filter(g => g.severity === 'critical')
  const highGaps = gaps.filter(g => g.severity === 'high')

  return NextResponse.json({
    success: true,
    tableName,
    constraintIntelligence,
    matchedModel: matchedModel ? {
      className: matchedModel.className,
      fileType: matchedModel.fileType,
      propertyCount: matchedModel.properties.length,
    } : null,
    crossReference: crossRef,
    gaps: {
      total: gaps.length,
      critical: criticalGaps.length,
      high: highGaps.length,
      items: gaps,
    },
    summary: {
      totalColumns: crossRef.length,
      withCSharpMatch: crossRef.filter(r => r.csharp !== null).length,
      requiredMatches: crossRef.filter(r => r.unified.requiredSource === 'both').length,
      avgConfidence: crossRef.reduce((sum, r) => sum + r.confidence, 0) / crossRef.length,
    }
  })
}

/**
 * Cross-reference all tables in a project
 */
async function crossReferenceAll(projectId: string) {
  // Get all tables
  const tables = await db.toolkitTable.findMany({
    where: { projectId }
  })

  // Get all C# files
  const csharpFiles = await db.toolkitFile.findMany({
    where: {
      projectId,
      fileName: { endsWith: '.cs' }
    }
  })

  // Parse all C# models
  const csharpModels = new Map<string, Map<string, any>>()
  
  for (const file of csharpFiles) {
    if (!file.content) continue
    
    try {
      const parsed = parseCSharp(file.content, file.fileName)
      const props = new Map()
      
      for (const prop of parsed.properties) {
        props.set(prop.name, {
          isRequired: prop.isRequired,
          maxLength: prop.maxLength,
          minLength: prop.minLength,
          range: prop.range,
          pattern: prop.pattern,
          email: prop.validationAttributes.some(v => v.type === 'email'),
          phone: prop.validationAttributes.some(v => v.type === 'phone'),
          isUnique: prop.isPrimaryKey,
          isPII: prop.dataAnnotations.some(a => a.name === 'PersonalData'),
          regulations: [],
        })
      }
      
      if (parsed.inferredTable) {
        csharpModels.set(parsed.inferredTable.toLowerCase(), props)
      }
    } catch (e) {
      // Skip
    }
  }

  // Cross-reference each table
  const results = []
  let totalGaps = 0
  let totalCriticalGaps = 0

  for (const table of tables) {
    const sqlTable = {
      schemaName: table.schemaName || 'dbo',
      tableName: table.tableName,
      columns: JSON.parse(table.columns || '[]'),
      foreignKeys: JSON.parse(table.foreignKeys || '[]'),
      indexes: JSON.parse(table.indexes || '[]'),
      checkConstraints: JSON.parse(table.constraints || '[]'),
    }

    const csharpProps = csharpModels.get(table.tableName.toLowerCase()) || new Map()
    const crossRef = crossReferenceCSharpWithSQL(csharpProps, sqlTable)
    
    const gaps = crossRef.flatMap(r => r.gaps)
    totalGaps += gaps.length
    totalCriticalGaps += gaps.filter(g => g.severity === 'critical').length

    results.push({
      tableName: table.tableName,
      hasCSharpModel: csharpProps.size > 0,
      gapCount: gaps.length,
      criticalGapCount: gaps.filter(g => g.severity === 'critical').length,
      avgConfidence: crossRef.length > 0 
        ? crossRef.reduce((sum, r) => sum + r.confidence, 0) / crossRef.length 
        : 0,
    })
  }

  return NextResponse.json({
    success: true,
    projectId,
    summary: {
      totalTables: tables.length,
      totalCSharpModels: csharpModels.size,
      tablesWithCSharpModel: results.filter(r => r.hasCSharpModel).length,
      totalGaps,
      totalCriticalGaps,
    },
    tables: results,
  })
}

/**
 * Parse SQL constraints from raw SQL content
 */
async function parseSQLConstraints(sqlContent: string, tableName?: string) {
  if (!sqlContent) {
    return NextResponse.json({ error: 'SQL content required' }, { status: 400 })
  }

  const parseResult = parseSqlServer(sqlContent)
  
  // Parse constraint intelligence for each table
  const constraintIntelligences: TableConstraintIntelligence[] = []
  
  for (const table of parseResult.tables) {
    if (tableName && table.tableName.toLowerCase() !== tableName.toLowerCase()) {
      continue
    }
    
    const intelligence = parseTableConstraints(table)
    constraintIntelligences.push(intelligence)
  }

  return NextResponse.json({
    success: true,
    tables: constraintIntelligences,
    summary: {
      totalTables: constraintIntelligences.length,
      totalConstraints: constraintIntelligences.reduce((sum, t) => sum + t.totalConstraints, 0),
      totalValidations: constraintIntelligences.reduce((sum, t) => sum + t.totalValidations, 0),
      softDeletePatterns: constraintIntelligences.filter(t => t.softDeletePattern).length,
      auditPatterns: constraintIntelligences.filter(t => t.auditPattern).length,
    }
  })
}

/**
 * Cross-reference raw C# and SQL contents
 */
async function crossReferenceContents(
  csharpContent: string, 
  sqlContent: string, 
  tableName?: string
) {
  if (!csharpContent || !sqlContent) {
    return NextResponse.json({ 
      error: 'Both C# and SQL content required' 
    }, { status: 400 })
  }

  // Parse SQL
  const sqlResult = parseSqlServer(sqlContent)
  
  // Find target table
  const targetTable = tableName 
    ? sqlResult.tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase())
    : sqlResult.tables[0]

  if (!targetTable) {
    return NextResponse.json({ 
      error: tableName 
        ? `Table '${tableName}' not found in SQL` 
        : 'No tables found in SQL'
    }, { status: 404 })
  }

  // Parse C#
  const csharpParsed = parseCSharp(csharpContent, 'Model.cs')
  
  // Build property map
  const csharpProperties = new Map()
  for (const prop of csharpParsed.properties) {
    csharpProperties.set(prop.name, {
      isRequired: prop.isRequired,
      maxLength: prop.maxLength,
      minLength: prop.minLength,
      range: prop.range,
      pattern: prop.pattern,
      email: prop.validationAttributes.some(v => v.type === 'email'),
      phone: prop.validationAttributes.some(v => v.type === 'phone'),
      url: prop.validationAttributes.some(v => v.type === 'url'),
      isUnique: prop.isPrimaryKey,
      isPII: prop.dataAnnotations.some(a => a.name === 'PersonalData'),
      regulations: prop.complianceFlags.map(f => f.flagType),
    })
  }

  // Cross-reference
  const crossRef = crossReferenceCSharpWithSQL(csharpProperties, targetTable)
  
  // Build detailed response
  const detailedResults = crossRef.map(r => ({
    column: r.columnName,
    sql: {
      required: r.sql.isRequired,
      defaultValue: r.sql.defaultValue,
      checkConstraints: r.sql.checkConstraints.map(c => ({
        expression: c.expression,
        purpose: c.inferredPurpose,
        csharpEquivalent: c.csharpEquivalent?.attribute,
      })),
      unique: r.sql.uniqueConstraints.length > 0,
    },
    csharp: r.csharp ? {
      required: r.csharp.isRequired,
      maxLength: r.csharp.maxLength,
      isPII: r.csharp.isPII,
    } : null,
    unified: {
      required: r.unified.isRequired,
      maxLength: r.unified.maxLength,
      validations: r.unified.validations,
      complianceFlags: r.unified.complianceFlags,
    },
    gaps: r.gaps.map(g => ({
      type: g.type,
      severity: g.severity,
      description: g.description,
      recommendation: g.recommendation,
    })),
    confidence: r.confidence,
  }))

  return NextResponse.json({
    success: true,
    table: targetTable.tableName,
    csharpModel: csharpParsed.className,
    crossReference: detailedResults,
    gaps: {
      total: crossRef.flatMap(r => r.gaps).length,
      bySeverity: {
        critical: crossRef.flatMap(r => r.gaps).filter(g => g.severity === 'critical').length,
        high: crossRef.flatMap(r => r.gaps).filter(g => g.severity === 'high').length,
        medium: crossRef.flatMap(r => r.gaps).filter(g => g.severity === 'medium').length,
        low: crossRef.flatMap(r => r.gaps).filter(g => g.severity === 'low').length,
      }
    },
    summary: {
      totalColumns: crossRef.length,
      withCSharpMatch: crossRef.filter(r => r.csharp).length,
      withGaps: crossRef.filter(r => r.gaps.length > 0).length,
      avgConfidence: crossRef.reduce((sum, r) => sum + r.confidence, 0) / crossRef.length,
    }
  })
}

/**
 * Perform gap analysis for a project
 */
async function gapAnalysis(projectId: string, tableName?: string) {
  // Get tables
  const tables = tableName 
    ? await db.toolkitTable.findMany({ 
        where: { projectId, tableName } 
      })
    : await db.toolkitTable.findMany({ 
        where: { projectId } 
      })

  // Get C# files
  const csharpFiles = await db.toolkitFile.findMany({
    where: {
      projectId,
      fileName: { endsWith: '.cs' }
    }
  })

  // Parse C# models
  const csharpModels = new Map<string, any>()
  for (const file of csharpFiles) {
    if (!file.content) continue
    try {
      const parsed = parseCSharp(file.content, file.fileName)
      if (parsed.inferredTable) {
        csharpModels.set(parsed.inferredTable.toLowerCase(), parsed)
      }
    } catch (e) {}
  }

  // Collect all gaps
  const allGaps: ValidationGap[] = []
  const gapSummary = {
    totalGaps: 0,
    missingInCSharp: 0,
    missingInSQL: 0,
    conflicts: 0,
    inconsistencies: 0,
    autoFixable: 0,
  }

  for (const table of tables) {
    const sqlTable = {
      schemaName: table.schemaName || 'dbo',
      tableName: table.tableName,
      columns: JSON.parse(table.columns || '[]'),
      foreignKeys: JSON.parse(table.foreignKeys || '[]'),
      indexes: JSON.parse(table.indexes || '[]'),
      checkConstraints: JSON.parse(table.constraints || '[]'),
    }

    const csharpModel = csharpModels.get(table.tableName.toLowerCase())
    const csharpProps = new Map()
    
    if (csharpModel) {
      for (const prop of csharpModel.properties) {
        csharpProps.set(prop.name, {
          isRequired: prop.isRequired,
          maxLength: prop.maxLength,
          isPII: prop.dataAnnotations.some((a: any) => a.name === 'PersonalData'),
        })
      }
    }

    const crossRef = crossReferenceCSharpWithSQL(csharpProps, sqlTable)
    
    for (const ref of crossRef) {
      for (const gap of ref.gaps) {
        allGaps.push({
          ...gap,
          id: `${table.tableName}.${gap.id}`,
        })
        
        gapSummary.totalGaps++
        if (gap.type === 'missing_in_csharp') gapSummary.missingInCSharp++
        if (gap.type === 'missing_in_sql') gapSummary.missingInSQL++
        if (gap.type === 'conflict') gapSummary.conflicts++
        if (gap.type === 'inconsistency') gapSummary.inconsistencies++
        if (gap.autoFixable) gapSummary.autoFixable++
      }
    }
  }

  // Group gaps by severity
  const gapsBySeverity = {
    critical: allGaps.filter(g => g.severity === 'critical'),
    high: allGaps.filter(g => g.severity === 'high'),
    medium: allGaps.filter(g => g.severity === 'medium'),
    low: allGaps.filter(g => g.severity === 'low'),
  }

  // Generate recommendations
  const recommendations: string[] = []
  
  if (gapSummary.missingInSQL > 0) {
    recommendations.push(
      `Add ${gapSummary.missingInSQL} missing columns to SQL tables from C# models`
    )
  }
  if (gapSummary.missingInCSharp > 0) {
    recommendations.push(
      `Add ${gapSummary.missingInCSharp} missing properties to C# models from SQL columns`
    )
  }
  if (gapSummary.conflicts > 0) {
    recommendations.push(
      `Resolve ${gapSummary.conflicts} conflicts between C# and SQL constraints`
    )
  }
  if (gapSummary.inconsistencies > 0) {
    recommendations.push(
      `Align ${gapSummary.inconsistencies} inconsistencies in validation rules`
    )
  }

  return NextResponse.json({
    success: true,
    projectId,
    gapSummary,
    gapsBySeverity: {
      critical: gapsBySeverity.critical.length,
      high: gapsBySeverity.high.length,
      medium: gapsBySeverity.medium.length,
      low: gapsBySeverity.low.length,
    },
    gaps: allGaps,
    recommendations,
    autoFixable: gapSummary.autoFixable,
    tablesAnalyzed: tables.length,
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  
  if (!projectId) {
    return NextResponse.json({ 
      error: 'Project ID required',
      actions: [
        'cross-reference-table - Cross-reference single table',
        'cross-reference-all - Cross-reference all project tables',
        'parse-sql-constraints - Parse SQL constraint intelligence',
        'cross-reference-contents - Cross-reference raw C# and SQL',
        'gap-analysis - Full gap analysis for project',
      ]
    }, { status: 400 })
  }

  // Return quick status
  const tables = await db.toolkitTable.count({ where: { projectId } })
  const csharpFiles = await db.toolkitFile.count({ 
    where: { 
      projectId, 
      fileName: { endsWith: '.cs' } 
    } 
  })

  return NextResponse.json({
    success: true,
    projectId,
    status: {
      tables,
      csharpFiles,
      ready: tables > 0,
    },
    availableActions: [
      'cross-reference-table - Cross-reference single table (requires tableName)',
      'cross-reference-all - Cross-reference all project tables',
      'parse-sql-constraints - Parse SQL constraint intelligence',
      'cross-reference-contents - Cross-reference raw C# and SQL',
      'gap-analysis - Full gap analysis for project',
    ],
  })
}
