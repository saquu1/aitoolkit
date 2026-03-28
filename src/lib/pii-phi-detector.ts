// =============================================================================
// PII/PHI Detection System - Healthcare Compliance Engine
// =============================================================================

import { ColumnDef } from './types'

/**
 * Data Sensitivity Levels
 * - SECRET: Passwords, tokens - must be hashed, never logged
 * - PHI: Protected Health Information - encryption required (HIPAA)
 * - PII: Personally Identifiable Information - masking in lists
 * - CONFIDENTIAL: Salary, financial - role-restricted visibility
 * - INTERNAL: Business data - standard protection
 * - PUBLIC: No restrictions
 */
export type DataSensitivity = 'secret' | 'phi' | 'pii' | 'confidential' | 'internal' | 'public'

/**
 * Compliance Framework
 */
export type ComplianceFramework = 'HIPAA' | 'GDPR' | 'PCI-DSS' | 'SOX' | 'LOCAL'

/**
 * PII Detection Result
 */
export interface PIIDetectionResult {
  columnName: string
  tableName: string
  sensitivity: DataSensitivity
  category: PIICategory
  confidence: number
  complianceFrameworks: ComplianceFramework[]
  recommendations: string[]
  maskingStrategy?: MaskingStrategy
  encryptionRequired: boolean
  auditRequired: boolean
}

/**
 * PII Category
 */
export type PIICategory = 
  | 'personal_identifier'    // CNIC, SSN, Passport
  | 'contact_info'           // Email, Phone, Address
  | 'demographic'            // Gender, DOB, Religion
  | 'financial'              // Salary, Bank Account
  | 'medical_record'         // MRN, Diagnosis, Treatment
  | 'authentication'         // Password, Token, PIN
  | 'biometric'              // Fingerprint, Retina
  | 'location'               // GPS, Address
  | 'employment'             // Employee ID, Designation
  | 'non_sensitive'          // No PII/PHI detected

/**
 * Masking Strategy
 */
export type MaskingStrategy = 
  | 'full_mask'              // ***********
  | 'partial_mask'           // John*** ***
  | 'hash'                   // One-way hash
  | 'encrypt'                // Two-way encryption
  | 'tokenize'               // Replace with token
  | 'redact'                 // Remove from display
  | 'none'                   // No masking needed

/**
 * PII Pattern Definition
 */
interface PIIPattern {
  patterns: RegExp[]
  category: PIICategory
  sensitivity: DataSensitivity
  frameworks: ComplianceFramework[]
  maskingStrategy: MaskingStrategy
  recommendations: string[]
  confidence: number
  encryptionRequired: boolean
  auditRequired: boolean
}

/**
 * PII/PHI Detector Engine
 * Detects sensitive data and provides compliance recommendations
 */
export class PIIPhidDetector {
  private patterns: PIIPattern[]
  private strictMode: boolean

  constructor(options: { strictMode?: boolean } = {}) {
    this.strictMode = options.strictMode ?? false
    this.patterns = this.initializePatterns()
  }

  /**
   * Initialize PII/PHI detection patterns
   */
  private initializePatterns(): PIIPattern[] {
    return [
      // ═══════════════════════════════════════════════════════════════════
      // 🔴 SECRET - Authentication Data (Never display, never log)
      // ═══════════════════════════════════════════════════════════════════
      {
        patterns: [
          /^password$/i,
          /^passwd$/i,
          /^pwd$/i,
          /password_hash/i,
          /password_salt/i,
          /^secret$/i,
          /secret_key/i,
          /secret_key/i,
          /^pin$/i,
          /pin_number/i,
          /^token$/i,
          /api_key/i,
          /api_secret/i,
          /auth_token/i,
          /access_token/i,
          /refresh_token/i,
          /private_key/i
        ],
        category: 'authentication',
        sensitivity: 'secret',
        frameworks: ['HIPAA', 'GDPR', 'PCI-DSS'],
        maskingStrategy: 'hash',
        recommendations: [
          'Store only hashed values (bcrypt, Argon2)',
          'Never log or display this field',
          'Use secure password reset flow',
          'Implement rate limiting on authentication'
        ],
        confidence: 99,
        encryptionRequired: true,
        auditRequired: true
      },

      // ═══════════════════════════════════════════════════════════════════
      // 🔴 PHI - Protected Health Information (HIPAA)
      // ═══════════════════════════════════════════════════════════════════
      {
        patterns: [
          /^mrn$/i,
          /medical_record_number/i,
          /medical_record/i,
          /patient_id$/i,
          /health_id/i,
          /diagnosis/i,
          /icd_code/i,
          /icd10/i,
          /icd_10/i,
          /procedure_code/i,
          /cpt_code/i,
          /treatment/i,
          /prescription/i,
          /medication/i,
          /drug_name/i,
          /drug_id/i,
          /allerg/i,
          /symptom/i,
          /chief_complaint/i,
          /clinical/i,
          /lab_result/i,
          /test_result/i,
          /radiology/i,
          /imaging/i,
          /pathology/i,
          /discharge_summary/i,
          /admission_note/i,
          /progress_note/i,
          /operative_note/i,
          /consultation/i
        ],
        category: 'medical_record',
        sensitivity: 'phi',
        frameworks: ['HIPAA'],
        maskingStrategy: 'encrypt',
        recommendations: [
          'Encrypt at rest and in transit',
          'Implement role-based access control',
          'Log all access for audit trail',
          'Apply minimum necessary principle',
          'Implement break-the-glass for emergency access'
        ],
        confidence: 92,
        encryptionRequired: true,
        auditRequired: true
      },

      // ═══════════════════════════════════════════════════════════════════
      // 🔴 PHI - Biometric Data
      // ═══════════════════════════════════════════════════════════════════
      {
        patterns: [
          /fingerprint/i,
          /retina/i,
          /iris_scan/i,
          /facial_recognition/i,
          /voice_print/i,
          /dna/i,
          /genetic/i,
          /biometric/i,
          /blood_type/i,
          /blood_group/i
        ],
        category: 'biometric',
        sensitivity: 'phi',
        frameworks: ['HIPAA', 'GDPR'],
        maskingStrategy: 'encrypt',
        recommendations: [
          'Highest level of protection required',
          'Consider not storing if possible',
          'Use specialized biometric encryption',
          'Explicit consent required for collection'
        ],
        confidence: 95,
        encryptionRequired: true,
        auditRequired: true
      },

      // ═══════════════════════════════════════════════════════════════════
      // 🟡 PII - Personal Identifiers
      // ═══════════════════════════════════════════════════════════════════
      {
        patterns: [
          /^cnic$/i,
          /national_id/i,
          /nationalid/i,
          /^ssn$/i,
          /social_security/i,
          /passport/i,
          /passport_number/i,
          /visa_number/i,
          /drivers_license/i,
          /driving_license/i,
          /license_number/i,
          /tax_id/i,
          /pan_number/i,
          /national_insurance/i,
          /identity_card/i,
          /id_card/i
        ],
        category: 'personal_identifier',
        sensitivity: 'pii',
        frameworks: ['GDPR', 'HIPAA'],
        maskingStrategy: 'partial_mask',
        recommendations: [
          'Display masked in lists (XXXX-XXXX-1234)',
          'Full value only on detail view',
          'Encrypt in database',
          'Validate format on input',
          'Implement access logging'
        ],
        confidence: 95,
        encryptionRequired: true,
        auditRequired: true
      },

      // ═══════════════════════════════════════════════════════════════════
      // 🟡 PII - Contact Information
      // ═══════════════════════════════════════════════════════════════════
      {
        patterns: [
          /^email$/i,
          /email_address/i,
          /emailaddress/i,
          /^phone$/i,
          /phone_number/i,
          /phonenumber/i,
          /mobile/i,
          /cell_phone/i,
          /cellphone/i,
          /cellno/i,
          /contact_number/i,
          /telephone/i,
          /^fax$/i,
          /fax_number/i,
          /address/i,
          /street_address/i,
          /mailing_address/i,
          /residential_address/i,
          /home_address/i
        ],
        category: 'contact_info',
        sensitivity: 'pii',
        frameworks: ['GDPR'],
        maskingStrategy: 'partial_mask',
        recommendations: [
          'Email: Mask in lists (j***@example.com)',
          'Phone: Display last 4 digits only',
          'Address: Show city/region only in lists',
          'Implement contact verification',
          'Allow user to update their own data'
        ],
        confidence: 90,
        encryptionRequired: false,
        auditRequired: true
      },

      // ═══════════════════════════════════════════════════════════════════
      // 🟡 PII - Demographic Information
      // ═══════════════════════════════════════════════════════════════════
      {
        patterns: [
          /date_of_birth/i,
          /^dob$/i,
          /birthdate/i,
          /birthday/i,
          /^gender$/i,
          /^sex$/i,
          /marital_status/i,
          /religion/i,
          /ethnicity/i,
          /nationality/i,
          /race/i,
          /mother_maiden/i,
          /maiden_name/i,
          /place_of_birth/i,
          /citizenship/i
        ],
        category: 'demographic',
        sensitivity: 'pii',
        frameworks: ['GDPR'],
        maskingStrategy: 'partial_mask',
        recommendations: [
          'DOB: Show age instead in lists',
          'DOB: Full date only on detail view',
          'Gender/Religion: Filterable but not public',
          'Obtain consent before collecting sensitive demographics'
        ],
        confidence: 88,
        encryptionRequired: false,
        auditRequired: false
      },

      // ═══════════════════════════════════════════════════════════════════
      // 🟡 CONFIDENTIAL - Financial Information
      // ═══════════════════════════════════════════════════════════════════
      {
        patterns: [
          /salary/i,
          /wage/i,
          /income/i,
          /pay_rate/i,
          /bank_account/i,
          /account_number/i,
          /routing_number/i,
          /iban/i,
          /swift/i,
          /credit_card/i,
          /card_number/i,
          /cvv/i,
          /card_expiry/i,
          /taxable_income/i,
          /bonus/i,
          /commission/i
        ],
        category: 'financial',
        sensitivity: 'confidential',
        frameworks: ['PCI-DSS', 'GDPR', 'SOX'],
        maskingStrategy: 'full_mask',
        recommendations: [
          'Never display full account/card numbers',
          'PCI-DSS compliance required for payment data',
          'Implement strict access controls',
          'Encrypt all financial data',
          'Regular security audits required'
        ],
        confidence: 95,
        encryptionRequired: true,
        auditRequired: true
      },

      // ═══════════════════════════════════════════════════════════════════
      // 🟡 PII - Location Data
      // ═══════════════════════════════════════════════════════════════════
      {
        patterns: [
          /latitude/i,
          /longitude/i,
          /gps_location/i,
          /current_location/i,
          /geolocation/i,
          /ip_address/i,
          /ipaddress/i,
          /mac_address/i
        ],
        category: 'location',
        sensitivity: 'pii',
        frameworks: ['GDPR'],
        maskingStrategy: 'partial_mask',
        recommendations: [
          'Precise location is PII under GDPR',
          'Consider storing approximate location only',
          'Implement location data retention policy',
          'Allow users to disable location tracking'
        ],
        confidence: 85,
        encryptionRequired: false,
        auditRequired: true
      },

      // ═══════════════════════════════════════════════════════════════════
      // 🟡 CONFIDENTIAL - Employment Information
      // ═══════════════════════════════════════════════════════════════════
      {
        patterns: [
          /employee_id$/i,
          /emp_id/i,
          /employee_number/i,
          /staff_id/i,
          /designation/i,
          /department_id$/i,
          /joining_date/i,
          /termination_date/i,
          /employment_status/i,
          /performance_rating/i,
          /disciplinary/i
        ],
        category: 'employment',
        sensitivity: 'confidential',
        frameworks: ['GDPR', 'LOCAL'],
        maskingStrategy: 'none',
        recommendations: [
          'Restrict access to HR department',
          'Log all access to employee records',
          'Implement data retention policies',
          'Allow employees to view their own data'
        ],
        confidence: 80,
        encryptionRequired: false,
        auditRequired: true
      },

      // ═══════════════════════════════════════════════════════════════════
      // Patient Name Patterns (PHI)
      // ═══════════════════════════════════════════════════════════════════
      {
        patterns: [
          /patient_name/i,
          /patient_first_name/i,
          /patient_last_name/i,
          /guardian_name/i,
          /next_of_kin/i,
          /emergency_contact/i,
          /nok_name/i
        ],
        category: 'medical_record',
        sensitivity: 'phi',
        frameworks: ['HIPAA'],
        maskingStrategy: 'partial_mask',
        recommendations: [
          'Patient names are PHI when linked to medical data',
          'Display initials in lists',
          'Full name only on authorized views',
          'Implement audit logging'
        ],
        confidence: 88,
        encryptionRequired: false,
        auditRequired: true
      },

      // ═══════════════════════════════════════════════════════════════════
      // Health Measurements (PHI)
      // ═══════════════════════════════════════════════════════════════════
      {
        patterns: [
          /weight$/i,
          /height$/i,
          /bmi/i,
          /blood_pressure/i,
          /pulse/i,
          /heart_rate/i,
          /temperature$/i,
          /oxygen_saturation/i,
          /spo2/i,
          /respiratory_rate/i,
          /vital_signs/i
        ],
        category: 'medical_record',
        sensitivity: 'phi',
        frameworks: ['HIPAA'],
        maskingStrategy: 'none',
        recommendations: [
          'Health measurements are PHI when linked to patient',
          'Access restricted to care team',
          'Implement role-based access control'
        ],
        confidence: 85,
        encryptionRequired: false,
        auditRequired: true
      }
    ]
  }

  /**
   * Detect PII/PHI in a column
   */
  detect(column: ColumnDef, tableName: string): PIIDetectionResult {
    const columnName = column.name.toLowerCase()
    
    // Find best matching pattern
    let bestMatch: PIIPattern | null = null
    let bestConfidence = 0

    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(columnName)) {
          if (pattern.confidence > bestConfidence) {
            bestConfidence = pattern.confidence
            bestMatch = pattern
          }
        }
      }
    }

    // If no match, check data type for additional inference
    if (!bestMatch && this.strictMode) {
      return this.getDefaultResult(column, tableName)
    }

    if (!bestMatch) {
      return {
        columnName: column.name,
        tableName,
        sensitivity: 'internal',
        category: 'non_sensitive',
        confidence: 50,
        complianceFrameworks: [],
        recommendations: ['Review column for potential sensitivity'],
        encryptionRequired: false,
        auditRequired: false
      }
    }

    return {
      columnName: column.name,
      tableName,
      sensitivity: bestMatch.sensitivity,
      category: bestMatch.category,
      confidence: bestMatch.confidence,
      complianceFrameworks: bestMatch.frameworks,
      recommendations: [...bestMatch.recommendations],
      maskingStrategy: bestMatch.maskingStrategy,
      encryptionRequired: bestMatch.encryptionRequired,
      auditRequired: bestMatch.auditRequired
    }
  }

  /**
   * Analyze all columns in a table
   */
  analyzeTable(columns: ColumnDef[], tableName: string): PIIDetectionResult[] {
    return columns.map(col => this.detect(col, tableName))
  }

  /**
   * Analyze multiple tables
   */
  analyzeTables(tables: { columns: ColumnDef[]; tableName: string }[]): Map<string, PIIDetectionResult[]> {
    const results = new Map<string, PIIDetectionResult[]>()
    
    for (const table of tables) {
      results.set(table.tableName, this.analyzeTable(table.columns, table.tableName))
    }

    return results
  }

  /**
   * Get compliance summary for a table
   */
  getComplianceSummary(results: PIIDetectionResult[]): {
    totalColumns: number
    phiColumns: number
    piiColumns: number
    secretColumns: number
    confidentialColumns: number
    encryptionRequired: number
    auditRequired: number
    frameworks: ComplianceFramework[]
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  } {
    const totalColumns = results.length
    const phiColumns = results.filter(r => r.sensitivity === 'phi').length
    const piiColumns = results.filter(r => r.sensitivity === 'pii').length
    const secretColumns = results.filter(r => r.sensitivity === 'secret').length
    const confidentialColumns = results.filter(r => r.sensitivity === 'confidential').length
    const encryptionRequired = results.filter(r => r.encryptionRequired).length
    const auditRequired = results.filter(r => r.auditRequired).length

    const frameworks = [...new Set(results.flatMap(r => r.complianceFrameworks))]

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (secretColumns > 0 || phiColumns > 5) {
      riskLevel = 'critical'
    } else if (phiColumns > 0 || piiColumns > 10) {
      riskLevel = 'high'
    } else if (piiColumns > 0 || confidentialColumns > 0) {
      riskLevel = 'medium'
    }

    return {
      totalColumns,
      phiColumns,
      piiColumns,
      secretColumns,
      confidentialColumns,
      encryptionRequired,
      auditRequired,
      frameworks,
      riskLevel
    }
  }

  /**
   * Generate HIPAA compliance checklist
   */
  generateHIPAAChecklist(results: PIIDetectionResult[]): {
    requirement: string
    status: 'compliant' | 'partial' | 'non_compliant'
    details: string
    affectedColumns: string[]
  }[] {
    const phiColumns = results.filter(r => r.sensitivity === 'phi')
    const encryptedColumns = phiColumns.filter(r => r.encryptionRequired)
    const auditColumns = phiColumns.filter(r => r.auditRequired)

    return [
      {
        requirement: 'Encryption at Rest',
        status: encryptedColumns.length > 0 ? 'partial' : 'compliant',
        details: 'PHI must be encrypted when stored',
        affectedColumns: encryptedColumns.map(c => c.columnName)
      },
      {
        requirement: 'Encryption in Transit',
        status: 'compliant',
        details: 'All data transmitted over TLS/SSL',
        affectedColumns: []
      },
      {
        requirement: 'Access Controls',
        status: phiColumns.length > 0 ? 'partial' : 'compliant',
        details: 'Role-based access control for PHI',
        affectedColumns: phiColumns.map(c => c.columnName)
      },
      {
        requirement: 'Audit Logging',
        status: auditColumns.length > 0 ? 'partial' : 'compliant',
        details: 'All PHI access must be logged',
        affectedColumns: auditColumns.map(c => c.columnName)
      },
      {
        requirement: 'Minimum Necessary',
        status: 'partial',
        details: 'Implement minimum necessary access principle',
        affectedColumns: phiColumns.map(c => c.columnName)
      },
      {
        requirement: 'Data Masking',
        status: phiColumns.some(c => c.maskingStrategy) ? 'partial' : 'compliant',
        details: 'PHI should be masked in non-clinical views',
        affectedColumns: phiColumns.filter(c => c.maskingStrategy).map(c => c.columnName)
      }
    ]
  }

  /**
   * Default result for strict mode
   */
  private getDefaultResult(column: ColumnDef, tableName: string): PIIDetectionResult {
    const dataType = column.dataType.toUpperCase()
    
    // Infer from data type
    if (dataType.includes('PASSWORD') || dataType.includes('SECRET')) {
      return {
        columnName: column.name,
        tableName,
        sensitivity: 'secret',
        category: 'authentication',
        confidence: 70,
        complianceFrameworks: ['HIPAA', 'GDPR'],
        recommendations: ['Verify this field is hashed before storage'],
        maskingStrategy: 'hash',
        encryptionRequired: true,
        auditRequired: true
      }
    }

    return {
      columnName: column.name,
      tableName,
      sensitivity: 'internal',
      category: 'non_sensitive',
      confidence: 30,
      complianceFrameworks: [],
      recommendations: ['Manual review recommended'],
      encryptionRequired: false,
      auditRequired: false
    }
  }
}

// Export singleton instance
export const piiPhiDetector = new PIIPhidDetector()
