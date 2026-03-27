'use client'

import { useTheme } from '@/hooks/useTheme'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  X,
  Table2,
  Code,
  Eye,
  Layers,
  FileText,
  Globe,
  GitBranch,
  Database,
  Hash,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy
} from 'lucide-react'

interface GraphNode {
  id: string
  label: string
  type: 'table' | 'procedure' | 'view' | 'module' | 'form' | 'api'
  module?: string
  status?: string
  connections: number
  x: number
  y: number
  size: number
}

interface NodeDetailsProps {
  node: GraphNode
  onClose?: () => void
  additionalData?: {
    columns?: any[]
    parameters?: any[]
    tables?: string[]
    operations?: string[]
    dependencies?: string[]
  }
}

// Type-specific icons
const typeIcons: Record<string, any> = {
  table: Table2,
  procedure: Code,
  view: Eye,
  module: Layers,
  form: FileText,
  api: Globe
}

// Type-specific colors
const typeColors: Record<string, { bg: string; border: string; text: string }> = {
  table: { bg: 'rgba(59, 130, 246, 0.2)', border: '#3B82F6', text: '#60A5FA' },
  procedure: { bg: 'rgba(16, 185, 129, 0.2)', border: '#10B981', text: '#34D399' },
  view: { bg: 'rgba(139, 92, 246, 0.2)', border: '#8B5CF6', text: '#A78BFA' },
  module: { bg: 'rgba(245, 158, 11, 0.2)', border: '#F59E0B', text: '#FBBF24' },
  form: { bg: 'rgba(236, 72, 153, 0.2)', border: '#EC4899', text: '#F472B6' },
  api: { bg: 'rgba(6, 182, 212, 0.2)', border: '#06B6D4', text: '#22D3EE' }
}

export function NodeDetails({ node, onClose, additionalData }: NodeDetailsProps) {
  const { colors } = useTheme()
  
  const Icon = typeIcons[node.type] || Table2
  const typeColor = typeColors[node.type] || typeColors.table
  
  const handleCopyId = () => {
    navigator.clipboard.writeText(node.id)
  }
  
  const handleCopyLabel = () => {
    navigator.clipboard.writeText(node.label)
  }
  
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="rounded-lg p-2"
              style={{ backgroundColor: typeColor.bg }}
            >
              <Icon className="w-5 h-5" style={{ color: typeColor.text }} />
            </div>
            <div>
              <Badge 
                variant="outline"
                style={{ borderColor: typeColor.border, color: typeColor.text }}
              >
                {node.type.toUpperCase()}
              </Badge>
            </div>
          </div>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Name */}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-sm font-semibold break-all" style={{ color: colors.text }}>
              {node.label}
            </h3>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0"
              onClick={handleCopyLabel}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs" style={{ color: colors.textMuted }}>ID:</span>
            <code className="text-xs px-1 rounded" style={{ 
              backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)`,
              color: colors.textSecondary 
            }}>
              {node.id}
            </code>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-5 w-5 p-0"
              onClick={handleCopyId}
            >
              <Copy className="w-2.5 h-2.5" />
            </Button>
          </div>
        </div>
        
        {/* Stats */}
        <div 
          className="rounded-lg p-3 grid grid-cols-2 gap-3"
          style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
        >
          <div>
            <div className="flex items-center gap-1 mb-1">
              <GitBranch className="w-3 h-3" style={{ color: colors.accent }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Connections</span>
            </div>
            <div className="text-lg font-bold" style={{ color: colors.text }}>{node.connections}</div>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Database className="w-3 h-3" style={{ color: colors.primary }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Module</span>
            </div>
            <div className="text-sm font-medium truncate" style={{ color: colors.text }}>
              {node.module || 'Unassigned'}
            </div>
          </div>
        </div>
        
        {/* Status */}
        {node.status && (
          <div>
            <div className="text-xs mb-2" style={{ color: colors.textMuted }}>Status</div>
            <div className="flex items-center gap-2">
              {node.status === 'complete' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" style={{ color: colors.success }} />
                  <Badge style={{ backgroundColor: `color-mix(in srgb, ${colors.success} 20%, transparent)`, color: colors.success }}>
                    Complete
                  </Badge>
                </>
              ) : node.status === 'partial' ? (
                <>
                  <AlertTriangle className="w-4 h-4" style={{ color: colors.warning }} />
                  <Badge style={{ backgroundColor: `color-mix(in srgb, ${colors.warning} 20%, transparent)`, color: colors.warning }}>
                    Partial
                  </Badge>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" style={{ color: colors.error }} />
                  <Badge style={{ backgroundColor: `color-mix(in srgb, ${colors.error} 20%, transparent)`, color: colors.error }}>
                    {node.status}
                  </Badge>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Type-specific details */}
        {node.type === 'table' && additionalData?.columns && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs" style={{ color: colors.textMuted }}>Columns ({additionalData.columns.length})</div>
            </div>
            <div className="space-y-1 max-h-[150px] overflow-auto">
              {additionalData.columns.slice(0, 10).map((col: any, i: number) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-2 rounded"
                  style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                >
                  <div className="flex items-center gap-2">
                    {col.isPrimaryKey ? (
                      <Hash className="w-3 h-3" style={{ color: colors.warning }} />
                    ) : col.isForeignKey ? (
                      <GitBranch className="w-3 h-3" style={{ color: colors.primary }} />
                    ) : (
                      <div className="w-3 h-3" />
                    )}
                    <span className="font-mono text-xs" style={{ color: colors.text }}>{col.name}</span>
                  </div>
                  <span className="text-xs" style={{ color: colors.textMuted }}>{col.dataType}</span>
                </div>
              ))}
              {additionalData.columns.length > 10 && (
                <div className="text-xs text-center py-1" style={{ color: colors.textMuted }}>
                  +{additionalData.columns.length - 10} more columns
                </div>
              )}
            </div>
          </div>
        )}
        
        {node.type === 'procedure' && additionalData?.parameters && (
          <div>
            <div className="text-xs mb-2" style={{ color: colors.textMuted }}>
              Parameters ({additionalData.parameters.length})
            </div>
            <div className="space-y-1">
              {additionalData.parameters.map((param: any, i: number) => (
                <div 
                  key={i}
                  className="flex items-center justify-between p-2 rounded"
                  style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                >
                  <span className="font-mono text-xs" style={{ color: colors.text }}>{param.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: colors.textMuted }}>{param.dataType}</span>
                    {param.isOutput && (
                      <Badge variant="outline" className="text-xs h-4" style={{ borderColor: colors.accent, color: colors.accent }}>
                        OUT
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {node.type === 'module' && additionalData?.tables && (
          <div>
            <div className="text-xs mb-2" style={{ color: colors.textMuted }}>
              Tables ({additionalData.tables.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {additionalData.tables.slice(0, 8).map((table: string, i: number) => (
                <Badge 
                  key={i}
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: colors.border, color: colors.textSecondary }}
                >
                  {table}
                </Badge>
              ))}
              {additionalData.tables.length > 8 && (
                <Badge 
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: colors.border, color: colors.textMuted }}
                >
                  +{additionalData.tables.length - 8}
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {node.type === 'api' && additionalData?.operations && (
          <div>
            <div className="text-xs mb-2" style={{ color: colors.textMuted }}>Operations</div>
            <div className="flex flex-wrap gap-1">
              {additionalData.operations.map((op: string, i: number) => (
                <Badge 
                  key={i}
                  style={{ 
                    backgroundColor: op === 'GET' ? `color-mix(in srgb, ${colors.success} 20%, transparent)` :
                                   op === 'POST' ? `color-mix(in srgb, ${colors.primary} 20%, transparent)` :
                                   op === 'PUT' ? `color-mix(in srgb, ${colors.warning} 20%, transparent)` :
                                   op === 'DELETE' ? `color-mix(in srgb, ${colors.error} 20%, transparent)` :
                                   `color-mix(in srgb, ${colors.textMuted} 20%, transparent)`,
                    color: op === 'GET' ? colors.success :
                           op === 'POST' ? colors.primary :
                           op === 'PUT' ? colors.warning :
                           op === 'DELETE' ? colors.error :
                           colors.textMuted
                  }}
                >
                  {op}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Dependencies */}
        {additionalData?.dependencies && additionalData.dependencies.length > 0 && (
          <div>
            <div className="text-xs mb-2" style={{ color: colors.textMuted }}>
              Dependencies ({additionalData.dependencies.length})
            </div>
            <div className="space-y-1">
              {additionalData.dependencies.slice(0, 5).map((dep: string, i: number) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 p-2 rounded cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                >
                  <GitBranch className="w-3 h-3" style={{ color: colors.textMuted }} />
                  <span className="text-xs" style={{ color: colors.text }}>{dep}</span>
                </div>
              ))}
              {additionalData.dependencies.length > 5 && (
                <div className="text-xs text-center py-1" style={{ color: colors.textMuted }}>
                  +{additionalData.dependencies.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            style={{ borderColor: colors.border }}
          >
            <ExternalLink className="w-3 h-3 mr-2" />
            View Full Details
          </Button>
        </div>
        
        {/* Metadata */}
        <div className="text-xs space-y-1" style={{ color: colors.textMuted }}>
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>Position: ({Math.round(node.x)}, {Math.round(node.y)})</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-3 h-3" />
            <span>Size: {node.size}px</span>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
