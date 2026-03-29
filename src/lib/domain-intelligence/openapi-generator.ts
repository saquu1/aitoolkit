/**
 * OpenAPI/Swagger Generator
 * 
 * Generates OpenAPI 3.0 specifications from database schema:
 * - RESTful API endpoints
 * - Schema definitions
 * - Request/response models
 * - Security schemes
 * 
 * @module domain-intelligence/openapi-generator
 */

import { BusinessDomain, SensitivityType } from './base'
import { DOMAIN_REGISTRY } from './detector'
import { TableArchetype } from './table-archetype-detector'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * OpenAPI Specification structure
 */
export interface OpenAPISpec {
  openapi: '3.0.3'
  info: {
    title: string
    description: string
    version: string
    contact?: {
      name: string
      email?: string
    }
    license?: {
      name: string
      url?: string
    }
  }
  servers?: Array<{
    url: string
    description: string
  }>
  paths: Record<string, any>
  components: {
    schemas: Record<string, any>
    securitySchemes?: Record<string, any>
    parameters?: Record<string, any>
    responses?: Record<string, any>
  }
  tags?: Array<{
    name: string
    description: string
  }>
  security?: any[]
}

/**
 * Table schema for API generation
 */
export interface TableForApiGeneration {
  /** Table name */
  tableName: string
  /** Schema name */
  schemaName?: string
  /** Columns */
  columns: Array<{
    name: string
    dataType: string
    isPrimaryKey?: boolean
    isForeignKey?: boolean
    isNullable?: boolean
    isUnique?: boolean
    defaultValue?: string
    maxLength?: number
    description?: string
  }>
  /** Primary keys */
  primaryKeys?: string[]
  /** Foreign keys */
  foreignKeys?: Array<{
    columnName: string
    referencesTable: string
    referencesColumn: string
  }>
  /** Detected archetype */
  archetype?: TableArchetype
  /** Detected sensitive columns */
  sensitiveColumns?: Array<{
    column: string
    sensitivity: SensitivityType
  }>
}

/**
 * API generation options
 */
export interface ApiGenerationOptions {
  /** API version */
  version?: string
  /** Base path */
  basePath?: string
  /** Server URLs */
  servers?: string[]
  /** Include CRUD operations */
  includeCrud?: boolean
  /** Include search/filter endpoints */
  includeSearch?: boolean
  /** Include bulk operations */
  includeBulk?: boolean
  /** Include audit endpoints */
  includeAudit?: boolean
  /** Generate validation schemas */
  generateValidation?: boolean
  /** Security scheme */
  securityScheme?: 'bearer' | 'apiKey' | 'oauth2' | 'none'
  /** OAuth2 scopes */
  oauthScopes?: string[]
  /** Domain for context */
  domain?: BusinessDomain
}

/**
 * Generated API documentation
 */
export interface GeneratedApiDocs {
  /** OpenAPI JSON specification */
  openapi: OpenAPISpec
  /** OpenAPI YAML format */
  yaml: string
  /** TypeScript interfaces */
  typescript: string
  /** Markdown documentation */
  markdown: string
}

// =============================================================================
// DATA TYPE MAPPINGS
// =============================================================================

const SQL_TO_OPENAPI_TYPES: Record<string, { type: string; format?: string }> = {
  // String types
  'varchar': { type: 'string' },
  'nvarchar': { type: 'string' },
  'char': { type: 'string' },
  'nchar': { type: 'string' },
  'text': { type: 'string' },
  'ntext': { type: 'string' },
  'longtext': { type: 'string' },
  'mediumtext': { type: 'string' },
  'tinytext': { type: 'string' },
  
  // Numeric types
  'int': { type: 'integer', format: 'int32' },
  'integer': { type: 'integer', format: 'int32' },
  'bigint': { type: 'integer', format: 'int64' },
  'smallint': { type: 'integer', format: 'int32' },
  'tinyint': { type: 'integer', format: 'int32' },
  'decimal': { type: 'number' },
  'numeric': { type: 'number' },
  'float': { type: 'number', format: 'float' },
  'double': { type: 'number', format: 'double' },
  'real': { type: 'number', format: 'float' },
  'money': { type: 'number', format: 'double' },
  'smallmoney': { type: 'number', format: 'double' },
  
  // Date/Time types
  'date': { type: 'string', format: 'date' },
  'datetime': { type: 'string', format: 'date-time' },
  'datetime2': { type: 'string', format: 'date-time' },
  'datetimeoffset': { type: 'string', format: 'date-time' },
  'timestamp': { type: 'string', format: 'date-time' },
  'time': { type: 'string', format: 'time' },
  'smalldatetime': { type: 'string', format: 'date-time' },
  
  // Boolean
  'bit': { type: 'boolean' },
  'boolean': { type: 'boolean' },
  'bool': { type: 'boolean' },
  
  // Binary
  'binary': { type: 'string', format: 'byte' },
  'varbinary': { type: 'string', format: 'byte' },
  'image': { type: 'string', format: 'byte' },
  'blob': { type: 'string', format: 'binary' },
  'longblob': { type: 'string', format: 'binary' },
  
  // JSON
  'json': { type: 'object' },
  'jsonb': { type: 'object' },
  
  // UUID
  'uniqueidentifier': { type: 'string', format: 'uuid' },
  'uuid': { type: 'string', format: 'uuid' },
  
  // Other
  'xml': { type: 'string' },
  'cursor': { type: 'object' },
  'table': { type: 'array' },
}

// =============================================================================
// GENERATOR CLASS
// =============================================================================

export class OpenApiGenerator {
  
  /**
   * Generate complete OpenAPI specification
   */
  generate(
    tables: TableForApiGeneration[],
    options: ApiGenerationOptions = {}
  ): GeneratedApiDocs {
    const spec = this.generateSpec(tables, options)
    
    return {
      openapi: spec,
      yaml: this.toYaml(spec),
      typescript: this.generateTypeScript(tables, options),
      markdown: this.generateMarkdown(spec, tables)
    }
  }
  
  /**
   * Generate OpenAPI specification
   */
  private generateSpec(
    tables: TableForApiGeneration[],
    options: ApiGenerationOptions
  ): OpenAPISpec {
    const domain = options.domain
    const domainDef = domain ? DOMAIN_REGISTRY[domain] : null
    
    const spec: OpenAPISpec = {
      openapi: '3.0.3',
      info: {
        title: domainDef?.displayName ?? 'API Documentation',
        description: domainDef?.description ?? 'Auto-generated API from database schema',
        version: options.version ?? '1.0.0',
        contact: {
          name: 'API Support'
        }
      },
      servers: options.servers?.map((url, i) => ({
        url,
        description: i === 0 ? 'Production' : `Server ${i + 1}`
      })) ?? [{ url: 'http://localhost:3000', description: 'Development' }],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: this.generateSecuritySchemes(options),
        parameters: this.generateCommonParameters(),
        responses: this.generateCommonResponses()
      },
      tags: [],
      security: options.securityScheme !== 'none' ? [{}] : undefined
    }
    
    // Generate schemas and paths for each table
    for (const table of tables) {
      // Generate schema
      spec.components.schemas[this.toPascalCase(table.tableName)] = 
        this.generateSchema(table)
      
      // Generate create/update schemas
      spec.components.schemas[`${this.toPascalCase(table.tableName)}Create`] = 
        this.generateCreateSchema(table)
      
      spec.components.schemas[`${this.toPascalCase(table.tableName)}Update`] = 
        this.generateUpdateSchema(table)
      
      // Generate paths
      const paths = this.generatePaths(table, options)
      Object.assign(spec.paths, paths)
      
      // Add tag
      spec.tags!.push({
        name: this.toPascalCase(table.tableName),
        description: this.getTableDescription(table)
      })
    }
    
    // Add pagination schema
    spec.components.schemas['PaginatedResponse'] = this.generatePaginatedSchema()
    
    // Add error schema
    spec.components.schemas['ErrorResponse'] = this.generateErrorSchema()
    
    return spec
  }
  
  /**
   * Generate schema for a table
   */
  private generateSchema(table: TableForApiGeneration): any {
    const properties: Record<string, any> = {}
    const required: string[] = []
    
    for (const column of table.columns) {
      const openApiType = this.getOpenApiType(column.dataType)
      
      properties[column.name] = {
        ...openApiType,
        description: column.description ?? this.getColumnDescription(column.name, table.tableName),
        nullable: column.isNullable
      }
      
      // Mark as required if not nullable and no default
      if (!column.isNullable && !column.defaultValue && !column.isPrimaryKey) {
        required.push(column.name)
      }
      
      // Add max length for strings
      if (column.maxLength && openApiType.type === 'string') {
        properties[column.name].maxLength = column.maxLength
      }
      
      // Add unique constraint info
      if (column.isUnique) {
        properties[column.name]['x-unique'] = true
      }
    }
    
    return {
      type: 'object',
      description: this.getTableDescription(table),
      properties,
      required: required.length > 0 ? required : undefined,
      'x-table-name': table.tableName,
      'x-archetype': table.archetype
    }
  }
  
  /**
   * Generate create schema (excludes auto-generated fields)
   */
  private generateCreateSchema(table: TableForApiGeneration): any {
    const properties: Record<string, any> = {}
    const required: string[] = []
    
    const excludePatterns = [
      /^id$/i,
      /_id$/i,
      /^created_at$/i,
      /^updated_at$/i,
      /^created_by$/i,
      /^updated_by$/i,
      /^deleted_at$/i,
    ]
    
    for (const column of table.columns) {
      // Skip auto-generated columns
      if (excludePatterns.some(p => p.test(column.name))) {
        if (column.isPrimaryKey) continue // Skip PK for create
        // FK columns should be included for create
        if (column.isForeignKey) {
          // Include FK columns
        } else {
          continue
        }
      }
      
      const openApiType = this.getOpenApiType(column.dataType)
      properties[column.name] = {
        ...openApiType,
        description: column.description ?? this.getColumnDescription(column.name, table.tableName)
      }
      
      if (!column.isNullable) {
        required.push(column.name)
      }
    }
    
    return {
      type: 'object',
      description: `Create ${table.tableName}`,
      properties,
      required: required.length > 0 ? required : undefined
    }
  }
  
  /**
   * Generate update schema (all fields optional)
   */
  private generateUpdateSchema(table: TableForApiGeneration): any {
    const properties: Record<string, any> = {}
    
    const excludePatterns = [
      /^id$/i,
      /^created_at$/i,
      /^updated_at$/i,
      /^created_by$/i,
    ]
    
    for (const column of table.columns) {
      if (excludePatterns.some(p => p.test(column.name))) continue
      
      const openApiType = this.getOpenApiType(column.dataType)
      properties[column.name] = {
        ...openApiType,
        description: column.description ?? this.getColumnDescription(column.name, table.tableName),
        nullable: true
      }
    }
    
    return {
      type: 'object',
      description: `Update ${table.tableName}`,
      properties
    }
  }
  
  /**
   * Generate API paths for a table
   */
  private generatePaths(
    table: TableForApiGeneration,
    options: ApiGenerationOptions
  ): Record<string, any> {
    const basePath = options.basePath ?? '/api'
    const resourceName = this.toKebabCase(table.tableName)
    const schemaName = this.toPascalCase(table.tableName)
    const idParam = this.getIdParam(table)
    
    const paths: Record<string, any> = {}
    
    // Collection endpoint
    const collectionPath = `${basePath}/${resourceName}`
    paths[collectionPath] = {
      get: this.generateListOperation(table, schemaName, options),
      post: this.generateCreateOperation(table, schemaName, options)
    }
    
    // Single resource endpoint
    const resourcePath = `${basePath}/${resourceName}/{${idParam}}`
    paths[resourcePath] = {
      get: this.generateGetOperation(table, schemaName, idParam, options),
      put: this.generateUpdateOperation(table, schemaName, idParam, options),
      patch: this.generatePatchOperation(table, schemaName, idParam, options),
      delete: this.generateDeleteOperation(table, schemaName, idParam, options)
    }
    
    // Search endpoint
    if (options.includeSearch) {
      paths[`${basePath}/${resourceName}/search`] = {
        post: this.generateSearchOperation(table, schemaName, options)
      }
    }
    
    // Bulk operations
    if (options.includeBulk) {
      paths[`${basePath}/${resourceName}/bulk`] = {
        post: this.generateBulkCreateOperation(table, schemaName, options),
        put: this.generateBulkUpdateOperation(table, schemaName, options),
        delete: this.generateBulkDeleteOperation(table, schemaName, options)
      }
    }
    
    return paths
  }
  
  /**
   * Generate list operation
   */
  private generateListOperation(
    table: TableForApiGeneration,
    schemaName: string,
    options: ApiGenerationOptions
  ): any {
    return {
      tags: [schemaName],
      summary: `List all ${table.tableName}`,
      description: `Retrieve a paginated list of ${table.tableName}`,
      operationId: `list${schemaName}`,
      parameters: [
        { $ref: '#/components/parameters/pageParam' },
        { $ref: '#/components/parameters/limitParam' },
        { $ref: '#/components/parameters/sortByParam' },
        { $ref: '#/components/parameters/sortOrderParam' }
      ],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PaginatedResponse'
              },
              example: this.generateExample(table)
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '500': { $ref: '#/components/responses/ServerError' }
      },
      security: options.securityScheme !== 'none' ? [{ bearerAuth: [] }] : undefined
    }
  }
  
  /**
   * Generate create operation
   */
  private generateCreateOperation(
    table: TableForApiGeneration,
    schemaName: string,
    options: ApiGenerationOptions
  ): any {
    return {
      tags: [schemaName],
      summary: `Create a new ${table.tableName}`,
      description: `Create a new ${table.tableName} record`,
      operationId: `create${schemaName}`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/${schemaName}Create`
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Created successfully',
          content: {
            'application/json': {
              schema: {
                $ref: `#/components/schemas/${schemaName}`
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '409': {
          description: 'Conflict - resource already exists',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' }
            }
          }
        }
      },
      security: options.securityScheme !== 'none' ? [{ bearerAuth: [] }] : undefined
    }
  }
  
  /**
   * Generate get operation
   */
  private generateGetOperation(
    table: TableForApiGeneration,
    schemaName: string,
    idParam: string,
    options: ApiGenerationOptions
  ): any {
    return {
      tags: [schemaName],
      summary: `Get a ${table.tableName} by ID`,
      description: `Retrieve a single ${table.tableName} by its ID`,
      operationId: `get${schemaName}`,
      parameters: [
        {
          name: idParam,
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: `${table.tableName} ID`
        }
      ],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                $ref: `#/components/schemas/${schemaName}`
              }
            }
          }
        },
        '404': { $ref: '#/components/responses/NotFound' },
        '401': { $ref: '#/components/responses/Unauthorized' }
      },
      security: options.securityScheme !== 'none' ? [{ bearerAuth: [] }] : undefined
    }
  }
  
  /**
   * Generate update operation
   */
  private generateUpdateOperation(
    table: TableForApiGeneration,
    schemaName: string,
    idParam: string,
    options: ApiGenerationOptions
  ): any {
    return {
      tags: [schemaName],
      summary: `Update a ${table.tableName}`,
      description: `Update an existing ${table.tableName} record`,
      operationId: `update${schemaName}`,
      parameters: [
        {
          name: idParam,
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: `${table.tableName} ID`
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/${schemaName}Update`
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Updated successfully',
          content: {
            'application/json': {
              schema: {
                $ref: `#/components/schemas/${schemaName}`
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' }
      },
      security: options.securityScheme !== 'none' ? [{ bearerAuth: [] }] : undefined
    }
  }
  
  /**
   * Generate patch operation
   */
  private generatePatchOperation(
    table: TableForApiGeneration,
    schemaName: string,
    idParam: string,
    options: ApiGenerationOptions
  ): any {
    return {
      tags: [schemaName],
      summary: `Partially update a ${table.tableName}`,
      description: `Partially update an existing ${table.tableName} record`,
      operationId: `patch${schemaName}`,
      parameters: [
        {
          name: idParam,
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/${schemaName}Update`
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Updated successfully',
          content: {
            'application/json': {
              schema: {
                $ref: `#/components/schemas/${schemaName}`
              }
            }
          }
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' }
      },
      security: options.securityScheme !== 'none' ? [{ bearerAuth: [] }] : undefined
    }
  }
  
  /**
   * Generate delete operation
   */
  private generateDeleteOperation(
    table: TableForApiGeneration,
    schemaName: string,
    idParam: string,
    options: ApiGenerationOptions
  ): any {
    return {
      tags: [schemaName],
      summary: `Delete a ${table.tableName}`,
      description: `Delete a ${table.tableName} record`,
      operationId: `delete${schemaName}`,
      parameters: [
        {
          name: idParam,
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '204': {
          description: 'Deleted successfully'
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' }
      },
      security: options.securityScheme !== 'none' ? [{ bearerAuth: [] }] : undefined
    }
  }
  
  /**
   * Generate search operation
   */
  private generateSearchOperation(
    table: TableForApiGeneration,
    schemaName: string,
    options: ApiGenerationOptions
  ): any {
    return {
      tags: [schemaName],
      summary: `Search ${table.tableName}`,
      description: `Search ${table.tableName} records with filters`,
      operationId: `search${schemaName}`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                filters: { type: 'object' },
                fields: { 
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Search results',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PaginatedResponse'
              }
            }
          }
        }
      },
      security: options.securityScheme !== 'none' ? [{ bearerAuth: [] }] : undefined
    }
  }
  
  /**
   * Generate bulk create operation
   */
  private generateBulkCreateOperation(
    table: TableForApiGeneration,
    schemaName: string,
    options: ApiGenerationOptions
  ): any {
    return {
      tags: [schemaName],
      summary: `Bulk create ${table.tableName}`,
      operationId: `bulkCreate${schemaName}`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                $ref: `#/components/schemas/${schemaName}Create`
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  $ref: `#/components/schemas/${schemaName}`
                }
              }
            }
          }
        }
      },
      security: options.securityScheme !== 'none' ? [{ bearerAuth: [] }] : undefined
    }
  }
  
  /**
   * Generate bulk update operation
   */
  private generateBulkUpdateOperation(
    table: TableForApiGeneration,
    schemaName: string,
    options: ApiGenerationOptions
  ): any {
    return {
      tags: [schemaName],
      summary: `Bulk update ${table.tableName}`,
      operationId: `bulkUpdate${schemaName}`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                allOf: [
                  { $ref: `#/components/schemas/${schemaName}Update` },
                  { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }
                ]
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Updated successfully'
        }
      },
      security: options.securityScheme !== 'none' ? [{ bearerAuth: [] }] : undefined
    }
  }
  
  /**
   * Generate bulk delete operation
   */
  private generateBulkDeleteOperation(
    table: TableForApiGeneration,
    schemaName: string,
    options: ApiGenerationOptions
  ): any {
    return {
      tags: [schemaName],
      summary: `Bulk delete ${table.tableName}`,
      operationId: `bulkDelete${schemaName}`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of IDs to delete'
            }
          }
        }
      },
      responses: {
        '204': {
          description: 'Deleted successfully'
        }
      },
      security: options.securityScheme !== 'none' ? [{ bearerAuth: [] }] : undefined
    }
  }
  
  // =============================================================================
  // HELPER METHODS
  // =============================================================================
  
  /**
   * Get OpenAPI type from SQL type
   */
  private getOpenApiType(sqlType: string): { type: string; format?: string } {
    const normalized = sqlType.toLowerCase().replace(/\([^)]*\)/, '')
    return SQL_TO_OPENAPI_TYPES[normalized] ?? { type: 'string' }
  }
  
  /**
   * Get ID parameter name for table
   */
  private getIdParam(table: TableForApiGeneration): string {
    const pk = table.primaryKeys?.[0] ?? table.columns.find(c => c.isPrimaryKey)?.name
    if (pk) {
      return pk.endsWith('Id') ? pk : `${pk}Id`
    }
    return 'id'
  }
  
  /**
   * Get table description
   */
  private getTableDescription(table: TableForApiGeneration): string {
    const archetypeDescriptions: Record<TableArchetype, string> = {
      master: 'Core entity table',
      transaction: 'Transactional record table',
      lookup: 'Reference/lookup table',
      bridge: 'Junction/association table',
      audit: 'Audit/history table',
      config: 'Configuration table',
      reporting: 'Reporting/analytics table',
      staging: 'Staging/temporary table'
    }
    
    return archetypeDescriptions[table.archetype ?? 'master'] ?? 'Database table'
  }
  
  /**
   * Get column description
   */
  private getColumnDescription(columnName: string, tableName: string): string {
    // Generate meaningful descriptions based on naming conventions
    if (/^id$/i.test(columnName)) return `Unique identifier for ${tableName}`
    if (/_id$/i.test(columnName)) {
      const ref = columnName.replace(/_id$/i, '')
      return `Reference to ${ref}`
    }
    if (/^created_at$/i.test(columnName)) return 'Record creation timestamp'
    if (/^updated_at$/i.test(columnName)) return 'Record last update timestamp'
    if (/^created_by$/i.test(columnName)) return 'User who created this record'
    if (/^updated_by$/i.test(columnName)) return 'User who last updated this record'
    if (/^status$/i.test(columnName)) return 'Current status of the record'
    if (/^name$/i.test(columnName)) return 'Name of the entity'
    if (/^description$/i.test(columnName)) return 'Description or notes'
    if (/^email$/i.test(columnName)) return 'Email address'
    if (/^phone$/i.test(columnName)) return 'Phone number'
    if (/^address$/i.test(columnName)) return 'Physical address'
    
    return columnName.replace(/_/g, ' ')
  }
  
  /**
   * Generate example data
   */
  private generateExample(table: TableForApiGeneration): any {
    const example: any = {}
    
    for (const column of table.columns) {
      const openApiType = this.getOpenApiType(column.dataType)
      
      switch (openApiType.type) {
        case 'string':
          if (openApiType.format === 'date') {
            example[column.name] = '2024-01-01'
          } else if (openApiType.format === 'date-time') {
            example[column.name] = '2024-01-01T00:00:00Z'
          } else if (openApiType.format === 'uuid') {
            example[column.name] = '123e4567-e89b-12d3-a456-426614174000'
          } else if (/email/i.test(column.name)) {
            example[column.name] = 'example@email.com'
          } else if (/phone/i.test(column.name)) {
            example[column.name] = '+1234567890'
          } else if (/name/i.test(column.name)) {
            example[column.name] = `Sample ${column.name}`
          } else if (/status/i.test(column.name)) {
            example[column.name] = 'active'
          } else {
            example[column.name] = `sample_${column.name}`
          }
          break
        case 'integer':
          example[column.name] = 1
          break
        case 'number':
          example[column.name] = 0.0
          break
        case 'boolean':
          example[column.name] = true
          break
        default:
          example[column.name] = null
      }
    }
    
    return example
  }
  
  /**
   * Generate security schemes
   */
  private generateSecuritySchemes(options: ApiGenerationOptions): Record<string, any> | undefined {
    if (options.securityScheme === 'none') return undefined
    
    switch (options.securityScheme) {
      case 'bearer':
        return {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      case 'apiKey':
        return {
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          }
        }
      case 'oauth2':
        return {
          oauth2: {
            type: 'oauth2',
            flows: {
              authorizationCode: {
                authorizationUrl: 'https://example.com/oauth/authorize',
                tokenUrl: 'https://example.com/oauth/token',
                scopes: (options.oauthScopes ?? ['read', 'write']).reduce((acc, scope) => {
                  acc[scope] = `${scope} access`
                  return acc
                }, {} as Record<string, string>)
              }
            }
          }
        }
      default:
        return {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
    }
  }
  
  /**
   * Generate common parameters
   */
  private generateCommonParameters(): Record<string, any> {
    return {
      pageParam: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', default: 1 },
        description: 'Page number for pagination'
      },
      limitParam: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', default: 20, maximum: 100 },
        description: 'Number of items per page'
      },
      sortByParam: {
        name: 'sortBy',
        in: 'query',
        schema: { type: 'string' },
        description: 'Field to sort by'
      },
      sortOrderParam: {
        name: 'sortOrder',
        in: 'query',
        schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
        description: 'Sort order'
      }
    }
  }
  
  /**
   * Generate common responses
   */
  private generateCommonResponses(): Record<string, any> {
    return {
      BadRequest: {
        description: 'Bad request - invalid input',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized - authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      Forbidden: {
        description: 'Forbidden - insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      NotFound: {
        description: 'Not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      }
    }
  }
  
  /**
   * Generate paginated response schema
   */
  private generatePaginatedSchema(): any {
    return {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' }
          }
        }
      }
    }
  }
  
  /**
   * Generate error response schema
   */
  private generateErrorSchema(): any {
    return {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } }
          }
        }
      }
    }
  }
  
  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .toLowerCase()
      .split(/[_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }
  
  /**
   * Convert to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/([A-Z])/g, '-$1')
      .replace(/_/g, '-')
      .replace(/--/g, '-')
      .replace(/^-/, '')
  }
  
  // =============================================================================
  // OUTPUT FORMATTERS
  // =============================================================================
  
  /**
   * Convert spec to YAML format
   */
  private toYaml(spec: OpenAPISpec): string {
    // Simple YAML converter (for production use a proper library)
    return this.objectToYaml(spec, 0)
  }
  
  /**
   * Recursively convert object to YAML
   */
  private objectToYaml(obj: any, indent: number): string {
    const spaces = '  '.repeat(indent)
    
    if (obj === null || obj === undefined) {
      return 'null\n'
    }
    
    if (typeof obj !== 'object') {
      if (typeof obj === 'string') {
        // Quote strings that need it
        if (obj.includes(':') || obj.includes('#') || obj.includes('\n') || obj === '') {
          return `"${obj.replace(/"/g, '\\"')}"\n`
        }
        return `${obj}\n`
      }
      return `${obj}\n`
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]\n'
      let yaml = '\n'
      for (const item of obj) {
        yaml += `${spaces}- `
        if (typeof item === 'object' && item !== null) {
          yaml += this.objectToYaml(item, indent + 1).trimStart()
        } else {
          yaml += this.objectToYaml(item, indent + 1)
        }
      }
      return yaml
    }
    
    const keys = Object.keys(obj)
    if (keys.length === 0) return '{}\n'
    
    let yaml = '\n'
    for (const key of keys) {
      const value = obj[key]
      yaml += `${spaces}${key}:`
      
      if (typeof value === 'object' && value !== null) {
        yaml += this.objectToYaml(value, indent + 1)
      } else {
        yaml += ' ' + this.objectToYaml(value, indent + 1).trim()
      }
    }
    
    return yaml
  }
  
  /**
   * Generate TypeScript interfaces
   */
  private generateTypeScript(
    tables: TableForApiGeneration[],
    options: ApiGenerationOptions
  ): string {
    let ts = `/**
 * Auto-generated TypeScript interfaces
 * Generated: ${new Date().toISOString()}
 */

`
    
    for (const table of tables) {
      const interfaceName = this.toPascalCase(table.tableName)
      
      // Main interface
      ts += `export interface ${interfaceName} {\n`
      for (const column of table.columns) {
        const tsType = this.getTsType(column.dataType)
        const nullable = column.isNullable ? ' | null' : ''
        const optional = column.isNullable ? '?' : ''
        ts += `  /** ${this.getColumnDescription(column.name, table.tableName)} */\n`
        ts += `  ${column.name}${optional}: ${tsType}${nullable};\n\n`
      }
      ts += `}\n\n`
      
      // Create interface
      ts += `export interface ${interfaceName}Create {\n`
      for (const column of table.columns) {
        if (/^id$/i.test(column.name) || /^created_at$/i.test(column.name) || /^updated_at$/i.test(column.name)) {
          continue
        }
        const tsType = this.getTsType(column.dataType)
        const nullable = column.isNullable ? ' | null' : ''
        const optional = column.isNullable ? '?' : ''
        ts += `  ${column.name}${optional}: ${tsType}${nullable};\n`
      }
      ts += `}\n\n`
      
      // Update interface
      ts += `export interface ${interfaceName}Update extends Partial<${interfaceName}Create> {}\n\n`
    }
    
    // Common types
    ts += `export interface PaginatedResponse<T> {\n`
    ts += `  data: T[];\n`
    ts += `  pagination: {\n`
    ts += `    page: number;\n`
    ts += `    limit: number;\n`
    ts += `    total: number;\n`
    ts += `    totalPages: number;\n`
    ts += `  };\n`
    ts += `}\n\n`
    
    ts += `export interface ErrorResponse {\n`
    ts += `  error: {\n`
    ts += `    code: string;\n`
    ts += `    message: string;\n`
    ts += `    details?: any[];\n`
    ts += `  };\n`
    ts += `}\n`
    
    return ts
  }
  
  /**
   * Get TypeScript type from SQL type
   */
  private getTsType(sqlType: string): string {
    const normalized = sqlType.toLowerCase().replace(/\([^)]*\)/, '')
    
    const typeMap: Record<string, string> = {
      'int': 'number',
      'integer': 'number',
      'bigint': 'number',
      'smallint': 'number',
      'tinyint': 'number',
      'decimal': 'number',
      'numeric': 'number',
      'float': 'number',
      'double': 'number',
      'real': 'number',
      'money': 'number',
      'bit': 'boolean',
      'boolean': 'boolean',
      'bool': 'boolean',
      'date': 'string',
      'datetime': 'string',
      'datetime2': 'string',
      'timestamp': 'string',
      'time': 'string',
      'json': 'any',
      'jsonb': 'any',
      'uniqueidentifier': 'string',
      'uuid': 'string',
    }
    
    return typeMap[normalized] ?? 'string'
  }
  
  /**
   * Generate Markdown documentation
   */
  private generateMarkdown(spec: OpenAPISpec, tables: TableForApiGeneration[]): string {
    let md = `# ${spec.info.title}\n\n`
    md += `${spec.info.description}\n\n`
    md += `**Version:** ${spec.info.version}\n\n`
    
    md += `---\n\n`
    md += `## Table of Contents\n\n`
    
    for (const tag of spec.tags ?? []) {
      md += `- [${tag.name}](#${tag.name.toLowerCase()})\n`
    }
    
    md += `\n---\n\n`
    
    // Document each endpoint
    for (const tag of spec.tags ?? []) {
      md += `## ${tag.name}\n\n`
      md += `${tag.description}\n\n`
      
      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(methods)) {
          const op = operation as {
            tags?: string[]
            summary?: string
            description?: string
            parameters?: Array<{ $ref?: string; name?: string; in?: string; required?: boolean; schema?: { type?: string }; description?: string }>
            requestBody?: any
            responses?: Record<string, { description?: string }>
          }
          if (!op.tags?.includes(tag.name)) continue
          
          md += `### ${method.toUpperCase()} ${path}\n\n`
          md += `**${op.summary || ''}**\n\n`
          md += `${op.description || ''}\n\n`
          
          if (op.parameters?.length) {
            md += `**Parameters:**\n\n`
            md += `| Name | In | Required | Type | Description |\n`
            md += `|------|-----|----------|------|-------------|\n`
            for (const param of op.parameters) {
              if (param.$ref) continue
              md += `| ${param.name || ''} | ${param.in || ''} | ${param.required ? 'Yes' : 'No'} | ${param.schema?.type || 'any'} | ${param.description || ''} |\n`
            }
            md += `\n`
          }
          
          if (op.requestBody) {
            md += `**Request Body:**\n\n`
            md += `\`\`\`json\n`
            md += JSON.stringify({ example: 'data' }, null, 2)
            md += `\n\`\`\`\n\n`
          }
          
          md += `**Responses:**\n\n`
          for (const [code, response] of Object.entries(op.responses || {})) {
            md += `- \`${code}\` - ${response.description || ''}\n`
          }
          
          md += `\n---\n\n`
        }
      }
    }
    
    return md
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const openApiGenerator = new OpenApiGenerator()

/**
 * Generate OpenAPI specification
 */
export function generateOpenApi(
  tables: TableForApiGeneration[],
  options?: ApiGenerationOptions
): GeneratedApiDocs {
  return openApiGenerator.generate(tables, options)
}
