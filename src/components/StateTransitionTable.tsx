'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/hooks/useTheme'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowRight,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  GitBranch,
  Download,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface WorkflowState {
  id: string
  name: string
  type: 'start' | 'end' | 'state' | 'decision' | 'parallel' | 'subprocess'
  description?: string
  actions?: string[]
  transitions?: string[]
}

interface WorkflowTransition {
  id: string
  from: string
  to: string
  label: string
  condition?: string
  trigger?: string
  auto?: boolean
}

interface WorkflowDefinition {
  id: string
  name: string
  description: string
  module: string
  states: WorkflowState[]
  transitions: WorkflowTransition[]
  initialState: string
  finalStates: string[]
}

interface StateTransitionTableProps {
  workflow: WorkflowDefinition
  onTransitionClick?: (transition: WorkflowTransition) => void
}

// State type styling
const stateTypeStyles: Record<string, { icon: any; color: string; label: string }> = {
  start: { icon: CheckCircle2, color: '#22C55E', label: 'Start' },
  end: { icon: XCircle, color: '#EF4444', label: 'End' },
  state: { icon: Clock, color: '#3B82F6', label: 'State' },
  decision: { icon: GitBranch, color: '#F59E0B', label: 'Decision' },
  parallel: { icon: GitBranch, color: '#8B5CF6', label: 'Parallel' },
  subprocess: { icon: GitBranch, color: '#06B6D4', label: 'Subprocess' }
}

export function StateTransitionTable({ workflow, onTransitionClick }: StateTransitionTableProps) {
  const { colors } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'transitions' | 'states' | 'matrix'>('transitions')
  
  // Build state lookup
  const stateLookup = useMemo(() => {
    const map: Record<string, WorkflowState> = {}
    workflow.states.forEach(s => map[s.id] = s)
    return map
  }, [workflow.states])
  
  // Build transition matrix
  const transitionMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, WorkflowTransition[]>> = {}
    workflow.states.forEach(s => {
      matrix[s.id] = {}
    })
    workflow.transitions.forEach(t => {
      if (!matrix[t.from][t.to]) matrix[t.from][t.to] = []
      matrix[t.from][t.to].push(t)
    })
    return matrix
  }, [workflow.states, workflow.transitions])
  
  // Filtered transitions
  const filteredTransitions = useMemo(() => {
    return workflow.transitions.filter(t => {
      const matchesSearch = searchQuery === '' || 
        t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.condition?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      
      const fromState = stateLookup[t.from]
      const matchesType = filterType === 'all' || fromState?.type === filterType
      
      return matchesSearch && matchesType
    })
  }, [workflow.transitions, searchQuery, filterType, stateLookup])
  
  // Group transitions by source state
  const groupedTransitions = useMemo(() => {
    const groups: Record<string, WorkflowTransition[]> = {}
    filteredTransitions.forEach(t => {
      if (!groups[t.from]) groups[t.from] = []
      groups[t.from].push(t)
    })
    return groups
  }, [filteredTransitions])
  
  // Toggle row expansion
  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }
  
  // Export as CSV
  const exportCSV = () => {
    let csv = 'From State,To State,Transition Label,Condition,Trigger,Auto\n'
    workflow.transitions.forEach(t => {
      csv += `"${t.from}","${t.to}","${t.label}","${t.condition || ''}","${t.trigger || ''}","${t.auto ? 'Yes' : 'No'}"\n`
    })
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflow.id}-transitions.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  // Render state badge
  const renderStateBadge = (stateId: string) => {
    const state = stateLookup[stateId]
    if (!state) return <span>{stateId}</span>
    
    const style = stateTypeStyles[state.type] || stateTypeStyles.state
    const Icon = style.icon
    
    return (
      <div className="flex items-center gap-2">
        <div 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: style.color }}
        />
        <span className="font-mono text-sm" style={{ color: colors.text }}>
          {state.name}
        </span>
        <Badge 
          variant="outline" 
          className="text-xs"
          style={{ borderColor: style.color, color: style.color }}
        >
          {style.label}
        </Badge>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
          <Input
            placeholder="Search transitions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            style={{ backgroundColor: colors.bg, borderColor: colors.border }}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant={viewMode === 'transitions' ? 'default' : 'outline'}
            onClick={() => setViewMode('transitions')}
          >
            Transitions
          </Button>
          <Button 
            size="sm" 
            variant={viewMode === 'states' ? 'default' : 'outline'}
            onClick={() => setViewMode('states')}
          >
            States
          </Button>
          <Button 
            size="sm" 
            variant={viewMode === 'matrix' ? 'default' : 'outline'}
            onClick={() => setViewMode('matrix')}
          >
            Matrix
          </Button>
        </div>
        
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1" />
          Export CSV
        </Button>
      </div>
      
      {/* Transitions View */}
      {viewMode === 'transitions' && (
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ color: colors.textMuted }}>From State</TableHead>
                <TableHead style={{ color: colors.textMuted, width: '50px' }}></TableHead>
                <TableHead style={{ color: colors.textMuted }}>To State</TableHead>
                <TableHead style={{ color: colors.textMuted }}>Label</TableHead>
                <TableHead style={{ color: colors.textMuted }}>Condition</TableHead>
                <TableHead style={{ color: colors.textMuted }}>Trigger</TableHead>
                <TableHead style={{ color: colors.textMuted }}>Auto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransitions.map((t, i) => (
                <TableRow 
                  key={t.id}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => onTransitionClick?.(t)}
                >
                  <TableCell>{renderStateBadge(t.from)}</TableCell>
                  <TableCell>
                    <ArrowRight className="w-4 h-4" style={{ color: colors.textMuted }} />
                  </TableCell>
                  <TableCell>{renderStateBadge(t.to)}</TableCell>
                  <TableCell>
                    <Badge 
                      style={{ 
                        backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                        color: colors.primary
                      }}
                    >
                      {t.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {t.condition ? (
                      <code 
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: `color-mix(in srgb, ${colors.warning} 20%, transparent)`,
                          color: colors.warning
                        }}
                      >
                        {t.condition}
                      </code>
                    ) : (
                      <span style={{ color: colors.textMuted }}>-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.trigger ? (
                      <code 
                        className="text-xs px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: `color-mix(in srgb, ${colors.accent} 20%, transparent)`,
                          color: colors.accent
                        }}
                      >
                        {t.trigger}
                      </code>
                    ) : (
                      <span style={{ color: colors.textMuted }}>-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.auto ? (
                      <Zap className="w-4 h-4" style={{ color: colors.success }} />
                    ) : (
                      <span style={{ color: colors.textMuted }}>-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
      
      {/* States View */}
      {viewMode === 'states' && (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {workflow.states.map(state => {
              const style = stateTypeStyles[state.type] || stateTypeStyles.state
              const Icon = style.icon
              const isExpanded = expandedRows.has(state.id)
              const outgoingTransitions = workflow.transitions.filter(t => t.from === state.id)
              
              return (
                <Card key={state.id}>
                  <CardContent className="p-3">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleRow(state.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
                        ) : (
                          <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
                        )}
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: style.color }}
                        />
                        <span className="font-medium" style={{ color: colors.text }}>
                          {state.name}
                        </span>
                        <Badge 
                          variant="outline"
                          style={{ borderColor: style.color, color: style.color }}
                        >
                          {style.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                          {outgoingTransitions.length} transitions
                        </Badge>
                        {state.actions && state.actions.length > 0 && (
                          <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                            {state.actions.length} actions
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-3 pt-3 space-y-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                        {state.description && (
                          <p className="text-sm" style={{ color: colors.textSecondary }}>
                            {state.description}
                          </p>
                        )}
                        
                        {state.actions && state.actions.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>
                              Actions
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {state.actions.map((action, i) => (
                                <Badge 
                                  key={i}
                                  variant="outline"
                                  className="font-mono text-xs"
                                  style={{ borderColor: colors.accent, color: colors.accent }}
                                >
                                  {action}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {outgoingTransitions.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>
                              Outgoing Transitions
                            </h4>
                            <div className="space-y-1">
                              {outgoingTransitions.map(t => (
                                <div 
                                  key={t.id}
                                  className="flex items-center gap-2 p-2 rounded"
                                  style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                                >
                                  <ArrowRight className="w-3 h-3" style={{ color: colors.textMuted }} />
                                  <span className="text-sm" style={{ color: colors.text }}>
                                    {stateLookup[t.to]?.name || t.to}
                                  </span>
                                  <Badge 
                                    style={{ 
                                      backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                                      color: colors.primary
                                    }}
                                  >
                                    {t.label}
                                  </Badge>
                                  {t.condition && (
                                    <code 
                                      className="text-xs px-1 rounded"
                                      style={{ 
                                        backgroundColor: `color-mix(in srgb, ${colors.warning} 20%, transparent)`,
                                        color: colors.warning
                                      }}
                                    >
                                      {t.condition}
                                    </code>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      )}
      
      {/* Matrix View */}
      {viewMode === 'matrix' && (
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ color: colors.textMuted }}>From / To</TableHead>
                {workflow.states.map(state => (
                  <TableHead 
                    key={state.id}
                    className="text-center"
                    style={{ color: colors.text, minWidth: '80px' }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: stateTypeStyles[state.type]?.color || colors.textMuted }}
                      />
                      <span className="text-xs truncate max-w-[60px]">{state.name}</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflow.states.map(fromState => (
                <TableRow key={fromState.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: stateTypeStyles[fromState.type]?.color || colors.textMuted }}
                      />
                      <span className="text-xs truncate max-w-[80px]" style={{ color: colors.text }}>
                        {fromState.name}
                      </span>
                    </div>
                  </TableCell>
                  {workflow.states.map(toState => {
                    const transitions = transitionMatrix[fromState.id]?.[toState.id] || []
                    return (
                      <TableCell 
                        key={toState.id}
                        className="text-center p-1"
                      >
                        {transitions.length > 0 ? (
                          <div 
                            className="rounded p-1 cursor-pointer hover:opacity-80"
                            style={{ 
                              backgroundColor: `color-mix(in srgb, ${colors.primary} ${20 + transitions.length * 10}%, transparent)`
                            }}
                            title={transitions.map(t => t.label).join(', ')}
                          >
                            <div className="text-xs font-medium" style={{ color: colors.primary }}>
                              {transitions.length}
                            </div>
                            <div className="text-xs truncate" style={{ color: colors.textSecondary }}>
                              {transitions[0].label}
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="rounded p-1"
                            style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                          >
                            <span className="text-xs" style={{ color: colors.textMuted }}>-</span>
                          </div>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </div>
  )
}
