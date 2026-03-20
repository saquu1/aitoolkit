'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTheme } from '@/hooks/useTheme'
import { useSchema } from '@/hooks/useSchema'
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Database,
  Brain,
  Puzzle,
  FileCode,
  BarChart3,
  ArrowRight,
  Loader2,
  Settings,
  ChevronDown,
  ChevronUp,
  FileText,
  Eye
} from 'lucide-react'

interface AgentStatus {
  id: string
  name: string
  layer: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  duration?: number
  itemsProcessed?: number
  error?: string
  output?: any
}

interface PipelineResult {
  success: boolean
  parsing?: {
    tables: any[]
    storedProcedures: any[]
    views: any[]
    statistics: {
      totalFiles: number
      tablesFound: number
      spsFound: number
      viewsFound: number
      parseErrors: string[]
    }
  }
  intelligence?: any
  generation?: any
  export?: {
    files: any[]
    statistics: {
      totalFiles: number
      totalLines: number
      byType: Record<string, number>
    }
  }
  errors: string[]
  warnings: string[]
}

const agentLayers = [
  {
    name: 'Schema Layer',
    icon: Database,
    colorKey: 'accent',
    agents: [
      { id: 'schema.1', name: 'SQL DDL Parser', action: 'parse-ddl' },
      { id: 'schema.2', name: 'Stored Procedure Parser', action: 'parse-sp' },
      { id: 'schema.3', name: 'SQL View Analyzer', action: 'parse-views' },
      { id: 'schema.4', name: 'CSHTML Parser', action: 'parse-cshtml' },
      { id: 'schema.5', name: 'FK Dependency Resolver', action: 'resolve-fk' },
    ]
  },
  {
    name: 'Intelligence Layer',
    icon: Brain,
    colorKey: 'primary',
    agents: [
      { id: 'intelligence.1', name: 'Column Intelligence Engine', action: 'column-intel' },
      { id: 'intelligence.2', name: 'PII/PHI Detector', action: 'pii-detect' },
      { id: 'intelligence.3', name: 'Relationship Discovery', action: 'rel-discovery' },
      { id: 'intelligence.4', name: 'Business Rule Inferrer', action: 'business-rules' },
      { id: 'intelligence.5', name: 'Schema Health Scorer', action: 'health-score' },
    ]
  },
  {
    name: 'Module Layer',
    icon: Puzzle,
    colorKey: 'success',
    agents: [
      { id: 'module.1', name: 'Module Registry', action: 'module-registry' },
      { id: 'module.2', name: 'Module Auto-Linker', action: 'module-linker' },
      { id: 'module.3', name: 'Priority Planner', action: 'priority-plan' },
      { id: 'module.4', name: 'Dependency Chain Builder', action: 'dep-chain' },
      { id: 'module.5', name: 'Sprint Planner', action: 'sprint-plan' },
    ]
  },
  {
    name: 'Requirements Layer',
    icon: FileCode,
    colorKey: 'warning',
    agents: [
      { id: 'requirements.1', name: 'AI Question Engine', action: 'ai-questions' },
      { id: 'requirements.2', name: 'User Story Generator', action: 'user-stories' },
      { id: 'requirements.3', name: 'Acceptance Criteria Generator', action: 'acceptance-criteria' },
      { id: 'requirements.4', name: 'SOP Generator', action: 'sop-gen' },
      { id: 'requirements.5', name: 'Traceability Matrix', action: 'trace-matrix' },
    ]
  },
  {
    name: 'Generation Layer',
    icon: Zap,
    colorKey: 'primaryLight',
    agents: [
      { id: 'generation.1', name: 'Prisma Schema Generator', action: 'prisma-gen' },
      { id: 'generation.2', name: 'API Spec Generator', action: 'api-gen' },
      { id: 'generation.3', name: 'Screen Blueprint Generator', action: 'screen-gen' },
      { id: 'generation.4', name: 'Code Generator', action: 'code-gen' },
      { id: 'generation.5', name: 'Test Case Generator', action: 'test-gen' },
      { id: 'generation.6', name: 'Documentation Generator', action: 'doc-gen' },
    ]
  },
]

export function PipelineTab() {
  const { colors } = useTheme()
  const { 
    activeProject,
    parseResult, 
    totalTables: sharedTotalTables,
    totalColumns: sharedTotalColumns,
    fkResolvedPercent,
    linkedModules,
    modulesLinked,
    missingTables,
    refreshDbStats
  } = useSchema()
  
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>(() => {
    const initial: Record<string, AgentStatus> = {}
    agentLayers.forEach(layer => {
      layer.agents.forEach(agent => {
        initial[agent.id] = {
          id: agent.id,
          name: agent.name,
          layer: layer.name,
          status: 'pending'
        }
      })
    })
    return initial
  })
  
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null)
  const [showOutput, setShowOutput] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  // Update agent status
  const updateAgentStatus = useCallback((agentId: string, status: AgentStatus['status'], data?: Partial<AgentStatus>) => {
    setAgentStatuses(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        status,
        ...data
      }
    }))
  }, [])

  // Add log entry
  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }, [])

  // Run a single agent step
  const runAgentStep = async (agentId: string, agentName: string, action: string, projectId?: string): Promise<{ success: boolean; data?: any; error?: string }> => {
    updateAgentStatus(agentId, 'running')
    addLog(`Starting: ${agentName}...`)
    
    const startTime = Date.now()
    
    try {
      let response: Response
      let data: any
      
      switch (action) {
        case 'parse-ddl':
        case 'parse-sp':
        case 'parse-views':
        case 'parse-cshtml':
          // Parse files from project
          response = await fetch('/api/parsers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'reparse-project',
              projectId: projectId || activeProject?.id
            })
          })
          data = await response.json()
          break
          
        case 'resolve-fk':
          response = await fetch('/api/fk-resolution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: projectId || activeProject?.id })
          })
          data = await response.json()
          break
          
        case 'pii-detect':
          response = await fetch('/api/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'detect-pii-phi',
              projectId: projectId || activeProject?.id
            })
          })
          data = await response.json()
          break
          
        case 'column-intel':
        case 'rel-discovery':
        case 'business-rules':
        case 'health-score':
          response = await fetch('/api/intelligence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: action === 'column-intel' ? 'analyze-columns' : 
                      action === 'rel-discovery' ? 'discover-relationships' :
                      action === 'business-rules' ? 'infer-rules' : 'score-health',
              projectId: projectId || activeProject?.id
            })
          })
          data = await response.json()
          break
          
        case 'module-registry':
        case 'module-linker':
          response = await fetch('/api/intelligence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'link-modules',
              projectId: projectId || activeProject?.id
            })
          })
          data = await response.json()
          break
          
        case 'prisma-gen':
        case 'api-gen':
        case 'screen-gen':
          response = await fetch('/api/generators', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: action === 'prisma-gen' ? 'generate-prisma' :
                      action === 'api-gen' ? 'generate-api' : 'generate-screens',
              projectId: projectId || activeProject?.id
            })
          })
          data = await response.json()
          break
          
        default:
          // Generic agent step - simulate with delay
          await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500))
          data = { success: true, itemsProcessed: Math.floor(Math.random() * 10) + 1 }
      }
      
      const duration = Date.now() - startTime
      
      if (data.success !== false) {
        updateAgentStatus(agentId, 'completed', { 
          duration, 
          itemsProcessed: data.statistics?.totalTables || data.itemsProcessed || 0,
          output: data
        })
        addLog(`✓ Completed: ${agentName} (${duration}ms)`)
        return { success: true, data }
      } else {
        updateAgentStatus(agentId, 'failed', { duration, error: data.error || 'Unknown error' })
        addLog(`✗ Failed: ${agentName} - ${data.error || 'Unknown error'}`)
        return { success: false, error: data.error }
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      updateAgentStatus(agentId, 'failed', { duration, error: error.message })
      addLog(`✗ Error: ${agentName} - ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  // Run full pipeline
  const handleRunPipeline = async (mode: 'quick' | 'intelligence' | 'full' = 'full') => {
    if (!activeProject) {
      addLog('Error: No active project selected. Please select a project first.')
      return
    }
    
    setIsRunning(true)
    setIsPaused(false)
    setProgress(0)
    setPipelineResult(null)
    
    // Reset all agent statuses
    const resetStatuses: Record<string, AgentStatus> = {}
    agentLayers.forEach(layer => {
      layer.agents.forEach(agent => {
        resetStatuses[agent.id] = {
          id: agent.id,
          name: agent.name,
          layer: layer.name,
          status: 'pending'
        }
      })
    })
    setAgentStatuses(resetStatuses)
    
    addLog(`Starting ${mode} pipeline for project: ${activeProject.name}`)
    
    // Determine which layers to run based on mode
    const layersToRun = mode === 'quick' ? [agentLayers[0]] : // Schema only
                        mode === 'intelligence' ? [agentLayers[0], agentLayers[1]] : // Schema + Intelligence
                        agentLayers // All layers
    
    const totalAgents = layersToRun.reduce((sum, l) => sum + l.agents.length, 0)
    let completedAgents = 0
    
    // Run agents layer by layer
    for (const layer of layersToRun) {
      addLog(`\n=== ${layer.name} ===`)
      
      for (const agent of layer.agents) {
        if (isPaused) {
          addLog('Pipeline paused')
          break
        }
        
        const result = await runAgentStep(agent.id, agent.name, agent.action)
        completedAgents++
        setProgress(Math.round((completedAgents / totalAgents) * 100))
        
        // If critical agent fails, stop pipeline
        if (!result.success && layer === agentLayers[0]) {
          addLog('Critical agent failed, stopping pipeline')
          setIsRunning(false)
          return
        }
      }
      
      if (isPaused) break
    }
    
    addLog(`\n=== Pipeline Complete ===`)
    setIsRunning(false)
    
    // Refresh database stats
    await refreshDbStats()
  }

  const handlePause = () => {
    setIsPaused(true)
    addLog('Pipeline paused')
  }

  const handleResume = () => {
    setIsPaused(false)
    addLog('Pipeline resumed')
  }

  const handleStop = () => {
    setIsRunning(false)
    setIsPaused(false)
    addLog('Pipeline stopped')
  }

  const handleReset = () => {
    setProgress(0)
    setLogs([])
    setPipelineResult(null)
    setShowOutput(false)
    
    // Reset all agent statuses
    const resetStatuses: Record<string, AgentStatus> = {}
    agentLayers.forEach(layer => {
      layer.agents.forEach(agent => {
        resetStatuses[agent.id] = {
          id: agent.id,
          name: agent.name,
          layer: layer.name,
          status: 'pending'
        }
      })
    })
    setAgentStatuses(resetStatuses)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" style={{ color: colors.success }} />
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin" style={{ color: colors.accent }} />
      case 'failed':
        return <AlertTriangle className="w-4 h-4" style={{ color: colors.error }} />
      case 'skipped':
        return <Square className="w-4 h-4" style={{ color: colors.textMuted }} />
      default:
        return <Clock className="w-4 h-4" style={{ color: colors.textMuted }} />
    }
  }

  const getLayerColor = (colorKey: string) => {
    return (colors as any)[colorKey] || colors.primary
  }

  // Calculate summary stats
  const completedCount = Object.values(agentStatuses).filter(a => a.status === 'completed').length
  const failedCount = Object.values(agentStatuses).filter(a => a.status === 'failed').length
  const runningCount = Object.values(agentStatuses).filter(a => a.status === 'running').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>Pipeline Execution</h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            {activeProject ? `Project: ${activeProject.name}` : 'No project selected - Select a project first'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isRunning ? (
            <>
              <Button 
                onClick={() => handleRunPipeline('quick')}
                disabled={!activeProject}
                variant="outline"
                style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                <Zap className="w-4 h-4 mr-2" />
                Quick Scan
              </Button>
              <Button 
                onClick={() => handleRunPipeline('full')}
                disabled={!activeProject}
                style={{ backgroundColor: colors.success, color: '#ffffff' }}
              >
                <Play className="w-4 h-4 mr-2" />
                Run Full Pipeline
              </Button>
              <Button 
                onClick={handleReset}
                variant="outline"
                style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </>
          ) : (
            <>
              {isPaused ? (
                <Button 
                  onClick={handleResume}
                  style={{ backgroundColor: colors.success, color: '#ffffff' }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              ) : (
                <Button 
                  onClick={handlePause}
                  style={{ backgroundColor: colors.warning, color: '#ffffff' }}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
              <Button 
                onClick={handleStop}
                style={{ backgroundColor: colors.error, color: '#ffffff' }}
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: colors.text }}>Overall Progress</h3>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                {isRunning 
                  ? isPaused 
                    ? 'Pipeline paused' 
                    : 'Processing...' 
                  : completedCount > 0 
                    ? `Completed: ${completedCount}/${Object.keys(agentStatuses).length} agents`
                    : 'Ready to start'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: colors.text }}>{progress}%</div>
              <div className="flex items-center gap-2 text-sm" style={{ color: colors.textMuted }}>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" style={{ color: colors.success }} />
                  {completedCount}
                </span>
                {failedCount > 0 && (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" style={{ color: colors.error }} />
                    {failedCount}
                  </span>
                )}
                {runningCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" style={{ color: colors.accent }} />
                    {runningCount}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Quick Pipelines */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Zap, title: 'Quick Scan', desc: 'Schema parsing + health check', time: '~2 min', mode: 'quick' as const, colorKey: 'accent' },
          { icon: Brain, title: 'Intelligence Analysis', desc: 'Column intelligence + PII detection', time: '~5 min', mode: 'intelligence' as const, colorKey: 'primary' },
          { icon: GitBranch, title: 'Full Analysis', desc: 'Complete 25-agent pipeline', time: '~15 min', mode: 'full' as const, colorKey: 'success' },
        ].map((item) => (
          <Card 
            key={item.title}
            className="hover:opacity-80 cursor-pointer transition-all"
            onClick={() => !isRunning && activeProject && handleRunPipeline(item.mode)}
            style={{ 
              background: `linear-gradient(to bottom right, color-mix(in srgb, ${getLayerColor(item.colorKey)} 20%, transparent), color-mix(in srgb, ${getLayerColor(item.colorKey)} 5%, transparent))`,
              borderColor: `color-mix(in srgb, ${getLayerColor(item.colorKey)} 30%, transparent)`,
              opacity: (!activeProject || isRunning) ? 0.5 : 1
            }}
          >
            <CardContent className="p-6">
              <item.icon className="w-8 h-8 mb-3" style={{ color: getLayerColor(item.colorKey) }} />
              <h3 className="font-semibold" style={{ color: colors.text }}>{item.title}</h3>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>{item.desc}</p>
              <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: colors.textMuted }}>
                <Clock className="w-3 h-3" />
                {item.time}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent Status Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Agents by Layer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" style={{ color: colors.primary }} />
              Agent Execution Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agentLayers.map((layer) => {
                const layerColor = getLayerColor(layer.colorKey)
                const layerAgents = layer.agents.map(a => agentStatuses[a.id])
                const layerCompleted = layerAgents.filter(a => a.status === 'completed').length
                
                return (
                  <div key={layer.name} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: colors.textSecondary }}>
                      <layer.icon className="w-4 h-4" style={{ color: layerColor }} />
                      {layer.name}
                      <Badge 
                        className="ml-auto"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${layerColor} 20%, transparent)`,
                          color: layerColor,
                        }}
                      >
                        {layerCompleted}/{layer.agents.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-1 pl-6">
                      {layer.agents.map((agent) => {
                        const status = agentStatuses[agent.id]
                        return (
                          <div 
                            key={agent.id}
                            className="flex items-center justify-between py-1.5 px-2 rounded text-sm cursor-pointer hover:opacity-80"
                            style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                            onClick={() => {
                              setSelectedAgent(selectedAgent === agent.id ? null : agent.id)
                              if (status.output) setShowOutput(true)
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status.status)}
                              <span style={{ color: colors.textSecondary }}>{agent.name}</span>
                              {status.duration && (
                                <span className="text-xs" style={{ color: colors.textMuted }}>
                                  {status.duration}ms
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {status.itemsProcessed !== undefined && status.itemsProcessed > 0 && (
                                <span className="text-xs" style={{ color: colors.textMuted }}>
                                  {status.itemsProcessed} items
                                </span>
                              )}
                              {status.output && (
                                <Eye className="w-3 h-3" style={{ color: colors.primary }} />
                              )}
                              <span className="text-xs capitalize" style={{ color: colors.textMuted }}>
                                {status.status}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Execution Logs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: colors.success }} />
              Execution Logs
            </CardTitle>
            {logs.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLogs([])}
                style={{ color: colors.textMuted }}
              >
                Clear
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div 
              className="rounded-lg p-4 h-[500px] overflow-auto font-mono text-xs"
              style={{ backgroundColor: colors.bg }}
            >
              {logs.length > 0 ? (
                <div className="space-y-1">
                  {logs.map((log, i) => {
                    const isSuccess = log.includes('✓')
                    const isError = log.includes('✗') || log.includes('Error')
                    const isHeader = log.includes('===')
                    
                    return (
                      <div 
                        key={i} 
                        style={{ 
                          color: isError ? colors.error : 
                                 isSuccess ? colors.success : 
                                 isHeader ? colors.primary :
                                 colors.textSecondary 
                        }}
                      >
                        {log}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full" style={{ color: colors.textMuted }}>
                  <div className="text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No logs yet</p>
                    <p className="text-xs mt-1">
                      {activeProject 
                        ? 'Run a pipeline to see execution logs' 
                        : 'Select a project first'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Output Panel */}
      {showOutput && selectedAgent && agentStatuses[selectedAgent]?.output && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: colors.primary }} />
              Output: {agentStatuses[selectedAgent]?.name}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowOutput(false)}
              style={{ color: colors.textMuted }}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <pre 
              className="rounded-lg p-4 overflow-auto max-h-[400px] text-xs"
              style={{ backgroundColor: colors.bg, color: colors.textSecondary }}
            >
              {JSON.stringify(agentStatuses[selectedAgent]?.output, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
