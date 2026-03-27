'use client'

/**
 * Conflict Resolution Center
 * UI for resolving extraction conflicts
 * 
 * TASK-4.4: Missing UI Screens
 * Part of Phase 4: Features & User Experience
 */

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  AlertTriangle,
  Check,
  X,
  Merge,
  ChevronRight,
  Filter,
  Clock,
  User,
  ArrowRightLeft,
  Layers,
  Tag
} from 'lucide-react'

// Types
interface Conflict {
  id: string
  type: 'type_mismatch' | 'naming_conflict' | 'constraint_conflict' | 'value_mismatch' | 'reference_conflict'
  entity: string
  entityType: 'table' | 'column' | 'fk' | 'sp' | 'view'
  field: string
  sources: Array<{
    id: string
    name: string
    value: any
    confidence: number
    timestamp: Date
  }>
  suggestedResolution: 'highest_confidence' | 'most_recent' | 'merge' | 'manual'
  suggestedValue?: any
  status: 'pending' | 'resolved' | 'dismissed'
  priority: 'critical' | 'high' | 'medium' | 'low'
  notes?: string
}

// Mock conflicts
const mockConflicts: Conflict[] = [
  {
    id: '1',
    type: 'type_mismatch',
    entity: 'Patients.PhoneNumber',
    entityType: 'column',
    field: 'dataType',
    sources: [
      { id: 'ddl', name: 'SQL DDL', value: 'VARCHAR(20)', confidence: 0.95, timestamp: new Date(Date.now() - 3600000) },
      { id: 'sp', name: 'Stored Proc', value: 'VARCHAR(50)', confidence: 0.75, timestamp: new Date(Date.now() - 1800000) }
    ],
    suggestedResolution: 'highest_confidence',
    suggestedValue: 'VARCHAR(20)',
    status: 'pending',
    priority: 'high',
    notes: 'SP might handle international numbers'
  },
  {
    id: '2',
    type: 'naming_conflict',
    entity: 'VisitDate',
    entityType: 'column',
    field: 'name',
    sources: [
      { id: 'ddl', name: 'SQL DDL', value: 'VisitDate', confidence: 0.85, timestamp: new Date(Date.now() - 3600000) },
      { id: 'cshtml', name: 'CSHTML Form', value: 'visit_date', confidence: 0.70, timestamp: new Date(Date.now() - 1800000) }
    ],
    suggestedResolution: 'highest_confidence',
    suggestedValue: 'VisitDate',
    status: 'pending',
    priority: 'medium'
  },
  {
    id: '3',
    type: 'constraint_conflict',
    entity: 'Orders.PatientId',
    entityType: 'fk',
    field: 'nullable',
    sources: [
      { id: 'ddl', name: 'SQL DDL', value: false, confidence: 0.90, timestamp: new Date(Date.now() - 3600000) },
      { id: 'sp', name: 'SP Analysis', value: true, confidence: 0.60, timestamp: new Date(Date.now() - 1800000) }
    ],
    suggestedResolution: 'highest_confidence',
    suggestedValue: false,
    status: 'pending',
    priority: 'critical',
    notes: 'SP might insert orders before patient is assigned'
  }
]

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  type_mismatch: ArrowRightLeft,
  naming_conflict: Tag,
  constraint_conflict: Layers,
  value_mismatch: Merge,
  reference_conflict: ChevronRight
}

export function ConflictResolutionCenter() {
  const [conflicts, setConflicts] = useState<Conflict[]>(mockConflicts)
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(mockConflicts[0])
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending')
  const [resolution, setResolution] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Filtered conflicts
  const filteredConflicts = conflicts.filter(c => filter === 'all' || c.status === filter)

  // Stats
  const stats = {
    total: conflicts.length,
    pending: conflicts.filter(c => c.status === 'pending').length,
    resolved: conflicts.filter(c => c.status === 'resolved').length,
    critical: conflicts.filter(c => c.priority === 'critical' && c.status === 'pending').length
  }

  // Handle resolve
  const handleResolve = useCallback((conflictId: string, accepted: boolean) => {
    setConflicts(prev => prev.map(c => {
      if (c.id === conflictId) {
        return {
          ...c,
          status: accepted ? 'resolved' : 'dismissed',
          notes: notes || c.notes
        }
      }
      return c
    }))

    // Move to next pending conflict
    const nextConflict = filteredConflicts.find(c => c.id !== conflictId && c.status === 'pending')
    setSelectedConflict(nextConflict || null)
    setNotes('')
  }, [filteredConflicts, notes])

  // Handle bulk resolve
  const handleBulkResolve = useCallback((acceptAll: boolean) => {
    setConflicts(prev => prev.map(c => {
      if (c.status === 'pending') {
        return {
          ...c,
          status: acceptAll ? 'resolved' : 'dismissed'
        }
      }
      return c
    }))
    setSelectedConflict(null)
  }, [])

  // Get selected conflict resolution value
  const getSelectedResolutionValue = useCallback(() => {
    if (!selectedConflict) return ''
    return selectedConflict.suggestedValue !== undefined
      ? String(selectedConflict.suggestedValue)
      : String(selectedConflict.sources[0]?.value || '')
  }, [selectedConflict])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Conflict Resolution</h2>
          <p className="text-slate-400 mt-1">Resolve extraction conflicts from multiple sources</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleBulkResolve(true)}
            disabled={stats.pending === 0}
          >
            <Check className="w-4 h-4 mr-2" />
            Accept All
          </Button>
          <Button
            variant="outline"
            onClick={() => handleBulkResolve(false)}
            disabled={stats.pending === 0}
          >
            <X className="w-4 h-4 mr-2" />
            Dismiss All
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
            <div className="text-sm text-slate-400">Total Conflicts</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-sm text-slate-400">Pending</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-400">{stats.resolved}</div>
            <div className="text-sm text-slate-400">Resolved</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
            <div className="text-sm text-slate-400">Critical</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex gap-4 h-[calc(100vh-400px)]">
        {/* Conflict List */}
        <div className="w-96 border border-slate-700 rounded-lg bg-slate-800/50 flex flex-col">
          <div className="p-3 border-b border-slate-700 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {filteredConflicts.map(conflict => {
                const TypeIcon = TYPE_ICONS[conflict.type] || AlertTriangle
                const isSelected = selectedConflict?.id === conflict.id

                return (
                  <button
                    key={conflict.id}
                    onClick={() => setSelectedConflict(conflict)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-purple-500/20 border-purple-500/30'
                        : 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <TypeIcon className="w-4 h-4 mt-0.5 text-yellow-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-200 truncate">
                            {conflict.entity}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${PRIORITY_COLORS[conflict.priority]}`}
                          >
                            {conflict.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400 truncate">
                          {conflict.field}: {conflict.type.replace('_', ' ')}
                        </p>
                        {conflict.status === 'resolved' && (
                          <Badge variant="secondary" className="text-xs mt-1 bg-green-500/20 text-green-400">
                            Resolved
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Conflict Detail */}
        {selectedConflict ? (
          <div className="flex-1 border border-slate-700 rounded-lg bg-slate-800/50 flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">
                    {selectedConflict.entity}
                  </h3>
                  <p className="text-sm text-slate-400">
                    Field: {selectedConflict.field}
                  </p>
                </div>
                <Badge className={PRIORITY_COLORS[selectedConflict.priority]}>
                  {selectedConflict.priority} priority
                </Badge>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Sources */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Conflicting Values</h4>
                  <div className="space-y-2">
                    {selectedConflict.sources.map((source, idx) => (
                      <div
                        key={source.id}
                        className={`p-3 rounded-lg border ${
                          source.confidence === Math.max(...selectedConflict.sources.map(s => s.confidence))
                            ? 'border-green-500/30 bg-green-500/10'
                            : 'border-slate-600 bg-slate-700/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-slate-200">{source.name}</span>
                            <div className="text-sm text-slate-400 mt-1">
                              Value: <code className="text-purple-300">{String(source.value)}</code>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-slate-400">
                              Confidence: {(source.confidence * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-slate-500">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {source.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Resolution */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Suggested Resolution</h4>
                  <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {selectedConflict.suggestedResolution.replace('_', ' ')}
                      </Badge>
                    </div>
                    <code className="text-purple-300">
                      {String(selectedConflict.suggestedValue || selectedConflict.sources[0]?.value)}
                    </code>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Notes</h4>
                  <Textarea
                    placeholder="Add resolution notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-slate-700/30 border-slate-600 min-h-24"
                  />
                </div>
              </div>
            </ScrollArea>

            {/* Actions */}
            {selectedConflict.status === 'pending' && (
              <div className="p-4 border-t border-slate-700 flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleResolve(selectedConflict.id, true)}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Accept Resolution
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleResolve(selectedConflict.id, false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 border border-slate-700 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No conflict selected</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConflictResolutionCenter
