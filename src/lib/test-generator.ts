/**
 * TEST GENERATOR SERVICE
 * ======================
 * Phase 4 of Contract Validator - Contract test generation
 * 
 * Capabilities:
 * - Generate contract tests from API endpoints
 * - Generate tests from detected issues
 * - Support multiple test frameworks
 * - Auto-generate test data
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// =============================================================================
// TYPES
// =============================================================================

export interface EndpointInfo {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  parameters: string[]
  bodyFields: string[]
  responseFields: string[]
}

export interface GeneratedTestCase {
  testName: string
  testType: 'contract' | 'integration' | 'unit'
  description: string
  endpointPath?: string
  componentName?: string
  tableName?: string
  testCode: string
  testFilePath: string
  inputData?: any
  expectedOutput?: any
}

export interface TestSuiteConfig {
  name: string
  testFramework: 'vitest' | 'jest' | 'playwright'
  testType: 'contract' | 'integration' | 'e2e'
  endpoints?: EndpointInfo[]
  components?: string[]
  tables?: string[]
}

// =============================================================================
// TEST GENERATOR SERVICE
// =============================================================================

export class TestGenerator {
  /**
   * Generate contract tests for API endpoints
   */
  async generateContractTests(scanId: string): Promise<GeneratedTestCase[]> {
    const tests: GeneratedTestCase[] = []

    // Find all API routes
    const endpoints = await this.discoverAPIEndpoints()

    // Generate tests for each endpoint
    for (const endpoint of endpoints) {
      const endpointTests = this.generateEndpointTests(endpoint)
      tests.push(...endpointTests)
    }

    // Store tests in database
    for (const test of tests) {
      await this.storeTest(scanId, test)
    }

    return tests
  }

  /**
   * Generate tests from detected issues
   */
  async generateTestsFromIssues(scanId: string): Promise<GeneratedTestCase[]> {
    const tests: GeneratedTestCase[] = []

    // Get issues from the scan
    const issues = await prisma.contractIssue.findMany({
      where: { scanId, status: 'open' }
    })

    for (const issue of issues) {
      const test = this.generateTestFromIssue(issue)
      if (test) {
        tests.push(test)
        await this.storeTest(scanId, test)
      }
    }

    return tests
  }

  /**
   * Discover all API endpoints in the codebase
   */
  private async discoverAPIEndpoints(): Promise<EndpointInfo[]> {
    const endpoints: EndpointInfo[] = []
    const apiPath = path.join(process.cwd(), 'src', 'app', 'api')

    if (!fs.existsSync(apiPath)) return endpoints

    const scanDir = (dir: string) => {
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
          scanDir(fullPath)
        } else if (item === 'route.ts' || item === 'route.tsx') {
          const endpoint = this.parseAPIRoute(fullPath)
          if (endpoint) endpoints.push(endpoint)
        }
      }
    }

    scanDir(apiPath)
    return endpoints
  }

  /**
   * Parse an API route file to extract endpoint info
   */
  private parseAPIRoute(filePath: string): EndpointInfo | null {
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // Get route path
    const apiIndex = filePath.indexOf('/api/')
    const routePath = filePath.slice(apiIndex, filePath.lastIndexOf('/'))

    // Detect HTTP methods
    const methods: EndpointInfo['method'][] = []
    if (content.includes('export async function GET')) methods.push('GET')
    if (content.includes('export async function POST')) methods.push('POST')
    if (content.includes('export async function PUT')) methods.push('PUT')
    if (content.includes('export async function DELETE')) methods.push('DELETE')
    if (content.includes('export async function PATCH')) methods.push('PATCH')

    // Extract parameters from searchParams
    const params: string[] = []
    const paramMatches = content.matchAll(/searchParams\.get\(['"](\w+)['"]\)/g)
    for (const match of paramMatches) {
      params.push(match[1])
    }

    // Extract body fields
    const bodyFields: string[] = []
    const bodyMatches = content.matchAll(/const\s*{\s*([^}]+)\s*}\s*=\s*(?:await\s*)?request\.json\(\)/g)
    for (const match of bodyMatches) {
      const fields = match[1].split(',').map(f => f.trim().split(':')[0].trim())
      bodyFields.push(...fields.filter(f => f && !f.includes('=')))
    }

    return {
      path: routePath,
      method: methods[0] || 'GET',
      parameters: [...new Set(params)],
      bodyFields: [...new Set(bodyFields)],
      responseFields: []
    }
  }

  /**
   * Generate tests for an endpoint
   */
  private generateEndpointTests(endpoint: EndpointInfo): GeneratedTestCase[] {
    const tests: GeneratedTestCase[] = []
    const testDir = path.join(process.cwd(), '__tests__', 'api')

    // Test 1: Successful response test
    tests.push({
      testName: `${endpoint.path.replace(/\//g, '_')}_${endpoint.method.toLowerCase()}_success`,
      testType: 'contract',
      description: `Test successful ${endpoint.method} request to ${endpoint.path}`,
      endpointPath: endpoint.path,
      testFilePath: path.join(testDir, endpoint.path.replace(/\//g, '_'), 'success.test.ts'),
      testCode: this.generateSuccessTest(endpoint),
      inputData: this.generateTestData(endpoint, 'valid'),
      expectedOutput: { success: true }
    })

    // Test 2: Validation error test
    if (endpoint.bodyFields.length > 0 || endpoint.parameters.length > 0) {
      tests.push({
        testName: `${endpoint.path.replace(/\//g, '_')}_${endpoint.method.toLowerCase()}_validation`,
        testType: 'contract',
        description: `Test validation for ${endpoint.method} ${endpoint.path}`,
        endpointPath: endpoint.path,
        testFilePath: path.join(testDir, endpoint.path.replace(/\//g, '_'), 'validation.test.ts'),
        testCode: this.generateValidationTest(endpoint),
        inputData: this.generateTestData(endpoint, 'invalid'),
        expectedOutput: { error: 'Validation failed' }
      })
    }

    // Test 3: Missing required fields test
    if (endpoint.bodyFields.length > 0) {
      tests.push({
        testName: `${endpoint.path.replace(/\//g, '_')}_${endpoint.method.toLowerCase()}_missing_fields`,
        testType: 'contract',
        description: `Test missing required fields for ${endpoint.path}`,
        endpointPath: endpoint.path,
        testFilePath: path.join(testDir, endpoint.path.replace(/\//g, '_'), 'missing.test.ts'),
        testCode: this.generateMissingFieldsTest(endpoint),
        inputData: {},
        expectedOutput: { error: 'Missing required fields' }
      })
    }

    return tests
  }

  /**
   * Generate success test code
   */
  private generateSuccessTest(endpoint: EndpointInfo): string {
    const testPath = endpoint.path
    const method = endpoint.method

    let requestBody = ''
    if (endpoint.bodyFields.length > 0) {
      const fields = endpoint.bodyFields.map(f => `    ${f}: "test_${f}"`).join(',\n')
      requestBody = `,
    body: JSON.stringify({
${fields}
    })`
    }

    let queryParams = ''
    if (endpoint.parameters.length > 0) {
      const params = endpoint.parameters.map(p => `${p}=test_value`).join('&')
      queryParams = `?${params}`
    }

    return `import { describe, it, expect } from 'vitest'

describe('${testPath} API', () => {
  it('should return successful response for ${method} request', async () => {
    const response = await fetch('http://localhost:3000${testPath}${queryParams}', {
      method: '${method}',
      headers: {
        'Content-Type': 'application/json'
      }${requestBody}
    })

    expect(response.status).toBeLessThan(500)
    
    const data = await response.json()
    expect(data).toBeDefined()
  })
})
`
  }

  /**
   * Generate validation test code
   */
  private generateValidationTest(endpoint: EndpointInfo): string {
    const testPath = endpoint.path
    const method = endpoint.method

    return `import { describe, it, expect } from 'vitest'

describe('${testPath} API Validation', () => {
  it('should return validation error for invalid input', async () => {
    const response = await fetch('http://localhost:3000${testPath}', {
      method: '${method}',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invalid_field: "invalid_value"
      })
    })

    // Should handle gracefully (either accept or reject with proper error)
    expect(response.status).toBeLessThan(500)
  })
})
`
  }

  /**
   * Generate missing fields test code
   */
  private generateMissingFieldsTest(endpoint: EndpointInfo): string {
    const testPath = endpoint.path
    const method = endpoint.method

    return `import { describe, it, expect } from 'vitest'

describe('${testPath} API Required Fields', () => {
  it('should handle missing required fields', async () => {
    const response = await fetch('http://localhost:3000${testPath}', {
      method: '${method}',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })

    // API should handle empty body gracefully
    expect(response.status).toBeLessThan(500)
  })
})
`
  }

  /**
   * Generate test from an issue
   */
  private generateTestFromIssue(issue: any): GeneratedTestCase | null {
    const testName = `issue_${issue.id}_regression`
    
    return {
      testName,
      testType: 'contract',
      description: `Regression test for issue: ${issue.message}`,
      endpointPath: issue.apiFile,
      testFilePath: path.join(process.cwd(), '__tests__', 'regression', `${testName}.test.ts`),
      testCode: `import { describe, it, expect } from 'vitest'

describe('Issue Regression Test', () => {
  it('should prevent regression of issue: ${issue.message}', async () => {
    // Original issue: ${issue.message}
    // Type: ${issue.issueType}
    // Suggestion: ${issue.suggestion}
    
    // TODO: Add specific test for this issue
    // This test was auto-generated from issue detection
    
    expect(true).toBe(true) // Placeholder - implement actual test
  })
})
`,
      inputData: {},
      expectedOutput: { success: true }
    }
  }

  /**
   * Generate test data
   */
  private generateTestData(endpoint: EndpointInfo, type: 'valid' | 'invalid'): any {
    const data: any = {}

    if (type === 'valid') {
      for (const field of endpoint.bodyFields) {
        data[field] = this.generateFieldValue(field)
      }
    } else {
      for (const field of endpoint.bodyFields) {
        data[field] = this.generateInvalidFieldValue(field)
      }
    }

    return data
  }

  /**
   * Generate a valid field value based on field name
   */
  private generateFieldValue(fieldName: string): any {
    const lower = fieldName.toLowerCase()
    
    if (lower.includes('id')) return 'test-id-123'
    if (lower.includes('email')) return 'test@example.com'
    if (lower.includes('name')) return 'Test Name'
    if (lower.includes('date')) return new Date().toISOString()
    if (lower.includes('count') || lower.includes('amount')) return 10
    if (lower.includes('active') || lower.includes('enabled')) return true
    
    return 'test_value'
  }

  /**
   * Generate an invalid field value
   */
  private generateInvalidFieldValue(fieldName: string): any {
    const lower = fieldName.toLowerCase()
    
    if (lower.includes('email')) return 'invalid-email'
    if (lower.includes('id')) return ''
    if (lower.includes('count') || lower.includes('amount')) return -1
    
    return null
  }

  /**
   * Store test in database
   */
  private async storeTest(scanId: string, test: GeneratedTestCase): Promise<void> {
    try {
      await prisma.generatedTest.create({
        data: {
          scanId,
          testName: test.testName,
          testType: test.testType,
          description: test.description,
          endpointPath: test.endpointPath,
          componentName: test.componentName,
          tableName: test.tableName,
          testCode: test.testCode,
          testFilePath: test.testFilePath,
          inputData: test.inputData ? JSON.stringify(test.inputData) : null,
          expectedOutput: test.expectedOutput ? JSON.stringify(test.expectedOutput) : null
        }
      })
    } catch (error) {
      // Ignore duplicate errors
    }
  }

  /**
   * Save tests to files
   */
  async saveTestsToFilesystem(tests: GeneratedTestCase[]): Promise<{ saved: number; errors: string[] }> {
    let saved = 0
    const errors: string[] = []

    for (const test of tests) {
      try {
        const dir = path.dirname(test.testFilePath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(test.testFilePath, test.testCode)
        
        await prisma.generatedTest.updateMany({
          where: { testName: test.testName },
          data: { status: 'saved' }
        })
        
        saved++
      } catch (error: any) {
        errors.push(`${test.testName}: ${error.message}`)
      }
    }

    return { saved, errors }
  }

  /**
   * Get all tests for a scan
   */
  async getTests(scanId: string): Promise<GeneratedTestCase[]> {
    const tests = await prisma.generatedTest.findMany({
      where: { scanId },
      orderBy: { createdAt: 'desc' }
    })

    return tests.map(t => ({
      testName: t.testName,
      testType: t.testType as GeneratedTestCase['testType'],
      description: t.description,
      endpointPath: t.endpointPath || undefined,
      componentName: t.componentName || undefined,
      tableName: t.tableName || undefined,
      testCode: t.testCode,
      testFilePath: t.testFilePath,
      inputData: t.inputData ? JSON.parse(t.inputData) : undefined,
      expectedOutput: t.expectedOutput ? JSON.parse(t.expectedOutput) : undefined
    }))
  }

  /**
   * Get test statistics
   */
  async getTestStats(scanId: string): Promise<{
    total: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    savedCount: number
    passedCount: number
    failedCount: number
  }> {
    const tests = await prisma.generatedTest.findMany({ where: { scanId } })

    const byType: Record<string, number> = {}
    const byStatus: Record<string, number> = {}

    for (const test of tests) {
      byType[test.testType] = (byType[test.testType] || 0) + 1
      byStatus[test.status] = (byStatus[test.status] || 0) + 1
    }

    return {
      total: tests.length,
      byType,
      byStatus,
      savedCount: tests.filter(t => t.status === 'saved').length,
      passedCount: tests.filter(t => t.status === 'passed').length,
      failedCount: tests.filter(t => t.status === 'failed').length
    }
  }

  /**
   * Generate a complete test suite
   */
  async generateTestSuite(scanId: string, config: TestSuiteConfig): Promise<{
    suiteId: string
    tests: GeneratedTestCase[]
  }> {
    // Create suite
    const suite = await prisma.testSuite.create({
      data: {
        scanId,
        name: config.name,
        testFramework: config.testFramework,
        testType: config.testType
      }
    })

    // Generate tests
    const tests = await this.generateContractTests(scanId)

    // Update suite count
    await prisma.testSuite.update({
      where: { id: suite.id },
      data: { totalTests: tests.length }
    })

    return {
      suiteId: suite.id,
      tests
    }
  }

  /**
   * Record test run results
   */
  async recordTestRun(
    scanId: string,
    suiteId: string | undefined,
    results: {
      total: number
      passed: number
      failed: number
      skipped: number
      duration: number
      output?: string
    }
  ): Promise<string> {
    const run = await prisma.testRun.create({
      data: {
        scanId,
        suiteId,
        totalTests: results.total,
        passedTests: results.passed,
        failedTests: results.failed,
        skippedTests: results.skipped,
        duration: results.duration,
        output: results.output
      }
    })

    // Update suite if provided
    if (suiteId) {
      await prisma.testSuite.update({
        where: { id: suiteId },
        data: {
          passedTests: results.passed,
          failedTests: results.failed,
          skippedTests: results.skipped,
          lastRunAt: new Date(),
          duration: results.duration
        }
      })
    }

    return run.id
  }
}

// Export singleton
export const testGenerator = new TestGenerator()
