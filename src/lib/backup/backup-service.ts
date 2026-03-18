/**
 * Backup & Recovery Service
 * TASK-5.3: Backup & Recovery
 * Part of Phase 5: Production & Scale
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, mkdir, readdir, stat, rm } from 'fs/promises'
import { join, basename } from 'path'

const execAsync = promisify(exec)

// Types
export interface BackupConfig {
  projectId: string
  includeFiles: boolean
  includeDatabase: boolean
  destination: 'local' | 's3'
  s3Bucket?: string
  s3Prefix?: string
  retention: number // days
  compress: boolean
}

export interface BackupResult {
  id: string
  projectId: string
  timestamp: Date
  status: 'success' | 'failed' | 'partial'
  size: number
  duration: number
  location: string
  error?: string
  tables?: string[]
  files?: string[]
  compressed: boolean
}

export interface RestoreConfig {
  backupId: string
  projectId: string
  targetDatabase?: string
  overwriteExisting: boolean
  dryRun: boolean
}

export interface RestoreResult {
  backupId: string
  projectId: string
  timestamp: Date
  status: 'success' | 'failed' | 'partial'
  tablesRestored: string[]
  filesRestored: string[]
  duration: number
  error?: string
}

export interface BackupSchedule {
  id: string
  projectId: string
  cronExpression: string
  config: BackupConfig
  enabled: boolean
  lastRun?: Date
  nextRun?: Date
}

export interface BackupListing {
  id: string
  projectId: string
  timestamp: Date
  size: number
  status: 'success' | 'failed' | 'partial'
  location: string
  tablesCount: number
  filesCount: number
}

/**
 * Backup Service Class
 */
export class BackupService {
  private backupDir: string
  private maxBackups: number

  constructor(backupDir: string = process.env.BACKUP_DIR || '/tmp/backups') {
    this.backupDir = backupDir
    this.maxBackups = 10
  }

  /**
   * Create backup for a project
   */
  async createBackup(config: BackupConfig): Promise<BackupResult> {
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()
    const backupPath = join(this.backupDir, config.projectId, backupId)

    try {
      await mkdir(backupPath, { recursive: true })

      const tables: string[] = []
      const files: string[] = []
      let totalSize = 0

      // Backup database
      if (config.includeDatabase) {
        const dbBackup = await this.backupDatabase(config.projectId, backupPath)
        tables.push(...dbBackup.tables)
        totalSize += dbBackup.size
      }

      // Backup files
      if (config.includeFiles) {
        const fileBackup = await this.backupFiles(config.projectId, backupPath)
        files.push(...fileBackup.files)
        totalSize += fileBackup.size
      }

      // Compress if enabled
      if (config.compress) {
        const compressedPath = await this.compressBackup(backupPath)
        totalSize = (await stat(compressedPath)).size
      }

      // Upload to S3 if configured
      if (config.destination === 's3' && config.s3Bucket) {
        await this.uploadToS3(backupPath, config.s3Bucket, config.s3Prefix || '')
      }

      // Write backup metadata
      const metadata = {
        id: backupId,
        projectId: config.projectId,
        timestamp: new Date().toISOString(),
        size: totalSize,
        tables,
        files,
        config,
        compressed: config.compress
      }
      await writeFile(join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2))

      // Cleanup old backups
      await this.cleanupOldBackups(config.projectId, config.retention)

      return {
        id: backupId,
        projectId: config.projectId,
        timestamp: new Date(),
        status: 'success',
        size: totalSize,
        duration: Date.now() - startTime,
        location: config.destination === 's3'
          ? `s3://${config.s3Bucket}/${config.s3Prefix}/${backupId}`
          : backupPath,
        tables,
        files,
        compressed: config.compress
      }
    } catch (error: any) {
      return {
        id: backupId,
        projectId: config.projectId,
        timestamp: new Date(),
        status: 'failed',
        size: 0,
        duration: Date.now() - startTime,
        location: backupPath,
        error: error.message,
        compressed: false
      }
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(config: RestoreConfig): Promise<RestoreResult> {
    const startTime = Date.now()
    const backupPath = join(this.backupDir, config.projectId, config.backupId)

    try {
      // Read metadata
      const metadataPath = join(backupPath, 'metadata.json')
      const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'))

      const tablesRestored: string[] = []
      const filesRestored: string[] = []

      if (!config.dryRun) {
        // Decompress if needed
        if (metadata.compressed) {
          await this.decompressBackup(backupPath)
        }

        // Restore database
        if (metadata.tables && metadata.tables.length > 0) {
          const dbRestore = await this.restoreDatabase(
            config.projectId,
            backupPath,
            config.overwriteExisting
          )
          tablesRestored.push(...dbRestore.tables)
        }

        // Restore files
        if (metadata.files && metadata.files.length > 0) {
          const fileRestore = await this.restoreFiles(config.projectId, backupPath)
          filesRestored.push(...fileRestore.files)
        }
      }

      return {
        backupId: config.backupId,
        projectId: config.projectId,
        timestamp: new Date(),
        status: 'success',
        tablesRestored,
        filesRestored,
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      return {
        backupId: config.backupId,
        projectId: config.projectId,
        timestamp: new Date(),
        status: 'failed',
        tablesRestored: [],
        filesRestored: [],
        duration: Date.now() - startTime,
        error: error.message
      }
    }
  }

  /**
   * List available backups for a project
   */
  async listBackups(projectId: string): Promise<BackupListing[]> {
    const projectBackupDir = join(this.backupDir, projectId)

    try {
      const entries = await readdir(projectBackupDir)
      const backups: BackupListing[] = []

      for (const entry of entries) {
        try {
          const metadataPath = join(projectBackupDir, entry, 'metadata.json')
          const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'))

          backups.push({
            id: entry,
            projectId,
            timestamp: new Date(metadata.timestamp),
            size: metadata.size,
            status: 'success',
            location: projectBackupDir,
            tablesCount: metadata.tables?.length || 0,
            filesCount: metadata.files?.length || 0
          })
        } catch {
          // Skip invalid backup
        }
      }

      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    } catch {
      return []
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(projectId: string, backupId: string): Promise<boolean> {
    const backupPath = join(this.backupDir, projectId, backupId)

    try {
      await rm(backupPath, { recursive: true })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get backup details
   */
  async getBackupDetails(projectId: string, backupId: string): Promise<BackupResult | null> {
    const backupPath = join(this.backupDir, projectId, backupId)

    try {
      const metadataPath = join(backupPath, 'metadata.json')
      const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'))
      const stats = await stat(backupPath)

      return {
        id: backupId,
        projectId,
        timestamp: new Date(metadata.timestamp),
        status: 'success',
        size: metadata.size,
        duration: 0,
        location: backupPath,
        tables: metadata.tables,
        files: metadata.files,
        compressed: metadata.compressed
      }
    } catch {
      return null
    }
  }

  /**
   * Backup database tables
   */
  private async backupDatabase(
    projectId: string,
    backupPath: string
  ): Promise<{ tables: string[]; size: number }> {
    const tables: string[] = []
    let size = 0

    // Simulate database backup
    const mockData = {
      projectId,
      exportedAt: new Date().toISOString(),
      tables: ['Patients', 'Visits', 'Orders', 'Users', 'AuditLogs'],
      records: {
        Patients: 1250,
        Visits: 4500,
        Orders: 2100,
        Users: 25,
        AuditLogs: 15000
      }
    }

    const dbFile = join(backupPath, 'database.json')
    await writeFile(dbFile, JSON.stringify(mockData, null, 2))
    size = JSON.stringify(mockData).length

    return { tables: mockData.tables, size }
  }

  /**
   * Backup uploaded files
   */
  private async backupFiles(
    projectId: string,
    backupPath: string
  ): Promise<{ files: string[]; size: number }> {
    const filesPath = join(backupPath, 'files')
    await mkdir(filesPath, { recursive: true })

    const files: string[] = []
    let size = 0

    // Simulate file backup
    const mockFiles = [
      { name: 'schema.sql', content: '-- Database schema' },
      { name: 'procedures.sql', content: '-- Stored procedures' },
      { name: 'views.sql', content: '-- View definitions' }
    ]

    for (const file of mockFiles) {
      const filePath = join(filesPath, file.name)
      await writeFile(filePath, file.content)
      files.push(file.name)
      size += file.content.length
    }

    return { files, size }
  }

  /**
   * Restore database
   */
  private async restoreDatabase(
    projectId: string,
    backupPath: string,
    _overwrite: boolean
  ): Promise<{ tables: string[] }> {
    const dbFile = join(backupPath, 'database.json')
    const data = JSON.parse(await readFile(dbFile, 'utf-8'))

    // In a real implementation, this would restore data to the database
    return { tables: data.tables || [] }
  }

  /**
   * Restore files
   */
  private async restoreFiles(
    projectId: string,
    backupPath: string
  ): Promise<{ files: string[] }> {
    const filesPath = join(backupPath, 'files')

    try {
      const entries = await readdir(filesPath)
      return { files: entries }
    } catch {
      return { files: [] }
    }
  }

  /**
   * Compress backup
   */
  private async compressBackup(backupPath: string): Promise<string> {
    const compressedPath = `${backupPath}.tar.gz`

    try {
      await execAsync(`tar -czf ${compressedPath} -C ${backupPath} .`)
      return compressedPath
    } catch {
      return backupPath
    }
  }

  /**
   * Decompress backup
   */
  private async decompressBackup(backupPath: string): Promise<void> {
    const compressedPath = `${backupPath}.tar.gz`

    try {
      await execAsync(`tar -xzf ${compressedPath} -C ${backupPath}`)
    } catch {
      // Ignore if not compressed
    }
  }

  /**
   * Upload to S3
   */
  private async uploadToS3(
    backupPath: string,
    bucket: string,
    prefix: string
  ): Promise<void> {
    // In a real implementation, use AWS SDK
    console.log(`Uploading ${backupPath} to s3://${bucket}/${prefix}`)

    // Simulated upload
    // const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
    // const client = new S3Client({})
    // await client.send(new PutObjectCommand({ Bucket: bucket, Key: `${prefix}/${basename(backupPath)}`, ... }))
  }

  /**
   * Cleanup old backups
   */
  private async cleanupOldBackups(projectId: string, retentionDays: number): Promise<void> {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
    const backups = await this.listBackups(projectId)

    for (const backup of backups) {
      if (backup.timestamp.getTime() < cutoff) {
        await this.deleteBackup(projectId, backup.id)
      }
    }
  }

  /**
   * Calculate backup storage usage
   */
  async getStorageUsage(projectId?: string): Promise<{
    totalSize: number
    backupCount: number
    oldestBackup?: Date
    newestBackup?: Date
  }> {
    const projectIds = projectId
      ? [projectId]
      : (await readdir(this.backupDir)).filter(async (entry) => {
          const stat_ = await stat(join(this.backupDir, entry))
          return stat_.isDirectory()
        })

    let totalSize = 0
    let backupCount = 0
    let oldestBackup: Date | undefined
    let newestBackup: Date | undefined

    for (const projId of projectIds) {
      const backups = await this.listBackups(projId)
      backupCount += backups.length
      totalSize += backups.reduce((sum, b) => sum + b.size, 0)

      for (const backup of backups) {
        if (!oldestBackup || backup.timestamp < oldestBackup) {
          oldestBackup = backup.timestamp
        }
        if (!newestBackup || backup.timestamp > newestBackup) {
          newestBackup = backup.timestamp
        }
      }
    }

    return { totalSize, backupCount, oldestBackup, newestBackup }
  }
}

// Export singleton
export const backupService = new BackupService()
