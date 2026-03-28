import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import JSZip from 'jszip'

const prisma = new PrismaClient()

// GET - List files/folders or get file content
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const fileId = searchParams.get('fileId')
    const path = searchParams.get('path') || '/'
    const action = searchParams.get('action')

    // Get single file content
    if (fileId) {
      const file = await prisma.toolkitFile.findUnique({
        where: { id: fileId },
        include: {
          project: { select: { id: true, name: true } }
        }
      })

      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }

      return NextResponse.json({ file })
    }

    // Download/backup project as zip
    if (action === 'backup' && projectId) {
      const project = await prisma.toolkitProject.findUnique({
        where: { id: projectId },
        include: {
          ToolkitFile: true
        }
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      const zip = new JSZip()

      // Add each file to the zip
      for (const file of project.ToolkitFile) {
        const folder = zip.folder(file.filePath || '')
        if (folder) {
          folder.file(file.fileName, file.content || '')
        } else {
          zip.file(file.fileName, file.content || '')
        }
      }

      // Add project metadata
      zip.file('_project_info.json', JSON.stringify({
        name: project.name,
        description: project.description,
        softwareType: project.softwareType,
        exportedAt: new Date().toISOString(),
        fileCount: project.ToolkitFile.length
      }, null, 2))

      const zipContent = await zip.generateAsync({ type: 'base64' })

      return NextResponse.json({
        success: true,
        filename: `${project.name.replace(/\s+/g, '_')}_backup_${new Date().toISOString().split('T')[0]}.zip`,
        content: zipContent
      })
    }

    // List files in project
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Get all files for the project
    const files = await prisma.toolkitFile.findMany({
      where: { projectId },
      orderBy: [
        { filePath: 'asc' },
        { fileName: 'asc' }
      ]
    })

    // Build directory structure
    const structure = buildDirectoryStructure(files, path)

    return NextResponse.json({
      files,
      structure,
      currentPath: path
    })
  } catch (error) {
    console.error('Error in file manager GET:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// POST - Create file/folder, upload, or download selected as zip
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, projectId, name, path, type, content, files, items, currentPath } = body

    // Download selected files as ZIP
    if (action === 'download-selected-zip') {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: 'No items selected' },
          { status: 400 }
        )
      }

      if (!projectId) {
        return NextResponse.json(
          { error: 'Project ID is required' },
          { status: 400 }
        )
      }

      const zip = new JSZip()
      let fileCount = 0

      for (const itemPath of items) {
        // Check if it's a file or folder
        const file = await prisma.toolkitFile.findFirst({
          where: {
            projectId,
            OR: [
              { id: itemPath },
              { fileName: itemPath.split('/').pop() || itemPath },
              { filePath: itemPath }
            ]
          }
        })

        if (file) {
          // It's a single file
          const folder = file.filePath && file.filePath !== '/' ? zip.folder(file.filePath) : null
          if (folder) {
            folder.file(file.fileName, file.content || '')
          } else {
            zip.file(file.fileName, file.content || '')
          }
          fileCount++
        } else {
          // It might be a folder - get all files in that path
          const folderFiles = await prisma.toolkitFile.findMany({
            where: {
              projectId,
              filePath: { startsWith: itemPath }
            }
          })

          for (const folderFile of folderFiles) {
            const relativePath = folderFile.filePath.replace(itemPath, '').replace(/^\//, '')
            const folder = relativePath ? zip.folder(relativePath) : zip
            folder.file(folderFile.fileName, folderFile.content || '')
            fileCount++
          }
        }
      }

      if (fileCount === 0) {
        return NextResponse.json(
          { error: 'No files found to zip' },
          { status: 404 }
        )
      }

      const zipContent = await zip.generateAsync({ type: 'base64' })

      return NextResponse.json({
        success: true,
        filename: `selected_${fileCount}_files_${new Date().toISOString().split('T')[0]}.zip`,
        content: zipContent,
        fileCount
      })
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Upload multiple files
    if (action === 'upload' && files && Array.isArray(files)) {
      const createdFiles = []
      for (const file of files) {
        const existing = await prisma.toolkitFile.findUnique({
          where: {
            projectId_fileName: {
              projectId,
              fileName: file.name
            }
          }
        })

        if (existing) {
          // Update existing file
          const updated = await prisma.toolkitFile.update({
            where: { id: existing.id },
            data: {
              content: file.content || '',
              filePath: file.path || existing.filePath,
              fileType: file.type || existing.fileType,
              fileSize: file.size || existing.fileSize,
              lineCount: file.content ? file.content.split('\n').length : existing.lineCount,
              parseStatus: 'pending'
            }
          })
          createdFiles.push(updated)
        } else {
          // Create new file
          const created = await prisma.toolkitFile.create({
            data: {
              projectId,
              fileName: file.name,
              filePath: file.path || '/',
              fileType: file.type || detectFileType(file.name),
              fileSize: file.size || 0,
              lineCount: file.content ? file.content.split('\n').length : 0,
              content: file.content || '',
              parseStatus: 'pending'
            }
          })
          createdFiles.push(created)
        }
      }

      return NextResponse.json({
        success: true,
        createdCount: createdFiles.length,
        files: createdFiles
      })
    }

    // Create new file or folder
    if (action === 'create') {
      if (!name) {
        return NextResponse.json(
          { error: 'Name is required' },
          { status: 400 }
        )
      }

      // Create folder (as a special marker)
      if (type === 'folder') {
        // Folders are virtual - they exist when files have that path
        // We return success but don't create anything in DB
        return NextResponse.json({
          success: true,
          message: 'Folder created',
          path: path ? `${path}/${name}` : `/${name}`
        })
      }

      // Create file
      const fileType = detectFileType(name)
      const file = await prisma.toolkitFile.create({
        data: {
          projectId,
          fileName: name,
          filePath: path || '/',
          fileType,
          fileSize: 0,
          lineCount: 0,
          content: content || '',
          parseStatus: 'pending'
        }
      })

      return NextResponse.json({ file }, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in file manager POST:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// PUT - Update file (rename, move, edit)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, fileId, name, path, content, targetPath } = body

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    const file = await prisma.toolkitFile.findUnique({
      where: { id: fileId }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Rename file
    if (action === 'rename' && name) {
      const updated = await prisma.toolkitFile.update({
        where: { id: fileId },
        data: {
          fileName: name,
          fileType: detectFileType(name)
        }
      })
      return NextResponse.json({ file: updated })
    }

    // Move file
    if (action === 'move' && targetPath !== undefined) {
      const updated = await prisma.toolkitFile.update({
        where: { id: fileId },
        data: { filePath: targetPath }
      })
      return NextResponse.json({ file: updated })
    }

    // Edit file content
    if (action === 'edit' && content !== undefined) {
      const updated = await prisma.toolkitFile.update({
        where: { id: fileId },
        data: {
          content,
          lineCount: content.split('\n').length,
          fileSize: Buffer.byteLength(content, 'utf8'),
          parseStatus: 'pending'
        }
      })
      return NextResponse.json({ file: updated })
    }

    // Copy file
    if (action === 'copy' && targetPath !== undefined) {
      const copyName = `copy_of_${file.fileName}`
      const copy = await prisma.toolkitFile.create({
        data: {
          projectId: file.projectId,
          fileName: copyName,
          filePath: targetPath || file.filePath,
          fileType: file.fileType,
          fileSize: file.fileSize,
          lineCount: file.lineCount,
          content: file.content,
          parseStatus: 'pending'
        }
      })
      return NextResponse.json({ file: copy }, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in file manager PUT:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// DELETE - Delete file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const projectId = searchParams.get('projectId')
    const path = searchParams.get('path')

    // Delete folder (all files in path)
    if (projectId && path) {
      const files = await prisma.toolkitFile.findMany({
        where: {
          projectId,
          filePath: { startsWith: path }
        }
      })

      await prisma.toolkitFile.deleteMany({
        where: {
          projectId,
          filePath: { startsWith: path }
        }
      })

      return NextResponse.json({
        success: true,
        deletedCount: files.length
      })
    }

    // Delete single file
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    const file = await prisma.toolkitFile.findUnique({
      where: { id: fileId }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    await prisma.toolkitFile.delete({
      where: { id: fileId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in file manager DELETE:', error)
    return NextResponse.json(
      { error: 'Failed to delete' },
      { status: 500 }
    )
  }
}

// Helper: Build directory structure from flat file list
function buildDirectoryStructure(files: any[], currentPath: string) {
  const folders: Map<string, { name: string; path: string; fileCount: number }> = new Map()
  const fileList: any[] = []

  for (const file of files) {
    const filePath = file.filePath || '/'

    // Add to folders if not in current path
    if (filePath.startsWith(currentPath)) {
      const relativePath = filePath.slice(currentPath.length).replace(/^\//, '')

      if (relativePath && relativePath.includes('/')) {
        // This file is in a subfolder
        const folderName = relativePath.split('/')[0]
        const folderPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`

        if (!folders.has(folderPath)) {
          folders.set(folderPath, {
            name: folderName,
            path: folderPath,
            fileCount: 1
          })
        } else {
          folders.get(folderPath)!.fileCount++
        }
      } else if (filePath === currentPath || (currentPath === '/' && filePath === '/')) {
        // File is in current directory
        fileList.push(file)
      }
    }
  }

  return {
    folders: Array.from(folders.values()),
    files: fileList
  }
}

// Helper: Detect file type from name
function detectFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()

  const typeMap: Record<string, string> = {
    'sql': 'sql_ddl',
    'cshtml': 'cshtml',
    'vbhtml': 'cshtml',
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'json': 'json',
    'xml': 'config',
    'config': 'config',
    'cs': 'controller',
    'css': 'config',
    'html': 'html',
    'md': 'config',
    'txt': 'config'
  }

  return typeMap[ext || ''] || 'unknown'
}
