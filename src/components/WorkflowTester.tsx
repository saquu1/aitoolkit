'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from '@/hooks/useTheme'
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  History,
  Zap,
  GitBranch,
  MessageSquare
} from 'lucide-react'

interface WorkflowState {
  id: string
  name: string
  type: 'start' | 'end' | 'state' | 'decision' | 'parallel' | 'subprocess'
  description?: string
  actions?: string[]
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

interface ExecutionLog {
  timestamp: Date
  fromState: string
  toState: string
  transition: string
  trigger?: string
  condition?: string
  auto: boolean
}

interface WorkflowTesterProps {
  workflow: WorkflowDefinition
  onStateChange?: (stateId: string) => void
}

// State type styling
const stateTypeStyles: Record<string, { icon: any; color: string }> = {
  start: { icon: CheckCircle2, color: '#22C55E' },
  end: { icon: XCircle, color: '#EF4444' },
  state: { icon: Clock, color: '#3B82F6' },
  decision: { icon: GitBranch, color: '#F59E0B' },
  parallel: { icon: GitBranch, color: '#8B5CF6' },
  subprocess: { icon: GitBranch, color: '#06B6D4' }
}

export function WorkflowTester({ workflow, onStateChange }: WorkflowTesterProps) {
  const { colors } = useTheme()
  
  // Execution state
  const [currentState, setCurrentState] = useState<string | null>(null)
  const [executionLog, setExecutionLog] = useState<ExecutionLog[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [autoExecute, setAutoExecute] = useState(false)
  
  // Build state lookup
  const stateLookup = useMemo(() => {
    const map: Record<string, WorkflowState> = {}
    workflow.states.forEach(s => map[s.id] = s)
    return map
  }, [workflow.states])
  
  // Get available transitions from current state
  const availableTransitions = useMemo(() => {
    if (!currentState) return []
    return workflow.transitions.filter(t => t.from === currentState)
  }, [workflow.transitions, currentState])
  
  // Current state info
  const currentStateInfo = currentState ? stateLookup[currentState] : null
  const isFinalState = currentState && workflow.finalStates.includes(currentState)
  
  // Start execution
  const startExecution = useCallback(() => {
    setCurrentState(workflow.initialState)
    setExecutionLog([])
    setIsRunning(true)
    setExecutionLog(prev => [{
      timestamp: new Date(),
      fromState: '-',
      toState: workflow.initialState,
      transition: 'Start',
      auto: true
    }])
    onStateChange?.(workflow.initialState)
  }, [workflow.initialState, workflow.finalStates, onStateChange])
  
  // Reset execution
  const resetExecution = useCallback(() => {
    setCurrentState(null)
    setExecutionLog([])
    setIsRunning(false)
    setAutoExecute(false)
  }, [])
  
  // Execute transition
  const executeTransition = useCallback((transition: WorkflowTransition) => {
    if (!currentState) return
    
    const newState = transition.to
    setCurrentState(newState)
    setExecutionLog(prev => [...prev, {
      timestamp: new Date(),
      fromState: currentState,
      toState: newState,
      transition: transition.label,
      trigger: transition.trigger,
      condition: transition.condition,
      auto: transition.auto || false
    }])
    onStateChange?.(newState)
    
    // Check if reached final state
    if (workflow.finalStates.includes(newState)) {
      setIsRunning(false)
    }
  }, [currentState, workflow.finalStates, onStateChange])
  
  // Auto-execute (for demo purposes - automatically picks first available transition)
  const autoStep = useCallback(() => {
    if (availableTransitions.length > 0 && !isFinalState) {
      // For decision states, we could add logic to evaluate conditions
      // For now, just pick the first non-auto transition or first available
      const nextTransition = availableTransitions.find(t => !t.condition) || availableTransitions[0]
      if (nextTransition) {
        executeTransition(nextTransition)
      }
    }
  }, [availableTransitions, isFinalState, executeTransition])
  
  // Get state path
  const executionPath = useMemo(() => {
    const path: string[] = []
    if (executionLog.length > 0) {
      path.push(executionLog[0].toState)
      executionLog.slice(1).forEach(log => {
        path.push(log.toState)
      })
    }
    return path
  }, [executionLog])
  
  // Render state badge
  const renderStateBadge = (stateId: string, isActive: boolean = false) => {
    const state = stateLookup[stateId]
    if (!state) return null
    
    const style = stateTypeStyles[state.type] || stateTypeStyles.state
    const Icon = style.icon
    
    return (
      <div 
        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isActive ? 'ring-2' : ''}`}
        style={{ 
          backgroundColor: `color-mix(in srgb, ${style.color} 20%, transparent)`,
          ringColor: isActive ? style.color : undefined
        }}
      >
        <Icon className="w-4 h-4" style={{ color: style.color }} />
        <span className="font-medium text-sm" style={{ color: colors.text }}>
          {state.name}
        </span>
        {isActive && (
          <Badge 
            className="ml-auto"
            style={{ backgroundColor: style.color, color: '#ffffff' }}
          >
            Current
          </Badge>
        )}
      </div>
    )
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="w-5 h-5" style={{ color: colors.success }} />
              Workflow Tester
            </CardTitle>
            <CardDescription>
              Simulate workflow execution and test state transitions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <Button onClick={startExecution} style={{ backgroundColor: colors.success }}>
                <Play className="w-4 h-4 mr-2" />
                Start Test
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={resetExecution}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                {!isFinalState && (
                  <Button onClick={autoStep} style={{ backgroundColor: colors.primary }}>
                    <SkipForward className="w-4 h-4 mr-2" />
                    Step
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* Current State Panel */}
          <Card className="col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Current State</CardTitle>
            </CardHeader>
            <CardContent>
              {currentStateInfo ? (
                <div className="space-y-3">
                  {renderStateBadge(currentState, true)}
                  
                  {currentStateInfo.description && (
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      {currentStateInfo.description}
                    </p>
                  )}
                  
                  {currentStateInfo.actions && currentStateInfo.actions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>
                        Available Actions
                      </h4>
                      <div className="space-y-1">
                        {currentStateInfo.actions.map((action, i) => (
                          <div 
                            key={i}
                            className="flex items-center gap-2 p-2 rounded"
                            style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                          >
                            <Zap className="w-3 h-3" style={{ color: colors.accent }} />
                            <span className="text-xs font-mono" style={{ color: colors.text }}>
                              {action}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {isFinalState && (
                    <div 
                      className="flex items-center gap-2 p-3 rounded-lg"
                      style={{ backgroundColor: `color-mix(in srgb, ${colors.success} 20%, transparent)` }}
                    >
                      <CheckCircle2 className="w-5 h-5" style={{ color: colors.success }} />
                      <span className="font-medium" style={{ color: colors.success }}>
                        Workflow Complete
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8" style={{ color: colors.textMuted }}>
                  <Play className="w-12 h-12 mb-2" style={{ opacity: 0.5 }} />
                  <p className="text-sm text-center">
                    Click "Start Test" to begin workflow simulation
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Available Transitions */}
          <Card className="col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Available Transitions</CardTitle>
            </CardHeader>
            <CardContent>
              {isRunning && !isFinalState ? (
                <div className="space-y-2">
                  {availableTransitions.length > 0 ? (
                    availableTransitions.map(t => {
                      const targetState = stateLookup[t.to]
                      const style = targetState ? stateTypeStyles[targetState.type] : null
                      
                      return (
                        <div 
                          key={t.id}
                          className="p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ 
                            backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                            border: `1px solid ${colors.primary}40`
                          }}
                          onClick={() => executeTransition(t)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge 
                              style={{ 
                                backgroundColor: `color-mix(in srgb, ${colors.primary} 30%, transparent)`,
                                color: colors.primary
                              }}
                            >
                              {t.label}
                            </Badge>
                            <ChevronRight className="w-4 h-4" style={{ color: colors.primary }} />
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                              → {targetState?.name || t.to}
                            </span>
                            {t.auto && (
                              <Zap className="w-3 h-3" style={{ color: colors.success }} />
                            )}
                          </div>
                          
                          {t.condition && (
                            <div className="mt-2">
                              <code 
                                className="text-xs px-2 py-1 rounded"
                                style={{ 
                                  backgroundColor: `color-mix(in srgb, ${colors.warning} 20%, transparent)`,
                                  color: colors.warning
                                }}
                              >
                                if: {t.condition}
                              </code>
                            </div>
                          )}
                          
                          {t.trigger && (
                            <div className="mt-1">
                              <span className="text-xs" style={{ color: colors.textMuted }}>
                                Trigger: {t.trigger}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-4" style={{ color: colors.textMuted }}>
                      No available transitions
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8" style={{ color: colors.textMuted }}>
                  <GitBranch className="w-12 h-12 mb-2" style={{ opacity: 0.5 }} />
                  <p className="text-sm text-center">
                    {isFinalState ? 'Workflow completed' : 'Start test to see transitions'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Execution Log */}
          <Card className="col-span-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="w-4 h-4" style={{ color: colors.accent }} />
                  Execution Log
                </CardTitle>
                {executionLog.length > 0 && (
                  <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                    {executionLog.length} steps
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px]">
                {executionLog.length > 0 ? (
                  <div className="space-y-2">
                    {executionLog.map((log, i) => {
                      const toState = stateLookup[log.toState]
                      const style = toState ? stateTypeStyles[toState.type] : null
                      
                      return (
                        <div 
                          key={i}
                          className="p-2 rounded-lg"
                          style={{ 
                            backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)`,
                            borderLeft: `3px solid ${style?.color || colors.textMuted}`
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium" style={{ color: colors.text }}>
                              {log.transition}
                            </span>
                            <span className="text-xs" style={{ color: colors.textMuted }}>
                              {log.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {log.fromState !== '-' && (
                              <>
                                <span className="text-xs font-mono" style={{ color: colors.textSecondary }}>
                                  {stateLookup[log.fromState]?.name || log.fromState}
                                </span>
                                <ChevronRight className="w-3 h-3" style={{ color: colors.textMuted }} />
                              </>
                            )}
                            <span className="text-xs font-mono" style={{ color: colors.text }}>
                              {toState?.name || log.toState}
                            </span>
                          </div>
                          
                          {log.auto && (
                            <div className="mt-1">
                              <Badge 
                                variant="outline"
                                className="text-xs h-4"
                                style={{ borderColor: colors.success, color: colors.success }}
                              >
                                Auto
                              </Badge>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8" style={{ color: colors.textMuted }}>
                    <MessageSquare className="w-12 h-12 mb-2" style={{ opacity: 0.5 }} />
                    <p className="text-sm text-center">
                      Execution log will appear here
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        {/* Execution Path Visualization */}
        {executionPath.length > 0 && (
          <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}>
            <h4 className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>
              Execution Path
            </h4>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {executionPath.map((stateId, i) => {
                const state = stateLookup[stateId]
                const style = state ? stateTypeStyles[state.type] : null
                const isCurrent = i === executionPath.length - 1
                
                return (
                  <div key={i} className="flex items-center gap-1">
                    <div 
                      className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                      style={{ 
                        backgroundColor: `color-mix(in srgb, ${style?.color || colors.textMuted} ${isCurrent ? '40' : '20'}%, transparent)`,
                        color: style?.color || colors.textMuted,
                        border: isCurrent ? `2px solid ${style?.color}` : 'none'
                      }}
                    >
                      {state?.name || stateId}
                    </div>
                    {i < executionPath.length - 1 && (
                      <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
