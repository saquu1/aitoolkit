// =============================================================================
// HIS Module Registry - 460+ Complete Healthcare Modules
// =============================================================================

import { ModuleDef } from './types';

/**
 * Sub-module definition for granular functionality
 */
export interface SubModule {
  key: string;
  name: string;
  description: string;
  tables: string[];
  features: string[];
  estimatedHours: number;
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  userRoles: string[];
}

/**
 * Extended module with sub-modules
 */
export interface ExtendedModule extends ModuleDef {
  subModules: SubModule[];
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 1 - FOUNDATION MODULES (Detailed Breakdown)
// ═══════════════════════════════════════════════════════════════════════════

export const FOUNDATION_MODULES: ExtendedModule[] = [
  {
    key: 'org-setup',
    name: 'Organization Setup',
    description: 'Multi-tenant organization management',
    layer: 1,
    tables: ['Organizations', 'OrganizationTypes', 'OrganizationBranches', 'OrganizationSettings', 'OrganizationLicenses'],
    dependsOn: [],
    apiEndpoints: [],
    priority: 'critical',
    revenue: false,
    estimatedDays: 5,
    features: [],
    userRoles: ['SuperAdmin', 'OrgAdmin'],
    status: 'planned',
    subModules: [
      { key: 'org-crud', name: 'Organization CRUD', description: 'Create, read, update, delete organizations', tables: ['Organizations'], features: ['Add/Edit organization', 'Organization hierarchy', 'Logo upload'], estimatedHours: 8, complexity: 'low', userRoles: ['SuperAdmin'] },
      { key: 'org-types', name: 'Organization Types', description: 'Define organization types (Hospital, Clinic, Lab)', tables: ['OrganizationTypes'], features: ['Type management', 'Icon assignment'], estimatedHours: 4, complexity: 'low', userRoles: ['SuperAdmin'] },
      { key: 'org-branches', name: 'Branch Management', description: 'Multi-location branch setup', tables: ['OrganizationBranches'], features: ['Branch creation', 'Branch hierarchy', 'Location mapping'], estimatedHours: 12, complexity: 'medium', userRoles: ['OrgAdmin'] },
      { key: 'org-settings', name: 'Organization Settings', description: 'Per-organization configuration', tables: ['OrganizationSettings'], features: ['Working hours', 'Appointment slots', 'Notification settings'], estimatedHours: 16, complexity: 'medium', userRoles: ['OrgAdmin'] },
      { key: 'org-license', name: 'License Management', description: 'License & subscription tracking', tables: ['OrganizationLicenses'], features: ['License assignment', 'Expiry alerts', 'Feature toggles'], estimatedHours: 12, complexity: 'medium', userRoles: ['SuperAdmin'] },
    ]
  },
  {
    key: 'user-auth',
    name: 'Users, Roles & Authentication',
    description: 'Complete user management with RBAC',
    layer: 1,
    tables: ['Users', 'Roles', 'UserRoles', 'Permissions', 'RolePermissions', 'UserSessions', 'UserLoginHistory', 'PasswordResets'],
    dependsOn: ['org-setup'],
    apiEndpoints: [],
    priority: 'critical',
    revenue: false,
    estimatedDays: 8,
    features: [],
    userRoles: ['SuperAdmin', 'OrgAdmin'],
    status: 'planned',
    subModules: [
      { key: 'user-registration', name: 'User Registration', description: 'User account creation', tables: ['Users'], features: ['Self-registration', 'Admin invitation', 'Email verification'], estimatedHours: 12, complexity: 'medium', userRoles: ['SuperAdmin', 'OrgAdmin'] },
      { key: 'user-auth-login', name: 'Authentication', description: 'Login and session management', tables: ['Users', 'UserSessions'], features: ['Login/Logout', 'Remember me', 'Session timeout'], estimatedHours: 16, complexity: 'medium', userRoles: ['All'] },
      { key: 'user-password', name: 'Password Management', description: 'Password reset and policies', tables: ['PasswordResets'], features: ['Forgot password', 'Password reset', 'Password policy'], estimatedHours: 8, complexity: 'low', userRoles: ['All'] },
      { key: 'user-2fa', name: 'Two-Factor Authentication', description: 'Enhanced security', tables: ['Users'], features: ['TOTP setup', 'SMS OTP', 'Backup codes'], estimatedHours: 16, complexity: 'high', userRoles: ['All'] },
      { key: 'user-roles', name: 'Role Management', description: 'Define and assign roles', tables: ['Roles', 'UserRoles'], features: ['Role CRUD', 'Role assignment', 'Default roles'], estimatedHours: 12, complexity: 'medium', userRoles: ['SuperAdmin', 'OrgAdmin'] },
      { key: 'user-permissions', name: 'Permission Management', description: 'Granular access control', tables: ['Permissions', 'RolePermissions'], features: ['Permission CRUD', 'Role-permission mapping', 'Custom permissions'], estimatedHours: 16, complexity: 'high', userRoles: ['SuperAdmin'] },
      { key: 'user-audit', name: 'Login History', description: 'Track user sessions', tables: ['UserLoginHistory'], features: ['Login logs', 'IP tracking', 'Device tracking'], estimatedHours: 8, complexity: 'low', userRoles: ['SuperAdmin', 'OrgAdmin'] },
    ]
  },
  {
    key: 'geography',
    name: 'Geography Master',
    description: 'Countries, provinces, cities',
    layer: 1,
    tables: ['Countries', 'Provinces', 'Cities', 'Areas'],
    dependsOn: [],
    apiEndpoints: [],
    priority: 'critical',
    revenue: false,
    estimatedDays: 2,
    features: [],
    userRoles: ['SuperAdmin'],
    status: 'planned',
    subModules: [
      { key: 'geo-countries', name: 'Country Management', description: 'Country list and codes', tables: ['Countries'], features: ['Country CRUD', 'ISO codes', 'Calling codes'], estimatedHours: 4, complexity: 'low', userRoles: ['SuperAdmin'] },
      { key: 'geo-provinces', name: 'Province/State Management', description: 'Regional subdivisions', tables: ['Provinces'], features: ['Province CRUD', 'Country linking'], estimatedHours: 6, complexity: 'low', userRoles: ['SuperAdmin'] },
      { key: 'geo-cities', name: 'City Management', description: 'City database', tables: ['Cities'], features: ['City CRUD', 'Province linking', 'Postal codes'], estimatedHours: 8, complexity: 'low', userRoles: ['SuperAdmin'] },
      { key: 'geo-areas', name: 'Area/Locality Management', description: 'Local areas within cities', tables: ['Areas'], features: ['Area CRUD', 'City linking'], estimatedHours: 6, complexity: 'low', userRoles: ['SuperAdmin'] },
    ]
  },
  {
    key: 'lookup-data',
    name: 'Lookup & Reference Data',
    description: 'All dropdown values and reference data',
    layer: 1,
    tables: ['LookupCategories', 'LookupValues', 'Titles', 'Genders', 'MaritalStatuses', 'BloodGroups', 'Nationalities', 'Languages', 'Religions', 'Ethnicities'],
    dependsOn: [],
    apiEndpoints: [],
    priority: 'critical',
    revenue: false,
    estimatedDays: 3,
    features: [],
    userRoles: ['SuperAdmin', 'OrgAdmin'],
    status: 'planned',
    subModules: [
      { key: 'lookup-categories', name: 'Lookup Categories', description: 'Dynamic category management', tables: ['LookupCategories'], features: ['Category CRUD', 'Sort order'], estimatedHours: 4, complexity: 'low', userRoles: ['SuperAdmin'] },
      { key: 'lookup-values', name: 'Lookup Values', description: 'Dynamic value management', tables: ['LookupValues'], features: ['Value CRUD', 'Active/inactive', 'Bulk import'], estimatedHours: 8, complexity: 'low', userRoles: ['SuperAdmin', 'OrgAdmin'] },
      { key: 'lookup-titles', name: 'Titles', description: 'Name titles (Mr, Mrs, Dr)', tables: ['Titles'], features: ['Title list', 'Gender association'], estimatedHours: 2, complexity: 'low', userRoles: ['SuperAdmin'] },
      { key: 'lookup-genders', name: 'Genders', description: 'Gender options', tables: ['Genders'], features: ['Gender list'], estimatedHours: 2, complexity: 'low', userRoles: ['SuperAdmin'] },
      { key: 'lookup-marital', name: 'Marital Statuses', description: 'Marital status options', tables: ['MaritalStatuses'], features: ['Status list'], estimatedHours: 2, complexity: 'low', userRoles: ['SuperAdmin'] },
      { key: 'lookup-blood', name: 'Blood Groups', description: 'Blood type options', tables: ['BloodGroups'], features: ['Blood group list'], estimatedHours: 2, complexity: 'low', userRoles: ['SuperAdmin'] },
      { key: 'lookup-nationalities', name: 'Nationalities', description: 'Nationality options', tables: ['Nationalities'], features: ['Nationality list with codes'], estimatedHours: 3, complexity: 'low', userRoles: ['SuperAdmin'] },
      { key: 'lookup-languages', name: 'Languages', description: 'Language options', tables: ['Languages'], features: ['Language list with codes'], estimatedHours: 3, complexity: 'low', userRoles: ['SuperAdmin'] },
      { key: 'lookup-religions', name: 'Religions', description: 'Religion options', tables: ['Religions'], features: ['Religion list'], estimatedHours: 2, complexity: 'low', userRoles: ['SuperAdmin'] },
      { key: 'lookup-ethnicities', name: 'Ethnicities', description: 'Ethnicity options', tables: ['Ethnicities'], features: ['Ethnicity list'], estimatedHours: 2, complexity: 'low', userRoles: ['SuperAdmin'] },
    ]
  },
  {
    key: 'department-setup',
    name: 'Department & Facility Setup',
    description: 'Hospital departments, wards, rooms, beds',
    layer: 1,
    tables: ['Departments', 'DepartmentTypes', 'Wards', 'Rooms', 'Beds', 'BedTypes', 'Facilities', 'FacilityTypes'],
    dependsOn: ['org-setup'],
    apiEndpoints: [],
    priority: 'critical',
    revenue: false,
    estimatedDays: 5,
    features: [],
    userRoles: ['OrgAdmin', 'DeptAdmin'],
    status: 'planned',
    subModules: [
      { key: 'dept-types', name: 'Department Types', description: 'Types of departments', tables: ['DepartmentTypes'], features: ['Type CRUD', 'Icon assignment'], estimatedHours: 4, complexity: 'low', userRoles: ['OrgAdmin'] },
      { key: 'dept-crud', name: 'Department Management', description: 'Department CRUD operations', tables: ['Departments'], features: ['Department CRUD', 'Hierarchy', 'Head assignment'], estimatedHours: 12, complexity: 'medium', userRoles: ['OrgAdmin'] },
      { key: 'dept-wards', name: 'Ward Management', description: 'Hospital wards', tables: ['Wards'], features: ['Ward CRUD', 'Department linking', 'Capacity'], estimatedHours: 12, complexity: 'medium', userRoles: ['OrgAdmin', 'DeptAdmin'] },
      { key: 'dept-rooms', name: 'Room Management', description: 'Rooms within wards', tables: ['Rooms'], features: ['Room CRUD', 'Ward linking', 'Room type'], estimatedHours: 10, complexity: 'medium', userRoles: ['OrgAdmin', 'DeptAdmin'] },
      { key: 'dept-beds', name: 'Bed Management', description: 'Individual beds', tables: ['Beds', 'BedTypes'], features: ['Bed CRUD', 'Room linking', 'Bed status', 'Bed types'], estimatedHours: 12, complexity: 'medium', userRoles: ['OrgAdmin', 'DeptAdmin'] },
      { key: 'dept-facilities', name: 'Facility Management', description: 'Facility/Building management', tables: ['Facilities', 'FacilityTypes'], features: ['Facility CRUD', 'Building info', 'Floor mapping'], estimatedHours: 16, complexity: 'medium', userRoles: ['OrgAdmin'] },
    ]
  },
  {
    key: 'employee-doctor',
    name: 'Employee & Doctor Management',
    description: 'Staff registry including doctors, nurses',
    layer: 1,
    tables: ['Employees', 'EmployeeTypes', 'Doctors', 'DoctorSpecializations', 'Specializations', 'DoctorSchedules', 'DoctorDepartments', 'Designations', 'EmployeeDepartments', 'DoctorFees'],
    dependsOn: ['org-setup', 'department-setup', 'geography'],
    apiEndpoints: [],
    priority: 'critical',
    revenue: false,
    estimatedDays: 7,
    features: [],
    userRoles: ['HRAdmin', 'OrgAdmin'],
    status: 'planned',
    subModules: [
      { key: 'emp-types', name: 'Employee Types', description: 'Employee type categories', tables: ['EmployeeTypes'], features: ['Type CRUD'], estimatedHours: 4, complexity: 'low', userRoles: ['HRAdmin'] },
      { key: 'emp-designations', name: 'Designations', description: 'Job titles and designations', tables: ['Designations'], features: ['Designation CRUD', 'Hierarchy level'], estimatedHours: 6, complexity: 'low', userRoles: ['HRAdmin'] },
      { key: 'emp-crud', name: 'Employee CRUD', description: 'Employee record management', tables: ['Employees'], features: ['Employee CRUD', 'Photo upload', 'Documents'], estimatedHours: 20, complexity: 'medium', userRoles: ['HRAdmin'] },
      { key: 'emp-dept-assign', name: 'Department Assignment', description: 'Assign employees to departments', tables: ['EmployeeDepartments'], features: ['Multi-department assignment', 'Primary department'], estimatedHours: 8, complexity: 'low', userRoles: ['HRAdmin'] },
      { key: 'doc-profiles', name: 'Doctor Profiles', description: 'Doctor-specific information', tables: ['Doctors'], features: ['Doctor profile', 'Credentials', 'Bio'], estimatedHours: 16, complexity: 'medium', userRoles: ['HRAdmin', 'Doctor'] },
      { key: 'doc-specializations', name: 'Doctor Specializations', description: 'Specialty mapping', tables: ['Specializations', 'DoctorSpecializations'], features: ['Specialization CRUD', 'Doctor-specialty mapping'], estimatedHours: 10, complexity: 'low', userRoles: ['HRAdmin'] },
      { key: 'doc-schedule', name: 'Doctor Schedule', description: 'Availability management', tables: ['DoctorSchedules'], features: ['Weekly schedule', 'Time slots', 'Leave days'], estimatedHours: 16, complexity: 'medium', userRoles: ['Doctor', 'HRAdmin'] },
      { key: 'doc-fees', name: 'Doctor Fees', description: 'Consultation fee structure', tables: ['DoctorFees'], features: ['Fee per type', 'Special fees', 'Insurance fees'], estimatedHours: 10, complexity: 'low', userRoles: ['FinanceAdmin'] },
    ]
  },
  {
    key: 'service-catalog',
    name: 'Service & Pricing Catalog',
    description: 'All hospital services with pricing',
    layer: 1,
    tables: ['Services', 'ServiceCategories', 'ServicePricing', 'PricingTiers', 'Packages', 'PackageServices', 'ServiceDepartments', 'InsuranceServicePricing'],
    dependsOn: ['org-setup', 'department-setup'],
    apiEndpoints: [],
    priority: 'critical',
    revenue: true,
    estimatedDays: 6,
    features: [],
    userRoles: ['OrgAdmin', 'FinanceAdmin'],
    status: 'planned',
    subModules: [
      { key: 'svc-categories', name: 'Service Categories', description: 'Service classification', tables: ['ServiceCategories'], features: ['Category hierarchy', 'Icon assignment'], estimatedHours: 8, complexity: 'low', userRoles: ['OrgAdmin'] },
      { key: 'svc-crud', name: 'Service CRUD', description: 'Service definition', tables: ['Services'], features: ['Service CRUD', 'Category linking', 'CPT codes'], estimatedHours: 16, complexity: 'medium', userRoles: ['OrgAdmin'] },
      { key: 'svc-pricing', name: 'Service Pricing', description: 'Pricing tiers', tables: ['ServicePricing', 'PricingTiers'], features: ['Multi-tier pricing', 'Effective dates', 'Currency support'], estimatedHours: 20, complexity: 'high', userRoles: ['FinanceAdmin'] },
      { key: 'svc-packages', name: 'Health Packages', description: 'Service bundles', tables: ['Packages', 'PackageServices'], features: ['Package CRUD', 'Service bundling', 'Package pricing'], estimatedHours: 16, complexity: 'medium', userRoles: ['OrgAdmin', 'FinanceAdmin'] },
      { key: 'svc-dept-mapping', name: 'Department Mapping', description: 'Link services to departments', tables: ['ServiceDepartments'], features: ['Department-service linking', 'Revenue sharing'], estimatedHours: 8, complexity: 'low', userRoles: ['OrgAdmin'] },
      { key: 'svc-insurance-pricing', name: 'Insurance Pricing', description: 'Insurance-specific rates', tables: ['InsuranceServicePricing'], features: ['Insurance rates', 'Negotiated pricing'], estimatedHours: 12, complexity: 'medium', userRoles: ['FinanceAdmin'] },
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 2 - CORE TRANSACTION MODULES
// ═══════════════════════════════════════════════════════════════════════════

export const CORE_TRANSACTION_MODULES: ExtendedModule[] = [
  {
    key: 'patient-reg',
    name: 'Patient Registration (MPI)',
    description: 'Master Patient Index',
    layer: 2,
    tables: ['Patients', 'PatientContacts', 'PatientInsurance', 'PatientDocuments', 'PatientHistory', 'PatientAllergies', 'PatientNextOfKin', 'PatientMRN'],
    dependsOn: ['org-setup', 'geography', 'lookup-data'],
    apiEndpoints: [],
    priority: 'critical',
    revenue: false,
    estimatedDays: 8,
    features: [],
    userRoles: ['Receptionist', 'Registration'],
    status: 'planned',
    subModules: [
      { key: 'pt-demographics', name: 'Patient Demographics', description: 'Basic patient information', tables: ['Patients'], features: ['Personal info', 'Photo upload', 'Age calculation'], estimatedHours: 20, complexity: 'medium', userRoles: ['Receptionist'] },
      { key: 'pt-mrn', name: 'MRN Generation', description: 'Medical record number', tables: ['PatientMRN'], features: ['Auto MRN', 'Custom format', 'MRN lookup'], estimatedHours: 8, complexity: 'medium', userRoles: ['System'] },
      { key: 'pt-contacts', name: 'Patient Contacts', description: 'Contact information', tables: ['PatientContacts'], features: ['Multiple contacts', 'Emergency contacts'], estimatedHours: 8, complexity: 'low', userRoles: ['Receptionist'] },
      { key: 'pt-insurance', name: 'Patient Insurance', description: 'Insurance card management', tables: ['PatientInsurance'], features: ['Insurance card upload', 'Policy details', 'Expiry alerts'], estimatedHours: 12, complexity: 'medium', userRoles: ['Receptionist'] },
      { key: 'pt-documents', name: 'Patient Documents', description: 'Document management', tables: ['PatientDocuments'], features: ['Document upload', 'Categorization', 'Expiry tracking'], estimatedHours: 12, complexity: 'medium', userRoles: ['Receptionist'] },
      { key: 'pt-allergies', name: 'Allergy Tracking', description: 'Allergy information', tables: ['PatientAllergies'], features: ['Allergy entry', 'Severity', 'Reaction details'], estimatedHours: 8, complexity: 'low', userRoles: ['Nurse', 'Doctor'] },
      { key: 'pt-search', name: 'Patient Search', description: 'Advanced search', tables: ['Patients'], features: ['Fuzzy search', 'CNIC search', 'Phone search', 'MRN search'], estimatedHours: 16, complexity: 'medium', userRoles: ['All'] },
      { key: 'pt-duplicate', name: 'Duplicate Detection', description: 'Find duplicate records', tables: ['Patients'], features: ['Auto detection', 'Merge workflow'], estimatedHours: 20, complexity: 'high', userRoles: ['Registration'] },
      { key: 'pt-qr', name: 'QR Code Generation', description: 'Patient identification', tables: ['Patients'], features: ['QR generation', 'QR printing', 'Mobile scan'], estimatedHours: 8, complexity: 'low', userRoles: ['Receptionist'] },
    ]
  },
  {
    key: 'appointment',
    name: 'Appointment Management',
    description: 'Doctor appointment scheduling',
    layer: 2,
    tables: ['Appointments', 'AppointmentSlots', 'AppointmentStatuses', 'AppointmentTypes', 'DoctorAvailability', 'AppointmentReminders'],
    dependsOn: ['patient-reg', 'employee-doctor'],
    apiEndpoints: [],
    priority: 'high',
    revenue: true,
    estimatedDays: 7,
    features: [],
    userRoles: ['Receptionist', 'Patient', 'Doctor'],
    status: 'planned',
    subModules: [
      { key: 'appt-types', name: 'Appointment Types', description: 'Types of appointments', tables: ['AppointmentTypes'], features: ['Type CRUD', 'Duration setting', 'Color coding'], estimatedHours: 6, complexity: 'low', userRoles: ['OrgAdmin'] },
      { key: 'appt-statuses', name: 'Appointment Statuses', description: 'Status workflow', tables: ['AppointmentStatuses'], features: ['Status CRUD', 'Workflow definition'], estimatedHours: 6, complexity: 'low', userRoles: ['OrgAdmin'] },
      { key: 'appt-slots', name: 'Slot Management', description: 'Time slot configuration', tables: ['AppointmentSlots'], features: ['Slot generation', 'Slot blocking', 'Buffer time'], estimatedHours: 12, complexity: 'medium', userRoles: ['OrgAdmin'] },
      { key: 'appt-availability', name: 'Doctor Availability', description: 'Doctor schedule for appointments', tables: ['DoctorAvailability'], features: ['Availability calendar', 'Block dates', 'Vacation mode'], estimatedHours: 16, complexity: 'medium', userRoles: ['Doctor'] },
      { key: 'appt-book', name: 'Appointment Booking', description: 'Book appointments', tables: ['Appointments'], features: ['Book by slot', 'Walk-in booking', 'Recurring appointments'], estimatedHours: 20, complexity: 'medium', userRoles: ['Receptionist', 'Patient'] },
      { key: 'appt-reschedule', name: 'Reschedule/Cancel', description: 'Modify appointments', tables: ['Appointments'], features: ['Reschedule', 'Cancel with reason', 'Refund handling'], estimatedHours: 12, complexity: 'medium', userRoles: ['Receptionist', 'Patient'] },
      { key: 'appt-queue', name: 'Appointment Queue', description: 'Daily queue management', tables: ['Appointments'], features: ['Queue display', 'Token assignment', 'Calling system'], estimatedHours: 16, complexity: 'medium', userRoles: ['Receptionist', 'Doctor'] },
      { key: 'appt-reminders', name: 'Appointment Reminders', description: 'SMS/Email reminders', tables: ['AppointmentReminders'], features: ['SMS reminder', 'Email reminder', 'Reminder timing'], estimatedHours: 16, complexity: 'medium', userRoles: ['System'] },
      { key: 'appt-waitlist', name: 'Waitlist Management', description: 'Waitlist for full slots', tables: ['Appointments'], features: ['Waitlist entry', 'Auto-assign on cancel'], estimatedHours: 12, complexity: 'medium', userRoles: ['Receptionist'] },
      { key: 'appt-calendar', name: 'Calendar View', description: 'Visual calendar', tables: ['Appointments'], features: ['Day/Week/Month view', 'Doctor calendar', 'Room calendar'], estimatedHours: 16, complexity: 'medium', userRoles: ['Receptionist', 'Doctor'] },
    ]
  },
  {
    key: 'opd-visit',
    name: 'OPD Visit Management',
    description: 'Outpatient department visits',
    layer: 2,
    tables: ['OPDVisits', 'OPDVisitServices', 'OPDQueue', 'OPDVitals', 'VisitTypes', 'TokenManagement'],
    dependsOn: ['patient-reg', 'appointment', 'employee-doctor', 'service-catalog'],
    apiEndpoints: [],
    priority: 'critical',
    revenue: true,
    estimatedDays: 8,
    features: [],
    userRoles: ['Receptionist', 'Nurse', 'Doctor'],
    status: 'planned',
    subModules: [
      { key: 'visit-types', name: 'Visit Types', description: 'Types of OPD visits', tables: ['VisitTypes'], features: ['Type CRUD', 'Pricing link'], estimatedHours: 4, complexity: 'low', userRoles: ['OrgAdmin'] },
      { key: 'visit-creation', name: 'Visit Creation', description: 'Create OPD visit', tables: ['OPDVisits'], features: ['From appointment', 'Walk-in', 'Consultation selection'], estimatedHours: 16, complexity: 'medium', userRoles: ['Receptionist'] },
      { key: 'visit-token', name: 'Token Management', description: 'Token number system', tables: ['TokenManagement'], features: ['Token generation', 'Token display', 'Token calling'], estimatedHours: 12, complexity: 'medium', userRoles: ['Receptionist'] },
      { key: 'visit-queue', name: 'OPD Queue', description: 'Queue management', tables: ['OPDQueue'], features: ['Queue display', 'Priority handling', 'Transfer queue'], estimatedHours: 16, complexity: 'medium', userRoles: ['Receptionist', 'Nurse'] },
      { key: 'visit-vitals', name: 'Vitals Recording', description: 'Record patient vitals', tables: ['OPDVitals'], features: ['BP, Temp, Weight, Height', 'BMI calculation', 'Vitals history'], estimatedHours: 12, complexity: 'low', userRoles: ['Nurse'] },
      { key: 'visit-services', name: 'Visit Services', description: 'Services during visit', tables: ['OPDVisitServices'], features: ['Service addition', 'Lab orders', 'Procedure orders'], estimatedHours: 16, complexity: 'medium', userRoles: ['Doctor'] },
      { key: 'visit-summary', name: 'Visit Summary', description: 'Visit documentation', tables: ['OPDVisits'], features: ['Chief complaint', 'Diagnosis', 'Prescription link', 'Follow-up'], estimatedHours: 20, complexity: 'medium', userRoles: ['Doctor'] },
    ]
  },
  {
    key: 'ipd-admission',
    name: 'IPD Admission & Discharge',
    description: 'Inpatient management (ADT)',
    layer: 2,
    tables: ['IPDAdmissions', 'IPDTransfers', 'IPDDischarges', 'BedAllocation', 'IPDDailyCharges', 'IPDServices', 'AdmissionTypes', 'DischargeTypes'],
    dependsOn: ['patient-reg', 'department-setup', 'employee-doctor', 'service-catalog'],
    apiEndpoints: [],
    priority: 'critical',
    revenue: true,
    estimatedDays: 12,
    features: [],
    userRoles: ['Receptionist', 'Nurse', 'Doctor', 'WardManager'],
    status: 'planned',
    subModules: [
      { key: 'adm-types', name: 'Admission Types', description: 'Types of admission', tables: ['AdmissionTypes'], features: ['Type CRUD', 'Pricing link'], estimatedHours: 4, complexity: 'low', userRoles: ['OrgAdmin'] },
      { key: 'adm-admit', name: 'Patient Admission', description: 'Admit patient', tables: ['IPDAdmissions'], features: ['From ER/OPD', 'Bed selection', 'Doctor assignment'], estimatedHours: 20, complexity: 'medium', userRoles: ['Receptionist', 'Doctor'] },
      { key: 'adm-bed', name: 'Bed Allocation', description: 'Assign beds', tables: ['BedAllocation'], features: ['Bed selection', 'Availability check', 'Bed history'], estimatedHours: 16, complexity: 'medium', userRoles: ['Receptionist', 'Nurse'] },
      { key: 'adm-transfer', name: 'Bed Transfer', description: 'Move between beds/wards', tables: ['IPDTransfers'], features: ['Transfer request', 'Transfer approval', 'Transfer history'], estimatedHours: 12, complexity: 'medium', userRoles: ['Nurse', 'Doctor'] },
      { key: 'adm-charges', name: 'Daily Charges', description: 'Auto-charge calculation', tables: ['IPDDailyCharges'], features: ['Bed charges', 'Service charges', 'Package charges'], estimatedHours: 20, complexity: 'high', userRoles: ['System'] },
      { key: 'adm-services', name: 'IPD Services', description: 'Services during stay', tables: ['IPDServices'], features: ['Service orders', 'Procedure scheduling', 'Diet orders'], estimatedHours: 16, complexity: 'medium', userRoles: ['Doctor', 'Nurse'] },
      { key: 'adm-discharge', name: 'Discharge Process', description: 'Patient discharge workflow', tables: ['IPDDischarges', 'DischargeTypes'], features: ['Discharge order', 'Clearance checklist', 'Discharge summary'], estimatedHours: 24, complexity: 'high', userRoles: ['Doctor', 'Nurse', 'Receptionist'] },
      { key: 'adm-census', name: 'Patient Census', description: 'Bed occupancy tracking', tables: ['IPDAdmissions', 'BedAllocation'], features: ['Real-time census', 'Occupancy reports', 'Availability dashboard'], estimatedHours: 12, complexity: 'medium', userRoles: ['WardManager', 'Admin'] },
    ]
  },
  {
    key: 'emergency',
    name: 'Emergency / ER Module',
    description: 'Emergency department with triage',
    layer: 2,
    tables: ['ERVisits', 'ERTriage', 'TriageLevels', 'ERBedAllocation', 'ERDisposition'],
    dependsOn: ['patient-reg', 'employee-doctor', 'department-setup'],
    apiEndpoints: [],
    priority: 'high',
    revenue: true,
    estimatedDays: 8,
    features: [],
    userRoles: ['ERNurse', 'ERDoctor', 'Receptionist'],
    status: 'planned',
    subModules: [
      { key: 'er-triage-levels', name: 'Triage Levels', description: 'ESI or custom triage levels', tables: ['TriageLevels'], features: ['Level definition', 'Priority scoring'], estimatedHours: 4, complexity: 'low', userRoles: ['OrgAdmin'] },
      { key: 'er-registration', name: 'Quick Registration', description: 'Rapid patient entry', tables: ['ERVisits'], features: ['Minimal data entry', 'Quick registration', 'ID generation'], estimatedHours: 12, complexity: 'medium', userRoles: ['ERNurse'] },
      { key: 'er-triage', name: 'Triage Assessment', description: 'Triage evaluation', tables: ['ERTriage'], features: ['Vitals', 'Chief complaint', 'ESI scoring', 'Acuity level'], estimatedHours: 16, complexity: 'medium', userRoles: ['ERNurse'] },
      { key: 'er-bed', name: 'ER Bed Management', description: 'ER bed allocation', tables: ['ERBedAllocation'], features: ['Bed assignment', 'Status tracking', 'Bed turnover'], estimatedHours: 12, complexity: 'medium', userRoles: ['ERNurse'] },
      { key: 'er-disposition', name: 'ER Disposition', description: 'Patient outcome', tables: ['ERDisposition'], features: ['Discharge', 'Admit', 'Transfer', 'AMA', 'Left without being seen'], estimatedHours: 12, complexity: 'medium', userRoles: ['ERDoctor'] },
      { key: 'er-dashboard', name: 'ER Dashboard', description: 'Real-time status', tables: ['ERVisits'], features: ['Active patients', 'Wait times', 'Door-to-doctor time'], estimatedHours: 16, complexity: 'medium', userRoles: ['ERDoctor', 'ERNurse'] },
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 3 - REVENUE MODULES (Detailed)
// ═══════════════════════════════════════════════════════════════════════════

export const REVENUE_MODULES: ExtendedModule[] = [
  {
    key: 'billing',
    name: 'Billing & Invoicing',
    description: 'Complete billing engine',
    layer: 3,
    tables: ['Invoices', 'InvoiceItems', 'InvoicePayments', 'PaymentMethods', 'Receipts', 'Refunds', 'CreditNotes', 'BillingCategories', 'DiscountRules', 'TaxRules', 'InvoiceStatuses'],
    dependsOn: ['patient-reg', 'service-catalog', 'opd-visit', 'ipd-admission'],
    apiEndpoints: [],
    priority: 'critical',
    revenue: true,
    estimatedDays: 15,
    features: [],
    userRoles: ['Cashier', 'BillingAdmin'],
    status: 'planned',
    subModules: [
      { key: 'bill-categories', name: 'Billing Categories', description: 'Revenue classification', tables: ['BillingCategories'], features: ['Category CRUD', 'GL linking'], estimatedHours: 6, complexity: 'low', userRoles: ['FinanceAdmin'] },
      { key: 'bill-methods', name: 'Payment Methods', description: 'Payment type setup', tables: ['PaymentMethods'], features: ['Method CRUD', 'Gateway linking'], estimatedHours: 6, complexity: 'low', userRoles: ['FinanceAdmin'] },
      { key: 'bill-discount', name: 'Discount Management', description: 'Discount rules', tables: ['DiscountRules'], features: ['Percentage/Flat', 'Approval workflow', 'Reason codes'], estimatedHours: 12, complexity: 'medium', userRoles: ['BillingAdmin'] },
      { key: 'bill-tax', name: 'Tax Configuration', description: 'Tax rules', tables: ['TaxRules'], features: ['Tax rates', 'Tax categories', 'Tax exemption'], estimatedHours: 10, complexity: 'medium', userRoles: ['FinanceAdmin'] },
      { key: 'bill-opd', name: 'OPD Billing', description: 'Outpatient billing', tables: ['Invoices', 'InvoiceItems'], features: ['Quick billing', 'Package billing', 'Service bundling'], estimatedHours: 24, complexity: 'high', userRoles: ['Cashier'] },
      { key: 'bill-ipd', name: 'IPD Billing', description: 'Inpatient billing', tables: ['Invoices', 'InvoiceItems'], features: ['Interim bills', 'Final bill', 'Advance adjustment'], estimatedHours: 32, complexity: 'very_high', userRoles: ['Cashier', 'BillingAdmin'] },
      { key: 'bill-payment', name: 'Payment Collection', description: 'Receive payments', tables: ['InvoicePayments', 'Receipts'], features: ['Multi-payment', 'Partial payment', 'Receipt printing'], estimatedHours: 20, complexity: 'medium', userRoles: ['Cashier'] },
      { key: 'bill-refund', name: 'Refund Processing', description: 'Handle refunds', tables: ['Refunds'], features: ['Full/partial refund', 'Approval workflow', 'Refund receipt'], estimatedHours: 16, complexity: 'medium', userRoles: ['BillingAdmin'] },
      { key: 'bill-credit', name: 'Credit Notes', description: 'Credit adjustments', tables: ['CreditNotes'], features: ['Credit issuance', 'Credit application', 'Credit tracking'], estimatedHours: 12, complexity: 'medium', userRoles: ['BillingAdmin'] },
      { key: 'bill-reports', name: 'Billing Reports', description: 'Collection & outstanding reports', tables: ['Invoices'], features: ['Daily collection', 'Outstanding report', 'Revenue summary'], estimatedHours: 16, complexity: 'medium', userRoles: ['FinanceAdmin'] },
    ]
  },
  {
    key: 'pharmacy',
    name: 'Pharmacy Management',
    description: 'Drug inventory and dispensing',
    layer: 3,
    tables: ['Drugs', 'DrugCategories', 'DrugManufacturers', 'DrugGenericNames', 'PharmacyStock', 'PharmacyPurchaseOrders', 'PharmacyPurchaseItems', 'PharmacyDispensing', 'PharmacyDispensingItems', 'PharmacySales', 'DrugInteractions', 'PharmacyStores', 'StockTransfers', 'PharmacyReturns', 'BatchTracking', 'ExpiryAlerts'],
    dependsOn: ['patient-reg', 'billing', 'employee-doctor'],
    apiEndpoints: [],
    priority: 'critical',
    revenue: true,
    estimatedDays: 18,
    features: [],
    userRoles: ['Pharmacist', 'PharmacyAdmin'],
    status: 'planned',
    subModules: [
      { key: 'pharma-categories', name: 'Drug Categories', description: 'Drug classification', tables: ['DrugCategories'], features: ['Category hierarchy', 'ATC codes'], estimatedHours: 6, complexity: 'low', userRoles: ['PharmacyAdmin'] },
      { key: 'pharma-generics', name: 'Generic Names', description: 'Generic drug database', tables: ['DrugGenericNames'], features: ['Generic CRUD', 'Brand mapping'], estimatedHours: 12, complexity: 'low', userRoles: ['PharmacyAdmin'] },
      { key: 'pharma-manufacturers', name: 'Manufacturers', description: 'Drug manufacturers', tables: ['DrugManufacturers'], features: ['Manufacturer CRUD', 'Contact info'], estimatedHours: 6, complexity: 'low', userRoles: ['PharmacyAdmin'] },
      { key: 'pharma-drugs', name: 'Drug Master', description: 'Complete drug database', tables: ['Drugs'], features: ['Drug CRUD', 'Generic/Brand', 'Form/Strength', 'Barcode'], estimatedHours: 24, complexity: 'medium', userRoles: ['PharmacyAdmin'] },
      { key: 'pharma-stores', name: 'Store Management', description: 'Multiple pharmacy stores', tables: ['PharmacyStores'], features: ['Store CRUD', 'Location mapping'], estimatedHours: 8, complexity: 'low', userRoles: ['PharmacyAdmin'] },
      { key: 'pharma-stock', name: 'Stock Management', description: 'Inventory tracking', tables: ['PharmacyStock', 'BatchTracking'], features: ['Batch tracking', 'Expiry tracking', 'Stock levels'], estimatedHours: 24, complexity: 'high', userRoles: ['Pharmacist'] },
      { key: 'pharma-po', name: 'Purchase Orders', description: 'Drug procurement', tables: ['PharmacyPurchaseOrders', 'PharmacyPurchaseItems'], features: ['PO creation', 'Approval workflow', 'Supplier integration'], estimatedHours: 20, complexity: 'medium', userRoles: ['PharmacyAdmin'] },
      { key: 'pharma-grn', name: 'Goods Received', description: 'Receive stock', tables: ['PharmacyStock'], features: ['GRN entry', 'Batch entry', 'Quality check'], estimatedHours: 16, complexity: 'medium', userRoles: ['Pharmacist'] },
      { key: 'pharma-dispense', name: 'Prescription Dispensing', description: 'Dispense to patients', tables: ['PharmacyDispensing', 'PharmacyDispensingItems'], features: ['Rx processing', 'Label printing', 'Counseling notes'], estimatedHours: 24, complexity: 'medium', userRoles: ['Pharmacist'] },
      { key: 'pharma-sales', name: 'OTC Sales', description: 'Over-the-counter sales', tables: ['PharmacySales'], features: ['Quick sale', 'Customer info', 'Receipt'], estimatedHours: 12, complexity: 'low', userRoles: ['Pharmacist'] },
      { key: 'pharma-transfer', name: 'Stock Transfer', description: 'Inter-store transfers', tables: ['StockTransfers'], features: ['Transfer request', 'Transfer approval', 'Receive stock'], estimatedHours: 16, complexity: 'medium', userRoles: ['PharmacyAdmin'] },
      { key: 'pharma-returns', name: 'Returns Management', description: 'Patient/supplier returns', tables: ['PharmacyReturns'], features: ['Return entry', 'Credit note', 'Supplier return'], estimatedHours: 12, complexity: 'medium', userRoles: ['Pharmacist'] },
      { key: 'pharma-interactions', name: 'Drug Interactions', description: 'Interaction database', tables: ['DrugInteractions'], features: ['Interaction check', 'Severity levels', 'Alternative suggestions'], estimatedHours: 20, complexity: 'high', userRoles: ['PharmacyAdmin'] },
      { key: 'pharma-alerts', name: 'Expiry & Reorder Alerts', description: 'Automated alerts', tables: ['ExpiryAlerts'], features: ['Expiry alerts', 'Reorder alerts', 'Low stock alerts'], estimatedHours: 12, complexity: 'medium', userRoles: ['Pharmacist'] },
    ]
  },
  {
    key: 'laboratory',
    name: 'Laboratory (LIS)',
    description: 'Lab test management',
    layer: 3,
    tables: ['LabTests', 'LabTestCategories', 'LabTestParameters', 'LabOrders', 'LabOrderItems', 'LabSamples', 'SampleTypes', 'LabResults', 'LabResultValues', 'LabProfiles', 'LabProfileTests', 'LabMachineInterfaces', 'NormalRanges'],
    dependsOn: ['patient-reg', 'billing', 'employee-doctor'],
    apiEndpoints: [],
    priority: 'critical',
    revenue: true,
    estimatedDays: 15,
    features: [],
    userRoles: ['LabTechnician', 'Pathologist', 'Doctor'],
    status: 'planned',
    subModules: [
      { key: 'lab-categories', name: 'Test Categories', description: 'Lab department organization', tables: ['LabTestCategories'], features: ['Category CRUD', 'Department linking'], estimatedHours: 6, complexity: 'low', userRoles: ['LabAdmin'] },
      { key: 'lab-tests', name: 'Test Catalog', description: 'Lab test definitions', tables: ['LabTests', 'LabTestParameters'], features: ['Test CRUD', 'Parameters', 'Turnaround time'], estimatedHours: 24, complexity: 'medium', userRoles: ['LabAdmin'] },
      { key: 'lab-profiles', name: 'Test Profiles', description: 'Test panels/profiles', tables: ['LabProfiles', 'LabProfileTests'], features: ['Profile CRUD', 'Test bundling', 'Profile pricing'], estimatedHours: 12, complexity: 'low', userRoles: ['LabAdmin'] },
      { key: 'lab-sample-types', name: 'Sample Types', description: 'Specimen types', tables: ['SampleTypes'], features: ['Sample type CRUD', 'Container type', 'Handling instructions'], estimatedHours: 6, complexity: 'low', userRoles: ['LabAdmin'] },
      { key: 'lab-ranges', name: 'Normal Ranges', description: 'Reference ranges', tables: ['NormalRanges'], features: ['Age/gender ranges', 'Unit conversion', 'Critical values'], estimatedHours: 16, complexity: 'medium', userRoles: ['LabAdmin'] },
      { key: 'lab-orders', name: 'Lab Orders', description: 'Order entry', tables: ['LabOrders', 'LabOrderItems'], features: ['Order creation', 'Test selection', 'Priority'], estimatedHours: 20, complexity: 'medium', userRoles: ['Doctor', 'Receptionist'] },
      { key: 'lab-samples', name: 'Sample Collection', description: 'Specimen handling', tables: ['LabSamples'], features: ['Barcode generation', 'Sample tracking', 'Sample status'], estimatedHours: 16, complexity: 'medium', userRoles: ['LabTechnician'] },
      { key: 'lab-worklist', name: 'Lab Worklist', description: 'Pending tests view', tables: ['LabOrders'], features: ['Worklist display', 'Priority sorting', 'Assign to technician'], estimatedHours: 12, complexity: 'low', userRoles: ['LabTechnician'] },
      { key: 'lab-results', name: 'Result Entry', description: 'Enter results', tables: ['LabResults', 'LabResultValues'], features: ['Manual entry', 'Abnormal flagging', 'Verification'], estimatedHours: 20, complexity: 'medium', userRoles: ['LabTechnician'] },
      { key: 'lab-machine', name: 'Machine Interface', description: 'Analyzer integration', tables: ['LabMachineInterfaces'], features: ['ASTM/HL7 interface', 'Auto-import', 'Result mapping'], estimatedHours: 32, complexity: 'very_high', userRoles: ['LabAdmin', 'ITAdmin'] },
      { key: 'lab-reports', name: 'Lab Reports', description: 'Report generation', tables: ['LabResults'], features: ['PDF generation', 'Email delivery', 'Print'], estimatedHours: 16, complexity: 'medium', userRoles: ['LabTechnician', 'Pathologist'] },
      { key: 'lab-qc', name: 'Quality Control', description: 'QC management', tables: ['LabResults'], features: ['QC samples', 'QC charts', 'Levey-Jennings'], estimatedHours: 20, complexity: 'medium', userRoles: ['LabTechnician'] },
    ]
  },
  {
    key: 'radiology',
    name: 'Radiology (RIS)',
    description: 'Imaging services management',
    layer: 3,
    tables: ['RadiologyExams', 'RadiologyCategories', 'RadiologyOrders', 'RadiologySchedule', 'RadiologyReports', 'RadiologyTemplates', 'Modalities', 'DicomStudies'],
    dependsOn: ['patient-reg', 'billing', 'employee-doctor'],
    apiEndpoints: [],
    priority: 'high',
    revenue: true,
    estimatedDays: 12,
    features: [],
    userRoles: ['Radiologist', 'RadTechnician', 'Doctor'],
    status: 'planned',
    subModules: [
      { key: 'rad-categories', name: 'Exam Categories', description: 'Imaging categories', tables: ['RadiologyCategories'], features: ['Category CRUD', 'Modality linking'], estimatedHours: 6, complexity: 'low', userRoles: ['RadAdmin'] },
      { key: 'rad-modalities', name: 'Modalities', description: 'Imaging equipment', tables: ['Modalities'], features: ['Modality CRUD', 'Room assignment'], estimatedHours: 6, complexity: 'low', userRoles: ['RadAdmin'] },
      { key: 'rad-exams', name: 'Exam Catalog', description: 'Radiology exams', tables: ['RadiologyExams'], features: ['Exam CRUD', 'Pricing', 'Preparation instructions'], estimatedHours: 16, complexity: 'medium', userRoles: ['RadAdmin'] },
      { key: 'rad-orders', name: 'Radiology Orders', description: 'Order entry', tables: ['RadiologyOrders'], features: ['Order creation', 'Clinical info', 'Priority'], estimatedHours: 16, complexity: 'medium', userRoles: ['Doctor'] },
      { key: 'rad-schedule', name: 'Scheduling', description: 'Exam scheduling', tables: ['RadiologySchedule'], features: ['Slot booking', 'Modality assignment', 'Technician assignment'], estimatedHours: 16, complexity: 'medium', userRoles: ['RadTechnician'] },
      { key: 'rad-templates', name: 'Report Templates', description: 'Structured reporting', tables: ['RadiologyTemplates'], features: ['Template builder', 'Normal/Abnormal', 'Macros'], estimatedHours: 20, complexity: 'medium', userRoles: ['Radiologist'] },
      { key: 'rad-reports', name: 'Report Generation', description: 'Create reports', tables: ['RadiologyReports'], features: ['Report entry', 'Template use', 'Approval workflow'], estimatedHours: 20, complexity: 'medium', userRoles: ['Radiologist'] },
      { key: 'rad-pacs', name: 'PACS Integration', description: 'Image storage', tables: ['DicomStudies'], features: ['DICOM worklist', 'Image viewer link', 'Study status'], estimatedHours: 24, complexity: 'high', userRoles: ['RadTechnician', 'Radiologist'] },
    ]
  },
  {
    key: 'insurance',
    name: 'Insurance & Panel Management',
    description: 'Insurance claims processing',
    layer: 3,
    tables: ['InsuranceCompanies', 'InsurancePlans', 'InsurancePolicies', 'PatientPolicies', 'InsuranceClaims', 'ClaimItems', 'ClaimStatuses', 'PreAuthorization', 'PanelCompanies', 'PanelPricing', 'CorporateContracts'],
    dependsOn: ['patient-reg', 'billing', 'service-catalog'],
    apiEndpoints: [],
    priority: 'high',
    revenue: true,
    estimatedDays: 12,
    features: [],
    userRoles: ['InsuranceOfficer', 'BillingAdmin'],
    status: 'planned',
    subModules: [
      { key: 'ins-companies', name: 'Insurance Companies', description: 'Insurance provider management', tables: ['InsuranceCompanies'], features: ['Company CRUD', 'Contact info', 'TPA linking'], estimatedHours: 10, complexity: 'low', userRoles: ['InsuranceOfficer'] },
      { key: 'ins-plans', name: 'Insurance Plans', description: 'Plan definitions', tables: ['InsurancePlans'], features: ['Plan CRUD', 'Coverage details', 'Co-pay/Co-insurance'], estimatedHours: 16, complexity: 'medium', userRoles: ['InsuranceOfficer'] },
      { key: 'ins-policies', name: 'Policy Management', description: 'Patient policies', tables: ['PatientPolicies'], features: ['Policy registration', 'Validity check', 'Member ID'], estimatedHours: 12, complexity: 'low', userRoles: ['InsuranceOfficer'] },
      { key: 'ins-preauth', name: 'Pre-Authorization', description: 'Prior approval', tables: ['PreAuthorization'], features: ['Pre-auth request', 'Approval tracking', 'Letter generation'], estimatedHours: 16, complexity: 'medium', userRoles: ['InsuranceOfficer'] },
      { key: 'ins-claims', name: 'Claim Submission', description: 'Submit claims', tables: ['InsuranceClaims', 'ClaimItems'], features: ['Claim creation', 'Item submission', 'Document attachment'], estimatedHours: 20, complexity: 'medium', userRoles: ['InsuranceOfficer'] },
      { key: 'ins-tracking', name: 'Claim Tracking', description: 'Track claim status', tables: ['ClaimStatuses'], features: ['Status updates', 'Denial handling', 'Resubmission'], estimatedHours: 12, complexity: 'low', userRoles: ['InsuranceOfficer'] },
      { key: 'ins-panel', name: 'Panel Companies', description: 'Corporate panels', tables: ['PanelCompanies', 'CorporateContracts'], features: ['Panel registration', 'Contract details', 'Validity'], estimatedHours: 16, complexity: 'medium', userRoles: ['InsuranceOfficer'] },
      { key: 'ins-pricing', name: 'Panel Pricing', description: 'Negotiated rates', tables: ['PanelPricing'], features: ['Rate cards', 'Service-wise pricing', 'Discount structure'], estimatedHours: 16, complexity: 'medium', userRoles: ['InsuranceOfficer', 'FinanceAdmin'] },
      { key: 'ins-reports', name: 'Insurance Reports', description: 'Claim analytics', tables: ['InsuranceClaims'], features: ['Claim summary', 'Outstanding report', 'Aging analysis'], estimatedHours: 12, complexity: 'low', userRoles: ['InsuranceOfficer', 'FinanceAdmin'] },
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// COMBINED MODULE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

export const ALL_EXTENDED_MODULES: ExtendedModule[] = [
  ...FOUNDATION_MODULES,
  ...CORE_TRANSACTION_MODULES,
  ...REVENUE_MODULES,
];

/**
 * Get all sub-modules as flat array
 */
export function getAllSubModules(): SubModule[] {
  return ALL_EXTENDED_MODULES.flatMap(m => m.subModules);
}

/**
 * Get sub-module count
 */
export function getSubModuleCount(): number {
  return getAllSubModules().length;
}

/**
 * Get modules by layer
 */
export function getExtendedModulesByLayer(layer: number): ExtendedModule[] {
  return ALL_EXTENDED_MODULES.filter(m => m.layer === layer);
}

/**
 * Search modules by name or description
 */
export function searchModules(query: string): ExtendedModule[] {
  const lowerQuery = query.toLowerCase();
  return ALL_EXTENDED_MODULES.filter(m => 
    m.name.toLowerCase().includes(lowerQuery) ||
    m.description.toLowerCase().includes(lowerQuery) ||
    m.key.toLowerCase().includes(lowerQuery) ||
    m.tables.some(t => t.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get module by table name
 */
export function getModuleByTable(tableName: string): ExtendedModule | undefined {
  return ALL_EXTENDED_MODULES.find(m => 
    m.tables.some(t => t.toLowerCase() === tableName.toLowerCase())
  );
}

/**
 * Get all unique tables across all modules
 */
export function getAllTables(): string[] {
  const tables = new Set<string>();
  ALL_EXTENDED_MODULES.forEach(m => {
    m.tables.forEach(t => tables.add(t));
    m.subModules.forEach(sm => sm.tables.forEach(t => tables.add(t)));
  });
  return Array.from(tables);
}

/**
 * Get module statistics
 */
export function getExtendedModuleStatistics() {
  const allSubModules = getAllSubModules();
  
  return {
    totalModules: ALL_EXTENDED_MODULES.length,
    totalSubModules: allSubModules.length,
    totalTables: getAllTables().length,
    totalEstimatedHours: allSubModules.reduce((sum, sm) => sum + sm.estimatedHours, 0),
    byComplexity: {
      low: allSubModules.filter(sm => sm.complexity === 'low').length,
      medium: allSubModules.filter(sm => sm.complexity === 'medium').length,
      high: allSubModules.filter(sm => sm.complexity === 'high').length,
      very_high: allSubModules.filter(sm => sm.complexity === 'very_high').length,
    },
    byLayer: {
      foundation: FOUNDATION_MODULES.length,
      transactions: CORE_TRANSACTION_MODULES.length,
      revenue: REVENUE_MODULES.length,
    }
  };
}

// Export counts
export const MODULE_COUNT = ALL_EXTENDED_MODULES.length;
export const SUB_MODULE_COUNT = getSubModuleCount();
export const TABLE_COUNT = getAllTables().length;
