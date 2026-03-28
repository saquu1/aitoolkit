'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/hooks/useTheme'
import {
  Database,
  Table2,
  GitBranch,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  RefreshCw,
  Filter,
  Layers,
  Circle,
  Square,
  Triangle,
  Eye,
  Settings,
  Move,
  Image
} from 'lucide-react'
import { GraphLegend } from './GraphLegend'
import { NodeDetails } from './NodeDetails'

// Types for the Knowledge Graph
interface GraphNode {
  id: string
  label: string
  type: 'table' | 'procedure' | 'view' | 'module' | 'form' | 'api'
  module?: string
  status?: string
  connections: number
  x: number
  y: number
  size: number
}

interface GraphEdge {
  id: string
  source: string
  target: string
  type: 'fk' | 'sp_access' | 'module_contains' | 'api_use'
  label?: string
}

interface KnowledgeGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

interface KnowledgeGraphViewerProps {
  tables?: any[]
  procedures?: any[]
  modules?: any[]
  onNodeClick?: (nodeId: string, nodeType: string) => void
}

// Color mapping for node types
const nodeTypeColors: Record<string, { bg: string; border: string; text: string }> = {
  table: { bg: 'rgba(59, 130, 246, 0.2)', border: '#3B82F6', text: '#60A5FA' },
  procedure: { bg: 'rgba(16, 185, 129, 0.2)', border: '#10B981', text: '#34D399' },
  view: { bg: 'rgba(139, 92, 246, 0.2)', border: '#8B5CF6', text: '#A78BFA' },
  module: { bg: 'rgba(245, 158, 11, 0.2)', border: '#F59E0B', text: '#FBBF24' },
  form: { bg: 'rgba(236, 72, 153, 0.2)', border: '#EC4899', text: '#F472B6' },
  api: { bg: 'rgba(6, 182, 212, 0.2)', border: '#06B6D4', text: '#22D3EE' }
}

// Node shape by type
const nodeShapes: Record<string, 'circle' | 'rectangle' | 'diamond' | 'hexagon'> = {
  table: 'rectangle',
  procedure: 'diamond',
  view: 'circle',
  module: 'hexagon',
  form: 'rectangle',
  api: 'circle'
}

export function KnowledgeGraphViewer({
  tables = [],
  procedures = [],
  modules = [],
  onNodeClick
}: KnowledgeGraphViewerProps) {
  const { colors } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // State
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterModule, setFilterModule] = useState<string>('all')
  const [showLabels, setShowLabels] = useState(true)
  const [showConnections, setShowConnections] = useState(true)
  const [layoutAlgorithm, setLayoutAlgorithm] = useState<'force' | 'circular' | 'hierarchical'>('force')
  
  // Transform data into graph format
  const graphData: KnowledgeGraphData = useMemo(() => {
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    let nodeIndex = 0
    
    // Add table nodes
    tables.forEach((table: any, idx: number) => {
      const angle = (idx / tables.length) * 2 * Math.PI
      const radius = 250
      nodes.push({
        id: `table-${table.tableName || table.name}`,
        label: table.tableName || table.name,
        type: 'table',
        module: table.linkedModule,
        status: table.status,
        connections: table.foreignKeys?.length || 0,
        x: table.x || Math.cos(angle) * radius + 400,
        y: table.y || Math.sin(angle) * radius + 300,
        size: Math.max(30, Math.min(60, 20 + (table.columns?.length || 5) * 2))
      })
    })
    
    // Add procedure nodes
    procedures.forEach((proc: any, idx: number) => {
      const angle = ((idx / procedures.length) * 2 * Math.PI) + Math.PI
      const radius = 180
      nodes.push({
        id: `proc-${proc.procedureName || proc.name}`,
        label: proc.procedureName || proc.name,
        type: 'procedure',
        module: proc.module,
        connections: proc.tablesAccessed?.length || 0,
        x: proc.x || Math.cos(angle) * radius + 400,
        y: proc.y || Math.sin(angle) * radius + 300,
        size: 25
      })
      
      // Add edges for tables accessed
      if (proc.tablesAccessed) {
        proc.tablesAccessed.forEach((tableName: string) => {
          edges.push({
            id: `edge-${proc.procedureName}-${tableName}`,
            source: `proc-${proc.procedureName || proc.name}`,
            target: `table-${tableName}`,
            type: 'sp_access'
          })
        })
      }
    })
    
    // Add module nodes
    modules.forEach((mod: any, idx: number) => {
      const angle = ((idx / modules.length) * 2 * Math.PI) + Math.PI / 2
      const radius = 350
      nodes.push({
        id: `module-${mod.key || mod.name}`,
        label: mod.name,
        type: 'module',
        module: mod.key,
        connections: mod.tables?.length || 0,
        x: mod.x || Math.cos(angle) * radius + 400,
        y: mod.y || Math.sin(angle) * radius + 300,
        size: 35
      })
      
      // Add edges for module tables
      if (mod.tables) {
        mod.tables.forEach((tableName: string) => {
          edges.push({
            id: `edge-mod-${mod.key}-${tableName}`,
            source: `module-${mod.key || mod.name}`,
            target: `table-${tableName}`,
            type: 'module_contains'
          })
        })
      }
    })
    
    // Add FK edges between tables
    tables.forEach((table: any) => {
      if (table.foreignKeys) {
        table.foreignKeys.forEach((fk: any) => {
          const targetId = `table-${fk.referencesTable}`
          if (nodes.find(n => n.id === targetId)) {
            edges.push({
              id: `fk-${table.tableName}-${fk.referencesTable}`,
              source: `table-${table.tableName || table.name}`,
              target: targetId,
              type: 'fk',
              label: fk.columnName
            })
          }
        })
      }
    })
    
    return { nodes, edges }
  }, [tables, procedures, modules])
  
  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter(node => {
      const matchesSearch = searchQuery === '' || 
        node.label.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === 'all' || node.type === filterType
      const matchesModule = filterModule === 'all' || node.module === filterModule
      return matchesSearch && matchesType && matchesModule
    })
  }, [graphData.nodes, searchQuery, filterType, filterModule])
  
  // Filtered edges
  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id))
    return graphData.edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    )
  }, [graphData.edges, filteredNodes])
  
  // Statistics
  const stats = useMemo(() => {
    const byType: Record<string, number> = {}
    filteredNodes.forEach(node => {
      byType[node.type] = (byType[node.type] || 0) + 1
    })
    return {
      totalNodes: filteredNodes.length,
      totalEdges: filteredEdges.length,
      byType
    }
  }, [filteredNodes, filteredEdges])
  
  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const render = () => {
      const width = canvas.width
      const height = canvas.height
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height)
      
      // Apply transformations
      ctx.save()
      ctx.translate(pan.x + width / 2, pan.y + height / 2)
      ctx.scale(zoom, zoom)
      ctx.translate(-width / 2, -height / 2)
      
      // Draw edges
      if (showConnections) {
        filteredEdges.forEach(edge => {
          const source = graphData.nodes.find(n => n.id === edge.source)
          const target = graphData.nodes.find(n => n.id === edge.target)
          
          if (source && target) {
            ctx.beginPath()
            ctx.moveTo(source.x, source.y)
            ctx.lineTo(target.x, target.y)
            
            // Edge styling based on type
            const edgeColors: Record<string, string> = {
              fk: colors.primary,
              sp_access: colors.success,
              module_contains: colors.warning,
              api_use: colors.accent
            }
            
            ctx.strokeStyle = edgeColors[edge.type] || colors.textMuted
            ctx.lineWidth = edge.type === 'fk' ? 2 : 1
            ctx.globalAlpha = 0.5
            ctx.stroke()
            ctx.globalAlpha = 1
            
            // Draw arrow
            const angle = Math.atan2(target.y - source.y, target.x - source.x)
            const arrowSize = 10
            const arrowX = target.x - Math.cos(angle) * (target.size / 2 + 5)
            const arrowY = target.y - Math.sin(angle) * (target.size / 2 + 5)
            
            ctx.beginPath()
            ctx.moveTo(arrowX, arrowY)
            ctx.lineTo(
              arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
              arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
            )
            ctx.lineTo(
              arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
              arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
            )
            ctx.closePath()
            ctx.fillStyle = edgeColors[edge.type] || colors.textMuted
            ctx.fill()
          }
        })
      }
      
      // Draw nodes
      filteredNodes.forEach(node => {
        const isSelected = selectedNode?.id === node.id
        const isHovered = hoveredNode?.id === node.id
        const nodeColor = nodeTypeColors[node.type]
        
        ctx.save()
        ctx.translate(node.x, node.y)
        
        // Draw node shape
        const shape = nodeShapes[node.type]
        ctx.beginPath()
        
        if (shape === 'rectangle') {
          const w = node.size
          const h = node.size * 0.6
          ctx.roundRect(-w / 2, -h / 2, w, h, 4)
        } else if (shape === 'circle') {
          ctx.arc(0, 0, node.size / 2, 0, Math.PI * 2)
        } else if (shape === 'diamond') {
          ctx.moveTo(0, -node.size / 2)
          ctx.lineTo(node.size / 2, 0)
          ctx.lineTo(0, node.size / 2)
          ctx.lineTo(-node.size / 2, 0)
          ctx.closePath()
        } else if (shape === 'hexagon') {
          const sides = 6
          for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI / sides) - Math.PI / 2
            const x = Math.cos(angle) * node.size / 2
            const y = Math.sin(angle) * node.size / 2
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
        }
        
        // Fill
        ctx.fillStyle = nodeColor.bg
        ctx.fill()
        
        // Stroke
        ctx.strokeStyle = isSelected ? '#FFFFFF' : nodeColor.border
        ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1.5
        ctx.stroke()
        
        // Draw label
        if (showLabels && zoom > 0.5) {
          ctx.fillStyle = nodeColor.text
          ctx.font = `${isHovered || isSelected ? 'bold' : 'normal'} ${11}px system-ui`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          
          // Truncate long labels
          let label = node.label
          if (label.length > 15) {
            label = label.substring(0, 12) + '...'
          }
          ctx.fillText(label, 0, node.size / 2 + 15)
        }
        
        ctx.restore()
      })
      
      ctx.restore()
    }
    
    render()
  }, [filteredNodes, filteredEdges, graphData.nodes, zoom, pan, selectedNode, hoveredNode, showConnections, showLabels, colors])
  
  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = (e.clientX - rect.left - pan.x - rect.width / 2) / zoom + rect.width / 2
    const y = (e.clientY - rect.top - pan.y - rect.height / 2) / zoom + rect.height / 2
    
    // Check if clicking on a node
    const clickedNode = filteredNodes.find(node => {
      const dx = node.x - x
      const dy = node.y - y
      return Math.sqrt(dx * dx + dy * dy) < node.size / 2
    })
    
    if (clickedNode) {
      setSelectedNode(clickedNode)
      onNodeClick?.(clickedNode.id, clickedNode.type)
    } else {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    } else {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      
      const x = (e.clientX - rect.left - pan.x - rect.width / 2) / zoom + rect.width / 2
      const y = (e.clientY - rect.top - pan.y - rect.height / 2) / zoom + rect.height / 2
      
      const hovered = filteredNodes.find(node => {
        const dx = node.x - x
        const dy = node.y - y
        return Math.sqrt(dx * dx + dy * dy) < node.size / 2
      })
      
      setHoveredNode(hovered || null)
    }
  }
  
  const handleMouseUp = () => {
    setIsDragging(false)
  }
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.max(0.2, Math.min(3, prev * delta)))
  }
  
  // Export functions
  const exportAsSVG = () => {
    // Generate SVG content
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">`
    
    // Add edges
    filteredEdges.forEach(edge => {
      const source = graphData.nodes.find(n => n.id === edge.source)
      const target = graphData.nodes.find(n => n.id === edge.target)
      if (source && target) {
        svgContent += `<line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" stroke="#${colors.textMuted}" stroke-width="1"/>`
      }
    })
    
    // Add nodes
    filteredNodes.forEach(node => {
      const nodeColor = nodeTypeColors[node.type]
      svgContent += `<circle cx="${node.x}" cy="${node.y}" r="${node.size / 2}" fill="${nodeColor.bg}" stroke="${nodeColor.border}" stroke-width="1.5"/>`
      svgContent += `<text x="${node.x}" y="${node.y + node.size / 2 + 15}" text-anchor="middle" fill="${nodeColor.text}" font-size="11">${node.label}</text>`
    })
    
    svgContent += '</svg>'
    
    // Download
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'knowledge-graph.svg'
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const exportAsPNG = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'knowledge-graph.png'
    a.click()
  }
  
  // Zoom controls
  const zoomIn = () => setZoom(prev => Math.min(3, prev * 1.2))
  const zoomOut = () => setZoom(prev => Math.max(0.2, prev / 1.2))
  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setSelectedNode(null)
  }
  
  // Get unique modules for filter
  const uniqueModules = useMemo(() => {
    const mods = new Set<string>()
    graphData.nodes.forEach(node => {
      if (node.module) mods.add(node.module)
    })
    return Array.from(mods)
  }, [graphData.nodes])
  
  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Circle className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Total Nodes</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.totalNodes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="w-4 h-4" style={{ color: colors.accent }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Connections</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.totalEdges}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4" style={{ color: colors.success }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Entity Types</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{Object.keys(stats.byType).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4" style={{ color: colors.warning }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Zoom Level</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{Math.round(zoom * 100)}%</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
            <Input
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-48"
              style={{ backgroundColor: colors.bg, borderColor: colors.border }}
            />
          </div>
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="table">Tables</SelectItem>
            <SelectItem value="procedure">Procedures</SelectItem>
            <SelectItem value="view">Views</SelectItem>
            <SelectItem value="module">Modules</SelectItem>
            <SelectItem value="form">Forms</SelectItem>
            <SelectItem value="api">APIs</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-36" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
            <Database className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {uniqueModules.map(mod => (
              <SelectItem key={mod} value={mod}>{mod}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-1 ml-auto">
          <Button size="sm" variant="outline" onClick={zoomIn} title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={zoomOut} title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={resetView} title="Reset View">
            <Maximize2 className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 mx-2" style={{ backgroundColor: colors.border }} />
          <Button size="sm" variant="outline" onClick={exportAsSVG} title="Export SVG">
            <Download className="w-4 h-4 mr-1" />
            SVG
          </Button>
          <Button size="sm" variant="outline" onClick={exportAsPNG} title="Export PNG">
            <Image className="w-4 h-4 mr-1" />
            PNG
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-4 gap-4">
        {/* Canvas */}
        <Card className="col-span-3">
          <CardContent className="p-0">
            <div
              ref={containerRef}
              className="relative overflow-hidden"
              style={{ height: '500px', backgroundColor: colors.bg }}
            >
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="w-full h-full cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              />
              
              {/* Legend overlay */}
              <div className="absolute bottom-4 left-4">
                <GraphLegend />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Node Details Panel */}
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" style={{ color: colors.primary }} />
              Node Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              <NodeDetails node={selectedNode} onClose={() => setSelectedNode(null)} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8" style={{ color: colors.textMuted }}>
                <Circle className="w-12 h-12 mb-2" style={{ opacity: 0.5 }} />
                <p className="text-sm text-center">
                  Click on a node to view details
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* View Options */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showLabels"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="showLabels" className="text-sm" style={{ color: colors.text }}>
                Show Labels
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showConnections"
                checked={showConnections}
                onChange={(e) => setShowConnections(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="showConnections" className="text-sm" style={{ color: colors.text }}>
                Show Connections
              </label>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm" style={{ color: colors.textMuted }}>Layout:</span>
              <Select value={layoutAlgorithm} onValueChange={(v) => setLayoutAlgorithm(v as any)}>
                <SelectTrigger className="w-32" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="force">Force-directed</SelectItem>
                  <SelectItem value="circular">Circular</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
