import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/seed
// Seeds the SQLite database with realistic healthcare/HIS sample data.
// Idempotent — safe to call multiple times (duplicates are skipped).
// ─────────────────────────────────────────────────────────────────────────────

export async function POST() {
  try {
    const results = {
      projects: 0,
      tables: 0,
      procedures: 0,
      modules: 0,
      agentRuns: 0,
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 1. TOOLKIT PROJECTS
    // ═══════════════════════════════════════════════════════════════════════

    const projectIds: string[] = []

    const projects = [
      {
        id: 'proj-his-core-001',
        name: 'HIS Core System',
        description: 'Hospital Information System — Core clinical and administrative modules covering patient management, orders, results, and encounters.',
        softwareType: 'Healthcare HIS',
        targetTemplate: 'nextjs-react',
        status: 'active',
        color: '#3b82f6',
        icon: 'Hospital',
      },
      {
        id: 'proj-his-lab-002',
        name: 'Laboratory Information System',
        description: 'LIS module for specimen tracking, test orders, result entry, and quality control in the clinical pathology lab.',
        softwareType: 'Healthcare LIS',
        targetTemplate: 'nextjs-react',
        status: 'active',
        color: '#22c55e',
        icon: 'Microscope',
      },
    ]

    for (const p of projects) {
      try {
        await db.toolkitProject.create({ data: { ...p, updatedAt: new Date() } })
        results.projects++
        projectIds.push(p.id)
      } catch {
        // Already exists — skip
        projectIds.push(p.id)
      }
    }

    // If we couldn't create any projects (all existed), still use the known IDs
    if (projectIds.length === 0) {
      projectIds.push('proj-his-core-001', 'proj-his-lab-002')
    }

    const [coreProjectId, labProjectId] = projectIds

    // ═══════════════════════════════════════════════════════════════════════
    // 2. TOOLKIT TABLES — Core HIS
    // ═══════════════════════════════════════════════════════════════════════

    const coreTables = [
      {
        tableName: 'Patient',
        columns: JSON.stringify([
          { name: 'PatientId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'MRN', type: 'varchar(20)', nullable: false },
          { name: 'FirstName', type: 'nvarchar(100)', nullable: false },
          { name: 'LastName', type: 'nvarchar(100)', nullable: false },
          { name: 'DateOfBirth', type: 'date', nullable: false },
          { name: 'Gender', type: 'varchar(10)', nullable: true },
          { name: 'PhoneNumber', type: 'varchar(20)', nullable: true },
          { name: 'Email', type: 'varchar(255)', nullable: true },
          { name: 'AddressLine1', type: 'nvarchar(200)', nullable: true },
          { name: 'City', type: 'nvarchar(100)', nullable: true },
          { name: 'State', type: 'varchar(50)', nullable: true },
          { name: 'PostalCode', type: 'varchar(20)', nullable: true },
          { name: 'Country', type: 'varchar(3)', nullable: true, defaultValue: 'USA' },
          { name: 'IsActive', type: 'bit', nullable: false, defaultValue: '1' },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
          { name: 'UpdatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([]),
        status: 'linked',
        linkedModule: 'Patient Management',
      },
      {
        tableName: 'Encounter',
        columns: JSON.stringify([
          { name: 'EncounterId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'PatientId', type: 'uniqueidentifier', nullable: false },
          { name: 'EncounterType', type: 'varchar(50)', nullable: false },
          { name: 'EncounterDate', type: 'datetime', nullable: false },
          { name: 'DischargeDate', type: 'datetime', nullable: true },
          { name: 'PractitionerId', type: 'uniqueidentifier', nullable: false },
          { name: 'Department', type: 'nvarchar(100)', nullable: true },
          { name: 'LocationId', type: 'uniqueidentifier', nullable: true },
          { name: 'DiagnosisCode', type: 'varchar(20)', nullable: true },
          { name: 'Status', type: 'varchar(20)', nullable: false, defaultValue: 'Active' },
          { name: 'Notes', type: 'nvarchar(max)', nullable: true },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'PatientId', referencesTable: 'Patient', referencesColumn: 'PatientId' },
          { column: 'PractitionerId', referencesTable: 'Practitioner', referencesColumn: 'PractitionerId' },
          { column: 'LocationId', referencesTable: 'Location', referencesColumn: 'LocationId' },
        ]),
        status: 'linked',
        linkedModule: 'Clinical Workflow',
      },
      {
        tableName: 'Practitioner',
        columns: JSON.stringify([
          { name: 'PractitionerId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'NPI', type: 'varchar(10)', nullable: false },
          { name: 'FirstName', type: 'nvarchar(100)', nullable: false },
          { name: 'LastName', type: 'nvarchar(100)', nullable: false },
          { name: 'Specialty', type: 'nvarchar(100)', nullable: true },
          { name: 'DepartmentId', type: 'uniqueidentifier', nullable: true },
          { name: 'Email', type: 'varchar(255)', nullable: true },
          { name: 'PhoneNumber', type: 'varchar(20)', nullable: true },
          { name: 'IsActive', type: 'bit', nullable: false, defaultValue: '1' },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'DepartmentId', referencesTable: 'Organization', referencesColumn: 'OrganizationId' },
        ]),
        status: 'linked',
        linkedModule: 'Provider Management',
      },
      {
        tableName: 'Order',
        columns: JSON.stringify([
          { name: 'OrderId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'EncounterId', type: 'uniqueidentifier', nullable: false },
          { name: 'PatientId', type: 'uniqueidentifier', nullable: false },
          { name: 'OrderType', type: 'varchar(50)', nullable: false },
          { name: 'OrderCode', type: 'varchar(30)', nullable: false },
          { name: 'OrderName', type: 'nvarchar(200)', nullable: false },
          { name: 'OrderingPractitionerId', type: 'uniqueidentifier', nullable: false },
          { name: 'OrderedAt', type: 'datetime', nullable: false },
          { name: 'Status', type: 'varchar(20)', nullable: false, defaultValue: 'Pending' },
          { name: 'Priority', type: 'varchar(10)', nullable: false, defaultValue: 'Routine' },
          { name: 'ClinicalNotes', type: 'nvarchar(max)', nullable: true },
          { name: 'CompletedAt', type: 'datetime', nullable: true },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'EncounterId', referencesTable: 'Encounter', referencesColumn: 'EncounterId' },
          { column: 'PatientId', referencesTable: 'Patient', referencesColumn: 'PatientId' },
          { column: 'OrderingPractitionerId', referencesTable: 'Practitioner', referencesColumn: 'PractitionerId' },
        ]),
        status: 'linked',
        linkedModule: 'Order Management',
      },
      {
        tableName: 'Result',
        columns: JSON.stringify([
          { name: 'ResultId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'OrderId', type: 'uniqueidentifier', nullable: false },
          { name: 'ResultCode', type: 'varchar(30)', nullable: false },
          { name: 'ResultName', type: 'nvarchar(200)', nullable: false },
          { name: 'ResultValue', type: 'nvarchar(100)', nullable: true },
          { name: 'Unit', type: 'varchar(20)', nullable: true },
          { name: 'ReferenceRange', type: 'varchar(50)', nullable: true },
          { name: 'IsAbnormal', type: 'bit', nullable: false, defaultValue: '0' },
          { name: 'ResultedAt', type: 'datetime', nullable: false },
          { name: 'ResultingPractitionerId', type: 'uniqueidentifier', nullable: true },
          { name: 'Status', type: 'varchar(20)', nullable: false, defaultValue: 'Preliminary' },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'OrderId', referencesTable: 'Order', referencesColumn: 'OrderId' },
          { column: 'ResultingPractitionerId', referencesTable: 'Practitioner', referencesColumn: 'PractitionerId' },
        ]),
        status: 'linked',
        linkedModule: 'Order Management',
      },
      {
        tableName: 'Observation',
        columns: JSON.stringify([
          { name: 'ObservationId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'PatientId', type: 'uniqueidentifier', nullable: false },
          { name: 'EncounterId', type: 'uniqueidentifier', nullable: true },
          { name: 'ObservationCode', type: 'varchar(30)', nullable: false },
          { name: 'ObservationName', type: 'nvarchar(200)', nullable: false },
          { name: 'Value', type: 'nvarchar(100)', nullable: true },
          { name: 'Unit', type: 'varchar(20)', nullable: true },
          { name: 'Category', type: 'varchar(50)', nullable: true },
          { name: 'Interpretation', type: 'varchar(20)', nullable: true },
          { name: 'EffectiveDateTime', type: 'datetime', nullable: false },
          { name: 'IssuedDateTime', type: 'datetime', nullable: true },
          { name: 'PerformerId', type: 'uniqueidentifier', nullable: true },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'PatientId', referencesTable: 'Patient', referencesColumn: 'PatientId' },
          { column: 'EncounterId', referencesTable: 'Encounter', referencesColumn: 'EncounterId' },
        ]),
        status: 'linked',
        linkedModule: 'Clinical Documentation',
      },
      {
        tableName: 'AllergyIntolerance',
        columns: JSON.stringify([
          { name: 'AllergyId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'PatientId', type: 'uniqueidentifier', nullable: false },
          { name: 'Substance', type: 'nvarchar(200)', nullable: false },
          { name: 'ReactionType', type: 'varchar(50)', nullable: true },
          { name: 'Severity', type: 'varchar(20)', nullable: true },
          { name: 'OnsetDate', type: 'date', nullable: true },
          { name: 'VerifiedBy', type: 'uniqueidentifier', nullable: true },
          { name: 'IsActive', type: 'bit', nullable: false, defaultValue: '1' },
          { name: 'Notes', type: 'nvarchar(500)', nullable: true },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'PatientId', referencesTable: 'Patient', referencesColumn: 'PatientId' },
        ]),
        status: 'linked',
        linkedModule: 'Patient Management',
      },
      {
        tableName: 'MedicationRequest',
        columns: JSON.stringify([
          { name: 'PrescriptionId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'PatientId', type: 'uniqueidentifier', nullable: false },
          { name: 'EncounterId', type: 'uniqueidentifier', nullable: true },
          { name: 'MedicationCode', type: 'varchar(30)', nullable: false },
          { name: 'MedicationName', type: 'nvarchar(200)', nullable: false },
          { name: 'Dosage', type: 'nvarchar(100)', nullable: false },
          { name: 'Frequency', type: 'varchar(50)', nullable: false },
          { name: 'Route', type: 'varchar(30)', nullable: true },
          { name: 'Quantity', type: 'int', nullable: true },
          { name: 'Refills', type: 'int', nullable: true },
          { name: 'PrescribingPractitionerId', type: 'uniqueidentifier', nullable: false },
          { name: 'Status', type: 'varchar(20)', nullable: false, defaultValue: 'Active' },
          { name: 'PrescribedAt', type: 'datetime', nullable: false },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'PatientId', referencesTable: 'Patient', referencesColumn: 'PatientId' },
          { column: 'EncounterId', referencesTable: 'Encounter', referencesColumn: 'EncounterId' },
          { column: 'PrescribingPractitionerId', referencesTable: 'Practitioner', referencesColumn: 'PractitionerId' },
        ]),
        status: 'linked',
        linkedModule: 'Pharmacy',
      },
      {
        tableName: 'DiagnosticReport',
        columns: JSON.stringify([
          { name: 'ReportId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'OrderId', type: 'uniqueidentifier', nullable: false },
          { name: 'PatientId', type: 'uniqueidentifier', nullable: false },
          { name: 'EncounterId', type: 'uniqueidentifier', nullable: true },
          { name: 'ReportType', type: 'varchar(50)', nullable: false },
          { name: 'Status', type: 'varchar(20)', nullable: false, defaultValue: 'Preliminary' },
          { name: 'Conclusion', type: 'nvarchar(max)', nullable: true },
          { name: 'PerformedAt', type: 'datetime', nullable: true },
          { name: 'IssuedAt', type: 'datetime', nullable: true },
          { name: 'AuthorizedById', type: 'uniqueidentifier', nullable: true },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'OrderId', referencesTable: 'Order', referencesColumn: 'OrderId' },
          { column: 'PatientId', referencesTable: 'Patient', referencesColumn: 'PatientId' },
          { column: 'EncounterId', referencesTable: 'Encounter', referencesColumn: 'EncounterId' },
        ]),
        status: 'linked',
        linkedModule: 'Order Management',
      },
      {
        tableName: 'Organization',
        columns: JSON.stringify([
          { name: 'OrganizationId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'Name', type: 'nvarchar(200)', nullable: false },
          { name: 'Type', type: 'varchar(50)', nullable: true },
          { name: 'DepartmentCode', type: 'varchar(20)', nullable: true },
          { name: 'Phone', type: 'varchar(20)', nullable: true },
          { name: 'Email', type: 'varchar(255)', nullable: true },
          { name: 'Address', type: 'nvarchar(300)', nullable: true },
          { name: 'ParentOrgId', type: 'uniqueidentifier', nullable: true },
          { name: 'IsActive', type: 'bit', nullable: false, defaultValue: '1' },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'ParentOrgId', referencesTable: 'Organization', referencesColumn: 'OrganizationId' },
        ]),
        status: 'linked',
        linkedModule: 'Administration',
      },
      {
        tableName: 'Location',
        columns: JSON.stringify([
          { name: 'LocationId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'Name', type: 'nvarchar(200)', nullable: false },
          { name: 'Type', type: 'varchar(50)', nullable: true },
          { name: 'Building', type: 'nvarchar(100)', nullable: true },
          { name: 'Floor', type: 'varchar(20)', nullable: true },
          { name: 'Room', type: 'varchar(20)', nullable: true },
          { name: 'OrganizationId', type: 'uniqueidentifier', nullable: true },
          { name: 'Status', type: 'varchar(20)', nullable: false, defaultValue: 'Active' },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'OrganizationId', referencesTable: 'Organization', referencesColumn: 'OrganizationId' },
        ]),
        status: 'linked',
        linkedModule: 'Administration',
      },
    ]

    for (const t of coreTables) {
      try {
        await db.toolkitTable.create({
          data: {
            id: randomUUID(),
            projectId: coreProjectId,
            schemaName: 'dbo',
            indexes: JSON.stringify([{ name: `IX_${t.tableName}_PK`, columns: [t.columns ? JSON.parse(t.columns)[0].name : 'Id'], isUnique: true }]),
            constraints: JSON.stringify([]),
            ...t,
            updatedAt: new Date(),
          },
        })
        results.tables++
      } catch {
        // Already exists — skip
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. TOOLKIT TABLES — Lab System
    // ═══════════════════════════════════════════════════════════════════════

    const labTables = [
      {
        tableName: 'Specimen',
        columns: JSON.stringify([
          { name: 'SpecimenId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'AccessionNumber', type: 'varchar(30)', nullable: false },
          { name: 'PatientId', type: 'uniqueidentifier', nullable: false },
          { name: 'OrderId', type: 'uniqueidentifier', nullable: false },
          { name: 'SpecimenType', type: 'varchar(50)', nullable: false },
          { name: 'CollectionDateTime', type: 'datetime', nullable: false },
          { name: 'CollectedById', type: 'uniqueidentifier', nullable: true },
          { name: 'ReceivedDateTime', type: 'datetime', nullable: true },
          { name: 'Status', type: 'varchar(20)', nullable: false, defaultValue: 'Collected' },
          { name: 'Notes', type: 'nvarchar(500)', nullable: true },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'PatientId', referencesTable: 'Patient', referencesColumn: 'PatientId' },
          { column: 'OrderId', referencesTable: 'Order', referencesColumn: 'OrderId' },
        ]),
        status: 'linked',
        linkedModule: 'Specimen Management',
      },
      {
        tableName: 'Condition',
        columns: JSON.stringify([
          { name: 'ConditionId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'PatientId', type: 'uniqueidentifier', nullable: false },
          { name: 'EncounterId', type: 'uniqueidentifier', nullable: true },
          { name: 'ConditionCode', type: 'varchar(30)', nullable: false },
          { name: 'ConditionName', type: 'nvarchar(200)', nullable: false },
          { name: 'Category', type: 'varchar(50)', nullable: true },
          { name: 'ClinicalStatus', type: 'varchar(20)', nullable: false, defaultValue: 'Active' },
          { name: 'VerificationStatus', type: 'varchar(20)', nullable: true },
          { name: 'OnsetDate', type: 'date', nullable: true },
          { name: 'RecorderId', type: 'uniqueidentifier', nullable: true },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'PatientId', referencesTable: 'Patient', referencesColumn: 'PatientId' },
          { column: 'EncounterId', referencesTable: 'Encounter', referencesColumn: 'EncounterId' },
        ]),
        status: 'linked',
        linkedModule: 'Clinical Documentation',
      },
      {
        tableName: 'Immunization',
        columns: JSON.stringify([
          { name: 'ImmunizationId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'PatientId', type: 'uniqueidentifier', nullable: false },
          { name: 'VaccineCode', type: 'varchar(30)', nullable: false },
          { name: 'VaccineName', type: 'nvarchar(200)', nullable: false },
          { name: 'AdministrationDate', type: 'datetime', nullable: false },
          { name: 'DoseNumber', type: 'int', nullable: true },
          { name: 'LotNumber', type: 'varchar(50)', nullable: true },
          { name: 'Site', type: 'varchar(50)', nullable: true },
          { name: 'Route', type: 'varchar(30)', nullable: true },
          { name: 'AdministeredById', type: 'uniqueidentifier', nullable: true },
          { name: 'Status', type: 'varchar(20)', nullable: false, defaultValue: 'Completed' },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'PatientId', referencesTable: 'Patient', referencesColumn: 'PatientId' },
        ]),
        status: 'linked',
        linkedModule: 'Patient Management',
      },
      {
        tableName: 'Procedure',
        columns: JSON.stringify([
          { name: 'ProcedureRecordId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'EncounterId', type: 'uniqueidentifier', nullable: false },
          { name: 'PatientId', type: 'uniqueidentifier', nullable: false },
          { name: 'ProcedureCode', type: 'varchar(30)', nullable: false },
          { name: 'ProcedureName', type: 'nvarchar(200)', nullable: false },
          { name: 'ProcedureDate', type: 'datetime', nullable: false },
          { name: 'PerformedById', type: 'uniqueidentifier', nullable: true },
          { name: 'BodySite', type: 'varchar(100)', nullable: true },
          { name: 'Status', type: 'varchar(20)', nullable: false, defaultValue: 'Completed' },
          { name: 'Notes', type: 'nvarchar(max)', nullable: true },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'EncounterId', referencesTable: 'Encounter', referencesColumn: 'EncounterId' },
          { column: 'PatientId', referencesTable: 'Patient', referencesColumn: 'PatientId' },
        ]),
        status: 'linked',
        linkedModule: 'Clinical Workflow',
      },
      {
        tableName: 'LabTestCatalog',
        columns: JSON.stringify([
          { name: 'TestId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'TestCode', type: 'varchar(30)', nullable: false },
          { name: 'TestName', type: 'nvarchar(200)', nullable: false },
          { name: 'TestCategory', type: 'varchar(50)', nullable: true },
          { name: 'SpecimenType', type: 'varchar(50)', nullable: false },
          { name: 'Method', type: 'nvarchar(100)', nullable: true },
          { name: 'TurnaroundMinutes', type: 'int', nullable: true },
          { name: 'ReferenceRangeLow', type: 'decimal(10,2)', nullable: true },
          { name: 'ReferenceRangeHigh', type: 'decimal(10,2)', nullable: true },
          { name: 'Unit', type: 'varchar(20)', nullable: true },
          { name: 'IsActive', type: 'bit', nullable: false, defaultValue: '1' },
          { name: 'DepartmentId', type: 'uniqueidentifier', nullable: true },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([]),
        status: 'linked',
        linkedModule: 'Lab Configuration',
      },
      {
        tableName: 'LabResult',
        columns: JSON.stringify([
          { name: 'LabResultId', type: 'uniqueidentifier', nullable: false, primaryKey: true },
          { name: 'SpecimenId', type: 'uniqueidentifier', nullable: false },
          { name: 'TestId', type: 'uniqueidentifier', nullable: false },
          { name: 'ResultValue', type: 'nvarchar(100)', nullable: false },
          { name: 'IsAbnormal', type: 'bit', nullable: false, defaultValue: '0' },
          { name: 'ReferenceRange', type: 'varchar(50)', nullable: true },
          { name: 'Unit', type: 'varchar(20)', nullable: true },
          { name: 'ResultedById', type: 'uniqueidentifier', nullable: true },
          { name: 'VerifiedById', type: 'uniqueidentifier', nullable: true },
          { name: 'ResultedAt', type: 'datetime', nullable: false },
          { name: 'VerifiedAt', type: 'datetime', nullable: true },
          { name: 'Status', type: 'varchar(20)', nullable: false, defaultValue: 'Preliminary' },
          { name: 'CreatedAt', type: 'datetime', nullable: false },
        ]),
        foreignKeys: JSON.stringify([
          { column: 'SpecimenId', referencesTable: 'Specimen', referencesColumn: 'SpecimenId' },
          { column: 'TestId', referencesTable: 'LabTestCatalog', referencesColumn: 'TestId' },
        ]),
        status: 'standalone',
        linkedModule: 'Result Entry',
      },
    ]

    for (const t of labTables) {
      try {
        await db.toolkitTable.create({
          data: {
            id: randomUUID(),
            projectId: labProjectId,
            schemaName: 'dbo',
            indexes: JSON.stringify([{ name: `IX_${t.tableName}_PK`, columns: [t.columns ? JSON.parse(t.columns)[0].name : 'Id'], isUnique: true }]),
            constraints: JSON.stringify([]),
            ...t,
            updatedAt: new Date(),
          },
        })
        results.tables++
      } catch {
        // Already exists — skip
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. TOOLKIT PROCEDURES
    // ═══════════════════════════════════════════════════════════════════════

    const procedures = [
      {
        projectId: coreProjectId,
        procedureName: 'usp_GetPatientById',
        parameters: JSON.stringify([{ name: '@PatientId', type: 'uniqueidentifier', direction: 'in' }]),
        returnType: 'table',
        body: 'SELECT p.*, o.Name AS OrganizationName FROM Patient p LEFT JOIN Organization o ON p.OrganizationId = o.OrganizationId WHERE p.PatientId = @PatientId AND p.IsActive = 1',
        operations: JSON.stringify(['SELECT']),
        tablesAccessed: JSON.stringify(['Patient', 'Organization']),
        tablesModified: JSON.stringify([]),
        complexity: 2,
      },
      {
        projectId: coreProjectId,
        procedureName: 'usp_CreateEncounter',
        parameters: JSON.stringify([
          { name: '@PatientId', type: 'uniqueidentifier', direction: 'in' },
          { name: '@EncounterType', type: 'varchar(50)', direction: 'in' },
          { name: '@PractitionerId', type: 'uniqueidentifier', direction: 'in' },
          { name: '@Department', type: 'nvarchar(100)', direction: 'in' },
          { name: '@EncounterId', type: 'uniqueidentifier', direction: 'out' },
        ]),
        returnType: null,
        body: 'INSERT INTO Encounter (EncounterId, PatientId, EncounterType, EncounterDate, PractitionerId, Department, Status) VALUES (NEWID(), @PatientId, @EncounterType, GETDATE(), @PractitionerId, @Department, \'Active\'); SET @EncounterId = SCOPE_IDENTITY();',
        operations: JSON.stringify(['INSERT']),
        tablesAccessed: JSON.stringify(['Encounter']),
        tablesModified: JSON.stringify(['Encounter']),
        complexity: 3,
      },
      {
        projectId: coreProjectId,
        procedureName: 'usp_GetPatientOrders',
        parameters: JSON.stringify([
          { name: '@PatientId', type: 'uniqueidentifier', direction: 'in' },
          { name: '@Status', type: 'varchar(20)', direction: 'in' },
          { name: '@FromDate', type: 'date', direction: 'in' },
          { name: '@ToDate', type: 'date', direction: 'in' },
        ]),
        returnType: 'table',
        body: 'SELECT o.*, p.FirstName + \' \' + p.LastName AS OrderingPractitioner FROM [Order] o JOIN Practitioner p ON o.OrderingPractitionerId = p.PractitionerId WHERE o.PatientId = @PatientId AND (@Status IS NULL OR o.Status = @Status) AND o.OrderedAt BETWEEN @FromDate AND @ToDate ORDER BY o.OrderedAt DESC',
        operations: JSON.stringify(['SELECT']),
        tablesAccessed: JSON.stringify(['Order', 'Practitioner']),
        tablesModified: JSON.stringify([]),
        complexity: 4,
      },
      {
        projectId: labProjectId,
        procedureName: 'usp_ProcessSpecimen',
        parameters: JSON.stringify([
          { name: '@SpecimenId', type: 'uniqueidentifier', direction: 'in' },
          { name: '@Status', type: 'varchar(20)', direction: 'in' },
        ]),
        returnType: null,
        body: 'UPDATE Specimen SET Status = @Status, ReceivedDateTime = CASE WHEN @Status = \'Received\' THEN GETDATE() ELSE ReceivedDateTime END WHERE SpecimenId = @SpecimenId',
        operations: JSON.stringify(['UPDATE']),
        tablesAccessed: JSON.stringify(['Specimen']),
        tablesModified: JSON.stringify(['Specimen']),
        complexity: 2,
      },
      {
        projectId: labProjectId,
        procedureName: 'usp_GetLabResultsBySpecimen',
        parameters: JSON.stringify([
          { name: '@SpecimenId', type: 'uniqueidentifier', direction: 'in' },
        ]),
        returnType: 'table',
        body: 'SELECT lr.*, tc.TestName, tc.Unit, tc.ReferenceRangeLow, tc.ReferenceRangeHigh FROM LabResult lr JOIN LabTestCatalog tc ON lr.TestId = tc.TestId WHERE lr.SpecimenId = @SpecimenId ORDER BY lr.ResultedAt DESC',
        operations: JSON.stringify(['SELECT']),
        tablesAccessed: JSON.stringify(['LabResult', 'LabTestCatalog']),
        tablesModified: JSON.stringify([]),
        complexity: 3,
      },
      {
        projectId: coreProjectId,
        procedureName: 'usp_SearchPatients',
        parameters: JSON.stringify([
          { name: '@SearchTerm', type: 'nvarchar(200)', direction: 'in' },
          { name: '@PageNumber', type: 'int', direction: 'in' },
          { name: '@PageSize', type: 'int', direction: 'in' },
          { name: '@TotalCount', type: 'int', direction: 'out' },
        ]),
        returnType: 'table',
        body: 'SELECT @TotalCount = COUNT(*) FROM Patient WHERE (FirstName LIKE \'%\' + @SearchTerm + \'%\' OR LastName LIKE \'%\' + @SearchTerm + \'%\' OR MRN LIKE \'%\' + @SearchTerm + \'%\') AND IsActive = 1; SELECT * FROM Patient WHERE (FirstName LIKE \'%\' + @SearchTerm + \'%\' OR LastName LIKE \'%\' + @SearchTerm + \'%\' OR MRN LIKE \'%\' + @SearchTerm + \'%\') AND IsActive = 1 ORDER BY LastName, FirstName OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;',
        operations: JSON.stringify(['SELECT']),
        tablesAccessed: JSON.stringify(['Patient']),
        tablesModified: JSON.stringify([]),
        complexity: 5,
      },
      {
        projectId: coreProjectId,
        procedureName: 'usp_PrescribeMedication',
        parameters: JSON.stringify([
          { name: '@PatientId', type: 'uniqueidentifier', direction: 'in' },
          { name: '@EncounterId', type: 'uniqueidentifier', direction: 'in' },
          { name: '@MedicationCode', type: 'varchar(30)', direction: 'in' },
          { name: '@MedicationName', type: 'nvarchar(200)', direction: 'in' },
          { name: '@Dosage', type: 'nvarchar(100)', direction: 'in' },
          { name: '@Frequency', type: 'varchar(50)', direction: 'in' },
          { name: '@PrescribingPractitionerId', type: 'uniqueidentifier', direction: 'in' },
          { name: '@PrescriptionId', type: 'uniqueidentifier', direction: 'out' },
        ]),
        returnType: null,
        body: 'INSERT INTO MedicationRequest (PrescriptionId, PatientId, EncounterId, MedicationCode, MedicationName, Dosage, Frequency, PrescribingPractitionerId, Status, PrescribedAt) VALUES (NEWID(), @PatientId, @EncounterId, @MedicationCode, @MedicationName, @Dosage, @Frequency, @PrescribingPractitionerId, \'Active\', GETDATE()); SET @PrescriptionId = SCOPE_IDENTITY();',
        operations: JSON.stringify(['INSERT']),
        tablesAccessed: JSON.stringify(['MedicationRequest']),
        tablesModified: JSON.stringify(['MedicationRequest']),
        complexity: 3,
      },
    ]

    for (const sp of procedures) {
      try {
        await db.toolkitProcedure.create({
          data: { id: randomUUID(), ...sp, updatedAt: new Date() },
        })
        results.procedures++
      } catch {
        // Already exists — skip
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. HIS MODULES
    // ═══════════════════════════════════════════════════════════════════════

    const modules = [
      {
        id: 'mod-patient-mgmt',
        moduleKey: 'patient-management',
        moduleName: 'Patient Management',
        description: 'Patient registration, demographics, contact info, medical history, and allergy tracking.',
        layer: 1,
        layerName: 'Domain',
        priority: 'critical',
        estimatedDays: 14,
        tables: JSON.stringify(['Patient', 'AllergyIntolerance', 'Immunization']),
        dependsOn: JSON.stringify([]),
        features: JSON.stringify(['Patient Registration', 'MRN Generation', 'Demographics Update', 'Allergy Recording', 'Medical History']),
        userRoles: JSON.stringify(['Registration Clerk', 'Nurse', 'Physician']),
        revenue: true,
        status: 'linked',
        progress: 85,
        assignedTo: 'Team Alpha',
        notes: 'Core module — most tables already migrated.',
      },
      {
        id: 'mod-encounter',
        moduleKey: 'clinical-workflow',
        moduleName: 'Clinical Workflow',
        description: 'Encounter management, clinical notes, vitals recording, and care plan documentation.',
        layer: 1,
        layerName: 'Domain',
        priority: 'critical',
        estimatedDays: 21,
        tables: JSON.stringify(['Encounter', 'Observation', 'Condition', 'Procedure']),
        dependsOn: JSON.stringify(['patient-management', 'provider-management']),
        features: JSON.stringify(['Encounter Creation', 'Vitals Entry', 'Clinical Notes', 'Care Plans', 'Discharge Summary']),
        userRoles: JSON.stringify(['Nurse', 'Physician', 'Resident']),
        revenue: true,
        status: 'linked',
        progress: 72,
        assignedTo: 'Team Alpha',
        notes: 'Encounter and Observation tables linked. Procedure table pending.',
      },
      {
        id: 'mod-orders',
        moduleKey: 'order-management',
        moduleName: 'Order Management',
        description: 'CPOE — Computerized Provider Order Entry for lab, radiology, and medication orders.',
        layer: 2,
        layerName: 'Application',
        priority: 'critical',
        estimatedDays: 28,
        tables: JSON.stringify(['Order', 'Result', 'DiagnosticReport']),
        dependsOn: JSON.stringify(['patient-management', 'clinical-workflow']),
        features: JSON.stringify(['Order Entry', 'Result Viewing', 'Critical Value Alerts', 'Order Sets', 'Batch Ordering']),
        userRoles: JSON.stringify(['Physician', 'Nurse', 'Lab Technician']),
        revenue: true,
        status: 'linked',
        progress: 60,
        assignedTo: 'Team Beta',
        notes: 'Order and Result tables migrated. DiagnosticReport in progress.',
      },
      {
        id: 'mod-provider',
        moduleKey: 'provider-management',
        moduleName: 'Provider Management',
        description: 'Practitioner profiles, scheduling, credentials, and department assignments.',
        layer: 1,
        layerName: 'Domain',
        priority: 'high',
        estimatedDays: 10,
        tables: JSON.stringify(['Practitioner', 'Organization']),
        dependsOn: JSON.stringify([]),
        features: JSON.stringify(['Provider Directory', 'Credential Tracking', 'Schedule Management', 'Department Assignment']),
        userRoles: JSON.stringify(['HR', 'Department Head', 'Admin']),
        revenue: false,
        status: 'linked',
        progress: 90,
        assignedTo: 'Team Alpha',
        notes: 'Nearly complete — Organization self-referencing FK resolved.',
      },
      {
        id: 'mod-pharmacy',
        moduleKey: 'pharmacy',
        moduleName: 'Pharmacy',
        description: 'Medication prescribing, dispensing, drug interactions, and formulary management.',
        layer: 2,
        layerName: 'Application',
        priority: 'high',
        estimatedDays: 18,
        tables: JSON.stringify(['MedicationRequest']),
        dependsOn: JSON.stringify(['patient-management', 'order-management']),
        features: JSON.stringify(['e-Prescribing', 'Drug Interaction Check', 'Formulary Search', 'Dispensing Queue']),
        userRoles: JSON.stringify(['Physician', 'Pharmacist', 'Nurse']),
        revenue: true,
        status: 'pending',
        progress: 25,
        assignedTo: 'Team Gamma',
        notes: 'MedicationRequest table linked. Dispensing and interaction tables not yet migrated.',
      },
      {
        id: 'mod-admin',
        moduleKey: 'administration',
        moduleName: 'Administration',
        description: 'Facility management, locations, departments, and organizational hierarchy.',
        layer: 3,
        layerName: 'Infrastructure',
        priority: 'medium',
        estimatedDays: 8,
        tables: JSON.stringify(['Location']),
        dependsOn: JSON.stringify(['provider-management']),
        features: JSON.stringify(['Location Management', 'Department Setup', 'Bed Management', 'Facility Directory']),
        userRoles: JSON.stringify(['Admin', 'Facility Manager']),
        revenue: false,
        status: 'linked',
        progress: 95,
        assignedTo: 'Team Beta',
        notes: 'Location table migrated and verified.',
      },
      {
        id: 'mod-specimen',
        moduleKey: 'specimen-management',
        moduleName: 'Specimen Management',
        description: 'Specimen collection, tracking, labeling, and chain-of-custody for lab specimens.',
        layer: 2,
        layerName: 'Application',
        priority: 'high',
        estimatedDays: 12,
        tables: JSON.stringify(['Specimen']),
        dependsOn: JSON.stringify(['patient-management', 'order-management']),
        features: JSON.stringify(['Specimen Collection', 'Label Printing', 'Chain of Custody', 'Specimen Status Tracking']),
        userRoles: JSON.stringify(['Phlebotomist', 'Lab Technician', 'Nurse']),
        revenue: true,
        status: 'linked',
        progress: 78,
        assignedTo: 'Team Gamma',
        notes: 'Specimen table fully linked to Patient and Order.',
      },
      {
        id: 'mod-lab-config',
        moduleKey: 'lab-configuration',
        moduleName: 'Lab Configuration',
        description: 'Test catalog management, reference ranges, quality control rules, and instrument interfaces.',
        layer: 3,
        layerName: 'Infrastructure',
        priority: 'medium',
        estimatedDays: 15,
        tables: JSON.stringify(['LabTestCatalog', 'LabResult']),
        dependsOn: JSON.stringify(['specimen-management']),
        features: JSON.stringify(['Test Catalog', 'Reference Range Config', 'QC Rules', 'Instrument Interface Setup']),
        userRoles: JSON.stringify(['Lab Manager', 'Lab Technician', 'Pathologist']),
        revenue: false,
        status: 'pending',
        progress: 40,
        assignedTo: 'Team Gamma',
        notes: 'LabTestCatalog table linked. LabResult migration in progress.',
      },
      {
        id: 'mod-result-entry',
        moduleKey: 'result-entry',
        moduleName: 'Result Entry & Verification',
        description: 'Manual and automated result entry, verification workflows, and critical value notification.',
        layer: 2,
        layerName: 'Application',
        priority: 'high',
        estimatedDays: 20,
        tables: JSON.stringify(['LabResult']),
        dependsOn: JSON.stringify(['specimen-management', 'lab-configuration']),
        features: JSON.stringify(['Manual Result Entry', 'Auto-verification', 'Critical Value Alerts', 'Result Amendment']),
        userRoles: JSON.stringify(['Lab Technician', 'Pathologist']),
        revenue: true,
        status: 'unlinked',
        progress: 15,
        assignedTo: null,
        notes: 'Pending team assignment. LabResult table needs FK to Specimen verified.',
      },
    ]

    for (const m of modules) {
      try {
        await db.hISModule.create({ data: { ...m, updatedAt: new Date() } })
        results.modules++
      } catch {
        // Already exists — skip
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. AGENT RUNS
    // ═══════════════════════════════════════════════════════════════════════

    const now = new Date()
    const agentRuns = [
      {
        id: 'ar-001',
        projectId: coreProjectId,
        runId: 'run-schema-parser-' + randomUUID().slice(0, 8),
        agentName: 'schema-parser',
        agentVersion: '1.2.0',
        status: 'completed',
        startedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3h ago
        completedAt: new Date(now.getTime() - 2 * 55 * 60 * 1000),
        duration: 300000, // 5 min
        inputConfig: JSON.stringify({ filePath: 'schema-core.sql', format: 'tsql' }),
        outputData: JSON.stringify({ tablesFound: 12, proceduresFound: 5, warnings: 1 }),
        itemsProcessed: 17,
        itemsProduced: 17,
      },
      {
        id: 'ar-002',
        projectId: coreProjectId,
        runId: 'run-fk-resolver-' + randomUUID().slice(0, 8),
        agentName: 'fk-resolver',
        agentVersion: '1.0.3',
        status: 'completed',
        startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2h ago
        completedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 120000),
        duration: 120000, // 2 min
        inputConfig: JSON.stringify({ projectId: coreProjectId, strategy: 'name-matching' }),
        outputData: JSON.stringify({ resolved: 18, missing: 2, blocked: 0 }),
        itemsProcessed: 20,
        itemsProduced: 18,
      },
      {
        id: 'ar-003',
        projectId: labProjectId,
        runId: 'run-schema-parser-lab-' + randomUUID().slice(0, 8),
        agentName: 'schema-parser',
        agentVersion: '1.2.0',
        status: 'completed',
        startedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5h ago
        completedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000 + 180000),
        duration: 180000, // 3 min
        inputConfig: JSON.stringify({ filePath: 'schema-lab.sql', format: 'tsql' }),
        outputData: JSON.stringify({ tablesFound: 6, proceduresFound: 2, warnings: 0 }),
        itemsProcessed: 8,
        itemsProduced: 8,
      },
      {
        id: 'ar-004',
        projectId: coreProjectId,
        runId: 'run-module-matcher-' + randomUUID().slice(0, 8),
        agentName: 'module-matcher',
        agentVersion: '1.1.0',
        status: 'completed',
        startedAt: new Date(now.getTime() - 90 * 60 * 1000), // 1.5h ago
        completedAt: new Date(now.getTime() - 90 * 60 * 1000 + 240000),
        duration: 240000, // 4 min
        inputConfig: JSON.stringify({ projectId: coreProjectId, domain: 'healthcare' }),
        outputData: JSON.stringify({ matched: 10, unmatched: 2, confidence: 0.87 }),
        itemsProcessed: 12,
        itemsProduced: 10,
      },
      {
        id: 'ar-005',
        projectId: coreProjectId,
        runId: 'run-code-generator-' + randomUUID().slice(0, 8),
        agentName: 'code-generator',
        agentVersion: '2.0.0',
        status: 'running',
        startedAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 min ago
        completedAt: null,
        duration: null,
        inputConfig: JSON.stringify({ projectId: coreProjectId, target: 'prisma', module: 'patient-management' }),
        outputData: JSON.stringify({ progress: '65%', filesGenerated: 4, totalFiles: 6 }),
        itemsProcessed: 4,
        itemsProduced: 4,
      },
      {
        id: 'ar-006',
        projectId: labProjectId,
        runId: 'run-fk-resolver-lab-' + randomUUID().slice(0, 8),
        agentName: 'fk-resolver',
        agentVersion: '1.0.3',
        status: 'failed',
        startedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4h ago
        completedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000 + 30000),
        duration: 30000, // 30s
        inputConfig: JSON.stringify({ projectId: labProjectId, strategy: 'name-matching' }),
        outputData: JSON.stringify({}),
        itemsProcessed: 0,
        itemsProduced: 0,
        error: 'FKResolutionError: Unable to resolve LabResult.SpecimenId — cross-project reference detected.',
        errorStack: 'FKResolutionError: Unable to resolve LabResult.SpecimenId\n  at resolveFK (fk-resolver.ts:142)\n  at processTable (fk-resolver.ts:89)\n  at runPipeline (pipeline.ts:201)',
      },
    ]

    for (const ar of agentRuns) {
      try {
        await db.agentRun.create({ data: { ...ar, updatedAt: new Date() } })
        results.agentRuns++
      } catch {
        // Already exists — skip
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DONE
    // ═══════════════════════════════════════════════════════════════════════

    return NextResponse.json({
      success: true,
      message: `Database seeded successfully: ${results.projects} projects, ${results.tables} tables, ${results.procedures} procedures, ${results.modules} modules, ${results.agentRuns} agent runs`,
      counts: results,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown seed error',
      },
      { status: 500 },
    )
  }
}
