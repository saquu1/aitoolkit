/**
 * Column Intelligence Agent
 * 
 * Analyzes columns to infer UI types, semantic types, validation rules,
 * and display properties.
 * 
 * Task: TASK-3.2d - Specialized Agent
 */

import { BaseAgent, AgentContext, AgentResult } from "@/agents/core/agent-interface"
import { z } from "zod"
import { prisma } from "@/lib/db"

// ============================================================================
// Types
// ============================================================================

export const ColumnIntelligenceInputSchema = z.object({
  columns: z.array(z.object({
    id: z.string().optional(),
    columnName: z.string(),
    tableName: z.string(),
    dataType: z.string(),
    maxLength: z.number().optional(),
    precision: z.number().optional(),
    scale: z.number().optional(),
    isNullable: z.boolean(),
    isPrimaryKey: z.boolean(),
    isForeignKey: z.boolean(),
    defaultValue: z.string().optional(),
    position: z.number().optional()
  }))
})

export type ColumnIntelligenceInput = z.infer<typeof ColumnIntelligenceInputSchema>

export interface ColumnIntelligence {
  columnId: string
  columnName: string
  tableName: string
  
  // UI Intelligence
  uiType: UIType
  uiComponent: string
  inputType: string
  
  // Semantic Intelligence
  semanticType: SemanticType
  semanticCategory: string
  piiFlag: boolean
  phiFlag: boolean
  
  // Validation
  validationRules: ValidationRule[]
  
  // Display
  displayName: string
  displayFormat: string
  placeholder: string
  helpText: string
  
  // Confidence
  confidence: number
  reasoning: string[]
}

export type UIType = 
  | 'text_input'
  | 'text_area'
  | 'number_input'
  | 'dropdown'
  | 'checkbox'
  | 'radio'
  | 'date_picker'
  | 'datetime_picker'
  | 'time_picker'
  | 'file_upload'
  | 'color_picker'
  | 'slider'
  | 'toggle'
  | 'auto_complete'
  | 'rich_text'
  | 'password'
  | 'email'
  | 'phone'
  | 'url'
  | 'hidden'

export type SemanticType = 
  | 'id'
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'date'
  | 'datetime'
  | 'time'
  | 'money'
  | 'percentage'
  | 'quantity'
  | 'description'
  | 'status'
  | 'code'
  | 'flag'
  | 'image'
  | 'file'
  | 'url'
  | 'password'
  | 'age'
  | 'weight'
  | 'height'
  | 'coordinates'
  | 'json'
  | 'unknown'

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom'
  value?: any
  message: string
}

// ============================================================================
// Column Intelligence Agent
// ============================================================================

export class ColumnIntelligenceAgent extends BaseAgent {
  readonly id = "column-intelligence"
  readonly name = "Column Intelligence Agent"
  readonly version = "1.0.0"
  readonly description = "Analyzes columns to infer UI types, semantic types, validation rules, and display properties"
  readonly category = 'intelligence' as const
  readonly layer = 'intelligence' as const
  readonly dependsOn = ["sql-parser"]
  readonly produces = ["columnIntelligence"]
  
  readonly inputSchema = ColumnIntelligenceInputSchema
  readonly estimatedDuration = 45
  readonly requiresAI = false

  // Pattern definitions for intelligence inference
  private readonly patterns = {
    // Name patterns
    name: {
      patterns: [/^(first|last|middle|full|user|customer|patient|client|contact|employee|doctor|nurse)_?name$/i, /^name$/i],
      uiType: 'text_input' as UIType,
      semanticType: 'name' as SemanticType,
      validation: { maxLength: 100 }
    },
    
    // Email patterns
    email: {
      patterns: [/email/i, /e_mail/i, /^e$|^mail$/i],
      uiType: 'email' as UIType,
      semanticType: 'email' as SemanticType,
      validation: { pattern: '^[^@]+@[^@]+\\.[^@]+$' }
    },
    
    // Phone patterns
    phone: {
      patterns: [/phone/i, /telephone/i, /mobile/i, /cell/i, /fax/i, /^tel$/i],
      uiType: 'phone' as UIType,
      semanticType: 'phone' as SemanticType,
      validation: { pattern: '^[+]?[\\d\\s-()]+$' }
    },
    
    // Address patterns
    address: {
      patterns: [/address/i, /street/i, /city/i, /state/i, /country/i, /zip/i, /postal/i],
      uiType: 'text_input' as UIType,
      semanticType: 'address' as SemanticType,
      validation: { maxLength: 255 }
    },
    
    // Date patterns
    date: {
      patterns: [/date$/i, /_date$/i, /^date_/i, /birthday/i, /dob/i, /created|updated|deleted/i],
      uiType: 'date_picker' as UIType,
      semanticType: 'date' as SemanticType,
      validation: {}
    },
    
    // Money patterns
    money: {
      patterns: [/amount/i, /price/i, /cost/i, /fee/i, /salary/i, /total/i, /subtotal/i, /tax/i, /discount/i, /payment/i, /balance/i, /^money$/i],
      uiType: 'number_input' as UIType,
      semanticType: 'money' as SemanticType,
      validation: { min: 0 }
    },
    
    // Percentage patterns
    percentage: {
      patterns: [/percent/i, /rate/i, /^pct$/i, /_pct$/i],
      uiType: 'slider' as UIType,
      semanticType: 'percentage' as SemanticType,
      validation: { min: 0, max: 100 }
    },
    
    // Quantity patterns
    quantity: {
      patterns: [/qty$/i, /quantity/i, /count$/i, /total_/i, /number_of/i],
      uiType: 'number_input' as UIType,
      semanticType: 'quantity' as SemanticType,
      validation: { min: 0 }
    },
    
    // Description patterns
    description: {
      patterns: [/description/i, /desc$/i, /notes$/i, /comment/i, /remark/i, /detail/i, /message/i, /content/i],
      uiType: 'text_area' as UIType,
      semanticType: 'description' as SemanticType,
      validation: { maxLength: 2000 }
    },
    
    // Status patterns
    status: {
      patterns: [/status$/i, /state$/i, /type$/i, /category$/i, /type_id$/i, /status_id$/i],
      uiType: 'dropdown' as UIType,
      semanticType: 'status' as SemanticType,
      validation: {}
    },
    
    // Code patterns
    code: {
      patterns: [/code$/i, /^code$/i, /_code$/i, /number$/i, /_no$/i, /_num$/i, /account/i, /reference$/i],
      uiType: 'text_input' as UIType,
      semanticType: 'code' as SemanticType,
      validation: {}
    },
    
    // Flag patterns
    flag: {
      patterns: [/^is_/i, /^has_/i, /^can_/i, /^should_/i, /^active$/i, /^enabled$/i, /^deleted$/i, /^visible$/i, /_flag$/i],
      uiType: 'checkbox' as UIType,
      semanticType: 'flag' as SemanticType,
      validation: {}
    },
    
    // Image patterns
    image: {
      patterns: [/image/i, /photo/i, /picture/i, /avatar/i, /logo/i, /thumbnail/i, /icon/i],
      uiType: 'file_upload' as UIType,
      semanticType: 'image' as SemanticType,
      validation: { accept: 'image/*' }
    },
    
    // File patterns
    file: {
      patterns: [/file/i, /document/i, /attachment/i, /upload/i],
      uiType: 'file_upload' as UIType,
      semanticType: 'file' as SemanticType,
      validation: {}
    },
    
    // URL patterns
    url: {
      patterns: [/url$/i, /website$/i, /link$/i, /domain$/i],
      uiType: 'url' as UIType,
      semanticType: 'url' as SemanticType,
      validation: { pattern: '^https?://' }
    },
    
    // Password patterns
    password: {
      patterns: [/password/i, /pwd$/i, /secret$/i, /token$/i],
      uiType: 'password' as UIType,
      semanticType: 'password' as SemanticType,
      validation: { minLength: 8 }
    },
    
    // Age patterns
    age: {
      patterns: [/^age$/i, /_age$/i],
      uiType: 'number_input' as UIType,
      semanticType: 'age' as SemanticType,
      validation: { min: 0, max: 150 }
    }
  }

  // PII detection patterns
  private readonly piiPatterns = [
    /ssn/i, /social.?security/i, /tax.?id/i, /national.?id/i,
    /passport/i, /license/i, /credit.?card/i, /card.?number/i,
    /bank.?account/i, /account.?number/i,
    /medical.?record/i, /mrn/i, /patient.?id/i,
    /ip.?address/i, /mac.?address/i
  ]

  // PHI detection patterns (Protected Health Information)
  private readonly phiPatterns = [
    /diagnosis/i, /icd.?code/i, /procedure.?code/i, /cpt/i,
    /lab.?result/i, /test.?result/i, /vital/i, /blood/i,
    /medication/i, /prescription/i, /drug/i, /treatment/i,
    /condition/i, /allergy/i, /symptom/i, /health/i,
    /hipaa/i, /phi/i
  ]

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now()
    const input = context.input as ColumnIntelligenceInput

    // Get columns from shared state or input
    const columns = this.getSharedState(context, 'parsedColumns') || input.columns
    
    if (!columns || columns.length === 0) {
      return this.createErrorResult(['No columns provided for analysis'])
    }

    const intelligenceResults: ColumnIntelligence[] = []
    const warnings: string[] = []

    for (const column of columns) {
      try {
        const intelligence = this.analyzeColumn(column)
        intelligenceResults.push(intelligence)
      } catch (error) {
        warnings.push(`Failed to analyze column ${column.columnName}: ${error}`)
      }
    }

    // Store in shared state
    this.setSharedState(context, "columnIntelligence", intelligenceResults)

    // Build output map
    const outputMap: Record<string, ColumnIntelligence> = {}
    for (const result of intelligenceResults) {
      outputMap[`${result.tableName}.${result.columnName}`] = result
    }

    return this.createSuccessResult(
      { columnIntelligence: outputMap },
      columns.length,
      intelligenceResults.length,
      warnings,
      { columnIntelligence: intelligenceResults }
    )
  }

  /**
   * Analyze a single column
   */
  private analyzeColumn(column: any): ColumnIntelligence {
    const reasoning: string[] = []
    let confidence = 0.5

    // Determine UI type based on data type
    let uiType = this.inferUITypeFromDataType(column.dataType, column)
    reasoning.push(`Data type ${column.dataType} suggests UI type: ${uiType}`)
    confidence += 0.2

    // Determine semantic type based on column name
    const semanticResult = this.inferSemanticType(column.columnName)
    if (semanticResult.matched) {
      uiType = semanticResult.uiType || uiType
      confidence += 0.3
      reasoning.push(`Column name pattern matched: ${semanticResult.pattern}`)
    }

    // Check for PII/PHI
    const piiFlag = this.detectPII(column.columnName)
    const phiFlag = this.detectPHI(column.columnName)
    
    if (piiFlag) {
      reasoning.push('PII detected based on column name pattern')
      confidence += 0.1
    }
    if (phiFlag) {
      reasoning.push('PHI detected based on column name pattern')
      confidence += 0.1
    }

    // Generate validation rules
    const validationRules = this.generateValidationRules(column, uiType)

    // Generate display properties
    const displayProps = this.generateDisplayProperties(column)

    // Cap confidence at 1.0
    confidence = Math.min(confidence, 1.0)

    return {
      columnId: column.id || `${column.tableName}.${column.columnName}`,
      columnName: column.columnName,
      tableName: column.tableName,
      uiType,
      uiComponent: this.mapUIToComponent(uiType),
      inputType: this.mapUIToInputType(uiType),
      semanticType: semanticResult.semanticType,
      semanticCategory: this.getSemanticCategory(semanticResult.semanticType),
      piiFlag,
      phiFlag,
      validationRules,
      displayName: displayProps.displayName,
      displayFormat: displayProps.displayFormat,
      placeholder: displayProps.placeholder,
      helpText: displayProps.helpText,
      confidence,
      reasoning
    }
  }

  /**
   * Infer UI type from SQL data type
   */
  private inferUITypeFromDataType(dataType: string, column: any): UIType {
    const type = dataType.toUpperCase()

    // Boolean types
    if (type === 'BIT' || type === 'BOOLEAN') {
      return 'checkbox'
    }

    // Integer types
    if (['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(type)) {
      // Check if it's a foreign key
      if (column.isForeignKey) {
        return 'dropdown'
      }
      return 'number_input'
    }

    // Decimal types
    if (['DECIMAL', 'NUMERIC', 'MONEY', 'SMALLMONEY'].includes(type)) {
      return 'number_input'
    }

    // Float types
    if (['FLOAT', 'REAL', 'DOUBLE'].includes(type)) {
      return 'number_input'
    }

    // Date types
    if (type === 'DATE') {
      return 'date_picker'
    }

    // DateTime types
    if (['DATETIME', 'DATETIME2', 'SMALLDATETIME', 'TIMESTAMP'].includes(type)) {
      return 'datetime_picker'
    }

    // Time types
    if (type === 'TIME') {
      return 'time_picker'
    }

    // Text types
    if (['TEXT', 'NTEXT', 'XML'].includes(type)) {
      return 'text_area'
    }

    // String types
    if (['VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR'].includes(type)) {
      if (column.maxLength && column.maxLength > 200) {
        return 'text_area'
      }
      if (column.maxLength && column.maxLength <= 10) {
        return 'text_input'
      }
      return 'text_input'
    }

    // Unique identifier
    if (type === 'UNIQUEIDENTIFIER' || type === 'UUID') {
      return 'hidden'
    }

    // JSON
    if (type === 'JSON') {
      return 'text_area'
    }

    // Binary
    if (['VARBINARY', 'BINARY', 'IMAGE'].includes(type)) {
      return 'file_upload'
    }

    return 'text_input'
  }

  /**
   * Infer semantic type from column name
   */
  private inferSemanticType(columnName: string): {
    matched: boolean
    pattern?: string
    uiType?: UIType
    semanticType: SemanticType
  } {
    for (const [key, config] of Object.entries(this.patterns)) {
      for (const pattern of config.patterns) {
        if (pattern.test(columnName)) {
          return {
            matched: true,
            pattern: key,
            uiType: config.uiType,
            semanticType: config.semanticType
          }
        }
      }
    }

    return {
      matched: false,
      semanticType: 'unknown'
    }
  }

  /**
   * Detect PII
   */
  private detectPII(columnName: string): boolean {
    return this.piiPatterns.some(pattern => pattern.test(columnName))
  }

  /**
   * Detect PHI
   */
  private detectPHI(columnName: string): boolean {
    return this.phiPatterns.some(pattern => pattern.test(columnName))
  }

  /**
   * Generate validation rules
   */
  private generateValidationRules(column: any, uiType: UIType): ValidationRule[] {
    const rules: ValidationRule[] = []

    // Required validation
    if (!column.isNullable && !column.isPrimaryKey) {
      rules.push({
        type: 'required',
        message: `${this.formatColumnName(column.columnName)} is required`
      })
    }

    // Max length validation
    if (column.maxLength && ['text_input', 'text_area'].includes(uiType)) {
      rules.push({
        type: 'maxLength',
        value: column.maxLength,
        message: `Maximum ${column.maxLength} characters allowed`
      })
    }

    // Email validation
    if (uiType === 'email') {
      rules.push({
        type: 'email',
        message: 'Please enter a valid email address'
      })
    }

    // URL validation
    if (uiType === 'url') {
      rules.push({
        type: 'url',
        message: 'Please enter a valid URL'
      })
    }

    // Number range validation
    if (uiType === 'number_input') {
      if (column.scale === 0) {
        rules.push({
          type: 'pattern',
          value: '^-?\\d+$',
          message: 'Please enter a whole number'
        })
      }
    }

    return rules
  }

  /**
   * Generate display properties
   */
  private generateDisplayProperties(column: any): {
    displayName: string
    displayFormat: string
    placeholder: string
    helpText: string
  } {
    return {
      displayName: this.formatColumnName(column.columnName),
      displayFormat: '',
      placeholder: `Enter ${this.formatColumnName(column.columnName).toLowerCase()}`,
      helpText: ''
    }
  }

  /**
   * Format column name for display
   */
  private formatColumnName(columnName: string): string {
    return columnName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  /**
   * Map UI type to component name
   */
  private mapUIToComponent(uiType: UIType): string {
    const mapping: Record<UIType, string> = {
      text_input: 'Input',
      text_area: 'Textarea',
      number_input: 'Input[type=number]',
      dropdown: 'Select',
      checkbox: 'Checkbox',
      radio: 'RadioGroup',
      date_picker: 'DatePicker',
      datetime_picker: 'DateTimePicker',
      time_picker: 'TimePicker',
      file_upload: 'FileUpload',
      color_picker: 'ColorPicker',
      slider: 'Slider',
      toggle: 'Switch',
      auto_complete: 'AutoComplete',
      rich_text: 'RichTextEditor',
      password: 'Input[type=password]',
      email: 'Input[type=email]',
      phone: 'Input[type=tel]',
      url: 'Input[type=url]',
      hidden: 'Input[type=hidden]'
    }
    return mapping[uiType] || 'Input'
  }

  /**
   * Map UI type to HTML input type
   */
  private mapUIToInputType(uiType: UIType): string {
    const mapping: Record<UIType, string> = {
      text_input: 'text',
      text_area: 'textarea',
      number_input: 'number',
      dropdown: 'select',
      checkbox: 'checkbox',
      radio: 'radio',
      date_picker: 'date',
      datetime_picker: 'datetime-local',
      time_picker: 'time',
      file_upload: 'file',
      color_picker: 'color',
      slider: 'range',
      toggle: 'checkbox',
      auto_complete: 'text',
      rich_text: 'textarea',
      password: 'password',
      email: 'email',
      phone: 'tel',
      url: 'url',
      hidden: 'hidden'
    }
    return mapping[uiType] || 'text'
  }

  /**
   * Get semantic category
   */
  private getSemanticCategory(semanticType: SemanticType): string {
    const categories: Record<string, string[]> = {
      identification: ['id', 'code'],
      personal: ['name', 'email', 'phone', 'address', 'age'],
      temporal: ['date', 'datetime', 'time'],
      financial: ['money', 'percentage'],
      content: ['description', 'status', 'flag'],
      media: ['image', 'file'],
      security: ['password', 'url'],
      physical: ['weight', 'height', 'coordinates'],
      technical: ['json', 'unknown']
    }

    for (const [category, types] of Object.entries(categories)) {
      if (types.includes(semanticType)) {
        return category
      }
    }
    return 'unknown'
  }
}

// Export singleton
export const columnIntelligenceAgent = new ColumnIntelligenceAgent()

// Register with registry
import { agentRegistry } from "@/agents/core/registry"
agentRegistry.register(columnIntelligenceAgent)

// Export types
export type { ColumnIntelligence as ColumnIntelligenceType }
