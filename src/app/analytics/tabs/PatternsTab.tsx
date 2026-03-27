'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Pattern {
  id: string
  name: string
  category: string
  description: string
  occurrenceCount: number
  status: string
  lastSeen: string
  preventionRule?: string
}

export function PatternsTab() {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        const res = await fetch('/api/analytics/intelligence?action=patterns')
        const data = await res.json()
        if (data.success) {
          setPatterns(data.patterns || [])
        }
      } catch (error) {
        console.error('Failed to fetch patterns:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPatterns()
  }, [])

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'optimization':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Lightbulb className="h-4 w-4 text-blue-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Detected Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patterns.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No patterns detected</p>
            ) : (
              <div className="space-y-3">
                {patterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {getCategoryIcon(pattern.category)}
                        <div>
                          <p className="font-medium text-sm">{pattern.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {pattern.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {pattern.occurrenceCount} occurrences
                        </Badge>
                        <Badge variant={pattern.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {pattern.status}
                        </Badge>
                      </div>
                    </div>
                    {pattern.preventionRule && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                        {pattern.preventionRule}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Last seen: {new Date(pattern.lastSeen).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
