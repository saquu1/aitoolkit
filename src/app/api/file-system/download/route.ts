import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

// Base directory - the project root
const BASE_DIR = '/home/z/my-project'

// CRC32 implementation for ZIP
function crc32(buffer: Buffer): number {
  const table = makeCrcTable()
  let crc = 0xffffffff

  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xff]
  }

  return (crc ^ 0xffffffff) >>> 0
}

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256)

  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[n] = c
  }

  return table
}

// Create a ZIP file from multiple files
function createZipFile(files: { fileName: string; content: Buffer; isBinary?: boolean }[]): Buffer {
  const localFileHeaders: Buffer[] = []
  const centralDirectory: Buffer[] = []
  let offset = 0

  for (const file of files) {
    const fileNameBuffer = Buffer.from(file.fileName, 'utf8')
    const contentBuffer = file.content

    // Calculate CRC32
    const crc = crc32(contentBuffer)

    // Local file header (signature 0x04034b50)
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0) // Signature
    localHeader.writeUInt16LE(20, 4) // Version needed to extract
    localHeader.writeUInt16LE(0, 6) // General purpose bit flag
    localHeader.writeUInt16LE(0, 8) // Compression method (0 = stored)
    localHeader.writeUInt16LE(0, 10) // File last mod time
    localHeader.writeUInt16LE(0, 12) // File last mod date
    localHeader.writeUInt32LE(crc, 14) // CRC-32
    localHeader.writeUInt32LE(contentBuffer.length, 18) // Compressed size
    localHeader.writeUInt32LE(contentBuffer.length, 22) // Uncompressed size
    localHeader.writeUInt16LE(fileNameBuffer.length, 26) // File name length
    localHeader.writeUInt16LE(0, 28) // Extra field length

    localFileHeaders.push(localHeader)
    localFileHeaders.push(fileNameBuffer)
    localFileHeaders.push(contentBuffer)

    // Central directory file header
    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0) // Signature
    centralHeader.writeUInt16LE(20, 4) // Version made by
    centralHeader.writeUInt16LE(20, 6) // Version needed to extract
    centralHeader.writeUInt16LE(0, 8) // General purpose bit flag
    centralHeader.writeUInt16LE(0, 10) // Compression method
    centralHeader.writeUInt16LE(0, 12) // File last mod time
    centralHeader.writeUInt16LE(0, 14) // File last mod date
    centralHeader.writeUInt32LE(crc, 16) // CRC-32
    centralHeader.writeUInt32LE(contentBuffer.length, 20) // Compressed size
    centralHeader.writeUInt32LE(contentBuffer.length, 24) // Uncompressed size
    centralHeader.writeUInt16LE(fileNameBuffer.length, 28) // File name length
    centralHeader.writeUInt16LE(0, 30) // Extra field length
    centralHeader.writeUInt16LE(0, 32) // File comment length
    centralHeader.writeUInt16LE(0, 34) // Disk number start
    centralHeader.writeUInt16LE(0, 36) // Internal file attributes
    centralHeader.writeUInt32LE(0, 38) // External file attributes
    centralHeader.writeUInt32LE(offset, 42) // Relative offset of local header

    centralDirectory.push(centralHeader)
    centralDirectory.push(fileNameBuffer)

    offset += 30 + fileNameBuffer.length + contentBuffer.length
  }

  // End of central directory record
  const centralDirSize = centralDirectory.reduce((sum, buf) => sum + buf.length, 0)
  const endRecord = Buffer.alloc(22)
  endRecord.writeUInt32LE(0x06054b50, 0) // Signature
  endRecord.writeUInt16LE(0, 4) // Disk number
  endRecord.writeUInt16LE(0, 6) // Disk number with central directory
  endRecord.writeUInt16LE(files.length, 8) // Number of entries on disk
  endRecord.writeUInt16LE(files.length, 10) // Total number of entries
  endRecord.writeUInt32LE(centralDirSize, 12) // Size of central directory
  endRecord.writeUInt32LE(offset, 16) // Offset of central directory
  endRecord.writeUInt16LE(0, 20) // Comment length

  return Buffer.concat([
    ...localFileHeaders,
    ...centralDirectory,
    endRecord
  ])
}

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

// GET - Download single file
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('file')

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 })
    }

    const fullPath = resolvePath(filePath)

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const stats = fs.statSync(fullPath)
    
    if (stats.isDirectory()) {
      return NextResponse.json({ error: 'Cannot download directory. Use ZIP for multiple files.' }, { status: 400 })
    }

    // Read file content
    const content = fs.readFileSync(fullPath)
    const fileName = path.basename(fullPath)

    // Determine content type
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    const contentTypes: Record<string, string> = {
      'ts': 'text/typescript',
      'tsx': 'text/typescript',
      'js': 'text/javascript',
      'jsx': 'text/javascript',
      'json': 'application/json',
      'md': 'text/markdown',
      'css': 'text/css',
      'html': 'text/html',
      'sql': 'text/sql',
      'prisma': 'text/plain',
      'yaml': 'text/yaml',
      'yml': 'text/yaml',
      'txt': 'text/plain',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
    }

    const contentType = contentTypes[ext] || 'application/octet-stream'

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': content.length.toString()
      }
    })
  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to download file' },
      { status: 500 }
    )
  }
}

// POST - Download multiple files as ZIP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { files, folderPath } = body

    // If folderPath is provided, ZIP the entire folder
    if (folderPath) {
      const fullPath = resolvePath(folderPath)
      
      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
      }

      const stats = fs.statSync(fullPath)
      if (!stats.isDirectory()) {
        return NextResponse.json({ error: 'Not a directory' }, { status: 400 })
      }

      // Recursively collect all files
      const allFiles: { fileName: string; content: Buffer }[] = []
      
      function collectFiles(dir: string, basePath: string = '') {
        const items = fs.readdirSync(dir)
        
        for (const item of items) {
          // Skip node_modules, .next, .git
          if (item === 'node_modules' || item === '.next' || item === '.git') continue
          if (item.startsWith('.') && item !== '.env' && item !== '.env.example') continue
          
          const itemPath = path.join(dir, item)
          const relativePath = basePath ? `${basePath}/${item}` : item
          const itemStats = fs.statSync(itemPath)
          
          if (itemStats.isDirectory()) {
            collectFiles(itemPath, relativePath)
          } else {
            // Skip very large files (> 50MB)
            if (itemStats.size > 50 * 1024 * 1024) continue
            
            try {
              const content = fs.readFileSync(itemPath)
              allFiles.push({ fileName: relativePath, content })
            } catch {
              // Skip files that can't be read
            }
          }
        }
      }

      collectFiles(fullPath, path.basename(fullPath))

      if (allFiles.length === 0) {
        return NextResponse.json({ error: 'No files to ZIP in this folder' }, { status: 400 })
      }

      const zipBuffer = createZipFile(allFiles)
      const zipName = `${path.basename(fullPath)}_${new Date().toISOString().slice(0, 10)}.zip`

      return new NextResponse(zipBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${zipName}"`,
          'Content-Length': zipBuffer.length.toString()
        }
      })
    }

    // If files array is provided, ZIP selected files
    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Files array or folderPath is required' }, { status: 400 })
    }

    const zipFiles: { fileName: string; content: Buffer }[] = []
    const errors: string[] = []

    for (const filePath of files) {
      try {
        const fullPath = resolvePath(filePath)
        
        if (!fs.existsSync(fullPath)) {
          errors.push(`File not found: ${filePath}`)
          continue
        }

        const stats = fs.statSync(fullPath)
        
        if (stats.isDirectory()) {
          // For directories, add all files inside
          function addDirectory(dir: string, basePath: string) {
            const items = fs.readdirSync(dir)
            
            for (const item of items) {
              if (item === 'node_modules' || item === '.next' || item === '.git') continue
              if (item.startsWith('.')) continue
              
              const itemPath = path.join(dir, item)
              const relativePath = `${basePath}/${item}`
              const itemStats = fs.statSync(itemPath)
              
              if (itemStats.isDirectory()) {
                addDirectory(itemPath, relativePath)
              } else if (itemStats.size <= 50 * 1024 * 1024) {
                try {
                  const content = fs.readFileSync(itemPath)
                  zipFiles.push({ fileName: relativePath, content })
                } catch {
                  errors.push(`Could not read: ${relativePath}`)
                }
              }
            }
          }
          
          addDirectory(fullPath, path.basename(fullPath))
        } else {
          // Skip very large files (> 50MB)
          if (stats.size > 50 * 1024 * 1024) {
            errors.push(`File too large (skipped): ${filePath}`)
            continue
          }

          const content = fs.readFileSync(fullPath)
          zipFiles.push({ fileName: path.basename(filePath), content })
        }
      } catch (err: any) {
        errors.push(`Error: ${filePath} - ${err.message}`)
      }
    }

    if (zipFiles.length === 0) {
      return NextResponse.json(
        { error: 'No files could be added to ZIP', details: errors },
        { status: 400 }
      )
    }

    const zipBuffer = createZipFile(zipFiles)
    const zipName = `files_${new Date().toISOString().slice(0, 10)}.zip`

    // Return ZIP with optional warnings
    const response: any = new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
        'Content-Length': zipBuffer.length.toString(),
        'X-Warning-Count': errors.length.toString()
      }
    })

    return response
  } catch (error: any) {
    console.error('ZIP creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create ZIP file' },
      { status: 500 }
    )
  }
}
