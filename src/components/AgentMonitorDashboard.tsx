'use client'

/**
 * Agent Monitor Dashboard
 * Real-time monitoring of agent execution
 * 
 * TASK-4.4: Missing UI Screens
 * Part of Phase 4: Features & User Experience
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Brain,
  Database,
  Puzzle,
  FileCode,
  Zap,
  GitBranch,
  ChartColumn,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'

// Types
interface AgentState {
  id: string
  name: string
  layer: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress: number
  message: string
  itemsProcessed: number
  itemsTotal: number
  errors: string[]
  warnings: string[]
  startTime?: Date
  endTime?: Date
  duration?: number
}

interface PipelineRun {
  id: string
  projectId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: Date
  completedAt?: Date
  agents: AgentState[]
  totalAgents: number
  completedAgents: number
  failedAgents: number
  overallProgress: number
}

// Layer configuration
const LAYERS = [
  { id: 'schema', name: 'Schema', icon: Database, color: '#6366f1' },
  { id: 'intelligence', name: 'Intelligence', icon: Brain, color: '#a855f7' },
  { id: 'module', name: 'Module', icon: Puzzle, color: '#22c55e' },
  { id: 'requirements', name: 'Requirements', icon: FileCode, color: '#f59e0b' },
  { id: 'generation', name: 'Generation', icon: Zap, color: '#eab308' },
  { id: 'migration', name: 'Migration', icon: GitBranch, color: '#ec4899' },
  { id: 'management', name: 'Management', icon: ChartColumn, color: '#06b6d4' }
]

// Mock data for demo
const mockRun: PipelineRun = {
  id: 'run_001',
  projectId: 'proj_001',
  status: 'running',
  startedAt: new Date(),
  agents: [
    { id: 'sql-parser', name: 'SQL Parser', layer: 'schema', status: 'completed', progress: 100, message: 'Parsed 45 tables', itemsProcessed: 45, itemsTotal: 45, errors: [], warnings: ['2 tables missing FK definitions'], startTime: new Date(Date.now() - 300000), endTime: new Date(Date.now() - 280000), duration: 20 },
    { id: 'sp-parser', name: 'SP Parser', layer: 'schema', status: 'completed', progress: 100, message: 'Parsed 120 procedures', itemsProcessed: 120, itemsTotal: 120, errors: [], warnings: [], startTime: new Date(Date.now() - 280000), endTime: new Date(Date.now() - 240000), duration: 40 },
    { id: 'column-intel', name: 'Column Intelligence', layer: 'intelligence', status: 'running', progress: 67, message: 'Analyzing columns...', itemsProcessed: 201, itemsTotal: 300, errors: [], warnings: [], startTime: new Date(Date.now() - 240000) },
    { id: 'fk-resolver', name: 'FK Resolver', layer: 'schema', status: 'running', progress: 45, message: 'Resolving FK relationships...', itemsProcessed: 23, itemsTotal: 51, errors: ['3 unresolved FKs'], warnings: [], startTime: new Date(Date.now() - 220000) },
    { id: 'module-matcher', name: 'Module Matcher', layer: 'module', status: 'pending', progress: 0, message: 'Waiting for dependencies...', itemsProcessed: 0, itemsTotal: 0, errors: [], warnings: [] },
    { id: 'prisma-gen', name: 'Prisma Generator', layer: 'generation', status: 'pending', progress: 0, message: 'Waiting for dependencies...', itemsProcessed: 0, itemsTotal: 0, errors: [], warnings: [] }
  ],
  totalAgents: 6,
  completedAgents: 2,
  failedAgents: 0,
  overallProgress: 52
}

export function AgentMonitorDashboard() {
  const [run, setRun] = useState<PipelineRun>(mockRun)
  const [selectedLayer, setSelectedLayer] = useState<string>('all')
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set())
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Simulate progress updates
  useEffect(() => {
    if (!autoRefresh || run.status !== 'running') return

    const interval = setInterval(() => {
      setRun(prev => {
        const updated = { ...prev }
        let changed = false

        updated.agents = prev.agents.map(agent => {
          if (agent.status === 'running' && agent.progress < 100) {
            changed = true
            const newProgress = Math.min(agent.progress + Math.random() * 5, 100)
            return {
              ...agent,
              progress: Math.round(newProgress),
              itemsProcessed: Math.round((newProgress / 100) * agent.itemsTotal),
              message: newProgress >= 100 ? 'Completed' : agent.message
            }
          }
          return agent
        })

        if (changed) {
          updated.completedAgents = updated.agents.filter(a => a.status === 'completed' || a.progress >= 100).length
          updated.overallProgress = Math.round(
            updated.agents.reduce((sum, a) => sum + a.progress, 0) / updated.agents.length
          )

          if (updated.overallProgress >= 100) {
            updated.status = 'completed'
            updated.completedAt = new Date()
          }
        }

        return updated
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, run.status])

  // Filter agents by layer
  const filteredAgents = selectedLayer === 'all'
    ? run.agents
    : run.agents.filter(a => a.layer === selectedLayer)

  // Toggle agent expansion
  const toggleExpand = useCallback((agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev)
      if (next.has(agentId)) {
        next.delete(agentId)
      } else {
        next.add(agentId)
      }
      return next
    })
  }, [])

  // Get status icon
  const getStatusIcon = (status: AgentState['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'pending': return <Clock className="w-4 h-4 text-gray-400" />
      case 'skipped': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    }
  }

  // Get layer config
  const getLayerConfig = (layerId: string) => {
    return LAYERS.find(l => l.id === layerId) || LAYERS[0]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Agent Monitor</h2>
          <p className="text-slate-400 mt-1">Real-time agent execution monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={run.status === 'running' ? 'default' : 'secondary'}
            className={run.status === 'running' ? 'bg-blue-500/20 text-blue-400' : ''}>
            {run.status === 'running' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {run.status.toUpperCase()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-100">{run.totalAgents}</div>
            <div className="text-sm text-slate-400">Total Agents</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-400">{run.completedAgents}</div>
            <div className="text-sm text-slate-400">Completed</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-400">
              {run.agents.filter(a => a.status === 'running').length}
            </div>
            <div className="text-sm text-slate-400">Running</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-400">{run.failedAgents}</div>
            <div className="text-sm text-slate-400">Failed</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-100">{run.overallProgress}%</div>
            <Progress value={run.overallProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="bg-slate-800/50 border-slate-700">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="by-layer">By Layer</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <div className="flex gap-4">
            {/* Layer Filter */}
            <div className="w-48">
              <Select value={selectedLayer} onValueChange={setSelectedLayer}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700">
                  <SelectValue placeholder="Filter by layer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Layers</SelectItem>
                  {LAYERS.map(layer => (
                    <SelectItem key={layer.id} value={layer.id}>
                      <div className="flex items-center gap-2">
                        <layer.icon className="w-4 h-4" style={{ color: layer.color }} />
                        {layer.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agent List */}
            <div className="flex-1 space-y-2">
              {filteredAgents.map(agent => {
                const layerConfig = getLayerConfig(agent.layer)
                const isExpanded = expandedAgents.has(agent.id)

                return (
                  <Card key={agent.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleExpand(agent.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${layerConfig.color}20` }}
                          >
                            <layerConfig.icon
                              className="w-5 h-5"
                              style={{ color: layerConfig.color }}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-100">{agent.name}</span>
                              {getStatusIcon(agent.status)}
                            </div>
                            <p className="text-sm text-slate-400">{agent.message}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {agent.status === 'running' && (
                            <div className="w-32">
                              <Progress value={agent.progress} className="h-2" />
                              <span className="text-xs text-slate-400">{agent.progress}%</span>
                            </div>
                          )}
                          {agent.itemsTotal > 0 && (
                            <span className="text-sm text-slate-400">
                              {agent.itemsProcessed}/{agent.itemsTotal}
                            </span>
                          )}
                          {agent.errors.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {agent.errors.length} errors
                            </Badge>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                          {agent.errors.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-red-400 mb-2">Errors</h4>
                              <ul className="space-y-1">
                                {agent.errors.map((error, idx) => (
                                  <li key={idx} className="text-sm text-red-300 flex items-start gap-2">
                                    <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    {error}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {agent.warnings.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-yellow-400 mb-2">Warnings</h4>
                              <ul className="space-y-1">
                                {agent.warnings.map((warning, idx) => (
                                  <li key={idx} className="text-sm text-yellow-300 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                    {warning}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {agent.duration && (
                            <div className="text-sm text-slate-400">
                              Duration: {agent.duration}s
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="by-layer" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            {LAYERS.map(layer => {
              const layerAgents = run.agents.filter(a => a.layer === layer.id)
              const completed = layerAgents.filter(a => a.status === 'completed').length

              return (
                <Card key={layer.id} className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <layer.icon className="w-4 h-4" style={{ color: layer.color }} />
                      {layer.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-100">
                      {completed}/{layerAgents.length}
                    </div>
                    <Progress
                      value={layerAgents.length > 0 ? (completed / layerAgents.length) * 100 : 0}
                      className="mt-2 h-2"
                    />
                    <div className="mt-3 space-y-1">
                      {layerAgents.map(agent => (
                        <div key={agent.id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">{agent.name}</span>
                          {getStatusIcon(agent.status)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <ScrollArea className="h-96">
                <div className="font-mono text-sm space-y-1">
                  {run.agents.flatMap(agent => [
                    { time: agent.startTime, message: `[${agent.name}] Started`, type: 'info' },
                    ...(agent.errors.map(e => ({ time: new Date(), message: `[${agent.name}] ERROR: ${e}`, type: 'error' as const })) || []),
                    ...(agent.warnings.map(w => ({ time: new Date(), message: `[${agent.name}] WARN: ${w}`, type: 'warn' as const })) || []),
                    ...(agent.endTime ? [{ time: agent.endTime, message: `[${agent.name}] Completed in ${agent.duration}s`, type: 'success' as const }] : [])
                  ]).sort((a, b) => (a.time?.getTime() || 0) - (b.time?.getTime() || 0)).map((log, idx) => (
                    <div
                      key={idx}
                      className={`${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warn' ? 'text-yellow-400' :
                        log.type === 'success' ? 'text-green-400' :
                        'text-slate-300'
                      }`}
                    >
                      {log.time?.toLocaleTimeString()} {log.message}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AgentMonitorDashboard
