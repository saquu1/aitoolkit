// =============================================================================
// User Story Generator - Auto-generate user stories from table metadata
// =============================================================================

import { TableDef, ColumnDef, ModuleDef, UserStory } from './types'
import { ColumnIntelligenceEngine } from './column-intelligence'
import { PIIPhidDetector } from './pii-phi-detector'

// =============================================================================
// TYPES
// =============================================================================

export interface UserStoryTemplate {
  id: string
  template: string
  role: string
  priority: 'must_have' | 'should_have' | 'could_have' | 'wont_have'
  storyPoints: number
  category: 'crud' | 'validation' | 'workflow' | 'security' | 'compliance' | 'integration' | 'ui_ux'
}

export interface UserStoryGroup {
  id: string
  name: string
  description: string
  tableName?: string
  moduleName?: string
  stories: UserStory[]
  totalStoryPoints: number
}

export interface UserStoryGenerationOptions {
  includeCRUD: boolean
  includeValidation: boolean
  includeSecurity: boolean
  includeCompliance: boolean
  includeUIUX: boolean
  storyPointScale: 'fibonacci' | 'linear' | 'tshirt'
}

// =============================================================================
// USER STORY TEMPLATES
// =============================================================================

const CRUD_TEMPLATES: UserStoryTemplate[] = [
  {
    id: 'create',
    template: 'As a {role}, I want to create a new {entity} so that {purpose}',
    role: 'user',
    priority: 'must_have',
    storyPoints: 3,
    category: 'crud'
  },
  {
    id: 'list',
    template: 'As a {role}, I want to view a list of all {entities} so that I can find the one I need',
    role: 'user',
    priority: 'must_have',
    storyPoints: 2,
    category: 'crud'
  },
  {
    id: 'view',
    template: 'As a {role}, I want to view details of a specific {entity} so that I can see all information',
    role: 'user',
    priority: 'must_have',
    storyPoints: 2,
    category: 'crud'
  },
  {
    id: 'update',
    template: 'As a {role}, I want to update an existing {entity} so that I can keep information accurate',
    role: 'user',
    priority: 'must_have',
    storyPoints: 3,
    category: 'crud'
  },
  {
    id: 'delete',
    template: 'As a {role}, I want to delete a {entity} so that outdated records are removed',
    role: 'user',
    priority: 'should_have',
    storyPoints: 2,
    category: 'crud'
  },
  {
    id: 'search',
    template: 'As a {role}, I want to search for {entities} by {search_field} so that I can quickly find what I need',
    role: 'user',
    priority: 'should_have',
    storyPoints: 2,
    category: 'crud'
  },
  {
    id: 'filter',
    template: 'As a {role}, I want to filter {entities} by {filter_field} so that I can narrow down results',
    role: 'user',
    priority: 'should_have',
    storyPoints: 2,
    category: 'crud'
  },
  {
    id: 'export',
    template: 'As a {role}, I want to export {entities} to {format} so that I can use the data externally',
    role: 'user',
    priority: 'could_have',
    storyPoints: 3,
    category: 'crud'
  }
]

const VALIDATION_TEMPLATES: UserStoryTemplate[] = [
  {
    id: 'email_validation',
    template: 'As a {role}, I want email addresses to be validated so that invalid emails are not saved',
    role: 'user',
    priority: 'must_have',
    storyPoints: 1,
    category: 'validation'
  },
  {
    id: 'phone_validation',
    template: 'As a {role}, I want phone numbers to be formatted consistently so that communication is reliable',
    role: 'user',
    priority: 'should_have',
    storyPoints: 2,
    category: 'validation'
  },
  {
    id: 'required_fields',
    template: 'As a {role}, I want required fields to be clearly marked so that I know what information is mandatory',
    role: 'user',
    priority: 'must_have',
    storyPoints: 1,
    category: 'validation'
  },
  {
    id: 'unique_validation',
    template: 'As a {role}, I want unique fields to be validated so that duplicate records are prevented',
    role: 'user',
    priority: 'must_have',
    storyPoints: 2,
    category: 'validation'
  }
]

const SECURITY_TEMPLATES: UserStoryTemplate[] = [
  {
    id: 'pii_masking',
    template: 'As a {role}, I want {column} to be masked in list views so that sensitive data is protected',
    role: 'user',
    priority: 'must_have',
    storyPoints: 2,
    category: 'security'
  },
  {
    id: 'access_control',
    template: 'As a {role}, I want access to {entity} to be role-based so that only authorized users can view/edit',
    role: 'user',
    priority: 'must_have',
    storyPoints: 3,
    category: 'security'
  },
  {
    id: 'audit_trail',
    template: 'As a {role}, I want all changes to {entity} to be logged so that there is an audit trail',
    role: 'user',
    priority: 'should_have',
    storyPoints: 3,
    category: 'security'
  }
]

const COMPLIANCE_TEMPLATES: UserStoryTemplate[] = [
  {
    id: 'phi_protection',
    template: 'As a {role}, I want PHI fields to be encrypted so that HIPAA compliance is maintained',
    role: 'user',
    priority: 'must_have',
    storyPoints: 5,
    category: 'compliance'
  },
  {
    id: 'consent_tracking',
    template: 'As a {role}, I want to track patient consent so that GDPR compliance is maintained',
    role: 'user',
    priority: 'must_have',
    storyPoints: 5,
    category: 'compliance'
  },
  {
    id: 'data_retention',
    template: 'As a {role}, I want {entity} records to follow data retention policy so that compliance is maintained',
    role: 'user',
    priority: 'should_have',
    storyPoints: 3,
    category: 'compliance'
  }
]

const UI_UX_TEMPLATES: UserStoryTemplate[] = [
  {
    id: 'dropdown_fk',
    template: 'As a {role}, I want {column} to be a dropdown populated from {ref_table} so that I can easily select valid values',
    role: 'user',
    priority: 'must_have',
    storyPoints: 2,
    category: 'ui_ux'
  },
  {
    id: 'cascading_dropdown',
    template: 'As a {role}, I want cascading dropdowns for {columns} so that selections are filtered appropriately',
    role: 'user',
    priority: 'should_have',
    storyPoints: 5,
    category: 'ui_ux'
  },
  {
    id: 'responsive_form',
    template: 'As a {role}, I want the {entity} form to be responsive so that I can use it on mobile devices',
    role: 'user',
    priority: 'should_have',
    storyPoints: 3,
    category: 'ui_ux'
  },
  {
    id: 'bulk_actions',
    template: 'As a {role}, I want to perform bulk actions on {entities} so that I can manage multiple records efficiently',
    role: 'user',
    priority: 'could_have',
    storyPoints: 5,
    category: 'ui_ux'
  }
]

// =============================================================================
// USER STORY GENERATOR CLASS
// =============================================================================

export class UserStoryGenerator {
  private columnEngine: ColumnIntelligenceEngine
  private piiDetector: PIIPhidDetector
  private storyCounter: number = 1

  constructor() {
    this.columnEngine = new ColumnIntelligenceEngine()
    this.piiDetector = new PIIPhidDetector()
  }

  /**
   * Generate all user stories for tables
   */
  generateAllStories(
    tables: TableDef[],
    options: Partial<UserStoryGenerationOptions> = {}
  ): UserStoryGroup[] {
    const opts: UserStoryGenerationOptions = {
      includeCRUD: true,
      includeValidation: true,
      includeSecurity: true,
      includeCompliance: true,
      includeUIUX: true,
      storyPointScale: 'fibonacci',
      ...options
    }

    const groups: UserStoryGroup[] = []

    for (const table of tables) {
      const group = this.generateTableStories(table, opts)
      if (group.stories.length > 0) {
        groups.push(group)
      }
    }

    return groups
  }

  /**
   * Generate stories for a single table
   */
  generateTableStories(
    table: TableDef,
    options: UserStoryGenerationOptions
  ): UserStoryGroup {
    const stories: UserStory[] = []
    const entityName = this.singularize(table.tableName)

    // Analyze columns
    const columnAnalysis = table.columns.map(col => ({
      column: col,
      intelligence: this.columnEngine.analyzeColumn(col, table.tableName),
      piiDetection: this.piiDetector.detect(col, table.tableName)
    }))

    // Generate CRUD stories
    if (options.includeCRUD) {
      stories.push(...this.generateCRUDStories(table, entityName, columnAnalysis))
    }

    // Generate validation stories
    if (options.includeValidation) {
      stories.push(...this.generateValidationStories(table, entityName, columnAnalysis))
    }

    // Generate security stories
    if (options.includeSecurity) {
      stories.push(...this.generateSecurityStories(table, entityName, columnAnalysis))
    }

    // Generate compliance stories
    if (options.includeCompliance) {
      stories.push(...this.generateComplianceStories(table, entityName, columnAnalysis))
    }

    // Generate UI/UX stories
    if (options.includeUIUX) {
      stories.push(...this.generateUIUXStories(table, entityName, columnAnalysis))
    }

    // Calculate total story points
    const totalStoryPoints = stories.reduce((sum, s) => sum + s.storyPoints, 0)

    return {
      id: `group-${table.tableName}`,
      name: `${this.formatTitle(table.tableName)} Stories`,
      description: `User stories for ${table.tableName} module`,
      tableName: table.tableName,
      stories,
      totalStoryPoints
    }
  }

  /**
   * Generate CRUD stories
   */
  private generateCRUDStories(
    table: TableDef,
    entityName: string,
    columnAnalysis: any[]
  ): UserStory[] {
    const stories: UserStory[] = []

    for (const template of CRUD_TEMPLATES) {
      let title = template.template
        .replace('{role}', template.role)
        .replace('{entity}', entityName)
        .replace('{entities}', entityName + 's')

      // Customize based on template
      if (template.id === 'search') {
        const searchableCols = columnAnalysis
          .filter(c => c.intelligence.column.isSearchable)
          .map(c => c.column.name)
        if (searchableCols.length === 0) continue
        title = title.replace('{search_field}', searchableCols[0])
      }

      if (template.id === 'filter') {
        const filterableCols = columnAnalysis
          .filter(c => c.intelligence.column.isFilterable)
          .map(c => c.column.name)
        if (filterableCols.length === 0) continue
        title = title.replace('{filter_field}', filterableCols[0])
      }

      if (template.id === 'export') {
        title = title.replace('{format}', 'CSV/Excel')
      }

      if (template.id === 'create') {
        title = title.replace('{purpose}', `I can record new ${entityName} information`)
      }

      stories.push(this.createStory(
        table.tableName,
        template.id,
        title,
        template.role,
        template.category,
        template.priority,
        template.storyPoints,
        table.tableName
      ))
    }

    return stories
  }

  /**
   * Generate validation stories
   */
  private generateValidationStories(
    table: TableDef,
    entityName: string,
    columnAnalysis: any[]
  ): UserStory[] {
    const stories: UserStory[] = []

    // Email validation
    const emailCols = columnAnalysis.filter(c => 
      c.intelligence.column.inferredSemanticType === 'email'
    )
    for (const col of emailCols) {
      stories.push(this.createStory(
        table.tableName,
        'email_validation',
        `As a user, I want ${col.column.name} to be validated so that invalid emails are not saved`,
        'user',
        'validation',
        'must_have',
        1,
        table.tableName,
        col.column.name
      ))
    }

    // Phone validation
    const phoneCols = columnAnalysis.filter(c => 
      c.intelligence.column.inferredSemanticType === 'phone'
    )
    for (const col of phoneCols) {
      stories.push(this.createStory(
        table.tableName,
        'phone_validation',
        `As a user, I want ${col.column.name} to be formatted consistently so that communication is reliable`,
        'user',
        'validation',
        'should_have',
        2,
        table.tableName,
        col.column.name
      ))
    }

    // Unique validation
    const uniqueCols = columnAnalysis.filter(c => 
      c.column.name.toLowerCase().includes('code') ||
      c.column.name.toLowerCase().includes('mrn') ||
      c.intelligence.column.inferredSemanticType === 'medical_record_number'
    )
    for (const col of uniqueCols) {
      stories.push(this.createStory(
        table.tableName,
        'unique_validation',
        `As a user, I want ${col.column.name} to be unique so that duplicate records are prevented`,
        'user',
        'validation',
        'must_have',
        2,
        table.tableName,
        col.column.name
      ))
    }

    // Required fields indicator
    const requiredCols = columnAnalysis.filter(c => !c.column.isNullable)
    if (requiredCols.length > 0) {
      stories.push(this.createStory(
        table.tableName,
        'required_fields',
        `As a user, I want required fields (${requiredCols.slice(0, 3).map(c => c.column.name).join(', ')}) to be clearly marked so that I know what information is mandatory`,
        'user',
        'validation',
        'must_have',
        1,
        table.tableName
      ))
    }

    return stories
  }

  /**
   * Generate security stories
   */
  private generateSecurityStories(
    table: TableDef,
    entityName: string,
    columnAnalysis: any[]
  ): UserStory[] {
    const stories: UserStory[] = []

    // PII masking
    const piiCols = columnAnalysis.filter(c => 
      c.piiDetection.sensitivity === 'pii' || c.piiDetection.sensitivity === 'phi'
    )
    for (const col of piiCols.slice(0, 3)) {
      stories.push(this.createStory(
        table.tableName,
        'pii_masking',
        `As a user, I want ${col.column.name} to be masked in list views so that sensitive data is protected`,
        'user',
        'security',
        'must_have',
        2,
        table.tableName,
        col.column.name
      ))
    }

    // Access control
    stories.push(this.createStory(
      table.tableName,
      'access_control',
      `As a user, I want access to ${entityName} to be role-based so that only authorized users can view/edit`,
      'user',
      'security',
      'must_have',
      3,
      table.tableName
    ))

    // Audit trail
    stories.push(this.createStory(
      table.tableName,
      'audit_trail',
      `As a user, I want all changes to ${entityName} to be logged so that there is an audit trail`,
      'user',
      'security',
      'should_have',
      3,
      table.tableName
    ))

    return stories
  }

  /**
   * Generate compliance stories
   */
  private generateComplianceStories(
    table: TableDef,
    entityName: string,
    columnAnalysis: any[]
  ): UserStory[] {
    const stories: UserStory[] = []

    // Check for PHI columns
    const phiCols = columnAnalysis.filter(c => c.piiDetection.sensitivity === 'phi')
    if (phiCols.length > 0) {
      stories.push(this.createStory(
        table.tableName,
        'phi_protection',
        `As a user, I want PHI fields (${phiCols.slice(0, 3).map(c => c.column.name).join(', ')}) to be encrypted so that HIPAA compliance is maintained`,
        'user',
        'compliance',
        'must_have',
        5,
        table.tableName
      ))
    }

    // Data retention
    stories.push(this.createStory(
      table.tableName,
      'data_retention',
      `As a user, I want ${entityName} records to follow data retention policy so that compliance is maintained`,
      'user',
      'compliance',
      'should_have',
      3,
      table.tableName
    ))

    return stories
  }

  /**
   * Generate UI/UX stories
   */
  private generateUIUXStories(
    table: TableDef,
    entityName: string,
    columnAnalysis: any[]
  ): UserStory[] {
    const stories: UserStory[] = []

    // FK dropdowns
    const fkCols = columnAnalysis.filter(c => 
      c.intelligence.column.inferredSemanticType === 'foreign_key' ||
      c.column.name.endsWith('Id') ||
      c.column.name.endsWith('_id')
    )
    for (const col of fkCols.slice(0, 4)) {
      const refTable = this.inferReferenceTable(col.column.name)
      stories.push(this.createStory(
        table.tableName,
        'dropdown_fk',
        `As a user, I want ${col.column.name} to be a dropdown populated from ${refTable} so that I can easily select valid values`,
        'user',
        'ui_ux',
        'must_have',
        2,
        table.tableName,
        col.column.name
      ))
    }

    // Responsive form
    stories.push(this.createStory(
      table.tableName,
      'responsive_form',
      `As a user, I want the ${entityName} form to be responsive so that I can use it on mobile devices`,
      'user',
      'ui_ux',
      'should_have',
      3,
      table.tableName
    ))

    // Bulk actions for large tables
    if (table.columns.length > 10) {
      stories.push(this.createStory(
        table.tableName,
        'bulk_actions',
        `As a user, I want to perform bulk actions on ${entityName}s so that I can manage multiple records efficiently`,
        'user',
        'ui_ux',
        'could_have',
        5,
        table.tableName
      ))
    }

    return stories
  }

  /**
   * Create a user story
   */
  private createStory(
    tableName: string,
    type: string,
    title: string,
    role: string,
    category: string,
    priority: 'must_have' | 'should_have' | 'could_have' | 'wont_have',
    storyPoints: number,
    tables: string,
    column?: string
  ): UserStory {
    return {
      id: `US-${String(this.storyCounter++).padStart(3, '0')}`,
      code: `${tableName.substring(0, 3).toUpperCase()}-${type.toUpperCase()}-${String(this.storyCounter).padStart(3, '0')}`,
      title,
      role,
      feature: this.extractFeature(title),
      benefit: this.extractBenefit(title),
      acceptanceCriteria: this.generateAcceptanceCriteria(type, tableName, column),
      priority,
      storyPoints,
      tableName,
      moduleId: undefined
    }
  }

  /**
   * Generate acceptance criteria
   */
  private generateAcceptanceCriteria(type: string, tableName: string, column?: string): string[] {
    const criteria: Record<string, string[]> = {
      create: [
        'Create form is accessible from main menu',
        'All required fields are validated',
        'Success message displayed after creation',
        'New record appears in list view'
      ],
      list: [
        'List displays all records in paginated format',
        'Column headers are sortable',
        'Clicking a row navigates to detail view'
      ],
      view: [
        'All fields are displayed in readable format',
        'Related records are shown as links',
        'Edit button is available'
      ],
      update: [
        'Edit form pre-populates existing values',
        'Only changed fields are updated',
        'Audit trail records the change'
      ],
      delete: [
        'Confirmation dialog before deletion',
        'Soft delete if IsActive column exists',
        'Record removed from list after deletion'
      ],
      search: [
        'Search field is visible in list header',
        'Search works on specified column',
        'Results update as user types'
      ],
      email_validation: [
        'Invalid email format shows error',
        'Valid email is accepted',
        'Email format is preserved on display'
      ],
      phone_validation: [
        'Phone number formatted consistently',
        'International format supported',
        'Invalid characters rejected'
      ],
      pii_masking: [
        'Sensitive data masked in list views',
        'Full data visible in detail/edit views',
        'Masking follows role-based rules'
      ],
      dropdown_fk: [
        'Dropdown populated from reference table',
        'Search/filter available for large lists',
        'Invalid selection prevented'
      ],
      access_control: [
        'Role-based access implemented',
        'Unauthorized access shows appropriate message',
        'Audit log records access attempts'
      ]
    }

    return criteria[type] || [
      'Feature works as expected',
      'Error handling is in place',
      'User feedback is provided'
    ]
  }

  /**
   * Extract feature from story title
   */
  private extractFeature(title: string): string {
    const match = title.match(/I want to (.+?) so that/)
    return match ? match[1] : 'perform an action'
  }

  /**
   * Extract benefit from story title
   */
  private extractBenefit(title: string): string {
    const match = title.match(/so that (.+)$/)
    return match ? match[1] : 'achieve a goal'
  }

  /**
   * Infer reference table from FK column name
   */
  private inferReferenceTable(columnName: string): string {
    let name = columnName.replace(/_id$/i, '').replace(/Id$/, '')
    // Pluralize
    if (name.endsWith('y')) {
      name = name.slice(0, -1) + 'ies'
    } else if (!name.endsWith('s')) {
      name = name + 's'
    }
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  /**
   * Singularize a table name
   */
  private singularize(tableName: string): string {
    const singulars: Record<string, string> = {
      'patients': 'Patient',
      'appointments': 'Appointment',
      'users': 'User',
      'doctors': 'Doctor',
      'organizations': 'Organization',
      'branches': 'Branch',
      'departments': 'Department',
      'invoices': 'Invoice',
      'payments': 'Payment',
      'prescriptions': 'Prescription',
      'laboratories': 'Laboratory',
      'pharmacies': 'Pharmacy'
    }

    const lower = tableName.toLowerCase()
    if (singulars[lower]) {
      return singulars[lower]
    }

    if (lower.endsWith('ies')) {
      return lower.slice(0, -3) + 'y'
    }
    if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('ches')) {
      return lower.slice(0, -2)
    }
    if (lower.endsWith('s')) {
      return lower.slice(0, -1)
    }

    return tableName
  }

  /**
   * Format title
   */
  private formatLabel(columnName: string): string {
    return columnName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Format table name as title
   */
  private formatTitle(tableName: string): string {
    return this.formatLabel(tableName)
  }

  /**
   * Export stories to Jira CSV format
   */
  exportToJiraCSV(stories: UserStory[]): string {
    const headers = [
      'Summary',
      'Description',
      'Priority',
      'Story Points',
      'Reporter',
      'Labels',
      'Acceptance Criteria'
    ]

    const rows = stories.map(s => [
      `"${s.title}"`,
      `"As a ${s.role}, I want to ${s.feature} so that ${s.benefit}"`,
      s.priority.replace('_', ' ').toUpperCase(),
      s.storyPoints.toString(),
      '"System"',
      `"${s.tableName}"`,
      `"${s.acceptanceCriteria.join('; ')}"`
    ])

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  }

  /**
   * Export to Markdown
   */
  exportToMarkdown(groups: UserStoryGroup[]): string {
    const lines: string[] = [
      '# User Stories',
      '',
      `Generated: ${new Date().toISOString().split('T')[0]}`,
      `Total Groups: ${groups.length}`,
      `Total Stories: ${groups.reduce((sum, g) => sum + g.stories.length, 0)}`,
      `Total Story Points: ${groups.reduce((sum, g) => sum + g.totalStoryPoints, 0)}`,
      ''
    ]

    for (const group of groups) {
      lines.push(`## ${group.name}`)
      lines.push('')
      lines.push(`**Story Points:** ${group.totalStoryPoints}`)
      lines.push(`**Stories:** ${group.stories.length}`)
      lines.push('')

      for (const story of group.stories) {
        lines.push(`### ${story.code}: ${story.title}`)
        lines.push('')
        lines.push(`- **Role:** ${story.role}`)
        lines.push(`- **Priority:** ${story.priority.replace('_', ' ')}`)
        lines.push(`- **Story Points:** ${story.storyPoints}`)
        lines.push('')
        lines.push(`**As a** ${story.role}, **I want to** ${story.feature}, **so that** ${story.benefit}`)
        lines.push('')
        lines.push('**Acceptance Criteria:**')
        for (const ac of story.acceptanceCriteria) {
          lines.push(`- ${ac}`)
        }
        lines.push('')
        lines.push('---')
        lines.push('')
      }
    }

    return lines.join('\n')
  }
}

// Export singleton
export const userStoryGenerator = new UserStoryGenerator()
