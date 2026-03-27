import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

// Base directory for filesystem access (project root)
const BASE_DIR = process.cwd()
const DOWNLOAD_DIR = path.join(BASE_DIR, 'download')
const UPLOAD_DIR = path.join(BASE_DIR, 'upload')
const SRC_DIR = path.join(BASE_DIR, 'src')
const APP_DIR = path.join(BASE_DIR, 'src', 'app')

// Allowed directories for browsing
const ALLOWED_DIRS = [
  BASE_DIR,
  SRC_DIR,
  APP_DIR,
  DOWNLOAD_DIR,
  UPLOAD_DIR,
  path.join(BASE_DIR, 'prisma'),
  path.join(BASE_DIR, 'public'),
  path.join(BASE_DIR, 'lib'),
  path.join(BASE_DIR, 'components'),
  path.join(BASE_DIR, 'hooks'),
  path.join(BASE_DIR, 'types'),
  path.join(BASE_DIR, 'agents'),
  path.join(BASE_DIR, 'data'),
]

// Security: Validate path is within allowed directories
function isPathAllowed(targetPath: string): boolean {
  const resolved = path.resolve(targetPath)
  return ALLOWED_DIRS.some(allowed => resolved.startsWith(allowed))
}

// Security: Get safe path (prevent directory traversal)
function getSafePath(requestPath: string): string | null {
  const resolved = path.resolve(BASE_DIR, requestPath.startsWith('/') ? requestPath.slice(1) : requestPath)
  
  if (!isPathAllowed(resolved)) {
    return null
  }
  
  return resolved
}

// Get file type from extension
function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const typeMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'sql': 'sql',
    'cshtml': 'cshtml',
    'json': 'json',
    'md': 'markdown',
    'css': 'css',
    'html': 'html',
    'prisma': 'prisma',
    'txt': 'text',
    'env': 'env',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'svg': 'svg',
    'png': 'image',
    'jpg': 'image',
    'jpeg': 'image',
    'gif': 'image',
    'ico': 'image',
  }
  return typeMap[ext || ''] || 'unknown'
}

// GET - List directory or get file content
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestPath = searchParams.get('path') || '/'
    const action = searchParams.get('action')
    const filePath = searchParams.get('file')

    // Get default directories info
    if (action === 'defaults') {
      const defaults = [
        { name: 'src', path: '/src', icon: 'FolderCode', description: 'Source code' },
        { name: 'app', path: '/src/app', icon: 'Layout', description: 'Next.js app directory' },
        { name: 'upload', path: '/upload', icon: 'Upload', description: 'Uploaded project files' },
        { name: 'download', path: '/download', icon: 'Download', description: 'Generated outputs' },
        { name: 'prisma', path: '/prisma', icon: 'Database', description: 'Database schema' },
        { name: 'public', path: '/public', icon: 'Image', description: 'Static assets' },
        { name: 'lib', path: '/lib', icon: 'Library', description: 'Library modules' },
      ]

      const result = []
      for (const dir of defaults) {
        const fullPath = path.join(BASE_DIR, dir.path)
        try {
          const stats = fs.statSync(fullPath)
          if (stats.isDirectory()) {
            const items = fs.readdirSync(fullPath, { withFileTypes: true })
            const visibleItems = items.filter(i => !i.name.startsWith('.') && i.name !== 'node_modules')
            result.push({
              ...dir,
              exists: true,
              itemCount: visibleItems.length
            })
          }
        } catch {
          result.push({ ...dir, exists: false, itemCount: 0 })
        }
      }

      return NextResponse.json({ defaults: result })
    }

    // Get file content
    if (filePath) {
      const safePath = getSafePath(filePath)
      if (!safePath) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      try {
        const stats = fs.statSync(safePath)
        if (!stats.isFile()) {
          return NextResponse.json({ error: 'Not a file' }, { status: 400 })
        }

        const content = fs.readFileSync(safePath, 'utf-8')
        const fileName = path.basename(safePath)

        return NextResponse.json({
          file: {
            path: filePath,
            name: fileName,
            content,
            type: getFileType(fileName),
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime
          }
        })
      } catch (error) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
    }

    // List directory
    const safePath = getSafePath(requestPath)
    if (!safePath) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    try {
      const stats = fs.statSync(safePath)
      if (!stats.isDirectory()) {
        return NextResponse.json({ error: 'Not a directory' }, { status: 400 })
      }

      const items = fs.readdirSync(safePath, { withFileTypes: true })
      const folders = []
      const files = []

      for (const item of items) {
        // Skip hidden files and node_modules
        if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === '.next') {
          continue
        }

        const itemPath = path.join(safePath, item.name)
        const relativePath = path.relative(BASE_DIR, itemPath)

        if (item.isDirectory()) {
          try {
            const subItems = fs.readdirSync(itemPath).filter(n => !n.startsWith('.') && n !== 'node_modules')
            folders.push({
              name: item.name,
              path: '/' + relativePath.split(path.sep).join('/'),
              itemCount: subItems.length
            })
          } catch {
            folders.push({
              name: item.name,
              path: '/' + relativePath.split(path.sep).join('/'),
              itemCount: 0
            })
          }
        } else {
          const fileStats = fs.statSync(itemPath)
          files.push({
            name: item.name,
            path: '/' + relativePath.split(path.sep).join('/'),
            type: getFileType(item.name),
            size: fileStats.size,
            modified: fileStats.mtime.toISOString(),
            created: fileStats.birthtime.toISOString()
          })
        }
      }

      // Sort folders and files
      folders.sort((a, b) => a.name.localeCompare(b.name))
      files.sort((a, b) => a.name.localeCompare(b.name))

      return NextResponse.json({
        currentPath: '/' + path.relative(BASE_DIR, safePath).split(path.sep).join('/'),
        folders,
        files,
        parentPath: safePath !== BASE_DIR 
          ? '/' + path.relative(BASE_DIR, path.dirname(safePath)).split(path.sep).join('/')
          : null
      })
    } catch (error) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Filesystem error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST - Create file/folder, upload, or download selected as zip
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, path: requestPath, name, type, content, files, items, currentPath } = body

    // Download selected files as ZIP
    if (action === 'download-selected-zip') {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'No items selected' }, { status: 400 })
      }

      const zip = new JSZip()
      let fileCount = 0

      for (const itemPath of items) {
        const safePath = getSafePath(itemPath)
        if (!safePath) continue

        try {
          const stats = fs.statSync(safePath)
          
          if (stats.isFile()) {
            // It's a file
            const content = fs.readFileSync(safePath, 'utf-8')
            const fileName = path.basename(safePath)
            zip.file(fileName, content)
            fileCount++
          } else if (stats.isDirectory()) {
            // It's a folder - add all files recursively
            const addFolderToZip = (dirPath: string, zipFolder: JSZip) => {
              const items = fs.readdirSync(dirPath, { withFileTypes: true })
              for (const item of items) {
                if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === '.next') continue
                
                const fullPath = path.join(dirPath, item.name)
                if (item.isDirectory()) {
                  const subFolder = zipFolder.folder(item.name)
                  if (subFolder) {
                    addFolderToZip(fullPath, subFolder)
                  }
                } else {
                  const fileContent = fs.readFileSync(fullPath, 'utf-8')
                  zipFolder.file(item.name, fileContent)
                  fileCount++
                }
              }
            }
            
            const folderName = path.basename(safePath)
            const zipFolder = zip.folder(folderName)
            if (zipFolder) {
              addFolderToZip(safePath, zipFolder)
            }
          }
        } catch (e) {
          console.error(`Error processing ${itemPath}:`, e)
        }
      }

      if (fileCount === 0) {
        return NextResponse.json({ error: 'No files found to zip' }, { status: 404 })
      }

      const zipContent = await zip.generateAsync({ type: 'base64' })

      return NextResponse.json({
        success: true,
        filename: `selected_${fileCount}_files_${new Date().toISOString().split('T')[0]}.zip`,
        content: zipContent,
        fileCount
      })
    }

    // Create file or folder
    if (action === 'create') {
      const safePath = getSafePath(requestPath || '/')
      if (!safePath) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      const newPath = path.join(safePath, name)
      if (!isPathAllowed(newPath)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      if (type === 'folder') {
        fs.mkdirSync(newPath, { recursive: true })
        return NextResponse.json({ success: true, message: 'Folder created' })
      } else {
        fs.writeFileSync(newPath, content || '', 'utf-8')
        return NextResponse.json({ success: true, message: 'File created' })
      }
    }

    // Upload files
    if (action === 'upload' && files) {
      const safePath = getSafePath(requestPath || '/')
      if (!safePath) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      let uploadedCount = 0
      for (const file of files) {
        const filePath = path.join(safePath, file.name)
        if (isPathAllowed(filePath)) {
          fs.writeFileSync(filePath, file.content || '', 'utf-8')
          uploadedCount++
        }
      }

      return NextResponse.json({ success: true, uploadedCount })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Filesystem POST error:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}

// PUT - Update/Edit file
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, path: requestPath, content, newName } = body

    const safePath = getSafePath(requestPath)
    if (!safePath) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Edit file
    if (action === 'edit') {
      if (!fs.existsSync(safePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }

      fs.writeFileSync(safePath, content, 'utf-8')
      return NextResponse.json({ success: true, message: 'File saved' })
    }

    // Rename file/folder
    if (action === 'rename' && newName) {
      const dir = path.dirname(safePath)
      const newPath = path.join(dir, newName)
      
      if (!isPathAllowed(newPath)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      fs.renameSync(safePath, newPath)
      return NextResponse.json({ success: true, message: 'Renamed' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Filesystem PUT error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE - Delete file/folder
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestPath = searchParams.get('path')

    if (!requestPath) {
      return NextResponse.json({ error: 'Path required' }, { status: 400 })
    }

    const safePath = getSafePath(requestPath)
    if (!safePath) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!fs.existsSync(safePath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const stats = fs.statSync(safePath)
    if (stats.isDirectory()) {
      fs.rmSync(safePath, { recursive: true, force: true })
    } else {
      fs.unlinkSync(safePath)
    }

    return NextResponse.json({ success: true, message: 'Deleted' })
  } catch (error) {
    console.error('Filesystem DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
