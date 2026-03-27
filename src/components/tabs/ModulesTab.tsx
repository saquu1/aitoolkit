'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/hooks/useTheme'
import { useSchema } from '@/hooks/useSchema'
import { useAutoload } from '@/hooks/useAutoload'
import { AutoloadToggle } from '@/components/AutoloadToggle'
import { 
  Search, 
  Puzzle, 
  Database,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowUpDown,
  ExternalLink,
  RefreshCw,
  Users,
  DollarSign,
  AlertCircle,
  Zap,
  Building2,
  Activity,
  Download
} from 'lucide-react'

interface Module {
  id: string
  moduleKey: string
  moduleName: string
  description: string | null
  layer: number
  layerName: string
  priority: string
  estimatedDays: number
  tables: string[]
  dependsOn: string[]
  features: string[]
  userRoles: string[]
  revenue: boolean
  status: string
  progress: number
  assignedTo: string | null
  notes: string | null
}

interface Layer {
  number: number
  name: string
  title: string
  description: string
  icon: string
  color: string
  moduleCount: number
  estimatedDays: number
}

interface Statistics {
  totalModules: number
  totalSubModules: number
  totalTables: number
  totalEstimatedHours: number
  byPriority: {
    critical: number
    high: number
    medium: number
    low: number
  }
  revenueGenerating: number
  databaseCount: number
  engineMode: string
}

const LAYER_ICONS: Record<string, any> = {
  'foundation': Building2,
  'core-transactions': Activity,
  'revenue': DollarSign,
  'clinical': Puzzle,
  'enterprise': Building2,
  'optimization': Zap,
  'integration': Layers,
}

const LAYER_COLORS: Record<number, string> = {
  1: 'accent',
  2: 'success',
  3: 'warning',
  4: 'error',
  5: 'primary',
  6: 'primaryLight',
  7: 'accentLight',
}

export function ModulesTab() {
  const { colors } = useTheme()
  
  // Autoload configuration - controls automatic data fetching
  const { enabled: autoloadEnabled, loading: autoloadLoading } = useAutoload('modules')
  
  // Connect to shared schema state
  const { 
    linkedModules, 
    modulesLinked, 
    totalTables: sharedTotalTables,
    parseResult 
  } = useSchema()
  
  const [modules, setModules] = useState<Module[]>([])
  const [layers, setLayers] = useState<Layer[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null)
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)

  // Fetch modules and statistics - only if autoload is enabled
  useEffect(() => {
    if (autoloadLoading) return // Wait for autoload status
    if (autoloadEnabled) {
      fetchData()
    } else {
      // If autoload disabled, stop loading state
      setIsLoading(false)
    }
  }, [autoloadEnabled, autoloadLoading])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [modulesRes, layersRes, statsRes] = await Promise.all([
        fetch('/api/ai-engine?action=get-modules'),
        fetch('/api/ai-engine?action=get-layers'),
        fetch('/api/ai-engine?action=get-statistics')
      ])

      if (modulesRes.ok) {
        const data = await modulesRes.json()
        setModules(data.modules || [])
      }

      if (layersRes.ok) {
        const data = await layersRes.json()
        setLayers(data.layers || [])
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStatistics(data.statistics || null)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const seedModules = async () => {
    setIsSeeding(true)
    try {
      const res = await fetch('/api/ai-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed-modules' })
      })
      
      if (res.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to seed modules:', error)
    } finally {
      setIsSeeding(false)
    }
  }

  const filteredModules = modules.filter(m => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesName = m.moduleName.toLowerCase().includes(search)
      const matchesKey = m.moduleKey.toLowerCase().includes(search)
      const matchesTables = Array.isArray(m.tables) && m.tables.some(t => t.toLowerCase().includes(search))
      if (!matchesName && !matchesKey && !matchesTables) return false
    }
    if (selectedLayer && m.layer !== selectedLayer) return false
    if (selectedPriority && m.priority !== selectedPriority) return false
    return true
  })

  const getPriorityBadge = (priority: string) => {
    const priorityColors: Record<string, string> = {
      critical: colors.error,
      high: colors.warning,
      medium: colors.warningLight,
      low: colors.textMuted,
    }
    const color = priorityColors[priority] || colors.textMuted
    return (
      <Badge 
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
          color: color,
          borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        }}
      >
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      completed: colors.success,
      in_progress: colors.accent,
      blocked: colors.error,
      planned: colors.textMuted,
    }
    const color = statusColors[status] || colors.textMuted
    return (
      <Badge 
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
          color: color,
          borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        }}
      >
        {status.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
      </Badge>
    )
  }

  const getLayerColor = (layer: number) => {
    const colorKey = LAYER_COLORS[layer] || 'primary'
    return (colors as any)[colorKey] || colors.primary
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
        <span className="ml-3" style={{ color: colors.textMuted }}>Loading module registry...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.text }}>HIS Module Registry</h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            {statistics?.totalModules || 0}+ healthcare modules across 7 layers
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Autoload Toggle */}
          <AutoloadToggle pageKey="modules" variant="badge" />
          
          {/* Manual Load Button (shown when autoload disabled) */}
          {!autoloadEnabled && !isLoading && (
            <Button 
              onClick={fetchData}
              variant="outline"
              size="sm"
              style={{ borderColor: colors.primary, color: colors.primary }}
            >
              <Download className="w-4 h-4 mr-2" />
              Load Data
            </Button>
          )}
          
          <Badge 
            className="text-sm py-1.5"
            style={{
              backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
              borderColor: colors.border,
              color: colors.textSecondary,
            }}
          >
            <Puzzle className="w-4 h-4 mr-2" />
            {modules.length} Modules
          </Badge>
          <Badge 
            className="text-sm py-1.5"
            style={{
              backgroundColor: `color-mix(in srgb, ${colors.success} 10%, transparent)`,
              borderColor: `color-mix(in srgb, ${colors.success} 30%, transparent)`,
              color: colors.success,
            }}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {modules.filter(m => m.status === 'completed').length} Completed
          </Badge>
          {modules.length === 0 && (
            <Button 
              onClick={seedModules} 
              disabled={isSeeding}
              style={{ backgroundColor: colors.primary, color: '#ffffff' }}
            >
              {isSeeding ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              {isSeeding ? 'Seeding...' : 'Seed 460+ Modules'}
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { icon: Puzzle, value: statistics.totalModules, label: 'Total Modules', color: colors.accent },
            { icon: Database, value: statistics.totalTables, label: 'Database Tables', color: colors.primary },
            { icon: Clock, value: `${Math.round(statistics.totalEstimatedHours / 8)}d`, label: 'Estimated Days', color: colors.success },
            { icon: DollarSign, value: statistics.revenueGenerating, label: 'Revenue Modules', color: colors.warning },
            { icon: AlertCircle, value: statistics.byPriority.critical, label: 'Critical Priority', color: colors.error },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <stat.icon className="w-6 h-6 mx-auto mb-2" style={{ color: stat.color }} />
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{stat.value}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Layer Overview */}
      <div className="grid grid-cols-7 gap-3">
        {layers.map((layer) => {
          const LayerIcon = LAYER_ICONS[layer.name] || Puzzle
          const color = getLayerColor(layer.number)
          const isSelected = selectedLayer === layer.number
          
          return (
            <Card 
              key={layer.number}
              className="cursor-pointer transition-all hover:opacity-80"
              style={{
                backgroundColor: isSelected 
                  ? `color-mix(in srgb, ${color} 20%, transparent)` 
                  : `color-mix(in srgb, ${colors.card} 50%, transparent)`,
                borderColor: isSelected 
                  ? `color-mix(in srgb, ${color} 50%, transparent)` 
                  : colors.border,
              }}
              onClick={() => setSelectedLayer(isSelected ? null : layer.number)}
            >
              <CardContent className="p-4 text-center">
                <LayerIcon className="w-5 h-5 mx-auto mb-2" style={{ color: color }} />
                <div className="text-lg font-bold" style={{ color: colors.text }}>{layer.moduleCount}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>{layer.title.split('—')[1]?.trim() || layer.name}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>Layer {layer.number}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search modules, tables, or features..."
                className="pl-10"
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.inputText,
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: colors.textMuted }}>Priority:</span>
              {['critical', 'high', 'medium', 'low'].map((p) => {
                const priorityColors: Record<string, string> = {
                  critical: colors.error,
                  high: colors.warning,
                  medium: colors.warningLight,
                  low: colors.textMuted,
                }
                const isSelected = selectedPriority === p
                return (
                  <Button
                    key={p}
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    style={isSelected 
                      ? { backgroundColor: colors.primary, color: '#ffffff' }
                      : { borderColor: colors.border, color: colors.textMuted }
                    }
                    onClick={() => setSelectedPriority(selectedPriority === p ? null : p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                )
              })}
            </div>
            <Button 
              variant="outline"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
              onClick={fetchData}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Module List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2" style={{ color: colors.text }}>
              <Puzzle className="w-5 h-5" style={{ color: colors.primary }} />
              Modules ({filteredModules.length})
            </span>
            <Button 
              variant="outline" 
              size="sm"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredModules.length === 0 ? (
            <div className="text-center py-12" style={{ color: colors.textMuted }}>
              <Puzzle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No modules found</p>
              <p className="text-sm mb-4">
                {!autoloadEnabled 
                  ? 'Auto-load is disabled. Click "Load Data" to fetch modules, or enable auto-load.'
                  : modules.length === 0 
                    ? 'Click "Seed 460+ Modules" to load the complete HIS module registry'
                    : 'Try adjusting your search or filters'
                }
              </p>
              {!autoloadEnabled && (
                <Button 
                  onClick={fetchData}
                  variant="outline"
                  style={{ borderColor: colors.primary, color: colors.primary }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Load Modules Now
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-auto">
              {filteredModules.map((module) => (
                <div 
                  key={module.id} 
                  className="rounded-lg overflow-hidden"
                  style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 30%, transparent)` }}
                >
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedModule === module.id ? (
                        <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
                      ) : (
                        <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
                      )}
                      <Puzzle className="w-4 h-4" style={{ color: colors.primary }} />
                      <span className="font-medium" style={{ color: colors.text }}>{module.moduleName}</span>
                      {getPriorityBadge(module.priority)}
                      {getStatusBadge(module.status)}
                      {module.revenue && (
                        <Badge 
                          style={{
                            backgroundColor: `color-mix(in srgb, ${colors.warning} 20%, transparent)`,
                            color: colors.warning,
                            borderColor: `color-mix(in srgb, ${colors.warning} 30%, transparent)`,
                          }}
                        >
                          Revenue
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm" style={{ color: colors.textMuted }}>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Layer {module.layer}
                      </span>
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {Array.isArray(module.tables) ? module.tables.length : 0} tables
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {module.estimatedDays}d
                      </span>
                    </div>
                  </div>

                  {expandedModule === module.id && (
                    <div className="border-t p-4" style={{ borderColor: colors.border }}>
                      <div className="grid grid-cols-3 gap-6">
                        {/* Tables */}
                        <div>
                          <h4 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
                            Tables ({Array.isArray(module.tables) ? module.tables.length : 0})
                          </h4>
                          <div className="space-y-1 max-h-[200px] overflow-auto">
                            {Array.isArray(module.tables) && module.tables.map((table) => (
                              <div 
                                key={table}
                                className="flex items-center gap-2 py-1.5 px-2 rounded text-sm"
                                style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                              >
                                <Database className="w-3 h-3" style={{ color: colors.accent }} />
                                <span style={{ color: colors.text }}>{table}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Features */}
                        <div>
                          <h4 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
                            Features ({Array.isArray(module.features) ? module.features.length : 0})
                          </h4>
                          <div className="space-y-1 max-h-[200px] overflow-auto">
                            {Array.isArray(module.features) && module.features.slice(0, 10).map((feature, i) => (
                              <div 
                                key={i}
                                className="flex items-start gap-2 py-1 px-2 rounded text-sm"
                                style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                              >
                                <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: colors.success }} />
                                <span style={{ color: colors.textSecondary }}>{feature}</span>
                              </div>
                            ))}
                            {Array.isArray(module.features) && module.features.length > 10 && (
                              <p className="text-xs px-2" style={{ color: colors.textMuted }}>
                                +{module.features.length - 10} more features
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Dependencies & User Roles */}
                        <div>
                          <h4 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>Dependencies</h4>
                          {Array.isArray(module.dependsOn) && module.dependsOn.length > 0 ? (
                            <div className="space-y-1 mb-4">
                              {module.dependsOn.map((dep) => (
                                <div 
                                  key={dep}
                                  className="flex items-center gap-2 py-1.5 px-2 rounded text-sm"
                                  style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                                >
                                  <Layers className="w-3 h-3" style={{ color: colors.warning }} />
                                  <span style={{ color: colors.textSecondary }}>{dep}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm mb-4" style={{ color: colors.textMuted }}>No dependencies</p>
                          )}

                          <h4 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>User Roles</h4>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(module.userRoles) && module.userRoles.slice(0, 5).map((role) => (
                              <Badge 
                                key={role} 
                                variant="outline" 
                                className="text-xs"
                                style={{ borderColor: colors.border, color: colors.textMuted }}
                              >
                                {role}
                              </Badge>
                            ))}
                            {Array.isArray(module.userRoles) && module.userRoles.length > 5 && (
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                                style={{ borderColor: colors.border, color: colors.textMuted }}
                              >
                                +{module.userRoles.length - 5}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
