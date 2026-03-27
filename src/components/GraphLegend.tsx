'use client'

import { useTheme } from '@/hooks/useTheme'
import { Circle, Square, Diamond, Hexagon, Info } from 'lucide-react'

interface LegendItem {
  type: string
  label: string
  shape: 'circle' | 'square' | 'diamond' | 'hexagon'
  color: string
  description: string
}

const legendItems: LegendItem[] = [
  { type: 'table', label: 'Table', shape: 'square', color: '#3B82F6', description: 'Database table entity' },
  { type: 'procedure', label: 'Procedure', shape: 'diamond', color: '#10B981', description: 'Stored procedure' },
  { type: 'view', label: 'View', shape: 'circle', color: '#8B5CF6', description: 'Database view' },
  { type: 'module', label: 'Module', shape: 'hexagon', color: '#F59E0B', description: 'System module' },
  { type: 'form', label: 'Form', shape: 'square', color: '#EC4899', description: 'UI form component' },
  { type: 'api', label: 'API', shape: 'circle', color: '#06B6D4', description: 'API endpoint' }
]

const edgeTypes = [
  { type: 'fk', label: 'Foreign Key', color: '#3B82F6', style: 'solid' },
  { type: 'sp_access', label: 'SP Access', color: '#10B981', style: 'dashed' },
  { type: 'module_contains', label: 'Contains', color: '#F59E0B', style: 'solid' },
  { type: 'api_use', label: 'API Use', color: '#06B6D4', style: 'dashed' }
]

export function GraphLegend() {
  const { colors } = useTheme()
  
  const renderShape = (shape: LegendItem['shape'], color: string) => {
    const size = 16
    const strokeWidth = 2
    
    switch (shape) {
      case 'square':
        return (
          <svg width={size} height={size} viewBox="0 0 16 16">
            <rect
              x={strokeWidth}
              y={strokeWidth}
              width={size - strokeWidth * 2}
              height={size - strokeWidth * 2 - 2}
              rx={2}
              fill={`${color}33`}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          </svg>
        )
      case 'diamond':
        return (
          <svg width={size} height={size} viewBox="0 0 16 16">
            <polygon
              points="8,2 14,8 8,14 2,8"
              fill={`${color}33`}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          </svg>
        )
      case 'hexagon':
        return (
          <svg width={size} height={size} viewBox="0 0 16 16">
            <polygon
              points="8,1 14,4 14,12 8,15 2,12 2,4"
              fill={`${color}33`}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          </svg>
        )
      case 'circle':
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 16 16">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - strokeWidth}
              fill={`${color}33`}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          </svg>
        )
    }
  }
  
  return (
    <div 
      className="rounded-lg p-3 text-xs"
      style={{ 
        backgroundColor: `color-mix(in srgb, ${colors.bg} 95%, transparent)`,
        border: `1px solid ${colors.border}`,
        backdropFilter: 'blur(8px)'
      }}
    >
      <div className="flex items-center gap-1 mb-2 font-medium" style={{ color: colors.text }}>
        <Info className="w-3 h-3" />
        Legend
      </div>
      
      {/* Node Types */}
      <div className="space-y-1.5 mb-3">
        {legendItems.slice(0, 4).map((item) => (
          <div key={item.type} className="flex items-center gap-2">
            {renderShape(item.shape, item.color)}
            <span style={{ color: colors.textSecondary }}>{item.label}</span>
          </div>
        ))}
      </div>
      
      {/* Edge Types */}
      <div className="pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
        <div className="text-xs mb-1.5" style={{ color: colors.textMuted }}>Connections</div>
        {edgeTypes.map((edge) => (
          <div key={edge.type} className="flex items-center gap-2 mb-1">
            <svg width={20} height={8} viewBox="0 0 20 8">
              <line
                x1="0"
                y1="4"
                x2="20"
                y2="4"
                stroke={edge.color}
                strokeWidth={1.5}
                strokeDasharray={edge.style === 'dashed' ? '4,2' : 'none'}
              />
            </svg>
            <span style={{ color: colors.textSecondary }}>{edge.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Export legend items for use in other components
export { legendItems }
