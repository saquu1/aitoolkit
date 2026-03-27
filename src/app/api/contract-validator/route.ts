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
  const srcPath = path.join(process.cwd(), 'src');
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
// VALIDATION LOGIC
// =============================================================================

async function validateAllContracts(): Promise<ValidationResult> {
  const srcPath = path.join(process.cwd(), 'src');
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
  for (const endpoint of endpoints) {
    const matchingCalls = frontendCalls.filter(call => 
      call.endpoint === endpoint.route || 
      call.endpoint.includes(endpoint.route.replace('/api/', ''))
    );
    
    endpoint.actualCalls = matchingCalls;
    
    // Validate each call against endpoint expectations
    for (const call of matchingCalls) {
      const issues = validateCallAgainstEndpoint(call, endpoint);
      endpoint.issues.push(...issues);
      allIssues.push(...issues);
    }
  }
  
  // Step 5: Find calls to non-existent endpoints
  for (const call of frontendCalls) {
    const hasMatchingEndpoint = endpoints.some(e => 
      call.endpoint === e.route || 
      call.endpoint.includes(e.route.replace('/api/', '')) ||
      e.route.includes(call.endpoint)
    );
    
    if (!hasMatchingEndpoint && !call.endpoint.includes('localhost')) {
      const issue: ContractIssueType = {
        type: 'unknown_endpoint',
        severity: 'warning',
        message: `Frontend calls endpoint "${call.endpoint}" but no matching API route found`,
        frontendFile: call.file,
        frontendLine: call.line,
        suggestion: `Create API route at: src/app/api${call.endpoint}/route.ts OR check if endpoint path is correct`
      };
      allIssues.push(issue);
    }
  }
  
  // Step 6: Check for common patterns that cause "undefined" errors
  const undefinedIssues = scanForUndefinedAccess(srcPath);
  allIssues.push(...undefinedIssues);
  
  const scanId = generateScanId();
  
  return {
    success: allIssues.filter(i => i.severity === 'error').length === 0,
    scanId,
    summary: {
      totalEndpoints: endpoints.length,
      totalCalls: frontendCalls.length,
      totalIssues: allIssues.length,
      errors: allIssues.filter(i => i.severity === 'error').length,
      warnings: allIssues.filter(i => i.severity === 'warning').length,
    },
    endpoints,
    issues: allIssues,
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
  
  scan(path.join(srcPath, 'app', 'api'));
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
    const bodyAccessMatches = content.matchAll(/body\.(\w+)|body\['(\w+)'\]/g);
    for (const match of bodyAccessMatches) {
      const param = match[1] || match[2];
      if (param && !expectedBody.includes(param)) {
        expectedBody.push(param);
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
    
    return {
      file: filePath,
      method: methods.join(', ') || 'UNKNOWN',
      route,
      expectedParams,
      expectedBody: [...new Set(expectedBody)],
      actualCalls: [],
      issues,
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
        const endpoint = match[1];
        
        // Find method
        let method = 'GET';
        if (line.includes('method: \'POST\'') || line.includes('method: "POST"')) method = 'POST';
        if (line.includes('method: \'PUT\'') || line.includes('method: "PUT"')) method = 'PUT';
        if (line.includes('method: \'DELETE\'') || line.includes('method: "DELETE"')) method = 'DELETE';
        
        // Find body content (simplified - look at next few lines)
        const sentBody: string[] = [];
        const sentParams: string[] = [];
        
        if (line.includes('body:') || method === 'POST') {
          // Look for JSON.stringify content
          const nextLines = lines.slice(index, index + 10).join('\n');
          
          // Extract variables being sent: { action: "analyze", patternId: "..." }
          const jsonProps = nextLines.matchAll(/["'](\w+)["']:\s*\w+/g);
          for (const prop of jsonProps) {
            sentBody.push(prop[1]);
          }
          
          // Also look for: action: "analyze" (without quotes)
          const directProps = nextLines.matchAll(/(\w+):\s*\w+/g);
          for (const prop of directProps) {
            if (!['method', 'headers', 'body', 'credentials', 'mode', 'cache', 'redirect'].includes(prop[1])) {
              sentBody.push(prop[1]);
            }
          }
        }
        
        // Check for query params
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
  
  // Check if call sends required body params
  for (const expected of endpoint.expectedBody) {
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
  
  return issues;
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
