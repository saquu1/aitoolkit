/**
 * Schema Audit API
 * ================
 * GET  - Run the audit scanner and return results
 * POST - Trigger a fix action (add model, run prisma generate, etc.)
 */
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Use absolute paths since standalone server cwd may vary
const PROJECT_ROOT = '/home/z/my-project';
const SCHEMA_PATH = '/home/z/my-project/aitoolkit/prisma/schema.prisma';
const AUDIT_JSON = '/home/z/my-project/aitoolkit/scripts/audit-results.json';
const TOOLKIT_ROOT = '/home/z/my-project/aitoolkit';

// Cache for audit results (re-scan is expensive)
let cachedAudit: any = null;
let cachedAt = 0;
const CACHE_TTL = 60_000; // 1 min

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');

  if (action === 'models') {
    return NextResponse.json({ models: getSchemaModels() });
  }

  if (action === 'missing-model-fields') {
    const modelName = request.nextUrl.searchParams.get('model');
    if (!modelName) return NextResponse.json({ error: 'model param required' }, { status: 400 });
    // Check cache first
    const fieldCachePath = AUDIT_JSON.replace('audit-results.json', 'field-cache.json');
    try {
      if (fs.existsSync(fieldCachePath)) {
        const cache = JSON.parse(fs.readFileSync(fieldCachePath, 'utf-8'));
        if (cache[modelName]) {
          return NextResponse.json({ model: modelName, fields: cache[modelName] });
        }
      }
    } catch {}
    // Not cached - compute and cache
    const fields = inferModelFields(modelName);
    try {
      let cache: Record<string, any[]> = {};
      if (fs.existsSync(fieldCachePath)) cache = JSON.parse(fs.readFileSync(fieldCachePath, 'utf-8'));
      cache[modelName] = fields;
      fs.writeFileSync(fieldCachePath, JSON.stringify(cache, null, 2));
    } catch {}
    return NextResponse.json({ model: modelName, fields });
  }

  // Default: return cached audit results
  try {
    let auditData = cachedAudit;
    if (!auditData || Date.now() - cachedAt > CACHE_TTL) {
      if (fs.existsSync(AUDIT_JSON)) {
        auditData = JSON.parse(fs.readFileSync(AUDIT_JSON, 'utf-8'));
        cachedAudit = auditData;
        cachedAt = Date.now();
      } else {
        return NextResponse.json({ error: 'Run audit first: node scripts/prisma-schema-audit.js', issues: [], schemaModels: getSchemaModels() });
      }
    }

    // Filter out false positives (WRONG_MODEL_CASE is expected Prisma behavior)
    const realIssues = auditData.issues.filter((i: any) => i.category !== 'WRONG_MODEL_CASE');

    // Group missing models
    let missingModels = getUniqueMissingModels(realIssues);

    // Load cached fields if available
    const fieldCachePath = AUDIT_JSON.replace('audit-results.json', 'field-cache.json');
    let fieldCache: Record<string, any[]> = {};
    try {
      if (fs.existsSync(fieldCachePath)) {
        fieldCache = JSON.parse(fs.readFileSync(fieldCachePath, 'utf-8'));
      }
    } catch {}

    // Attach cached fields to models that have them
    missingModels = missingModels.map(m => ({
      ...m,
      inferredFields: fieldCache[m.name] || [],
    }));

    return NextResponse.json({
      generatedAt: auditData.generatedAt,
      issues: realIssues,
      totalRealIssues: realIssues.length,
      issuesBySeverity: auditData.issuesBySeverity,
      missingModels,
      schemaModelCount: auditData.schemaModels?.length || getSchemaModels().length,
      schemaModels: auditData.schemaModels || getSchemaModels(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, issues: [], missingModels: [], schemaModels: getSchemaModels() });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      case 'run-scan': {
        const { execSync } = require('child_process');
        let output = '';
        try {
          output = execSync('cd /home/z/my-project/aitoolkit && node scripts/prisma-schema-audit.js 2>&1', {
            timeout: 120_000,
            encoding: 'utf-8',
          });
        } catch (e: any) {
          output = e.stdout?.toString?.() || e.message || 'Scan failed';
        }
        cachedAudit = null; // clear cache
        // Re-read results (script writes JSON before exiting)
        if (fs.existsSync(AUDIT_JSON)) {
          cachedAudit = JSON.parse(fs.readFileSync(AUDIT_JSON, 'utf-8'));
          cachedAt = Date.now();
        }
        return NextResponse.json({ success: true, output, issues: cachedAudit?.issues?.length || 0 });
      }

      case 'add-model': {
        const { modelName, schemaDefinition } = body;
        if (!modelName || !schemaDefinition) {
          return NextResponse.json({ error: 'modelName and schemaDefinition required' }, { status: 400 });
        }
        return addModelToSchema(modelName, schemaDefinition);
      }

      case 'prisma-generate': {
        const { execSync } = require('child_process');
        const result = execSync('cd /home/z/my-project/aitoolkit && npx prisma generate 2>&1', {
          timeout: 60_000,
          encoding: 'utf-8',
        });
        return NextResponse.json({ success: true, output: result });
      }

      case 'prisma-push': {
        const { execSync } = require('child_process');
        const result = execSync('cd /home/z/my-project/aitoolkit && npx prisma db push --accept-data-loss 2>&1', {
          timeout: 120_000,
          encoding: 'utf-8',
        });
        return NextResponse.json({ success: true, output: result });
      }

      case 'restart-server': {
        const { execSync } = require('child_process');
        // Kill old daemon and restart
        execSync('pkill -f "node.*standalone" 2>/dev/null; sleep 1; cd /home/z/my-project/aitoolkit && bash build.sh 2>&1', {
          timeout: 300_000,
          encoding: 'utf-8',
        });
        return NextResponse.json({ success: true, message: 'Server rebuilt and restarted' });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message, output: err.stdout?.toString?.() || '' }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Batch-infer fields for ALL missing models in a single file scan pass.
 * Reads each source file once and checks against all model names.
 */
function inferAllModelFieldsBatch(modelNames: string[]): Record<string, { name: string; type: string; source: string }[]> {
  const results: Record<string, Map<string, { type: string; source: string }>> = {};
  for (const name of modelNames) {
    results[name] = new Map();
    results[name].set('id', { type: 'String @id @default(cuid())', source: 'standard' });
    results[name].set('createdAt', { type: 'DateTime @default(now())', source: 'standard' });
    results[name].set('updatedAt', { type: 'DateTime', source: 'standard' });
  }

  const codeDirs = [
    path.join(TOOLKIT_ROOT, 'src', 'app', 'api'),
    path.join(TOOLKIT_ROOT, 'src', 'lib'),
  ];

  // Build prisma name -> canonical name mapping
  const nameMap = new Map<string, string>();
  for (const name of modelNames) {
    const pName = name.charAt(0).toLowerCase() + name.slice(1);
    nameMap.set(pName, name);
    nameMap.set(name, name); // also match exact case
  }

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { scanDir(full); continue; }
      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;
      if (entry.name === 'advanced-code-generator.ts') continue;

      try {
        const content = fs.readFileSync(full, 'utf-8');
        const relFile = path.relative(PROJECT_ROOT, full);

        // Find which models are referenced in this file
        for (const [pName, canonName] of nameMap.entries()) {
          if (!content.includes(pName)) continue;
          const fields = results[canonName];
          extractFieldsFromCreate(content, relFile, pName, fields);
          extractFieldsFromWhere(content, relFile, pName, fields);
          extractFieldsFromOrderBy(content, relFile, pName, fields);
          extractFieldsFromGroupBy(content, relFile, pName, fields);
          extractFieldsFromUpdate(content, relFile, pName, fields);
          extractFieldsFromInclude(content, relFile, pName, fields);
          extractFieldsFromCountWhere(content, relFile, pName, fields);
        }
      } catch {}
    }
  }

  for (const d of codeDirs) scanDir(d);

  // Convert to arrays
  const output: Record<string, { name: string; type: string; source: string }[]> = {};
  for (const [name, fields] of Object.entries(results)) {
    output[name] = Array.from(fields.entries()).map(([n, d]) => ({ name: n, type: d.type, source: d.source }));
  }
  return output;
}

/**
 * Basic fallback: return standard fields only (no file scanning)
 */
function inferModelFieldsBasic(modelName: string): { name: string; type: string; source: string }[] {
  return [
    { name: 'id', type: 'String @id @default(cuid())', source: 'standard' },
    { name: 'createdAt', type: 'DateTime @default(now())', source: 'standard' },
    { name: 'updatedAt', type: 'DateTime', source: 'standard' },
  ];
}

function getSchemaModels(): string[] {
  try {
    const content = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    const models: string[] = [];
    const regex = /^model\s+(\w+)\s*\{/gm;
    let m;
    while ((m = regex.exec(content)) !== null) models.push(m[1]);
    return models;
  } catch { return []; }
}

function getUniqueMissingModels(issues: any[]) {
  const missing = issues.filter((i: any) => i.category === 'MISSING_MODEL');
  const map = new Map<string, { count: number; files: Set<string>; issues: any[] }>();

  for (const issue of missing) {
    const m = issue.detail.match(/model "(\w+)"/);
    if (!m) continue;
    const name = m[1];
    if (!map.has(name)) map.set(name, { count: 0, files: new Set(), issues: [] });
    const entry = map.get(name)!;
    entry.count++;
    entry.files.add(issue.file);
    entry.issues.push(issue);
  }

  return Array.from(map.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      files: [...data.files],
      issues: data.issues,
      inferredFields: [],  // Lazy-loaded via separate endpoint
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Read source files that reference a missing model and extract
 * what fields they use in create/update/where operations
 */
function inferModelFields(modelName: string): { name: string; type: string; source: string }[] {
  const fields = new Map<string, { type: string; source: string }>();

  // Find files that reference this model
  const codeDirs = [
    path.join(TOOLKIT_ROOT, 'src', 'app', 'api'),
    path.join(TOOLKIT_ROOT, 'src', 'lib'),
  ];

  const prismaName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) scanDir(full);
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        // Skip known huge files that aren't related
        if (entry.name === 'advanced-code-generator.ts') continue;
        try {
          const content = fs.readFileSync(full, 'utf-8');
          if (!content.includes(prismaName)) return;

          const relFile = path.relative(PROJECT_ROOT, full);

          // Extract fields from create({ data: { field: value } })
          extractFieldsFromCreate(content, relFile, prismaName, fields);
          // Extract fields from where clauses
          extractFieldsFromWhere(content, relFile, prismaName, fields);
          // Extract fields from orderBy
          extractFieldsFromOrderBy(content, relFile, prismaName, fields);
          // Extract fields from groupBy
          extractFieldsFromGroupBy(content, relFile, prismaName, fields);
          // Extract fields from update data
          extractFieldsFromUpdate(content, relFile, prismaName, fields);
          // Extract fields from include/select
          extractFieldsFromInclude(content, relFile, prismaName, fields);
          // Extract fields from count where
          extractFieldsFromCountWhere(content, relFile, prismaName, fields);
        } catch {}
      }
    }
  }

  for (const d of codeDirs) scanDir(d);

  // Always add standard fields
  fields.set('id', { type: 'String @id @default(cuid())', source: 'standard' });
  fields.set('createdAt', { type: 'DateTime @default(now())', source: 'standard' });
  fields.set('updatedAt', { type: 'DateTime', source: 'standard' });

  // Convert to array and sort: id first, then standard fields, then discovered
  return Array.from(fields.entries()).map(([name, data]) => ({
    name,
    type: data.type,
    source: data.source,
  }));
}

function extractFieldsFromCreate(content: string, file: string, prismaName: string, fields: Map<string, any>) {
  // Match prisma.modelName.create({ data: { ... } })
  const createRegex = new RegExp(`${prismaName}\\.create\\s*\\(\\s*\\{[^}]*data\\s*:\\s*\\{([^}]*)`, 's');
  const m = content.match(createRegex);
  if (!m) return;
  const block = m[1];
  const fieldMatches = block.matchAll(/(\w+)\s*:/g);
  for (const fm of fieldMatches) {
    const name = fm[1];
    if (isPrismaKeyword(name)) continue;
    const val = block.substring(fm.index! + fm[0].length).trim();
    let type = guessType(val);
    if (!fields.has(name)) fields.set(name, { type, source: file });
  }
}

function extractFieldsFromWhere(content: string, file: string, prismaName: string, fields: Map<string, any>) {
  const whereRegex = new RegExp(`${prismaName}\\.\\w+\\(\\s*\\{[^}]*where\\s*:\\s*\\{([^}]*)`, 's');
  let m;
  while ((m = whereRegex.exec(content)) !== null) {
    const block = m[1];
    const fieldMatches = block.matchAll(/(\w+)\s*:/g);
    for (const fm of fieldMatches) {
      const name = fm[1];
      if (isPrismaKeyword(name)) continue;
      let type = fields.get(name)?.type || 'String?';
      if (type.includes('String') && !type.includes('?')) type = 'String';
      else if (!fields.has(name)) type = 'String?';
      if (!fields.has(name)) fields.set(name, { type, source: file });
    }
  }
}

function extractFieldsFromOrderBy(content: string, file: string, prismaName: string, fields: Map<string, any>) {
  const regex = new RegExp(`${prismaName}\\.\\w+\\(\\s*\\{[^}]*orderBy\\s*:\\s*\\{?\\s*([^}\\]]+)`, 's');
  const m = content.match(regex);
  if (!m) return;
  const block = m[1];
  const fieldMatches = block.matchAll(/(\w+)\s*:/g);
  for (const fm of fieldMatches) {
    const name = fm[1];
    if (isPrismaKeyword(name)) continue;
    if (!fields.has(name)) fields.set(name, { type: 'String', source: file });
  }
}

function extractFieldsFromGroupBy(content: string, file: string, prismaName: string, fields: Map<string, any>) {
  const regex = new RegExp(`${prismaName}\\.groupBy\\s*\\(\\s*\\{[^}]*by\\s*:\\s*\\[([^\\]]+)`, 's');
  const m = content.match(regex);
  if (!m) return;
  const block = m[1];
  const fieldMatches = block.matchAll(/['"](\w+)['"]/g);
  for (const fm of fieldMatches) {
    const name = fm[1];
    if (!fields.has(name)) fields.set(name, { type: 'String', source: file });
  }
}

function extractFieldsFromUpdate(content: string, file: string, prismaName: string, fields: Map<string, any>) {
  const regex = new RegExp(`${prismaName}\\.update(?:Many)?\\s*\\(\\s*\\{[^}]*data\\s*:\\s*\\{([^}]*)`, 's');
  const m = content.match(regex);
  if (!m) return;
  const block = m[1];
  const fieldMatches = block.matchAll(/(\w+)\s*:/g);
  for (const fm of fieldMatches) {
    const name = fm[1];
    if (isPrismaKeyword(name)) continue;
    if (!fields.has(name)) {
      const val = block.substring(fm.index! + fm[0].length).trim();
      fields.set(name, { type: guessType(val), source: file });
    }
  }
}

function extractFieldsFromInclude(content: string, file: string, prismaName: string, fields: Map<string, any>) {
  const regex = new RegExp(`${prismaName}\\.\\w+\\(\\s*\\{[^}]*include\\s*:\\s*\\{([^}]*)`, 's');
  const m = content.match(regex);
  if (!m) return;
  const block = m[1];
  const fieldMatches = block.matchAll(/(\w+)\s*:/g);
  for (const fm of fieldMatches) {
    const name = fm[1];
    if (isPrismaKeyword(name)) continue;
    // Include fields are relations - mark as such
    if (!fields.has(name)) fields.set(name, { type: 'String?', source: `relation:${file}` });
  }
}

function extractFieldsFromCountWhere(content: string, file: string, prismaName: string, fields: Map<string, any>) {
  const regex = new RegExp(`${prismaName}\\.count\\s*\\(\\s*\\{[^}]*where\\s*:\\s*\\{([^}]*)`, 's');
  const m = content.match(regex);
  if (!m) return;
  const block = m[1];
  const fieldMatches = block.matchAll(/(\w+)\s*:/g);
  for (const fm of fieldMatches) {
    const name = fm[1];
    if (isPrismaKeyword(name)) continue;
    if (!fields.has(name)) fields.set(name, { type: 'String?', source: file });
  }
}

function isPrismaKeyword(name: string): boolean {
  return ['AND', 'OR', 'NOT', 'in', 'contains', 'startsWith', 'endsWith', 'gt', 'gte', 'lt', 'lte', 'equals', 'not', 'mode', 'some', 'every', 'none', 'is', 'asc', 'desc', 'data', 'where', 'select', 'include', 'orderBy', 'skip', 'take', 'create', 'update', 'connect', 'disconnect', 'set', 'delete', 'push', 'increment', 'decrement', 'multiply'].includes(name);
}

function guessType(val: string): string {
  const v = val.trim();
  if (v.startsWith("'") || v.startsWith('"') || v.startsWith('`')) return 'String';
  if (v === 'true' || v === 'false') return 'Boolean';
  if (v.match(/^\d+$/)) return 'Int';
  if (v.match(/^\d+\.\d+$/)) return 'Float';
  if (v.startsWith('[') || v.startsWith('{')) return 'String @default("[]")';
  if (v.includes('Date') || v.includes('now()')) return 'DateTime @default(now())';
  if (v.startsWith('cuid()')) return 'String @default(cuid())';
  return 'String';
}

function addModelToSchema(modelName: string, definition: string) {
  try {
    let schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

    // Check if model already exists
    if (schema.includes(`model ${modelName} `)) {
      return NextResponse.json({ success: false, error: `Model ${modelName} already exists in schema` });
    }

    // Append model at the end
    schema = schema.trimEnd() + '\n\n' + definition + '\n';
    fs.writeFileSync(SCHEMA_PATH, schema);

    return NextResponse.json({ success: true, message: `Added model ${modelName} to schema` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
