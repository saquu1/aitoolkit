'use client';

// =============================================================================
// Verification Queue - Lightweight Queue Display Component
// =============================================================================
// Displays verification queue with filtering and bulk actions
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface QueueItem {
  id: string;
  tableName: string;
  entityType: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'verified' | 'rejected';
  source: string;
  confidence: number;
  issue: string;
  createdAt: Date;
  selected?: boolean;
}

export interface VerificationQueueProps {
  projectId: string;
  onItemSelect?: (item: QueueItem) => void;
  onBulkAction?: (action: 'approve' | 'reject', items: QueueItem[]) => void;
}

// =============================================================================
// Component
// =============================================================================

export function VerificationQueue({ 
  projectId,
  onItemSelect,
  onBulkAction 
}: VerificationQueueProps) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    priority: 'all',
    status: 'pending'
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['critical', 'high']));
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, [projectId, filter]);

  const fetchQueue = async () => {
    setLoading(true);
    // Mock data - replace with actual API call
    setTimeout(() => {
      const mockItems: QueueItem[] = [
        {
          id: '1',
          tableName: 'Patients',
          entityType: 'table',
          priority: 'critical',
          status: 'pending',
          source: 'CSHTML inference',
          confidence: 0.65,
          issue: 'Missing DDL definition',
          createdAt: new Date()
        },
        {
          id: '2',
          tableName: 'Visits',
          entityType: 'table',
          priority: 'critical',
          status: 'pending',
          source: 'SP discovery',
          confidence: 0.70,
          issue: 'Table referenced in SP but not in DDL',
          createdAt: new Date(Date.now() - 3600000)
        },
        {
          id: '3',
          tableName: 'Organizations',
          entityType: 'table',
          priority: 'high',
          status: 'pending',
          source: 'CSHTML inference',
          confidence: 0.75,
          issue: 'Confidence below threshold',
          createdAt: new Date(Date.now() - 7200000)
        },
        {
          id: '4',
          tableName: 'Users',
          entityType: 'table',
          priority: 'medium',
          status: 'pending',
          source: 'Manual',
          confidence: 0.80,
          issue: 'FK column type mismatch',
          createdAt: new Date(Date.now() - 14400000)
        }
      ];

      setItems(mockItems.filter(item => {
        if (filter.priority !== 'all' && item.priority !== filter.priority) return false;
        if (filter.status !== 'all' && item.status !== filter.status) return false;
        return true;
      }));
      setLoading(false);
    }, 500);
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const toggleAll = () => {
    setSelectAll(!selectAll);
    setItems(prev => prev.map(item => ({ ...item, selected: !selectAll })));
  };

  const groupedItems = items.reduce((acc, item) => {
    const group = item.priority;
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, QueueItem[]>);

  const selectedItems = items.filter(i => i.selected);
  const priorityOrder = ['critical', 'high', 'medium', 'low'];

  const handleBulkApprove = () => {
    if (onBulkAction && selectedItems.length > 0) {
      onBulkAction('approve', selectedItems);
      setItems(prev => prev.filter(i => !i.selected));
    }
  };

  const handleBulkReject = () => {
    if (onBulkAction && selectedItems.length > 0) {
      onBulkAction('reject', selectedItems);
      setItems(prev => prev.filter(i => !i.selected));
    }
  };

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-gray-900">Verification Queue</h3>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
            {items.length} items
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchQueue}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center gap-3">
        <select
          value={filter.priority}
          onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value }))}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filter.status}
          onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <div className="px-4 py-2 border-b bg-blue-50 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedItems.length} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkApprove}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              <Check className="w-3 h-3" />
              Approve All
            </button>
            <button
              onClick={handleBulkReject}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              <X className="w-3 h-3" />
              Reject All
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
            <p className="text-sm">No items in queue</p>
          </div>
        ) : (
          <div className="divide-y">
            {/* Select All */}
            <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={toggleAll}
                className="rounded border-gray-300"
              />
              <span className="text-xs text-gray-500">Select all</span>
            </div>

            {/* Grouped Items */}
            {priorityOrder.map(priority => {
              const groupItems = groupedItems[priority];
              if (!groupItems || groupItems.length === 0) return null;

              const isExpanded = expandedGroups.has(priority);
              const priorityColors = {
                critical: 'text-red-600 bg-red-50',
                high: 'text-orange-600 bg-orange-50',
                medium: 'text-yellow-600 bg-yellow-50',
                low: 'text-gray-600 bg-gray-50'
              };

              return (
                <div key={priority}>
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(priority)}
                    className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${priorityColors[priority]}`}>
                        {priority}
                      </span>
                      <span className="text-sm text-gray-500">
                        {groupItems.length} items
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* Group Items */}
                  {isExpanded && (
                    <div className="bg-gray-50">
                      {groupItems.map(item => (
                        <div
                          key={item.id}
                          className="px-4 py-3 flex items-center gap-3 border-t hover:bg-gray-100 cursor-pointer"
                          onClick={() => onItemSelect?.(item)}
                        >
                          <input
                            type="checkbox"
                            checked={item.selected || false}
                            onChange={() => toggleItem(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-300"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {item.tableName}
                              </span>
                              <span className="text-xs text-gray-400">
                                {item.confidence * 100}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {item.issue}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              {item.source}
                            </span>
                            <Clock className="w-3 h-3 text-gray-300" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default VerificationQueue;
