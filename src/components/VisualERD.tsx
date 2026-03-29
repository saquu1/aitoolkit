'use client'

import React from 'react'

interface Column {
  name: string
  dataType: string
  isPrimaryKey: boolean
  isNullable: boolean
}

interface ForeignKey {
  columnName: string
  referencesTable: string
  referencesColumn: string
}

interface Table {
  tableName: string
  columns: Column[]
  foreignKeys: ForeignKey[]
}

interface VisualERDProps {
  tables: Table[]
  width?: number
  height?: number
}

export default function VisualERD({ tables, width = 1000, height = 500 }: VisualERDProps) {
  // Calculate positions for each table
  const tablePositions: Record<string, { x: number; y: number }> = {}
  const tableWidth = 220
  const tableHeight = 180
  const gapX = 60
  const gapY = 200
  
  // Layout: Main table centered, referenced tables on the left
  const mainTable = tables.find(t => t.foreignKeys.length > 0)
  const otherTables = tables.filter(t => t !== mainTable)
  
  if (mainTable) {
    // Main table in the center-right
    tablePositions[mainTable.tableName] = {
      x: width / 2 + 50,
      y: height / 2 - tableHeight / 2,
    }
    
    // Referenced tables on the left
    otherTables.forEach((table, index) => {
      const yOffset = (index - (otherTables.length - 1) / 2) * (tableHeight + gapY / 2)
      tablePositions[table.tableName] = {
        x: 50,
        y: height / 2 - tableHeight / 2 + yOffset,
      }
    })
  } else {
    // Simple grid layout if no FK relationships
    tables.forEach((table, index) => {
      const row = Math.floor(index / 3)
      const col = index % 3
      tablePositions[table.tableName] = {
        x: 50 + col * (tableWidth + gapX),
        y: 50 + row * (tableHeight + gapY),
      }
    })
  }

  // Get missing tables
  const existingTableNames = new Set(tables.map(t => t.tableName.toLowerCase()))
  const missingTables: string[] = []
  
  tables.forEach(table => {
    table.foreignKeys.forEach(fk => {
      if (!existingTableNames.has(fk.referencesTable.toLowerCase())) {
        missingTables.push(fk.referencesTable)
      }
    })
  })

  // Add positions for missing tables
  const uniqueMissing = [...new Set(missingTables)]
  uniqueMissing.forEach((tableName, index) => {
    tablePositions[tableName] = {
      x: width - tableWidth - 50,
      y: 50 + index * (tableHeight + 20),
    }
  })

  return (
    <svg 
      width={width} 
      height={height} 
      viewBox={`0 0 ${width} ${height}`}
      className="bg-white"
    >
      <defs>
        {/* Arrow marker for relationships */}
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
        </marker>
        <marker
          id="arrow-missing"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
        </marker>
        
        {/* Drop shadow filter */}
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Draw relationship lines first (behind tables) */}
      {tables.map(table => {
        const toPos = tablePositions[table.tableName]
        if (!toPos) return null
        
        return table.foreignKeys.map((fk, fkIndex) => {
          const fromPos = tablePositions[fk.referencesTable]
          if (!fromPos) return null
          
          const isMissing = !existingTableNames.has(fk.referencesTable.toLowerCase())
          
          const startX = fromPos.x + tableWidth
          const startY = fromPos.y + 40 + fkIndex * 22
          const endX = toPos.x
          const endY = toPos.y + 40 + table.columns.findIndex(
            c => c.name.toLowerCase() === fk.columnName.toLowerCase()
          ) * 22
          
          // Create curved path
          const midX = (startX + endX) / 2
          
          return (
            <g key={`${table.tableName}-${fk.columnName}`}>
              <path
                d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                fill="none"
                stroke={isMissing ? '#ef4444' : '#3b82f6'}
                strokeWidth={2}
                strokeDasharray={isMissing ? '5,5' : 'none'}
                markerEnd={isMissing ? 'url(#arrow-missing)' : 'url(#arrow)'}
              />
              {/* FK Label */}
              <rect
                x={midX - 30}
                y={Math.min(startY, endY) - 8}
                width={60}
                height={16}
                fill="white"
                stroke={isMissing ? '#ef4444' : '#3b82f6'}
                strokeWidth={1}
                rx={3}
              />
              <text
                x={midX}
                y={Math.min(startY, endY) + 3}
                textAnchor="middle"
                fill={isMissing ? '#ef4444' : '#3b82f6'}
                fontSize={10}
                fontWeight={500}
              >
                {fk.columnName}
              </text>
            </g>
          )
        })
      })}

      {/* Draw tables */}
      {tables.map(table => {
        const pos = tablePositions[table.tableName]
        if (!pos) return null
        
        return (
          <g key={table.tableName} transform={`translate(${pos.x}, ${pos.y})`}>
            {/* Table shadow */}
            <rect
              width={tableWidth}
              height={tableHeight}
              rx={8}
              fill="white"
              filter="url(#shadow)"
            />
            
            {/* Table border */}
            <rect
              width={tableWidth}
              height={tableHeight}
              rx={8}
              fill="white"
              stroke="#e5e7eb"
              strokeWidth={2}
            />
            
            {/* Table header */}
            <rect
              width={tableWidth}
              height={36}
              rx={8}
              fill="#3b82f6"
            />
            <rect
              y={28}
              width={tableWidth}
              height={8}
              fill="#3b82f6"
            />
            
            {/* Table name */}
            <text
              x={tableWidth / 2}
              y={24}
              textAnchor="middle"
              fill="white"
              fontWeight={600}
              fontSize={14}
            >
              {table.tableName}
            </text>
            
            {/* Columns */}
            {table.columns.slice(0, 6).map((col, index) => {
              const isFK = table.foreignKeys.some(
                fk => fk.columnName.toLowerCase() === col.name.toLowerCase()
              )
              
              return (
                <g key={col.name} transform={`translate(0, ${36 + index * 22})`}>
                  {/* Column row background */}
                  <rect
                    width={tableWidth}
                    height={22}
                    fill={isFK ? '#fef3c7' : (index % 2 === 0 ? '#f9fafb' : 'white')}
                  />
                  
                  {/* PK Badge */}
                  {col.isPrimaryKey && (
                    <g transform="translate(8, 4)">
                      <rect width={26} height={14} rx={3} fill="#f59e0b" />
                      <text x={13} y={10} textAnchor="middle" fill="white" fontSize={9} fontWeight={600}>
                        PK
                      </text>
                    </g>
                  )}
                  
                  {/* FK Badge */}
                  {isFK && !col.isPrimaryKey && (
                    <g transform="translate(8, 4)">
                      <rect width={26} height={14} rx={3} fill="#8b5cf6" />
                      <text x={13} y={10} textAnchor="middle" fill="white" fontSize={9} fontWeight={600}>
                        FK
                      </text>
                    </g>
                  )}
                  
                  {/* Column name */}
                  <text
                    x={col.isPrimaryKey || isFK ? 42 : 12}
                    y={15}
                    fill="#1f2937"
                    fontSize={12}
                    fontWeight={isFK ? 600 : 400}
                  >
                    {col.name}
                  </text>
                  
                  {/* Data type */}
                  <text
                    x={tableWidth - 12}
                    y={15}
                    textAnchor="end"
                    fill="#6b7280"
                    fontSize={10}
                  >
                    {col.dataType.replace('NVARCHAR', 'NVarchar').replace('UNIQUEIDENTIFIER', 'Uuid')}
                  </text>
                </g>
              )
            })}
            
            {/* Show more indicator if there are more columns */}
            {table.columns.length > 6 && (
              <text
                x={tableWidth / 2}
                y={36 + 6 * 22 + 14}
                textAnchor="middle"
                fill="#6b7280"
                fontSize={11}
              >
                +{table.columns.length - 6} more columns
              </text>
            )}
          </g>
        )
      })}

      {/* Draw missing tables */}
      {uniqueMissing.map(tableName => {
        const pos = tablePositions[tableName]
        if (!pos) return null
        
        return (
          <g key={tableName} transform={`translate(${pos.x}, ${pos.y})`}>
            {/* Table border - red for missing */}
            <rect
              width={tableWidth}
              height={80}
              rx={8}
              fill="#fef2f2"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5,5"
              filter="url(#shadow)"
            />
            
            {/* Table header */}
            <rect
              width={tableWidth}
              height={36}
              rx={8}
              fill="#ef4444"
            />
            <rect
              y={28}
              width={tableWidth}
              height={8}
              fill="#ef4444"
            />
            
            {/* Table name */}
            <text
              x={tableWidth / 2}
              y={24}
              textAnchor="middle"
              fill="white"
              fontWeight={600}
              fontSize={14}
            >
              {tableName}
            </text>
            
            {/* Missing indicator */}
            <text
              x={tableWidth / 2}
              y={60}
              textAnchor="middle"
              fill="#ef4444"
              fontSize={12}
            >
              Table not uploaded
            </text>
          </g>
        )
      })}

      {/* Legend */}
      <g transform="translate(20, height - 40)">
        <rect width={300} height={35} fill="white" stroke="#e5e7eb" rx={4} />
        
        {/* PK */}
        <rect x={10} y={10} width={20} height={14} rx={3} fill="#f59e0b" />
        <text x={35} y={21} fill="#374151" fontSize={11}>PK = Primary Key</text>
        
        {/* FK */}
        <rect x={130} y={10} width={20} height={14} rx={3} fill="#8b5cf6" />
        <text x={155} y={21} fill="#374151" fontSize={11}>FK = Foreign Key</text>
      </g>
    </svg>
  )
}
