'use client';

// =============================================================================
// Verification Table Details - Detailed View for Table Verification
// =============================================================================
// Shows comprehensive table information for verification decisions
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  Database,
  FileText,
  Link2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface TableVerificationDetails {
  tableName: string;
  schemaName: string;
  source: {
    type: 'ddl' | 'cshtml' | 'sp_discovery' | 'mixed';
    files: string[];
    confidence: number;
  };
  columns: Array<{
    name: string;
    dataType: string;
    isNullable: boolean;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    fkTarget?: string;
    source: 'ddl' | 'cshtml' | 'sp';
    status: 'verified' | 'inferred' | 'conflict';
  }>;
  foreignKeys: Array<{
    columnName: string;
    referencesTable: string;
    referencesColumn: string;
    status: 'resolved' | 'pending' | 'missing_table' | 'type_mismatch';
  }>;
  spMappings: Array<{
    spName: string;
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    confidence: number;
  }>;
  uiComponents: Array<{
    type: 'form' | 'datatable' | 'dropdown';
    sourceFile: string;
  }>;
  issues: Array<{
    id: string;
    type: 'missing_ddl' | 'missing_sp' | 'column_conflict' | 'fk_issue';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    suggestion: string;
  }>;
  completeness: number;
  aiAnalysis?: {
    suggestedAction: string;
    estimatedImpact: 'low' | 'medium' | 'high';
    relatedTables: string[];
  };
}

export interface VerificationTableDetailsProps {
  projectId: string;
  tableName: string;
  onApprove?: () => void;
  onReject?: () => void;
  onEscalate?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function VerificationTableDetails({
  projectId,
  tableName,
  onApprove,
  onReject,
  onEscalate
}: VerificationTableDetailsProps) {
  const [details, setDetails] = useState<TableVerificationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['issues', 'columns'])
  );

  useEffect(() => {
    fetchDetails();
  }, [projectId, tableName]);

  const fetchDetails = async () => {
    setLoading(true);
    // Mock data - replace with actual API call
    setTimeout(() => {
      const mockDetails: TableVerificationDetails = {
        tableName,
        schemaName: 'dbo',
        source: {
          type: 'mixed',
          files: ['Patients_Create.sql', 'Patients/Edit.cshtml'],
          confidence: 0.75
        },
        columns: [
          { name: 'Id', dataType: 'INT', isNullable: false, isPrimaryKey: true, isForeignKey: false, source: 'ddl', status: 'verified' },
          { name: 'Name', dataType: 'NVARCHAR(100)', isNullable: false, isPrimaryKey: false, isForeignKey: false, source: 'ddl', status: 'verified' },
          { name: 'DateOfBirth', dataType: 'DATE', isNullable: true, isPrimaryKey: false, isForeignKey: false, source: 'ddl', status: 'verified' },
          { name: 'Gender', dataType: 'CHAR(1)', isNullable: true, isPrimaryKey: false, isForeignKey: false, source: 'ddl', status: 'verified' },
          { name: 'Phone', dataType: 'NVARCHAR(20)', isNullable: true, isPrimaryKey: false, isForeignKey: false, source: 'cshtml', status: 'inferred' },
          { name: 'Email', dataType: 'NVARCHAR(255)', isNullable: true, isPrimaryKey: false, isForeignKey: false, source: 'cshtml', status: 'inferred' },
          { name: 'OrganizationId', dataType: 'INT', isNullable: true, isPrimaryKey: false, isForeignKey: true, fkTarget: 'Organizations', source: 'cshtml', status: 'inferred' },
        ],
        foreignKeys: [
          { columnName: 'OrganizationId', referencesTable: 'Organizations', referencesColumn: 'Id', status: 'missing_table' }
        ],
        spMappings: [
          { spName: 'sp_Patients_GetAll', operation: 'SELECT', confidence: 0.95 },
          { spName: 'sp_Patients_Create', operation: 'INSERT', confidence: 0.90 },
          { spName: 'sp_Patients_Update', operation: 'UPDATE', confidence: 0.85 },
        ],
        uiComponents: [
          { type: 'form', sourceFile: 'Patients/Edit.cshtml' },
          { type: 'datatable', sourceFile: 'Patients/Index.cshtml' }
        ],
        issues: [
          {
            id: 'i1',
            type: 'missing_ddl',
            severity: 'high',
            description: 'Phone and Email columns not in DDL, inferred from CSHTML',
            suggestion: 'Add Phone and Email columns to DDL or remove from form'
          },
          {
            id: 'i2',
            type: 'fk_issue',
            severity: 'critical',
            description: 'FK OrganizationId references missing table Organizations',
            suggestion: 'Create Organizations table or upload DDL'
          }
        ],
        completeness: 65,
        aiAnalysis: {
          suggestedAction: 'Create Organizations table first, then add missing columns to DDL',
          estimatedImpact: 'high',
          relatedTables: ['Organizations', 'Visits']
        }
      };

      setDetails(mockDetails);
      setLoading(false);
    }, 500);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>Table not found</p>
      </div>
    );
  }

  const severityColors = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-700'
  };

  const statusIcons = {
    verified: <CheckCircle className="w-4 h-4 text-green-500" />,
    inferred: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    conflict: <XCircle className="w-4 h-4 text-red-500" />,
    resolved: <CheckCircle className="w-4 h-4 text-green-500" />,
    pending: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    missing_table: <XCircle className="w-4 h-4 text-red-500" />,
    type_mismatch: <AlertTriangle className="w-4 h-4 text-orange-500" />
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{details.tableName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Schema: {details.schemaName} • Source: {details.source.type}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{details.completeness}%</div>
            <p className="text-xs text-gray-500">Completeness</p>
          </div>
        </div>

        {/* Source Files */}
        <div className="mt-4 flex flex-wrap gap-2">
          {details.source.files.map((file, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
              <FileText className="w-3 h-3" />
              {file}
            </span>
          ))}
        </div>
      </div>

      {/* Issues */}
      {details.issues.length > 0 && (
        <Section
          title="Issues"
          count={details.issues.length}
          expanded={expandedSections.has('issues')}
          onToggle={() => toggleSection('issues')}
        >
          <div className="space-y-2">
            {details.issues.map(issue => (
              <div key={issue.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${severityColors[issue.severity]}`}>
                  {issue.severity}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{issue.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{issue.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* AI Analysis */}
      {details.aiAnalysis && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h3 className="text-sm font-medium text-blue-700 mb-2">AI Analysis</h3>
          <p className="text-sm text-blue-900">{details.aiAnalysis.suggestedAction}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-blue-600">
            <span>Impact: <strong>{details.aiAnalysis.estimatedImpact}</strong></span>
            <span>Related: {details.aiAnalysis.relatedTables.join(', ')}</span>
          </div>
        </div>
      )}

      {/* Columns */}
      <Section
        title="Columns"
        count={details.columns.length}
        expanded={expandedSections.has('columns')}
        onToggle={() => toggleSection('columns')}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Column</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Type</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Source</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Flags</th>
              </tr>
            </thead>
            <tbody>
              {details.columns.map((col, idx) => (
                <tr key={idx} className="border-b last:border-b-0">
                  <td className="py-2 px-3 font-mono">{col.name}</td>
                  <td className="py-2 px-3 text-gray-600">{col.dataType}</td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 text-xs bg-gray-100 rounded">
                      {col.source}
                    </span>
                  </td>
                  <td className="py-2 px-3">{statusIcons[col.status]}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      {col.isPrimaryKey && (
                        <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">PK</span>
                      )}
                      {col.isForeignKey && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                          FK → {col.fkTarget}
                        </span>
                      )}
                      {col.isNullable && (
                        <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">NULL</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Foreign Keys */}
      {details.foreignKeys.length > 0 && (
        <Section
          title="Foreign Keys"
          count={details.foreignKeys.length}
          expanded={expandedSections.has('fks')}
          onToggle={() => toggleSection('fks')}
        >
          <div className="space-y-2">
            {details.foreignKeys.map((fk, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <Link2 className="w-4 h-4 text-gray-400" />
                <span className="font-mono text-sm">{fk.columnName}</span>
                <span className="text-gray-400">→</span>
                <span className="font-mono text-sm text-blue-600">
                  {fk.referencesTable}.{fk.referencesColumn}
                </span>
                <span className="ml-auto">{statusIcons[fk.status]}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* SP Mappings */}
      {details.spMappings.length > 0 && (
        <Section
          title="SP Mappings"
          count={details.spMappings.length}
          expanded={expandedSections.has('sps')}
          onToggle={() => toggleSection('sps')}
        >
          <div className="grid grid-cols-2 gap-2">
            {details.spMappings.map((sp, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <Database className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-mono">{sp.spName}</span>
                <span className="ml-auto text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                  {sp.operation}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* UI Components */}
      {details.uiComponents.length > 0 && (
        <Section
          title="UI Components"
          count={details.uiComponents.length}
          expanded={expandedSections.has('ui')}
          onToggle={() => toggleSection('ui')}
        >
          <div className="flex flex-wrap gap-2">
            {details.uiComponents.map((comp, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                <FileText className="w-3 h-3" />
                {comp.type} ({comp.sourceFile})
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <button
          onClick={onEscalate}
          className="flex-1 px-4 py-2 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
        >
          Escalate
        </button>
        <button
          onClick={onReject}
          className="flex-1 px-4 py-2 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition"
        >
          Reject
        </button>
        <button
          onClick={onApprove}
          className="flex-1 px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
        >
          Approve
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

function Section({
  title,
  count,
  expanded,
  onToggle,
  children
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{title}</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default VerificationTableDetails;
