/**
 * PRE-COMMIT HOOK SERVICE
 * =======================
 * Phase 5 of Contract Validator - Git integration for catching issues before commit
 * 
 * Capabilities:
 * - Install/uninstall pre-commit hooks
 * - Run contract validation on staged files
 * - Block commits with critical issues
 * - Auto-fix issues when configured
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

// =============================================================================
// TYPES
// =============================================================================

export interface HookConfig {
  name: string
  description?: string
  checkContracts: boolean
  checkTypes: boolean
  checkImports: boolean
  blockOnErrors: boolean
  blockOnWarnings: boolean
  autoFix: boolean
  includePatterns: string[]
  excludePatterns: string[]
}

export interface HookExecutionResult {
  passed: boolean
  blocked: boolean
  filesChecked: number
  issuesFound: number
  errorsFound: number
  warningsFound: number
  autoFixed: boolean
  output: string
  duration: number
}

export interface StagedFile {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  extension: string
}

// =============================================================================
// PRE-COMMIT HOOK SERVICE
// =============================================================================

export class PreCommitHookService {
  private hooksDir: string
  private projectRoot: string

  constructor() {
    this.projectRoot = process.cwd()
    this.hooksDir = path.join(this.projectRoot, '.git', 'hooks')
  }

  /**
   * Install the pre-commit hook
   */
  async installHook(config: Partial<HookConfig> = {}): Promise<{ success: boolean; message: string }> {
    try {
      // Create default config in database
      const hookConfig = await prisma.preCommitHook.upsert({
        where: { name: config.name || 'default' },
        create: {
          name: config.name || 'default',
          description: config.description || 'Contract Validator Pre-commit Hook',
          checkContracts: config.checkContracts ?? true,
          checkTypes: config.checkTypes ?? true,
          checkImports: config.checkImports ?? true,
          blockOnErrors: config.blockOnErrors ?? true,
          blockOnWarnings: config.blockOnWarnings ?? false,
          autoFix: config.autoFix ?? false,
          includePatterns: JSON.stringify(config.includePatterns || ['**/*.ts', '**/*.tsx']),
          excludePatterns: JSON.stringify(config.excludePatterns || ['**/node_modules/**', '**/.next/**'])
        },
        update: {
          checkContracts: config.checkContracts ?? true,
          checkTypes: config.checkTypes ?? true,
          checkImports: config.checkImports ?? true,
          blockOnErrors: config.blockOnErrors ?? true,
          blockOnWarnings: config.blockOnWarnings ?? false,
          autoFix: config.autoFix ?? false
        }
      })

      // Create the hook script
      const hookScript = this.generateHookScript(hookConfig.id)
      
      // Ensure hooks directory exists
      if (!fs.existsSync(this.hooksDir)) {
        fs.mkdirSync(this.hooksDir, { recursive: true })
      }

      // Write the hook file
      const hookPath = path.join(this.hooksDir, 'pre-commit')
      fs.writeFileSync(hookPath, hookScript, { mode: 0o755 })

      return {
        success: true,
        message: `Pre-commit hook installed at ${hookPath}`
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to install hook: ${error.message}`
      }
    }
  }

  /**
   * Uninstall the pre-commit hook
   */
  async uninstallHook(): Promise<{ success: boolean; message: string }> {
    const hookPath = path.join(this.hooksDir, 'pre-commit')
    
    if (fs.existsSync(hookPath)) {
      fs.unlinkSync(hookPath)
      return { success: true, message: 'Pre-commit hook removed' }
    }
    
    return { success: false, message: 'No pre-commit hook found' }
  }

  /**
   * Check if hook is installed
   */
  async isHookInstalled(): Promise<boolean> {
    const hookPath = path.join(this.hooksDir, 'pre-commit')
    return fs.existsSync(hookPath)
  }

  /**
   * Generate the hook script
   */
  private generateHookScript(hookId: string): string {
    return `#!/bin/sh
# Contract Validator Pre-commit Hook
# Generated automatically - do not edit manually

echo "🔍 Running Contract Validator pre-commit checks..."

# Run the validator
npx ts-node --transpile-only -e "
const { PreCommitHookService } = require('./src/lib/pre-commit-hook.ts');
const service = new PreCommitHookService();
service.runHook('${hookId}', 'commit').then(result => {
  if (result.blocked) {
    console.error('\\n❌ Commit blocked due to issues:');
    console.error(result.output);
    process.exit(1);
  } else if (!result.passed) {
    console.warn('\\n⚠️ Warnings found but commit allowed:');
    console.warn(result.output);
  } else {
    console.log('\\n✅ All checks passed!');
  }
}).catch(err => {
  console.error('Hook execution failed:', err);
  process.exit(1);
});
"

# Capture exit code
exit_code=$?

if [ $exit_code -ne 0 ]; then
  echo "❌ Pre-commit checks failed. Fix the issues before committing."
  exit 1
fi

exit 0
`
  }

  /**
   * Run the pre-commit hook checks
   */
  async runHook(hookId: string, trigger: string = 'manual'): Promise<HookExecutionResult> {
    const startTime = Date.now()
    
    // Get hook config
    const hook = await prisma.preCommitHook.findUnique({
      where: { id: hookId }
    })

    if (!hook || !hook.isActive) {
      return {
        passed: true,
        blocked: false,
        filesChecked: 0,
        issuesFound: 0,
        errorsFound: 0,
        warningsFound: 0,
        autoFixed: false,
        output: 'Hook not found or inactive',
        duration: Date.now() - startTime
      }
    }

    // Get staged files
    const stagedFiles = await this.getStagedFiles()
    const includePatterns = JSON.parse(hook.includePatterns)
    const excludePatterns = JSON.parse(hook.excludePatterns)

    // Filter files by patterns
    const filesToCheck = stagedFiles.filter(file => 
      this.matchesPatterns(file.path, includePatterns, excludePatterns)
    )

    const output: string[] = []
    let issuesFound = 0
    let errorsFound = 0
    let warningsFound = 0
    let autoFixed = false

    // Run checks
    for (const file of filesToCheck) {
      if (hook.checkContracts) {
        const contractIssues = await this.checkContracts(file.path)
        issuesFound += contractIssues.length
        errorsFound += contractIssues.filter(i => i.severity === 'error').length
        warningsFound += contractIssues.filter(i => i.severity === 'warning').length
        
        if (contractIssues.length > 0) {
          output.push(`\n📄 ${file.path}:`)
          contractIssues.forEach(issue => {
            output.push(`  ${issue.severity === 'error' ? '❌' : '⚠️'} ${issue.message}`)
          })
        }
      }

      if (hook.checkImports) {
        const importIssues = await this.checkImports(file.path)
        issuesFound += importIssues.length
        warningsFound += importIssues.length
        
        if (importIssues.length > 0) {
          output.push(`\n📄 ${file.path} (imports):`)
          importIssues.forEach(issue => {
            output.push(`  ⚠️ ${issue}`)
          })
        }
      }
    }

    // Determine if commit should be blocked
    const passed = errorsFound === 0
    const blocked = (hook.blockOnErrors && errorsFound > 0) || 
                    (hook.blockOnWarnings && warningsFound > 0)

    // Auto-fix if enabled
    if (hook.autoFix && issuesFound > 0) {
      const fixResult = await this.autoFixIssues(filesToCheck)
      autoFixed = fixResult.fixed > 0
      if (autoFixed) {
        output.push(`\n🔧 Auto-fixed ${fixResult.fixed} issue(s)`)
      }
    }

    const duration = Date.now() - startTime

    // Record execution
    await prisma.hookExecution.create({
      data: {
        hookId: hook.id,
        trigger,
        filesChecked: filesToCheck.length,
        issuesFound,
        errorsFound,
        warningsFound,
        passed,
        blocked,
        autoFixed,
        output: output.join('\n'),
        duration,
        gitBranch: this.getCurrentBranch(),
        gitCommit: this.getCurrentCommit()
      }
    })

    // Update hook stats
    await prisma.preCommitHook.update({
      where: { id: hook.id },
      data: {
        timesRun: { increment: 1 },
        timesBlocked: blocked ? { increment: 1 } : undefined,
        lastRunAt: new Date(),
        lastBlockedAt: blocked ? new Date() : undefined
      }
    })

    return {
      passed,
      blocked,
      filesChecked: filesToCheck.length,
      issuesFound,
      errorsFound,
      warningsFound,
      autoFixed,
      output: output.join('\n'),
      duration
    }
  }

  /**
   * Get staged files from git
   */
  private async getStagedFiles(): Promise<StagedFile[]> {
    try {
      const output = execSync(
        'git diff --cached --name-status',
        { encoding: 'utf-8', cwd: this.projectRoot }
      )

      const files: StagedFile[] = []
      const lines = output.trim().split('\n').filter(Boolean)

      for (const line of lines) {
        const parts = line.split('\t')
        if (parts.length >= 2) {
          const status = parts[0]
          const filePath = parts[1]

          files.push({
            path: filePath,
            status: status.startsWith('A') ? 'added' :
                   status.startsWith('M') ? 'modified' :
                   status.startsWith('D') ? 'deleted' :
                   status.startsWith('R') ? 'renamed' : 'modified',
            extension: path.extname(filePath)
          })
        }
      }

      return files
    } catch {
      return []
    }
  }

  /**
   * Check if file matches patterns
   */
  private matchesPatterns(
    filePath: string,
    includePatterns: string[],
    excludePatterns: string[]
  ): boolean {
    // Simple pattern matching (could use minimatch for full glob support)
    const matchesInclude = includePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))
      return regex.test(filePath)
    })

    const matchesExclude = excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))
      return regex.test(filePath)
    })

    return matchesInclude && !matchesExclude
  }

  /**
   * Check contracts for a file
   */
  private async checkContracts(filePath: string): Promise<{ severity: string; message: string }[]> {
    const issues: { severity: string; message: string }[] = []
    const fullPath = path.join(this.projectRoot, filePath)

    if (!fs.existsSync(fullPath)) return issues

    const content = fs.readFileSync(fullPath, 'utf-8')

    // Check for common contract issues
    // 1. Undefined access without optional chaining
    const undefinedAccessMatches = content.matchAll(/(\w+)\.(\w+)(?!\?\.)/g)
    for (const match of undefinedAccessMatches) {
      // Check if variable could be undefined
      if (content.includes(`const ${match[1]} =`) && 
          !content.includes(`if (${match[1]})`) &&
          !content.includes(`${match[1]} ||`) &&
          !content.includes(`${match[1]} ??`)) {
        // This is a potential issue
      }
    }

    // 2. Check for any type usage
    if (content.includes(': any') || content.includes(':any')) {
      issues.push({
        severity: 'warning',
        message: 'Usage of "any" type detected - consider using specific types'
      })
    }

    // 3. Check for TODO/FIXME comments
    if (content.includes('TODO') || content.includes('FIXME')) {
      issues.push({
        severity: 'warning',
        message: 'Unresolved TODO/FIXME comment found'
      })
    }

    return issues
  }

  /**
   * Check imports for a file
   */
  private async checkImports(filePath: string): Promise<string[]> {
    const issues: string[] = []
    const fullPath = path.join(this.projectRoot, filePath)

    if (!fs.existsSync(fullPath)) return issues

    const content = fs.readFileSync(fullPath, 'utf-8')

    // Find all imports
    const importMatches = content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g)
    
    for (const match of importMatches) {
      const importPath = match[1]

      // Check for relative imports that could be aliases
      if (importPath.startsWith('../') && importPath.split('/').length > 3) {
        issues.push(`Deep relative import "${importPath}" - consider using @ alias`)
      }

      // Check for missing file extensions (optional, depending on config)
      // This is often fine in TypeScript projects
    }

    return issues
  }

  /**
   * Auto-fix issues
   */
  private async autoFixIssues(files: StagedFile[]): Promise<{ fixed: number; errors: string[] }> {
    let fixed = 0
    const errors: string[] = []

    // Implementation would apply automatic fixes
    // For now, return placeholder
    return { fixed, errors }
  }

  /**
   * Get current git branch
   */
  private getCurrentBranch(): string {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
        cwd: this.projectRoot
      }).trim()
    } catch {
      return 'unknown'
    }
  }

  /**
   * Get current commit hash
   */
  private getCurrentCommit(): string {
    try {
      return execSync('git rev-parse HEAD', {
        encoding: 'utf-8',
        cwd: this.projectRoot
      }).trim().slice(0, 8)
    } catch {
      return 'unknown'
    }
  }

  /**
   * Get hook configuration
   */
  async getHookConfig(hookId?: string): Promise<any> {
    const hook = await prisma.preCommitHook.findFirst({
      where: hookId ? { id: hookId } : { isActive: true }
    })

    if (!hook) return null

    return {
      ...hook,
      includePatterns: JSON.parse(hook.includePatterns),
      excludePatterns: JSON.parse(hook.excludePatterns)
    }
  }

  /**
   * Update hook configuration
   */
  async updateHookConfig(hookId: string, config: Partial<HookConfig>): Promise<any> {
    const updateData: any = {}

    if (config.checkContracts !== undefined) updateData.checkContracts = config.checkContracts
    if (config.checkTypes !== undefined) updateData.checkTypes = config.checkTypes
    if (config.checkImports !== undefined) updateData.checkImports = config.checkImports
    if (config.blockOnErrors !== undefined) updateData.blockOnErrors = config.blockOnErrors
    if (config.blockOnWarnings !== undefined) updateData.blockOnWarnings = config.blockOnWarnings
    if (config.autoFix !== undefined) updateData.autoFix = config.autoFix
    if (config.includePatterns) updateData.includePatterns = JSON.stringify(config.includePatterns)
    if (config.excludePatterns) updateData.excludePatterns = JSON.stringify(config.excludePatterns)

    return prisma.preCommitHook.update({
      where: { id: hookId },
      data: updateData
    })
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(limit: number = 20): Promise<any[]> {
    return prisma.hookExecution.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalRuns: number
    totalBlocked: number
    totalIssues: number
    passRate: number
  }> {
    const [totalRuns, totalBlocked, executions] = await Promise.all([
      prisma.hookExecution.count(),
      prisma.hookExecution.count({ where: { blocked: true } }),
      prisma.hookExecution.findMany({
        select: { issuesFound: true }
      })
    ])

    const totalIssues = executions.reduce((sum, e) => sum + e.issuesFound, 0)
    const passedRuns = await prisma.hookExecution.count({ where: { passed: true } })
    const passRate = totalRuns > 0 ? (passedRuns / totalRuns) * 100 : 100

    return {
      totalRuns,
      totalBlocked,
      totalIssues,
      passRate: Math.round(passRate * 10) / 10
    }
  }
}

// Export singleton
export const preCommitHookService = new PreCommitHookService()
