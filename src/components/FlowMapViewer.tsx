'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'

interface FlowNode {
  id: string
  nodeType: string
  name: string
  label?: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  color: string
  hasIssues?: boolean
}

interface FlowEdge {
  id: string
  source: string
  target: string
  type: string
  label?: string
  animated?: boolean
  data?: {
    dataType?: string
    isValid?: boolean
  }
}

interface FlowMap {
  nodes: FlowNode[]
  edges: FlowEdge[]
  metadata: {
    scanId: string
    totalNodes: number
    totalEdges: number
    issueCount: number
    layers: {
      frontend: number
      api: number
      database: number
    }
  }
}

export function FlowMapViewer() {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [flowMap, setFlowMap] = useState<FlowMap | null>(null)
  const [scanId, setScanId] = useState('')
  const [mermaidCode, setMermaidCode] = useState('')
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null)
  const [viewMode, setViewMode] = useState<'canvas' | 'mermaid'>('canvas')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generateFlowMap = async () => {
    if (!scanId) {
      // Generate a new scan ID if not provided
      const newScanId = `FLOW-${Date.now()}`
      setScanId(newScanId)
    }

    setGenerating(true)
    try {
      const response = await fetch('/api/flow-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          scanId: scanId || `FLOW-${Date.now()}`
        })
      })
      const data = await response.json()
      if (data.success) {
        setFlowMap(data.flowMap)
      }
    } catch (error) {
      console.error('Failed to generate flow map:', error)
    } finally {
      setGenerating(false)
    }
  }

  const loadFlowMap = async () => {
    if (!scanId) return

    setLoading(true)
    try {
      const [mapRes, mermaidRes] = await Promise.all([
        fetch(`/api/flow-map?action=get&scanId=${scanId}`),
        fetch(`/api/flow-map?action=mermaid&scanId=${scanId}`)
      ])
      
      const mapData = await mapRes.json()
      const mermaidData = await mermaidRes.json()

      if (mapData.success) {
        setFlowMap(mapData.flowMap)
      }
      if (mermaidData.success) {
        setMermaidCode(mermaidData.mermaid)
      }
    } catch (error) {
      console.error('Failed to load flow map:', error)
    } finally {
      setLoading(false)
    }
  }

  // Draw flow map on canvas
  useEffect(() => {
    if (!flowMap || !canvasRef.current || viewMode !== 'canvas') return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 1000
    canvas.height = 700

    // Clear canvas
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw layer backgrounds
    ctx.fillStyle = '#eff6ff'
    ctx.fillRect(20, 50, 960, 150)
    ctx.fillStyle = '#ecfdf5'
    ctx.fillRect(20, 220, 960, 150)
    ctx.fillStyle = '#fffbeb'
    ctx.fillRect(20, 390, 960, 150)

    // Draw layer labels
    ctx.font = 'bold 14px system-ui'
    ctx.fillStyle = '#1e40af'
    ctx.fillText('Frontend Layer', 30, 70)
    ctx.fillStyle = '#047857'
    ctx.fillText('API Layer', 30, 240)
    ctx.fillStyle = '#b45309'
    ctx.fillText('Database Layer', 30, 410)

    // Draw edges first (so nodes appear on top)
    for (const edge of flowMap.edges) {
      const source = flowMap.nodes.find(n => n.id === edge.source)
      const target = flowMap.nodes.find(n => n.id === edge.target)

      if (source && target) {
        ctx.beginPath()
        ctx.strokeStyle = edge.data?.isValid === false ? '#ef4444' : '#94a3b8'
        ctx.lineWidth = 2

        // Draw arrow
        const startX = source.position.x + source.size.width / 2
        const startY = source.position.y + source.size.height
        const endX = target.position.x + target.size.width / 2
        const endY = target.position.y

        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()

        // Draw arrowhead
        const angle = Math.atan2(endY - startY, endX - startX)
        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(endX - 10 * Math.cos(angle - Math.PI / 6), endY - 10 * Math.sin(angle - Math.PI / 6))
        ctx.lineTo(endX - 10 * Math.cos(angle + Math.PI / 6), endY - 10 * Math.sin(angle + Math.PI / 6))
        ctx.closePath()
        ctx.fillStyle = edge.data?.isValid === false ? '#ef4444' : '#94a3b8'
        ctx.fill()

        // Draw edge label
        if (edge.label) {
          ctx.font = '10px system-ui'
          ctx.fillStyle = '#64748b'
          ctx.fillText(edge.label, (startX + endX) / 2 - 20, (startY + endY) / 2)
        }
      }
    }

    // Draw nodes
    for (const node of flowMap.nodes) {
      const { position, size, color, label, name } = node

      // Draw node box
      ctx.fillStyle = color
      ctx.strokeStyle = node.hasIssues ? '#ef4444' : '#e2e8f0'
      ctx.lineWidth = node.hasIssues ? 3 : 1

      // Rounded rectangle
      const radius = 8
      ctx.beginPath()
      ctx.moveTo(position.x + radius, position.y)
      ctx.lineTo(position.x + size.width - radius, position.y)
      ctx.quadraticCurveTo(position.x + size.width, position.y, position.x + size.width, position.y + radius)
      ctx.lineTo(position.x + size.width, position.y + size.height - radius)
      ctx.quadraticCurveTo(position.x + size.width, position.y + size.height, position.x + size.width - radius, position.y + size.height)
      ctx.lineTo(position.x + radius, position.y + size.height)
      ctx.quadraticCurveTo(position.x, position.y + size.height, position.x, position.y + size.height - radius)
      ctx.lineTo(position.x, position.y + radius)
      ctx.quadraticCurveTo(position.x, position.y, position.x + radius, position.y)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Draw node text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(label || name, position.x + size.width / 2, position.y + size.height / 2 + 4)
      ctx.textAlign = 'left'
    }
  }, [flowMap, viewMode])

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'frontend_component': return '🧩'
      case 'api_endpoint': return '🔌'
      case 'database_table': return '🗃️'
      case 'hook': return '🪝'
      default: return '📦'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🗺️ Data Flow Map</h2>
          <p className="text-gray-600 mt-1">
            Visualize data flow between Frontend ↔ API ↔ Database
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Scan ID (optional)"
            value={scanId}
            onChange={(e) => setScanId(e.target.value)}
            className="w-48"
          />
          <Button variant="outline" onClick={loadFlowMap} disabled={loading || !scanId}>
            Load
          </Button>
          <Button onClick={generateFlowMap} disabled={generating} className="bg-blue-600 hover:bg-blue-700">
            {generating ? '⏳ Generating...' : '🔍 Generate Flow Map'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {flowMap && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Nodes</div>
              <div className="text-2xl font-bold">{flowMap.metadata.totalNodes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Flows</div>
              <div className="text-2xl font-bold">{flowMap.metadata.totalEdges}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Frontend</div>
              <div className="text-2xl font-bold text-blue-600">{flowMap.metadata.layers.frontend}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">API</div>
              <div className="text-2xl font-bold text-green-600">{flowMap.metadata.layers.api}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Database</div>
              <div className="text-2xl font-bold text-amber-600">{flowMap.metadata.layers.database}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'canvas' | 'mermaid')}>
        <TabsList>
          <TabsTrigger value="canvas">Visual Canvas</TabsTrigger>
          <TabsTrigger value="mermaid">Mermaid Diagram</TabsTrigger>
        </TabsList>

        <TabsContent value="canvas" className="space-y-4">
          {!flowMap ? (
            <Card className="bg-gray-50 border-dashed">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-4">🗺️</div>
                <p className="text-gray-600">
                  Click "Generate Flow Map" to visualize data flow
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <Card>
                  <CardContent className="p-4">
                    <canvas
                      ref={canvasRef}
                      className="w-full border rounded-lg bg-slate-50"
                    />
                  </CardContent>
                </Card>
              </div>
              
              {/* Legend & Details */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Legend</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-blue-500"></div>
                      <span className="text-sm">Frontend Component</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-500"></div>
                      <span className="text-sm">API Endpoint</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-amber-500"></div>
                      <span className="text-sm">Database Table</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-purple-500"></div>
                      <span className="text-sm">Hook</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Flow Types</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium text-blue-600">→</span> Request
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-green-600">←</span> Response
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-amber-600">⚡</span> Mutation
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-purple-600">?</span> Query
                    </div>
                  </CardContent>
                </Card>

                {flowMap.metadata.issueCount > 0 && (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="text-red-600 font-medium">
                        ⚠️ {flowMap.metadata.issueCount} flow issue(s) detected
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="mermaid" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Mermaid Diagram Code</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(mermaidCode)
                    alert('Copied to clipboard!')
                  }}
                  disabled={!mermaidCode}
                >
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mermaidCode ? (
                <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-sm font-mono">
                  {mermaidCode}
                </pre>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  Generate a flow map to see Mermaid code
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Node List */}
      {flowMap && flowMap.nodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nodes ({flowMap.nodes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="grid grid-cols-3 gap-2">
                {flowMap.nodes.map((node) => (
                  <div
                    key={node.id}
                    className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedNode(node)}
                  >
                    <span>{getNodeIcon(node.nodeType)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{node.label || node.name}</div>
                      <div className="text-xs text-gray-500">{node.nodeType.replace('_', ' ')}</div>
                    </div>
                    {node.hasIssues && (
                      <Badge variant="destructive" className="text-xs">!</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
