// =============================================================================
// AI-POWERED PREVENTION RULE SUGGESTIONS API
// =============================================================================
// Uses AI to analyze patterns and generate intelligent prevention rules
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// =============================================================================
// TYPES
// =============================================================================

interface AISuggestion {
  ruleName: string;
  ruleDescription: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedImpact: {
    timeToImplement: string;
    projectedSavings: number;
    effectiveness: number;
  };
  eslintRule: string;
  preCommitHook: string;
  fixSuggestion: string;
  reasoning: string;
}

// =============================================================================
// POST - Generate AI-powered suggestions
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patternId, context } = body;

    if (patternId) {
      // Generate suggestions for specific pattern
      const pattern = await db.aIPattern.findUnique({
        where: { id: patternId },
      });
      
      if (!pattern) {
        return NextResponse.json(
          { error: 'Pattern not found' },
          { status: 404 }
        );
      }

      const suggestions = await generateAISuggestions([pattern], context);
      
      return NextResponse.json({
        success: true,
        patternId,
        suggestions,
      });
    }

    // Generate suggestions for all active patterns
    const patterns = await db.aIPattern.findMany({
      where: {
        status: 'ACTIVE',
        occurrenceCount: { gte: 3 },
      },
      orderBy: { occurrenceCount: 'desc' },
      take: 10,
    });

    const suggestions = await generateAISuggestions(patterns, context);

    return NextResponse.json({
      success: true,
      totalPatterns: patterns.length,
      suggestions,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI suggestions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET - Get cached suggestions
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patternId = searchParams.get('patternId');

    const where: any = {
      status: 'ACTIVE',
      occurrenceCount: { gte: 3 },
      eslintRule: { not: null },
    };

    if (patternId) {
      where.id = patternId;
    }

    const patterns = await db.aIPattern.findMany({
      where,
      select: {
        id: true,
        patternName: true,
        patternCode: true,
        eslintRule: true,
        fixTemplate: true,
        occurrenceCount: true,
        totalCostWasted: true,
      },
    });

    return NextResponse.json({
      success: true,
      cached: patterns,
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// AI SUGGESTION GENERATION
// =============================================================================

async function generateAISuggestions(
  patterns: any[],
  context?: string
): Promise<AISuggestion[]> {
  const zai = await ZAI.create();
  const suggestions: AISuggestion[] = [];

  for (const pattern of patterns) {
    try {
      const prompt = buildAnalysisPrompt(pattern, context);
      
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are an expert code quality and static analysis specialist. Generate precise, actionable prevention rules in JSON format.

For each pattern, analyze:
1. Root cause of the issue
2. Best prevention strategy (ESLint rule, pre-commit hook, or code review checklist)
3. Implementation details with exact code
4. Estimated impact and effectiveness

Response must be valid JSON with this structure:
{
  "ruleName": "string",
  "ruleDescription": "string", 
  "priority": "critical|high|medium|low",
  "estimatedImpact": {
    "timeToImplement": "string",
    "projectedSavings": number,
    "effectiveness": number (0-1)
  },
  "eslintRule": "string (complete ESLint rule code)",
  "preCommitHook": "string (complete shell script)",
  "fixSuggestion": "string (code fix suggestion)",
  "reasoning": "string (explanation of why this rule works)"
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      });

      const content = completion.choices?.[0]?.message?.content || '';
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const suggestion = JSON.parse(jsonMatch[0]) as AISuggestion;
        suggestion.estimatedImpact.projectedSavings = 
          pattern.totalCostWasted ? pattern.totalCostWasted * 0.7 : 10;
        suggestions.push(suggestion);
        
        // Cache the suggestion
        await cacheSuggestion(pattern.id, suggestion);
      }
    } catch (error) {
      console.error(`Failed to generate AI suggestion for pattern ${pattern.id}:`, error);
      
      // Generate fallback suggestion
      const fallbackSuggestion = generateFallbackSuggestion(pattern);
      suggestions.push(fallbackSuggestion);
    }
  }

  return suggestions;
}

function buildAnalysisPrompt(pattern: any, context?: string): string {
  return `Analyze this recurring issue pattern and generate a prevention rule:

**Pattern Details:**
- Name: ${pattern.patternName}
- Code: ${pattern.patternCode}
- Occurrences: ${pattern.occurrenceCount}
- Total Cost Wasted: $${pattern.totalCostWasted?.toFixed(2) || '0.00'}
- Detection Keywords: ${pattern.detectionKeywords || '[]'}
- Affected Files: ${pattern.affectedFiles || '[]'}
- Prevention Strategies (existing): ${pattern.preventionStrategies || '[]'}
${pattern.fixTemplate ? `- Fix Template: ${pattern.fixTemplate}` : ''}

${context ? `**Additional Context:**\n${context}` : ''}

Generate a comprehensive prevention rule that:
1. Catches the pattern before it causes issues
2. Provides clear error messages
3. Suggests fixes when possible
4. Is easy to implement and maintain`;
}

function generateFallbackSuggestion(pattern: any): AISuggestion {
  const keywords = JSON.parse(pattern.detectionKeywords || '[]');
  const affectedFiles = JSON.parse(pattern.affectedFiles || '[]');
  
  return {
    ruleName: `no-${pattern.patternCode?.toLowerCase() || 'pattern'}`,
    ruleDescription: `Prevents ${pattern.patternName} from occurring`,
    priority: pattern.occurrenceCount >= 5 ? 'critical' : pattern.occurrenceCount >= 3 ? 'high' : 'medium',
    estimatedImpact: {
      timeToImplement: '15-30 minutes',
      projectedSavings: pattern.totalCostWasted ? pattern.totalCostWasted * 0.5 : 5,
      effectiveness: 0.7,
    },
    eslintRule: generateEslintRule(pattern, keywords, affectedFiles),
    preCommitHook: generatePreCommitHook(pattern, keywords, affectedFiles),
    fixSuggestion: pattern.fixTemplate || 'Review the pattern and apply recommended fix',
    reasoning: `This pattern has occurred ${pattern.occurrenceCount} times with a total cost of $${pattern.totalCostWasted?.toFixed(2) || '0.00'}. Implementing this rule is estimated to prevent 70% of future occurrences.`,
  };
}

function generateEslintRule(pattern: any, keywords: string[], affectedFiles: string[]): string {
  const ruleName = pattern.patternCode?.toLowerCase() || 'custom-pattern';
  
  let rule = `// ESLint Rule: ${pattern.patternName}\n`;
  rule += `// Auto-generated prevention rule\n\n`;
  rule += `// .eslintrc.js configuration\n`;
  rule += `module.exports = {\n`;
  rule += `  rules: {\n`;
  rule += `    'custom/${ruleName}': 'error',\n`;
  rule += `  },\n`;
  rule += `};\n\n`;
  
  rule += `// custom-rules/${ruleName}.js\n`;
  rule += `module.exports = {\n`;
  rule += `  meta: {\n`;
  rule += `    type: 'problem',\n`;
  rule += `    docs: {\n`;
  rule += `      description: '${pattern.patternName}',\n`;
  rule += `      category: 'Best Practices',\n`;
  rule += `      recommended: true,\n`;
  rule += `    },\n`;
  rule += `    fixable: 'code',\n`;
  rule += `    messages: {\n`;
  rule += `      unexpected: 'Avoid this pattern: ${pattern.patternName}',\n`;
  rule += `    },\n`;
  rule += `  },\n`;
  rule += `  create(context) {\n`;
  
  if (keywords.length > 0) {
    rule += `    const forbiddenPatterns = [${keywords.map((k: string) => `'${k}'`).join(', ')}];\n\n`;
    rule += `    return {\n`;
    rule += `      'CallExpression, Identifier'(node) {\n`;
    rule += `        const text = context.getSourceCode().getText(node);\n`;
    rule += `        for (const pattern of forbiddenPatterns) {\n`;
    rule += `          if (text.includes(pattern)) {\n`;
    rule += `            context.report({ node, messageId: 'unexpected' });\n`;
    rule += `            break;\n`;
    rule += `          }\n`;
    rule += `        }\n`;
    rule += `      },\n`;
  } else {
    rule += `    return {\n`;
    rule += `      // Add detection logic here\n`;
  }
  
  rule += `    };\n`;
  rule += `  },\n`;
  rule += `};\n`;

  return rule;
}

function generatePreCommitHook(pattern: any, keywords: string[], affectedFiles: string[]): string {
  let hook = `#!/bin/bash\n`;
  hook += `# Pre-commit hook: ${pattern.patternName}\n\n`;
  hook += `set -e\n`;
  hook += `echo "Checking for ${pattern.patternName}..."\n\n`;

  if (keywords.length > 0) {
    hook += `# Check for problematic patterns\n`;
    keywords.forEach((kw: string) => {
      hook += `if git diff --cached --name-only | xargs grep -l "${kw}" 2>/dev/null; then\n`;
      hook += `  echo "Warning: Found '${kw}' in staged files"\n`;
      hook += `fi\n\n`;
    });
  }

  hook += `echo "Pre-commit check passed"\n`;
  hook += `exit 0\n`;

  return hook;
}

async function cacheSuggestion(patternId: string, suggestion: AISuggestion): Promise<void> {
  try {
    await db.aIPattern.update({
      where: { id: patternId },
      data: {
        eslintRule: suggestion.eslintRule,
        fixTemplate: suggestion.fixSuggestion,
      },
    });
  } catch (error) {
    console.error('Failed to cache suggestion:', error);
  }
}
