// =============================================================================
// Smart Dependency Intelligence - CSHTML-First Workflow Engine
// =============================================================================
// This system reverses the traditional workflow: CSHTML files drive requirements,
// and the system intelligently guides users to upload only the needed SQL/DDL.
// =============================================================================

import { CSHTMLParser, ParsedCSHTMLView, ParsedFormField } from './cshtml-parser';
import { TableDef, ColumnDef, ForeignKeyDef, ParseResult } from './types';

// =============================================================================
// Core Types
// =============================================================================

/**
 * Database dependency extracted from CSHTML
 */
export interface DatabaseDependency {
  type: 'table' | 'column' | 'stored_procedure' | 'view' | 'fk_lookup';
  name: string;
  tableName?: string;
  columnName?: string;
  source: string;           // Which CSHTML file
  lineNumber?: number;
  confidence: number;       // 0-100 detection confidence
  context: string;          // How it was detected
  isRequired: boolean;      // Is this critical?
}

/**
 * Complete dependency map from all CSHTML files
 */
export interface DependencyMap {
  tables: TableDependency[];
  columns: ColumnDependency[];
  storedProcedures: SPDependency[];
  views: ViewDependency[];
  fkLookups: FKLookupDependency[];
  statistics: DependencyStats;
}

/**
 * Table dependency details
 */
export interface TableDependency {
  tableName: string;
  detectedName: string;      // Name as detected in CSHTML (may need mapping)
  columns: string[];         // Columns referenced
  operations: ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE')[];
  sources: string[];         // CSHTML files referencing this table
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'resolved' | 'partial' | 'missing';
  matchedTable?: TableDef;   // Linked to parsed table
  estimatedRows?: number;
}

/**
 * Column dependency details
 */
export interface ColumnDependency {
  tableName: string;
  columnName: string;
  usageType: 'display' | 'form_input' | 'filter' | 'sort' | 'hidden' | 'fk_reference';
  uiType?: string;           // Detected UI component type
  sources: string[];
  isRequired: boolean;
  status: 'resolved' | 'missing' | 'type_mismatch';
  matchedColumn?: ColumnDef;
}

/**
 * Stored procedure dependency
 */
export interface SPDependency {
  procedureName: string;
  parameters: string[];      // Parameters detected
  sources: string[];
  status: 'resolved' | 'missing';
  matchedSP?: any;
}

/**
 * View dependency
 */
export interface ViewDependency {
  viewName: string;
  sources: string[];
  status: 'resolved' | 'missing';
}

/**
 * FK Lookup dependency (dropdown data sources)
 */
export interface FKLookupDependency {
  sourceTable: string;       // Table that needs FK
  sourceColumn: string;      // Column with FK
  lookupTable: string;       // Referenced table
  displayColumn?: string;    // Display field (Name, Title, etc.)
  sources: string[];
  status: 'resolved' | 'missing';
  sampleValues?: string[];   // From ViewData/ViewBag
}

/**
 * Dependency statistics
 */
export interface DependencyStats {
  totalDependencies: number;
  resolvedCount: number;
  missingCount: number;
  partialCount: number;
  completionPercentage: number;
  criticalMissing: number;
  estimatedUploadTime: number;  // in seconds
}

/**
 * Missing dependency for UI display
 */
export interface MissingDependency {
  type: 'table' | 'column' | 'stored_procedure' | 'view' | 'fk_lookup';
  name: string;
  tableName?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: string;            // Human-readable impact description
  affectedViews: string[];   // Which CSHTML views need this
  resolutionOptions: ResolutionOption[];
  autoDetectedSuggestions: string[];
}

/**
 * Resolution option for missing dependency
 */
export interface ResolutionOption {
  type: 'upload_sql' | 'design_manual' | 'ai_generate' | 'skip';
  description: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  recommended: boolean;
}

/**
 * Smart upload workflow state
 */
export interface SmartUploadWorkflow {
  phase: 'cshtml_upload' | 'dependency_analysis' | 'guided_upload' | 'validation' | 'complete';
  cshtmlFiles: UploadedFile[];
  dependencyMap: DependencyMap | null;
  uploadedSQL: UploadedFile[];
  missingDependencies: MissingDependency[];
  resolutionQueue: ResolutionQueueItem[];
  progress: WorkflowProgress;
}

/**
 * Uploaded file tracking
 */
export interface UploadedFile {
  id: string;
  name: string;
  type: 'cshtml' | 'sql' | 'mixed';
  size: number;
  uploadedAt: Date;
  parseResult?: any;
}

/**
 * Resolution queue item
 */
export interface ResolutionQueueItem {
  id: string;
  dependency: MissingDependency;
  status: 'pending' | 'in_progress' | 'resolved' | 'skipped';
  selectedOption?: ResolutionOption;
  uploadedFile?: UploadedFile;
  generatedDDL?: string;
}

/**
 * Workflow progress tracking
 */
export interface WorkflowProgress {
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  percentage: number;
  estimatedTimeRemaining: number;  // in seconds
  messages: ProgressMessage[];
}

/**
 * Progress message
 */
export interface ProgressMessage {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  details?: string;
}

// =============================================================================
// CSHTML Dependency Extractor
// =============================================================================

export class CSHTMLDependencyExtractor {
  private dependencies: DatabaseDependency[] = [];

  /**
   * Extract all database dependencies from CSHTML content
   */
  extractDependencies(cshtmlContent: string, fileName: string): DatabaseDependency[] {
    this.dependencies = [];

    // 1. Extract from @model declaration
    this.extractFromModelDeclaration(cshtmlContent, fileName);

    // 2. Extract from asp-for attributes
    this.extractFromAspFor(cshtmlContent, fileName);

    // 3. Extract from Html helpers
    this.extractFromHtmlHelpers(cshtmlContent, fileName);

    // 4. Extract from foreach loops (list views)
    this.extractFromForeachLoops(cshtmlContent, fileName);

    // 5. Extract from dropdown sources (FK lookups)
    this.extractFromDropdownSources(cshtmlContent, fileName);

    // 6. Extract from action links
    this.extractFromActionLinks(cshtmlContent, fileName);

    // 7. Extract from embedded SQL or stored procedure calls
    this.extractFromEmbeddedSQL(cshtmlContent, fileName);

    // 8. Extract from comments and hints
    this.extractFromComments(cshtmlContent, fileName);

    return this.dependencies;
  }

  /**
   * Extract table from @model declaration
   * Pattern: @model Namespace.TableNameViewModel
   */
  private extractFromModelDeclaration(content: string, fileName: string): void {
    const modelRegex = /@model\s+([\w.]+)/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const fullName = match[1];
      const modelName = fullName.split('.').pop() || '';
      
      // Infer table name from model name
      const tableName = this.inferTableNameFromModel(modelName);
      
      this.dependencies.push({
        type: 'table',
        name: tableName,
        tableName: tableName,
        source: fileName,
        confidence: 85,
        context: `Model declaration: @model ${fullName}`,
        isRequired: true
      });
    }
  }

  /**
   * Extract columns from asp-for attributes
   * Pattern: <input asp-for="PropertyName" />
   */
  private extractFromAspFor(content: string, fileName: string): void {
    const aspForRegex = /asp-for="([^"]+)"/g;
    let match;

    // Get model table name first
    const tableName = this.getModelTableName(content);

    while ((match = aspForRegex.exec(content)) !== null) {
      const propertyName = match[1];
      
      // Skip nested properties like "Address.Street"
      if (propertyName.includes('.')) continue;

      // Find surrounding context to determine if required
      const surroundingContext = this.getSurroundingContext(content, match.index, 200);
      const isRequired = /required|data-val-required/i.test(surroundingContext);

      this.dependencies.push({
        type: 'column',
        name: propertyName,
        tableName: tableName,
        columnName: propertyName,
        source: fileName,
        confidence: 90,
        context: `Form field: asp-for="${propertyName}"`,
        isRequired
      });
    }
  }

  /**
   * Extract from Html helpers
   * Patterns: @Html.DisplayFor, @Html.EditorFor, @Html.TextBoxFor, etc.
   */
  private extractFromHtmlHelpers(content: string, fileName: string): void {
    const tableName = this.getModelTableName(content);

    // DisplayFor, EditorFor, TextBoxFor, etc.
    const helperRegex = /@Html\.(\w+)For\s*\(\s*\w+\s*=>\s*\w+\.(\w+)/g;
    let match;

    while ((match = helperRegex.exec(content)) !== null) {
      const [, helperType, propertyName] = match;

      this.dependencies.push({
        type: 'column',
        name: propertyName,
        tableName: tableName,
        columnName: propertyName,
        source: fileName,
        confidence: 95,
        context: `Html helper: @Html.${helperType}For(m => m.${propertyName})`,
        isRequired: helperType === 'EditorFor' || helperType === 'TextBoxFor'
      });
    }

    // ActionLink with parameters
    const actionLinkRegex = /@Html\.ActionLink\s*\(\s*"([^"]+)"\s*,\s*"(\w+)"\s*,\s*"(\w+)"/g;
    while ((match = actionLinkRegex.exec(content)) !== null) {
      const [, label, action, controller] = match;
      
      // Controller often maps to table name
      const inferredTable = this.controllerToTable(controller);
      
      this.dependencies.push({
        type: 'table',
        name: inferredTable,
        tableName: inferredTable,
        source: fileName,
        confidence: 60,
        context: `Action link to ${controller} controller`,
        isRequired: false
      });
    }
  }

  /**
   * Extract from foreach loops (list/grid views)
   */
  private extractFromForeachLoops(content: string, fileName: string): void {
    const foreachRegex = /@foreach\s*\(\s*var\s+(\w+)\s+in\s+Model(?:\.(\w+))?/g;
    let match;

    while ((match = foreachRegex.exec(content)) !== null) {
      const [, iteratorVar, collection] = match;
      
      // Collection name often indicates table
      if (collection) {
        const tableName = this.singularize(collection);
        
        this.dependencies.push({
          type: 'table',
          name: tableName,
          tableName: tableName,
          source: fileName,
          confidence: 75,
          context: `List view iterating over Model.${collection}`,
          isRequired: true
        });
      }

      // Extract column usages within the loop
      const loopBody = this.extractLoopBody(content, match.index);
      this.extractColumnsFromLoopBody(loopBody, iteratorVar, fileName);
    }
  }

  /**
   * Extract FK lookup sources from dropdowns
   */
  private extractFromDropdownSources(content: string, fileName: string): void {
    // Pattern: asp-items="@Model.CategoryList" or ViewBag.CategoryId
    const dropdownRegex = /asp-items="@(?:Model\.|ViewBag\.|ViewData\.)(\w+)"/g;
    let match;

    while ((match = dropdownRegex.exec(content)) !== null) {
      const listName = match[1];
      
      // Pattern: CategoryList -> Category table, StatusList -> Status table
      const lookupTable = this.inferLookupTable(listName);
      
      // Find the associated FK column
      const fkColumnMatch = content.match(new RegExp(`asp-for="(\\w*${this.stripListSuffix(listName)}\\w*)"`, 'i'));
      const fkColumn = fkColumnMatch ? fkColumnMatch[1] : `${this.stripListSuffix(listName)}Id`;

      const tableName = this.getModelTableName(content);

      this.dependencies.push({
        type: 'fk_lookup',
        name: `${tableName}.${fkColumn} -> ${lookupTable}`,
        tableName: tableName,
        columnName: fkColumn,
        source: fileName,
        confidence: 70,
        context: `Dropdown source: ${listName} (FK to ${lookupTable})`,
        isRequired: true
      });
    }

    // ViewBag/ViewData direct references
    const viewBagRegex = /ViewBag\.(\w+)(?!List)/g;
    while ((match = viewBagRegex.exec(content)) !== null) {
      const propName = match[1];
      
      // Check if this looks like a lookup list
      if (propName.endsWith('List') || propName.endsWith('s')) {
        const lookupTable = this.inferLookupTable(propName);
        
        this.dependencies.push({
          type: 'fk_lookup',
          name: lookupTable,
          tableName: lookupTable,
          source: fileName,
          confidence: 60,
          context: `ViewBag.${propName} likely contains lookup data`,
          isRequired: false
        });
      }
    }
  }

  /**
   * Extract from action links and routes
   */
  private extractFromActionLinks(content: string, fileName: string): void {
    // asp-action and asp-controller
    const routeRegex = /asp-(?:action|controller)="(\w+)"/g;
    let match;

    const controllers = new Set<string>();
    const actions = new Set<string>();

    while ((match = routeRegex.exec(content)) !== null) {
      const value = match[1];
      if (match[0].includes('controller')) {
        controllers.add(value);
      } else {
        actions.add(value);
      }
    }

    // Controllers typically map to tables
    controllers.forEach(controller => {
      const tableName = this.controllerToTable(controller);
      
      this.dependencies.push({
        type: 'table',
        name: tableName,
        tableName: tableName,
        source: fileName,
        confidence: 50,
        context: `Referenced controller: ${controller}`,
        isRequired: false
      });
    });
  }

  /**
   * Extract from embedded SQL or comments
   */
  private extractFromEmbeddedSQL(content: string, fileName: string): void {
    // Comments with table hints: <!-- Table: Customers -->
    const tableCommentRegex = /<!--\s*(?:Table|Dependency):\s*(\w+)\s*-->/gi;
    let match;

    while ((match = tableCommentRegex.exec(content)) !== null) {
      this.dependencies.push({
        type: 'table',
        name: match[1],
        tableName: match[1],
        source: fileName,
        confidence: 95,
        context: `Explicit comment hint`,
        isRequired: true
      });
    }

    // SQL snippets in code blocks
    const sqlRegex = /(?:FROM|JOIN|INTO|UPDATE)\s+(\w+)/gi;
    while ((match = sqlRegex.exec(content)) !== null) {
      const tableName = match[1];
      
      // Skip SQL keywords
      if (['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WHERE', 'AND', 'OR', 'NOT'].includes(tableName.toUpperCase())) {
        continue;
      }

      this.dependencies.push({
        type: 'table',
        name: tableName,
        tableName: tableName,
        source: fileName,
        confidence: 80,
        context: `SQL reference: ${match[0]}`,
        isRequired: true
      });
    }
  }

  /**
   * Extract from comments and hints
   */
  private extractFromComments(content: string, fileName: string): void {
    // Razor comments: @* Table: Customers *@
    const razorCommentRegex = /@\*\s*(?:Table|Depends\s*on):\s*(\w+)/gi;
    let match;

    while ((match = razorCommentRegex.exec(content)) !== null) {
      this.dependencies.push({
        type: 'table',
        name: match[1],
        tableName: match[1],
        source: fileName,
        confidence: 95,
        context: `Razor comment hint`,
        isRequired: true
      });
    }
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private getModelTableName(content: string): string {
    const modelMatch = content.match(/@model\s+([\w.]+)/);
    if (modelMatch) {
      const modelName = modelMatch[1].split('.').pop() || '';
      return this.inferTableNameFromModel(modelName);
    }
    return 'Unknown';
  }

  private inferTableNameFromModel(modelName: string): string {
    // Remove common suffixes
    let tableName = modelName
      .replace(/ViewModel$/i, '')
      .replace(/EditModel$/i, '')
      .replace(/CreateModel$/i, '')
      .replace(/DetailModel$/i, '')
      .replace(/ListModel$/i, '')
      .replace(/InputModel$/i, '')
      .replace(/Model$/i, '');

    // Pluralize
    if (tableName.endsWith('y') && !tableName.endsWith('ay')) {
      tableName = tableName.slice(0, -1) + 'ies';
    } else if (tableName.endsWith('s') || tableName.endsWith('x') || tableName.endsWith('ch') || tableName.endsWith('sh')) {
      tableName = tableName + 'es';
    } else {
      tableName = tableName + 's';
    }

    return tableName;
  }

  private controllerToTable(controller: string): string {
    // HomeController -> Home (or Homes)
    // PatientController -> Patients
    let tableName = controller.replace(/Controller$/i, '');
    
    // Pluralize
    if (!tableName.endsWith('s')) {
      if (tableName.endsWith('y')) {
        tableName = tableName.slice(0, -1) + 'ies';
      } else {
        tableName = tableName + 's';
      }
    }

    return tableName;
  }

  private inferLookupTable(listName: string): string {
    // CategoryList -> Categories
    // StatusList -> Statuses
    // CountryList -> Countries
    let name = this.stripListSuffix(listName);
    
    if (name.endsWith('y')) {
      name = name.slice(0, -1) + 'ies';
    } else if (!name.endsWith('s')) {
      name = name + 's';
    }

    return name;
  }

  private stripListSuffix(name: string): string {
    return name
      .replace(/List$/i, '')
      .replace(/Items$/i, '')
      .replace(/Options$/i, '')
      .replace(/Values$/i, '');
  }

  private singularize(word: string): string {
    if (word.endsWith('ies')) {
      return word.slice(0, -3) + 'y';
    } else if (word.endsWith('es')) {
      return word.slice(0, -2);
    } else if (word.endsWith('s')) {
      return word.slice(0, -1);
    }
    return word;
  }

  private getSurroundingContext(content: string, index: number, radius: number): string {
    const start = Math.max(0, index - radius);
    const end = Math.min(content.length, index + radius);
    return content.substring(start, end);
  }

  private extractLoopBody(content: string, startIndex: number): string {
    // Simple extraction - find matching braces
    const openBrace = content.indexOf('{', startIndex);
    if (openBrace === -1) return '';

    let depth = 1;
    let pos = openBrace + 1;

    while (depth > 0 && pos < content.length) {
      if (content[pos] === '{') depth++;
      if (content[pos] === '}') depth--;
      pos++;
    }

    return content.substring(openBrace + 1, pos - 1);
  }

  private extractColumnsFromLoopBody(body: string, iteratorVar: string, fileName: string): void {
    // Pattern: @item.ColumnName or @item.Property
    const columnRegex = new RegExp(`@${iteratorVar}\\.([\\w]+)`, 'g');
    let match;

    while ((match = columnRegex.exec(body)) !== null) {
      const columnName = match[1];
      
      this.dependencies.push({
        type: 'column',
        name: columnName,
        columnName: columnName,
        source: fileName,
        confidence: 85,
        context: `List view column: ${iteratorVar}.${columnName}`,
        isRequired: false
      });
    }
  }
}

// =============================================================================
// Dependency Map Builder
// =============================================================================

export class DependencyMapBuilder {
  private dependencies: DatabaseDependency[] = [];
  private extractor: CSHTMLDependencyExtractor;

  constructor() {
    this.extractor = new CSHTMLDependencyExtractor();
  }

  /**
   * Build dependency map from multiple CSHTML files
   */
  buildMap(files: { name: string; content: string }[]): DependencyMap {
    this.dependencies = [];

    // Extract dependencies from all files
    files.forEach(file => {
      const fileDeps = this.extractor.extractDependencies(file.content, file.name);
      this.dependencies.push(...fileDeps);
    });

    // Consolidate and build map
    const tables = this.consolidateTableDependencies();
    const columns = this.consolidateColumnDependencies();
    const storedProcedures = this.consolidateSPDependencies();
    const views = this.consolidateViewDependencies();
    const fkLookups = this.consolidateFKLookupDependencies();

    const statistics = this.calculateStatistics(tables, columns, storedProcedures, views, fkLookups);

    return {
      tables,
      columns,
      storedProcedures,
      views,
      fkLookups,
      statistics
    };
  }

  private consolidateTableDependencies(): TableDependency[] {
    const tableMap = new Map<string, TableDependency>();

    this.dependencies
      .filter(d => d.type === 'table')
      .forEach(dep => {
        const existing = tableMap.get(dep.tableName!);
        
        if (existing) {
          // Merge sources
          if (!existing.sources.includes(dep.source)) {
            existing.sources.push(dep.source);
          }
          // Update confidence to max
          existing.confidence = Math.max(existing.confidence || 0, dep.confidence);
        } else {
          tableMap.set(dep.tableName!, {
            tableName: dep.tableName!,
            detectedName: dep.name,
            columns: [],
            operations: [],
            sources: [dep.source],
            priority: dep.isRequired ? 'high' : 'medium',
            status: 'missing'
          });
        }
      });

    // Add column dependencies to tables
    this.dependencies
      .filter(d => d.type === 'column')
      .forEach(dep => {
        const table = tableMap.get(dep.tableName!);
        if (table && !table.columns.includes(dep.columnName!)) {
          table.columns.push(dep.columnName!);
        }
      });

    return Array.from(tableMap.values());
  }

  private consolidateColumnDependencies(): ColumnDependency[] {
    const columnMap = new Map<string, ColumnDependency>();

    this.dependencies
      .filter(d => d.type === 'column')
      .forEach(dep => {
        const key = `${dep.tableName}.${dep.columnName}`;
        const existing = columnMap.get(key);
        
        if (existing) {
          if (!existing.sources.includes(dep.source)) {
            existing.sources.push(dep.source);
          }
        } else {
          columnMap.set(key, {
            tableName: dep.tableName!,
            columnName: dep.columnName!,
            usageType: this.detectUsageType(dep.context),
            sources: [dep.source],
            isRequired: dep.isRequired,
            status: 'missing'
          });
        }
      });

    return Array.from(columnMap.values());
  }

  private consolidateSPDependencies(): SPDependency[] {
    const spMap = new Map<string, SPDependency>();

    this.dependencies
      .filter(d => d.type === 'stored_procedure')
      .forEach(dep => {
        const existing = spMap.get(dep.name);
        
        if (existing) {
          if (!existing.sources.includes(dep.source)) {
            existing.sources.push(dep.source);
          }
        } else {
          spMap.set(dep.name, {
            procedureName: dep.name,
            parameters: [],
            sources: [dep.source],
            status: 'missing'
          });
        }
      });

    return Array.from(spMap.values());
  }

  private consolidateViewDependencies(): ViewDependency[] {
    const viewMap = new Map<string, ViewDependency>();

    this.dependencies
      .filter(d => d.type === 'view')
      .forEach(dep => {
        const existing = viewMap.get(dep.name);
        
        if (existing) {
          if (!existing.sources.includes(dep.source)) {
            existing.sources.push(dep.source);
          }
        } else {
          viewMap.set(dep.name, {
            viewName: dep.name,
            sources: [dep.source],
            status: 'missing'
          });
        }
      });

    return Array.from(viewMap.values());
  }

  private consolidateFKLookupDependencies(): FKLookupDependency[] {
    const fkMap = new Map<string, FKLookupDependency>();

    this.dependencies
      .filter(d => d.type === 'fk_lookup')
      .forEach(dep => {
        const key = dep.name;
        const existing = fkMap.get(key);
        
        if (existing) {
          if (!existing.sources.includes(dep.source)) {
            existing.sources.push(dep.source);
          }
        } else {
          fkMap.set(key, {
            sourceTable: dep.tableName!,
            sourceColumn: dep.columnName!,
            lookupTable: dep.tableName!,
            sources: [dep.source],
            status: 'missing'
          });
        }
      });

    return Array.from(fkMap.values());
  }

  private detectUsageType(context: string): ColumnDependency['usageType'] {
    if (/DisplayFor|DisplayNameFor|@item\./.test(context)) return 'display';
    if (/EditorFor|TextBoxFor|asp-for|input/i.test(context)) return 'form_input';
    if (/filter|search|where/i.test(context)) return 'filter';
    if (/sort|order/i.test(context)) return 'sort';
    if (/hidden/i.test(context)) return 'hidden';
    if (/dropdown|select/i.test(context)) return 'fk_reference';
    return 'display';
  }

  private calculateStatistics(
    tables: TableDependency[],
    columns: ColumnDependency[],
    sps: SPDependency[],
    views: ViewDependency[],
    fks: FKLookupDependency[]
  ): DependencyStats {
    const total = tables.length + columns.length + sps.length + views.length + fks.length;
    const resolved = 
      tables.filter(t => t.status === 'resolved').length +
      columns.filter(c => c.status === 'resolved').length +
      sps.filter(s => s.status === 'resolved').length +
      views.filter(v => v.status === 'resolved').length +
      fks.filter(f => f.status === 'resolved').length;

    const missing = total - resolved;
    const criticalMissing = tables.filter(t => t.status === 'missing' && t.priority === 'critical').length;

    return {
      totalDependencies: total,
      resolvedCount: resolved,
      missingCount: missing,
      partialCount: tables.filter(t => t.status === 'partial').length,
      completionPercentage: total > 0 ? Math.round((resolved / total) * 100) : 0,
      criticalMissing,
      estimatedUploadTime: missing * 2 // 2 seconds per item estimate
    };
  }
}

// =============================================================================
// Missing Dependency Analyzer
// =============================================================================

export class MissingDependencyAnalyzer {
  /**
   * Analyze gaps between CSHTML dependencies and uploaded SQL
   */
  analyze(
    dependencyMap: DependencyMap,
    parseResult: ParseResult | null
  ): MissingDependency[] {
    const missing: MissingDependency[] = [];

    // Analyze missing tables
    dependencyMap.tables.forEach(table => {
      if (table.status === 'missing') {
        const matched = parseResult?.tables.find(t => 
          t.tableName.toLowerCase() === table.tableName.toLowerCase() ||
          t.tableName.toLowerCase() === table.detectedName.toLowerCase()
        );

        if (matched) {
          table.status = 'resolved';
          table.matchedTable = matched;
        } else {
          missing.push({
            type: 'table',
            name: table.tableName,
            priority: table.priority,
            impact: `Required by ${table.sources.length} view(s): ${table.sources.join(', ')}`,
            affectedViews: table.sources,
            resolutionOptions: this.getTableResolutionOptions(table),
            autoDetectedSuggestions: this.suggestRelatedTables(table.tableName)
          });
        }
      }
    });

    // Analyze missing columns
    dependencyMap.columns.forEach(column => {
      const table = dependencyMap.tables.find(t => t.tableName === column.tableName);
      
      if (table?.matchedTable) {
        const matched = table.matchedTable.columns.find(c => 
          c.name.toLowerCase() === column.columnName.toLowerCase()
        );

        if (matched) {
          column.status = 'resolved';
          column.matchedColumn = matched;
        } else {
          missing.push({
            type: 'column',
            name: column.columnName,
            tableName: column.tableName,
            priority: column.isRequired ? 'high' : 'medium',
            impact: `Column used in ${column.sources.length} view(s) but not found in ${column.tableName}`,
            affectedViews: column.sources,
            resolutionOptions: [
              { type: 'upload_sql', description: 'Upload DDL with this column', estimatedEffort: 'low', recommended: true },
              { type: 'design_manual', description: 'Add column manually', estimatedEffort: 'low', recommended: false }
            ],
            autoDetectedSuggestions: this.suggestColumnType(column.columnName, column.usageType)
          });
        }
      }
    });

    // Analyze missing FK lookups
    dependencyMap.fkLookups.forEach(fk => {
      const lookupTable = parseResult?.tables.find(t => 
        t.tableName.toLowerCase() === fk.lookupTable.toLowerCase()
      );

      if (lookupTable) {
        fk.status = 'resolved';
      } else {
        missing.push({
          type: 'fk_lookup',
          name: fk.lookupTable,
          tableName: fk.sourceTable,
          priority: 'medium',
          impact: `Dropdown data needed for ${fk.sourceTable}.${fk.sourceColumn}`,
          affectedViews: fk.sources,
          resolutionOptions: [
            { type: 'upload_sql', description: `Upload ${fk.lookupTable} table DDL`, estimatedEffort: 'low', recommended: true },
            { type: 'ai_generate', description: 'Generate lookup table with common values', estimatedEffort: 'low', recommended: true }
          ],
          autoDetectedSuggestions: this.suggestLookupValues(fk.lookupTable)
        });
      }
    });

    // Sort by priority
    return missing.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private getTableResolutionOptions(table: TableDependency): ResolutionOption[] {
    return [
      { 
        type: 'upload_sql', 
        description: `Upload DDL for ${table.tableName} table`, 
        estimatedEffort: 'low', 
        recommended: true 
      },
      { 
        type: 'ai_generate', 
        description: 'Generate table based on detected columns', 
        estimatedEffort: 'medium', 
        recommended: table.columns.length > 3 
      },
      { 
        type: 'design_manual', 
        description: 'Design table structure manually', 
        estimatedEffort: 'high', 
        recommended: false 
      }
    ];
  }

  private suggestRelatedTables(tableName: string): string[] {
    // Common patterns
    const suggestions: string[] = [];
    
    // If it's a main entity, suggest related tables
    if (tableName.endsWith('s')) {
      const singular = tableName.slice(0, -1);
      suggestions.push(`${singular}Audit`, `${singular}History`, `${singular}Documents`);
    }

    // Common lookup tables
    suggestions.push('Statuses', 'Countries', 'Currencies');

    return suggestions.slice(0, 3);
  }

  private suggestColumnType(columnName: string, usageType: string): string[] {
    const suggestions: string[] = [];
    const name = columnName.toLowerCase();

    if (name.includes('email')) suggestions.push('VARCHAR(255), NVARCHAR(255)');
    if (name.includes('phone')) suggestions.push('VARCHAR(20), NVARCHAR(20)');
    if (name.includes('name')) suggestions.push('NVARCHAR(100), NVARCHAR(200)');
    if (name.includes('description') || name.includes('note')) suggestions.push('NVARCHAR(MAX), TEXT');
    if (name.includes('date')) suggestions.push('DATE, DATETIME, DATETIME2');
    if (name.includes('amount') || name.includes('price')) suggestions.push('DECIMAL(18,2), MONEY');
    if (name.includes('is') || name.includes('has')) suggestions.push('BIT, BOOLEAN');
    if (name.includes('id')) suggestions.push('INT, BIGINT, UNIQUEIDENTIFIER');

    return suggestions;
  }

  private suggestLookupValues(tableName: string): string[] {
    const name = tableName.toLowerCase();
    
    if (name.includes('status')) return ['Active', 'Inactive', 'Pending'];
    if (name.includes('country')) return ['USA', 'UK', 'Canada', 'Australia'];
    if (name.includes('currency')) return ['USD', 'EUR', 'GBP', 'CAD'];
    if (name.includes('priority')) return ['High', 'Medium', 'Low'];
    if (name.includes('type')) return ['Type A', 'Type B', 'Type C'];
    
    return ['Value 1', 'Value 2', 'Value 3'];
  }
}

// =============================================================================
// Smart Workflow Engine
// =============================================================================

export class SmartWorkflowEngine {
  private dependencyExtractor: CSHTMLDependencyExtractor;
  private dependencyMapBuilder: DependencyMapBuilder;
  private missingAnalyzer: MissingDependencyAnalyzer;
  private workflow: SmartUploadWorkflow;

  constructor() {
    this.dependencyExtractor = new CSHTMLDependencyExtractor();
    this.dependencyMapBuilder = new DependencyMapBuilder();
    this.missingAnalyzer = new MissingDependencyAnalyzer();
    
    this.workflow = {
      phase: 'cshtml_upload',
      cshtmlFiles: [],
      dependencyMap: null,
      uploadedSQL: [],
      missingDependencies: [],
      resolutionQueue: [],
      progress: {
        currentStep: 'Upload CSHTML files',
        totalSteps: 4,
        completedSteps: 0,
        percentage: 0,
        estimatedTimeRemaining: 0,
        messages: []
      }
    };
  }

  /**
   * Process CSHTML upload
   */
  processCSHTMLUpload(files: { name: string; content: string }[]): SmartUploadWorkflow {
    this.workflow.phase = 'dependency_analysis';
    this.workflow.progress.currentStep = 'Analyzing dependencies';
    this.workflow.progress.messages.push({
      type: 'info',
      message: `Processing ${files.length} CSHTML file(s)...`,
      timestamp: new Date()
    });

    // Store uploaded files
    this.workflow.cshtmlFiles = files.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      type: 'cshtml',
      size: f.content.length,
      uploadedAt: new Date()
    }));

    // Build dependency map
    this.workflow.dependencyMap = this.dependencyMapBuilder.buildMap(files);

    this.workflow.progress.messages.push({
      type: 'success',
      message: `Found ${this.workflow.dependencyMap.statistics.totalDependencies} dependencies`,
      timestamp: new Date(),
      details: `Tables: ${this.workflow.dependencyMap.tables.length}, Columns: ${this.workflow.dependencyMap.columns.length}`
    });

    // Move to guided upload phase
    this.workflow.phase = 'guided_upload';
    this.workflow.progress.completedSteps = 1;
    this.workflow.progress.percentage = 25;

    return this.workflow;
  }

  /**
   * Process SQL upload and match against dependencies
   */
  processSQLUpload(files: { name: string; content: string }[], parseResult: ParseResult): SmartUploadWorkflow {
    // Store uploaded files
    files.forEach(f => {
      this.workflow.uploadedSQL.push({
        id: crypto.randomUUID(),
        name: f.name,
        type: 'sql',
        size: f.content.length,
        uploadedAt: new Date(),
        parseResult
      });
    });

    // Re-analyze missing dependencies
    if (this.workflow.dependencyMap) {
      this.workflow.missingDependencies = this.missingAnalyzer.analyze(
        this.workflow.dependencyMap,
        parseResult
      );

      // Update dependency map statistics
      this.workflow.dependencyMap.statistics = this.calculateUpdatedStatistics();
    }

    // Check if complete
    if (this.workflow.missingDependencies.length === 0) {
      this.workflow.phase = 'complete';
      this.workflow.progress.percentage = 100;
      this.workflow.progress.currentStep = 'All dependencies resolved!';
    } else {
      this.workflow.phase = 'guided_upload';
      this.updateResolutionQueue();
    }

    this.workflow.progress.messages.push({
      type: this.workflow.missingDependencies.length === 0 ? 'success' : 'info',
      message: `${this.workflow.missingDependencies.length} dependencies still need resolution`,
      timestamp: new Date()
    });

    return this.workflow;
  }

  /**
   * Get next recommended action
   */
  getNextAction(): { type: string; description: string; priority: string } | null {
    if (this.workflow.missingDependencies.length === 0) {
      return null;
    }

    const next = this.workflow.missingDependencies[0];
    return {
      type: next.type,
      description: `Upload ${next.type === 'table' ? next.name : `${next.tableName}.${next.name}`}`,
      priority: next.priority
    };
  }

  /**
   * Get summary for display
   */
  getSummary(): {
    totalViews: number;
    tablesNeeded: number;
    tablesResolved: number;
    columnsNeeded: number;
    columnsResolved: number;
    completionPercent: number;
    estimatedTimeRemaining: string;
  } {
    const map = this.workflow.dependencyMap;
    
    return {
      totalViews: this.workflow.cshtmlFiles.length,
      tablesNeeded: map?.tables.length || 0,
      tablesResolved: map?.tables.filter(t => t.status === 'resolved').length || 0,
      columnsNeeded: map?.columns.length || 0,
      columnsResolved: map?.columns.filter(c => c.status === 'resolved').length || 0,
      completionPercent: map?.statistics.completionPercentage || 0,
      estimatedTimeRemaining: `${Math.ceil(this.workflow.progress.estimatedTimeRemaining / 60)} min`
    };
  }

  private calculateUpdatedStatistics(): DependencyStats {
    if (!this.workflow.dependencyMap) {
      return {
        totalDependencies: 0,
        resolvedCount: 0,
        missingCount: 0,
        partialCount: 0,
        completionPercentage: 0,
        criticalMissing: 0,
        estimatedUploadTime: 0
      };
    }

    const map = this.workflow.dependencyMap;
    
    const resolved = 
      map.tables.filter(t => t.status === 'resolved').length +
      map.columns.filter(c => c.status === 'resolved').length +
      map.storedProcedures.filter(s => s.status === 'resolved').length +
      map.views.filter(v => v.status === 'resolved').length +
      map.fkLookups.filter(f => f.status === 'resolved').length;

    const total = 
      map.tables.length + 
      map.columns.length + 
      map.storedProcedures.length + 
      map.views.length + 
      map.fkLookups.length;

    return {
      totalDependencies: total,
      resolvedCount: resolved,
      missingCount: total - resolved,
      partialCount: map.tables.filter(t => t.status === 'partial').length,
      completionPercentage: total > 0 ? Math.round((resolved / total) * 100) : 0,
      criticalMissing: map.tables.filter(t => t.status === 'missing' && t.priority === 'critical').length,
      estimatedUploadTime: (total - resolved) * 2
    };
  }

  private updateResolutionQueue(): void {
    this.workflow.resolutionQueue = this.workflow.missingDependencies.map((dep, index) => ({
      id: `item-${index}`,
      dependency: dep,
      status: 'pending' as const
    }));
  }

  /**
   * Get workflow state
   */
  getWorkflow(): SmartUploadWorkflow {
    return this.workflow;
  }

  /**
   * Reset workflow
   */
  reset(): void {
    this.workflow = {
      phase: 'cshtml_upload',
      cshtmlFiles: [],
      dependencyMap: null,
      uploadedSQL: [],
      missingDependencies: [],
      resolutionQueue: [],
      progress: {
        currentStep: 'Upload CSHTML files',
        totalSteps: 4,
        completedSteps: 0,
        percentage: 0,
        estimatedTimeRemaining: 0,
        messages: []
      }
    };
  }
}

// Export singleton instance
export const smartWorkflowEngine = new SmartWorkflowEngine();
