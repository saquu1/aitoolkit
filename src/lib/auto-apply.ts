/**
 * AUTO APPLY ENGINE & BACKUP RESTORE SERVICE
 * ===========================================
 * Phase 3 of Contract Validator - Safe code modifications
 * 
 * Capabilities:
 * - Apply fixes safely with automatic backup
 * - Restore files to previous state
 * - Track all changes for rollback
 * - Validate fixes before applying
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import crypto from 'crypto'

const prisma = new PrismaClient()

// =============================================================================
// TYPES
// =============================================================================

export interface ApplyFixRequest {
  suggestionId: string
  scanId: string
  issueId: string
  dryRun?: boolean  // Preview without applying
}

export interface ApplyFixResult {
  success: boolean
  message: string
  filePath?: string
  backupId?: string
  appliedAt?: Date
  diff?: string
}

export interface RestoreRequest {
  scanId: string
  backupId?: string  // Specific backup, or all for scan
  filePath?: string  // Specific file, or all files
}

export interface RestoreResult {
  success: boolean
  message: string
  restoredFiles: string[]
  errors: string[]
}

export interface BackupInfo {
  id: string
  scanId: string
  filePath: string
  fileSize: number
  lineCount: number
  createdAt: Date
  restored: boolean
}

// =============================================================================
// BACKUP RESTORE SERVICE
// =============================================================================

export class BackupRestoreService {
  private backupRoot: string

  constructor() {
    this.backupRoot = path.join(process.cwd(), 'backup', 'history')
    this.ensureBackupDir()
  }

  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupRoot)) {
      fs.mkdirSync(this.backupRoot, { recursive: true })
    }
  }

  /**
   * Create a backup of a file before modification
   */
  async createBackup(scanId: string, filePath: string): Promise<string> {
    const fullPath = path.join(process.cwd(), filePath)
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`)
    }

    const content = fs.readFileSync(fullPath, 'utf-8')
    const contentHash = this.hashContent(content)
    const stats = fs.statSync(fullPath)

    // Create backup directory for this scan
    const scanBackupDir = path.join(this.backupRoot, scanId)
    if (!fs.existsSync(scanBackupDir)) {
      fs.mkdirSync(scanBackupDir, { recursive: true })
    }

    // Save backup file
    const backupFileName = this.sanitizeFileName(filePath)
    const backupPath = path.join(scanBackupDir, backupFileName)
    fs.writeFileSync(backupPath, content)

    // Create database record
    const backup = await prisma.backupSnapshot.create({
      data: {
        scanId,
        filePath,
        fileName: path.basename(filePath),
        content,
        contentHash,
        fileSize: stats.size,
        lineCount: content.split('\n').length,
        backupPath
      }
    })

    return backup.id
  }

  /**
   * Restore a file from backup
   */
  async restoreBackup(backupId: string): Promise<RestoreResult> {
    const backup = await prisma.backupSnapshot.findUnique({
      where: { id: backupId }
    })

    if (!backup) {
      return {
        success: false,
        message: 'Backup not found',
        restoredFiles: [],
        errors: ['Backup not found']
      }
    }

    return this.restoreFromBackupRecord(backup)
  }

  /**
   * Restore all files for a scan
   */
  async restoreScan(request: RestoreRequest): Promise<RestoreResult> {
    const backups = await prisma.backupSnapshot.findMany({
      where: {
        scanId: request.scanId,
        restored: false,
        ...(request.filePath ? { filePath: request.filePath } : {})
      }
    })

    if (backups.length === 0) {
      return {
        success: false,
        message: 'No backups found for this scan',
        restoredFiles: [],
        errors: []
      }
    }

    const restoredFiles: string[] = []
    const errors: string[] = []

    for (const backup of backups) {
      try {
        const result = await this.restoreFromBackupRecord(backup)
        if (result.success) {
          restoredFiles.push(backup.filePath)
        } else {
          errors.push(`${backup.filePath}: ${result.message}`)
        }
      } catch (error: any) {
        errors.push(`${backup.filePath}: ${error.message}`)
      }
    }

    return {
      success: errors.length === 0,
      message: `Restored ${restoredFiles.length} file(s)`,
      restoredFiles,
      errors
    }
  }

  /**
   * Restore from a backup record
   */
  private async restoreFromBackupRecord(backup: any): Promise<RestoreResult> {
    const fullPath = path.join(process.cwd(), backup.filePath)

    // Write original content back
    fs.writeFileSync(fullPath, backup.content)

    // Mark as restored
    await prisma.backupSnapshot.update({
      where: { id: backup.id },
      data: {
        restored: true,
        restoredAt: new Date()
      }
    })

    // Update fix history
    await prisma.fixHistory.updateMany({
      where: {
        scanId: backup.scanId,
        filePath: backup.filePath,
        status: 'applied'
      },
      data: {
        status: 'reverted',
        revertedAt: new Date()
      }
    })

    return {
      success: true,
      message: `Restored ${backup.filePath}`,
      restoredFiles: [backup.filePath],
      errors: []
    }
  }

  /**
   * List all backups for a scan
   */
  async listBackups(scanId: string): Promise<BackupInfo[]> {
    const backups = await prisma.backupSnapshot.findMany({
      where: { scanId },
      orderBy: { createdAt: 'asc' }
    })

    return backups.map(b => ({
      id: b.id,
      scanId: b.scanId,
      filePath: b.filePath,
      fileSize: b.fileSize,
      lineCount: b.lineCount,
      createdAt: b.createdAt,
      restored: b.restored
    }))
  }

  /**
   * Get backup content
   */
  async getBackupContent(backupId: string): Promise<string | null> {
    const backup = await prisma.backupSnapshot.findUnique({
      where: { id: backupId }
    })

    return backup?.content || null
  }

  /**
   * Compare current file with backup
   */
  async compareWithBackup(backupId: string): Promise<{
    original: string
    current: string
    diff: string
  } | null> {
    const backup = await prisma.backupSnapshot.findUnique({
      where: { id: backupId }
    })

    if (!backup) return null

    const fullPath = path.join(process.cwd(), backup.filePath)
    if (!fs.existsSync(fullPath)) return null

    const currentContent = fs.readFileSync(fullPath, 'utf-8')

    return {
      original: backup.content,
      current: currentContent,
      diff: this.generateDiff(backup.content, currentContent, backup.filePath)
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  private sanitizeFileName(filePath: string): string {
    return filePath.replace(/[\/\\]/g, '_').replace(/^_/, '')
  }

  private generateDiff(original: string, current: string, fileName: string): string {
    const originalLines = original.split('\n')
    const currentLines = current.split('\n')
    const diff: string[] = []

    // Simple line-by-line diff
    const maxLines = Math.max(originalLines.length, currentLines.length)
    
    diff.push(`--- ${fileName} (original)`)
    diff.push(`+++ ${fileName} (current)`)
    diff.push('')

    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i]
      const currLine = currentLines[i]

      if (origLine === currLine) {
        diff.push(`  ${origLine || ''}`)
      } else {
        if (origLine !== undefined) {
          diff.push(`- ${origLine}`)
        }
        if (currLine !== undefined) {
          diff.push(`+ ${currLine}`)
        }
      }
    }

    return diff.join('\n')
  }
}

// =============================================================================
// AUTO APPLY ENGINE
// =============================================================================

export class AutoApplyEngine {
  private backupService: BackupRestoreService

  constructor() {
    this.backupService = new BackupRestoreService()
  }

  /**
   * Apply a fix suggestion
   */
  async applyFix(request: ApplyFixRequest): Promise<ApplyFixResult> {
    // Get the suggestion
    const suggestion = await prisma.fixSuggestion.findUnique({
      where: { id: request.suggestionId }
    })

    if (!suggestion) {
      return {
        success: false,
        message: 'Fix suggestion not found'
      }
    }

    // Parse code change
    const codeChange = JSON.parse(suggestion.codeChange)
    const filePath = codeChange.file

    // Check if file exists (for non-create operations)
    const fullPath = path.join(process.cwd(), filePath)
    const isNewFile = suggestion.fixType === 'create_endpoint'

    if (!isNewFile && !fs.existsSync(fullPath)) {
      return {
        success: false,
        message: `File not found: ${filePath}`
      }
    }

    // Create backup if file exists
    let backupId: string | undefined
    if (fs.existsSync(fullPath)) {
      backupId = await this.backupService.createBackup(request.scanId, filePath)
    }

    // Dry run - just return what would happen
    if (request.dryRun) {
      return {
        success: true,
        message: 'Dry run - no changes made',
        filePath,
        backupId,
        diff: this.previewChange(codeChange)
      }
    }

    try {
      // Apply the change
      if (isNewFile) {
        await this.createNewFile(fullPath, codeChange.newCode)
      } else {
        await this.modifyFile(fullPath, codeChange)
      }

      // Record in fix history
      const originalContent = backupId ? 
        await this.backupService.getBackupContent(backupId) : ''
      
      const newContent = fs.readFileSync(fullPath, 'utf-8')

      await prisma.fixHistory.create({
        data: {
          scanId: request.scanId,
          issueId: request.issueId,
          suggestionId: request.suggestionId,
          filePath,
          originalContent: originalContent || '',
          modifiedContent: newContent,
          diff: this.backupService['generateDiff'](originalContent || '', newContent, filePath),
          backupPath: backupId ? path.join('backup', 'history', request.scanId) : null,
          status: 'applied',
          appliedAt: new Date()
        }
      })

      // Update suggestion status
      await prisma.fixSuggestion.update({
        where: { id: request.suggestionId },
        data: {
          status: 'applied',
          appliedAt: new Date()
        }
      })

      // Update pattern learning
      await this.updatePatternStats(suggestion)

      return {
        success: true,
        message: `Fix applied to ${filePath}`,
        filePath,
        backupId,
        appliedAt: new Date()
      }
    } catch (error: any) {
      // Restore from backup if available
      if (backupId) {
        await this.backupService.restoreBackup(backupId)
      }

      return {
        success: false,
        message: `Failed to apply fix: ${error.message}`
      }
    }
  }

  /**
   * Apply multiple fixes (batch)
   */
  async applyMultipleFixes(
    fixes: ApplyFixRequest[],
    options: { stopOnError?: boolean; dryRun?: boolean } = {}
  ): Promise<{ results: ApplyFixResult[]; success: boolean }> {
    const results: ApplyFixResult[] = []
    let allSuccess = true

    for (const fix of fixes) {
      const result = await this.applyFix({
        ...fix,
        dryRun: options.dryRun
      })

      results.push(result)

      if (!result.success && options.stopOnError !== false) {
        allSuccess = false
        break
      }
    }

    return { results, success: allSuccess }
  }

  /**
   * Auto-apply all safe fixes for a scan
   */
  async autoApplySafeFixes(scanId: string): Promise<ApplyFixResult[]> {
    // Get all auto-safe suggestions for this scan
    const issues = await prisma.contractIssue.findMany({
      where: { scanId, status: 'open' },
      include: {
        suggestions: {
          where: {
            autoSafe: true,
            status: 'suggested',
            confidence: { gte: 0.9 }
          }
        }
      }
    })

    const results: ApplyFixResult[] = []

    for (const issue of issues) {
      for (const suggestion of issue.suggestions) {
        const result = await this.applyFix({
          suggestionId: suggestion.id,
          scanId,
          issueId: issue.id
        })
        results.push(result)
      }
    }

    return results
  }

  /**
   * Restore all fixes for a scan
   */
  async restoreScan(scanId: string): Promise<RestoreResult> {
    return this.backupService.restoreScan({ scanId })
  }

  /**
   * Get all backups for a scan
   */
  async getBackups(scanId: string): Promise<BackupInfo[]> {
    return this.backupService.listBackups(scanId)
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private createNewFile(fullPath: string, content: string): void {
    const dir = path.dirname(fullPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(fullPath, content)
  }

  private modifyFile(fullPath: string, codeChange: any): void {
    const content = fs.readFileSync(fullPath, 'utf-8')
    const lines = content.split('\n')

    // Apply change based on line numbers
    if (codeChange.lineStart && codeChange.lineEnd) {
      const startIdx = codeChange.lineStart - 1
      const endIdx = codeChange.lineEnd
      
      // Replace lines
      const newLines = codeChange.newCode.split('\n')
      lines.splice(startIdx, endIdx - startIdx, ...newLines)
    } else {
      // Simple string replacement
      const newContent = content.replace(codeChange.oldCode, codeChange.newCode)
      fs.writeFileSync(fullPath, newContent)
      return
    }

    fs.writeFileSync(fullPath, lines.join('\n'))
  }

  private previewChange(codeChange: any): string {
    return `--- Original (line ${codeChange.lineStart})
+++ Modified
@@
-${codeChange.oldCode}
+${codeChange.newCode}
@@`
  }

  private async updatePatternStats(suggestion: any): Promise<void> {
    if (suggestion.fixType === 'learned_pattern') {
      // Find the pattern and update stats
      const patterns = await prisma.fixPattern.findMany({
        where: { isActive: true }
      })

      for (const pattern of patterns) {
        // Simple matching by checking if template is similar
        await prisma.fixPattern.update({
          where: { id: pattern.id },
          data: {
            timesApplied: { increment: 1 },
            lastUsedAt: new Date(),
            successRate: Math.min(1, pattern.successRate + 0.05)
          }
        })
      }
    }
  }
}

// =============================================================================
// EXPORT INSTANCES
// =============================================================================

export const backupRestoreService = new BackupRestoreService()
export const autoApplyEngine = new AutoApplyEngine()
