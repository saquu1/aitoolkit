/**
 * Export API Routes
 * TASK-4.7: Export Hub
 */

import { NextRequest, NextResponse } from 'next/server'
import { exportHub, createExportPackage, exportToFile, ExportFormat } from '@/lib/export/export-hub'

// GET /api/export
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')
  const packageId = request.nextUrl.searchParams.get('packageId')

  switch (action) {
    case 'formats':
      return NextResponse.json({
        success: true,
        data: {
          formats: [
            { id: 'json', name: 'JSON', mimeType: 'application/json' },
            { id: 'yaml', name: 'YAML', mimeType: 'text/yaml' },
            { id: 'csv', name: 'CSV', mimeType: 'text/csv' },
            { id: 'markdown', name: 'Markdown', mimeType: 'text/markdown' },
            { id: 'html', name: 'HTML', mimeType: 'text/html' },
            { id: 'sql', name: 'SQL', mimeType: 'application/sql' },
            { id: 'zip', name: 'ZIP Archive', mimeType: 'application/zip' }
          ]
        }
      })

    default:
      return NextResponse.json({
        error: 'Invalid action',
        availableActions: ['formats']
      }, { status: 400 })
  }
}

// POST /api/export
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'export':
        return await handleExport(body)

      case 'create-package':
        return await handleCreatePackage(body)

      case 'export-package':
        return await handleExportPackage(body)

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['export', 'create-package', 'export-package']
        }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({
      error: 'Export failed',
      message: error.message
    }, { status: 500 })
  }
}

/**
 * Handle single export
 */
async function handleExport(body: any) {
  const { data, format, filename } = body

  if (!data || !format) {
    return NextResponse.json({
      error: 'Missing data or format'
    }, { status: 400 })
  }

  let result: string

  switch (format) {
    case 'json':
      result = exportHub.exportToJSON(data)
      break
    case 'yaml':
      result = exportHub.exportToYAML(data)
      break
    case 'csv':
      result = exportHub.exportToCSV(Array.isArray(data) ? data : [data])
      break
    case 'markdown':
      result = exportHub.exportToMarkdown(data)
      break
    case 'html':
      result = exportHub.exportToHTML(data)
      break
    case 'sql':
      result = exportHub.exportToSQL(data, body.tableName || 'table')
      break
    default:
      return NextResponse.json({
        error: 'Unsupported format'
      }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    data: {
      content: result,
      format,
      filename: filename || `export.${format}`,
      size: result.length
    }
  })
}

/**
 * Handle create package
 */
async function handleCreatePackage(body: any) {
  const { files, name, description } = body

  if (!files || !Array.isArray(files)) {
    return NextResponse.json({
      error: 'Missing files array'
    }, { status: 400 })
  }

  const pkg = createExportPackage(files.map((f: any) => ({
    id: f.id || `file_${Date.now()}`,
    name: f.name,
    type: f.type,
    content: f.content,
    size: f.content.length,
    createdAt: new Date(),
    projectId: f.projectId
  })), { name, description })

  return NextResponse.json({
    success: true,
    data: pkg
  })
}

/**
 * Handle export package as ZIP
 */
async function handleExportPackage(body: any) {
  const { package: pkg } = body

  if (!pkg || !pkg.files) {
    return NextResponse.json({
      error: 'Missing package data'
    }, { status: 400 })
  }

  const blob = await exportHub.exportPackageAsZip(pkg)
  const downloadUrl = exportHub.generateDownloadUrl(blob, `${pkg.name || 'export'}.zip`)

  return NextResponse.json({
    success: true,
    data: {
      downloadUrl,
      filename: `${pkg.name || 'export'}.zip`,
      size: blob.size
    }
  })
}
