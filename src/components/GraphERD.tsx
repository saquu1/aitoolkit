'use client'

import React from 'react'

interface Column {
  name: string
  dataType: string
  isPrimaryKey: boolean
  isForeignKey?: boolean
}

interface TableData {
  name: string
  columns: Column[]
  status?: 'resolved' | 'missing' | 'partial'
}

interface FKRelation {
  from: string
  to: string
  column: string
  isMissing: boolean
}

interface GraphERDProps {
  mainTable: TableData
  relatedTables: TableData[]
  relationships: FKRelation[]
}

export default function GraphERD({ mainTable, relatedTables, relationships }: GraphERDProps) {
  // Layout calculations
  const centerTableX = 450
  const centerTableY = 200
  const tableWidth = 200
  const tableHeight = 200
  const leftX = 80
  const rightX = 780
  
  return (
    <svg viewBox="0 0 1050 500" className="w-full h-auto bg-gradient-to-br from-slate-50 to-white rounded-lg">
      {/* Background Grid Pattern */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/>
        </pattern>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="3" stdDeviation="3" floodOpacity="0.12"/>
        </filter>
        <linearGradient id="headerBlue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#4f46e5"/>
        </linearGradient>
        <linearGradient id="headerGreen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22c55e"/>
          <stop offset="100%" stopColor="#16a34a"/>
        </linearGradient>
        <linearGradient id="headerRed" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444"/>
          <stop offset="100%" stopColor="#dc2626"/>
        </linearGradient>
        <marker id="arrowBlue" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
          <path d="M0,0 L0,8 L10,4 z" fill="#4f46e5"/>
        </marker>
        <marker id="arrowRed" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto">
          <path d="M0,0 L0,8 L10,4 z" fill="#ef4444"/>
        </marker>
      </defs>
      
      {/* Grid Background */}
      <rect width="100%" height="100%" fill="url(#grid)"/>

      {/* CONNECTION LINES (drawn first, behind tables) */}
      {relationships.map((rel, idx) => {
        const isMissing = rel.isMissing
        const isRight = isMissing
        
        // Calculate positions
        const mainTableCenterY = centerTableY + 100
        const startY = centerTableY + 50 + (idx * 32)
        
        // Left side: resolved tables
        const leftPositions = [80, 200, 320, 440]
        const rightPositions = [80, 200, 320, 440]
        
        let endX: number, endY: number
        let startX: number
        
        if (isMissing) {
          startX = centerTableX + tableWidth
          endX = rightX
          endY = rightPositions[idx] || 80 + (idx * 60)
        } else {
          startX = centerTableX
          endX = leftX + tableWidth
          endY = leftPositions[idx] || 80 + (idx * 60)
        }
        
        // Bezier curve control points
        const controlOffset = 80
        const midX = (startX + endX) / 2
        
        return (
          <g key={idx}>
            {/* Connection line */}
            <path
              d={`M ${startX} ${startY} 
                  C ${startX + (isRight ? controlOffset : -controlOffset)} ${startY},
                    ${endX + (isRight ? -controlOffset : controlOffset)} ${endY + 40},
                    ${endX} ${endY + 40}`}
              fill="none"
              stroke={isMissing ? '#ef4444' : '#4f46e5'}
              strokeWidth="2.5"
              strokeDasharray={isMissing ? '8,4' : 'none'}
              markerEnd={isMissing ? 'url(#arrowRed)' : 'url(#arrowBlue)'}
              className="transition-all duration-300"
            />
            
            {/* Column label bubble */}
            <g transform={`translate(${midX - 40}, ${startY - 12})`}>
              <rect 
                width="80" 
                height="24" 
                rx="12" 
                fill="white" 
                stroke={isMissing ? '#ef4444' : '#4f46e5'}
                strokeWidth="1.5"
                filter="url(#shadow)"
              />
              <text 
                x="40" 
                y="16" 
                textAnchor="middle" 
                fontSize="11" 
                fontWeight="600"
                fill={isMissing ? '#ef4444' : '#4f46e5'}
              >
                {rel.column}
              </text>
            </g>
          </g>
        )
      })}

      {/* MAIN TABLE (Center) */}
      <g transform={`translate(${centerTableX}, ${centerTableY})`}>
        {/* Shadow */}
        <rect width={tableWidth} height={tableHeight} rx="12" fill="rgba(0,0,0,0.08)" transform="translate(4, 4)"/>
        {/* Background */}
        <rect width={tableWidth} height={tableHeight} rx="12" fill="white" stroke="#e2e8f0" strokeWidth="2"/>
        {/* Header */}
        <rect width={tableWidth} height="44" rx="12" fill="url(#headerBlue)"/>
        <rect y="32" width={tableWidth} height="12" fill="url(#headerBlue)"/>
        {/* Table name */}
        <text x={tableWidth/2} y="30" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" letterSpacing="0.5">
          {mainTable.name}
        </text>
        
        {/* Columns */}
        {mainTable.columns.slice(0, 5).map((col, i) => (
          <g key={i} transform={`translate(0, ${44 + i * 30})`}>
            <rect width={tableWidth} height="30" fill={col.isForeignKey ? '#fef3c7' : (i % 2 === 0 ? '#fafafa' : 'white')}/>
            {/* Badges */}
            {col.isPrimaryKey && (
              <g transform="translate(10, 7)">
                <rect width="30" height="16" rx="4" fill="#f59e0b"/>
                <text x="15" y="12" textAnchor="middle" fill="white" fontSize="10" fontWeight="700">PK</text>
              </g>
            )}
            {col.isForeignKey && (
              <g transform={col.isPrimaryKey ? "translate(44, 7)" : "translate(10, 7)"}>
                <rect width="30" height="16" rx="4" fill="#8b5cf6"/>
                <text x="15" y="12" textAnchor="middle" fill="white" fontSize="10" fontWeight="700">FK</text>
              </g>
            )}
            {/* Column name */}
            <text 
              x={col.isPrimaryKey || col.isForeignKey ? (col.isPrimaryKey && col.isForeignKey ? 80 : 46) : 12} 
              y="20" 
              fontSize="12" 
              fontWeight={col.isForeignKey ? '600' : '400'}
              fill="#374151"
            >
              {col.name}
            </text>
            {/* Type */}
            <text x={tableWidth - 12} y="20" textAnchor="end" fontSize="10" fill="#9ca3af" fontFamily="monospace">
              {col.dataType.substring(0, 12)}
            </text>
            {/* Separator line */}
            <line x1="0" y1="30" x2={tableWidth} y2="30" stroke="#f1f5f9" strokeWidth="1"/>
          </g>
        ))}
        
        {/* More columns indicator */}
        {mainTable.columns.length > 5 && (
          <g transform={`translate(0, ${44 + 5 * 30})`}>
            <rect width={tableWidth} height="26" fill="#fafafa"/>
            <text x={tableWidth/2} y="17" textAnchor="middle" fontSize="11" fill="#6b7280">
              + {mainTable.columns.length - 5} more columns
            </text>
          </g>
        )}
      </g>

      {/* RELATED TABLES - LEFT SIDE (Resolved) */}
      {relatedTables.filter(t => t.status === 'resolved').map((table, idx) => {
        const positions = [80, 200, 320]
        const yPos = positions[idx] || 80 + (idx * 120)
        
        return (
          <g key={table.name} transform={`translate(${leftX}, ${yPos})`}>
            {/* Shadow */}
            <rect width={tableWidth} height="100" rx="10" fill="rgba(0,0,0,0.06)" transform="translate(3, 3)"/>
            {/* Background */}
            <rect width={tableWidth} height="100" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5"/>
            {/* Header */}
            <rect width={tableWidth} height="38" rx="10" fill="url(#headerGreen)"/>
            <rect y="28" width={tableWidth} height="10" fill="url(#headerGreen)"/>
            {/* Table name */}
            <text x={tableWidth/2} y="26" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">
              {table.name.length > 15 ? table.name.substring(0, 14) + '...' : table.name}
            </text>
            {/* Columns preview */}
            {table.columns.slice(0, 2).map((col, i) => (
              <g key={i} transform={`translate(0, ${38 + i * 26})`}>
                <rect width={tableWidth} height="26" fill={i % 2 === 0 ? '#f0fdf4' : 'white'}/>
                {col.isPrimaryKey && (
                  <g transform="translate(10, 6)">
                    <rect width="24" height="14" rx="3" fill="#22c55e"/>
                    <text x="12" y="10" textAnchor="middle" fill="white" fontSize="8" fontWeight="700">PK</text>
                  </g>
                )}
                <text x={col.isPrimaryKey ? 40 : 12} y="17" fontSize="11" fill="#374151">{col.name}</text>
              </g>
            ))}
            {/* Status badge */}
            <g transform={`translate(${tableWidth - 70}, 70)`}>
              <rect width="60" height="20" rx="10" fill="#dcfce7"/>
              <text x="30" y="14" textAnchor="middle" fontSize="10" fontWeight="600" fill="#16a34a">Resolved</text>
            </g>
          </g>
        )
      })}

      {/* RELATED TABLES - RIGHT SIDE (Missing) */}
      {relatedTables.filter(t => t.status === 'missing').map((table, idx) => {
        const positions = [80, 200]
        const yPos = positions[idx] || 80 + (idx * 100)
        
        return (
          <g key={table.name} transform={`translate(${rightX}, ${yPos})`}>
            {/* Shadow */}
            <rect width={tableWidth} height="100" rx="10" fill="rgba(239,68,68,0.1)" transform="translate(3, 3)"/>
            {/* Background - dashed for missing */}
            <rect width={tableWidth} height="100" rx="10" fill="#fef2f2" stroke="#ef4444" strokeWidth="2" strokeDasharray="6,3"/>
            {/* Header */}
            <rect width={tableWidth} height="38" rx="10" fill="url(#headerRed)"/>
            <rect y="28" width={tableWidth} height="10" fill="url(#headerRed)"/>
            {/* Table name */}
            <text x={tableWidth/2} y="26" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">
              {table.name}
            </text>
            {/* Missing indicator */}
            <g transform="translate(0, 48)">
              <text x={tableWidth/2} y="12" textAnchor="middle" fontSize="20">⚠️</text>
              <text x={tableWidth/2} y="35" textAnchor="middle" fontSize="11" fill="#ef4444" fontWeight="500">
                Table Not Uploaded
              </text>
            </g>
            {/* Status badge */}
            <g transform={`translate(${tableWidth - 60}, 70)`}>
              <rect width="50" height="20" rx="10" fill="#fee2e2"/>
              <text x="25" y="14" textAnchor="middle" fontSize="10" fontWeight="600" fill="#dc2626">Missing</text>
            </g>
          </g>
        )
      })}

      {/* LEGEND */}
      <g transform="translate(30, 460)">
        <rect width="500" height="30" rx="6" fill="white" stroke="#e2e8f0"/>
        <g transform="translate(20, 10)">
          <rect width="20" height="12" rx="3" fill="#f59e0b"/>
          <text x="28" y="10" fontSize="11" fill="#64748b">Primary Key</text>
        </g>
        <g transform="translate(120, 10)">
          <rect width="20" height="12" rx="3" fill="#8b5cf6"/>
          <text x="28" y="10" fontSize="11" fill="#64748b">Foreign Key</text>
        </g>
        <g transform="translate(220, 10)">
          <line x1="0" y1="6" x2="25" y2="6" stroke="#4f46e5" strokeWidth="2"/>
          <text x="32" y="10" fontSize="11" fill="#64748b">Resolved FK</text>
        </g>
        <g transform="translate(320, 10)">
          <line x1="0" y1="6" x2="25" y2="6" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,2"/>
          <text x="32" y="10" fontSize="11" fill="#64748b">Missing FK</text>
        </g>
        <g transform="translate(420, 10)">
          <rect width="12" height="12" rx="2" fill="#22c55e"/>
          <text x="20" y="10" fontSize="11" fill="#64748b">Resolved</text>
        </g>
      </g>
    </svg>
  )
}
