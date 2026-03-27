'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import VisualERD from '@/components/VisualERD'
import { 
  Database, Table2, Key, RefreshCw, Download, ZoomIn, ZoomOut, 
  Maximize2, Filter, ChevronDown, ChevronUp, Info, AlertTriangle,
  CheckCircle, XCircle, Eye, EyeOff, LayoutGrid, Move
} from 'lucide-react'

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

interface ProjectTable {
  id: string
  tableName: string
  schemaName: string
  columns: string
  foreignKeys: string
}

export default function ERDDesignerPage() {
  const params = useParams()
  const projectId = params.id as string
  
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMissing, setShowMissing] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [viewMode, setViewMode] = useState<'all' | 'selected' | 'fk-chain'>('all')

  // Fetch tables from project
  useEffect(() => {
    async function fetchTables() {
      try {
        setLoading(true)
        const response = await fetch(`/api/tables?projectId=${projectId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch tables')
        }
        
        const data = await response.json()
        
        // Transform data for ERD visualization
        const erdTables: Table[] = (data.tables || []).map((t: ProjectTable) => {
          let columns: Column[] = []
          let foreignKeys: ForeignKey[] = []
          
          try {
            columns = JSON.parse(t.columns || '[]')
          } catch (e) {
            columns = []
          }
          
          try {
            foreignKeys = JSON.parse(t.foreignKeys || '[]')
          } catch (e) {
            foreignKeys = []
          }
          
          return {
            tableName: t.tableName,
            columns: columns.map(c => ({
              name: c.name || c.columnName || '',
              dataType: c.dataType || c.type || 'UNKNOWN',
              isPrimaryKey: c.isPrimaryKey || c.primaryKey || false,
              isNullable: c.isNullable ?? c.nullable ?? true
            })),
            foreignKeys: foreignKeys.map(fk => ({
              columnName: fk.columnName || fk.name || '',
              referencesTable: fk.referencesTable || fk.referencedTable || '',
              referencesColumn: fk.referencesColumn || fk.referencedColumn || 'Id'
            }))
          }
        })
        
        setTables(erdTables)
        setError(null)
      } catch (err) {
        console.error('Error fetching tables:', err)
        setError(err instanceof Error ? err.message : 'Failed to load tables')
      } finally {
        setLoading(false)
      }
    }
    
    if (projectId) {
      fetchTables()
    }
  }, [projectId])

  // Calculate statistics
  const stats = useMemo(() => {
    const totalColumns = tables.reduce((sum, t) => sum + t.columns.length, 0)
    const totalFKs = tables.reduce((sum, t) => sum + t.foreignKeys.length, 0)
    const tableNames = new Set(tables.map(t => t.tableName.toLowerCase()))
    const missingTables = new Set<string>()
    
    tables.forEach(t => {
      t.foreignKeys.forEach(fk => {
        if (!tableNames.has(fk.referencesTable.toLowerCase())) {
          missingTables.add(fk.referencesTable)
        }
      })
    })
    
    const resolvedFKs = totalFKs - missingTables.size
    
    return {
      totalTables: tables.length,
      totalColumns,
      totalFKs,
      resolvedFKs,
      missingTables: missingTables.size
    }
  }, [tables])

  // Filter tables based on search and view mode
  const filteredTables = useMemo(() => {
    let filtered = tables
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.tableName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // View mode filter
    if (viewMode === 'selected' && selectedTable) {
      filtered = filtered.filter(t => t.tableName === selectedTable)
    } else if (viewMode === 'fk-chain' && selectedTable) {
      const table = tables.find(t => t.tableName === selectedTable)
      if (table) {
        const relatedTables = new Set([selectedTable])
        table.foreignKeys.forEach(fk => relatedTables.add(fk.referencesTable))
        filtered = filtered.filter(t => relatedTables.has(t.tableName))
      }
    }
    
    return filtered
  }, [tables, searchTerm, viewMode, selectedTable])

  // Handle export as image
  const handleExport = () => {
    const svg = document.querySelector('.erd-canvas svg')
    if (!svg) return
    
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      canvas.width = img.width * 2
      canvas.height = img.height * 2
      ctx?.scale(2, 2)
      ctx?.drawImage(img, 0, 0)
      
      const link = document.createElement('a')
      link.download = `erd-${projectId}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading ERD...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">Error Loading ERD</p>
          <p className="text-gray-500 text-sm mt-2">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-500" />
              ERD Designer
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Visualize table relationships and foreign keys
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export PNG
            </button>
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {showControls ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-3 p-4">
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <Table2 className="w-5 h-5 text-blue-500" />
            <span className="text-2xl font-bold text-blue-600">{stats.totalTables}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Tables</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-500" />
            <span className="text-2xl font-bold text-purple-600">{stats.totalColumns}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Columns</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" />
            <span className="text-2xl font-bold text-amber-600">{stats.totalFKs}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Foreign Keys</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold text-green-600">{stats.resolvedFKs}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Resolved FKs</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-2xl font-bold text-red-600">{stats.missingTables}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Missing Tables</div>
        </div>
      </div>

      {/* Controls Panel */}
      {showControls && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* View Mode */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">View:</span>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tables</option>
                <option value="selected">Selected Table</option>
                <option value="fk-chain">FK Chain</option>
              </select>
            </div>
            
            {/* Table Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Table:</span>
              <select
                value={selectedTable || ''}
                onChange={(e) => setSelectedTable(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select table...</option>
                {tables.map(t => (
                  <option key={t.tableName} value={t.tableName}>{t.tableName}</option>
                ))}
              </select>
            </div>
            
            {/* Toggle Missing */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showMissing}
                onChange={(e) => setShowMissing(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Show missing tables</span>
            </label>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border-l pl-4">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Reset Zoom"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERD Canvas */}
      <div className="flex-1 overflow-auto p-4">
        <div 
          className="erd-canvas bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          {filteredTables.length > 0 ? (
            <VisualERD 
              tables={filteredTables}
              width={Math.max(1200, filteredTables.length * 300)}
              height={600}
            />
          ) : (
            <div className="flex items-center justify-center h-[600px] text-gray-500">
              <div className="text-center">
                <Table2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No tables found</p>
                <p className="text-sm mt-2">Upload SQL files to see the ERD</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FK Details Panel */}
      <div className="bg-white border-t border-gray-200 max-h-[300px] overflow-auto">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 sticky top-0">
          <h3 className="font-semibold text-gray-900">Foreign Key Details</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">References</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTables.flatMap(table => 
              table.foreignKeys.map(fk => {
                const isResolved = tables.some(t => 
                  t.tableName.toLowerCase() === fk.referencesTable.toLowerCase()
                )
                return (
                  <tr 
                    key={`${table.tableName}-${fk.columnName}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{table.tableName}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{fk.columnName}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {fk.referencesTable}.{fk.referencesColumn}
                    </td>
                    <td className="px-4 py-2">
                      {isResolved ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Missing Table
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
