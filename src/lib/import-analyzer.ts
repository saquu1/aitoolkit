/**
 * IMPORT ANALYZER SERVICE
 * =======================
 * Phase 5 of Contract Validator - Smart import suggestions
 * 
 * Capabilities:
 * - Analyze imports in the codebase
 * - Detect wrong imports and suggest fixes
 * - Find unused imports
 * - Suggest better import patterns
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// =============================================================================
// TYPES
// =============================================================================

export interface ImportInfo {
  filePath: string
  importStatement: string
  importType: 'named' | 'default' | 'namespace' | 'dynamic'
  source: string
  sourcePath: string
  lineNumber: number
  columnNumber: number
  isUsed: boolean
  usageCount: number
}

export interface ImportSuggestionFix {
  filePath: string
  currentImport: string
  currentPath: string
  suggestedImport?: string
  suggestedPath: string
  reason: 'typo' | 'moved' | 'renamed' | 'wrong_path' | 'unused' | 'better_alias'
  impactLevel: 'low' | 'medium' | 'high'
  confidence: number
}

export interface ModuleInfo {
  name: string
  path: string
  type: 'local' | 'npm' | 'alias'
  exports: string[]
  hasDefault: boolean
}

// =============================================================================
// IMPORT ANALYZER SERVICE
// =============================================================================

export class ImportAnalyzerService {
  private projectRoot: string
  private tsConfigPaths: Record<string, string[]> = {}

  constructor() {
    this.projectRoot = process.cwd()
    this.loadTsConfigPaths()
  }

  /**
   * Load TypeScript path aliases from tsconfig.json
   */
  private loadTsConfigPaths(): void {
    try {
      const tsConfigPath = path.join(this.projectRoot, 'tsconfig.json')
      if (fs.existsSync(tsConfigPath)) {
        const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'))
        this.tsConfigPaths = tsConfig.compilerOptions?.paths || {}
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Analyze all imports in the codebase
   */
  async analyzeCodebase(): Promise<{
    totalImports: number
    validImports: number
    invalidImports: number
    unusedImports: number
    suggestions: ImportSuggestionFix[]
  }> {
    const srcPath = path.join(this.projectRoot, 'src')
    const imports: ImportInfo[] = []
    const moduleCache = new Map<string, ModuleInfo>()

    // Scan all TypeScript/TSX files
    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return

      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
          if (!item.includes('node_modules') && !item.includes('.next')) {
            scanDir(fullPath)
          }
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          const fileImports = this.analyzeFile(fullPath)
          imports.push(...fileImports)
        }
      }
    }

    scanDir(srcPath)

    // Build module resolution cache
    await this.buildModuleCache(imports)

    // Analyze each import
    const suggestions: ImportSuggestionFix[] = []
    let validImports = 0
    let invalidImports = 0
    let unusedImports = 0

    for (const imp of imports) {
      const analysis = await this.analyzeImport(imp)
      
      if (analysis.isValid) {
        validImports++
      } else {
        invalidImports++
        if (analysis.suggestion) {
          suggestions.push(analysis.suggestion)
        }
      }

      if (!imp.isUsed) {
        unusedImports++
        suggestions.push({
          filePath: imp.filePath,
          currentImport: imp.importStatement,
          currentPath: imp.sourcePath,
          suggestedImport: '',
          suggestedPath: '',
          reason: 'unused',
          impactLevel: 'low',
          confidence: 1.0
        })
      }

      // Store in database
      await this.storeImportAnalysis(imp, analysis.isValid, analysis.suggestion)
    }

    return {
      totalImports: imports.length,
      validImports,
      invalidImports,
      unusedImports,
      suggestions
    }
  }

  /**
   * Analyze a single file for imports
   */
  private analyzeFile(filePath: string): ImportInfo[] {
    const imports: ImportInfo[] = []
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    const relativePath = filePath.replace(this.projectRoot, '')

    // Track imported names for usage checking
    const importedNames: Map<string, number> = new Map()

    lines.forEach((line, index) => {
      // Match different import patterns
      // 1. Named imports: import { a, b } from 'module'
      const namedMatch = line.match(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/)
      if (namedMatch) {
        const names = namedMatch[1].split(',').map(n => n.trim().split(' as ')[0].trim())
        names.forEach(name => {
          if (name) importedNames.set(name, 0)
        })
        
        imports.push({
          filePath: relativePath,
          importStatement: line.trim(),
          importType: 'named',
          source: namedMatch[1].trim(),
          sourcePath: namedMatch[2],
          lineNumber: index + 1,
          columnNumber: line.indexOf('import') + 1,
          isUsed: true,
          usageCount: 0
        })
        return
      }

      // 2. Default imports: import Name from 'module'
      const defaultMatch = line.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/)
      if (defaultMatch && !line.includes('{')) {
        importedNames.set(defaultMatch[1], 0)
        
        imports.push({
          filePath: relativePath,
          importStatement: line.trim(),
          importType: 'default',
          source: defaultMatch[1],
          sourcePath: defaultMatch[2],
          lineNumber: index + 1,
          columnNumber: line.indexOf('import') + 1,
          isUsed: true,
          usageCount: 0
        })
        return
      }

      // 3. Namespace imports: import * as Name from 'module'
      const namespaceMatch = line.match(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/)
      if (namespaceMatch) {
        importedNames.set(namespaceMatch[1], 0)
        
        imports.push({
          filePath: relativePath,
          importStatement: line.trim(),
          importType: 'namespace',
          source: namespaceMatch[1],
          sourcePath: namespaceMatch[2],
          lineNumber: index + 1,
          columnNumber: line.indexOf('import') + 1,
          isUsed: true,
          usageCount: 0
        })
        return
      }

      // 4. Dynamic imports: import('module')
      const dynamicMatch = line.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/)
      if (dynamicMatch) {
        imports.push({
          filePath: relativePath,
          importStatement: line.trim(),
          importType: 'dynamic',
          source: '',
          sourcePath: dynamicMatch[1],
          lineNumber: index + 1,
          columnNumber: line.indexOf('import') + 1,
          isUsed: true,
          usageCount: 1
        })
      }
    })

    // Check usage of imported names
    const contentWithoutImports = lines.filter((_, i) => 
      !lines[i].includes('import ')
    ).join('\n')

    for (const imp of imports) {
      if (imp.importType === 'named') {
        const names = imp.source.split(',').map(n => n.trim().split(' as ')[0].trim())
        let totalUsage = 0
        
        names.forEach(name => {
          if (name) {
            const regex = new RegExp(`\\b${name}\\b`, 'g')
            const matches = contentWithoutImports.match(regex)
            const count = matches ? matches.length : 0
            totalUsage += count
          }
        })
        
        imp.usageCount = totalUsage
        imp.isUsed = totalUsage > 0
      } else if (imp.importType === 'default' || imp.importType === 'namespace') {
        const regex = new RegExp(`\\b${imp.source}\\b`, 'g')
        const matches = contentWithoutImports.match(regex)
        imp.usageCount = matches ? matches.length : 0
        imp.isUsed = imp.usageCount > 0
      }
    }

    return imports
  }

  /**
   * Analyze a single import for issues
   */
  private async analyzeImport(imp: ImportInfo): Promise<{
    isValid: boolean
    canBeFixed: boolean
    suggestion?: ImportSuggestionFix
  }> {
    // Check if import path exists
    const resolvedPath = await this.resolveImportPath(imp.sourcePath, imp.filePath)
    
    if (!resolvedPath) {
      // Import cannot be resolved - check for common issues
      const suggestion = await this.findImportFix(imp)
      
      return {
        isValid: false,
        canBeFixed: !!suggestion,
        suggestion
      }
    }

    return {
      isValid: true,
      canBeFixed: false
    }
  }

  /**
   * Resolve an import path to actual file
   */
  private async resolveImportPath(importPath: string, fromFile: string): Promise<string | null> {
    // Check for alias paths (@/...)
    if (importPath.startsWith('@/')) {
      const aliasPath = importPath.replace('@/', 'src/')
      const fullPath = path.join(this.projectRoot, aliasPath)
      
      // Try with extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']
      for (const ext of extensions) {
        if (fs.existsSync(fullPath + ext)) {
          return fullPath + ext
        }
      }
      
      if (fs.existsSync(fullPath)) {
        return fullPath
      }
      
      return null
    }

    // Check for relative paths
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const dir = path.dirname(path.join(this.projectRoot, fromFile))
      const fullPath = path.resolve(dir, importPath)
      
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']
      for (const ext of extensions) {
        if (fs.existsSync(fullPath + ext)) {
          return fullPath + ext
        }
      }
      
      if (fs.existsSync(fullPath)) {
        return fullPath
      }
      
      return null
    }

    // Check for npm packages
    try {
      const packagePath = path.join(this.projectRoot, 'node_modules', importPath)
      if (fs.existsSync(packagePath)) {
        return packagePath
      }
    } catch {
      // Ignore
    }

    return null
  }

  /**
   * Find a fix for a broken import
   */
  private async findImportFix(imp: ImportInfo): Promise<ImportSuggestionFix | undefined> {
    // Common fixes
    const originalPath = imp.sourcePath

    // 1. Check for typo in path
    if (originalPath.includes('@/')) {
      // Try finding similar files
      const similarFile = await this.findSimilarFile(originalPath.replace('@/', 'src/'))
      if (similarFile) {
        return {
          filePath: imp.filePath,
          currentImport: imp.importStatement,
          currentPath: originalPath,
          suggestedPath: similarFile.replace('src/', '@/'),
          reason: 'typo',
          impactLevel: 'low',
          confidence: 0.8
        }
      }
    }

    // 2. Check for deep relative import that could be alias
    if (originalPath.includes('../') && originalPath.split('/').length > 3) {
      const fileDir = path.dirname(imp.filePath)
      const aliasPath = this.convertToAlias(fileDir, originalPath)
      if (aliasPath) {
        return {
          filePath: imp.filePath,
          currentImport: imp.importStatement,
          currentPath: originalPath,
          suggestedPath: aliasPath,
          reason: 'better_alias',
          impactLevel: 'low',
          confidence: 0.9
        }
      }
    }

    // 3. Check for missing extension (less common in TS)
    if (!originalPath.endsWith('.ts') && !originalPath.endsWith('.tsx')) {
      const withExt = await this.resolveImportPath(originalPath + '.ts', imp.filePath)
      if (withExt) {
        return {
          filePath: imp.filePath,
          currentImport: imp.importStatement,
          currentPath: originalPath,
          suggestedPath: originalPath,
          reason: 'wrong_path',
          impactLevel: 'low',
          confidence: 0.7
        }
      }
    }

    return undefined
  }

  /**
   * Find similar file for typo detection
   */
  private async findSimilarFile(originalPath: string): Promise<string | null> {
    const srcPath = path.join(this.projectRoot, 'src')
    const targetName = path.basename(originalPath)
    const targetDir = path.dirname(originalPath)

    if (!fs.existsSync(srcPath)) return null

    // Search for file with similar name
    const searchDir = (dir: string): string | null => {
      const items = fs.readdirSync(dir)
      
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          const result = searchDir(fullPath)
          if (result) return result
        } else if (item.replace(/\.[^.]+$/, '') === targetName.replace(/\.[^.]+$/, '')) {
          return fullPath.replace(this.projectRoot + '/', '')
        }
      }
      
      return null
    }

    return searchDir(srcPath)
  }

  /**
   * Convert relative import to alias
   */
  private convertToAlias(fileDir: string, importPath: string): string | null {
    try {
      const dir = path.join(this.projectRoot, path.dirname(fileDir))
      const resolved = path.resolve(dir, importPath)
      const srcRelative = resolved.replace(this.projectRoot + '/', '')
      
      if (srcRelative.startsWith('src/')) {
        return srcRelative.replace('src/', '@/')
      }
    } catch {
      // Ignore
    }
    
    return null
  }

  /**
   * Build module resolution cache
   */
  private async buildModuleCache(imports: ImportInfo[]): Promise<void> {
    const uniquePaths = new Set(imports.map(i => i.sourcePath))

    for (const importPath of uniquePaths) {
      const resolved = await this.resolveImportPath(importPath, '')
      
      await prisma.moduleResolution.upsert({
        where: {
          moduleName_modulePath: {
            moduleName: importPath.split('/').pop() || importPath,
            modulePath: importPath
          }
        },
        create: {
          moduleName: importPath.split('/').pop() || importPath,
          modulePath: importPath,
          moduleType: importPath.startsWith('@') || importPath.startsWith('./') || importPath.startsWith('../') 
            ? (importPath.startsWith('@') ? 'alias' : 'local') 
            : 'npm',
          resolvedPath: resolved || '',
          exists: !!resolved,
          lastChecked: new Date()
        },
        update: {
          resolvedPath: resolved || '',
          exists: !!resolved,
          lastChecked: new Date()
        }
      })
    }
  }

  /**
   * Store import analysis in database
   */
  private async storeImportAnalysis(
    imp: ImportInfo,
    isValid: boolean,
    suggestion?: ImportSuggestionFix
  ): Promise<void> {
    try {
      await prisma.importAnalysis.create({
        data: {
          filePath: imp.filePath,
          importStatement: imp.importStatement,
          importType: imp.importType,
          source: imp.source,
          sourcePath: imp.sourcePath,
          isValid,
          canBeFixed: !!suggestion,
          suggestedFix: suggestion?.suggestedPath,
          confidence: suggestion?.confidence || 0,
          isUsed: imp.isUsed,
          usageCount: imp.usageCount,
          lineNumber: imp.lineNumber,
          columnNumber: imp.columnNumber
        }
      })
    } catch {
      // Ignore duplicates
    }
  }

  /**
   * Get all import suggestions
   */
  async getImportSuggestions(limit: number = 50): Promise<ImportSuggestionFix[]> {
    const analyses = await prisma.importAnalysis.findMany({
      where: {
        OR: [
          { isValid: false },
          { isUsed: false }
        ]
      },
      take: limit
    })

    return analyses.map(a => ({
      filePath: a.filePath,
      currentImport: a.importStatement,
      currentPath: a.sourcePath,
      suggestedPath: a.suggestedFix || '',
      reason: !a.isUsed ? 'unused' : 'wrong_path',
      impactLevel: 'low' as const,
      confidence: a.confidence
    }))
  }

  /**
   * Apply an import fix
   */
  async applyFix(suggestionId: string): Promise<{ success: boolean; message: string }> {
    const suggestion = await prisma.importSuggestion.findUnique({
      where: { id: suggestionId }
    })

    if (!suggestion) {
      return { success: false, message: 'Suggestion not found' }
    }

    const filePath = path.join(this.projectRoot, suggestion.filePath)
    if (!fs.existsSync(filePath)) {
      return { success: false, message: 'File not found' }
    }

    let content = fs.readFileSync(filePath, 'utf-8')

    // Replace the import
    if (suggestion.suggestedImport && suggestion.suggestedPath) {
      content = content.replace(
        suggestion.currentImport,
        suggestion.suggestedImport.replace('FROM_PATH', suggestion.suggestedPath)
      )
    } else if (suggestion.reason === 'unused') {
      // Remove the unused import line
      const lines = content.split('\n')
      const filtered = lines.filter(line => !line.includes(suggestion.currentImport))
      content = filtered.join('\n')
    }

    fs.writeFileSync(filePath, content)

    // Update suggestion status
    await prisma.importSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: 'applied',
        appliedAt: new Date()
      }
    })

    return { success: true, message: 'Fix applied successfully' }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalImports: number
    validImports: number
    invalidImports: number
    unusedImports: number
    fixableImports: number
  }> {
    const [total, valid, invalid, unused, fixable] = await Promise.all([
      prisma.importAnalysis.count(),
      prisma.importAnalysis.count({ where: { isValid: true } }),
      prisma.importAnalysis.count({ where: { isValid: false } }),
      prisma.importAnalysis.count({ where: { isUsed: false } }),
      prisma.importAnalysis.count({ where: { canBeFixed: true } })
    ])

    return {
      totalImports: total,
      validImports: valid,
      invalidImports: invalid,
      unusedImports: unused,
      fixableImports: fixable
    }
  }
}

// Export singleton
export const importAnalyzerService = new ImportAnalyzerService()
