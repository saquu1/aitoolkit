// =============================================================================
// AI Engine - Core Intelligence System
// =============================================================================

import ZAI from 'z-ai-web-dev-sdk';
import { TableDef, ColumnDef, ModuleDef, ColumnIntelligence, FKDependencyAnalysis } from './types';
import { HIS_LAYERS, getAllModules, getModuleByKey } from './layer-definitions';

/**
 * AI Engine Configuration
 */
export interface AIEngineConfig {
  mode: 'offline' | 'local' | 'cloud';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * AI Analysis Context
 */
export interface AIContext {
  tables: TableDef[];
  modules: ModuleDef[];
  projectName?: string;
  softwareType?: string;
  existingData?: Record<string, unknown>;
}

/**
 * AI Analysis Result
 */
export interface AIAnalysisResult {
  success: boolean;
  data?: unknown;
  error?: string;
  confidence?: number;
  suggestions?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Core AI Engine for Schema Intelligence Platform
 */
export class AIEngine {
  private config: AIEngineConfig;
  private zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;
  private initialized: boolean = false;

  constructor(config: AIEngineConfig = { mode: 'offline' }) {
    this.config = config;
  }

  /**
   * Initialize the AI engine
   */
  async initialize(): Promise<void> {
    if (this.config.mode === 'cloud') {
      try {
        this.zai = await ZAI.create();
        this.initialized = true;
      } catch (error) {
        console.error('Failed to initialize AI SDK:', error);
        this.config.mode = 'offline';
      }
    } else {
      this.initialized = true;
    }
  }

  /**
   * Check if engine is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get current mode
   */
  getMode(): string {
    return this.config.mode;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEMA ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analyze schema and map tables to modules
   */
  async mapTablesToModules(tables: TableDef[]): Promise<AIAnalysisResult> {
    const modules = getAllModules();
    const mappings: Array<{
      tableName: string;
      moduleKey: string | null;
      moduleName: string | null;
      confidence: number;
      reason: string;
    }> = [];

    for (const table of tables) {
      const mapping = this.findBestModuleMatch(table, modules);
      mappings.push({
        tableName: table.tableName,
        moduleKey: mapping.module?.key || null,
        moduleName: mapping.module?.name || null,
        confidence: mapping.confidence,
        reason: mapping.reason
      });
    }

    return {
      success: true,
      data: mappings,
      confidence: mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length,
      metadata: {
        totalTables: tables.length,
        mappedCount: mappings.filter(m => m.moduleKey).length,
        unmappedCount: mappings.filter(m => !m.moduleKey).length
      }
    };
  }

  /**
   * Find best matching module for a table
   */
  private findBestModuleMatch(
    table: TableDef,
    modules: ModuleDef[]
  ): { module: ModuleDef | null; confidence: number; reason: string } {
    const tableName = table.tableName.toLowerCase();
    const columnNames = table.columns.map(c => c.name.toLowerCase());
    
    let bestMatch: { module: ModuleDef | null; confidence: number; reason: string } = {
      module: null,
      confidence: 0,
      reason: 'No match found'
    };

    for (const mod of modules) {
      let score = 0;
      const reasons: string[] = [];

      // Check if table name matches module tables
      const moduleTables = mod.tables.map(t => t.toLowerCase());
      if (moduleTables.includes(tableName)) {
        score += 80;
        reasons.push('Exact table match in module');
      }

      // Check table name similarity with module name/key
      if (tableName.includes(mod.key.toLowerCase().replace(/-/g, ''))) {
        score += 30;
        reasons.push('Table name contains module key');
      }

      if (tableName.includes(mod.name.toLowerCase().split(' ')[0])) {
        score += 25;
        reasons.push('Table name matches module name');
      }

      // Check column overlap
      const moduleTableColumns = this.getModuleExpectedColumns(mod);
      const columnOverlap = columnNames.filter(c => 
        moduleTableColumns.some(mc => mc.toLowerCase() === c)
      ).length;
      
      if (columnOverlap > 0) {
        score += Math.min(columnOverlap * 5, 40);
        reasons.push(`${columnOverlap} columns match expected columns`);
      }

      // Normalize score to confidence (0-100)
      const confidence = Math.min(score, 100);

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          module: mod,
          confidence,
          reason: reasons.join('; ')
        };
      }
    }

    return bestMatch;
  }

  /**
   * Get expected columns for a module based on its tables
   */
  private getModuleExpectedColumns(module: ModuleDef): string[] {
    const commonColumns = [
      'id', 'name', 'description', 'isactive', 'createdon', 'modifiedon',
      'createdby', 'modifiedby', 'status', 'type', 'code'
    ];
    
    const moduleSpecificColumns: Record<string, string[]> = {
      'patient-reg': ['mrn', 'firstname', 'lastname', 'dateofbirth', 'gender', 'phone', 'email', 'cnic', 'address'],
      'appointment': ['patientid', 'doctorid', 'appointmentdate', 'slot', 'status', 'type'],
      'billing': ['invoicenumber', 'patientid', 'amount', 'total', 'discount', 'tax', 'paid'],
      'pharmacy': ['drugid', 'quantity', 'batch', 'expiry', 'price', 'stock'],
      'laboratory': ['testid', 'orderid', 'sampleid', 'result', 'status', 'parameter'],
      'employee-doctor': ['employeeid', 'designation', 'department', 'specialization', 'schedule'],
    };

    return [...commonColumns, ...(moduleSpecificColumns[module.key] || [])];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COLUMN INTELLIGENCE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analyze column and infer metadata
   */
  async analyzeColumn(column: ColumnDef, tableName: string): Promise<ColumnIntelligence> {
    const name = column.name.toLowerCase();
    const type = column.dataType.toUpperCase();

    // Infer semantic type
    const semanticType = this.inferSemanticType(name, type);
    
    // Infer UI type
    const uiType = this.inferUIType(name, type, column);
    
    // Infer sensitivity
    const sensitivity = this.inferSensitivity(name, type);
    
    // Generate validation rules
    const validationRules = this.generateValidationRules(column, semanticType);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(name, type, semanticType);

    return {
      columnName: column.name,
      tableName,
      inferredUIType: uiType,
      inferredSemanticType: semanticType,
      sensitivityLevel: sensitivity,
      validationRules: validationRules,
      confidence,
      suggestions: this.generateSuggestions(column, semanticType, uiType),
      isSearchable: this.isSearchable(name, type),
      isFilterable: this.isFilterable(name, type),
      displayInList: this.shouldDisplayInList(name, type, column.isPrimaryKey),
      placeholder: this.getPlaceholder(name, semanticType),
      label: this.getLabel(column.name, semanticType),
      icon: this.getIcon(semanticType)
    };
  }

  /**
   * Infer semantic type from column name and data type
   */
  private inferSemanticType(name: string, type: string): string {
    // Name-based inference
    const namePatterns: Array<{ pattern: RegExp; type: string }> = [
      { pattern: /email/, type: 'email' },
      { pattern: /password|secret|pin/, type: 'password' },
      { pattern: /phone|mobile|cell|tel|contact/, type: 'phone' },
      { pattern: /address|street/, type: 'address' },
      { pattern: /firstname|lastname|fullname|^name$/, type: 'name' },
      { pattern: /title|^title$/, type: 'title' },
      { pattern: /description|notes|remarks|comments/, type: 'description' },
      { pattern: /code|sku|barcode/, type: 'code' },
      { pattern: /^id$/, type: 'id' },
      { pattern: /id$/, type: 'foreign_key' },
      { pattern: /status$/, type: 'status' },
      { pattern: /type$/, type: 'type' },
      { pattern: /category$/, type: 'category' },
      { pattern: /amount|price|cost|fee|charge|total/, type: 'amount' },
      { pattern: /quantity|qty|no|number|count/, type: 'quantity' },
      { pattern: /rate|percentage|percent/, type: 'percentage' },
      { pattern: /date/, type: 'date' },
      { pattern: /time/, type: 'time' },
      { pattern: /isactive|isdeleted|isverified|is/, type: 'boolean_flag' },
      { pattern: /image|photo|logo|avatar|picture/, type: 'image' },
      { pattern: /file|document|attachment/, type: 'file' },
      { pattern: /url|website|link/, type: 'url' },
      { pattern: /color|colour/, type: 'color' },
      { pattern: /gender|sex/, type: 'gender' },
      { pattern: /age/, type: 'age' },
      { pattern: /weight|height/, type: 'measurement' },
      { pattern: /cnic|nic|ssn|nationalid/, type: 'national_id' },
      { pattern: /salary|basicpay|netpay|grosspay/, type: 'salary' },
      { pattern: /createdon|modifiedon|createdat/, type: 'audit_timestamp' },
      { pattern: /createdby|modifiedby/, type: 'audit_user' },
      { pattern: /sortorder|displayorder|sequence/, type: 'sort_order' },
      { pattern: /latitude|longitude|lat|lng/, type: 'geo_location' },
      { pattern: /mrn|medicalrecordnumber/, type: 'medical_record_number' },
      { pattern: /diagnosis/, type: 'diagnosis' },
      { pattern: /treatment/, type: 'treatment' },
    ];

    for (const { pattern, type: semanticType } of namePatterns) {
      if (pattern.test(name)) {
        return semanticType;
      }
    }

    return 'unknown';
  }

  /**
   * Infer UI component type
   */
  private inferUIType(name: string, type: string, column: ColumnDef): string {
    // First check semantic hints from name
    if (/email/.test(name)) return 'email_input';
    if (/password|secret|pin/.test(name)) return 'password_input';
    if (/phone|mobile|cell|tel/.test(name)) return 'phone_input';
    if (/url|website|link/.test(name)) return 'url_input';
    if (/image|photo|logo|avatar/.test(name)) return 'image_upload';
    if (/file|document|attachment/.test(name)) return 'file_upload';
    if (/color|colour/.test(name)) return 'color_picker';
    if (/gender|sex/.test(name)) return 'dropdown';
    if (/isactive|isdeleted|isverified/.test(name)) return 'toggle';
    if (/description|notes|remarks|comments/.test(name)) return 'textarea';
    if (/address/.test(name)) return 'textarea';
    if (/id$/.test(name) && !/^id$/.test(name)) return 'dropdown';
    if (/status|type|category/.test(name)) return 'dropdown';

    // Then check data type
    switch (type) {
      case 'BIT': return 'toggle';
      case 'UNIQUEIDENTIFIER': return column.isPrimaryKey ? 'hidden' : 'dropdown';
      case 'INT':
      case 'BIGINT':
      case 'SMALLINT':
      case 'TINYINT': return 'number_input';
      case 'DECIMAL':
      case 'NUMERIC':
      case 'FLOAT':
      case 'REAL':
      case 'MONEY':
      case 'SMALLMONEY': return 'currency_input';
      case 'DATETIME':
      case 'DATETIME2':
      case 'SMALLDATETIME':
      case 'DATETIMEOFFSET': return 'datetime_picker';
      case 'DATE': return 'date_picker';
      case 'TIME': return 'time_picker';
      case 'IMAGE':
      case 'VARBINARY':
      case 'BINARY': return 'file_upload';
      case 'XML': return 'textarea';
      default:
        // NVARCHAR, VARCHAR, TEXT, etc.
        if (column.maxLength && parseInt(column.maxLength) > 200) {
          return 'textarea';
        }
        return 'text_input';
    }
  }

  /**
   * Infer data sensitivity level
   */
  private inferSensitivity(name: string, type: string): string {
    // PHI (Protected Health Information)
    const phiPatterns = [
      /diagnosis/, /treatment/, /medical/, /patient.*condition/,
      /lab.*result/, /prescription/, /medication/, /allergy/,
      /mrn/, /medical.*record/, /health/
    ];

    // PII (Personally Identifiable Information)
    const piiPatterns = [
      /cnic|nic|ssn|nationalid/, /passport/, /license/,
      /firstname/, /lastname/, /fullname/, /^name$/,
      /dateofbirth|dob|birthday/, /phone|mobile|cell/,
      /email/, /address/, /photo|image|picture/
    ];

    // Confidential
    const confidentialPatterns = [
      /salary|pay|income/, /password|secret|pin/,
      /bank|account/, /credit/
    ];

    for (const pattern of phiPatterns) {
      if (pattern.test(name)) return 'phi';
    }

    for (const pattern of piiPatterns) {
      if (pattern.test(name)) return 'pii';
    }

    for (const pattern of confidentialPatterns) {
      if (pattern.test(name)) return 'confidential';
    }

    return 'internal';
  }

  /**
   * Generate validation rules
   */
  private generateValidationRules(column: ColumnDef, semanticType: string): Array<{
    type: string;
    value?: string | number;
    message?: string;
  }> {
    const rules: Array<{ type: string; value?: string | number; message?: string }> = [];

    // Required validation
    if (!column.isNullable && !column.isPrimaryKey && !column.isIdentity) {
      rules.push({ type: 'required', message: `${column.name} is required` });
    }

    // Type-specific validation
    switch (semanticType) {
      case 'email':
        rules.push({ type: 'email', message: 'Invalid email format' });
        break;
      case 'phone':
        rules.push({ type: 'phone', message: 'Invalid phone number' });
        break;
      case 'url':
        rules.push({ type: 'url', message: 'Invalid URL format' });
        break;
      case 'national_id':
        rules.push({ type: 'pattern', value: '^[0-9]{5}-[0-9]{7}-[0-9]$', message: 'Invalid CNIC format (XXXXX-XXXXXXX-X)' });
        break;
    }

    // Length validation
    if (column.maxLength && column.maxLength !== 'MAX') {
      const maxLen = parseInt(column.maxLength);
      rules.push({ type: 'max_length', value: maxLen, message: `Maximum ${maxLen} characters allowed` });
    }

    return rules;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(name: string, type: string, semanticType: string): number {
    if (semanticType === 'unknown') return 30;

    // Higher confidence for stronger name matches
    const strongMatches = ['email', 'password', 'phone', 'gender', 'isactive', 'createdon'];
    if (strongMatches.some(m => name.includes(m))) return 95;

    // Medium confidence for moderate matches
    const mediumMatches = ['name', 'address', 'date', 'status', 'type'];
    if (mediumMatches.some(m => name.includes(m))) return 80;

    // Lower confidence for weak matches
    return 65;
  }

  /**
   * Generate suggestions
   */
  private generateSuggestions(column: ColumnDef, semanticType: string, uiType: string): string[] {
    const suggestions: string[] = [];

    if (semanticType === 'foreign_key') {
      suggestions.push(`Consider adding a dropdown populated from the referenced table`);
    }

    if (semanticType === 'status') {
      suggestions.push(`Add status workflow configuration for this field`);
    }

    if (uiType === 'textarea' && !column.maxLength) {
      suggestions.push(`Consider setting a max length for this text field`);
    }

    if (semanticType === 'unknown' && column.isNullable) {
      suggestions.push(`Column purpose unclear - consider adding a comment or documentation`);
    }

    return suggestions;
  }

  /**
   * Check if column should be searchable
   */
  private isSearchable(name: string, type: string): boolean {
    const searchablePatterns = [
      /name/, /email/, /phone/, /code/, /mrn/, /title/, /address/
    ];
    return searchablePatterns.some(p => p.test(name));
  }

  /**
   * Check if column should be filterable
   */
  private isFilterable(name: string, type: string): boolean {
    const filterablePatterns = [
      /status/, /type/, /category/, /gender/, /isactive/, /city/, /country/,
      /department/, /date/
    ];
    return filterablePatterns.some(p => p.test(name));
  }

  /**
   * Check if column should display in list views
   */
  private shouldDisplayInList(name: string, type: string, isPK: boolean): boolean {
    if (isPK) return false;
    const hiddenPatterns = [/password/, /secret/, /token/, /hash/, /created/, /modified/];
    return !hiddenPatterns.some(p => p.test(name));
  }

  /**
   * Get placeholder text
   */
  private getPlaceholder(name: string, semanticType: string): string {
    const placeholders: Record<string, string> = {
      email: 'user@example.com',
      phone: '+1 234 567 8900',
      url: 'https://example.com',
      name: 'Enter name',
      address: 'Enter full address',
      national_id: 'XXXXX-XXXXXXX-X',
    };
    return placeholders[semanticType] || '';
  }

  /**
   * Get display label
   */
  private getLabel(columnName: string, semanticType: string): string {
    // Convert PascalCase or snake_case to Title Case
    return columnName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Get icon for semantic type
   */
  private getIcon(semanticType: string): string {
    const icons: Record<string, string> = {
      email: '📧',
      phone: '📞',
      password: '🔒',
      address: '📍',
      name: '👤',
      date: '📅',
      time: '⏰',
      money: '💰',
      status: '📊',
      image: '🖼️',
      file: '📎',
      url: '🔗',
      gender: '⚧',
      boolean_flag: '✓',
      foreign_key: '🔗',
    };
    return icons[semanticType] || '📝';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FK DEPENDENCY ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analyze FK dependencies
   */
  async analyzeFKDependencies(tables: TableDef[]): Promise<FKDependencyAnalysis> {
    const tableNames = new Set(tables.map(t => t.tableName.toLowerCase()));
    const missingTables: FKDependencyAnalysis['missingTables'] = [];
    const dependencyChains: FKDependencyAnalysis['dependencyChains'] = [];
    const resolutionQueue: FKDependencyAnalysis['resolutionQueue'] = [];

    // Find missing tables
    const missingSet = new Set<string>();
    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        if (!tableNames.has(fk.referencesTable.toLowerCase())) {
          missingSet.add(fk.referencesTable);
        }
      }
    }

    // Build missing table info
    for (const missingTable of missingSet) {
      const referencedBy = tables
        .filter(t => t.foreignKeys.some(fk => fk.referencesTable === missingTable))
        .map(t => ({ tableName: t.tableName, columnName: t.foreignKeys.find(fk => fk.referencesTable === missingTable)!.columnName }));

      missingTables.push({
        tableName: missingTable,
        referencedBy,
        priority: this.calculateMissingTablePriority(missingTable, referencedBy.length),
        estimatedImpact: referencedBy.length
      });
    }

    // Build dependency chains
    for (const table of tables) {
      const chain = this.buildDependencyChain(table, tables, tableNames);
      if (chain.length > 0) {
        dependencyChains.push({
          rootTable: table.tableName,
          chain,
          depth: chain.length,
          totalBlocked: this.countBlockedTables(table.tableName, tables, tableNames)
        });
      }
    }

    // Build resolution queue (sorted by priority)
    const sortedMissing = [...missingTables].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (let i = 0; i < sortedMissing.length; i++) {
      const mt = sortedMissing[i];
      resolutionQueue.push({
        tableName: mt.tableName,
        priority: i + 1,
        blocksCount: mt.estimatedImpact,
        resolutionOptions: ['upload_sql', 'design_manual', 'ai_design'],
        referencedByTables: mt.referencedBy.map(r => r.tableName)
      });
    }

    const totalFKs = tables.reduce((sum, t) => sum + t.foreignKeys.length, 0);
    const resolvedFKs = tables.reduce((sum, t) => 
      sum + t.foreignKeys.filter(fk => tableNames.has(fk.referencesTable.toLowerCase())).length, 0
    );

    return {
      totalFKs,
      resolvedFKs,
      unresolvedFKs: totalFKs - resolvedFKs,
      completionPercentage: totalFKs > 0 ? Math.round((resolvedFKs / totalFKs) * 100) : 100,
      missingTables,
      dependencyChains,
      resolutionQueue
    };
  }

  /**
   * Calculate missing table priority
   */
  private calculateMissingTablePriority(tableName: string, blocksCount: number): 'critical' | 'high' | 'medium' | 'low' {
    const criticalTables = ['users', 'countries', 'organizations', 'patients'];
    if (criticalTables.includes(tableName.toLowerCase())) return 'critical';
    if (blocksCount >= 5) return 'critical';
    if (blocksCount >= 3) return 'high';
    if (blocksCount >= 2) return 'medium';
    return 'low';
  }

  /**
   * Build dependency chain for a table
   */
  private buildDependencyChain(table: TableDef, allTables: TableDef[], existingTables: Set<string>): string[] {
    const chain: string[] = [];
    const visited = new Set<string>();

    const visit = (tableName: string) => {
      if (visited.has(tableName)) return;
      visited.add(tableName);

      const t = allTables.find(at => at.tableName === tableName);
      if (t) {
        for (const fk of t.foreignKeys) {
          if (!existingTables.has(fk.referencesTable.toLowerCase())) {
            chain.push(fk.referencesTable);
            visit(fk.referencesTable);
          }
        }
      }
    };

    visit(table.tableName);
    return chain;
  }

  /**
   * Count tables blocked by a missing table
   */
  private countBlockedTables(tableName: string, allTables: TableDef[], existingTables: Set<string>): number {
    return allTables.filter(t => 
      t.foreignKeys.some(fk => 
        fk.referencesTable === tableName && !existingTables.has(fk.referencesTable.toLowerCase())
      )
    ).length;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AI CHAT (Cloud Mode)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Chat with AI (cloud mode only)
   */
  async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (this.config.mode !== 'cloud' || !this.zai) {
      throw new Error('AI chat requires cloud mode. Enable cloud mode to use this feature.');
    }

    try {
      const completion = await this.zai.chat.completions.create({
        messages: messages.map(m => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content
        })),
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2000
      });

      return completion.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('AI chat error:', error);
      throw error;
    }
  }

  /**
   * Generate intelligent suggestions for schema
   */
  async generateSchemaSuggestions(tables: TableDef[]): Promise<AIAnalysisResult> {
    const suggestions: string[] = [];
    const issues: string[] = [];

    // Check for missing audit columns
    const auditColumns = ['createdon', 'createdby', 'modifiedon', 'modifiedby'];
    for (const table of tables) {
      const columnNames = table.columns.map(c => c.name.toLowerCase());
      const missingAudit = auditColumns.filter(ac => !columnNames.includes(ac));
      if (missingAudit.length > 0 && !table.tableName.toLowerCase().endsWith('types')) {
        suggestions.push(`Table ${table.tableName} is missing audit columns: ${missingAudit.join(', ')}`);
      }
    }

    // Check for tables without primary keys
    for (const table of tables) {
      const hasPK = table.columns.some(c => c.isPrimaryKey);
      if (!hasPK) {
        issues.push(`Table ${table.tableName} has no primary key defined`);
      }
    }

    // Check for orphan tables (no FKs and not referenced)
    const tableNames = new Set(tables.map(t => t.tableName.toLowerCase()));
    for (const table of tables) {
      const hasFKs = table.foreignKeys.length > 0;
      const isReferenced = tables.some(t => 
        t.foreignKeys.some(fk => fk.referencesTable.toLowerCase() === table.tableName.toLowerCase())
      );
      
      if (!hasFKs && !isReferenced && !['countries', 'provinces', 'cities'].includes(table.tableName.toLowerCase())) {
        suggestions.push(`Table ${table.tableName} appears to be orphaned (no relationships)`);
      }
    }

    return {
      success: true,
      data: { suggestions, issues },
      metadata: {
        totalSuggestions: suggestions.length,
        totalIssues: issues.length
      }
    };
  }
}

// Export singleton instance
export const aiEngine = new AIEngine();
