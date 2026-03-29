import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

// Base directory - the project root
const BASE_DIR = '/home/z/my-project'

// File icons based on extension
const FILE_ICONS: Record<string, string> = {
  'ts': 'typescript',
  'tsx': 'react',
  'js': 'javascript',
  'jsx': 'react',
  'cs': 'csharp',
  'cshtml': 'razor',
  'sql': 'database',
  'json': 'json',
  'md': 'markdown',
  'css': 'css',
  'html': 'html',
  'prisma': 'prisma',
  'yaml': 'config',
  'yml': 'config',
  'env': 'env',
  'png': 'image',
  'jpg': 'image',
  'jpeg': 'image',
  'gif': 'image',
  'svg': 'svg',
  'zip': 'archive',
  'tar': 'archive',
  'gz': 'archive',
  'pdf': 'pdf',
}

// GET - List directory contents or get file content
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const dirPath = searchParams.get('path') || '/'
    const filePath = searchParams.get('file')
    const search = searchParams.get('search')

    // Resolve full path
    const fullPath = resolvePath(dirPath)

    // Get file content
    if (action === 'read') {
      const targetPath = filePath ? resolvePath(filePath) : fullPath
      return await readFileContent(targetPath)
    }

    // Search files
    if (action === 'search' && search) {
      return await searchFiles(fullPath, search)
    }

    // Get file info
    if (action === 'info' && filePath) {
      return await getFileInfo(resolvePath(filePath))
    }

    // List directory
    if (action === 'list') {
      return await listDirectory(fullPath, dirPath)
    }

    // Get tree structure
    if (action === 'tree') {
      return await getDirectoryTree(fullPath)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('File system error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

// POST - Create file/folder, write file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, path: relPath, name, type, content } = body

    const fullPath = resolvePath(relPath)

    // Create folder
    if (action === 'create-folder' && name) {
      const newFolderPath = path.join(fullPath, name)
      
      if (fs.existsSync(newFolderPath)) {
        return NextResponse.json(
          { error: 'Folder already exists' },
          { status: 400 }
        )
      }

      fs.mkdirSync(newFolderPath, { recursive: true })
      return NextResponse.json({ 
        success: true, 
        message: 'Folder created',
        path: path.join(relPath, name)
      })
    }

    // Create file
    if (action === 'create-file' && name) {
      const newFilePath = path.join(fullPath, name)
      
      if (fs.existsSync(newFilePath)) {
        return NextResponse.json(
          { error: 'File already exists' },
          { status: 400 }
        )
      }

      fs.writeFileSync(newFilePath, content || '', 'utf8')
      return NextResponse.json({ 
        success: true, 
        message: 'File created',
        path: path.join(relPath, name)
      })
    }

    // Write file content
    if (action === 'write' && name) {
      const filePath = path.join(fullPath, name)
      
      fs.writeFileSync(filePath, content || '', 'utf8')
      return NextResponse.json({ 
        success: true, 
        message: 'File saved',
        path: path.join(relPath, name)
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('File system POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

// PUT - Rename file/folder
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, path: relPath, oldName, newName, source, target } = body

    const fullPath = resolvePath(relPath)

    // Rename
    if (action === 'rename' && oldName && newName) {
      const oldPath = path.join(fullPath, oldName)
      const newPath = path.join(fullPath, newName)

      if (!fs.existsSync(oldPath)) {
        return NextResponse.json(
          { error: 'File/folder not found' },
          { status: 404 }
        )
      }

      if (fs.existsSync(newPath)) {
        return NextResponse.json(
          { error: 'Target name already exists' },
          { status: 400 }
        )
      }

      fs.renameSync(oldPath, newPath)
      return NextResponse.json({ 
        success: true, 
        message: 'Renamed successfully'
      })
    }

    // Move
    if (action === 'move' && source && target) {
      const sourcePath = resolvePath(source)
      const targetPath = resolvePath(target)

      if (!fs.existsSync(sourcePath)) {
        return NextResponse.json(
          { error: 'Source not found' },
          { status: 404 }
        )
      }

      fs.renameSync(sourcePath, targetPath)
      return NextResponse.json({ success: true, message: 'Moved successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('File system PUT error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    )
  }
}

// DELETE - Delete file/folder
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const relPath = searchParams.get('path')
    const name = searchParams.get('name')

    if (!relPath) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      )
    }

    const fullPath = resolvePath(relPath)
    const targetPath = name ? path.join(fullPath, name) : fullPath

    if (!fs.existsSync(targetPath)) {
      return NextResponse.json(
        { error: 'File/folder not found' },
        { status: 404 }
      )
    }

    const stats = fs.statSync(targetPath)
    
    if (stats.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true })
    } else {
      fs.unlinkSync(targetPath)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Deleted successfully' 
    })
  } catch (error: any) {
    console.error('File system DELETE error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete' },
      { status: 500 }
    )
  }
}

// Helper functions

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

async function listDirectory(fullPath: string, relPath: string) {
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json(
      { error: 'Directory not found', path: relPath },
      { status: 404 }
    )
  }

  const stats = fs.statSync(fullPath)
  if (!stats.isDirectory()) {
    return NextResponse.json(
      { error: 'Not a directory', path: relPath },
      { status: 400 }
    )
  }

  const items = fs.readdirSync(fullPath)
  
  // Filter out node_modules and hidden files
  const filteredItems = items.filter(item => {
    if (item === 'node_modules' || item === '.next' || item === '.git') return false
    if (item.startsWith('.') && item !== '.env' && item !== '.env.example') return false
    return true
  })

  const contents = filteredItems.map(item => {
    const itemPath = path.join(fullPath, item)
    const itemStats = fs.statSync(itemPath)
    const isDirectory = itemStats.isDirectory()
    const ext = item.split('.').pop()?.toLowerCase() || ''
    
    return {
      name: item,
      path: relPath === '/' ? `/${item}` : `${relPath}/${item}`,
      type: isDirectory ? 'folder' : 'file',
      extension: isDirectory ? null : ext,
      icon: isDirectory ? 'folder' : (FILE_ICONS[ext] || 'file'),
      size: isDirectory ? null : itemStats.size,
      modified: itemStats.mtime.toISOString(),
      created: itemStats.birthtime.toISOString(),
      readable: true,
      writable: true,
    }
  })

  // Sort: folders first, then files alphabetically
  contents.sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1
    if (a.type !== 'folder' && b.type === 'folder') return 1
    return a.name.localeCompare(b.name)
  })

  // Build breadcrumb
  const breadcrumb = buildBreadcrumb(relPath)

  // Calculate stats
  const stats_info = {
    totalItems: contents.length,
    folders: contents.filter(i => i.type === 'folder').length,
    files: contents.filter(i => i.type === 'file').length,
    totalSize: contents
      .filter(i => i.type === 'file')
      .reduce((sum, f) => sum + (f.size || 0), 0)
  }

  return NextResponse.json({
    path: relPath,
    breadcrumb,
    contents,
    stats: stats_info
  })
}

async function readFileContent(fullPath: string) {
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    )
  }

  const stats = fs.statSync(fullPath)
  if (stats.isDirectory()) {
    return NextResponse.json(
      { error: 'Cannot read directory' },
      { status: 400 }
    )
  }

  // Check file size (limit to 5MB for text files)
  if (stats.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File too large to preview (> 5MB)' },
      { status: 400 }
    )
  }

  const relPath = fullPath.replace(BASE_DIR, '')
  const ext = relPath.split('.').pop()?.toLowerCase() || ''
  const binaryExtensions = ['png', 'jpg', 'jpeg', 'gif', 'ico', 'pdf', 'zip', 'tar', 'gz', 'woff', 'woff2', 'ttf', 'eot']
  
  if (binaryExtensions.includes(ext)) {
    return NextResponse.json({
      path: relPath,
      content: null,
      isBinary: true,
      size: stats.size,
      message: 'Binary file - cannot display as text'
    })
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8')
    const lines = content.split('\n').length

    return NextResponse.json({
      path: relPath,
      content,
      isBinary: false,
      size: stats.size,
      lines,
      modified: stats.mtime.toISOString(),
      extension: ext,
      language: getLanguageFromExtension(ext)
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read file. It may be binary.' },
      { status: 400 }
    )
  }
}

async function getFileInfo(fullPath: string) {
  if (!fs.existsSync(fullPath)) {
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    )
  }

  const stats = fs.statSync(fullPath)
  const isDirectory = stats.isDirectory()
  const ext = fullPath.split('.').pop()?.toLowerCase() || ''

  return NextResponse.json({
    name: path.basename(fullPath),
    path: fullPath.replace(BASE_DIR, ''),
    type: isDirectory ? 'folder' : 'file',
    extension: isDirectory ? null : ext,
    size: stats.size,
    modified: stats.mtime.toISOString(),
    created: stats.birthtime.toISOString(),
    permissions: {
      readable: true,
      writable: true,
      executable: false
    }
  })
}

async function searchFiles(fullPath: string, query: string) {
  const results: any[] = []
  
  function searchDir(dir: string) {
    const items = fs.readdirSync(dir)
    
    for (const item of items) {
      if (item === 'node_modules' || item === '.next' || item === '.git') continue
      if (item.startsWith('.')) continue
      
      const itemPath = path.join(dir, item)
      const stats = fs.statSync(itemPath)
      
      if (item.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          name: item,
          path: itemPath.replace(BASE_DIR, ''),
          type: stats.isDirectory() ? 'folder' : 'file'
        })
      }
      
      if (stats.isDirectory()) {
        searchDir(itemPath)
      }
    }
  }

  searchDir(fullPath)

  return NextResponse.json({
    query,
    results: results.slice(0, 100),
    total: results.length
  })
}

async function getDirectoryTree(fullPath: string, depth: number = 3): Promise<NextResponse> {
  const tree = buildTree(fullPath, 0, depth)
  return NextResponse.json({ tree })

  function buildTree(dir: string, currentDepth: number, maxDepth: number): any {
    if (currentDepth >= maxDepth) return null

    try {
      const items = fs.readdirSync(dir)
      const filteredItems = items.filter(item => {
        if (item === 'node_modules' || item === '.next' || item === '.git') return false
        if (item.startsWith('.')) return false
        return true
      })

      return filteredItems.map(item => {
        const itemPath = path.join(dir, item)
        const stats = fs.statSync(itemPath)
        const isDirectory = stats.isDirectory()

        return {
          name: item,
          type: isDirectory ? 'folder' : 'file',
          children: isDirectory ? buildTree(itemPath, currentDepth + 1, maxDepth) : undefined
        }
      })
    } catch {
      return null
    }
  }
}

function buildBreadcrumb(relPath: string) {
  if (relPath === '/') return [{ name: 'root', path: '/' }]

  const parts = relPath.split('/').filter(Boolean)
  const breadcrumb = [{ name: 'root', path: '/' }]

  let currentPath = ''
  for (const part of parts) {
    currentPath += `/${part}`
    breadcrumb.push({
      name: part,
      path: currentPath
    })
  }

  return breadcrumb
}

function getLanguageFromExtension(ext: string): string {
  const langMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'cs': 'csharp',
    'cshtml': 'razor',
    'sql': 'sql',
    'json': 'json',
    'md': 'markdown',
    'css': 'css',
    'html': 'html',
    'prisma': 'prisma',
    'yaml': 'yaml',
    'yml': 'yaml',
    'env': 'bash',
    'sh': 'bash',
    'xml': 'xml',
    'svg': 'xml',
  }
  return langMap[ext] || 'plaintext'
}
