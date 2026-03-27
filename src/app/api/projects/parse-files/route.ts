import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseSqlServer } from '@/lib/sql-parser'
import { CSHTMLParser } from '@/lib/cshtml-parser'
import { matchTablesToModules } from '@/lib/module-matcher'

export async function POST(request: NextRequest) {
  try {
    const { projectId, autoLink = true } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get all pending files
    const files = await prisma.toolkitFile.findMany({
      where: { projectId }
    })

    if (files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No files found. Please upload files first.'
      })
    }

    let tablesCreated = 0
    let proceduresCreated = 0
    let viewsCreated = 0
    let errors: string[] = []

    // Process SQL files
    const sqlFiles = files.filter(f =>
      f.fileType === 'sql_ddl' ||
      f.fileType === 'sql' ||
      f.fileName.endsWith('.sql')
    )

    for (const file of sqlFiles) {
      try {
        const content = file.content || ''

        // Use the proper SQL parser
        const parseResult = parseSqlServer(content)

        // Store tables
        for (const table of parseResult.tables) {
          try {
            await prisma.toolkitTable.upsert({
              where: {
                projectId_tableName: {
                  projectId,
                  tableName: table.tableName
                }
              },
              create: {
                projectId,
                tableName: table.tableName,
                schemaName: table.schema || 'dbo',
                columns: JSON.stringify(table.columns || []),
                foreignKeys: JSON.stringify(table.foreignKeys || []),
                indexes: JSON.stringify(table.indexes || []),
                constraints: JSON.stringify(table.constraints || []),
                sourceDDL: table.sourceDDL || content.substring(0, 5000),
                status: 'standalone'
              },
              update: {
                columns: JSON.stringify(table.columns || []),
                foreignKeys: JSON.stringify(table.foreignKeys || []),
                indexes: JSON.stringify(table.indexes || []),
                constraints: JSON.stringify(table.constraints || []),
                status: 'standalone'
              }
            })
            tablesCreated++
          } catch (e: any) {
            if (!e.message.includes('Unique constraint')) {
              errors.push(`Table ${table.tableName}: ${e.message}`)
            }
          }
        }

        // Store procedures
        for (const proc of parseResult.procedures) {
          try {
            await prisma.storedProcedureCache.upsert({
              where: {
                projectId_procedureName: {
                  projectId,
                  procedureName: proc.procedureName
                }
              },
              create: {
                projectId,
                procedureName: proc.procedureName,
                schemaName: proc.schema || 'dbo',
                parameters: JSON.stringify(proc.parameters || []),
                tablesReferenced: JSON.stringify(proc.tablesAccessed || []),
                tablesModified: JSON.stringify(proc.tablesModified || []),
                businessRules: JSON.stringify(proc.businessRules || []),
                writeOperations: JSON.stringify(proc.operations?.filter((o: any) => ['INSERT', 'UPDATE', 'DELETE'].includes(o.type)) || []),
                readOperations: JSON.stringify(proc.operations?.filter((o: any) => o.type === 'SELECT') || []),
                complexity: proc.complexity || 0,
                body: proc.body || content.substring(0, 10000)
              },
              update: {
                parameters: JSON.stringify(proc.parameters || []),
                tablesReferenced: JSON.stringify(proc.tablesAccessed || []),
                tablesModified: JSON.stringify(proc.tablesModified || []),
                businessRules: JSON.stringify(proc.businessRules || []),
                complexity: proc.complexity || 0
              }
            })
            proceduresCreated++
          } catch (e: any) {
            if (!e.message.includes('Unique constraint')) {
              errors.push(`Procedure ${proc.procedureName}: ${e.message}`)
            }
          }
        }

        // Update file status
        await prisma.toolkitFile.update({
          where: { id: file.id },
          data: {
            parseStatus: 'parsed',
            parsedAt: new Date(),
            tablesFound: parseResult.tables?.length || 0,
            proceduresFound: parseResult.procedures?.length || 0
          }
        })

      } catch (parseError: any) {
        errors.push(`${file.fileName}: ${parseError.message}`)
        await prisma.toolkitFile.update({
          where: { id: file.id },
          data: {
            parseStatus: 'error',
            parseError: parseError.message
          }
        })
      }
    }

    // Process CSHTML files
    const cshtmlFiles = files.filter(f =>
      f.fileType === 'cshtml' ||
      f.fileName.endsWith('.cshtml')
    )

    for (const file of cshtmlFiles) {
      try {
        const content = file.content || ''

        // Use the CSHTML parser
        const parser = new CSHTMLParser(content, file.fileName)
        const analysis = parser.parse()

        try {
          await prisma.cSHTMLAnalysisCache.upsert({
            where: {
              projectId_viewName: {
                projectId,
                viewName: file.fileName
              }
            },
            create: {
              projectId,
              viewName: file.fileName,
              filePath: file.filePath || file.fileName,
              viewType: analysis.viewType || 'unknown',
              modelName: analysis.model?.name,
              linkedTable: analysis.model?.linkedTable,
              title: analysis.title,
              fields: JSON.stringify(analysis.fields || []),
              listConfig: JSON.stringify(analysis.list || {}),
              sections: JSON.stringify(analysis.sections || []),
              scripts: JSON.stringify(analysis.scripts || []),
              styles: JSON.stringify(analysis.styles || []),
              reactBlueprint: JSON.stringify(analysis.reactBlueprint || {}),
              rawContent: content.substring(0, 15000)
            },
            update: {
              viewType: analysis.viewType || 'unknown',
              modelName: analysis.model?.name,
              linkedTable: analysis.model?.linkedTable,
              title: analysis.title,
              fields: JSON.stringify(analysis.fields || []),
              listConfig: JSON.stringify(analysis.list || {}),
              sections: JSON.stringify(analysis.sections || []),
              scripts: JSON.stringify(analysis.scripts || []),
              styles: JSON.stringify(analysis.styles || []),
              reactBlueprint: JSON.stringify(analysis.reactBlueprint || {})
            }
          })
          viewsCreated++
        } catch (e: any) {
          if (!e.message.includes('Unique constraint')) {
            errors.push(`View ${file.fileName}: ${e.message}`)
          }
        }

        // Update file status
        await prisma.toolkitFile.update({
          where: { id: file.id },
          data: {
            parseStatus: 'parsed',
            parsedAt: new Date()
          }
        })

      } catch (parseError: any) {
        errors.push(`${file.fileName}: ${parseError.message}`)
        await prisma.toolkitFile.update({
          where: { id: file.id },
          data: {
            parseStatus: 'error',
            parseError: parseError.message
          }
        })
      }
    }

    // Auto-link modules if enabled
    let modulesLinked = 0
    if (autoLink && tablesCreated > 0) {
      try {
        const tables = await prisma.toolkitTable.findMany({ where: { projectId } })
        const tableNames = tables.map(t => t.tableName)

        const matchedModules = matchTablesToModules(tableNames)

        for (const match of matchedModules) {
          await prisma.projectModule.upsert({
            where: {
              projectId_moduleKey: {
                projectId,
                moduleKey: match.moduleKey
              }
            },
            create: {
              projectId,
              moduleKey: match.moduleKey,
              moduleName: match.moduleName,
              layerNumber: match.layerNumber || 1,
              matchedTables: JSON.stringify(match.matchedTables),
              coverage: match.coverage || 0,
              status: match.coverage === 100 ? 'complete' : 'partial'
            },
            update: {
              matchedTables: JSON.stringify(match.matchedTables),
              coverage: match.coverage || 0,
              status: match.coverage === 100 ? 'complete' : 'partial'
            }
          })
          modulesLinked++
        }
      } catch (linkError: any) {
        console.error('Auto-link error:', linkError)
        errors.push(`Module linking: ${linkError.message}`)
      }
    }

    // Get updated counts
    const finalCounts = await Promise.all([
      prisma.toolkitTable.count({ where: { projectId } }),
      prisma.storedProcedureCache.count({ where: { projectId } }),
      prisma.cSHTMLAnalysisCache.count({ where: { projectId } }),
      prisma.projectModule.count({ where: { projectId } })
    ])

    return NextResponse.json({
      success: true,
      message: `Parsed ${files.length} files: ${tablesCreated} tables, ${proceduresCreated} procedures, ${viewsCreated} views, ${modulesLinked} modules linked`,
      results: {
        filesProcessed: files.length,
        tables: tablesCreated,
        procedures: proceduresCreated,
        views: viewsCreated,
        modulesLinked,
        totalTables: finalCounts[0],
        totalProcedures: finalCounts[1],
        totalViews: finalCounts[2],
        totalModules: finalCounts[3],
        errors: errors.length > 0 ? errors : undefined
      }
    })
  } catch (error) {
    console.error('Parse files error:', error)
    return NextResponse.json(
      { error: 'Failed to parse files: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
