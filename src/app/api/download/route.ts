import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DOWNLOAD_DIR = path.join(process.cwd(), 'download')

// GET /api/download?file=filename.zip
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('file')

    if (!fileName) {
      return NextResponse.json(
        { error: 'File name is required. Use ?file=filename.zip' },
        { status: 400 }
      )
    }

    // Security: prevent path traversal attacks
    const safeName = fileName.replace(/\.\./g, '').replace(/[/\\]/g, '')
    const filePath = path.join(DOWNLOAD_DIR, safeName)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found', availableFiles: fs.existsSync(DOWNLOAD_DIR) ? fs.readdirSync(DOWNLOAD_DIR) : [] },
        { status: 404 }
      )
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath)
    const stat = fs.statSync(filePath)

    // Determine content type
    const ext = path.extname(safeName).toLowerCase()
    const contentTypes: Record<string, string> = {
      '.zip': 'application/zip',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
    }
    const contentType = contentTypes[ext] || 'application/octet-stream'

    // Return file with download headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Download failed', message: error.message },
      { status: 500 }
    )
  }
}

// List available files
export async function POST(request: NextRequest) {
  try {
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
    }

    const files = fs.readdirSync(DOWNLOAD_DIR)
      .filter(f => fs.statSync(path.join(DOWNLOAD_DIR, f)).isFile())
      .map(f => {
        const stat = fs.statSync(path.join(DOWNLOAD_DIR, f))
        return {
          name: f,
          size: stat.size,
          created: stat.birthtime,
          modified: stat.mtime,
          downloadUrl: `/api/download?file=${f}`
        }
      })

    return NextResponse.json({ files, count: files.length })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to list files', message: error.message },
      { status: 500 }
    )
  }
}
