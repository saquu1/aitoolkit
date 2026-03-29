// =============================================================================
// HIS Layer Definitions - 7 Layers with Complete Module Structure
// =============================================================================

import { ModuleDef } from './types';

export interface Layer {
  number: number;
  name: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  modules: ModuleDef[];
}

/**
 * Hospital Information System - Complete Layer Definitions
 * 7 Layers: Foundation, Core Transactions, Revenue, Clinical, Enterprise, Optimization, Integration
 */
export const HIS_LAYERS: Layer[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 1 - FOUNDATION (Master Data)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    number: 1,
    name: 'foundation',
    title: '🧱 Layer 1 - Foundation',
    description: 'Master Data Layer - Everything depends on this. Must be built first.',
    icon: '🧱',
    color: 'blue',
    modules: [
      {
        key: 'org-setup',
        name: 'Organization Setup',
        description: 'Multi-tenant organization management with hierarchy',
        layer: 1,
        tables: ['Organizations', 'OrganizationTypes', 'OrganizationBranches', 'OrganizationSettings', 'OrganizationLicenses'],
        dependsOn: [],
        apiEndpoints: [
          'GET /api/organizations',
          'POST /api/organizations',
          'PUT /api/organizations/:id',
          'DELETE /api/organizations/:id',
          'GET /api/organizations/:id/branches',
          'POST /api/organizations/:id/settings'
        ],
        priority: 'critical',
        revenue: false,
        estimatedDays: 5,
        features: [
          'Multi-tenant organization creation',
          'Branch/location management',
          'Organization hierarchy (parent-child)',
          'Settings per organization',
          'License management',
          'Logo and branding per org'
        ],
        userRoles: ['SuperAdmin', 'OrgAdmin'],
        status: 'planned'
      },
      {
        key: 'user-auth',
        name: 'Users, Roles & Authentication',
        description: 'Complete user management with RBAC and multi-tenant isolation',
        layer: 1,
        tables: ['Users', 'Roles', 'UserRoles', 'Permissions', 'RolePermissions', 'UserSessions', 'UserLoginHistory', 'PasswordResets'],
        dependsOn: ['org-setup'],
        apiEndpoints: [
          'POST /api/auth/login',
          'POST /api/auth/register',
          'POST /api/auth/refresh',
          'POST /api/auth/logout',
          'POST /api/auth/forgot-password',
          'GET /api/users',
          'POST /api/users',
          'PUT /api/users/:id',
          'GET /api/roles',
          'POST /api/roles',
          'PUT /api/roles/:id/permissions'
        ],
        priority: 'critical',
        revenue: false,
        estimatedDays: 8,
        features: [
          'JWT + Refresh token authentication',
          'Role-based access control (RBAC)',
          'Permission-level access (granular)',
          'Multi-tenant user isolation',
          'Login history & audit trail',
          'Password policy enforcement',
          'Session management',
          'Two-factor authentication (optional)'
        ],
        userRoles: ['SuperAdmin', 'OrgAdmin', 'IT Admin'],
        status: 'planned'
      },
      {
        key: 'geography',
        name: 'Geography Master',
        description: 'Countries, provinces, cities used everywhere',
        layer: 1,
        tables: ['Countries', 'Provinces', 'Cities', 'Areas'],
        dependsOn: [],
        apiEndpoints: [
          'GET /api/countries',
          'GET /api/countries/:id/provinces',
          'GET /api/provinces/:id/cities',
          'GET /api/cities/:id/areas'
        ],
        priority: 'critical',
        revenue: false,
        estimatedDays: 2,
        features: [
          'Country management',
          'Province/state cascading',
          'City management',
          'Area/locality management',
          'Cascading dropdowns support'
        ],
        userRoles: ['SuperAdmin'],
        status: 'planned'
      },
      {
        key: 'lookup-data',
        name: 'Lookup & Reference Data',
        description: 'All dropdown values, categories, and reference data',
        layer: 1,
        tables: ['LookupCategories', 'LookupValues', 'Titles', 'Genders', 'MaritalStatuses', 'BloodGroups', 'Nationalities', 'Languages', 'Religions', 'Ethnicities'],
        dependsOn: [],
        apiEndpoints: [
          'GET /api/lookups',
          'GET /api/lookups/:category',
          'POST /api/lookups',
          'PUT /api/lookups/:id'
        ],
        priority: 'critical',
        revenue: false,
        estimatedDays: 3,
        features: [
          'Dynamic lookup categories',
          'Configurable dropdown values',
          'Active/inactive status',
          'Sort order management',
          'Bulk import/export',
          'Multi-language support'
        ],
        userRoles: ['SuperAdmin', 'OrgAdmin'],
        status: 'planned'
      },
      {
        key: 'department-setup',
        name: 'Department & Facility Setup',
        description: 'Hospital departments, wards, rooms, beds',
        layer: 1,
        tables: ['Departments', 'DepartmentTypes', 'Wards', 'Rooms', 'Beds', 'BedTypes', 'Facilities', 'FacilityTypes'],
        dependsOn: ['org-setup'],
        apiEndpoints: [
          'GET /api/departments',
          'POST /api/departments',
          'GET /api/departments/:id/wards',
          'GET /api/wards/:id/beds',
          'PUT /api/beds/:id/status'
        ],
        priority: 'critical',
        revenue: false,
        estimatedDays: 5,
        features: [
          'Department CRUD with hierarchy',
          'Ward management (IPD)',
          'Room and bed management',
          'Bed availability tracking',
          'Facility configuration',
          'Department-wise settings'
        ],
        userRoles: ['OrgAdmin', 'DeptAdmin'],
        status: 'planned'
      },
      {
        key: 'employee-doctor',
        name: 'Employee & Doctor Management',
        description: 'Staff registry including doctors, nurses, technicians',
        layer: 1,
        tables: ['Employees', 'EmployeeTypes', 'Doctors', 'DoctorSpecializations', 'Specializations', 'DoctorSchedules', 'DoctorDepartments', 'Designations', 'EmployeeDepartments', 'DoctorFees'],
        dependsOn: ['org-setup', 'department-setup', 'geography'],
        apiEndpoints: [
          'GET /api/employees',
          'POST /api/employees',
          'GET /api/doctors',
          'POST /api/doctors',
          'GET /api/doctors/:id/schedule',
          'POST /api/doctors/:id/schedule',
          'GET /api/doctors/:id/fees',
          'GET /api/specializations'
        ],
        priority: 'critical',
        revenue: false,
        estimatedDays: 7,
        features: [
          'Employee registration with documents',
          'Doctor profile management',
          'Specialization mapping',
          'Schedule/availability management',
          'Department assignment',
          'Fee structure per doctor',
          'Doctor dashboard'
        ],
        userRoles: ['HRAdmin', 'OrgAdmin', 'Doctor'],
        status: 'planned'
      },
      {
        key: 'service-catalog',
        name: 'Service & Pricing Catalog',
        description: 'All hospital services with pricing tiers',
        layer: 1,
        tables: ['Services', 'ServiceCategories', 'ServicePricing', 'PricingTiers', 'Packages', 'PackageServices', 'ServiceDepartments', 'InsuranceServicePricing'],
        dependsOn: ['org-setup', 'department-setup'],
        apiEndpoints: [
          'GET /api/services',
          'POST /api/services',
          'GET /api/services/:id/pricing',
          'POST /api/services/:id/pricing',
          'GET /api/packages',
          'POST /api/packages'
        ],
        priority: 'critical',
        revenue: true,
        estimatedDays: 6,
        features: [
          'Service category hierarchy',
          'Multi-tier pricing (walk-in, panel, insurance)',
          'Package management (health checkup packages)',
          'Department-service mapping',
          'Insurance-specific pricing',
          'Discount rules per service'
        ],
        userRoles: ['OrgAdmin', 'FinanceAdmin'],
        status: 'planned'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 2 - CORE TRANSACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    number: 2,
    name: 'core-transactions',
    title: '⚙️ Layer 2 - Core Transactions',
    description: 'Patient flow, visits, appointments - the operational backbone',
    icon: '⚙️',
    color: 'green',
    modules: [
      {
        key: 'patient-reg',
        name: 'Patient Registration (MPI)',
        description: 'Master Patient Index - central patient registry',
        layer: 2,
        tables: ['Patients', 'PatientContacts', 'PatientInsurance', 'PatientDocuments', 'PatientHistory', 'PatientAllergies', 'PatientNextOfKin', 'PatientMRN'],
        dependsOn: ['org-setup', 'geography', 'lookup-data'],
        apiEndpoints: [
          'GET /api/patients',
          'POST /api/patients',
          'PUT /api/patients/:id',
          'GET /api/patients/:id',
          'GET /api/patients/search',
          'GET /api/patients/:id/history',
          'POST /api/patients/:id/documents',
          'GET /api/patients/:id/insurance'
        ],
        priority: 'critical',
        revenue: false,
        estimatedDays: 8,
        features: [
          'Patient registration with demographics',
          'Auto MRN generation',
          'Duplicate detection (name, phone, CNIC)',
          'Patient search (fuzzy + exact)',
          'Contact management',
          'Insurance card linking',
          'Document upload',
          'Patient merge capability',
          'QR code generation',
          'Patient portal access'
        ],
        userRoles: ['Receptionist', 'Registration', 'Nurse'],
        status: 'planned'
      },
      {
        key: 'appointment',
        name: 'Appointment Management',
        description: 'Doctor appointment scheduling system',
        layer: 2,
        tables: ['Appointments', 'AppointmentSlots', 'AppointmentStatuses', 'AppointmentTypes', 'DoctorAvailability', 'AppointmentReminders'],
        dependsOn: ['patient-reg', 'employee-doctor'],
        apiEndpoints: [
          'GET /api/appointments',
          'POST /api/appointments',
          'PUT /api/appointments/:id',
          'PUT /api/appointments/:id/status',
          'GET /api/doctors/:id/slots',
          'GET /api/appointments/calendar'
        ],
        priority: 'high',
        revenue: true,
        estimatedDays: 7,
        features: [
          'Slot-based scheduling',
          'Doctor availability calendar',
          'Walk-in vs scheduled',
          'Appointment status workflow',
          'SMS/Email reminders',
          'Reschedule & cancel',
          'Waitlist management',
          'Online booking support'
        ],
        userRoles: ['Receptionist', 'Patient', 'Doctor'],
        status: 'planned'
      },
      {
        key: 'opd-visit',
        name: 'OPD Visit Management',
        description: 'Outpatient department visit tracking',
        layer: 2,
        tables: ['OPDVisits', 'OPDVisitServices', 'OPDQueue', 'OPDVitals', 'VisitTypes', 'TokenManagement'],
        dependsOn: ['patient-reg', 'appointment', 'employee-doctor', 'service-catalog'],
        apiEndpoints: [
          'POST /api/opd/visits',
          'GET /api/opd/visits/:id',
          'PUT /api/opd/visits/:id',
          'GET /api/opd/queue',
          'POST /api/opd/visits/:id/vitals',
          'GET /api/opd/today-summary'
        ],
        priority: 'critical',
        revenue: true,
        estimatedDays: 8,
        features: [
          'Visit creation from appointment/walk-in',
          'Token number generation',
          'Queue management',
          'Vitals recording (BP, temp, weight, etc.)',
          'Visit-service linking',
          'Doctor assignment',
          'Visit summary',
          'Follow-up scheduling'
        ],
        userRoles: ['Receptionist', 'Nurse', 'Doctor'],
        status: 'planned'
      },
      {
        key: 'ipd-admission',
        name: 'IPD Admission & Discharge',
        description: 'Inpatient admission, transfer, discharge (ADT)',
        layer: 2,
        tables: ['IPDAdmissions', 'IPDTransfers', 'IPDDischarges', 'BedAllocation', 'IPDDailyCharges', 'IPDServices', 'AdmissionTypes', 'DischargeTypes'],
        dependsOn: ['patient-reg', 'department-setup', 'employee-doctor', 'service-catalog'],
        apiEndpoints: [
          'POST /api/ipd/admit',
          'GET /api/ipd/admissions',
          'PUT /api/ipd/admissions/:id',
          'POST /api/ipd/admissions/:id/transfer',
          'POST /api/ipd/admissions/:id/discharge',
          'GET /api/ipd/bed-availability',
          'GET /api/ipd/admissions/:id/charges'
        ],
        priority: 'critical',
        revenue: true,
        estimatedDays: 12,
        features: [
          'Admission from ER/OPD',
          'Bed allocation with availability check',
          'Bed transfer between wards',
          'Daily charge calculation',
          'Doctor assignment (attending/consulting)',
          'Discharge workflow (summary, clearance)',
          'Against medical advice (AMA) discharge',
          'Patient census dashboard'
        ],
        userRoles: ['Receptionist', 'Nurse', 'Doctor', 'WardManager'],
        status: 'planned'
      },
      {
        key: 'emergency',
        name: 'Emergency / ER Module',
        description: 'Emergency department with triage',
        layer: 2,
        tables: ['ERVisits', 'ERTriage', 'TriageLevels', 'ERBedAllocation', 'ERDisposition'],
        dependsOn: ['patient-reg', 'employee-doctor', 'department-setup'],
        apiEndpoints: [
          'POST /api/er/visits',
          'POST /api/er/visits/:id/triage',
          'PUT /api/er/visits/:id/disposition',
          'GET /api/er/dashboard'
        ],
        priority: 'high',
        revenue: true,
        estimatedDays: 8,
        features: [
          'Quick registration (minimal data)',
          'Triage assessment (ESI levels)',
          'ER bed tracking',
          'Disposition (admit/discharge/transfer)',
          'ER dashboard with real-time status',
          'Time tracking (door-to-doctor)'
        ],
        userRoles: ['ERNurse', 'ERDoctor', 'Receptionist'],
        status: 'planned'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 3 - REVENUE GENERATING MODULES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    number: 3,
    name: 'revenue',
    title: '💰 Layer 3 - Revenue Generating',
    description: 'Billing, pharmacy, lab - these modules generate direct revenue',
    icon: '💰',
    color: 'yellow',
    modules: [
      {
        key: 'billing',
        name: 'Billing & Invoicing',
        description: 'Complete billing engine with multi-payer support',
        layer: 3,
        tables: ['Invoices', 'InvoiceItems', 'InvoicePayments', 'PaymentMethods', 'Receipts', 'Refunds', 'CreditNotes', 'BillingCategories', 'DiscountRules', 'TaxRules', 'InvoiceStatuses'],
        dependsOn: ['patient-reg', 'service-catalog', 'opd-visit', 'ipd-admission'],
        apiEndpoints: [
          'POST /api/billing/invoices',
          'GET /api/billing/invoices/:id',
          'POST /api/billing/invoices/:id/pay',
          'POST /api/billing/refunds',
          'GET /api/billing/daily-collection',
          'GET /api/billing/outstanding'
        ],
        priority: 'critical',
        revenue: true,
        estimatedDays: 15,
        features: [
          'OPD/IPD/ER billing',
          'Multi-payment method (cash, card, online)',
          'Partial payment support',
          'Discount management (%, flat, approval)',
          'Tax calculation',
          'Credit note & refund',
          'Insurance claim billing',
          'Package billing',
          'Daily collection report',
          'Outstanding management',
          'Receipt printing'
        ],
        userRoles: ['Cashier', 'BillingAdmin', 'FinanceManager'],
        status: 'planned'
      },
      {
        key: 'pharmacy',
        name: 'Pharmacy Management',
        description: 'Drug inventory, dispensing, and sales',
        layer: 3,
        tables: ['Drugs', 'DrugCategories', 'DrugManufacturers', 'DrugGenericNames', 'PharmacyStock', 'PharmacyPurchaseOrders', 'PharmacyPurchaseItems', 'PharmacyDispensing', 'PharmacyDispensingItems', 'PharmacySales', 'DrugInteractions', 'PharmacyStores', 'StockTransfers', 'PharmacyReturns', 'BatchTracking', 'ExpiryAlerts'],
        dependsOn: ['patient-reg', 'billing', 'employee-doctor'],
        apiEndpoints: [
          'GET /api/pharmacy/drugs',
          'POST /api/pharmacy/drugs',
          'GET /api/pharmacy/stock',
          'POST /api/pharmacy/purchase-orders',
          'POST /api/pharmacy/dispense',
          'GET /api/pharmacy/expiring',
          'POST /api/pharmacy/sales',
          'GET /api/pharmacy/stock-alerts'
        ],
        priority: 'critical',
        revenue: true,
        estimatedDays: 18,
        features: [
          'Drug master with generic/brand names',
          'Multi-store inventory management',
          'Purchase order workflow',
          'GRN (Goods Received Note)',
          'Prescription-based dispensing',
          'OTC (over-the-counter) sales',
          'Batch & expiry tracking',
          'Auto reorder level alerts',
          'Stock transfer between stores',
          'Return management',
          'Drug interaction warnings',
          'Barcode support',
          'Controlled substance tracking'
        ],
        userRoles: ['Pharmacist', 'PharmacyAdmin', 'Doctor'],
        status: 'planned'
      },
      {
        key: 'laboratory',
        name: 'Laboratory (LIS)',
        description: 'Lab test ordering, sample tracking, results',
        layer: 3,
        tables: ['LabTests', 'LabTestCategories', 'LabTestParameters', 'LabOrders', 'LabOrderItems', 'LabSamples', 'SampleTypes', 'LabResults', 'LabResultValues', 'LabProfiles', 'LabProfileTests', 'LabMachineInterfaces', 'NormalRanges'],
        dependsOn: ['patient-reg', 'billing', 'employee-doctor'],
        apiEndpoints: [
          'GET /api/lab/tests',
          'POST /api/lab/orders',
          'GET /api/lab/orders/:id',
          'POST /api/lab/orders/:id/collect-sample',
          'POST /api/lab/orders/:id/results',
          'GET /api/lab/worklist',
          'GET /api/lab/reports/:id'
        ],
        priority: 'critical',
        revenue: true,
        estimatedDays: 15,
        features: [
          'Test catalog with parameters',
          'Test profiles/panels',
          'Order entry (doctor/reception)',
          'Sample collection & barcode',
          'Sample tracking workflow',
          'Result entry with normal ranges',
          'Auto-flagging abnormal values',
          'Report generation (PDF)',
          'Machine interface (HL7/ASTM)',
          'Critical value alerts',
          'Quality control',
          'TAT tracking'
        ],
        userRoles: ['LabTechnician', 'Pathologist', 'Doctor', 'Receptionist'],
        status: 'planned'
      },
      {
        key: 'radiology',
        name: 'Radiology (RIS)',
        description: 'Imaging orders, scheduling, reporting',
        layer: 3,
        tables: ['RadiologyExams', 'RadiologyCategories', 'RadiologyOrders', 'RadiologySchedule', 'RadiologyReports', 'RadiologyTemplates', 'Modalities', 'DicomStudies'],
        dependsOn: ['patient-reg', 'billing', 'employee-doctor'],
        apiEndpoints: [
          'GET /api/radiology/exams',
          'POST /api/radiology/orders',
          'POST /api/radiology/orders/:id/report',
          'GET /api/radiology/worklist',
          'GET /api/radiology/reports/:id'
        ],
        priority: 'high',
        revenue: true,
        estimatedDays: 12,
        features: [
          'Exam catalog management',
          'Order entry',
          'Modality worklist (MWL)',
          'Structured reporting with templates',
          'PACS integration',
          'DICOM viewer link',
          'Report approval workflow'
        ],
        userRoles: ['Radiologist', 'RadTechnician', 'Doctor'],
        status: 'planned'
      },
      {
        key: 'insurance',
        name: 'Insurance & Panel Management',
        description: 'Insurance companies, policies, claims processing',
        layer: 3,
        tables: ['InsuranceCompanies', 'InsurancePlans', 'InsurancePolicies', 'PatientPolicies', 'InsuranceClaims', 'ClaimItems', 'ClaimStatuses', 'PreAuthorization', 'PanelCompanies', 'PanelPricing', 'CorporateContracts'],
        dependsOn: ['patient-reg', 'billing', 'service-catalog'],
        apiEndpoints: [
          'GET /api/insurance/companies',
          'POST /api/insurance/claims',
          'GET /api/insurance/claims/:id',
          'PUT /api/insurance/claims/:id/status',
          'POST /api/insurance/pre-auth',
          'GET /api/insurance/outstanding'
        ],
        priority: 'high',
        revenue: true,
        estimatedDays: 12,
        features: [
          'Insurance company management',
          'Plan/policy management',
          'Patient policy linking',
          'Claim submission workflow',
          'Pre-authorization',
          'Panel company contracts',
          'Corporate billing',
          'Claim status tracking',
          'Receivable aging reports',
          'Reconciliation'
        ],
        userRoles: ['InsuranceOfficer', 'BillingAdmin', 'FinanceManager'],
        status: 'planned'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 4 - CLINICAL EXPANSION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    number: 4,
    name: 'clinical',
    title: '🏥 Layer 4 - Clinical Expansion',
    description: 'EMR, prescriptions, clinical workflows',
    icon: '🏥',
    color: 'red',
    modules: [
      {
        key: 'emr',
        name: 'Electronic Medical Records (EMR)',
        description: 'Clinical documentation and medical history',
        layer: 4,
        tables: ['ClinicalNotes', 'NoteTemplates', 'ClinicalEncounters', 'Diagnoses', 'ICD10Codes', 'PatientDiagnoses', 'Procedures', 'CPTCodes', 'ClinicalForms', 'FormResponses'],
        dependsOn: ['patient-reg', 'opd-visit', 'ipd-admission', 'employee-doctor'],
        apiEndpoints: [
          'POST /api/emr/notes',
          'GET /api/emr/patients/:id/history',
          'POST /api/emr/encounters/:id/diagnoses',
          'GET /api/emr/templates',
          'POST /api/emr/forms/:id/submit'
        ],
        priority: 'high',
        revenue: false,
        estimatedDays: 20,
        features: [
          'SOAP note documentation',
          'Template-based documentation',
          'ICD-10 diagnosis coding',
          'Problem list management',
          'Clinical form builder',
          'History timeline view',
          'Voice-to-text (optional)',
          'Clinical decision support'
        ],
        userRoles: ['Doctor', 'Nurse', 'ClinicalStaff'],
        status: 'planned'
      },
      {
        key: 'prescription',
        name: 'E-Prescription',
        description: 'Electronic prescription with drug interaction checks',
        layer: 4,
        tables: ['Prescriptions', 'PrescriptionItems', 'PrescriptionTemplates', 'DrugFavorites', 'DrugDoseForms', 'DrugRoutes', 'DrugFrequencies', 'DrugAllergies'],
        dependsOn: ['emr', 'pharmacy', 'patient-reg'],
        apiEndpoints: [
          'POST /api/prescriptions',
          'GET /api/prescriptions/:id',
          'GET /api/prescriptions/patient/:id',
          'POST /api/prescriptions/:id/dispense'
        ],
        priority: 'high',
        revenue: false,
        estimatedDays: 10,
        features: [
          'Drug search with autocomplete',
          'Dosage form selection',
          'Frequency and duration',
          'Drug allergy alerts',
          'Drug interaction checking',
          'Doctor favorites/templates',
          'Prescription printing',
          'Direct pharmacy integration',
          'Prescription renewal'
        ],
        userRoles: ['Doctor', 'Pharmacist'],
        status: 'planned'
      },
      {
        key: 'nursing',
        name: 'Nursing Module',
        description: 'Nursing assessment, care plans, MAR',
        layer: 4,
        tables: ['NursingAssessments', 'CarePlans', 'CareActivities', 'MedicationAdministration', 'VitalSigns', 'IntakeOutput', 'NursingNotes', 'NursingShifts'],
        dependsOn: ['ipd-admission', 'patient-reg', 'prescription'],
        apiEndpoints: [
          'POST /api/nursing/assessments',
          'POST /api/nursing/vitals',
          'POST /api/nursing/medications/administer',
          'GET /api/nursing/mar/:admissionId',
          'POST /api/nursing/io'
        ],
        priority: 'medium',
        revenue: false,
        estimatedDays: 12,
        features: [
          'Nursing assessment forms',
          'Vitals monitoring',
          'Medication Administration Record (MAR)',
          'I/O charting',
          'Care plan management',
          'Shift handover notes',
          'Fall risk assessment',
          'Pain assessment'
        ],
        userRoles: ['Nurse', 'HeadNurse'],
        status: 'planned'
      },
      {
        key: 'ot-management',
        name: 'Operation Theater (OT)',
        description: 'Surgical scheduling and OT management',
        layer: 4,
        tables: ['OperationTheaters', 'OTSchedule', 'SurgicalProcedures', 'OTTeams', 'OTConsumables', 'SurgicalNotes', 'AnesthesiaRecords', 'PreOpAssessments', 'PostOpNotes'],
        dependsOn: ['ipd-admission', 'employee-doctor', 'billing'],
        apiEndpoints: [
          'GET /api/ot/theaters',
          'POST /api/ot/schedule',
          'GET /api/ot/schedule/calendar',
          'POST /api/ot/procedures/:id/notes'
        ],
        priority: 'medium',
        revenue: true,
        estimatedDays: 12,
        features: [
          'OT scheduling calendar',
          'Surgical team assignment',
          'Pre-op assessment',
          'Anesthesia record',
          'OT consumable tracking',
          'Surgical notes',
          'Post-op monitoring',
          'OT utilization reports'
        ],
        userRoles: ['Surgeon', 'Anesthesiologist', 'OTNurse', 'OTScheduler'],
        status: 'planned'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 5 - ENTERPRISE & ACCOUNTING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    number: 5,
    name: 'enterprise',
    title: '🏢 Layer 5 - Enterprise & Accounting',
    description: 'Financial accounting, HR, inventory - enterprise backbone',
    icon: '🏢',
    color: 'purple',
    modules: [
      {
        key: 'general-ledger',
        name: 'General Ledger & Chart of Accounts',
        description: 'Double-entry accounting system',
        layer: 5,
        tables: ['ChartOfAccounts', 'AccountTypes', 'JournalEntries', 'JournalLines', 'FiscalYears', 'FiscalPeriods', 'AccountBalances', 'CostCenters'],
        dependsOn: ['org-setup', 'billing'],
        apiEndpoints: [
          'GET /api/accounting/accounts',
          'POST /api/accounting/journal-entries',
          'GET /api/accounting/trial-balance',
          'GET /api/accounting/balance-sheet',
          'GET /api/accounting/income-statement'
        ],
        priority: 'high',
        revenue: false,
        estimatedDays: 15,
        features: [
          'Chart of accounts management',
          'Double-entry journal entries',
          'Auto posting from billing',
          'Trial balance',
          'Balance sheet',
          'Income statement',
          'Cost center tracking',
          'Fiscal year management',
          'Period closing'
        ],
        userRoles: ['Accountant', 'FinanceManager', 'CFO'],
        status: 'planned'
      },
      {
        key: 'accounts-receivable',
        name: 'Accounts Receivable',
        description: 'Track money owed to the hospital',
        layer: 5,
        tables: ['ARInvoices', 'ARPayments', 'ARAgingReport', 'CustomerAccounts', 'PaymentPlans'],
        dependsOn: ['general-ledger', 'billing', 'insurance'],
        apiEndpoints: [
          'GET /api/ar/outstanding',
          'GET /api/ar/aging',
          'POST /api/ar/payments',
          'GET /api/ar/customer/:id'
        ],
        priority: 'high',
        revenue: false,
        estimatedDays: 8,
        features: [
          'Insurance receivable tracking',
          'Patient receivable tracking',
          'Aging analysis',
          'Payment plan management',
          'Write-off management',
          'Dunning notices'
        ],
        userRoles: ['ARClerk', 'FinanceManager'],
        status: 'planned'
      },
      {
        key: 'accounts-payable',
        name: 'Accounts Payable',
        description: 'Track money hospital owes to vendors',
        layer: 5,
        tables: ['Vendors', 'PurchaseOrders', 'PurchaseOrderItems', 'GoodsReceivedNotes', 'APInvoices', 'APPayments', 'VendorContracts'],
        dependsOn: ['general-ledger'],
        apiEndpoints: [
          'GET /api/ap/vendors',
          'POST /api/ap/purchase-orders',
          'POST /api/ap/grn',
          'POST /api/ap/payments',
          'GET /api/ap/aging'
        ],
        priority: 'medium',
        revenue: false,
        estimatedDays: 10,
        features: [
          'Vendor management',
          'Purchase order workflow',
          'GRN matching',
          'Invoice processing',
          'Payment scheduling',
          'Vendor aging report'
        ],
        userRoles: ['PurchaseOfficer', 'AccountsPayable', 'FinanceManager'],
        status: 'planned'
      },
      {
        key: 'inventory',
        name: 'Inventory & Supply Chain',
        description: 'General hospital inventory management',
        layer: 5,
        tables: ['InventoryItems', 'ItemCategories', 'Warehouses', 'StockLevels', 'StockMovements', 'StoreRequisitions', 'IssueNotes', 'InventoryAdjustments'],
        dependsOn: ['org-setup', 'department-setup'],
        apiEndpoints: [
          'GET /api/inventory/items',
          'GET /api/inventory/stock',
          'POST /api/inventory/requisitions',
          'POST /api/inventory/issues',
          'POST /api/inventory/adjustments'
        ],
        priority: 'medium',
        revenue: false,
        estimatedDays: 10,
        features: [
          'Item master management',
          'Multi-warehouse support',
          'Requisition workflow',
          'Issue note generation',
          'Stock adjustment/write-off',
          'Reorder alerts',
          'Consumption reports'
        ],
        userRoles: ['StoreKeeper', 'DeptManager', 'PurchaseOfficer'],
        status: 'planned'
      },
      {
        key: 'hr-payroll',
        name: 'HR & Payroll',
        description: 'Human resource management and payroll processing',
        layer: 5,
        tables: ['HREmployees', 'LeaveTypes', 'LeaveApplications', 'AttendanceRecords', 'PayrollRuns', 'SalaryComponents', 'EmployeeSalaries', 'PaySlips', 'Deductions', 'Allowances'],
        dependsOn: ['employee-doctor', 'general-ledger'],
        apiEndpoints: [
          'POST /api/hr/leave-apply',
          'GET /api/hr/attendance',
          'POST /api/hr/payroll/run',
          'GET /api/hr/payslips/:employeeId'
        ],
        priority: 'medium',
        revenue: false,
        estimatedDays: 15,
        features: [
          'Leave management',
          'Attendance tracking',
          'Salary structure',
          'Payroll processing',
          'Pay slip generation',
          'Statutory deductions',
          'Overtime calculation',
          'Employee self-service'
        ],
        userRoles: ['HRManager', 'Employee', 'PayrollOfficer'],
        status: 'planned'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 6 - ADVANCED OPTIMIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    number: 6,
    name: 'optimization',
    title: '🤖 Layer 6 - Advanced Optimization',
    description: 'AI-powered analytics, automation, patient engagement',
    icon: '🤖',
    color: 'indigo',
    modules: [
      {
        key: 'analytics',
        name: 'Analytics & Business Intelligence',
        description: 'Dashboards, KPIs, and reporting engine',
        layer: 6,
        tables: ['DashboardConfigs', 'ReportTemplates', 'ReportSchedules', 'KPIDefinitions', 'KPIValues', 'DataExports'],
        dependsOn: ['billing', 'patient-reg', 'laboratory', 'pharmacy'],
        apiEndpoints: [
          'GET /api/analytics/dashboard',
          'GET /api/analytics/kpis',
          'POST /api/analytics/reports/generate',
          'GET /api/analytics/revenue/trend'
        ],
        priority: 'medium',
        revenue: false,
        estimatedDays: 15,
        features: [
          'Executive dashboard',
          'Revenue analytics',
          'Patient volume trends',
          'Department-wise analytics',
          'Custom report builder',
          'Scheduled report delivery',
          'Export to Excel/PDF'
        ],
        userRoles: ['Admin', 'FinanceManager', 'CEO'],
        status: 'planned'
      },
      {
        key: 'patient-portal',
        name: 'Patient Portal & Mobile App',
        description: 'Patient self-service and engagement',
        layer: 6,
        tables: ['PatientPortalUsers', 'PortalSessions', 'PatientAppointments', 'PatientRecords', 'PushNotifications', 'SMSTemplates', 'EmailTemplates'],
        dependsOn: ['patient-reg', 'appointment', 'billing', 'laboratory'],
        apiEndpoints: [
          'POST /api/portal/login',
          'GET /api/portal/appointments',
          'POST /api/portal/book',
          'GET /api/portal/results',
          'GET /api/portal/invoices'
        ],
        priority: 'medium',
        revenue: false,
        estimatedDays: 20,
        features: [
          'Online appointment booking',
          'Lab results viewing',
          'Invoice & payment history',
          'Prescription history',
          'Health records access',
          'Push notifications',
          'SMS/Email reminders'
        ],
        userRoles: ['Patient'],
        status: 'planned'
      },
      {
        key: 'ai-assistant',
        name: 'AI Clinical Assistant',
        description: 'AI-powered clinical decision support',
        layer: 6,
        tables: ['AIRecommendations', 'ClinicalRules', 'DrugInteractionRules', 'DiseaseProtocols', 'AIModelConfigs'],
        dependsOn: ['emr', 'prescription', 'laboratory'],
        apiEndpoints: [
          'POST /api/ai/analyze',
          'GET /api/ai/recommendations/:patientId',
          'POST /api/ai/check-interactions'
        ],
        priority: 'low',
        revenue: false,
        estimatedDays: 25,
        features: [
          'Drug interaction alerts',
          'Allergy warnings',
          'Dosage recommendations',
          'Diagnostic suggestions',
          'Protocol reminders',
          'Risk scoring'
        ],
        userRoles: ['Doctor', 'Nurse'],
        status: 'planned'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 7 - INTEGRATION & EXTERNAL SYSTEMS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    number: 7,
    name: 'integration',
    title: '🔗 Layer 7 - Integration & External',
    description: 'HL7, APIs, third-party integrations, external systems',
    icon: '🔗',
    color: 'cyan',
    modules: [
      {
        key: 'hl7-integration',
        name: 'HL7 Integration Engine',
        description: 'HL7 v2.x and FHIR message processing',
        layer: 7,
        tables: ['HL7Messages', 'HL7MessageTypes', 'HL7Transformations', 'HL7Endpoints', 'MessageQueue', 'MessageLogs'],
        dependsOn: ['patient-reg', 'laboratory', 'radiology'],
        apiEndpoints: [
          'POST /api/hl7/receive',
          'GET /api/hl7/messages',
          'POST /api/hl7/send',
          'GET /api/hl7/status'
        ],
        priority: 'medium',
        revenue: false,
        estimatedDays: 20,
        features: [
          'HL7 v2.x message parsing',
          'FHIR R4 resource mapping',
          'ADT message handling',
          'ORU result messages',
          'Custom transformation rules',
          'Message logging & replay'
        ],
        userRoles: ['ITAdmin', 'IntegrationSpecialist'],
        status: 'planned'
      },
      {
        key: 'lab-machine-interface',
        name: 'Lab Machine Interfaces',
        description: 'Bi-directional analyzer interfaces (ASTM/HL7)',
        layer: 7,
        tables: ['LabMachines', 'MachineInterfaces', 'MachineProtocols', 'ResultMappings', 'MachineLogs', 'QCResults'],
        dependsOn: ['laboratory'],
        apiEndpoints: [
          'GET /api/lab-machines',
          'POST /api/lab-machines/:id/connect',
          'GET /api/lab-machines/:id/results',
          'POST /api/lab-machines/:id/qc'
        ],
        priority: 'high',
        revenue: false,
        estimatedDays: 15,
        features: [
          'ASTM protocol support',
          'HL7 result interface',
          'Bi-directional communication',
          'QC sample processing',
          'Auto-verification rules',
          'Error handling & alerts'
        ],
        userRoles: ['LabTechnician', 'ITAdmin'],
        status: 'planned'
      },
      {
        key: 'pacs-integration',
        name: 'PACS Integration',
        description: 'Picture Archiving and Communication System',
        layer: 7,
        tables: ['PACSConfig', 'DicomNodes', 'StudyRecords', 'ImageStorage', 'PACSQueue'],
        dependsOn: ['radiology'],
        apiEndpoints: [
          'GET /api/pacs/studies',
          'GET /api/pacs/images/:studyId',
          'POST /api/pacs/store'
        ],
        priority: 'medium',
        revenue: false,
        estimatedDays: 12,
        features: [
          'DICOM node configuration',
          'Study storage & retrieval',
          'Image viewer integration',
          'Worklist synchronization',
          'Storage management'
        ],
        userRoles: ['RadTechnician', 'Radiologist', 'ITAdmin'],
        status: 'planned'
      },
      {
        key: 'payment-gateway',
        name: 'Payment Gateway Integration',
        description: 'Online payment processing',
        layer: 7,
        tables: ['PaymentGateways', 'PaymentTransactions', 'PaymentRefunds', 'GatewayConfigs', 'WebhookLogs'],
        dependsOn: ['billing'],
        apiEndpoints: [
          'POST /api/payments/create',
          'POST /api/payments/callback',
          'GET /api/payments/status/:id',
          'POST /api/payments/refund'
        ],
        priority: 'high',
        revenue: true,
        estimatedDays: 8,
        features: [
          'Multiple gateway support',
          'Credit/debit card payments',
          'Mobile wallet integration',
          'Payment callback handling',
          'Refund processing',
          'Transaction reconciliation'
        ],
        userRoles: ['Cashier', 'Patient', 'FinanceManager'],
        status: 'planned'
      },
      {
        key: 'sms-email-gateway',
        name: 'SMS & Email Gateway',
        description: 'Notification and communication services',
        layer: 7,
        tables: ['SMSConfigs', 'EmailConfigs', 'NotificationQueue', 'NotificationTemplates', 'NotificationLogs', 'SMSCredits'],
        dependsOn: ['patient-reg', 'appointment'],
        apiEndpoints: [
          'POST /api/notifications/sms',
          'POST /api/notifications/email',
          'GET /api/notifications/templates',
          'GET /api/notifications/logs'
        ],
        priority: 'medium',
        revenue: false,
        estimatedDays: 6,
        features: [
          'SMS gateway integration',
          'Email service integration',
          'Template management',
          'Bulk notifications',
          'Scheduled notifications',
          'Delivery tracking'
        ],
        userRoles: ['Admin', 'Receptionist'],
        status: 'planned'
      }
    ]
  }
];

/**
 * Get all modules as a flat array
 */
export function getAllModules(): ModuleDef[] {
  return HIS_LAYERS.flatMap(layer => layer.modules);
}

/**
 * Get module by key
 */
export function getModuleByKey(key: string): ModuleDef | undefined {
  return getAllModules().find(m => m.key === key);
}

/**
 * Get modules by layer
 */
export function getModulesByLayer(layerNumber: number): ModuleDef[] {
  const layer = HIS_LAYERS.find(l => l.number === layerNumber);
  return layer?.modules || [];
}

/**
 * Get module dependencies (recursive)
 */
export function getModuleDependencies(moduleKey: string): ModuleDef[] {
  const mod = getModuleByKey(moduleKey);
  if (!mod) return [];
  
  const deps: ModuleDef[] = [];
  const visited = new Set<string>();
  
  function collectDeps(key: string) {
    if (visited.has(key)) return;
    visited.add(key);
    
    const m = getModuleByKey(key);
    if (m) {
      for (const depKey of m.dependsOn) {
        const dep = getModuleByKey(depKey);
        if (dep && !visited.has(depKey)) {
          deps.push(dep);
          collectDeps(depKey);
        }
      }
    }
  }
  
  collectDeps(moduleKey);
  return deps;
}

/**
 * Get modules that depend on a given module
 */
export function getModuleDependents(moduleKey: string): ModuleDef[] {
  return getAllModules().filter(m => m.dependsOn.includes(moduleKey));
}

/**
 * Get module build order (topological sort)
 */
export function getModuleBuildOrder(): string[] {
  const modules = getAllModules();
  const visited = new Set<string>();
  const order: string[] = [];
  
  function visit(key: string) {
    if (visited.has(key)) return;
    visited.add(key);
    
    const mod = getModuleByKey(key);
    if (mod) {
      for (const dep of mod.dependsOn) {
        visit(dep);
      }
      order.push(key);
    }
  }
  
  for (const mod of modules) {
    visit(mod.key);
  }
  
  return order;
}

/**
 * Calculate total estimated days
 */
export function getTotalEstimatedDays(): number {
  return getAllModules().reduce((sum, m) => sum + m.estimatedDays, 0);
}

/**
 * Get module statistics
 */
export function getModuleStatistics() {
  const modules = getAllModules();
  
  return {
    totalModules: modules.length,
    totalEstimatedDays: modules.reduce((sum, m) => sum + m.estimatedDays, 0),
    byLayer: HIS_LAYERS.map(l => ({
      layer: l.number,
      name: l.name,
      moduleCount: l.modules.length,
      estimatedDays: l.modules.reduce((sum, m) => sum + m.estimatedDays, 0)
    })),
    byPriority: {
      critical: modules.filter(m => m.priority === 'critical').length,
      high: modules.filter(m => m.priority === 'high').length,
      medium: modules.filter(m => m.priority === 'medium').length,
      low: modules.filter(m => m.priority === 'low').length
    },
    revenueGenerating: modules.filter(m => m.revenue).length,
    totalTables: [...new Set(modules.flatMap(m => m.tables))].length
  };
}

// Export layer count
export const TOTAL_LAYERS = HIS_LAYERS.length;
export const TOTAL_MODULES = getAllModules().length;
