/**
 * AutoloadToggle Component
 * ========================
 * A toggle button for enabling/disabling autoload on individual pages.
 * Can be placed in page headers or settings panels.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  Loader2, 
  Database, 
  RefreshCw,
  Settings2,
  Power,
  PowerOff
} from 'lucide-react'
import { useAutoload } from '@/hooks/useAutoload'
import { useTheme } from '@/hooks/useTheme'

interface AutoloadToggleProps {
  pageKey: string
  showLabel?: boolean
  variant?: 'switch' | 'button' | 'badge'
  size?: 'sm' | 'md' | 'lg'
  onStatusChange?: (enabled: boolean) => void
}

export function AutoloadToggle({ 
  pageKey, 
  showLabel = false, 
  variant = 'switch',
  size = 'sm',
  onStatusChange 
}: AutoloadToggleProps) {
  const { colors } = useTheme()
  const { enabled, loading, config, toggle } = useAutoload(pageKey)
  const [isToggling, setIsToggling] = useState(false)

  const handleToggle = async () => {
    setIsToggling(true)
    await toggle()
    onStatusChange?.(!enabled)
    setIsToggling(false)
  }

  const alpha = (color: string, opacity: number) => 
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  if (variant === 'switch') {
    return (
      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={loading || isToggling}
          className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-400"
        />
        {showLabel && (
          <span className="text-sm" style={{ color: colors.textMuted }}>
            {loading ? 'Loading...' : enabled ? 'Auto-load on' : 'Auto-load off'}
          </span>
        )}
      </div>
    )
  }

  if (variant === 'badge') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              className={`cursor-pointer transition-all ${isToggling ? 'opacity-50' : ''}`}
              style={{
                backgroundColor: enabled 
                  ? alpha(colors.success, 20) 
                  : alpha(colors.warning, 20),
                color: enabled ? colors.success : colors.warning,
                border: `1px solid ${enabled ? alpha(colors.success, 30) : alpha(colors.warning, 30)}`
              }}
              onClick={handleToggle}
            >
              {loading || isToggling ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Database className={`w-3 h-3 mr-1 ${enabled ? '' : 'opacity-50'}`} />
              )}
              {enabled ? 'Auto' : 'Manual'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{enabled ? 'Click to disable auto-load' : 'Click to enable auto-load'}</p>
            <p className="text-xs opacity-70">
              {config?.description || 'Controls automatic data fetching'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Button variant
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size={size === 'lg' ? 'default' : 'sm'}
            disabled={loading || isToggling}
            onClick={handleToggle}
            style={{
              backgroundColor: enabled 
                ? alpha(colors.success, 10) 
                : alpha(colors.warning, 10),
              borderColor: enabled 
                ? alpha(colors.success, 30) 
                : alpha(colors.warning, 30),
              color: enabled ? colors.success : colors.warning
            }}
          >
            {loading || isToggling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : enabled ? (
              <Database className="w-4 h-4" />
            ) : (
              <PowerOff className="w-4 h-4" />
            )}
            {showLabel && (
              <span className="ml-2">
                {enabled ? 'Auto-Load On' : 'Auto-Load Off'}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{config?.pageName || pageKey}</p>
          <p>{enabled ? 'Auto-load is enabled' : 'Auto-load is disabled'}</p>
          {config?.description && (
            <p className="text-xs opacity-70 mt-1">{config.description}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Mini autoload indicator - shows status without toggle
 */
export function AutoloadIndicator({ pageKey }: { pageKey: string }) {
  const { colors } = useTheme()
  const { enabled, loading } = useAutoload(pageKey)

  if (loading) {
    return (
      <RefreshCw 
        className="w-3 h-3 animate-spin" 
        style={{ color: colors.textMuted }} 
      />
    )
  }

  return (
    <div 
      className={`w-2 h-2 rounded-full ${enabled ? 'animate-pulse' : ''}`}
      style={{ 
        backgroundColor: enabled ? colors.success : colors.warning 
      }}
      title={enabled ? 'Auto-load enabled' : 'Auto-load disabled'}
    />
  )
}

export default AutoloadToggle
