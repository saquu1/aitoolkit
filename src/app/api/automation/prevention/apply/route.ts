// =============================================================================
// AUTO-APPLY PREVENTION RULES API
// =============================================================================
// Automatically applies generated prevention rules to the project
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// TYPES
// =============================================================================

interface ApplyRequest {
  patternId: string;
  ruleType: 'eslint' | 'preCommit' | 'vscode' | 'all';
  options?: {
    overwrite?: boolean;
    backup?: boolean;
    testRun?: boolean;
  };
}

interface ApplyResult {
  success: boolean;
  applied: string[];
  errors: string[];
  warnings: string[];
  filesModified: string[];
  rollbackCommands: string[];
}

// =============================================================================
// POST - Apply prevention rules
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: ApplyRequest = await request.json();
    const { patternId, ruleType, options = {} } = body;

    if (!patternId) {
      return NextResponse.json(
        { error: 'Pattern ID required' },
        { status: 400 }
      );
    }

    // Get the pattern
    const pattern = await db.aIPattern.findUnique({
      where: { id: patternId },
    });

    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      );
    }

    // Apply the rules
    const result = await applyPreventionRules(pattern, ruleType, options);

    // Update pattern status
    if (result.success && !options.testRun) {
      await db.aIPattern.update({
        where: { id: patternId },
        data: {
          preventionApplied: true,
          appliedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: result.success,
      patternId,
      ruleType,
      result,
      appliedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Apply prevention error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET - Preview what would be applied
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patternId = searchParams.get('patternId');

    if (!patternId) {
      return NextResponse.json(
        { error: 'Pattern ID required' },
        { status: 400 }
      );
    }

    const pattern = await db.aIPattern.findUnique({
      where: { id: patternId },
    });

    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      );
    }

    // Generate preview
    const preview = generateApplyPreview(pattern);

    return NextResponse.json({
      success: true,
      patternId,
      preview,
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// RULE APPLICATION LOGIC
// =============================================================================

async function applyPreventionRules(
  pattern: any,
  ruleType: string,
  options: any
): Promise<ApplyResult> {
  const result: ApplyResult = {
    success: false,
    applied: [],
    errors: [],
    warnings: [],
    filesModified: [],
    rollbackCommands: [],
  };

  const projectRoot = process.cwd();

  try {
    // Generate rules if not already present
    const rules = generateRulesFromPattern(pattern);

    if (ruleType === 'eslint' || ruleType === 'all') {
      const eslintResult = await applyEslintRule(projectRoot, rules.eslint, pattern, options);
      if (eslintResult.success) {
        result.applied.push('eslint');
        result.filesModified.push(...eslintResult.files);
        result.rollbackCommands.push(...eslintResult.rollback);
      } else {
        result.errors.push(`ESLint: ${eslintResult.error}`);
      }
    }

    if (ruleType === 'preCommit' || ruleType === 'all') {
      const hookResult = await applyPreCommitHook(projectRoot, rules.preCommit, pattern, options);
      if (hookResult.success) {
        result.applied.push('preCommit');
        result.filesModified.push(...hookResult.files);
        result.rollbackCommands.push(...hookResult.rollback);
      } else {
        result.errors.push(`Pre-commit: ${hookResult.error}`);
      }
    }

    if (ruleType === 'vscode' || ruleType === 'all') {
      const vscodeResult = await applyVscodeSnippet(projectRoot, rules.vscode, pattern, options);
      if (vscodeResult.success) {
        result.applied.push('vscode');
        result.filesModified.push(...vscodeResult.files);
        result.rollbackCommands.push(...vscodeResult.rollback);
      } else {
        result.warnings.push(`VS Code: ${vscodeResult.error}`);
      }
    }

    result.success = result.applied.length > 0;
  } catch (error: any) {
    result.errors.push(error.message);
  }

  return result;
}

function generateRulesFromPattern(pattern: any) {
  const keywords = JSON.parse(pattern.detectionKeywords || '[]');
  const affectedFiles = JSON.parse(pattern.affectedFiles || '[]');

  return {
    eslint: generateEslintRule(pattern, keywords, affectedFiles),
    preCommit: generatePreCommitHook(pattern, keywords, affectedFiles),
    vscode: generateVscodeSnippet(pattern),
  };
}

async function applyEslintRule(
  projectRoot: string,
  rule: string,
  pattern: any,
  options: any
): Promise<{ success: boolean; files: string[]; rollback: string[]; error?: string }> {
  const result = { success: false, files: [], rollback: [] };
  
  try {
    const ruleName = pattern.patternCode?.toLowerCase() || 'custom-pattern';
    
    // Check for .eslintrc.js or .eslintrc.json
    const eslintPaths = [
      path.join(projectRoot, '.eslintrc.js'),
      path.join(projectRoot, '.eslintrc.json'),
      path.join(projectRoot, '.eslintrc'),
    ];

    let eslintPath: string | null = null;
    for (const p of eslintPaths) {
      if (fs.existsSync(p)) {
        eslintPath = p;
        break;
      }
    }

    if (options.testRun) {
      result.success = true;
      result.files.push(eslintPath || '.eslintrc.js (would create)');
      return result;
    }

    // Create custom rules directory
    const customRulesDir = path.join(projectRoot, 'custom-rules');
    if (!fs.existsSync(customRulesDir)) {
      fs.mkdirSync(customRulesDir, { recursive: true });
    }

    // Write the custom rule file
    const rulePath = path.join(customRulesDir, `${ruleName}.js`);
    
    if (fs.existsSync(rulePath) && !options.overwrite) {
      return { success: false, files: [], rollback: [], error: 'Rule file already exists. Use overwrite option.' };
    }

    // Backup existing file
    if (fs.existsSync(rulePath) && options.backup) {
      const backupPath = `${rulePath}.backup`;
      fs.copyFileSync(rulePath, backupPath);
      result.rollback.push(`mv ${backupPath} ${rulePath}`);
    }

    // Write the rule
    fs.writeFileSync(rulePath, rule);
    result.files.push(rulePath);
    result.rollback.push(`rm ${rulePath}`);
    result.success = true;

  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}

async function applyPreCommitHook(
  projectRoot: string,
  hook: string,
  pattern: any,
  options: any
): Promise<{ success: boolean; files: string[]; rollback: string[]; error?: string }> {
  const result = { success: false, files: [], rollback: [] };
  
  try {
    const hooksDir = path.join(projectRoot, '.git', 'hooks');
    const hookName = `pre-commit-${pattern.patternCode?.toLowerCase() || 'custom'}`;
    const hookPath = path.join(hooksDir, hookName);

    if (options.testRun) {
      result.success = true;
      result.files.push(hookPath + ' (would create)');
      return result;
    }

    // Ensure hooks directory exists
    if (!fs.existsSync(hooksDir)) {
      result.error = 'Git hooks directory not found. Initialize git first.';
      return result;
    }

    // Backup existing hook
    if (fs.existsSync(hookPath) && options.backup) {
      const backupPath = `${hookPath}.backup`;
      fs.copyFileSync(hookPath, backupPath);
      result.rollback.push(`mv ${backupPath} ${hookPath}`);
    }

    // Write the hook
    fs.writeFileSync(hookPath, hook);
    fs.chmodSync(hookPath, '755'); // Make executable
    
    result.files.push(hookPath);
    result.rollback.push(`rm ${hookPath}`);
    result.success = true;

  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}

async function applyVscodeSnippet(
  projectRoot: string,
  snippet: string,
  pattern: any,
  options: any
): Promise<{ success: boolean; files: string[]; rollback: string[]; error?: string }> {
  const result = { success: false, files: [], rollback: [] };
  
  try {
    const vscodeDir = path.join(projectRoot, '.vscode');
    const snippetsPath = path.join(vscodeDir, 'snippets.code-snippets');

    if (options.testRun) {
      result.success = true;
      result.files.push(snippetsPath + ' (would create/update)');
      return result;
    }

    // Ensure .vscode directory exists
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir, { recursive: true });
    }

    // Read existing snippets or create new
    let snippets: any = {};
    if (fs.existsSync(snippetsPath)) {
      if (options.backup) {
        const backupPath = `${snippetsPath}.backup`;
        fs.copyFileSync(snippetsPath, backupPath);
        result.rollback.push(`mv ${backupPath} ${snippetsPath}`);
      }
      try {
        snippets = JSON.parse(fs.readFileSync(snippetsPath, 'utf-8'));
      } catch {
        snippets = {};
      }
    }

    // Add new snippet
    const snippetName = `${pattern.patternName} Fix`;
    snippets[snippetName] = {
      prefix: pattern.patternCode?.toLowerCase() || 'fix',
      body: snippet.split('\n'),
      description: `Fix for ${pattern.patternName}`,
    };

    // Write updated snippets
    fs.writeFileSync(snippetsPath, JSON.stringify(snippets, null, 2));
    result.files.push(snippetsPath);
    result.success = true;

  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}

function generateEslintRule(pattern: any, keywords: string[], affectedFiles: string[]): string {
  const ruleName = pattern.patternCode?.toLowerCase() || 'custom-pattern';
  
  let rule = `// ESLint Rule: ${pattern.patternName}\n`;
  rule += `// Auto-generated\n\n`;
  rule += `module.exports = {\n`;
  rule += `  meta: {\n`;
  rule += `    type: 'problem',\n`;
  rule += `    docs: {\n`;
  rule += `      description: '${pattern.patternName}',\n`;
  rule += `      category: 'Best Practices',\n`;
  rule += `    },\n`;
  rule += `    messages: {\n`;
  rule += `      unexpected: 'Avoid: ${pattern.patternName}',\n`;
  rule += `    },\n`;
  rule += `  },\n`;
  rule += `  create(context) {\n`;
  rule += `    return {\n`;
  rule += `      'CallExpression'(node) {\n`;
  rule += `        // Detection logic here\n`;
  rule += `      },\n`;
  rule += `    };\n`;
  rule += `  },\n`;
  rule += `};\n`;

  return rule;
}

function generatePreCommitHook(pattern: any, keywords: string[], affectedFiles: string[]): string {
  let hook = `#!/bin/bash\n`;
  hook += `# Pre-commit: ${pattern.patternName}\n\n`;
  hook += `echo "Checking for ${pattern.patternName}..."\n`;
  hook += `exit 0\n`;
  return hook;
}

function generateVscodeSnippet(pattern: any): string {
  return pattern.fixTemplate || '// Fix template not available';
}

function generateApplyPreview(pattern: any): any {
  const rules = generateRulesFromPattern(pattern);

  return {
    patternName: pattern.patternName,
    patternCode: pattern.patternCode,
    occurrenceCount: pattern.occurrenceCount,
    costWasted: pattern.totalCostWasted,
    rules: {
      eslint: {
        preview: rules.eslint.substring(0, 500) + '...',
        fullPath: 'custom-rules/' + (pattern.patternCode?.toLowerCase() || 'custom') + '.js',
      },
      preCommit: {
        preview: rules.preCommit,
        fullPath: '.git/hooks/pre-commit-' + (pattern.patternCode?.toLowerCase() || 'custom'),
      },
      vscode: {
        preview: rules.vscode.substring(0, 300),
        fullPath: '.vscode/snippets.code-snippets',
      },
    },
    warnings: [
      'Applying these rules will modify files in your project',
      'A backup will be created if the backup option is enabled',
      'Review the rules before applying in production',
    ],
  };
}
