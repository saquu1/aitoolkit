/**
 * Code Validation API Routes
 * TASK-4.1: Code Validation Pipeline
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  CodeValidator,
  codeValidator,
  validatePrisma,
  validateTypeScript,
  validateOpenAPI,
  validateSQL,
  validateJSON,
  ValidationResult
} from '@/lib/validation/code-validator'

// GET /api/validation - List validation capabilities
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action')

  if (action === 'list-types') {
    return NextResponse.json({
      types: [
        { id: 'prisma', name: 'Prisma Schema', extensions: ['.prisma'] },
        { id: 'typescript', name: 'TypeScript/React', extensions: ['.ts', '.tsx'] },
        { id: 'openapi', name: 'OpenAPI Specification', extensions: ['.json', '.yaml'] },
        { id: 'sql', name: 'SQL DDL', extensions: ['.sql'] },
        { id: 'json', name: 'JSON Configuration', extensions: ['.json'] }
      ],
      features: [
        'Syntax validation',
        'Type checking',
        'Security scanning',
        'Best practices checking',
        'Batch processing'
      ]
    })
  }

  if (action === 'stats') {
    // Return validation statistics
    return NextResponse.json({
      totalValidations: 0, // Would track in database
      byType: {
        prisma: 0,
        typescript: 0,
        openapi: 0,
        sql: 0,
        json: 0
      }
    })
  }

  return NextResponse.json({
    error: 'Invalid action. Use: list-types, stats'
  }, { status: 400 })
}

// POST /api/validation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'validate':
        return await handleValidate(body)

      case 'validate-batch':
        return await handleValidateBatch(body)

      case 'validate-prisma':
        return await handleValidatePrisma(body)

      case 'validate-typescript':
        return await handleValidateTypeScript(body)

      case 'validate-openapi':
        return await handleValidateOpenAPI(body)

      case 'validate-sql':
        return await handleValidateSQL(body)

      case 'validate-json':
        return await handleValidateJSON(body)

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: [
            'validate - Auto-detect and validate',
            'validate-batch - Validate multiple files',
            'validate-prisma - Validate Prisma schema',
            'validate-typescript - Validate TypeScript/React',
            'validate-openapi - Validate OpenAPI spec',
            'validate-sql - Validate SQL DDL',
            'validate-json - Validate JSON'
          ]
        }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Validation API error:', error)
    return NextResponse.json({
      error: 'Validation failed',
      message: error.message
    }, { status: 500 })
  }
}

/**
 * Auto-detect and validate
 */
async function handleValidate(body: any) {
  const { content, filename, type } = body

  if (!content) {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 })
  }

  // Auto-detect type from filename if not provided
  const detectedType = type || detectType(filename)

  if (!detectedType) {
    return NextResponse.json({
      error: 'Could not detect validation type. Please specify type or provide filename.'
    }, { status: 400 })
  }

  let result: ValidationResult

  switch (detectedType) {
    case 'prisma':
      result = await validatePrisma(content)
      break
    case 'typescript':
      result = await validateTypeScript(content, filename)
      break
    case 'openapi':
      result = await validateOpenAPI(typeof content === 'string' ? JSON.parse(content) : content)
      break
    case 'sql':
      result = await validateSQL(content)
      break
    case 'json':
      result = await validateJSON(content)
      break
    default:
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    type: detectedType,
    result
  })
}

/**
 * Batch validation
 */
async function handleValidateBatch(body: any) {
  const { files } = body

  if (!files || !Array.isArray(files)) {
    return NextResponse.json({ error: 'Missing or invalid files array' }, { status: 400 })
  }

  const validator = new CodeValidator()
  const results = await validator.validateBatch(
    files.map((f: any) => ({
      type: f.type || detectType(f.filename),
      content: f.content,
      filename: f.filename
    }))
  )

  // Convert Map to object for JSON serialization
  const resultsObj: Record<string, ValidationResult> = {}
  results.forEach((value, key) => {
    resultsObj[key] = value
  })

  const summary = {
    total: files.length,
    valid: Object.values(resultsObj).filter(r => r.valid).length,
    invalid: Object.values(resultsObj).filter(r => !r.valid).length,
    totalErrors: Object.values(resultsObj).reduce((sum, r) =>
      sum + r.errors.filter(e => e.severity === 'error').length, 0),
    totalWarnings: Object.values(resultsObj).reduce((sum, r) =>
      sum + r.warnings.length, 0)
  }

  return NextResponse.json({
    success: true,
    summary,
    results: resultsObj
  })
}

/**
 * Validate Prisma schema
 */
async function handleValidatePrisma(body: any) {
  const { schema } = body

  if (!schema) {
    return NextResponse.json({ error: 'Missing schema' }, { status: 400 })
  }

  const result = await validatePrisma(schema)

  return NextResponse.json({
    success: true,
    result
  })
}

/**
 * Validate TypeScript/React code
 */
async function handleValidateTypeScript(body: any) {
  const { code, filename } = body

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  const result = await validateTypeScript(code, filename)

  return NextResponse.json({
    success: true,
    result
  })
}

/**
 * Validate OpenAPI specification
 */
async function handleValidateOpenAPI(body: any) {
  const { spec } = body

  if (!spec) {
    return NextResponse.json({ error: 'Missing spec' }, { status: 400 })
  }

  const specObj = typeof spec === 'string' ? JSON.parse(spec) : spec
  const result = await validateOpenAPI(specObj)

  return NextResponse.json({
    success: true,
    result
  })
}

/**
 * Validate SQL DDL
 */
async function handleValidateSQL(body: any) {
  const { sql } = body

  if (!sql) {
    return NextResponse.json({ error: 'Missing sql' }, { status: 400 })
  }

  const result = await validateSQL(sql)

  return NextResponse.json({
    success: true,
    result
  })
}

/**
 * Validate JSON
 */
async function handleValidateJSON(body: any) {
  const { json, schema } = body

  if (!json) {
    return NextResponse.json({ error: 'Missing json' }, { status: 400 })
  }

  const result = await validateJSON(json, schema)

  return NextResponse.json({
    success: true,
    result
  })
}

/**
 * Detect file type from filename
 */
function detectType(filename?: string): string | null {
  if (!filename) return null

  const ext = filename.toLowerCase().split('.').pop()

  switch (ext) {
    case 'prisma':
      return 'prisma'
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'sql':
      return 'sql'
    case 'json':
      return 'json'
    case 'yaml':
    case 'yml':
      // Could be OpenAPI
      return 'openapi'
    default:
      return null
  }
}
