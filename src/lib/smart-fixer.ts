/**
 * SMART FIXER SERVICE
 * ===================
 * Phase 3 of Contract Validator - Intelligent fix suggestions
 * 
 * Capabilities:
 * - Analyze issues and generate fix suggestions
 * - Compare impact of different fix approaches
 * - Learn from past fixes (pattern matching)
 * - Provide confidence scores for fixes
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import crypto from 'crypto'

const prisma = new PrismaClient()

// =============================================================================
// TYPES
// =============================================================================

export interface IssueAnalysis {
  issueId: string
  issueType: 'missing_param' | 'type_mismatch' | 'undefined_access' | 'unknown_endpoint' | 'extra_param'
  severity: 'error' | 'warning' | 'info'
  message: string
  frontendFile?: string
  frontendLine?: number
  apiFile?: string
  suggestion: string
}

export interface FixSuggestionResult {
  id: string
  fixType: string
  description: string
  codeChange: {
    file: string
    oldCode: string
    newCode: string
    lineStart: number
    lineEnd: number
  }
  affectedFiles: string[]
  affectedEntities: string[]
  impactScore: number
  effortLevel: 'trivial' | 'easy' | 'medium' | 'hard' | 'complex'
  estimatedTime: number
  confidence: number
  autoSafe: boolean
  alternatives: string[]
  preferredFix: boolean
}

export interface FixComparison {
  fixId: string
  description: string
  filesToChange: number
  entitiesAffected: number
  riskLevel: 'low' | 'medium' | 'high'
  effort: 'trivial' | 'easy' | 'medium' | 'hard' | 'complex'
  recommended: boolean
}

// =============================================================================
// SMART FIXER SERVICE
// =============================================================================

export class SmartFixer {
  /**
   * Generate fix suggestions for an issue
   */
  async generateFixes(issue: IssueAnalysis): Promise<FixSuggestionResult[]> {
    const fixes: FixSuggestionResult[] = []

    // Get issue-specific fix strategies
    switch (issue.issueType) {
      case 'missing_param':
        fixes.push(...await this.generateMissingParamFixes(issue))
        break
      case 'type_mismatch':
        fixes.push(...await this.generateTypeMismatchFixes(issue))
        break
      case 'undefined_access':
        fixes.push(...await this.generateUndefinedAccessFixes(issue))
        break
      case 'unknown_endpoint':
        fixes.push(...await this.generateUnknownEndpointFixes(issue))
        break
      case 'extra_param':
        fixes.push(...await this.generateExtraParamFixes(issue))
        break
    }

    // Check for learned patterns
    const patternFixes = await this.applyLearnedPatterns(issue)
    fixes.push(...patternFixes)

    // Calculate impact and mark preferred fix
    for (const fix of fixes) {
      fix.impactScore = await this.calculateImpactScore(fix)
      fix.autoSafe = this.determineAutoSafe(fix)
    }

    // Sort by confidence and impact, mark best as preferred
    fixes.sort((a, b) => {
      const scoreA = a.confidence * 0.6 + (1 - a.impactScore / 100) * 0.4
      const scoreB = b.confidence * 0.6 + (1 - b.impactScore / 100) * 0.4
      return scoreB - scoreA
    })

    if (fixes.length > 0) {
      fixes[0].preferredFix = true
    }

    // Store suggestions in database
    for (const fix of fixes) {
      await this.storeSuggestion(issue.issueId, fix)
    }

    return fixes
  }

  /**
   * Generate fixes for missing parameter issues
   */
  private async generateMissingParamFixes(issue: IssueAnalysis): Promise<FixSuggestionResult[]> {
    const fixes: FixSuggestionResult[] = []

    // Fix 1: Add parameter to frontend call
    if (issue.frontendFile && issue.frontendLine) {
      const frontendFix = await this.createAddParamToFrontendFix(issue)
      if (frontendFix) fixes.push(frontendFix)
    }

    // Fix 2: Make parameter optional in API
    if (issue.apiFile) {
      const apiFix = await this.createOptionalParamInApiFix(issue)
      if (apiFix) fixes.push(apiFix)
    }

    // Fix 3: Add default value in API
    if (issue.apiFile) {
      const defaultFix = await this.createDefaultValueFix(issue)
      if (defaultFix) fixes.push(defaultFix)
    }

    return fixes
  }

  /**
   * Generate fixes for type mismatch issues
   */
  private async generateTypeMismatchFixes(issue: IssueAnalysis): Promise<FixSuggestionResult[]> {
    const fixes: FixSuggestionResult[] = []

    // Fix 1: Convert type in frontend
    if (issue.frontendFile) {
      const convertFix = await this.createTypeConversionFix(issue)
      if (convertFix) fixes.push(convertFix)
    }

    // Fix 2: Update API to accept both types
    if (issue.apiFile) {
      const apiFix = await this.createFlexibleTypeFix(issue)
      if (apiFix) fixes.push(apiFix)
    }

    return fixes
  }

  /**
   * Generate fixes for undefined access issues
   */
  private async generateUndefinedAccessFixes(issue: IssueAnalysis): Promise<FixSuggestionResult[]> {
    const fixes: FixSuggestionResult[] = []

    // Fix 1: Add optional chaining
    if (issue.frontendFile && issue.frontendLine) {
      const optionalChainFix = await this.createOptionalChainingFix(issue)
      if (optionalChainFix) fixes.push(optionalChainFix)
    }

    // Fix 2: Add null check with fallback
    if (issue.frontendFile && issue.frontendLine) {
      const nullCheckFix = await this.createNullCheckFix(issue)
      if (nullCheckFix) fixes.push(nullCheckFix)
    }

    // Fix 3: Add default value
    if (issue.apiFile) {
      const defaultFix = await this.createApiDefaultFix(issue)
      if (defaultFix) fixes.push(defaultFix)
    }

    return fixes
  }

  /**
   * Generate fixes for unknown endpoint issues
   */
  private async generateUnknownEndpointFixes(issue: IssueAnalysis): Promise<FixSuggestionResult[]> {
    const fixes: FixSuggestionResult[] = []

    // Fix 1: Create the missing endpoint
    const createEndpointFix = await this.createCreateEndpointFix(issue)
    if (createEndpointFix) fixes.push(createEndpointFix)

    // Fix 2: Update frontend to use correct endpoint
    if (issue.frontendFile) {
      const updateEndpointFix = await this.createUpdateEndpointFix(issue)
      if (updateEndpointFix) fixes.push(updateEndpointFix)
    }

    return fixes
  }

  /**
   * Generate fixes for extra parameter issues
   */
  private async generateExtraParamFixes(issue: IssueAnalysis): Promise<FixSuggestionResult[]> {
    const fixes: FixSuggestionResult[] = []

    // Fix 1: Remove extra parameter from frontend
    if (issue.frontendFile) {
      const removeParamFix = await this.createRemoveParamFix(issue)
      if (removeParamFix) fixes.push(removeParamFix)
    }

    // Fix 2: Update API to accept extra parameter
    if (issue.apiFile) {
      const acceptParamFix = await this.createAcceptParamFix(issue)
      if (acceptParamFix) fixes.push(acceptParamFix)
    }

    return fixes
  }

  // =============================================================================
// FIX CREATION HELPERS
  // =============================================================================

  private async createAddParamToFrontendFix(issue: IssueAnalysis): Promise<FixSuggestionResult | null> {
    try {
      const filePath = path.join(process.cwd(), issue.frontendFile!)
      if (!fs.existsSync(filePath)) return null

      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      const lineIndex = (issue.frontendLine || 1) - 1

      // Find the fetch call or API call
      const line = lines[lineIndex]
      
      // Extract the missing parameter from the suggestion
      const missingParamMatch = issue.suggestion.match(/"(\w+)"/)
      const missingParam = missingParamMatch ? missingParamMatch[1] : 'param'

      // Create fix
      const fixId = crypto.randomBytes(8).toString('hex')
      
      return {
        id: fixId,
        fixType: 'add_param',
        description: `Add "${missingParam}" parameter to frontend API call`,
        codeChange: {
          file: issue.frontendFile!,
          oldCode: line,
          newCode: line.replace(/{/, `{ ${missingParam}: <value>, `),
          lineStart: lineIndex + 1,
          lineEnd: lineIndex + 1
        },
        affectedFiles: [issue.frontendFile!],
        affectedEntities: [],
        impactScore: 10,
        effortLevel: 'easy',
        estimatedTime: 5,
        confidence: 0.85,
        autoSafe: false,
        alternatives: [],
        preferredFix: false
      }
    } catch (error) {
      return null
    }
  }

  private async createOptionalParamInApiFix(issue: IssueAnalysis): Promise<FixSuggestionResult | null> {
    try {
      const filePath = path.join(process.cwd(), issue.apiFile!)
      if (!fs.existsSync(filePath)) return null

      const content = fs.readFileSync(filePath, 'utf-8')
      
      // Find destructuring pattern
      const destructMatch = content.match(/const\s*{\s*([^}]+)\s*}\s*=\s*(?:await\s*)?request\.json\(\)/)
      if (!destructMatch) return null

      const params = destructMatch[1].split(',').map(p => p.trim())
      const missingParamMatch = issue.suggestion.match(/"(\w+)"/)
      const missingParam = missingParamMatch ? missingParamMatch[1] : 'param'

      // Add as optional parameter
      const newParams = [...params, `${missingParam}?`].join(', ')
      const oldCode = destructMatch[0]
      const newCode = `const { ${newParams} } = await request.json()`

      const fixId = crypto.randomBytes(8).toString('hex')

      return {
        id: fixId,
        fixType: 'add_param',
        description: `Make "${missingParam}" optional in API route`,
        codeChange: {
          file: issue.apiFile!,
          oldCode,
          newCode,
          lineStart: 1,
          lineEnd: 1
        },
        affectedFiles: [issue.apiFile!],
        affectedEntities: [],
        impactScore: 15,
        effortLevel: 'trivial',
        estimatedTime: 2,
        confidence: 0.95,
        autoSafe: true,
        alternatives: [],
        preferredFix: false
      }
    } catch (error) {
      return null
    }
  }

  private async createDefaultValueFix(issue: IssueAnalysis): Promise<FixSuggestionResult | null> {
    const missingParamMatch = issue.suggestion.match(/"(\w+)"/)
    const missingParam = missingParamMatch ? missingParamMatch[1] : 'param'

    const fixId = crypto.randomBytes(8).toString('hex')

    return {
      id: fixId,
      fixType: 'add_default',
      description: `Add default value for "${missingParam}" in API`,
      codeChange: {
        file: issue.apiFile!,
        oldCode: `const { ${missingParam} }`,
        newCode: `const { ${missingParam} = null }`,
        lineStart: 1,
        lineEnd: 1
      },
      affectedFiles: [issue.apiFile!],
      affectedEntities: [],
      impactScore: 5,
      effortLevel: 'trivial',
      estimatedTime: 1,
      confidence: 0.98,
      autoSafe: true,
      alternatives: [],
      preferredFix: false
    }
  }

  private async createOptionalChainingFix(issue: IssueAnalysis): Promise<FixSuggestionResult | null> {
    try {
      const filePath = path.join(process.cwd(), issue.frontendFile!)
      if (!fs.existsSync(filePath)) return null

      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      const lineIndex = (issue.frontendLine || 1) - 1
      const line = lines[lineIndex]

      // Find property access pattern (e.g., pattern.id)
      const accessMatch = line.match(/(\w+)\.(\w+)/)
      if (!accessMatch) return null

      const [fullMatch, obj, prop] = accessMatch
      const newCode = line.replace(fullMatch, `${obj}?.${prop}`)

      const fixId = crypto.randomBytes(8).toString('hex')

      return {
        id: fixId,
        fixType: 'add_null_check',
        description: `Add optional chaining to prevent undefined access`,
        codeChange: {
          file: issue.frontendFile!,
          oldCode: line,
          newCode,
          lineStart: lineIndex + 1,
          lineEnd: lineIndex + 1
        },
        affectedFiles: [issue.frontendFile!],
        affectedEntities: [],
        impactScore: 5,
        effortLevel: 'trivial',
        estimatedTime: 1,
        confidence: 0.95,
        autoSafe: true,
        alternatives: [],
        preferredFix: false
      }
    } catch (error) {
      return null
    }
  }

  private async createNullCheckFix(issue: IssueAnalysis): Promise<FixSuggestionResult | null> {
    try {
      const filePath = path.join(process.cwd(), issue.frontendFile!)
      if (!fs.existsSync(filePath)) return null

      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      const lineIndex = (issue.frontendLine || 1) - 1
      const line = lines[lineIndex]

      // Find variable being accessed
      const accessMatch = line.match(/(\w+)\.\w+/)
      if (!accessMatch) return null

      const varName = accessMatch[1]
      const indent = line.match(/^(\s*)/)?.[1] || ''

      const fixId = crypto.randomBytes(8).toString('hex')

      return {
        id: fixId,
        fixType: 'add_null_check',
        description: `Add null check with fallback for ${varName}`,
        codeChange: {
          file: issue.frontendFile!,
          oldCode: line,
          newCode: `${indent}if (${varName}) {\n${line}\n${indent}}`,
          lineStart: lineIndex + 1,
          lineEnd: lineIndex + 1
        },
        affectedFiles: [issue.frontendFile!],
        affectedEntities: [],
        impactScore: 10,
        effortLevel: 'easy',
        estimatedTime: 3,
        confidence: 0.85,
        autoSafe: false,
        alternatives: [],
        preferredFix: false
      }
    } catch (error) {
      return null
    }
  }

  private async createApiDefaultFix(issue: IssueAnalysis): Promise<FixSuggestionResult | null> {
    // Similar to createDefaultValueFix but for undefined access scenarios
    return this.createDefaultValueFix(issue)
  }

  private async createTypeConversionFix(issue: IssueAnalysis): Promise<FixSuggestionResult | null> {
    try {
      const filePath = path.join(process.cwd(), issue.frontendFile!)
      if (!fs.existsSync(filePath)) return null

      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      const lineIndex = (issue.frontendLine || 1) - 1
      const line = lines[lineIndex]

      // Determine conversion type from message
      let conversion = 'String()'
      if (issue.message.includes('number')) conversion = 'Number()'
      else if (issue.message.includes('boolean')) conversion = 'Boolean()'

      const fixId = crypto.randomBytes(8).toString('hex')

      return {
        id: fixId,
        fixType: 'change_type',
        description: `Convert type using ${conversion}`,
        codeChange: {
          file: issue.frontendFile!,
          oldCode: line,
          newCode: line.replace(/(\w+)(\s*[,:])/, `${conversion}($1)$2`),
          lineStart: lineIndex + 1,
          lineEnd: lineIndex + 1
        },
        affectedFiles: [issue.frontendFile!],
        affectedEntities: [],
        impactScore: 10,
        effortLevel: 'easy',
        estimatedTime: 3,
        confidence: 0.75,
        autoSafe: false,
        alternatives: [],
        preferredFix: false
      }
    } catch (error) {
      return null
    }
  }

  private async createFlexibleTypeFix(issue: IssueAnalysis): Promise<FixSuggestionResult | null> {
    const fixId = crypto.randomBytes(8).toString('hex')

    return {
      id: fixId,
      fixType: 'change_type',
      description: 'Update API to accept flexible types (string | number)',
      codeChange: {
        file: issue.apiFile!,
        oldCode: 'string',
        newCode: 'string | number',
        lineStart: 1,
        lineEnd: 1
      },
      affectedFiles: [issue.apiFile!],
      affectedEntities: [],
      impactScore: 20,
      effortLevel: 'medium',
      estimatedTime: 10,
      confidence: 0.70,
      autoSafe: false,
      alternatives: [],
      preferredFix: false
    }
  }

  private async createCreateEndpointFix(issue: IssueAnalysis): Promise<FixSuggestionResult | null> {
    // Extract endpoint from message
    const endpointMatch = issue.message.match(/"([^"]+)"/)
    const endpoint = endpointMatch ? endpointMatch[1] : '/api/new'

    const fixId = crypto.randomBytes(8).toString('hex')

    return {
      id: fixId,
      fixType: 'create_endpoint',
      description: `Create missing API endpoint at ${endpoint}`,
      codeChange: {
        file: `src/app${endpoint}/route.ts`,
        oldCode: '',
        newCode: `import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Endpoint created' })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ success: true, data: body })
}`,
        lineStart: 1,
        lineEnd: 12
      },
      affectedFiles: [`src/app${endpoint}/route.ts`],
      affectedEntities: [],
      impactScore: 30,
      effortLevel: 'medium',
      estimatedTime: 15,
      confidence: 0.80,
      autoSafe: false,
      alternatives: [],
      preferredFix: false
    }
  }

  private async createUpdateEndpointFix(issue: IssueAnalysis): Promise<FixSuggestionResult | null> {
    // Suggest updating the frontend to use the correct endpoint
    const fixId = crypto.randomBytes(8).toString('hex')

    return {
      id: fixId,
      fixType: 'change_type',
      description: 'Update frontend to use correct endpoint path',
      codeChange: {
        file: issue.frontendFile!,
        oldCode: issue.message.match(/"([^"]+)"/)?.[1] || '',
        newCode: '/api/correct-endpoint',
        lineStart: issue.frontendLine || 1,
        lineEnd: issue.frontendLine || 1
      },
      affectedFiles: [issue.frontendFile!],
      affectedEntities: [],
      impactScore: 10,
      effortLevel: 'easy',
      estimatedTime: 2,
      confidence: 0.60,
      autoSafe: false,
      alternatives: [],
      preferredFix: false
    }
  }

  private async createRemoveParamFix(issue: IssueAnalysis): Promise<FixSuggestionResult | null> {
    const fixId = crypto.randomBytes(8).toString('hex')

    return {
      id: fixId,
      fixType: 'remove_param',
      description: 'Remove extra parameter from frontend call',
      codeChange: {
        file: issue.frontendFile!,
        oldCode: 'extraParam: value',
        newCode: '',
        lineStart: issue.frontendLine || 1,
        lineEnd: issue.frontendLine || 1
      },
      affectedFiles: [issue.frontendFile!],
      affectedEntities: [],
      impactScore: 5,
      effortLevel: 'trivial',
      estimatedTime: 1,
      confidence: 0.95,
      autoSafe: true,
      alternatives: [],
      preferredFix: false
    }
  }

  private async createAcceptParamFix(issue: IssueAnalysis): Promise<FixSuggestionResult | null> {
    const fixId = crypto.randomBytes(8).toString('hex')

    return {
      id: fixId,
      fixType: 'add_param',
      description: 'Update API to accept the extra parameter',
      codeChange: {
        file: issue.apiFile!,
        oldCode: 'const { existingParams }',
        newCode: 'const { existingParams, extraParam }',
        lineStart: 1,
        lineEnd: 1
      },
      affectedFiles: [issue.apiFile!],
      affectedEntities: [],
      impactScore: 15,
      effortLevel: 'easy',
      estimatedTime: 5,
      confidence: 0.90,
      autoSafe: true,
      alternatives: [],
      preferredFix: false
    }
  }

  // =============================================================================
  // PATTERN LEARNING
  // =============================================================================

  private async applyLearnedPatterns(issue: IssueAnalysis): Promise<FixSuggestionResult[]> {
    const fixes: FixSuggestionResult[] = []

    // Find patterns matching this issue type
    const patterns = await prisma.fixPattern.findMany({
      where: {
        issueType: issue.issueType,
        isActive: true,
        confidence: { gte: 0.7 }
      }
    })

    for (const pattern of patterns) {
      const fixId = crypto.randomBytes(8).toString('hex')

      fixes.push({
        id: fixId,
        fixType: 'learned_pattern',
        description: `Apply learned fix: ${pattern.patternName}`,
        codeChange: {
          file: issue.frontendFile || issue.apiFile || '',
          oldCode: '',
          newCode: pattern.fixTemplate,
          lineStart: 1,
          lineEnd: 1
        },
        affectedFiles: [],
        affectedEntities: [],
        impactScore: 0,
        effortLevel: 'easy',
        estimatedTime: 5,
        confidence: pattern.confidence,
        autoSafe: pattern.confidence >= 0.9,
        alternatives: [],
        preferredFix: false
      })
    }

    return fixes
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private async calculateImpactScore(fix: FixSuggestionResult): Promise<number> {
    let score = 0

    // More files = higher impact
    score += Math.min(fix.affectedFiles.length * 10, 40)

    // Fix type impact
    const typeScores: Record<string, number> = {
      'create_endpoint': 30,
      'change_type': 20,
      'add_param': 15,
      'remove_param': 10,
      'add_null_check': 5,
      'add_default': 5,
      'learned_pattern': 10
    }
    score += typeScores[fix.fixType] || 10

    return Math.min(100, score)
  }

  private determineAutoSafe(fix: FixSuggestionResult): boolean {
    // Conditions for auto-safe:
    // 1. Low impact score (< 20)
    // 2. High confidence (> 0.9)
    // 3. Trivial or easy effort
    // 4. Not creating new files

    return (
      fix.impactScore < 20 &&
      fix.confidence >= 0.9 &&
      (fix.effortLevel === 'trivial' || fix.effortLevel === 'easy') &&
      fix.fixType !== 'create_endpoint'
    )
  }

  private async storeSuggestion(issueId: string, fix: FixSuggestionResult): Promise<void> {
    try {
      await prisma.fixSuggestion.create({
        data: {
          issueId,
          fixType: fix.fixType,
          description: fix.description,
          codeChange: JSON.stringify(fix.codeChange),
          affectedFiles: JSON.stringify(fix.affectedFiles),
          affectedEntities: JSON.stringify(fix.affectedEntities),
          impactScore: fix.impactScore,
          effortLevel: fix.effortLevel,
          estimatedTime: fix.estimatedTime,
          confidence: fix.confidence,
          autoSafe: fix.autoSafe,
          preferredFix: fix.preferredFix
        }
      })
    } catch (error) {
      console.error('Failed to store fix suggestion:', error)
    }
  }

  /**
   * Compare multiple fixes and recommend the best approach
   */
  async compareFixes(fixes: FixSuggestionResult[]): Promise<FixComparison[]> {
    return fixes.map(fix => ({
      fixId: fix.id,
      description: fix.description,
      filesToChange: fix.affectedFiles.length,
      entitiesAffected: fix.affectedEntities.length,
      riskLevel: fix.impactScore > 50 ? 'high' : fix.impactScore > 20 ? 'medium' : 'low',
      effort: fix.effortLevel,
      recommended: fix.preferredFix
    }))
  }

  /**
   * Learn a new fix pattern from a successful fix
   */
  async learnPattern(
    issueType: string,
    patternName: string,
    triggerCondition: object,
    fixTemplate: string,
    source: string
  ): Promise<void> {
    await prisma.fixPattern.upsert({
      where: {
        issueType_patternName: { issueType, patternName }
      },
      create: {
        issueType,
        patternName,
        description: `Learned pattern: ${patternName}`,
        triggerCondition: JSON.stringify(triggerCondition),
        fixTemplate,
        learnedFrom: source,
        confidence: 0.5
      },
      update: {
        triggerCondition: JSON.stringify(triggerCondition),
        fixTemplate,
        learnedFrom: source
      }
    })
  }
}

// Export singleton
export const smartFixer = new SmartFixer()
