// =============================================================================
// Column Intelligence Engine - Advanced Column Analysis
// =============================================================================

import { ColumnDef, TableDef, ColumnIntelligence, UIComponentType, SemanticType, SensitivityLevel, ValidationRule } from './types';

/**
 * Column Intelligence Configuration
 */
export interface ColumnIntelligenceConfig {
  strictMode: boolean;
  inferRelations: boolean;
  detectPII: boolean;
  detectPHI: boolean;
  suggestIndexes: boolean;
}

/**
 * Column Intelligence Result
 */
export interface ColumnIntelligenceResult {
  column: ColumnIntelligence;
  relatedColumns: string[];
  suggestedRelations: SuggestedRelation[];
  indexSuggestions: IndexSuggestion[];
}

/**
 * Suggested relation
 */
export interface SuggestedRelation {
  targetTable: string;
  targetColumn: string;
  confidence: number;
  reason: string;
}

/**
 * Index suggestion
 */
export interface IndexSuggestion {
  columns: string[];
  type: 'unique' | 'index' | 'fulltext';
  reason: string;
}

/**
 * Pattern definition for column inference
 */
interface ColumnPattern {
  patterns: RegExp[];
  semanticType: SemanticType;
  uiType: UIComponentType;
  sensitivity: SensitivityLevel;
  confidence: number;
  validation?: ValidationRule[];
  searchable?: boolean;
  filterable?: boolean;
}

/**
 * Column Intelligence Engine
 * Provides advanced column analysis and metadata inference
 */
export class ColumnIntelligenceEngine {
  private config: ColumnIntelligenceConfig;
  private patterns: ColumnPattern[];

  constructor(config: Partial<ColumnIntelligenceConfig> = {}) {
    this.config = {
      strictMode: config.strictMode ?? false,
      inferRelations: config.inferRelations ?? true,
      detectPII: config.detectPII ?? true,
      detectPHI: config.detectPHI ?? true,
      suggestIndexes: config.suggestIndexes ?? true
    };

    this.patterns = this.initializePatterns();
  }

  /**
   * Initialize column patterns for inference
   */
  private initializePatterns(): ColumnPattern[] {
    return [
      // ─── IDENTITY PATTERNS ─────────────────────────────────────────
      {
        patterns: [/^id$/, /^pk$/, /^_id$/],
        semanticType: 'id',
        uiType: 'hidden',
        sensitivity: 'internal',
        confidence: 99
      },
      {
        patterns: [/_id$/, /Id$/, /ID$/],
        semanticType: 'foreign_key',
        uiType: 'dropdown',
        sensitivity: 'internal',
        confidence: 85,
        searchable: false,
        filterable: true
      },

      // ─── CONTACT PATTERNS ─────────────────────────────────────────
      {
        patterns: [/^email$/, /email_address/, /emailaddress/],
        semanticType: 'email',
        uiType: 'email_input',
        sensitivity: 'pii',
        confidence: 98,
        validation: [{ type: 'email', message: 'Please enter a valid email address' }],
        searchable: true,
        filterable: false
      },
      {
        patterns: [/phone/, /mobile/, /cell/, /tel(?!l)/, /contact_number/, /fax/],
        semanticType: 'phone',
        uiType: 'phone_input',
        sensitivity: 'pii',
        confidence: 95,
        searchable: true,
        filterable: false
      },

      // ─── NAME PATTERNS ─────────────────────────────────────────
      {
        patterns: [/first_name/, /firstname/, /fname/, /given_name/],
        semanticType: 'name',
        uiType: 'text_input',
        sensitivity: 'pii',
        confidence: 95,
        searchable: true
      },
      {
        patterns: [/last_name/, /lastname/, /lname/, /surname/, /family_name/],
        semanticType: 'name',
        uiType: 'text_input',
        sensitivity: 'pii',
        confidence: 95,
        searchable: true
      },
      {
        patterns: [/full_name/, /fullname/, /name$/],
        semanticType: 'name',
        uiType: 'text_input',
        sensitivity: 'pii',
        confidence: 80,
        searchable: true
      },

      // ─── ADDRESS PATTERNS ─────────────────────────────────────────
      {
        patterns: [/address/, /street/, /addr/],
        semanticType: 'address',
        uiType: 'textarea',
        sensitivity: 'pii',
        confidence: 90,
        searchable: true
      },
      {
        patterns: [/city$/],
        semanticType: 'foreign_key',
        uiType: 'dropdown',
        sensitivity: 'internal',
        confidence: 85,
        filterable: true
      },
      {
        patterns: [/country/, /nation/],
        semanticType: 'foreign_key',
        uiType: 'dropdown',
        sensitivity: 'internal',
        confidence: 90,
        filterable: true
      },
      {
        patterns: [/province/, /state/, /region/],
        semanticType: 'foreign_key',
        uiType: 'dropdown',
        sensitivity: 'internal',
        confidence: 85,
        filterable: true
      },
      {
        patterns: [/postal/, /zipcode/, /zip_code/, /postcode/],
        semanticType: 'code',
        uiType: 'text_input',
        sensitivity: 'internal',
        confidence: 90,
        filterable: true
      },

      // ─── AUTHENTICATION PATTERNS ─────────────────────────────────────────
      {
        patterns: [/password/, /passwd/, /pwd/, /secret/, /pin$/],
        semanticType: 'password',
        uiType: 'password_input',
        sensitivity: 'secret',
        confidence: 99,
        searchable: false,
        filterable: false
      },
      {
        patterns: [/token/, /api_key/, /apikey/, /auth_key/],
        semanticType: 'password',
        uiType: 'hidden',
        sensitivity: 'secret',
        confidence: 95,
        searchable: false
      },

      // ─── FINANCIAL PATTERNS ─────────────────────────────────────────
      {
        patterns: [/amount/, /price/, /cost/, /fee/, /charge/, /^total$/, /subtotal/, /grand_total/],
        semanticType: 'amount',
        uiType: 'currency_input',
        sensitivity: 'confidential',
        confidence: 92,
        filterable: true
      },
      {
        patterns: [/salary/, /wage/, /income/, /pay_rate/],
        semanticType: 'salary',
        uiType: 'currency_input',
        sensitivity: 'confidential',
        confidence: 95,
        searchable: false
      },
      {
        patterns: [/discount/, /deduction/, /adjustment/],
        semanticType: 'amount',
        uiType: 'currency_input',
        sensitivity: 'internal',
        confidence: 88
      },
      {
        patterns: [/tax/, /vat/, /gst/],
        semanticType: 'amount',
        uiType: 'currency_input',
        sensitivity: 'internal',
        confidence: 90
      },

      // ─── PERCENTAGE & RATIO PATTERNS ─────────────────────────────────────────
      {
        patterns: [/percentage/, /percent/, /rate$/, /ratio/, /_pct$/],
        semanticType: 'percentage',
        uiType: 'percentage_input',
        sensitivity: 'internal',
        confidence: 90
      },

      // ─── COUNT & QUANTITY PATTERNS ─────────────────────────────────────────
      {
        patterns: [/quantity/, /qty/, /^count$/, /number_of/, /_count$/, /total_/],
        semanticType: 'quantity',
        uiType: 'number_input',
        sensitivity: 'internal',
        confidence: 88
      },

      // ─── DATE & TIME PATTERNS ─────────────────────────────────────────
      {
        patterns: [/date_of_birth/, /dob/, /birthdate/, /birthday/],
        semanticType: 'date',
        uiType: 'date_picker',
        sensitivity: 'pii',
        confidence: 98,
        filterable: true
      },
      {
        patterns: [/date$/, /_date$/, /^date_/],
        semanticType: 'date',
        uiType: 'date_picker',
        sensitivity: 'internal',
        confidence: 85,
        filterable: true
      },
      {
        patterns: [/time$/, /_time$/],
        semanticType: 'time',
        uiType: 'time_picker',
        sensitivity: 'internal',
        confidence: 85
      },
      {
        patterns: [/datetime/, /timestamp/],
        semanticType: 'datetime',
        uiType: 'datetime_picker',
        sensitivity: 'internal',
        confidence: 90,
        filterable: true
      },

      // ─── AUDIT PATTERNS ─────────────────────────────────────────
      {
        patterns: [/created_on/, /createdon/, /created_at/, /createdat/, /date_created/],
        semanticType: 'audit_timestamp',
        uiType: 'read_only',
        sensitivity: 'internal',
        confidence: 98
      },
      {
        patterns: [/modified_on/, /modifiedon/, /modified_at/, /modifiedat/, /updated_at/, /date_modified/],
        semanticType: 'audit_timestamp',
        uiType: 'read_only',
        sensitivity: 'internal',
        confidence: 98
      },
      {
        patterns: [/created_by/, /createdby/, /author/],
        semanticType: 'audit_user',
        uiType: 'read_only',
        sensitivity: 'internal',
        confidence: 95
      },
      {
        patterns: [/modified_by/, /modifiedby/, /updated_by/, /last_modified_by/],
        semanticType: 'audit_user',
        uiType: 'read_only',
        sensitivity: 'internal',
        confidence: 95
      },

      // ─── BOOLEAN PATTERNS ─────────────────────────────────────────
      {
        patterns: [/^is_/, /is_active/, /is_deleted/, /is_verified/, /is_enabled/, /has_/],
        semanticType: 'boolean_flag',
        uiType: 'toggle',
        sensitivity: 'internal',
        confidence: 95,
        filterable: true
      },
      {
        patterns: [/^can_/, /^allow_/, /^enable_/, /^require_/],
        semanticType: 'boolean_flag',
        uiType: 'toggle',
        sensitivity: 'internal',
        confidence: 90,
        filterable: true
      },

      // ─── STATUS & TYPE PATTERNS ─────────────────────────────────────────
      {
        patterns: [/status$/, /_status$/],
        semanticType: 'status',
        uiType: 'dropdown',
        sensitivity: 'internal',
        confidence: 90,
        filterable: true
      },
      {
        patterns: [/_type$/, /type$/],
        semanticType: 'type',
        uiType: 'dropdown',
        sensitivity: 'internal',
        confidence: 88,
        filterable: true
      },
      {
        patterns: [/category$/, /_category$/],
        semanticType: 'category',
        uiType: 'dropdown',
        sensitivity: 'internal',
        confidence: 88,
        filterable: true
      },
      {
        patterns: [/priority$/, /_priority$/],
        semanticType: 'status',
        uiType: 'dropdown',
        sensitivity: 'internal',
        confidence: 88,
        filterable: true
      },

      // ─── CODE & IDENTIFIER PATTERNS ─────────────────────────────────────────
      {
        patterns: [/code$/, /_code$/],
        semanticType: 'code',
        uiType: 'text_input',
        sensitivity: 'internal',
        confidence: 88,
        searchable: true
      },
      {
        patterns: [/mrn/, /medical_record/, /patient_id$/],
        semanticType: 'medical_record_number',
        uiType: 'text_input',
        sensitivity: 'phi',
        confidence: 92,
        searchable: true
      },
      {
        patterns: [/sku/, /barcode/, /upc/, /isbn/],
        semanticType: 'code',
        uiType: 'text_input',
        sensitivity: 'internal',
        confidence: 90,
        searchable: true
      },

      // ─── NATIONAL ID PATTERNS ─────────────────────────────────────────
      {
        patterns: [/cnic/, /nic/, /ssn/, /national_id/, /nationalid/, /passport_number/],
        semanticType: 'national_id',
        uiType: 'text_input',
        sensitivity: 'pii',
        confidence: 95,
        searchable: true
      },
      {
        patterns: [/license_number/, /license_no/, /registration_number/],
        semanticType: 'code',
        uiType: 'text_input',
        sensitivity: 'pii',
        confidence: 88,
        searchable: true
      },

      // ─── GENDER & DEMOGRAPHICS ─────────────────────────────────────────
      {
        patterns: [/gender/, /sex$/],
        semanticType: 'gender',
        uiType: 'dropdown',
        sensitivity: 'pii',
        confidence: 95,
        filterable: true
      },
      {
        patterns: [/blood_group/, /blood_type/],
        semanticType: 'status',
        uiType: 'dropdown',
        sensitivity: 'phi',
        confidence: 95,
        filterable: true
      },
      {
        patterns: [/marital_status/, /relationship_status/],
        semanticType: 'status',
        uiType: 'dropdown',
        sensitivity: 'pii',
        confidence: 92,
        filterable: true
      },
      {
        patterns: [/religion/, /ethnicity/, /nationality/],
        semanticType: 'status',
        uiType: 'dropdown',
        sensitivity: 'pii',
        confidence: 90,
        filterable: true
      },

      // ─── AGE & MEASUREMENT ─────────────────────────────────────────
      {
        patterns: [/^age$/, /_age$/],
        semanticType: 'age',
        uiType: 'number_input',
        sensitivity: 'pii',
        confidence: 95
      },
      {
        patterns: [/weight/, /mass/],
        semanticType: 'measurement',
        uiType: 'number_input',
        sensitivity: 'phi',
        confidence: 90
      },
      {
        patterns: [/height/, /length/],
        semanticType: 'measurement',
        uiType: 'number_input',
        sensitivity: 'phi',
        confidence: 90
      },
      {
        patterns: [/bmi/, /body_mass/],
        semanticType: 'measurement',
        uiType: 'number_input',
        sensitivity: 'phi',
        confidence: 92
      },

      // ─── MEDIA PATTERNS ─────────────────────────────────────────
      {
        patterns: [/image/, /photo/, /picture/, /avatar/, /logo/, /thumbnail/],
        semanticType: 'image',
        uiType: 'image_upload',
        sensitivity: 'internal',
        confidence: 90
      },
      {
        patterns: [/file/, /document/, /attachment/, /report_file/],
        semanticType: 'file',
        uiType: 'file_upload',
        sensitivity: 'internal',
        confidence: 88
      },
      {
        patterns: [/video/, /audio/],
        semanticType: 'file',
        uiType: 'file_upload',
        sensitivity: 'internal',
        confidence: 90
      },

      // ─── URL & WEB PATTERNS ─────────────────────────────────────────
      {
        patterns: [/url$/, /website/, /link$/, /homepage/],
        semanticType: 'url',
        uiType: 'url_input',
        sensitivity: 'internal',
        confidence: 90
      },
      {
        patterns: [/domain/, /hostname/],
        semanticType: 'url',
        uiType: 'text_input',
        sensitivity: 'internal',
        confidence: 85
      },

      // ─── DESCRIPTION & TEXT PATTERNS ─────────────────────────────────────────
      {
        patterns: [/description/, /notes$/, /remarks/, /comments/, /details/, /content/],
        semanticType: 'description',
        uiType: 'textarea',
        sensitivity: 'internal',
        confidence: 90,
        searchable: true
      },
      {
        patterns: [/title$/, /subject/, /headline/, /caption/],
        semanticType: 'title',
        uiType: 'text_input',
        sensitivity: 'internal',
        confidence: 88,
        searchable: true
      },
      {
        patterns: [/summary/, /abstract/, /overview/],
        semanticType: 'description',
        uiType: 'textarea',
        sensitivity: 'internal',
        confidence: 88
      },

      // ─── MEDICAL/CLINICAL PATTERNS ─────────────────────────────────────────
      {
        patterns: [/diagnosis/, /icd_code/, /icd10/],
        semanticType: 'diagnosis',
        uiType: 'dropdown',
        sensitivity: 'phi',
        confidence: 95,
        searchable: true
      },
      {
        patterns: [/prescription/, /medication/, /drug_name/],
        semanticType: 'treatment',
        uiType: 'dropdown',
        sensitivity: 'phi',
        confidence: 92,
        searchable: true
      },
      {
        patterns: [/allergy/, /allergic/],
        semanticType: 'diagnosis',
        uiType: 'textarea',
        sensitivity: 'phi',
        confidence: 90
      },
      {
        patterns: [/symptom/, /complaint/, /chief_complaint/],
        semanticType: 'description',
        uiType: 'textarea',
        sensitivity: 'phi',
        confidence: 88
      },
      {
        patterns: [/lab_result/, /test_result/, /result_value/],
        semanticType: 'treatment',
        uiType: 'text_input',
        sensitivity: 'phi',
        confidence: 90
      },

      // ─── SORT & ORDER PATTERNS ─────────────────────────────────────────
      {
        patterns: [/sort_order/, /display_order/, /sequence/, /order$/, /priority$/],
        semanticType: 'sort_order',
        uiType: 'number_input',
        sensitivity: 'internal',
        confidence: 92
      },

      // ─── COLOR PATTERNS ─────────────────────────────────────────
      {
        patterns: [/color$/, /colour$/],
        semanticType: 'color',
        uiType: 'color_picker',
        sensitivity: 'internal',
        confidence: 95
      },

      // ─── LOCATION/GEOSPATIAL PATTERNS ─────────────────────────────────────────
      {
        patterns: [/latitude/, /^lat$/],
        semanticType: 'geo_location',
        uiType: 'number_input',
        sensitivity: 'internal',
        confidence: 95
      },
      {
        patterns: [/longitude/, /^lng$/, /^lon$/],
        semanticType: 'geo_location',
        uiType: 'number_input',
        sensitivity: 'internal',
        confidence: 95
      }
    ];
  }

  /**
   * Analyze a single column
   */
  analyzeColumn(column: ColumnDef, tableName: string): ColumnIntelligenceResult {
    const columnName = column.name.toLowerCase();
    const dataType = column.dataType.toUpperCase();

    // Find matching pattern
    let bestMatch: ColumnPattern | null = null;
    let bestScore = 0;

    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(columnName)) {
          const score = pattern.confidence + (pattern.patterns.indexOf(regex) === 0 ? 5 : 0);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = pattern;
          }
        }
      }
    }

    // Determine UI type and semantic type
    let semanticType: SemanticType = 'unknown';
    let uiType: UIComponentType = 'text_input';
    let sensitivity: SensitivityLevel = 'internal';
    let confidence = 30;
    let searchable = false;
    let filterable = false;

    if (bestMatch) {
      semanticType = bestMatch.semanticType;
      sensitivity = bestMatch.sensitivity;
      confidence = Math.min(bestMatch.confidence, 100);
      searchable = bestMatch.searchable ?? false;
      filterable = bestMatch.filterable ?? false;

      // Use pattern's UI type, but override based on data type
      uiType = this.overrideUIType(bestMatch.uiType, dataType, column);
    } else {
      // Infer from data type only
      const typeInference = this.inferFromDataType(column);
      uiType = typeInference.uiType;
      sensitivity = typeInference.sensitivity;
    }

    // Generate validation rules
    const validationRules = this.generateValidationRules(column, semanticType);

    // Build result
    const intelligence: ColumnIntelligence = {
      columnName: column.name,
      tableName,
      inferredUIType: uiType,
      inferredSemanticType: semanticType,
      sensitivityLevel: sensitivity,
      validationRules,
      confidence,
      suggestions: this.generateSuggestions(column, semanticType, uiType),
      isSearchable: searchable || this.isSearchable(columnName, dataType),
      isFilterable: filterable || this.isFilterable(columnName, dataType),
      displayInList: this.shouldDisplayInList(columnName, dataType, column.isPrimaryKey),
      placeholder: this.getPlaceholder(columnName, semanticType),
      label: this.formatLabel(column.name),
      icon: this.getIcon(semanticType)
    };

    // Generate related columns and suggestions
    const relatedColumns = this.findRelatedColumns(column, tableName);
    const suggestedRelations = this.config.inferRelations 
      ? this.suggestRelations(column, tableName) 
      : [];
    const indexSuggestions = this.config.suggestIndexes 
      ? this.suggestIndexes(column, tableName) 
      : [];

    return {
      column: intelligence,
      relatedColumns,
      suggestedRelations,
      indexSuggestions
    };
  }

  /**
   * Analyze all columns in a table
   */
  analyzeTable(table: TableDef): Map<string, ColumnIntelligenceResult> {
    const results = new Map<string, ColumnIntelligenceResult>();
    
    for (const column of table.columns) {
      results.set(column.name, this.analyzeColumn(column, table.tableName));
    }

    return results;
  }

  /**
   * Analyze all tables
   */
  analyzeTables(tables: TableDef[]): Map<string, Map<string, ColumnIntelligenceResult>> {
    const results = new Map<string, Map<string, ColumnIntelligenceResult>>();
    
    for (const table of tables) {
      results.set(table.tableName, this.analyzeTable(table));
    }

    return results;
  }

  /**
   * Override UI type based on data type
   */
  private overrideUIType(patternUIType: UIComponentType, dataType: string, column: ColumnDef): UIComponentType {
    // Always use specific types for certain data types
    switch (dataType) {
      case 'BIT':
        return 'toggle';
      case 'UNIQUEIDENTIFIER':
        return column.isPrimaryKey ? 'hidden' : 'dropdown';
      case 'DATETIME':
      case 'DATETIME2':
      case 'SMALLDATETIME':
      case 'DATETIMEOFFSET':
        return patternUIType === 'date_picker' ? 'datetime_picker' : patternUIType;
      case 'IMAGE':
      case 'VARBINARY':
      case 'BINARY':
        return 'file_upload';
    }

    // Check max length for text areas
    if ((dataType === 'NVARCHAR' || dataType === 'VARCHAR' || dataType === 'TEXT' || dataType === 'NTEXT') && column.maxLength) {
      if (column.maxLength === 'MAX' || parseInt(column.maxLength) > 500) {
        if (patternUIType === 'text_input') {
          return 'textarea';
        }
      }
    }

    return patternUIType;
  }

  /**
   * Infer from data type only
   */
  private inferFromDataType(column: ColumnDef): { uiType: UIComponentType; sensitivity: SensitivityLevel } {
    const type = column.dataType.toUpperCase();

    switch (type) {
      case 'BIT':
        return { uiType: 'toggle', sensitivity: 'internal' };
      case 'INT':
      case 'BIGINT':
      case 'SMALLINT':
      case 'TINYINT':
        return { uiType: 'number_input', sensitivity: 'internal' };
      case 'DECIMAL':
      case 'NUMERIC':
      case 'FLOAT':
      case 'REAL':
      case 'MONEY':
      case 'SMALLMONEY':
        return { uiType: 'currency_input', sensitivity: 'internal' };
      case 'DATETIME':
      case 'DATETIME2':
      case 'SMALLDATETIME':
      case 'DATETIMEOFFSET':
        return { uiType: 'datetime_picker', sensitivity: 'internal' };
      case 'DATE':
        return { uiType: 'date_picker', sensitivity: 'internal' };
      case 'TIME':
        return { uiType: 'time_picker', sensitivity: 'internal' };
      case 'UNIQUEIDENTIFIER':
        return { uiType: 'hidden', sensitivity: 'internal' };
      case 'IMAGE':
      case 'VARBINARY':
      case 'BINARY':
        return { uiType: 'file_upload', sensitivity: 'internal' };
      case 'IMAGE':
      case 'VARBINARY':
      case 'BINARY':
        return { uiType: 'file_upload', sensitivity: 'internal' };
      case 'XML':
        return { uiType: 'textarea', sensitivity: 'internal' };
      default:
        return { uiType: 'text_input', sensitivity: 'internal' };
    }
  }

  /**
   * Generate validation rules
   */
  private generateValidationRules(column: ColumnDef, semanticType: SemanticType): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Required validation
    if (!column.isNullable && !column.isPrimaryKey && !column.isIdentity) {
      rules.push({ type: 'required', message: `${column.name} is required` });
    }

    // Semantic-specific validation
    switch (semanticType) {
      case 'email':
        rules.push({ type: 'email', message: 'Please enter a valid email address' });
        break;
      case 'phone':
        rules.push({ type: 'phone', message: 'Please enter a valid phone number' });
        break;
      case 'url':
        rules.push({ type: 'url', message: 'Please enter a valid URL' });
        break;
      case 'national_id':
        rules.push({ type: 'pattern', value: '^[0-9]{5}-[0-9]{7}-[0-9]$', message: 'Format: XXXXX-XXXXXXX-X' });
        break;
    }

    // Length validation
    if (column.maxLength && column.maxLength !== 'MAX') {
      const maxLen = parseInt(column.maxLength);
      rules.push({ type: 'max_length', value: maxLen, message: `Maximum ${maxLen} characters` });
    }

    return rules;
  }

  /**
   * Generate suggestions
   */
  private generateSuggestions(column: ColumnDef, semanticType: SemanticType, uiType: UIComponentType): string[] {
    const suggestions: string[] = [];

    if (semanticType === 'foreign_key') {
      suggestions.push('Add dropdown populated from referenced table');
      suggestions.push('Consider cascade delete/update rules');
    }

    if (uiType === 'textarea' && !column.maxLength) {
      suggestions.push('Consider setting a maximum length');
    }

    if (semanticType === 'unknown') {
      suggestions.push('Column purpose unclear - add documentation');
    }

    if (column.isNullable && ['email', 'phone', 'national_id'].includes(semanticType)) {
      suggestions.push('Consider making this field required');
    }

    return suggestions;
  }

  /**
   * Find related columns
   */
  private findRelatedColumns(column: ColumnDef, tableName: string): string[] {
    const related: string[] = [];
    const name = column.name.toLowerCase();

    // Common column groupings
    const groups: string[][] = [
      ['first_name', 'last_name', 'middle_name', 'full_name'],
      ['address', 'city', 'state', 'country', 'postal_code', 'zip_code'],
      ['phone', 'mobile', 'email', 'fax'],
      ['created_on', 'created_by', 'modified_on', 'modified_by'],
      ['start_date', 'end_date', 'start_time', 'end_time'],
      ['amount', 'tax', 'discount', 'total'],
    ];

    for (const group of groups) {
      if (group.includes(name)) {
        related.push(...group.filter(c => c !== name));
      }
    }

    return related;
  }

  /**
   * Suggest relations for FK columns
   */
  private suggestRelations(column: ColumnDef, tableName: string): SuggestedRelation[] {
    const name = column.name.toLowerCase();
    const relations: SuggestedRelation[] = [];

    if (!name.endsWith('_id') || name === 'id') return relations;

    // Extract likely table name from FK column
    let likelyTable = name.replace(/_id$/, '').replace(/_/g, '');
    
    // Handle plural/singular
    const pluralMappings: Record<string, string> = {
      'user': 'Users',
      'patient': 'Patients',
      'doctor': 'Doctors',
      'employee': 'Employees',
      'department': 'Departments',
      'city': 'Cities',
      'country': 'Countries',
      'organization': 'Organizations',
      'service': 'Services',
      'product': 'Products',
      'category': 'Categories',
      'status': 'Statuses',
      'type': 'Types',
    };

    const suggestedTable = pluralMappings[likelyTable] || likelyTable.charAt(0).toUpperCase() + likelyTable.slice(1) + 's';

    relations.push({
      targetTable: suggestedTable,
      targetColumn: 'Id',
      confidence: 75,
      reason: `FK column naming suggests relationship to ${suggestedTable} table`
    });

    return relations;
  }

  /**
   * Suggest indexes
   */
  private suggestIndexes(column: ColumnDef, tableName: string): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];
    const name = column.name.toLowerCase();

    // Suggest indexes for FK columns
    if (name.endsWith('_id') && name !== 'id') {
      suggestions.push({
        columns: [column.name],
        type: 'index',
        reason: 'Foreign key columns should be indexed for join performance'
      });
    }

    // Suggest unique index for code fields
    if (name.includes('code') || name.includes('mrn') || name.includes('email')) {
      suggestions.push({
        columns: [column.name],
        type: 'unique',
        reason: 'Unique identifier fields should have unique constraint'
      });
    }

    // Suggest index for status/type columns
    if (name.endsWith('status') || name.endsWith('type') || name.endsWith('category')) {
      suggestions.push({
        columns: [column.name],
        type: 'index',
        reason: 'Status/type columns are frequently used in WHERE clauses'
      });
    }

    return suggestions;
  }

  /**
   * Check if column should be searchable
   */
  private isSearchable(name: string, type: string): boolean {
    const searchablePatterns = [/name/, /email/, /phone/, /code/, /mrn/, /title/, /address/];
    return searchablePatterns.some(p => p.test(name));
  }

  /**
   * Check if column should be filterable
   */
  private isFilterable(name: string, type: string): boolean {
    const filterablePatterns = [/status/, /type$/, /category/, /gender/, /is_/, /city/, /country/, /department/, /date/];
    return filterablePatterns.some(p => p.test(name));
  }

  /**
   * Check if column should display in list views
   */
  private shouldDisplayInList(name: string, type: string, isPK: boolean): boolean {
    if (isPK) return false;
    const hiddenPatterns = [/password/, /secret/, /token/, /hash/, /^created/, /^modified/];
    return !hiddenPatterns.some(p => p.test(name));
  }

  /**
   * Get placeholder text
   */
  private getPlaceholder(name: string, semanticType: SemanticType): string {
    const placeholders: Record<string, string> = {
      email: 'user@example.com',
      phone: '+1 234 567 8900',
      url: 'https://example.com',
      address: 'Enter full address',
      national_id: 'XXXXX-XXXXXXX-X',
      code: 'Enter code',
      name: 'Enter name',
      title: 'Enter title',
    };
    return placeholders[semanticType] || '';
  }

  /**
   * Format column name as label
   */
  private formatLabel(columnName: string): string {
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
  private getIcon(semanticType: SemanticType): string {
    const icons: Record<string, string> = {
      email: '📧',
      phone: '📞',
      password: '🔒',
      address: '📍',
      name: '👤',
      date: '📅',
      time: '⏰',
      amount: '💰',
      status: '📊',
      image: '🖼️',
      file: '📎',
      url: '🔗',
      gender: '⚧',
      boolean_flag: '✓',
      foreign_key: '🔗',
      diagnosis: '🏥',
      treatment: '💊',
    };
    return icons[semanticType] || '📝';
  }
}

// Export singleton instance
export const columnIntelligence = new ColumnIntelligenceEngine();
