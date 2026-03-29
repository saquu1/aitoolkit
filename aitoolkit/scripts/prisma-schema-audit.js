#!/usr/bin/env node
/**
 * Prisma Schema-Code Desync Scanner
 * ===================================
 * Scans ALL API routes and lib files for Prisma client usage,
 * compares against the schema.prisma definitions, and produces
 * an actionable fix list of all mismatches.
 *
 * Categories of issues found:
 * 1. Missing models - code references a model that doesn't exist in schema
 * 2. Missing fields - code references a field that doesn't exist on a model
 * 3. Wrong field casing - code uses different case than schema definition
 * 4. Missing relations - include/select references a relation not in schema
 * 5. Relation name mismatches - include uses wrong relation field name
 *
 * Usage: node scripts/prisma-schema-audit.js
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(PROJECT_ROOT, 'prisma', 'schema.prisma');
const SCAN_DIRS = [
  path.join(PROJECT_ROOT, 'src', 'app', 'api'),
  path.join(PROJECT_ROOT, 'src', 'lib'),
];

// Colors for terminal output
const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

// ─── Schema Parser ────────────────────────────────────────────────

function parseSchema(schemaPath) {
  const content = fs.readFileSync(schemaPath, 'utf-8');
  const models = {};
  
  // Match each model block
  const modelRegex = /model\s+(\w+)\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
  let match;
  
  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const fields = {};
    const relations = {};
    
    // Parse fields - handle arrays like String[] and types with @relation
    const fieldRegex = /^\s+(\w+)\s+(\w+(?:\[\])?)\s*(.*)$/gm;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const rest = fieldMatch[3];
      
      // Skip directive-only lines like @@index, @@unique
      if (fieldName.startsWith('@@') || fieldName.startsWith('//')) continue;
      
      fields[fieldName] = fieldType;
      
      // Check if this field has a relation
      if (rest.includes('@relation')) {
        // Extract relation name if present: @relation("name", ...)
        const namedRelMatch = rest.match(/@relation\s*\(\s*"([^"]+)"/);
        const relationName = namedRelMatch ? namedRelMatch[1] : fieldName;
        relations[fieldName] = {
          type: fieldType.replace('[]', '?').replace('?', ''),
          name: relationName,
        };
      }
      
      // Also check for implicit relations (type matches another model name, no @relation)
      // e.g. `Room Room[]` or `Building Building`
      if (!rest.includes('@relation') && !['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes'].includes(fieldType.replace('[]', '').replace('?', ''))) {
        relations[fieldName] = {
          type: fieldType.replace('[]', '?').replace('?', ''),
          name: fieldName,
        };
      }
    }
    
    models[modelName] = { fields, relations };
  }
  
  return models;
}

// ─── File Scanner ─────────────────────────────────────────────────

function getAllFilesToScan(dirs) {
  const files = [];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    
    function walk(d) {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    }
    walk(dir);
  }
  
  return files;
}

/**
 * Extract Prisma usage patterns from a file.
 * Returns array of { model, field, context, line, type }
 * type: 'findMany', 'findFirst', 'findUnique', 'create', 'update', 'delete',
 *       'upsert', 'count', 'aggregate', 'groupBy', 'include', 'select', 'where', 'orderBy'
 */
function extractPrismaUsage(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const findings = [];
  
  // Pattern 1: prisma.ModelName.method({...})
  // Pattern 2: prisma.ModelName.method({ where: { field: ... } })
  // Pattern 3: include: { relationName: ... }
  // Pattern 4: select: { field: true/false }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Match prisma.ModelName.method
    const prismaCallMatch = line.match(/prisma\.(\w+)\.(findMany|findFirst|findUnique|create|createMany|update|updateMany|delete|deleteMany|upsert|count|aggregate|groupBy)/);
    if (prismaCallMatch) {
      findings.push({
        model: prismaCallMatch[1],
        method: prismaCallMatch[2],
        context: line.trim(),
        line: lineNum,
        filePath,
        type: 'model_access',
      });
    }
    
    // Match cvDb.ModelName.method (contract-validator-db proxy)
    const cvDbMatch = line.match(/cvDb\.(\w+)\.(findMany|findFirst|findUnique|create|createMany|update|updateMany|delete|deleteMany|upsert|count|aggregate|groupBy)/);
    if (cvDbMatch) {
      findings.push({
        model: cvDbMatch[1],
        method: cvDbMatch[2],
        context: line.trim(),
        line: lineNum,
        filePath,
        type: 'model_access',
        client: 'cvDb',
      });
    }
    
    // Match prisma.ModelName.count
    const countMatch = line.match(/prisma\.(\w+)\.count\(/);
    if (countMatch) {
      findings.push({
        model: countMatch[1],
        method: 'count',
        context: line.trim(),
        line: lineNum,
        filePath,
        type: 'model_access',
      });
    }
  }
  
  // Pattern 2: Extract include/select/relation references from multi-line objects
  // We need to parse the file as a whole to understand multi-line structures
  extractRelationReferences(content, filePath, findings);
  extractFieldReferences(content, filePath, findings);
  
  return findings;
}

/**
 * Extract include: { modelName: ... } references
 */
function extractRelationReferences(content, filePath, findings) {
  // Match include blocks
  const includeRegex = /include:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
  let match;
  
  while ((match = includeRegex.exec(content)) !== null) {
    const block = match[1];
    const startPos = match.index;
    const lineNum = content.substring(0, startPos).split('\n').length;
    
    // Extract relation names (could be nested)
    const relNames = block.match(/^\s*(\w+)/gm);
    if (relNames) {
      for (const relName of relNames) {
        const clean = relName.trim();
        if (clean && !['select', 'include', 'where', 'orderBy', 'skip', 'take'].includes(clean)) {
          findings.push({
            relation: clean,
            context: `include: { ${clean}: ... }`,
            line: lineNum,
            filePath,
            type: 'include_relation',
          });
        }
      }
    }
  }
  
  // Also match include: { model: { select: ... } } deeply nested
  // And relation names inside nested objects
  const nestedIncludeRegex = /(\w+):\s*\{\s*(?:select|include)\s*:/g;
  while ((match = nestedIncludeRegex.exec(content)) !== null) {
    const relName = match[1];
    const startPos = match.index;
    const lineNum = content.substring(0, startPos).split('\n').length;
    
    if (!['select', 'include', 'where', 'orderBy', 'data', 'skip', 'take', 'create', 'update', 'connect', 'disconnect', 'set', 'delete', 'push'].includes(relName)) {
      findings.push({
        relation: relName,
        context: `${relName}: { select/include: ... }`,
        line: lineNum,
        filePath,
        type: 'nested_relation',
      });
    }
  }
}

/**
 * Extract where: { field: ... } and orderBy: { field: ... } references
 */
function extractFieldReferences(content, filePath, findings) {
  // Match where: { field: ... } and orderBy: { field: ... }
  // We look for field references after where/orderBy keywords
  const fieldContexts = [
    { keyword: 'where', pattern: /where:\s*\{/g },
    { keyword: 'orderBy', pattern: /orderBy:\s*[\[\{]/g },
  ];
  
  for (const ctx of fieldContexts) {
    let match;
    while ((match = ctx.pattern.exec(content)) !== null) {
      const startPos = match.index;
      const lineNum = content.substring(0, startPos).split('\n').length;
      
      // Extract the block content (up to matching closing brace)
      const block = extractBlock(content, match.index + match[0].length);
      if (!block) continue;
      
      // Extract field names from the block
      const fieldNames = block.match(/^\s*(\w+)\s*:/gm);
      if (fieldNames) {
        for (const f of fieldNames) {
          const clean = f.trim().replace(':', '');
          if (clean && !['AND', 'OR', 'NOT', 'in', 'contains', 'startsWith', 'endsWith', 'gt', 'gte', 'lt', 'lte', 'equals', 'not', 'mode', 'some', 'every', 'none', 'is', 'asc', 'desc'].includes(clean)) {
            findings.push({
              field: clean,
              context: `${ctx.keyword}: { ${clean}: ... }`,
              line: lineNum,
              filePath,
              type: 'field_reference',
            });
          }
        }
      }
    }
  }
}

/**
 * Extract a balanced block starting from position, returns content between braces
 */
function extractBlock(content, startPos) {
  let depth = 0;
  let i = startPos;
  
  // Skip whitespace
  while (i < content.length && /\s/.test(content[i])) i++;
  
  if (i >= content.length || content[i] !== '{') return null;
  
  let start = i;
  while (i < content.length) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        return content.substring(start + 1, i);
      }
    }
    // Skip strings
    else if (content[i] === '"' || content[i] === "'" || content[i] === '`') {
      const quote = content[i];
      i++;
      while (i < content.length && content[i] !== quote) {
        if (content[i] === '\\') i++; // skip escaped chars
        i++;
      }
    }
    i++;
  }
  
  return content.substring(start + 1, Math.min(i, content.length));
}

// ─── Analyzer ─────────────────────────────────────────────────────

function analyzeUsage(findings, schema) {
  const issues = [];
  const modelNames = Object.keys(schema);
  const modelNamesLower = {};
  for (const m of modelNames) {
    modelNamesLower[m.toLowerCase()] = m;
  }
  
  for (const f of findings) {
    const relPath = path.relative(PROJECT_ROOT, f.filePath);
    
    // Check model access
    if (f.type === 'model_access') {
      // 1. Check if model exists
      if (!schema[f.model]) {
        // Check case-insensitive match
        if (modelNamesLower[f.model.toLowerCase()]) {
          const correctName = modelNamesLower[f.model.toLowerCase()];
          issues.push({
            severity: 'HIGH',
            category: 'WRONG_MODEL_CASE',
            file: relPath,
            line: f.line,
            detail: `Code uses prisma.${f.model} but schema has model ${correctName}`,
            fix: `Change prisma.${f.model} → prisma.${correctName}`,
            code: f.context,
          });
        } else {
          issues.push({
            severity: 'CRITICAL',
            category: 'MISSING_MODEL',
            file: relPath,
            line: f.line,
            detail: `Code references model "${f.model}" which does NOT exist in schema`,
            fix: `Add model ${f.model} to schema.prisma OR fix the model name in code`,
            code: f.context,
          });
        }
      }
    }
    
    // Check include relations - need to find the nearest model context
    if (f.type === 'include_relation' || f.type === 'nested_relation') {
      // Find the nearest prisma.ModelName call above this line
      // We need to re-read the file to find the model context
      const fileContent = fs.readFileSync(f.filePath, 'utf-8');
      const fileLines = fileContent.split('\n');
      
      // Look backward from this line to find prisma.ModelName.method
      let contextModel = null;
      for (let j = f.line - 2; j >= Math.max(0, f.line - 30); j--) {
        const lineMatch = fileLines[j] && fileLines[j].match(/(?:prisma|cvDb)\.(\w+)\.(?:findMany|findFirst|findUnique|create|update|delete|upsert|count|aggregate|groupBy)/);
        if (lineMatch) {
          contextModel = lineMatch[1];
          break;
        }
        // Also check for prisma.ModelName.update etc in where clause
        const lineMatch2 = fileLines[j] && fileLines[j].match(/(?:prisma|cvDb)\.(\w+)\.\w+\(/);
        if (lineMatch2 && !contextModel) {
          contextModel = lineMatch2[1];
        }
      }
      
      if (contextModel && schema[contextModel]) {
        const model = schema[contextModel];
        const relName = f.relation;
        
        // Check if relation exists on this model
        if (!model.relations[relName] && !model.fields[relName]) {
          // Check case-insensitive
          const fieldKeys = Object.keys(model.fields);
          const relKeys = Object.keys(model.relations);
          const allKeys = [...fieldKeys, ...relKeys];
          const lowerMap = {};
          for (const k of allKeys) lowerMap[k.toLowerCase()] = k;
          
          if (lowerMap[relName.toLowerCase()]) {
            const correctName = lowerMap[relName.toLowerCase()];
            issues.push({
              severity: 'HIGH',
              category: 'WRONG_RELATION_CASE',
              file: relPath,
              line: f.line,
              detail: `In prisma.${contextModel}, include uses "${relName}" but schema has "${correctName}"`,
              fix: `Change include: { ${relName}: → ${correctName}: }`,
              code: f.context,
            });
          } else {
            issues.push({
              severity: 'HIGH',
              category: 'MISSING_RELATION',
              file: relPath,
              line: f.line,
              detail: `In prisma.${contextModel}, include references "${relName}" which is NOT a relation or field on this model`,
              fix: `Add relation ${relName} to model ${contextModel} in schema, or remove from include`,
              code: f.context,
            });
          }
        }
      }
    }
  }
  
  return issues;
}

// ─── Also scan for direct prisma.field references in lib files ────

function scanLibFilesForModelUsage(scanDirs, schema) {
  const issues = [];
  const modelNames = Object.keys(schema);
  
  // Build a map of field names per model for case-sensitive checking
  const modelFieldMap = {};
  for (const [model, data] of Object.entries(schema)) {
    modelFieldMap[model] = {};
    for (const [field, type] of Object.entries(data.fields)) {
      modelFieldMap[model][field.toLowerCase()] = field;
    }
  }
  
  for (const dir of scanDirs) {
    if (!fs.existsSync(dir)) continue;
    
    const files = getAllFilesToScan([dir]);
    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relPath = path.relative(PROJECT_ROOT, filePath);
      
      // Find all prisma.ModelName accesses (any property after model name)
      const allModelRefs = content.matchAll(/(?:prisma|cvDb)\.(\w+)\.(\w+)/g);
      for (const ref of allModelRefs) {
        const modelName = ref[1];
        const property = ref[2];
        
        // Skip Prisma internal methods
        if (['findMany', 'findFirst', 'findUnique', 'create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert', 'count', 'aggregate', 'groupBy', 'fields'].includes(property)) {
          continue;
        }
        
        // This could be a wrong model name if the property is actually a known method
        // e.g., prisma.chatLog.findMany vs prisma.ChatLog.findMany
        if (modelNames.includes(property) && !modelNames.includes(modelName)) {
          // Likely swapped: should be prisma.Property.modelName
          const lineNum = content.substring(0, ref.index).split('\n').length;
          issues.push({
            severity: 'HIGH',
            category: 'SWAPPED_MODEL_METHOD',
            file: relPath,
            line: lineNum,
            detail: `prisma.${modelName}.${property} - "${property}" is a known model, "${modelName}" is not. Likely should be prisma.${property}.${modelName}`,
            fix: `Change prisma.${modelName}.${property} → prisma.${property}.${modelName}`,
            code: ref[0],
          });
        }
      }
      
      // Find all instances of .where({ fieldName: ... }) and .orderBy({ fieldName: ... }) 
      // that reference non-existent fields on the context model
      // This is a deeper check - find patterns where we can determine the model context
      
      // Pattern: prisma.ModelName.findMany({ where: { someField: value } })
      const queryPattern = /(?:prisma|cvDb)\.(\w+)\.\w+\(\s*\{[^}]*where:\s*\{([^}]*)\}/gs;
      let queryMatch;
      
      while ((queryMatch = queryPattern.exec(content)) !== null) {
        const modelName = queryMatch[1];
        const whereContent = queryMatch[2];
        const lineNum = content.substring(0, queryMatch.index).split('\n').length;
        
        if (!schema[modelName]) continue;
        
        const modelFields = schema[modelName].fields;
        const fieldRefs = whereContent.match(/(\w+)\s*:/g);
        if (fieldRefs) {
          for (const fRef of fieldRefs) {
            const cleanField = fRef.replace(':', '').trim();
            if (!modelFields[cleanField] && !['AND', 'OR', 'NOT', 'in', 'contains', 'startsWith', 'endsWith', 'gt', 'gte', 'lt', 'lte', 'equals', 'not', 'mode', 'some', 'every', 'none', 'is'].includes(cleanField)) {
              // Check case-insensitive
              const fieldKeys = Object.keys(modelFields);
              const lowerMap = {};
              for (const k of fieldKeys) lowerMap[k.toLowerCase()] = k;
              
              if (lowerMap[cleanField.toLowerCase()]) {
                const correct = lowerMap[cleanField.toLowerCase()];
                issues.push({
                  severity: 'MEDIUM',
                  category: 'WRONG_FIELD_CASE_IN_WHERE',
                  file: relPath,
                  line: lineNum,
                  detail: `In prisma.${modelName}.where, field "${cleanField}" should be "${correct}" (schema field)`,
                  fix: `Change where: { ${cleanField}: → ${correct}: }`,
                  code: `where: { ${cleanField}: ... }`,
                });
              } else {
                issues.push({
                  severity: 'MEDIUM',
                  category: 'MISSING_FIELD_IN_WHERE',
                  file: relPath,
                  line: lineNum,
                  detail: `In prisma.${modelName}.where, field "${cleanField}" does not exist on model ${modelName}`,
                  fix: `Check if field "${cleanField}" exists in schema model ${modelName}`,
                  code: `where: { ${cleanField}: ... }`,
                });
              }
            }
          }
        }
      }
    }
  }
  
  return issues;
}

// ─── Dedup & Sort ─────────────────────────────────────────────────

function dedupIssues(issues) {
  const seen = new Set();
  return issues.filter(i => {
    const key = `${i.file}:${i.line}:${i.category}:${i.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortBySeverity(issues) {
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return issues.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));
}

// ─── Report Generator ─────────────────────────────────────────────

function generateReport(schema, allIssues, findings) {
  const report = [];
  
  report.push('');
  report.push('═'.repeat(80));
  report.push(`${C.bold}${C.cyan}  PRISMA SCHEMA-CODE DESYNC AUDIT REPORT${C.reset}`);
  report.push(`${C.dim}  Generated: ${new Date().toISOString()}${C.reset}`);
  report.push('═'.repeat(80));
  report.push('');
  
  // Schema summary
  report.push(`${C.bold}SCHEMA SUMMARY${C.reset}`);
  report.push(`  Total models: ${Object.keys(schema).length}`);
  report.push(`  Files scanned: ${new Set(findings.map(f => f.filePath)).size}`);
  report.push(`  Total Prisma usages found: ${findings.length}`);
  report.push('');
  
  // Issue summary
  const critical = allIssues.filter(i => i.severity === 'CRITICAL').length;
  const high = allIssues.filter(i => i.severity === 'HIGH').length;
  const medium = allIssues.filter(i => i.severity === 'MEDIUM').length;
  const low = allIssues.filter(i => i.severity === 'LOW').length;
  
  report.push(`${C.bold}ISSUE SUMMARY${C.reset}`);
  report.push(`  ${C.red}${C.bold}CRITICAL:${C.reset} ${critical} (missing models - WILL cause 500 errors)`);
  report.push(`  ${C.red}${C.bold}HIGH:${C.reset}     ${high} (wrong casing/missing relations - WILL cause 500 errors)`);
  report.push(`  ${C.yellow}${C.bold}MEDIUM:${C.reset}   ${medium} (wrong field references in where/orderBy)`);
  report.push(`  ${C.green}${C.bold}LOW:${C.reset}      ${low}`);
  report.push('');
  
  // Group by category
  const categories = {};
  for (const issue of allIssues) {
    if (!categories[issue.category]) categories[issue.category] = [];
    categories[issue.category].push(issue);
  }
  
  // Show by category
  for (const [cat, catIssues] of Object.entries(categories)) {
    const sev = catIssues[0].severity;
    const color = sev === 'CRITICAL' ? C.red : sev === 'HIGH' ? C.red : C.yellow;
    
    report.push(`${color}${C.bold}━━━ ${cat} (${catIssues.length} issues) ━━━${C.reset}`);
    report.push('');
    
    for (const issue of catIssues) {
      report.push(`  ${C.dim}[${issue.severity}]${C.reset} ${C.bold}${issue.file}:${issue.line}${C.reset}`);
      report.push(`    ${issue.detail}`);
      report.push(`    ${C.green}FIX: ${issue.fix}${C.reset}`);
      report.push(`    Code: ${C.dim}${issue.code}${C.reset}`);
      report.push('');
    }
  }
  
  // Prioritized fix list
  report.push('');
  report.push(`${C.bold}${C.cyan}═══════════════════════════════════════════════════════════${C.reset}`);
  report.push(`${C.bold}${C.cyan}  PRIORITIZED FIX LIST (copy-paste actionable items)${C.reset}`);
  report.push(`${C.bold}${C.cyan}═══════════════════════════════════════════════════════════${C.reset}`);
  report.push('');
  
  if (allIssues.length === 0) {
    report.push(`  ${C.green}No schema-code desync issues found! All Prisma usage is consistent.${C.reset}`);
  } else {
    // Group fixes by file
    const fixesByFile = {};
    for (const issue of allIssues) {
      if (!fixesByFile[issue.file]) fixesByFile[issue.file] = [];
      fixesByFile[issue.file].push(issue);
    }
    
    let fixNum = 1;
    for (const [file, fileIssues] of Object.entries(fixesByFile)) {
      report.push(`${C.bold}File: ${file}${C.reset} (${fileIssues.length} issues)`);
      for (const issue of fileIssues) {
        report.push(`  ${C.yellow}[Fix #${fixNum}]${C.reset} Line ${issue.line}: ${issue.fix}`);
        fixNum++;
      }
      report.push('');
    }
  }
  
  // Statistics per file
  report.push('');
  report.push(`${C.bold}TOP FILES WITH MOST ISSUES:${C.reset}`);
  const fileCounts = {};
  for (const issue of allIssues) {
    fileCounts[issue.file] = (fileCounts[issue.file] || 0) + 1;
  }
  const sortedFiles = Object.entries(fileCounts).sort((a, b) => b[1] - a[1]);
  for (const [file, count] of sortedFiles.slice(0, 15)) {
    report.push(`  ${C.bold}${count}${C.reset} issues → ${file}`);
  }
  
  report.push('');
  report.push('═'.repeat(80));
  
  return report.join('\n');
}

// ─── JSON Report for programmatic use ─────────────────────────────

function generateJSONReport(schema, allIssues) {
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    schemaModelCount: Object.keys(schema).length,
    schemaModels: Object.keys(schema),
    totalIssues: allIssues.length,
    issuesBySeverity: {
      CRITICAL: allIssues.filter(i => i.severity === 'CRITICAL').length,
      HIGH: allIssues.filter(i => i.severity === 'HIGH').length,
      MEDIUM: allIssues.filter(i => i.severity === 'MEDIUM').length,
      LOW: allIssues.filter(i => i.severity === 'LOW').length,
    },
    issues: allIssues,
  }, null, 2);
}

// ─── Main ─────────────────────────────────────────────────────────

function main() {
  console.log(`\n${C.cyan}${C.bold}Prisma Schema-Code Desync Scanner${C.reset}`);
  console.log(`${C.dim}Schema: ${SCHEMA_PATH}${C.reset}\n`);
  
  // Step 1: Parse schema
  console.log(`${C.blue}[1/4] Parsing schema...${C.reset}`);
  const schema = parseSchema(SCHEMA_PATH);
  console.log(`  Found ${Object.keys(schema).length} models in schema`);
  
  // Step 2: Scan files
  console.log(`${C.blue}[2/4] Scanning source files...${C.reset}`);
  const files = getAllFilesToScan(SCAN_DIRS);
  console.log(`  Found ${files.length} TypeScript files to scan`);
  
  const allFindings = [];
  for (const file of files) {
    const findings = extractPrismaUsage(file);
    allFindings.push(...findings);
  }
  console.log(`  Found ${allFindings.length} Prisma usage points`);
  
  // Step 3: Analyze
  console.log(`${C.blue}[3/4] Analyzing for desync issues...${C.reset}`);
  let issues = analyzeUsage(allFindings, schema);
  const libIssues = scanLibFilesForModelUsage(SCAN_DIRS, schema);
  issues = issues.concat(libIssues);
  issues = dedupIssues(issues);
  issues = sortBySeverity(issues);
  
  // Step 4: Report
  console.log(`${C.blue}[4/4] Generating report...${C.reset}\n`);
  
  const textReport = generateReport(schema, issues, allFindings);
  console.log(textReport);
  
  // Save JSON report
  const jsonPath = path.join(PROJECT_ROOT, 'scripts', 'audit-results.json');
  fs.writeFileSync(jsonPath, generateJSONReport(schema, issues));
  console.log(`\n${C.dim}JSON report saved to: ${jsonPath}${C.reset}`);
  
  // Save text report
  const txtPath = path.join(PROJECT_ROOT, 'scripts', 'audit-results.txt');
  fs.writeFileSync(txtPath, textReport);
  console.log(`${C.dim}Text report saved to: ${txtPath}${C.reset}`);
  
  // Exit with error code if critical issues found
  const critical = issues.filter(i => i.severity === 'CRITICAL').length;
  const high = issues.filter(i => i.severity === 'HIGH').length;
  
  if (critical > 0 || high > 0) {
    console.log(`\n${C.red}${C.bold}⚠ FOUND ${critical} CRITICAL + ${high} HIGH issues that need fixing${C.reset}`);
  } else {
    console.log(`\n${C.green}${C.bold}✓ No critical or high-severity issues found${C.reset}`);
  }
  // Always exit 0 so caller can read the JSON report without catching an error
  process.exit(0);
}

main();
