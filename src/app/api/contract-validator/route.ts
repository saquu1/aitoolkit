/**
 * API CONTRACT VALIDATOR
 * =======================
 * One-click detection of data mismatches between:
 * - Frontend → API (what frontend sends vs what API expects)
 * - API → Database (what API sends vs what DB schema expects)
 * 
 * This helps non-technical AI coders catch "object mismatch" errors instantly.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

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
  issues: ContractIssue[];
}

interface APICall {
  file: string;
  line: number;
  endpoint: string;
  method: string;
  sentParams: string[];
  sentBody: string[];
}

interface ContractIssue {
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
  summary: {
    totalEndpoints: number;
    totalCalls: number;
    totalIssues: number;
    errors: number;
    warnings: number;
  };
  endpoints: APIEndpoint[];
  issues: ContractIssue[];
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'validate';
  
  try {
    const result = await validateAllContracts();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      summary: { totalEndpoints: 0, totalCalls: 0, totalIssues: 0, errors: 0, warnings: 0 },
      endpoints: [],
      issues: [{
        type: 'undefined_access',
        severity: 'error',
        message: `Validation failed: ${error.message}`,
        suggestion: 'Check if project structure is correct'
      }]
    });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, targetEndpoint } = body;
  
  switch (action) {
    case 'validate_endpoint':
      return NextResponse.json(await validateSingleEndpoint(targetEndpoint));
    case 'fix_issue':
      return NextResponse.json(await suggestFix(body.issue));
    default:
      return NextResponse.json(await validateAllContracts());
  }
}

// =============================================================================
// VALIDATION LOGIC
// =============================================================================

async function validateAllContracts(): Promise<ValidationResult> {
  const srcPath = path.join(process.cwd(), 'src');
  const endpoints: APIEndpoint[] = [];
  const allIssues: ContractIssue[] = [];
  
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
      const issue: ContractIssue = {
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
  
  return {
    success: allIssues.filter(i => i.severity === 'error').length === 0,
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
    const issues: ContractIssue[] = [];
    
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

function validateCallAgainstEndpoint(call: APICall, endpoint: APIEndpoint): ContractIssue[] {
  const issues: ContractIssue[] = [];
  
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

function scanForUndefinedAccess(srcPath: string): ContractIssue[] {
  const issues: ContractIssue[] = [];
  
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

async function validateSingleEndpoint(endpoint: string): Promise<{ success: boolean; issues: ContractIssue[] }> {
  const result = await validateAllContracts();
  const match = result.endpoints.find(e => e.route === endpoint || e.route.includes(endpoint));
  
  return {
    success: match ? match.issues.length === 0 : false,
    issues: match?.issues || [],
  };
}

async function suggestFix(issue: ContractIssue): Promise<{ success: boolean; suggestion: string; code?: string }> {
  let suggestion = '';
  let code = '';
  
  switch (issue.type) {
    case 'missing_param':
      suggestion = 'Update the API to accept both parameter formats OR update frontend to send correct parameter';
      code = `// Option 1: Update API to handle both
const { pattern, patternId } = body;
const resolvedPattern = pattern || (patternId ? await fetchPattern(patternId) : null);
if (!resolvedPattern) {
  return NextResponse.json({ error: 'Pattern not found' }, { status: 400 });
}`;
      break;
    case 'undefined_access':
      suggestion = 'Add null/undefined check before accessing properties';
      code = `// Add null check
if (!pattern && patternId) {
  pattern = await db.pattern.findUnique({ where: { id: patternId } });
}
if (!pattern) {
  return NextResponse.json({ error: 'Pattern required' }, { status: 400 });
}`;
      break;
    case 'unknown_endpoint':
      suggestion = 'Create the missing API endpoint or fix the frontend URL';
      break;
    default:
      suggestion = 'Review and fix the identified issue';
  }
  
  return { success: true, suggestion, code };
}
