/**
 * Project Intelligence Engine - Phase 5
 * 
 * Provides:
 * - Requirement Traceability Matrix
 * - Schema Version Control
 * - Decision Log System
 * - Team Allocation Intelligence
 * - Gap Analysis
 */

import { prisma } from './db';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Requirement {
  id: string;
  requirementId: string;
  projectId: string;
  title: string;
  description?: string;
  category: 'functional' | 'non_functional' | 'technical' | 'compliance';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'approved' | 'in_progress' | 'implemented' | 'verified' | 'deprecated';
  sourceType: 'manual' | 'user_story' | 'sp_analysis' | 'cshtml_analysis';
  sourceId?: string;
  linkedTables: string[];
  linkedAPIs: string[];
  linkedScreens: string[];
  linkedTestCases: string[];
  linkedSPs: string[];
  implementationStatus: 'not_started' | 'partial' | 'complete' | 'blocked';
  coveragePercent: number;
  moduleName?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TableSchemaSnapshot {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    references?: { table: string; column: string };
  }>;
  foreignKeys: Array<{
    name: string;
    columns: string[];
    referencedTable: string;
    referencedColumns: string[];
  }>;
  indexes: Array<{
    name: string;
    columns: string[];
    isUnique: boolean;
  }>;
}

export interface SchemaVersion {
  id: string;
  projectId: string;
  versionNumber: string;
  versionHash: string;
  tablesSnapshot: TableSchemaSnapshot[];
  totalTables: number;
  totalColumns: number;
  totalFKs: number;
  changesSummary: {
    added: string[];
    modified: string[];
    removed: string[];
  };
  triggeredBy?: string;
  triggerSource: 'upload' | 'migration' | 'manual';
  description?: string;
  createdAt: Date;
}

export interface TableChange {
  tableName: string;
  changeType: 'added' | 'removed' | 'modified';
  details?: string;
}

export interface ColumnChange {
  tableName: string;
  columnName: string;
  changeType: 'added' | 'removed' | 'modified';
  oldType?: string;
  newType?: string;
  details?: string;
}

export interface BreakingChange {
  type: 'table_removed' | 'column_removed' | 'fk_changed' | 'type_changed';
  affected: string;
  impact: string;
  recommendation: string;
}

export interface SchemaDiffResult {
  id: string;
  projectId: string;
  fromVersionId: string;
  toVersionId: string;
  tableChanges: TableChange[];
  columnChanges: ColumnChange[];
  breakingChanges: BreakingChange[];
  affectedModules: string[];
  affectedScreens: string[];
  affectedAPIs: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskNotes: string[];
  migrationScript?: string;
}

export interface Alternative {
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  rejected: boolean;
  rejectionReason?: string;
}

export interface Decision {
  id: string;
  decisionId: string;
  projectId: string;
  title: string;
  description?: string;
  category: 'architecture' | 'database' | 'api' | 'security' | 'performance' | 'ux';
  context?: string;
  problemStatement?: string;
  decision: string;
  rationale?: string;
  alternatives: Alternative[];
  impact: 'low' | 'medium' | 'high' | 'critical';
  affectedAreas: string[];
  status: 'proposed' | 'approved' | 'rejected' | 'superseded';
  proposedBy?: string;
  decidedBy?: string;
  approvedBy?: string;
  relatedTables: string[];
  relatedModules: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience: number;
}

export interface TeamMember {
  id: string;
  companyId: string;
  name: string;
  email?: string;
  role: 'developer' | 'senior_developer' | 'tech_lead' | 'architect' | 'qa' | 'devops';
  skills: Skill[];
  availability: number; // 0-100
  hourlyRate?: number;
  currentAssignments: ModuleAssignment[];
  projectsCompleted: number;
  averageVelocity: number;
  isActive: boolean;
}

export interface ModuleAssignment {
  moduleId: string;
  moduleName: string;
  memberIds: string[];
  estimatedHours: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  status: 'pending' | 'in_progress' | 'completed';
}

export interface TeamAllocation {
  id: string;
  allocationId: string;
  projectId: string;
  name: string;
  sprintNumber?: number;
  startDate?: Date;
  endDate?: Date;
  assignments: ModuleAssignment[];
  totalMembers: number;
  totalModules: number;
  totalHours: number;
  totalStoryPoints: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  plannedVelocity: number;
  actualVelocity?: number;
}

export interface GapAnalysis {
  id: string;
  projectId: string;
  targetType: 'requirement' | 'module' | 'feature';
  targetId: string;
  targetName: string;
  gapType: 'missing_implementation' | 'missing_tests' | 'missing_docs' | 'incomplete';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  expectedArtifacts: string[];
  existingArtifacts: string[];
  missingArtifacts: string[];
  coveragePercent: number;
  recommendations: Array<{
    action: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    estimatedEffort: number; // hours
    assignedTo?: string;
  }>;
  resolutionStatus: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
}

// ============================================================================
// REQUIREMENT TRACEABILITY SERVICE
// ============================================================================

export class RequirementTraceabilityService {
  /**
   * Create a new requirement with traceability links
   */
  static async createRequirement(data: {
    projectId: string;
    title: string;
    description?: string;
    category?: Requirement['category'];
    priority?: Requirement['priority'];
    sourceType?: Requirement['sourceType'];
    sourceId?: string;
    moduleName?: string;
    tags?: string[];
  }): Promise<Requirement> {
    const count = await prisma.requirementRecord.count({
      where: { projectId: data.projectId }
    });
    
    const requirementId = `REQ-${String(count + 1).padStart(3, '0')}`;
    
    const record = await prisma.requirementRecord.create({
      data: {
        projectId: data.projectId,
        requirementId,
        title: data.title,
        description: data.description,
        category: data.category || 'functional',
        priority: data.priority || 'medium',
        sourceType: data.sourceType || 'manual',
        sourceId: data.sourceId,
        moduleName: data.moduleName,
        tags: JSON.stringify(data.tags || []),
      }
    });
    
    return this.toRequirement(record);
  }

  /**
   * Link requirement to artifacts
   */
  static async linkRequirement(
    requirementId: string,
    links: {
      tables?: string[];
      apis?: string[];
      screens?: string[];
      testCases?: string[];
      sps?: string[];
    }
  ): Promise<Requirement> {
    const existing = await prisma.requirementRecord.findUnique({
      where: { requirementId }
    });
    
    if (!existing) throw new Error('Requirement not found');
    
    const currentTables = JSON.parse(existing.linkedTables || '[]');
    const currentAPIs = JSON.parse(existing.linkedAPIs || '[]');
    const currentScreens = JSON.parse(existing.linkedScreens || '[]');
    const currentTestCases = JSON.parse(existing.linkedTestCases || '[]');
    const currentSPs = JSON.parse(existing.linkedSPs || '[]');
    
    const record = await prisma.requirementRecord.update({
      where: { requirementId },
      data: {
        linkedTables: JSON.stringify([...new Set([...currentTables, ...(links.tables || [])])]),
        linkedAPIs: JSON.stringify([...new Set([...currentAPIs, ...(links.apis || [])])]),
        linkedScreens: JSON.stringify([...new Set([...currentScreens, ...(links.screens || [])])]),
        linkedTestCases: JSON.stringify([...new Set([...currentTestCases, ...(links.testCases || [])])]),
        linkedSPs: JSON.stringify([...new Set([...currentSPs, ...(links.sps || [])])]),
      }
    });
    
    return this.toRequirement(record);
  }

  /**
   * Calculate coverage for a requirement
   */
  static async calculateCoverage(requirementId: string): Promise<number> {
    const req = await prisma.requirementRecord.findUnique({
      where: { requirementId }
    });
    
    if (!req) return 0;
    
    const tables = JSON.parse(req.linkedTables || '[]');
    const apis = JSON.parse(req.linkedAPIs || '[]');
    const screens = JSON.parse(req.linkedScreens || '[]');
    const testCases = JSON.parse(req.linkedTestCases || '[]');
    
    // Simple coverage calculation
    // Tables contribute 30%, APIs 20%, Screens 30%, Test Cases 20%
    let coverage = 0;
    
    if (tables.length > 0) coverage += 30;
    if (apis.length > 0) coverage += 20;
    if (screens.length > 0) coverage += 30;
    if (testCases.length > 0) coverage += 20;
    
    await prisma.requirementRecord.update({
      where: { requirementId },
      data: {
        coveragePercent: coverage,
        implementationStatus: coverage >= 80 ? 'complete' : coverage >= 40 ? 'partial' : 'not_started'
      }
    });
    
    return coverage;
  }

  /**
   * Get full traceability matrix for a project
   */
  static async getTraceabilityMatrix(projectId: string): Promise<{
    requirements: Requirement[];
    matrix: Array<{
      requirement: Requirement;
      tables: string[];
      apis: string[];
      screens: string[];
      testCases: string[];
      coverage: number;
      gaps: string[];
    }>;
    summary: {
      total: number;
      complete: number;
      partial: number;
      notStarted: number;
      averageCoverage: number;
    };
  }> {
    const records = await prisma.requirementRecord.findMany({
      where: { projectId },
      orderBy: { requirementId: 'asc' }
    });
    
    const requirements = records.map(this.toRequirement);
    
    const matrix = requirements.map(req => {
      const gaps: string[] = [];
      if (req.linkedTables.length === 0) gaps.push('No tables linked');
      if (req.linkedAPIs.length === 0) gaps.push('No APIs linked');
      if (req.linkedScreens.length === 0) gaps.push('No screens linked');
      if (req.linkedTestCases.length === 0) gaps.push('No test cases linked');
      
      return {
        requirement: req,
        tables: req.linkedTables,
        apis: req.linkedAPIs,
        screens: req.linkedScreens,
        testCases: req.linkedTestCases,
        coverage: req.coveragePercent,
        gaps
      };
    });
    
    const summary = {
      total: requirements.length,
      complete: requirements.filter(r => r.implementationStatus === 'complete').length,
      partial: requirements.filter(r => r.implementationStatus === 'partial').length,
      notStarted: requirements.filter(r => r.implementationStatus === 'not_started').length,
      averageCoverage: requirements.length > 0
        ? Math.round(requirements.reduce((sum, r) => sum + r.coveragePercent, 0) / requirements.length)
        : 0
    };
    
    return { requirements, matrix, summary };
  }

  private static toRequirement(record: any): Requirement {
    return {
      id: record.id,
      requirementId: record.requirementId,
      projectId: record.projectId,
      title: record.title,
      description: record.description || undefined,
      category: record.category,
      priority: record.priority,
      status: record.status,
      sourceType: record.sourceType,
      sourceId: record.sourceId || undefined,
      linkedTables: JSON.parse(record.linkedTables || '[]'),
      linkedAPIs: JSON.parse(record.linkedAPIs || '[]'),
      linkedScreens: JSON.parse(record.linkedScreens || '[]'),
      linkedTestCases: JSON.parse(record.linkedTestCases || '[]'),
      linkedSPs: JSON.parse(record.linkedSPs || '[]'),
      implementationStatus: record.implementationStatus,
      coveragePercent: record.coveragePercent,
      moduleName: record.moduleName || undefined,
      tags: JSON.parse(record.tags || '[]'),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }
}

// ============================================================================
// SCHEMA VERSION CONTROL SERVICE
// ============================================================================

export class SchemaVersionControlService {
  /**
   * Create a schema version snapshot
   */
  static async createSnapshot(
    projectId: string,
    tables: TableSchemaSnapshot[],
    views: any[] = [],
    sps: any[] = [],
    options: {
      triggeredBy?: string;
      triggerSource?: 'upload' | 'migration' | 'manual';
      description?: string;
    } = {}
  ): Promise<SchemaVersion> {
    // Get the latest version
    const latestVersion = await prisma.schemaVersion.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate version number
    let versionNumber = '1.0.0';
    if (latestVersion) {
      const parts = latestVersion.versionNumber.split('.').map(Number);
      parts[2]++; // Increment patch version
      versionNumber = parts.join('.');
    }
    
    // Calculate hash from content
    const contentHash = this.calculateHash(JSON.stringify({ tables, views, sps }));
    
    // Check if identical to previous
    if (latestVersion && latestVersion.versionHash === contentHash) {
      return this.toSchemaVersion(latestVersion);
    }
    
    // Calculate changes
    const changesSummary = latestVersion
      ? await this.detectChanges(
          JSON.parse(latestVersion.tablesSnapshot || '[]'),
          tables
        )
      : { added: tables.map(t => t.tableName), modified: [], removed: [] };
    
    // Calculate statistics
    const totalColumns = tables.reduce((sum, t) => sum + t.columns.length, 0);
    const totalFKs = tables.reduce((sum, t) => sum + t.foreignKeys.length, 0);
    
    const record = await prisma.schemaVersion.create({
      data: {
        projectId,
        versionNumber,
        versionHash: contentHash,
        tablesSnapshot: JSON.stringify(tables),
        viewsSnapshot: JSON.stringify(views),
        spsSnapshot: JSON.stringify(sps),
        totalTables: tables.length,
        totalViews: views.length,
        totalSPs: sps.length,
        totalColumns,
        totalFKs,
        changesSummary: JSON.stringify(changesSummary),
        triggeredBy: options.triggeredBy,
        triggerSource: options.triggerSource || 'upload',
        description: options.description,
        previousVersionId: latestVersion?.id
      }
    });
    
    return this.toSchemaVersion(record);
  }

  /**
   * Compare two schema versions
   */
  static async compareVersions(
    fromVersionId: string,
    toVersionId: string
  ): Promise<SchemaDiffResult> {
    const fromVersion = await prisma.schemaVersion.findUnique({
      where: { id: fromVersionId }
    });
    const toVersion = await prisma.schemaVersion.findUnique({
      where: { id: toVersionId }
    });
    
    if (!fromVersion || !toVersion) {
      throw new Error('Version not found');
    }
    
    const fromTables: TableSchemaSnapshot[] = JSON.parse(fromVersion.tablesSnapshot || '[]');
    const toTables: TableSchemaSnapshot[] = JSON.parse(toVersion.tablesSnapshot || '[]');
    
    const tableChanges = this.detectTableChanges(fromTables, toTables);
    const columnChanges = this.detectColumnChanges(fromTables, toTables);
    const breakingChanges = this.detectBreakingChanges(tableChanges, columnChanges);
    
    // Calculate risk level
    const riskLevel = this.assessRisk(breakingChanges, tableChanges, columnChanges);
    const riskNotes = this.generateRiskNotes(breakingChanges, riskLevel);
    
    // Generate migration script
    const migrationScript = this.generateMigrationScript(tableChanges, columnChanges);
    
    const record = await prisma.schemaDiff.upsert({
      where: {
        projectId_fromVersionId_toVersionId: {
          projectId: toVersion.projectId,
          fromVersionId,
          toVersionId
        }
      },
      create: {
        projectId: toVersion.projectId,
        fromVersionId,
        toVersionId,
        tableChanges: JSON.stringify(tableChanges),
        columnChanges: JSON.stringify(columnChanges),
        breakingChanges: JSON.stringify(breakingChanges),
        riskLevel,
        riskNotes: JSON.stringify(riskNotes),
        migrationScript
      },
      update: {
        tableChanges: JSON.stringify(tableChanges),
        columnChanges: JSON.stringify(columnChanges),
        breakingChanges: JSON.stringify(breakingChanges),
        riskLevel,
        riskNotes: JSON.stringify(riskNotes),
        migrationScript
      }
    });
    
    return {
      id: record.id,
      projectId: record.projectId,
      fromVersionId: record.fromVersionId,
      toVersionId: record.toVersionId,
      tableChanges,
      columnChanges,
      breakingChanges,
      affectedModules: JSON.parse(record.affectedModules || '[]'),
      affectedScreens: JSON.parse(record.affectedScreens || '[]'),
      affectedAPIs: JSON.parse(record.affectedAPIs || '[]'),
      riskLevel: record.riskLevel as SchemaDiffResult['riskLevel'],
      riskNotes,
      migrationScript: record.migrationScript || undefined
    };
  }

  /**
   * Get version history
   */
  static async getVersionHistory(projectId: string): Promise<SchemaVersion[]> {
    const records = await prisma.schemaVersion.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    return records.map(this.toSchemaVersion);
  }

  private static calculateHash(content: string): string {
    // Simple hash function for version comparison
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private static detectChanges(
    oldTables: TableSchemaSnapshot[],
    newTables: TableSchemaSnapshot[]
  ): { added: string[]; modified: string[]; removed: string[] } {
    const oldNames = new Set(oldTables.map(t => t.tableName));
    const newNames = new Set(newTables.map(t => t.tableName));
    
    const added = [...newNames].filter(n => !oldNames.has(n));
    const removed = [...oldNames].filter(n => !newNames.has(n));
    
    const modified: string[] = [];
    for (const newTable of newTables) {
      const oldTable = oldTables.find(t => t.tableName === newTable.tableName);
      if (oldTable) {
        if (JSON.stringify(oldTable) !== JSON.stringify(newTable)) {
          modified.push(newTable.tableName);
        }
      }
    }
    
    return { added, modified, removed };
  }

  private static detectTableChanges(
    fromTables: TableSchemaSnapshot[],
    toTables: TableSchemaSnapshot[]
  ): TableChange[] {
    const changes: TableChange[] = [];
    const fromNames = new Set(fromTables.map(t => t.tableName));
    const toNames = new Set(toTables.map(t => t.tableName));
    
    // Added tables
    for (const name of toNames) {
      if (!fromNames.has(name)) {
        changes.push({ tableName: name, changeType: 'added' });
      }
    }
    
    // Removed tables
    for (const name of fromNames) {
      if (!toNames.has(name)) {
        changes.push({ tableName: name, changeType: 'removed' });
      }
    }
    
    // Modified tables
    for (const toTable of toTables) {
      const fromTable = fromTables.find(t => t.tableName === toTable.tableName);
      if (fromTable && JSON.stringify(fromTable) !== JSON.stringify(toTable)) {
        changes.push({ tableName: toTable.tableName, changeType: 'modified' });
      }
    }
    
    return changes;
  }

  private static detectColumnChanges(
    fromTables: TableSchemaSnapshot[],
    toTables: TableSchemaSnapshot[]
  ): ColumnChange[] {
    const changes: ColumnChange[] = [];
    
    for (const toTable of toTables) {
      const fromTable = fromTables.find(t => t.tableName === toTable.tableName);
      if (!fromTable) continue;
      
      const fromColumns = new Map(fromTable.columns.map(c => [c.name, c]));
      const toColumns = new Map(toTable.columns.map(c => [c.name, c]));
      
      // Added columns
      for (const [name, col] of toColumns) {
        if (!fromColumns.has(name)) {
          changes.push({
            tableName: toTable.tableName,
            columnName: name,
            changeType: 'added',
            newType: col.type
          });
        }
      }
      
      // Removed columns
      for (const [name, col] of fromColumns) {
        if (!toColumns.has(name)) {
          changes.push({
            tableName: toTable.tableName,
            columnName: name,
            changeType: 'removed',
            oldType: col.type
          });
        }
      }
      
      // Modified columns
      for (const [name, toCol] of toColumns) {
        const fromCol = fromColumns.get(name);
        if (fromCol && fromCol.type !== toCol.type) {
          changes.push({
            tableName: toTable.tableName,
            columnName: name,
            changeType: 'modified',
            oldType: fromCol.type,
            newType: toCol.type
          });
        }
      }
    }
    
    return changes;
  }

  private static detectBreakingChanges(
    tableChanges: TableChange[],
    columnChanges: ColumnChange[]
  ): BreakingChange[] {
    const breaking: BreakingChange[] = [];
    
    // Removed tables are breaking
    for (const tc of tableChanges) {
      if (tc.changeType === 'removed') {
        breaking.push({
          type: 'table_removed',
          affected: tc.tableName,
          impact: 'All references to this table will break',
          recommendation: 'Remove all foreign keys and references before dropping'
        });
      }
    }
    
    // Removed columns are breaking
    for (const cc of columnChanges) {
      if (cc.changeType === 'removed') {
        breaking.push({
          type: 'column_removed',
          affected: `${cc.tableName}.${cc.columnName}`,
          impact: 'Queries and stored procedures using this column will fail',
          recommendation: 'Update all dependent code before dropping column'
        });
      } else if (cc.changeType === 'modified') {
        breaking.push({
          type: 'type_changed',
          affected: `${cc.tableName}.${cc.columnName}`,
          impact: `Type changed from ${cc.oldType} to ${cc.newType}`,
          recommendation: 'Verify data compatibility and update dependent code'
        });
      }
    }
    
    return breaking;
  }

  private static assessRisk(
    breakingChanges: BreakingChange[],
    tableChanges: TableChange[],
    columnChanges: ColumnChange[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (breakingChanges.some(bc => bc.type === 'table_removed')) return 'critical';
    if (breakingChanges.length > 5) return 'high';
    if (breakingChanges.length > 0) return 'medium';
    if (tableChanges.length > 5 || columnChanges.length > 10) return 'medium';
    return 'low';
  }

  private static generateRiskNotes(
    breakingChanges: BreakingChange[],
    riskLevel: string
  ): string[] {
    const notes: string[] = [];
    
    if (riskLevel === 'critical') {
      notes.push('CRITICAL: Schema changes include table removals');
      notes.push('Ensure backup is taken before migration');
    }
    
    const removedTables = breakingChanges.filter(bc => bc.type === 'table_removed');
    if (removedTables.length > 0) {
      notes.push(`${removedTables.length} table(s) will be removed`);
    }
    
    const removedColumns = breakingChanges.filter(bc => bc.type === 'column_removed');
    if (removedColumns.length > 0) {
      notes.push(`${removedColumns.length} column(s) will be removed`);
    }
    
    return notes;
  }

  private static generateMigrationScript(
    tableChanges: TableChange[],
    columnChanges: ColumnChange[]
  ): string {
    const lines: string[] = ['-- Auto-generated migration script', ''];
    
    for (const tc of tableChanges) {
      if (tc.changeType === 'removed') {
        lines.push(`DROP TABLE IF EXISTS "${tc.tableName}";`);
      } else if (tc.changeType === 'added') {
        lines.push(`-- TODO: Add CREATE TABLE statement for "${tc.tableName}"`);
      }
    }
    
    for (const cc of columnChanges) {
      if (cc.changeType === 'removed') {
        lines.push(`ALTER TABLE "${cc.tableName}" DROP COLUMN IF EXISTS "${cc.columnName}";`);
      } else if (cc.changeType === 'added') {
        lines.push(`ALTER TABLE "${cc.tableName}" ADD COLUMN "${cc.columnName}" ${cc.newType || 'TEXT'};`);
      } else if (cc.changeType === 'modified') {
        lines.push(`-- WARNING: Type change for "${cc.tableName}.${cc.columnName}" from ${cc.oldType} to ${cc.newType}`);
        lines.push(`-- ALTER TABLE "${cc.tableName}" ALTER COLUMN "${cc.columnName}" TYPE ${cc.newType};`);
      }
    }
    
    return lines.join('\n');
  }

  private static toSchemaVersion(record: any): SchemaVersion {
    return {
      id: record.id,
      projectId: record.projectId,
      versionNumber: record.versionNumber,
      versionHash: record.versionHash,
      tablesSnapshot: JSON.parse(record.tablesSnapshot || '[]'),
      totalTables: record.totalTables,
      totalColumns: record.totalColumns,
      totalFKs: record.totalFKs,
      changesSummary: JSON.parse(record.changesSummary || '{}'),
      triggeredBy: record.triggeredBy || undefined,
      triggerSource: record.triggerSource,
      description: record.description || undefined,
      createdAt: record.createdAt
    };
  }
}

// ============================================================================
// DECISION LOG SERVICE
// ============================================================================

export class DecisionLogService {
  /**
   * Create a new decision record
   */
  static async createDecision(data: {
    projectId: string;
    title: string;
    description?: string;
    category?: Decision['category'];
    context?: string;
    problemStatement?: string;
    decision: string;
    rationale?: string;
    alternatives?: Alternative[];
    impact?: Decision['impact'];
    affectedAreas?: string[];
    relatedTables?: string[];
    relatedModules?: string[];
    tags?: string[];
  }): Promise<Decision> {
    const count = await prisma.decisionRecord.count({
      where: { projectId: data.projectId }
    });
    
    const decisionId = `DEC-${String(count + 1).padStart(3, '0')}`;
    
    const record = await prisma.decisionRecord.create({
      data: {
        projectId: data.projectId,
        decisionId,
        title: data.title,
        description: data.description,
        category: data.category || 'architecture',
        context: data.context,
        problemStatement: data.problemStatement,
        decision: data.decision,
        rationale: data.rationale,
        alternatives: JSON.stringify(data.alternatives || []),
        impact: data.impact || 'medium',
        affectedAreas: JSON.stringify(data.affectedAreas || []),
        relatedTables: JSON.stringify(data.relatedTables || []),
        relatedModules: JSON.stringify(data.relatedModules || []),
        tags: JSON.stringify(data.tags || [])
      }
    });
    
    return this.toDecision(record);
  }

  /**
   * Approve a decision
   */
  static async approveDecision(
    decisionId: string,
    approvedBy: string
  ): Promise<Decision> {
    const record = await prisma.decisionRecord.update({
      where: { decisionId },
      data: {
        status: 'approved',
        approvedBy,
        approvedAt: new Date()
      }
    });
    
    return this.toDecision(record);
  }

  /**
   * Get decisions for a project
   */
  static async getDecisions(
    projectId: string,
    filters?: {
      category?: string;
      status?: string;
      impact?: string;
    }
  ): Promise<Decision[]> {
    const records = await prisma.decisionRecord.findMany({
      where: {
        projectId,
        ...(filters?.category && { category: filters.category }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.impact && { impact: filters.impact })
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return records.map(this.toDecision);
  }

  private static toDecision(record: any): Decision {
    return {
      id: record.id,
      decisionId: record.decisionId,
      projectId: record.projectId,
      title: record.title,
      description: record.description || undefined,
      category: record.category,
      context: record.context || undefined,
      problemStatement: record.problemStatement || undefined,
      decision: record.decision,
      rationale: record.rationale || undefined,
      alternatives: JSON.parse(record.alternatives || '[]'),
      impact: record.impact,
      affectedAreas: JSON.parse(record.affectedAreas || '[]'),
      status: record.status,
      proposedBy: record.proposedBy || undefined,
      decidedBy: record.decidedBy || undefined,
      approvedBy: record.approvedBy || undefined,
      relatedTables: JSON.parse(record.relatedTables || '[]'),
      relatedModules: JSON.parse(record.relatedModules || '[]'),
      tags: JSON.parse(record.tags || '[]'),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }
}

// ============================================================================
// TEAM ALLOCATION SERVICE
// ============================================================================

export class TeamAllocationService {
  /**
   * Create a team member
   */
  static async createTeamMember(data: {
    companyId: string;
    name: string;
    email?: string;
    role?: TeamMember['role'];
    skills?: Skill[];
    availability?: number;
    hourlyRate?: number;
  }): Promise<TeamMember> {
    const record = await prisma.teamMember.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        email: data.email,
        role: data.role || 'developer',
        skills: JSON.stringify(data.skills || []),
        availability: data.availability || 100,
        hourlyRate: data.hourlyRate
      }
    });
    
    return this.toTeamMember(record);
  }

  /**
   * AI-powered allocation suggestion
   */
  static async suggestAllocation(
    projectId: string,
    modules: Array<{
      moduleId: string;
      moduleName: string;
      complexity: 'low' | 'medium' | 'high' | 'very_high';
      priority: 'critical' | 'high' | 'medium' | 'low';
      estimatedHours: number;
      requiredSkills?: string[];
    }>,
    teamMembers: TeamMember[]
  ): Promise<ModuleAssignment[]> {
    const assignments: ModuleAssignment[] = [];
    
    // Sort modules by priority and complexity
    const sortedModules = [...modules].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const complexityOrder = { very_high: 0, high: 1, medium: 2, low: 3 };
      
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return complexityOrder[a.complexity] - complexityOrder[b.complexity];
    });
    
    // Track member availability
    const memberAvailability = new Map<string, number>(
      teamMembers.map(m => [m.id, m.availability])
    );
    
    for (const moduleItem of sortedModules) {
      // Find best fit members
      const candidates = teamMembers
        .filter(m => (memberAvailability.get(m.id) || 0) > 0)
        .map(member => {
          let score = 0;
          
          // Skill match
          if (moduleItem.requiredSkills) {
            const matchingSkills = member.skills.filter(s => 
              moduleItem.requiredSkills?.includes(s.name)
            );
            score += matchingSkills.length * 10;
          }
          
          // Role fit for complexity
          if (moduleItem.complexity === 'very_high' && member.role === 'architect') score += 20;
          else if (moduleItem.complexity === 'high' && ['tech_lead', 'senior_developer'].includes(member.role)) score += 15;
          else if (moduleItem.complexity === 'medium' && ['senior_developer', 'developer'].includes(member.role)) score += 10;
          
          // Availability
          score += (memberAvailability.get(member.id) || 0) / 10;
          
          // Past performance
          score += member.averageVelocity;
          
          return { member, score };
        })
        .sort((a, b) => b.score - a.score);
      
      // Assign top candidates
      const assignedMembers: string[] = [];
      let hoursAssigned = 0;
      
      for (const { member } of candidates) {
        if (hoursAssigned >= moduleItem.estimatedHours) break;
        
        const availableHours = (memberAvailability.get(member.id) || 0) * 8 / 100; // 8-hour day
        assignedMembers.push(member.id);
        hoursAssigned += availableHours;
        
        // Update availability
        const newAvailability = Math.max(0, (memberAvailability.get(member.id) || 0) - 25);
        memberAvailability.set(member.id, newAvailability);
      }
      
      assignments.push({
        moduleId: moduleItem.moduleId,
        moduleName: moduleItem.moduleName,
        memberIds: assignedMembers,
        estimatedHours: moduleItem.estimatedHours,
        priority: moduleItem.priority,
        complexity: moduleItem.complexity,
        status: 'pending'
      });
    }
    
    return assignments;
  }

  /**
   * Create a team allocation
   */
  static async createAllocation(data: {
    projectId: string;
    name: string;
    sprintNumber?: number;
    startDate?: Date;
    endDate?: Date;
    assignments: ModuleAssignment[];
  }): Promise<TeamAllocation> {
    const count = await prisma.teamAllocation.count({
      where: { projectId: data.projectId }
    });
    
    const allocationId = `ALLOC-${String(count + 1).padStart(3, '0')}`;
    
    const totalMembers = new Set(data.assignments.flatMap(a => a.memberIds)).size;
    const totalModules = data.assignments.length;
    const totalHours = data.assignments.reduce((sum, a) => sum + a.estimatedHours, 0);
    
    const record = await prisma.teamAllocation.create({
      data: {
        projectId: data.projectId,
        allocationId,
        name: data.name,
        sprintNumber: data.sprintNumber,
        startDate: data.startDate,
        endDate: data.endDate,
        assignments: JSON.stringify(data.assignments),
        totalMembers,
        totalModules,
        totalHours,
        totalStoryPoints: Math.round(totalHours / 4) // Rough estimate
      }
    });
    
    return this.toTeamAllocation(record);
  }

  /**
   * Get team allocations for a project
   */
  static async getAllocations(projectId: string): Promise<TeamAllocation[]> {
    const records = await prisma.teamAllocation.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
    
    return records.map(this.toTeamAllocation);
  }

  private static toTeamMember(record: any): TeamMember {
    return {
      id: record.id,
      companyId: record.companyId,
      name: record.name,
      email: record.email || undefined,
      role: record.role,
      skills: JSON.parse(record.skills || '[]'),
      availability: record.availability,
      hourlyRate: record.hourlyRate || undefined,
      currentAssignments: JSON.parse(record.currentAssignments || '[]'),
      projectsCompleted: record.projectsCompleted,
      averageVelocity: record.averageVelocity,
      isActive: record.isActive
    };
  }

  private static toTeamAllocation(record: any): TeamAllocation {
    return {
      id: record.id,
      allocationId: record.allocationId,
      projectId: record.projectId,
      name: record.name,
      sprintNumber: record.sprintNumber || undefined,
      startDate: record.startDate || undefined,
      endDate: record.endDate || undefined,
      assignments: JSON.parse(record.assignments || '[]'),
      totalMembers: record.totalMembers,
      totalModules: record.totalModules,
      totalHours: record.totalHours,
      totalStoryPoints: record.totalStoryPoints,
      status: record.status,
      plannedVelocity: record.plannedVelocity,
      actualVelocity: record.actualVelocity || undefined
    };
  }
}

// ============================================================================
// GAP ANALYSIS SERVICE
// ============================================================================

export class GapAnalysisService {
  /**
   * Perform gap analysis for requirements
   */
  static async analyzeRequirements(projectId: string): Promise<GapAnalysis[]> {
    const requirements = await prisma.requirementRecord.findMany({
      where: { projectId }
    });
    
    const gaps: GapAnalysis[] = [];
    
    for (const req of requirements) {
      const linkedTables = JSON.parse(req.linkedTables || '[]');
      const linkedAPIs = JSON.parse(req.linkedAPIs || '[]');
      const linkedScreens = JSON.parse(req.linkedScreens || '[]');
      const linkedTestCases = JSON.parse(req.linkedTestCases || '[]');
      
      // Check for missing implementations
      if (linkedTables.length === 0) {
        gaps.push({
          id: `gap-${req.requirementId}-tables`,
          projectId,
          targetType: 'requirement',
          targetId: req.requirementId,
          targetName: req.title,
          gapType: 'missing_implementation',
          severity: 'high',
          description: 'No database tables linked to this requirement',
          expectedArtifacts: ['Database Table'],
          existingArtifacts: [],
          missingArtifacts: ['Database Table'],
          coveragePercent: 0,
          recommendations: [{
            action: 'Create database tables for this requirement',
            priority: 'high',
            estimatedEffort: 8
          }],
          resolutionStatus: 'open'
        });
      }
      
      // Check for missing tests
      if (linkedTestCases.length === 0) {
        gaps.push({
          id: `gap-${req.requirementId}-tests`,
          projectId,
          targetType: 'requirement',
          targetId: req.requirementId,
          targetName: req.title,
          gapType: 'missing_tests',
          severity: 'medium',
          description: 'No test cases linked to this requirement',
          expectedArtifacts: ['Test Cases'],
          existingArtifacts: [],
          missingArtifacts: ['Test Cases'],
          coveragePercent: linkedTables.length > 0 ? 50 : 0,
          recommendations: [{
            action: 'Create test cases for this requirement',
            priority: 'medium',
            estimatedEffort: 4
          }],
          resolutionStatus: 'open'
        });
      }
    }
    
    // Save gaps to database
    for (const gap of gaps) {
      await prisma.gapAnalysisRecord.upsert({
        where: {
          projectId_targetId_gapType: {
            projectId: gap.projectId,
            targetId: gap.targetId,
            gapType: gap.gapType
          }
        },
        create: {
          projectId: gap.projectId,
          targetType: gap.targetType,
          targetId: gap.targetId,
          targetName: gap.targetName,
          gapType: gap.gapType,
          severity: gap.severity,
          description: gap.description,
          expectedArtifacts: JSON.stringify(gap.expectedArtifacts),
          existingArtifacts: JSON.stringify(gap.existingArtifacts),
          missingArtifacts: JSON.stringify(gap.missingArtifacts),
          coveragePercent: gap.coveragePercent,
          recommendations: JSON.stringify(gap.recommendations)
        },
        update: {
          severity: gap.severity,
          description: gap.description,
          coveragePercent: gap.coveragePercent,
          recommendations: JSON.stringify(gap.recommendations)
        }
      });
    }
    
    return gaps;
  }

  /**
   * Get gap analysis summary
   */
  static async getGapSummary(projectId: string): Promise<{
    totalGaps: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    openGaps: number;
    resolvedGaps: number;
  }> {
    const gaps = await prisma.gapAnalysisRecord.findMany({
      where: { projectId }
    });
    
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let openGaps = 0;
    let resolvedGaps = 0;
    
    for (const gap of gaps) {
      bySeverity[gap.severity] = (bySeverity[gap.severity] || 0) + 1;
      byType[gap.gapType] = (byType[gap.gapType] || 0) + 1;
      if (gap.resolutionStatus === 'open' || gap.resolutionStatus === 'in_progress') {
        openGaps++;
      } else if (gap.resolutionStatus === 'resolved') {
        resolvedGaps++;
      }
    }
    
    return {
      totalGaps: gaps.length,
      bySeverity,
      byType,
      openGaps,
      resolvedGaps
    };
  }
}
