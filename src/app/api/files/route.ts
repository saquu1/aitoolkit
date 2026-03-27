// =============================================================================
// Enhanced File Management API
// Features: Version tracking, Duplicate detection, Bulk upload, Preview
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface FileUploadInput {
  name: string;
  content: string;
  path?: string;
  projectId?: string;
}

interface UploadProgress {
  totalFiles: number;
  processedFiles: number;
  currentFile: string;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getFileType(fileName: string, content: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  // Check by extension first
  if (ext === 'cshtml' || ext === 'vbhtml') return 'razor_view';
  if (ext === 'sql') return 'sql';
  if (ext === 'js') return 'javascript';
  if (ext === 'ts' || ext === 'tsx') return 'typescript';
  if (ext === 'cs') return 'csharp';
  if (ext === 'json') return 'json';
  if (ext === 'xml') return 'xml';
  if (ext === 'xlsx' || ext === 'xls') return 'excel';
  if (ext === 'csv') return 'csv';
  
  // Check by content patterns
  if (content.includes('CREATE PROCEDURE') || content.includes('ALTER PROCEDURE')) return 'sql_sp';
  if (content.includes('CREATE TABLE') || content.includes('ALTER TABLE')) return 'sql_ddl';
  if (content.includes('@model ') || content.includes('@Html.') || content.includes('@Html.')) return 'razor_view';
  if (content.includes('function') || content.includes('const ') || content.includes('let ')) {
    if (content.includes(': ') && (content.includes('interface ') || content.includes('type '))) return 'typescript';
    return 'javascript';
  }
  
  return 'unknown';
}

function generatePreview(content: string, maxLength: number = 1000): string {
  if (!content) return '';
  const preview = content.substring(0, maxLength);
  return preview + (content.length > maxLength ? '\n... (truncated)' : '');
}

function countLines(content: string): number {
  if (!content) return 0;
  return content.split('\n').length;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'upload-files':
        return await uploadFiles(body);
      
      case 'upload-bulk':
        return await uploadBulkFiles(body);
      
      case 'preview-file':
        return await previewFile(body);
      
      case 'get-version-history':
        return await getVersionHistory(body);
      
      case 'restore-version':
        return await restoreVersion(body);
      
      case 'check-duplicates':
        return await checkDuplicates(body);
      
      case 'resolve-duplicate':
        return await resolveDuplicate(body);
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('File API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'list-files':
        return await listFiles(searchParams);
      
      case 'get-file':
        return await getFile(searchParams);
      
      case 'get-duplicates':
        return await getDuplicates(searchParams);
      
      case 'get-stats':
        return await getFileStats(searchParams);
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE UPLOAD WITH VERSION TRACKING
// ═══════════════════════════════════════════════════════════════════════════

async function uploadFiles(body: { 
  files: FileUploadInput[]; 
  projectId: string;
  trackVersions?: boolean;
}) {
  const { files, projectId, trackVersions = true } = body;

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const results = [];
  const duplicates = [];

  for (const file of files) {
    const contentHash = generateContentHash(file.content);
    const fileType = getFileType(file.name, file.content);
    const preview = generatePreview(file.content);
    const lineCount = countLines(file.content);

    // Check for existing file with same name
    const existingFile = await db.toolkitFile.findFirst({
      where: { projectId, fileName: file.name }
    });

    // Check for duplicate content
    const duplicateContent = await db.toolkitFile.findFirst({
      where: { 
        projectId, 
        contentHash,
        NOT: { fileName: file.name }
      }
    });

    let result;

    if (existingFile) {
      // Update existing file with version tracking
      if (trackVersions && existingFile.content !== file.content) {
        // Create version history entry
        await db.fileVersion.create({
          data: {
            fileId: existingFile.id,
            version: existingFile.version,
            content: existingFile.content || '',
            contentHash: existingFile.contentHash || '',
            fileSize: existingFile.fileSize,
            lineCount: existingFile.lineCount,
            changeSummary: `Updated from ${existingFile.lineCount} to ${lineCount} lines`,
          }
        });

        // Update main file
        result = await db.toolkitFile.update({
          where: { id: existingFile.id },
          data: {
            content: file.content,
            contentHash,
            fileSize: file.content.length,
            lineCount,
            fileType,
            preview,
            version: { increment: 1 },
            parseStatus: 'pending',
            updatedAt: new Date(),
          }
        });
      } else {
        result = existingFile;
      }
    } else {
      // Create new file
      result = await db.toolkitFile.create({
        data: {
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          projectId,
          fileName: file.name,
          filePath: file.path,
          fileType,
          content: file.content,
          contentHash,
          fileSize: file.content.length,
          lineCount,
          preview,
          isDuplicate: !!duplicateContent,
          duplicateOfId: duplicateContent?.id || null,
          updatedAt: new Date(),
        }
      });

      if (duplicateContent) {
        duplicates.push({
          newFile: file.name,
          existingFile: duplicateContent.fileName,
          contentHash,
        });
      }
    }

    results.push({
      fileName: file.name,
      id: result.id,
      isNew: !existingFile,
      isDuplicate: !!duplicateContent,
      version: result.version,
    });
  }

  return NextResponse.json({
    success: true,
    uploaded: results,
    duplicates,
    summary: {
      total: files.length,
      new: results.filter(r => r.isNew).length,
      updated: results.filter(r => !r.isNew).length,
      duplicatesFound: duplicates.length,
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK FILE UPLOAD WITH PROGRESS
// ═══════════════════════════════════════════════════════════════════════════

async function uploadBulkFiles(body: { 
  files: FileUploadInput[]; 
  projectId: string;
  onProgress?: (progress: UploadProgress) => void;
}) {
  const { files, projectId } = body;

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const progress: UploadProgress = {
    totalFiles: files.length,
    processedFiles: 0,
    currentFile: '',
    status: 'uploading',
    errors: [],
  };

  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    progress.currentFile = file.name;
    progress.status = 'processing';

    try {
      const uploadResult = await uploadFiles({ 
        files: [file], 
        projectId,
        trackVersions: true 
      });
      
      const data = await uploadResult.json();
      results.push(data.uploaded[0]);
      
    } catch (error) {
      progress.errors.push(`Failed to process ${file.name}: ${error}`);
    }

    progress.processedFiles = i + 1;
  }

  progress.status = progress.errors.length > 0 ? 'error' : 'complete';

  return NextResponse.json({
    success: true,
    results,
    progress: {
      totalFiles: progress.totalFiles,
      processedFiles: progress.processedFiles,
      errors: progress.errors,
      status: progress.status,
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE PREVIEW
// ═══════════════════════════════════════════════════════════════════════════

async function previewFile(body: { file: FileUploadInput }) {
  const { file } = body;

  const content = file.content;
  const preview = generatePreview(content, 2000);
  const fileType = getFileType(file.name, content);
  const lineCount = countLines(content);
  const contentHash = generateContentHash(content);

  // Extract key information based on file type
  const insights: Record<string, unknown> = {};

  if (fileType === 'razor_view') {
    // Extract model
    const modelMatch = content.match(/@model\s+([\w.]+)/);
    if (modelMatch) insights.model = modelMatch[1];

    // Count form fields
    const formFields = content.match(/asp-for="[^"]+"/g) || [];
    insights.formFieldCount = formFields.length;

    // Count scripts
    const scripts = content.match(/<script/g) || [];
    insights.scriptCount = scripts.length;
  }

  if (fileType === 'sql' || fileType === 'sql_sp' || fileType === 'sql_ddl') {
    // Count tables
    const tables = content.match(/CREATE TABLE|ALTER TABLE/gi) || [];
    insights.tableCount = tables.length;

    // Count procedures
    const procedures = content.match(/CREATE PROCEDURE|ALTER PROCEDURE/gi) || [];
    insights.procedureCount = procedures.length;
  }

  return NextResponse.json({
    success: true,
    preview: {
      fileName: file.name,
      fileType,
      lineCount,
      fileSize: content.length,
      contentHash,
      preview,
      insights,
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// VERSION HISTORY
// ═══════════════════════════════════════════════════════════════════════════

async function getVersionHistory(body: { fileId: string }) {
  const { fileId } = body;

  const versions = await db.fileVersion.findMany({
    where: { fileId },
    orderBy: { version: 'desc' },
  });

  const currentFile = await db.toolkitFile.findUnique({
    where: { id: fileId },
    select: {
      fileName: true,
      version: true,
      contentHash: true,
      updatedAt: true,
    }
  });

  return NextResponse.json({
    success: true,
    current: currentFile,
    versions: versions.map(v => ({
      id: v.id,
      version: v.version,
      fileSize: v.fileSize,
      lineCount: v.lineCount,
      changeSummary: v.changeSummary,
      createdAt: v.createdAt,
    }))
  });
}

async function restoreVersion(body: { fileId: string; versionId: string }) {
  const { fileId, versionId } = body;

  // Get the version to restore
  const version = await db.fileVersion.findUnique({
    where: { id: versionId }
  });

  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  // Get current file
  const currentFile = await db.toolkitFile.findUnique({
    where: { id: fileId }
  });

  if (!currentFile) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Save current version to history
  await db.fileVersion.create({
    data: {
      fileId,
      version: currentFile.version,
      content: currentFile.content || '',
      contentHash: currentFile.contentHash || '',
      fileSize: currentFile.fileSize,
      lineCount: currentFile.lineCount,
      changeSummary: `Auto-saved before restoring version ${version.version}`,
    }
  });

  // Restore the old version
  const restored = await db.toolkitFile.update({
    where: { id: fileId },
    data: {
      content: version.content,
      contentHash: version.contentHash,
      fileSize: version.fileSize,
      lineCount: version.lineCount,
      preview: generatePreview(version.content),
      parseStatus: 'pending',
      updatedAt: new Date(),
    }
  });

  return NextResponse.json({
    success: true,
    restored: {
      fileName: restored.fileName,
      version: version.version,
      lineCount: restored.lineCount,
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DUPLICATE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

async function checkDuplicates(body: { projectId: string; files: FileUploadInput[] }) {
  const { projectId, files } = body;

  const duplicates = [];

  for (const file of files) {
    const contentHash = generateContentHash(file.content);

    // Check for duplicates in project
    const existingDuplicates = await db.toolkitFile.findMany({
      where: {
        projectId,
        contentHash,
        NOT: { fileName: file.name }
      }
    });

    if (existingDuplicates.length > 0) {
      duplicates.push({
        fileName: file.name,
        contentHash,
        duplicates: existingDuplicates.map(d => ({
          id: d.id,
          fileName: d.fileName,
          fileSize: d.fileSize,
          updatedAt: d.updatedAt,
        }))
      });
    }
  }

  return NextResponse.json({
    success: true,
    duplicates,
    hasDuplicates: duplicates.length > 0,
  });
}

async function resolveDuplicate(body: { 
  fileId: string; 
  resolution: 'keep' | 'delete' | 'merge';
  keepFileId?: string;
}) {
  const { fileId, resolution, keepFileId } = body;

  if (resolution === 'delete') {
    await db.toolkitFile.delete({
      where: { id: fileId }
    });
  } else if (resolution === 'keep') {
    // Mark as not duplicate
    await db.toolkitFile.update({
      where: { id: fileId },
      data: {
        isDuplicate: false,
        duplicateOfId: null,
      }
    });
  } else if (resolution === 'merge' && keepFileId) {
    // Delete the duplicate and keep the original
    await db.toolkitFile.delete({
      where: { id: fileId }
    });
  }

  return NextResponse.json({
    success: true,
    resolution: {
      fileId,
      action: resolution,
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

async function listFiles(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId');
  const fileType = searchParams.get('fileType');
  const includeContent = searchParams.get('includeContent') === 'true';
  const includeDuplicates = searchParams.get('includeDuplicates') === 'true';

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const where: Record<string, unknown> = { projectId };
  if (fileType) where.fileType = fileType;
  if (!includeDuplicates) where.isDuplicate = false;

  const files = await db.toolkitFile.findMany({
    where,
    select: {
      id: true,
      fileName: true,
      filePath: true,
      fileType: true,
      fileSize: true,
      lineCount: true,
      version: true,
      isDuplicate: true,
      parseStatus: true,
      preview: true,
      createdAt: true,
      updatedAt: true,
      content: includeContent,
      _count: {
        select: { versions: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return NextResponse.json({
    success: true,
    files: files.map(f => ({
      ...f,
      versionCount: f._count.versions
    }))
  });
}

async function getFile(searchParams: URLSearchParams) {
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
  }

  const file = await db.toolkitFile.findUnique({
    where: { id: fileId },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 10,
      }
    }
  });

  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, file });
}

async function getDuplicates(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // Find files marked as duplicates
  const duplicates = await db.toolkitFile.findMany({
    where: {
      projectId,
      isDuplicate: true,
    },
    include: {
      originalFile: {
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          updatedAt: true,
        }
      }
    }
  });

  // Find groups by content hash
  const hashGroups = await db.toolkitFile.groupBy({
    by: ['contentHash'],
    where: {
      projectId,
      contentHash: { not: null }
    },
    having: {
      contentHash: { _count: { gt: 1 } }
    },
    _count: true,
  });

  return NextResponse.json({
    success: true,
    duplicates,
    hashGroups: hashGroups.map(g => ({
      contentHash: g.contentHash,
      count: g._count,
    }))
  });
}

async function getFileStats(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const stats = await db.toolkitFile.aggregate({
    where: { projectId },
    _count: true,
    _sum: {
      fileSize: true,
      lineCount: true,
    }
  });

  const byType = await db.toolkitFile.groupBy({
    by: ['fileType'],
    where: { projectId },
    _count: true,
  });

  const duplicateCount = await db.toolkitFile.count({
    where: { projectId, isDuplicate: true }
  });

  const parsedCount = await db.toolkitFile.count({
    where: { projectId, parseStatus: 'complete' }
  });

  return NextResponse.json({
    success: true,
    stats: {
      totalFiles: stats._count,
      totalSize: stats._sum.fileSize || 0,
      totalLines: stats._sum.lineCount || 0,
      duplicates: duplicateCount,
      parsed: parsedCount,
      byType: byType.map(t => ({
        type: t.fileType,
        count: t._count,
      }))
    }
  });
}
