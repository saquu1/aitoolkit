// =============================================================================
// PATTERN DETECTION & ALERT API
// =============================================================================
// Detects patterns in session content and generates alerts
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, sessionId, chatLogId } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Get all active patterns
    const patterns = await db.aIPattern.findMany({
      where: {
        status: 'ACTIVE',
        autoDetectionEnabled: true,
      },
    });

    // Detect patterns in content
    const detectedPatterns: any[] = [];

    for (const pattern of patterns) {
      const detection = detectPattern(content, pattern);
      if (detection.detected) {
        detectedPatterns.push({
          patternId: pattern.id,
          patternCode: pattern.patternCode,
          patternName: pattern.patternName,
          matchType: detection.matchType,
          matchedContent: detection.matchedContent,
          occurrenceCount: pattern.occurrenceCount,
          costWasted: pattern.totalCostWasted,
          preventionStrategies: JSON.parse(pattern.preventionStrategies || '[]'),
          fixTemplate: pattern.fixTemplate,
          severity: calculateSeverity(pattern),
        });
      }
    }

    // Store pattern occurrences if sessionId provided
    if (chatLogId && detectedPatterns.length > 0) {
      for (const detected of detectedPatterns) {
        await db.patternOccurrence.create({
          data: {
            patternId: detected.patternId,
            chatLogId,
            matchedContent: detected.matchedContent?.slice(0, 500),
            matchType: detected.matchType,
          },
        });

        // Update pattern occurrence count
        await db.aIPattern.update({
          where: { id: detected.patternId },
          data: {
            occurrenceCount: { increment: 1 },
            lastSeen: new Date(),
          },
        });
      }
    }

    // Generate alerts for high-priority patterns
    const alerts = detectedPatterns
      .filter(p => p.severity === 'HIGH' || p.occurrenceCount >= 3)
      .map(p => ({
        type: 'PATTERN_DETECTED',
        severity: p.severity,
        title: `Pattern Detected: ${p.patternName}`,
        message: `This matches a known pattern that has occurred ${p.occurrenceCount} times`,
        pattern: p,
        actions: [
          { label: 'View Pattern', action: 'VIEW_PATTERN', patternId: p.patternId },
          { label: 'Mark False Positive', action: 'FALSE_POSITIVE', patternId: p.patternId },
        ],
      }));

    return NextResponse.json({
      success: true,
      detectedPatterns,
      alerts,
      totalDetected: detectedPatterns.length,
    });
  } catch (error) {
    console.error('Pattern detection API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patternId = searchParams.get('patternId');

    if (patternId) {
      // Get specific pattern with recent occurrences
      const pattern = await db.aIPattern.findUnique({
        where: { id: patternId },
        include: {
          occurrences: {
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return NextResponse.json({
        success: true,
        pattern,
      });
    }

    // Get all patterns with stats
    const patterns = await db.aIPattern.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { occurrenceCount: 'desc' },
      include: {
        _count: {
          select: { occurrences: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      patterns: patterns.map(p => ({
        id: p.id,
        code: p.patternCode,
        name: p.patternName,
        type: p.patternType,
        occurrenceCount: p.occurrenceCount,
        costWasted: p.totalCostWasted,
        effectiveness: p.effectiveness,
        autoDetectionEnabled: p.autoDetectionEnabled,
        occurrencesCount: p._count.occurrences,
      })),
    });
  } catch (error) {
    console.error('Pattern API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function detectPattern(content: string, pattern: any) {
  const result = {
    detected: false,
    matchType: '',
    matchedContent: '',
  };

  // Check regex pattern
  if (pattern.detectionRegex) {
    try {
      const regex = new RegExp(pattern.detectionRegex, 'gi');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        result.detected = true;
        result.matchType = 'REGEX';
        result.matchedContent = matches.slice(0, 3).join('\n');
        return result;
      }
    } catch (e) {
      // Invalid regex, skip
    }
  }

  // Check keywords
  const keywords: string[] = JSON.parse(pattern.detectionKeywords || '[]');
  const contentLower = content.toLowerCase();
  const matchedKeywords = keywords.filter(kw => 
    contentLower.includes(kw.toLowerCase())
  );

  if (matchedKeywords.length >= 2) {
    result.detected = true;
    result.matchType = 'KEYWORDS';
    result.matchedContent = matchedKeywords.join(', ');
  }

  // Check detection rules (JSON-based rules)
  if (pattern.detectionRules) {
    try {
      const rules = JSON.parse(pattern.detectionRules);
      
      // Check file patterns
      if (rules.filePatterns && Array.isArray(rules.filePatterns)) {
        const filePatternMatch = rules.filePatterns.some((fp: string) => 
          content.includes(fp)
        );
        if (filePatternMatch) {
          result.detected = true;
          result.matchType = 'FILE_PATTERN';
        }
      }

      // Check code patterns
      if (rules.codePatterns && Array.isArray(rules.codePatterns)) {
        const codePatternMatch = rules.codePatterns.some((cp: string) =>
          content.includes(cp)
        );
        if (codePatternMatch) {
          result.detected = true;
          result.matchType = 'CODE_PATTERN';
        }
      }
    } catch (e) {
      // Invalid rules JSON
    }
  }

  return result;
}

function calculateSeverity(pattern: any): 'HIGH' | 'MEDIUM' | 'LOW' {
  // High severity if pattern has occurred many times or has high cost
  if (pattern.occurrenceCount >= 5 || pattern.totalCostWasted >= 5) {
    return 'HIGH';
  }
  if (pattern.occurrenceCount >= 3 || pattern.totalCostWasted >= 2) {
    return 'MEDIUM';
  }
  return 'LOW';
}
