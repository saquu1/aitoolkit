'use client'

import React, { useState, useEffect } from 'react'
import {
  Globe,
  Lock,
  ArrowRight,
  ArrowRightLeft,
  Share2,
  AlertTriangle,
  Brain,
  Database,
  Shield,
  ToggleLeft,
  ToggleRight,
  Info,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

// Helper function to create transparent color
const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || !hex.startsWith('#')) return `rgba(59, 130, 246, ${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export type ContextMode = 'global' | 'isolated'
export type ErrorPatternScope = 'global' | 'project' | 'both'
export type IntelligenceScope = 'inherit' | 'isolated' | 'extend'

export interface ProjectContextSettings {
  // Context Mode
  contextMode: ContextMode
  
  // Inheritance Settings
  inheritEntities: boolean
  inheritPatterns: boolean
  inheritRules: boolean
  inheritTests: boolean
  
  // Promotion Settings
  canPromoteToGlobal: boolean
  requireApproval: boolean
  
  // Data Sharing
  allowSharing: boolean
  sharedWithProjects: string[]
  
  // Error Patterns Scope
  errorPatternScope: ErrorPatternScope
  
  // Intelligence Scope
  intelligenceScope: IntelligenceScope
}

interface ContextToggleProps {
  /** Current settings */
  settings: ProjectContextSettings
  /** Callback when settings change */
  onSettingsChange: (settings: ProjectContextSettings) => void
  /** Project ID (for context) */
  projectId?: string
  /** Whether in read-only mode */
  readOnly?: boolean
  /** Show compact version */
  compact?: boolean
  /** Custom class name */
  className?: string
}

export function ContextToggle({
  settings,
  onSettingsChange,
  projectId,
  readOnly = false,
  compact = false,
  className = ''
}: ContextToggleProps) {
  const { colors } = useTheme()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    inheritance: true,
    promotion: false,
    sharing: false,
    advanced: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const updateSetting = <K extends keyof ProjectContextSettings>(
    key: K,
    value: ProjectContextSettings[K]
  ) => {
    if (readOnly) return
    onSettingsChange({
      ...settings,
      [key]: value
    })
  }

  // Compact toggle for quick mode switch
  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          {settings.contextMode === 'global' ? (
            <Globe className="w-4 h-4" style={{ color: colors.primary }} />
          ) : (
            <Lock className="w-4 h-4" style={{ color: colors.textMuted }} />
          )}
          <span className="text-sm font-medium" style={{ color: colors.text }}>
            {settings.contextMode === 'global' ? 'Global Scope' : 'Isolated'}
          </span>
        </div>
        <Switch
          checked={settings.contextMode === 'global'}
          onCheckedChange={(checked) => {
            updateSetting('contextMode', checked ? 'global' : 'isolated')
          }}
          disabled={readOnly}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Context Mode Toggle */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: hexToRgba(settings.contextMode === 'global' ? colors.primary : colors.textMuted, 0.05),
          borderColor: settings.contextMode === 'global' ? colors.primary : colors.border
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {settings.contextMode === 'global' ? (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: hexToRgba(colors.primary, 0.15) }}
              >
                <Globe className="w-5 h-5" style={{ color: colors.primary }} />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: hexToRgba(colors.textMuted, 0.1) }}
              >
                <Lock className="w-5 h-5" style={{ color: colors.textMuted }} />
              </div>
            )}
            <div>
              <h3 className="font-semibold" style={{ color: colors.text }}>
                Context Mode
              </h3>
              <p className="text-sm" style={{ color: colors.textMuted }}>
                {settings.contextMode === 'global'
                  ? 'Inherits from global, can promote findings'
                  : 'Project is isolated from global data'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={settings.contextMode === 'global' ? 'default' : 'secondary'}
              style={{
                backgroundColor: settings.contextMode === 'global' ? colors.primary : hexToRgba(colors.textMuted, 0.1),
                color: settings.contextMode === 'global' ? '#fff' : colors.textMuted
              }}
            >
              {settings.contextMode === 'global' ? 'Global Scope' : 'Isolated'}
            </Badge>
            <Switch
              checked={settings.contextMode === 'global'}
              onCheckedChange={(checked) => {
                updateSetting('contextMode', checked ? 'global' : 'isolated')
              }}
              disabled={readOnly}
            />
          </div>
        </div>

        {/* Mode explanation */}
        <div
          className="p-3 rounded-md text-sm"
          style={{ backgroundColor: hexToRgba(colors.bg, 0.5) }}
        >
          {settings.contextMode === 'global' ? (
            <div className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.primary }} />
              <div>
                <strong>Global Scope:</strong> This project can inherit entity definitions, patterns,
                and rules from the global repository. Learned patterns can be promoted to help other projects.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: colors.textMuted }} />
              <div>
                <strong>Isolated Mode:</strong> This project operates independently without inheriting
                from or contributing to the global repository. Best for sensitive or highly specialized projects.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inheritance Settings (only visible in global mode) */}
      {settings.contextMode === 'global' && (
        <Collapsible
          open={expandedSections.inheritance}
          onOpenChange={() => toggleSection('inheritance')}
        >
          <CollapsibleTrigger
            className="w-full flex items-center justify-between p-3 rounded-lg border hover:opacity-80 transition-opacity"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="font-medium" style={{ color: colors.text }}>
                Inheritance Settings
              </span>
            </div>
            {expandedSections.inheritance ? (
              <ChevronUp className="w-4 h-4" style={{ color: colors.textMuted }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div
              className="p-4 rounded-lg border space-y-4"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              {/* Inherit Entities */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4" style={{ color: colors.textMuted }} />
                  <div>
                    <Label className="font-medium">Inherit Entity Definitions</Label>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      Use global entity definitions in this project
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.inheritEntities}
                  onCheckedChange={(checked) => updateSetting('inheritEntities', checked)}
                  disabled={readOnly}
                />
              </div>

              <Separator style={{ backgroundColor: colors.border }} />

              {/* Inherit Patterns */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="w-4 h-4" style={{ color: colors.textMuted }} />
                  <div>
                    <Label className="font-medium">Inherit Patterns</Label>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      Use global intelligence patterns for suggestions
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.inheritPatterns}
                  onCheckedChange={(checked) => updateSetting('inheritPatterns', checked)}
                  disabled={readOnly}
                />
              </div>

              <Separator style={{ backgroundColor: colors.border }} />

              {/* Inherit Rules */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4" style={{ color: colors.textMuted }} />
                  <div>
                    <Label className="font-medium">Inherit Validation Rules</Label>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      Apply global validation rules to project entities
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.inheritRules}
                  onCheckedChange={(checked) => updateSetting('inheritRules', checked)}
                  disabled={readOnly}
                />
              </div>

              <Separator style={{ backgroundColor: colors.border }} />

              {/* Inherit Tests */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Check className="w-4 h-4" style={{ color: colors.textMuted }} />
                  <div>
                    <Label className="font-medium">Inherit Contract Tests</Label>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      Use global contract test templates
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.inheritTests}
                  onCheckedChange={(checked) => updateSetting('inheritTests', checked)}
                  disabled={readOnly}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Error Pattern Scope */}
      <div
        className="p-4 rounded-lg border"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4" style={{ color: colors.textMuted }} />
          <Label className="font-medium">Error Pattern Scope</Label>
        </div>
        <Select
          value={settings.errorPatternScope}
          onValueChange={(value: ErrorPatternScope) => updateSetting('errorPatternScope', value)}
          disabled={readOnly}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="project">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Project Only</span>
              </div>
            </SelectItem>
            <SelectItem value="global">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>Global Only</span>
              </div>
            </SelectItem>
            <SelectItem value="both">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                <span>Both (Project + Global)</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs mt-2" style={{ color: colors.textMuted }}>
          {settings.errorPatternScope === 'project' && 'Only see errors from this project'}
          {settings.errorPatternScope === 'global' && 'See errors from all projects'}
          {settings.errorPatternScope === 'both' && 'See errors from this project and global patterns'}
        </p>
      </div>
    </div>
  )
}

// Default settings
export const DEFAULT_CONTEXT_SETTINGS: ProjectContextSettings = {
  contextMode: 'global',
  inheritEntities: true,
  inheritPatterns: true,
  inheritRules: true,
  inheritTests: false,
  canPromoteToGlobal: false,
  requireApproval: true,
  allowSharing: false,
  sharedWithProjects: [],
  errorPatternScope: 'project',
  intelligenceScope: 'inherit'
}

export default ContextToggle
