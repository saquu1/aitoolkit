'use client';

// =============================================================================
// Verification Workflow UI - Complete Verification Management Interface
// =============================================================================
// Provides UI for reviewing and resolving verification items
// =============================================================================

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Search, 
  ChevronRight,
  FileText,
  Database,
  Link2,
  Shield,
  RefreshCw,
  Check,
  X,
  MessageSquare,
  ArrowRight,
  Loader2,
  Eye
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface VerificationItem {
  id: string;
  entityType: 'table' | 'column' | 'relationship' | 'endpoint';
  entityId: string;
  entityName: string;
  verificationType: 'source' | 'relationship' | 'business_rule' | 'data_classification';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'verified' | 'rejected' | 'escalated' | 'in_progress';
  triggerSource: string;
  triggerDetails: string;
  aiSuggestion?: string;
  aiConfidence: number;
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  reviewNotes?: string;
}

export interface VerificationStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  escalated: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
}

export interface VerificationTableDetails {
  tableName: string;
  sourceType: string;
  sourceFile: string;
  confidence: number;
  columns: Array<{
    name: string;
    type: string;
    isFK: boolean;
    fkTarget?: string;
  }>;
  foreignKeys: Array<{
    column: string;
    referencesTable: string;
    referencesColumn: string;
    status: 'resolved' | 'pending' | 'missing_table';
  }>;
  spAvailability: {
    hasCreate: boolean;
    hasRead: boolean;
    hasUpdate: boolean;
    hasDelete: boolean;
  };
  issues: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
}

// =============================================================================
// Main Component
// =============================================================================

export function VerificationWorkflowUI({ projectId }: { projectId: string }) {
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(null);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'pending',
    priority: 'all',
    type: 'all',
    search: ''
  });

  // Fetch verification data
  useEffect(() => {
    fetchVerificationData();
  }, [projectId]);

  const fetchVerificationData = async () => {
    setLoading(true);
    try {
      // Mock data for now - replace with actual API call
      const mockStats: VerificationStats = {
        total: 12,
        pending: 5,
        verified: 5,
        rejected: 1,
        escalated: 1,
        byPriority: { critical: 1, high: 2, medium: 2, low: 0 },
        byType: { table: 3, column: 1, relationship: 1, endpoint: 0 }
      };

      const mockItems: VerificationItem[] = [
        {
          id: '1',
          entityType: 'table',
          entityId: 't1',
          entityName: 'Patients',
          verificationType: 'source',
          priority: 'critical',
          status: 'pending',
          triggerSource: 'auto_discovery',
          triggerDetails: 'Table discovered from CSHTML only, no DDL definition found',
          aiSuggestion: 'Upload SQL DDL file for the Patients table',
          aiConfidence: 0.85,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          entityType: 'table',
          entityId: 't2',
          entityName: 'Organizations',
          verificationType: 'source',
          priority: 'high',
          status: 'pending',
          triggerSource: 'sp_discovery',
          triggerDetails: 'Table referenced in sp_GetOrganizationList but not found in DDL',
          aiSuggestion: 'Verify if Organizations table exists or needs to be created',
          aiConfidence: 0.75,
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '3',
          entityType: 'relationship',
          entityId: 'fk1',
          entityName: 'Visits.PatientId',
          verificationType: 'relationship',
          priority: 'medium',
          status: 'pending',
          triggerSource: 'conflict',
          triggerDetails: 'FK references Patients table but column type mismatch detected',
          aiConfidence: 0.6,
          createdAt: new Date(Date.now() - 7200000).toISOString()
        }
      ];

      setStats(mockStats);
      setItems(mockItems);
    } catch (error) {
      console.error('Failed to fetch verification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (item: VerificationItem, action: 'approve' | 'reject' | 'escalate', notes?: string) => {
    try {
      // Update local state
      setItems(prev => prev.filter(i => i.id !== item.id));
      setSelectedItem(null);
      
      if (stats) {
        setStats({
          ...stats,
          pending: stats.pending - 1,
          [action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : 'escalated']: 
            (stats[action === 'approve' ? 'verified' : action === 'reject' ? 'rejected' : 'escalated'] || 0) + 1
        });
      }
    } catch (error) {
      console.error('Verification failed:', error);
    }
  };

  const filteredItems = items.filter(item => {
    if (filter.priority !== 'all' && item.priority !== filter.priority) return false;
    if (filter.type !== 'all' && item.entityType !== filter.type) return false;
    if (filter.search && !item.entityName.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Verification Workflow</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and resolve schema verification items
            </p>
          </div>
          <button
            onClick={fetchVerificationData}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="flex gap-4 mt-4">
            <StatCard label="Pending" value={stats.pending} icon={Clock} color="yellow" />
            <StatCard label="Critical" value={stats.byPriority?.critical || 0} icon={AlertTriangle} color="red" />
            <StatCard label="Verified" value={stats.verified} icon={CheckCircle} color="green" />
            <StatCard label="Escalated" value={stats.escalated} icon={MessageSquare} color="purple" />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Queue */}
        <div className="w-2/5 border-r bg-white flex flex-col">
          {/* Filters */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tables..."
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filter.priority}
                onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value }))}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              <select
                value={filter.type}
                onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="table">Tables</option>
                <option value="column">Columns</option>
                <option value="relationship">Relationships</option>
              </select>
            </div>
          </div>

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm">No items pending verification</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredItems.map(item => (
                  <VerificationQueueItem
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Details */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedItem ? (
            <VerificationDetailsPanel
              item={selectedItem}
              onVerify={handleVerify}
              onClose={() => setSelectedItem(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Select an item to review</p>
                <p className="text-sm">Choose from the queue on the left</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: number; 
  icon: React.ElementType;
  color: 'yellow' | 'red' | 'green' | 'purple';
}) {
  const colorClasses = {
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colorClasses[color]}`}>
      <Icon className="w-5 h-5" />
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}

function VerificationQueueItem({ 
  item, 
  isSelected, 
  onClick 
}: { 
  item: VerificationItem; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const priorityColors = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-700',
  };

  const typeIcons = {
    table: Database,
    column: FileText,
    relationship: Link2,
    endpoint: Shield,
  };

  const TypeIcon = typeIcons[item.entityType] || Database;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 hover:bg-gray-50 transition ${
        isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${priorityColors[item.priority]}`}>
          <TypeIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">
              {item.entityName}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${priorityColors[item.priority]}`}>
              {item.priority}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate mt-1">
            {item.triggerDetails}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <span>{item.verificationType.replace(/_/g, ' ')}</span>
            <span>•</span>
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </button>
  );
}

function VerificationDetailsPanel({ 
  item, 
  onVerify,
  onClose 
}: { 
  item: VerificationItem;
  onVerify: (item: VerificationItem, action: 'approve' | 'reject' | 'escalate', notes?: string) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleAction = async (action: 'approve' | 'reject' | 'escalate') => {
    setProcessing(true);
    await onVerify(item, action, notes);
    setProcessing(false);
  };

  // Mock details
  const details: VerificationTableDetails = {
    tableName: item.entityName,
    sourceType: item.triggerSource,
    sourceFile: 'unknown.sql',
    confidence: item.aiConfidence,
    columns: [
      { name: 'Id', type: 'INT', isFK: false },
      { name: 'Name', type: 'NVARCHAR(255)', isFK: false },
      { name: 'CreatedDate', type: 'DATETIME', isFK: false },
    ],
    foreignKeys: [],
    spAvailability: { hasCreate: false, hasRead: true, hasUpdate: false, hasDelete: false },
    issues: [{ type: 'missing_ddl', severity: 'high', description: item.triggerDetails }]
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{item.entityName}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {item.entityType} • {item.verificationType.replace(/_/g, ' ')}
            </p>
          </div>
          <span className={`px-3 py-1 text-sm rounded-full ${
            item.priority === 'critical' ? 'bg-red-100 text-red-700' :
            item.priority === 'high' ? 'bg-orange-100 text-orange-700' :
            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {item.priority} priority
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Issue Description */}
        <div className="bg-white rounded-lg border p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Issue Description</h3>
          <p className="text-gray-900">{item.triggerDetails}</p>
          <p className="text-sm text-gray-500 mt-2">
            Triggered by: {item.triggerSource}
          </p>
        </div>

        {/* AI Suggestion */}
        {item.aiSuggestion && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-medium text-blue-700">AI Suggestion</h3>
              <span className="ml-auto text-xs text-blue-600">
                {Math.round(item.aiConfidence * 100)}% confidence
              </span>
            </div>
            <p className="text-sm text-blue-900">{item.aiSuggestion}</p>
          </div>
        )}

        {/* Source Info */}
        <div className="bg-white rounded-lg border p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Source Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Source Type:</span>
              <span className="ml-2 font-medium">{details.sourceType}</span>
            </div>
            <div>
              <span className="text-gray-500">Confidence:</span>
              <span className="ml-2 font-medium">{Math.round(details.confidence * 100)}%</span>
            </div>
            <div>
              <span className="text-gray-500">Columns:</span>
              <span className="ml-2 font-medium">{details.columns.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Entity Type:</span>
              <span className="ml-2 font-medium">{item.entityType}</span>
            </div>
          </div>
        </div>

        {/* SP Availability */}
        <div className="bg-white rounded-lg border p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">SP Availability</h3>
          <div className="flex gap-2 flex-wrap">
            <Badge active={details.spAvailability.hasCreate} label="Create" />
            <Badge active={details.spAvailability.hasRead} label="Read" />
            <Badge active={details.spAvailability.hasUpdate} label="Update" />
            <Badge active={details.spAvailability.hasDelete} label="Delete" />
          </div>
        </div>

        {/* Review Notes */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this verification..."
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t bg-white">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => handleAction('escalate')}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition disabled:opacity-50"
            >
              <MessageSquare className="w-4 h-4" />
              Escalate
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={() => handleAction('approve')}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${
      active 
        ? 'bg-green-100 text-green-700' 
        : 'bg-gray-100 text-gray-500'
    }`}>
      {active ? '✓' : '✗'} {label}
    </span>
  );
}

export default VerificationWorkflowUI;
