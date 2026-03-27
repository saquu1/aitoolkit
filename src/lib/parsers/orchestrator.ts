// =============================================================================
// Intelligence Orchestrator - Coordinates All Parsers and Agents
// =============================================================================
// Central orchestrator that runs all parsers, cross-references results,
// and produces a complete system intelligence map
// =============================================================================

import { parseSQL } from '../sql-parser';
import { CSHTMLParser } from '../cshtml-parser';
import { fileClassifier, FileClassification } from './file-classifier';
import { jsParser, JSIntelligenceResult } from './js-parser';
import { workflowBuilder } from './workflow-builder';
import { SPParserEngine, SPIntelligenceResult } from '../sp-parser';
import {
  TableDef,
  StoredProcedureDef,
  ParseResult,
  SystemParseResult,
  FileClassificationInfo,
  DiscoveredAjaxEndpoint,
  WorkflowSummary,
  PageTableMapping,
  SPTableMapping,
  DiscoveredTableInfo,
  SystemParseStats,
  DependencySummary,
} from '../types';

/**
 * Orchestrator options
 */
export interface OrchestratorOptions {
  parseSQL: boolean;
  parseCSHTML: boolean;
  parseJS: boolean;
  parseSP: boolean;
  buildWorkflows: boolean;
  crossReference: boolean;
  verbose: boolean;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: OrchestratorOptions = {
  parseSQL: true,
  parseCSHTML: true,
  parseJS: true,
  parseSP: true,
  buildWorkflows: true,
  crossReference: true,
  verbose: false,
};

/**
 * Intelligence Orchestrator
 */
export class IntelligenceOrchestrator {
  private options: OrchestratorOptions;
  private startTime: number = 0;
  
  // Results storage
  private sqlResult: ParseResult | null = null;
  private spResults: SPIntelligenceResult[] = [];
  private jsResults: JSIntelligenceResult[] = [];
  private cshtmlResults: any[] = [];
  private fileClassifications: FileClassification[] = [];
  
  // Cross-reference maps
  private pageTableMap: PageTableMapping[] = [];
  private spTableMap: SPTableMapping[] = [];
  private discoveredTables: DiscoveredTableInfo[] = [];

  constructor(options: Partial<OrchestratorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Process multiple files of different types
   */
  async processFiles(
    files: Array<{ name: string; content: string }>
  ): Promise<SystemParseResult> {
    this.startTime = Date.now();
    
    // Step 1: Classify all files
    this.fileClassifications = fileClassifier.classifyBatch(files);
    
    if (this.options.verbose) {
      console.log('File classifications:', this.fileClassifications);
    }
    
    // Step 2: Route files to appropriate parsers
    const sqlFiles = this.filterFiles(files, 'sql');
    const cshtmlFiles = this.filterFiles(files, 'cshtml');
    const jsFiles = this.filterFiles(files, 'js');
    
    // Step 3: Parse SQL
    if (this.options.parseSQL && sqlFiles.length > 0) {
      const combinedSQL = sqlFiles.map(f => f.content).join('\n\n');
      this.sqlResult = parseSQL(combinedSQL);
    }
    
    // Step 4: Parse Stored Procedures
    if (this.options.parseSP && this.sqlResult?.storedProcedures.length) {
      const spParser = new SPParserEngine(this.sqlResult.tables);
      this.spResults = spParser.analyzeProcedures(this.sqlResult.storedProcedures);
    }
    
    // Step 5: Parse JavaScript
    if (this.options.parseJS && jsFiles.length > 0) {
      for (const file of jsFiles) {
        const result = jsParser.analyze(file.content, file.name);
        this.jsResults.push(result);
      }
    }
    
    // Step 6: Parse CSHTML
    if (this.options.parseCSHTML && cshtmlFiles.length > 0) {
      for (const file of cshtmlFiles) {
        const parser = new CSHTMLParser(file.content);
        const result = parser.parse();
        this.cshtmlResults.push({ ...result, fileName: file.name });
      }
    }
    
    // Step 7: Build cross-references
    if (this.options.crossReference) {
      this.buildCrossReferences();
    }
    
    // Step 8: Build workflows
    let workflows: WorkflowSummary[] = [];
    if (this.options.buildWorkflows && this.spResults.length > 0) {
      const workflowDefs = workflowBuilder.buildWorkflows(this.spResults);
      workflows = workflowDefs.map(wf => ({
        name: wf.name,
        module: wf.module,
        steps: wf.totalSteps,
        sourceSPs: wf.steps.filter(s => s.spName).map(s => s.spName!),
        complexity: wf.complexity,
      }));
    }
    
    // Build final result
    return this.buildResult(workflows);
  }

  /**
   * Filter files by type
   */
  private filterFiles(
    files: Array<{ name: string; content: string }>,
    extension: string
  ): Array<{ name: string; content: string }> {
    return files.filter(f => f.name.toLowerCase().endsWith(`.${extension}`));
  }

  /**
   * Build cross-references between pages, SPs, and tables
   */
  private buildCrossReferences(): void {
    // Build page -> table mappings from CSHTML
    const tables = this.sqlResult?.tables || [];
    const tableNames = new Set(tables.map(t => t.tableName.toLowerCase()));
    
    for (const cshtml of this.cshtmlResults) {
      // Extract table references from CSHTML
      const fields = cshtml.fields || [];
      const modelName = cshtml.model?.linkedTable;
      
      if (modelName && tableNames.has(modelName.toLowerCase())) {
        this.pageTableMap.push({
          pageName: cshtml.viewName,
          tableName: modelName,
          fields: fields.map((f: any) => f.name),
          operations: ['create', 'read', 'update'],
          confidence: 90,
        });
      }
      
      // Check dropdown sources
      for (const field of fields) {
        if (field.dropdownSource) {
          const tableName = this.inferTableFromDropdown(field.dropdownSource);
          if (tableName && !tableNames.has(tableName.toLowerCase())) {
            this.discoveredTables.push({
              tableName,
              discoveredIn: cshtml.fileName,
              columns: ['Id', 'Name'],
              suggestedModule: this.suggestModule(tableName),
            });
          }
        }
      }
    }
    
    // Build SP -> table mappings
    for (const sp of this.spResults) {
      this.spTableMap.push({
        spName: sp.procedureName,
        tables: sp.tablesReferenced.map(t => t.tableName),
        operations: sp.writeOperations.map(o => o.type),
      });
      
      // Find discovered tables from SPs
      for (const discovered of sp.discoveredTables) {
        const exists = this.discoveredTables.some(
          dt => dt.tableName.toLowerCase() === discovered.tableName.toLowerCase()
        );
        
        if (!exists) {
          this.discoveredTables.push({
            tableName: discovered.tableName,
            discoveredIn: sp.procedureName,
            columns: discovered.columns,
            suggestedModule: discovered.suggestedModule,
          });
        }
      }
    }
  }

  /**
   * Infer table name from dropdown source
   */
  private inferTableFromDropdown(source: string): string | null {
    // ViewBag.CategoryList -> Categories
    // DDLManager.GetOrganizationTypesDDL() -> OrganizationTypes
    const match = source.match(/(?:ViewBag\.|ViewData\.|DDLManager\.Get)(\w+)/i);
    if (match) {
      let name = match[1];
      if (name.endsWith('List')) {
        name = name.slice(0, -4);
      }
      if (name.endsWith('DDL')) {
        name = name.slice(0, -3);
      }
      return this.pluralize(name);
    }
    return null;
  }

  /**
   * Pluralize a word
   */
  private pluralize(word: string): string {
    if (word.endsWith('y')) {
      return word.slice(0, -1) + 'ies';
    } else if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
      return word + 'es';
    }
    return word + 's';
  }

  /**
   * Suggest module for table
   */
  private suggestModule(tableName: string): string {
    const moduleKeywords: Record<string, string[]> = {
      'Patient': ['patient', 'mrn', 'demographic'],
      'Appointment': ['appointment', 'schedule', 'booking'],
      'Billing': ['billing', 'invoice', 'payment', 'charge'],
      'Pharmacy': ['pharmacy', 'medication', 'drug', 'prescription'],
      'Laboratory': ['lab', 'test', 'specimen', 'result'],
      'Radiology': ['radiology', 'imaging', 'xray', 'scan'],
      'HR': ['employee', 'staff', 'payroll', 'attendance'],
      'Inventory': ['inventory', 'stock', 'item', 'supply'],
    };
    
    const tableLower = tableName.toLowerCase();
    
    for (const [module, keywords] of Object.entries(moduleKeywords)) {
      if (keywords.some(kw => tableLower.includes(kw))) {
        return module;
      }
    }
    
    return 'Core';
  }

  /**
   * Build final result
   */
  private buildResult(workflows: WorkflowSummary[]): SystemParseResult {
    const parseTimeMs = Date.now() - this.startTime;
    
    // Build AJAX endpoints from JS results
    const ajaxCalls: DiscoveredAjaxEndpoint[] = [];
    for (const js of this.jsResults) {
      for (const call of js.ajaxCalls) {
        ajaxCalls.push({
          url: call.url,
          method: call.method,
          sourceFile: call.sourceFile,
          parameters: call.parameters.map(p => p.name),
        });
      }
    }
    
    // Build dependency summary
    const dependencies: DependencySummary = {
      jsLibraries: [],
      cssFrameworks: [],
      requiredTables: [],
      missingTables: this.discoveredTables.map(dt => dt.tableName),
    };
    
    for (const js of this.jsResults) {
      dependencies.jsLibraries.push(...js.jqueryPlugins);
      dependencies.jsLibraries.push(...js.dependencies.map(d => d.name));
    }
    dependencies.jsLibraries = [...new Set(dependencies.jsLibraries)];
    
    // Build statistics
    const statistics: SystemParseStats = {
      totalFiles: this.fileClassifications.length,
      totalTables: this.sqlResult?.tables.length || 0,
      totalSPs: this.sqlResult?.storedProcedures.length || 0,
      totalPages: this.cshtmlResults.length,
      totalWorkflows: workflows.length,
      totalEndpoints: ajaxCalls.length,
      discoveredTables: this.discoveredTables.length,
      parseTimeMs,
    };
    
    return {
      tables: this.sqlResult?.tables || [],
      storedProcedures: this.sqlResult?.storedProcedures || [],
      insertStatements: this.sqlResult?.insertStatements || [],
      fileClassifications: this.fileClassifications.map(fc => ({
        fileName: fc.fileName,
        fileType: fc.fileType,
        language: fc.language,
        framework: fc.framework,
        confidence: fc.confidence,
        parser: fc.suggestedParser,
      })),
      ajaxCalls,
      workflows,
      pageToTableMappings: this.pageTableMap,
      spToTableMappings: this.spTableMap,
      discoveredTables: this.discoveredTables,
      statistics,
    };
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(result: SystemParseResult): string {
    const lines: string[] = [];
    
    lines.push('# System Intelligence Report');
    lines.push('');
    lines.push(`**Generated in ${result.statistics.parseTimeMs}ms**`);
    lines.push('');
    
    lines.push('## Files Processed');
    lines.push(`- Total Files: ${result.statistics.totalFiles}`);
    lines.push(`- SQL Files: ${result.fileClassifications.filter(f => f.fileType.startsWith('sql')).length}`);
    lines.push(`- CSHTML Files: ${result.statistics.totalPages}`);
    lines.push(`- JavaScript Files: ${result.fileClassifications.filter(f => f.fileType === 'javascript').length}`);
    lines.push('');
    
    lines.push('## Database Schema');
    lines.push(`- Tables Parsed: ${result.statistics.totalTables}`);
    lines.push(`- Stored Procedures: ${result.statistics.totalSPs}`);
    lines.push(`- Discovered Tables: ${result.statistics.discoveredTables}`);
    lines.push('');
    
    if (result.discoveredTables.length > 0) {
      lines.push('### Missing Tables (discovered but not uploaded)');
      for (const dt of result.discoveredTables) {
        lines.push(`- **${dt.tableName}** (found in ${dt.discoveredIn})`);
      }
      lines.push('');
    }
    
    lines.push('## Intelligence Extracted');
    lines.push(`- Workflows Detected: ${result.statistics.totalWorkflows}`);
    lines.push(`- API Endpoints: ${result.statistics.totalEndpoints}`);
    lines.push(`- Page-Table Mappings: ${result.pageToTableMappings.length}`);
    lines.push('');
    
    if (result.workflows.length > 0) {
      lines.push('### Detected Workflows');
      for (const wf of result.workflows) {
        lines.push(`- **${wf.name}** (${wf.module}) - ${wf.steps} steps - ${wf.complexity}`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }
}

// Export singleton factory
export function createOrchestrator(options?: Partial<OrchestratorOptions>): IntelligenceOrchestrator {
  return new IntelligenceOrchestrator(options);
}

// Default instance
export const orchestrator = new IntelligenceOrchestrator();
