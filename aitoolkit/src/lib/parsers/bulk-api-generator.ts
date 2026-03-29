// =============================================================================
// Bulk API Operations Generator - Generate bulk operations for APIs
// =============================================================================
// Generates bulk CRUD operations:
// - Bulk Create (batch insert)
// - Bulk Update (batch update with conditions)
// - Bulk Delete (batch delete with conditions)
// - Bulk Upsert (insert or update)
// - Bulk Import (from CSV/JSON)
// =============================================================================

import { TableDef, ColumnDef, ForeignKeyDef } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface BulkOperationConfig {
  tableName: string;
  schemaName: string;
  primaryKey: string;
  columns: ColumnConfig[];
  foreignKeys: FKConfig[];
  softDelete: boolean;
  hasAuditFields: boolean;
  timestampColumns: string[];
}

export interface ColumnConfig {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  defaultValue?: string;
  isFK: boolean;
  fkTarget?: string;
}

export interface FKConfig {
  columnName: string;
  referencesTable: string;
  referencesColumn: string;
}

export interface BulkOperationResult {
  tableName: string;
  operations: BulkOperation[];
  validationSchema: string;
  typescriptTypes: string;
  apiRoutes: APIRouteDefinition[];
  testCases: BulkTestCase[];
  documentation: string;
}

export interface BulkOperation {
  name: string;
  type: 'bulk_create' | 'bulk_update' | 'bulk_delete' | 'bulk_upsert' | 'bulk_import';
  description: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  parameters: BulkParameter[];
  requestBody: RequestBodyDefinition;
  responseBody: ResponseBodyDefinition;
  implementation: string;
  prismaImplementation: string;
  validation: string[];
  permissions: string[];
  rateLimit?: RateLimitConfig;
  batchLimit: number;
  supportsTransaction: boolean;
}

export interface BulkParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  location: 'path' | 'query' | 'body';
}

export interface RequestBodyDefinition {
  contentType: string;
  schema: Record<string, unknown>;
  example: string;
}

export interface ResponseBodyDefinition {
  success: Record<string, unknown>;
  error: Record<string, unknown>;
  example: string;
}

export interface APIRouteDefinition {
  path: string;
  method: string;
  handler: string;
  middleware: string[];
}

export interface BulkTestCase {
  name: string;
  description: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  setup?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// =============================================================================
// Bulk API Operations Generator Class
// =============================================================================

export class BulkAPIGenerator {
  private config: BulkOperationConfig;

  constructor(table: TableDef) {
    this.config = this.buildConfig(table);
  }

  /**
   * Build configuration from table definition
   */
  private buildConfig(table: TableDef): BulkOperationConfig {
    const primaryKey = table.columns.find(c => c.isPrimaryKey)?.name || 'Id';
    
    const columns: ColumnConfig[] = table.columns.map(col => {
      const fk = table.foreignKeys.find(fk => fk.columnName === col.name);
      return {
        name: col.name,
        dataType: col.dataType,
        isNullable: col.isNullable,
        isPrimaryKey: col.isPrimaryKey,
        isIdentity: col.isIdentity,
        defaultValue: col.defaultValue,
        isFK: !!fk,
        fkTarget: fk ? `${fk.referencesTable}.${fk.referencesColumn}` : undefined
      };
    });

    const foreignKeys: FKConfig[] = table.foreignKeys.map(fk => ({
      columnName: fk.columnName,
      referencesTable: fk.referencesTable,
      referencesColumn: fk.referencesColumn
    }));

    const softDelete = table.columns.some(c => 
      c.name.toLowerCase() === 'isactive' || c.name.toLowerCase() === 'isdeleted'
    );

    const timestampColumns = table.columns
      .filter(c => 
        c.name.toLowerCase().includes('created') || 
        c.name.toLowerCase().includes('modified') ||
        c.name.toLowerCase().includes('updated')
      )
      .map(c => c.name);

    return {
      tableName: table.tableName,
      schemaName: table.schemaName,
      primaryKey,
      columns,
      foreignKeys,
      softDelete,
      hasAuditFields: timestampColumns.length > 0,
      timestampColumns
    };
  }

  /**
   * Generate all bulk operations
   */
  generateOperations(): BulkOperationResult {
    const operations: BulkOperation[] = [
      this.generateBulkCreate(),
      this.generateBulkUpdate(),
      this.generateBulkDelete(),
      this.generateBulkUpsert(),
      this.generateBulkImport()
    ];

    return {
      tableName: this.config.tableName,
      operations,
      validationSchema: this.generateValidationSchema(),
      typescriptTypes: this.generateTypeScriptTypes(),
      apiRoutes: this.generateAPIRoutes(operations),
      testCases: this.generateTestCases(),
      documentation: this.generateDocumentation(operations)
    };
  }

  /**
   * Generate bulk create operation
   */
  private generateBulkCreate(): BulkOperation {
    const { tableName, columns, primaryKey } = this.config;
    const nonIdentityColumns = columns.filter(c => !c.isIdentity);
    const requiredColumns = nonIdentityColumns.filter(c => !c.isNullable && !c.defaultValue);

    const implementation = this.generateBulkCreateImplementation();
    const prismaImpl = this.generateBulkCreatePrisma();

    return {
      name: `bulkCreate${tableName}`,
      type: 'bulk_create',
      description: `Create multiple ${tableName} records in a single transaction`,
      endpoint: `/api/${tableName.toLowerCase()}/bulk`,
      method: 'POST',
      parameters: [
        {
          name: 'records',
          type: `${tableName}CreateInput[]`,
          required: true,
          description: `Array of ${tableName} records to create`,
          location: 'body'
        },
        {
          name: 'skipDuplicates',
          type: 'boolean',
          required: false,
          description: 'Skip records that would cause duplicate key errors',
          location: 'query'
        },
        {
          name: 'validateOnly',
          type: 'boolean',
          required: false,
          description: 'Only validate without creating records',
          location: 'query'
        }
      ],
      requestBody: {
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            records: {
              type: 'array',
              items: {
                type: 'object',
                properties: this.generateSchemaProperties(nonIdentityColumns),
                required: requiredColumns.map(c => c.name)
              },
              maxItems: 1000
            },
            options: {
              type: 'object',
              properties: {
                skipDuplicates: { type: 'boolean', default: false },
                validateOnly: { type: 'boolean', default: false }
              }
            }
          },
          required: ['records']
        },
        example: JSON.stringify({
          records: [
            { Name: 'Record 1', Status: 'Active' },
            { Name: 'Record 2', Status: 'Pending' }
          ],
          options: { skipDuplicates: true }
        }, null, 2)
      },
      responseBody: {
        success: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            created: { type: 'number' },
            failed: { type: 'number' },
            records: { type: 'array' },
            errors: { type: 'array' }
          }
        },
        error: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            details: { type: 'array' }
          }
        },
        example: JSON.stringify({
          success: true,
          created: 2,
          failed: 0,
          records: [
            { Id: 1, Name: 'Record 1', Status: 'Active' },
            { Id: 2, Name: 'Record 2', Status: 'Pending' }
          ],
          errors: []
        }, null, 2)
      },
      implementation,
      prismaImplementation: prismaImpl,
      validation: this.generateCreateValidations(),
      permissions: [`${tableName}.create`],
      rateLimit: { windowMs: 60000, maxRequests: 100 },
      batchLimit: 1000,
      supportsTransaction: true
    };
  }

  /**
   * Generate bulk update operation
   */
  private generateBulkUpdate(): BulkOperation {
    const { tableName, columns, primaryKey, softDelete } = this.config;
    const updateableColumns = columns.filter(c => !c.isIdentity && !c.isPrimaryKey);

    return {
      name: `bulkUpdate${tableName}`,
      type: 'bulk_update',
      description: `Update multiple ${tableName} records matching criteria`,
      endpoint: `/api/${tableName.toLowerCase()}/bulk`,
      method: 'PATCH',
      parameters: [
        {
          name: 'updates',
          type: 'BulkUpdateInput',
          required: true,
          description: 'Update criteria and values',
          location: 'body'
        }
      ],
      requestBody: {
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              description: 'Filter criteria for records to update'
            },
            set: {
              type: 'object',
              properties: this.generateSchemaProperties(updateableColumns)
            },
            ids: {
              type: 'array',
              items: { type: 'number' },
              description: `Array of ${primaryKey} values to update`
            }
          }
        },
        example: JSON.stringify({
          filter: { Status: 'Pending' },
          set: { Status: 'Processed' }
        }, null, 2)
      },
      responseBody: {
        success: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            updated: { type: 'number' },
            failed: { type: 'number' },
            errors: { type: 'array' }
          }
        },
        error: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        },
        example: JSON.stringify({
          success: true,
          updated: 15,
          failed: 0,
          errors: []
        }, null, 2)
      },
      implementation: this.generateBulkUpdateImplementation(),
      prismaImplementation: this.generateBulkUpdatePrisma(),
      validation: [
        'At least one of filter or ids is required',
        'set object cannot be empty',
        'Cannot update primary key columns'
      ],
      permissions: [`${tableName}.update`],
      rateLimit: { windowMs: 60000, maxRequests: 50 },
      batchLimit: 5000,
      supportsTransaction: true
    };
  }

  /**
   * Generate bulk delete operation
   */
  private generateBulkDelete(): BulkOperation {
    const { tableName, primaryKey, softDelete } = this.config;

    return {
      name: `bulkDelete${tableName}`,
      type: 'bulk_delete',
      description: softDelete 
        ? `Soft delete multiple ${tableName} records` 
        : `Delete multiple ${tableName} records`,
      endpoint: `/api/${tableName.toLowerCase()}/bulk`,
      method: 'DELETE',
      parameters: [
        {
          name: 'filter',
          type: 'object',
          required: false,
          description: 'Filter criteria for records to delete',
          location: 'query'
        },
        {
          name: 'ids',
          type: 'array',
          required: false,
          description: `Array of ${primaryKey} values to delete`,
          location: 'body'
        },
        {
          name: 'permanent',
          type: 'boolean',
          required: false,
          description: 'Permanently delete (only for soft-delete tables)',
          location: 'query'
        }
      ],
      requestBody: {
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            filter: { type: 'object' },
            ids: {
              type: 'array',
              items: { type: ['number', 'string'] }
            },
            permanent: {
              type: 'boolean',
              default: false,
              description: 'Permanently delete records'
            }
          }
        },
        example: JSON.stringify({
          ids: [1, 2, 3, 4, 5],
          permanent: false
        }, null, 2)
      },
      responseBody: {
        success: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            deleted: { type: 'number' },
            failed: { type: 'number' },
            errors: { type: 'array' }
          }
        },
        error: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        },
        example: JSON.stringify({
          success: true,
          deleted: 5,
          failed: 0,
          errors: []
        }, null, 2)
      },
      implementation: this.generateBulkDeleteImplementation(),
      prismaImplementation: this.generateBulkDeletePrisma(),
      validation: [
        'At least one of filter or ids is required',
        'permanent=true requires admin role',
        'Cannot delete records referenced by other tables'
      ],
      permissions: [`${tableName}.delete`],
      rateLimit: { windowMs: 60000, maxRequests: 20 },
      batchLimit: 1000,
      supportsTransaction: true
    };
  }

  /**
   * Generate bulk upsert operation
   */
  private generateBulkUpsert(): BulkOperation {
    const { tableName, columns, primaryKey } = this.config;
    const nonIdentityColumns = columns.filter(c => !c.isIdentity);
    const upsertColumns = columns.filter(c => !c.isIdentity && !c.isPrimaryKey);

    return {
      name: `bulkUpsert${tableName}`,
      type: 'bulk_upsert',
      description: `Insert or update multiple ${tableName} records`,
      endpoint: `/api/${tableName.toLowerCase()}/bulk/upsert`,
      method: 'POST',
      parameters: [
        {
          name: 'records',
          type: `${tableName}UpsertInput[]`,
          required: true,
          description: 'Array of records to upsert',
          location: 'body'
        },
        {
          name: 'matchOn',
          type: 'string[]',
          required: false,
          description: 'Columns to match for existing records',
          location: 'query'
        }
      ],
      requestBody: {
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            records: {
              type: 'array',
              items: {
                type: 'object',
                properties: this.generateSchemaProperties(columns)
              }
            },
            matchOn: {
              type: 'array',
              items: { type: 'string' },
              default: [primaryKey],
              description: 'Columns to match for existing records'
            }
          }
        },
        example: JSON.stringify({
          records: [
            { Id: 1, Name: 'Updated Name', Status: 'Active' },
            { Name: 'New Record', Status: 'Pending' }
          ],
          matchOn: ['Id']
        }, null, 2)
      },
      responseBody: {
        success: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            inserted: { type: 'number' },
            updated: { type: 'number' },
            failed: { type: 'number' },
            records: { type: 'array' },
            errors: { type: 'array' }
          }
        },
        error: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        },
        example: JSON.stringify({
          success: true,
          inserted: 1,
          updated: 1,
          failed: 0,
          records: [
            { Id: 1, Name: 'Updated Name', Status: 'Active' },
            { Id: 2, Name: 'New Record', Status: 'Pending' }
          ],
          errors: []
        }, null, 2)
      },
      implementation: this.generateBulkUpsertImplementation(),
      prismaImplementation: this.generateBulkUpsertPrisma(),
      validation: [
        'Records array is required',
        'matchOn columns must be unique',
        'Each record must have matchOn columns'
      ],
      permissions: [`${tableName}.create`, `${tableName}.update`],
      rateLimit: { windowMs: 60000, maxRequests: 50 },
      batchLimit: 1000,
      supportsTransaction: true
    };
  }

  /**
   * Generate bulk import operation
   */
  private generateBulkImport(): BulkOperation {
    const { tableName, columns } = this.config;
    const importColumns = columns.filter(c => !c.isIdentity);

    return {
      name: `bulkImport${tableName}`,
      type: 'bulk_import',
      description: `Import ${tableName} records from CSV or JSON file`,
      endpoint: `/api/${tableName.toLowerCase()}/bulk/import`,
      method: 'POST',
      parameters: [
        {
          name: 'file',
          type: 'File',
          required: true,
          description: 'CSV or JSON file to import',
          location: 'body'
        },
        {
          name: 'format',
          type: 'string',
          required: false,
          description: 'File format (csv, json)',
          location: 'query'
        },
        {
          name: 'mapping',
          type: 'object',
          required: false,
          description: 'Column mapping from file to table',
          location: 'body'
        },
        {
          name: 'mode',
          type: 'string',
          required: false,
          description: 'Import mode (insert, upsert, update)',
          location: 'query'
        }
      ],
      requestBody: {
        contentType: 'multipart/form-data',
        schema: {
          type: 'object',
          properties: {
            file: { type: 'string', format: 'binary' },
            format: { type: 'string', enum: ['csv', 'json'] },
            mapping: { type: 'object' },
            mode: { type: 'string', enum: ['insert', 'upsert', 'update'], default: 'insert' },
            options: {
              type: 'object',
              properties: {
                skipHeader: { type: 'boolean', default: true },
                delimiter: { type: 'string', default: ',' },
                skipErrors: { type: 'boolean', default: false },
                batchSize: { type: 'number', default: 100 }
              }
            }
          }
        },
        example: `// CSV Example
Name,Status,Email
John Doe,Active,john@example.com
Jane Smith,Pending,jane@example.com`
      },
      responseBody: {
        success: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            imported: { type: 'number' },
            skipped: { type: 'number' },
            failed: { type: 'number' },
            errors: { type: 'array' },
            warnings: { type: 'array' }
          }
        },
        error: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            line: { type: 'number' }
          }
        },
        example: JSON.stringify({
          success: true,
          imported: 98,
          skipped: 2,
          failed: 0,
          errors: [],
          warnings: [
            { line: 5, message: 'Email format invalid, using default' }
          ]
        }, null, 2)
      },
      implementation: this.generateBulkImportImplementation(),
      prismaImplementation: this.generateBulkImportPrisma(),
      validation: [
        'File size must not exceed 10MB',
        'CSV must have header row',
        'Required columns must be present',
        'Date formats must be ISO 8601'
      ],
      permissions: [`${tableName}.import`],
      rateLimit: { windowMs: 3600000, maxRequests: 10 },
      batchLimit: 10000,
      supportsTransaction: true
    };
  }

  // ===========================================================================
  // Implementation Generators
  // ===========================================================================

  private generateBulkCreateImplementation(): string {
    const { tableName, columns, primaryKey } = this.config;
    const colNames = columns.filter(c => !c.isIdentity).map(c => c.name);

    return `
/**
 * Bulk create ${tableName} records
 * POST /api/${tableName.toLowerCase()}/bulk
 */
export async function bulkCreate${tableName}(
  records: ${tableName}CreateInput[],
  options: { skipDuplicates?: boolean; validateOnly?: boolean } = {}
): Promise<BulkResult<${tableName}>> {
  const results: BulkResult<${tableName}> = {
    success: false,
    created: 0,
    failed: 0,
    records: [],
    errors: []
  };

  // Validate batch size
  if (records.length > 1000) {
    throw new Error('Maximum batch size is 1000 records');
  }

  // Validate each record
  const validationErrors = await validateBatch(records, ${tableName}CreateSchema);
  if (validationErrors.length > 0 && !options.skipDuplicates) {
    results.errors = validationErrors;
    return results;
  }

  if (options.validateOnly) {
    results.success = validationErrors.length === 0;
    return results;
  }

  // Use transaction for atomicity
  const created = await prisma.$transaction(async (tx) => {
    const created: ${tableName}[] = [];
    
    for (const record of records) {
      try {
        const result = await tx.${tableName.toLowerCase()}.create({
          data: {
            ...record,
            ${this.config.hasAuditFields ? `CreatedOn: new Date(), CreatedBy: getCurrentUserId()` : ''}
          }
        });
        created.push(result);
      } catch (error) {
        if (options.skipDuplicates && isDuplicateKeyError(error)) {
          results.failed++;
          continue;
        }
        throw error;
      }
    }
    
    return created;
  });

  results.success = true;
  results.created = created.length;
  results.records = created;

  return results;
}`;
  }

  private generateBulkCreatePrisma(): string {
    const { tableName } = this.config;

    return `// Prisma optimized bulk create
await prisma.${tableName.toLowerCase()}.createMany({
  data: records,
  skipDuplicates: options.skipDuplicates
});`;
  }

  private generateBulkUpdateImplementation(): string {
    const { tableName, primaryKey } = this.config;

    return `
/**
 * Bulk update ${tableName} records
 * PATCH /api/${tableName.toLowerCase()}/bulk
 */
export async function bulkUpdate${tableName}(
  input: BulkUpdateInput<${tableName}>
): Promise<BulkResult<${tableName}>> {
  const results: BulkResult<${tableName}> = {
    success: false,
    updated: 0,
    failed: 0,
    errors: []
  };

  // Build where clause
  const where: any = {};
  
  if (input.ids && input.ids.length > 0) {
    where.${primaryKey} = { in: input.ids };
  } else if (input.filter) {
    Object.assign(where, input.filter);
  } else {
    throw new Error('Either ids or filter is required');
  }

  // Validate update data
  if (!input.set || Object.keys(input.set).length === 0) {
    throw new Error('set object cannot be empty');
  }

  // Prevent updating primary key
  if (input.set.${primaryKey}) {
    throw new Error('Cannot update primary key');
  }

  // Add audit fields
  const updateData = {
    ...input.set,
    ${this.config.hasAuditFields ? `ModifiedOn: new Date(), ModifiedBy: getCurrentUserId()` : ''}
  };

  // Execute update
  const result = await prisma.${tableName.toLowerCase()}.updateMany({
    where,
    data: updateData
  });

  results.success = true;
  results.updated = result.count;

  return results;
}`;
  }

  private generateBulkUpdatePrisma(): string {
    const { tableName } = this.config;
    return `await prisma.${tableName.toLowerCase()}.updateMany({
  where: { ...filter },
  data: { ...set, ModifiedOn: new Date() }
});`;
  }

  private generateBulkDeleteImplementation(): string {
    const { tableName, primaryKey, softDelete } = this.config;

    return `
/**
 * Bulk delete ${tableName} records
 * DELETE /api/${tableName.toLowerCase()}/bulk
 */
export async function bulkDelete${tableName}(
  input: BulkDeleteInput
): Promise<BulkResult<${tableName}>> {
  const results: BulkResult<${tableName}> = {
    success: false,
    deleted: 0,
    failed: 0,
    errors: []
  };

  // Build where clause
  const where: any = {};
  
  if (input.ids && input.ids.length > 0) {
    where.${primaryKey} = { in: input.ids };
  } else if (input.filter) {
    Object.assign(where, input.filter);
  } else {
    throw new Error('Either ids or filter is required');
  }

  // Check for references
  const referenced = await checkReferences('${tableName}', where);
  if (referenced.length > 0 && input.permanent) {
    results.errors.push({
      message: 'Some records are referenced by other tables',
      details: referenced
    });
    return results;
  }

  if (${softDelete} && !input.permanent) {
    // Soft delete
    const result = await prisma.${tableName.toLowerCase()}.updateMany({
      where,
      data: { IsActive: false, ModifiedOn: new Date() }
    });
    results.deleted = result.count;
  } else {
    // Hard delete
    const result = await prisma.${tableName.toLowerCase()}.deleteMany({
      where
    });
    results.deleted = result.count;
  }

  results.success = true;
  return results;
}`;
  }

  private generateBulkDeletePrisma(): string {
    const { tableName, softDelete } = this.config;
    return softDelete 
      ? `await prisma.${tableName.toLowerCase()}.updateMany({
  where: { ...filter },
  data: { IsActive: false }
});`
      : `await prisma.${tableName.toLowerCase()}.deleteMany({
  where: { ...filter }
});`;
  }

  private generateBulkUpsertImplementation(): string {
    const { tableName, columns, primaryKey } = this.config;

    return `
/**
 * Bulk upsert ${tableName} records
 * POST /api/${tableName.toLowerCase()}/bulk/upsert
 */
export async function bulkUpsert${tableName}(
  records: ${tableName}UpsertInput[],
  matchOn: string[] = ['${primaryKey}']
): Promise<BulkUpsertResult<${tableName}>> {
  const results: BulkUpsertResult<${tableName}> = {
    success: false,
    inserted: 0,
    updated: 0,
    failed: 0,
    records: [],
    errors: []
  };

  if (records.length > 1000) {
    throw new Error('Maximum batch size is 1000 records');
  }

  const processed = await prisma.$transaction(async (tx) => {
    const results: { inserted: ${tableName}[], updated: ${tableName}[] } = {
      inserted: [],
      updated: []
    };

    for (const record of records) {
      try {
        // Build match condition
        const where: any = {};
        for (const field of matchOn) {
          where[field] = record[field];
        }

        // Check if exists
        const existing = await tx.${tableName.toLowerCase()}.findFirst({ where });

        if (existing) {
          // Update
          const updated = await tx.${tableName.toLowerCase()}.update({
            where: { ${primaryKey}: existing.${primaryKey} },
            data: {
              ...record,
              ${this.config.hasAuditFields ? `ModifiedOn: new Date(), ModifiedBy: getCurrentUserId()` : ''}
            }
          });
          results.updated.push(updated);
        } else {
          // Insert
          const created = await tx.${tableName.toLowerCase()}.create({
            data: {
              ...record,
              ${this.config.hasAuditFields ? `CreatedOn: new Date(), CreatedBy: getCurrentUserId()` : ''}
            }
          });
          results.inserted.push(created);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          record,
          error: error.message
        });
      }
    }

    return results;
  });

  results.success = true;
  results.inserted = processed.inserted.length;
  results.updated = processed.updated.length;
  results.records = [...processed.inserted, ...processed.updated];

  return results;
}`;
  }

  private generateBulkUpsertPrisma(): string {
    const { tableName, columns, primaryKey } = this.config;
    const uniqueColumns = columns.filter(c => c.isPrimaryKey || c.name.toLowerCase().includes('email') || c.name.toLowerCase().includes('code'));

    return `// Prisma upsert (for single unique constraint)
await prisma.${tableName.toLowerCase()}.upsert({
  where: { ${primaryKey}: record.${primaryKey} },
  update: { ...record },
  create: { ...record }
});`;
  }

  private generateBulkImportImplementation(): string {
    const { tableName, columns } = this.config;

    return `
/**
 * Bulk import ${tableName} records from file
 * POST /api/${tableName.toLowerCase()}/bulk/import
 */
export async function bulkImport${tableName}(
  file: File,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const results: ImportResult = {
    success: false,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    warnings: []
  };

  // Parse file
  const records = await parseImportFile(file, {
    format: options.format,
    delimiter: options.delimiter || ',',
    skipHeader: options.skipHeader ?? true,
    mapping: options.mapping,
    batchSize: options.batchSize || 100
  });

  // Validate columns
  const columnMapping = validateImportColumns(records.headers, [
    ${columns.map(c => `'${c.name}'`).join(', ')}
  ]);

  // Process in batches
  for (let i = 0; i < records.data.length; i += options.batchSize || 100) {
    const batch = records.data.slice(i, i + options.batchSize || 100);
    
    try {
      const result = await bulkCreate${tableName}(batch, {
        skipDuplicates: options.skipErrors
      });
      
      results.imported += result.created;
      results.failed += result.failed;
      results.errors.push(...result.errors);
    } catch (error) {
      if (options.skipErrors) {
        results.skipped += batch.length;
      } else {
        throw error;
      }
    }
  }

  results.success = results.failed === 0;
  return results;
}`;
  }

  private generateBulkImportPrisma(): string {
    return `// Use createMany with batches
for (const batch of chunk(records, 100)) {
  await prisma.${this.config.tableName.toLowerCase()}.createMany({
    data: batch,
    skipDuplicates: true
  });
}`;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private generateSchemaProperties(columns: ColumnConfig[]): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    for (const col of columns) {
      props[col.name] = {
        type: this.mapDataTypeToJson(col.dataType),
        nullable: col.isNullable,
        description: `${col.name} field`
      };
    }
    return props;
  }

  private mapDataTypeToJson(sqlType: string): string {
    const type = sqlType.toUpperCase();
    if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].some(t => type.includes(t))) return 'integer';
    if (['DECIMAL', 'NUMERIC', 'FLOAT', 'REAL', 'MONEY'].some(t => type.includes(t))) return 'number';
    if (['BIT', 'BOOLEAN'].some(t => type.includes(t))) return 'boolean';
    if (['DATE', 'DATETIME', 'DATETIME2', 'TIMESTAMP'].some(t => type.includes(t))) return 'string';
    return 'string';
  }

  private generateCreateValidations(): string[] {
    const validations: string[] = [];
    const requiredColumns = this.config.columns.filter(c => !c.isNullable && !c.defaultValue && !c.isIdentity);

    for (const col of requiredColumns) {
      validations.push(`${col.name} is required`);
    }

    for (const col of this.config.columns) {
      if (col.isFK) {
        validations.push(`${col.name} must reference existing ${col.fkTarget}`);
      }
    }

    return validations;
  }

  private generateValidationSchema(): string {
    const { tableName, columns } = this.config;
    const rules: string[] = [];

    for (const col of columns) {
      if (!col.isNullable && !col.defaultValue && !col.isIdentity) {
        rules.push(`  ${col.name}: z.${this.mapDataTypeToZod(col.dataType)}()${col.isNullable ? '.optional()' : ''}`);
      }
    }

    return `import { z } from 'zod';

export const ${tableName}CreateSchema = z.object({
${rules.join(',\n')}
});

export const ${tableName}UpdateSchema = ${tableName}CreateSchema.partial();

export const ${tableName}BulkSchema = z.object({
  records: z.array(${tableName}CreateSchema).max(1000),
  options: z.object({
    skipDuplicates: z.boolean().optional(),
    validateOnly: z.boolean().optional()
  }).optional()
});`;
  }

  private mapDataTypeToZod(sqlType: string): string {
    const type = sqlType.toUpperCase();
    if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].some(t => type.includes(t))) return 'number';
    if (['DECIMAL', 'NUMERIC', 'FLOAT', 'REAL', 'MONEY'].some(t => type.includes(t))) return 'number';
    if (['BIT', 'BOOLEAN'].some(t => type.includes(t))) return 'boolean';
    if (['DATE'].some(t => type.includes(t))) return 'date';
    if (['DATETIME', 'DATETIME2', 'TIMESTAMP'].some(t => type.includes(t))) return 'date';
    return 'string';
  }

  private generateTypeScriptTypes(): string {
    const { tableName, columns } = this.config;

    const typeDefs = columns.map(col => {
      const tsType = this.mapDataTypeToTs(col.dataType);
      const nullable = col.isNullable ? ' | null' : '';
      const optional = col.isNullable ? '?' : '';
      return `  ${col.name}${optional}: ${tsType}${nullable};`;
    });

    return `// Auto-generated TypeScript types for ${tableName}

export interface ${tableName} {
${typeDefs.join('\n')}
}

export interface ${tableName}CreateInput {
${columns.filter(c => !c.isIdentity).map(col => {
  const tsType = this.mapDataTypeToTs(col.dataType);
  const optional = col.isNullable || col.defaultValue ? '?' : '';
  return `  ${col.name}${optional}: ${tsType};`;
}).join('\n')}
}

export interface ${tableName}UpdateInput {
${columns.filter(c => !c.isIdentity && !c.isPrimaryKey).map(col => {
  const tsType = this.mapDataTypeToTs(col.dataType);
  return `  ${col.name}?: ${tsType};`;
}).join('\n')}
}

export interface ${tableName}UpsertInput extends ${tableName}CreateInput {}

export interface BulkResult<T> {
  success: boolean;
  created?: number;
  updated?: number;
  deleted?: number;
  failed: number;
  records: T[];
  errors: BulkError[];
}

export interface BulkUpsertResult<T> extends BulkResult<T> {
  inserted: number;
  updated: number;
}

export interface BulkError {
  index?: number;
  message: string;
  details?: any;
}

export interface BulkUpdateInput<T> {
  ids?: (string | number)[];
  filter?: Partial<T>;
  set: Partial<T>;
}

export interface BulkDeleteInput {
  ids?: (string | number)[];
  filter?: Record<string, any>;
  permanent?: boolean;
}`;
  }

  private mapDataTypeToTs(sqlType: string): string {
    const type = sqlType.toUpperCase();
    if (['INT', 'BIGINT', 'SMALLINT', 'TINYINT'].some(t => type.includes(t))) return 'number';
    if (['DECIMAL', 'NUMERIC', 'FLOAT', 'REAL', 'MONEY'].some(t => type.includes(t))) return 'number';
    if (['BIT', 'BOOLEAN'].some(t => type.includes(t))) return 'boolean';
    if (['DATE', 'DATETIME', 'DATETIME2', 'TIMESTAMP'].some(t => type.includes(t))) return 'Date';
    return 'string';
  }

  private generateAPIRoutes(operations: BulkOperation[]): APIRouteDefinition[] {
    return operations.map(op => ({
      path: op.endpoint,
      method: op.method,
      handler: `${op.name}Handler`,
      middleware: ['authenticate', 'authorize', 'validate', op.rateLimit ? 'rateLimit' : ''].filter(Boolean)
    }));
  }

  private generateTestCases(): BulkTestCase[] {
    const { tableName, columns, primaryKey } = this.config;
    const sampleColumns = columns.slice(0, 3).filter(c => !c.isIdentity);

    return [
      {
        name: `bulkCreate_${tableName}_success`,
        description: `Successfully create multiple ${tableName} records`,
        input: {
          records: [
            Object.fromEntries(sampleColumns.map(c => [c.name, this.getSampleValue(c)])),
            Object.fromEntries(sampleColumns.map(c => [c.name, this.getSampleValue(c)]))
          ]
        },
        expectedOutput: {
          success: true,
          created: 2,
          failed: 0
        }
      },
      {
        name: `bulkCreate_${tableName}_validation_error`,
        description: `Validation error on missing required fields`,
        input: {
          records: [{}]
        },
        expectedOutput: {
          success: false,
          errors: [{ message: 'Validation failed' }]
        }
      },
      {
        name: `bulkUpdate_${tableName}_by_ids`,
        description: `Update ${tableName} records by IDs`,
        input: {
          ids: [1, 2, 3],
          set: { Status: 'Updated' }
        },
        expectedOutput: {
          success: true,
          updated: 3
        }
      },
      {
        name: `bulkDelete_${tableName}_soft`,
        description: `Soft delete ${tableName} records`,
        input: {
          ids: [1, 2],
          permanent: false
        },
        expectedOutput: {
          success: true,
          deleted: 2
        }
      }
    ];
  }

  private getSampleValue(col: ColumnConfig): unknown {
    const type = col.dataType.toUpperCase();
    if (type.includes('INT')) return 1;
    if (type.includes('DECIMAL') || type.includes('FLOAT')) return 1.5;
    if (type.includes('BIT') || type.includes('BOOL')) return true;
    if (type.includes('DATE')) return '2024-01-01';
    if (col.name.toLowerCase().includes('email')) return 'test@example.com';
    if (col.name.toLowerCase().includes('name')) return 'Test Name';
    return 'Test Value';
  }

  private generateDocumentation(operations: BulkOperation[]): string {
    const { tableName } = this.config;

    let doc = `# Bulk API Operations for ${tableName}

This document describes the bulk operations available for the ${tableName} table.

## Overview

| Operation | Method | Endpoint | Description |
|-----------|--------|----------|-------------|
${operations.map(op => `| ${op.name} | ${op.method} | ${op.endpoint} | ${op.description} |`).join('\n')}

## Operations

`;

    for (const op of operations) {
      doc += `### ${op.name}

**${op.method}** ${op.endpoint}

${op.description}

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
${op.parameters.map(p => `| ${p.name} | ${p.type} | ${p.required ? 'Yes' : 'No'} | ${p.description} |`).join('\n')}

#### Request Body

\`\`\`json
${op.requestBody.example}
\`\`\`

#### Response

\`\`\`json
${op.responseBody.example}
\`\`\`

#### Validation Rules

${op.validation.map(v => `- ${v}`).join('\n')}

#### Permissions

${op.permissions.map(p => `- \`${p}\``).join('\n')}

#### Rate Limits

- Window: ${op.rateLimit?.windowMs || 60000}ms
- Max Requests: ${op.rateLimit?.maxRequests || 100}
- Batch Limit: ${op.batchLimit} records

---

`;
    }

    return doc;
  }
}

// =============================================================================
// Export convenience functions
// =============================================================================

export function createBulkAPIGenerator(table: TableDef): BulkAPIGenerator {
  return new BulkAPIGenerator(table);
}

export function generateBulkOperations(table: TableDef): BulkOperationResult {
  const generator = new BulkAPIGenerator(table);
  return generator.generateOperations();
}

export function generateAllBulkOperations(tables: TableDef[]): Map<string, BulkOperationResult> {
  const results = new Map<string, BulkOperationResult>();
  for (const table of tables) {
    results.set(table.tableName, generateBulkOperations(table));
  }
  return results;
}
