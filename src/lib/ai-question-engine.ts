// =============================================================================
// AI Question Engine - Intelligent Question Generation
// Asks clarifying questions before code generation to ensure correct requirements
// =============================================================================

import { TableDef, ColumnDef, ModuleDef } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface AIQuestion {
  id: string;
  category: QuestionCategory;
  question: string;
  context: string;
  options?: QuestionOption[];
  allowsMultiple?: boolean;
  allowsCustomInput?: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: string; // What happens based on the answer
  defaultValue?: string | string[];
  answer?: string | string[];
  relatedColumns?: string[];
  relatedTables?: string[];
}

export type QuestionCategory = 
  | 'identity'
  | 'validation'
  | 'workflow'
  | 'security'
  | 'integration'
  | 'ui_ux'
  | 'business_logic'
  | 'compliance'
  | 'performance'
  | 'multi_tenant';

export interface QuestionOption {
  label: string;
  value: string;
  description?: string;
  recommended?: boolean;
}

export interface QuestionGroup {
  id: string;
  title: string;
  description: string;
  icon: string;
  questions: AIQuestion[];
  tableName?: string;
  moduleName?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface QuestionSession {
  id: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  groups: QuestionGroup[];
  progress: {
    total: number;
    answered: number;
    criticalAnswered: number;
    criticalTotal: number;
  };
}

// =============================================================================
// QUESTION TEMPLATES
// =============================================================================

const QUESTION_TEMPLATES: Record<string, Partial<AIQuestion>[]> = {
  // Patient Management Questions
  'patient-reg': [
    {
      category: 'identity',
      question: 'How should the Medical Record Number (MRN) be generated?',
      context: 'MRN is a unique identifier for patients',
      options: [
        { label: 'Auto-generate (ORG-YYYY-NNNNNN)', value: 'auto_org', recommended: true, description: 'Format: Organization code + Year + Sequential number' },
        { label: 'Auto-generate (Sequential)', value: 'auto_seq', description: 'Simple sequential number' },
        { label: 'Manual entry only', value: 'manual', description: 'User must enter MRN manually' },
        { label: 'Auto with manual override', value: 'auto_override', description: 'Auto-generate but allow manual edit' }
      ],
      priority: 'critical',
      impact: 'Affects patient registration workflow and ID display'
    },
    {
      category: 'validation',
      question: 'What constitutes a duplicate patient record?',
      context: 'Duplicate detection prevents multiple records for the same person',
      options: [
        { label: 'Same CNIC/National ID', value: 'cnic', description: 'Primary identification document match' },
        { label: 'Same Name + Phone', value: 'name_phone', recommended: true },
        { label: 'Same Name + DOB', value: 'name_dob' },
        { label: 'Custom combination', value: 'custom', description: 'Select multiple fields' }
      ],
      allowsMultiple: true,
      priority: 'high',
      impact: 'Affects duplicate warning system and patient merge functionality'
    },
    {
      category: 'ui_ux',
      question: 'Which fields are mandatory at registration?',
      context: 'Some hospitals allow minimal registration in emergencies',
      options: [
        { label: 'Full demographics required', value: 'full', recommended: true },
        { label: 'Name and phone only', value: 'minimal', description: 'Emergency registration mode' },
        { label: 'Configurable per branch', value: 'configurable' }
      ],
      priority: 'medium',
      impact: 'Affects form validation and registration workflow'
    },
    {
      category: 'workflow',
      question: 'Is patient photo capture required?',
      context: 'Photo helps identify patients and prevents fraud',
      options: [
        { label: 'Not required', value: 'no' },
        { label: 'Optional', value: 'optional', recommended: true },
        { label: 'Required', value: 'required' },
        { label: 'Required with webcam capture', value: 'webcam' }
      ],
      priority: 'low',
      impact: 'Affects registration form and patient profile'
    },
    {
      category: 'integration',
      question: 'Do you collect insurance information at registration?',
      context: 'Insurance details affect billing workflow',
      options: [
        { label: 'Yes, mandatory', value: 'mandatory' },
        { label: 'Yes, optional', value: 'optional', recommended: true },
        { label: 'No, separate workflow', value: 'separate' }
      ],
      priority: 'medium',
      impact: 'Affects registration form sections and billing integration'
    }
  ],

  // Appointment Management Questions
  'appointment': [
    {
      category: 'workflow',
      question: 'How are appointment slots managed?',
      context: 'Different clinics have different scheduling approaches',
      options: [
        { label: 'Fixed time slots (15/30 min)', value: 'fixed', recommended: true },
        { label: 'Variable duration per service', value: 'variable' },
        { label: 'Provider-defined slots', value: 'provider' },
        { label: 'AI-estimated duration', value: 'ai' }
      ],
      priority: 'critical',
      impact: 'Affects calendar UI and booking logic'
    },
    {
      category: 'business_logic',
      question: 'Can patients book appointments online?',
      context: 'Online booking changes the workflow significantly',
      options: [
        { label: 'No, staff only', value: 'staff_only' },
        { label: 'Yes, with approval', value: 'approval' },
        { label: 'Yes, direct booking', value: 'direct', recommended: true }
      ],
      priority: 'high',
      impact: 'Affects patient portal and workflow'
    },
    {
      category: 'workflow',
      question: 'What happens when appointment is cancelled?',
      context: 'Cancellation policy affects billing and slot availability',
      options: [
        { label: 'Free cancellation anytime', value: 'free' },
        { label: 'Charges apply within 24h', value: 'charges_24h', recommended: true },
        { label: 'No-show tracking only', value: 'no_show' },
        { label: 'Configurable policy', value: 'configurable' }
      ],
      priority: 'medium',
      impact: 'Affects cancellation workflow and billing'
    },
    {
      category: 'integration',
      question: 'Should appointment reminders be sent?',
      context: 'Reminders reduce no-shows',
      options: [
        { label: 'No reminders', value: 'no' },
        { label: 'SMS reminder only', value: 'sms', recommended: true },
        { label: 'SMS + Email', value: 'sms_email' },
        { label: 'WhatsApp notification', value: 'whatsapp' }
      ],
      priority: 'medium',
      impact: 'Affects notification system integration'
    }
  ],

  // Billing Questions
  'billing': [
    {
      category: 'business_logic',
      question: 'How are invoice numbers generated?',
      context: 'Invoice numbering affects accounting and tracking',
      options: [
        { label: 'Sequential per branch', value: 'branch_seq', recommended: true },
        { label: 'Sequential organization-wide', value: 'org_seq' },
        { label: 'Custom format (configurable)', value: 'custom' }
      ],
      priority: 'high',
      impact: 'Affects invoice display and numbering system'
    },
    {
      category: 'workflow',
      question: 'What payment methods are accepted?',
      context: 'Payment methods affect checkout flow',
      options: [
        { label: 'Cash only', value: 'cash' },
        { label: 'Cash + Card', value: 'cash_card', recommended: true },
        { label: 'Cash + Card + Mobile', value: 'all' },
        { label: 'Configurable per branch', value: 'configurable' }
      ],
      allowsMultiple: true,
      priority: 'medium',
      impact: 'Affects payment UI and accounting integration'
    },
    {
      category: 'business_logic',
      question: 'Is partial payment allowed?',
      context: 'Partial payments affect balance tracking',
      options: [
        { label: 'No, full payment only', value: 'no' },
        { label: 'Yes, with balance tracking', value: 'yes', recommended: true },
        { label: 'Yes, with credit limit', value: 'credit_limit' }
      ],
      priority: 'medium',
      impact: 'Affects payment workflow and patient balance'
    }
  ],

  // User Management Questions
  'users': [
    {
      category: 'security',
      question: 'What authentication method should be used?',
      context: 'Authentication affects security and user experience',
      options: [
        { label: 'Email + Password', value: 'email_password', recommended: true },
        { label: 'Username + Password', value: 'username_password' },
        { label: 'SSO (Single Sign-On)', value: 'sso' },
        { label: 'Multi-factor authentication', value: 'mfa' }
      ],
      priority: 'critical',
      impact: 'Affects login system and security'
    },
    {
      category: 'security',
      question: 'What is the password policy?',
      context: 'Password strength affects security',
      options: [
        { label: 'Minimal (6+ characters)', value: 'minimal' },
        { label: 'Standard (8+ chars, mixed)', value: 'standard', recommended: true },
        { label: 'Strong (10+ chars, special)', value: 'strong' },
        { label: 'Configurable', value: 'configurable' }
      ],
      priority: 'high',
      impact: 'Affects password validation and reset flow'
    },
    {
      category: 'multi_tenant',
      question: 'Can users belong to multiple organizations?',
      context: 'Multi-org affects data isolation',
      options: [
        { label: 'One org per user', value: 'single', recommended: true },
        { label: 'Multiple orgs allowed', value: 'multiple' }
      ],
      priority: 'medium',
      impact: 'Affects user-org relationship and data access'
    }
  ],

  // Pharmacy Questions
  'pharmacy': [
    {
      category: 'business_logic',
      question: 'How is stock managed?',
      context: 'Inventory management approach',
      options: [
        { label: 'Batch-wise tracking', value: 'batch', recommended: true },
        { label: 'Simple quantity only', value: 'simple' },
        { label: 'Expiry-based FIFO', value: 'fifo' }
      ],
      priority: 'high',
      impact: 'Affects stock model and dispensing logic'
    },
    {
      category: 'compliance',
      question: 'Are controlled substance logs required?',
      context: 'Regulatory requirement for certain medications',
      options: [
        { label: 'Yes, full audit trail', value: 'full_audit', recommended: true },
        { label: 'No special handling', value: 'none' },
        { label: 'Only for scheduled drugs', value: 'scheduled' }
      ],
      priority: 'critical',
      impact: 'Affects compliance and audit features'
    }
  ],

  // Laboratory Questions
  'laboratory': [
    {
      category: 'integration',
      question: 'Are lab machines interfaced?',
      context: 'Machine integration automates result capture',
      options: [
        { label: 'Manual entry only', value: 'manual' },
        { label: 'HL7/ASTM integration', value: 'hl7', recommended: true },
        { label: 'Both options', value: 'both' }
      ],
      priority: 'high',
      impact: 'Affects lab workflow and result handling'
    },
    {
      category: 'workflow',
      question: 'Who validates lab results?',
      context: 'Result validation workflow',
      options: [
        { label: 'Auto-validated', value: 'auto' },
        { label: 'Technician approval', value: 'technician', recommended: true },
        { label: 'Doctor approval', value: 'doctor' },
        { label: 'Multi-level approval', value: 'multi' }
      ],
      priority: 'medium',
      impact: 'Affects result workflow and notifications'
    }
  ]
};

// Generic questions for unknown modules
const GENERIC_QUESTIONS: Partial<AIQuestion>[] = [
  {
    category: 'ui_ux',
    question: 'Should this module support soft delete?',
    context: 'Soft delete preserves data for audit trails',
    options: [
      { label: 'Yes (IsActive flag)', value: 'soft', recommended: true },
      { label: 'Hard delete only', value: 'hard' },
      { label: 'Archive to history table', value: 'archive' }
    ],
    priority: 'medium',
    impact: 'Affects delete behavior and data retention'
  },
  {
    category: 'multi_tenant',
    question: 'Is this module multi-branch aware?',
    context: 'Branch isolation affects data visibility',
    options: [
      { label: 'Yes, branch-filtered', value: 'yes', recommended: true },
      { label: 'No, global data', value: 'no' },
      { label: 'Configurable', value: 'configurable' }
    ],
    priority: 'medium',
    impact: 'Affects data filtering and branch context'
  },
  {
    category: 'compliance',
    question: 'Does this module contain sensitive data?',
    context: 'Sensitive data requires special handling',
    options: [
      { label: 'No sensitive data', value: 'none' },
      { label: 'PII (personal info)', value: 'pii' },
      { label: 'PHI (health info)', value: 'phi', recommended: true },
      { label: 'Financial data', value: 'financial' }
    ],
    allowsMultiple: true,
    priority: 'high',
    impact: 'Affects data encryption and access control'
  }
];

// =============================================================================
// AI QUESTION ENGINE CLASS
// =============================================================================

export class AIQuestionEngine {
  /**
   * Generate questions for a table
   */
  generateTableQuestions(table: TableDef): QuestionGroup {
    const questions: AIQuestion[] = [];
    
    // Analyze table columns for question generation
    const columnNames = table.columns.map(c => c.name.toLowerCase());
    
    // Check for MRN column
    if (columnNames.some(c => c.includes('mrn') || c.includes('medicalrecord'))) {
      questions.push(this.createQuestion('mrn_generation', table.tableName));
    }
    
    // Check for identity columns
    if (columnNames.some(c => c.includes('cnic') || c.includes('ssn') || c.includes('national'))) {
      questions.push(this.createQuestion('identity_validation', table.tableName));
    }
    
    // Check for phone columns
    if (columnNames.some(c => c.includes('phone') || c.includes('mobile') || c.includes('cell'))) {
      questions.push(this.createQuestion('phone_validation', table.tableName));
    }
    
    // Check for email columns
    if (columnNames.some(c => c.includes('email'))) {
      questions.push(this.createQuestion('email_validation', table.tableName));
    }
    
    // Check for photo/image columns
    if (columnNames.some(c => c.includes('photo') || c.includes('image') || c.includes('avatar'))) {
      questions.push(this.createQuestion('photo_requirements', table.tableName));
    }
    
    // Check for status columns
    if (columnNames.some(c => c.includes('status'))) {
      questions.push(this.createQuestion('status_workflow', table.tableName));
    }
    
    // Check for date columns
    const dateColumns = columnNames.filter(c => c.includes('date'));
    if (dateColumns.length > 0) {
      questions.push(this.createQuestion('date_handling', table.tableName, dateColumns));
    }
    
    // Check for amount/price columns
    if (columnNames.some(c => c.includes('amount') || c.includes('price') || c.includes('fee'))) {
      questions.push(this.createQuestion('currency_handling', table.tableName));
    }
    
    // Add soft delete question for all tables
    questions.push(this.createQuestion('soft_delete', table.tableName));
    
    return {
      id: `table-${table.tableName}`,
      title: `Table: ${table.tableName}`,
      description: `Questions for designing ${table.tableName} module`,
      icon: '📊',
      questions: questions.filter(Boolean) as AIQuestion[],
      tableName: table.tableName,
      status: 'pending'
    };
  }

  /**
   * Generate questions for a module
   */
  generateModuleQuestions(module: ModuleDef): QuestionGroup {
    const templateQuestions = QUESTION_TEMPLATES[module.key] || GENERIC_QUESTIONS;
    
    const questions: AIQuestion[] = templateQuestions.map((tq, i) => ({
      id: `${module.key}-q-${i}`,
      category: tq.category || 'business_logic',
      question: tq.question || '',
      context: tq.context || '',
      options: tq.options,
      allowsMultiple: tq.allowsMultiple,
      allowsCustomInput: tq.allowsCustomInput,
      priority: tq.priority || 'medium',
      impact: tq.impact || '',
      defaultValue: tq.defaultValue,
      relatedTables: module.tables
    }));
    
    return {
      id: `module-${module.key}`,
      title: module.name,
      description: module.description,
      icon: '🧩',
      questions,
      moduleName: module.key,
      status: 'pending'
    };
  }

  /**
   * Generate all questions for a project
   */
  generateProjectQuestions(
    tables: TableDef[], 
    modules: ModuleDef[]
  ): QuestionSession {
    const groups: QuestionGroup[] = [];
    
    // Generate module questions (higher priority)
    for (const mod of modules) {
      const group = this.generateModuleQuestions(mod);
      if (group.questions.length > 0) {
        groups.push(group);
      }
    }
    
    // Generate table-specific questions
    for (const table of tables) {
      const group = this.generateTableQuestions(table);
      // Only add if not already covered by module
      const existingModuleGroup = groups.find(g => 
        g.moduleName && table.tableName.toLowerCase().includes(g.moduleName.toLowerCase().replace('-', ''))
      );
      
      if (!existingModuleGroup && group.questions.length > 0) {
        groups.push(group);
      }
    }
    
    // Calculate progress
    const total = groups.reduce((sum, g) => sum + g.questions.length, 0);
    const criticalTotal = groups.reduce(
      (sum, g) => sum + g.questions.filter(q => q.priority === 'critical').length, 0
    );
    
    return {
      id: `session-${Date.now()}`,
      projectId: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      groups,
      progress: {
        total,
        answered: 0,
        criticalAnswered: 0,
        criticalTotal
      }
    };
  }

  /**
   * Create a specific question
   */
  private createQuestion(
    type: string, 
    tableName: string, 
    relatedColumns?: string[]
  ): AIQuestion {
    const questionMap: Record<string, AIQuestion> = {
      mrn_generation: {
        id: `mrn-${tableName}`,
        category: 'identity',
        question: 'How should the MRN (Medical Record Number) be generated?',
        context: 'MRN is the unique identifier for patient records',
        options: [
          { label: 'Auto-generate (ORG-YYYY-NNNNNN)', value: 'auto_org', recommended: true },
          { label: 'Sequential number', value: 'auto_seq' },
          { label: 'Manual entry', value: 'manual' },
          { label: 'Auto with override', value: 'auto_override' }
        ],
        priority: 'critical',
        impact: 'Affects patient identification and registration workflow',
        relatedTables: [tableName]
      },
      identity_validation: {
        id: `identity-${tableName}`,
        category: 'validation',
        question: 'How should identity documents be validated?',
        context: 'Identity validation prevents fraud and duplicates',
        options: [
          { label: 'Format validation only', value: 'format', recommended: true },
          { label: 'NADRA/National DB verification', value: 'external' },
          { label: 'No validation', value: 'none' }
        ],
        priority: 'high',
        impact: 'Affects data quality and fraud prevention',
        relatedTables: [tableName]
      },
      phone_validation: {
        id: `phone-${tableName}`,
        category: 'validation',
        question: 'How should phone numbers be validated?',
        context: 'Phone validation ensures reliable communication',
        options: [
          { label: 'Format validation only', value: 'format', recommended: true },
          { label: 'OTP verification', value: 'otp' },
          { label: 'No validation', value: 'none' }
        ],
        priority: 'medium',
        impact: 'Affects SMS notifications and contact reliability',
        relatedTables: [tableName]
      },
      email_validation: {
        id: `email-${tableName}`,
        category: 'validation',
        question: 'How should email addresses be validated?',
        context: 'Email validation ensures reliable communication',
        options: [
          { label: 'Format validation only', value: 'format', recommended: true },
          { label: 'Verification email', value: 'verify' },
          { label: 'No validation', value: 'none' }
        ],
        priority: 'low',
        impact: 'Affects email notifications',
        relatedTables: [tableName]
      },
      photo_requirements: {
        id: `photo-${tableName}`,
        category: 'ui_ux',
        question: 'What are the photo capture requirements?',
        context: 'Photo requirements affect camera integration',
        options: [
          { label: 'No photo required', value: 'none' },
          { label: 'Optional photo', value: 'optional', recommended: true },
          { label: 'Required photo', value: 'required' },
          { label: 'Live webcam capture', value: 'webcam' }
        ],
        priority: 'low',
        impact: 'Affects camera integration and storage',
        relatedTables: [tableName]
      },
      status_workflow: {
        id: `status-${tableName}`,
        category: 'workflow',
        question: 'What is the status workflow for this table?',
        context: 'Status workflow defines allowed transitions',
        options: [
          { label: 'Simple (Active/Inactive)', value: 'simple', recommended: true },
          { label: 'Custom workflow', value: 'custom' },
          { label: 'State machine', value: 'state_machine' }
        ],
        priority: 'medium',
        impact: 'Affects status transitions and business rules',
        relatedTables: [tableName]
      },
      date_handling: {
        id: `date-${tableName}`,
        category: 'ui_ux',
        question: 'How should dates be displayed and entered?',
        context: 'Date format affects user experience',
        options: [
          { label: 'DD/MM/YYYY', value: 'dmy', recommended: true },
          { label: 'MM/DD/YYYY', value: 'mdy' },
          { label: 'YYYY-MM-DD (ISO)', value: 'iso' },
          { label: 'User preference', value: 'preference' }
        ],
        priority: 'low',
        impact: 'Affects date display and input format',
        relatedColumns: relatedColumns,
        relatedTables: [tableName]
      },
      currency_handling: {
        id: `currency-${tableName}`,
        category: 'business_logic',
        question: 'How should monetary values be handled?',
        context: 'Currency handling affects billing and accounting',
        options: [
          { label: 'Single currency (PKR)', value: 'single', recommended: true },
          { label: 'Multi-currency', value: 'multi' },
          { label: 'User-selectable', value: 'selectable' }
        ],
        priority: 'high',
        impact: 'Affects billing, invoicing, and reporting',
        relatedTables: [tableName]
      },
      soft_delete: {
        id: `soft-delete-${tableName}`,
        category: 'business_logic',
        question: 'Should this table support soft delete?',
        context: 'Soft delete preserves data for audit trails',
        options: [
          { label: 'Yes (IsActive flag)', value: 'yes', recommended: true },
          { label: 'Hard delete only', value: 'no' },
          { label: 'Archive to history', value: 'archive' }
        ],
        priority: 'medium',
        impact: 'Affects delete behavior and data retention',
        relatedTables: [tableName]
      }
    };

    return questionMap[type];
  }

  /**
   * Get next unanswered question
   */
  getNextQuestion(session: QuestionSession): AIQuestion | null {
    // Prioritize critical questions first
    for (const group of session.groups) {
      const criticalQuestion = group.questions.find(
        q => q.priority === 'critical' && !q.answer
      );
      if (criticalQuestion) return criticalQuestion;
    }
    
    // Then high priority
    for (const group of session.groups) {
      const highQuestion = group.questions.find(
        q => q.priority === 'high' && !q.answer
      );
      if (highQuestion) return highQuestion;
    }
    
    // Then any unanswered
    for (const group of session.groups) {
      const question = group.questions.find(q => !q.answer);
      if (question) return question;
    }
    
    return null;
  }

  /**
   * Answer a question
   */
  answerQuestion(
    session: QuestionSession, 
    questionId: string, 
    answer: string | string[]
  ): QuestionSession {
    const updatedSession = { ...session };
    
    for (const group of updatedSession.groups) {
      const question = group.questions.find(q => q.id === questionId);
      if (question) {
        question.answer = answer;
        
        // Update group status
        const allAnswered = group.questions.every(q => q.answer);
        group.status = allAnswered ? 'completed' : 'in_progress';
        break;
      }
    }
    
    // Update progress
    this.updateProgress(updatedSession);
    
    return updatedSession;
  }

  /**
   * Update progress statistics
   */
  private updateProgress(session: QuestionSession): void {
    let answered = 0;
    let criticalAnswered = 0;
    
    for (const group of session.groups) {
      for (const q of group.questions) {
        if (q.answer) {
          answered++;
          if (q.priority === 'critical') {
            criticalAnswered++;
          }
        }
      }
    }
    
    session.progress.answered = answered;
    session.progress.criticalAnswered = criticalAnswered;
    session.updatedAt = new Date();
  }

  /**
   * Generate question summary for export
   */
  generateSummary(session: QuestionSession): string {
    const lines: string[] = [
      '# AI Question Session Summary',
      `Generated: ${session.createdAt.toISOString()}`,
      '',
      `## Progress: ${session.progress.answered}/${session.progress.total}`,
      `Critical Questions: ${session.progress.criticalAnswered}/${session.progress.criticalTotal}`,
      ''
    ];
    
    for (const group of session.groups) {
      lines.push(`### ${group.title}`);
      lines.push('');
      
      for (const q of group.questions) {
        const status = q.answer ? '✅' : '⬜';
        const priority = q.priority.toUpperCase();
        lines.push(`${status} [${priority}] ${q.question}`);
        if (q.answer) {
          const answerStr = Array.isArray(q.answer) ? q.answer.join(', ') : q.answer;
          lines.push(`   Answer: ${answerStr}`);
        }
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }
}

// Export singleton
export const aiQuestionEngine = new AIQuestionEngine();
