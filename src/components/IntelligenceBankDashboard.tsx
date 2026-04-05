'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EntityStats {
  totalEntities: number
  totalUsages: number
  totalRelationships: number
  totalFields: number
  entitiesByType: Record<string, number>
  priorityDistribution: Record<string, number>
  piiFields: number
  highPriorityIssues: number
}

interface Entity {
  id: string
  entityType: string
  entityName: string
  filePath: string
  moduleName?: string
  usageCount: number
  priority: string
  impactScore: number
  hasIssues: boolean
  props: string[]
  imports: string[]
  exports: string[]
}

interface EntityDetail extends Entity {
  usages: any[]
  relationships: any[]
  relatedTo: any[]
  fields: any[]
}

interface HealthScore {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  breakdown: {
    critical: number
    high: number
    medium: number
    low: number
  }
  recommendation: string
}

export function IntelligenceBankDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<EntityStats | null>(null)
  const [health, setHealth] = useState<HealthScore | null>(null)
  const [entities, setEntities] = useState<Entity[]>([])
  const [selectedEntity, setSelectedEntity] = useState<EntityDetail | null>(null)
  const [showEntityDetail, setShowEntityDetail] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, healthRes, entitiesRes] = await Promise.all([
        fetch('/api/intelligence-bank?action=stats'),
        fetch('/api/intelligence-bank?action=health'),
        fetch('/api/intelligence-bank?action=entities&limit=50')
      ])

      const statsData = await statsRes.json()
      const healthData = await healthRes.json()
      const entitiesData = await entitiesRes.json()

      if (statsData.success) setStats(statsData.stats)
      if (healthData.success) setHealth(healthData.health)
      if (entitiesData.success) setEntities(entitiesData.entities)
    } catch (error) {
      console.error('Failed to load intelligence bank data:', error)
    } finally {
      setLoading(false)
    }
  }

  const scanCodebase = async () => {
    setScanning(true)
    try {
      const response = await fetch('/api/intelligence-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan-codebase' })
      })
      const data = await response.json()
      if (data.success) {
        alert(`Scan complete: ${data.entities} entities, ${data.relationships} relationships, ${data.fields} fields`)
        loadData()
      }
    } catch (error) {
      console.error('Scan failed:', error)
    } finally {
      setScanning(false)
    }
  }

  const viewEntityDetail = async (entityId: string) => {
    try {
      const response = await fetch(`/api/intelligence-bank?action=entity&entityId=${entityId}`)
      const data = await response.json()
      if (data.success) {
        setSelectedEntity(data.entity)
        setShowEntityDetail(true)
      }
    } catch (error) {
      console.error('Failed to load entity detail:', error)
    }
  }

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case 'api_route': return '🔌'
      case 'component': return '🧩'
      case 'page': return '📄'
      case 'hook': return '🪝'
      case 'lib': return '📚'
      case 'table': return '🗃️'
      case 'procedure': return '⚙️'
      default: return '📦'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getHealthGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100'
      case 'B': return 'text-blue-600 bg-blue-100'
      case 'C': return 'text-yellow-600 bg-yellow-100'
      case 'D': return 'text-orange-600 bg-orange-100'
      case 'F': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const filteredEntities = entities.filter(entity => {
    const matchesType = filterType === 'all' || entity.entityType === filterType
    const matchesSearch = !searchQuery || 
      entity.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.filePath.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse text-4xl mb-4">🧠</div>
        <p className="text-gray-600">Loading Intelligence Bank...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🧠 Intelligence Bank</h2>
          <p className="text-gray-600 mt-1">
            Smart tracking of entities, relationships, and priorities
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={loadData}
          >
            🔄 Refresh
          </Button>
          <Button 
            onClick={scanCodebase}
            disabled={scanning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {scanning ? '⏳ Scanning...' : '🔍 Scan Codebase'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Entities</div>
              <div className="text-2xl font-bold">{stats.totalEntities}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Usages</div>
              <div className="text-2xl font-bold">{stats.totalUsages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Relationships</div>
              <div className="text-2xl font-bold">{stats.totalRelationships}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Fields Tracked</div>
              <div className="text-2xl font-bold">{stats.totalFields}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">PII Fields</div>
              <div className="text-2xl font-bold text-orange-600">{stats.piiFields}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">High Priority</div>
              <div className="text-2xl font-bold text-red-600">{stats.highPriorityIssues}</div>
            </CardContent>
          </Card>
          
          {/* Health Score */}
          {health && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Health Score</div>
                    <div className="text-2xl font-bold">{health.score}/100</div>
                  </div>
                  <div className={`text-4xl font-bold px-3 py-2 rounded-lg ${getHealthGradeColor(health.grade)}`}>
                    {health.grade}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Health Recommendation */}
      {health && health.breakdown.critical + health.breakdown.high > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <span className="font-medium text-red-800">{health.recommendation}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="entities">
        <TabsList>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="priority">By Priority</TabsTrigger>
          <TabsTrigger value="types">By Type</TabsTrigger>
        </TabsList>

        {/* Entities Tab */}
        <TabsContent value="entities" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex gap-2">
              {['all', 'api_route', 'component', 'page', 'hook', 'lib'].map(type => (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType(type)}
                >
                  {type === 'all' ? 'All' : getEntityTypeIcon(type)} {type.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Entity List */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {filteredEntities.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No entities found. Click "Scan Codebase" to discover entities.
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredEntities.map((entity) => (
                      <div
                        key={entity.id}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => viewEntityDetail(entity.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{getEntityTypeIcon(entity.entityType)}</span>
                            <div>
                              <div className="font-medium">{entity.entityName}</div>
                              <div className="text-sm text-gray-500 font-mono">{entity.filePath}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={getPriorityColor(entity.priority)}>
                              {entity.priority}
                            </Badge>
                            {entity.hasIssues && (
                              <Badge variant="destructive">Issues</Badge>
                            )}
                            <div className="text-sm text-gray-600">
                              {entity.usageCount} uses
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Priority Tab */}
        <TabsContent value="priority" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-4 gap-4">
              {['critical', 'high', 'medium', 'low'].map(priority => (
                <Card key={priority}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="capitalize">{priority}</span>
                      <Badge className={getPriorityColor(priority)}>
                        {stats.priorityDistribution[priority] || 0}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {entities
                          .filter(e => e.priority === priority)
                          .slice(0, 10)
                          .map(entity => (
                            <div
                              key={entity.id}
                              className="p-2 border rounded hover:bg-gray-50 cursor-pointer"
                              onClick={() => viewEntityDetail(entity.id)}
                            >
                              <div className="flex items-center gap-2">
                                <span>{getEntityTypeIcon(entity.entityType)}</span>
                                <span className="font-medium text-sm">{entity.entityName}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {entity.usageCount} uses • Impact: {entity.impactScore}
                              </div>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Types Tab */}
        <TabsContent value="types" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(stats.entitiesByType).map(([type, count]) => (
                <Card key={type}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getEntityTypeIcon(type)}</span>
                      <div>
                        <div className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</div>
                        <div className="text-2xl font-bold">{count}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Entity Detail Dialog */}
      <Dialog open={showEntityDetail} onOpenChange={setShowEntityDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{getEntityTypeIcon(selectedEntity?.entityType || '')}</span>
              {selectedEntity?.entityName}
            </DialogTitle>
            <DialogDescription>
              {selectedEntity?.filePath}
            </DialogDescription>
          </DialogHeader>

          {selectedEntity && (
            <div className="space-y-4">
              {/* Priority & Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-3">
                    <div className="text-sm text-gray-600">Priority</div>
                    <Badge className={getPriorityColor(selectedEntity.priority)}>
                      {selectedEntity.priority}
                    </Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-sm text-gray-600">Usage Count</div>
                    <div className="text-xl font-bold">{selectedEntity.usageCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-sm text-gray-600">Impact Score</div>
                    <div className="text-xl font-bold">{selectedEntity.impactScore}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-sm text-gray-600">Has Issues</div>
                    <div className="text-xl font-bold">
                      {selectedEntity.hasIssues ? '⚠️ Yes' : '✅ No'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Props */}
              {selectedEntity.props.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Props / Parameters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedEntity.props.map((prop, i) => (
                        <Badge key={i} variant="outline">{prop}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Imports */}
              {selectedEntity.imports.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Imports ({selectedEntity.imports.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[100px]">
                      <div className="space-y-1 font-mono text-xs">
                        {selectedEntity.imports.map((imp, i) => (
                          <div key={i} className="text-gray-600">{imp}</div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Fields */}
              {selectedEntity.fields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Fields ({selectedEntity.fields.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedEntity.fields.map((field: any) => (
                        <div key={field.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{field.fieldName}</span>
                            <Badge variant="outline">{field.fieldType}</Badge>
                            {field.isPII && <Badge variant="destructive">PII</Badge>}
                            {field.isPHI && <Badge variant="destructive">PHI</Badge>}
                          </div>
                          <div className="text-xs text-gray-500">
                            {field.semanticType && `Semantic: ${field.semanticType}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Relationships */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Depends On ({selectedEntity.relationships?.length || 0})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[150px]">
                      <div className="space-y-1">
                        {(selectedEntity.relationships || []).map((rel: any, i: number) => (
                          <div key={i} className="text-sm p-1 hover:bg-gray-50 rounded">
                            {getEntityTypeIcon(rel.targetEntity?.entityType)} {rel.targetEntity?.entityName}
                            <span className="text-xs text-gray-500 ml-2">({rel.relationshipType})</span>
                          </div>
                        ))}
                        {(!selectedEntity.relationships || selectedEntity.relationships.length === 0) && (
                          <div className="text-sm text-gray-500">No dependencies</div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Used By ({selectedEntity.relatedTo?.length || 0})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[150px]">
                      <div className="space-y-1">
                        {(selectedEntity.relatedTo || []).map((rel: any, i: number) => (
                          <div key={i} className="text-sm p-1 hover:bg-gray-50 rounded">
                            {getEntityTypeIcon(rel.sourceEntity?.entityType)} {rel.sourceEntity?.entityName}
                            <span className="text-xs text-gray-500 ml-2">({rel.relationshipType})</span>
                          </div>
                        ))}
                        {(!selectedEntity.relatedTo || selectedEntity.relatedTo.length === 0) && (
                          <div className="text-sm text-gray-500">No dependents</div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
