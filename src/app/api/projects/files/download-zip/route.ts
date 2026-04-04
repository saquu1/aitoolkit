import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Simple ZIP file creator (no external dependencies)
// Creates a basic ZIP file structure compatible with most ZIP readers
function createZipFile(files: { fileName: string; content: string }[]): Buffer {
  const localFileHeaders: Buffer[] = []
  const centralDirectory: Buffer[] = []
  let offset = 0

  for (const file of files) {
    const fileNameBuffer = Buffer.from(file.fileName, 'utf8')
    const contentBuffer = Buffer.from(file.content, 'utf8')

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

// CRC32 implementation
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fileIds, projectId } = body

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'File IDs are required' },
        { status: 400 }
      )
    }

    // Fetch files from database
    const files = await db.toolkitFile.findMany({
      where: {
        id: { in: fileIds },
        ...(projectId && { projectId })
      }
    })

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files found' },
        { status: 404 }
      )
    }

    // Prepare files for ZIP
    const zipFiles = files.map(f => ({
      fileName: f.fileName,
      content: f.content || ''
    }))

    // Create ZIP buffer
    const zipBuffer = createZipFile(zipFiles)

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="files_${new Date().toISOString().slice(0, 10)}.zip"`,
        'Content-Length': zipBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Error creating ZIP:', error)
    return NextResponse.json(
      { error: 'Failed to create ZIP file' },
      { status: 500 }
    )
  }
}
