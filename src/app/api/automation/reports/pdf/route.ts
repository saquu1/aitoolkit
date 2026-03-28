// =============================================================================
// PDF EXPORT API FOR REPORTS
// =============================================================================
// Generates professional PDF reports for download and email attachments
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// POST - Generate PDF from report data
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { report, options } = body;

    if (!report) {
      return NextResponse.json(
        { error: 'No report data provided' },
        { status: 400 }
      );
    }

    // Generate PDF content
    const pdfContent = await generatePdf(report, options);

    // Return as downloadable file
    return new NextResponse(pdfContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="weekly-report-${new Date(report.weekStart).toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfContent.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET - Download PDF directly
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    // Fetch report data
    const reportResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/automation/reports${projectId ? `?projectId=${projectId}` : ''}`);
    const reportData = await reportResponse.json();

    if (!reportData.success) {
      return NextResponse.json(
        { error: 'Failed to fetch report data' },
        { status: 500 }
      );
    }

    // Generate PDF
    const pdfContent = await generatePdf(reportData.report);

    return new NextResponse(pdfContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="weekly-report-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PDF GENERATION
// =============================================================================

async function generatePdf(report: any, options?: any): Promise<Buffer> {
  // Generate a minimal PDF structure
  // In production, integrate with a proper PDF generation service like:
  // - @react-pdf/renderer
  // - puppeteer
  // - PDFKit
  
  const pdf = generateMinimalPdf(report);
  
  return pdf;
}

// =============================================================================
// MINIMAL PDF GENERATION
// =============================================================================

function generateMinimalPdf(report: any): Buffer {
  // Generate a minimal valid PDF
  const lines: string[] = [];
  
  // PDF Header
  lines.push('%PDF-1.4');
  lines.push('%âãÏÓ');
  
  // Object 1: Catalog
  lines.push('1 0 obj');
  lines.push('<< /Type /Catalog /Pages 2 0 R >>');
  lines.push('endobj');
  
  // Object 2: Pages
  lines.push('2 0 obj');
  lines.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  lines.push('endobj');
  
  // Content stream
  const contentStream = generatePdfContentStream(report);
  
  // Object 4: Content Stream
  lines.push('4 0 obj');
  lines.push(`<< /Length ${contentStream.length} >>`);
  lines.push('stream');
  lines.push(contentStream);
  lines.push('endstream');
  lines.push('endobj');
  
  // Object 3: Page
  lines.push('3 0 obj');
  lines.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  lines.push('endobj');
  
  // Object 5: Font
  lines.push('5 0 obj');
  lines.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  lines.push('endobj');
  
  // Calculate byte positions for xref
  const positions: number[] = [];
  let currentPos = 0;
  
  const pdfContent = lines.join('\n');
  const pdfLines = pdfContent.split('\n');
  
  // Track positions (simplified)
  const xrefStart = pdfContent.length + 1;
  
  // Cross-reference table
  const xref: string[] = [];
  xref.push('xref');
  xref.push('0 6');
  xref.push('0000000000 65535 f ');
  xref.push('0000000009 00000 n ');
  xref.push('0000000058 00000 n ');
  xref.push('0000000115 00000 n ');
  xref.push('0000000266 00000 n ');
  xref.push('0000000386 00000 n ');
  
  // Trailer
  xref.push('trailer');
  xref.push('<< /Size 6 /Root 1 0 R >>');
  xref.push('startxref');
  xref.push(String(xrefStart));
  xref.push('%%EOF');
  
  const fullPdf = pdfContent + '\n' + xref.join('\n');
  
  return Buffer.from(fullPdf, 'binary');
}

function generatePdfContentStream(report: any): string {
  const stream: string[] = [];
  
  // Title
  stream.push('BT');
  stream.push('/F1 24 Tf');
  stream.push('50 750 Td');
  stream.push('(Weekly AI Performance Report) Tj');
  
  // Date range
  stream.push('/F1 11 Tf');
  stream.push('0 -20 Td');
  const dateRange = `${formatDate(report.weekStart)} - ${formatDate(report.weekEnd)}`;
  stream.push(`(${escapePdf(dateRange)}) Tj`);
  
  // Headline
  stream.push('0 -30 Td');
  stream.push('/F1 12 Tf');
  if (report.headline) {
    stream.push(`(${escapePdf(report.headline.substring(0, 80))}) Tj`);
  }
  
  // Metrics section
  stream.push('0 -40 Td');
  stream.push('/F1 14 Tf');
  stream.push('(Key Metrics) Tj');
  
  stream.push('0 -10 Td');
  stream.push('/F1 10 Tf');
  
  let yOffset = -25;
  if (report.metrics) {
    report.metrics.slice(0, 6).forEach((metric: any) => {
      stream.push(`0 ${yOffset} Td`);
      const metricText = `${metric.name}: ${metric.thisWeek} (${metric.change > 0 ? '+' : ''}${metric.change}%)`;
      stream.push(`(${escapePdf(metricText)}) Tj`);
      yOffset = -18;
    });
  }
  
  // Top Wins section
  if (report.insights && report.insights.length > 0) {
    stream.push(`0 ${yOffset - 20} Td`);
    stream.push('/F1 14 Tf');
    stream.push('(Top Wins) Tj');
    
    stream.push('/F1 10 Tf');
    yOffset = -20;
    report.insights.slice(0, 3).forEach((insight: string) => {
      stream.push(`0 ${yOffset} Td`);
      stream.push(`(+ ${escapePdf(insight.substring(0, 60))}) Tj`);
      yOffset = -15;
    });
  }
  
  // Focus Areas section
  if (report.focusAreas && report.focusAreas.length > 0) {
    stream.push(`0 ${yOffset - 20} Td`);
    stream.push('/F1 14 Tf');
    stream.push('(Focus Areas) Tj');
    
    stream.push('/F1 10 Tf');
    yOffset = -20;
    report.focusAreas.slice(0, 3).forEach((area: string) => {
      stream.push(`0 ${yOffset} Td`);
      stream.push(`(! ${escapePdf(area.substring(0, 60))}) Tj`);
      yOffset = -15;
    });
  }
  
  // Footer
  stream.push(`0 ${yOffset - 30} Td`);
  stream.push('/F1 8 Tf');
  stream.push('(Generated by AI Analytics Dashboard) Tj');
  
  stream.push('ET');
  
  return stream.join('\n');
}

function escapePdf(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
