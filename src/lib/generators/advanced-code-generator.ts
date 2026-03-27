// =============================================================================
// ADVANCED CODE GENERATOR - Complete 100% Code Generation Suite
// Generates: Services, Repositories, DTOs, Tests, Advanced Components, Hooks
// =============================================================================

import { ParsedCSHTMLView, ParsedFormField } from '../cshtml-parser'
import { TableDef, ColumnDef } from '../types'

// =============================================================================
// TYPES
// =============================================================================

export interface GeneratedCodeFile {
  path: string
  content: string
  type: 'service' | 'repository' | 'dto' | 'test' | 'component' | 'hook' | 'api' | 'util' | 'storybook'
  description: string
}

export interface AdvancedGeneratorOptions {
  projectId: string
  moduleName: string
  tableName: string
  generateServices?: boolean
  generateRepositories?: boolean
  generateDTOs?: boolean
  generateTests?: boolean
  generateStorybook?: boolean
  generateUtils?: boolean
  useReactQuery?: boolean
  useZod?: boolean
  includeAudit?: boolean
  includeSoftDelete?: boolean
}

// =============================================================================
// ADVANCED CODE GENERATOR CLASS
// =============================================================================

export class AdvancedCodeGenerator {
  private options: AdvancedGeneratorOptions
  private fields: ParsedFormField[]
  private columns: ColumnDef[]

  constructor(options: AdvancedGeneratorOptions, fields: ParsedFormField[] = [], columns: ColumnDef[] = []) {
    this.options = {
      generateServices: true,
      generateRepositories: true,
      generateDTOs: true,
      generateTests: true,
      generateStorybook: true,
      generateUtils: true,
      useReactQuery: true,
      useZod: true,
      includeAudit: true,
      includeSoftDelete: true,
      ...options
    }
    this.fields = fields
    this.columns = columns
  }

  // ===========================================================================
  // MAIN GENERATION METHOD
  // ===========================================================================

  generateAll(): GeneratedCodeFile[] {
    const files: GeneratedCodeFile[] = []
    const { moduleName, tableName } = this.options
    const entityName = this.toPascalCase(moduleName)

    // Service Layer
    if (this.options.generateServices) {
      files.push(this.generateService())
      files.push(this.generateServiceInterface())
    }

    // Repository Layer
    if (this.options.generateRepositories) {
      files.push(this.generateRepository())
      files.push(this.generateRepositoryInterface())
    }

    // DTOs
    if (this.options.generateDTOs) {
      files.push(this.generateDTOs())
    }

    // Tests
    if (this.options.generateTests) {
      files.push(this.generateServiceTests())
      files.push(this.generateRepositoryTests())
      files.push(this.generateComponentTests())
      files.push(this.generateHookTests())
      files.push(this.generateAPITests())
    }

    // Storybook
    if (this.options.generateStorybook) {
      files.push(this.generateStorybookStories())
    }

    // Utils
    if (this.options.generateUtils) {
      files.push(this.generateUtils())
    }

    // Advanced Components
    files.push(this.generateDataTable())
    files.push(this.generateSearchComponent())
    files.push(this.generateFilterComponent())
    files.push(this.generateModalForm())
    files.push(this.generateConfirmDialog())
    files.push(this.generateExportButton())
    files.push(this.generateBulkActions())
    files.push(this.generateActivityLog())

    // Advanced Hooks
    files.push(this.generateUseDataTable())
    files.push(this.generateUseDebounce())
    files.push(this.generateUseLocalStorage())
    files.push(this.generateUseCopyToClipboard())
    files.push(this.generateUsePagination())
    files.push(this.generateUseInfiniteScroll())
    files.push(this.generateUseExport())
    files.push(this.generateUseBulkOperations())

    // Advanced API Routes
    files.push(this.generateBulkAPI())
    files.push(this.generateSearchAPI())
    files.push(this.generateExportAPI())
    files.push(this.generateWebhookHandler())

    return files
  }

  // ===========================================================================
  // SERVICE LAYER GENERATION
  // ===========================================================================

  generateService(): GeneratedCodeFile {
    const { moduleName, tableName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/services/${entityName}Service.ts`,
      content: `import { prisma } from '@/lib/db'
import { ${entityName}Repository, create${entityName}Repository } from './${entityName}Repository'
import { 
  ${entityName}CreateDTO, 
  ${entityName}UpdateDTO, 
  ${entityName}FilterDTO,
  ${entityName}BulkCreateDTO,
  ${entityName}BulkUpdateDTO,
  ${entityName}BulkDeleteDTO
} from '../dto/${entityName}DTO'
import { AuditLogger } from '@/lib/audit-logger'
import { CacheManager } from '@/lib/cache'

// =============================================================================
// ${entityName} SERVICE - Business Logic Layer
// =============================================================================

export interface ${entityName}Service {
  // CRUD Operations
  create(data: ${entityName}CreateDTO, userId?: string): Promise<any>
  getById(id: string): Promise<any | null>
  getAll(filters?: ${entityName}FilterDTO): Promise<{ data: any[]; total: number }>
  update(id: string, data: ${entityName}UpdateDTO, userId?: string): Promise<any>
  delete(id: string, userId?: string): Promise<void>
  
  // Bulk Operations
  bulkCreate(data: ${entityName}BulkCreateDTO, userId?: string): Promise<{ created: number; errors: any[] }>
  bulkUpdate(data: ${entityName}BulkUpdateDTO, userId?: string): Promise<{ updated: number; errors: any[] }>
  bulkDelete(data: ${entityName}BulkDeleteDTO, userId?: string): Promise<{ deleted: number; errors: any[] }>
  
  // Search & Export
  search(query: string, limit?: number): Promise<any[]>
  export(filters: ${entityName}FilterDTO, format: 'csv' | 'json' | 'xlsx'): Promise<Buffer>
  
  // Soft Delete
  softDelete(id: string, userId?: string): Promise<void>
  restore(id: string, userId?: string): Promise<any>
  getDeleted(): Promise<any[]>
  
  // Audit
  getHistory(id: string): Promise<any[]>
}

export class ${entityName}ServiceImpl implements ${entityName}Service {
  private repository: ${entityName}Repository
  private cache: CacheManager
  private auditLogger: AuditLogger
  private cacheKeyPrefix = '${moduleName}'

  constructor() {
    this.repository = create${entityName}Repository()
    this.cache = new CacheManager()
    this.auditLogger = new AuditLogger()
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  async create(data: ${entityName}CreateDTO, userId?: string): Promise<any> {
    // Validate business rules
    await this.validateCreate(data)
    
    // Create record
    const record = await this.repository.create({
      ...data,
      createdBy: userId,
      createdAt: new Date(),
    })
    
    // Invalidate cache
    await this.invalidateCache()
    
    // Audit log
    await this.auditLogger.log({
      action: 'CREATE',
      entityType: '${entityName}',
      entityId: record.id,
      userId,
      newData: record,
    })
    
    return record
  }

  async getById(id: string): Promise<any | null> {
    // Check cache first
    const cacheKey = \`\${this.cacheKeyPrefix}:\${id}\`
    const cached = await this.cache.get(cacheKey)
    if (cached) return cached
    
    // Get from repository
    const record = await this.repository.findById(id)
    
    // Cache result
    if (record) {
      await this.cache.set(cacheKey, record, 300) // 5 minutes
    }
    
    return record
  }

  async getAll(filters?: ${entityName}FilterDTO): Promise<{ data: any[]; total: number }> {
    const { page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters || {}
    
    const [data, total] = await Promise.all([
      this.repository.findAll({
        ...filters,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.repository.count(filters),
    ])
    
    return { data, total, page, pageSize }
  }

  async update(id: string, data: ${entityName}UpdateDTO, userId?: string): Promise<any> {
    // Get existing record for audit
    const existing = await this.repository.findById(id)
    if (!existing) throw new Error('${entityName} not found')
    
    // Validate business rules
    await this.validateUpdate(id, data, existing)
    
    // Update record
    const record = await this.repository.update(id, {
      ...data,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    
    // Invalidate cache
    await this.invalidateCache(id)
    
    // Audit log
    await this.auditLogger.log({
      action: 'UPDATE',
      entityType: '${entityName}',
      entityId: id,
      userId,
      oldData: existing,
      newData: record,
    })
    
    return record
  }

  async delete(id: string, userId?: string): Promise<void> {
    // Get existing record for audit
    const existing = await this.repository.findById(id)
    if (!existing) throw new Error('${entityName} not found')
    
    // Check if can delete
    await this.validateDelete(id, existing)
    
    // Delete record
    await this.repository.delete(id)
    
    // Invalidate cache
    await this.invalidateCache(id)
    
    // Audit log
    await this.auditLogger.log({
      action: 'DELETE',
      entityType: '${entityName}',
      entityId: id,
      userId,
      oldData: existing,
    })
  }

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  async bulkCreate(data: ${entityName}BulkCreateDTO, userId?: string): Promise<{ created: number; errors: any[] }> {
    const errors: any[] = []
    let created = 0
    
    for (let i = 0; i < data.items.length; i++) {
      try {
        await this.create(data.items[i], userId)
        created++
      } catch (error: any) {
        errors.push({ index: i, error: error.message, item: data.items[i] })
      }
    }
    
    await this.invalidateCache()
    
    return { created, errors }
  }

  async bulkUpdate(data: ${entityName}BulkUpdateDTO, userId?: string): Promise<{ updated: number; errors: any[] }> {
    const errors: any[] = []
    let updated = 0
    
    for (const item of data.items) {
      try {
        await this.update(item.id, item.data, userId)
        updated++
      } catch (error: any) {
        errors.push({ id: item.id, error: error.message })
      }
    }
    
    return { updated, errors }
  }

  async bulkDelete(data: ${entityName}BulkDeleteDTO, userId?: string): Promise<{ deleted: number; errors: any[] }> {
    const errors: any[] = []
    let deleted = 0
    
    for (const id of data.ids) {
      try {
        await this.delete(id, userId)
        deleted++
      } catch (error: any) {
        errors.push({ id, error: error.message })
      }
    }
    
    return { deleted, errors }
  }

  // ===========================================================================
  // Search & Export
  // ===========================================================================

  async search(query: string, limit: number = 10): Promise<any[]> {
    return this.repository.search(query, limit)
  }

  async export(filters: ${entityName}FilterDTO, format: 'csv' | 'json' | 'xlsx'): Promise<Buffer> {
    const { data } = await this.getAll({ ...filters, pageSize: 10000 })
    
    switch (format) {
      case 'csv':
        return this.exportToCSV(data)
      case 'json':
        return Buffer.from(JSON.stringify(data, null, 2))
      case 'xlsx':
        return this.exportToXLSX(data)
      default:
        throw new Error(\`Unsupported format: \${format}\`)
    }
  }

  private exportToCSV(data: any[]): Buffer {
    if (data.length === 0) return Buffer.from('')
    
    const headers = Object.keys(data[0])
    const rows = data.map(item => headers.map(h => JSON.stringify(item[h] ?? '')).join(','))
    const csv = [headers.join(','), ...rows].join('\\n')
    
    return Buffer.from(csv)
  }

  private exportToXLSX(data: any[]): Buffer {
    // Simplified XLSX generation (in production use exceljs or similar)
    return this.exportToCSV(data)
  }

  // ===========================================================================
  // Soft Delete
  // ===========================================================================

  async softDelete(id: string, userId?: string): Promise<void> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new Error('${entityName} not found')
    
    await this.repository.update(id, {
      deletedAt: new Date(),
      deletedBy: userId,
    })
    
    await this.invalidateCache(id)
    
    await this.auditLogger.log({
      action: 'SOFT_DELETE',
      entityType: '${entityName}',
      entityId: id,
      userId,
    })
  }

  async restore(id: string, userId?: string): Promise<any> {
    const record = await this.repository.update(id, {
      deletedAt: null,
      deletedBy: null,
    })
    
    await this.invalidateCache(id)
    
    await this.auditLogger.log({
      action: 'RESTORE',
      entityType: '${entityName}',
      entityId: id,
      userId,
    })
    
    return record
  }

  async getDeleted(): Promise<any[]> {
    return this.repository.findDeleted()
  }

  // ===========================================================================
  // Audit
  // ===========================================================================

  async getHistory(id: string): Promise<any[]> {
    return this.auditLogger.getHistory('${entityName}', id)
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private async validateCreate(data: ${entityName}CreateDTO): Promise<void> {
    // Add business validation logic
    // Example: Check for duplicates, validate references, etc.
  }

  private async validateUpdate(id: string, data: ${entityName}UpdateDTO, existing: any): Promise<void> {
    // Add update validation logic
  }

  private async validateDelete(id: string, existing: any): Promise<void> {
    // Add delete validation logic (check for dependencies)
  }

  private async invalidateCache(id?: string): Promise<void> {
    await this.cache.deletePattern(\`\${this.cacheKeyPrefix}*\`)
  }
}

// Factory function
export function create${entityName}Service(): ${entityName}Service {
  return new ${entityName}ServiceImpl()
}
`,
      type: 'service',
      description: `Complete service layer for ${moduleName} with CRUD, bulk ops, export, soft delete`
    }
  }

  generateServiceInterface(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/services/index.ts`,
      content: `export { ${entityName}Service, ${entityName}ServiceImpl, create${entityName}Service } from './${entityName}Service'`,
      type: 'service',
      description: `Service exports for ${moduleName}`
    }
  }

  // ===========================================================================
  // REPOSITORY LAYER GENERATION
  // ===========================================================================

  generateRepository(): GeneratedCodeFile {
    const { moduleName, tableName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/repositories/${entityName}Repository.ts`,
      content: `import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// =============================================================================
// ${entityName} REPOSITORY - Data Access Layer
// =============================================================================

export interface ${entityName}Repository {
  // Basic CRUD
  create(data: any): Promise<any>
  findById(id: string): Promise<any | null>
  findAll(options?: FindAllOptions): Promise<any[]>
  update(id: string, data: any): Promise<any>
  delete(id: string): Promise<void>
  
  // Count
  count(filters?: any): Promise<number>
  
  // Search
  search(query: string, limit?: number): Promise<any[]>
  
  // Soft Delete
  findDeleted(): Promise<any[]>
  
  // Bulk Operations
  createMany(data: any[]): Promise<number>
  updateMany(where: any, data: any): Promise<number>
  deleteMany(where: any): Promise<number>
  
  // Aggregations
  aggregate(field: string, operation: 'sum' | 'avg' | 'min' | 'max' | 'count', filters?: any): Promise<number>
  
  // Relations
  findWithRelations(id: string, relations: string[]): Promise<any | null>
}

export interface FindAllOptions {
  where?: any
  include?: any
  select?: any
  skip?: number
  take?: number
  orderBy?: any
}

export class ${entityName}RepositoryImpl implements ${entityName}Repository {
  private model = prisma.${tableName}

  // ===========================================================================
  // Basic CRUD
  // ===========================================================================

  async create(data: any): Promise<any> {
    return this.model.create({ data })
  }

  async findById(id: string): Promise<any | null> {
    return this.model.findUnique({
      where: { id },
    })
  }

  async findAll(options?: FindAllOptions): Promise<any[]> {
    const { where, include, select, skip, take, orderBy } = options || {}
    
    return this.model.findMany({
      where,
      include,
      select,
      skip,
      take,
      orderBy,
    })
  }

  async update(id: string, data: any): Promise<any> {
    return this.model.update({
      where: { id },
      data,
    })
  }

  async delete(id: string): Promise<void> {
    await this.model.delete({
      where: { id },
    })
  }

  // ===========================================================================
  // Count
  // ===========================================================================

  async count(filters?: any): Promise<number> {
    return this.model.count({ where: filters })
  }

  // ===========================================================================
  // Search
  // ===========================================================================

  async search(query: string, limit: number = 10): Promise<any[]> {
    return this.model.findMany({
      where: {
        OR: [
${this.fields.slice(0, 5).map(f => `          { ${f.name}: { contains: query, mode: 'insensitive' } },`).join('\n')}
        ],
      },
      take: limit,
    })
  }

  // ===========================================================================
  // Soft Delete
  // ===========================================================================

  async findDeleted(): Promise<any[]> {
    return this.model.findMany({
      where: {
        deletedAt: { not: null },
      },
    })
  }

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  async createMany(data: any[]): Promise<number> {
    const result = await this.model.createMany({ data, skipDuplicates: true })
    return result.count
  }

  async updateMany(where: any, data: any): Promise<number> {
    const result = await this.model.updateMany({ where, data })
    return result.count
  }

  async deleteMany(where: any): Promise<number> {
    const result = await this.model.deleteMany({ where })
    return result.count
  }

  // ===========================================================================
  // Aggregations
  // ===========================================================================

  async aggregate(
    field: string, 
    operation: 'sum' | 'avg' | 'min' | 'max' | 'count', 
    filters?: any
  ): Promise<number> {
    const result = await this.model.aggregate({
      where: filters,
      _sum: operation === 'sum' ? { [field]: true } : undefined,
      _avg: operation === 'avg' ? { [field]: true } : undefined,
      _min: operation === 'min' ? { [field]: true } : undefined,
      _max: operation === 'max' ? { [field]: true } : undefined,
      _count: operation === 'count' ? true : undefined,
    })
    
    if (operation === 'count') return result._count
    return result[\`_\${operation}\`]?.[field] ?? 0
  }

  // ===========================================================================
  // Relations
  // ===========================================================================

  async findWithRelations(id: string, relations: string[]): Promise<any | null> {
    const include: Record<string, boolean> = {}
    for (const relation of relations) {
      include[relation] = true
    }
    
    return this.model.findUnique({
      where: { id },
      include,
    })
  }
}

// Factory function
export function create${entityName}Repository(): ${entityName}Repository {
  return new ${entityName}RepositoryImpl()
}
`,
      type: 'repository',
      description: `Repository layer for ${moduleName} with search, bulk ops, aggregations`
    }
  }

  generateRepositoryInterface(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/repositories/index.ts`,
      content: `export { ${entityName}Repository, ${entityName}RepositoryImpl, create${entityName}Repository } from './${entityName}Repository'`,
      type: 'repository',
      description: `Repository exports for ${moduleName}`
    }
  }

  // ===========================================================================
  // DTO GENERATION
  // ===========================================================================

  generateDTOs(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/dto/${entityName}DTO.ts`,
      content: `import { z } from 'zod'

// =============================================================================
// ${entityName} DTOs - Data Transfer Objects with Validation
// =============================================================================

// Base schema fields
const baseFields = {
${this.fields.map(f => `  ${f.name}: ${this.getZodSchema(f)}`).join(',\n')}
}

// =============================================================================
// Create DTO
// =============================================================================

export const ${entityName}CreateSchema = z.object({
  ...baseFields,
})

export type ${entityName}CreateDTO = z.infer<typeof ${entityName}CreateSchema>

// =============================================================================
// Update DTO
// =============================================================================

export const ${entityName}UpdateSchema = z.object({
${this.fields.map(f => `  ${f.name}: ${this.getZodSchema(f, true)}`).join(',\n')}
})

export type ${entityName}UpdateDTO = z.infer<typeof ${entityName}UpdateSchema>

// =============================================================================
// Filter DTO
// =============================================================================

export const ${entityName}FilterSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  updatedAfter: z.coerce.date().optional(),
  updatedBefore: z.coerce.date().optional(),
  includeDeleted: z.boolean().optional(),
})

export type ${entityName}FilterDTO = z.infer<typeof ${entityName}FilterSchema>

// =============================================================================
// Bulk Operation DTOs
// =============================================================================

export const ${entityName}BulkCreateSchema = z.object({
  items: z.array(${entityName}CreateSchema).min(1).max(1000),
})

export type ${entityName}BulkCreateDTO = z.infer<typeof ${entityName}BulkCreateSchema>

export const ${entityName}BulkUpdateSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    data: ${entityName}UpdateSchema,
  })).min(1).max(1000),
})

export type ${entityName}BulkUpdateDTO = z.infer<typeof ${entityName}BulkUpdateSchema>

export const ${entityName}BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(1000),
  softDelete: z.boolean().optional(),
})

export type ${entityName}BulkDeleteDTO = z.infer<typeof ${entityName}BulkDeleteSchema>

// =============================================================================
// Response DTOs
// =============================================================================

export const ${entityName}ResponseSchema = z.object({
  id: z.string(),
${this.fields.map(f => `  ${f.name}: ${this.getZodSchema(f, true)}`).join(',\n')},
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
})

export type ${entityName}ResponseDTO = z.infer<typeof ${entityName}ResponseSchema>

export const ${entityName}ListResponseSchema = z.object({
  data: z.array(${entityName}ResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

export type ${entityName}ListResponseDTO = z.infer<typeof ${entityName}ListResponseSchema>

// =============================================================================
// Export DTOs
// =============================================================================

export const ${entityName}ExportSchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx']),
  filters: ${entityName}FilterSchema.optional(),
  fields: z.array(z.string()).optional(),
})

export type ${entityName}ExportDTO = z.infer<typeof ${entityName}ExportSchema>
`,
      type: 'dto',
      description: `Complete DTO suite for ${moduleName} with validation`
    }
  }

  // ===========================================================================
  // TEST GENERATION
  // ===========================================================================

  generateServiceTests(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/__tests__/${entityName}Service.test.ts`,
      content: `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { create${entityName}Service, ${entityName}Service } from '../services/${entityName}Service'
import { prisma } from '@/lib/db'

// =============================================================================
// ${entityName} Service Tests
// =============================================================================

describe('${entityName}Service', () => {
  let service: ${entityName}Service

  beforeEach(() => {
    service = create${entityName}Service()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // Create Tests
  // ===========================================================================

  describe('create', () => {
    it('should create a new ${moduleName}', async () => {
      const data = {
        // Add test data
      }
      
      const result = await service.create(data, 'test-user')
      
      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
    })

    it('should validate required fields', async () => {
      const data = {}
      
      await expect(service.create(data)).rejects.toThrow()
    })

    it('should log audit trail on create', async () => {
      const data = {}
      
      await service.create(data, 'test-user')
      
      // Verify audit log was created
    })
  })

  // ===========================================================================
  // Read Tests
  // ===========================================================================

  describe('getById', () => {
    it('should return ${moduleName} by id', async () => {
      // Setup test data
      // const result = await service.getById('test-id')
      // expect(result).toBeDefined()
    })

    it('should return null for non-existent id', async () => {
      const result = await service.getById('non-existent')
      expect(result).toBeNull()
    })

    it('should use cache for repeated requests', async () => {
      // Test caching behavior
    })
  })

  // ===========================================================================
  // Update Tests
  // ===========================================================================

  describe('update', () => {
    it('should update existing ${moduleName}', async () => {
      // Test update
    })

    it('should throw for non-existent id', async () => {
      await expect(service.update('non-existent', {})).rejects.toThrow()
    })
  })

  // ===========================================================================
  // Delete Tests
  // ===========================================================================

  describe('delete', () => {
    it('should delete ${moduleName}', async () => {
      // Test delete
    })
  })

  // ===========================================================================
  // Bulk Operation Tests
  // ===========================================================================

  describe('bulkCreate', () => {
    it('should create multiple ${moduleName}s', async () => {
      const result = await service.bulkCreate({
        items: [{}, {}, {}],
      })
      
      expect(result.created).toBe(3)
      expect(result.errors).toHaveLength(0)
    })

    it('should report partial failures', async () => {
      // Test partial failure handling
    })
  })

  // ===========================================================================
  // Export Tests
  // ===========================================================================

  describe('export', () => {
    it('should export to CSV', async () => {
      const buffer = await service.export({}, 'csv')
      expect(buffer).toBeInstanceOf(Buffer)
    })

    it('should export to JSON', async () => {
      const buffer = await service.export({}, 'json')
      expect(buffer).toBeInstanceOf(Buffer)
    })
  })
})
`,
      type: 'test',
      description: `Service unit tests for ${moduleName}`
    }
  }

  generateRepositoryTests(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/__tests__/${entityName}Repository.test.ts`,
      content: `import { describe, it, expect, beforeEach } from 'vitest'
import { create${entityName}Repository } from '../repositories/${entityName}Repository'

describe('${entityName}Repository', () => {
  // Add repository tests
})
`,
      type: 'test',
      description: `Repository unit tests for ${moduleName}`
    }
  }

  generateComponentTests(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/__tests__/${entityName}Components.test.tsx`,
      content: `import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ${entityName}DataTable } from '../components/${entityName}DataTable'
import { ${entityName}ModalForm } from '../components/${entityName}ModalForm'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('${entityName}Components', () => {
  describe('${entityName}DataTable', () => {
    it('should render table with data', async () => {
      render(<${entityName}DataTable />, { wrapper })
      // Add assertions
    })

    it('should handle sorting', async () => {
      render(<${entityName}DataTable />, { wrapper })
      // Click sort header and verify
    })

    it('should handle filtering', async () => {
      render(<${entityName}DataTable />, { wrapper })
      // Type in search and verify
    })

    it('should handle pagination', async () => {
      render(<${entityName}DataTable />, { wrapper })
      // Click next page and verify
    })

    it('should handle row selection', async () => {
      render(<${entityName}DataTable />, { wrapper })
      // Select rows and verify
    })

    it('should handle bulk actions', async () => {
      render(<${entityName}DataTable />, { wrapper })
      // Select multiple and perform bulk action
    })
  })

  describe('${entityName}ModalForm', () => {
    it('should open and close modal', async () => {
      // Test modal open/close
    })

    it('should validate form fields', async () => {
      // Test validation
    })

    it('should submit form data', async () => {
      // Test form submission
    })
  })
})
`,
      type: 'test',
      description: `Component tests for ${moduleName}`
    }
  }

  generateHookTests(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/__tests__/${entityName}Hooks.test.ts`,
      content: `import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { use${entityName}DataTable } from '../hooks/use${entityName}DataTable'
import { use${entityName}Export } from '../hooks/use${entityName}Export'
import { use${entityName}BulkOperations } from '../hooks/use${entityName}BulkOperations'

const queryClient = new QueryClient()
const wrapper = ({ children }: { children: any }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('${entityName}Hooks', () => {
  describe('use${entityName}DataTable', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => use${entityName}DataTable(), { wrapper })
      
      expect(result.current.page).toBe(1)
      expect(result.current.pageSize).toBe(20)
      expect(result.current.sortBy).toBe('createdAt')
    })

    it('should handle page change', async () => {
      const { result } = renderHook(() => use${entityName}DataTable(), { wrapper })
      
      act(() => {
        result.current.setPage(2)
      })
      
      expect(result.current.page).toBe(2)
    })

    it('should handle search with debounce', async () => {
      const { result } = renderHook(() => use${entityName}DataTable(), { wrapper })
      
      act(() => {
        result.current.setSearch('test query')
      })
      
      // Wait for debounce
      await waitFor(() => {
        expect(result.current.debouncedSearch).toBe('test query')
      }, { timeout: 500 })
    })
  })

  describe('use${entityName}Export', () => {
    it('should export data', async () => {
      const { result } = renderHook(() => use${entityName}Export(), { wrapper })
      
      await act(async () => {
        await result.current.exportToCSV()
      })
      
      expect(result.current.isExporting).toBe(false)
    })
  })

  describe('use${entityName}BulkOperations', () => {
    it('should handle bulk delete', async () => {
      const { result } = renderHook(() => use${entityName}BulkOperations(), { wrapper })
      
      await act(async () => {
        await result.current.bulkDelete(['id1', 'id2'])
      })
      
      expect(result.current.lastResult?.deleted).toBe(2)
    })
  })
})
`,
      type: 'test',
      description: `Hook tests for ${moduleName}`
    }
  }

  generateAPITests(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/__tests__/${entityName}API.test.ts`,
      content: `import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '../api/${moduleName}/route'

describe('${entityName} API', () => {
  describe('GET /api/${moduleName}', () => {
    it('should return list with pagination', async () => {
      const req = new NextRequest('http://localhost/api/${moduleName}?page=1&pageSize=10')
      const res = await GET(req)
      const data = await res.json()
      
      expect(res.status).toBe(200)
      expect(data.data).toBeInstanceOf(Array)
      expect(data.total).toBeDefined()
    })

    it('should filter by search', async () => {
      const req = new NextRequest('http://localhost/api/${moduleName}?search=test')
      const res = await GET(req)
      
      expect(res.status).toBe(200)
    })
  })

  describe('POST /api/${moduleName}', () => {
    it('should create new record', async () => {
      const req = new NextRequest('http://localhost/api/${moduleName}', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      })
      const res = await POST(req)
      
      expect(res.status).toBe(201)
    })

    it('should validate input', async () => {
      const req = new NextRequest('http://localhost/api/${moduleName}', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const res = await POST(req)
      
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /api/${moduleName}/[id]', () => {
    it('should update existing record', async () => {
      // Test update
    })
  })

  describe('DELETE /api/${moduleName}/[id]', () => {
    it('should delete record', async () => {
      // Test delete
    })
  })
})
`,
      type: 'test',
      description: `API integration tests for ${moduleName}`
    }
  }

  // ===========================================================================
  // STORYBOOK GENERATION
  // ===========================================================================

  generateStorybookStories(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/stories/${entityName}.stories.tsx`,
      content: `import type { Meta, StoryObj } from '@storybook/react'
import { ${entityName}DataTable } from '../components/${entityName}DataTable'
import { ${entityName}ModalForm } from '../components/${entityName}ModalForm'
import { ${entityName}Search } from '../components/${entityName}Search'
import { ${entityName}Filter } from '../components/${entityName}Filter'
import { ${entityName}ExportButton } from '../components/${entityName}ExportButton'

// =============================================================================
// ${entityName} DataTable Stories
// =============================================================================

const meta: Meta<typeof ${entityName}DataTable> = {
  title: 'Modules/${entityName}/DataTable',
  component: ${entityName}DataTable,
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof ${entityName}DataTable>

export const Default: Story = {
  args: {},
}

export const WithData: Story = {
  args: {},
  parameters: {
    msw: {
      handlers: [
        // Add mock handlers
      ],
    },
  },
}

export const Loading: Story = {
  args: {},
  parameters: {
    msw: {
      handlers: [
        // Add loading handler
      ],
    },
  },
}

export const Empty: Story = {
  args: {},
  parameters: {
    msw: {
      handlers: [
        // Add empty response handler
      ],
    },
  },
}

export const WithError: Story = {
  args: {},
  parameters: {
    msw: {
      handlers: [
        // Add error handler
      ],
    },
  },
}

// =============================================================================
// ${entityName} Modal Form Stories
// =============================================================================

const FormMeta: Meta<typeof ${entityName}ModalForm> = {
  title: 'Modules/${entityName}/ModalForm',
  component: ${entityName}ModalForm,
}

export const FormDefault: StoryObj<typeof ${entityName}ModalForm> = {
  args: {
    open: true,
    mode: 'create',
  },
}

export const EditMode: StoryObj<typeof ${entityName}ModalForm> = {
  args: {
    open: true,
    mode: 'edit',
    initialData: {
      // Add sample data
    },
  },
}

// =============================================================================
// ${entityName} Search Stories
// =============================================================================

const SearchMeta: Meta<typeof ${entityName}Search> = {
  title: 'Modules/${entityName}/Search',
  component: ${entityName}Search,
}

export const SearchDefault: StoryObj<typeof ${entityName}Search> = {
  args: {},
}

// =============================================================================
// ${entityName} Filter Stories
// =============================================================================

const FilterMeta: Meta<typeof ${entityName}Filter> = {
  title: 'Modules/${entityName}/Filter',
  component: ${entityName}Filter,
}

export const FilterDefault: StoryObj<typeof ${entityName}Filter> = {
  args: {},
}

// =============================================================================
// ${entityName} Export Button Stories
// =============================================================================

const ExportMeta: Meta<typeof ${entityName}ExportButton> = {
  title: 'Modules/${entityName}/ExportButton',
  component: ${entityName}ExportButton,
}

export const ExportDefault: StoryObj<typeof ${entityName}ExportButton> = {
  args: {},
}
`,
      type: 'storybook',
      description: `Storybook stories for ${moduleName} components`
    }
  }

  // ===========================================================================
  // UTILITY GENERATION
  // ===========================================================================

  generateUtils(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/utils/${entityName}Utils.ts`,
      content: `// =============================================================================
// ${entityName} Utility Functions
// =============================================================================

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// =============================================================================
// Formatting Utilities
// =============================================================================

export function format${entityName}Name(item: any): string {
  return item.name || item.title || \`Item \${item.id}\`
}

export function format${entityName}Date(date: Date | string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function format${entityName}DateTime(date: Date | string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function format${entityName}Currency(amount: number | null): string {
  if (amount == null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// =============================================================================
// Validation Utilities
// =============================================================================

export function isValid${entityName}Id(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id)
}

export function validate${entityName}Data(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Add validation rules
  if (!data.name) errors.push('Name is required')
  
  return { valid: errors.length === 0, errors }
}

// =============================================================================
// Export Utilities
// =============================================================================

export function ${moduleName.toLowerCase()}ToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const rows = data.map(item => 
    headers.map(h => {
      const value = item[h]
      if (value == null) return ''
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    })
  )
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\\n')
}

export function download${entityName}CSV(data: any[], filename: string = '${moduleName}.csv'): void {
  const csv = ${moduleName.toLowerCase()}ToCSV(data)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// =============================================================================
// Filter Utilities
// =============================================================================

export function build${entityName}FilterWhere(filters: Record<string, any>): any {
  const where: any = {}
  
  if (filters.search) {
    where.OR = [
${this.fields.slice(0, 5).map(f => `      { ${f.name}: { contains: filters.search, mode: 'insensitive' } },`).join('\n')}
    ]
  }
  
  if (filters.createdAfter || filters.createdBefore) {
    where.createdAt = {}
    if (filters.createdAfter) where.createdAt.gte = new Date(filters.createdAfter)
    if (filters.createdBefore) where.createdAt.lte = new Date(filters.createdBefore)
  }
  
  return where
}

// =============================================================================
// Sorting Utilities
// =============================================================================

export const ${entityName}SortableFields = [
${this.fields.slice(0, 10).map(f => `  '${f.name}',`).join('\n')}
  'createdAt',
  'updatedAt',
] as const

export type ${entityName}SortField = typeof ${entityName}SortableFields[number]

// =============================================================================
// Class Name Utility
// =============================================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`,
      type: 'util',
      description: `Utility functions for ${moduleName}`
    }
  }

  // ===========================================================================
  // ADVANCED COMPONENT GENERATION
  // ===========================================================================

  generateDataTable(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/components/${entityName}DataTable.tsx`,
      content: `'use client'

import { useState, useCallback, useMemo } from 'react'
import { use${entityName}DataTable } from '../hooks/use${entityName}DataTable'
import { ${entityName}Search } from './${entityName}Search'
import { ${entityName}Filter } from './${entityName}Filter'
import { ${entityName}ExportButton } from './${entityName}ExportButton'
import { ${entityName}BulkActions } from './${entityName}BulkActions'
import { ${entityName}ModalForm } from './${entityName}ModalForm'
import { ${entityName}ConfirmDialog } from './${entityName}ConfirmDialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, Eye, Plus, RefreshCw } from 'lucide-react'

// =============================================================================
// ${entityName} Data Table Component
// =============================================================================

export function ${entityName}DataTable() {
  const {
    data,
    isLoading,
    error,
    page,
    pageSize,
    total,
    sortBy,
    sortOrder,
    search,
    filters,
    selectedIds,
    setPage,
    setPageSize,
    setSort,
    setSearch,
    setFilters,
    toggleSelect,
    toggleSelectAll,
    refresh,
  } = use${entityName}DataTable()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteItem, setDeleteItem] = useState<any>(null)

  const totalPages = Math.ceil(total / pageSize)
  const isAllSelected = data?.length > 0 && selectedIds.length === data.length

  const columns = useMemo(() => [
${this.fields.slice(0, 6).map((f, i) => `    {
      id: '${f.name}',
      header: '${f.label || f.name}',
      accessorKey: '${f.name}',
      sortable: true,
      cell: (row: any) => (
        <span>{row.${f.name} ?? '-'}</span>
      ),
    },`).join('\n')}
    {
      id: 'actions',
      header: 'Actions',
      cell: (row: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditItem(row)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log('View', row.id)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setDeleteItem(row)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [])

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSort(column, sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(column, 'asc')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>${entityName}s</CardTitle>
          <div className="flex items-center gap-2">
            <${entityName}ExportButton />
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <${entityName}Search value={search} onChange={setSearch} />
            </div>
            <div className="flex gap-2">
              <${entityName}Filter filters={filters} onChange={setFilters} />
              <Button variant="outline" size="icon" onClick={refresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <${entityName}BulkActions 
              selectedIds={selectedIds} 
              onComplete={() => {
                toggleSelectAll()
                refresh()
              }} 
            />
          )}

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={() => toggleSelectAll()}
                    />
                  </TableHead>
                  {columns.map((col) => (
                    <TableHead key={col.id}>
                      {col.sortable ? (
                        <Button
                          variant="ghost"
                          onClick={() => handleSort(col.id)}
                          className="h-auto p-0 font-medium hover:bg-transparent"
                        >
                          {col.header}
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        col.header
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      {columns.map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center text-red-500">
                      Error loading data: {error.message}
                    </TableCell>
                  </TableRow>
                ) : !data?.length ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row: any) => (
                    <TableRow key={row.id} data-state={selectedIds.includes(row.id) ? 'selected' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                        />
                      </TableCell>
                      {columns.map((col) => (
                        <TableCell key={col.id}>
                          {col.cell ? col.cell(row) : row[col.accessorKey]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total}
              </span>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setPage(page - 1)}
                      className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setPage(pageNum)}
                          isActive={page === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setPage(page + 1)}
                      className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <${entityName}ModalForm
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        mode="create"
        onSuccess={() => {
          setShowCreateModal(false)
          refresh()
        }}
      />

      <${entityName}ModalForm
        open={!!editItem}
        onClose={() => setEditItem(null)}
        mode="edit"
        initialData={editItem}
        onSuccess={() => {
          setEditItem(null)
          refresh()
        }}
      />

      <${entityName}ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="Delete ${entityName}"
        message={\`Are you sure you want to delete "\${deleteItem?.name || deleteItem?.id}"? This action cannot be undone.\`}
        onConfirm={async () => {
          // Delete logic
          setDeleteItem(null)
          refresh()
        }}
      />
    </div>
  )
}
`,
      type: 'component',
      description: `Advanced DataTable with sorting, filtering, pagination, bulk actions for ${moduleName}`
    }
  }

  generateSearchComponent(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/components/${entityName}Search.tsx`,
      content: `'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { useDebounce } from '../hooks/use${entityName}Debounce'

// =============================================================================
// ${entityName} Search Component
// =============================================================================

interface ${entityName}SearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
}

export function ${entityName}Search({ 
  value, 
  onChange, 
  placeholder = 'Search...',
  debounceMs = 300
}: ${entityName}SearchProps) {
  const [localValue, setLocalValue] = useState(value)
  const debouncedValue = useDebounce(localValue, debounceMs)

  useEffect(() => {
    onChange(debouncedValue)
  }, [debouncedValue])

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleClear = () => {
    setLocalValue('')
    onChange('')
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-9 pr-9"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
`,
      type: 'component',
      description: `Search component with debounce for ${moduleName}`
    }
  }

  generateFilterComponent(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/components/${entityName}Filter.tsx`,
      content: `'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Filter, X, RotateCcw } from 'lucide-react'

// =============================================================================
// ${entityName} Filter Component
// =============================================================================

interface ${entityName}FilterProps {
  filters: Record<string, any>
  onChange: (filters: Record<string, any>) => void
}

const defaultFilters = {
  status: '',
  createdAfter: '',
  createdBefore: '',
  updatedAfter: '',
  updatedBefore: '',
}

export function ${entityName}Filter({ filters, onChange }: ${entityName}FilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== '' && value !== undefined && value !== null
  ).length

  const handleReset = () => {
    onChange(defaultFilters)
  }

  const handleApply = () => {
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filters</h4>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-2 h-3 w-3" /> Reset
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {/* Status Filter */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={filters.status || ''}
                onValueChange={(v) => onChange({ ...filters, status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <Label>Created After</Label>
              <Input
                type="date"
                value={filters.createdAfter || ''}
                onChange={(e) => onChange({ ...filters, createdAfter: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Created Before</Label>
              <Input
                type="date"
                value={filters.createdBefore || ''}
                onChange={(e) => onChange({ ...filters, createdBefore: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Apply Filters</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
`,
      type: 'component',
      description: `Filter component with date range and status for ${moduleName}`
    }
  }

  generateModalForm(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/components/${entityName}ModalForm.tsx`,
      content: `'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2 } from 'lucide-react'
import { ${entityName}CreateSchema, ${entityName}UpdateSchema } from '../dto/${entityName}DTO'

// =============================================================================
// ${entityName} Modal Form Component
// =============================================================================

interface ${entityName}ModalFormProps {
  open: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  initialData?: any
  onSuccess: () => void
}

export function ${entityName}ModalForm({ 
  open, 
  onClose, 
  mode, 
  initialData,
  onSuccess 
}: ${entityName}ModalFormProps) {
  const form = useForm({
    resolver: zodResolver(mode === 'create' ? ${entityName}CreateSchema : ${entityName}UpdateSchema),
    defaultValues: initialData || {},
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset(initialData)
      } else {
        form.reset({})
      }
    }
  }, [open, initialData])

  const onSubmit = async (data: any) => {
    try {
      if (mode === 'create') {
        // Create API call
        const res = await fetch('/api/${moduleName}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Failed to create')
      } else {
        // Update API call
        const res = await fetch(\`/api/${moduleName}/\${initialData.id}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Failed to update')
      }
      onSuccess()
    } catch (error) {
      console.error('Submit error:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New ${entityName}' : 'Edit ${entityName}'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
${this.fields.slice(0, 8).map(f => `              <FormField
                control={form.control}
                name="${f.name}"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>${f.label || f.name}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />`).join('\n')}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {mode === 'create' ? 'Create' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
`,
      type: 'component',
      description: `Modal form component for ${moduleName}`
    }
  }

  generateConfirmDialog(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/components/${entityName}ConfirmDialog.tsx`,
      content: `'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

// =============================================================================
// ${entityName} Confirm Dialog Component
// =============================================================================

interface ${entityName}ConfirmDialogProps {
  open: boolean
  onClose: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => Promise<void>
}

export function ${entityName}ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  onConfirm,
}: ${entityName}ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Confirm action error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
`,
      type: 'component',
      description: `Confirmation dialog component for ${moduleName}`
    }
  }

  generateExportButton(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/components/${entityName}ExportButton.tsx`,
      content: `'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileJson, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { use${entityName}Export } from '../hooks/use${entityName}Export'

// =============================================================================
// ${entityName} Export Button Component
// =============================================================================

interface ${entityName}ExportButtonProps {
  filters?: Record<string, any>
  fields?: string[]
}

export function ${entityName}ExportButton({ filters, fields }: ${entityName}ExportButtonProps) {
  const { exportToCSV, exportToJSON, exportToXLSX, isExporting } = use${entityName}Export()

  const handleExport = async (format: 'csv' | 'json' | 'xlsx') => {
    switch (format) {
      case 'csv':
        await exportToCSV(filters, fields)
        break
      case 'json':
        await exportToJSON(filters, fields)
        break
      case 'xlsx':
        await exportToXLSX(filters, fields)
        break
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileJson className="mr-2 h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('xlsx')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
`,
      type: 'component',
      description: `Export button with CSV, JSON, XLSX support for ${moduleName}`
    }
  }

  generateBulkActions(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/components/${entityName}BulkActions.tsx`,
      content: `'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, Trash2, Archive, RotateCcw, Download, Loader2 } from 'lucide-react'
import { use${entityName}BulkOperations } from '../hooks/use${entityName}BulkOperations'

// =============================================================================
// ${entityName} Bulk Actions Component
// =============================================================================

interface ${entityName}BulkActionsProps {
  selectedIds: string[]
  onComplete: () => void
}

export function ${entityName}BulkActions({ selectedIds, onComplete }: ${entityName}BulkActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { bulkDelete, bulkArchive, bulkRestore, bulkExport, isLoading } = use${entityName}BulkOperations()

  const handleBulkDelete = async () => {
    await bulkDelete(selectedIds)
    setShowDeleteDialog(false)
    onComplete()
  }

  const handleBulkArchive = async () => {
    await bulkArchive(selectedIds)
    onComplete()
  }

  const handleBulkRestore = async () => {
    await bulkRestore(selectedIds)
    onComplete()
  }

  const handleBulkExport = async () => {
    await bulkExport(selectedIds)
  }

  return (
    <>
      <div className="flex items-center gap-2 p-2 bg-muted rounded-md mb-2">
        <Badge variant="secondary">{selectedIds.length} selected</Badge>
        
        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="mr-2 h-4 w-4" />
              )}
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleBulkExport}>
              <Download className="mr-2 h-4 w-4" />
              Export Selected
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleBulkArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archive Selected
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleBulkRestore}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore Selected
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected 
              ${moduleName} records from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selectedIds.length} items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
`,
      type: 'component',
      description: `Bulk actions component for ${moduleName}`
    }
  }

  generateActivityLog(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/components/${entityName}ActivityLog.tsx`,
      content: `'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  History, 
  Plus, 
  Pencil, 
  Trash2, 
  Archive, 
  RotateCcw,
  CheckCircle,
  XCircle
} from 'lucide-react'

// =============================================================================
// ${entityName} Activity Log Component
// =============================================================================

interface ${entityName}ActivityLogProps {
  entityId: string
}

const actionIcons: Record<string, any> = {
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
  SOFT_DELETE: Archive,
  RESTORE: RotateCcw,
  APPROVE: CheckCircle,
  REJECT: XCircle,
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-500',
  UPDATE: 'bg-blue-500',
  DELETE: 'bg-red-500',
  SOFT_DELETE: 'bg-orange-500',
  RESTORE: 'bg-purple-500',
  APPROVE: 'bg-green-500',
  REJECT: 'bg-red-500',
}

async function fetchActivityLog(entityId: string) {
  const res = await fetch(\`/api/${moduleName}/\${entityId}/history\`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

export function ${entityName}ActivityLog({ entityId }: ${entityName}ActivityLogProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['${moduleName}', entityId, 'history'],
    queryFn: () => fetchActivityLog(entityId),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {!logs?.length ? (
            <p className="text-center text-muted-foreground py-8">
              No activity recorded
            </p>
          ) : (
            <div className="space-y-4">
              {logs.map((log: any) => {
                const Icon = actionIcons[log.action] || History
                return (
                  <div key={log.id} className="flex gap-3">
                    <div className={\`p-2 rounded-full \${actionColors[log.action] || 'bg-gray-500'}\`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.action}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        By {log.userName || log.userId || 'System'}
                      </p>
                      {log.changes && (
                        <div className="mt-1 text-xs bg-muted p-2 rounded">
                          {Object.entries(log.changes).map(([field, change]: [string, any]) => (
                            <div key={field}>
                              {field}: {change.old ?? 'null'} → {change.new ?? 'null'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
`,
      type: 'component',
      description: `Activity log component for ${moduleName}`
    }
  }

  // ===========================================================================
  // ADVANCED HOOKS GENERATION
  // ===========================================================================

  generateUseDataTable(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/hooks/use${entityName}DataTable.ts`,
      content: `'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDebounce } from './use${entityName}Debounce'

// =============================================================================
// ${entityName} Data Table Hook
// =============================================================================

interface Use${entityName}DataTableOptions {
  defaultPageSize?: number
  defaultSortBy?: string
  defaultSortOrder?: 'asc' | 'desc'
}

interface Use${entityName}DataTableReturn {
  // Data
  data: any[]
  total: number
  isLoading: boolean
  error: Error | null

  // Pagination
  page: number
  pageSize: number
  totalPages: number
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  nextPage: () => void
  prevPage: () => void

  // Sorting
  sortBy: string
  sortOrder: 'asc' | 'desc'
  setSort: (by: string, order: 'asc' | 'desc') => void

  // Search
  search: string
  debouncedSearch: string
  setSearch: (search: string) => void

  // Filters
  filters: Record<string, any>
  setFilters: (filters: Record<string, any>) => void
  clearFilters: () => void

  // Selection
  selectedIds: string[]
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void
  clearSelection: () => void
  isSelected: (id: string) => boolean

  // Actions
  refresh: () => void
}

export function use${entityName}DataTable(options: Use${entityName}DataTableOptions = {}): Use${entityName}DataTableReturn {
  const {
    defaultPageSize = 20,
    defaultSortBy = 'createdAt',
    defaultSortOrder = 'desc',
  } = options

  const queryClient = useQueryClient()

  // State
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [sortBy, setSortBy] = useState(defaultSortBy)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Debounced search
  const debouncedSearch = useDebounce(search, 300)

  // Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['${moduleName}', 'list', page, pageSize, sortBy, sortOrder, debouncedSearch, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortOrder,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '' && v != null)
        ),
      })
      
      const res = await fetch(\`/api/${moduleName}?\${params}\`)
      if (!res.ok) throw new Error('Failed to fetch data')
      return res.json()
    },
  })

  // Computed
  const totalPages = Math.ceil((data?.total || 0) / pageSize)

  // Actions
  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage)
    setSelectedIds([])
  }, [])

  const handleSetPageSize = useCallback((newSize: number) => {
    setPageSize(newSize)
    setPage(1)
    setSelectedIds([])
  }, [])

  const handleSetSort = useCallback((by: string, order: 'asc' | 'desc') => {
    setSortBy(by)
    setSortOrder(order)
    setPage(1)
  }, [])

  const handleSetSearch = useCallback((newSearch: string) => {
    setSearch(newSearch)
    setPage(1)
  }, [])

  const handleSetFilters = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters)
    setPage(1)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
    setSearch('')
    setPage(1)
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    )
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (data?.data) {
      const allIds = data.data.map((item: any) => item.id)
      setSelectedIds(prev => 
        prev.length === allIds.length ? [] : allIds
      )
    }
  }, [data?.data])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
  }, [])

  const isSelected = useCallback((id: string) => {
    return selectedIds.includes(id)
  }, [selectedIds])

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['${moduleName}'] })
  }, [queryClient])

  return {
    data: data?.data || [],
    total: data?.total || 0,
    isLoading,
    error: error as Error | null,

    page,
    pageSize,
    totalPages,
    setPage: handleSetPage,
    setPageSize: handleSetPageSize,
    nextPage: () => handleSetPage(Math.min(page + 1, totalPages)),
    prevPage: () => handleSetPage(Math.max(page - 1, 1)),

    sortBy,
    sortOrder,
    setSort: handleSetSort,

    search,
    debouncedSearch,
    setSearch: handleSetSearch,

    filters,
    setFilters: handleSetFilters,
    clearFilters,

    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isSelected,

    refresh,
  }
}
`,
      type: 'hook',
      description: `Advanced data table hook for ${moduleName}`
    }
  }

  generateUseDebounce(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/hooks/use${entityName}Debounce.ts`,
      content: `'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// =============================================================================
// ${entityName} Debounce Hook
// =============================================================================

/**
 * Debounces a value by the specified delay
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Debounces a callback function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  ) as T

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * Returns debounced state and a function to update it immediately
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue)
  const [immediateValue, setImmediateValue] = useState<T>(initialValue)

  const setDebounced = useCallback((newValue: T) => {
    setImmediateValue(newValue)
  }, [])

  const setImmediate = useCallback((newValue: T) => {
    setImmediateValue(newValue)
    setValue(newValue)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setValue(immediateValue)
    }, delay)

    return () => clearTimeout(timer)
  }, [immediateValue, delay])

  return [value, immediateValue, setDebounced, setImmediate]
}
`,
      type: 'hook',
      description: `Debounce hooks for ${moduleName}`
    }
  }

  generateUseLocalStorage(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/hooks/use${entityName}LocalStorage.ts`,
      content: `'use client'

import { useState, useEffect, useCallback } from 'react'

// =============================================================================
// ${entityName} Local Storage Hook
// =============================================================================

/**
 * Persists state to localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(\`Error reading localStorage key "\${key}":\`, error)
      return initialValue
    }
  })

  // Update localStorage when state changes
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(\`Error setting localStorage key "\${key}":\`, error)
    }
  }, [key, storedValue])

  // Remove from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.error(\`Error removing localStorage key "\${key}":\`, error)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}

/**
 * Hook for storing table preferences (column visibility, sort, etc.)
 */
export function useTablePreferences<T extends Record<string, any>>(
  tableKey: string,
  defaultPreferences: T
): [T, (prefs: Partial<T>) => void, () => void] {
  const [preferences, setPreferences] = useLocalStorage<T>(
    \`table-preferences-\${tableKey}\`,
    defaultPreferences
  )

  const updatePreferences = useCallback((newPrefs: Partial<T>) => {
    setPreferences((prev) => ({ ...prev, ...newPrefs }))
  }, [setPreferences])

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences)
  }, [setPreferences, defaultPreferences])

  return [preferences, updatePreferences, resetPreferences]
}
`,
      type: 'hook',
      description: `LocalStorage hooks for ${moduleName}`
    }
  }

  generateUseCopyToClipboard(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/hooks/use${entityName}CopyToClipboard.ts`,
      content: `'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

// =============================================================================
// ${entityName} Copy to Clipboard Hook
// =============================================================================

interface UseCopyToClipboardReturn {
  copiedText: string | null
  copy: (text: string) => Promise<boolean>
  copyMultiple: (items: { label: string; value: string }[]) => Promise<boolean>
  clearCopied: () => void
}

export function useCopyToClipboard(): UseCopyToClipboardReturn {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      toast.success('Copied to clipboard')
      return true
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('Failed to copy to clipboard')
      return false
    }
  }, [])

  const copyMultiple = useCallback(async (
    items: { label: string; value: string }[]
  ): Promise<boolean> => {
    try {
      const text = items.map(item => \`\${item.label}: \${item.value}\`).join('\\n')
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      toast.success(\`Copied \${items.length} items to clipboard\`)
      return true
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('Failed to copy to clipboard')
      return false
    }
  }, [])

  const clearCopied = useCallback(() => {
    setCopiedText(null)
  }, [])

  return { copiedText, copy, copyMultiple, clearCopied }
}
`,
      type: 'hook',
      description: `Copy to clipboard hook for ${moduleName}`
    }
  }

  generateUsePagination(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/hooks/use${entityName}Pagination.ts`,
      content: `'use client'

import { useState, useCallback, useMemo } from 'react'

// =============================================================================
// ${entityName} Pagination Hook
// =============================================================================

interface UsePaginationOptions {
  totalItems: number
  pageSize?: number
  initialPage?: number
  maxPageButtons?: number
}

interface UsePaginationReturn {
  page: number
  pageSize: number
  totalPages: number
  startItem: number
  endItem: number
  hasNext: boolean
  hasPrev: boolean
  setPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  firstPage: () => void
  lastPage: () => void
  setPageSize: (size: number) => void
  pageNumbers: number[]
  pageInfo: string
}

export function usePagination(options: UsePaginationOptions): UsePaginationReturn {
  const {
    totalItems,
    pageSize: initialPageSize = 20,
    initialPage = 1,
    maxPageButtons = 5,
  } = options

  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  const totalPages = Math.ceil(totalItems / pageSize)
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  const setPageHandler = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages || 1)))
  }, [totalPages])

  const nextPage = useCallback(() => {
    if (hasNext) setPageHandler(page + 1)
  }, [page, hasNext, setPageHandler])

  const prevPage = useCallback(() => {
    if (hasPrev) setPageHandler(page - 1)
  }, [page, hasPrev, setPageHandler])

  const firstPage = useCallback(() => {
    setPageHandler(1)
  }, [setPageHandler])

  const lastPage = useCallback(() => {
    setPageHandler(totalPages)
  }, [totalPages, setPageHandler])

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize)
    setPage(1) // Reset to first page when changing page size
  }, [])

  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages: number[] = []
    const half = Math.floor(maxPageButtons / 2)
    
    let start = Math.max(1, page - half)
    const end = Math.min(totalPages, start + maxPageButtons - 1)
    
    if (end - start + 1 < maxPageButtons) {
      start = Math.max(1, end - maxPageButtons + 1)
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    return pages
  }, [page, totalPages, maxPageButtons])

  const pageInfo = useMemo(() => {
    if (totalItems === 0) return 'No items'
    return \`Showing \${startItem} to \${endItem} of \${totalItems}\`
  }, [startItem, endItem, totalItems])

  return {
    page,
    pageSize,
    totalPages,
    startItem,
    endItem,
    hasNext,
    hasPrev,
    setPage: setPageHandler,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    setPageSize,
    pageNumbers,
    pageInfo,
  }
}
`,
      type: 'hook',
      description: `Pagination hook for ${moduleName}`
    }
  }

  generateUseInfiniteScroll(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/hooks/use${entityName}InfiniteScroll.ts`,
      content: `'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

// =============================================================================
// ${entityName} Infinite Scroll Hook
// =============================================================================

interface UseInfiniteScrollOptions {
  pageSize?: number
  threshold?: number
}

interface UseInfiniteScrollReturn<T> {
  data: T[]
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean | undefined
  error: Error | null
  fetchNextPage: () => void
  refetch: () => void
  observerRef: (node: HTMLElement | null) => void
}

export function useInfiniteScroll<T>(
  queryKey: string,
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean }>,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn<T> {
  const { pageSize = 20, threshold = 100 } = options

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: [queryKey],
    queryFn: async ({ pageParam = 1 }) => {
      return fetchFn(pageParam, pageSize)
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length + 1 : undefined
    },
    initialPageParam: 1,
  })

  // Flatten pages into single array
  const flatData = data?.pages.flatMap(page => page.data) || []

  // Intersection observer for infinite scroll
  const observer = useRef<IntersectionObserver | null>(null)
  
  const observerRef = useCallback((node: HTMLElement | null) => {
    if (isFetchingNextPage) return

    if (observer.current) {
      observer.current.disconnect()
    }

    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: \`\${threshold}px\` }
    )

    if (node) {
      observer.current.observe(node)
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage, threshold])

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [])

  return {
    data: flatData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error: error as Error | null,
    fetchNextPage,
    refetch,
    observerRef,
  }
}
`,
      type: 'hook',
      description: `Infinite scroll hook for ${moduleName}`
    }
  }

  generateUseExport(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/hooks/use${entityName}Export.ts`,
      content: `'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

// =============================================================================
// ${entityName} Export Hook
// =============================================================================

interface UseExportReturn {
  isExporting: boolean
  exportToCSV: (filters?: Record<string, any>, fields?: string[]) => Promise<void>
  exportToJSON: (filters?: Record<string, any>, fields?: string[]) => Promise<void>
  exportToXLSX: (filters?: Record<string, any>, fields?: string[]) => Promise<void>
  downloadFile: (data: Blob, filename: string) => void
}

export function use${entityName}Export(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false)

  const downloadFile = useCallback((data: Blob, filename: string) => {
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const fetchData = useCallback(async (
    format: 'csv' | 'json' | 'xlsx',
    filters?: Record<string, any>,
    fields?: string[]
  ): Promise<Blob> => {
    const params = new URLSearchParams({
      format,
      ...(filters && Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '' && v != null)
      )),
      ...(fields && { fields: fields.join(',') }),
    })

    const res = await fetch(\`/api/${moduleName}/export?\${params}\`)
    if (!res.ok) throw new Error('Export failed')
    return res.blob()
  }, [])

  const exportToCSV = useCallback(async (
    filters?: Record<string, any>,
    fields?: string[]
  ) => {
    setIsExporting(true)
    try {
      const blob = await fetchData('csv', filters, fields)
      downloadFile(blob, \`${moduleName}_export_\${Date.now()}.csv\`)
      toast.success('Export complete')
    } catch (error) {
      toast.error('Export failed')
      console.error(error)
    } finally {
      setIsExporting(false)
    }
  }, [fetchData, downloadFile])

  const exportToJSON = useCallback(async (
    filters?: Record<string, any>,
    fields?: string[]
  ) => {
    setIsExporting(true)
    try {
      const blob = await fetchData('json', filters, fields)
      downloadFile(blob, \`${moduleName}_export_\${Date.now()}.json\`)
      toast.success('Export complete')
    } catch (error) {
      toast.error('Export failed')
      console.error(error)
    } finally {
      setIsExporting(false)
    }
  }, [fetchData, downloadFile])

  const exportToXLSX = useCallback(async (
    filters?: Record<string, any>,
    fields?: string[]
  ) => {
    setIsExporting(true)
    try {
      const blob = await fetchData('xlsx', filters, fields)
      downloadFile(blob, \`${moduleName}_export_\${Date.now()}.xlsx\`)
      toast.success('Export complete')
    } catch (error) {
      toast.error('Export failed')
      console.error(error)
    } finally {
      setIsExporting(false)
    }
  }, [fetchData, downloadFile])

  return {
    isExporting,
    exportToCSV,
    exportToJSON,
    exportToXLSX,
    downloadFile,
  }
}
`,
      type: 'hook',
      description: `Export hook for ${moduleName}`
    }
  }

  generateUseBulkOperations(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/hooks/use${entityName}BulkOperations.ts`,
      content: `'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// =============================================================================
// ${entityName} Bulk Operations Hook
// =============================================================================

interface BulkResult {
  success: number
  failed: number
  errors: { id: string; error: string }[]
}

interface UseBulkOperationsReturn {
  isLoading: boolean
  lastResult: BulkResult | null
  bulkDelete: (ids: string[]) => Promise<BulkResult>
  bulkArchive: (ids: string[]) => Promise<BulkResult>
  bulkRestore: (ids: string[]) => Promise<BulkResult>
  bulkUpdate: (ids: string[], data: Record<string, any>) => Promise<BulkResult>
  bulkExport: (ids: string[]) => Promise<void>
  clearResult: () => void
}

async function bulkOperation(
  action: string,
  ids: string[],
  data?: Record<string, any>
): Promise<BulkResult> {
  const res = await fetch('/api/${moduleName}/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ids, data }),
  })
  if (!res.ok) throw new Error('Bulk operation failed')
  return res.json()
}

export function use${entityName}BulkOperations(): UseBulkOperationsReturn {
  const queryClient = useQueryClient()
  const [lastResult, setLastResult] = useState<BulkResult | null>(null)

  const mutation = useMutation({
    mutationFn: ({ action, ids, data }: { 
      action: string; 
      ids: string[]; 
      data?: Record<string, any> 
    }) => bulkOperation(action, ids, data),
    onSuccess: (result) => {
      setLastResult(result)
      queryClient.invalidateQueries({ queryKey: ['${moduleName}'] })
      
      if (result.failed > 0) {
        toast.warning(\`\${result.success} succeeded, \${result.failed} failed\`)
      } else {
        toast.success(\`\${result.success} items processed successfully\`)
      }
    },
    onError: (error) => {
      toast.error('Bulk operation failed')
      console.error(error)
    },
  })

  const bulkDelete = useCallback(async (ids: string[]): Promise<BulkResult> => {
    return mutation.mutateAsync({ action: 'delete', ids })
  }, [mutation])

  const bulkArchive = useCallback(async (ids: string[]): Promise<BulkResult> => {
    return mutation.mutateAsync({ action: 'archive', ids })
  }, [mutation])

  const bulkRestore = useCallback(async (ids: string[]): Promise<BulkResult> => {
    return mutation.mutateAsync({ action: 'restore', ids })
  }, [mutation])

  const bulkUpdate = useCallback(async (
    ids: string[], 
    data: Record<string, any>
  ): Promise<BulkResult> => {
    return mutation.mutateAsync({ action: 'update', ids, data })
  }, [mutation])

  const bulkExport = useCallback(async (ids: string[]): Promise<void> => {
    try {
      const res = await fetch('/api/${moduleName}/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Export failed')
      
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = \`${moduleName}_export_\${Date.now()}.csv\`
      a.click()
      URL.revokeObjectURL(url)
      
      toast.success('Export complete')
    } catch (error) {
      toast.error('Export failed')
      console.error(error)
    }
  }, [])

  const clearResult = useCallback(() => {
    setLastResult(null)
  }, [])

  return {
    isLoading: mutation.isPending,
    lastResult,
    bulkDelete,
    bulkArchive,
    bulkRestore,
    bulkUpdate,
    bulkExport,
    clearResult,
  }
}
`,
      type: 'hook',
      description: `Bulk operations hook for ${moduleName}`
    }
  }

  // ===========================================================================
  // ADVANCED API GENERATION
  // ===========================================================================

  generateBulkAPI(): GeneratedCodeFile {
    const { moduleName, tableName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `app/api/${moduleName}/bulk/route.ts`,
      content: `import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'

// =============================================================================
// ${entityName} Bulk Operations API
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ids, data } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs required' }, { status: 400 })
    }

    const userId = (session.user as any).id
    let result = { success: 0, failed: 0, errors: [] as any[] }

    switch (action) {
      case 'delete':
        for (const id of ids) {
          try {
            await prisma.${tableName}.delete({ where: { id } })
            result.success++
          } catch (error: any) {
            result.failed++
            result.errors.push({ id, error: error.message })
          }
        }
        break

      case 'archive':
        for (const id of ids) {
          try {
            await prisma.${tableName}.update({
              where: { id },
              data: { deletedAt: new Date(), deletedBy: userId },
            })
            result.success++
          } catch (error: any) {
            result.failed++
            result.errors.push({ id, error: error.message })
          }
        }
        break

      case 'restore':
        for (const id of ids) {
          try {
            await prisma.${tableName}.update({
              where: { id },
              data: { deletedAt: null, deletedBy: null },
            })
            result.success++
          } catch (error: any) {
            result.failed++
            result.errors.push({ id, error: error.message })
          }
        }
        break

      case 'update':
        if (!data) {
          return NextResponse.json({ error: 'Data required for update' }, { status: 400 })
        }
        for (const id of ids) {
          try {
            await prisma.${tableName}.update({
              where: { id },
              data: { ...data, updatedBy: userId, updatedAt: new Date() },
            })
            result.success++
          } catch (error: any) {
            result.failed++
            result.errors.push({ id, error: error.message })
          }
        }
        break

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`,
      type: 'api',
      description: `Bulk operations API for ${moduleName}`
    }
  }

  generateSearchAPI(): GeneratedCodeFile {
    const { moduleName, tableName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `app/api/${moduleName}/search/route.ts`,
      content: `import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// =============================================================================
// ${entityName} Search API
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || searchParams.get('query') || ''
    const limit = parseInt(searchParams.get('limit') || '10')
    const fields = searchParams.get('fields')?.split(',') || ['name', 'title']

    if (!query) {
      return NextResponse.json({ results: [] })
    }

    // Build search conditions
    const searchConditions = fields.map(field => ({
      [field]: {
        contains: query,
        mode: 'insensitive' as const,
      },
    }))

    const results = await prisma.${tableName}.findMany({
      where: {
        OR: searchConditions,
      },
      take: limit,
      select: {
        id: true,
${this.fields.slice(0, 3).map(f => `        ${f.name}: true,`).join('\n')}
      },
    })

    return NextResponse.json({ results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Autocomplete endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, field = 'name', limit = 10 } = body

    if (!query) {
      return NextResponse.json({ suggestions: [] })
    }

    const results = await prisma.${tableName}.findMany({
      where: {
        [field]: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: limit,
      distinct: [field],
      select: {
        id: true,
        [field]: true,
      },
    })

    return NextResponse.json({
      suggestions: results.map((r: any) => ({
        id: r.id,
        value: r[field],
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`,
      type: 'api',
      description: `Search API for ${moduleName}`
    }
  }

  generateExportAPI(): GeneratedCodeFile {
    const { moduleName, tableName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `app/api/${moduleName}/export/route.ts`,
      content: `import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// =============================================================================
// ${entityName} Export API
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'csv'
    const fields = searchParams.get('fields')?.split(',')

    // Build filters from query params
    const filters: any = {}
    if (searchParams.get('createdAfter')) {
      filters.createdAt = { gte: new Date(searchParams.get('createdAfter')!) }
    }
    if (searchParams.get('createdBefore')) {
      filters.createdAt = { ...filters.createdAt, lte: new Date(searchParams.get('createdBefore')!) }
    }

    // Fetch data
    const data = await prisma.${tableName}.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
    })

    // Filter fields if specified
    const exportData = fields 
      ? data.map(item => {
          const filtered: any = {}
          fields.forEach(f => { filtered[f] = item[f] })
          return filtered
        })
      : data

    // Format output
    switch (format) {
      case 'json':
        return new NextResponse(JSON.stringify(exportData, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': \`attachment; filename="${moduleName}_export.json"\`,
          },
        })

      case 'csv':
      case 'xlsx':
      default:
        if (exportData.length === 0) {
          return new NextResponse('No data to export', { status: 400 })
        }
        
        const headers = Object.keys(exportData[0])
        const csvContent = [
          headers.join(','),
          ...exportData.map(item => 
            headers.map(h => {
              const value = item[h]
              if (value == null) return ''
              if (typeof value === 'string' && value.includes(',')) return \`"\${value}"\`
              return String(value)
            }).join(',')
          ),
        ].join('\\n')

        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': \`attachment; filename="${moduleName}_export.csv"\`,
          },
        })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, format = 'csv', fields } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs required' }, { status: 400 })
    }

    // Fetch specific records
    const data = await prisma.${tableName}.findMany({
      where: { id: { in: ids } },
    })

    // Filter fields if specified
    const exportData = fields 
      ? data.map(item => {
          const filtered: any = {}
          fields.forEach((f: string) => { filtered[f] = item[f] })
          return filtered
        })
      : data

    // Generate CSV
    if (exportData.length === 0) {
      return new NextResponse('No data to export', { status: 400 })
    }

    const headers = Object.keys(exportData[0])
    const csvContent = [
      headers.join(','),
      ...exportData.map(item => 
        headers.map(h => {
          const value = item[h]
          if (value == null) return ''
          if (typeof value === 'string' && value.includes(',')) return \`"\${value}"\`
          return String(value)
        }).join(',')
      ),
    ].join('\\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': \`attachment; filename="${moduleName}_export.csv"\`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`,
      type: 'api',
      description: `Export API for ${moduleName}`
    }
  }

  generateWebhookHandler(): GeneratedCodeFile {
    const { moduleName } = this.options
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `app/api/${moduleName}/webhook/route.ts`,
      content: `import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { headers } from 'next/headers'

// =============================================================================
// ${entityName} Webhook Handler
// =============================================================================

// Verify webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  // Implement signature verification (e.g., HMAC-SHA256)
  // This is a placeholder - implement based on your webhook provider
  return true
}

export async function POST(request: NextRequest) {
  try {
    const headersList = headers()
    const signature = headersList.get('x-webhook-signature') || ''
    const payload = await request.text()

    // Verify webhook signature (optional)
    // const secret = process.env.WEBHOOK_SECRET
    // if (!verifySignature(payload, signature, secret)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    const body = JSON.parse(payload)
    const { event, data } = body

    // Log webhook receipt
    await prisma.webhookLog.create({
      data: {
        module: '${moduleName}',
        event,
        payload: body,
        processedAt: new Date(),
      },
    }).catch(() => {}) // Ignore log errors

    // Handle different webhook events
    switch (event) {
      case 'created':
        // Handle creation event
        console.log(\`${entityName} created:\`, data.id)
        break

      case 'updated':
        // Handle update event
        console.log(\`${entityName} updated:\`, data.id)
        break

      case 'deleted':
        // Handle deletion event
        console.log(\`${entityName} deleted:\`, data.id)
        break

      default:
        console.log(\`Unknown webhook event: \${event}\`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Webhook registration endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, events, secret } = body

    // Store webhook configuration
    const webhook = await prisma.webhookConfig.create({
      data: {
        module: '${moduleName}',
        url,
        events: events || ['created', 'updated', 'deleted'],
        secret,
        active: true,
      },
    })

    return NextResponse.json({ webhook })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// List webhooks
export async function GET(request: NextRequest) {
  try {
    const webhooks = await prisma.webhookConfig.findMany({
      where: { module: '${moduleName}' },
    })

    return NextResponse.json({ webhooks })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`,
      type: 'api',
      description: `Webhook handler for ${moduleName}`
    }
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('')
  }

  private getZodSchema(field: ParsedFormField, optional: boolean = false): string {
    let schema = 'z.string()'

    switch (field.inputType) {
      case 'number_input':
      case 'currency_input':
        schema = 'z.coerce.number()'
        break
      case 'checkbox':
        schema = 'z.boolean()'
        break
      case 'date_picker':
      case 'datetime_picker':
        schema = 'z.coerce.date()'
        break
      case 'email_input':
        schema = 'z.string().email()'
        break
      default:
        schema = 'z.string()'
    }

    if (!field.isRequired || optional) {
      schema += '.optional()'
    }

    return schema
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createAdvancedCodeGenerator(
  options: AdvancedGeneratorOptions,
  fields: ParsedFormField[] = [],
  columns: ColumnDef[] = []
): AdvancedCodeGenerator {
  return new AdvancedCodeGenerator(options, fields, columns)
}
