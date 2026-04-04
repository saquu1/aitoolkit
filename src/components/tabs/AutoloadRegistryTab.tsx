/**
 * Autoload Registry Tab
 * =====================
 * Centralized control panel for managing page autoload configurations.
 * Enables/disables auto-fetch on specific pages to reduce database load.
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { useTheme } from '@/hooks/useTheme'
import { useAutoloadAll } from '@/hooks/useAutoload'
import { 
  Database, 
  RefreshCw, 
  Settings2,
  CheckCircle2,
  XCircle,
  Zap,
  ZapOff,
  Layers,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Clock
} from 'lucide-react'

interface AutoloadRegistryTabProps {
  onNavigate?: (tab: string) => void
}

const CATEGORY_INFO: Record<string, { icon: any; color: string; description: string }> = {
  core: { 
    icon: Database, 
    color: 'accent', 
    description: 'Essential pages that load project/schema data' 
  },
  analytics: { 
    icon: Layers, 
    color: 'primary', 
    description: 'Analytics and intelligence pages' 
  },
  management: { 
    icon: Settings2, 
    color: 'warning', 
    description: 'Admin and configuration pages' 
  },
  migration: { 
    icon: Zap, 
    color: 'success', 
    description: 'Migration and conversion tools' 
  }
}

export function AutoloadRegistryTab({ onNavigate }: AutoloadRegistryTabProps) {
  const { colors } = useTheme()
  const {
    configs,
    stats,
    loading,
    refresh,
    enableAll,
    disableAll,
    enableCategory,
    disableCategory,
    togglePage,
    resetToDefaults
  } = useAutoloadAll()

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['core']))
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  const alpha = (color: string, opacity: number) => 
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  // Group configs by category
  const groupedConfigs = configs.reduce((acc, config) => {
    if (!acc[config.category]) acc[config.category] = []
    acc[config.category].push(config)
    return acc
  }, {} as Record<string, typeof configs>)

  const handleToggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const handleTogglePage = async (pageKey: string) => {
    setIsProcessing(pageKey)
    await togglePage(pageKey)
    setIsProcessing(null)
  }

  const handleCategoryAction = async (category: string, enable: boolean) => {
    setIsProcessing(`category-${category}`)
    if (enable) {
      await enableCategory(category)
    } else {
      await disableCategory(category)
    }
    setIsProcessing(null)
  }

  const handleBulkAction = async (enable: boolean) => {
    setIsProcessing('bulk')
    if (enable) {
      await enableAll()
    } else {
      await disableAll()
    }
    setIsProcessing(null)
  }

  const handleReset = async () => {
    setIsProcessing('reset')
    await resetToDefaults()
    setIsProcessing(null)
  }

  // Calculate progress
  const enabledPercent = stats ? Math.round((stats.enabled / stats.total) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
        <span className="ml-3" style={{ color: colors.textMuted }}>Loading autoload configurations...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: colors.text }}>
            <Settings2 className="w-6 h-6" style={{ color: colors.primary }} />
            Autoload Registry
          </h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            Control which pages automatically fetch data when opened. All pages are disabled by default for stability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction(true)}
            disabled={isProcessing !== null}
            style={{ borderColor: colors.success, color: colors.success }}
          >
            {isProcessing === 'bulk' ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Enable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction(false)}
            disabled={isProcessing !== null}
            style={{ borderColor: colors.warning, color: colors.warning }}
          >
            <ZapOff className="w-4 h-4 mr-2" />
            Disable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isProcessing !== null}
            style={{ borderColor: colors.border, color: colors.textSecondary }}
          >
            {isProcessing === 'reset' ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            Reset
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: colors.textMuted }}>Total Pages</p>
                  <p className="text-2xl font-bold" style={{ color: colors.text }}>{stats.total}</p>
                </div>
                <Database className="w-8 h-8 opacity-50" style={{ color: colors.primary }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: colors.textMuted }}>Auto-Load On</p>
                  <p className="text-2xl font-bold" style={{ color: colors.success }}>{stats.enabled}</p>
                </div>
                <CheckCircle2 className="w-8 h-8" style={{ color: colors.success }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: colors.textMuted }}>Auto-Load Off</p>
                  <p className="text-2xl font-bold" style={{ color: colors.warning }}>{stats.disabled}</p>
                </div>
                <XCircle className="w-8 h-8" style={{ color: colors.warning }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: colors.textMuted }}>Coverage</p>
                  <p className="text-2xl font-bold" style={{ color: colors.text }}>{enabledPercent}%</p>
                </div>
                <Progress value={enabledPercent} className="w-16 h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Groups */}
      <div className="space-y-4">
        {Object.entries(groupedConfigs).map(([category, categoryConfigs]) => {
          const info = CATEGORY_INFO[category] || CATEGORY_INFO.core
          const CategoryIcon = info.icon
          const isExpanded = expandedCategories.has(category)
          const enabledCount = categoryConfigs.filter(c => c.enabled).length
          const colorKey = info.color as keyof typeof colors
          const categoryColor = colors[colorKey] || colors.primary

          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => handleToggleCategory(category)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" style={{ color: colors.textMuted }} />
                    ) : (
                      <ChevronRight className="w-5 h-5" style={{ color: colors.textMuted }} />
                    )}
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: alpha(categoryColor, 20) }}
                    >
                      <CategoryIcon className="w-5 h-5" style={{ color: categoryColor }} />
                    </div>
                    <div>
                      <CardTitle className="text-lg capitalize" style={{ color: colors.text }}>
                        {category}
                      </CardTitle>
                      <CardDescription style={{ color: colors.textMuted }}>
                        {info.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      style={{
                        backgroundColor: alpha(categoryColor, 20),
                        color: categoryColor
                      }}
                    >
                      {enabledCount}/{categoryConfigs.length} enabled
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCategoryAction(category, true)
                        }}
                        disabled={isProcessing !== null}
                        className="h-7 px-2"
                        title="Enable all in category"
                      >
                        <Zap className="w-3 h-3" style={{ color: colors.success }} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCategoryAction(category, false)
                        }}
                        disabled={isProcessing !== null}
                        className="h-7 px-2"
                        title="Disable all in category"
                      >
                        <ZapOff className="w-3 h-3" style={{ color: colors.warning }} />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {categoryConfigs.map((config) => (
                      <div
                        key={config.id}
                        className="flex items-center justify-between p-3 rounded-lg transition-colors"
                        style={{ 
                          backgroundColor: alpha(colors.bgSecondary, 30),
                          opacity: isProcessing === config.pageKey ? 0.5 : 1
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className={`w-2 h-2 rounded-full ${config.enabled ? 'animate-pulse' : ''}`}
                            style={{ 
                              backgroundColor: config.enabled ? colors.success : colors.textMuted 
                            }}
                          />
                          <div>
                            <div className="font-medium" style={{ color: colors.text }}>
                              {config.pageName}
                            </div>
                            <div className="text-xs" style={{ color: colors.textMuted }}>
                              {config.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {config.lastToggledAt && (
                            <div className="flex items-center gap-1 text-xs" style={{ color: colors.textMuted }}>
                              <Clock className="w-3 h-3" />
                              {new Date(config.lastToggledAt).toLocaleDateString()}
                            </div>
                          )}
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                            style={{
                              borderColor: config.enabled 
                                ? alpha(colors.success, 30) 
                                : alpha(colors.warning, 30),
                              color: config.enabled ? colors.success : colors.warning
                            }}
                          >
                            {config.enabled ? 'Auto' : 'Manual'}
                          </Badge>
                          <Switch
                            checked={config.enabled}
                            onCheckedChange={() => handleTogglePage(config.pageKey)}
                            disabled={isProcessing !== null}
                            className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Quick Tips */}
      <Card style={{ backgroundColor: alpha(colors.primary, 10), borderColor: alpha(colors.primary, 30) }}>
        <CardContent className="p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: colors.primary }}>
            <Zap className="w-4 h-4" />
            Performance Tips
          </h4>
          <ul className="text-sm space-y-1" style={{ color: colors.textSecondary }}>
            <li>• <strong>All pages are disabled by default</strong> to reduce database load and prevent 502 errors</li>
            <li>• Enable autoload only for pages you actively use to conserve system resources</li>
            <li>• Pages with disabled autoload will render immediately with empty/placeholder data</li>
            <li>• Use the refresh button on each page to manually load data when needed</li>
            <li>• Disabling heavy pages (Chat Logs, Intelligence) significantly improves stability</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default AutoloadRegistryTab
