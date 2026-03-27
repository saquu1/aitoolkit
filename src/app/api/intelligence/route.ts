/**
 * INTELLIGENCE API
 * ================
 * TIER 2 Intelligence Features API
 * - File Hotspots
 * - Issue Recurrence
 * - Quality Scores
 * - Cost Analysis
 * - Pattern Library
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getFileHotspots,
  detectRecurringIssues,
  calculateSessionQualityScore,
  analyzeCosts,
  createPattern,
  getPatterns
} from '@/lib/intelligence-service'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  try {
    switch (action) {
      case 'hotspots': {
        const days = parseInt(searchParams.get('days') || '30')
        const limit = parseInt(searchParams.get('limit') || '20')
        const minSessions = parseInt(searchParams.get('minSessions') || '2')
        
        const hotspots = await getFileHotspots({ days, limit, minSessions })
        
        return NextResponse.json({
          success: true,
          hotspots,
          count: hotspots.length,
          generatedAt: new Date().toISOString()
        })
      }
      
      case 'recurring-issues': {
        const days = parseInt(searchParams.get('days') || '30')
        const minOccurrences = parseInt(searchParams.get('minOccurrences') || '2')
        
        const issues = await detectRecurringIssues({ days, minOccurrences })
        
        return NextResponse.json({
          success: true,
          recurringIssues: issues,
          count: issues.length,
          totalWasted: issues.reduce((sum, i) => sum + i.totalCost, 0)
        })
      }
      
      case 'quality-score': {
        const sessionId = searchParams.get('sessionId')
        
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
        }
        
        const score = await calculateSessionQualityScore(sessionId)
        
        return NextResponse.json({
          success: true,
          qualityScore: score
        })
      }
      
      case 'cost-analysis': {
        const sessionId = searchParams.get('sessionId')
        
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
        }
        
        const analysis = await analyzeCosts(sessionId)
        
        return NextResponse.json({
          success: true,
          costAnalysis: analysis
        })
      }
      
      case 'patterns': {
        const patterns = await getPatterns()
        
        return NextResponse.json({
          success: true,
          patterns,
          count: patterns.length
        })
      }
      
      case 'dashboard': {
        // Get all intelligence data for dashboard
        const [hotspots, recurringIssues, patterns] = await Promise.all([
          getFileHotspots({ days: 30, limit: 10 }),
          detectRecurringIssues({ days: 30, minOccurrences: 2 }),
          getPatterns()
        ])
        
        // Calculate totals
        const totalWasted = recurringIssues.reduce((sum, i) => sum + i.totalCost, 0)
        const avgRiskScore = hotspots.length > 0 
          ? hotspots.reduce((sum, h) => sum + h.riskScore, 0) / hotspots.length 
          : 0
        
        return NextResponse.json({
          success: true,
          dashboard: {
            fileHotspots: hotspots,
            recurringIssues,
            patterns,
            summary: {
              hotspotCount: hotspots.length,
              highRiskFiles: hotspots.filter(h => h.riskScore > 70).length,
              recurringIssueCount: recurringIssues.length,
              totalWastedCost: totalWasted,
              avgRiskScore: Math.round(avgRiskScore),
              activePatterns: patterns.filter(p => p.status === 'active').length
            }
          }
        })
      }
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Intelligence API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    
    switch (action) {
      case 'create-pattern': {
        const { name, keywords, regex, files, rootCause, fixBefore, fixAfter, preventionRule } = body
        
        if (!name || !keywords || keywords.length === 0) {
          return NextResponse.json({ error: 'name and keywords required' }, { status: 400 })
        }
        
        const pattern = await createPattern({
          name,
          keywords,
          regex,
          files,
          rootCause,
          fixBefore: fixBefore || '',
          fixAfter: fixAfter || '',
          preventionRule
        })
        
        return NextResponse.json({
          success: true,
          pattern,
          message: `Pattern ${pattern.patternCode} created successfully`
        })
      }
      
      case 'batch-quality-scores': {
        const { sessionIds } = body
        
        if (!sessionIds || !Array.isArray(sessionIds)) {
          return NextResponse.json({ error: 'sessionIds array required' }, { status: 400 })
        }
        
        const scores = []
        for (const sessionId of sessionIds.slice(0, 20)) {
          try {
            const score = await calculateSessionQualityScore(sessionId)
            scores.push(score)
          } catch (e) {
            // Skip failed sessions
          }
        }
        
        return NextResponse.json({
          success: true,
          scores,
          count: scores.length,
          averageScore: scores.length > 0 
            ? Math.round(scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length)
            : 0
        })
      }
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Intelligence API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
