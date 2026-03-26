'use client'

import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useSchema } from '@/hooks/useSchema'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  X,
  ChevronDown,
  ChevronRight,
  Brain,
  Database,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  FileCode,
  GitBranch,
  MessageSquare,
  Lightbulb,
  Target,
  Layers,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRight
} from 'lucide-react'

interface WorkspacePanelProps {
  isOpen: boolean
  onToggle: () => void
}

interface AgentActivity {
  id: string
  name: string
  layer: string
  status: 'running' | 'completed' | 'pending' | 'error'
  progress: number
  lastActivity: string
}

interface WorkspaceContext {
  activeTable: string | null
  activeModule: string | null
  suggestions: string[]
  recentActions: string[]
}

export function WorkspacePanel({ isOpen, onToggle }: WorkspacePanelProps) {
  const { colors } = useTheme()
  const { parseResult, totalTables, fkResolvedPercent } = useSchema()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'agent-activity': true,
    'context': true,
    'suggestions': true,
    'actions': false
  })

  // Mock agent activities
  const agentActivities: AgentActivity[] = [
    { id: '1', name: 'SQL DDL Parser', layer: 'Schema', status: 'completed', progress: 100, lastActivity: '2 min ago' },
    { id: '2', name: 'Column Intelligence', layer: 'Intelligence', status: 'running', progress: 67, lastActivity: 'Now' },
    { id: '3', name: 'FK Resolver', layer: 'Schema', status: 'pending', progress: 0, lastActivity: 'Waiting' },
    { id: '4', name: 'Module Registry', layer: 'Module', status: 'completed', progress: 100, lastActivity: '5 min ago' },
    { id: '5', name: 'PII Detector', layer: 'Intelligence', status: 'pending', progress: 0, lastActivity: 'Queued' },
  ]

  const workspaceContext: WorkspaceContext = {
    activeTable: totalTables > 0 ? `${totalTables} tables loaded` : null,
    activeModule: 'Enterprise Schema',
    suggestions: [
      'Resolve 12 unresolved foreign keys',
      'Review PII columns in Customer table',
      'Generate Prisma schema for core modules',
      'Update column intelligence for new tables'
    ],
    recentActions: [
      'Parsed Organizations table',
      'Detected FK: Orders.CustomerId',
      'Linked module: User Management',
      'Generated API spec for Products'
    ]
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getStatusIcon = (status: AgentActivity['status']) => {
    switch (status) {
      case 'running':
        return <Activity className="w-3.5 h-3.5 animate-pulse" style={{ color: colors.primary }} />
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5" style={{ color: colors.success }} />
      case 'pending':
        return <Clock className="w-3.5 h-3.5" style={{ color: colors.textMuted }} />
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5" style={{ color: colors.error }} />
    }
  }

  const getLayerColor = (layer: string) => {
    const layerColors: Record<string, string> = {
      'Schema': colors.accent,
      'Intelligence': colors.primary,
      'Module': colors.success,
      'Requirements': colors.warning,
      'Generation': '#eab308',
      'Migration': '#ec4899',
      'Management': '#06b6d4'
    }
    return layerColors[layer] || colors.textMuted
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 p-2 rounded-l-lg border border-r-0"
        style={{
          backgroundColor: colors.card,
          borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`,
          color: colors.textMuted
        }}
        title="Open Workspace"
      >
        <PanelRight className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div 
      className="w-80 border-l flex flex-col"
      style={{ 
        borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${colors.bgSecondary} 20%, transparent)`,
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" style={{ color: colors.primary }} />
          <span className="font-semibold text-sm" style={{ color: colors.text }}>
            Workspace
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md transition-colors hover:bg-opacity-50"
            style={{ color: colors.textMuted }}
            title="Close Panel"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Quick Stats */}
          <div 
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: `color-mix(in srgb, ${colors.primary} 5%, transparent)`,
              borderColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                Current Focus
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: colors.textMuted }}>Tables Loaded</span>
                <span className="text-sm font-medium" style={{ color: colors.text }}>{totalTables}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: colors.textMuted }}>FK Resolution</span>
                <span className="text-sm font-medium" style={{ color: colors.text }}>{fkResolvedPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full mt-2" style={{ backgroundColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}>
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${fkResolvedPercent}%`,
                    backgroundColor: colors.primary
                  }}
                />
              </div>
            </div>
          </div>

          {/* Agent Activity */}
          <div className="rounded-lg border" style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}>
            <button
              onClick={() => toggleSection('agent-activity')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-t-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${colors.card} 50%, transparent)` }}
            >
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" style={{ color: colors.accent }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Agent Activity
                </span>
              </div>
              {expandedSections['agent-activity'] ? 
                <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} /> :
                <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
              }
            </button>
            {expandedSections['agent-activity'] && (
              <div className="p-3 space-y-2 border-t" style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}>
                {agentActivities.map((agent) => (
                  <div 
                    key={agent.id}
                    className="flex items-center gap-2 p-2 rounded-md"
                    style={{ backgroundColor: `color-mix(in srgb, ${colors.card} 30%, transparent)` }}
                  >
                    {getStatusIcon(agent.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium truncate" style={{ color: colors.text }}>
                          {agent.name}
                        </span>
                        <span 
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ 
                            backgroundColor: `color-mix(in srgb, ${getLayerColor(agent.layer)} 15%, transparent)`,
                            color: getLayerColor(agent.layer)
                          }}
                        >
                          {agent.layer}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex-1 h-1 rounded-full mr-2" style={{ backgroundColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}>
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${agent.progress}%`,
                              backgroundColor: agent.status === 'error' ? colors.error : getLayerColor(agent.layer)
                            }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: colors.textMuted }}>
                          {agent.lastActivity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Context */}
          <div className="rounded-lg border" style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}>
            <button
              onClick={() => toggleSection('context')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-t-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${colors.card} 50%, transparent)` }}
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" style={{ color: colors.success }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Active Context
                </span>
              </div>
              {expandedSections['context'] ? 
                <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} /> :
                <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
              }
            </button>
            {expandedSections['context'] && (
              <div className="p-3 space-y-2 border-t" style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}>
                {workspaceContext.activeTable && (
                  <div className="flex items-center gap-2 p-2 rounded-md" style={{ backgroundColor: `color-mix(in srgb, ${colors.card} 30%, transparent)` }}>
                    <FileCode className="w-3.5 h-3.5" style={{ color: colors.accent }} />
                    <span className="text-xs" style={{ color: colors.text }}>{workspaceContext.activeTable}</span>
                  </div>
                )}
                {workspaceContext.activeModule && (
                  <div className="flex items-center gap-2 p-2 rounded-md" style={{ backgroundColor: `color-mix(in srgb, ${colors.card} 30%, transparent)` }}>
                    <GitBranch className="w-3.5 h-3.5" style={{ color: colors.success }} />
                    <span className="text-xs" style={{ color: colors.text }}>{workspaceContext.activeModule}</span>
                  </div>
                )}
                {parseResult && parseResult.tables.length > 0 && (
                  <div className="mt-2 p-2 rounded-md border" style={{ borderColor: `color-mix(in srgb, ${colors.border} 30%, transparent)` }}>
                    <div className="text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Top Tables</div>
                    <div className="flex flex-wrap gap-1">
                      {parseResult.tables.slice(0, 4).map((table, i) => (
                        <span 
                          key={i}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: `color-mix(in srgb, ${colors.accent} 15%, transparent)`,
                            color: colors.accent
                          }}
                        >
                          {table.tableName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="rounded-lg border" style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}>
            <button
              onClick={() => toggleSection('suggestions')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-t-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${colors.card} 50%, transparent)` }}
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4" style={{ color: colors.warning }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Suggestions
                </span>
              </div>
              {expandedSections['suggestions'] ? 
                <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} /> :
                <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
              }
            </button>
            {expandedSections['suggestions'] && (
              <div className="p-3 space-y-2 border-t" style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}>
                {workspaceContext.suggestions.map((suggestion, i) => (
                  <button 
                    key={i}
                    className="w-full text-left flex items-start gap-2 p-2 rounded-md transition-colors hover:bg-opacity-50"
                    style={{ backgroundColor: `color-mix(in srgb, ${colors.card} 30%, transparent)` }}
                  >
                    <Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: colors.warning }} />
                    <span className="text-xs" style={{ color: colors.text }}>{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent Actions */}
          <div className="rounded-lg border" style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}>
            <button
              onClick={() => toggleSection('actions')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-t-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${colors.card} 50%, transparent)` }}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: colors.textMuted }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>
                  Recent Actions
                </span>
              </div>
              {expandedSections['actions'] ? 
                <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} /> :
                <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
              }
            </button>
            {expandedSections['actions'] && (
              <div className="p-3 space-y-1 border-t" style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}>
                {workspaceContext.recentActions.map((action, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-2 py-1.5"
                  >
                    <CheckCircle2 className="w-3 h-3" style={{ color: colors.success }} />
                    <span className="text-xs" style={{ color: colors.textMuted }}>{action}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div 
        className="p-3 border-t flex gap-2"
        style={{ borderColor: `color-mix(in srgb, ${colors.border} 50%, transparent)` }}
      >
        <button 
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors"
          style={{ 
            backgroundColor: `color-mix(in srgb, ${colors.primary} 15%, transparent)`,
            color: colors.primary
          }}
        >
          <Play className="w-3.5 h-3.5" />
          Run All
        </button>
        <button 
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors"
          style={{ 
            backgroundColor: `color-mix(in srgb, ${colors.card} 50%, transparent)`,
            color: colors.textMuted
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>
    </div>
  )
}
