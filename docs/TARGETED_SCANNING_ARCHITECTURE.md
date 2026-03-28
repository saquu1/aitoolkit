# Targeted Scanning Architecture Design

## Overview

This document outlines the architecture for **Targeted Dependency Scanning** - a system that scans only the main file and its linked dependencies (API routes, Components, SQL tables, Middleware) instead of scanning entire directories, dramatically improving performance and reducing timeout issues.

---

## 1. Problem Statement

### Current Issue
- Full directory scanning causes **timeout issues**
- Scanning irrelevant files wastes resources
- Long wait times for users (minutes for large codebases)
- Cannot isolate specific page/module for analysis

### Solution
**Targeted Scanning**: Scan only what's needed based on dependency graph

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TARGETED SCANNING SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐   │
│  │   SCAN       │    │  DEPENDENCY  │    │      TARGETED                │   │
│  │   BUTTON     │───▶│   GRAPH      │───▶│      SCANNER                 │   │
│  │  (UI Layer)  │    │  (Builder)   │    │   (Execution Layer)          │   │
│  └──────────────┘    └──────────────┘    └──────────────────────────────┘   │
│         │                   │                        │                       │
│         │                   ▼                        ▼                       │
│         │         ┌──────────────┐    ┌──────────────────────────────┐      │
│         │         │  FILE        │    │      SCAN                    │      │
│         │         │  DEPENDENCY  │    │      RESULT                  │      │
│         │         │  MODEL       │    │   (Aggregated Output)        │      │
│         │         └──────────────┘    └──────────────────────────────┘      │
│         │                                                           │          │
│         ▼                                                           ▼          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         API ENDPOINTS                                    │ │
│  │  /api/scan/targeted  │  /api/scan/status  │  /api/scan/dependencies    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Data Models

### 3.1 FileDependency Model (Prisma Schema)

```prisma
model FileDependency {
  id              String   @id @default(cuid())
  projectId       String
  
  // Source File Information
  filePath        String                      // e.g., "/src/app/patient/page.tsx"
  fileName        String                      // e.g., "page.tsx"
  fileType        String                      // "page" | "api" | "component" | "hook" | "lib"
  moduleName      String?                     // e.g., "patients", "billing"
  
  // Dependencies (JSON arrays for flexibility)
  imports         String   @default("[]")     // Import statements: ["@/components/Button", "@/lib/api"]
  apiRoutes       String   @default("[]")     // API routes called: ["/api/patients", "/api/billing"]
  dbTables        String   @default("[]")     // Database tables used: ["patients", "patient_visits"]
  components      String   @default("[]")     // UI components used: ["PatientForm", "VisitList"]
  hooks           String   @default("[]")     // Custom hooks used: ["usePatients", "useAuth"]
  middleware      String   @default("[]")     // Middleware dependencies: ["auth", "tenant"]
  services        String   @default("[]")     // Service layers: ["PatientService", "BillingService"]
  
  // Reverse Dependencies (who uses this file)
  usedBy          String   @default("[]")     // Files that import/use this file
  
  // Scan Metadata
  lastScannedAt   DateTime?
  scanVersion     Int      @default(0)
  scanHash        String?                      // Content hash for change detection
  isStale         Boolean  @default(false)     // Needs re-scan?
  
  // Analysis Results
  complexity      Int      @default(0)         // Cyclomatic complexity
  linesOfCode     Int      @default(0)
  hasTests        Boolean  @default(false)
  testCoverage    Float    @default(0)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([projectId, filePath])
  @@index([projectId])
  @@index([fileType])
  @@index([moduleName])
}

model ScanSession {
  id              String   @id @default(cuid())
  projectId       String
  
  // Scan Configuration
  scanType        String                      // "full" | "targeted" | "dependency"
  targetFile      String?                     // Starting file for targeted scan
  depthLimit      Int      @default(3)        // How deep to traverse dependencies
  
  // Status
  status          String   @default("pending") // "pending" | "running" | "completed" | "failed"
  progress        Int      @default(0)         // 0-100
  currentPhase    String?                     // "scanning" | "analyzing" | "building_graph"
  
  // Results
  filesScanned    Int      @default(0)
  dependenciesFound Int    @default(0)
  errors          String   @default("[]")
  resultSummary   String?                     // JSON summary
  
  // Timing
  startedAt       DateTime?
  completedAt     DateTime?
  duration        Int?                        // in milliseconds
  
  createdAt       DateTime @default(now())
  
  @@index([projectId])
  @@index([status])
}

model DependencyEdge {
  id              String   @id @default(cuid())
  projectId       String
  
  // Source -> Target relationship
  sourceFileId    String                      // FileDependency ID
  targetFileId    String                      // FileDependency ID (or external reference)
  targetExternal  String?                     // External dependency (npm package, API, etc.)
  
  // Edge Properties
  dependencyType  String                      // "import" | "api_call" | "db_query" | "component_use"
  lineNumber      Int?                        // Where in source file
  importStatement String?                     // Full import statement
  isDynamic       Boolean  @default(false)    // Dynamic import?
  
  confidence      Float    @default(1.0)      // Detection confidence
  createdAt       DateTime @default(now())
  
  @@unique([projectId, sourceFileId, targetFileId, dependencyType])
  @@index([projectId])
  @@index([sourceFileId])
  @@index([targetFileId])
}
```

### 3.2 TypeScript Interfaces

```typescript
// ============================================================
// FILE DEPENDENCY INTERFACE
// ============================================================

interface FileDependency {
  id: string
  projectId: string
  filePath: string
  fileName: string
  fileType: 'page' | 'api' | 'component' | 'hook' | 'lib' | 'config' | 'test'
  moduleName?: string
  
  // Dependencies (parsed from JSON)
  imports: ImportDependency[]
  apiRoutes: ApiDependency[]
  dbTables: DbDependency[]
  components: ComponentDependency[]
  hooks: HookDependency[]
  middleware: MiddlewareDependency[]
  services: ServiceDependency[]
  
  // Reverse dependencies
  usedBy: string[]
  
  // Metadata
  lastScannedAt?: Date
  scanVersion: number
  scanHash?: string
  isStale: boolean
  
  // Analysis
  complexity: number
  linesOfCode: number
  hasTests: boolean
  testCoverage: number
}

// ============================================================
// DEPENDENCY TYPES
// ============================================================

interface ImportDependency {
  path: string                    // "@/components/Button"
  name: string                    // "Button" or "*"
  isDefault: boolean              // default import?
  isNamespace: boolean            // import * as X
  line: number                    // Line number in file
  isDynamic: boolean              // import() syntax
}

interface ApiDependency {
  endpoint: string                // "/api/patients"
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  calledIn: string                // Function/component where called
  line: number
  isConditional: boolean          // Called inside condition?
}

interface DbDependency {
  tableName: string               // "patients"
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  via: string                     // How accessed: "prisma" | "raw-sql" | "api"
  columns?: string[]              // Columns accessed
}

interface ComponentDependency {
  name: string                    // "PatientForm"
  path: string                    // Component file path
  props?: string[]                // Props passed
  usage: string                   // "import" | "dynamic"
}

interface HookDependency {
  name: string                    // "usePatients"
  path: string                    // Hook file path
  usage: string                   // How it's used
}

interface MiddlewareDependency {
  name: string                    // "auth", "tenant"
  appliedAt: string               // Where applied: "route" | "layout" | "page"
}

interface ServiceDependency {
  name: string                    // "PatientService"
  path: string                    // Service file path
  methods: string[]               // Methods used
}

// ============================================================
// SCAN REQUEST & RESULT
// ============================================================

interface TargetedScanRequest {
  projectId: string
  targetFile: string              // Starting file path
  scanType: 'page' | 'api' | 'full_module'
  options: {
    depthLimit: number            // Max dependency depth (default: 3)
    includeTests: boolean         // Include test files?
    includeNodeModules: boolean   // Include npm deps?
    includeGenerated: boolean     // Include generated files?
    analyzeContent: boolean       // Deep content analysis?
  }
}

interface TargetedScanResult {
  sessionId: string
  status: 'success' | 'partial' | 'failed'
  
  // What was scanned
  scannedFiles: ScannedFile[]
  dependencyGraph: DependencyGraph
  
  // Summary
  summary: {
    totalFiles: number
    totalDependencies: number
    apiRoutesUsed: number
    dbTablesUsed: number
    componentsUsed: number
    complexity: number
    scanDuration: number
  }
  
  // Analysis
  issues: ScanIssue[]
  suggestions: ScanSuggestion[]
  
  // For UI
  visualGraph: GraphNode[]
}

interface ScannedFile {
  path: string
  type: string
  depth: number                   // How far from target (0 = target file)
  dependencies: string[]          // Dependency IDs
  issues: string[]
}

interface DependencyGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  rootId: string                  // Target file ID
}

interface GraphNode {
  id: string
  label: string
  type: 'file' | 'api' | 'db' | 'external'
  depth: number
  metadata: Record<string, any>
}

interface GraphEdge {
  source: string
  target: string
  type: string
  label?: string
}
```

---

## 4. Dependency Graph Builder

### 4.1 Scanner Implementation

```typescript
// ============================================================
// TARGETED DEPENDENCY SCANNER
// ============================================================

import { Project, SourceFile, SyntaxKind, CallExpression } from 'ts-morph'
import * as fs from 'fs'
import * as path from 'path'

export class TargetedDependencyScanner {
  private project: Project
  private dependencyGraph: Map<string, FileDependency> = new Map()
  private edges: DependencyEdge[] = []
  
  constructor(private config: ScannerConfig) {
    this.project = new Project({
      tsConfigFilePath: config.tsConfigPath,
    })
  }

  // -----------------------------------------------------------
  // MAIN SCAN METHOD
  // -----------------------------------------------------------

  async scanTarget(request: TargetedScanRequest): Promise<TargetedScanResult> {
    const startTime = Date.now()
    const sessionId = crypto.randomUUID()
    
    // Phase 1: Parse target file
    const targetSource = this.project.getSourceFile(request.targetFile)
    if (!targetSource) {
      throw new Error(`Target file not found: ${request.targetFile}`)
    }

    // Phase 2: Build dependency graph (BFS traversal)
    const scannedFiles = await this.buildDependencyGraph(
      targetSource,
      request.options.depthLimit
    )

    // Phase 3: Analyze each file
    for (const file of scannedFiles) {
      await this.analyzeFile(file)
    }

    // Phase 4: Build result
    const duration = Date.now() - startTime
    
    return {
      sessionId,
      status: 'success',
      scannedFiles,
      dependencyGraph: this.buildGraphResult(),
      summary: {
        totalFiles: scannedFiles.length,
        totalDependencies: this.edges.length,
        apiRoutesUsed: this.countApiRoutes(),
        dbTablesUsed: this.countDbTables(),
        componentsUsed: this.countComponents(),
        complexity: this.calculateTotalComplexity(),
        scanDuration: duration,
      },
      issues: this.collectIssues(),
      suggestions: this.generateSuggestions(),
      visualGraph: this.buildVisualGraph(),
    }
  }

  // -----------------------------------------------------------
  // BUILD DEPENDENCY GRAPH (BFS)
  // -----------------------------------------------------------

  private async buildDependencyGraph(
    sourceFile: SourceFile,
    depthLimit: number
  ): Promise<ScannedFile[]> {
    const visited = new Set<string>()
    const queue: Array<{ file: SourceFile; depth: number }> = [
      { file: sourceFile, depth: 0 }
    ]
    const results: ScannedFile[] = []

    while (queue.length > 0) {
      const { file, depth } = queue.shift()!
      const filePath = file.getFilePath()

      if (visited.has(filePath) || depth > depthLimit) {
        continue
      }

      visited.add(filePath)

      // Parse this file's dependencies
      const deps = await this.parseFileDependencies(file)
      
      results.push({
        path: filePath,
        type: this.getFileType(filePath),
        depth,
        dependencies: deps.map(d => d.path),
        issues: [],
      })

      // Store in graph
      this.dependencyGraph.set(filePath, {
        id: crypto.randomUUID(),
        projectId: this.config.projectId,
        filePath,
        fileName: path.basename(filePath),
        fileType: this.getFileType(filePath),
        imports: deps.filter(d => d.type === 'import') as any,
        apiRoutes: deps.filter(d => d.type === 'api') as any,
        dbTables: deps.filter(d => d.type === 'db') as any,
        components: deps.filter(d => d.type === 'component') as any,
        hooks: deps.filter(d => d.type === 'hook') as any,
        middleware: deps.filter(d => d.type === 'middleware') as any,
        services: deps.filter(d => d.type === 'service') as any,
        usedBy: [],
        scanVersion: 1,
        isStale: false,
        complexity: 0,
        linesOfCode: file.getFullText().split('\n').length,
        hasTests: false,
        testCoverage: 0,
      })

      // Queue dependencies for scanning
      for (const dep of deps) {
        if (dep.type === 'import' && dep.path) {
          const depSource = this.resolveModuleSource(dep.path, file)
          if (depSource && !visited.has(depSource.getFilePath())) {
            queue.push({ file: depSource, depth: depth + 1 })
          }
        }

        // Record edge
        this.edges.push({
          id: crypto.randomUUID(),
          projectId: this.config.projectId,
          sourceFileId: filePath,
          targetFileId: dep.path || 'external',
          targetExternal: dep.isExternal ? dep.path : null,
          dependencyType: dep.type,
          lineNumber: dep.line,
          importStatement: dep.statement,
          isDynamic: dep.isDynamic || false,
          confidence: dep.confidence || 1.0,
        })
      }
    }

    return results
  }

  // -----------------------------------------------------------
  // PARSE FILE DEPENDENCIES
  // -----------------------------------------------------------

  private async parseFileDependencies(
    sourceFile: SourceFile
  ): Promise<DependencyInfo[]> {
    const deps: DependencyInfo[] = []

    // 1. Parse import declarations
    sourceFile.getImportDeclarations().forEach(imp => {
      const moduleSpecifier = imp.getModuleSpecifierValue()
      const isExternal = this.isExternalModule(moduleSpecifier)
      
      deps.push({
        type: 'import',
        path: moduleSpecifier,
        name: imp.getNamedImports().map(n => n.getName()).join(', ') ||
              (imp.getDefaultImport()?.getText() || '*'),
        isDefault: !!imp.getDefaultImport(),
        isNamespace: imp.getNamespaceImport()?.getText() !== undefined,
        line: imp.getStartLineNumber(),
        isExternal,
        isDynamic: false,
        statement: imp.getText(),
        confidence: 1.0,
      })
    })

    // 2. Parse dynamic imports
    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
      const expr = call.getExpression()
      if (expr.getText() === 'import') {
        const args = call.getArguments()
        if (args.length > 0) {
          const modulePath = args[0].getText().replace(/['"]/g, '')
          deps.push({
            type: 'import',
            path: modulePath,
            name: '*',
            isDefault: false,
            isNamespace: false,
            line: call.getStartLineNumber(),
            isExternal: this.isExternalModule(modulePath),
            isDynamic: true,
            statement: call.getText(),
            confidence: 0.9,
          })
        }
      }
    })

    // 3. Parse fetch/API calls
    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
      const expr = call.getExpression()
      const exprText = expr.getText()

      // fetch('/api/...')
      if (exprText === 'fetch') {
        const args = call.getArguments()
        if (args.length > 0) {
          const urlArg = args[0].getText()
          const apiMatch = urlArg.match(/['"]\/api\/([^'"]+)['"]/)
          if (apiMatch) {
            deps.push({
              type: 'api',
              path: `/api/${apiMatch[1]}`,
              name: 'fetch',
              line: call.getStartLineNumber(),
              statement: call.getText(),
              confidence: 0.95,
            })
          }
        }
      }

      // axios.get('/api/...'), apiClient.post('/api/...')
      if (exprText.includes('axios') || exprText.includes('apiClient')) {
        const args = call.getArguments()
        if (args.length > 0) {
          const urlArg = args[0].getText()
          const apiMatch = urlArg.match(/['"]\/api\/([^'"]+)['"]/)
          if (apiMatch) {
            deps.push({
              type: 'api',
              path: `/api/${apiMatch[1]}`,
              name: exprText,
              line: call.getStartLineNumber(),
              statement: call.getText(),
              confidence: 0.9,
            })
          }
        }
      }
    })

    // 4. Parse Prisma database calls
    const prismaPatterns = [
      /prisma\.(\w+)\.(findMany|findFirst|findUnique|create|update|delete|upsert)/g,
      /db\.(\w+)\.(findMany|findFirst|findUnique|create|update|delete|upsert)/g,
    ]

    const fileContent = sourceFile.getFullText()
    prismaPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(fileContent)) !== null) {
        deps.push({
          type: 'db',
          path: match[1], // table name
          name: match[2], // operation
          line: this.getLineNumber(fileContent, match.index),
          statement: match[0],
          confidence: 0.95,
        })
      }
    })

    // 5. Parse component usage (JSX elements)
    sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement).forEach(jsx => {
      const tagName = jsx.getTagNameNode().getText()
      // Check if it's a custom component (capitalized)
      if (/^[A-Z]/.test(tagName) && !['Link', 'Image', 'Head'].includes(tagName)) {
        deps.push({
          type: 'component',
          path: tagName,
          name: tagName,
          line: jsx.getStartLineNumber(),
          statement: `<${tagName}>`,
          confidence: 0.8,
        })
      }
    })

    // 6. Parse hook usage
    const hookPattern = /use[A-Z]\w+/g
    let hookMatch
    while ((hookMatch = hookPattern.exec(fileContent)) !== null) {
      const hookName = hookMatch[0]
      // Skip React built-in hooks
      if (!['useState', 'useEffect', 'useContext', 'useRef', 'useMemo', 'useCallback'].includes(hookName)) {
        deps.push({
          type: 'hook',
          path: hookName,
          name: hookName,
          line: this.getLineNumber(fileContent, hookMatch.index),
          statement: hookName,
          confidence: 0.85,
        })
      }
    }

    return deps
  }

  // -----------------------------------------------------------
  // HELPER METHODS
  // -----------------------------------------------------------

  private isExternalModule(modulePath: string): boolean {
    return !modulePath.startsWith('.') && 
           !modulePath.startsWith('@/') &&
           !modulePath.startsWith('/')
  }

  private resolveModuleSource(modulePath: string, fromFile: SourceFile): SourceFile | null {
    // Handle @/ alias
    if (modulePath.startsWith('@/')) {
      const resolvedPath = modulePath.replace('@/', this.config.srcPath + '/')
      return this.project.getSourceFile(resolvedPath + '.ts') ||
             this.project.getSourceFile(resolvedPath + '.tsx') ||
             this.project.getSourceFile(resolvedPath + '/index.ts') ||
             this.project.getSourceFile(resolvedPath + '/index.tsx')
    }

    // Handle relative imports
    if (modulePath.startsWith('.')) {
      const dir = path.dirname(fromFile.getFilePath())
      const resolvedPath = path.resolve(dir, modulePath)
      return this.project.getSourceFile(resolvedPath + '.ts') ||
             this.project.getSourceFile(resolvedPath + '.tsx') ||
             this.project.getSourceFile(resolvedPath + '/index.ts') ||
             this.project.getSourceFile(resolvedPath + '/index.tsx')
    }

    return null
  }

  private getFileType(filePath: string): string {
    if (filePath.includes('/app/api/')) return 'api'
    if (filePath.includes('/components/')) return 'component'
    if (filePath.includes('/hooks/')) return 'hook'
    if (filePath.includes('/lib/')) return 'lib'
    if (filePath.includes('/middleware')) return 'middleware'
    if (filePath.includes('__tests__') || filePath.includes('.test.')) return 'test'
    if (filePath.includes('/app/') && filePath.includes('page.')) return 'page'
    if (filePath.includes('/app/') && filePath.includes('layout.')) return 'layout'
    return 'other'
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length
  }

  // ... additional methods for analysis, graph building, etc.
}

// ============================================================
// TYPES
// ============================================================

interface ScannerConfig {
  projectId: string
  tsConfigPath: string
  srcPath: string
}

interface DependencyInfo {
  type: 'import' | 'api' | 'db' | 'component' | 'hook' | 'middleware' | 'service'
  path: string
  name: string
  isDefault?: boolean
  isNamespace?: boolean
  line: number
  isExternal?: boolean
  isDynamic?: boolean
  statement: string
  confidence: number
}
```

---

## 5. Scan Button Component (UI)

### 5.1 Component Design

```tsx
// ============================================================
// SCAN BUTTON COMPONENT
// ============================================================

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ScanButtonProps {
  projectId: string
  targetFile: string
  scanType: 'page' | 'api' | 'full_module'
  onScanComplete?: (result: TargetedScanResult) => void
  onScanError?: (error: Error) => void
  depthLimit?: number
  className?: string
}

export function ScanButton({
  projectId,
  targetFile,
  scanType,
  onScanComplete,
  onScanError,
  depthLimit = 3,
  className = '',
}: ScanButtonProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<string>('')
  const [lastResult, setLastResult] = useState<TargetedScanResult | null>(null)

  const startScan = useCallback(async () => {
    setIsScanning(true)
    setProgress(0)
    setPhase('Initializing...')

    try {
      // Phase 1: Start scan
      setPhase('Parsing target file...')
      setProgress(10)

      const response = await fetch('/api/scan/targeted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          targetFile,
          scanType,
          options: {
            depthLimit,
            includeTests: false,
            includeNodeModules: false,
            includeGenerated: false,
            analyzeContent: true,
          },
        }),
      })

      // Phase 2: Poll for progress
      const { sessionId } = await response.json()
      setPhase('Building dependency graph...')
      setProgress(30)

      // Poll for updates
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch(`/api/scan/status?sessionId=${sessionId}`)
        const status = await statusRes.json()
        
        setProgress(status.progress)
        setPhase(status.currentPhase || 'Processing...')

        if (status.status === 'completed') {
          clearInterval(pollInterval)
          setProgress(100)
          setPhase('Scan complete!')
          
          // Fetch result
          const resultRes = await fetch(`/api/scan/result?sessionId=${sessionId}`)
          const result = await resultRes.json()
          
          setLastResult(result)
          onScanComplete?.(result)
          setIsScanning(false)
        } else if (status.status === 'failed') {
          clearInterval(pollInterval)
          onScanError?.(new Error(status.error || 'Scan failed'))
          setIsScanning(false)
        }
      }, 500)

    } catch (error) {
      onScanError?.(error as Error)
      setIsScanning(false)
    }
  }, [projectId, targetFile, scanType, depthLimit, onScanComplete, onScanError])

  return (
    <div className={`scan-button-container ${className}`}>
      {/* Main Scan Button */}
      <button
        onClick={startScan}
        disabled={isScanning}
        className={`
          relative overflow-hidden px-4 py-2 rounded-lg font-medium
          transition-all duration-300 ease-out
          ${isScanning 
            ? 'bg-blue-100 text-blue-700 cursor-wait' 
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
          }
        `}
      >
        <AnimatePresence mode="wait">
          {isScanning ? (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                🔍
              </motion.span>
              <span>Scanning...</span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <span>🔍</span>
              <span>Scan Dependencies</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar Overlay */}
        {isScanning && (
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-blue-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        )}
      </button>

      {/* Status Display */}
      {isScanning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-gray-600"
        >
          <span className="font-medium">{phase}</span>
          <span className="ml-2 text-gray-400">({progress}%)</span>
        </motion.div>
      )}

      {/* Quick Result Preview */}
      {lastResult && !isScanning && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 bg-gray-50 rounded-lg text-sm"
        >
          <div className="font-medium text-gray-700 mb-2">
            📊 Scan Results
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>📁 Files: {lastResult.summary.totalFiles}</div>
            <div>🔗 Dependencies: {lastResult.summary.totalDependencies}</div>
            <div>🌐 API Routes: {lastResult.summary.apiRoutesUsed}</div>
            <div>🗄️ DB Tables: {lastResult.summary.dbTablesUsed}</div>
            <div>🧩 Components: {lastResult.summary.componentsUsed}</div>
            <div>⏱️ Duration: {lastResult.summary.scanDuration}ms</div>
          </div>
          <button
            onClick={() => {/* Open full result modal */}}
            className="mt-2 text-blue-600 hover:underline text-xs"
          >
            View Full Dependency Graph →
          </button>
        </motion.div>
      )}
    </div>
  )
}

// ============================================================
// FLOATING SCAN BUTTON (For Pages)
// ============================================================

export function FloatingScanButton({ 
  projectId, 
  currentFile 
}: { 
  projectId: string
  currentFile: string 
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-20 left-20 z-50">
      {/* Expandable Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-14 left-0 bg-white rounded-xl shadow-2xl p-4 w-72"
          >
            <h3 className="font-semibold text-gray-800 mb-3">
              🎯 Targeted Scan
            </h3>
            
            <div className="space-y-2">
              <ScanButton
                projectId={projectId}
                targetFile={currentFile}
                scanType="page"
                depthLimit={3}
                onScanComplete={(result) => {
                  console.log('Scan complete:', result)
                  setIsOpen(false)
                }}
              />
              
              <div className="flex gap-2">
                <button
                  onClick={() => {/* Quick scan depth 1 */}}
                  className="flex-1 px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200"
                >
                  Quick (1 level)
                </button>
                <button
                  onClick={() => {/* Deep scan depth 5 */}}
                  className="flex-1 px-3 py-1.5 bg-gray-100 rounded text-sm hover:bg-gray-200"
                >
                  Deep (5 levels)
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-12 h-12 rounded-full shadow-lg flex items-center justify-center
          transition-all duration-300
          ${isOpen 
            ? 'bg-red-500 rotate-45' 
            : 'bg-blue-600 hover:bg-blue-700'
          }
        `}
      >
        <span className="text-white text-xl">
          {isOpen ? '✕' : '🔍'}
        </span>
      </button>
    </div>
  )
}
```

---

## 6. API Endpoints

### 6.1 Targeted Scan API

```typescript
// ============================================================
// /api/scan/targeted/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { TargetedDependencyScanner } from '@/lib/targeted-scanner'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, targetFile, scanType, options } = body

    // Create scan session
    const session = await db.scanSession.create({
      data: {
        projectId,
        scanType: 'targeted',
        targetFile,
        depthLimit: options?.depthLimit || 3,
        status: 'running',
        startedAt: new Date(),
      },
    })

    // Start async scan (don't await)
    runScanInBackground(session.id, projectId, targetFile, options)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      message: 'Scan started',
    })

  } catch (error) {
    console.error('Targeted scan error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start scan' },
      { status: 500 }
    )
  }
}

// Background scan runner
async function runScanInBackground(
  sessionId: string,
  projectId: string,
  targetFile: string,
  options: any
) {
  try {
    const scanner = new TargetedDependencyScanner({
      projectId,
      tsConfigPath: './tsconfig.json',
      srcPath: './src',
    })

    // Update progress
    await updateScanProgress(sessionId, 10, 'Parsing target file...')

    // Run scan
    const result = await scanner.scanTarget({
      projectId,
      targetFile,
      scanType: 'page',
      options,
    })

    // Store results
    await storeScanResults(sessionId, result)

    // Mark complete
    await db.scanSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        filesScanned: result.summary.totalFiles,
        dependenciesFound: result.summary.totalDependencies,
        resultSummary: JSON.stringify(result.summary),
      },
    })

  } catch (error) {
    await db.scanSession.update({
      where: { id: sessionId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errors: JSON.stringify([{ message: (error as Error).message }]),
      },
    })
  }
}

async function updateScanProgress(sessionId: string, progress: number, phase: string) {
  await db.scanSession.update({
    where: { id: sessionId },
    data: { progress, currentPhase: phase },
  })
}
```

### 6.2 Scan Status API

```typescript
// ============================================================
// /api/scan/status/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: 'sessionId required' },
      { status: 400 }
    )
  }

  const session = await db.scanSession.findUnique({
    where: { id: sessionId },
  })

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Session not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    status: session.status,
    progress: session.progress,
    currentPhase: session.currentPhase,
    filesScanned: session.filesScanned,
    dependenciesFound: session.dependenciesFound,
    error: session.errors ? JSON.parse(session.errors) : null,
  })
}
```

---

## 7. Visual Dependency Graph

### 7.1 Graph Visualization Component

```tsx
// ============================================================
// DEPENDENCY GRAPH VISUALIZATION
// ============================================================

'use client'

import React, { useEffect, useRef } from 'react'
import { ForceGraph2D } from 'react-force-graph'

interface DependencyGraphProps {
  data: {
    nodes: GraphNode[]
    edges: GraphEdge[]
  }
  onNodeClick?: (node: GraphNode) => void
}

export function DependencyGraphVisualization({ data, onNodeClick }: DependencyGraphProps) {
  const graphRef = useRef<any>()

  // Color mapping by node type
  const nodeColors: Record<string, string> = {
    page: '#3b82f6',      // Blue
    api: '#10b981',       // Green
    component: '#8b5cf6', // Purple
    hook: '#f59e0b',      // Amber
    db: '#ef4444',        // Red
    external: '#6b7280',  // Gray
  }

  // Node size by importance
  const getNodeSize = (node: GraphNode) => {
    if (node.depth === 0) return 20  // Root is largest
    if (node.type === 'api') return 10
    if (node.type === 'db') return 12
    return 8
  }

  return (
    <div className="w-full h-96 rounded-lg border border-gray-200 bg-gray-50">
      <ForceGraph2D
        ref={graphRef}
        graphData={{
          nodes: data.nodes.map(n => ({ ...n, id: n.id })),
          links: data.edges.map(e => ({ 
            source: e.source, 
            target: e.target,
            type: e.type,
          })),
        }}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const size = getNodeSize(node)
          const color = nodeColors[node.type] || nodeColors.external

          // Draw node
          ctx.beginPath()
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
          ctx.fillStyle = color
          ctx.fill()

          // Draw label
          if (globalScale > 0.8) {
            ctx.font = `${10/globalScale}px Sans-Serif`
            ctx.fillStyle = '#374151'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(node.label, node.x, node.y + size + 8)
          }
        }}
        linkWidth={(link: any) => {
          switch (link.type) {
            case 'api': return 2
            case 'db': return 3
            default: return 1
          }
        }}
        linkColor={(link: any) => {
          switch (link.type) {
            case 'api': return '#10b981'
            case 'db': return '#ef4444'
            case 'import': return '#3b82f6'
            default: return '#9ca3af'
          }
        }}
        onNodeClick={(node: any) => onNodeClick?.(node)}
        nodeRelSize={6}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.8}
      />
    </div>
  )
}
```

---

## 8. Scan Result Dashboard

### 8.1 Dashboard Component

```tsx
// ============================================================
// SCAN RESULT DASHBOARD
// ============================================================

export function ScanResultDashboard({ result }: { result: TargetedScanResult }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          🎯 Dependency Scan Results
        </h2>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            result.status === 'success' 
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {result.status}
          </span>
          <span className="text-gray-500 text-sm">
            {result.summary.scanDuration}ms
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <StatCard icon="📁" label="Files" value={result.summary.totalFiles} />
        <StatCard icon="🔗" label="Dependencies" value={result.summary.totalDependencies} />
        <StatCard icon="🌐" label="API Routes" value={result.summary.apiRoutesUsed} />
        <StatCard icon="🗄️" label="DB Tables" value={result.summary.dbTablesUsed} />
        <StatCard icon="🧩" label="Components" value={result.summary.componentsUsed} />
        <StatCard icon="📊" label="Complexity" value={result.summary.complexity} />
      </div>

      {/* Graph Visualization */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Dependency Graph</h3>
        <DependencyGraphVisualization 
          data={result.dependencyGraph}
          onNodeClick={(node) => console.log('Clicked:', node)}
        />
      </div>

      {/* Detailed Lists */}
      <div className="grid grid-cols-2 gap-6">
        {/* API Routes Used */}
        <DetailList
          title="API Routes Used"
          icon="🌐"
          items={result.scannedFiles
            .flatMap(f => /* extract api routes */ [])
            .map(route => ({ name: route, type: 'api' }))}
        />

        {/* DB Tables Used */}
        <DetailList
          title="Database Tables"
          icon="🗄️"
          items={result.scannedFiles
            .flatMap(f => /* extract db tables */ [])
            .map(table => ({ name: table, type: 'db' }))}
        />
      </div>

      {/* Issues & Suggestions */}
      {result.issues.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <h3 className="font-semibold text-red-800 mb-2">⚠️ Issues Found</h3>
          <ul className="space-y-2">
            {result.issues.map((issue, i) => (
              <li key={i} className="text-sm text-red-700">
                • {issue.message} ({issue.file}:{issue.line})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

function DetailList({ title, icon, items }: { title: string; icon: string; items: any[] }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-semibold text-gray-700 mb-3">{icon} {title}</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="font-mono">{item.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 9. Integration Points

### 9.1 File Tree Integration

```tsx
// Add scan button to each file in file tree
<FileTreeItem
  file={file}
  actions={
    <button onClick={() => scanFile(file.path)}>
      🔍
    </button>
  }
/>
```

### 9.2 Page Header Integration

```tsx
// Add scan button to page headers
<PageHeader
  title="Patient Management"
  actions={
    <ScanButton
      projectId={projectId}
      targetFile="/src/app/patients/page.tsx"
      scanType="page"
    />
  }
/>
```

### 9.3 Error Flow Integration

```tsx
// When error occurs, offer to scan related dependencies
<ErrorPanel>
  <ErrorItem
    error={error}
    actions={
      <button onClick={() => scanDependenciesForError(error)}>
        🔍 Scan Related Dependencies
      </button>
    }
  />
</ErrorPanel>
```

---

## 10. Performance Considerations

| Metric | Full Directory Scan | Targeted Scan (depth 3) |
|--------|---------------------|-------------------------|
| Files scanned | 500+ | 15-30 |
| Time | 2-5 minutes | 2-5 seconds |
| Memory | 500MB+ | 50MB |
| Timeout risk | High | Minimal |

### Optimization Strategies

1. **Caching**: Cache dependency graphs, invalidate on file change
2. **Incremental**: Only re-scan changed files
3. **Parallel**: Scan independent branches concurrently
4. **Lazy Loading**: Load graph visualization on demand
5. **Bailout**: Stop at known boundaries (node_modules, generated files)

---

## 11. Implementation Priority

| Phase | Feature | Priority |
|-------|---------|----------|
| 1 | FileDependency model + Prisma schema | HIGH |
| 2 | TargetedDependencyScanner core | HIGH |
| 3 | Scan Button component | HIGH |
| 4 | API endpoints (/api/scan/targeted, status) | HIGH |
| 5 | Graph visualization | MEDIUM |
| 6 | Result dashboard | MEDIUM |
| 7 | File tree integration | MEDIUM |
| 8 | Caching layer | LOW |
| 9 | Error flow integration | LOW |

---

## Summary

This Targeted Scanning Architecture provides:

- **Fast scanning**: Only scan relevant files (2-5s vs 2-5min)
- **Dependency tracking**: Complete graph of imports, API calls, DB tables
- **Visual representation**: Interactive dependency graph
- **Smart integration**: File tree, page headers, error panel
- **Scalable**: Works with projects of any size
