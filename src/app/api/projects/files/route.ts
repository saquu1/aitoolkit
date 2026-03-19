import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Detect and convert UTF-16 encoding (common with SSMS exports)
function normalizeEncoding(content: string): string {
  if (!content) return content
  
  // Check for UTF-16 LE BOM (FF FE) or UTF-16 BE BOM (FE FF)
  // In string form, this appears as extra null characters
  
  // Detect UTF-16 LE pattern: characters separated by null bytes
  // Example: "U\0S\0E\0" instead of "USE"
  if (content.includes('\u0000')) {
    // Has null bytes - likely UTF-16
    try {
      // Remove null bytes and decode
      const cleaned = content.replace(/\u0000/g, '')
      // Check if result looks valid
      if (cleaned.length > 0 && /[a-zA-Z]/.test(cleaned)) {
        return cleaned
      }
    } catch (e) {
      console.warn('UTF-16 decode attempt failed:', e)
    }
  }
  
  // Check for spaced character pattern (each char separated by space)
  // This happens when UTF-16 is incorrectly converted
  const spacedPattern = content.match(/^(?:[A-Za-z]\s)+[A-Za-z]?$/)
  if (spacedPattern && content.length > 20) {
    // Remove the spaces between characters
    const compacted = content.replace(/\s+/g, '')
    if (compacted.length > 0) {
      return compacted
    }
  }
  
  // Check for pattern where every character is followed by a space
  // "U S E " -> "USE"
  if (/^(\S\s)+$/.test(content) && content.length > 10) {
    return content.replace(/\s/g, '')
  }
  
  return content
}

// GET - List files in a project or get a single file
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const fileId = searchParams.get('fileId')
    const fileType = searchParams.get('fileType')

    if (fileId) {
      // Get single file
      const file = await prisma.toolkitFile.findUnique({
        where: { id: fileId },
        include: {
          project: {
            select: { id: true, name: true }
          }
        }
      })

      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }

      return NextResponse.json({ file })
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // List files in project
    const where: any = { projectId }
    if (fileType) {
      where.fileType = fileType
    }

    const files = await prisma.toolkitFile.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ files })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    )
  }
}

// POST - Add a file to a project (supports both JSON and FormData) and trigger parsing
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    let projectId: string
    let files: Array<{
      fileName: string
      filePath?: string
      fileType: string
      fileSize: number
      lineCount: number
      content: string
      contentHash?: string
    }> = []

    // Handle FormData (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      projectId = formData.get('projectId') as string
      
      if (!projectId) {
        return NextResponse.json(
          { error: 'Project ID is required' },
          { status: 400 }
        )
      }

      // Get all files from formData
      const fileEntries = formData.getAll('files')
      
      for (const entry of fileEntries) {
        if (entry instanceof File) {
          const file = entry as File
          let content = await file.text()
          
          // Handle UTF-16 encoding (common with SSMS exports)
          content = normalizeEncoding(content)
          
          const lineCount = content.split('\n').length
          
          // Determine file type from extension
          const ext = file.name.split('.').pop()?.toLowerCase() || ''
          let fileType = 'unknown'
          if (ext === 'sql') fileType = 'sql'
          else if (ext === 'cshtml' || ext === 'vbhtml') fileType = 'cshtml'
          else if (ext === 'aspx' || ext === 'asmx') fileType = 'aspx'
          else if (ext === 'cs') fileType = 'cs'
          else if (ext === 'js') fileType = 'js'
          else if (ext === 'ts') fileType = 'ts'
          else if (ext === 'json') fileType = 'json'
          else if (ext === 'xml') fileType = 'xml'
          
          files.push({
            fileName: file.name,
            fileType,
            fileSize: file.size,
            lineCount,
            content
          })
        }
      }
    } else {
      // Handle JSON body
      const body = await request.json()
      projectId = body.projectId
      
      if (body.fileName) {
        // Single file in JSON format
        files.push({
          fileName: body.fileName,
          filePath: body.filePath,
          fileType: body.fileType,
          fileSize: body.fileSize || 0,
          lineCount: body.lineCount || 0,
          content: body.content || '',
          contentHash: body.contentHash
        })
      } else if (body.files) {
        // Multiple files in JSON format
        files = body.files
      }
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Check if project exists
    const project = await prisma.toolkitProject.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Process all files
    const results = []
    const parsedFiles: Array<{ name: string; content: string; path?: string }> = []
    
    for (const fileData of files) {
      if (!fileData.fileName || !fileData.fileType) {
        results.push({
          fileName: fileData.fileName || 'unknown',
          status: 'error',
          error: 'File name and file type are required'
        })
        continue
      }

      try {
        // Check if file with same name already exists in project
        const existing = await prisma.toolkitFile.findUnique({
          where: {
            projectId_fileName: { projectId, fileName: fileData.fileName }
          }
        })

        let file
        if (existing) {
          // Update existing file
          file = await prisma.toolkitFile.update({
            where: { id: existing.id },
            data: {
              filePath: fileData.filePath,
              fileType: fileData.fileType,
              fileSize: fileData.fileSize,
              lineCount: fileData.lineCount,
              content: fileData.content,
              contentHash: fileData.contentHash,
              parseStatus: 'pending',
              parseError: null,
              parsedAt: null
            }
          })
        } else {
          // Create new file
          file = await prisma.toolkitFile.create({
            data: {
              projectId,
              fileName: fileData.fileName,
              filePath: fileData.filePath || null,
              fileType: fileData.fileType,
              fileSize: fileData.fileSize,
              lineCount: fileData.lineCount,
              content: fileData.content,
              contentHash: fileData.contentHash || null,
              parseStatus: 'pending'
            }
          })
        }
        
        // Collect for parsing
        parsedFiles.push({
          name: fileData.fileName,
          content: fileData.content,
          path: fileData.filePath || fileData.fileName
        })
        
        results.push({
          fileName: fileData.fileName,
          status: 'success',
          fileId: file.id
        })
      } catch (fileError: any) {
        results.push({
          fileName: fileData.fileName,
          status: 'error',
          error: fileError.message || 'Failed to save file'
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    
    // Trigger parsing for uploaded files
    if (parsedFiles.length > 0) {
      try {
        // Call parsers API to parse the files
        const parseResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/parsers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'parse-all',
            files: parsedFiles,
            projectId
          })
        })
        
        if (parseResponse.ok) {
          const parseResult = await parseResponse.json()
          console.log('Parse result:', parseResult.summary)
          
          // Update file statuses based on parsing results
          for (const result of results) {
            if (result.status === 'success' && result.fileId) {
              // Determine counts based on file type
              const fileData = files.find(f => f.fileName === result.fileName)
              let tablesFound = 0
              let proceduresFound = 0
              
              if (fileData?.fileType.includes('sql')) {
                tablesFound = parseResult.sql?.summary?.totalTables || 0
                proceduresFound = parseResult.sql?.summary?.totalProcedures || 0
              } else if (fileData?.fileType === 'cshtml') {
                tablesFound = parseResult.cshtml?.summary?.totalTables || 0
              }
              
              await prisma.toolkitFile.update({
                where: { id: result.fileId },
                data: {
                  parseStatus: 'parsed',
                  parsedAt: new Date(),
                  tablesFound,
                  proceduresFound,
                  complexity: parseResult.summary?.totalEventHandlers || 0
                }
              })
            }
          }
        } else {
          console.error('Parse failed:', await parseResponse.text())
          // Mark files as error
          for (const result of results) {
            if (result.status === 'success' && result.fileId) {
              await prisma.toolkitFile.update({
                where: { id: result.fileId },
                data: {
                  parseStatus: 'error',
                  parseError: 'Failed to parse file'
                }
              })
            }
          }
        }
      } catch (parseError) {
        console.error('Error triggering parse:', parseError)
      }
    }
    
    return NextResponse.json({
      success: successCount > 0,
      message: successCount > 0 
        ? `Successfully uploaded and parsed ${successCount} of ${files.length} file(s)` 
        : 'Failed to upload files',
      results,
      files: await prisma.toolkitFile.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' }
      })
    }, { status: successCount > 0 ? 201 : 400 })
    
  } catch (error: any) {
    console.error('Error adding file:', error)
    return NextResponse.json(
      { error: 'Failed to add file', message: error.message },
      { status: 500 }
    )
  }
}

// PUT - Update a file
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      content,
      parseStatus,
      parseError,
      tablesFound,
      proceduresFound,
      complexity
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    const file = await prisma.toolkitFile.findUnique({
      where: { id }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.toolkitFile.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(parseStatus && { parseStatus }),
        ...(parseError !== undefined && { parseError }),
        ...(tablesFound !== undefined && { tablesFound }),
        ...(proceduresFound !== undefined && { proceduresFound }),
        ...(complexity !== undefined && { complexity }),
        ...(parseStatus === 'parsed' && { parsedAt: new Date() })
      }
    })

    return NextResponse.json({ file: updated })
  } catch (error) {
    console.error('Error updating file:', error)
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

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
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
