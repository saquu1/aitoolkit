/**
 * FILE MANAGEMENT SERVICE
 * =======================
 * Centralized file management for AI Enterprise Architect
 * 
 * SERVER-ONLY: This module must only run on the server side
 * as it performs file system operations.
 * 
 * FOLDER STRUCTURE:
 * 
 * /storage/
 * ├── raw/                    # User uploaded files (original)
 * │   ├── sql/               # SQL DDL files
 * │   │   └── {projectId}/   # Per-project storage
 * │   │       ├── schema.sql
 * │   │       └── migrations/
 * │   ├── sp/                # Stored Procedures
 * │   │   └── {projectId}/
 * │   ├── cshtml/            # ASP.NET Views
 * │   │   └── {projectId}/
 * │   ├── views/             # SQL Views
 * │   │   └── {projectId}/
 * │   └── misc/              # Other file types
 * │       └── {projectId}/
 * │
 * ├── processed/              # Parsed/Analyzed files
 * │   ├── parsed/            # Parse results (JSON)
 * │   │   └── {projectId}/
 * │   │       ├── tables.json
 * │   │       ├── procedures.json
 * │   │       └── views.json
 * │   ├── intelligence/      # Intelligence extraction
 * │   │   └── {projectId}/
 * │   │       ├── column-intel.json
 * │   │       ├── sp-intel.json
 * │   │       └── view-intel.json
 * │   ├── blueprints/        # UI Blueprints
 * │   │   └── {projectId}/
 * │   └── schemas/           # Generated schemas
 * │       └── {projectId}/
 * │           ├── prisma.prisma
 * │           └── typescript.ts
 * │
 * ├── generated/              # Generated code (final output)
 * │   ├── pages/             # Next.js pages
 * │   │   └── {projectId}/
 * │   ├── components/        # React components
 * │   │   └── {projectId}/
 * │   ├── api/               # API routes
 * │   │   └── {projectId}/
 * │   ├── hooks/             # Custom hooks
 * │   │   └── {projectId}/
 * │   ├── types/             # TypeScript types
 * │   │   └── {projectId}/
 * │   ├── prisma/            # Prisma schemas
 * │   │   └── {projectId}/
 * │   ├── tests/             # Generated tests
 * │   │   └── {projectId}/
 * │   └── docs/              # Documentation
 * │       └── {projectId}/
 * │
 * ├── exports/                # Ready-to-download packages
 * │   └── {projectId}/
 * │       ├── {timestamp}/   # Versioned exports
 * │       │   ├── full-project.zip
 * │       │   ├── pages.zip
 * │       │   └── api.zip
 * │       └── latest/        # Latest export
 * │
 * ├── archives/               # Archived/deleted files
 * │   └── {projectId}/
 * │       └── {timestamp}/
 * │
 * └── temp/                   # Temporary files
 *     └── {sessionId}/
 */

// This module is server-only - file system operations cannot run in browser
import 'server-only';

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// =============================================================================
// SECURITY: Safe Path Handling
// =============================================================================

/**
 * Base storage path - configurable via STORAGE_ROOT environment variable
 * Defaults to 'storage' directory in project root
 */
const STORAGE_ROOT = process.env.STORAGE_ROOT || process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');

/**
 * SECURITY: Validates and resolves paths to prevent directory traversal attacks
 * 
 * This function ensures that all file operations stay within the designated
 * storage root directory, preventing path traversal attacks like:
 * - ../../../etc/passwd
 * - ../../.env
 * 
 * @param segments - Path segments to join and validate
 * @returns Resolved absolute path within STORAGE_ROOT
 * @throws Error if path attempts to escape storage root
 */
function safePath(...segments: string[]): string {
  // Normalize and resolve the path
  const resolved = path.resolve(STORAGE_ROOT, ...segments);
  
  // Security check: ensure the resolved path is within STORAGE_ROOT
  if (!resolved.startsWith(STORAGE_ROOT)) {
    // Log the attack attempt for security monitoring
    console.error(`[SECURITY] Path traversal attempt blocked: ${segments.join('/')}`);
    throw new Error(`Path traversal attempt blocked: path escapes storage root`);
  }
  
  return resolved;
}

/**
 * Validates that a relative path doesn't contain directory traversal patterns
 * Use this for user-provided paths that should stay within a parent directory
 * 
 * @param relativePath - User-provided relative path
 * @param parentDir - Parent directory the path should stay within
 * @returns Sanitized relative path
 * @throws Error if path contains traversal patterns
 */
function validateRelativePath(relativePath: string, parentDir?: string): string {
  // Check for obvious traversal patterns
  const traversalPatterns = ['../', '..\\', '/../', '/..\\'];
  const normalizedPath = path.normalize(relativePath);
  
  for (const pattern of traversalPatterns) {
    if (normalizedPath.includes(pattern) || normalizedPath.startsWith('..')) {
      console.error(`[SECURITY] Directory traversal detected in path: ${relativePath}`);
      throw new Error(`Invalid path: directory traversal not allowed`);
    }
  }
  
  // If parentDir provided, verify the final path stays within it
  if (parentDir) {
    const fullPath = path.resolve(parentDir, normalizedPath);
    if (!fullPath.startsWith(parentDir)) {
      throw new Error(`Invalid path: escapes allowed directory`);
    }
  }
  
  return normalizedPath;
}

// Storage categories
export const STORAGE_CATEGORIES = {
  RAW: 'raw',
  PROCESSED: 'processed',
  GENERATED: 'generated',
  EXPORTS: 'exports',
  ARCHIVES: 'archives',
  TEMP: 'temp'
} as const;

// File types for raw storage
export const RAW_FILE_TYPES = {
  SQL: 'sql',        // SQL DDL (CREATE TABLE, etc.)
  SP: 'sp',          // Stored Procedures
  CSHTML: 'cshtml',  // ASP.NET Razor Views
  VIEWS: 'views',    // SQL Views
  MISC: 'misc'       // Other files
} as const;

// Processed file types
export const PROCESSED_TYPES = {
  PARSED: 'parsed',           // Parse results
  INTELLIGENCE: 'intelligence', // Intelligence extraction
  BLUEPRINTS: 'blueprints',   // UI Blueprints
  SCHEMAS: 'schemas'          // Generated schemas
} as const;

// Generated file types
export const GENERATED_TYPES = {
  PAGES: 'pages',
  COMPONENTS: 'components',
  API: 'api',
  HOOKS: 'hooks',
  TYPES: 'types',
  PRISMA: 'prisma',
  TESTS: 'tests',
  DOCS: 'docs'
} as const;

// File metadata interface
export interface FileMetadata {
  id: string;
  projectId: string;
  originalName: string;
  storedName: string;
  category: string;
  subCategory: string;
  mimeType: string;
  size: number;
  contentHash: string;
  storedPath: string;
  uploadedAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'processed' | 'error';
  error?: string;
}

// Project file structure interface
export interface ProjectFileStructure {
  projectId: string;
  projectName: string;
  createdAt: Date;
  updatedAt: Date;
  raw: {
    sql: string[];
    sp: string[];
    cshtml: string[];
    views: string[];
    misc: string[];
  };
  processed: {
    parsed: string[];
    intelligence: string[];
    blueprints: string[];
    schemas: string[];
  };
  generated: {
    pages: string[];
    components: string[];
    api: string[];
    hooks: string[];
    types: string[];
    prisma: string[];
    tests: string[];
    docs: string[];
  };
  exports: string[];
}

/**
 * FILE MANAGER CLASS
 * Handles all file operations for the AI Enterprise Architect
 * 
 * SECURITY: All file operations use safePath() to prevent directory traversal
 */
export class FileManager {
  private rootPath: string;

  constructor(customRoot?: string) {
    // Validate custom root if provided
    if (customRoot) {
      const resolved = path.resolve(customRoot);
      // Only allow custom roots that are absolute paths or within cwd
      if (!path.isAbsolute(customRoot) && !resolved.startsWith(process.cwd())) {
        console.warn(`[SECURITY] Custom root validation: ${customRoot}`);
      }
    }
    this.rootPath = customRoot || STORAGE_ROOT;
  }

  /**
   * Internal safe path builder - wraps global safePath with instance rootPath
   */
  private safePath(...segments: string[]): string {
    const resolved = path.resolve(this.rootPath, ...segments);
    if (!resolved.startsWith(this.rootPath)) {
      console.error(`[SECURITY] Path traversal attempt blocked: ${segments.join('/')}`);
      throw new Error(`Path traversal attempt blocked: path escapes storage root`);
    }
    return resolved;
  }

  /**
   * Initialize storage directories for a project
   */
  async initializeProject(projectId: string): Promise<void> {
    // Validate projectId to prevent injection
    if (!projectId || /[.\/\\]/.test(projectId)) {
      throw new Error('Invalid projectId: contains forbidden characters');
    }
    
    const categories = Object.values(STORAGE_CATEGORIES);
    
    for (const category of categories) {
      if (category === STORAGE_CATEGORIES.RAW) {
        for (const subType of Object.values(RAW_FILE_TYPES)) {
          await this.ensureDir(this.safePath(category, subType, projectId));
        }
      } else if (category === STORAGE_CATEGORIES.PROCESSED) {
        for (const subType of Object.values(PROCESSED_TYPES)) {
          await this.ensureDir(this.safePath(category, subType, projectId));
        }
      } else if (category === STORAGE_CATEGORIES.GENERATED) {
        for (const subType of Object.values(GENERATED_TYPES)) {
          await this.ensureDir(this.safePath(category, subType, projectId));
        }
      } else {
        await this.ensureDir(this.safePath(category, projectId));
      }
    }
  }

  /**
   * Save raw uploaded file
   */
  async saveRawFile(
    projectId: string,
    fileName: string,
    content: string | Buffer,
    fileType: keyof typeof RAW_FILE_TYPES = 'SQL'
  ): Promise<FileMetadata> {
    // Validate inputs
    if (!projectId || /[.\/\\]/.test(projectId)) {
      throw new Error('Invalid projectId');
    }
    
    // Sanitize filename - remove path separators
    const sanitizedName = path.basename(fileName).replace(/[<>:"|?*]/g, '_');
    
    const subCategory = RAW_FILE_TYPES[fileType];
    const targetDir = this.safePath(STORAGE_CATEGORIES.RAW, subCategory, projectId);
    await this.ensureDir(targetDir);

    // Generate unique stored name
    const timestamp = Date.now();
    const ext = path.extname(sanitizedName);
    const baseName = path.basename(sanitizedName, ext);
    const storedName = `${baseName}_${timestamp}${ext}`;
    const storedPath = this.safePath(STORAGE_CATEGORIES.RAW, subCategory, projectId, storedName);

    // Calculate content hash
    const contentBuffer = typeof content === 'string' ? Buffer.from(content) : content;
    const contentHash = this.calculateHash(contentBuffer);

    // Write file
    await fs.writeFile(storedPath, contentBuffer);

    return {
      id: crypto.randomUUID(),
      projectId,
      originalName: fileName,
      storedName,
      category: STORAGE_CATEGORIES.RAW,
      subCategory,
      mimeType: this.getMimeType(ext),
      size: contentBuffer.length,
      contentHash,
      storedPath,
      uploadedAt: new Date(),
      status: 'pending'
    };
  }

  /**
   * Save processed/parsed result
   */
  async saveProcessedFile(
    projectId: string,
    fileName: string,
    content: object,
    processedType: keyof typeof PROCESSED_TYPES = 'PARSED'
  ): Promise<string> {
    // Validate inputs
    if (!projectId || /[.\/\\]/.test(projectId)) {
      throw new Error('Invalid projectId');
    }
    const sanitizedName = path.basename(fileName).replace(/[<>:"|?*]/g, '_');
    
    const subCategory = PROCESSED_TYPES[processedType];
    const targetDir = this.safePath(STORAGE_CATEGORIES.PROCESSED, subCategory, projectId);
    await this.ensureDir(targetDir);

    const storedPath = this.safePath(STORAGE_CATEGORIES.PROCESSED, subCategory, projectId, sanitizedName);
    await fs.writeFile(storedPath, JSON.stringify(content, null, 2));

    return storedPath;
  }

  /**
   * Save generated code file
   */
  async saveGeneratedFile(
    projectId: string,
    fileName: string,
    content: string,
    generatedType: keyof typeof GENERATED_TYPES = 'PAGES',
    subPath?: string
  ): Promise<string> {
    // Validate inputs
    if (!projectId || /[.\/\\]/.test(projectId)) {
      throw new Error('Invalid projectId');
    }
    const sanitizedName = path.basename(fileName).replace(/[<>:"|?*]/g, '_');
    
    // Validate subPath if provided - prevent traversal
    if (subPath) {
      validateRelativePath(subPath);
    }
    
    const subCategory = GENERATED_TYPES[generatedType];
    const targetDir = subPath
      ? this.safePath(STORAGE_CATEGORIES.GENERATED, subCategory, projectId, subPath)
      : this.safePath(STORAGE_CATEGORIES.GENERATED, subCategory, projectId);
    await this.ensureDir(targetDir);

    const storedPath = subPath
      ? this.safePath(STORAGE_CATEGORIES.GENERATED, subCategory, projectId, subPath, sanitizedName)
      : this.safePath(STORAGE_CATEGORIES.GENERATED, subCategory, projectId, sanitizedName);
    await fs.writeFile(storedPath, content);

    return storedPath;
  }

  /**
   * Create export package
   * SECURITY: Validates all file paths to prevent directory traversal
   */
  async createExport(
    projectId: string,
    files: { path: string; content: string }[],
    exportName: string = 'export'
  ): Promise<string> {
    // Validate projectId
    if (!projectId || /[.\/\\]/.test(projectId)) {
      throw new Error('Invalid projectId');
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportDir = this.safePath(STORAGE_CATEGORIES.EXPORTS, projectId, timestamp);
    await this.ensureDir(exportDir);

    // Save individual files - with path validation
    for (const file of files) {
      // SECURITY: Validate each file path to prevent traversal
      const safeFilePath = validateRelativePath(file.path);
      const filePath = path.join(exportDir, safeFilePath);
      
      // Double-check the resolved path is within exportDir
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(exportDir)) {
        throw new Error(`Invalid file path in export: ${file.path}`);
      }
      
      await this.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, file.content);
    }

    // Create manifest
    const manifest = {
      projectId,
      exportedAt: new Date(),
      exportName,
      files: files.map(f => f.path),
      totalFiles: files.length
    };
    const manifestPath = this.safePath(STORAGE_CATEGORIES.EXPORTS, projectId, timestamp, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    // Update latest symlink
    const latestDir = this.safePath(STORAGE_CATEGORIES.EXPORTS, projectId, 'latest');
    try {
      await fs.rm(latestDir, { recursive: true });
    } catch {}
    await fs.cp(exportDir, latestDir, { recursive: true });

    return exportDir;
  }

  /**
   * Read raw file
   */
  async readRawFile(projectId: string, fileName: string, fileType: keyof typeof RAW_FILE_TYPES): Promise<string> {
    // Validate inputs
    if (!projectId || /[.\/\\]/.test(projectId)) {
      throw new Error('Invalid projectId');
    }
    const sanitizedName = path.basename(fileName).replace(/[<>:"|?*]/g, '_');
    
    const filePath = this.safePath(STORAGE_CATEGORIES.RAW, RAW_FILE_TYPES[fileType], projectId, sanitizedName);
    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * Read processed file
   */
  async readProcessedFile(projectId: string, fileName: string, processedType: keyof typeof PROCESSED_TYPES): Promise<object> {
    // Validate inputs
    if (!projectId || /[.\/\\]/.test(projectId)) {
      throw new Error('Invalid projectId');
    }
    const sanitizedName = path.basename(fileName).replace(/[<>:"|?*]/g, '_');
    
    const filePath = this.safePath(STORAGE_CATEGORIES.PROCESSED, PROCESSED_TYPES[processedType], projectId, sanitizedName);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * List project files
   */
  async listProjectFiles(projectId: string): Promise<ProjectFileStructure> {
    // Validate projectId
    if (!projectId || /[.\/\\]/.test(projectId)) {
      throw new Error('Invalid projectId');
    }
    
    const structure: ProjectFileStructure = {
      projectId,
      projectName: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      raw: { sql: [], sp: [], cshtml: [], views: [], misc: [] },
      processed: { parsed: [], intelligence: [], blueprints: [], schemas: [] },
      generated: { pages: [], components: [], api: [], hooks: [], types: [], prisma: [], tests: [], docs: [] },
      exports: []
    };

    // List raw files
    for (const [key, subType] of Object.entries(RAW_FILE_TYPES)) {
      const dir = this.safePath(STORAGE_CATEGORIES.RAW, subType, projectId);
      try {
        const files = await fs.readdir(dir);
        structure.raw[key.toLowerCase() as keyof typeof structure.raw] = files;
      } catch {}
    }

    // List processed files
    for (const [key, subType] of Object.entries(PROCESSED_TYPES)) {
      const dir = this.safePath(STORAGE_CATEGORIES.PROCESSED, subType, projectId);
      try {
        const files = await fs.readdir(dir);
        structure.processed[key.toLowerCase() as keyof typeof structure.processed] = files;
      } catch {}
    }

    // List generated files
    for (const [key, subType] of Object.entries(GENERATED_TYPES)) {
      const dir = this.safePath(STORAGE_CATEGORIES.GENERATED, subType, projectId);
      try {
        const files = await this.listFilesRecursively(dir);
        structure.generated[key.toLowerCase() as keyof typeof structure.generated] = files;
      } catch {}
    }

    // List exports
    const exportsDir = this.safePath(STORAGE_CATEGORIES.EXPORTS, projectId);
    try {
      const exports = await fs.readdir(exportsDir);
      structure.exports = exports.filter(e => e !== 'latest');
    } catch {}

    return structure;
  }

  /**
   * Archive project files
   */
  async archiveProject(projectId: string, reason: string = 'deleted'): Promise<string> {
    // Validate projectId
    if (!projectId || /[.\/\\]/.test(projectId)) {
      throw new Error('Invalid projectId');
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveDir = this.safePath(STORAGE_CATEGORIES.ARCHIVES, projectId, timestamp);
    await this.ensureDir(archiveDir);

    // Move all project files to archive
    for (const category of [STORAGE_CATEGORIES.RAW, STORAGE_CATEGORIES.PROCESSED, STORAGE_CATEGORIES.GENERATED]) {
      const categoryPath = this.safePath(category);
      try {
        const subDirs = await fs.readdir(categoryPath);
        for (const subDir of subDirs) {
          const projectPath = path.join(categoryPath, subDir, projectId);
          try {
            await fs.access(projectPath);
            const archiveTarget = path.join(archiveDir, category, subDir);
            await fs.cp(projectPath, archiveTarget, { recursive: true });
            await fs.rm(projectPath, { recursive: true });
          } catch {}
        }
      } catch {}
    }

    // Create archive metadata
    const metadata = {
      projectId,
      archivedAt: new Date(),
      reason,
      archivePath: archiveDir
    };
    const metadataPath = this.safePath(STORAGE_CATEGORIES.ARCHIVES, projectId, timestamp, 'archive-metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return archiveDir;
  }

  /**
   * Clean temp files older than specified hours
   */
  async cleanTempFiles(hoursOld: number = 24): Promise<number> {
    const tempDir = this.safePath(STORAGE_CATEGORIES.TEMP);
    let cleaned = 0;

    try {
      const sessions = await fs.readdir(tempDir);
      const cutoff = Date.now() - hoursOld * 60 * 60 * 1000;

      for (const session of sessions) {
        // Validate session name to prevent traversal
        if (/[.\/\\]/.test(session)) continue;
        
        const sessionPath = path.join(tempDir, session);
        const stat = await fs.stat(sessionPath);
        
        if (stat.mtime.getTime() < cutoff) {
          await fs.rm(sessionPath, { recursive: true });
          cleaned++;
        }
      }
    } catch {}

    return cleaned;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(projectId?: string): Promise<{
    totalSize: number;
    categories: Record<string, { size: number; fileCount: number }>;
  }> {
    const stats = {
      totalSize: 0,
      categories: {} as Record<string, { size: number; fileCount: number }>
    };

    // Validate projectId if provided
    if (projectId && /[.\/\\]/.test(projectId)) {
      throw new Error('Invalid projectId');
    }
    
    for (const category of Object.values(STORAGE_CATEGORIES)) {
      const categoryPath = projectId
        ? this.safePath(category, projectId)
        : this.safePath(category);

      try {
        const { size, fileCount } = await this.getDirectoryStats(categoryPath);
        stats.categories[category] = { size, fileCount };
        stats.totalSize += size;
      } catch {
        stats.categories[category] = { size: 0, fileCount: 0 };
      }
    }

    return stats;
  }

  // Helper methods
  private async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  private calculateHash(content: Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.sql': 'application/sql',
      '.cshtml': 'text/html',
      '.cs': 'text/x-csharp',
      '.json': 'application/json',
      '.ts': 'application/typescript',
      '.tsx': 'application/typescript',
      '.js': 'application/javascript',
      '.jsx': 'application/javascript',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.xml': 'application/xml'
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  private async listFilesRecursively(dir: string, basePath: string = ''): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory()) {
          const subFiles = await this.listFilesRecursively(fullPath, relativePath);
          files.push(...subFiles);
        } else {
          files.push(relativePath);
        }
      }
    } catch {}

    return files;
  }

  private async getDirectoryStats(dir: string): Promise<{ size: number; fileCount: number }> {
    let size = 0;
    let fileCount = 0;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subStats = await this.getDirectoryStats(fullPath);
          size += subStats.size;
          fileCount += subStats.fileCount;
        } else {
          const stat = await fs.stat(fullPath);
          size += stat.size;
          fileCount++;
        }
      }
    } catch {}

    return { size, fileCount };
  }
}

// Export singleton instance
export const fileManager = new FileManager();
