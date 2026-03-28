// =============================================================================
// Source Tracker Service - Track origins and verification of all entities
// =============================================================================
// Manages source file tracking, table discovery, SP mappings, and verification
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface SourceFileInput {
  projectId: string;
  fileName: string;
  filePath?: string;
  fileType: 'sql' | 'cshtml' | 'js' | 'sp' | 'css' | 'json' | 'unknown';
  content: string;
  uploadedBy?: string;
}

export interface TableDiscoveryInput {
  projectId: string;
  tableName: string;
  schemaName?: string;
  sourceFileId: string;
  sourceFile: string;
  discoveryMethod: 'ddl' | 'sp_discovery' | 'cshtml_inference' | 'manual';
  discoveryContext?: string;
  columns?: ColumnDiscoveryInput[];
}

export interface ColumnDiscoveryInput {
  projectId: string;
  tableName: string;
  columnName: string;
  sourceFileId?: string;
  sourceFile?: string;
  sourceLine?: number;
  discoveryMethod: 'ddl' | 'sp_inference' | 'cshtml_form';
  isPII?: boolean;
  isPHI?: boolean;
  isFK?: boolean;
  fkTargetTable?: string;
  fkTargetColumn?: string;
}

export interface SPTableMappingInput {
  projectId: string;
  spName: string;
  tableName: string;
  operationType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'EXECUTE';
  accessType: 'read' | 'write' | 'both';
  columnsRead?: string[];
  columnsWritten?: string[];
  contextSnippet?: string;
  confidence?: number;
}

export interface VerificationInput {
  projectId: string;
  entityType: 'table' | 'column' | 'sp' | 'endpoint' | 'mapping';
  entityId: string;
  entityName: string;
  verificationType: 'source' | 'relationship' | 'business_rule' | 'data_classification';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  triggerSource?: 'auto_discovery' | 'conflict' | 'user_request' | 'ai_suggestion';
  triggerDetails?: string;
  aiSuggestion?: string;
  aiConfidence?: number;
  aiAnalysisData?: Record<string, unknown>;
}

export interface VerificationResolution {
  verificationId: string;
  action: 'approve' | 'reject' | 'modify' | 'escalate';
  resolvedBy: string;
  resolutionData?: Record<string, unknown>;
  reviewNotes?: string;
}

export interface SourceTrackingResult {
  sourceFile: {
    id: string;
    fileName: string;
    status: string;
  };
  tablesDiscovered: number;
  spsDiscovered: number;
  endpointsFound: number;
  verificationQueue: number;
}

// =============================================================================
// Source Tracker Service Class
// =============================================================================

export class SourceTracker {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  // ===========================================================================
  // Source File Management
  // ===========================================================================

  /**
   * Register a source file
   */
  async registerSourceFile(input: SourceFileInput): Promise<{ id: string; contentHash: string }> {
    const contentHash = this.hashContent(input.content);
    const fileSize = Buffer.byteLength(input.content, 'utf8');

    const sourceFile = await prisma.sourceFileRegistry.upsert({
      where: {
        projectId_fileName: {
          projectId: input.projectId,
          fileName: input.fileName,
        },
      },
      create: {
        id: this.generateId(),
        projectId: input.projectId,
        fileName: input.fileName,
        filePath: input.filePath,
        fileType: input.fileType,
        fileSize,
        contentHash,
        parseStatus: 'pending',
        uploadedBy: input.uploadedBy,
      },
      update: {
        fileSize,
        contentHash,
        parseStatus: 'pending',
        parseError: null,
        updatedAt: new Date(),
      },
    });

    return { id: sourceFile.id, contentHash };
  }

  /**
   * Update source file parse status
   */
  async updateParseStatus(
    sourceFileId: string,
    status: 'pending' | 'parsed' | 'error',
    stats: {
      tablesExtracted?: number;
      spsExtracted?: number;
      endpointsFound?: number;
      parseDuration?: number;
      parseError?: string;
    }
  ): Promise<void> {
    await prisma.sourceFileRegistry.update({
      where: { id: sourceFileId },
      data: {
        parseStatus: status,
        tablesExtracted: stats.tablesExtracted ?? 0,
        spsExtracted: stats.spsExtracted ?? 0,
        endpointsFound: stats.endpointsFound ?? 0,
        parseDuration: stats.parseDuration ?? 0,
        parseError: stats.parseError,
        parsedAt: status === 'parsed' ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get all source files for a project
   */
  async getSourceFiles(): Promise<{
    id: string;
    fileName: string;
    fileType: string;
    parseStatus: string;
    tablesExtracted: number;
    spsExtracted: number;
    uploadedAt: Date;
  }[]> {
    return prisma.sourceFileRegistry.findMany({
      where: { projectId: this.projectId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        parseStatus: true,
        tablesExtracted: true,
        spsExtracted: true,
        uploadedAt: true,
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  // ===========================================================================
  // Table Source Tracking
  // ===========================================================================

  /**
   * Record table discovery
   */
  async recordTableDiscovery(input: TableDiscoveryInput): Promise<{ id: string; isNew: boolean }> {
    // Check if table already exists
    const existing = await prisma.tableSourceRecord.findUnique({
      where: {
        projectId_tableName: {
          projectId: input.projectId,
          tableName: input.tableName,
        },
      },
    });

    if (existing) {
      // Add source to discovery sources
      const discoverySources = JSON.parse(existing.discoverySources || '[]');
      if (!discoverySources.includes(input.sourceFileId)) {
        discoverySources.push(input.sourceFileId);
      }

      await prisma.tableSourceRecord.update({
        where: { id: existing.id },
        data: {
          discoverySources: JSON.stringify(discoverySources),
          updatedAt: new Date(),
        },
      });

      return { id: existing.id, isNew: false };
    }

    // Create new table source record
    const tableSource = await prisma.tableSourceRecord.create({
      data: {
        id: this.generateId(),
        projectId: input.projectId,
        tableName: input.tableName,
        schemaName: input.schemaName || 'dbo',
        primarySourceId: input.sourceFileId,
        primarySourceFile: input.sourceFile,
        discoverySources: JSON.stringify([input.sourceFileId]),
        discoveryMethod: input.discoveryMethod,
        discoveryContext: input.discoveryContext,
        discoveryConfidence: this.calculateDiscoveryConfidence(input.discoveryMethod),
        verificationStatus: 'pending',
        verificationScore: this.calculateInitialVerificationScore(input.discoveryMethod),
      },
    });

    // Record columns if provided
    if (input.columns && input.columns.length > 0) {
      await this.recordColumnDiscoveries(input.columns);
    }

    // Add to verification queue if needed
    if (input.discoveryMethod !== 'ddl') {
      await this.addToVerificationQueue({
        projectId: input.projectId,
        entityType: 'table',
        entityId: tableSource.id,
        entityName: input.tableName,
        verificationType: 'source',
        priority: input.discoveryMethod === 'cshtml_inference' ? 'high' : 'medium',
        triggerSource: 'auto_discovery',
        triggerDetails: `Discovered via ${input.discoveryMethod} from ${input.sourceFile}`,
      });
    }

    return { id: tableSource.id, isNew: true };
  }

  /**
   * Record multiple column discoveries
   */
  async recordColumnDiscoveries(columns: ColumnDiscoveryInput[]): Promise<void> {
    for (const col of columns) {
      await prisma.columnSourceRecord.upsert({
        where: {
          projectId_tableName_columnName: {
            projectId: col.projectId,
            tableName: col.tableName,
            columnName: col.columnName,
          },
        },
        create: {
          id: this.generateId(),
          projectId: col.projectId,
          tableName: col.tableName,
          columnName: col.columnName,
          sourceFileId: col.sourceFileId,
          sourceFile: col.sourceFile,
          sourceLine: col.sourceLine,
          discoveryMethod: col.discoveryMethod,
          discoveryConfidence: this.calculateDiscoveryConfidence(col.discoveryMethod),
          isPII: col.isPII ?? false,
          isPHI: col.isPHI ?? false,
          isFK: col.isFK ?? false,
          fkTargetTable: col.fkTargetTable,
          fkTargetColumn: col.fkTargetColumn,
          verificationStatus: 'pending',
        },
        update: {
          sourceFileId: col.sourceFileId,
          sourceFile: col.sourceFile,
          sourceLine: col.sourceLine,
          discoveryMethod: col.discoveryMethod,
          isPII: col.isPII ?? false,
          isPHI: col.isPHI ?? false,
          isFK: col.isFK ?? false,
          fkTargetTable: col.fkTargetTable,
          fkTargetColumn: col.fkTargetColumn,
          updatedAt: new Date(),
        },
      });
    }

    // Update column count on table
    if (columns.length > 0) {
      const tableName = columns[0].tableName;
      await prisma.tableSourceRecord.updateMany({
        where: {
          projectId: this.projectId,
          tableName,
        },
        data: {
          columnCount: columns.length,
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Get table source records with filtering
   */
  async getTableSourceRecords(options?: {
    verificationStatus?: string;
    hasCRUD_SPs?: boolean;
    discoveryMethod?: string;
  }): Promise<{
    id: string;
    tableName: string;
    schemaName: string;
    primarySourceFile: string | null;
    discoveryMethod: string;
    discoveryConfidence: number;
    hasCRUD_SPs: boolean;
    verificationStatus: string;
    verificationScore: number;
    columnCount: number;
    fkCount: number;
    linkedPages: string;
    spList: string;
    createdAt: Date;
  }[]> {
    const where: Record<string, unknown> = { projectId: this.projectId };

    if (options?.verificationStatus) {
      where.verificationStatus = options.verificationStatus;
    }
    if (options?.hasCRUD_SPs !== undefined) {
      where.hasCRUD_SPs = options.hasCRUD_SPs;
    }
    if (options?.discoveryMethod) {
      where.discoveryMethod = options.discoveryMethod;
    }

    return prisma.tableSourceRecord.findMany({
      where,
      select: {
        id: true,
        tableName: true,
        schemaName: true,
        primarySourceFile: true,
        discoveryMethod: true,
        discoveryConfidence: true,
        hasCRUD_SPs: true,
        verificationStatus: true,
        verificationScore: true,
        columnCount: true,
        fkCount: true,
        linkedPages: true,
        spList: true,
        createdAt: true,
      },
      orderBy: { tableName: 'asc' },
    });
  }

  // ===========================================================================
  // SP-Table Mapping
  // ===========================================================================

  /**
   * Record SP-Table mapping
   */
  async recordSPTableMapping(input: SPTableMappingInput): Promise<{ id: string }> {
    const mapping = await prisma.sPTableMapping.upsert({
      where: {
        projectId_spName_tableName_operationType: {
          projectId: input.projectId,
          spName: input.spName,
          tableName: input.tableName,
          operationType: input.operationType,
        },
      },
      create: {
        id: this.generateId(),
        projectId: input.projectId,
        spName: input.spName,
        tableName: input.tableName,
        operationType: input.operationType,
        accessType: input.accessType,
        columnsRead: JSON.stringify(input.columnsRead || []),
        columnsWritten: JSON.stringify(input.columnsWritten || []),
        contextSnippet: input.contextSnippet,
        confidence: input.confidence ?? 0.8,
      },
      update: {
        accessType: input.accessType,
        columnsRead: JSON.stringify(input.columnsRead || []),
        columnsWritten: JSON.stringify(input.columnsWritten || []),
        contextSnippet: input.contextSnippet,
        confidence: input.confidence ?? 0.8,
        updatedAt: new Date(),
      },
    });

    // Update table's SP availability
    await this.updateTableSPAvailability(input.tableName);

    return { id: mapping.id };
  }

  /**
   * Update table's SP availability flags
   */
  private async updateTableSPAvailability(tableName: string): Promise<void> {
    const mappings = await prisma.sPTableMapping.findMany({
      where: {
        projectId: this.projectId,
        tableName,
      },
    });

    const spList = [...new Set(mappings.map(m => m.spName))];
    const hasCRUD_SPs = mappings.some(m => 
      ['INSERT', 'UPDATE', 'DELETE'].includes(m.operationType)
    );

    // Detect SP naming patterns
    const spCreate = mappings.find(m => 
      m.operationType === 'INSERT' && /add|create|insert/i.test(m.spName)
    )?.spName;
    const spRead = mappings.find(m => 
      m.operationType === 'SELECT' && /get|read|fetch/i.test(m.spName)
    )?.spName;
    const spUpdate = mappings.find(m => 
      m.operationType === 'UPDATE' && /update|edit|modify/i.test(m.spName)
    )?.spName;
    const spDelete = mappings.find(m => 
      m.operationType === 'DELETE' && /delete|remove/i.test(m.spName)
    )?.spName;
    const spSearch = mappings.find(m => 
      m.operationType === 'SELECT' && /search|find|filter/i.test(m.spName)
    )?.spName;
    const spDropdown = mappings.find(m => 
      m.operationType === 'SELECT' && /ddl|dropdown|list/i.test(m.spName)
    )?.spName;

    await prisma.tableSourceRecord.updateMany({
      where: {
        projectId: this.projectId,
        tableName,
      },
      data: {
        hasCRUD_SPs,
        spCreate,
        spRead,
        spUpdate,
        spDelete,
        spSearch,
        spDropdown,
        spList: JSON.stringify(spList),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get SP-Table mappings for a table
   */
  async getSPMappingsForTable(tableName: string): Promise<{
    spName: string;
    operationType: string;
    accessType: string;
    columnsRead: string[];
    columnsWritten: string[];
    confidence: number;
    isVerified: boolean;
  }[]> {
    const mappings = await prisma.sPTableMapping.findMany({
      where: {
        projectId: this.projectId,
        tableName,
      },
      select: {
        spName: true,
        operationType: true,
        accessType: true,
        columnsRead: true,
        columnsWritten: true,
        confidence: true,
        isVerified: true,
      },
    });

    return mappings.map(m => ({
      spName: m.spName,
      operationType: m.operationType,
      accessType: m.accessType,
      columnsRead: JSON.parse(m.columnsRead),
      columnsWritten: JSON.parse(m.columnsWritten),
      confidence: m.confidence,
      isVerified: m.isVerified,
    }));
  }

  // ===========================================================================
  // Verification Workflow
  // ===========================================================================

  /**
   * Add item to verification queue
   */
  async addToVerificationQueue(input: VerificationInput): Promise<{ id: string }> {
    const existing = await prisma.verificationQueue.findUnique({
      where: {
        projectId_entityType_entityId_verificationType: {
          projectId: input.projectId,
          entityType: input.entityType,
          entityId: input.entityId,
          verificationType: input.verificationType,
        },
      },
    });

    if (existing) {
      return { id: existing.id };
    }

    const queueItem = await prisma.verificationQueue.create({
      data: {
        id: this.generateId(),
        projectId: input.projectId,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        verificationType: input.verificationType,
        priority: input.priority || 'medium',
        triggerSource: input.triggerSource || 'auto_discovery',
        triggerDetails: input.triggerDetails,
        aiSuggestion: input.aiSuggestion,
        aiConfidence: input.aiConfidence || 0,
        aiAnalysisData: JSON.stringify(input.aiAnalysisData || {}),
        status: 'pending',
      },
    });

    return { id: queueItem.id };
  }

  /**
   * Get verification queue
   */
  async getVerificationQueue(options?: {
    status?: string;
    priority?: string;
    entityType?: string;
  }): Promise<{
    id: string;
    entityType: string;
    entityName: string;
    verificationType: string;
    priority: string;
    status: string;
    triggerSource: string;
    aiSuggestion: string | null;
    aiConfidence: number;
    createdAt: Date;
  }[]> {
    const where: Record<string, unknown> = { projectId: this.projectId };

    if (options?.status) where.status = options.status;
    if (options?.priority) where.priority = options.priority;
    if (options?.entityType) where.entityType = options.entityType;

    return prisma.verificationQueue.findMany({
      where,
      select: {
        id: true,
        entityType: true,
        entityName: true,
        verificationType: true,
        priority: true,
        status: true,
        triggerSource: true,
        aiSuggestion: true,
        aiConfidence: true,
        createdAt: true,
      },
      orderBy: [
        { priority: 'asc' }, // critical, high, medium, low
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Resolve verification item
   */
  async resolveVerification(input: VerificationResolution): Promise<void> {
    await prisma.verificationQueue.update({
      where: { id: input.verificationId },
      data: {
        status: input.action === 'approve' ? 'verified' : 
                input.action === 'reject' ? 'rejected' : 
                input.action === 'escalate' ? 'escalated' : 'in_progress',
        resolutionAction: input.action,
        resolutionData: JSON.stringify(input.resolutionData || {}),
        reviewNotes: input.reviewNotes,
        resolvedBy: input.resolvedBy,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Also update the source entity status
    const queueItem = await prisma.verificationQueue.findUnique({
      where: { id: input.verificationId },
    });

    if (queueItem && input.action === 'approve') {
      await this.updateEntityVerificationStatus(
        queueItem.entityType,
        queueItem.entityId,
        'verified',
        input.resolvedBy
      );
    }
  }

  /**
   * Update entity verification status
   */
  private async updateEntityVerificationStatus(
    entityType: string,
    entityId: string,
    status: string,
    verifiedBy: string
  ): Promise<void> {
    const now = new Date();

    switch (entityType) {
      case 'table':
        await prisma.tableSourceRecord.update({
          where: { id: entityId },
          data: {
            verificationStatus: status,
            verifiedBy,
            verifiedAt: now,
            updatedAt: now,
          },
        });
        break;
      case 'column':
        await prisma.columnSourceRecord.update({
          where: { id: entityId },
          data: {
            verificationStatus: status,
            verifiedBy,
            verifiedAt: now,
            updatedAt: now,
          },
        });
        break;
      // Add other entity types as needed
    }
  }

  // ===========================================================================
  // Statistics and Reports
  // ===========================================================================

  /**
   * Get source tracking statistics
   */
  async getStatistics(): Promise<{
    sourceFiles: { total: number; byType: Record<string, number>; byStatus: Record<string, number> };
    tables: { total: number; withSPs: number; verified: number; pending: number; byDiscovery: Record<string, number> };
    verificationQueue: { total: number; byStatus: Record<string, number>; byPriority: Record<string, number> };
    spMappings: number;
  }> {
    // Source files
    const sourceFiles = await prisma.sourceFileRegistry.findMany({
      where: { projectId: this.projectId },
      select: { fileType: true, parseStatus: true },
    });

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    sourceFiles.forEach(f => {
      byType[f.fileType] = (byType[f.fileType] || 0) + 1;
      byStatus[f.parseStatus] = (byStatus[f.parseStatus] || 0) + 1;
    });

    // Tables
    const tables = await prisma.tableSourceRecord.findMany({
      where: { projectId: this.projectId },
      select: { hasCRUD_SPs: true, verificationStatus: true, discoveryMethod: true },
    });

    const byDiscovery: Record<string, number> = {};
    tables.forEach(t => {
      byDiscovery[t.discoveryMethod] = (byDiscovery[t.discoveryMethod] || 0) + 1;
    });

    // Verification queue
    const queue = await prisma.verificationQueue.findMany({
      where: { projectId: this.projectId },
      select: { status: true, priority: true },
    });

    const queueByStatus: Record<string, number> = {};
    const queueByPriority: Record<string, number> = {};
    queue.forEach(q => {
      queueByStatus[q.status] = (queueByStatus[q.status] || 0) + 1;
      queueByPriority[q.priority] = (queueByPriority[q.priority] || 0) + 1;
    });

    // SP Mappings
    const spMappings = await prisma.sPTableMapping.count({
      where: { projectId: this.projectId },
    });

    return {
      sourceFiles: {
        total: sourceFiles.length,
        byType,
        byStatus,
      },
      tables: {
        total: tables.length,
        withSPs: tables.filter(t => t.hasCRUD_SPs).length,
        verified: tables.filter(t => t.verificationStatus === 'verified').length,
        pending: tables.filter(t => t.verificationStatus === 'pending').length,
        byDiscovery,
      },
      verificationQueue: {
        total: queue.length,
        byStatus: queueByStatus,
        byPriority: queueByPriority,
      },
      spMappings,
    };
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private calculateDiscoveryConfidence(method: string): number {
    const confidenceMap: Record<string, number> = {
      'ddl': 1.0,
      'sp_discovery': 0.85,
      'cshtml_inference': 0.7,
      'manual': 0.95,
      'sp_inference': 0.8,
      'cshtml_form': 0.75,
    };
    return confidenceMap[method] || 0.5;
  }

  private calculateInitialVerificationScore(method: string): number {
    const scoreMap: Record<string, number> = {
      'ddl': 90,
      'manual': 95,
      'sp_discovery': 70,
      'cshtml_inference': 50,
    };
    return scoreMap[method] || 50;
  }
}

// =============================================================================
// Export convenience functions
// =============================================================================

export function createSourceTracker(projectId: string): SourceTracker {
  return new SourceTracker(projectId);
}

/**
 * Quick function to register a parsed SQL file
 */
export async function registerSQLFile(
  projectId: string,
  fileName: string,
  content: string,
  parsedTables: Array<{ name: string; columns: string[] }>,
  parsedSPs: string[]
): Promise<SourceTrackingResult> {
  const tracker = new SourceTracker(projectId);

  // Register source file
  const { id: sourceFileId } = await tracker.registerSourceFile({
    projectId,
    fileName,
    fileType: 'sql',
    content,
  });

  // Record table discoveries
  let tablesDiscovered = 0;
  for (const table of parsedTables) {
    await tracker.recordTableDiscovery({
      projectId,
      tableName: table.name,
      sourceFileId,
      sourceFile: fileName,
      discoveryMethod: 'ddl',
      columns: table.columns.map(col => ({
        projectId,
        tableName: table.name,
        columnName: col,
        discoveryMethod: 'ddl',
      })),
    });
    tablesDiscovered++;
  }

  // Update parse status
  await tracker.updateParseStatus(sourceFileId, 'parsed', {
    tablesExtracted: tablesDiscovered,
    spsExtracted: parsedSPs.length,
    parseDuration: 0,
  });

  const stats = await tracker.getStatistics();

  return {
    sourceFile: { id: sourceFileId, fileName, status: 'parsed' },
    tablesDiscovered,
    spsDiscovered: parsedSPs.length,
    endpointsFound: 0,
    verificationQueue: stats.verificationQueue.total,
  };
}
