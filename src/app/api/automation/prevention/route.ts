// =============================================================================
// PREVENTION RULE GENERATOR API
// =============================================================================
// Generates ESLint rules and pre-commit hooks from patterns
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patternId = searchParams.get('patternId');

    if (patternId) {
      // Generate prevention rule for specific pattern
      const pattern = await db.aIPattern.findUnique({
        where: { id: patternId },
      });

      if (!pattern) {
        return NextResponse.json(
          { error: 'Pattern not found' },
          { status: 404 }
        );
      }

      const rule = generatePreventionRule(pattern);
      return NextResponse.json({
        success: true,
        pattern,
        preventionRule: rule,
      });
    }

    // Get all patterns that need prevention rules
    const patterns = await db.aIPattern.findMany({
      where: {
        status: 'ACTIVE',
        occurrenceCount: { gte: 3 }, // Only patterns with 3+ occurrences
      },
      orderBy: { occurrenceCount: 'desc' },
    });

    const rules = patterns.map(p => ({
      patternId: p.id,
      patternCode: p.patternCode,
      patternName: p.patternName,
      occurrenceCount: p.occurrenceCount,
      costWasted: p.totalCostWasted,
      suggestedRule: generatePreventionRule(p),
    }));

    return NextResponse.json({
      success: true,
      patterns: rules,
      totalPatterns: rules.length,
    });
  } catch (error) {
    console.error('Prevention rule API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patternId, ruleType, customRule } = body;

    const pattern = await db.aIPattern.findUnique({
      where: { id: patternId },
    });

    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      );
    }

    // Update pattern with the generated rule
    if (ruleType === 'eslint') {
      await db.aIPattern.update({
        where: { id: patternId },
        data: {
          eslintRule: customRule || generateEslintRule(pattern),
        },
      });
    }

    // Store the prevention rule
    const preventionRule = {
      patternId,
      type: ruleType,
      rule: customRule || generatePreventionRule(pattern),
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Prevention rule saved',
      preventionRule,
    });
  } catch (error) {
    console.error('Save prevention rule API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// RULE GENERATORS
// =============================================================================

function generatePreventionRule(pattern: any) {
  return {
    eslint: generateEslintRule(pattern),
    preCommit: generatePreCommitHook(pattern),
    vsCode: generateVsCodeSnippet(pattern),
    impact: calculateImpact(pattern),
  };
}

function generateEslintRule(pattern: any): string {
  const keywords = JSON.parse(pattern.detectionKeywords || '[]');
  const affectedFiles = JSON.parse(pattern.affectedFiles || '[]');
  
  // Generate rule based on pattern type
  let rule = `// ESLint Rule for: ${pattern.patternName}\n`;
  rule += `// Pattern Code: ${pattern.patternCode}\n`;
  rule += `// Occurrences: ${pattern.occurrenceCount}\n\n`;
  
  // Rule configuration
  rule += `// .eslintrc.js\n`;
  rule += `module.exports = {\n`;
  rule += `  rules: {\n`;
  rule += `    'custom/${pattern.patternCode?.toLowerCase() || 'pattern'}': 'error',\n`;
  rule += `  },\n`;
  rule += `  overrides: [\n`;
  
  // File-specific overrides
  if (affectedFiles.length > 0) {
    rule += `    {\n`;
    rule += `      files: ['${affectedFiles.map((f: string) => `**/${f.split('/').pop()}`).join("', '")}'],\n`;
    rule += `      rules: {\n`;
    rule += `        'custom/${pattern.patternCode?.toLowerCase() || 'pattern'}': 'error',\n`;
    rule += `      },\n`;
    rule += `    },\n`;
  }
  
  rule += `  ],\n`;
  rule += `};\n\n`;
  
  // Custom rule implementation
  rule += `// custom-rules/${pattern.patternCode?.toLowerCase() || 'pattern'}.js\n`;
  rule += `module.exports = {\n`;
  rule += `  meta: {\n`;
  rule += `    type: 'problem',\n`;
  rule += `    docs: {\n`;
  rule += `      description: '${pattern.patternName}',\n`;
  rule += `      category: 'Best Practices',\n`;
  rule += `    },\n`;
  rule += `  },\n`;
  rule += `  create(context) {\n`;
  rule += `    return {\n`;
  
  // Add detection logic based on keywords
  if (keywords.length > 0) {
    rule += `      // Detect keywords: ${keywords.join(', ')}\n`;
    rule += `      'CallExpression'(node) {\n`;
    rule += `        const sourceCode = context.getSourceCode().getText(node);\n`;
    keywords.forEach((kw: string) => {
      rule += `        if (sourceCode.includes('${kw}')) {\n`;
      rule += `          context.report({\n`;
      rule += `            node,\n`;
      rule += `            message: 'Potential issue: ${pattern.patternName}',\n`;
      rule += `          });\n`;
      rule += `        }\n`;
    });
    rule += `      },\n`;
  }
  
  rule += `    };\n`;
  rule += `  },\n`;
  rule += `};\n`;

  return rule;
}

function generatePreCommitHook(pattern: any): string {
  const keywords = JSON.parse(pattern.detectionKeywords || '[]');
  const affectedFiles = JSON.parse(pattern.affectedFiles || '[]');
  
  let hook = `#!/bin/bash\n`;
  hook += `# Pre-commit hook for: ${pattern.patternName}\n`;
  hook += `# Pattern Code: ${pattern.patternCode}\n\n`;
  
  hook += `echo "Checking for ${pattern.patternName}..."\n\n`;
  
  // Add keyword checks
  if (keywords.length > 0) {
    hook += `# Check for problematic patterns\n`;
    keywords.forEach((kw: string) => {
      hook += `if git diff --cached --name-only | xargs grep -l "${kw}" 2>/dev/null; then\n`;
      hook += `  echo "⚠️  Warning: Found '${kw}' in staged files"\n`;
      hook += `  echo "   This may trigger: ${pattern.patternName}"\n`;
      hook += `fi\n\n`;
    });
  }
  
  // Add file checks
  if (affectedFiles.length > 0) {
    hook += `# Check specific files\n`;
    affectedFiles.forEach((file: string) => {
      hook += `if git diff --cached --name-only | grep -q "${file}"; then\n`;
      hook += `  echo "⚠️  High-risk file modified: ${file}"\n`;
      hook += `  echo "   Please double-check changes"\n`;
      hook += `fi\n\n`;
    });
  }
  
  // Add prevention tips
  const strategies = JSON.parse(pattern.preventionStrategies || '[]');
  if (strategies.length > 0) {
    hook += `# Prevention tips:\n`;
    strategies.forEach((s: string) => {
      hook += `# - ${s}\n`;
    });
    hook += `\n`;
  }
  
  hook += `echo "Pre-commit check complete."\n`;
  hook += `exit 0\n`;

  return hook;
}

function generateVsCodeSnippet(pattern: any): string {
  const fixTemplate = pattern.fixTemplate;
  
  if (!fixTemplate) {
    return `// No fix template available for ${pattern.patternName}`;
  }
  
  let snippet = `// VS Code Snippet for: ${pattern.patternName}\n`;
  snippet += `// Add to .vscode/snippets.code-snippets\n\n`;
  snippet += `{\n`;
  snippet += `  "${pattern.patternName} Fix": {\n`;
  snippet += `    "prefix": "${pattern.patternCode?.toLowerCase() || 'fix'}",\n`;
  snippet += `    "body": [\n`;
  
  // Parse fix template into snippet lines
  const lines = fixTemplate.split('\n');
  lines.forEach((line: string) => {
    snippet += `      "${line.replace(/"/g, '\\"')}",\n`;
  });
  
  snippet += `    ],\n`;
  snippet += `    "description": "Fix for ${pattern.patternName}"\n`;
  snippet += `  }\n`;
  snippet += `}\n`;

  return snippet;
}

function calculateImpact(pattern: any): {
  projectedSavings: number;
  effectiveness: number;
  recommendation: string;
} {
  // Calculate projected savings based on cost and frequency
  const avgWeeklyOccurrences = pattern.occurrenceCount / 4; // Assume 4 weeks of data
  const projectedSavings = avgWeeklyOccurrences * 4 * pattern.totalCostWasted / pattern.occurrenceCount;
  
  let recommendation = 'Implement prevention rule to reduce occurrences';
  if (pattern.occurrenceCount >= 5) {
    recommendation = 'High priority: Implement immediately to prevent recurring cost';
  } else if (pattern.occurrenceCount >= 3) {
    recommendation = 'Medium priority: Consider implementing to improve efficiency';
  }

  return {
    projectedSavings: Math.round(projectedSavings * 100) / 100,
    effectiveness: pattern.effectiveness || 0,
    recommendation,
  };
}
