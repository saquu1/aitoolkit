// =============================================================================
// Phase 3 Agents API Route
// =============================================================================
// Handles: Workflow Analysis, Security/PII Detection, Report Generation
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { workflowBuilder, WorkflowDefinition } from '@/lib/parsers/workflow-builder';
import { piiPhiDetector, PIIDetectionResult } from '@/lib/pii-phi-detector';
import { 
  ReportGenerationAgent, 
  ReportType, 
  IntelligenceReport,
  IntelligenceDataInput 
} from '@/lib/agents/report-agent';
import { db } from '@/lib/db';
import { parseSqlServer } from '@/lib/sql-parser';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'analyze-workflows':
        return await analyzeWorkflows(body);

      case 'detect-pii-phi':
        return await detectPIIPHI(body);

      case 'generate-report':
        return await generateReport(body);

      case 'full-analysis':
        return await fullAnalysis(body);

      case 'compliance-check':
        return await complianceCheck(body);

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Phase 3 Agent API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'get-workflows':
        return await getWorkflows(searchParams);

      case 'get-pii-summary':
        return await getPIISummary(searchParams);

      case 'get-compliance-report':
        return await getComplianceReport(searchParams);

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

interface SPInput {
  name: string;
  content: string;
}

async function analyzeWorkflows(body: { spFiles?: SPInput[]; sqlContent?: string; projectId?: string }) {
  const { spFiles, sqlContent, projectId } = body;

  // Parse SQL if provided directly
  let procedures: Array<{
    name: string;
    body: string;
    parameters: Array<{ name: string; type: string }>;
  }> = [];

  if (sqlContent) {
    const parseResult = parseSqlServer(sqlContent);
    procedures = (parseResult.procedures || []).map(sp => ({
      name: sp.name,
      body: sp.body || '',
      parameters: (sp.parameters || []).map(p => ({
        name: p.name,
        type: p.dataType || 'unknown',
      })),
    }));
  }

  // Parse individual SP files if provided
  if (spFiles && spFiles.length > 0) {
    for (const file of spFiles) {
      const parseResult = parseSqlServer(file.content);
      procedures.push(...(parseResult.procedures || []).map(sp => ({
        name: sp.name,
        body: sp.body || '',
        parameters: (sp.parameters || []).map(p => ({
          name: p.name,
          type: p.dataType || 'unknown',
        })),
      })));
    }
  }

  // Build SP results for workflow analysis
  const spResults = procedures.map(sp => ({
    procedureName: sp.name,
    actionType: detectActionType(sp.name, sp.body),
    riskLevel: assessRiskLevel(sp.body),
    tablesReferenced: extractTableReferences(sp.body),
    complexity: calculateComplexity(sp.body),
    moduleIdentification: {
      moduleName: extractModuleName(sp.name),
    },
  }));

  // Build workflows
  const workflows = workflowBuilder.buildWorkflows(spResults as any);

  // Generate Mermaid diagrams for each workflow
  const workflowDiagrams = workflows.map(wf => ({
    workflow: wf,
    mermaid: workflowBuilder.generateMermaidDiagram(wf),
    documentation: workflowBuilder.generateDocumentation(wf),
  }));

  // Statistics
  const stats = {
    totalSPs: procedures.length,
    workflowsDetected: workflows.length,
    byModule: groupByModule(workflows),
    byComplexity: groupByComplexity(workflows),
  };

  return NextResponse.json({
    success: true,
    workflows: workflowDiagrams,
    statistics: stats,
  });
}

/**
 * Detect SP action type from name and body
 */
function detectActionType(name: string, body: string): string {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('_ddl_') || nameLower.includes('dropdown')) return 'dropdown';
  if (nameLower.includes('_get') || nameLower.includes('_read')) return 'read';
  if (nameLower.includes('_add') || nameLower.includes('_create') || nameLower.includes('_insert')) return 'create';
  if (nameLower.includes('_update') || nameLower.includes('_modify')) return 'update';
  if (nameLower.includes('_delete') || nameLower.includes('_remove')) return 'delete';
  if (nameLower.includes('_search') || nameLower.includes('_find')) return 'search';
  if (nameLower.includes('_validate') || nameLower.includes('_check')) return 'validate';
  if (nameLower.includes('_report') || nameLower.includes('_export')) return 'report';
  
  // Check body for clues
  if (body.toLowerCase().includes('insert into')) return 'create';
  if (body.toLowerCase().includes('update ')) return 'update';
  if (body.toLowerCase().includes('delete from')) return 'delete';
  if (body.toLowerCase().includes('select ')) return 'read';
  
  return 'unknown';
}

/**
 * Assess risk level from SP body
 */
function assessRiskLevel(body: string): string {
  const lowerBody = body.toLowerCase();
  
  let riskScore = 0;
  
  // Critical operations
  if (lowerBody.includes('delete from') || lowerBody.includes('truncate')) riskScore += 30;
  if (lowerBody.includes('drop table')) riskScore += 40;
  if (lowerBody.includes('exec(') || lowerBody.includes('sp_executesql')) riskScore += 20;
  
  // Sensitive data
  if (lowerBody.includes('password') || lowerBody.includes('secret')) riskScore += 25;
  if (lowerBody.includes('salary') || lowerBody.includes('financial')) riskScore += 15;
  
  // Transaction handling
  if (!lowerBody.includes('begin transaction') && 
      (lowerBody.includes('insert') || lowerBody.includes('update') || lowerBody.includes('delete'))) {
    riskScore += 10;
  }
  
  if (riskScore >= 40) return 'critical';
  if (riskScore >= 25) return 'high';
  if (riskScore >= 10) return 'medium';
  return 'low';
}

/**
 * Extract table references from SP body
 */
function extractTableReferences(body: string): Array<{ tableName: string }> {
  const tables: Array<{ tableName: string }> = [];
  
  // Match FROM/JOIN/INTO patterns
  const patterns = [
    /from\s+(\w+)/gi,
    /join\s+(\w+)/gi,
    /into\s+(\w+)/gi,
    /update\s+(\w+)/gi,
  ];
  
  const seen = new Set<string>();
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      const tableName = match[1];
      if (!seen.has(tableName.toLowerCase()) && 
          !['select', 'where', 'and', 'or', 'not', 'null', 'true', 'false'].includes(tableName.toLowerCase())) {
        seen.add(tableName.toLowerCase());
        tables.push({ tableName });
      }
    }
  }
  
  return tables;
}

/**
 * Calculate SP complexity
 */
function calculateComplexity(body: string): number {
  let complexity = 0;
  
  complexity += (body.match(/\bif\b/gi) || []).length * 2;
  complexity += (body.match(/\bwhile\b/gi) || []).length * 3;
  complexity += (body.match(/\bbegin\b/gi) || []).length;
  complexity += (body.match(/\btry\b/gi) || []).length * 3;
  complexity += (body.match(/\bcatch\b/gi) || []).length * 3;
  complexity += (body.match(/\bexec\b/gi) || []).length * 2;
  complexity += Math.floor(body.length / 500);
  
  return complexity;
}

/**
 * Extract module name from SP name
 */
function extractModuleName(spName: string): string {
  // SP_PatientRegistration_Add -> PatientRegistration
  const match = spName.match(/^SP_(\w+?)_/);
  return match ? match[1] : 'Unknown';
}

/**
 * Group workflows by module
 */
function groupByModule(workflows: WorkflowDefinition[]): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const wf of workflows) {
    groups[wf.module] = (groups[wf.module] || 0) + 1;
  }
  return groups;
}

/**
 * Group workflows by complexity
 */
function groupByComplexity(workflows: WorkflowDefinition[]): Record<string, number> {
  const groups: Record<string, number> = { simple: 0, moderate: 0, complex: 0 };
  for (const wf of workflows) {
    groups[wf.complexity] = (groups[wf.complexity] || 0) + 1;
  }
  return groups;
}

// ═══════════════════════════════════════════════════════════════════════════
// PII/PHI DETECTION
// ═══════════════════════════════════════════════════════════════════════════

interface TableInput {
  tableName: string;
  columns: Array<{ name: string; dataType: string }>;
}

async function detectPIIPHI(body: { tables: TableInput[]; projectId?: string }) {
  const { tables, projectId } = body;

  const allResults = new Map<string, PIIDetectionResult[]>();
  let totalPHI = 0;
  let totalPII = 0;
  let totalSecret = 0;
  let totalConfidential = 0;

  for (const table of tables) {
    const results = piiPhiDetector.analyzeTable(
      table.columns.map(c => ({ name: c.name, dataType: c.dataType, nullable: true })),
      table.tableName
    );
    
    allResults.set(table.tableName, results);
    
    for (const result of results) {
      switch (result.sensitivity) {
        case 'phi': totalPHI++; break;
        case 'pii': totalPII++; break;
        case 'secret': totalSecret++; break;
        case 'confidential': totalConfidential++; break;
      }
    }
  }

  // Generate compliance summaries
  const complianceSummary = {
    totalFields: Array.from(allResults.values()).flat().length,
    phiFields: totalPHI,
    piiFields: totalPII,
    secretFields: totalSecret,
    confidentialFields: totalConfidential,
    riskLevel: determineOverallRisk(totalPHI, totalPII, totalSecret),
    frameworks: getApplicableFrameworks(totalPHI, totalPII),
  };

  // Generate HIPAA checklist if PHI present
  const hipaaChecklist = totalPHI > 0 
    ? piiPhiDetector.generateHIPAAChecklist(Array.from(allResults.values()).flat())
    : null;

  return NextResponse.json({
    success: true,
    results: Object.fromEntries(allResults),
    summary: complianceSummary,
    hipaaChecklist,
    recommendations: generatePIIRecommendations(complianceSummary),
  });
}

/**
 * Determine overall risk level
 */
function determineOverallRisk(phi: number, pii: number, secret: number): string {
  if (secret > 0 || phi > 20) return 'critical';
  if (phi > 5 || pii > 30) return 'high';
  if (phi > 0 || pii > 10) return 'medium';
  return 'low';
}

/**
 * Get applicable compliance frameworks
 */
function getApplicableFrameworks(phi: number, pii: number): string[] {
  const frameworks: string[] = [];
  if (phi > 0) frameworks.push('HIPAA');
  if (pii > 0) frameworks.push('GDPR');
  return frameworks;
}

/**
 * Generate PII recommendations
 */
function generatePIIRecommendations(summary: { 
  phiFields: number; 
  piiFields: number; 
  secretFields: number;
  riskLevel: string;
}): string[] {
  const recommendations: string[] = [];
  
  if (summary.secretFields > 0) {
    recommendations.push('🔴 CRITICAL: Implement hashing for all secret fields (passwords, tokens)');
  }
  if (summary.phiFields > 0) {
    recommendations.push('🟠 HIGH: Enable encryption for PHI fields and implement audit logging');
  }
  if (summary.piiFields > 0) {
    recommendations.push('🟡 MEDIUM: Implement data masking for PII in list views');
  }
  if (summary.riskLevel === 'critical') {
    recommendations.push('🔴 Immediate security review required');
  }
  
  return recommendations;
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateReport(body: {
  reportType: ReportType;
  data?: IntelligenceDataInput;
  projectId?: string;
  projectName?: string;
  format?: 'markdown' | 'html' | 'json';
}) {
  const { reportType, data, projectId, projectName, format = 'markdown' } = body;

  // If projectId provided, fetch data from database
  let reportData: IntelligenceDataInput = data || {};

  if (projectId && !data) {
    reportData = await fetchReportData(projectId);
  }

  // Generate report
  const agent = new ReportGenerationAgent(reportData, {
    reportType,
    format,
    includeRawData: false,
    includeRecommendations: true,
    projectId,
    projectName,
  });

  const report = agent.generate();

  // Format output based on requested format
  let formattedReport: string | object = report;
  
  if (format === 'markdown') {
    formattedReport = formatReportAsMarkdown(report);
  } else if (format === 'html') {
    formattedReport = formatReportAsHTML(report);
  }

  return NextResponse.json({
    success: true,
    report: formattedReport,
    metadata: report.metadata,
    statistics: report.statistics,
  });
}

/**
 * Fetch report data from database
 */
async function fetchReportData(projectId: string): Promise<IntelligenceDataInput> {
  // Fetch from various cache tables
  const spIntelligence = await db.storedProcedureCache.findMany({
    where: { projectId },
  });

  const jsIntelligence = await db.jSIntelligenceCache.findMany({
    where: { projectId },
  });

  const fileClassifications = await db.fileClassificationCache.findMany({
    where: { projectId },
  });

  // Transform to expected format
  return {
    spResults: spIntelligence.map(sp => ({
      procedureName: sp.procedureName,
      actionType: sp.actionType,
      riskLevel: sp.riskLevel,
      tablesReferenced: JSON.parse(sp.tablesReferenced || '[]'),
      complexity: sp.complexity,
      moduleIdentification: {
        moduleName: sp.moduleName || undefined,
      },
    })),
    jsResults: jsIntelligence.map(js => ({
      fileName: js.fileName,
      ajaxCalls: JSON.parse(js.ajaxCalls || '[]'),
      eventHandlers: JSON.parse(js.eventHandlers || '[]'),
      formValidations: JSON.parse(js.formValidations || '[]'),
      jqueryPlugins: JSON.parse(js.jqueryPlugins || '[]'),
    })),
    fileClassifications: fileClassifications.map(fc => ({
      fileName: fc.fileName,
      fileType: fc.fileType,
      confidence: fc.confidence,
    })),
  };
}

/**
 * Format report as Markdown
 */
function formatReportAsMarkdown(report: IntelligenceReport): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${report.metadata.title}`);
  lines.push('');
  lines.push(`**Generated:** ${report.metadata.generatedAt.toISOString()}`);
  lines.push(`**Report ID:** ${report.metadata.reportId}`);
  lines.push('');

  // Executive Summary
  lines.push('## Executive Summary');
  lines.push(report.executiveSummary.content);
  lines.push('');

  // Sections
  for (const section of report.sections) {
    lines.push(`## ${section.title}`);
    lines.push(section.content);
    lines.push('');

    if (section.tables) {
      for (const table of section.tables) {
        lines.push(`### ${table.caption || 'Data Table'}`);
        lines.push('');
        lines.push('| ' + table.headers.join(' | ') + ' |');
        lines.push('| ' + table.headers.map(() => '---').join(' | ') + ' |');
        for (const row of table.rows) {
          lines.push('| ' + row.join(' | ') + ' |');
        }
        lines.push('');
      }
    }
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push('## Recommendations');
    lines.push('');
    for (const rec of report.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format report as HTML
 */
function formatReportAsHTML(report: IntelligenceReport): string {
  const html: string[] = [];

  html.push('<!DOCTYPE html>');
  html.push('<html>');
  html.push('<head>');
  html.push('<title>' + report.metadata.title + '</title>');
  html.push('<style>');
  html.push('body { font-family: Arial, sans-serif; margin: 40px; }');
  html.push('h1 { color: #333; }');
  html.push('h2 { color: #555; border-bottom: 1px solid #ddd; padding-bottom: 10px; }');
  html.push('table { border-collapse: collapse; width: 100%; margin: 20px 0; }');
  html.push('th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }');
  html.push('th { background-color: #f5f5f5; }');
  html.push('.risk-critical { color: #dc2626; }');
  html.push('.risk-high { color: #ea580c; }');
  html.push('.risk-medium { color: #ca8a04; }');
  html.push('.risk-low { color: #16a34a; }');
  html.push('</style>');
  html.push('</head>');
  html.push('<body>');

  html.push(`<h1>${report.metadata.title}</h1>`);
  html.push(`<p><strong>Generated:</strong> ${report.metadata.generatedAt.toISOString()}</p>`);

  html.push('<h2>Executive Summary</h2>');
  html.push(`<pre>${report.executiveSummary.content}</pre>`);

  for (const section of report.sections) {
    html.push(`<h2>${section.title}</h2>`);
    html.push(`<pre>${section.content}</pre>`);

    if (section.tables) {
      for (const table of section.tables) {
        html.push('<table>');
        html.push('<thead><tr>');
        for (const header of table.headers) {
          html.push(`<th>${header}</th>`);
        }
        html.push('</tr></thead>');
        html.push('<tbody>');
        for (const row of table.rows) {
          html.push('<tr>');
          for (const cell of row) {
            html.push(`<td>${cell}</td>`);
          }
          html.push('</tr>');
        }
        html.push('</tbody></table>');
      }
    }
  }

  if (report.recommendations.length > 0) {
    html.push('<h2>Recommendations</h2>');
    html.push('<ul>');
    for (const rec of report.recommendations) {
      html.push(`<li>${rec}</li>`);
    }
    html.push('</ul>');
  }

  html.push('</body></html>');

  return html.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// FULL ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function fullAnalysis(body: {
  sqlContent?: string;
  tables?: TableInput[];
  projectId?: string;
}) {
  const { sqlContent, tables, projectId } = body;

  const results: {
    workflows?: unknown;
    pii?: unknown;
    report?: unknown;
  } = {};

  // Parse SQL for workflows if provided
  if (sqlContent) {
    const workflowResult = await analyzeWorkflows({ sqlContent, projectId });
    const workflowData = await workflowResult.json();
    results.workflows = workflowData;
  }

  // Detect PII/PHI if tables provided
  if (tables && tables.length > 0) {
    const piiResult = await detectPIIPHI({ tables, projectId });
    const piiData = await piiResult.json();
    results.pii = piiData;
  }

  return NextResponse.json({
    success: true,
    results,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE CHECK
// ═══════════════════════════════════════════════════════════════════════════

async function complianceCheck(body: {
  tables?: TableInput[];
  projectId?: string;
  frameworks?: string[];
}) {
  const { tables, frameworks = ['HIPAA', 'GDPR'] } = body;

  const checks: Record<string, unknown> = {};

  if (tables && tables.length > 0) {
    const allResults = new Map<string, PIIDetectionResult[]>();

    for (const table of tables) {
      const results = piiPhiDetector.analyzeTable(
        table.columns.map(c => ({ name: c.name, dataType: c.dataType, nullable: true })),
        table.tableName
      );
      allResults.set(table.tableName, results);
    }

    if (frameworks.includes('HIPAA')) {
      checks.hipaa = {
        applicable: Array.from(allResults.values()).flat().some(r => r.sensitivity === 'phi'),
        checklist: piiPhiDetector.generateHIPAAChecklist(Array.from(allResults.values()).flat()),
        phiFieldCount: Array.from(allResults.values()).flat().filter(r => r.sensitivity === 'phi').length,
      };
    }

    if (frameworks.includes('GDPR')) {
      checks.gdpr = {
        applicable: Array.from(allResults.values()).flat().some(r => 
          r.sensitivity === 'pii' || r.sensitivity === 'phi'
        ),
        piiFieldCount: Array.from(allResults.values()).flat().filter(r => 
          r.sensitivity === 'pii'
        ).length,
        requiresConsent: Array.from(allResults.values()).flat().filter(r =>
          r.category === 'biometric' || r.category === 'demographic'
        ).length,
      };
    }
  }

  return NextResponse.json({
    success: true,
    checks,
    timestamp: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

async function getWorkflows(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // Fetch from database - would need a workflows table
  return NextResponse.json({
    success: true,
    workflows: [],
    message: 'Workflows would be fetched from database',
  });
}

async function getPIISummary(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // Fetch PII summary from column_intelligence_cache
  const columns = await db.columnIntelligenceCache.findMany({
    where: {
      OR: [
        { sensitivity: 'phi' },
        { sensitivity: 'pii' },
      ],
    },
    take: 100,
  });

  return NextResponse.json({
    success: true,
    summary: {
      totalSensitive: columns.length,
      phi: columns.filter(c => c.sensitivity === 'phi').length,
      pii: columns.filter(c => c.sensitivity === 'pii').length,
    },
    columns: columns.map(c => ({
      table: c.tableName,
      column: c.columnName,
      sensitivity: c.sensitivity,
      semanticType: c.semanticType,
    })),
  });
}

async function getComplianceReport(searchParams: URLSearchParams) {
  const projectId = searchParams.get('projectId');
  const framework = searchParams.get('framework') || 'HIPAA';

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // Generate compliance report
  const reportResult = await generateReport({
    reportType: framework === 'GDPR' ? 'compliance_gdpr' : 'compliance_hipaa',
    projectId,
  });

  return reportResult;
}
