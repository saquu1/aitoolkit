import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Types
interface ModelRelation {
  modelName: string;
  relationName: string;
  relationType: string;
  referencedModel: string;
}

interface SchemaAnalysis {
  models: Map<string, ModelRelation[]>;
  rawContent: string;
}

interface CodeMismatch {
  file: string;
  line: number;
  modelUsed: string;
  relationUsed: string;
  correctRelation: string;
  code: string;
}

interface FixResult {
  file: string;
  fixed: boolean;
  changes: Array<{
    oldRelation: string;
    newRelation: string;
    line: number;
  }>;
  error?: string;
}

/**
 * Parse Prisma schema to extract model relations
 */
function parsePrismaSchema(schemaPath: string): SchemaAnalysis {
  const content = fs.readFileSync(schemaPath, 'utf-8');
  const models = new Map<string, ModelRelation[]>();
  
  // Regex to match model blocks
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let modelMatch;
  
  while ((modelMatch = modelRegex.exec(content)) !== null) {
    const modelName = modelMatch[1];
    const modelBody = modelMatch[2];
    const relations: ModelRelation[] = [];
    
    // Find relation fields (fields with @relation or array types pointing to other models)
    const lines = modelBody.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (!trimmedLine || trimmedLine.startsWith('//')) continue;
      
      // Match relation fields like:
      // - `ToolkitFile ToolkitFile[]`
      // - `user User @relation(fields: [userId], references: [id])`
      // - `posts Post[]`
      
      // Pattern 1: Array relations (one-to-many)
      const arrayRelationMatch = trimmedLine.match(/^(\w+)\s+(\w+)\s*\[\s*\](?:\s*@relation\([^)]+\))?/);
      if (arrayRelationMatch) {
        const relationName = arrayRelationMatch[1];
        const referencedModel = arrayRelationMatch[2];
        relations.push({
          modelName,
          relationName,
          relationType: 'one-to-many',
          referencedModel
        });
        continue;
      }
      
      // Pattern 2: Single relations with @relation
      const singleRelationMatch = trimmedLine.match(/^(\w+)\s+(\w+)(?:\?)?\s*@relation\(([^)]+)\)/);
      if (singleRelationMatch) {
        const relationName = singleRelationMatch[1];
        const referencedModel = singleRelationMatch[2];
        relations.push({
          modelName,
          relationName,
          relationType: 'many-to-one',
          referencedModel
        });
        continue;
      }
      
      // Pattern 3: Simple reference fields (without explicit @relation but referencing another model)
      const simpleRefMatch = trimmedLine.match(/^(\w+)\s+(\w+)(?:\?)?\s+@relation/);
      if (simpleRefMatch) {
        const relationName = simpleRefMatch[1];
        const referencedModel = simpleRefMatch[2];
        relations.push({
          modelName,
          relationName,
          relationType: 'reference',
          referencedModel
        });
      }
    }
    
    if (relations.length > 0) {
      models.set(modelName, relations);
    }
  }
  
  return { models, rawContent: content };
}

/**
 * Get all TypeScript/JavaScript files in a directory recursively
 */
function getAllTsFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        getAllTsFiles(fullPath, files);
      }
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Check if a line is a comment
 */
function isComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
}

/**
 * Scan code files for Prisma relation usage mismatches
 */
function scanForMismatches(
  codeFiles: string[],
  schemaAnalysis: SchemaAnalysis
): CodeMismatch[] {
  const mismatches: CodeMismatch[] = [];
  
  // Build a map of all relation names by model
  const relationMap = new Map<string, Map<string, string>>();
  for (const [modelName, relations] of schemaAnalysis.models) {
    const relMap = new Map<string, string>();
    for (const rel of relations) {
      relMap.set(rel.relationName, rel.referencedModel);
    }
    relationMap.set(modelName, relMap);
  }
  
  // Direct mapping from old naming patterns to correct relation names
  // Based on actual Prisma schema relations
  const oldToNewMapping: Record<string, Record<string, string>> = {
    'ToolkitProject': {
      'files': 'ToolkitFile',
      'tables': 'ToolkitTable',
      'procedures': 'ToolkitProcedure',
      'cshtmlViews': 'CSHTMLAnalysisCache',
      'views': 'ViewIntelligenceCache',
      'sps': 'ToolkitProcedure',
      'storedProcedures': 'ToolkitProcedure',
      'discoveredTables': 'DiscoveredTableCache',
      'storedProcedureCache': 'StoredProcedureCache',
    }
    // Add more models as needed
  };
  
  // Get the directory of this file to exclude it from scanning
  const thisFilePath = __filename || '';
  
  for (const filePath of codeFiles) {
    // Skip this file itself (schema-relation-sync/route.ts)
    if (filePath.includes('schema-relation-sync')) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Skip comment lines
        if (isComment(line)) {
          return;
        }
        
        // Look for Prisma include/select patterns
        // e.g., include: { files: true } or select: { tables: true }
        
        // Match patterns like: model: { include: { relationName: ... } }
        const includeMatch = line.match(/include:\s*\{([^}]+)\}/);
        const selectMatch = line.match(/select:\s*\{([^}]+)\}/);
        
        const checkRelationUsage = (relationsStr: string, modelHint?: string) => {
          // Extract relation names used in the code
          const usedRelations = relationsStr.match(/(\w+)\s*:/g);
          if (!usedRelations) return;
          
          for (const relMatch of usedRelations) {
            const relationUsed = relMatch.replace(':', '').trim();
            
            // Check against known old naming patterns
            for (const [modelName, oldToNew] of Object.entries(oldToNewMapping)) {
              if (relationUsed in oldToNew) {
                const correctRelation = oldToNew[relationUsed];
                
                // Verify the correct relation exists in the schema
                const modelRelations = relationMap.get(modelName);
                if (modelRelations && modelRelations.has(correctRelation)) {
                  mismatches.push({
                    file: filePath,
                    line: index + 1,
                    modelUsed: modelName,
                    relationUsed,
                    correctRelation,
                    code: line.trim()
                  });
                }
              }
            }
          }
        };
        
        if (includeMatch) {
          checkRelationUsage(includeMatch[1]);
        }
        if (selectMatch) {
          checkRelationUsage(selectMatch[1]);
        }
      });
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  return mismatches;
}

/**
 * Auto-fix relation name mismatches in code files
 */
function fixMismatches(mismatches: CodeMismatch[]): FixResult[] {
  const results: FixResult[] = [];
  const fileChanges = new Map<string, Array<{ oldRelation: string; newRelation: string; line: number }>>();
  
  // Group changes by file
  for (const mismatch of mismatches) {
    if (!fileChanges.has(mismatch.file)) {
      fileChanges.set(mismatch.file, []);
    }
    fileChanges.get(mismatch.file)!.push({
      oldRelation: mismatch.oldRelation,
      newRelation: mismatch.correctRelation,
      line: mismatch.line
    });
  }
  
  // Apply fixes to each file
  for (const [filePath, changes] of fileChanges) {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      let fixed = false;
      const appliedChanges: Array<{ oldRelation: string; newRelation: string; line: number }> = [];
      
      for (const change of changes) {
        // Create regex to match the old relation name in context
        // Match patterns like: relationName: true, relationName: { ... }
        // But NOT in comments
        const lines = content.split('\n');
        const newLines = lines.map((line, idx) => {
          // Skip comment lines
          if (isComment(line)) {
            return line;
          }
          
          // Replace the relation name
          const oldPattern = new RegExp(`(\\b)${change.oldRelation}(\\s*:)`, 'g');
          const newLine = line.replace(oldPattern, `$1${change.newRelation}$2`);
          if (newLine !== line) {
            return newLine;
          }
          return line;
        });
        
        const newContent = newLines.join('\n');
        if (newContent !== content) {
          content = newContent;
          fixed = true;
          appliedChanges.push(change);
        }
      }
      
      if (fixed) {
        fs.writeFileSync(filePath, content, 'utf-8');
      }
      
      results.push({
        file: filePath,
        fixed,
        changes: appliedChanges
      });
    } catch (error) {
      results.push({
        file: filePath,
        fixed: false,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}

/**
 * GET - Analyze schema and detect mismatches
 */
export async function GET(request: NextRequest) {
  try {
    const projectRoot = process.cwd();
    const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
    
    // Check if schema exists
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json({
        success: false,
        error: 'Prisma schema not found',
        path: schemaPath
      }, { status: 404 });
    }
    
    // Parse schema
    const schemaAnalysis = parsePrismaSchema(schemaPath);
    
    // Get all code files
    const apiDir = path.join(projectRoot, 'src', 'app', 'api');
    const codeFiles = fs.existsSync(apiDir) ? getAllTsFiles(apiDir) : [];
    
    // Scan for mismatches
    const mismatches = scanForMismatches(codeFiles, schemaAnalysis);
    
    // Build model relations summary
    const modelRelationsSummary: Record<string, string[]> = {};
    for (const [modelName, relations] of schemaAnalysis.models) {
      modelRelationsSummary[modelName] = relations.map(r => `${r.relationName}: ${r.relationType} -> ${r.referencedModel}`);
    }
    
    return NextResponse.json({
      success: true,
      schema: {
        path: schemaPath,
        modelCount: schemaAnalysis.models.size,
        relations: modelRelationsSummary
      },
      codeFiles: codeFiles.length,
      mismatches,
      mismatchCount: mismatches.length,
      canAutoFix: mismatches.length > 0
    });
  } catch (error) {
    console.error('Schema relation sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST - Auto-fix detected mismatches
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { dryRun = false } = body;
    
    const projectRoot = process.cwd();
    const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
    
    // Check if schema exists
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json({
        success: false,
        error: 'Prisma schema not found'
      }, { status: 404 });
    }
    
    // Parse schema
    const schemaAnalysis = parsePrismaSchema(schemaPath);
    
    // Get all code files
    const apiDir = path.join(projectRoot, 'src', 'app', 'api');
    const codeFiles = fs.existsSync(apiDir) ? getAllTsFiles(apiDir) : [];
    
    // Scan for mismatches
    const mismatches = scanForMismatches(codeFiles, schemaAnalysis);
    
    if (mismatches.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No mismatches found to fix',
        mismatches: [],
        fixResults: []
      });
    }
    
    // If dry run, just return what would be fixed
    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: 'Dry run - no changes made',
        wouldFix: mismatches,
        fileCount: new Set(mismatches.map(m => m.file)).size
      });
    }
    
    // Apply fixes
    const fixResults = fixMismatches(mismatches);
    
    const successCount = fixResults.filter(r => r.fixed).length;
    const failCount = fixResults.filter(r => !r.fixed).length;
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${successCount} file(s), ${failCount} failed`,
      mismatches,
      fixResults,
      summary: {
        totalMismatches: mismatches.length,
        filesFixed: successCount,
        filesFailed: failCount
      }
    });
  } catch (error) {
    console.error('Schema relation fix error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
