/**
 * Healthcare Domain Patterns
 * 
 * Hospital Information Systems (HIS), Electronic Health Records (EHR),
 * Medical Practice Management, Laboratory Information Systems
 * 
 * @module domain-intelligence/patterns/healthcare
 */

import { DomainDefinition, TableNamePattern, ColumnNamePattern, FKPattern, WorkflowPattern, SensitiveDataPattern, DomainCategory } from '../base'

// =============================================================================
// TABLE PATTERNS
// =============================================================================

export const HEALTHCARE_TABLE_PATTERNS: TableNamePattern[] = [
  // Master Data
  { pattern: 'Patient', weight: 9, category: 'master', description: 'Patient master record' },
  { pattern: 'Patients', weight: 10, category: 'master', description: 'Patient master table' },
  { pattern: 'PatientMaster', weight: 10, category: 'master', description: 'Patient master table' },
  { pattern: 'Doctor', weight: 8, category: 'master', description: 'Doctor/Physician master' },
  { pattern: 'Doctors', weight: 9, category: 'master', description: 'Doctors master table' },
  { pattern: 'Physician', weight: 8, category: 'master', description: 'Physician master' },
  { pattern: 'Nurse', weight: 7, category: 'master', description: 'Nurse master' },
  { pattern: 'Staff', weight: 5, category: 'master', description: 'Staff master' },
  { pattern: 'Department', weight: 5, category: 'master', description: 'Department master' },
  { pattern: 'Ward', weight: 7, category: 'master', description: 'Hospital ward' },
  { pattern: 'Room', weight: 5, category: 'master', description: 'Room master' },
  { pattern: 'Bed', weight: 7, category: 'master', description: 'Bed management' },
  { pattern: 'Specialty', weight: 6, category: 'master', description: 'Medical specialty' },
  { pattern: 'Clinic', weight: 6, category: 'master', description: 'Clinic master' },
  
  // Transaction Data
  { pattern: 'Visit', weight: 9, category: 'transaction', description: 'Patient visit' },
  { pattern: 'Visits', weight: 10, category: 'transaction', description: 'Visit records' },
  { pattern: 'Appointment', weight: 8, category: 'transaction', description: 'Appointment' },
  { pattern: 'Admission', weight: 9, category: 'transaction', description: 'Hospital admission' },
  { pattern: 'Admissions', weight: 10, category: 'transaction', description: 'Admission records' },
  { pattern: 'Encounter', weight: 8, category: 'transaction', description: 'Clinical encounter' },
  { pattern: 'Encounters', weight: 9, category: 'transaction', description: 'Encounter records' },
  { pattern: 'Discharge', weight: 8, category: 'transaction', description: 'Discharge records' },
  
  // Orders & Procedures
  { pattern: 'LabOrder', weight: 9, category: 'transaction', description: 'Laboratory order' },
  { pattern: 'LabOrders', weight: 10, category: 'transaction', description: 'Lab orders' },
  { pattern: 'LabResult', weight: 9, category: 'transaction', description: 'Lab results' },
  { pattern: 'LabResults', weight: 10, category: 'transaction', description: 'Lab results' },
  { pattern: 'Radiology', weight: 9, category: 'transaction', description: 'Radiology orders' },
  { pattern: 'RadiologyOrder', weight: 9, category: 'transaction', description: 'Radiology order' },
  { pattern: 'Imaging', weight: 7, category: 'transaction', description: 'Medical imaging' },
  { pattern: 'Prescription', weight: 8, category: 'transaction', description: 'Prescription' },
  { pattern: 'Prescriptions', weight: 9, category: 'transaction', description: 'Prescriptions' },
  { pattern: 'PharmacyOrder', weight: 8, category: 'transaction', description: 'Pharmacy order' },
  { pattern: 'Medication', weight: 7, category: 'transaction', description: 'Medication records' },
  { pattern: 'Procedure', weight: 7, category: 'transaction', description: 'Medical procedure' },
  
  // Clinical Data
  { pattern: 'Diagnosis', weight: 9, category: 'transaction', description: 'Diagnosis records' },
  { pattern: 'Diagnoses', weight: 10, category: 'transaction', description: 'Diagnosis records' },
  { pattern: 'Vital', weight: 7, category: 'transaction', description: 'Vital signs' },
  { pattern: 'Vitals', weight: 8, category: 'transaction', description: 'Vital signs' },
  { pattern: 'Allergy', weight: 8, category: 'transaction', description: 'Allergy records' },
  { pattern: 'Allergies', weight: 9, category: 'transaction', description: 'Allergy records' },
  { pattern: 'Immunization', weight: 8, category: 'transaction', description: 'Immunization records' },
  { pattern: 'Vaccination', weight: 8, category: 'transaction', description: 'Vaccination records' },
  { pattern: 'MedicalRecord', weight: 9, category: 'transaction', description: 'Medical records' },
  { pattern: 'ClinicalNote', weight: 8, category: 'transaction', description: 'Clinical notes' },
  { pattern: 'ProgressNote', weight: 7, category: 'transaction', description: 'Progress notes' },
  { pattern: 'History', weight: 5, category: 'audit', description: 'Medical history' },
  
  // Billing
  { pattern: 'Claim', weight: 7, category: 'transaction', description: 'Insurance claim' },
  { pattern: 'Claims', weight: 8, category: 'transaction', description: 'Insurance claims' },
  { pattern: 'Insurance', weight: 6, category: 'master', description: 'Insurance master' },
  { pattern: 'Coverage', weight: 6, category: 'master', description: 'Insurance coverage' },
  { pattern: 'Copay', weight: 6, category: 'transaction', description: 'Copay records' },
  { pattern: 'Deductible', weight: 6, category: 'transaction', description: 'Deductible records' },
  
  // Lookup
  { pattern: 'ICD', weight: 8, category: 'lookup', description: 'ICD diagnosis codes' },
  { pattern: 'CPT', weight: 8, category: 'lookup', description: 'CPT procedure codes' },
  { pattern: 'BloodGroup', weight: 7, category: 'lookup', description: 'Blood groups' },
  { pattern: 'Gender', weight: 3, category: 'lookup', description: 'Gender lookup' },
  { pattern: 'MaritalStatus', weight: 3, category: 'lookup', description: 'Marital status' },
  { pattern: 'Relation', weight: 4, category: 'lookup', description: 'Relationship types' },
  { pattern: 'Nationality', weight: 3, category: 'lookup', description: 'Nationality lookup' },
  
  // Inventory
  { pattern: 'Drug', weight: 7, category: 'master', description: 'Drug master' },
  { pattern: 'Drugs', weight: 8, category: 'master', description: 'Drug master table' },
  { pattern: 'Medicine', weight: 7, category: 'master', description: 'Medicine master' },
  { pattern: 'Supply', weight: 5, category: 'master', description: 'Medical supplies' },
  { pattern: 'Equipment', weight: 5, category: 'master', description: 'Medical equipment' },
]

// =============================================================================
// COLUMN PATTERNS
// =============================================================================

export const HEALTHCARE_COLUMN_PATTERNS: ColumnNamePattern[] = [
  // Patient Identifiers
  { pattern: 'MRN', weight: 10, sensitivity: 'PHI', semanticType: 'patient_identifier', description: 'Medical Record Number' },
  { pattern: 'PatientId', weight: 8, sensitivity: 'PHI', semanticType: 'patient_identifier', description: 'Patient ID' },
  { pattern: 'Patient_ID', weight: 8, sensitivity: 'PHI', semanticType: 'patient_identifier', description: 'Patient ID' },
  { pattern: 'PatId', weight: 8, sensitivity: 'PHI', semanticType: 'patient_identifier', description: 'Patient ID' },
  { pattern: 'MedicalRecordNumber', weight: 10, sensitivity: 'PHI', semanticType: 'patient_identifier', description: 'Medical Record Number' },
  
  // National Identifiers
  { pattern: 'SSN', weight: 10, sensitivity: 'PHI', semanticType: 'national_id', description: 'Social Security Number' },
  { pattern: 'CNIC', weight: 10, sensitivity: 'PHI', semanticType: 'national_id', description: 'National ID (Pakistan)' },
  { pattern: 'NationalId', weight: 9, sensitivity: 'PHI', semanticType: 'national_id', description: 'National ID' },
  { pattern: 'NIN', weight: 9, sensitivity: 'PHI', semanticType: 'national_id', description: 'National Insurance Number' },
  
  // Demographics
  { pattern: 'PatientName', weight: 7, sensitivity: 'PHI', semanticType: 'person_name', description: 'Patient name' },
  { pattern: 'patient_name', weight: 7, sensitivity: 'PHI', semanticType: 'person_name', description: 'Patient name' },
  { pattern: 'FirstName', weight: 5, sensitivity: 'PII', semanticType: 'person_name', description: 'First name' },
  { pattern: 'LastName', weight: 5, sensitivity: 'PII', semanticType: 'person_name', description: 'Last name' },
  { pattern: 'DOB', weight: 8, sensitivity: 'PHI', semanticType: 'birth_date', description: 'Date of birth' },
  { pattern: 'DateOfBirth', weight: 8, sensitivity: 'PHI', semanticType: 'birth_date', description: 'Date of birth' },
  { pattern: 'date_of_birth', weight: 8, sensitivity: 'PHI', semanticType: 'birth_date', description: 'Date of birth' },
  { pattern: 'BirthDate', weight: 8, sensitivity: 'PHI', semanticType: 'birth_date', description: 'Birth date' },
  { pattern: 'Age', weight: 6, sensitivity: 'PHI', semanticType: 'age', description: 'Age' },
  { pattern: 'Gender', weight: 5, sensitivity: 'PHI', semanticType: 'gender', description: 'Gender' },
  { pattern: 'Sex', weight: 5, sensitivity: 'PHI', semanticType: 'gender', description: 'Sex' },
  { pattern: 'BloodGroup', weight: 7, sensitivity: 'PHI', semanticType: 'blood_type', description: 'Blood group' },
  { pattern: 'BloodType', weight: 7, sensitivity: 'PHI', semanticType: 'blood_type', description: 'Blood type' },
  
  // Clinical Data
  { pattern: 'Diagnosis', weight: 9, sensitivity: 'PHI', semanticType: 'diagnosis', description: 'Diagnosis' },
  { pattern: 'diagnosis_code', weight: 9, sensitivity: 'PHI', semanticType: 'diagnosis_code', description: 'Diagnosis code' },
  { pattern: 'ICDCode', weight: 9, sensitivity: 'PHI', semanticType: 'diagnosis_code', description: 'ICD code' },
  { pattern: 'ICD', weight: 8, sensitivity: 'PHI', semanticType: 'diagnosis_code', description: 'ICD code' },
  { pattern: 'PrincipalDiagnosis', weight: 9, sensitivity: 'PHI', semanticType: 'diagnosis', description: 'Principal diagnosis' },
  { pattern: 'SecondaryDiagnosis', weight: 8, sensitivity: 'PHI', semanticType: 'diagnosis', description: 'Secondary diagnosis' },
  { pattern: 'Treatment', weight: 8, sensitivity: 'PHI', semanticType: 'treatment', description: 'Treatment' },
  { pattern: 'treatment_plan', weight: 8, sensitivity: 'PHI', semanticType: 'treatment', description: 'Treatment plan' },
  { pattern: 'Procedure', weight: 7, sensitivity: 'PHI', semanticType: 'procedure', description: 'Procedure' },
  { pattern: 'CPTCode', weight: 8, sensitivity: 'PHI', semanticType: 'procedure_code', description: 'CPT code' },
  
  // Vital Signs
  { pattern: 'BloodPressure', weight: 8, sensitivity: 'PHI', semanticType: 'vital_sign', description: 'Blood pressure' },
  { pattern: 'HeartRate', weight: 7, sensitivity: 'PHI', semanticType: 'vital_sign', description: 'Heart rate' },
  { pattern: 'Pulse', weight: 7, sensitivity: 'PHI', semanticType: 'vital_sign', description: 'Pulse' },
  { pattern: 'Temperature', weight: 6, sensitivity: 'PHI', semanticType: 'vital_sign', description: 'Temperature' },
  { pattern: 'Weight', weight: 5, sensitivity: 'PHI', semanticType: 'vital_sign', description: 'Weight' },
  { pattern: 'Height', weight: 5, sensitivity: 'PHI', semanticType: 'vital_sign', description: 'Height' },
  { pattern: 'BMI', weight: 6, sensitivity: 'PHI', semanticType: 'vital_sign', description: 'BMI' },
  { pattern: 'RespiratoryRate', weight: 7, sensitivity: 'PHI', semanticType: 'vital_sign', description: 'Respiratory rate' },
  { pattern: 'OxygenSaturation', weight: 7, sensitivity: 'PHI', semanticType: 'vital_sign', description: 'Oxygen saturation' },
  { pattern: 'SpO2', weight: 7, sensitivity: 'PHI', semanticType: 'vital_sign', description: 'Oxygen saturation' },
  
  // Lab Results
  { pattern: 'LabResult', weight: 8, sensitivity: 'PHI', semanticType: 'lab_result', description: 'Lab result' },
  { pattern: 'TestResult', weight: 8, sensitivity: 'PHI', semanticType: 'lab_result', description: 'Test result' },
  { pattern: 'lab_value', weight: 8, sensitivity: 'PHI', semanticType: 'lab_result', description: 'Lab value' },
  { pattern: 'result_value', weight: 7, sensitivity: 'PHI', semanticType: 'lab_result', description: 'Result value' },
  { pattern: 'Specimen', weight: 6, sensitivity: 'PHI', semanticType: 'specimen', description: 'Specimen' },
  { pattern: 'SampleId', weight: 6, sensitivity: 'PHI', semanticType: 'specimen', description: 'Sample ID' },
  
  // Medications
  { pattern: 'DrugId', weight: 6, semanticType: 'medication', description: 'Drug ID' },
  { pattern: 'DrugName', weight: 7, semanticType: 'medication', description: 'Drug name' },
  { pattern: 'Dosage', weight: 7, sensitivity: 'PHI', semanticType: 'medication', description: 'Dosage' },
  { pattern: 'Dose', weight: 7, sensitivity: 'PHI', semanticType: 'medication', description: 'Dose' },
  { pattern: 'Frequency', weight: 6, semanticType: 'medication', description: 'Dosing frequency' },
  { pattern: 'Route', weight: 5, semanticType: 'medication', description: 'Administration route' },
  { pattern: 'Prescription', weight: 7, sensitivity: 'PHI', semanticType: 'prescription', description: 'Prescription' },
  
  // Insurance/Financial
  { pattern: 'InsuranceId', weight: 7, sensitivity: 'PHI', semanticType: 'insurance', description: 'Insurance ID' },
  { pattern: 'PolicyNumber', weight: 8, sensitivity: 'PHI', semanticType: 'insurance', description: 'Policy number' },
  { pattern: 'insurance_no', weight: 8, sensitivity: 'PHI', semanticType: 'insurance', description: 'Insurance number' },
  { pattern: 'MemberId', weight: 7, sensitivity: 'PHI', semanticType: 'insurance', description: 'Member ID' },
  { pattern: 'ClaimId', weight: 6, sensitivity: 'PHI', semanticType: 'claim', description: 'Claim ID' },
  { pattern: 'ClaimNumber', weight: 7, sensitivity: 'PHI', semanticType: 'claim', description: 'Claim number' },
  
  // Healthcare Staff
  { pattern: 'DoctorId', weight: 6, semanticType: 'doctor', description: 'Doctor ID' },
  { pattern: 'Doctor_ID', weight: 6, semanticType: 'doctor', description: 'Doctor ID' },
  { pattern: 'PhysicianId', weight: 6, semanticType: 'doctor', description: 'Physician ID' },
  { pattern: 'DrId', weight: 6, semanticType: 'doctor', description: 'Doctor ID' },
  { pattern: 'NurseId', weight: 5, semanticType: 'nurse', description: 'Nurse ID' },
  { pattern: 'ProviderId', weight: 6, semanticType: 'provider', description: 'Provider ID' },
  { pattern: 'ReferringPhysician', weight: 6, semanticType: 'doctor', description: 'Referring physician' },
  { pattern: 'AttendingPhysician', weight: 6, semanticType: 'doctor', description: 'Attending physician' },
  { pattern: 'AdmittingPhysician', weight: 6, semanticType: 'doctor', description: 'Admitting physician' },
  
  // Location
  { pattern: 'WardId', weight: 6, semanticType: 'ward', description: 'Ward ID' },
  { pattern: 'BedId', weight: 6, semanticType: 'bed', description: 'Bed ID' },
  { pattern: 'BedNumber', weight: 6, semanticType: 'bed', description: 'Bed number' },
  { pattern: 'RoomNumber', weight: 5, semanticType: 'room', description: 'Room number' },
  { pattern: 'DepartmentId', weight: 5, semanticType: 'department', description: 'Department ID' },
  { pattern: 'DeptId', weight: 5, semanticType: 'department', description: 'Department ID' },
  
  // Visit/Encounter
  { pattern: 'VisitId', weight: 7, semanticType: 'visit', description: 'Visit ID' },
  { pattern: 'Visit_ID', weight: 7, semanticType: 'visit', description: 'Visit ID' },
  { pattern: 'VisitNo', weight: 7, semanticType: 'visit', description: 'Visit number' },
  { pattern: 'EncounterId', weight: 7, semanticType: 'encounter', description: 'Encounter ID' },
  { pattern: 'AdmissionId', weight: 7, semanticType: 'admission', description: 'Admission ID' },
  { pattern: 'AdmitId', weight: 7, semanticType: 'admission', description: 'Admission ID' },
  { pattern: 'AdmissionDate', weight: 7, semanticType: 'date', description: 'Admission date' },
  { pattern: 'DischargeDate', weight: 7, semanticType: 'date', description: 'Discharge date' },
  
  // Allergies
  { pattern: 'Allergy', weight: 8, sensitivity: 'PHI', semanticType: 'allergy', description: 'Allergy' },
  { pattern: 'Allergen', weight: 7, sensitivity: 'PHI', semanticType: 'allergen', description: 'Allergen' },
  { pattern: 'AllergicTo', weight: 7, sensitivity: 'PHI', semanticType: 'allergy', description: 'Allergic to' },
]

// =============================================================================
// FK PATTERNS
// =============================================================================

export const HEALTHCARE_FK_PATTERNS: FKPattern[] = [
  { columnPattern: /^PatientId$/i, referencesTable: 'Patients', weight: 8, description: 'Reference to patient master' },
  { columnPattern: /^Patient_ID$/i, referencesTable: 'Patients', weight: 8, description: 'Reference to patient master' },
  { columnPattern: /^PatId$/i, referencesTable: 'Patients', weight: 7, description: 'Reference to patient master' },
  { columnPattern: /^DoctorId$/i, referencesTable: 'Doctors', weight: 7, description: 'Reference to doctors' },
  { columnPattern: /^PhysicianId$/i, referencesTable: 'Doctors', weight: 7, description: 'Reference to doctors' },
  { columnPattern: /^DrId$/i, referencesTable: 'Doctors', weight: 6, description: 'Reference to doctors' },
  { columnPattern: /^NurseId$/i, referencesTable: 'Nurses', weight: 6, description: 'Reference to nurses' },
  { columnPattern: /^WardId$/i, referencesTable: 'Wards', weight: 6, description: 'Reference to wards' },
  { columnPattern: /^BedId$/i, referencesTable: 'Beds', weight: 6, description: 'Reference to beds' },
  { columnPattern: /^DepartmentId$/i, referencesTable: 'Departments', weight: 5, description: 'Reference to departments' },
  { columnPattern: /^DeptId$/i, referencesTable: 'Departments', weight: 5, description: 'Reference to departments' },
  { columnPattern: /^VisitId$/i, referencesTable: 'Visits', weight: 7, description: 'Reference to visits' },
  { columnPattern: /^EncounterId$/i, referencesTable: 'Encounters', weight: 7, description: 'Reference to encounters' },
  { columnPattern: /^AdmissionId$/i, referencesTable: 'Admissions', weight: 7, description: 'Reference to admissions' },
  { columnPattern: /^LabOrderId$/i, referencesTable: 'LabOrders', weight: 7, description: 'Reference to lab orders' },
  { columnPattern: /^PrescriptionId$/i, referencesTable: 'Prescriptions', weight: 6, description: 'Reference to prescriptions' },
]

// =============================================================================
// WORKFLOW PATTERNS
// =============================================================================

export const HEALTHCARE_WORKFLOWS: WorkflowPattern[] = [
  {
    name: 'Appointment Workflow',
    tableName: /^Appointment/i,
    statusColumn: 'Status',
    states: ['Booked', 'Confirmed', 'CheckedIn', 'InProgress', 'Completed', 'Cancelled', 'NoShow', 'Scheduled'],
    weight: 8
  },
  {
    name: 'Admission Workflow',
    tableName: /^Admission/i,
    statusColumn: 'Status',
    states: ['Admitted', 'InWard', 'UnderTreatment', 'DischargePlanned', 'Discharged', 'Cancelled', 'IPD'],
    weight: 9
  },
  {
    name: 'Lab Order Workflow',
    tableName: /^LabOrder/i,
    statusColumn: 'Status',
    states: ['Ordered', 'Collected', 'Processing', 'Completed', 'Cancelled', 'Pending', 'Verified'],
    weight: 8
  },
  {
    name: 'Radiology Workflow',
    tableName: /^Radiology/i,
    statusColumn: 'Status',
    states: ['Ordered', 'Scheduled', 'InProgress', 'Completed', 'Reported', 'Cancelled'],
    weight: 8
  },
  {
    name: 'Pharmacy Order Workflow',
    tableName: /^Pharmacy|^Prescription/i,
    statusColumn: 'Status',
    states: ['Ordered', 'Verified', 'Dispensed', 'Administered', 'Cancelled'],
    weight: 7
  },
  {
    name: 'Patient Visit Workflow',
    tableName: /^Visit/i,
    statusColumn: 'Status',
    states: ['Scheduled', 'CheckedIn', 'InProgress', 'Completed', 'Cancelled', 'OPD', 'IPD'],
    weight: 8
  },
  {
    name: 'Billing Workflow',
    tableName: /^Invoice|^Bill/i,
    statusColumn: 'Status',
    states: ['Draft', 'Generated', 'Submitted', 'PartiallyPaid', 'Paid', 'WrittenOff', 'Disputed', 'Pending'],
    weight: 6
  },
  {
    name: 'Insurance Claim Workflow',
    tableName: /^Claim/i,
    statusColumn: 'Status',
    states: ['Submitted', 'Processing', 'Approved', 'Rejected', 'Paid', 'Appealed'],
    weight: 7
  }
]

// =============================================================================
// SENSITIVE DATA PATTERNS
// =============================================================================

export const HEALTHCARE_SENSITIVE_PATTERNS: SensitiveDataPattern[] = [
  {
    name: 'MRN (Medical Record Number)',
    patterns: [
      /\bMRN[-\s]?[\d]{6,12}\b/i,
      /\bMRN\s*[:=]\s*[\w-]+\b/i,
    ],
    sensitivity: 'PHI',
    domainWeight: 10,
    description: 'Medical Record Number - unique patient identifier'
  },
  {
    name: 'ICD Code',
    patterns: [
      /\b[A-Z]\d{2}(\.\d{1,2})?\b/g,  // ICD-10 format: A00.00
      /\b\d{3}(\.\d{1,2})?\b/g,        // ICD-9 format: 001.00
    ],
    sensitivity: 'PHI',
    domainWeight: 8,
    description: 'ICD diagnosis codes'
  },
  {
    name: 'CPT Code',
    patterns: [
      /\b\d{5}\b/g,  // 5-digit CPT codes
    ],
    sensitivity: 'PHI',
    domainWeight: 6,
    description: 'CPT procedure codes (needs context)'
  },
  {
    name: 'NDC (National Drug Code)',
    patterns: [
      /\b\d{4,5}-\d{3,4}-\d{1,2}\b/g,
    ],
    sensitivity: 'PHI',
    domainWeight: 7,
    description: 'National Drug Code'
  },
]

// =============================================================================
// TABLE CATEGORIES
// =============================================================================

export const HEALTHCARE_TABLE_CATEGORIES: Record<DomainCategory, string[]> = {
  master: ['Patients', 'Doctors', 'Nurses', 'Staff', 'Departments', 'Wards', 'Rooms', 'Beds', 'Clinics', 'Specialties', 'Insurance', 'Drugs', 'Equipment'],
  transaction: ['Visits', 'Appointments', 'Admissions', 'Encounters', 'LabOrders', 'LabResults', 'RadiologyOrders', 'Prescriptions', 'Diagnoses', 'Procedures', 'Claims', 'Invoices'],
  lookup: ['Genders', 'BloodGroups', 'MaritalStatus', 'Nationalities', 'Relations', 'ICDCodes', 'CPTCodes', 'DrugCategories', 'DosageForms'],
  audit: ['PatientHistory', 'AuditLog', 'AccessLog', 'ChangeLog', 'MedicalHistory'],
  config: ['HospitalSettings', 'SystemConfig', 'UserPreferences', 'NotificationTemplates'],
  workflow: ['Workflows', 'WorkflowSteps', 'ApprovalRequests', 'TaskQueue'],
  reporting: ['Reports', 'DashboardMetrics', 'AnalyticsData'],
  junction: [],
    integration: ['HL7Messages', 'FHIRResources', 'ExternalSystemSync']
}

// =============================================================================
// DOMAIN DEFINITION
// =============================================================================

export const HEALTHCARE_DOMAIN: DomainDefinition = {
  domain: 'healthcare',
  displayName: 'Healthcare / Medical',
  description: 'Hospital Information Systems (HIS), Electronic Health Records (EHR), Medical Practice Management, Laboratory Information Systems (LIS), Pharmacy Management',
  industries: [
    'Hospitals & Health Systems',
    'Medical Clinics',
    'Laboratories',
    'Pharmacies',
    'Radiology Centers',
    'Ambulatory Care',
    'Long-term Care',
    'Mental Health Facilities'
  ],
  
  tablePatterns: HEALTHCARE_TABLE_PATTERNS,
  columnPatterns: HEALTHCARE_COLUMN_PATTERNS,
  fkPatterns: HEALTHCARE_FK_PATTERNS,
  workflows: HEALTHCARE_WORKFLOWS,
  sensitivePatterns: HEALTHCARE_SENSITIVE_PATTERNS,
  
  tableCategories: HEALTHCARE_TABLE_CATEGORIES,
  
  keywords: [
    'patient', 'doctor', 'nurse', 'ward', 'bed', 'admission', 'discharge',
    'diagnosis', 'prescription', 'medication', 'lab', 'radiology', 'imaging',
    'vital', 'allergy', 'immunization', 'vaccination', 'symptom', 'treatment',
    'clinical', 'medical', 'hospital', 'clinic', 'healthcare', 'encounter',
    'mrn', 'icd', 'cpt', 'ndc', 'phi', 'hipaa', 'ehr', 'emr', 'his', 'lis'
  ],
  
  specificity: 9  // Healthcare has very specific patterns
}
