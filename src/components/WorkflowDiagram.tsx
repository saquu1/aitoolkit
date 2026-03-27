'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/hooks/useTheme'
import { MermaidRenderer } from './MermaidRenderer'
import { StateTransitionTable } from './StateTransitionTable'
import { WorkflowTester } from './WorkflowTester'
import {
  GitBranch,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Download,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Circle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileCode,
  Copy,
  Code
} from 'lucide-react'

// Workflow Types
interface WorkflowState {
  id: string
  name: string
  type: 'start' | 'end' | 'state' | 'decision' | 'parallel' | 'subprocess'
  description?: string
  actions?: string[]
  transitions?: string[]
}

interface WorkflowTransition {
  id: string
  from: string
  to: string
  label: string
  condition?: string
  trigger?: string
  auto?: boolean
}

interface WorkflowDefinition {
  id: string
  name: string
  description: string
  module: string
  states: WorkflowState[]
  transitions: WorkflowTransition[]
  initialState: string
  finalStates: string[]
  sourceSPs?: string[]
  complexity: 'simple' | 'moderate' | 'complex'
}

interface WorkflowDiagramProps {
  workflows?: WorkflowDefinition[]
  onStateClick?: (stateId: string) => void
  onExport?: (format: 'mermaid' | 'json' | 'svg') => void
}

// State colors by type
const stateTypeColors: Record<string, { bg: string; border: string; text: string }> = {
  start: { bg: 'rgba(34, 197, 94, 0.2)', border: '#22C55E', text: '#4ADE80' },
  end: { bg: 'rgba(239, 68, 68, 0.2)', border: '#EF4444', text: '#F87171' },
  state: { bg: 'rgba(59, 130, 246, 0.2)', border: '#3B82F6', text: '#60A5FA' },
  decision: { bg: 'rgba(245, 158, 11, 0.2)', border: '#F59E0B', text: '#FBBF24' },
  parallel: { bg: 'rgba(139, 92, 246, 0.2)', border: '#8B5CF6', text: '#A78BFA' },
  subprocess: { bg: 'rgba(6, 182, 212, 0.2)', border: '#06B6D4', text: '#22D3EE' }
}

// Sample workflow data for demo
const sampleWorkflows: WorkflowDefinition[] = [
  {
    id: 'patient-admission',
    name: 'Patient Admission Workflow',
    description: 'Handles the complete patient admission process from registration to bed assignment',
    module: 'ADT',
    initialState: 'start',
    finalStates: ['admitted', 'cancelled'],
    complexity: 'moderate',
    sourceSPs: ['sp_patient_admission', 'sp_bed_assign'],
    states: [
      { id: 'start', name: 'Start', type: 'start', description: 'Admission initiated' },
      { id: 'registration', name: 'Registration', type: 'state', description: 'Patient details being entered', actions: ['validate_patient', 'check_insurance'] },
      { id: 'insurance_check', name: 'Insurance Check', type: 'decision', description: 'Verify insurance coverage' },
      { id: 'bed_selection', name: 'Bed Selection', type: 'state', description: 'Assign bed to patient', actions: ['find_available_beds', 'assign_bed'] },
      { id: 'payment', name: 'Payment Processing', type: 'subprocess', description: 'Process advance payment' },
      { id: 'admitted', name: 'Admitted', type: 'end', description: 'Patient successfully admitted' },
      { id: 'cancelled', name: 'Cancelled', type: 'end', description: 'Admission cancelled' }
    ],
    transitions: [
      { id: 't1', from: 'start', to: 'registration', label: 'Start', auto: true },
      { id: 't2', from: 'registration', to: 'insurance_check', label: 'Submit', trigger: 'submit_form' },
      { id: 't3', from: 'insurance_check', to: 'bed_selection', label: 'Approved', condition: 'insurance_valid == true' },
      { id: 't4', from: 'insurance_check', to: 'registration', label: 'Rejected', condition: 'insurance_valid == false' },
      { id: 't5', from: 'bed_selection', to: 'payment', label: 'Bed Assigned', trigger: 'confirm_bed' },
      { id: 't6', from: 'payment', to: 'admitted', label: 'Payment Done', trigger: 'payment_complete' },
      { id: 't7', from: 'registration', to: 'cancelled', label: 'Cancel', trigger: 'cancel_action' }
    ]
  },
  {
    id: 'lab-order',
    name: 'Lab Order Workflow',
    description: 'Laboratory test ordering and result management',
    module: 'LIS',
    initialState: 'start',
    finalStates: ['completed', 'cancelled'],
    complexity: 'simple',
    sourceSPs: ['sp_lab_order', 'sp_lab_result'],
    states: [
      { id: 'start', name: 'Start', type: 'start' },
      { id: 'order_created', name: 'Order Created', type: 'state', actions: ['create_order', 'assign_priority'] },
      { id: 'sample_collection', name: 'Sample Collection', type: 'state', actions: ['collect_sample', 'label_sample'] },
      { id: 'processing', name: 'Processing', type: 'state', actions: ['run_tests', 'validate_results'] },
      { id: 'review', name: 'Review', type: 'decision', actions: ['verify_results'] },
      { id: 'completed', name: 'Completed', type: 'end' },
      { id: 'cancelled', name: 'Cancelled', type: 'end' }
    ],
    transitions: [
      { id: 't1', from: 'start', to: 'order_created', label: 'Create', auto: true },
      { id: 't2', from: 'order_created', to: 'sample_collection', label: 'Sample Ready', trigger: 'sample_collected' },
      { id: 't3', from: 'sample_collection', to: 'processing', label: 'Submit', trigger: 'submit_sample' },
      { id: 't4', from: 'processing', to: 'review', label: 'Results Ready', trigger: 'tests_complete' },
      { id: 't5', from: 'review', to: 'completed', label: 'Approve', condition: 'results_valid == true' },
      { id: 't6', from: 'review', to: 'processing', label: 'Reprocess', condition: 'results_valid == false' },
      { id: 't7', from: 'order_created', to: 'cancelled', label: 'Cancel', trigger: 'cancel_order' }
    ]
  }
]

export function WorkflowDiagram({ 
  workflows = sampleWorkflows,
  onStateClick,
  onExport 
}: WorkflowDiagramProps) {
  const { colors } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // State
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(
    workflows.length > 0 ? workflows[0] : null
  )
  const [selectedState, setSelectedState] = useState<WorkflowState | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'diagram' | 'mermaid' | 'table'>('diagram')
  
  // Generate Mermaid diagram code
  const mermaidCode = useMemo(() => {
    if (!selectedWorkflow) return ''
    
    let code = 'stateDiagram-v2\n'
    
    // Add states
    selectedWorkflow.states.forEach(state => {
      const stateType = state.type === 'start' ? '[*]' : state.type === 'end' ? '[*]' : state.name
      if (state.type === 'start') {
        code += `    [*] --> ${state.id}\n`
      } else if (state.type !== 'end') {
        code += `    ${state.id} : ${state.name}\n`
      }
    })
    
    // Add transitions
    selectedWorkflow.transitions.forEach(t => {
      const targetId = selectedWorkflow.states.find(s => s.id === t.to)?.type === 'end' ? '[*]' : t.to
      const label = t.label ? ` : ${t.label}` : ''
      code += `    ${t.from} --> ${targetId}${label}\n`
    })
    
    return code
  }, [selectedWorkflow])
  
  // Canvas rendering
  useEffect(() => {
    if (viewMode !== 'diagram' || !selectedWorkflow || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const width = canvas.width
    const height = canvas.height
    
    // Clear
    ctx.clearRect(0, 0, width, height)
    
    // Calculate state positions (simple horizontal layout)
    const statePositions: Record<string, { x: number; y: number }> = {}
    const states = selectedWorkflow.states
    const cols = Math.ceil(Math.sqrt(states.length))
    
    states.forEach((state, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      statePositions[state.id] = {
        x: 100 + col * 180,
        y: 80 + row * 120
      }
    })
    
    // Draw transitions (edges)
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)
    
    selectedWorkflow.transitions.forEach(t => {
      const from = statePositions[t.from]
      const to = statePositions[t.to]
      if (!from || !to) return
      
      // Draw line
      ctx.beginPath()
      ctx.moveTo(from.x + 40, from.y)
      
      // Curved line for better visual
      const midY = (from.y + to.y) / 2
      ctx.bezierCurveTo(
        from.x + 40, midY,
        to.x - 40, midY,
        to.x - 40, to.y
      )
      
      ctx.strokeStyle = colors.textMuted
      ctx.lineWidth = 2
      ctx.stroke()
      
      // Draw arrow
      const angle = Math.atan2(to.y - midY, to.x - 40 - to.x + 40)
      const arrowSize = 8
      ctx.beginPath()
      ctx.moveTo(to.x - 40, to.y)
      ctx.lineTo(
        to.x - 40 - arrowSize * Math.cos(angle - Math.PI / 6),
        to.y - arrowSize * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        to.x - 40 - arrowSize * Math.cos(angle + Math.PI / 6),
        to.y - arrowSize * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fillStyle = colors.textMuted
      ctx.fill()
      
      // Draw label
      const labelX = (from.x + to.x) / 2
      const labelY = midY - 10
      ctx.font = '10px system-ui'
      ctx.fillStyle = colors.textSecondary
      ctx.textAlign = 'center'
      ctx.fillText(t.label, labelX, labelY)
    })
    
    // Draw states
    states.forEach(state => {
      const pos = statePositions[state.id]
      if (!pos) return
      
      const typeColor = stateTypeColors[state.type]
      const isSelected = selectedState?.id === state.id
      
      ctx.save()
      ctx.translate(pos.x, pos.y)
      
      // Draw shape based on type
      ctx.beginPath()
      if (state.type === 'start') {
        // Filled circle for start
        ctx.arc(0, 0, 20, 0, Math.PI * 2)
        ctx.fillStyle = typeColor.border
        ctx.fill()
      } else if (state.type === 'end') {
        // Filled circle with ring for end
        ctx.arc(0, 0, 20, 0, Math.PI * 2)
        ctx.fillStyle = typeColor.border
        ctx.fill()
        ctx.beginPath()
        ctx.arc(0, 0, 15, 0, Math.PI * 2)
        ctx.fillStyle = colors.bg
        ctx.fill()
      } else if (state.type === 'decision') {
        // Diamond for decision
        ctx.moveTo(0, -25)
        ctx.lineTo(25, 0)
        ctx.lineTo(0, 25)
        ctx.lineTo(-25, 0)
        ctx.closePath()
        ctx.fillStyle = typeColor.bg
        ctx.fill()
        ctx.strokeStyle = isSelected ? '#FFFFFF' : typeColor.border
        ctx.lineWidth = isSelected ? 3 : 2
        ctx.stroke()
      } else {
        // Rounded rectangle for normal state
        const w = 80
        const h = 40
        ctx.roundRect(-w / 2, -h / 2, w, h, 8)
        ctx.fillStyle = typeColor.bg
        ctx.fill()
        ctx.strokeStyle = isSelected ? '#FFFFFF' : typeColor.border
        ctx.lineWidth = isSelected ? 3 : 2
        ctx.stroke()
      }
      
      // Draw state name
      if (state.type !== 'start' && state.type !== 'end') {
        ctx.font = `${isSelected ? 'bold' : 'normal'} 11px system-ui`
        ctx.fillStyle = typeColor.text
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(state.name, 0, 0)
      }
      
      ctx.restore()
    })
    
    ctx.restore()
  }, [selectedWorkflow, selectedState, zoom, pan, viewMode, colors])
  
  // Export functions
  const exportMermaid = () => {
    if (!mermaidCode) return
    const blob = new Blob([mermaidCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedWorkflow?.id || 'workflow'}.mmd`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const exportJSON = () => {
    if (!selectedWorkflow) return
    const blob = new Blob([JSON.stringify(selectedWorkflow, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedWorkflow.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const copyMermaid = () => {
    navigator.clipboard.writeText(mermaidCode)
  }
  
  // Statistics
  const stats = useMemo(() => {
    if (!selectedWorkflow) return { states: 0, transitions: 0, decisions: 0 }
    return {
      states: selectedWorkflow.states.length,
      transitions: selectedWorkflow.transitions.length,
      decisions: selectedWorkflow.states.filter(s => s.type === 'decision').length
    }
  }, [selectedWorkflow])
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select 
            value={selectedWorkflow?.id || ''} 
            onValueChange={(v) => setSelectedWorkflow(workflows.find(w => w.id === v) || null)}
          >
            <SelectTrigger className="w-64" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
              <GitBranch className="w-4 h-4 mr-2" style={{ color: colors.accent }} />
              <SelectValue placeholder="Select Workflow" />
            </SelectTrigger>
            <SelectContent>
              {workflows.map(wf => (
                <SelectItem key={wf.id} value={wf.id}>
                  {wf.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
            >
              {selectedWorkflow?.module}
            </Badge>
            <Badge 
              style={{
                backgroundColor: selectedWorkflow?.complexity === 'simple' ? `color-mix(in srgb, ${colors.success} 20%, transparent)` :
                                 selectedWorkflow?.complexity === 'moderate' ? `color-mix(in srgb, ${colors.warning} 20%, transparent)` :
                                 `color-mix(in srgb, ${colors.error} 20%, transparent)`,
                color: selectedWorkflow?.complexity === 'simple' ? colors.success :
                       selectedWorkflow?.complexity === 'moderate' ? colors.warning :
                       colors.error
              }}
            >
              {selectedWorkflow?.complexity}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList>
              <TabsTrigger value="diagram">Diagram</TabsTrigger>
              <TabsTrigger value="mermaid">Mermaid</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Circle className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>States</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.states}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRight className="w-4 h-4" style={{ color: colors.accent }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Transitions</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.transitions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="w-4 h-4" style={{ color: colors.warning }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Decision Points</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.decisions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileCode className="w-4 h-4" style={{ color: colors.success }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Source SPs</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>
              {selectedWorkflow?.sourceSPs?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{selectedWorkflow?.name}</CardTitle>
              <CardDescription>{selectedWorkflow?.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setZoom(prev => Math.min(2, prev * 1.2))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setZoom(prev => Math.max(0.5, prev / 1.2))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={exportMermaid}>
                <Download className="w-4 h-4 mr-1" />
                Mermaid
              </Button>
              <Button size="sm" variant="outline" onClick={exportJSON}>
                <Download className="w-4 h-4 mr-1" />
                JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'diagram' && (
            <div 
              className="relative rounded-lg overflow-hidden"
              style={{ height: '400px', backgroundColor: colors.bg }}
            >
              <canvas
                ref={canvasRef}
                width={800}
                height={400}
                className="w-full h-full"
              />
              
              {/* Legend */}
              <div 
                className="absolute bottom-4 left-4 rounded-lg p-3 text-xs"
                style={{ 
                  backgroundColor: `color-mix(in srgb, ${colors.bg} 95%, transparent)`,
                  border: `1px solid ${colors.border}`
                }}
              >
                <div className="font-medium mb-2" style={{ color: colors.text }}>State Types</div>
                <div className="space-y-1">
                  {Object.entries(stateTypeColors).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: color.bg, border: `1px solid ${color.border}` }}
                      />
                      <span style={{ color: colors.textSecondary }}>{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {viewMode === 'mermaid' && (
            <div className="space-y-4">
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="outline" onClick={copyMermaid}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>Source Code</h4>
                  <pre 
                    className="p-4 rounded-lg text-xs overflow-auto h-[300px]"
                    style={{ 
                      backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)`,
                      color: colors.textSecondary
                    }}
                  >
                    {mermaidCode}
                  </pre>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2" style={{ color: colors.text }}>Preview</h4>
                  <div 
                    className="rounded-lg overflow-auto h-[300px]"
                    style={{ backgroundColor: colors.bg }}
                  >
                    <MermaidRenderer chart={mermaidCode} />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {viewMode === 'table' && selectedWorkflow && (
            <StateTransitionTable workflow={selectedWorkflow} />
          )}
        </CardContent>
      </Card>
      
      {/* Workflow Tester */}
      {selectedWorkflow && (
        <WorkflowTester workflow={selectedWorkflow} />
      )}
    </div>
  )
}
