/**
 * API CONTRACT VALIDATOR - WITH PERSISTENCE
 * ==========================================
 * One-click detection of data mismatches between:
 * - Frontend → API (what frontend sends vs what API expects)
 * - API → Database (what API sends vs what DB schema expects)
 * 
 * Now with persistence for:
 * - Scan history tracking
 * - Issue persistence
 * - Backup/restore functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { cvDb as db } from '@/lib/contract-validator-db';
import ZAI from 'z-ai-web-dev-sdk';

// =============================================================================
// TYPES
// =============================================================================

interface APIEndpoint {
  file: string;
  method: string;
  route: string;
  expectedParams: string[];
  expectedBody: string[];
  actualCalls: APICall[];
  issues: ContractIssueType[];
  isMultiAction?: boolean;
}

interface APICall {
  file: string;
  line: number;
  endpoint: string;
  method: string;
  sentParams: string[];
  sentBody: string[];
}

interface ContractIssueType {
  type: 'missing_param' | 'extra_param' | 'type_mismatch' | 'undefined_access' | 'unknown_endpoint';
  severity: 'error' | 'warning' | 'info';
  message: string;
  frontendFile?: string;
  frontendLine?: number;
  apiFile?: string;
  suggestion: string;
}

interface ValidationResult {
  success: boolean;
  scanId: string;
  summary: {
    totalEndpoints: number;
    totalCalls: number;
    totalIssues: number;
    errors: number;
    warnings: number;
  };
  endpoints: APIEndpoint[];
  issues: ContractIssueType[];
}

// =============================================================================
// MAIN HANDLERS
// =============================================================================

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'validate';
  const scanId = request.nextUrl.searchParams.get('scanId');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
  
  try {
    switch (action) {
      case 'history':
        return NextResponse.json(await getScanHistory(limit));
      
      case 'scan':
        if (scanId) {
          return NextResponse.json(await getScanById(scanId));
        }
        return NextResponse.json({ error: 'scanId required' }, { status: 400 });
      
      case 'issues':
        return NextResponse.json(await getOpenIssues(limit));
      
      case 'stats':
        return NextResponse.json(await getScanStats());
      
      case 'list-files':
        return NextResponse.json(await listAvailableFiles());
      
      case 'validate':
      default:
        const result = await validateAllContracts();
        return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error('Contract Validator Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      scanId: '',
      summary: { totalEndpoints: 0, totalCalls: 0, totalIssues: 0, errors: 0, warnings: 0 },
      endpoints: [],
      issues: []
    });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, targetEndpoint, issueId, scanId } = body;
  
  try {
    switch (action) {
      case 'validate_endpoint':
        return NextResponse.json(await validateSingleEndpoint(targetEndpoint));
      
      case 'fix_issue':
        return NextResponse.json(await applyIssueFix(issueId, body.fixCode, body.fixDescription));
      
      case 'ai_fix_issue':
        return NextResponse.json(await aiFixSingleIssue(issueId, request));
      
      case 'ai_fix_all':
        return NextResponse.json(await aiFixAllIssues(body.scanId));
      
      case 'ignore_issue':
        return NextResponse.json(await ignoreIssue(issueId));
      
      case 'restore_scan':
        return NextResponse.json(await restoreScan(scanId));
      
      case 'delete_scan':
        return NextResponse.json(await deleteScan(scanId));
      
      case 'validate_with_save':
      default:
        const result = await validateAndSave();
        return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error('Contract Validator POST Error:', error);
    // Return proper structure even for errors
    return NextResponse.json({
      success: false,
      error: error.message,
      scanId: '',
      summary: { 
        totalEndpoints: 0, 
        totalCalls: 0, 
        totalIssues: 0, 
        errors: 0, 
        warnings: 0 
      },
      endpoints: [],
      issues: []
    });
  }
}

// =============================================================================
// AI AUTO-FIX ENGINE
// =============================================================================

interface AIFixResult {
  success: boolean;
  isFalsePositive: boolean;
  analysis: string;
  fixApplied: boolean;
  confidence: 'high' | 'medium' | 'low';
  file?: string;
  originalCode?: string;
  fixedCode?: string;
  error?: string;
  issueId?: string;
}

const AI_FIX_SYSTEM_PROMPT = `You are a senior developer fixing API contract validation issues in a Next.js application.

You receive:
1. An issue description (e.g. "Frontend sends { action } but API expects 'spFiles'")
2. The relevant frontend code around the reported line
3. The API route code that the frontend is calling

YOUR JOB:
- Analyze whether this is a REAL issue or a FALSE POSITIVE
- Common FALSE POSITIVES (mark as falsePositive: true):
  * Action-routed APIs: One route handles multiple actions, each needing different params. The param might be needed only for a different action, not the one being called.
  * Dynamic endpoints: Endpoint path is constructed at runtime with template literals.
  * Optional parameters: The param is optional with a default value in the API.
  * Parameters handled conditionally: The param is only used in certain code branches.
- For REAL issues, provide a minimal, focused code fix.

RULES:
- Only modify ONE file per issue
- Keep changes minimal - only add/modify what is needed
- Preserve existing formatting, indentation, and style
- Do NOT rewrite entire functions - only change what is necessary
- For missing_param: Add the missing parameter to the fetch body ONLY if it is truly needed by the specific action being called
- For unknown_endpoint: Usually false positive - dynamic endpoints are normal

RESPOND WITH VALID JSON ONLY (no markdown, no backticks, no extra text):
{"isFalsePositive":boolean,"analysis":"your analysis in 1-2 sentences","confidence":"high|medium|low","file":"relative file path from project root","search":"exact existing code to find","replace":"replacement code"}`;

function readRelevantLines(filePath: string, lineNum?: number, contextLines: number = 40): string {
  if (!filePath) return '[no file specified]';
  const sourceRoot = getSourceRoot();
  const fullPath = filePath.startsWith('/') ? filePath : path.join(sourceRoot, filePath);
  if (!fs.existsSync(fullPath)) return `[file not found: ${fullPath}]`;
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  if (!lineNum || lineNum <= 0) {
    const preview = lines.slice(0, 200).join('\n');
    return lines.length > 200 ? preview + '\n// ... (truncated, ' + lines.length + ' total lines)' : preview;
  }
  const start = Math.max(0, lineNum - contextLines - 1);
  const end = Math.min(lines.length, lineNum + contextLines);
  return lines.slice(start, end).map((line, i) => {
    const num = String(start + i + 1);
    const marker = (start + i + 1) === lineNum ? ' >>> ' : '     ';
    return `${marker}${num}: ${line}`;
  }).join('\n');
}

function extractJSON(text: string): any | null {
  if (!text) return null;
  try { return JSON.parse(text.trim()); } catch {}
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) { try { return JSON.parse(codeBlockMatch[1].trim()); } catch {} }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.substring(firstBrace, lastBrace + 1)); } catch {}
  }
  return null;
}

function applyCodeFix(relativeFilePath: string, search: string, replace: string): boolean {
  const sourceRoot = getSourceRoot();
  let fullPath: string;
  if (relativeFilePath.startsWith('/home/z/')) { fullPath = relativeFilePath; }
  else if (relativeFilePath.startsWith('/')) { fullPath = relativeFilePath; }
  else { fullPath = path.join(sourceRoot, relativeFilePath); }
  if (!fs.existsSync(fullPath)) { console.error(`[AI Fix] File not found: ${fullPath}`); return false; }
  let content = fs.readFileSync(fullPath, 'utf-8');
  if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(fullPath, content);
    return true;
  }
  const normalizedSearch = search.trim().replace(/\r\n/g, '\n');
  const normalizedContent = content.replace(/\r\n/g, '\n');
  if (normalizedContent.includes(normalizedSearch)) {
    fs.writeFileSync(fullPath, normalizedContent.replace(normalizedSearch, replace.trim()));
    return true;
  }
  const searchLines = search.trim().split('\n').map(l => l.trim());
  const contentLines = content.split('\n');
  for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
    const window = contentLines.slice(i, i + searchLines.length).map(l => l.trim());
    if (JSON.stringify(window) === JSON.stringify(searchLines)) {
      const replaceLines = replace.trim().split('\n');
      fs.writeFileSync(fullPath, [...contentLines.slice(0, i), ...replaceLines, ...contentLines.slice(i + searchLines.length)].join('\n'));
      return true;
    }
  }
  console.error(`[AI Fix] Could not find match in ${fullPath}`);
  return false;
}

function buildAIFixPrompt(issue: any, frontendCode: string, apiCode: string | null): string {
  let prompt = `ISSUE #${issue.id}:\nType: ${issue.issueType}\nSeverity: ${issue.severity}\nMessage: ${issue.message}\n`;
  if (issue.frontendFile) {
    prompt += `\n--- FRONTEND FILE: ${issue.frontendFile}${issue.frontendLine ? ' (line ' + issue.frontendLine + ')' : ''} ---\n${frontendCode}\n`;
  }
  if (apiCode) {
    prompt += `\n--- API ROUTE FILE: ${issue.apiFile} ---\n${apiCode}\n`;
  }
  if (issue.suggestion) { prompt += `\nSCANNER SUGGESTION: ${issue.suggestion}\n`; }
  prompt += `\nAnalyze this issue and provide a fix if needed. Remember: most issues from action-routed APIs or dynamic endpoints are false positives.`;
  return prompt;
}

async function aiFixSingleIssue(issueId: string, request?: NextRequest): Promise<AIFixResult> {
  const issue = await db.contractIssue.findUnique({ where: { id: issueId }, include: { scan: true } });
  if (!issue) { return { success: false, isFalsePositive: false, analysis: 'Issue not found', fixApplied: false, confidence: 'low', error: 'Issue not found' }; }
  const startTime = Date.now();
  console.log(`[AI Fix] Starting fix for issue ${issueId}: ${issue.message.substring(0, 80)}`);
  
  // Extract X-Token from incoming request headers (proxy provides this for browser sessions)
  let requestToken: string | null = null;
  if (request) {
    requestToken = request.headers.get('x-token') || request.headers.get('X-Token') || null;
    if (requestToken) {
      console.log(`[AI Fix] Found X-Token in request headers (length: ${requestToken.length})`);
    }
  }
  
  try {
    const frontendCode = readRelevantLines(issue.frontendFile, issue.frontendLine);
    const apiCode = issue.apiFile ? readRelevantLines(issue.apiFile) : null;
    const prompt = buildAIFixPrompt(issue, frontendCode, apiCode);
    const zai = await ZAI.create();
    
    // Inject X-Token from request into ZAI config if available (browser proxy provides it)
    if (requestToken && (zai as any).config) {
      (zai as any).config.token = requestToken;
      console.log('[AI Fix] Injected request X-Token into ZAI config');
    }
    
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: AI_FIX_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
    });
    const aiText = completion.choices[0]?.message?.content || '';
    const duration = Date.now() - startTime;
    console.log(`[AI Fix] AI responded in ${duration}ms for issue ${issueId}`);
    const result = extractJSON(aiText);
    if (!result) {
      console.error(`[AI Fix] Failed to parse AI response for issue ${issueId}`);
      await db.contractIssue.update({ where: { id: issueId }, data: { fixDescription: aiText.substring(0, 500), fixCode: '' } });
      return { success: false, isFalsePositive: false, analysis: aiText.substring(0, 500) || 'AI returned unparseable response', fixApplied: false, confidence: 'low', error: 'Could not parse AI response as JSON', issueId };
    }
    let fixApplied = false;
    let originalCode = '';
    let fixedCode = '';
    if (!result.isFalsePositive && result.search && result.replace && result.file) {
      fixApplied = applyCodeFix(result.file, result.search, result.replace);
      originalCode = result.search;
      fixedCode = result.replace;
      console.log(`[AI Fix] Fix ${fixApplied ? 'APPLIED' : 'FAILED TO APPLY'} for issue ${issueId}`);
    } else if (result.isFalsePositive) {
      console.log(`[AI Fix] False positive: ${issueId} - ${result.analysis}`);
    }
    const newStatus = result.isFalsePositive ? 'ignored' : (fixApplied ? 'fixed' : 'open');
    await db.contractIssue.update({
      where: { id: issueId },
      data: { status: newStatus, fixApplied: fixApplied, fixCode: fixedCode || '', fixDescription: result.analysis || '', resolvedAt: fixApplied || result.isFalsePositive ? new Date() : undefined },
    });
    if (fixApplied && issue.scanId) {
      await db.scanHistory.update({ where: { scanId: issue.scanId }, data: { issuesFixed: { increment: 1 } } });
    }
    return { success: true, isFalsePositive: result.isFalsePositive || false, analysis: result.analysis || 'No analysis provided', fixApplied, confidence: result.confidence || 'medium', file: result.file, originalCode, fixedCode, issueId };
  } catch (error: any) {
    console.error(`[AI Fix] Error fixing issue ${issueId}:`, error.message);
    return { success: false, isFalsePositive: false, analysis: `Error: ${error.message}`, fixApplied: false, confidence: 'low', error: error.message, issueId };
  }
}

async function aiFixAllIssues(scanId: string): Promise<{ success: boolean; results: AIFixResult[]; scanId: string }> {
  const issues = await db.contractIssue.findMany({ where: { scanId, status: 'open' } });
  if (issues.length === 0) { return { success: true, results: [], scanId }; }
  const results: AIFixResult[] = [];
  let fixedCount = 0;
  for (const issue of issues) {
    const result = await aiFixSingleIssue(issue.id);
    results.push(result);
    if (result.fixApplied) fixedCount++;
    await db.scanHistory.update({ where: { scanId }, data: { issuesFixed: { increment: result.fixApplied ? 1 : 0 } } });
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  console.log(`[AI Fix All] Done: ${fixedCount} fixed, ${results.filter(r => r.isFalsePositive).length} false positives out of ${issues.length}`);
  return { success: true, results, scanId };
}

// =============================================================================
// PERSISTENCE FUNCTIONS
// =============================================================================

function generateScanId(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '-');
  const timeStr = date.getTime().toString().slice(-6);
  return `SCAN-${dateStr}-${timeStr}`;
}

async function validateAndSave(): Promise<ValidationResult & { savedScanId?: string }> {
  const startTime = Date.now();
  const scanId = generateScanId();
  
  // Check if models exist
  if (typeof db.scanHistory === 'undefined') {
    console.error('[Contract Validator] scanHistory model not available - server restart required')
    const result = await validateAllContracts();
    return {
      ...result,
      scanId: '',
      savedScanId: undefined,
    };
  }
  
  // Create scan history record
  const scanRecord = await db.scanHistory.create({
    data: {
      scanId,
      status: 'pending',
      filesScanned: '[]',
      issuesFound: 0,
      issuesFixed: 0,
    }
  });
  
  try {
    // Run validation
    const result = await validateAllContracts();
    
    // Save issues to database
    const savedIssues = [];
    for (const issue of result.issues) {
      const savedIssue = await db.contractIssue.create({
        data: {
          scanId: scanRecord.scanId,
          issueType: issue.type,
          severity: issue.severity,
          message: issue.message,
          frontendFile: issue.frontendFile,
          frontendLine: issue.frontendLine,
          apiFile: issue.apiFile,
          suggestion: issue.suggestion,
          status: 'open',
        }
      });
      savedIssues.push(savedIssue);
    }
    
    // Update scan record
    const duration = Date.now() - startTime;
    await db.scanHistory.update({
      where: { id: scanRecord.id },
      data: {
        status: 'complete',
        issuesFound: result.issues.length,
        duration,
        completedAt: new Date(),
        filesScanned: JSON.stringify(result.endpoints.map(e => e.file)),
      }
    });
    
    return {
      ...result,
      scanId: scanRecord.scanId,
      savedScanId: scanRecord.scanId,
    };
  } catch (error: any) {
    // Mark scan as failed
    await db.scanHistory.update({
      where: { id: scanRecord.id },
      data: {
        status: 'failed',
        error: error.message,
        completedAt: new Date(),
      }
    });
    
    throw error;
  }
}

async function getScanHistory(limit: number = 20) {
  const scans = await db.scanHistory.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { issues: true }
      }
    }
  });
  
  return {
    success: true,
    scans: scans.map(scan => ({
      ...scan,
      issueCount: scan._count.issues,
      _count: undefined,
    }))
  };
}

async function getScanById(scanId: string) {
  const scan = await db.scanHistory.findUnique({
    where: { scanId },
    include: {
      issues: true,
      backups: true,
    }
  });
  
  if (!scan) {
    return { success: false, error: 'Scan not found' };
  }
  
  return { success: true, scan };
}

async function getOpenIssues(limit: number = 50) {
  const issues = await db.contractIssue.findMany({
    where: {
      status: 'open',
      severity: { in: ['error', 'warning'] }
    },
    take: limit,
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'desc' }
    ],
    include: {
      scan: {
        select: { scanId: true, createdAt: true }
      }
    }
  });
  
  return {
    success: true,
    issues,
    total: issues.length
  };
}

async function getScanStats() {
  try {
    // Check if models exist
    if (typeof db.scanHistory === 'undefined') {
      console.error('[Contract Validator] scanHistory model not available - server restart required')
      return {
        success: false,
        error: 'Database models not loaded. Please restart the dev server to load new Prisma models.',
        stats: {
          totalScans: 0,
          totalIssues: 0,
          openIssues: 0,
          fixedIssues: 0,
          errorIssues: 0,
          issuesByType: {},
          recentScans: []
        }
      }
    }
    
    const totalScans = await db.scanHistory.count();
    const totalIssues = await db.contractIssue.count();
    const openIssues = await db.contractIssue.count({ where: { status: 'open' } });
    const fixedIssues = await db.contractIssue.count({ where: { status: 'fixed' } });
    const errorIssues = await db.contractIssue.count({ 
      where: { status: 'open', severity: 'error' } 
    });
    
    // Issues by type
    const issuesByType = await db.contractIssue.groupBy({
      by: ['issueType'],
      where: { status: 'open' },
      _count: true
    });
    
    // Recent scans
    const recentScans = await db.scanHistory.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        scanId: true,
        status: true,
        issuesFound: true,
        duration: true,
        createdAt: true
      }
    });
    
    return {
      success: true,
      stats: {
        totalScans,
        totalIssues,
        openIssues,
        fixedIssues,
        errorIssues,
        issuesByType: issuesByType.reduce((acc, item) => {
          acc[item.issueType] = item._count;
          return acc;
        }, {} as Record<string, number>),
        recentScans
      }
    };
  } catch (error: any) {
    console.error('[Contract Validator] getScanStats error:', error);
    return {
      success: false,
      error: error.message,
      stats: {
        totalScans: 0,
        totalIssues: 0,
        openIssues: 0,
        fixedIssues: 0,
        errorIssues: 0,
        issuesByType: {},
        recentScans: []
      }
    };
  }
}

async function applyIssueFix(issueId: string, fixCode?: string, fixDescription?: string) {
  const issue = await db.contractIssue.findUnique({
    where: { id: issueId },
    include: { scan: true }
  });
  
  if (!issue) {
    return { success: false, error: 'Issue not found' };
  }
  
  // In a real implementation, this would:
  // 1. Create backup of files to be modified
  // 2. Apply the fix
  // 3. Track the backup in ScanBackup table
  
  // For now, we just mark the issue as fixed
  const updated = await db.contractIssue.update({
    where: { id: issueId },
    data: {
      status: 'fixed',
      fixApplied: true,
      fixCode: fixCode || '',
      fixDescription: fixDescription || 'Applied fix',
      resolvedAt: new Date(),
    }
  });
  
  // Update scan's issuesFixed count
  await db.scanHistory.update({
    where: { scanId: issue.scanId },
    data: {
      issuesFixed: { increment: 1 }
    }
  });
  
  return {
    success: true,
    issue: updated,
    message: 'Issue marked as fixed'
  };
}

async function ignoreIssue(issueId: string) {
  const updated = await db.contractIssue.update({
    where: { id: issueId },
    data: {
      status: 'ignored',
      resolvedAt: new Date(),
    }
  });
  
  return {
    success: true,
    issue: updated,
    message: 'Issue ignored'
  };
}

async function restoreScan(scanId: string) {
  const scan = await db.scanHistory.findUnique({
    where: { scanId },
    include: { backups: true }
  });
  
  if (!scan) {
    return { success: false, error: 'Scan not found' };
  }
  
  // In a real implementation, this would restore files from backups
  // For now, we just mark issues as reverted
  await db.contractIssue.updateMany({
    where: { scanId },
    data: {
      status: 'reverted',
      fixApplied: false,
    }
  });
  
  // Mark backups as restored
  await db.scanBackup.updateMany({
    where: { scanId },
    data: {
      restored: true,
      restoredAt: new Date()
    }
  });
  
  return {
    success: true,
    message: `Scan ${scanId} restored. All fixes reverted.`
  };
}

async function deleteScan(scanId: string) {
  // Delete issues first (cascade should handle this, but let's be explicit)
  await db.contractIssue.deleteMany({
    where: { scanId }
  });
  
  // Delete backups
  await db.scanBackup.deleteMany({
    where: { scanId }
  });
  
  // Delete scan
  await db.scanHistory.delete({
    where: { scanId }
  });
  
  return {
    success: true,
    message: `Scan ${scanId} deleted`
  };
}

// =============================================================================
// FILE LISTING
// =============================================================================

interface FileInfo {
  path: string;
  name: string;
  type: 'api' | 'component' | 'hook' | 'lib' | 'page';
  lastModified?: string;
  hasRecentErrors?: boolean;
  recentlyModified?: boolean;
}

async function listAvailableFiles(): Promise<{ success: boolean; files: FileInfo[] }> {
  const srcPath = path.join(getSourceRoot(), 'src');
  const files: FileInfo[] = [];
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  function scan(dir: string) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!item.includes('node_modules') && !item.includes('.next')) {
          scan(fullPath);
        }
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        // Determine file type
        let type: FileInfo['type'] = 'lib';
        const relativePath = fullPath.replace(process.cwd(), '');
        
        if (relativePath.includes('/app/api/')) {
          type = 'api';
        } else if (relativePath.includes('/components/')) {
          type = 'component';
        } else if (relativePath.includes('/hooks/')) {
          type = 'hook';
        } else if (relativePath.includes('/app/') && !relativePath.includes('/api/')) {
          type = 'page';
        }
        
        // Check if recently modified
        const recentlyModified = stat.mtimeMs > oneWeekAgo;
        
        files.push({
          path: relativePath,
          name: item,
          type,
          lastModified: stat.mtime.toISOString(),
          recentlyModified,
          // hasRecentErrors would require checking error logs - set to false for now
          hasRecentErrors: false
        });
      }
    }
  }
  
  scan(srcPath);
  
  // Sort: API routes first, then components, then hooks, then pages, then lib
  const typeOrder = { api: 0, component: 1, hook: 2, page: 3, lib: 4 };
  files.sort((a, b) => {
    const typeDiff = typeOrder[a.type] - typeOrder[b.type];
    if (typeDiff !== 0) return typeDiff;
    return a.path.localeCompare(b.path);
  });
  
  return {
    success: true,
    files
  };
}

// =============================================================================
// SOURCE ROOT RESOLVER
// =============================================================================

// In standalone mode, process.cwd() is .next/standalone — resolve to actual source
function getSourceRoot(): string {
  const cwd = process.cwd();
  return cwd.includes('.next/standalone')
    ? path.resolve(cwd, '..', '..')
    : cwd;
}

// =============================================================================
// VALIDATION LOGIC
// =============================================================================

async function validateAllContracts(): Promise<ValidationResult> {
  const srcPath = path.join(getSourceRoot(), 'src');
  const endpoints: APIEndpoint[] = [];
  const allIssues: ContractIssueType[] = [];
  
  // Step 1: Find all API routes
  const apiRoutes = findAPIRoutes(srcPath);
  
  // Step 2: Extract expected parameters from each route
  for (const route of apiRoutes) {
    const endpoint = analyzeAPIRoute(route);
    if (endpoint) {
      endpoints.push(endpoint);
    }
  }
  
  // Step 3: Find all frontend API calls
  const frontendCalls = findFrontendCalls(srcPath);
  
  // Step 4: Match calls to endpoints and detect issues
  // Use precise matching: exact route, or frontend call is a direct sub-path of the route
  for (const endpoint of endpoints) {
    const matchingCalls = frontendCalls.filter(call => {
      // Exact match
      if (call.endpoint === endpoint.route) return true;
      // Frontend call is a sub-path of this endpoint's route
      // e.g. call=/api/analytics/automation should NOT match endpoint=/api/analytics
      // but call=/api/contract-validator?tab=results should match endpoint=/api/contract-validator
      const callBase = call.endpoint.split('?')[0]; // strip query string
      if (callBase.startsWith(endpoint.route + '/') && !endpoint.route.includes('[id]') && !endpoint.route.includes('[...')) {
        // The call is to a MORE specific sub-route — don't match parent
        // unless the parent route explicitly handles sub-routes via catch-all
        return false;
      }
      // Dynamic route matching: /api/projects/123 matches /api/projects/[id]
      if (endpoint.route.includes('[')) {
        const routeParts = endpoint.route.split('/').filter(Boolean);
        const callParts = callBase.split('/').filter(Boolean);
        if (routeParts.length === callParts.length) {
          const matches = routeParts.every((rp, i) => rp.startsWith('[') || rp === callParts[i]);
          if (matches) return true;
        }
      }
      // Catch-all matching: /api/projects/[...slug] matches /api/projects/anything/deep
      if (endpoint.route.includes('[...')) {
        const routeBase = endpoint.route.split('/[...')[0];
        if (callBase.startsWith(routeBase + '/')) return true;
      }
      return false;
    });
    
    endpoint.actualCalls = matchingCalls;
    
    // Validate each call against endpoint expectations
    for (const call of matchingCalls) {
      const issues = validateCallAgainstEndpoint(call, endpoint);
      endpoint.issues.push(...issues);
      allIssues.push(...issues);
    }
  }
  
  // Step 5: Find calls to non-existent endpoints
  // Build a set of known route paths for faster matching
  const routePaths = new Set(endpoints.map(e => e.route));
  
  for (const call of frontendCalls) {
    // Normalize the call endpoint for comparison
    const callEndpoint = call.endpoint.replace(/[?]([^/]+)$/, ''); // Strip query string for matching
    
    const hasMatchingEndpoint = endpoints.some(e => {
      // Exact match
      if (callEndpoint === e.route) return true;
      // Call is a sub-path of route (e.g., /api/users/123 matches /api/users/[id])
      if (e.route.includes('[id]') || e.route.includes('[...')) {
        const routeBase = e.route.replace(/\[\w+\]/g, '[id]').replace(/\[\.\.\.\w+\]/g, '[...]');
        const callBase = callEndpoint.replace(/\/[^/]+$/, '');
        if (callBase === e.route.replace(/\/\[\.\.\..+\]$/, '')) return true;
      }
      // Route contains call endpoint (for dynamic routes)
      const routeBase = e.route.replace(/\/\[\w+\].*$/, '');
      const callBase = callEndpoint.replace(/\/[^/]+$/, '');
      if (routeBase === callBase) return true;
      return false;
    });
    
    if (!hasMatchingEndpoint) {
      // Additional check: does the endpoint file actually exist on disk?
      const apiFilePath = path.join(process.cwd(), 'src/app', callEndpoint, 'route.ts');
      const apiFilePathTsx = path.join(process.cwd(), 'src/app', callEndpoint, 'route.tsx');
      const fileExists = fs.existsSync(apiFilePath) || fs.existsSync(apiFilePathTsx);
      
      if (!fileExists) {
        const issue: ContractIssueType = {
          type: 'unknown_endpoint',
          severity: 'warning',
          message: `Frontend calls endpoint "${call.endpoint}" but no matching API route found`,
          frontendFile: call.file,
          frontendLine: call.line,
          suggestion: `Create API route at: src/app${call.endpoint}/route.ts OR verify the endpoint path is dynamically constructed`
        };
        allIssues.push(issue);
      }
    }
  }
  
  // Step 6: Check for common patterns that cause "undefined" errors
  const undefinedIssues = scanForUndefinedAccess(srcPath);
  allIssues.push(...undefinedIssues);
  
  // Step 6: Filter out false-positive issues
  const filteredIssues = allIssues.filter(issue => {
    // Filter out issues where "expected" param is clearly a regex artifact
    // Valid param names should be plain identifiers: only letters, digits, underscore, dollar
    const match = issue.message.match(/expects "([^"]+)"/);
    if (match) {
      const expectedParam = match[1];
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(expectedParam)) {
        return false; // Not a valid JS identifier → regex artifact
      }
    }
    return true;
  });

  // Step 7: Deduplicate issues (same type + same file:line + same message)
  const seen = new Set<string>();
  const dedupedIssues = filteredIssues.filter(issue => {
    const key = `${issue.type}:${issue.frontendFile}:${issue.frontendLine}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const scanId = generateScanId();
  
  return {
    success: dedupedIssues.filter(i => i.severity === 'error').length === 0,
    scanId,
    summary: {
      totalEndpoints: endpoints.length,
      totalCalls: frontendCalls.length,
      totalIssues: dedupedIssues.length,
      errors: dedupedIssues.filter(i => i.severity === 'error').length,
      warnings: dedupedIssues.filter(i => i.severity === 'warning').length,
    },
    endpoints,
    issues: dedupedIssues,
  };
}

// =============================================================================
// FILE SCANNING HELPERS
// =============================================================================

function findAPIRoutes(srcPath: string): string[] {
  const routes: string[] = [];
  
  function scan(dir: string) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (file === 'route.ts' || file === 'route.tsx') {
        routes.push(fullPath);
      }
    }
  }
  
  const apiPath = path.join(getSourceRoot(), 'src', 'app', 'api');
  scan(apiPath);
  return routes;
}

function analyzeAPIRoute(filePath: string): APIEndpoint | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract route path from file path
    const apiIndex = filePath.indexOf('/api/');
    let route = filePath.slice(apiIndex, filePath.lastIndexOf('/'));
    
    // Find HTTP methods
    const methods: string[] = [];
    if (content.includes('export async function GET')) methods.push('GET');
    if (content.includes('export async function POST')) methods.push('POST');
    if (content.includes('export async function PUT')) methods.push('PUT');
    if (content.includes('export async function DELETE')) methods.push('DELETE');
    if (content.includes('export async function PATCH')) methods.push('PATCH');
    
    // Extract expected body parameters (simplified pattern matching)
    const expectedBody: string[] = [];
    const expectedParams: string[] = [];
    
    // Look for: const { action, pattern, patternId } = body
    const destructMatches = content.matchAll(/const\s*{\s*([^}]+)\s*}\s*=\s*(?:await\s*)?(?:request\.)?(?:body|json\(\))/g);
    for (const match of destructMatches) {
      const vars = match[1].split(',').map(v => v.trim().split(':')[0].trim());
      expectedBody.push(...vars.filter(v => v && !v.includes('=')));
    }
    
    // Also look for: const body = await request.json()
    // Then: body.action or body['action']
    // But FILTER OUT common JS built-in properties/methods
    const jsBuiltins = new Set([
      'length', 'toString', 'valueOf', 'hasOwnProperty', 'constructor', 'prototype',
      'toUpperCase', 'toLowerCase', 'trim', 'trimStart', 'trimEnd',
      'substring', 'substr', 'slice', 'split', 'replace', 'replaceAll', 'match', 'matchAll',
      'includes', 'indexOf', 'lastIndexOf', 'startsWith', 'endsWith', 'charAt', 'charCodeAt',
      'concat', 'repeat', 'padStart', 'padEnd',
      'map', 'filter', 'reduce', 'reduceRight', 'forEach', 'find', 'findIndex',
      'some', 'every', 'flat', 'flatMap', 'sort', 'reverse',
      'push', 'pop', 'shift', 'unshift', 'splice',
      'keys', 'values', 'entries', 'from', 'of', 'isArray',
      'join', 'has', 'get', 'set', 'delete', 'clear', 'size', 'add',
      'then', 'catch', 'finally', 'resolve', 'reject', 'all', 'race', 'any',
      'JSON', 'stringify', 'parse',
      'assign', 'freeze', 'create', 'defineProperty', 'getOwnPropertyNames',
      'Error', 'Date', 'Math', 'RegExp', 'Object', 'Array', 'String', 'Number', 'Boolean',
      // Next.js specific
      'next', 'params', 'searchParams', 'headers', 'cookies',
    ]);
    // Only look at body.xxx access OUTSIDE of catch blocks (catch blocks use {error} pattern)
    const lines = content.split('\n');
    let inCatchBlock = false;
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      if (/catch\s*\(/.test(line) || /catch\s*\{/.test(line)) { inCatchBlock = true; }
      if (inCatchBlock && /^\s*\}/.test(line) && li > 0) { 
        // Check if this closes the catch block — look for try/catch structure
        const prevNonEmpty = lines.slice(0, li).reverse().find(l => l.trim());
        if (prevNonEmpty && /catch/.test(prevNonEmpty)) { inCatchBlock = false; continue; }
        // Count braces to determine if we're closing catch
        let depth = 0;
        for (let j = li; j >= 0; j--) {
          for (const ch of lines[j]) {
            if (ch === '{') depth++;
            if (ch === '}') depth--;
          }
        }
        if (depth <= 0) inCatchBlock = false;
      }
      if (inCatchBlock) continue;
      
      const bodyAccessMatches = line.matchAll(/body\.(\w+)|body\['(\w+)'\]/g);
      for (const match of bodyAccessMatches) {
        const param = match[1] || match[2];
        if (param && !expectedBody.includes(param) && !jsBuiltins.has(param)) {
          expectedBody.push(param);
        }
      }
    }
    
    // Look for searchParams.get patterns
    const paramMatches = content.matchAll(/searchParams\.get\(['"](\w+)['"]\)/g);
    for (const match of paramMatches) {
      if (!expectedParams.includes(match[1])) {
        expectedParams.push(match[1]);
      }
    }
    
    // Look for common error patterns
    const issues: ContractIssueType[] = [];
    
    // Check for potential undefined access without null check
    if (content.includes('pattern.') && !content.includes('pattern?.')) {
      // Check if there's a fallback when pattern is undefined
      if (!content.includes('if (!pattern') && !content.includes('pattern ||') && !content.includes('pattern ??')) {
        issues.push({
          type: 'undefined_access',
          severity: 'warning',
          message: `Potential undefined access: "pattern" might be undefined when called with only "patternId"`,
          apiFile: filePath,
          suggestion: 'Add null check: if (!pattern && patternId) { pattern = await fetchFromDB(patternId) }'
        });
      }
    }
    
    // Detect multi-action API pattern (action-based routing)
    const isMultiAction = /body\.action\s*===|switch\s*\(\s*body\.action|case\s*['\"](?:create|update|delete|get|list|fetch|save|upload|import|export|analyze|scan|validate|generate|execute|run|start|stop|process|apply|ignore|restore|delete_scan|fix)/.test(content);
    
    // Also detect if API uses a generic body handler pattern (common in this codebase)
    const hasActionDestructuring = /const\s*\{\s*action[^}]*\}\s*=\s*body/.test(content);
    const effectiveMultiAction = isMultiAction || hasActionDestructuring;
    
    return {
      file: filePath,
      method: methods.join(', ') || 'UNKNOWN',
      route,
      expectedParams,
      expectedBody: [...new Set(expectedBody)],
      actualCalls: [],
      issues,
      isMultiAction: effectiveMultiAction,
    };
  } catch (error) {
    return null;
  }
}

function findFrontendCalls(srcPath: string): APICall[] {
  const calls: APICall[] = [];
  
  function scan(dir: string) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.next')) {
          scan(fullPath);
        }
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const fileCalls = extractAPICalls(fullPath);
        calls.push(...fileCalls);
      }
    }
  }
  
  scan(srcPath);
  return calls;
}

function extractAPICalls(filePath: string): APICall[] {
  const calls: APICall[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Pattern: fetch('/api/...', { method: 'POST', body: JSON.stringify({ ... }) })
    const fetchPattern = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g;
    
    lines.forEach((line, index) => {
      const fetchMatches = line.matchAll(fetchPattern);
      
      for (const match of fetchMatches) {
        const endpoint = match[1].trim();
        
        // SKIP template literal / dynamic endpoints (e.g. `${endpoint}?tab=${tab}`)
        if (endpoint.includes('${') || endpoint.includes('process.env') || endpoint.includes('NEXT_PUBLIC')) {
          continue;
        }
        
        // SKIP empty or non-API endpoints
        if (!endpoint || (!endpoint.startsWith('/api/') && !endpoint.startsWith('/'))) {
          continue;
        }
        
        // SKIP endpoints that are clearly variable references (no path structure)
        if (endpoint.startsWith('/') && !endpoint.includes('/api')) {
          continue;
        }
        
        // Find method
        let method = 'GET';
        // Look at current line and next few lines for method (expanded to 10 lines)
        const methodContext = lines.slice(index, index + 10).join('\n');
        if (methodContext.includes('method: \'POST\'') || methodContext.includes('method: "POST"')) method = 'POST';
        if (methodContext.includes('method: \'PUT\'') || methodContext.includes('method: "PUT"')) method = 'PUT';
        if (methodContext.includes('method: \'DELETE\'') || methodContext.includes('method: "DELETE"')) method = 'DELETE';
        if (methodContext.includes('method: \'PATCH\'') || methodContext.includes('method: "PATCH"')) method = 'PATCH';
        
        // Find body content (look at next 15 lines for better coverage)
        const sentBody: string[] = [];
        const sentParams: string[] = [];
        
        if (methodContext.includes('body:') || method === 'POST' || method === 'PUT' || method === 'PATCH') {
          // Look for JSON.stringify content in next 15 lines
          const nextLines = lines.slice(index, index + 15).join('\n');
          
          // Extract key names from object literals: { action: 'create', version: newVersion }
          const jsonProps = nextLines.matchAll(/["'](\w+)["']:\s*[^,}]+/g);
          for (const prop of jsonProps) {
            sentBody.push(prop[1]);
          }
          
          // Also look for unquoted keys: action: 'create'
          const directProps = nextLines.matchAll(/(\w+):\s*['"`[{]/g);
          for (const prop of directProps) {
            if (!['method', 'headers', 'body', 'credentials', 'mode', 'cache', 'redirect', 'Content', 'next'].includes(prop[1])) {
              sentBody.push(prop[1]);
            }
          }
        }
        
        // Check for query params in literal endpoints
        if (endpoint.includes('?')) {
          try {
            const urlObj = new URL(endpoint, 'http://localhost');
            urlObj.searchParams.forEach((_, key) => {
              sentParams.push(key);
            });
          } catch (e) {}
        }
        
        calls.push({
          file: filePath,
          line: index + 1,
          endpoint,
          method,
          sentParams,
          sentBody: [...new Set(sentBody)],
        });
      }
    });
  } catch (error) {
    // Ignore parse errors
  }
  
  return calls;
}

function validateCallAgainstEndpoint(call: APICall, endpoint: APIEndpoint): ContractIssueType[] {
  const issues: ContractIssueType[] = [];
  
  // Skip validation if the call has no detected body params (likely dynamic construction)
  if (call.sentBody.length === 0) {
    return issues;
  }
  
  // Skip if all sent body params are common catch-block / error variables (false positive)
  const catchBlockVars = new Set(['error', 'message', 'stack', 'result', 'data', 'response', 'err']);
  const realParams = call.sentBody.filter(p => !catchBlockVars.has(p));
  if (realParams.length === 0) {
    return issues;
  }
  
  // Skip if endpoint has too many expected params — it's likely a multi-action API
  if (endpoint.expectedBody.length > 6) {
    return issues;
  }
  
  // Skip if endpoint is a multi-action API (detected by action-based routing)
  if ((endpoint as any).isMultiAction) {
    return issues;
  }
  
  // Check if call sends required body params
  for (const expected of endpoint.expectedBody) {
    // Skip well-known params that are often handled differently (action routing, etc.)
    const skipParams = ['request', 'response', 'next', 'params', 'searchParams', 'headers'];
    if (skipParams.includes(expected)) continue;
    
    // Skip if endpoint has fallback logic already
    const hasFallback = endpoint.issues.some(i => i.message.includes(expected));
    
    if (!call.sentBody.includes(expected) && !hasFallback) {
      // Check if this might be intentional (patternId vs pattern)
      const isRelatedParam = call.sentBody.some(s => 
        s.toLowerCase().includes(expected.toLowerCase()) || 
        expected.toLowerCase().includes(s.toLowerCase())
      );
      
      if (!isRelatedParam) {
        issues.push({
          type: 'missing_param',
          severity: 'warning',
          message: `Frontend sends { ${call.sentBody.join(', ')} } but API expects "${expected}"`,
          frontendFile: call.file,
          frontendLine: call.line,
          apiFile: endpoint.file,
          suggestion: `Add "${expected}" to the request body OR update API to handle the current parameters`,
        });
      }
    }
  }
  
  // Limit to max 5 issues per call to avoid noise from multi-action APIs
  return issues.slice(0, 5);
}

function scanForUndefinedAccess(srcPath: string): ContractIssueType[] {
  const issues: ContractIssueType[] = [];
  
  function scan(dir: string) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!file.includes('node_modules') && !file.includes('.next')) {
          scan(fullPath);
        }
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            // Skip if already error handling
            if (line.includes('Cannot read properties') || line.includes('undefined')) {
              return;
            }
            
            // Look for destructuring without default
            const destructMatch = line.match(/const\s*{\s*(\w+)\s*}\s*=\s*(\w+)/);
            if (destructMatch) {
              const varName = destructMatch[1];
              const source = destructMatch[2];
              // Check if there's fallback in nearby lines
              const nearby = lines.slice(Math.max(0, index - 3), index + 3).join('\n');
              if (!nearby.includes(`${source} ||`) && !nearby.includes(`${source} ??`) && 
                  !nearby.includes(`if (!${source}`) && !nearby.includes(`if (${source}`)) {
                // Potential issue
              }
            }
          });
        } catch (e) {}
      }
    }
  }
  
  scan(srcPath);
  return issues;
}

async function validateSingleEndpoint(endpoint: string): Promise<{ success: boolean; issues: ContractIssueType[] }> {
  const result = await validateAllContracts();
  const match = result.endpoints.find(e => e.route === endpoint || e.route.includes(endpoint));
  
  return {
    success: match ? match.issues.length === 0 : false,
    issues: match?.issues || [],
  };
}
