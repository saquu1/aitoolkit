/**
 * Healthcare Intelligence Module
 * HIS-specific patterns, PHI detection, and healthcare workflow intelligence
 * 
 * TASK-4.5: Healthcare-Specific Intelligence
 * Part of Phase 4: Features & User Experience
 */

// Healthcare Entity Types
export interface HISPattern {
  type: 'master' | 'transaction' | 'lookup' | 'audit' | 'config'
  tableNamePatterns: string[]
  description: string
  priority: number
}

export interface PHIPattern {
  name: string
  patterns: RegExp[]
  severity: 'critical' | 'high' | 'medium'
  category: 'demographic' | 'clinical' | 'financial' | 'identification'
  description: string
}

export interface HealthcareWorkflow {
  name: string
  tableName: string
  statusColumn: string
  states: string[]
  transitions: Array<{
    from: string
    to: string
    trigger: string
    roles: string[]
  }>
  estimatedDuration?: number
}

// HIS Table Patterns
export const HIS_TABLE_PATTERNS: HISPattern[] = [
  {
    type: 'master',
    tableNamePatterns: ['Patients', 'PatientMaster', 'PatientInfo', 'Doctors', 'Staff', 'Users', 'Departments', 'Wards', 'Rooms', 'Beds'],
    description: 'Master/Reference data - stable, slowly changing',
    priority: 1
  },
  {
    type: 'transaction',
    tableNamePatterns: ['Visits', 'Appointments', 'Admissions', 'Orders', 'Invoices', 'Bills', 'Transactions', 'Payments', 'Claims'],
    description: 'Transactional data - high volume, frequently updated',
    priority: 2
  },
  {
    type: 'lookup',
    tableNamePatterns: ['Genders', 'BloodGroups', 'Statuses', 'Types', 'Categories', 'MaritalStatus', 'Nationalities', 'Relationships'],
    description: 'Lookup/Reference data - small, static',
    priority: 3
  },
  {
    type: 'audit',
    tableNamePatterns: ['Audit', 'History', 'Log', 'Trail', 'Archive'],
    description: 'Audit/History data - append-only, historical',
    priority: 4
  },
  {
    type: 'config',
    tableNamePatterns: ['Settings', 'Config', 'Preferences', 'Parameters'],
    description: 'Configuration data - low volume, admin-managed',
    priority: 5
  }
]

// PHI Detection Patterns
export const PHI_PATTERNS: PHIPattern[] = [
  {
    name: 'MRN',
    patterns: [
      /\bMRN\s*[:=]?\s*[\w-]+\b/i,
      /\bMedical\s*Record\s*Number\b/i,
      /\bPatient\s*ID\b/i,
      /\bmrn_no\b/i,
      /\bmrn_number\b/i
    ],
    severity: 'critical',
    category: 'identification',
    description: 'Medical Record Number - unique patient identifier'
  },
  {
    name: 'SSN',
    patterns: [
      /\bSSN\s*[:=]?\s*\d{3}-?\d{2}-?\d{4}\b/i,
      /\bSocial\s*Security\s*Number\b/i,
      /\bssn_no\b/i
    ],
    severity: 'critical',
    category: 'identification',
    description: 'Social Security Number'
  },
  {
    name: 'CNIC',
    patterns: [
      /\bCNIC\s*[:=]?\s*\d{5}-?\d{7}-?\d{1}\b/i,
      /\bNational\s*ID\b/i,
      /\bcnic_no\b/i
    ],
    severity: 'critical',
    category: 'identification',
    description: 'Computerized National Identity Card (Pakistan)'
  },
  {
    name: 'PatientName',
    patterns: [
      /\bPatient\s*Name\b/i,
      /\bpatient_name\b/i,
      /\bfirst_name\b/i,
      /\blast_name\b/i,
      /\bfull_name\b/i
    ],
    severity: 'high',
    category: 'demographic',
    description: 'Patient name fields'
  },
  {
    name: 'DateOfBirth',
    patterns: [
      /\bDate\s*Of\s*Birth\b/i,
      /\bDOB\b/i,
      /\bdate_of_birth\b/i,
      /\bbirth_date\b/i
    ],
    severity: 'high',
    category: 'demographic',
    description: 'Date of birth - age identification'
  },
  {
    name: 'Diagnosis',
    patterns: [
      /\bDiagnosis\b/i,
      /\bdiagnosis_code\b/i,
      /\bICD[\s_-]?Code\b/i,
      /\bprincipal_diagnosis\b/i,
      /\bsecondary_diagnosis\b/i
    ],
    severity: 'critical',
    category: 'clinical',
    description: 'Diagnosis information - clinical PHI'
  },
  {
    name: 'Treatment',
    patterns: [
      /\bTreatment\b/i,
      /\btreatment_plan\b/i,
      /\bProcedure\b/i,
      /\bCPT[\s_-]?Code\b/i
    ],
    severity: 'critical',
    category: 'clinical',
    description: 'Treatment and procedure information'
  },
  {
    name: 'LabResults',
    patterns: [
      /\bLab\s*Result\b/i,
      /\bTest\s*Result\b/i,
      /\blab_value\b/i,
      /\bresult_value\b/i
    ],
    severity: 'high',
    category: 'clinical',
    description: 'Laboratory test results'
  },
  {
    name: 'Insurance',
    patterns: [
      /\bInsurance\s*ID\b/i,
      /\bPolicy\s*Number\b/i,
      /\binsurance_no\b/i,
      /\bmember_id\b/i
    ],
    severity: 'high',
    category: 'financial',
    description: 'Insurance information'
  },
  {
    name: 'ContactInfo',
    patterns: [
      /\bPhone\b/i,
      /\bEmail\b/i,
      /\bAddress\b/i,
      /\bcontact_no\b/i,
      /\bemail_address\b/i
    ],
    severity: 'medium',
    category: 'demographic',
    description: 'Contact information'
  }
]

// Healthcare Workflow Patterns
export const HEALTHCARE_WORKFLOWS: HealthcareWorkflow[] = [
  {
    name: 'Appointment Workflow',
    tableName: 'Appointments',
    statusColumn: 'Status',
    states: ['Booked', 'Confirmed', 'CheckedIn', 'InProgress', 'Completed', 'Cancelled', 'NoShow'],
    transitions: [
      { from: 'Booked', to: 'Confirmed', trigger: 'confirm', roles: ['receptionist', 'patient'] },
      { from: 'Confirmed', to: 'CheckedIn', trigger: 'checkin', roles: ['receptionist'] },
      { from: 'CheckedIn', to: 'InProgress', trigger: 'start', roles: ['doctor', 'nurse'] },
      { from: 'InProgress', to: 'Completed', trigger: 'complete', roles: ['doctor'] },
      { from: 'Booked', to: 'Cancelled', trigger: 'cancel', roles: ['patient', 'receptionist'] },
      { from: 'Confirmed', to: 'Cancelled', trigger: 'cancel', roles: ['patient', 'receptionist'] },
      { from: 'Confirmed', to: 'NoShow', trigger: 'noshow', roles: ['system'] }
    ],
    estimatedDuration: 30 // minutes
  },
  {
    name: 'Admission Workflow',
    tableName: 'Admissions',
    statusColumn: 'Status',
    states: ['Admitted', 'InWard', 'UnderTreatment', 'DischargePlanned', 'Discharged', 'Cancelled'],
    transitions: [
      { from: 'Admitted', to: 'InWard', trigger: 'assign_bed', roles: ['nurse', 'ward_clerk'] },
      { from: 'InWard', to: 'UnderTreatment', trigger: 'start_treatment', roles: ['doctor'] },
      { from: 'UnderTreatment', to: 'DischargePlanned', trigger: 'plan_discharge', roles: ['doctor'] },
      { from: 'DischargePlanned', to: 'Discharged', trigger: 'discharge', roles: ['doctor', 'nurse'] }
    ],
    estimatedDuration: 4320 // 3 days in minutes
  },
  {
    name: 'Lab Order Workflow',
    tableName: 'LabOrders',
    statusColumn: 'Status',
    states: ['Ordered', 'Collected', 'Processing', 'Completed', 'Cancelled'],
    transitions: [
      { from: 'Ordered', to: 'Collected', trigger: 'collect_sample', roles: ['phlebotomist', 'nurse'] },
      { from: 'Collected', to: 'Processing', trigger: 'start_processing', roles: ['lab_tech'] },
      { from: 'Processing', to: 'Completed', trigger: 'complete', roles: ['lab_tech'] },
      { from: 'Ordered', to: 'Cancelled', trigger: 'cancel', roles: ['doctor'] }
    ],
    estimatedDuration: 120
  },
  {
    name: 'Radiology Order Workflow',
    tableName: 'RadiologyOrders',
    statusColumn: 'Status',
    states: ['Ordered', 'Scheduled', 'InProgress', 'Completed', 'Reported', 'Cancelled'],
    transitions: [
      { from: 'Ordered', to: 'Scheduled', trigger: 'schedule', roles: ['radiology_staff'] },
      { from: 'Scheduled', to: 'InProgress', trigger: 'start', roles: ['radiologist', 'technician'] },
      { from: 'InProgress', to: 'Completed', trigger: 'complete_scan', roles: ['technician'] },
      { from: 'Completed', to: 'Reported', trigger: 'report', roles: ['radiologist'] }
    ],
    estimatedDuration: 60
  },
  {
    name: 'Pharmacy Order Workflow',
    tableName: 'PharmacyOrders',
    statusColumn: 'Status',
    states: ['Ordered', 'Verified', 'Dispensed', 'Administered', 'Cancelled'],
    transitions: [
      { from: 'Ordered', to: 'Verified', trigger: 'verify', roles: ['pharmacist'] },
      { from: 'Verified', to: 'Dispensed', trigger: 'dispense', roles: ['pharmacist'] },
      { from: 'Dispensed', to: 'Administered', trigger: 'administer', roles: ['nurse', 'doctor'] }
    ],
    estimatedDuration: 30
  },
  {
    name: 'Billing Workflow',
    tableName: 'Invoices',
    statusColumn: 'Status',
    states: ['Draft', 'Generated', 'Submitted', 'PartiallyPaid', 'Paid', 'WrittenOff', 'Disputed'],
    transitions: [
      { from: 'Draft', to: 'Generated', trigger: 'generate', roles: ['billing_staff'] },
      { from: 'Generated', to: 'Submitted', trigger: 'submit', roles: ['billing_staff'] },
      { from: 'Submitted', to: 'PartiallyPaid', trigger: 'partial_payment', roles: ['cashier', 'system'] },
      { from: 'PartiallyPaid', to: 'Paid', trigger: 'full_payment', roles: ['cashier', 'system'] },
      { from: 'Submitted', to: 'Paid', trigger: 'full_payment', roles: ['cashier', 'system'] },
      { from: 'Submitted', to: 'Disputed', trigger: 'dispute', roles: ['patient', 'insurance'] },
      { from: 'Disputed', to: 'Submitted', trigger: 'resolve', roles: ['billing_staff'] }
    ],
    estimatedDuration: 1440
  }
]

// FK Relationship Patterns
export const FK_PATTERNS = {
  patient: {
    patterns: ['PatientId', 'Patient_ID', 'patient_id', 'PatId', 'pat_id'],
    references: 'Patients',
    description: 'Reference to patient master table'
  },
  doctor: {
    patterns: ['DoctorId', 'Doctor_ID', 'doctor_id', 'DrId', 'dr_id', 'PhysicianId'],
    references: 'Doctors',
    description: 'Reference to doctor/staff table'
  },
  department: {
    patterns: ['DepartmentId', 'DeptId', 'department_id', 'dept_id'],
    references: 'Departments',
    description: 'Reference to department table'
  },
  ward: {
    patterns: ['WardId', 'Ward_ID', 'ward_id'],
    references: 'Wards',
    description: 'Reference to ward table'
  },
  visit: {
    patterns: ['VisitId', 'Visit_ID', 'visit_id', 'VisitNo'],
    references: 'Visits',
    description: 'Reference to visit/encounter table'
  },
  admission: {
    patterns: ['AdmissionId', 'AdmitId', 'admission_id', 'admit_id'],
    references: 'Admissions',
    description: 'Reference to admission table'
  },
  order: {
    patterns: ['OrderId', 'Order_ID', 'order_id', 'OrderNo'],
    references: 'Orders',
    description: 'Reference to order table'
  }
}

// Audit Column Patterns
export const AUDIT_PATTERNS = {
  created: {
    patterns: ['CreatedBy', 'CreatedOn', 'CreatedAt', 'created_by', 'created_on', 'created_at'],
    description: 'Record creation audit'
  },
  modified: {
    patterns: ['ModifiedBy', 'ModifiedOn', 'ModifiedAt', 'UpdatedBy', 'UpdatedOn', 'UpdatedAt'],
    description: 'Record modification audit'
  },
  softDelete: {
    patterns: ['IsActive', 'IsDeleted', 'is_active', 'is_deleted', 'DeletedAt', 'Status'],
    description: 'Soft delete flag'
  }
}

/**
 * Healthcare Intelligence Service
 */
export class HealthcareIntelligenceService {
  /**
   * Detect PHI columns in a table
   */
  detectPHI(tableName: string, columns: Array<{ name: string; type: string }>): Array<{
    column: string
    phiType: string
    severity: PHIPattern['severity']
    category: PHIPattern['category']
    description: string
  }> {
    const detected: Array<{
      column: string
      phiType: string
      severity: PHIPattern['severity']
      category: PHIPattern['category']
      description: string
    }> = []

    for (const column of columns) {
      for (const phiPattern of PHI_PATTERNS) {
        for (const pattern of phiPattern.patterns) {
          if (pattern.test(column.name)) {
            detected.push({
              column: column.name,
              phiType: phiPattern.name,
              severity: phiPattern.severity,
              category: phiPattern.category,
              description: phiPattern.description
            })
            break // Only match first pattern for this column
          }
        }
      }
    }

    return detected
  }

  /**
   * Classify table by HIS pattern
   */
  classifyTable(tableName: string): HISPattern | null {
    for (const pattern of HIS_TABLE_PATTERNS) {
      for (const tableNamePattern of pattern.tableNamePatterns) {
        if (tableName.toLowerCase().includes(tableNamePattern.toLowerCase())) {
          return pattern
        }
      }
    }
    return null
  }

  /**
   * Detect workflow for a table
   */
  detectWorkflow(tableName: string): HealthcareWorkflow | null {
    for (const workflow of HEALTHCARE_WORKFLOWS) {
      if (tableName.toLowerCase().includes(workflow.tableName.toLowerCase())) {
        return workflow
      }
    }
    return null
  }

  /**
   * Detect FK relationship type
   */
  detectFKType(columnName: string): { type: string; references: string; description: string } | null {
    for (const [type, pattern] of Object.entries(FK_PATTERNS)) {
      for (const p of pattern.patterns) {
        if (columnName === p || columnName.toLowerCase() === p.toLowerCase()) {
          return {
            type,
            references: pattern.references,
            description: pattern.description
          }
        }
      }
    }
    return null
  }

  /**
   * Detect audit columns
   */
  detectAuditColumns(columns: string[]): {
    created: string[]
    modified: string[]
    softDelete: string[]
  } {
    const result = {
      created: [] as string[],
      modified: [] as string[],
      softDelete: [] as string[]
    }

    for (const column of columns) {
      for (const pattern of AUDIT_PATTERNS.created.patterns) {
        if (column.toLowerCase() === pattern.toLowerCase()) {
          result.created.push(column)
        }
      }
      for (const pattern of AUDIT_PATTERNS.modified.patterns) {
        if (column.toLowerCase() === pattern.toLowerCase()) {
          result.modified.push(column)
        }
      }
      for (const pattern of AUDIT_PATTERNS.softDelete.patterns) {
        if (column.toLowerCase() === pattern.toLowerCase()) {
          result.softDelete.push(column)
        }
      }
    }

    return result
  }

  /**
   * Generate compliance report for a table
   */
  generateComplianceReport(
    tableName: string,
    columns: Array<{ name: string; type: string }>
  ): {
    phiColumns: Array<{
      column: string
      phiType: string
      severity: string
      category: string
      description: string
    }>
    tableClassification: string
    workflow: string | null
    auditCoverage: {
      hasCreatedAudit: boolean
      hasModifiedAudit: boolean
      hasSoftDelete: boolean
    }
    recommendations: string[]
  } {
    const phiColumns = this.detectPHI(tableName, columns)
    const tableClassification = this.classifyTable(tableName)
    const workflow = this.detectWorkflow(tableName)
    const auditColumns = this.detectAuditColumns(columns.map(c => c.name))

    const recommendations: string[] = []

    // Add recommendations based on analysis
    if (phiColumns.length > 0 && phiColumns.some(p => p.severity === 'critical')) {
      recommendations.push('Critical PHI detected - implement encryption at rest')
      recommendations.push('Enable audit logging for all PHI access')
    }

    if (!auditColumns.hasCreatedAudit && tableClassification?.type === 'transaction') {
      recommendations.push('Add created audit columns for transaction traceability')
    }

    if (!auditColumns.hasModifiedAudit && tableClassification?.type === 'transaction') {
      recommendations.push('Add modified audit columns for change tracking')
    }

    if (!auditColumns.hasSoftDelete && tableClassification?.type === 'master') {
      recommendations.push('Consider soft delete for master data to maintain history')
    }

    if (workflow && phiColumns.length > 0) {
      recommendations.push(`Implement state-based access control for ${workflow.name}`)
    }

    return {
      phiColumns,
      tableClassification: tableClassification?.type || 'unknown',
      workflow: workflow?.name || null,
      auditCoverage: {
        hasCreatedAudit: auditColumns.created.length > 0,
        hasModifiedAudit: auditColumns.modified.length > 0,
        hasSoftDelete: auditColumns.softDelete.length > 0
      },
      recommendations
    }
  }
}

// Export singleton
export const healthcareIntelligence = new HealthcareIntelligenceService()
