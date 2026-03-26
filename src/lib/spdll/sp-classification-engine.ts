/**
 * SPDLL (Stored Procedures + DLL) Classification Engine
 * Comprehensive SP classification with 30+ naming patterns
 * 
 * This engine parses SQL Server stored procedures and classifies them
 * based on naming conventions, body analysis, and contextual patterns.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SPActionType =
  | 'dropdown'
  | 'read_single'
  | 'read_list'
  | 'read_paginated'
  | 'create'
  | 'update'
  | 'upsert'
  | 'delete'
  | 'soft_delete'
  | 'restore'
  | 'search'
  | 'filter'
  | 'validate'
  | 'exists_check'
  | 'count'
  | 'report'
  | 'dashboard'
  | 'bulk_operation'
  | 'workflow_action'
  | 'calculation'
  | 'code_generation'
  | 'export'
  | 'import'
  | 'sync'
  | 'audit'
  | 'notification'
  | 'interface'
  | 'authentication'
  | 'configuration'
  | 'print'
  | 'process'
  | 'schedule'
  | 'approve'
  | 'reject'
  | 'cancel'
  | 'reverse'
  | 'archive'
  | 'transfer'
  | 'unknown';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface SPClassificationRule {
  id: string;
  pattern: RegExp;
  actionType: SPActionType;
  httpMethod: HTTPMethod;
  routePattern: string;
  isTransactional: boolean;
  requiresAuth: boolean;
  cacheable: boolean;
  cacheTTL?: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  examples: string[];
  category: 'crud' | 'dropdown' | 'report' | 'workflow' | 'interface' | 'utility';
}

export interface SPParameter {
  name: string;
  type: string;
  direction: 'input' | 'output' | 'input_output';
  isOptional: boolean;
  defaultValue?: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

export interface SPTableAccess {
  tableName: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'MERGE';
  columns: string[];
  isMainOperation: boolean;
}

export interface SPBusinessRule {
  id: string;
  type: 'existence_check' | 'availability_check' | 'status_check' | 
        'permission_check' | 'date_range_check' | 'uniqueness_check' |
        'referential_check' | 'calculation_check' | 'limit_check';
  description: string;
  tableName: string;
  condition: string;
  errorCode?: number;
  errorMessage?: string;
  isBlocking: boolean;
}

export interface SPClassificationResult {
  procedureName: string;
  schema: string;
  
  // Classification
  actionType: SPActionType;
  classificationMethod: 'pattern_match' | 'body_analysis' | 'ai_inference' | 'manual';
  classificationConfidence: number;
  matchedRule?: string;
  
  // HTTP mapping
  httpMethod: HTTPMethod;
  suggestedRoute: string;
  
  // Parameters
  parameters: SPParameter[];
  
  // Body intelligence
  tableAccess: SPTableAccess[];
  businessRules: SPBusinessRule[];
  subProcedureCalls: string[];
  
  // Transaction info
  hasTransaction: boolean;
  hasTryCatch: boolean;
  hasDynamicSQL: boolean;
  
  // Complexity
  complexityScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  migrationRisk: 'low' | 'medium' | 'high' | 'critical';
  
  // Module mapping
  suggestedModule?: string;
  moduleName?: string;
  
  // API generation
  generateAPI: boolean;
  apiEndpoint?: string;
}

// ============================================================================
// CLASSIFICATION RULES - 30+ PATTERNS
// ============================================================================

export const SP_CLASSIFICATION_RULES: SPClassificationRule[] = [
  // ===== DROPDOWN PATTERNS =====
  {
    id: 'SP_DDL',
    pattern: /^SP_DDL_/i,
    actionType: 'dropdown',
    httpMethod: 'GET',
    routePattern: '/api/{module}/{entity}/dropdown',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 3600,
    priority: 'high',
    riskLevel: 'low',
    description: 'Dropdown data source - returns Id, Name pairs',
    examples: ['SP_DDL_GetCountries', 'SP_DDL_GetSpecialities', 'SP_DDL_GetGenders'],
    category: 'dropdown'
  },
  {
    id: 'SP_DDL_ByParam',
    pattern: /^SP_DDL_Get\w+By/i,
    actionType: 'dropdown',
    httpMethod: 'GET',
    routePattern: '/api/{module}/{entity}/dropdown?filterId={param}',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 1800,
    priority: 'high',
    riskLevel: 'low',
    description: 'Cascading dropdown with filter parameter',
    examples: ['SP_DDL_GetCitiesByProvince', 'SP_DDL_GetDoctorsByBranch'],
    category: 'dropdown'
  },
  
  // ===== CREATE PATTERNS =====
  {
    id: 'SP_Add',
    pattern: /^SP_Add/i,
    actionType: 'create',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'medium',
    description: 'Create new record',
    examples: ['SP_AddOrganization', 'SP_AddPatient', 'SP_AddUser'],
    category: 'crud'
  },
  {
    id: 'SP_Create',
    pattern: /^SP_Create/i,
    actionType: 'create',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'medium',
    description: 'Create new record',
    examples: ['SP_CreateInvoice', 'SP_CreateAppointment'],
    category: 'crud'
  },
  {
    id: 'SP_Insert',
    pattern: /^SP_Insert/i,
    actionType: 'create',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'medium',
    description: 'Insert new record',
    examples: ['SP_InsertPatientRecord', 'SP_InsertLabResult'],
    category: 'crud'
  },
  {
    id: 'SP_Save',
    pattern: /^SP_Save(?!.*Delete)/i,
    actionType: 'upsert',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'medium',
    description: 'Create or update record (upsert)',
    examples: ['SP_SaveOrganization', 'SP_SavePatient'],
    category: 'crud'
  },
  
  // ===== READ PATTERNS =====
  {
    id: 'SP_Get_ById',
    pattern: /^SP_Get\w+ById$/i,
    actionType: 'read_single',
    httpMethod: 'GET',
    routePattern: '/api/{module}/{entity}/{id}',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 300,
    priority: 'high',
    riskLevel: 'low',
    description: 'Get single record by ID',
    examples: ['SP_GetPatientById', 'SP_GetOrganizationById'],
    category: 'crud'
  },
  {
    id: 'SP_Get_List',
    pattern: /^SP_Get\w+List$/i,
    actionType: 'read_paginated',
    httpMethod: 'GET',
    routePattern: '/api/{module}/{entity}?page={page}&size={size}',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 60,
    priority: 'high',
    riskLevel: 'low',
    description: 'Get paginated list of records',
    examples: ['SP_GetPatientList', 'SP_GetOrganizationList'],
    category: 'crud'
  },
  {
    id: 'SP_GetAll',
    pattern: /^SP_GetAll/i,
    actionType: 'read_list',
    httpMethod: 'GET',
    routePattern: '/api/{module}/{entity}/all',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 300,
    priority: 'medium',
    riskLevel: 'low',
    description: 'Get all records (no pagination)',
    examples: ['SP_GetAllCountries', 'SP_GetAllDepartments'],
    category: 'crud'
  },
  {
    id: 'SP_Fetch',
    pattern: /^SP_Fetch/i,
    actionType: 'read_list',
    httpMethod: 'GET',
    routePattern: '/api/{module}/{entity}',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 60,
    priority: 'medium',
    riskLevel: 'low',
    description: 'Fetch records',
    examples: ['SP_FetchAppointments', 'SP_FetchInvoices'],
    category: 'crud'
  },
  
  // ===== UPDATE PATTERNS =====
  {
    id: 'SP_Update',
    pattern: /^SP_Update/i,
    actionType: 'update',
    httpMethod: 'PUT',
    routePattern: '/api/{module}/{entity}/{id}',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'medium',
    description: 'Update existing record',
    examples: ['SP_UpdateOrganization', 'SP_UpdatePatient'],
    category: 'crud'
  },
  {
    id: 'SP_Edit',
    pattern: /^SP_Edit/i,
    actionType: 'update',
    httpMethod: 'PUT',
    routePattern: '/api/{module}/{entity}/{id}',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'medium',
    description: 'Edit existing record',
    examples: ['SP_EditUser', 'SP_EditProfile'],
    category: 'crud'
  },
  {
    id: 'SP_Modify',
    pattern: /^SP_Modify/i,
    actionType: 'update',
    httpMethod: 'PATCH',
    routePattern: '/api/{module}/{entity}/{id}',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'medium',
    description: 'Modify record (partial update)',
    examples: ['SP_ModifySettings', 'SP_ModifyStatus'],
    category: 'crud'
  },
  
  // ===== DELETE PATTERNS =====
  {
    id: 'SP_Delete',
    pattern: /^SP_Delete/i,
    actionType: 'delete',
    httpMethod: 'DELETE',
    routePattern: '/api/{module}/{entity}/{id}',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'high',
    description: 'Delete record permanently',
    examples: ['SP_DeletePatient', 'SP_DeleteUser'],
    category: 'crud'
  },
  {
    id: 'SP_Remove',
    pattern: /^SP_Remove/i,
    actionType: 'delete',
    httpMethod: 'DELETE',
    routePattern: '/api/{module}/{entity}/{id}',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'high',
    description: 'Remove record',
    examples: ['SP_RemoveAccess', 'SP_RemovePermission'],
    category: 'crud'
  },
  {
    id: 'SP_Archive',
    pattern: /^SP_Archive/i,
    actionType: 'archive',
    httpMethod: 'PATCH',
    routePattern: '/api/{module}/{entity}/{id}/archive',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'medium',
    description: 'Archive record (soft delete)',
    examples: ['SP_ArchivePatient', 'SP_ArchiveDocument'],
    category: 'crud'
  },
  {
    id: 'SP_SoftDelete',
    pattern: /^SP_SoftDelete/i,
    actionType: 'soft_delete',
    httpMethod: 'PATCH',
    routePattern: '/api/{module}/{entity}/{id}/deactivate',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'medium',
    description: 'Soft delete (set IsActive=0)',
    examples: ['SP_SoftDeleteUser', 'SP_SoftDeleteRecord'],
    category: 'crud'
  },
  {
    id: 'SP_Restore',
    pattern: /^SP_Restore/i,
    actionType: 'restore',
    httpMethod: 'PATCH',
    routePattern: '/api/{module}/{entity}/{id}/restore',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'medium',
    description: 'Restore deleted/archived record',
    examples: ['SP_RestorePatient', 'SP_RestoreUser'],
    category: 'crud'
  },
  
  // ===== SEARCH PATTERNS =====
  {
    id: 'SP_Search',
    pattern: /^SP_Search/i,
    actionType: 'search',
    httpMethod: 'GET',
    routePattern: '/api/{module}/{entity}/search?q={query}',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 30,
    priority: 'high',
    riskLevel: 'low',
    description: 'Search records',
    examples: ['SP_SearchPatients', 'SP_SearchDoctors'],
    category: 'crud'
  },
  {
    id: 'SP_Find',
    pattern: /^SP_Find/i,
    actionType: 'search',
    httpMethod: 'GET',
    routePattern: '/api/{module}/{entity}/find',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 30,
    priority: 'medium',
    riskLevel: 'low',
    description: 'Find records matching criteria',
    examples: ['SP_FindPatients', 'SP_FindAppointments'],
    category: 'crud'
  },
  
  // ===== VALIDATION PATTERNS =====
  {
    id: 'SP_Validate',
    pattern: /^SP_Validate/i,
    actionType: 'validate',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}/validate',
    isTransactional: false,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'low',
    description: 'Validate data before operation',
    examples: ['SP_ValidatePatient', 'SP_ValidateInsurance'],
    category: 'utility'
  },
  {
    id: 'SP_Check',
    pattern: /^SP_Check/i,
    actionType: 'exists_check',
    httpMethod: 'GET',
    routePattern: '/api/{module}/{entity}/exists',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 10,
    priority: 'high',
    riskLevel: 'low',
    description: 'Check if record exists (uniqueness check)',
    examples: ['SP_CheckEmailExists', 'SP_CheckMRNExists'],
    category: 'utility'
  },
  {
    id: 'SP_Exists',
    pattern: /^SP_Exists/i,
    actionType: 'exists_check',
    httpMethod: 'GET',
    routePattern: '/api/{module}/{entity}/exists',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 10,
    priority: 'high',
    riskLevel: 'low',
    description: 'Check existence',
    examples: ['SP_ExistsPatient', 'SP_ExistsUser'],
    category: 'utility'
  },
  
  // ===== COUNT PATTERNS =====
  {
    id: 'SP_Count',
    pattern: /^SP_Count/i,
    actionType: 'count',
    httpMethod: 'GET',
    routePattern: '/api/{module}/{entity}/count',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 60,
    priority: 'medium',
    riskLevel: 'low',
    description: 'Count records',
    examples: ['SP_CountPatients', 'SP_CountAppointments'],
    category: 'utility'
  },
  
  // ===== REPORT PATTERNS =====
  {
    id: 'SP_Report',
    pattern: /^SP_Report/i,
    actionType: 'report',
    httpMethod: 'GET',
    routePattern: '/api/{module}/reports/{report-name}',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 300,
    priority: 'medium',
    riskLevel: 'low',
    description: 'Generate report data',
    examples: ['SP_ReportPatientVisits', 'SP_ReportRevenue'],
    category: 'report'
  },
  {
    id: 'SP_Dashboard',
    pattern: /^SP_Dashboard/i,
    actionType: 'dashboard',
    httpMethod: 'GET',
    routePattern: '/api/{module}/dashboard',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 60,
    priority: 'medium',
    riskLevel: 'low',
    description: 'Dashboard widget data',
    examples: ['SP_DashboardStats', 'SP_DashboardOverview'],
    category: 'report'
  },
  
  // ===== WORKFLOW PATTERNS =====
  {
    id: 'SP_Approve',
    pattern: /^SP_Approve/i,
    actionType: 'approve',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}/{id}/approve',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'high',
    description: 'Approve workflow item',
    examples: ['SP_ApproveLeave', 'SP_ApproveAdmission'],
    category: 'workflow'
  },
  {
    id: 'SP_Reject',
    pattern: /^SP_Reject/i,
    actionType: 'reject',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}/{id}/reject',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'medium',
    description: 'Reject workflow item',
    examples: ['SP_RejectLeave', 'SP_RejectAdmission'],
    category: 'workflow'
  },
  {
    id: 'SP_Cancel',
    pattern: /^SP_Cancel/i,
    actionType: 'cancel',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}/{id}/cancel',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'medium',
    description: 'Cancel operation',
    examples: ['SP_CancelAppointment', 'SP_CancelOrder'],
    category: 'workflow'
  },
  {
    id: 'SP_Reverse',
    pattern: /^SP_Reverse/i,
    actionType: 'reverse',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}/{id}/reverse',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'high',
    description: 'Reverse transaction',
    examples: ['SP_ReversePayment', 'SP_ReverseTransaction'],
    category: 'workflow'
  },
  {
    id: 'SP_Transfer',
    pattern: /^SP_Transfer/i,
    actionType: 'transfer',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}/{id}/transfer',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'high',
    description: 'Transfer between departments/branches',
    examples: ['SP_TransferPatient', 'SP_TransferStock'],
    category: 'workflow'
  },
  
  // ===== BULK OPERATIONS =====
  {
    id: 'SP_Bulk',
    pattern: /^SP_Bulk/i,
    actionType: 'bulk_operation',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}/bulk',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'high',
    description: 'Bulk operation on multiple records',
    examples: ['SP_BulkInsert', 'SP_BulkUpdate', 'SP_BulkDelete'],
    category: 'crud'
  },
  {
    id: 'SP_Batch',
    pattern: /^SP_Batch/i,
    actionType: 'bulk_operation',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}/batch',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'high',
    description: 'Batch processing',
    examples: ['SP_BatchProcess', 'SP_BatchImport'],
    category: 'utility'
  },
  
  // ===== CALCULATION PATTERNS =====
  {
    id: 'SP_Calculate',
    pattern: /^SP_Calculate/i,
    actionType: 'calculation',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}/calculate',
    isTransactional: false,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'low',
    description: 'Perform calculation',
    examples: ['SP_CalculateBill', 'SP_CalculateDiscount'],
    category: 'utility'
  },
  {
    id: 'SP_Compute',
    pattern: /^SP_Compute/i,
    actionType: 'calculation',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}/compute',
    isTransactional: false,
    requiresAuth: true,
    cacheable: false,
    priority: 'medium',
    riskLevel: 'low',
    description: 'Compute value',
    examples: ['SP_ComputeAge', 'SP_ComputeScore'],
    category: 'utility'
  },
  
  // ===== CODE GENERATION PATTERNS =====
  {
    id: 'SP_Generate',
    pattern: /^SP_Generate/i,
    actionType: 'code_generation',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}/generate',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'medium',
    description: 'Generate code/number (MRN, Invoice#, etc.)',
    examples: ['SP_GenerateMRN', 'SP_GenerateInvoiceNo'],
    category: 'utility'
  },
  
  // ===== EXPORT/IMPORT PATTERNS =====
  {
    id: 'SP_Export',
    pattern: /^SP_Export/i,
    actionType: 'export',
    httpMethod: 'GET',
    routePattern: '/api/{module}/{entity}/export',
    isTransactional: false,
    requiresAuth: true,
    cacheable: false,
    priority: 'medium',
    riskLevel: 'low',
    description: 'Export data',
    examples: ['SP_ExportPatients', 'SP_ExportReport'],
    category: 'utility'
  },
  {
    id: 'SP_Import',
    pattern: /^SP_Import/i,
    actionType: 'import',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}/import',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'high',
    description: 'Import data',
    examples: ['SP_ImportPatients', 'SP_ImportLabResults'],
    category: 'utility'
  },
  {
    id: 'SP_Sync',
    pattern: /^SP_Sync/i,
    actionType: 'sync',
    httpMethod: 'POST',
    routePattern: '/api/{module}/{entity}/sync',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'high',
    description: 'Synchronize data',
    examples: ['SP_SyncPatients', 'SP_SyncInventory'],
    category: 'interface'
  },
  
  // ===== AUDIT PATTERNS =====
  {
    id: 'SP_Audit',
    pattern: /^SP_Audit/i,
    actionType: 'audit',
    httpMethod: 'POST',
    routePattern: '/api/{module}/audit',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'medium',
    description: 'Audit operation',
    examples: ['SP_AuditLogin', 'SP_AuditChanges'],
    category: 'utility'
  },
  {
    id: 'SP_Log',
    pattern: /^SP_Log/i,
    actionType: 'audit',
    httpMethod: 'POST',
    routePattern: '/api/{module}/log',
    isTransactional: false,
    requiresAuth: true,
    cacheable: false,
    priority: 'medium',
    riskLevel: 'low',
    description: 'Log operation',
    examples: ['SP_LogError', 'SP_LogActivity'],
    category: 'utility'
  },
  
  // ===== NOTIFICATION PATTERNS =====
  {
    id: 'SP_Notify',
    pattern: /^SP_Notify/i,
    actionType: 'notification',
    httpMethod: 'POST',
    routePattern: '/api/{module}/notify',
    isTransactional: false,
    requiresAuth: true,
    cacheable: false,
    priority: 'medium',
    riskLevel: 'low',
    description: 'Send notification',
    examples: ['SP_NotifyPatient', 'SP_NotifyDoctor'],
    category: 'utility'
  },
  {
    id: 'SP_Send',
    pattern: /^SP_Send(?!Email)/i,
    actionType: 'notification',
    httpMethod: 'POST',
    routePattern: '/api/{module}/send',
    isTransactional: false,
    requiresAuth: true,
    cacheable: false,
    priority: 'medium',
    riskLevel: 'low',
    description: 'Send message/notification',
    examples: ['SP_SendSMS', 'SP_SendAlert'],
    category: 'utility'
  },
  
  // ===== INTERFACE PATTERNS =====
  {
    id: 'SP_HL7',
    pattern: /^SP_HL7/i,
    actionType: 'interface',
    httpMethod: 'POST',
    routePattern: '/api/integration/hl7/{operation}',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'critical',
    description: 'HL7 interface operation',
    examples: ['SP_HL7_Admit', 'SP_HL7_Discharge'],
    category: 'interface'
  },
  {
    id: 'SP_Interface',
    pattern: /^SP_Interface/i,
    actionType: 'interface',
    httpMethod: 'POST',
    routePattern: '/api/integration/{system}/{operation}',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'critical',
    description: 'External system interface',
    examples: ['SP_Interface_Lab', 'SP_Interface_Insurance'],
    category: 'interface'
  },
  
  // ===== AUTHENTICATION PATTERNS =====
  {
    id: 'SP_Auth',
    pattern: /^SP_Auth/i,
    actionType: 'authentication',
    httpMethod: 'POST',
    routePattern: '/api/auth/{operation}',
    isTransactional: false,
    requiresAuth: false,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'critical',
    description: 'Authentication operation',
    examples: ['SP_AuthLogin', 'SP_AuthValidate'],
    category: 'utility'
  },
  {
    id: 'SP_Login',
    pattern: /^SP_Login/i,
    actionType: 'authentication',
    httpMethod: 'POST',
    routePattern: '/api/auth/login',
    isTransactional: false,
    requiresAuth: false,
    cacheable: false,
    priority: 'critical',
    riskLevel: 'critical',
    description: 'User login',
    examples: ['SP_LoginUser', 'SP_LoginStaff'],
    category: 'utility'
  },
  
  // ===== CONFIGURATION PATTERNS =====
  {
    id: 'SP_Config',
    pattern: /^SP_Config/i,
    actionType: 'configuration',
    httpMethod: 'GET',
    routePattern: '/api/config/{key}',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 600,
    priority: 'medium',
    riskLevel: 'low',
    description: 'Get/set configuration',
    examples: ['SP_Config_Get', 'SP_Config_Set'],
    category: 'utility'
  },
  
  // ===== PRINT PATTERNS =====
  {
    id: 'SP_Print',
    pattern: /^SP_Print/i,
    actionType: 'print',
    httpMethod: 'GET',
    routePattern: '/api/{module}/{entity}/{id}/print',
    isTransactional: false,
    requiresAuth: true,
    cacheable: true,
    cacheTTL: 60,
    priority: 'medium',
    riskLevel: 'low',
    description: 'Print-specific data formatting',
    examples: ['SP_PrintInvoice', 'SP_PrintReport'],
    category: 'report'
  },
  
  // ===== PROCESS PATTERNS =====
  {
    id: 'SP_Process',
    pattern: /^SP_Process/i,
    actionType: 'process',
    httpMethod: 'POST',
    routePattern: '/api/{module}/process',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'high',
    description: 'Multi-step business process',
    examples: ['SP_ProcessAdmission', 'SP_ProcessBilling'],
    category: 'workflow'
  },
  
  // ===== SCHEDULE PATTERNS =====
  {
    id: 'SP_Schedule',
    pattern: /^SP_Schedule/i,
    actionType: 'schedule',
    httpMethod: 'POST',
    routePattern: '/api/{module}/schedule',
    isTransactional: true,
    requiresAuth: true,
    cacheable: false,
    priority: 'high',
    riskLevel: 'medium',
    description: 'Schedule operation',
    examples: ['SP_ScheduleAppointment', 'SP_ScheduleTask'],
    category: 'workflow'
  }
];

// ============================================================================
// CLASSIFICATION ENGINE
// ============================================================================

export class SPClassificationEngine {
  private rules: SPClassificationRule[];
  
  constructor(customRules?: SPClassificationRule[]) {
    this.rules = customRules || SP_CLASSIFICATION_RULES;
  }
  
  /**
   * Classify a stored procedure based on its name
   */
  classifyByName(procedureName: string): {
    rule?: SPClassificationRule;
    confidence: number;
    alternativeMatches: SPClassificationRule[];
  } {
    const matches: Array<{ rule: SPClassificationRule; confidence: number }> = [];
    
    for (const rule of this.rules) {
      if (rule.pattern.test(procedureName)) {
        // Calculate confidence based on pattern specificity
        const patternLength = rule.pattern.source.length;
        const baseConfidence = 0.85;
        const specificityBoost = Math.min(0.15, patternLength / 100);
        const confidence = baseConfidence + specificityBoost;
        
        matches.push({ rule, confidence });
      }
    }
    
    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);
    
    if (matches.length === 0) {
      return {
        confidence: 0,
        alternativeMatches: []
      };
    }
    
    return {
      rule: matches[0].rule,
      confidence: matches[0].confidence,
      alternativeMatches: matches.slice(1, 4).map(m => m.rule)
    };
  }
  
  /**
   * Extract module name from SP name
   */
  extractModule(procedureName: string): string | null {
    // Remove SP_ prefix
    const cleaned = procedureName.replace(/^SP_/i, '');
    
    // Common module indicators
    const modulePatterns = [
      /^Patient/i, /^Doctor/i, /^Nurse/i, /^Staff/i, /^User/i,
      /^Organization/i, /^Branch/i, /^Department/i, /^Admission/i,
      /^Appointment/i, /^Billing/i, /^Invoice/i, /^Payment/i,
      /^Lab/i, /^Pharmacy/i, /^Inventory/i, /^Insurance/i, /^Claim/i,
      /^Report/i, /^Audit/i, /^Auth/i, /^Role/i, /^Permission/i,
      /^Setting/i, /^Config/i, /^Region/i, /^City/i, /^Country/i,
      /^Province/i, /^Schedule/i, /^Ward/i, /^Bed/i, /^Room/i,
      /^Equipment/i, /^Vendor/i, /^Supplier/i, /^Purchase/i, /^Order/i,
      /^Transfer/i, /^Discharge/i, /^Visit/i, /^Consultation/i,
      /^Prescription/i, /^Diagnosis/i, /^Treatment/i, /^Procedure/i,
      /^Surgery/i, /^Emergency/i, /^ICU/i, /^OPD/i,
      /^Radiology/i, /^Pathology/i, /^BloodBank/i, /^Vaccine/i,
      /^Immunization/i, /^Family/i, /^NextOfKin/i, /^Document/i,
      /^File/i, /^Attachment/i, /^Notification/i, /^Message/i,
      /^SMS/i, /^Email/i, /^Template/i, /^Calendar/i, /^Queue/i,
      /^Token/i, /^Counter/i, /^Dashboard/i, /^Statistics/i,
      /^Analytics/i, /^Log/i, /^Error/i, /^Exception/i
    ];
    
    for (const pattern of modulePatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    // Try to extract entity from action patterns
    const entityMatch = cleaned.match(/(?:Get|Add|Update|Delete|Save|Create|Find|Search|Validate|Check|Count|Report|Process|Approve|Reject|Cancel|Archive|Restore|Transfer|Bulk|Batch|Generate|Calculate|Export|Import|Sync|Notify|Send|Print|Schedule)(\w+)/);
    if (entityMatch) {
      return entityMatch[1];
    }
    
    return null;
  }
  
  /**
   * Generate suggested API route from SP classification
   */
  generateRoute(
    procedureName: string,
    rule: SPClassificationRule,
    moduleName?: string
  ): string {
    const module = moduleName || this.extractModule(procedureName) || 'module';
    const entity = this.extractEntity(procedureName, rule) || 'entity';
    
    let route = rule.routePattern
      .replace('{module}', module.toLowerCase())
      .replace('{entity}', entity.toLowerCase());
    
    return route;
  }
  
  /**
   * Extract entity name from SP name
   */
  private extractEntity(procedureName: string, rule: SPClassificationRule): string | null {
    // Remove SP_ prefix
    const cleaned = procedureName.replace(/^SP_/i, '');
    
    // Try to extract entity based on rule's action type
    const actionPrefixes = [
      'DDL_Get', 'Get', 'Add', 'Create', 'Insert', 'Save',
      'Update', 'Edit', 'Modify', 'Delete', 'Remove', 'Archive',
      'Restore', 'Search', 'Find', 'Validate', 'Check', 'Count',
      'Report', 'Dashboard', 'Approve', 'Reject', 'Cancel', 'Reverse',
      'Transfer', 'Bulk', 'Batch', 'Generate', 'Calculate', 'Export',
      'Import', 'Sync', 'Notify', 'Send', 'Print', 'Schedule', 'Process'
    ];
    
    for (const prefix of actionPrefixes) {
      if (cleaned.startsWith(prefix)) {
        return cleaned.slice(prefix.length);
      }
    }
    
    return null;
  }
  
  /**
   * Get all classification rules
   */
  getRules(): SPClassificationRule[] {
    return [...this.rules];
  }
  
  /**
   * Add custom classification rule
   */
  addRule(rule: SPClassificationRule): void {
    this.rules.push(rule);
  }
  
  /**
   * Get rules by category
   */
  getRulesByCategory(category: SPClassificationRule['category']): SPClassificationRule[] {
    return this.rules.filter(r => r.category === category);
  }
  
  /**
   * Get rules by action type
   */
  getRulesByActionType(actionType: SPActionType): SPClassificationRule[] {
    return this.rules.filter(r => r.actionType === actionType);
  }
}

// Export singleton instance
export const spClassificationEngine = new SPClassificationEngine();

// Export utility functions
export function classifySP(procedureName: string): ReturnType<SPClassificationEngine['classifyByName']> {
  return spClassificationEngine.classifyByName(procedureName);
}

export function extractModuleFromSP(procedureName: string): string | null {
  return spClassificationEngine.extractModule(procedureName);
}
