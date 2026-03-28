'use client'

import React, { useState } from 'react'
import { Settings, Globe, Lock, ChevronDown } from 'lucide-react'
import { ProjectSelector } from './ProjectSelector'
import { ContextToggle } from './ContextToggle'
import { useProjectScopeContext } from '@/contexts/ProjectScopeContext'
import { useTheme } from '@/hooks/useTheme'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// Helper function to create transparent color
const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || !hex.startsWith('#')) return `rgba(59, 130, 246, ${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

interface ProjectScopeHeaderProps {
  /** Show compact mode (for smaller headers) */
  compact?: boolean
  /** Show context settings button */
  showSettings?: boolean
  /** Additional class name */
  className?: string
  /** Position variant */
  variant?: 'header' | 'sidebar' | 'standalone'
}

export function ProjectScopeHeader({
  compact = false,
  showSettings = true,
  className = '',
  variant = 'header'
}: ProjectScopeHeaderProps) {
  const { colors } = useTheme()
  const {
    scope,
    setScope,
    contextSettings,
    setContextSettings,
    isGlobalScope,
    isIsolated,
    isMultiProjectMode
  } = useProjectScopeContext()

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Get badge info for current mode
  const getModeBadge = () => {
    if (isGlobalScope) {
      return {
        label: 'Global',
        color: colors.primary,
        icon: Globe
      }
    }
    if (isMultiProjectMode) {
      return {
        label: `${scope.selectedProjectIds.length} Projects`,
        color: colors.textMuted,
        icon: null
      }
    }
    return {
      label: isIsolated ? 'Isolated' : 'Project',
      color: isIsolated ? colors.textMuted : colors.primary,
      icon: isIsolated ? Lock : null
    }
  }

  const modeBadge = getModeBadge()
  const ModeIcon = modeBadge.icon

  if (variant === 'sidebar') {
    return (
      <div className={`space-y-3 ${className}`}>
        <ProjectSelector
          scope={scope}
          onScopeChange={setScope}
          showSettings={false}
          size="md"
          compact={compact}
        />
        
        {!compact && (
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              {ModeIcon && <ModeIcon className="w-3.5 h-3.5" style={{ color: modeBadge.color }} />}
              <span className="text-xs font-medium" style={{ color: colors.textMuted }}>
                {modeBadge.label}
              </span>
            </div>
            
            {showSettings && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="w-3.5 h-3.5" style={{ color: colors.textMuted }} />
              </Button>
            )}
          </div>
        )}

        {/* Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Context Settings</DialogTitle>
              <DialogDescription>
                Configure how this project interacts with the global intelligence bank
              </DialogDescription>
            </DialogHeader>
            <ContextToggle
              settings={contextSettings}
              onSettingsChange={setContextSettings}
              compact={false}
            />
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Header variant (default)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Project Selector */}
      <ProjectSelector
        scope={scope}
        onScopeChange={setScope}
        showSettings={false}
        size={compact ? 'sm' : 'md'}
        compact={compact}
      />

      {/* Mode Badge */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{
          backgroundColor: hexToRgba(modeBadge.color, 0.1),
          color: modeBadge.color
        }}
      >
        {ModeIcon && <ModeIcon className="w-3 h-3" />}
        <span>{modeBadge.label}</span>
      </div>

      {/* Settings Button */}
      {showSettings && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
              >
                <Settings className="w-4 h-4" />
                {!compact && <span className="hidden sm:inline">Settings</span>}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Scope Settings</DialogTitle>
                <DialogDescription>
                  Configure how this project interacts with the global intelligence bank
                </DialogDescription>
              </DialogHeader>
              <ContextToggle
                settings={contextSettings}
                onSettingsChange={setContextSettings}
                compact={false}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

export default ProjectScopeHeader
