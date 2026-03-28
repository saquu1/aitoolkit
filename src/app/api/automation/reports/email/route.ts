// =============================================================================
// EMAIL DELIVERY API FOR REPORTS
// =============================================================================
// Sends reports via email with professional formatting
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// TYPES
// =============================================================================

interface EmailDeliveryRequest {
  recipients: string[];
  report: any;
  subject?: string;
  includeAttachment?: boolean;
}

interface EmailResult {
  recipient: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

// =============================================================================
// POST - Send report via email
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: EmailDeliveryRequest = await request.json();
    const { recipients, report, subject, includeAttachment } = body;

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients specified' },
        { status: 400 }
      );
    }

    if (!report) {
      return NextResponse.json(
        { error: 'No report data provided' },
        { status: 400 }
      );
    }

    // Generate email content
    const emailContent = generateEmailContent(report);
    const emailSubject = subject || generateSubject(report);

    // Send emails
    const results: EmailResult[] = [];
    
    for (const recipient of recipients) {
      try {
        const result = await sendEmail({
          to: recipient,
          subject: emailSubject,
          html: emailContent,
          attachments: includeAttachment ? [await generatePdfAttachment(report)] : undefined,
        });

        results.push({
          recipient,
          success: true,
          messageId: result.messageId,
        });
      } catch (error: any) {
        results.push({
          recipient,
          success: false,
          error: error.message || 'Failed to send email',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      message: `Sent to ${successCount}/${recipients.length} recipients`,
      results,
      deliveredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Email delivery error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// EMAIL CONTENT GENERATION
// =============================================================================

function generateSubject(report: any): string {
  const weekStart = new Date(report.weekStart).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `Weekly AI Performance Report - ${weekStart}`;
}

function generateEmailContent(report: any): string {
  const weekStart = new Date(report.weekStart).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const weekEnd = new Date(report.weekEnd).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly AI Performance Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1f2937;
      margin: 0;
      font-size: 24px;
    }
    .header p {
      color: #6b7280;
      margin: 8px 0 0;
    }
    .headline {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: center;
    }
    .headline h2 {
      margin: 0;
      font-size: 18px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .metric-card {
      background: #f9fafb;
      border-radius: 8px;
      padding: 15px;
      border-left: 4px solid #3b82f6;
    }
    .metric-card.negative {
      border-left-color: #ef4444;
    }
    .metric-card.positive {
      border-left-color: #22c55e;
    }
    .metric-name {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin: 5px 0;
    }
    .metric-change {
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .metric-change.positive { color: #22c55e; }
    .metric-change.negative { color: #ef4444; }
    .section {
      margin-bottom: 25px;
    }
    .section h3 {
      color: #1f2937;
      font-size: 16px;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    .insights-list, .focus-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .insights-list li, .focus-list li {
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .insights-list li:last-child, .focus-list li:last-child {
      border-bottom: none;
    }
    .icon-positive { color: #22c55e; }
    .icon-warning { color: #f59e0b; }
    .issue-card {
      background: #fef3c7;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .issue-title {
      font-weight: 600;
      color: #92400e;
    }
    .issue-severity {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      text-transform: uppercase;
      margin-left: 8px;
    }
    .severity-critical { background: #fecaca; color: #991b1b; }
    .severity-high { background: #fed7aa; color: #9a3412; }
    .severity-medium { background: #fef3c7; color: #92400e; }
    .pattern-card {
      background: #f3e8ff;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .pattern-name {
      font-weight: 600;
      color: #6b21a8;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      margin-top: 30px;
    }
    .footer p {
      color: #6b7280;
      font-size: 12px;
      margin: 5px 0;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
    .cta-button {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly AI Performance Report</h1>
      <p>${weekStart} - ${weekEnd}</p>
    </div>

    <div class="headline">
      <h2>${report.headline || 'Your weekly performance summary'}</h2>
    </div>

    <div class="metrics-grid">
      ${report.metrics?.map((metric: any) => `
        <div class="metric-card ${getMetricClass(metric)}">
          <div class="metric-name">${metric.name}</div>
          <div class="metric-value">${metric.thisWeek}</div>
          <div class="metric-change ${getChangeClass(metric)}">
            ${getChangeIcon(metric)} ${metric.change > 0 ? '+' : ''}${metric.change}% vs last week
          </div>
        </div>
      `).join('') || ''}
    </div>

    ${report.insights?.length > 0 ? `
    <div class="section">
      <h3>Top Wins</h3>
      <ul class="insights-list">
        ${report.insights.map((insight: string) => `
          <li>
            <span class="icon-positive">✓</span>
            <span>${insight}</span>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    ${report.focusAreas?.length > 0 ? `
    <div class="section">
      <h3>Focus Areas</h3>
      <ul class="focus-list">
        ${report.focusAreas.map((area: string) => `
          <li>
            <span class="icon-warning">⚠️</span>
            <span>${area}</span>
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    ${report.topIssues?.length > 0 ? `
    <div class="section">
      <h3>Top Issues Resolved</h3>
      ${report.topIssues.slice(0, 3).map((issue: any) => `
        <div class="issue-card">
          <span class="issue-title">${issue.title}</span>
          <span class="issue-severity severity-${issue.severity}">${issue.severity}</span>
          ${issue.resolution ? `<p style="margin: 8px 0 0; font-size: 13px; color: #666;">${issue.resolution}</p>` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${report.topPatterns?.length > 0 ? `
    <div class="section">
      <h3>Active Patterns</h3>
      ${report.topPatterns.slice(0, 3).map((pattern: any) => `
        <div class="pattern-card">
          <span class="pattern-name">${pattern.patternName}</span>
          <span style="float: right; font-size: 12px; color: #666;">${pattern.occurrenceCount} occurrences</span>
          ${pattern.totalCostWasted ? `<p style="margin: 5px 0 0; font-size: 12px; color: #666;">$${pattern.totalCostWasted.toFixed(2)} wasted</p>` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="footer">
      <p>Generated by AI Analytics Dashboard</p>
      <p>Report generated at ${new Date(report.generatedAt || new Date()).toLocaleString()}</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/automation" class="cta-button">
        View Full Dashboard
      </a>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getMetricClass(metric: any): string {
  const isInverse = ['Repeat Issues', 'Total Cost'].includes(metric.name);
  if (isInverse) {
    return metric.change < 0 ? 'positive' : metric.change > 0 ? 'negative' : '';
  }
  return metric.change > 0 ? 'positive' : metric.change < 0 ? 'negative' : '';
}

function getChangeClass(metric: any): string {
  const isInverse = ['Repeat Issues', 'Total Cost'].includes(metric.name);
  if (isInverse) {
    return metric.change < 0 ? 'positive' : metric.change > 0 ? 'negative' : '';
  }
  return metric.change > 0 ? 'positive' : metric.change < 0 ? 'negative' : '';
}

function getChangeIcon(metric: any): string {
  const isInverse = ['Repeat Issues', 'Total Cost'].includes(metric.name);
  const isPositive = isInverse ? metric.change < 0 : metric.change > 0;
  return isPositive ? '↑' : metric.change < 0 ? '↓' : '→';
}

// =============================================================================
// EMAIL SENDING (Using Resend, SendGrid, or similar)
// =============================================================================

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
}): Promise<{ messageId: string }> {
  // Check for email service configuration
  const emailService = process.env.EMAIL_SERVICE || 'resend';
  
  switch (emailService) {
    case 'resend':
      return sendViaResend(options);
    case 'sendgrid':
      return sendViaSendGrid(options);
    case 'smtp':
      return sendViaSmtp(options);
    default:
      // Simulate sending for development
      console.log(`[DEV] Would send email to: ${options.to}`);
      console.log(`[DEV] Subject: ${options.subject}`);
      return { messageId: `dev-${Date.now()}` };
  }
}

async function sendViaResend(options: any): Promise<{ messageId: string }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'reports@example.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend API error: ${response.status}`);
  }

  const data = await response.json();
  return { messageId: data.id };
}

async function sendViaSendGrid(options: any): Promise<{ messageId: string }> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: options.to }] }],
      from: { email: process.env.EMAIL_FROM || 'reports@example.com' },
      subject: options.subject,
      content: [{ type: 'text/html', value: options.html }],
      attachments: options.attachments,
    }),
  });

  if (!response.ok) {
    throw new Error(`SendGrid API error: ${response.status}`);
  }

  return { messageId: response.headers.get('x-message-id') || `sg-${Date.now()}` };
}

async function sendViaSmtp(options: any): Promise<{ messageId: string }> {
  // SMTP implementation would use nodemailer
  console.log('[SMTP] Sending email:', options.to);
  return { messageId: `smtp-${Date.now()}` };
}

// =============================================================================
// PDF ATTACHMENT GENERATION
// =============================================================================

async function generatePdfAttachment(report: any): Promise<{
  filename: string;
  content: string;
  type: string;
}> {
  // Call the PDF generation API
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/automation/reports/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report }),
  });

  const pdfBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(pdfBuffer).toString('base64');

  return {
    filename: `weekly-report-${new Date(report.weekStart).toISOString().split('T')[0]}.pdf`,
    content: base64,
    type: 'application/pdf',
  };
}
