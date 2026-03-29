/**
 * Project Export Service
 * 
 * Generates and packages complete Next.js projects as downloadable ZIP files.
 * Part of Phase 5: Project Export & Download
 * 
 * Features:
 * - ZIP file creation with proper directory structure
 * - Streaming support for large projects
 * - Progress reporting
 * - Content caching
 */

import {
  generateProjectScaffold,
  type ProjectConfig,
  type ScaffoldGenerationResult,
  type FileMap,
} from '@/lib/generators/project-scaffold'

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ExportProgress {
  phase: 'preparing' | 'generating' | 'packaging' | 'complete' | 'error'
  current: number
  total: number
  message: string
  filesProcessed: number
  totalFiles: number
}

export interface ExportResult {
  success: boolean
  filename: string
  size: number
  fileCount: number
  downloadUrl?: string
  base64Content?: string
  errors: string[]
  warnings: string[]
  manifest: ExportManifest
}

export interface ExportManifest {
  projectName: string
  version: string
  exportedAt: string
  generator: string
  tables: string[]
  apis: string[]
  components: string[]
  pages: string[]
  features: string[]
  statistics: {
    totalFiles: number
    totalSize: number
    byExtension: Record<string, number>
  }
}

export type ProgressCallback = (progress: ExportProgress) => void

// ══════════════════════════════════════════════════════════════════════════════
// ZIP GENERATOR (Pure JavaScript Implementation)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Simple ZIP file generator
 * Creates ZIP files without external dependencies using the ZIP specification
 */
class ZipBuilder {
  private files: ZipFileEntry[] = []
  private offset = 0

  addFile(path: string, content: string | Buffer): void {
    const contentBuffer = typeof content === 'string' 
      ? Buffer.from(content, 'utf-8') 
      : content
    
    // Normalize path separators
    const normalizedPath = path.replace(/\\/g, '/')

    this.files.push({
      path: normalizedPath,
      content: contentBuffer,
      offset: this.offset,
      date: new Date(),
    })

    this.offset += 30 + normalizedPath.length + contentBuffer.length
  }

  addDirectory(path: string): void {
    const normalizedPath = path.replace(/\\/g, '/')
    const dirPath = normalizedPath.endsWith('/') ? normalizedPath : normalizedPath + '/'
    
    this.files.push({
      path: dirPath,
      content: Buffer.alloc(0),
      offset: this.offset,
      date: new Date(),
      isDirectory: true,
    })

    this.offset += 30 + dirPath.length
  }

  build(): Buffer {
    const buffers: Buffer[] = []

    // Write local file headers and file data
    for (const file of this.files) {
      const localHeader = this.createLocalFileHeader(file)
      buffers.push(localHeader)
      buffers.push(Buffer.from(file.path, 'utf-8'))
      if (file.content.length > 0) {
        buffers.push(file.content)
      }
    }

    // Write central directory
    const centralDirOffset = this.offset
    let centralDirSize = 0

    for (const file of this.files) {
      const centralDirHeader = this.createCentralDirectoryHeader(file)
      buffers.push(centralDirHeader)
      centralDirSize += centralDirHeader.length
    }

    // Write end of central directory record
    const eocd = this.createEndOfCentralDirectory(
      this.files.length,
      centralDirSize,
      centralDirOffset
    )
    buffers.push(eocd)

    return Buffer.concat(buffers)
  }

  private createLocalFileHeader(file: ZipFileEntry): Buffer {
    const buffer = Buffer.alloc(30)
    const dosTime = this.dateToDos(file.date)

    // Signature
    buffer.writeUInt32LE(0x04034b50, 0)
    // Version needed to extract
    buffer.writeUInt16LE(20, 4)
    // General purpose bit flag
    buffer.writeUInt16LE(0x0800, 6) // UTF-8 filename
    // Compression method (0 = stored)
    buffer.writeUInt16LE(0, 8)
    // Last mod file time
    buffer.writeUInt16LE(dosTime.time, 10)
    // Last mod file date
    buffer.writeUInt16LE(dosTime.date, 12)
    // CRC-32
    buffer.writeUInt32LE(this.crc32(file.content), 14)
    // Compressed size
    buffer.writeUInt32LE(file.content.length, 18)
    // Uncompressed size
    buffer.writeUInt32LE(file.content.length, 22)
    // File name length
    buffer.writeUInt16LE(Buffer.byteLength(file.path, 'utf-8'), 26)
    // Extra field length
    buffer.writeUInt16LE(0, 28)

    return buffer
  }

  private createCentralDirectoryHeader(file: ZipFileEntry): Buffer {
    const buffer = Buffer.alloc(46)
    const dosTime = this.dateToDos(file.date)

    // Signature
    buffer.writeUInt32LE(0x02014b50, 0)
    // Version made by
    buffer.writeUInt16LE(20, 4)
    // Version needed to extract
    buffer.writeUInt16LE(20, 6)
    // General purpose bit flag
    buffer.writeUInt16LE(0x0800, 8) // UTF-8 filename
    // Compression method
    buffer.writeUInt16LE(0, 10)
    // Last mod file time
    buffer.writeUInt16LE(dosTime.time, 12)
    // Last mod file date
    buffer.writeUInt16LE(dosTime.date, 14)
    // CRC-32
    buffer.writeUInt32LE(this.crc32(file.content), 16)
    // Compressed size
    buffer.writeUInt32LE(file.content.length, 20)
    // Uncompressed size
    buffer.writeUInt32LE(file.content.length, 24)
    // File name length
    buffer.writeUInt16LE(Buffer.byteLength(file.path, 'utf-8'), 28)
    // Extra field length
    buffer.writeUInt16LE(0, 30)
    // File comment length
    buffer.writeUInt16LE(0, 32)
    // Disk number start
    buffer.writeUInt16LE(0, 34)
    // Internal file attributes
    buffer.writeUInt16LE(file.isDirectory ? 0x10 : 0, 36)
    // External file attributes
    buffer.writeUInt32LE(file.isDirectory ? 0x10 : 0, 38)
    // Relative offset of local header
    buffer.writeUInt32LE(file.offset, 42)

    // Combine header with filename
    return Buffer.concat([buffer, Buffer.from(file.path, 'utf-8')])
  }

  private createEndOfCentralDirectory(
    entryCount: number,
    centralDirSize: number,
    centralDirOffset: number
  ): Buffer {
    const buffer = Buffer.alloc(22)

    // Signature
    buffer.writeUInt32LE(0x06054b50, 0)
    // Number of this disk
    buffer.writeUInt16LE(0, 4)
    // Disk where central directory starts
    buffer.writeUInt16LE(0, 6)
    // Number of central directory records on this disk
    buffer.writeUInt16LE(entryCount, 8)
    // Total number of central directory records
    buffer.writeUInt16LE(entryCount, 10)
    // Size of central directory
    buffer.writeUInt32LE(centralDirSize, 12)
    // Offset of start of central directory
    buffer.writeUInt32LE(centralDirOffset, 16)
    // Comment length
    buffer.writeUInt16LE(0, 20)

    return buffer
  }

  private dateToDos(date: Date): { date: number; time: number } {
    const dosDate = 
      ((date.getFullYear() - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate()

    const dosTime = 
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      (date.getSeconds() >> 1)

    return { date: dosDate, time: dosTime }
  }

  private crc32(data: Buffer): number {
    let crc = 0xFFFFFFFF
    const table = this.getCrc32Table()

    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF]
    }

    return (crc ^ 0xFFFFFFFF) >>> 0
  }

  private crc32Table: number[] | null = null

  private getCrc32Table(): number[] {
    if (this.crc32Table) return this.crc32Table

    const table: number[] = []
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      }
      table[i] = c
    }
    this.crc32Table = table
    return table
  }
}

interface ZipFileEntry {
  path: string
  content: Buffer
  offset: number
  date: Date
  isDirectory?: boolean
}

// ══════════════════════════════════════════════════════════════════════════════
// PROJECT EXPORTER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Project Exporter Service
 * Handles complete project generation and packaging
 */
export class ProjectExporter {
  private progressCallback: ProgressCallback | null = null

  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback
  }

  private reportProgress(progress: ExportProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress)
    }
  }

  /**
   * Export project as a complete ZIP file
   */
  async exportProject(config: ProjectConfig): Promise<ExportResult> {
    const startTime = Date.now()

    // Report start
    this.reportProgress({
      phase: 'preparing',
      current: 0,
      total: 100,
      message: 'Preparing project export...',
      filesProcessed: 0,
      totalFiles: 0,
    })

    try {
      // Generate scaffold
      this.reportProgress({
        phase: 'generating',
        current: 20,
        total: 100,
        message: 'Generating project files...',
        filesProcessed: 0,
        totalFiles: 0,
      })

      const scaffoldResult = await generateProjectScaffold(config)

      if (!scaffoldResult.success) {
        return {
          success: false,
          filename: '',
          size: 0,
          fileCount: 0,
          errors: scaffoldResult.errors,
          warnings: scaffoldResult.warnings,
          manifest: this.createEmptyManifest(config),
        }
      }

      // Package as ZIP
      this.reportProgress({
        phase: 'packaging',
        current: 60,
        total: 100,
        message: 'Packaging files...',
        filesProcessed: 0,
        totalFiles: scaffoldResult.fileCount,
      })

      const { zipBuffer, manifest } = await this.packageAsZip(
        config,
        scaffoldResult.files,
        scaffoldResult
      )

      // Complete
      this.reportProgress({
        phase: 'complete',
        current: 100,
        total: 100,
        message: 'Export complete!',
        filesProcessed: scaffoldResult.fileCount,
        totalFiles: scaffoldResult.fileCount,
      })

      const filename = this.generateFilename(config)

      return {
        success: true,
        filename,
        size: zipBuffer.length,
        fileCount: scaffoldResult.fileCount,
        base64Content: zipBuffer.toString('base64'),
        errors: scaffoldResult.errors,
        warnings: scaffoldResult.warnings,
        manifest,
      }
    } catch (error: any) {
      this.reportProgress({
        phase: 'error',
        current: 0,
        total: 100,
        message: `Export failed: ${error.message}`,
        filesProcessed: 0,
        totalFiles: 0,
      })

      return {
        success: false,
        filename: '',
        size: 0,
        fileCount: 0,
        errors: [error.message],
        warnings: [],
        manifest: this.createEmptyManifest(config),
      }
    }
  }

  /**
   * Export only specific artifacts
   */
  async exportArtifacts(
    config: ProjectConfig,
    artifacts: string[]
  ): Promise<ExportResult> {
    const scaffoldResult = await generateProjectScaffold(config)

    // Filter to only requested artifacts
    const filteredFiles: FileMap = {}
    for (const [path, content] of Object.entries(scaffoldResult.files)) {
      if (artifacts.some(a => path.includes(a))) {
        filteredFiles[path] = content
      }
    }

    const { zipBuffer, manifest } = await this.packageAsZip(
      config,
      filteredFiles,
      scaffoldResult
    )

    return {
      success: true,
      filename: `${config.projectName}-artifacts.zip`,
      size: zipBuffer.length,
      fileCount: Object.keys(filteredFiles).length,
      base64Content: zipBuffer.toString('base64'),
      errors: scaffoldResult.errors,
      warnings: scaffoldResult.warnings,
      manifest,
    }
  }

  /**
   * Get a preview of what will be exported
   */
  async getExportPreview(config: ProjectConfig): Promise<{
    tables: string[]
    estimatedFiles: number
    estimatedSize: string
    features: string[]
  }> {
    const scaffoldResult = await generateProjectScaffold(config)

    const totalSize = Object.values(scaffoldResult.files)
      .reduce((sum, content) => sum + content.length, 0)

    return {
      tables: scaffoldResult.manifest.tables,
      estimatedFiles: scaffoldResult.fileCount,
      estimatedSize: this.formatBytes(totalSize),
      features: scaffoldResult.manifest.features,
    }
  }

  /**
   * Package files as ZIP
   */
  private async packageAsZip(
    config: ProjectConfig,
    files: FileMap,
    scaffoldResult: ScaffoldGenerationResult
  ): Promise<{ zipBuffer: Buffer; manifest: ExportManifest }> {
    const zip = new ZipBuilder()

    // Sort files by path for consistent ordering
    const sortedFiles = Object.entries(files).sort((a, b) => a[0].localeCompare(b[0]))

    // Track directories to create
    const directories = new Set<string>()

    let processedFiles = 0

    for (const [path, content] of sortedFiles) {
      // Add parent directories
      const parts = path.split('/')
      for (let i = 0; i < parts.length - 1; i++) {
        const dirPath = parts.slice(0, i + 1).join('/') + '/'
        if (!directories.has(dirPath)) {
          directories.add(dirPath)
          zip.addDirectory(dirPath)
        }
      }

      // Add file
      zip.addFile(path, content)

      processedFiles++

      // Report progress
      this.reportProgress({
        phase: 'packaging',
        current: 60 + Math.floor((processedFiles / sortedFiles.length) * 30),
        total: 100,
        message: `Packaging ${path}...`,
        filesProcessed: processedFiles,
        totalFiles: sortedFiles.length,
      })
    }

    const zipBuffer = zip.build()

    // Build manifest
    const manifest = this.buildManifest(config, scaffoldResult)

    return { zipBuffer, manifest }
  }

  /**
   * Build export manifest
   */
  private buildManifest(
    config: ProjectConfig,
    scaffoldResult: ScaffoldGenerationResult
  ): ExportManifest {
    const byExtension: Record<string, number> = {}

    for (const path of Object.keys(scaffoldResult.files)) {
      const ext = path.split('.').pop() || 'unknown'
      byExtension[ext] = (byExtension[ext] || 0) + 1
    }

    return {
      projectName: config.projectName,
      version: config.version || '1.0.0',
      exportedAt: new Date().toISOString(),
      generator: 'AI Enterprise Architect v1.0',
      tables: scaffoldResult.manifest.tables,
      apis: scaffoldResult.manifest.apis,
      components: scaffoldResult.manifest.components,
      pages: scaffoldResult.manifest.pages,
      features: scaffoldResult.manifest.features,
      statistics: {
        totalFiles: scaffoldResult.fileCount,
        totalSize: scaffoldResult.totalSize,
        byExtension,
      },
    }
  }

  /**
   * Create empty manifest for error cases
   */
  private createEmptyManifest(config: ProjectConfig): ExportManifest {
    return {
      projectName: config.projectName,
      version: config.version || '1.0.0',
      exportedAt: new Date().toISOString(),
      generator: 'AI Enterprise Architect v1.0',
      tables: [],
      apis: [],
      components: [],
      pages: [],
      features: [],
      statistics: {
        totalFiles: 0,
        totalSize: 0,
        byExtension: {},
      },
    }
  }

  /**
   * Generate filename for export
   */
  private generateFilename(config: ProjectConfig): string {
    const timestamp = new Date().toISOString().split('T')[0]
    const safeName = config.projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    return `${safeName}-${timestamp}.zip`
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const projectExporter = new ProjectExporter()

/**
 * Export project as ZIP
 */
export async function exportProjectAsZip(
  config: ProjectConfig,
  onProgress?: ProgressCallback
): Promise<ExportResult> {
  const exporter = new ProjectExporter()
  if (onProgress) {
    exporter.onProgress(onProgress)
  }
  return exporter.exportProject(config)
}

/**
 * Export specific artifacts as ZIP
 */
export async function exportArtifactsAsZip(
  config: ProjectConfig,
  artifacts: string[]
): Promise<ExportResult> {
  return projectExporter.exportArtifacts(config, artifacts)
}

/**
 * Get export preview
 */
export async function getExportPreview(config: ProjectConfig) {
  return projectExporter.getExportPreview(config)
}
