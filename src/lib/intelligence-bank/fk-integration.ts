// =============================================================================
// UNIFIED INTELLIGENCE DATA BANK - FK Integration Service
// =============================================================================
// Integrates FK Resolver with UnifiedField records
// =============================================================================

import { db } from '@/lib/db';
import { FKResolver, ResolutionQueue, MissingTableInfo } from '@/lib/fk-resolver';
import { 
  createDefaultFKLayer, 
  createDefaultUIComponentLayer,
  FKLayer,
  FKResolutionStatus 
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface FKIntegrationResult {
  totalFieldsProcessed: number;
  fksIdentified: number;
  fksResolved: number;
  fksMissing: number;
  uiComponentsUpdated: number;
  enrichmentLogsCreated: number;
}

export interface FKFieldUpdate {
  fieldId: string;
  tableName: string;
  fieldName: string;
  fkLayer: FKLayer;
  uiUpdates: Record<string, unknown>;
  confidence: number;
}

// =============================================================================
// FK INTEGRATION SERVICE
// =============================================================================

export class FKIntegrationService {
  private projectId: string;
  private fkResolver: FKResolver;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.fkResolver = new FKResolver(projectId);
  }

  /**
   * Run FK integration for all fields in the project
   */
  async runIntegration(): Promise<FKIntegrationResult> {
    const result: FKIntegrationResult = {
      totalFieldsProcessed: 0,
      fksIdentified: 0,
      fksResolved: 0,
      fksMissing: 0,
      uiComponentsUpdated: 0,
      enrichmentLogsCreated: 0,
    };

    // Get all tables with FK information
    const tables = await db.toolkitTable.findMany({
      where: { projectId: this.projectId },
      include: { 
        project: {
          select: { rawSql: true }
        }
      }
    });

    // Build FK resolver context
    const tableDefs = tables.map(t => ({
      tableName: t.tableName,
      schemaName: t.schemaName,
      columns: JSON.parse(t.columns || '[]'),
      foreignKeys: JSON.parse(t.foreignKeys || '[]'),
      indexes: JSON.parse(t.indexes || '[]'),
      constraints: JSON.parse(t.constraints || '[]'),
      status: t.status,
    }));

    // Run FK analysis
    const queue = await this.fkResolver.analyzeTables(tableDefs);

    // Process each field
    const fields = await db.unifiedField.findMany({
      where: { projectId: this.projectId },
    });

    for (const field of fields) {
      const update = await this.processField(field, queue, tables);
      
      if (update) {
        result.totalFieldsProcessed++;
        
        if (update.fkLayer.isForeignKey) {
          result.fksIdentified++;
          
          if (update.fkLayer.resolutionStatus === 'resolved') {
            result.fksResolved++;
          } else if (update.fkLayer.resolutionStatus === 'missing_table') {
            result.fksMissing++;
          }
        }

        if (Object.keys(update.uiUpdates).length > 0) {
          result.uiComponentsUpdated++;
        }

        // Apply updates to database
        await this.applyFieldUpdate(update);
        result.enrichmentLogsCreated++;
      }
    }

    // Create missing table records
    await this.createMissingTableRecords(queue.items);

    return result;
  }

  /**
   * Process a single field for FK integration
   */
  private async processField(
    field: any,
    queue: ResolutionQueue,
    tables: any[]
  ): Promise<FKFieldUpdate | null> {
    const { tableName, fieldName } = field;

    // Find the table
    const table = tables.find(t => t.tableName === tableName);
    if (!table) return null;

    const columns = JSON.parse(table.columns || '[]');
    const foreignKeys = JSON.parse(table.foreignKeys || '[]');
    const column = columns.find((c: any) => c.name === fieldName);

    if (!column) return null;

    // Initialize FK layer
    const fkLayer = createDefaultFKLayer();
    const uiUpdates: Record<string, unknown> = {};
    let confidence = 0.0;

    // Check if column is a FK from DDL
    const fkFromDDL = foreignKeys.find((fk: any) => fk.column === fieldName);
    
    if (fkFromDDL) {
      // FK found in SQL DDL
      fkLayer.isForeignKey = true;
      fkLayer.referencedTable = fkFromDDL.referencedTable;
      fkLayer.referencedColumn = fkFromDDL.referencedColumn || 'Id';
      fkLayer.referencedTableExists = !queue.items.some(
        m => m.tableName.toLowerCase() === fkFromDDL.referencedTable?.toLowerCase()
      );
      fkLayer.relationshipType = 'one_to_many';
      fkLayer.onDelete = fkFromDDL.onDelete || null;
      fkLayer.onUpdate = fkFromDDL.onUpdate || null;
      fkLayer.resolutionStatus = fkLayer.referencedTableExists ? 'resolved' : 'missing_table';
      fkLayer.sources = {
        sqlDDL: true,
        spReference: false,
        cshtmlDropdown: false,
        namingPattern: false,
      };
      confidence = 0.99;

      // Update UI component
      uiUpdates['uiComponentType'] = 'dropdown';
      uiUpdates['uiRenderAs'] = 'Select';
      uiUpdates['uiHtmlInputType'] = 'select';
      uiUpdates['uiDropdownConfig'] = JSON.stringify({
        sourceType: 'api',
        sourceEndpoint: `/api/${fkFromDDL.referencedTable?.toLowerCase()}/dropdown`,
        sourceSP: null,
        valueField: 'Id',
        displayField: 'Name',
        hasSearch: true,
        isMultiSelect: false,
        cascadeParent: null,
        cascadeChild: null,
        defaultText: `Select ${fkFromDDL.referencedTable}`,
      });
    } else if (fieldName.endsWith('Id') && fieldName !== 'Id') {
      // Naming convention suggests FK
      const possibleTable = fieldName.replace(/Id$/, '');
      const tableExists = tables.some(
        t => t.tableName.toLowerCase() === possibleTable.toLowerCase()
      );
      const isMissing = queue.items.some(
        m => m.tableName.toLowerCase() === possibleTable.toLowerCase()
      );

      // Check if rendered as dropdown in CSHTML
      const cshtmlEvidence = field.cshtmlFoundInViews 
        ? JSON.parse(field.cshtmlFoundInViews) 
        : [];
      const isDropdown = cshtmlEvidence.some(
        (e: any) => e.htmlElementType === 'select'
      );

      if (tableExists || isDropdown) {
        fkLayer.isForeignKey = true;
        fkLayer.referencedTable = possibleTable;
        fkLayer.referencedColumn = 'Id';
        fkLayer.referencedTableExists = tableExists;
        fkLayer.relationshipType = 'one_to_many';
        fkLayer.resolutionStatus = tableExists ? 'resolved' : 'unresolved';
        fkLayer.sources = {
          sqlDDL: false,
          spReference: false,
          cshtmlDropdown: isDropdown,
          namingPattern: true,
        };
        confidence = tableExists ? 0.85 : 0.60;

        // Update UI component if dropdown detected
        if (isDropdown || tableExists) {
          uiUpdates['uiComponentType'] = 'dropdown';
          uiUpdates['uiRenderAs'] = 'Select';
          uiUpdates['uiHtmlInputType'] = 'select';
          if (!field.uiDropdownConfig) {
            uiUpdates['uiDropdownConfig'] = JSON.stringify({
              sourceType: 'api',
              sourceEndpoint: `/api/${possibleTable.toLowerCase()}/dropdown`,
              sourceSP: null,
              valueField: 'Id',
              displayField: 'Name',
              hasSearch: true,
              isMultiSelect: false,
              cascadeParent: null,
              cascadeChild: null,
              defaultText: `Select ${possibleTable}`,
            });
          }
        }
      }
    }

    // Check SP references for additional FK evidence
    const spEvidence = field.spUsedInSPs ? JSON.parse(field.spUsedInSPs) : [];
    for (const sp of spEvidence) {
      if (sp.usageType === 'join_column' && sp.joinTable) {
        if (fkLayer.isForeignKey) {
          // Confirm FK
          fkLayer.sources.spReference = true;
          confidence = Math.min(confidence + 0.05, 1.0);
        } else {
          // New FK discovered from SP
          fkLayer.isForeignKey = true;
          fkLayer.referencedTable = sp.joinTable;
          fkLayer.referencedColumn = 'Id';
          fkLayer.referencedTableExists = tables.some(
            t => t.tableName.toLowerCase() === sp.joinTable?.toLowerCase()
          );
          fkLayer.resolutionStatus = fkLayer.referencedTableExists ? 'resolved' : 'unresolved';
          fkLayer.sources.spReference = true;
          confidence = 0.75;
        }
      }
    }

    // Build cascade chain if this is an FK
    if (fkLayer.isForeignKey && fkLayer.referencedTable) {
      fkLayer.cascadeChain = await this.buildCascadeChain(
        fkLayer.referencedTable,
        tables
      );
    }

    // Only return if we found FK evidence
    if (!fkLayer.isForeignKey && confidence === 0) {
      return null;
    }

    fkLayer.confidence = confidence;

    return {
      fieldId: field.id,
      tableName,
      fieldName,
      fkLayer,
      uiUpdates,
      confidence,
    };
  }

  /**
   * Build cascade chain for cascading dropdowns
   */
  private async buildCascadeChain(
    tableName: string,
    tables: any[]
  ): Promise<string[]> {
    const chain: string[] = [];
    let currentTable = tableName;
    const visited = new Set<string>();

    while (currentTable && !visited.has(currentTable.toLowerCase())) {
      visited.add(currentTable.toLowerCase());
      
      const table = tables.find(
        t => t.tableName.toLowerCase() === currentTable.toLowerCase()
      );
      
      if (!table) break;

      const fks = JSON.parse(table.foreignKeys || '[]');
      const parentFK = fks.find((fk: any) => 
        fk.column.toLowerCase().endsWith('id') && 
        fk.column.toLowerCase() !== 'id'
      );

      if (parentFK && parentFK.referencedTable) {
        chain.push(parentFK.referencedTable);
        currentTable = parentFK.referencedTable;
      } else {
        break;
      }
    }

    return chain;
  }

  /**
   * Apply field update to database
   */
  private async applyFieldUpdate(update: FKFieldUpdate): Promise<void> {
    // Update UnifiedField
    await db.unifiedField.update({
      where: { id: update.fieldId },
      data: {
        // FK Layer fields
        fkIsForeignKey: update.fkLayer.isForeignKey,
        fkReferencedTable: update.fkLayer.referencedTable,
        fkReferencedColumn: update.fkLayer.referencedColumn,
        fkTableExists: update.fkLayer.referencedTableExists,
        fkRelationshipType: update.fkLayer.relationshipType,
        fkOnDelete: update.fkLayer.onDelete,
        fkOnUpdate: update.fkLayer.onUpdate,
        fkResolutionStatus: update.fkLayer.resolutionStatus,
        fkCascadeChain: JSON.stringify(update.fkLayer.cascadeChain),
        fkSources: JSON.stringify(update.fkLayer.sources),
        fkConfidence: update.fkLayer.confidence,

        // UI updates
        ...(Object.keys(update.uiUpdates).length > 0 ? update.uiUpdates : {}),

        // Meta
        metaEnrichmentComplete: db.raw`COALESCE(metaEnrichmentComplete, 0) + 0.1`,
        metaOverallConfidence: db.raw`COALESCE(metaOverallConfidence, 0) * 0.9 + ${update.confidence} * 0.1`,
        updatedAt: new Date(),
      },
    });

    // Create enrichment log
    await db.unifiedEnrichmentLog.create({
      data: {
        fieldId: update.fieldId,
        projectId: this.projectId,
        agentName: 'FKIntegrationService',
        layerEnriched: 'fk',
        previousValue: JSON.stringify({ isForeignKey: false }),
        newValue: JSON.stringify(update.fkLayer),
        confidenceAfter: update.confidence,
        enrichmentMethod: 'sql_parse',
      },
    });
  }

  /**
   * Create missing table records in database
   */
  private async createMissingTableRecords(
    missingTables: MissingTableInfo[]
  ): Promise<void> {
    for (const missing of missingTables) {
      const existing = await db.missingTableResolution.findUnique({
        where: {
          projectId_tableName: {
            projectId: this.projectId,
            tableName: missing.tableName,
          },
        },
      });

      if (!existing) {
        await db.missingTableResolution.create({
          data: {
            projectId: this.projectId,
            tableName: missing.tableName,
            status: missing.status,
            priority: missing.priority,
            blocksCount: missing.blocksCount,
            referencedBy: JSON.stringify(missing.referencedBy),
            resolutionStatus: missing.resolutionStatus,
            suggestedColumns: JSON.stringify(missing.suggestedColumns || []),
            aiSuggestion: JSON.stringify(missing.aiSuggestion || {}),
          },
        });
      } else {
        // Update existing record
        await db.missingTableResolution.update({
          where: { id: existing.id },
          data: {
            blocksCount: missing.blocksCount,
            referencedBy: JSON.stringify(missing.referencedBy),
            updatedAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * Get FK resolution summary for a project
   */
  async getResolutionSummary(): Promise<{
    totalFields: number;
    fkFields: number;
    resolved: number;
    unresolved: number;
    missingTable: number;
    averageConfidence: number;
    topMissingTables: Array<{ tableName: string; blocksCount: number }>;
  }> {
    const fields = await db.unifiedField.findMany({
      where: { projectId: this.projectId },
      select: {
        fkIsForeignKey: true,
        fkResolutionStatus: true,
        fkConfidence: true,
      },
    });

    const missingTables = await db.missingTableResolution.findMany({
      where: { projectId: this.projectId },
      orderBy: { blocksCount: 'desc' },
      take: 10,
    });

    return {
      totalFields: fields.length,
      fkFields: fields.filter(f => f.fkIsForeignKey).length,
      resolved: fields.filter(f => f.fkResolutionStatus === 'resolved').length,
      unresolved: fields.filter(f => f.fkResolutionStatus === 'unresolved').length,
      missingTable: fields.filter(f => f.fkResolutionStatus === 'missing_table').length,
      averageConfidence: fields.reduce((sum, f) => sum + (f.fkConfidence || 0), 0) / fields.length || 0,
      topMissingTables: missingTables.map(m => ({
        tableName: m.tableName,
        blocksCount: m.blocksCount,
      })),
    };
  }

  /**
   * Resolve a specific FK by uploading SQL
   */
  async resolveFKViaUpload(
    tableName: string,
    sqlContent: string
  ): Promise<{ success: boolean; unlockedFields: string[] }> {
    const result = await this.fkResolver.resolveViaUpload(tableName, sqlContent);

    if (!result.success) {
      return { success: false, unlockedFields: [] };
    }

    // Update all fields that reference this table
    const unlockedFields: string[] = [];
    const referencingFields = await db.unifiedField.findMany({
      where: {
        projectId: this.projectId,
        fkReferencedTable: tableName,
        fkResolutionStatus: 'missing_table',
      },
    });

    for (const field of referencingFields) {
      await db.unifiedField.update({
        where: { id: field.id },
        data: {
          fkResolutionStatus: 'resolved',
          fkTableExists: true,
          fkConfidence: 0.99,
          updatedAt: new Date(),
        },
      });
      unlockedFields.push(field.qualifiedName);
    }

    return { success: true, unlockedFields };
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function createFKIntegrationService(projectId: string): FKIntegrationService {
  return new FKIntegrationService(projectId);
}

export async function runFKIntegration(projectId: string): Promise<FKIntegrationResult> {
  const service = new FKIntegrationService(projectId);
  return service.runIntegration();
}
