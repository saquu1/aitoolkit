// =============================================================================
// Generated TypeScript Types - Patient Module
// =============================================================================
// Source: SQL DDL + SP Intelligence + CSHTML Analysis
// Generated: 2024-01-15
// =============================================================================

// Main Patient Entity
export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'M' | 'F' | 'O';
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
  branchId: string;
  isActive: boolean;
  isDeleted: boolean;
  createdById?: string;
  createdOn: Date;
  modifiedById?: string;
  modifiedOn?: Date;
  
  // Computed from SP
  age?: number;
  fullName?: string;
  
  // Relations
  branch?: Branch;
  visits?: Visit[];
}

// Create Input (from sp_Patient_Create)
export interface PatientCreateInput {
  mrn: string;           // Required, unique, min 3 chars
  firstName: string;     // Required
  lastName: string;      // Required
  dateOfBirth: Date;     // Required, not future, max 150 years
  gender: 'M' | 'F' | 'O'; // Required
  phone?: string;
  email?: string;        // Must be valid email format
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  branchId: string;      // Required, must exist in Branches
}

// Update Input (from sp_Patient_Update)
export interface PatientUpdateInput {
  id: string;            // Required
  firstName: string;     // Required
  lastName: string;      // Required
  phone?: string;
  email?: string;        // Must be valid email format
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

// Search/Filter Input (from sp_Patient_Search)
export interface PatientSearchInput {
  searchTerm?: string;   // Searches MRN, FirstName, LastName, Phone
  branchId?: string;
  gender?: 'M' | 'F' | 'O';
  pageNumber?: number;
  pageSize?: number;
  sortColumn?: 'MRN' | 'FirstName' | 'LastName' | 'CreatedOn';
  sortDirection?: 'ASC' | 'DESC';
}

// Dropdown Item (from sp_Patient_Dropdown)
export interface PatientDropdownItem {
  value: string;         // PatientID
  label: string;         // "MRN - FirstName LastName"
  mrn: string;
  firstName: string;
  lastName: string;
}

// List Response with Pagination
export interface PatientListResponse {
  items: Patient[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Branch Reference
export interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

// Doctor Reference
export interface Doctor {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  specialization?: string;
  phone?: string;
  email?: string;
  branchId?: string;
  isActive: boolean;
}

// Visit Reference
export interface Visit {
  id: string;
  patientId: string;
  doctorId?: string;
  visitDate: Date;
  visitType: 'OPD' | 'IPD' | 'EMERGENCY' | 'DAYCARE';
  status: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';
  chiefComplaint?: string;
  diagnosis?: string;
  notes?: string;
  branchId: string;
}

// =============================================================================
// Validation Rules Extracted from SP
// =============================================================================

export const PATIENT_VALIDATION_RULES = {
  mrn: {
    required: true,
    minLength: 3,
    maxLength: 20,
    unique: true,
    pattern: /^[A-Z0-9]+$/,
    message: 'MRN is required and must be unique'
  },
  firstName: {
    required: true,
    maxLength: 100,
    message: 'First Name is required'
  },
  lastName: {
    required: true,
    maxLength: 100,
    message: 'Last Name is required'
  },
  dateOfBirth: {
    required: true,
    notFuture: true,
    maxAge: 150,
    message: 'Date of Birth is required and cannot be in the future'
  },
  gender: {
    required: true,
    enum: ['M', 'F', 'O'],
    message: 'Gender must be M, F, or O'
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 100,
    message: 'Invalid email format'
  },
  phone: {
    maxLength: 20,
    message: 'Phone number too long'
  },
  branchId: {
    required: true,
    exists: true,
    message: 'Invalid Branch selected'
  }
};

// =============================================================================
// API Error Codes from SP
// =============================================================================

export const PATIENT_ERROR_CODES = {
  '-1': { status: 400, message: 'Validation failed' },
  '-2': { status: 400, message: 'Invalid Branch selected' },
  '-3': { status: 400, message: 'Invalid email format' },
  '-4': { status: 400, message: 'Invalid Date of Birth' },
  '-5': { status: 409, message: 'Patient with this MRN already exists' },
  '-99': { status: 500, message: 'Internal server error' }
} as const;

// =============================================================================
// Form Field Configuration from CSHTML + SP
// =============================================================================

export const PATIENT_FORM_FIELDS = [
  { name: 'mrn', label: 'MRN', type: 'text', required: true, placeholder: 'Enter MRN', colSpan: 4 },
  { name: 'branchId', label: 'Branch', type: 'select', required: true, colSpan: 4, endpoint: '/api/branches/dropdown' },
  { name: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'Enter first name', colSpan: 4 },
  { name: 'lastName', label: 'Last Name', type: 'text', required: true, placeholder: 'Enter last name', colSpan: 4 },
  { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true, colSpan: 4 },
  { name: 'gender', label: 'Gender', type: 'select', required: true, options: [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
    { value: 'O', label: 'Other' }
  ], colSpan: 4 },
  { name: 'phone', label: 'Phone', type: 'tel', placeholder: 'Enter phone number', colSpan: 4 },
  { name: 'email', label: 'Email', type: 'email', placeholder: 'Enter email', colSpan: 4 },
  { name: 'address', label: 'Address', type: 'textarea', placeholder: 'Enter full address', colSpan: 8, rows: 2 },
  { name: 'city', label: 'City', type: 'text', placeholder: 'Enter city', colSpan: 4 },
  { name: 'state', label: 'State', type: 'select', endpoint: '/api/states/dropdown', colSpan: 4 },
  { name: 'zipCode', label: 'Zip Code', type: 'text', placeholder: 'Enter zip code', colSpan: 4 }
] as const;
