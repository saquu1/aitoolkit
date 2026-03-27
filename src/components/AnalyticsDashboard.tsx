'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/hooks/useTheme'

// =============================================================================
// TYPES
// =============================================================================

interface SessionSummary {
  id: string
  chatId: string
  sessionDate: Date
  title: string | null
  summary: string | null
  duration: number
  totalTokens: number
  estimatedCost: number
  model: string
  category: string
  tags: string | null
  filesModified: number
  filesCreated: number
  featuresImplemented: number
  issuesResolved: number
  issuesCreated: number
  status: string
}

interface SessionDetails extends SessionSummary {
  issues: any[]
  features: any[]
  costs: any[]
  messages: any[]
}

interface IssueRecord {
  id: string
  issueType: string
  severity: string
  title: string
  description?: string
  errorMessage?: string
  resolution?: string
  status: string
  recurrenceCount: number
  session: { title: string | null; sessionDate: Date }
}

interface FeatureRecord {
  id: string
  featureName: string
  featureType: string
  description?: string
  filesCreated: string
  filesModified: string
  session: { title: string | null; sessionDate: Date }
}

interface Pattern {
  pattern: string
  type: string
  count: number
  lastSeen: Date
}

interface PatternWarning {
  id: string
  type: 'recurring_issue' | 'frequent_file' | 'time_pattern' | 'model_issue'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  occurrenceCount: number
  lastOccurred: Date
  suggestedAction: string
  relatedIssues: string[]
  confidence: number
}

interface IssuePrediction {
  id: string
  issueType: string
  probability: number
  riskLevel: 'low' | 'medium' | 'high'
  predictedTrigger: string
  preventiveActions: string[]
  basedOn: string[]
  confidence: number
}

interface GitCommit {
  hash: string
  message: string
  author: string
  date: Date
  files: string[]
  additions: number
  deletions: number
}

interface SelfAssessmentReport {
  id: string
  period: 'weekly' | 'monthly'
  startDate: Date
  endDate: Date
  summary: {
    totalSessions: number
    totalIssues: number
    resolvedIssues: number
    totalFeatures: number
    totalCost: number
    efficiencyScore: number
  }
  insights: {
    category: string
    insight: string
    recommendation: string
    priority: string
  }[]
  patterns: PatternWarning[]
  predictions: IssuePrediction[]
  gitSummary: {
    totalCommits: number
    filesModified: string[]
    commitCategories: Record<string, number>
  }
  generatedAt: Date
}

interface EfficiencyMetrics {
  avgTokensPerFeature: number
  avgTokensPerIssue: number
  avgCostPerFeature: number
  resolutionRate: number
  efficiencyScore: number
  totalSessions: number
  totalFeatures: number
  totalIssues: number
  resolvedIssues: number
}

interface DashboardData {
  summary: {
    totalSessions: number
    totalTokens: number
    totalCost: number
    totalIssues: number
    resolvedIssues: number
    totalFeatures: number
    avgSessionDuration: number
  }
  distributions: {
    models: Record<string, number>
    issues: Record<string, number>
    categories: Record<string, number>
  }
  dailyStats: Record<string, { sessions: number; tokens: number; cost: number }>
  recentSessions: SessionSummary[]
  recentIssues: IssueRecord[]
  recentFeatures: FeatureRecord[]
  topPatterns: Pattern[]
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AnalyticsDashboard() {
  const { colors } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'issues' | 'patterns' | 'cost' | 'warnings' | 'predictions' | 'git' | 'reports'>('overview')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null)
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [exporting, setExporting] = useState(false)

  // New state for advanced features
  const [warnings, setWarnings] = useState<PatternWarning[]>([])
  const [predictions, setPredictions] = useState<IssuePrediction[]>([])
  const [gitCommits, setGitCommits] = useState<GitCommit[]>([])
  const [gitSummary, setGitSummary] = useState<any>(null)
  const [latestReport, setLatestReport] = useState<SelfAssessmentReport | null>(null)
  const [loadingWarnings, setLoadingWarnings] = useState(false)
  const [loadingPredictions, setLoadingPredictions] = useState(false)
  const [loadingGit, setLoadingGit] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)

  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const [dashboardRes, metricsRes, warningsRes] = await Promise.all([
        fetch('/api/analytics?action=dashboard'),
        fetch('/api/analytics?action=efficiency-metrics'),
        fetch('/api/patterns?action=dashboard-warnings')
      ])
      
      const dashboardResult = await dashboardRes.json()
      const metricsResult = await metricsRes.json()
      const warningsResult = await warningsRes.json()
      
      if (dashboardResult.success) {
        setData(dashboardResult.dashboard)
      }
      if (metricsResult.success) {
        setEfficiencyMetrics(metricsResult.metrics)
      }
      if (warningsResult.success) {
        setWarnings(warningsResult.dashboard.criticalWarnings || [])
        setPredictions(warningsResult.dashboard.highRiskPredictions || [])
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load warnings
  const loadWarnings = async () => {
    setLoadingWarnings(true)
    try {
      const response = await fetch('/api/patterns?action=warnings')
      const result = await response.json()
      if (result.success) {
        setWarnings(result.warnings)
      }
    } catch (error) {
      console.error('Failed to load warnings:', error)
    } finally {
      setLoadingWarnings(false)
    }
  }

  // Load predictions
  const loadPredictions = async () => {
    setLoadingPredictions(true)
    try {
      const response = await fetch('/api/patterns?action=predictions')
      const result = await response.json()
      if (result.success) {
        setPredictions(result.predictions)
      }
    } catch (error) {
      console.error('Failed to load predictions:', error)
    } finally {
      setLoadingPredictions(false)
    }
  }

  // Load git history
  const loadGitHistory = async () => {
    setLoadingGit(true)
    try {
      const response = await fetch('/api/patterns?action=git-history&days=30&limit=100')
      const result = await response.json()
      if (result.success) {
        setGitCommits(result.commits)
        setGitSummary(result.summary)
      }
    } catch (error) {
      console.error('Failed to load git history:', error)
    } finally {
      setLoadingGit(false)
    }
  }

  // Generate self-assessment report
  const generateReport = async (period: 'weekly' | 'monthly') => {
    setGeneratingReport(true)
    try {
      const response = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-report', period })
      })
      const result = await response.json()
      if (result.success) {
        setLatestReport(result.report)
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setGeneratingReport(false)
    }
  }

  // Acknowledge warning
  const acknowledgeWarning = async (warningId: string) => {
    try {
      await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge-warning', warningId })
      })
      // Remove from local state
      setWarnings(prev => prev.filter(w => w.id !== warningId))
    } catch (error) {
      console.error('Failed to acknowledge warning:', error)
    }
  }

  // Load tab-specific data
  useEffect(() => {
    if (activeTab === 'warnings' && warnings.length === 0) {
      loadWarnings()
    }
    if (activeTab === 'predictions' && predictions.length === 0) {
      loadPredictions()
    }
    if (activeTab === 'git' && gitCommits.length === 0) {
      loadGitHistory()
    }
  }, [activeTab])

  // Load session details
  const loadSessionDetails = async (sessionId: string) => {
    setLoadingDetails(true)
    try {
      const response = await fetch(`/api/analytics?action=session-details&sessionId=${sessionId}`)
      const result = await response.json()
      if (result.success) {
        setSessionDetails(result.session)
      }
    } catch (error) {
      console.error('Failed to load session details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  // Export to JSON
  const exportToJSON = async () => {
    if (!data) return
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      dateRange,
      summary: data.summary,
      distributions: data.distributions,
      dailyStats: data.dailyStats,
      sessions: data.recentSessions,
      issues: data.recentIssues,
      features: data.recentFeatures,
      patterns: data.topPatterns,
      efficiencyMetrics
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export to PDF
  const exportToPDF = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/analytics/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRange,
          summary: data?.summary,
          distributions: data?.distributions,
          dailyStats: data?.dailyStats,
          sessions: data?.recentSessions,
          efficiencyMetrics
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Fallback: generate a simple HTML report
        const htmlContent = generateHTMLReport()
        const printWindow = window.open('', '_blank')
        if (printWindow) {
          printWindow.document.write(htmlContent)
          printWindow.document.close()
          printWindow.print()
        }
      }
    } catch (error) {
      console.error('PDF export failed:', error)
      // Fallback to print
      const htmlContent = generateHTMLReport()
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        printWindow.print()
      }
    } finally {
      setExporting(false)
    }
  }

  // Generate HTML report for print/PDF
  const generateHTMLReport = () => {
    if (!data) return ''
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI Coding Analytics Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 30px; }
          .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
          .metric-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; }
          .metric-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
          .metric-label { color: #64748b; font-size: 14px; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background: #f8fafc; font-weight: 600; }
          .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin: 2px; background: #e0f2fe; color: #0369a1; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>📊 AI Coding Analytics Report</h1>
        <p>Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        
        <h2>Summary</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-value">${data.summary.totalSessions}</div>
            <div class="metric-label">Sessions</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${formatNumber(data.summary.totalTokens)}</div>
            <div class="metric-label">Tokens</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">$${data.summary.totalCost.toFixed(2)}</div>
            <div class="metric-label">Total Cost</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.summary.resolvedIssues}/${data.summary.totalIssues}</div>
            <div class="metric-label">Issues Resolved</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.summary.totalFeatures}</div>
            <div class="metric-label">Features</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${Math.round(data.summary.avgSessionDuration)}m</div>
            <div class="metric-label">Avg Duration</div>
          </div>
        </div>
        
        <h2>Model Distribution</h2>
        <table>
          <tr><th>Model</th><th>Sessions</th><th>Percentage</th></tr>
          ${Object.entries(data.distributions.models).map(([model, count]) => `
            <tr>
              <td>${model}</td>
              <td>${count}</td>
              <td>${Math.round((count / data.summary.totalSessions) * 100)}%</td>
            </tr>
          `).join('')}
        </table>
        
        <h2>Issue Types</h2>
        <table>
          <tr><th>Type</th><th>Count</th></tr>
          ${Object.entries(data.distributions.issues).map(([type, count]) => `
            <tr><td class="capitalize">${type}</td><td>${count}</td></tr>
          `).join('')}
        </table>
        
        <h2>Recent Sessions</h2>
        <table>
          <tr><th>Date</th><th>Title</th><th>Tokens</th><th>Cost</th></tr>
          ${data.recentSessions.slice(0, 10).map(s => `
            <tr>
              <td>${new Date(s.sessionDate).toLocaleDateString()}</td>
              <td>${s.title || 'Untitled'}</td>
              <td>${formatNumber(s.totalTokens)}</td>
              <td>$${s.estimatedCost.toFixed(3)}</td>
            </tr>
          `).join('')}
        </table>
        
        ${efficiencyMetrics ? `
          <h2>Efficiency Metrics</h2>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-value">${Math.round(efficiencyMetrics.efficiencyScore)}</div>
              <div class="metric-label">Efficiency Score</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${Math.round(efficiencyMetrics.resolutionRate)}%</div>
              <div class="metric-label">Resolution Rate</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${formatNumber(Math.round(efficiencyMetrics.avgTokensPerFeature))}</div>
              <div class="metric-label">Tokens/Feature</div>
            </div>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>AI Coding Analytics Dashboard - Self-improvement through data-driven insights</p>
        </div>
      </body>
      </html>
    `
  }

  useEffect(() => {
    setMounted(true)
    loadDashboard()
  }, [loadDashboard, dateRange])

  // Handle session selection
  useEffect(() => {
    if (selectedSession) {
      loadSessionDetails(selectedSession.id)
    } else {
      setSessionDetails(null)
    }
  }, [selectedSession])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
        <span className="ml-3" style={{ color: colors.textMuted }}>Loading analytics...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p style={{ color: colors.textMuted }}>No analytics data available. Import some sessions first!</p>
      </div>
    )
  }

  const { summary, distributions, dailyStats, recentSessions, recentIssues, topPatterns } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>📊 AI Coding Analytics</h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            Track your AI coding sessions, identify patterns, and improve efficiency
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: alpha(colors.card, 50) }}>
            {(['7d', '30d', '90d', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={{
                  backgroundColor: dateRange === range ? colors.primary : 'transparent',
                  color: dateRange === range ? 'white' : colors.textSecondary
                }}
              >
                {range === 'all' ? 'All Time' : `Last ${range}`}
              </button>
            ))}
          </div>
          
          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={exportToJSON}
              className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 border"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              JSON
            </button>
            <button
              onClick={exportToPDF}
              disabled={exporting}
              className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 border"
              style={{ 
                borderColor: colors.primary, 
                color: colors.primary,
                opacity: exporting ? 0.5 : 1
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {exporting ? 'Exporting...' : 'PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard
          title="Sessions"
          value={summary.totalSessions}
          icon="📝"
          color={colors.primary}
        />
        <SummaryCard
          title="Tokens"
          value={formatNumber(summary.totalTokens)}
          icon="🔢"
          color={colors.accent}
        />
        <SummaryCard
          title="Cost"
          value={`$${summary.totalCost.toFixed(2)}`}
          icon="💰"
          color={colors.success}
        />
        <SummaryCard
          title="Issues"
          value={`${summary.resolvedIssues}/${summary.totalIssues}`}
          icon="🐛"
          color={colors.warning}
          subtitle={summary.totalIssues > 0 ? `${Math.round(summary.resolvedIssues / summary.totalIssues * 100)}% resolved` : undefined}
        />
        <SummaryCard
          title="Features"
          value={summary.totalFeatures}
          icon="✨"
          color={colors.info || '#3b82f6'}
        />
        <SummaryCard
          title="Efficiency"
          value={efficiencyMetrics ? `${Math.round(efficiencyMetrics.efficiencyScore)}` : '-'}
          icon="🎯"
          color={colors.success}
          subtitle={efficiencyMetrics ? '/100 score' : undefined}
        />
      </div>

      {/* Alert Banner for Critical Warnings */}
      {warnings.filter(w => w.severity === 'critical' || w.severity === 'high').length > 0 && (
        <div 
          className="p-4 rounded-xl border-l-4 flex items-center justify-between"
          style={{ 
            backgroundColor: alpha(colors.warning, 10), 
            borderColor: colors.warning 
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-semibold" style={{ color: colors.text }}>
                {warnings.filter(w => w.severity === 'critical' || w.severity === 'high').length} Critical Warnings Detected
              </div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>
                {warnings[0]?.title.slice(0, 60)}...
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('warnings')}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: colors.warning, color: 'white' }}
          >
            View Warnings
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: colors.border }}>
        {[
          { key: 'overview', label: '📈 Overview' },
          { key: 'sessions', label: '📝 Sessions' },
          { key: 'issues', label: '🐛 Issues' },
          { key: 'warnings', label: `⚠️ Warnings${warnings.length > 0 ? ` (${warnings.length})` : ''}` },
          { key: 'predictions', label: '🔮 Predictions' },
          { key: 'patterns', label: '🔄 Patterns' },
          { key: 'git', label: '📂 Git' },
          { key: 'cost', label: '💰 Cost' },
          { key: 'reports', label: '📋 Reports' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className="px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap"
            style={{
              borderColor: activeTab === tab.key ? colors.primary : 'transparent',
              color: activeTab === tab.key ? colors.primary : colors.textSecondary,
              backgroundColor: activeTab === tab.key ? alpha(colors.primary, 5) : 'transparent'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Activity Heatmap */}
          <div 
            className="p-4 rounded-xl border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h3 className="font-semibold mb-4" style={{ color: colors.text }}>🗓️ Weekly Activity Heatmap</h3>
            <ActivityHeatmap 
              dailyStats={dailyStats}
              color={colors.primary}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Token Usage Trend */}
            <div 
              className="p-4 rounded-xl border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <h3 className="font-semibold mb-4" style={{ color: colors.text }}>📈 Token Usage Trend</h3>
              <SimpleLineChart 
                data={Object.entries(dailyStats).map(([date, stats]) => ({
                  label: date.slice(5),
                  value: stats.tokens
                }))}
                color={colors.primary}
                height={200}
              />
            </div>

            {/* Model Distribution - Pie Chart */}
            <div 
              className="p-4 rounded-xl border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <h3 className="font-semibold mb-4" style={{ color: colors.text }}>🤖 Model Distribution</h3>
              <SimplePieChart 
                data={Object.entries(distributions.models).map(([name, value]) => ({
                  label: name,
                  value
                }))}
                colors={[colors.primary, colors.accent, colors.success, colors.warning, '#8b5cf6', '#ec4899']}
              />
            </div>

            {/* Issue Distribution - Pie Chart */}
            <div 
              className="p-4 rounded-xl border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <h3 className="font-semibold mb-4" style={{ color: colors.text }}>🐛 Issue Type Distribution</h3>
              <SimplePieChart 
                data={Object.entries(distributions.issues).map(([type, count]) => ({
                  label: type,
                  value: count
                }))}
                colors={[colors.warning, '#f97316', '#dc2626', '#ca8a04', '#65a30d']}
              />
            </div>

            {/* Category Distribution - Bar Chart */}
            <div 
              className="p-4 rounded-xl border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <h3 className="font-semibold mb-4" style={{ color: colors.text }}>📂 Session Categories</h3>
              <SimpleBarChart 
                data={Object.entries(distributions.categories).map(([category, count]) => ({
                  label: category,
                  value: count
                }))}
                color={colors.accent}
                height={180}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {/* Session Type Summary - Pie Chart */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="p-4 rounded-xl border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <h4 className="font-medium mb-3" style={{ color: colors.text }}>Session Types</h4>
              <SimplePieChart 
                data={Object.entries(distributions.categories).map(([cat, count]) => ({
                  label: cat,
                  value: count
                }))}
                colors={[colors.primary, colors.accent, colors.success, colors.warning, '#8b5cf6']}
              />
            </div>
            
            <div 
              className="p-4 rounded-xl border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <h4 className="font-medium mb-3" style={{ color: colors.text }}>Efficiency Metrics</h4>
              {efficiencyMetrics && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span style={{ color: colors.textSecondary }}>Avg Tokens/Feature</span>
                    <span className="font-mono" style={{ color: colors.text }}>
                      {formatNumber(Math.round(efficiencyMetrics.avgTokensPerFeature))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: colors.textSecondary }}>Avg Tokens/Issue</span>
                    <span className="font-mono" style={{ color: colors.text }}>
                      {formatNumber(Math.round(efficiencyMetrics.avgTokensPerIssue))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: colors.textSecondary }}>Resolution Rate</span>
                    <span className="font-mono" style={{ color: colors.success }}>
                      {Math.round(efficiencyMetrics.resolutionRate)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div 
              className="p-4 rounded-xl border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <h4 className="font-medium mb-3" style={{ color: colors.text }}>Quick Stats</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{ color: colors.textSecondary }}>Total Files Modified</span>
                  <span className="font-mono" style={{ color: colors.text }}>
                    {recentSessions.reduce((sum, s) => sum + s.filesModified + s.filesCreated, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.textSecondary }}>Avg Session Duration</span>
                  <span className="font-mono" style={{ color: colors.text }}>
                    {Math.round(summary.avgSessionDuration)}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: colors.textSecondary }}>Cost per Feature</span>
                  <span className="font-mono" style={{ color: colors.success }}>
                    ${summary.totalFeatures > 0 ? (summary.totalCost / summary.totalFeatures).toFixed(3) : '0.00'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sessions Table */}
          <div 
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: colors.border }}
          >
            <table className="w-full">
              <thead style={{ backgroundColor: alpha(colors.card, 50) }}>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: colors.textMuted }}>Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: colors.textMuted }}>Title</th>
                  <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: colors.textMuted }}>Model</th>
                  <th className="px-4 py-3 text-right text-sm font-medium" style={{ color: colors.textMuted }}>Tokens</th>
                  <th className="px-4 py-3 text-right text-sm font-medium" style={{ color: colors.textMuted }}>Cost</th>
                  <th className="px-4 py-3 text-right text-sm font-medium" style={{ color: colors.textMuted }}>Files</th>
                  <th className="px-4 py-3 text-right text-sm font-medium" style={{ color: colors.textMuted }}>Issues</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session, i) => (
                  <tr 
                    key={session.id}
                    className="cursor-pointer transition-colors hover:bg-black/5"
                    style={{ 
                      backgroundColor: i % 2 === 0 ? 'transparent' : alpha(colors.card, 20),
                      borderBottom: `1px solid ${alpha(colors.border, 30)}`
                    }}
                    onClick={() => setSelectedSession(session)}
                  >
                    <td className="px-4 py-3 text-sm" style={{ color: colors.textSecondary }}>
                      {new Date(session.sessionDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium max-w-xs truncate" style={{ color: colors.text }}>
                      {session.title || 'Untitled Session'}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: colors.textSecondary }}>
                      <span 
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}
                      >
                        {session.model}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono" style={{ color: colors.text }}>
                      {formatNumber(session.totalTokens)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: colors.success }}>
                      ${session.estimatedCost.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: colors.textSecondary }}>
                      {session.filesCreated + session.filesModified}
                    </td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: colors.textSecondary }}>
                      <span style={{ color: session.issuesResolved > 0 ? colors.success : colors.textMuted }}>
                        {session.issuesResolved}
                      </span>
                      /{session.issuesCreated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="space-y-6">
          {/* Issue Type Pie Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div 
              className="p-4 rounded-xl border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <h3 className="font-semibold mb-4" style={{ color: colors.text }}>🐛 Issue Distribution</h3>
              <SimplePieChart 
                data={Object.entries(distributions.issues).map(([type, count]) => ({
                  label: type,
                  value: count
                }))}
                colors={[colors.warning, '#f97316', '#dc2626', '#ca8a04', '#65a30d']}
              />
            </div>
            
            <div 
              className="p-4 rounded-xl border"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <h3 className="font-semibold mb-4" style={{ color: colors.text }}>📊 Resolution Status</h3>
              <SimplePieChart 
                data={[
                  { label: 'Resolved', value: summary.resolvedIssues },
                  { label: 'Open', value: summary.totalIssues - summary.resolvedIssues }
                ]}
                colors={[colors.success, colors.warning]}
              />
            </div>
          </div>
          
          {/* Issue Type Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(distributions.issues).map(([type, count]) => (
              <div 
                key={type}
                className="p-4 rounded-lg border"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <div className="text-2xl font-bold" style={{ color: colors.warning }}>{count}</div>
                <div className="text-sm capitalize" style={{ color: colors.textSecondary }}>{type}</div>
              </div>
            ))}
          </div>

          {/* Recent Issues List */}
          <div 
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: colors.border }}
          >
            <div className="px-4 py-3 border-b" style={{ borderColor: colors.border, backgroundColor: alpha(colors.card, 50) }}>
              <h3 className="font-semibold" style={{ color: colors.text }}>Recent Issues</h3>
            </div>
            <div className="divide-y" style={{ borderColor: alpha(colors.border, 30) }}>
              {recentIssues.map((issue) => (
                <div key={issue.id} className="px-4 py-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ 
                          backgroundColor: alpha(getSeverityColor(issue.severity, colors), 20),
                          color: getSeverityColor(issue.severity, colors)
                        }}
                      >
                        {issue.severity}
                      </span>
                      <span 
                        className="px-2 py-0.5 rounded text-xs capitalize"
                        style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}
                      >
                        {issue.issueType}
                      </span>
                      {issue.recurrenceCount > 0 && (
                        <span 
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ backgroundColor: alpha(colors.warning, 20), color: colors.warning }}
                        >
                          🔁 {issue.recurrenceCount}x
                        </span>
                      )}
                    </div>
                    <p className="text-sm truncate" style={{ color: colors.text }}>{issue.title}</p>
                    {issue.errorMessage && (
                      <p className="text-xs mt-1 font-mono truncate" style={{ color: colors.textMuted }}>
                        {issue.errorMessage.slice(0, 100)}
                      </p>
                    )}
                    {issue.resolution && (
                      <p className="text-xs mt-1" style={{ color: colors.success }}>
                        ✓ {issue.resolution.slice(0, 100)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs" style={{ color: colors.textMuted }}>
                      {new Date(issue.session.sessionDate).toLocaleDateString()}
                    </div>
                    <div 
                      className="text-xs mt-1 px-2 py-0.5 rounded inline-block"
                      style={{ 
                        color: issue.status === 'resolved' ? colors.success : colors.warning,
                        backgroundColor: alpha(issue.status === 'resolved' ? colors.success : colors.warning, 10)
                      }}
                    >
                      {issue.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'patterns' && (
        <div className="space-y-6">
          {/* Issue Type Heatmap */}
          <div 
            className="p-4 rounded-xl border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h3 className="font-semibold mb-4" style={{ color: colors.text }}>🔥 Issue Type Heatmap</h3>
            <IssueTypeHeatmap 
              issues={distributions.issues}
              colors={colors}
            />
          </div>
          
          {/* Recurrence Heatmap */}
          <div 
            className="p-4 rounded-xl border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h3 className="font-semibold mb-4" style={{ color: colors.text }}>🔄 Recurring Issue Patterns</h3>
            {topPatterns.length > 0 ? (
              <div className="space-y-3">
                {topPatterns.map((pattern, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: alpha(colors.bg, 50) }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                        style={{ 
                          backgroundColor: alpha(colors.warning, 20),
                          color: colors.warning
                        }}
                      >
                        {pattern.count}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: colors.text }}>{pattern.pattern}</div>
                        <div className="text-xs" style={{ color: colors.textMuted }}>
                          Last seen: {new Date(pattern.lastSeen).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <span 
                      className="px-2 py-1 rounded text-xs"
                      style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}
                    >
                      {pattern.type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8" style={{ color: colors.textMuted }}>
                No recurring patterns detected yet
              </p>
            )}
          </div>

          {/* Prevention Tips */}
          <div 
            className="p-4 rounded-xl border-l-4"
            style={{ backgroundColor: alpha(colors.accent, 5), borderColor: colors.accent }}
          >
            <h3 className="font-semibold mb-2" style={{ color: colors.text }}>💡 Pattern Prevention Tips</h3>
            <ul className="space-y-2 text-sm" style={{ color: colors.textSecondary }}>
              <li>• Review recurring TypeScript errors - consider stricter type checking</li>
              <li>• Auth cookie issues suggest implementing refresh token logic</li>
              <li>• Build failures often relate to dependency version conflicts</li>
              <li>• Use the batch import to automatically track future sessions</li>
              <li>• Document resolutions to build a knowledge base for similar issues</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'cost' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Trend */}
          <div 
            className="p-4 rounded-xl border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h3 className="font-semibold mb-4" style={{ color: colors.text }}>💰 Cost Trend</h3>
            <SimpleLineChart 
              data={Object.entries(dailyStats).map(([date, stats]) => ({
                label: date.slice(5),
                value: stats.cost
              }))}
              color={colors.success}
              height={200}
              prefix="$"
            />
          </div>

          {/* Cost Breakdown Pie */}
          <div 
            className="p-4 rounded-xl border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h3 className="font-semibold mb-4" style={{ color: colors.text }}>📊 Cost by Model</h3>
            <SimplePieChart 
              data={Object.entries(distributions.models).map(([model, count]) => ({
                label: model,
                value: count // Sessions per model as proxy for cost distribution
              }))}
              colors={[colors.primary, colors.accent, colors.success, colors.warning, '#8b5cf6']}
            />
          </div>

          {/* Cost Metrics */}
          <div 
            className="p-4 rounded-xl border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h3 className="font-semibold mb-4" style={{ color: colors.text }}>📊 Cost Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                <span style={{ color: colors.textSecondary }}>Total Cost</span>
                <span className="text-xl font-bold" style={{ color: colors.success }}>
                  ${summary.totalCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                <span style={{ color: colors.textSecondary }}>Total Tokens</span>
                <span className="font-mono" style={{ color: colors.text }}>
                  {formatNumber(summary.totalTokens)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                <span style={{ color: colors.textSecondary }}>Avg Cost/Session</span>
                <span className="font-mono" style={{ color: colors.text }}>
                  ${summary.totalSessions > 0 ? (summary.totalCost / summary.totalSessions).toFixed(3) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                <span style={{ color: colors.textSecondary }}>Avg Cost/Feature</span>
                <span className="font-mono" style={{ color: colors.text }}>
                  ${summary.totalFeatures > 0 ? (summary.totalCost / summary.totalFeatures).toFixed(3) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                <span style={{ color: colors.textSecondary }}>Avg Cost/Issue Resolved</span>
                <span className="font-mono" style={{ color: colors.text }}>
                  ${summary.resolvedIssues > 0 ? (summary.totalCost / summary.resolvedIssues).toFixed(3) : '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Efficiency Score */}
          <div 
            className="p-4 rounded-xl border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <h3 className="font-semibold mb-4" style={{ color: colors.text }}>🎯 Efficiency Score</h3>
            {efficiencyMetrics ? (
              <div className="flex items-center justify-center gap-8">
                <div 
                  className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold"
                  style={{ 
                    background: `conic-gradient(${colors.success} ${efficiencyMetrics.efficiencyScore}%, ${alpha(colors.border, 30)} 0)`,
                    color: 'white',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}
                >
                  {Math.round(efficiencyMetrics.efficiencyScore)}
                </div>
                <div className="space-y-2">
                  <div className="text-lg" style={{ color: colors.text }}>Overall Score</div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>
                    Based on resolution rate, cost efficiency & productivity
                  </div>
                  <div className="flex gap-4 mt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: colors.primary }}>
                        {formatNumber(Math.round(efficiencyMetrics.avgTokensPerFeature))}
                      </div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Tokens/Feature</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: colors.accent }}>
                        {summary.totalSessions > 0 ? (summary.totalFeatures / summary.totalSessions).toFixed(1) : 0}
                      </div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Features/Session</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: colors.textMuted }}>Loading metrics...</p>
            )}
          </div>
        </div>
      )}

      {/* Warnings Tab */}
      {activeTab === 'warnings' && (
        <div className="space-y-6">
          {/* Warning Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Critical', count: warnings.filter(w => w.severity === 'critical').length, color: '#dc2626' },
              { label: 'High', count: warnings.filter(w => w.severity === 'high').length, color: '#f97316' },
              { label: 'Medium', count: warnings.filter(w => w.severity === 'medium').length, color: colors.warning },
              { label: 'Low', count: warnings.filter(w => w.severity === 'low').length, color: colors.success }
            ].map(item => (
              <div 
                key={item.label}
                className="p-4 rounded-xl border text-center"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <div className="text-3xl font-bold" style={{ color: item.color }}>{item.count}</div>
                <div className="text-sm" style={{ color: colors.textSecondary }}>{item.label} Priority</div>
              </div>
            ))}
          </div>

          {/* Warnings List */}
          {loadingWarnings ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
            </div>
          ) : warnings.length > 0 ? (
            <div className="space-y-4">
              {warnings.map((warning) => (
                <div 
                  key={warning.id}
                  className="p-4 rounded-xl border"
                  style={{ 
                    backgroundColor: colors.card, 
                    borderColor: warning.severity === 'critical' ? '#dc2626' : 
                                warning.severity === 'high' ? '#f97316' : colors.border 
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium uppercase"
                          style={{ 
                            backgroundColor: alpha(
                              warning.severity === 'critical' ? '#dc2626' : 
                              warning.severity === 'high' ? '#f97316' : 
                              warning.severity === 'medium' ? colors.warning : colors.success, 20),
                            color: warning.severity === 'critical' ? '#dc2626' : 
                                   warning.severity === 'high' ? '#f97316' : 
                                   warning.severity === 'medium' ? colors.warning : colors.success
                          }}
                        >
                          {warning.severity}
                        </span>
                        <span 
                          className="px-2 py-1 rounded text-xs capitalize"
                          style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}
                        >
                          {warning.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs" style={{ color: colors.textMuted }}>
                          {warning.occurrenceCount} occurrences
                        </span>
                      </div>
                      <h4 className="font-semibold mb-1" style={{ color: colors.text }}>{warning.title}</h4>
                      <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>{warning.description}</p>
                      <div 
                        className="p-3 rounded-lg mt-2"
                        style={{ backgroundColor: alpha(colors.success, 10) }}
                      >
                        <div className="text-xs font-medium mb-1" style={{ color: colors.success }}>💡 Suggested Action</div>
                        <div className="text-sm" style={{ color: colors.text }}>{warning.suggestedAction}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs" style={{ color: colors.textMuted }}>
                        Last: {new Date(warning.lastOccurred).toLocaleDateString()}
                      </div>
                      <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                        {Math.round(warning.confidence * 100)}% confidence
                      </div>
                      <button
                        onClick={() => acknowledgeWarning(warning.id)}
                        className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className="text-center py-12 rounded-xl border"
              style={{ borderColor: colors.border }}
            >
              <div className="text-4xl mb-3">✅</div>
              <p style={{ color: colors.text }}>No warnings detected</p>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Great job! Keep up the good work.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Predictions Tab */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          {/* Prediction Engine Header */}
          <div 
            className="p-4 rounded-xl border-l-4"
            style={{ backgroundColor: alpha(colors.accent, 5), borderColor: colors.accent }}
          >
            <h3 className="font-semibold mb-2" style={{ color: colors.text }}>🔮 Prediction Engine</h3>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Based on your historical data, the engine predicts potential issues you might encounter.
              Use these insights to proactively prevent problems.
            </p>
          </div>

          {/* Risk Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'High Risk', count: predictions.filter(p => p.riskLevel === 'high').length, color: '#dc2626' },
              { label: 'Medium Risk', count: predictions.filter(p => p.riskLevel === 'medium').length, color: colors.warning },
              { label: 'Low Risk', count: predictions.filter(p => p.riskLevel === 'low').length, color: colors.success }
            ].map(item => (
              <div 
                key={item.label}
                className="p-4 rounded-xl border text-center"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <div className="text-3xl font-bold" style={{ color: item.color }}>{item.count}</div>
                <div className="text-sm" style={{ color: colors.textSecondary }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Predictions List */}
          {loadingPredictions ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
            </div>
          ) : predictions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {predictions.map((prediction) => (
                <div 
                  key={prediction.id}
                  className="p-4 rounded-xl border"
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium capitalize"
                        style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}
                      >
                        {prediction.issueType}
                      </span>
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium uppercase"
                        style={{ 
                          backgroundColor: alpha(
                            prediction.riskLevel === 'high' ? '#dc2626' : 
                            prediction.riskLevel === 'medium' ? colors.warning : colors.success, 20),
                          color: prediction.riskLevel === 'high' ? '#dc2626' : 
                                 prediction.riskLevel === 'medium' ? colors.warning : colors.success
                        }}
                      >
                        {prediction.riskLevel} risk
                      </span>
                    </div>
                    <div 
                      className="text-2xl font-bold"
                      style={{ 
                        color: prediction.probability > 50 ? '#dc2626' : 
                               prediction.probability > 25 ? colors.warning : colors.success 
                      }}
                    >
                      {prediction.probability}%
                    </div>
                  </div>
                  
                  <p className="text-sm mb-3" style={{ color: colors.text }}>{prediction.predictedTrigger}</p>
                  
                  {/* Probability Bar */}
                  <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: alpha(colors.border, 30) }}>
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${prediction.probability}%`,
                        backgroundColor: prediction.probability > 50 ? '#dc2626' : 
                                       prediction.probability > 25 ? colors.warning : colors.success 
                      }}
                    />
                  </div>

                  {/* Preventive Actions */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium" style={{ color: colors.textMuted }}>Preventive Actions</div>
                    {prediction.preventiveActions.slice(0, 3).map((action, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span style={{ color: colors.success }}>✓</span>
                        <span style={{ color: colors.textSecondary }}>{action}</span>
                      </div>
                    ))}
                  </div>

                  {/* Based On */}
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: alpha(colors.border, 30) }}>
                    <div className="text-xs" style={{ color: colors.textMuted }}>
                      Based on: {prediction.basedOn.join(', ')}
                    </div>
                    <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
                      Confidence: {Math.round(prediction.confidence * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className="text-center py-12 rounded-xl border"
              style={{ borderColor: colors.border }}
            >
              <div className="text-4xl mb-3">🔮</div>
              <p style={{ color: colors.text }}>No predictions available</p>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Import more sessions to enable accurate predictions
              </p>
            </div>
          )}
        </div>
      )}

      {/* Git Tab */}
      {activeTab === 'git' && (
        <div className="space-y-6">
          {/* Git Summary */}
          {gitSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="text-2xl font-bold" style={{ color: colors.primary }}>{gitSummary.totalCommits}</div>
                <div className="text-sm" style={{ color: colors.textSecondary }}>Total Commits</div>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="text-2xl font-bold" style={{ color: colors.success }}>+{gitSummary.totalAdditions}</div>
                <div className="text-sm" style={{ color: colors.textSecondary }}>Lines Added</div>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="text-2xl font-bold" style={{ color: colors.warning }}>-{gitSummary.totalDeletions}</div>
                <div className="text-sm" style={{ color: colors.textSecondary }}>Lines Deleted</div>
              </div>
              <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <div className="text-2xl font-bold" style={{ color: colors.accent }}>{gitSummary.uniqueFiles}</div>
                <div className="text-sm" style={{ color: colors.textSecondary }}>Files Modified</div>
              </div>
            </div>
          )}

          {/* Commit Categories */}
          {gitSummary?.commitCategories && Object.keys(gitSummary.commitCategories).length > 0 && (
            <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
              <h3 className="font-semibold mb-4" style={{ color: colors.text }}>📊 Commit Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(gitSummary.commitCategories).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                    <span className="capitalize text-sm" style={{ color: colors.textSecondary }}>{category}</span>
                    <span className="font-mono" style={{ color: colors.text }}>{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Commits */}
          {loadingGit ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: colors.primary }} />
            </div>
          ) : gitCommits.length > 0 ? (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: colors.border }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: colors.border, backgroundColor: alpha(colors.card, 50) }}>
                <h3 className="font-semibold" style={{ color: colors.text }}>Recent Commits</h3>
              </div>
              <div className="divide-y" style={{ borderColor: alpha(colors.border, 30) }}>
                {gitCommits.slice(0, 20).map((commit) => (
                  <div key={commit.hash} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-mono"
                            style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}
                          >
                            {commit.hash.slice(0, 7)}
                          </span>
                          <span className="text-xs" style={{ color: colors.textMuted }}>{commit.author}</span>
                        </div>
                        <p className="text-sm truncate" style={{ color: colors.text }}>{commit.message}</p>
                        {commit.files.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {commit.files.slice(0, 5).map((file, i) => (
                              <span 
                                key={i}
                                className="px-2 py-0.5 rounded text-xs truncate max-w-[150px]"
                                style={{ backgroundColor: alpha(colors.border, 20), color: colors.textMuted }}
                              >
                                {file.split('/').pop()}
                              </span>
                            ))}
                            {commit.files.length > 5 && (
                              <span className="text-xs" style={{ color: colors.textMuted }}>
                                +{commit.files.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs" style={{ color: colors.textMuted }}>
                          {new Date(commit.date).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2 mt-1 text-xs">
                          <span style={{ color: colors.success }}>+{commit.additions}</span>
                          <span style={{ color: colors.warning }}>-{commit.deletions}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div 
              className="text-center py-12 rounded-xl border"
              style={{ borderColor: colors.border }}
            >
              <div className="text-4xl mb-3">📂</div>
              <p style={{ color: colors.text }}>No git history available</p>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Make sure this is a git repository
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Generate Report Actions */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => generateReport('weekly')}
              disabled={generatingReport}
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2"
              style={{ backgroundColor: colors.primary, color: 'white', opacity: generatingReport ? 0.5 : 1 }}
            >
              {generatingReport ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <span>📊</span>
              )}
              Generate Weekly Report
            </button>
            <button
              onClick={() => generateReport('monthly')}
              disabled={generatingReport}
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 border"
              style={{ borderColor: colors.primary, color: colors.primary, opacity: generatingReport ? 0.5 : 1 }}
            >
              {generatingReport ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: colors.primary }} />
              ) : (
                <span>📈</span>
              )}
              Generate Monthly Report
            </button>
          </div>

          {/* Latest Report */}
          {latestReport ? (
            <div className="space-y-6">
              {/* Report Header */}
              <div 
                className="p-4 rounded-xl border"
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg" style={{ color: colors.text }}>
                      {latestReport.period === 'weekly' ? 'Weekly' : 'Monthly'} Self-Assessment Report
                    </h3>
                    <p className="text-sm" style={{ color: colors.textMuted }}>
                      {new Date(latestReport.startDate).toLocaleDateString()} - {new Date(latestReport.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ 
                      background: `conic-gradient(${colors.success} ${latestReport.summary.efficiencyScore}%, ${alpha(colors.border, 30)} 0)`,
                      color: 'white',
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                  >
                    {latestReport.summary.efficiencyScore}
                  </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                    <div className="text-xl font-bold" style={{ color: colors.primary }}>{latestReport.summary.totalSessions}</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Sessions</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                    <div className="text-xl font-bold" style={{ color: colors.warning }}>{latestReport.summary.totalIssues}</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Issues</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                    <div className="text-xl font-bold" style={{ color: colors.success }}>{latestReport.summary.resolvedIssues}</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Resolved</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                    <div className="text-xl font-bold" style={{ color: colors.accent }}>{latestReport.summary.totalFeatures}</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Features</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                    <div className="text-xl font-bold" style={{ color: colors.success }}>${latestReport.summary.totalCost.toFixed(2)}</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Cost</div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              {latestReport.insights.length > 0 && (
                <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <h4 className="font-semibold mb-4" style={{ color: colors.text }}>💡 Key Insights</h4>
                  <div className="space-y-3">
                    {latestReport.insights.map((insight, i) => (
                      <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className="px-2 py-0.5 rounded text-xs capitalize"
                            style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}
                          >
                            {insight.category}
                          </span>
                          <span 
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ 
                              backgroundColor: alpha(
                                insight.priority === 'high' ? '#dc2626' : 
                                insight.priority === 'medium' ? colors.warning : colors.success, 20),
                              color: insight.priority === 'high' ? '#dc2626' : 
                                     insight.priority === 'medium' ? colors.warning : colors.success
                            }}
                          >
                            {insight.priority}
                          </span>
                        </div>
                        <p className="text-sm font-medium" style={{ color: colors.text }}>{insight.insight}</p>
                        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                          <strong>Recommendation:</strong> {insight.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Git Summary */}
              {latestReport.gitSummary.totalCommits > 0 && (
                <div className="p-4 rounded-xl border" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                  <h4 className="font-semibold mb-4" style={{ color: colors.text }}>📂 Git Activity</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                      <div className="text-lg font-bold" style={{ color: colors.text }}>{latestReport.gitSummary.totalCommits}</div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Commits</div>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                      <div className="text-lg font-bold" style={{ color: colors.text }}>{latestReport.gitSummary.filesModified.length}</div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Files Modified</div>
                    </div>
                    <div className="p-3 rounded-lg md:col-span-1 col-span-2" style={{ backgroundColor: alpha(colors.bg, 50) }}>
                      <div className="text-xs mb-2" style={{ color: colors.textMuted }}>Commit Types</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(latestReport.gitSummary.commitCategories).slice(0, 4).map(([type, count]) => (
                          <span 
                            key={type}
                            className="px-2 py-0.5 rounded text-xs capitalize"
                            style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}
                          >
                            {type}: {count as number}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div 
              className="text-center py-12 rounded-xl border"
              style={{ borderColor: colors.border }}
            >
              <div className="text-4xl mb-3">📋</div>
              <p style={{ color: colors.text }}>No reports generated yet</p>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                Click a button above to generate your first self-assessment report
              </p>
            </div>
          )}
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal 
          session={selectedSession}
          sessionDetails={sessionDetails}
          loading={loadingDetails}
          colors={colors}
          alpha={alpha}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  )
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function SummaryCard({ 
  title, 
  value, 
  icon, 
  color, 
  subtitle 
}: { 
  title: string
  value: string | number
  icon: string
  color: string
  subtitle?: string 
}) {
  const { colors } = useTheme()
  
  return (
    <div 
      className="p-4 rounded-xl border"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm" style={{ color: colors.textMuted }}>{title}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      {subtitle && (
        <div className="text-xs mt-1" style={{ color: colors.textMuted }}>{subtitle}</div>
      )}
    </div>
  )
}

function ActivityHeatmap({ 
  dailyStats, 
  color 
}: { 
  dailyStats: Record<string, { sessions: number; tokens: number; cost: number }>
  color: string
}) {
  const { colors } = useTheme()
  
  // Get last 4 weeks of data
  const weeks: { date: string; sessions: number; day: string }[][] = []
  const today = new Date()
  
  for (let week = 3; week >= 0; week--) {
    const weekData: { date: string; sessions: number; day: string }[] = []
    for (let day = 6; day >= 0; day--) {
      const date = new Date(today)
      date.setDate(date.getDate() - (week * 7 + day))
      const dateKey = date.toISOString().split('T')[0]
      const stats = dailyStats[dateKey]
      
      weekData.push({
        date: dateKey,
        sessions: stats?.sessions || 0,
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
      })
    }
    weeks.push(weekData)
  }
  
  const maxSessions = Math.max(...Object.values(dailyStats).map(d => d.sessions), 1)
  
  const getIntensity = (sessions: number) => {
    if (sessions === 0) return 0
    const ratio = sessions / maxSessions
    if (ratio > 0.75) return 4
    if (ratio > 0.5) return 3
    if (ratio > 0.25) return 2
    return 1
  }
  
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <div className="w-10" /> {/* Day labels */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex-1 flex flex-col gap-1">
            {week.map((day, di) => {
              const intensity = getIntensity(day.sessions)
              return (
                <div
                  key={di}
                  className="h-6 rounded flex items-center justify-center text-xs"
                  style={{
                    backgroundColor: intensity === 0 
                      ? alpha(colors.border, 20)
                      : intensity === 1 
                        ? alpha(color, 25)
                        : intensity === 2
                          ? alpha(color, 50)
                          : intensity === 3
                            ? alpha(color, 75)
                            : color,
                    color: intensity > 2 ? 'white' : colors.textSecondary,
                    fontSize: '10px'
                  }}
                  title={`${day.date}: ${day.sessions} sessions`}
                >
                  {day.sessions > 0 ? day.sessions : ''}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      
      {/* Day labels */}
      <div className="flex gap-1">
        <div className="w-10 text-xs text-right pr-2" style={{ color: colors.textMuted }}>Mon</div>
        <div className="flex-1 flex">
          {weeks.map((_, wi) => (
            <div key={wi} className="flex-1 text-center text-xs" style={{ color: colors.textMuted }}>
              Week {4 - wi}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-end gap-2 text-xs" style={{ color: colors.textMuted }}>
        <span>Less</span>
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="w-4 h-4 rounded"
            style={{
              backgroundColor: i === 0 
                ? alpha(colors.border, 20)
                : alpha(color, i * 25)
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

function IssueTypeHeatmap({ 
  issues, 
  colors 
}: { 
  issues: Record<string, number>
  colors: any
}) {
  const entries = Object.entries(issues)
  if (entries.length === 0) return null
  
  const maxValue = Math.max(...Object.values(issues), 1)
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {entries.map(([type, count]) => {
        const intensity = count / maxValue
        return (
          <div
            key={type}
            className="p-4 rounded-lg text-center transition-transform hover:scale-105"
            style={{
              backgroundColor: alpha(colors.warning, intensity * 50),
              border: `1px solid ${alpha(colors.warning, intensity * 100)}`
            }}
          >
            <div className="text-3xl font-bold" style={{ color: colors.warning }}>
              {count}
            </div>
            <div className="text-sm capitalize" style={{ color: colors.textSecondary }}>
              {type}
            </div>
            {/* Intensity bar */}
            <div 
              className="mt-2 h-1 rounded-full mx-auto"
              style={{
                width: `${intensity * 100}%`,
                backgroundColor: colors.warning
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

function SimpleLineChart({ 
  data, 
  color, 
  height,
  prefix = ''
}: { 
  data: { label: string; value: number }[]
  color: string
  height: number
  prefix?: string
}) {
  const { colors } = useTheme()
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span style={{ color: colors.textMuted }}>No data available</span>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value), 1)
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1
  
  // Create SVG path
  const width = 400
  const padding = 20
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2
  
  const points = data.map((d, i) => ({
    x: padding + (i / Math.max(1, data.length - 1)) * chartWidth,
    y: padding + chartHeight - ((d.value - minValue) / range) * chartHeight
  }))
  
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  
  // Create area fill
  const areaD = `${pathD} L ${points[points.length - 1]?.x || padding} ${height - padding} L ${padding} ${height - padding} Z`

  return (
    <div className="relative" style={{ height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
          <line
            key={ratio}
            x1={padding}
            y1={padding + chartHeight * ratio}
            x2={width - padding}
            y2={padding + chartHeight * ratio}
            stroke={colors.border}
            strokeOpacity="0.3"
            strokeWidth="1"
          />
        ))}
        {/* Area fill */}
        <path d={areaD} fill={`url(#gradient-${color})`} />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {points.slice(-5).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill={color} />
        ))}
      </svg>
      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4">
        {data.slice(0, 5).map((d, i) => (
          <span key={i} className="text-xs" style={{ color: colors.textMuted }}>
            {d.label}
          </span>
        ))}
      </div>
      {/* Max value */}
      <div className="absolute top-0 right-0 text-xs" style={{ color: colors.textMuted }}>
        {prefix}{formatNumber(maxValue)}
      </div>
    </div>
  )
}

function SimplePieChart({ 
  data, 
  colors 
}: { 
  data: { label: string; value: number }[]
  colors: string[]
}) {
  const { colors: themeColors } = useTheme()
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <span style={{ color: themeColors.textMuted }}>No data available</span>
      </div>
    )
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)
  let currentAngle = -90
  
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 360
    const startAngle = currentAngle
    currentAngle += angle
    return {
      ...d,
      color: colors[i % colors.length],
      startAngle,
      endAngle: currentAngle,
      percentage: Math.round((d.value / total) * 100)
    }
  })

  return (
    <div className="flex items-center gap-6">
      {/* Pie */}
      <svg width="120" height="120" viewBox="0 0 120 120">
        {slices.map((slice, i) => {
          const startRad = (slice.startAngle * Math.PI) / 180
          const endRad = (slice.endAngle * Math.PI) / 180
          const x1 = 60 + 50 * Math.cos(startRad)
          const y1 = 60 + 50 * Math.sin(startRad)
          const x2 = 60 + 50 * Math.cos(endRad)
          const y2 = 60 + 50 * Math.sin(endRad)
          const largeArc = slice.endAngle - slice.startAngle > 180 ? 1 : 0
          
          return (
            <path
              key={i}
              d={`M 60 60 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={slice.color}
              stroke={themeColors.bg}
              strokeWidth="2"
            />
          )
        })}
      </svg>
      {/* Legend */}
      <div className="flex-1 space-y-2">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-sm truncate max-w-[100px]" style={{ color: themeColors.textSecondary }}>
                {slice.label}
              </span>
            </div>
            <span className="text-sm font-mono" style={{ color: themeColors.text }}>
              {slice.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SimpleBarChart({ 
  data, 
  color, 
  height 
}: { 
  data: { label: string; value: number }[]
  color: string
  height: number
}) {
  const { colors } = useTheme()
  
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span style={{ color: colors.textMuted }}>No data available</span>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="space-y-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span 
            className="w-20 text-xs truncate text-right capitalize"
            style={{ color: colors.textSecondary }}
          >
            {d.label}
          </span>
          <div className="flex-1 h-6 rounded overflow-hidden" style={{ backgroundColor: alpha(colors.border, 30) }}>
            <div 
              className="h-full rounded flex items-center justify-end px-2 transition-all"
              style={{ 
                width: `${(d.value / maxValue) * 100}%`,
                backgroundColor: color,
                minWidth: d.value > 0 ? '40px' : '0'
              }}
            >
              <span className="text-xs font-mono text-white">{d.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SessionDetailModal({ 
  session, 
  sessionDetails,
  loading,
  colors, 
  alpha, 
  onClose 
}: { 
  session: SessionSummary
  sessionDetails: SessionDetails | null
  loading: boolean
  colors: any
  alpha: (c: string, o: number) => string
  onClose: () => void
}) {
  const [activeSection, setActiveSection] = useState<'overview' | 'issues' | 'features' | 'messages'>('overview')
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl rounded-xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: colors.bg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: colors.border }}
        >
          <div>
            <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
              {session.title || 'Session Details'}
            </h3>
            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
              {new Date(session.sessionDate).toLocaleDateString()} • {session.duration} minutes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/5"
            style={{ color: colors.textMuted }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Section Tabs */}
        <div className="flex border-b" style={{ borderColor: colors.border }}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'issues', label: `Issues (${session.issuesCreated})` },
            { key: 'features', label: `Features (${session.featuresImplemented})` },
            { key: 'messages', label: 'Messages' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as typeof activeSection)}
              className="px-4 py-2 text-sm font-medium border-b-2 -mb-px"
              style={{
                borderColor: activeSection === tab.key ? colors.primary : 'transparent',
                color: activeSection === tab.key ? colors.primary : colors.textSecondary
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: colors.primary }} />
              <span className="ml-3" style={{ color: colors.textMuted }}>Loading details...</span>
            </div>
          ) : (
            <>
              {activeSection === 'overview' && (
                <div className="space-y-4">
                  {/* Tags */}
                  {session.tags && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {JSON.parse(session.tags).map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded text-xs"
                          style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Summary */}
                  {sessionDetails?.summary && (
                    <div 
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: alpha(colors.card, 50) }}
                    >
                      <p style={{ color: colors.text }}>{sessionDetails.summary}</p>
                    </div>
                  )}
                  
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.card, 50) }}>
                      <div className="text-2xl font-bold" style={{ color: colors.primary }}>{formatNumber(session.totalTokens)}</div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Tokens</div>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.card, 50) }}>
                      <div className="text-2xl font-bold" style={{ color: colors.success }}>${session.estimatedCost.toFixed(3)}</div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Cost</div>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.card, 50) }}>
                      <div className="text-2xl font-bold" style={{ color: colors.accent }}>{session.filesCreated + session.filesModified}</div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Files Modified</div>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.card, 50) }}>
                      <div className="text-2xl font-bold" style={{ color: colors.warning }}>{session.issuesResolved}/{session.issuesCreated}</div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Issues</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.card, 50) }}>
                      <div className="text-lg font-medium" style={{ color: colors.text }}>{session.featuresImplemented}</div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Features Implemented</div>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: alpha(colors.card, 50) }}>
                      <div className="text-lg font-medium" style={{ color: colors.text }}>{session.duration} min</div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Duration</div>
                    </div>
                  </div>
                  
                  {/* Model & Category */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span 
                      className="px-3 py-1 rounded-full text-sm"
                      style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}
                    >
                      {session.model}
                    </span>
                    <span 
                      className="px-3 py-1 rounded-full text-sm capitalize"
                      style={{ backgroundColor: alpha(colors.accent, 10), color: colors.accent }}
                    >
                      {session.category}
                    </span>
                    <span 
                      className="px-3 py-1 rounded-full text-sm"
                      style={{ 
                        backgroundColor: session.status === 'completed' ? alpha(colors.success, 10) : alpha(colors.warning, 10), 
                        color: session.status === 'completed' ? colors.success : colors.warning 
                      }}
                    >
                      {session.status}
                    </span>
                  </div>
                </div>
              )}
              
              {activeSection === 'issues' && (
                <div className="space-y-3">
                  {sessionDetails?.issues && sessionDetails.issues.length > 0 ? (
                    sessionDetails.issues.map((issue: any) => (
                      <div 
                        key={issue.id}
                        className="p-3 rounded-lg border"
                        style={{ borderColor: colors.border, backgroundColor: alpha(colors.card, 30) }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span 
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ 
                              backgroundColor: alpha(getSeverityColor(issue.severity, colors), 20),
                              color: getSeverityColor(issue.severity, colors)
                            }}
                          >
                            {issue.severity}
                          </span>
                          <span 
                            className="px-2 py-0.5 rounded text-xs capitalize"
                            style={{ backgroundColor: alpha(colors.primary, 10), color: colors.primary }}
                          >
                            {issue.issueType}
                          </span>
                          <span 
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ 
                              backgroundColor: issue.status === 'resolved' ? alpha(colors.success, 10) : alpha(colors.warning, 10),
                              color: issue.status === 'resolved' ? colors.success : colors.warning
                            }}
                          >
                            {issue.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium" style={{ color: colors.text }}>{issue.title}</p>
                        {issue.errorMessage && (
                          <p className="text-xs mt-1 font-mono" style={{ color: colors.textMuted }}>
                            {issue.errorMessage}
                          </p>
                        )}
                        {issue.resolution && (
                          <p className="text-xs mt-1" style={{ color: colors.success }}>
                            ✓ {issue.resolution}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8" style={{ color: colors.textMuted }}>No issues recorded</p>
                  )}
                </div>
              )}
              
              {activeSection === 'features' && (
                <div className="space-y-3">
                  {sessionDetails?.features && sessionDetails.features.length > 0 ? (
                    sessionDetails.features.map((feature: any) => (
                      <div 
                        key={feature.id}
                        className="p-3 rounded-lg border"
                        style={{ borderColor: colors.border, backgroundColor: alpha(colors.card, 30) }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span 
                            className="px-2 py-0.5 rounded text-xs capitalize"
                            style={{ backgroundColor: alpha(colors.accent, 10), color: colors.accent }}
                          >
                            {feature.featureType}
                          </span>
                        </div>
                        <p className="text-sm font-medium" style={{ color: colors.text }}>{feature.featureName}</p>
                        {feature.description && (
                          <p className="text-xs mt-1" style={{ color: colors.textMuted }}>{feature.description}</p>
                        )}
                        {feature.filesCreated && JSON.parse(feature.filesCreated).length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs" style={{ color: colors.textMuted }}>Files: </span>
                            {JSON.parse(feature.filesCreated).slice(0, 3).map((file: string, i: number) => (
                              <span key={i} className="text-xs font-mono" style={{ color: colors.primary }}>
                                {file.split('/').pop()}
                                {i < JSON.parse(feature.filesCreated).length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-8" style={{ color: colors.textMuted }}>No features recorded</p>
                  )}
                </div>
              )}
              
              {activeSection === 'messages' && (
                <div className="space-y-3">
                  {sessionDetails?.messages && sessionDetails.messages.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs" style={{ color: colors.textMuted }}>
                        {sessionDetails.messages.length} messages in this session
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 rounded" style={{ backgroundColor: alpha(colors.card, 50) }}>
                          <div className="text-lg font-bold" style={{ color: colors.primary }}>
                            {sessionDetails.messages.filter((m: any) => m.role === 'user').length}
                          </div>
                          <div className="text-xs" style={{ color: colors.textMuted }}>User</div>
                        </div>
                        <div className="p-2 rounded" style={{ backgroundColor: alpha(colors.card, 50) }}>
                          <div className="text-lg font-bold" style={{ color: colors.accent }}>
                            {sessionDetails.messages.filter((m: any) => m.role === 'assistant').length}
                          </div>
                          <div className="text-xs" style={{ color: colors.textMuted }}>Assistant</div>
                        </div>
                        <div className="p-2 rounded" style={{ backgroundColor: alpha(colors.card, 50) }}>
                          <div className="text-lg font-bold" style={{ color: colors.warning }}>
                            {sessionDetails.messages.reduce((sum: number, m: any) => sum + (m.toolCallCount || 0), 0)}
                          </div>
                          <div className="text-xs" style={{ color: colors.textMuted }}>Tool Calls</div>
                        </div>
                        <div className="p-2 rounded" style={{ backgroundColor: alpha(colors.card, 50) }}>
                          <div className="text-lg font-bold" style={{ color: colors.success }}>
                            {sessionDetails.messages.filter((m: any) => m.hasReasoning).length}
                          </div>
                          <div className="text-xs" style={{ color: colors.textMuted }}>Reasoning</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-8" style={{ color: colors.textMuted }}>No message details available</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// HELPERS
// =============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function getSeverityColor(severity: string, colors: any): string {
  switch (severity) {
    case 'critical': return '#dc2626'
    case 'high': return '#f97316'
    case 'medium': return colors.warning
    case 'low': return colors.success
    default: return colors.textSecondary
  }
}
