import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

import { CodeGenerator, createCodeGenerator } from '@/lib/code-generator'
import { CSHTMLParser } from '@/lib/cshtml-parser'



// =============================================================================
// CODE GENERATION API
// Generates Next.js code from parsed intelligence
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, moduleName, viewId, tableIds } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get parsed data from database
    const [views, tables, files] = await Promise.all([
      // Get CSHTML views
      viewId 
        ? prisma.cSHTMLAnalysisCache.findMany({ where: { projectId, id: viewId } })
        : prisma.cSHTMLAnalysisCache.findMany({ where: { projectId } }),
      // Get tables
      prisma.toolkitTable.findMany({ 
        where: tableIds 
          ? { projectId, id: { in: tableIds } }
          : { projectId }
      }),
      // Get source files
      prisma.toolkitFile.findMany({ where: { projectId } })
    ])

    if (views.length === 0) {
      return NextResponse.json({ 
        error: 'No parsed views found. Please upload and parse CSHTML files first.' 
      }, { status: 400 })
    }

    // Parse views from raw content
    const parsedViews = views.map(v => {
      const parser = new CSHTMLParser(v.rawContent || '', v.viewName)
      return parser.parse()
    })

    // Create code generator
    const generator = createCodeGenerator({
      projectId,
      moduleName: moduleName || views[0]?.viewName?.toLowerCase() || 'module'
    })

    // Generate code for each view
    const allFiles: any[] = []
    
    for (const view of parsedViews) {
      const result = generator.generateFromCSHTML(view, tables)
      allFiles.push(...result.files.map(f => ({
        ...f,
        viewName: view.viewName
      })))
    }

    // Also generate Prisma schema
    const prismaSchema = generator.generatePrismaSchema(tables)

    return NextResponse.json({
      success: true,
      summary: {
        totalFiles: allFiles.length,
        components: allFiles.filter(f => f.type === 'component').length,
        apis: allFiles.filter(f => f.type === 'api').length,
        schemas: allFiles.filter(f => f.type === 'schema').length,
        hooks: allFiles.filter(f => f.type === 'hook').length,
        pages: allFiles.filter(f => f.type === 'page').length,
        prismaSchema: true
      },
      files: allFiles,
      prismaSchema: prismaSchema.content,
      dependencies: [...new Set(allFiles.flatMap(f => 
        (f.content.match(/from ['"]@?[\/\w-]+['"]/g) || [])
          .map(m => m.replace(/from ['"]|['"]/g, ''))
          .filter(d => d.startsWith('@') || d.includes('/'))
      ))]
    })

  } catch (error) {
    console.error('Code generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate code: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
