import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

// Base directory - the project root
const BASE_DIR = '/home/z/my-project'

// Resolve and validate path
function resolvePath(relPath: string): string {
  if (relPath === '/' || relPath === '') {
    return BASE_DIR
  }
  
  // Remove leading slash and normalize
  const normalized = relPath.replace(/^\//, '')
  const fullPath = path.join(BASE_DIR, normalized)
  
  // Resolve to absolute path and check it's within BASE_DIR
  const resolved = path.resolve(fullPath)
  if (!resolved.startsWith(BASE_DIR)) {
    throw new Error('Invalid path: attempted path traversal')
  }
  
  return resolved
}

// POST - Upload file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path: relPath, name, content, isBase64 } = body

    if (!name) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 })
    }

    // Validate file name (no path traversal)
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 })
    }

    const targetDir = resolvePath(relPath || '/')
    const filePath = path.join(targetDir, name)

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      // Optionally overwrite - for now, we'll allow it
    }

    // Decode content if base64
    let fileContent: Buffer
    if (isBase64 && content) {
      fileContent = Buffer.from(content, 'base64')
    } else {
      fileContent = Buffer.from(content || '', 'utf8')
    }

    // Ensure directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    // Write file
    fs.writeFileSync(filePath, fileContent)

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      path: relPath ? `${relPath}/${name}` : `/${name}`,
      size: fileContent.length
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}
