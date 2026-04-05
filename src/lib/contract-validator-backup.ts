/**
 * CONTRACT VALIDATOR BACKUP SERVICE
 * ===================================
 * Manages file backups before applying fixes
 * Provides restore functionality with Scan-ID tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Base paths
const BACKUP_BASE = path.join(process.cwd(), 'backup', 'history');
const TMP_BASE = path.join(process.cwd(), 'tmp', 'validator', 'scans');

// =============================================================================
// TYPES
// =============================================================================

interface BackupManifest {
  scanId: string;
  createdAt: string;
  createdBy?: string;
  files: BackupFileEntry[];
  summary: {
    filesChanged: number;
    issuesFixed: number;
    issuesRemaining: number;
  };
}

interface BackupFileEntry {
  originalPath: string;
  backupPath: string;
  hash: string;
  size: number;
  changes: ChangeEntry[];
}

interface ChangeEntry {
  line: number;
  before: string;
  after: string;
}

// =============================================================================
// BACKUP OPERATIONS
// =============================================================================

/**
 * Create a backup for a scan session
 */
export async function createScanBackup(
  scanId: string,
  filesToBackup: string[],
  metadata?: { createdBy?: string }
): Promise<{ success: boolean; backupDir: string; manifest: BackupManifest }> {
  const backupDir = path.join(BACKUP_BASE, scanId);
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const manifest: BackupManifest = {
    scanId,
    createdAt: new Date().toISOString(),
    createdBy: metadata?.createdBy,
    files: [],
    summary: {
      filesChanged: 0,
      issuesFixed: 0,
      issuesRemaining: 0
    }
  };
  
  for (const filePath of filesToBackup) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found for backup: ${filePath}`);
      continue;
    }
    
    const backupEntry = await backupFile(filePath, backupDir);
    if (backupEntry) {
      manifest.files.push(backupEntry);
    }
  }
  
  manifest.summary.filesChanged = manifest.files.length;
  
  // Save manifest
  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  return {
    success: true,
    backupDir,
    manifest
  };
}

/**
 * Backup a single file
 */
async function backupFile(
  originalPath: string,
  backupDir: string
): Promise<BackupFileEntry | null> {
  try {
    const content = fs.readFileSync(originalPath, 'utf-8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const stats = fs.statSync(originalPath);
    
    // Create relative path structure in backup
    const relativePath = getRelativePath(originalPath);
    const backupPath = path.join(backupDir, relativePath + '.backup');
    
    // Ensure backup directory exists
    const backupFileDir = path.dirname(backupPath);
    if (!fs.existsSync(backupFileDir)) {
      fs.mkdirSync(backupFileDir, { recursive: true });
    }
    
    // Copy file to backup
    fs.writeFileSync(backupPath, content);
    
    return {
      originalPath,
      backupPath,
      hash,
      size: stats.size,
      changes: []
    };
  } catch (error) {
    console.error(`Failed to backup ${originalPath}:`, error);
    return null;
  }
}

/**
 * Restore files from a backup
 */
export async function restoreFromBackup(scanId: string): Promise<{
  success: boolean;
  restoredFiles: string[];
  errors: string[];
}> {
  const backupDir = path.join(BACKUP_BASE, scanId);
  const manifestPath = path.join(backupDir, 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    return {
      success: false,
      restoredFiles: [],
      errors: [`Backup manifest not found for scan: ${scanId}`]
    };
  }
  
  const manifest: BackupManifest = JSON.parse(
    fs.readFileSync(manifestPath, 'utf-8')
  );
  
  const restoredFiles: string[] = [];
  const errors: string[] = [];
  
  for (const entry of manifest.files) {
    try {
      if (!fs.existsSync(entry.backupPath)) {
        errors.push(`Backup file not found: ${entry.backupPath}`);
        continue;
      }
      
      const backupContent = fs.readFileSync(entry.backupPath, 'utf-8');
      
      // Ensure target directory exists
      const targetDir = path.dirname(entry.originalPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Restore file
      fs.writeFileSync(entry.originalPath, backupContent);
      restoredFiles.push(entry.originalPath);
      
    } catch (error: any) {
      errors.push(`Failed to restore ${entry.originalPath}: ${error.message}`);
    }
  }
  
  return {
    success: errors.length === 0,
    restoredFiles,
    errors
  };
}

/**
 * Get backup manifest for a scan
 */
export function getBackupManifest(scanId: string): BackupManifest | null {
  const manifestPath = path.join(BACKUP_BASE, scanId, 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

/**
 * List all backups
 */
export function listBackups(): { scanId: string; createdAt: string; fileCount: number }[] {
  if (!fs.existsSync(BACKUP_BASE)) {
    return [];
  }
  
  const backups: { scanId: string; createdAt: string; fileCount: number }[] = [];
  const scanDirs = fs.readdirSync(BACKUP_BASE);
  
  for (const scanId of scanDirs) {
    const manifestPath = path.join(BACKUP_BASE, scanId, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest: BackupManifest = JSON.parse(
          fs.readFileSync(manifestPath, 'utf-8')
        );
        backups.push({
          scanId: manifest.scanId,
          createdAt: manifest.createdAt,
          fileCount: manifest.files.length
        });
      } catch (e) {
        // Invalid manifest, skip
      }
    }
  }
  
  return backups.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Delete a backup
 */
export function deleteBackup(scanId: string): boolean {
  const backupDir = path.join(BACKUP_BASE, scanId);
  
  if (!fs.existsSync(backupDir)) {
    return false;
  }
  
  try {
    fs.rmSync(backupDir, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`Failed to delete backup ${scanId}:`, error);
    return false;
  }
}

// =============================================================================
// TEMP FILE OPERATIONS
// =============================================================================

/**
 * Create temp directory for a scan
 */
export function createScanTempDir(scanId: string): string {
  const tempDir = path.join(TMP_BASE, scanId);
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return tempDir;
}

/**
 * Save temporary scan data
 */
export function saveScanTempData(scanId: string, filename: string, data: any): string {
  const tempDir = createScanTempDir(scanId);
  const filePath = path.join(tempDir, filename);
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  
  return filePath;
}

/**
 * Load temporary scan data
 */
export function loadScanTempData<T>(scanId: string, filename: string): T | null {
  const filePath = path.join(TMP_BASE, scanId, filename);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    return null;
  }
}

/**
 * Clean up temp files older than specified days
 */
export function cleanupOldTempFiles(daysOld: number = 7): number {
  if (!fs.existsSync(TMP_BASE)) {
    return 0;
  }
  
  const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  let cleaned = 0;
  
  const scanDirs = fs.readdirSync(TMP_BASE);
  
  for (const scanId of scanDirs) {
    const scanDir = path.join(TMP_BASE, scanId);
    const stats = fs.statSync(scanDir);
    
    if (stats.birthtime.getTime() < cutoff) {
      try {
        fs.rmSync(scanDir, { recursive: true, force: true });
        cleaned++;
      } catch (error) {
        console.error(`Failed to clean up ${scanId}:`, error);
      }
    }
  }
  
  return cleaned;
}

// =============================================================================
// HELPERS
// =============================================================================

function getRelativePath(absolutePath: string): string {
  const cwd = process.cwd();
  if (absolutePath.startsWith(cwd)) {
    return absolutePath.slice(cwd.length).replace(/^\//, '');
  }
  return absolutePath.replace(/^\//, '');
}

/**
 * Get file hash
 */
export function getFileHash(filePath: string): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Compare two files
 */
export function compareFiles(file1: string, file2: string): {
  identical: boolean;
  hash1: string | null;
  hash2: string | null;
} {
  const hash1 = getFileHash(file1);
  const hash2 = getFileHash(file2);
  
  return {
    identical: hash1 === hash2 && hash1 !== null,
    hash1,
    hash2
  };
}
