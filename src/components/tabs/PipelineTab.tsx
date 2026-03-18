'use client'

import { useState } from 'react'
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
  Settings
} from 'lucide-react'

interface AgentStatus {
  id: string
  name: string
  layer: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  duration?: number
  itemsProcessed?: number
  error?: string
}

const agentLayers = [
  {
    name: 'Schema Layer',
    icon: Database,
    colorKey: 'accent',
    agents: [
      { id: 'schema.1', name: 'SQL DDL Parser', status: 'pending' },
      { id: 'schema.2', name: 'Stored Procedure Parser', status: 'pending' },
      { id: 'schema.3', name: 'SQL View Analyzer', status: 'pending' },
      { id: 'schema.4', name: 'CSHTML Parser', status: 'pending' },
      { id: 'schema.5', name: 'FK Dependency Resolver', status: 'pending' },
    ]
  },
  {
    name: 'Intelligence Layer',
    icon: Brain,
    colorKey: 'primary',
    agents: [
      { id: 'intelligence.1', name: 'Column Intelligence Engine', status: 'pending' },
      { id: 'intelligence.2', name: 'PII/PHI Detector', status: 'pending' },
      { id: 'intelligence.3', name: 'Relationship Discovery', status: 'pending' },
      { id: 'intelligence.4', name: 'Business Rule Inferrer', status: 'pending' },
      { id: 'intelligence.5', name: 'Schema Health Scorer', status: 'pending' },
    ]
  },
  {
    name: 'Module Layer',
    icon: Puzzle,
    colorKey: 'success',
    agents: [
      { id: 'module.1', name: 'Module Registry', status: 'pending' },
      { id: 'module.2', name: 'Module Auto-Linker', status: 'pending' },
      { id: 'module.3', name: 'Priority Planner', status: 'pending' },
      { id: 'module.4', name: 'Dependency Chain Builder', status: 'pending' },
      { id: 'module.5', name: 'Sprint Planner', status: 'pending' },
    ]
  },
  {
    name: 'Requirements Layer',
    icon: FileCode,
    colorKey: 'warning',
    agents: [
      { id: 'requirements.1', name: 'AI Question Engine', status: 'pending' },
      { id: 'requirements.2', name: 'User Story Generator', status: 'pending' },
      { id: 'requirements.3', name: 'Acceptance Criteria Generator', status: 'pending' },
      { id: 'requirements.4', name: 'SOP Generator', status: 'pending' },
      { id: 'requirements.5', name: 'Traceability Matrix', status: 'pending' },
    ]
  },
  {
    name: 'Generation Layer',
    icon: Zap,
    colorKey: 'primaryLight',
    agents: [
      { id: 'generation.1', name: 'Prisma Schema Generator', status: 'pending' },
      { id: 'generation.2', name: 'API Spec Generator', status: 'pending' },
      { id: 'generation.3', name: 'Screen Blueprint Generator', status: 'pending' },
      { id: 'generation.4', name: 'Code Generator', status: 'pending' },
      { id: 'generation.5', name: 'Test Case Generator', status: 'pending' },
      { id: 'generation.6', name: 'Documentation Generator', status: 'pending' },
    ]
  },
]

export function PipelineTab() {
  const { colors } = useTheme()
  // Connect to shared schema state
  const { 
    parseResult, 
    totalTables: sharedTotalTables,
    totalColumns: sharedTotalColumns,
    fkResolvedPercent,
    linkedModules,
    modulesLinked,
    missingTables
  } = useSchema()
  
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])

  const handleRunPipeline = async () => {
    setIsRunning(true)
    setIsPaused(false)
    setProgress(0)
    setLogs(['Starting pipeline execution...'])

    // Simulate pipeline execution
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 200))
      if (!isPaused) {
        setProgress(i)
        if (i % 10 === 0) {
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Processing... ${i}%`])
        }
      }
    }

    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Pipeline completed!`])
    setIsRunning(false)
  }

  const handlePause = () => {
    setIsPaused(true)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Pipeline paused`])
  }

  const handleResume = () => {
    setIsPaused(false)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Pipeline resumed`])
  }

  const handleStop = () => {
    setIsRunning(false)
    setIsPaused(false)
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Pipeline stopped`])
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>Pipeline Execution</h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>Run multi-agent analysis pipelines</p>
        </div>
        <div className="flex items-center gap-3">
          {!isRunning ? (
            <Button 
              onClick={handleRunPipeline}
              style={{ backgroundColor: colors.success, color: '#ffffff' }}
            >
              <Play className="w-4 h-4 mr-2" />
              Run Full Pipeline
            </Button>
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
          <Button 
            variant="outline"
            style={{ borderColor: colors.border, color: colors.textSecondary }}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
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
                  : 'Ready to start'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: colors.text }}>{progress}%</div>
              <div className="text-sm" style={{ color: colors.textMuted }}>25 agents</div>
            </div>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Quick Pipelines */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Zap, title: 'Quick Scan', desc: 'Schema parsing + health check', time: '~2 min', colorKey: 'accent' },
          { icon: Brain, title: 'Intelligence Analysis', desc: 'Column intelligence + PII detection', time: '~5 min', colorKey: 'primary' },
          { icon: GitBranch, title: 'Full Analysis', desc: 'Complete 25-agent pipeline', time: '~15 min', colorKey: 'success' },
        ].map((item) => (
          <Card 
            key={item.title}
            className="hover:opacity-80 cursor-pointer transition-all"
            style={{ 
              background: `linear-gradient(to bottom right, color-mix(in srgb, ${getLayerColor(item.colorKey)} 20%, transparent), color-mix(in srgb, ${getLayerColor(item.colorKey)} 5%, transparent))`,
              borderColor: `color-mix(in srgb, ${getLayerColor(item.colorKey)} 30%, transparent)`,
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
                        {layer.agents.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-1 pl-6">
                      {layer.agents.map((agent) => (
                        <div 
                          key={agent.id}
                          className="flex items-center justify-between py-1.5 px-2 rounded text-sm"
                          style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(agent.status)}
                            <span style={{ color: colors.textSecondary }}>{agent.name}</span>
                          </div>
                          <span className="text-xs capitalize" style={{ color: colors.textMuted }}>{agent.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Execution Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: colors.success }} />
              Execution Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="rounded-lg p-4 h-[500px] overflow-auto font-mono text-xs"
              style={{ backgroundColor: colors.bg }}
            >
              {logs.length > 0 ? (
                <div className="space-y-1">
                  {logs.map((log, i) => (
                    <div key={i} style={{ color: colors.textSecondary }}>{log}</div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full" style={{ color: colors.textMuted }}>
                  <div className="text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No logs yet</p>
                    <p className="text-xs mt-1">Run a pipeline to see execution logs</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
