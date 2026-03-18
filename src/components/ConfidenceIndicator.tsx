"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from "lucide-react"

interface ConfidenceIndicatorProps {
  score: number
  confidence: 'high' | 'medium' | 'low' | 'unverified'
  factors?: Array<{
    name: string
    contribution: number
    passed: boolean
  }>
  showDetails?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ConfidenceIndicator({
  score,
  confidence,
  factors = [],
  showDetails = false,
  size = 'md',
  className = ''
}: ConfidenceIndicatorProps) {
  const percentage = Math.round(score * 100)
  
  const colorClass = useMemo(() => {
    switch (confidence) {
      case 'high': return 'text-green-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-orange-500'
      case 'unverified': return 'text-red-500'
    }
  }, [confidence])
  
  const bgColorClass = useMemo(() => {
    switch (confidence) {
      case 'high': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-orange-500'
      case 'unverified': return 'bg-red-500'
    }
  }, [confidence])
  
  const badgeVariant = useMemo(() => {
    switch (confidence) {
      case 'high': return 'default'
      case 'medium': return 'secondary'
      default: return 'destructive'
    }
  }, [confidence])

  const Icon = useMemo(() => {
    switch (confidence) {
      case 'high': return CheckCircle2
      case 'medium': return AlertTriangle
      case 'low': return AlertTriangle
      case 'unverified': return HelpCircle
    }
  }, [confidence])

  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'sm': return { progress: 'w-12 h-1.5', badge: 'text-xs', icon: 'w-3 h-3' }
      case 'lg': return { progress: 'w-24 h-3', badge: 'text-sm', icon: 'w-5 h-5' }
      default: return { progress: 'w-16 h-2', badge: 'text-xs', icon: 'w-4 h-4' }
    }
  }, [size])

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help">
              <Icon className={`${sizeClasses.icon} ${colorClass}`} />
              <Progress 
                value={percentage} 
                className={sizeClasses.progress}
              />
              <Badge 
                variant={badgeVariant}
                className={`${sizeClasses.badge} ${confidence === 'high' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : confidence === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' : ''}`}
              >
                {percentage}%
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${colorClass}`} />
                <p className="font-semibold">
                  Confidence: {confidence.toUpperCase()}
                </p>
              </div>
              {factors.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Scoring Factors:</p>
                  {factors.map(factor => (
                    <div key={factor.name} className="flex items-center gap-2 text-xs">
                      {factor.passed ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-500" />
                      )}
                      <span className="capitalize">{factor.name.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-muted-foreground">
                        ({Math.round(factor.contribution * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
        
        {showDetails && factors.length > 0 && (
          <div className="ml-4 border-l pl-4 hidden md:block">
            <p className="text-xs text-muted-foreground mb-2">
              Factor Breakdown:
            </p>
            <div className="space-y-1">
              {factors.map(factor => (
                <div key={factor.name} className="flex items-center gap-2 text-xs">
                  {factor.passed ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500" />
                  )}
                  <span className="capitalize">{factor.name.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="text-muted-foreground">
                    ({Math.round(factor.contribution * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// Compact inline version for tables
export function ConfidenceBadge({
  score,
  confidence,
  className = ''
}: {
  score: number
  confidence: 'high' | 'medium' | 'low' | 'unverified'
  className?: string
}) {
  const percentage = Math.round(score * 100)
  
  const colorClass = useMemo(() => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
      case 'low': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
      case 'unverified': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
    }
  }, [confidence])
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass} ${className}`}>
      {percentage}%
    </span>
  )
}

// Mini indicator for status columns
export function ConfidenceDot({
  confidence,
  className = ''
}: {
  confidence: 'high' | 'medium' | 'low' | 'unverified'
  className?: string
}) {
  const colorClass = useMemo(() => {
    switch (confidence) {
      case 'high': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-orange-500'
      case 'unverified': return 'bg-red-500'
    }
  }, [confidence])
  
  return (
    <div 
      className={`w-2.5 h-2.5 rounded-full ${colorClass} ${className}`}
      title={`Confidence: ${confidence}`}
    />
  )
}
