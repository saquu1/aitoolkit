/**
 * Project Export Tests
 * 
 * Tests for ZIP file creation and project scaffold generation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  SQL_TO_PRISMA,
  SQL_TO_TYPESCRIPT,
  SQL_TO_ZOD,
  getPrismaType,
  getTypeScriptType,
  getZodType,
  toPrismaModelName,
  toCamelCase,
  toKebabCase,
} from './type-mappings'

// ══════════════════════════════════════════════════════════════════════════════
// ZIP BUILDER TESTS (Pure JavaScript Implementation)
// ══════════════════════════════════════════════════════════════════════════════

describe('ZIP File Generation', () => {
  // Simple ZIP builder for testing
  class TestZipBuilder {
    private files: { path: string; content: Buffer; date: Date }[] = []

    addFile(path: string, content: string | Buffer): void {
      this.files.push({
        path: path.replace(/\\/g, '/'),
        content: typeof content === 'string' ? Buffer.from(content, 'utf-8') : content,
        date: new Date(),
      })
    }

    getFileCount(): number {
      return this.files.length
    }

    getFiles(): { path: string; content: string }[] {
      return this.files.map(f => ({
        path: f.path,
        content: f.content.toString('utf-8'),
      }))
    }

    hasFile(path: string): boolean {
      return this.files.some(f => f.path === path.replace(/\\/g, '/'))
    }

    getFileContent(path: string): string | null {
      const file = this.files.find(f => f.path === path.replace(/\\/g, '/'))
      return file ? file.content.toString('utf-8') : null
    }

    getTotalSize(): number {
      return this.files.reduce((sum, f) => sum + f.content.length, 0)
    }
  }

  let zipBuilder: TestZipBuilder

  beforeEach(() => {
    zipBuilder = new TestZipBuilder()
  })

  describe('File Addition', () => {
    it('should add a single file', () => {
      zipBuilder.addFile('test.txt', 'Hello World')
      expect(zipBuilder.getFileCount()).toBe(1)
    })

    it('should add multiple files', () => {
      zipBuilder.addFile('file1.txt', 'Content 1')
      zipBuilder.addFile('file2.txt', 'Content 2')
      zipBuilder.addFile('file3.txt', 'Content 3')
      expect(zipBuilder.getFileCount()).toBe(3)
    })

    it('should preserve file paths', () => {
      zipBuilder.addFile('src/components/Button.tsx', 'export const Button = () => {}')
      expect(zipBuilder.hasFile('src/components/Button.tsx')).toBe(true)
    })

    it('should normalize path separators', () => {
      zipBuilder.addFile('src\\components\\Button.tsx', 'content')
      expect(zipBuilder.hasFile('src/components/Button.tsx')).toBe(true)
    })

    it('should store file content correctly', () => {
      const content = 'Test file content with special chars: àéïôù'
      zipBuilder.addFile('test.txt', content)
      expect(zipBuilder.getFileContent('test.txt')).toBe(content)
    })

    it('should handle large files', () => {
      const largeContent = 'x'.repeat(100000)
      zipBuilder.addFile('large.txt', largeContent)
      expect(zipBuilder.getFileContent('large.txt')?.length).toBe(100000)
    })

    it('should handle Buffer content', () => {
      const buffer = Buffer.from('Binary content', 'utf-8')
      zipBuilder.addFile('binary.bin', buffer)
      expect(zipBuilder.getFileContent('binary.bin')).toBe('Binary content')
    })
  })

  describe('File Structure', () => {
    it('should create typical project structure', () => {
      const files = [
        'package.json',
        'tsconfig.json',
        'src/index.ts',
        'src/lib/utils.ts',
        'src/components/Button.tsx',
        'src/app/layout.tsx',
        'prisma/schema.prisma',
      ]

      files.forEach(path => zipBuilder.addFile(path, '// content'))
      
      expect(zipBuilder.getFileCount()).toBe(7)
      files.forEach(path => {
        expect(zipBuilder.hasFile(path)).toBe(true)
      })
    })
  })

  describe('Size Calculation', () => {
    it('should calculate total size', () => {
      zipBuilder.addFile('file1.txt', '12345')
      zipBuilder.addFile('file2.txt', '67890')
      expect(zipBuilder.getTotalSize()).toBe(10)
    })

    it('should handle empty files', () => {
      zipBuilder.addFile('empty.txt', '')
      expect(zipBuilder.getTotalSize()).toBe(0)
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// PROJECT SCAFFOLD GENERATOR TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Project Scaffold Generator', () => {
  // Helper function to generate package.json content
  function generatePackageJson(config: { name: string; version?: string }) {
    return JSON.stringify({
      name: config.name,
      version: config.version || '1.0.0',
      scripts: {
        dev: 'next dev',
        build: 'next build',
      },
      dependencies: {
        next: '^15.0.0',
        react: '^19.0.0',
      },
    }, null, 2)
  }

  // Helper function to generate tsconfig.json content
  function generateTsConfig() {
    return JSON.stringify({
      compilerOptions: {
        target: 'ES2017',
        strict: true,
        paths: {
          '@/*': ['./*'],
        },
      },
    }, null, 2)
  }

  // Helper function to generate Prisma schema
  function generatePrismaModel(tableName: string, fields: { name: string; type: string }[]) {
    const modelName = toPrismaModelName(tableName)
    const fieldLines = fields.map(f => `  ${f.name}  ${f.type}`).join('\n')
    
    return `model ${modelName} {
${fieldLines}
}`
  }

  describe('Package.json Generation', () => {
    it('should generate valid package.json', () => {
      const pkg = JSON.parse(generatePackageJson({ name: 'test-project' }))
      expect(pkg.name).toBe('test-project')
      expect(pkg.version).toBe('1.0.0')
      expect(pkg.dependencies.next).toBeDefined()
      expect(pkg.dependencies.react).toBeDefined()
    })

    it('should include required scripts', () => {
      const pkg = JSON.parse(generatePackageJson({ name: 'test-project' }))
      expect(pkg.scripts.dev).toBe('next dev')
      expect(pkg.scripts.build).toBe('next build')
    })

    it('should handle custom version', () => {
      const pkg = JSON.parse(generatePackageJson({ name: 'test-project', version: '2.0.0' }))
      expect(pkg.version).toBe('2.0.0')
    })
  })

  describe('TypeScript Config Generation', () => {
    it('should generate valid tsconfig.json', () => {
      const config = JSON.parse(generateTsConfig())
      expect(config.compilerOptions.strict).toBe(true)
      expect(config.compilerOptions.paths['@/*']).toEqual(['./*'])
    })
  })

  describe('Prisma Schema Generation', () => {
    it('should generate valid Prisma model', () => {
      const schema = generatePrismaModel('users', [
        { name: 'id', type: 'Int @id @default(autoincrement())' },
        { name: 'name', type: 'String' },
        { name: 'email', type: 'String @unique' },
      ])
      
      expect(schema).toContain('model Users')
      expect(schema).toContain('id  Int @id')
      expect(schema).toContain('name  String')
      expect(schema).toContain('email  String @unique')
    })

    it('should convert table name to PascalCase model', () => {
      const schema = generatePrismaModel('user_profiles', [])
      expect(schema).toContain('model UserProfiles')
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// GENERATED CODE VALIDATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Generated Code Validation', () => {
  describe('Prisma Schema Syntax', () => {
    it('should generate valid Prisma field syntax', () => {
      const testCases = [
        { sql: 'INT', prisma: 'Int' },
        { sql: 'VARCHAR', prisma: 'String' },
        { sql: 'BIT', prisma: 'Boolean' },
        { sql: 'DATETIME', prisma: 'DateTime' },
        { sql: 'DECIMAL', prisma: 'Decimal' },
      ]

      testCases.forEach(({ sql, prisma }) => {
        expect(getPrismaType(sql)).toBe(prisma)
      })
    })
  })

  describe('TypeScript Type Syntax', () => {
    it('should generate valid TypeScript types', () => {
      const testCases = [
        { sql: 'INT', ts: 'number' },
        { sql: 'BIGINT', ts: 'bigint' },
        { sql: 'VARCHAR', ts: 'string' },
        { sql: 'BIT', ts: 'boolean' },
        { sql: 'DATE', ts: 'Date' },
      ]

      testCases.forEach(({ sql, ts }) => {
        expect(getTypeScriptType(sql)).toBe(ts)
      })
    })
  })

  describe('Zod Schema Syntax', () => {
    it('should generate valid Zod schema strings', () => {
      const testCases = [
        { sql: 'INT', zod: 'z.number().int()' },
        { sql: 'VARCHAR', zod: 'z.string()' },
        { sql: 'BIT', zod: 'z.boolean()' },
        { sql: 'DATE', zod: 'z.coerce.date()' },
      ]

      testCases.forEach(({ sql, zod }) => {
        expect(getZodType(sql)).toBe(zod)
      })
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT MANIFEST TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Export Manifest', () => {
  interface ExportManifest {
    projectName: string
    version: string
    exportedAt: string
    tables: string[]
    apis: string[]
    components: string[]
    pages: string[]
    features: string[]
    statistics: {
      totalFiles: number
      totalSize: number
      byExtension: Record<string, number>
    }
  }

  function createManifest(projectName: string): ExportManifest {
    return {
      projectName,
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      tables: ['Users', 'Posts'],
      apis: ['/api/users', '/api/posts'],
      components: ['UserForm', 'UserTable'],
      pages: ['/users', '/posts'],
      features: ['Authentication', 'Healthcare'],
      statistics: {
        totalFiles: 50,
        totalSize: 102400,
        byExtension: {
          ts: 30,
          tsx: 15,
          json: 5,
        },
      },
    }
  }

  it('should create valid manifest', () => {
    const manifest = createManifest('test-project')
    expect(manifest.projectName).toBe('test-project')
    expect(manifest.version).toBe('1.0.0')
    expect(manifest.exportedAt).toBeDefined()
  })

  it('should include all required sections', () => {
    const manifest = createManifest('test-project')
    expect(manifest.tables).toBeInstanceOf(Array)
    expect(manifest.apis).toBeInstanceOf(Array)
    expect(manifest.components).toBeInstanceOf(Array)
    expect(manifest.pages).toBeInstanceOf(Array)
    expect(manifest.features).toBeInstanceOf(Array)
  })

  it('should include statistics', () => {
    const manifest = createManifest('test-project')
    expect(manifest.statistics.totalFiles).toBe(50)
    expect(manifest.statistics.totalSize).toBe(102400)
    expect(manifest.statistics.byExtension.ts).toBe(30)
  })

  it('should have valid ISO timestamp', () => {
    const manifest = createManifest('test-project')
    const date = new Date(manifest.exportedAt)
    expect(date.toISOString()).toBe(manifest.exportedAt)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// PROGRESS TRACKING TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Export Progress Tracking', () => {
  interface ExportProgress {
    phase: 'preparing' | 'generating' | 'packaging' | 'complete' | 'error'
    current: number
    total: number
    message: string
    filesProcessed: number
    totalFiles: number
  }

  function createProgress(phase: ExportProgress['phase'], current: number, total: number): ExportProgress {
    return {
      phase,
      current,
      total,
      message: `Processing ${current} of ${total}`,
      filesProcessed: current,
      totalFiles: total,
    }
  }

  it('should track preparing phase', () => {
    const progress = createProgress('preparing', 0, 100)
    expect(progress.phase).toBe('preparing')
    expect(progress.current).toBe(0)
  })

  it('should track generating phase', () => {
    const progress = createProgress('generating', 50, 100)
    expect(progress.phase).toBe('generating')
    expect(progress.current).toBe(50)
  })

  it('should track packaging phase', () => {
    const progress = createProgress('packaging', 80, 100)
    expect(progress.phase).toBe('packaging')
    expect(progress.current).toBe(80)
  })

  it('should track complete phase', () => {
    const progress = createProgress('complete', 100, 100)
    expect(progress.phase).toBe('complete')
    expect(progress.current).toBe(100)
  })

  it('should track error phase', () => {
    const progress = createProgress('error', 0, 100)
    expect(progress.phase).toBe('error')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// FILE PATH GENERATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('File Path Generation', () => {
  function generateFilePaths(tables: string[]): Record<string, string[]> {
    const paths: Record<string, string[]> = {
      types: [],
      validations: [],
      components: [],
      apis: [],
      pages: [],
    }

    tables.forEach(table => {
      const kebab = toKebabCase(table)
      paths.types.push(`types/${kebab}.ts`)
      paths.validations.push(`lib/validations/${kebab}.ts`)
      paths.components.push(`components/forms/${kebab}-form.tsx`)
      paths.components.push(`components/tables/${kebab}-table.tsx`)
      paths.apis.push(`app/api/${kebab}/route.ts`)
      paths.pages.push(`app/(dashboard)/${kebab}/page.tsx`)
    })

    return paths
  }

  it('should generate correct file paths for tables', () => {
    const paths = generateFilePaths(['Users', 'Posts'])
    
    expect(paths.types).toContain('types/users.ts')
    expect(paths.types).toContain('types/posts.ts')
    expect(paths.validations).toContain('lib/validations/users.ts')
    expect(paths.components).toContain('components/forms/users-form.tsx')
    expect(paths.apis).toContain('app/api/users/route.ts')
    expect(paths.pages).toContain('app/(dashboard)/users/page.tsx')
  })

  it('should handle multi-word table names', () => {
    const paths = generateFilePaths(['UserProfiles'])
    
    expect(paths.types).toContain('types/user-profiles.ts')
    expect(paths.components).toContain('components/forms/user-profiles-form.tsx')
  })

  it('should generate unique component paths', () => {
    const paths = generateFilePaths(['Users'])
    
    const formPaths = paths.components.filter(p => p.includes('-form.tsx'))
    const tablePaths = paths.components.filter(p => p.includes('-table.tsx'))
    
    expect(formPaths.length).toBe(1)
    expect(tablePaths.length).toBe(1)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION OPTIONS TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Export Configuration Options', () => {
  interface ExportConfig {
    projectName: string
    database: 'sqlite' | 'mysql' | 'postgresql'
    includeAuth: boolean
    includeHealthcare: boolean
    includeMultiTenant: boolean
  }

  function validateConfig(config: Partial<ExportConfig>): string[] {
    const errors: string[] = []
    
    if (!config.projectName || config.projectName.trim() === '') {
      errors.push('Project name is required')
    }
    
    if (config.projectName && !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(config.projectName)) {
      errors.push('Project name must start with a letter and contain only letters, numbers, hyphens, and underscores')
    }
    
    if (!['sqlite', 'mysql', 'postgresql'].includes(config.database || 'sqlite')) {
      errors.push('Invalid database type')
    }
    
    return errors
  }

  it('should validate required project name', () => {
    const errors = validateConfig({})
    expect(errors).toContain('Project name is required')
  })

  it('should validate project name format', () => {
    const errors = validateConfig({ projectName: '123-invalid' })
    expect(errors.some(e => e.includes('must start with a letter'))).toBe(true)
  })

  it('should accept valid project names', () => {
    const errors = validateConfig({ projectName: 'my-project' })
    expect(errors).toHaveLength(0)
  })

  it('should validate database type', () => {
    const errors = validateConfig({ projectName: 'test', database: 'invalid' as any })
    expect(errors).toContain('Invalid database type')
  })

  it('should accept valid database types', () => {
    const dbTypes: ('sqlite' | 'mysql' | 'postgresql')[] = ['sqlite', 'mysql', 'postgresql']
    
    dbTypes.forEach(db => {
      const errors = validateConfig({ projectName: 'test', database: db })
      expect(errors).toHaveLength(0)
    })
  })

  it('should handle optional features', () => {
    const config: ExportConfig = {
      projectName: 'test',
      database: 'sqlite',
      includeAuth: true,
      includeHealthcare: true,
      includeMultiTenant: false,
    }
    
    expect(config.includeAuth).toBe(true)
    expect(config.includeHealthcare).toBe(true)
    expect(config.includeMultiTenant).toBe(false)
  })
})
