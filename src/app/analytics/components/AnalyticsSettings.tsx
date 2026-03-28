'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Settings, Zap, Database, GitMerge, Check, Info } from 'lucide-react'

export type AnalyticsMode = 'fast' | 'heavy' | 'mixed'

interface AnalyticsSettingsProps {
  currentMode: AnalyticsMode
  onModeChange: (mode: AnalyticsMode) => void
}

const MODE_CONFIG = {
  fast: {
    name: 'Fast',
    icon: Zap,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    description: 'Quick data fetch (~50-100ms)',
    details: [
      'Direct database queries',
      'Minimal processing',
      'Best for real-time updates',
      '~40 lines of code'
    ],
    endpoint: '/api/analytics/fast',
    useCase: 'Real-time monitoring, quick checks'
  },
  heavy: {
    name: 'Heavy',
    icon: Database,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    description: 'Full analytics (~200-500ms)',
    details: [
      'Complete calculations',
      'Intelligence metrics (F6, F7, F9, F10)',
      'Pattern detection',
      'Risk analysis',
      '~683 lines of code'
    ],
    endpoint: '/api/analytics/sync',
    useCase: 'Deep analysis, reports, intelligence'
  },
  mixed: {
    name: 'Mixed',
    icon: GitMerge,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    description: 'Balanced approach (~100-300ms)',
    details: [
      'Fast data fetching (parallel)',
      'Selective heavy calculations',
      'Tab-aware processing',
      'Best of both worlds',
      '~260 lines of code'
    ],
    endpoint: '/api/analytics/mixed',
    useCase: 'Recommended for most use cases'
  }
}

export function AnalyticsSettings({ currentMode, onModeChange }: AnalyticsSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMode, setSelectedMode] = useState<AnalyticsMode>(currentMode)

  // Sync with parent
  useEffect(() => {
    setSelectedMode(currentMode)
  }, [currentMode])

  const handleSave = () => {
    onModeChange(selectedMode)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
          <Badge variant="outline" className={`ml-1 ${MODE_CONFIG[currentMode].color}`}>
            {MODE_CONFIG[currentMode].name}
          </Badge>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Analytics Data Mode
          </DialogTitle>
          <DialogDescription>
            Choose how analytics data is fetched and processed
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup 
            value={selectedMode} 
            onValueChange={(v) => setSelectedMode(v as AnalyticsMode)}
            className="space-y-4"
          >
            {(Object.entries(MODE_CONFIG) as [AnalyticsMode, typeof MODE_CONFIG.fast][]).map(([mode, config]) => {
              const Icon = config.icon
              const isSelected = selectedMode === mode
              
              return (
                <div
                  key={mode}
                  className={`
                    relative flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer
                    transition-all duration-200
                    ${isSelected ? config.borderColor + ' ' + config.bgColor : 'border-muted hover:border-muted-foreground/30'}
                  `}
                  onClick={() => setSelectedMode(mode)}
                >
                  <RadioGroupItem value={mode} className="mt-1" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <span className="font-semibold">{config.name}</span>
                      <Badge variant="outline" className={`text-xs ${config.color}`}>
                        {config.description}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      Endpoint: <code className="text-xs bg-muted px-1 rounded">{config.endpoint}</code>
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {config.details.map((detail, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-green-500" />
                          {detail}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                      Best for: {config.useCase}
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className={`absolute top-2 right-2 ${config.color}`}>
                      <Check className="h-5 w-5" />
                    </div>
                  )}
                </div>
              )
            })}
          </RadioGroup>
        </div>

        {/* Comparison Table */}
        <Card className="bg-muted/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Mode Comparison</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div className="font-medium">Metric</div>
              <div className="font-medium text-green-500">Fast</div>
              <div className="font-medium text-blue-500">Heavy</div>
              <div className="font-medium text-purple-500">Mixed</div>
              
              <div>Response Time</div>
              <div>~50-100ms</div>
              <div>~200-500ms</div>
              <div>~100-300ms</div>
              
              <div>Code Lines</div>
              <div>40</div>
              <div>683</div>
              <div>260</div>
              
              <div>Intelligence</div>
              <div>❌</div>
              <div>✅ Full</div>
              <div>✅ Selective</div>
              
              <div>Patterns</div>
              <div>❌</div>
              <div>✅</div>
              <div>✅ If needed</div>
              
              <div>Risk Analysis</div>
              <div>❌</div>
              <div>✅</div>
              <div>✅ If needed</div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Apply Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook for managing analytics mode with localStorage persistence
export function useAnalyticsMode() {
  const [mode, setMode] = useState<AnalyticsMode>('mixed')

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('analytics-mode') as AnalyticsMode | null
    if (saved && ['fast', 'heavy', 'mixed'].includes(saved)) {
      setMode(saved)
    }
  }, [])

  // Save to localStorage when changed
  const updateMode = (newMode: AnalyticsMode) => {
    setMode(newMode)
    localStorage.setItem('analytics-mode', newMode)
  }

  // Get the endpoint URL for current mode
  const getEndpoint = (params?: Record<string, string>) => {
    const baseEndpoints = {
      fast: '/api/analytics/fast',
      heavy: '/api/analytics/sync',
      mixed: '/api/analytics/mixed'
    }
    
    const url = new URL(baseEndpoints[mode], window.location.origin)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }
    
    return url.toString()
  }

  return { mode, setMode: updateMode, getEndpoint }
}

export default AnalyticsSettings
