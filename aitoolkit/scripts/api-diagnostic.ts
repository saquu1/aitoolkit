/**
 * API DIAGNOSTIC SCRIPT
 * =====================
 * Part 1: Prisma Schema-Code Cross-Reference Scanner
 * Part 2: API Endpoint Health Check
 *
 * Usage: cd /home/z/my-project/aitoolkit && npx tsx scripts/api-diagnostic.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'

// ============================================================================
// TYPES
// ============================================================================

interface SchemaField {
  name: string
  type: string
  isRelation: boolean
  isOptional: boolean
  isArray: boolean
  relationTo?: string
}

interface SchemaModel {
  name: string
  fields: Map<string, SchemaField>
  fieldNames: string[]
  relationFieldNames: string[]
}

interface PrismaAccess {
  file: string
  line: number
  clientVar: string   // 'prisma', 'db', 'cvDb', etc.
  modelName: string    // The model name used in code
  method?: string      // findMany, findUnique, create, etc.
  context: string      // Surrounding code snippet
}

interface FieldReference {
  file: string
  line: number
  modelUsedInCode: string
  fieldName: string
  context: string
  kind: 'where' | 'select' | 'include' | 'orderBy' | 'create' | 'update' | 'upsert' | 'data' | 'other'
}

interface Mismatch {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  category: string
  file: string
  line: number
  modelUsedInCode: string
  expectedModel?: string
  field?: string
  message: string
  context: string
  suggestion?: string
}

interface APIEndpointTest {
  method: string
  path: string
  statusCode: number | null
  responseTime: number
  error: string | null
  responseBody: string | null
}

interface DiagnosticReport {
  timestamp: string
  part1: {
    schemaStats: { modelCount: number; totalFields: number }
    scannedFiles: number
    totalPrismaAccesses: number
    mismatches: Mismatch[]
    summary: { critical: number; high: number; medium: number; low: number }
  }
  part2: {
    serverRunning: boolean
    endpointsTested: number
    results: APIEndpointTest[]
    summary: { healthy: number; unhealthy: number; unreachable: number }
  }
}

// ============================================================================
// PART 1: SCHEMA PARSER
// ============================================================================

function parsePrismaSchema(schemaPath: string): Map<string, SchemaModel> {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`PART 1: PRISMA SCHEMA-CODE CROSS-REFERENCE SCANNER`)
  console.log(`${'='.repeat(70)}`)

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8')
  const models = new Map<string, SchemaModel>()

  // Match model blocks
  const modelBlockRegex = /model\s+(\w+)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs
  let match

  while ((match = modelBlockRegex.exec(schemaContent)) !== null) {
    const modelName = match[1]
    const body = match[2]
    const fields = new Map<string, SchemaField>()
    const fieldNames: string[] = []
    const relationFieldNames: string[] = []

    // Parse each field line
    const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('@@'))

    for (const line of lines) {
      // Skip decorator lines like @id, @unique, @relation, @default, @index
      if (line.startsWith('@')) continue

      // Parse field: name Type? @decorators
      const fieldMatch = line.match(/^(\w+)\s+([\w\[\]<>?]+?)(?:\s+@.*)?$/)
      if (!fieldMatch) continue

      const fieldName = fieldMatch[1]
      let fieldType = fieldMatch[2]
      const isOptional = fieldType.endsWith('?')
      const isArray = fieldType.endsWith('[]')
      const cleanType = fieldType.replace(/\?$/, '').replace(/\[\]$/, '')

      // Check if it's a relation (type matches another model or has @relation)
      const isRelation = line.includes('@relation') || /^[A-Z]/.test(cleanType) && cleanType !== 'String' && cleanType !== 'Int' && cleanType !== 'Float' && cleanType !== 'Boolean' && cleanType !== 'DateTime' && cleanType !== 'BigInt' && cleanType !== 'Bytes' && cleanType !== 'Json'

      let relationTo: string | undefined
      if (isRelation) {
        const relMatch = line.match(/references:\s*\[(\w+)\]/)
        if (relMatch) {
          relationTo = relMatch[1]
        } else {
          relationTo = cleanType
        }
        relationFieldNames.push(fieldName)
      }

      fields.set(fieldName, {
        name: fieldName,
        type: cleanType,
        isRelation,
        isOptional,
        isArray,
        relationTo,
      })
      fieldNames.push(fieldName)
    }

    models.set(modelName, {
      name: modelName,
      fields,
      fieldNames,
      relationFieldNames,
    })
  }

  console.log(`\n📊 Schema parsed: ${models.size} models`)
  return models
}

// ============================================================================
// PART 1: CODE SCANNER
// ============================================================================

function getAllTsFiles(dir: string, ext = '.ts'): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...getAllTsFiles(fullPath, ext))
    } else if (entry.name.endsWith(ext) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.d.ts')) {
      results.push(fullPath)
    }
  }
  return results
}

function scanCodeForPrismaUsage(files: string[], models: Map<string, SchemaModel>): {
  accesses: PrismaAccess[]
  fieldRefs: FieldReference[]
} {
  const accesses: PrismaAccess[] = []
  const fieldRefs: FieldReference[] = []

  // Build model name set for quick lookup
  const modelNames = new Set(models.keys())

  // Also build a lowercase mapping for case-insensitive comparison
  const modelByLowercase = new Map<string, string>()
  for (const name of modelNames) {
    modelByLowercase.set(name.toLowerCase(), name)
  }

  for (const file of files) {
    let content: string
    try {
      content = fs.readFileSync(file, 'utf-8')
    } catch {
      continue
    }

    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNum = i + 1

      // Detect client variable imports/declarations
      // Pattern: prisma.XXX, db.XXX, cvDb.XXX, or from imports
      const clientPatterns = [
        /\b(prisma|db|cvDb)\.(\w+)/g,
        /await\s+(prisma|db|cvDb)\.(\w+)/g,
        /\((prisma|db|cvDb)\.(\w+)/g,
      ]

      for (const pattern of clientPatterns) {
        pattern.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = pattern.exec(line)) !== null) {
          const clientVar = m[1]
          const modelNameUsed = m[2]

          // Skip Prisma internal methods/keywords
          const prismaInternalMethods = new Set([
            '$connect', '$disconnect', '$executeRaw', '$queryRaw', '$transaction',
            '$on', '$use', '$extends', '$reset', 'ModelName', 'Null',
          ])
          if (prismaInternalMethods.has(modelNameUsed)) continue

          // Check if this is a known model access (starts with uppercase, matching pattern)
          if (/^[A-Z]/.test(modelNameUsed)) {
            accesses.push({
              file,
              line: lineNum,
              clientVar,
              modelName: modelNameUsed,
              context: line.trim(),
            })
          }
        }
      }
    }

    // ---- FIELD-LEVEL SCANNING ----
    // For each file, try to find Prisma operations and extract field references
    const fileAccesses = accesses.filter(a => a.file === file)
    if (fileAccesses.length === 0) continue

    // Strategy: Find blocks like .where({ ... }), .select({ ... }), .include({ ... }), etc.
    // and extract field names from them.
    // We do this with multi-line brace matching.

    // Find all Prisma operation chains
    const operationPatterns = [
      { regex: /\.(where|select|include|orderBy|data)\s*\(/g, kind: 'other' as const },
    ]

    // Multi-line block extraction
    const fullContent = content

    // Find all .where(, .select(, .include(, .orderBy(, .create({data:, .update({data:, .upsert( blocks
    const blockPatterns: RegExp[] = [
      /\.(where)\s*\(\s*\{/g,
      /\.(select)\s*\(\s*\{/g,
      /\.(include)\s*\(\s*\{/g,
      /\.(orderBy)\s*\(\s*\{/g,
      /\.(create)\s*\(\s*\{[^}]*data\s*:\s*\{/g,
      /\.(update)\s*\(\s*\{[^}]*data\s*:\s*\{/g,
      /\.(upsert)\s*\(\s*\{[^}]*update\s*:\s*\{/g,
      /\.(data)\s*\(\s*\{/g,
    ]

    for (const regex of blockPatterns) {
      regex.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = regex.exec(fullContent)) !== null) {
        const blockKind = m[1] as FieldReference['kind']
        const startIdx = m.index + m[0].indexOf('{')

        // Extract the brace-balanced block
        let depth = 0
        let endIdx = startIdx
        for (let j = startIdx; j < fullContent.length; j++) {
          if (fullContent[j] === '{') depth++
          else if (fullContent[j] === '}') {
            depth--
            if (depth === 0) { endIdx = j; break }
          }
        }

        const blockContent = fullContent.substring(startIdx, endIdx + 1)
        const blockStartLine = fullContent.substring(0, startIdx).split('\n').length

        // Extract field names from the block
        // Pattern: fieldName: or fieldName: true/false or fieldName: { ... }
        const fieldPatterns = [
          /(\w+)\s*:\s*true/g,
          /(\w+)\s*:\s*false/g,
          /(\w+)\s*:\s*\{/g,
          /(\w+)\s*:\s*['"]/g,
          /(\w+)\s*:\s*\d/g,
          /(\w+)\s*:\s*\[/g,
          /(\w+)\s*:\s*new\s/g,
          /(\w+)\s*:\s*\(/g,
        ]

        // Determine which model this block belongs to
        // Look backwards from the block to find the nearest model access
        const beforeBlock = fullContent.substring(Math.max(0, startIdx - 500), startIdx)
        const modelRef = beforeBlock.match(/\b(prisma|db|cvDb)\.(\w+)/g)
        let currentModel = 'unknown'
        if (modelRef) {
          const lastRef = modelRef[modelRef.length - 1]
          currentModel = lastRef.split('.')[1]
        }

        for (const fp of fieldPatterns) {
          let fm: RegExpExecArray | null
          while ((fm = fp.exec(blockContent)) !== null) {
            const fieldName = fm[1]
            // Skip JavaScript keywords and Prisma keywords
            if (['OR', 'AND', 'NOT', 'mode', 'contains', 'startsWith', 'endsWith', 'gt', 'gte', 'lt', 'lte', 'in', 'equals', 'desc', 'asc', 'every', 'some', 'none', 'is', 'isEmpty', 'select', '_count', 'update', 'create', 'connect', 'disconnect', 'set', 'delete', 'deleteMany', 'updateMany', 'skip', 'take', 'cursor', 'distinct', 'push', 'increment', 'decrement', 'multiply', 'divide', 'setNull', 'upsert'].includes(fieldName)) continue
            if (/^_/.test(fieldName)) continue

            const fieldLineNum = blockStartLine + blockContent.substring(0, fm.index).split('\n').length - 1
            fieldRefs.push({
              file,
              line: fieldLineNum,
              modelUsedInCode: currentModel,
              fieldName,
              context: `${fieldName}: ...`,
              kind: blockKind,
            })
          }
        }
      }
    }
  }

  return { accesses, fieldRefs }
}

// ============================================================================
// PART 1: CROSS-REFERENCE
// ============================================================================

function crossReference(
  models: Map<string, SchemaModel>,
  accesses: PrismaAccess[],
  fieldRefs: FieldReference[]
): Mismatch[] {
  const mismatches: Mismatch[] = []
  const modelNames = new Set(models.keys())

  // Build lowercase map for case-sensitivity checking
  const modelByLowercase = new Map<string, string>()
  for (const name of modelNames) {
    modelByLowercase.set(name.toLowerCase(), name)
  }

  // Check model name validity
  const seenAccesses = new Set<string>()
  for (const access of accesses) {
    const key = `${access.file}:${access.line}:${access.modelName}`
    if (seenAccesses.has(key)) continue
    seenAccesses.add(key)

    if (modelNames.has(access.modelName)) {
      continue // Exact match
    }

    // Check case-insensitive
    const lowerName = access.modelName.toLowerCase()
    if (modelByLowercase.has(lowerName)) {
      const correctName = modelByLowercase.get(lowerName)!
      mismatches.push({
        severity: 'CRITICAL',
        category: 'MODEL_CASE_MISMATCH',
        file: access.file,
        line: access.line,
        modelUsedInCode: access.modelName,
        expectedModel: correctName,
        message: `Model "${access.modelName}" does not exist in schema. Did you mean "${correctName}"?`,
        context: access.context,
        suggestion: `Change "${access.clientVar}.${access.modelName}" to "${access.clientVar}.${correctName}"`,
      })
    } else {
      mismatches.push({
        severity: 'CRITICAL',
        category: 'MODEL_NOT_FOUND',
        file: access.file,
        line: access.line,
        modelUsedInCode: access.modelName,
        message: `Model "${access.modelName}" does not exist in schema and no case-insensitive match found.`,
        context: access.context,
        suggestion: `Check if the model name is correct or if it was removed from the schema.`,
      })
    }
  }

  // Check field references
  const seenFields = new Set<string>()
  for (const ref of fieldRefs) {
    const key = `${ref.file}:${ref.line}:${ref.modelUsedInCode}:${ref.fieldName}`
    if (seenFields.has(key)) continue
    seenFields.add(key)

    // Skip unknown models (already reported)
    if (ref.modelUsedInCode === 'unknown') continue

    const resolvedModelName = modelNames.has(ref.modelUsedInCode)
      ? ref.modelUsedInCode
      : modelByLowercase.get(ref.modelUsedInCode.toLowerCase())

    if (!resolvedModelName) continue // model already reported as mismatch

    const model = models.get(resolvedModelName)!
    const modelFieldLower = new Map<string, string>()
    for (const fn of model.fieldNames) {
      modelFieldLower.set(fn.toLowerCase(), fn)
    }

    // Check if field exists (case-sensitive)
    if (model.fields.has(ref.fieldName)) {
      continue
    }

    // Check case-insensitive
    const lowerField = ref.fieldName.toLowerCase()
    if (modelFieldLower.has(lowerField)) {
      const correctField = modelFieldLower.get(lowerField)!
      const isInclude = ref.kind === 'include'
      const field = model.fields.get(correctField)!

      if (isInclude && !field.isRelation) {
        // Including a non-relation field - wrong pattern
        mismatches.push({
          severity: 'MEDIUM',
          category: 'INCLUDE_NON_RELATION',
          file: ref.file,
          line: ref.line,
          modelUsedInCode: ref.modelUsedInCode,
          field: ref.fieldName,
          message: `Field "${ref.fieldName}" on model "${resolvedModelName}" is not a relation field. Cannot use in .include().`,
          context: ref.context,
          suggestion: `Move "${ref.fieldName}" to .select() instead of .include()`,
        })
      } else {
        mismatches.push({
          severity: 'MEDIUM',
          category: 'FIELD_CASE_MISMATCH',
          file: ref.file,
          line: ref.line,
          modelUsedInCode: ref.modelUsedInCode,
          field: ref.fieldName,
          message: `Field "${ref.fieldName}" on model "${resolvedModelName}" has wrong casing. Schema has "${correctField}".`,
          context: ref.context,
          suggestion: `Change "${ref.fieldName}" to "${correctField}"`,
        })
      }
    } else {
      // Field not found at all
      // Check if it might be a generated field (like _count, _sum)
      if (ref.fieldName.startsWith('_')) continue

      mismatches.push({
        severity: 'HIGH',
        category: 'FIELD_NOT_FOUND',
        file: ref.file,
        line: ref.line,
        modelUsedInCode: ref.modelUsedInCode,
        field: ref.fieldName,
        message: `Field "${ref.fieldName}" does not exist on model "${resolvedModelName}".`,
        context: ref.context,
        suggestion: `Check available fields: ${model.fieldNames.slice(0, 10).join(', ')}${model.fieldNames.length > 10 ? '...' : ''}`,
      })
    }
  }

  return mismatches
}

// ============================================================================
// PART 2: API HEALTH CHECK
// ============================================================================

function discoverApiEndpoints(baseDir: string): { method: string; path: string }[] {
  const endpoints: { method: string; path: string }[] = []
  const apiDir = path.join(baseDir, 'src', 'app', 'api')

  if (!fs.existsSync(apiDir)) return endpoints

  function walk(dir: string, routePath: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        // Handle dynamic routes [param]
        const seg = entry.name.replace(/^\[/, ':').replace(/\]$/, '')
        walk(full, `${routePath}/${seg}`)
      } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
        // Read the route file to detect exported HTTP methods
        const content = fs.readFileSync(full, 'utf-8')
        const methods: string[] = []
        if (/export\s+async\s+function\s+GET/.test(content) || /export\s+function\s+GET/.test(content)) methods.push('GET')
        if (/export\s+async\s+function\s+POST/.test(content) || /export\s+function\s+POST/.test(content)) methods.push('POST')
        if (/export\s+async\s+function\s+PUT/.test(content) || /export\s+function\s+PUT/.test(content)) methods.push('PUT')
        if (/export\s+async\s+function\s+DELETE/.test(content) || /export\s+function\s+DELETE/.test(content)) methods.push('DELETE')
        if (/export\s+async\s+function\s+PATCH/.test(content) || /export\s+function\s+PATCH/.test(content)) methods.push('PATCH')

        if (methods.length === 0) {
          // Default detection
          if (/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/.test(content)) {
            const m = content.match(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g)
            if (m) methods.push(...m.map(x => x.split(/\s+/).pop()!))
          }
        }

        if (methods.length === 0) methods.push('GET') // Assume GET if we can't detect

        const apiPath = `/api${routePath}`
        for (const method of methods) {
          endpoints.push({ method, path: apiPath })
        }
      }
    }
  }

  walk(apiDir, '')
  return endpoints
}

async function checkServerHealth(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: host, port, path: '/api/health', method: 'GET', timeout: 3000 },
      (res) => {
        resolve(true)
        res.resume() // consume response data
        req.destroy()
      }
    )
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
    req.end()
  })
}

async function testEndpoint(
  host: string,
  port: number,
  method: string,
  path: string
): Promise<APIEndpointTest> {
  return new Promise((resolve) => {
    const start = Date.now()
    const payload = method === 'POST' ? JSON.stringify({}) : undefined

    const options: http.RequestOptions = {
      hostname: host,
      port,
      path,
      method,
      timeout: 5000,
      headers: payload
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        : {},
    }

    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        resolve({
          method,
          path,
          statusCode: res.statusCode ?? null,
          responseTime: Date.now() - start,
          error: null,
          responseBody: body.substring(0, 500),
        })
      })
    })

    req.on('error', (err) => {
      resolve({
        method,
        path,
        statusCode: null,
        responseTime: Date.now() - start,
        error: err.message,
        responseBody: null,
      })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({
        method,
        path,
        statusCode: null,
        responseTime: Date.now() - start,
        error: 'Timeout (5s)',
        responseBody: null,
      })
    })

    if (payload) req.write(payload)
    req.end()
  })
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const projectRoot = path.resolve('/home/z/my-project/aitoolkit')
  const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma')
  const apiDir = path.join(projectRoot, 'src', 'app', 'api')
  const libDir = path.join(projectRoot, 'src', 'lib')
  const reportPath = path.resolve('/home/z/my-project/download/api-diagnostic-report.json')

  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    part1: {
      schemaStats: { modelCount: 0, totalFields: 0 },
      scannedFiles: 0,
      totalPrismaAccesses: 0,
      mismatches: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
    },
    part2: {
      serverRunning: false,
      endpointsTested: 0,
      results: [],
      summary: { healthy: 0, unhealthy: 0, unreachable: 0 },
    },
  }

  // =========================================================================
  // PART 1: SCHEMA-CODE CROSS-REFERENCE
  // =========================================================================

  console.log(`\n${'='.repeat(70)}`)
  console.log(`  API DIAGNOSTIC SCRIPT - ${new Date().toISOString()}`)
  console.log(`  Project: ${projectRoot}`)
  console.log(`${'='.repeat(70)}`)

  // Step 1: Parse schema
  const models = parsePrismaSchema(schemaPath)

  let totalFields = 0
  for (const model of models.values()) {
    totalFields += model.fields.size
  }
  report.part1.schemaStats = { modelCount: models.size, totalFields: totalFields }

  console.log(`   Total fields across all models: ${totalFields}`)

  // Step 2: Scan code
  console.log(`\n📁 Scanning code files...`)
  const apiFiles = getAllTsFiles(apiDir)
  const libFiles = getAllTsFiles(libDir)
  const allFiles = [...new Set([...apiFiles, ...libFiles])]

  console.log(`   API route files: ${apiFiles.length}`)
  console.log(`   Lib files: ${libFiles.length}`)
  console.log(`   Total unique files: ${allFiles.length}`)

  const { accesses, fieldRefs } = scanCodeForPrismaUsage(allFiles, models)

  report.part1.scannedFiles = allFiles.length
  report.part1.totalPrismaAccesses = accesses.length

  console.log(`\n🔍 Prisma accesses found: ${accesses.length}`)
  console.log(`   Field references found: ${fieldRefs.length}`)

  // Show unique models used in code
  const uniqueModelsUsed = new Set(accesses.map(a => a.modelName))
  console.log(`   Unique models accessed: ${uniqueModelsUsed.size}`)

  // Show models that exist in schema but never used
  const unusedModels = Array.from(models.keys()).filter(m => !uniqueModelsUsed.has(m))
  if (unusedModels.length > 0) {
    console.log(`\n   Models in schema but NOT accessed in code (${unusedModels.length}):`)
    for (const m of unusedModels.sort()) {
      console.log(`     - ${m}`)
      report.part1.mismatches.push({
        severity: 'LOW',
        category: 'UNUSED_MODEL',
        file: 'schema.prisma',
        line: 0,
        modelUsedInCode: m,
        message: `Model "${m}" exists in schema but is never used in API or lib code.`,
        context: '',
        suggestion: 'Consider removing if not needed, or document its intended use.',
      })
    }
  }

  // Step 3: Cross-reference
  console.log(`\n⚖️  Cross-referencing code against schema...`)
  const mismatches = crossReference(models, accesses, fieldRefs)
  report.part1.mismatches = mismatches

  // Count by severity
  for (const m of mismatches) {
    report.part1.summary[m.severity.toLowerCase() as keyof typeof report.part1.summary]++
  }

  // Print mismatches grouped by severity
  const critical = mismatches.filter(m => m.severity === 'CRITICAL')
  const high = mismatches.filter(m => m.severity === 'HIGH')
  const medium = mismatches.filter(m => m.severity === 'MEDIUM')
  const low = mismatches.filter(m => m.severity === 'LOW')

  if (critical.length > 0) {
    console.log(`\n   🔴 CRITICAL (${critical.length}) - Will cause runtime errors:`)
    for (const m of critical) {
      const relPath = m.file.replace(projectRoot, '')
      console.log(`      [${m.category}] ${relPath}:${m.line}`)
      console.log(`        ${m.message}`)
      if (m.suggestion) console.log(`        💡 ${m.suggestion}`)
    }
  }

  if (high.length > 0) {
    console.log(`\n   🟠 HIGH (${high.length}) - Potential runtime errors:`)
    for (const m of high) {
      const relPath = m.file.replace(projectRoot, '')
      console.log(`      [${m.category}] ${relPath}:${m.line}`)
      console.log(`        ${m.message}`)
      if (m.suggestion) console.log(`        💡 ${m.suggestion}`)
    }
  }

  if (medium.length > 0) {
    console.log(`\n   🟡 MEDIUM (${medium.length}) - Wrong field access or casing:`)
    // Group by file for readability
    const byFile = new Map<string, typeof medium>()
    for (const m of medium) {
      const key = m.file
      if (!byFile.has(key)) byFile.set(key, [])
      byFile.get(key)!.push(m)
    }
    for (const [file, items] of byFile) {
      const relPath = file.replace(projectRoot, '')
      console.log(`      ${relPath} (${items.length} issues):`)
      for (const m of items) {
        console.log(`        L${m.line}: [${m.category}] ${m.field || m.modelUsedInCode} - ${m.message}`)
      }
    }
  }

  if (low.length > 0) {
    console.log(`\n   🔵 LOW (${low.length}) - Cosmetic/informational:`)
    for (const m of low) {
      console.log(`      ${m.message}`)
    }
  }

  if (mismatches.length === 0) {
    console.log(`   ✅ No mismatches found! All Prisma usage is consistent with schema.`)
  }

  // =========================================================================
  // PART 2: API HEALTH CHECK
  // =========================================================================

  console.log(`\n\n${'='.repeat(70)}`)
  console.log(`PART 2: API ENDPOINT HEALTH CHECK`)
  console.log(`${'='.repeat(70)}`)

  const host = 'localhost'
  const port = 3000

  // Check server
  console.log(`\n🌐 Checking server at ${host}:${port}...`)
  const serverRunning = await checkServerHealth(host, port)
  report.part2.serverRunning = serverRunning

  if (!serverRunning) {
    console.log(`   ⚠️  Server is NOT running at http://${host}:${port}`)
    console.log(`   Skipping API health check. Start the server with: npm run dev`)
    console.log(`   Endpoint discovery still runs below...`)
  } else {
    console.log(`   ✅ Server is running!`)
  }

  // Discover endpoints
  console.log(`\n📡 Discovering API endpoints...`)
  const endpoints = discoverApiEndpoints(projectRoot)
  console.log(`   Found ${endpoints.length} endpoint(s) across all route files`)

  // Remove duplicates
  const uniqueEndpoints = new Map<string, { method: string; path: string }>()
  for (const ep of endpoints) {
    const key = `${ep.method} ${ep.path}`
    if (!uniqueEndpoints.has(key)) uniqueEndpoints.set(key, ep)
  }
  const dedupedEndpoints = Array.from(uniqueEndpoints.values())
  console.log(`   Unique endpoints: ${dedupedEndpoints.length}`)

  if (serverRunning) {
    console.log(`\n🏥 Testing endpoints (with 5s timeout each)...\n`)

    // Limit concurrent requests
    const concurrency = 5
    const results: APIEndpointTest[] = []

    for (let i = 0; i < dedupedEndpoints.length; i += concurrency) {
      const batch = dedupedEndpoints.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map(ep => testEndpoint(host, port, ep.method, ep.path))
      )
      results.push(...batchResults)

      // Progress
      process.stdout.write(`   Tested ${Math.min(i + concurrency, dedupedEndpoints.length)}/${dedupedEndpoints.length} endpoints\r`)
    }
    console.log(`   Tested ${results.length}/${dedupedEndpoints.length} endpoints`)

    report.part2.results = results
    report.part2.endpointsTested = results.length

    // Categorize results
    const healthy = results.filter(r => r.statusCode && r.statusCode >= 200 && r.statusCode < 500)
    const unhealthy = results.filter(r => r.statusCode && r.statusCode >= 500)
    const unreachable = results.filter(r => !r.statusCode)

    report.part2.summary = {
      healthy: healthy.length,
      unhealthy: unhealthy.length,
      unreachable: unreachable.length,
    }

    console.log(`\n   📊 Results:`)
    console.log(`      ✅ Healthy (2xx-4xx): ${healthy.length}`)
    console.log(`      🔴 Server Error (5xx): ${unhealthy.length}`)
    console.log(`      ⚠️  Unreachable/Timeout: ${unreachable.length}`)

    if (unhealthy.length > 0) {
      console.log(`\n   🔴 Server Error endpoints:`)
      for (const r of unhealthy) {
        const snippet = r.responseBody ? r.responseBody.substring(0, 150).replace(/\n/g, ' ') : ''
        console.log(`      ${r.method} ${r.path} → ${r.statusCode} (${r.responseTime}ms) ${snippet}`)
      }
    }

    if (unreachable.length > 0) {
      console.log(`\n   ⚠️  Unreachable endpoints:`)
      for (const r of unreachable.slice(0, 20)) {
        console.log(`      ${r.method} ${r.path} → ${r.error || 'unknown'}`)
      }
      if (unreachable.length > 20) {
        console.log(`      ... and ${unreachable.length - 20} more`)
      }
    }
  } else {
    // Still report discovered endpoints
    report.part2.endpointsTested = 0
    console.log(`\n   Discovered ${dedupedEndpoints.length} endpoints (not tested - server offline):`)
    for (const ep of dedupedEndpoints.sort((a, b) => a.path.localeCompare(b.path))) {
      console.log(`      ${ep.method.padEnd(6)} ${ep.path}`)
    }
  }

  // =========================================================================
  // SAVE REPORT
  // =========================================================================

  console.log(`\n\n${'='.repeat(70)}`)
  console.log(`SAVING REPORT`)
  console.log(`${'='.repeat(70)}`)

  const reportDir = path.dirname(reportPath)
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`   Report saved to: ${reportPath}`)

  // =========================================================================
  // FINAL SUMMARY
  // =========================================================================

  console.log(`\n\n${'='.repeat(70)}`)
  console.log(`FINAL SUMMARY`)
  console.log(`${'='.repeat(70)}`)
  console.log(``)
  console.log(`  PART 1: SCHEMA-CODE CROSS-REFERENCE`)
  console.log(`    Models in schema: ${models.size}`)
  console.log(`    Files scanned: ${allFiles.length}`)
  console.log(`    Prisma accesses: ${accesses.length}`)
  console.log(`    Field references: ${fieldRefs.length}`)
  console.log(`    ────────────────────────────────`)
  console.log(`    🔴 CRITICAL: ${report.part1.summary.critical} (will cause 500 errors)`)
  console.log(`    🟠 HIGH:     ${report.part1.summary.high} (potential 500 errors)`)
  console.log(`    🟡 MEDIUM:   ${report.part1.summary.medium} (wrong field access)`)
  console.log(`    🔵 LOW:      ${report.part1.summary.low} (cosmetic/info)`)
  console.log(``)
  console.log(`  PART 2: API HEALTH CHECK`)
  console.log(`    Server running: ${report.part2.serverRunning ? 'YES' : 'NO'}`)
  console.log(`    Endpoints tested: ${report.part2.endpointsTested}`)
  if (report.part2.endpointsTested > 0) {
    console.log(`    ✅ Healthy: ${report.part2.summary.healthy}`)
    console.log(`    🔴 5xx Errors: ${report.part2.summary.unhealthy}`)
    console.log(`    ⚠️  Unreachable: ${report.part2.summary.unreachable}`)
  }
  console.log(``)

  const totalIssues = report.part1.summary.critical + report.part1.summary.high + report.part1.summary.medium
  if (totalIssues > 0) {
    console.log(`  ⚠️  ACTION REQUIRED: ${totalIssues} issue(s) need attention (${report.part1.summary.critical} critical)`)
  } else {
    console.log(`  ✅ No actionable issues found. Code is consistent with schema.`)
  }
  console.log(`${'='.repeat(70)}\n`)

  // Exit with non-zero if critical issues found
  if (report.part1.summary.critical > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Script failed:', err)
  process.exit(2)
})
