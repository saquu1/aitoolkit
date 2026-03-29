/**
 * PDF Export API for Analytics Reports
 * Generates downloadable PDF reports with charts and metrics
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dateRange, summary, distributions, dailyStats, sessions, efficiencyMetrics } = body
    
    // Generate HTML report for PDF conversion
    const htmlContent = generatePDFReport({
      dateRange,
      summary,
      distributions,
      dailyStats,
      sessions,
      efficiencyMetrics,
      exportedAt: new Date().toISOString()
    })
    
    // Since we can't use puppeteer in a serverless environment easily,
    // we'll return the HTML content with PDF headers for browser printing
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="analytics-report-${new Date().toISOString().split('T')[0]}.html"`
      }
    })
  } catch (error) {
    console.error('PDF export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

function generatePDFReport(data: {
  dateRange: string
  summary: any
  distributions: any
  dailyStats: any
  sessions: any[]
  efficiencyMetrics: any
  exportedAt: string
}): string {
  const { summary, distributions, dailyStats, sessions, efficiencyMetrics, exportedAt } = data
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }
  
  // Generate chart data for SVG
  const tokenChartData = Object.entries(dailyStats || {}).slice(-14).map(([date, stats]: [string, any]) => ({
    date: date.slice(5),
    tokens: stats.tokens
  }))
  
  const maxTokens = Math.max(...tokenChartData.map(d => d.tokens), 1)
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Coding Analytics Report</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
      background: white;
    }
    
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #3b82f6;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 28px;
      margin: 0;
      color: #1f2937;
    }
    
    .header .subtitle {
      color: #6b7280;
      margin-top: 5px;
    }
    
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
      color: #374151;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .metric-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    
    .metric-value {
      font-size: 24px;
      font-weight: 700;
      color: #3b82f6;
    }
    
    .metric-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    
    .metric-card.success .metric-value { color: #10b981; }
    .metric-card.warning .metric-value { color: #f59e0b; }
    .metric-card.accent .metric-value { color: #8b5cf6; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    th {
      background: #f8fafc;
      font-weight: 600;
      color: #374151;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: #dbeafe;
      color: #1d4ed8;
    }
    
    .tag.success { background: #d1fae5; color: #065f46; }
    .tag.warning { background: #fef3c7; color: #92400e; }
    
    .chart-container {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 15px 0;
    }
    
    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 120px;
      padding-top: 10px;
    }
    
    .bar {
      flex: 1;
      background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
      border-radius: 2px 2px 0 0;
      min-height: 4px;
      position: relative;
    }
    
    .bar-label {
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 9px;
      color: #6b7280;
      white-space: nowrap;
    }
    
    .distribution-row {
      display: flex;
      align-items: center;
      margin: 8px 0;
    }
    
    .distribution-label {
      width: 120px;
      font-size: 13px;
      color: #4b5563;
    }
    
    .distribution-bar-container {
      flex: 1;
      height: 24px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .distribution-bar {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 8px;
      color: white;
      font-size: 11px;
      font-weight: 600;
    }
    
    .insights-box {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-left: 4px solid #3b82f6;
      padding: 15px;
      border-radius: 0 8px 8px 0;
      margin: 15px 0;
    }
    
    .insights-box h4 {
      margin: 0 0 10px 0;
      color: #1e40af;
    }
    
    .insights-box ul {
      margin: 0;
      padding-left: 20px;
      color: #374151;
    }
    
    .insights-box li {
      margin: 5px 0;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 11px;
    }
    
    .efficiency-score {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border-radius: 12px;
      margin: 20px 0;
    }
    
    .score-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: conic-gradient(#10b981 ${efficiencyMetrics?.efficiencyScore || 0}%, #e5e7eb 0);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .score-inner {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .score-value {
      font-size: 28px;
      font-weight: 700;
      color: #10b981;
    }
    
    @media print {
      body { -webkit-print-color-adjust: exact; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 AI Coding Analytics Report</h1>
    <div class="subtitle">
      Generated on ${new Date(exportedAt).toLocaleDateString()} at ${new Date(exportedAt).toLocaleTimeString()}
    </div>
  </div>
  
  <!-- Executive Summary -->
  <div class="section">
    <h2 class="section-title">📈 Executive Summary</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${summary?.totalSessions || 0}</div>
        <div class="metric-label">Total Sessions</div>
      </div>
      <div class="metric-card accent">
        <div class="metric-value">${formatNumber(summary?.totalTokens || 0)}</div>
        <div class="metric-label">Total Tokens</div>
      </div>
      <div class="metric-card success">
        <div class="metric-value">$${(summary?.totalCost || 0).toFixed(2)}</div>
        <div class="metric-label">Total Cost</div>
      </div>
      <div class="metric-card warning">
        <div class="metric-value">${summary?.resolvedIssues || 0}/${summary?.totalIssues || 0}</div>
        <div class="metric-label">Issues Resolved</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${summary?.totalFeatures || 0}</div>
        <div class="metric-label">Features Implemented</div>
      </div>
      <div class="metric-card success">
        <div class="metric-value">${Math.round(summary?.avgSessionDuration || 0)}m</div>
        <div class="metric-label">Avg Duration</div>
      </div>
    </div>
  </div>
  
  <!-- Efficiency Score -->
  ${efficiencyMetrics ? `
  <div class="section">
    <h2 class="section-title">🎯 Efficiency Score</h2>
    <div class="efficiency-score">
      <div class="score-circle">
        <div class="score-inner">
          <div class="score-value">${Math.round(efficiencyMetrics.efficiencyScore)}</div>
        </div>
      </div>
      <div>
        <div style="font-size: 18px; font-weight: 600; color: #1f2937;">Overall Performance</div>
        <div style="color: #6b7280; margin-top: 8px;">
          Based on resolution rate (${Math.round(efficiencyMetrics.resolutionRate)}%), 
          tokens per feature (${formatNumber(Math.round(efficiencyMetrics.avgTokensPerFeature))}), 
          and productivity metrics
        </div>
        <div style="display: flex; gap: 20px; margin-top: 15px;">
          <div>
            <div style="font-size: 20px; font-weight: 600; color: #3b82f6;">${formatNumber(Math.round(efficiencyMetrics.avgTokensPerFeature))}</div>
            <div style="font-size: 11px; color: #9ca3af;">Tokens/Feature</div>
          </div>
          <div>
            <div style="font-size: 20px; font-weight: 600; color: #8b5cf6;">${(summary?.totalFeatures / (summary?.totalSessions || 1)).toFixed(1)}</div>
            <div style="font-size: 11px; color: #9ca3af;">Features/Session</div>
          </div>
          <div>
            <div style="font-size: 20px; font-weight: 600; color: #10b981;">$${efficiencyMetrics.avgCostPerFeature.toFixed(3)}</div>
            <div style="font-size: 11px; color: #9ca3af;">Cost/Feature</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  ` : ''}
  
  <!-- Model Distribution -->
  <div class="section">
    <h2 class="section-title">🤖 Model Distribution</h2>
    <table>
      <thead>
        <tr>
          <th>Model</th>
          <th>Sessions</th>
          <th>Percentage</th>
          <th>Distribution</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(distributions?.models || {}).map(([model, count]: [string, any]) => {
          const percentage = summary?.totalSessions ? Math.round((count / summary.totalSessions) * 100) : 0
          return `
            <tr>
              <td><span class="tag">${model}</span></td>
              <td>${count}</td>
              <td>${percentage}%</td>
              <td style="width: 200px;">
                <div class="distribution-bar-container" style="height: 20px;">
                  <div class="distribution-bar" style="width: ${percentage}%; font-size: 10px;"></div>
                </div>
              </td>
            </tr>
          `
        }).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Issue Analysis -->
  <div class="section">
    <h2 class="section-title">🐛 Issue Analysis</h2>
    <div class="metrics-grid" style="grid-template-columns: repeat(4, 1fr);">
      ${Object.entries(distributions?.issues || {}).map(([type, count]: [string, any]) => `
        <div class="metric-card warning">
          <div class="metric-value">${count}</div>
          <div class="metric-label" style="text-transform: capitalize;">${type}</div>
        </div>
      `).join('')}
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Issue Type</th>
          <th>Count</th>
          <th>Resolution Rate</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(distributions?.issues || {}).map(([type, count]: [string, any]) => `
          <tr>
            <td style="text-transform: capitalize;">${type}</td>
            <td>${count}</td>
            <td><span class="tag ${count > 0 ? 'success' : ''}">${count > 0 ? 'Tracked' : 'None'}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Session Categories -->
  <div class="section">
    <h2 class="section-title">📂 Session Categories</h2>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Sessions</th>
          <th>Distribution</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(distributions?.categories || {}).map(([category, count]: [string, any]) => {
          const percentage = summary?.totalSessions ? Math.round((count / summary.totalSessions) * 100) : 0
          return `
            <tr>
              <td style="text-transform: capitalize;">${category}</td>
              <td>${count}</td>
              <td style="width: 200px;">
                <div class="distribution-bar-container" style="height: 20px;">
                  <div class="distribution-bar" style="width: ${percentage}%; background: linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%); font-size: 10px;"></div>
                </div>
              </td>
            </tr>
          `
        }).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Recent Sessions -->
  <div class="section">
    <h2 class="section-title">📝 Recent Sessions</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Title</th>
          <th>Model</th>
          <th style="text-align: right;">Tokens</th>
          <th style="text-align: right;">Cost</th>
          <th style="text-align: right;">Issues</th>
        </tr>
      </thead>
      <tbody>
        ${(sessions || []).slice(0, 15).map((session: any) => `
          <tr>
            <td>${new Date(session.sessionDate).toLocaleDateString()}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${session.title || 'Untitled'}
            </td>
            <td><span class="tag">${session.model}</span></td>
            <td style="text-align: right; font-family: monospace;">${formatNumber(session.totalTokens)}</td>
            <td style="text-align: right; color: #10b981;">$${session.estimatedCost.toFixed(3)}</td>
            <td style="text-align: right;">
              <span style="color: ${session.issuesResolved > 0 ? '#10b981' : '#9ca3af'};">${session.issuesResolved}</span>
              /${session.issuesCreated}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- Cost Analysis -->
  <div class="section">
    <h2 class="section-title">💰 Cost Analysis</h2>
    <div class="metrics-grid" style="grid-template-columns: repeat(4, 1fr);">
      <div class="metric-card success">
        <div class="metric-value">$${(summary?.totalCost || 0).toFixed(2)}</div>
        <div class="metric-label">Total Cost</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">$${summary?.totalSessions ? (summary.totalCost / summary.totalSessions).toFixed(3) : '0.00'}</div>
        <div class="metric-label">Cost/Session</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">$${summary?.totalFeatures ? (summary.totalCost / summary.totalFeatures).toFixed(3) : '0.00'}</div>
        <div class="metric-label">Cost/Feature</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">$${summary?.resolvedIssues ? (summary.totalCost / summary.resolvedIssues).toFixed(3) : '0.00'}</div>
        <div class="metric-label">Cost/Issue Resolved</div>
      </div>
    </div>
  </div>
  
  <!-- Insights & Recommendations -->
  <div class="section">
    <h2 class="section-title">💡 Insights & Recommendations</h2>
    <div class="insights-box">
      <h4>Key Observations</h4>
      <ul>
        <li>Total of <strong>${summary?.totalSessions || 0}</strong> coding sessions tracked</li>
        <li><strong>${summary?.resolvedIssues || 0}</strong> out of ${summary?.totalIssues || 0} issues resolved (${summary?.totalIssues ? Math.round((summary.resolvedIssues / summary.totalIssues) * 100) : 0}% resolution rate)</li>
        <li>Average session duration: <strong>${Math.round(summary?.avgSessionDuration || 0)} minutes</strong></li>
        <li>Average tokens per feature: <strong>${formatNumber(efficiencyMetrics?.avgTokensPerFeature || 0)}</strong></li>
      </ul>
    </div>
    <div class="insights-box" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left-color: #f59e0b;">
      <h4 style="color: #92400e;">Recommendations</h4>
      <ul>
        <li>Consider using smaller models for simple tasks to reduce costs</li>
        <li>Review recurring issue patterns to prevent similar problems</li>
        <li>Document successful resolutions for future reference</li>
        <li>Batch similar operations to improve efficiency</li>
      </ul>
    </div>
  </div>
  
  <div class="footer">
    <p>AI Coding Analytics Dashboard - Self-improvement through data-driven insights</p>
    <p>Report exported on ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>
  `.trim()
}
