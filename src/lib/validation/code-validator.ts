/**
 * Code Validation Pipeline
 * Validates generated code before storage and deployment
 * 
 * TASK-4.1: Code Validation Pipeline
 * Part of Phase 4: Features & User Experience
 */

import { writeFile, unlink } from "fs/promises"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export interface ValidationError {
  line?: number
  column?: number
  endLine?: number
  endColumn?: number
  message: string
  severity: 'error' | 'warning' | 'info'
  code?: string
  source?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: string[]
  stats?: {
    linesAnalyzed: number
    checksPerformed: number
    duration: number
  }
}

export interface PrismaValidationResult extends ValidationResult {
  models?: {
    name: string
    fields: number
    relations: number
    indexes: number
  }[]
}

export interface TypeScriptValidationResult extends ValidationResult {
  imports?: string[]
  exports?: string[]
  components?: string[]
}

export interface OpenAPIValidationResult extends ValidationResult {
  endpoints?: number
  schemas?: number
  version?: string
}

/**
 * Code Validator Class
 * Comprehensive validation for generated code artifacts
 */
export class CodeValidator {
  private tempDir: string = '/tmp/validators'

  /**
   * Validate Prisma Schema
   * Checks syntax, models, relations, indexes, and best practices
   */
  async validatePrismaSchema(schema: string): Promise<PrismaValidationResult> {
    const startTime = Date.now()
    const errors: ValidationError[] = []
    const warnings: string[] = []
    let checksPerformed = 0

    // Parse models
    const models: PrismaValidationResult['models'] = []
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g
    let match

    while ((match = modelRegex.exec(schema)) !== null) {
      checksPerformed++
      const modelName = match[1]
      const body = match[2]

      // Count fields
      const fieldLines = body.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('//') && !l.startsWith('@@'))

      // Count relations
      const relationCount = (body.match(/@relation/g) || []).length

      // Count indexes
      const indexCount = (body.match(/@@index/g) || []).length

      models.push({
        name: modelName,
        fields: fieldLines.length,
        relations: relationCount,
        indexes: indexCount
      })

      // Check for @@map (best practice)
      if (!body.includes('@@map')) {
        warnings.push(`Model "${modelName}" missing @@map directive - consider adding for explicit table mapping`)
      }

      // Check for @id
      if (!body.includes('@id')) {
        errors.push({
          message: `Model "${modelName}" has no primary key (@id)`,
          severity: 'error',
          code: 'MISSING_ID'
        })
      }

      // Check for @createdAt/@updatedAt
      if (!body.includes('@createdAt') && !body.includes('@default(now())')) {
        warnings.push(`Model "${modelName}" has no createdAt timestamp`)
      }

      // Validate field definitions
      for (const line of fieldLines) {
        const fieldMatch = line.match(/^(\w+)\s+(\w+[\?\[\]]?)/)
        if (fieldMatch) {
          const [, fieldName, fieldType] = fieldMatch

          // Check valid Prisma types
          const validTypes = [
            'String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean',
            'DateTime', 'Json', 'Bytes', 'Unsupported'
          ]

          const baseType = fieldType.replace(/[\?\[\]]/g, '')
          if (!validTypes.includes(baseType)) {
            // Might be a relation or enum
            if (!line.includes('@relation') && !schema.includes(`enum ${baseType}`)) {
              warnings.push(
                `Field "${fieldName}" in model "${modelName}" has non-standard type: "${fieldType}" - verify this is a relation or enum`
              )
            }
          }

          // Check for reserved field names
          const reservedNames = ['where', 'select', 'include', 'data', 'create', 'update', 'delete']
          if (reservedNames.includes(fieldName.toLowerCase())) {
            warnings.push(`Field "${fieldName}" in model "${modelName}" uses a reserved Prisma keyword`)
          }

          // Check for proper ID naming
          if (fieldName.toLowerCase() === 'id' && !line.includes('@id')) {
            warnings.push(`Field "id" in model "${modelName}" is not marked as @id`)
          }
        }
      }

      // Check for missing required fields in audit pattern
      if (body.includes('CreatedBy') && !body.includes('UpdatedBy')) {
        warnings.push(`Model "${modelName}" has CreatedBy but missing UpdatedBy - incomplete audit pattern`)
      }
    }

    // Check for datasource configuration
    if (!schema.includes('datasource')) {
      errors.push({
        message: 'Missing datasource configuration',
        severity: 'error',
        code: 'MISSING_DATASOURCE'
      })
    }

    // Check for generator configuration
    if (!schema.includes('generator')) {
      warnings.push('Missing generator configuration - using defaults')
    }

    // Check for enum definitions
    const enumMatches = schema.match(/enum\s+\w+\s*\{[^}]+\}/g) || []

    // Try to validate with Prisma CLI if available
    try {
      const tempPath = `${this.tempDir}/schema_${Date.now()}.prisma`
      await writeFile(tempPath, schema)

      await execAsync(`npx prisma validate --schema=${tempPath} 2>&1`, { timeout: 30000 })

      await unlink(tempPath)
    } catch (error: any) {
      // Parse Prisma CLI errors
      const output = error.stdout || error.stderr || ''
      if (output.includes('error')) {
        const errorLines = output.split('\n').filter((l: string) => l.includes('Error'))

        for (const line of errorLines) {
          // Try to extract line number
          const lineMatch = line.match(/(?:line\s+)?(\d+)/i)
          errors.push({
            line: lineMatch ? parseInt(lineMatch[1]) : undefined,
            message: line.trim(),
            severity: 'error',
            source: 'prisma-cli'
          })
        }
      }
    }

    const duration = Date.now() - startTime

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      models,
      stats: {
        linesAnalyzed: schema.split('\n').length,
        checksPerformed,
        duration
      }
    }
  }

  /**
   * Validate TypeScript/React Code
   * Checks syntax, imports, hooks usage, and best practices
   */
  async validateTypeScript(code: string, filename?: string): Promise<TypeScriptValidationResult> {
    const startTime = Date.now()
    const errors: ValidationError[] = []
    const warnings: string[] = []
    let checksPerformed = 0

    // Extract imports
    const imports: string[] = []
    const importRegex = /import\s+(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g
    let importMatch
    while ((importMatch = importRegex.exec(code)) !== null) {
      imports.push(importMatch[1])
      checksPerformed++
    }

    // Extract exports
    const exports: string[] = []
    const exportRegex = /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g
    let exportMatch
    while ((exportMatch = exportRegex.exec(code)) !== null) {
      exports.push(exportMatch[1])
      checksPerformed++
    }

    // Extract React components
    const components: string[] = []
    const componentRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=|class\s+(\w+)\s+extends)\s*(?:\([^)]*\)|=)/g
    let compMatch
    while ((compMatch = componentRegex.exec(code)) !== null) {
      const compName = compMatch[1] || compMatch[2] || compMatch[3]
      if (compName && compName[0] === compName[0].toUpperCase()) {
        components.push(compName)
      }
    }

    // Security checks
    if (code.includes('eval(')) {
      errors.push({
        message: 'Code contains eval() - potential security risk',
        severity: 'error',
        code: 'SECURITY_EVAL'
      })
      checksPerformed++
    }

    if (code.includes('dangerouslySetInnerHTML')) {
      warnings.push('Code uses dangerouslySetInnerHTML - ensure content is sanitized')
      checksPerformed++
    }

    if (code.includes('innerHTML')) {
      warnings.push('Code uses innerHTML - potential XSS vulnerability')
      checksPerformed++
    }

    // Check for common issues
    if (code.includes(': any')) {
      warnings.push('Code contains explicit "any" type - consider using more specific types')
      checksPerformed++
    }

    // Check for React hooks usage
    const hooksUsed: string[] = []
    const hookRegex = /\b(use[A-Z]\w*)\b/g
    let hookMatch
    while ((hookMatch = hookRegex.exec(code)) !== null) {
      hooksUsed.push(hookMatch[1])
    }

    // Check if React import is needed
    if (hooksUsed.length > 0 || code.includes('jsx') || code.includes('JSX')) {
      const hasReactImport = imports.some(i => i === 'react' || i.startsWith('react/'))
      if (!hasReactImport && code.includes('useState')) {
        // React 17+ doesn't require React import for JSX
        // But hooks still need to be imported if destructured
        const usesDestructuredHooks = /\{\s*(useState|useEffect|useCallback|useMemo|useRef|useContext)\s*\}/.test(code)
        if (!usesDestructuredHooks) {
          warnings.push('Using React hooks but no React import detected')
        }
      }
    }

    // Check for missing useEffect dependencies
    const useEffectMatches = code.match(/useEffect\s*\(\s*\([^)]*\)\s*=>\s*\{[^}]*\}\s*,\s*\[[^\]]*\]\s*\)/g) || []
    for (const match of useEffectMatches) {
      if (match.includes(', []') || match.includes(',[]')) {
        // Empty dependency array - check for potential issues
        const effectBody = match.replace(/useEffect\s*\(\s*\([^)]*\)\s*=>\s*\{/, '').replace(/\}\s*,\s*\[\]\s*\)/, '')
        if (effectBody.includes('props.') || effectBody.includes('state.')) {
          warnings.push('useEffect with empty dependency array references props/state - may cause stale closures')
        }
      }
    }

    // Check for memory leaks patterns
    if (code.includes('setInterval') && !code.includes('clearInterval')) {
      warnings.push('setInterval without clearInterval - potential memory leak')
    }

    if (code.includes('addEventListener') && !code.includes('removeEventListener')) {
      warnings.push('addEventListener without removeEventListener - potential memory leak')
    }

    // Check for async patterns
    if (code.includes('await') && !code.includes('async')) {
      const lines = code.split('\n')
      lines.forEach((line, idx) => {
        if (line.includes('await') && !line.includes('async') && !line.includes('for await')) {
          // Check if the function containing this line is async
          const funcStart = code.lastIndexOf('function', idx) > code.lastIndexOf('=>', idx)
            ? code.lastIndexOf('function', idx)
            : code.lastIndexOf('=>', idx)
          const funcBody = code.substring(funcStart, idx)
          if (!funcBody.includes('async')) {
            errors.push({
              line: idx + 1,
              message: 'await used in non-async function',
              severity: 'error',
              code: 'AWAIT_NO_ASYNC'
            })
          }
        }
      })
    }

    // Try TypeScript compiler validation if available
    try {
      const ext = filename?.endsWith('.tsx') ? 'tsx' : 'ts'
      const tempPath = `${this.tempDir}/code_${Date.now()}.${ext}`
      await writeFile(tempPath, code)

      const { stdout, stderr } = await execAsync(`npx tsc --noEmit --skipLibCheck ${tempPath} 2>&1`, { timeout: 30000 })

      await unlink(tempPath)

      // Parse TypeScript errors
      const output = stdout || stderr
      if (output) {
        const errorLines = output.split('\n')
        for (const line of errorLines) {
          if (line.includes('error TS')) {
            const match = line.match(/(\d+):(\d+).*error TS(\d+):\s*(.+)/)
            if (match) {
              errors.push({
                line: parseInt(match[1]),
                column: parseInt(match[2]),
                message: match[4],
                severity: 'error',
                code: `TS${match[3]}`,
                source: 'tsc'
              })
            }
          }
        }
      }
    } catch (error: any) {
      // TypeScript compiler errors
      const output = error.stdout || error.stderr || ''
      const errorLines = output.split('\n')

      for (const line of errorLines) {
        if (line.includes('error TS')) {
          const match = line.match(/(\d+):(\d+).*error TS(\d+):\s*(.+)/)
          if (match) {
            errors.push({
              line: parseInt(match[1]),
              column: parseInt(match[2]),
              message: match[4],
              severity: 'error',
              code: `TS${match[3]}`,
              source: 'tsc'
            })
          } else {
            // Try alternate format
            const altMatch = line.match(/error TS(\d+):\s*(.+)/)
            if (altMatch) {
              errors.push({
                message: altMatch[2],
                severity: 'error',
                code: `TS${altMatch[1]}`,
                source: 'tsc'
              })
            }
          }
        }
      }
    }

    const duration = Date.now() - startTime

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      imports,
      exports,
      components,
      stats: {
        linesAnalyzed: code.split('\n').length,
        checksPerformed,
        duration
      }
    }
  }

  /**
   * Validate OpenAPI Specification
   * Checks required fields, paths, schemas, and best practices
   */
  async validateOpenAPISpec(spec: Record<string, any>): Promise<OpenAPIValidationResult> {
    const startTime = Date.now()
    const errors: ValidationError[] = []
    const warnings: string[] = []
    let checksPerformed = 0

    // Check OpenAPI version
    if (!spec['openapi']) {
      errors.push({
        message: 'Missing openapi version field',
        severity: 'error',
        code: 'MISSING_VERSION'
      })
    } else if (!spec['openapi'].startsWith('3.')) {
      warnings.push(`OpenAPI version ${spec['openapi']} - consider upgrading to 3.x`)
    }
    checksPerformed++

    // Check info section
    if (!spec['info']) {
      errors.push({
        message: 'Missing info section',
        severity: 'error',
        code: 'MISSING_INFO'
      })
    } else {
      if (!spec['info']['title']) {
        errors.push({
          message: 'Missing info.title',
          severity: 'error',
          code: 'MISSING_TITLE'
        })
      }
      if (!spec['info']['version']) {
        errors.push({
          message: 'Missing info.version',
          severity: 'error',
          code: 'MISSING_API_VERSION'
        })
      }
      if (!spec['info']['description']) {
        warnings.push('Missing info.description - consider adding API description')
      }
      if (!spec['info']['contact']) {
        warnings.push('Missing info.contact - consider adding contact information')
      }
    }
    checksPerformed++

    // Count endpoints
    let endpoints = 0
    const paths = spec['paths'] || {}
    for (const path in paths) {
      const methods = paths[path]
      for (const method in methods) {
        if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method.toLowerCase())) {
          endpoints++
          checksPerformed++

          // Check for operationId
          if (!methods[method]['operationId']) {
            warnings.push(`Path ${path.toUpperCase()} ${path} missing operationId`)
          }

          // Check for responses
          if (!methods[method]['responses']) {
            errors.push({
              message: `Path ${method.toUpperCase()} ${path} missing responses`,
              severity: 'error',
              code: 'MISSING_RESPONSES'
            })
          }

          // Check for description
          if (!methods[method]['description'] && !methods[method]['summary']) {
            warnings.push(`Path ${method.toUpperCase()} ${path} missing description/summary`)
          }
        }
      }
    }

    if (endpoints === 0) {
      warnings.push('No paths defined in API specification')
    }

    // Check servers
    if (!spec['servers'] || spec['servers'].length === 0) {
      warnings.push('No servers defined - consider adding server configurations')
    }
    checksPerformed++

    // Check components/schemas
    let schemas = 0
    if (spec['components']?.['schemas']) {
      schemas = Object.keys(spec['components']['schemas']).length
      checksPerformed++

      // Validate each schema
      for (const schemaName in spec['components']['schemas']) {
        const schemaDef = spec['components']['schemas'][schemaName]

        if (!schemaDef['type'] && !schemaDef['allOf'] && !schemaDef['oneOf'] && !schemaDef['anyOf']) {
          warnings.push(`Schema "${schemaName}" missing type definition`)
        }
      }
    }

    // Check security schemes
    if (spec['security']) {
      if (!spec['components']?.['securitySchemes']) {
        warnings.push('Security requirements defined but no securitySchemes in components')
      }
    }
    checksPerformed++

    // Check for tags
    if (!spec['tags'] || spec['tags'].length === 0) {
      warnings.push('No tags defined - consider adding tags for API organization')
    }
    checksPerformed++

    const duration = Date.now() - startTime

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      endpoints,
      schemas,
      version: spec['openapi'],
      stats: {
        linesAnalyzed: JSON.stringify(spec).length,
        checksPerformed,
        duration
      }
    }
  }

  /**
   * Validate SQL DDL Script
   * Checks syntax, table definitions, constraints, and best practices
   */
  async validateSQL(sql: string): Promise<ValidationResult> {
    const startTime = Date.now()
    const errors: ValidationError[] = []
    const warnings: string[] = []
    let checksPerformed = 0

    // Parse CREATE TABLE statements
    const tableRegex = /CREATE\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([^;]+)\)/gi
    let match

    while ((match = tableRegex.exec(sql)) !== null) {
      checksPerformed++
      const schema = match[1] || 'dbo'
      const tableName = match[2]
      const body = match[3]

      // Check for primary key
      if (!body.includes('PRIMARY KEY') && !body.includes('PRIMARYKEY')) {
        warnings.push(`Table "${tableName}" has no primary key defined`)
      }

      // Check for common audit columns
      const hasCreatedAt = body.toLowerCase().includes('created') || body.toLowerCase().includes('createdat')
      const hasUpdatedAt = body.toLowerCase().includes('modified') || body.toLowerCase().includes('updated')

      if (hasCreatedAt && !hasUpdatedAt) {
        warnings.push(`Table "${tableName}" has created timestamp but missing updated timestamp`)
      }

      // Check for foreign key naming convention
      const fkMatches = body.match(/FOREIGN\s+KEY\s*\(([^)]+)\)/gi) || []
      for (const fkMatch of fkMatches) {
        const columnName = fkMatch.replace(/FOREIGN\s+KEY\s*\(/i, '').replace(')', '').trim()
        if (!columnName.toLowerCase().endsWith('id') && !columnName.toLowerCase().endsWith('_id')) {
          warnings.push(`FK column "${columnName}" in table "${tableName}" doesn't follow Id naming convention`)
        }
      }
    }

    // Check for CREATE PROCEDURE statements
    const procRegex = /CREATE\s+(?:PROC|PROCEDURE)\s+/gi
    const procCount = (sql.match(procRegex) || []).length

    // Check for CREATE VIEW statements
    const viewRegex = /CREATE\s+VIEW\s+/gi
    const viewCount = (sql.match(viewRegex) || []).length

    // Check for common SQL anti-patterns
    if (sql.includes('SELECT *')) {
      warnings.push('Script contains SELECT * - consider specifying columns explicitly')
      checksPerformed++
    }

    if (sql.includes('NOCOUNT OFF')) {
      warnings.push('NOCOUNT OFF may cause performance issues in stored procedures')
      checksPerformed++
    }

    // Check for proper transaction handling
    const beginTranCount = (sql.match(/BEGIN\s+TRAN/gi) || []).length
    const commitCount = (sql.match(/COMMIT/gi) || []).length
    const rollbackCount = (sql.match(/ROLLBACK/gi) || []).length

    if (beginTranCount > 0 && beginTranCount !== commitCount) {
      warnings.push(`Unbalanced transactions: ${beginTranCount} BEGIN TRAN but ${commitCount} COMMIT`)
    }

    if (beginTranCount > 0 && rollbackCount === 0) {
      warnings.push('Transactions without ROLLBACK handling - consider adding error handling')
    }

    const duration = Date.now() - startTime

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      stats: {
        linesAnalyzed: sql.split('\n').length,
        checksPerformed,
        duration
      }
    }
  }

  /**
   * Validate JSON Configuration
   * Checks syntax, schema compliance, and best practices
   */
  async validateJSON(json: string, schema?: Record<string, any>): Promise<ValidationResult> {
    const startTime = Date.now()
    const errors: ValidationError[] = []
    const warnings: string[] = []
    let checksPerformed = 0

    // Try to parse JSON
    let parsed: any
    try {
      parsed = JSON.parse(json)
      checksPerformed++
    } catch (e: any) {
      // Try to find the error location
      const match = e.message.match(/position\s+(\d+)/)
      if (match) {
        const position = parseInt(match[1])
        const beforeError = json.substring(0, position)
        const line = beforeError.split('\n').length
        const lastLine = beforeError.split('\n').pop() || ''
        const column = lastLine.length

        errors.push({
          line,
          column,
          message: `JSON parse error: ${e.message}`,
          severity: 'error',
          code: 'JSON_PARSE_ERROR'
        })
      } else {
        errors.push({
          message: `JSON parse error: ${e.message}`,
          severity: 'error',
          code: 'JSON_PARSE_ERROR'
        })
      }

      return {
        valid: false,
        errors,
        warnings,
        stats: {
          linesAnalyzed: json.split('\n').length,
          checksPerformed,
          duration: Date.now() - startTime
        }
      }
    }

    // Validate against schema if provided
    if (schema) {
      const schemaErrors = this.validateAgainstSchema(parsed, schema, '$')
      errors.push(...schemaErrors)
      checksPerformed++
    }

    const duration = Date.now() - startTime

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      stats: {
        linesAnalyzed: json.split('\n').length,
        checksPerformed,
        duration
      }
    }
  }

  /**
   * Validate data against a simple schema
   */
  private validateAgainstSchema(data: any, schema: any, path: string): ValidationError[] {
    const errors: ValidationError[] = []

    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data

      if (schema.type === 'integer' && !Number.isInteger(data)) {
        errors.push({
          message: `${path}: expected integer, got ${actualType}`,
          severity: 'error',
          code: 'TYPE_MISMATCH'
        })
      } else if (schema.type !== 'integer' && actualType !== schema.type) {
        errors.push({
          message: `${path}: expected ${schema.type}, got ${actualType}`,
          severity: 'error',
          code: 'TYPE_MISMATCH'
        })
      }
    }

    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (data[field] === undefined) {
          errors.push({
            message: `${path}.${field}: required field missing`,
            severity: 'error',
            code: 'REQUIRED_MISSING'
          })
        }
      }
    }

    if (schema.properties && typeof data === 'object') {
      for (const key in schema.properties) {
        if (data[key] !== undefined) {
          const childErrors = this.validateAgainstSchema(
            data[key],
            schema.properties[key],
            `${path}.${key}`
          )
          errors.push(...childErrors)
        }
      }
    }

    if (schema.items && Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        const childErrors = this.validateAgainstSchema(
          data[i],
          schema.items,
          `${path}[${i}]`
        )
        errors.push(...childErrors)
      }
    }

    return errors
  }

  /**
   * Batch validation for multiple files
   */
  async validateBatch(files: Array<{
    type: 'prisma' | 'typescript' | 'openapi' | 'sql' | 'json'
    content: string | Record<string, any>
    filename?: string
  }>): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>()

    for (const file of files) {
      const key = file.filename || `${file.type}-${Date.now()}`

      switch (file.type) {
        case 'prisma':
          results.set(key, await this.validatePrismaSchema(file.content as string))
          break
        case 'typescript':
          results.set(key, await this.validateTypeScript(file.content as string, file.filename))
          break
        case 'openapi':
          results.set(key, await this.validateOpenAPISpec(file.content as Record<string, any>))
          break
        case 'sql':
          results.set(key, await this.validateSQL(file.content as string))
          break
        case 'json':
          results.set(key, await this.validateJSON(file.content as string))
          break
      }
    }

    return results
  }
}

// Export singleton instance
export const codeValidator = new CodeValidator()

/**
 * Quick validation functions
 */
export async function validatePrisma(schema: string): Promise<PrismaValidationResult> {
  return codeValidator.validatePrismaSchema(schema)
}

export async function validateTypeScript(code: string, filename?: string): Promise<TypeScriptValidationResult> {
  return codeValidator.validateTypeScript(code, filename)
}

export async function validateOpenAPI(spec: Record<string, any>): Promise<OpenAPIValidationResult> {
  return codeValidator.validateOpenAPISpec(spec)
}

export async function validateSQL(sql: string): Promise<ValidationResult> {
  return codeValidator.validateSQL(sql)
}

export async function validateJSON(json: string): Promise<ValidationResult> {
  return codeValidator.validateJSON(json)
}
