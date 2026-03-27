'use client'

/**
 * PROJECT TABLES PAGE
 * ====================
 * Memory-optimized with progressive loading pattern
 * 
 * Features:
 * - Paginated API calls
 * - Virtual scrolling for large lists
 * - Skeleton loading states
 * - Infinite scroll option
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { useProgressiveList } from '@/hooks/useProgressiveData'
import { SkeletonCard, SkeletonTable, PageLoader } from '@/components/ui/loading-skeletons'
import { VirtualList } from '@/components/ui/virtual-list'
import { InfiniteScroll } from '@/components/ui/infinite-scroll'
import { Table2, Database, Link2, ArrowRight, Loader2, Eye, Sparkles, AlertTriangle, Search, Filter, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { debounce } from 'lodash'

// Table card component for cleaner code
function TableCard({ 
  table, 
  onViewDetails, 
  colors 
}: { 
  table: any
  onViewDetails: (table: any) => void
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const isDiscovered = table.isDiscovered
  
  return (
    <div className="p-4 rounded-xl border transition-all hover:shadow-md" 
      style={{ backgroundColor: colors.cardBg, borderColor: colors.border }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isDiscovered ? (
            <Sparkles className="w-5 h-5 text-purple-500" />
          ) : (
            <Database className="w-5 h-5" style={{ color: colors.primary }} />
          )}
          <span className="font-semibold" style={{ color: colors.text }}>{table.tableName}</span>
          {table.priority === 'high' && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-600">High</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: colors.textMuted }}>{table.columns?.length || 0} cols</span>
          <button
            onClick={() => onViewDetails(table)}
            className="p-1 rounded hover:opacity-80"
            style={{ color: colors.primary }}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {table.source && (
        <p className="text-xs mb-2" style={{ color: colors.textMuted }}>
          Found in: {table.source}
        </p>
      )}

      {/* Columns preview */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(table.columns || []).slice(0, 6).map((col: any, idx: number) => (
          <span key={idx} className="px-2 py-0.5 rounded text-xs" 
            style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
            {col.name || col}
          </span>
        ))}
        {(table.columns?.length || 0) > 6 && (
          <span className="px-2 py-0.5 rounded text-xs" style={{ color: colors.textMuted }}>
            +{table.columns.length - 6} more
          </span>
        )}
      </div>

      {/* Foreign Keys */}
      {(table.foreignKeys?.length || 0) > 0 && (
        <div className="pt-3 border-t space-y-1" style={{ borderColor: colors.border }}>
          {table.foreignKeys.slice(0, 3).map((fk: any, idx: number) => (
            <div key={idx} className="flex items-center gap-1 text-xs">
              <Link2 className="w-3 h-3 text-orange-500" />
              <span style={{ color: colors.text }}>{fk.column}</span>
              <ArrowRight className="w-3 h-3" style={{ color: colors.textMuted }} />
              <span className="text-green-500">{fk.referencedTable || fk.references}</span>
            </div>
          ))}
          {table.foreignKeys.length > 3 && (
            <span className="text-xs" style={{ color: colors.textMuted }}>+{table.foreignKeys.length - 3} more FKs</span>
          )}
        </div>
      )}

      {/* FK from columns */}
      {table.columns?.some((c: any) => c.isFK) && (
        <div className="pt-3 border-t space-y-1" style={{ borderColor: colors.border }}>
          <p className="text-xs font-medium mb-1" style={{ color: colors.textMuted }}>Foreign Keys:</p>
          {table.columns.filter((c: any) => c.isFK).slice(0, 4).map((col: any, idx: number) => (
            <div key={idx} className="flex items-center gap-1 text-xs">
              <Link2 className="w-3 h-3 text-orange-500" />
              <span style={{ color: colors.text }}>{col.name}</span>
              <ArrowRight className="w-3 h-3" style={{ color: colors.textMuted }} />
              <span className="text-green-500">{col.fkTable || '?'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warning for unresolved */}
      {!table.isResolved && isDiscovered && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-500">
          <AlertTriangle className="w-3 h-3" />
          <span>DDL not uploaded yet</span>
        </div>
      )}
    </div>
  )
}

export default function TablesPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [tables, setTables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'virtual'>('grid')
  
  // Progressive loading state
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const pageSize = 20

  // Fetch tables with pagination
  const fetchTables = useCallback(async (pageNum: number, search: string, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setLoading(true)
    }
    
    try {
      const params = new URLSearchParams({
        projectId,
        paginated: 'true',
        page: String(pageNum),
        pageSize: String(pageSize),
        summary: 'false',
      })
      
      if (search) {
        params.set('search', search)
      }
      
      const response = await fetch(`/api/tables?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.data) {
          const newTables = data.data.map((t: any) => ({
            ...t,
            columns: typeof t.columns === 'string' ? JSON.parse(t.columns) : t.columns,
            foreignKeys: typeof t.foreignKeys === 'string' ? JSON.parse(t.foreignKeys) : t.foreignKeys,
          }))
          
          if (append) {
            setTables(prev => [...prev, ...newTables])
          } else {
            setTables(newTables)
          }
          
          setHasMore(data.pagination?.hasMore ?? false)
        }
      }
    } catch (error) {
      console.error('Error fetching tables:', error)
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }, [projectId])

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      setPage(1)
      fetchTables(1, query, false)
    }, 300),
    [fetchTables]
  )

  // Initial fetch
  useEffect(() => {
    fetchTables(1, '', false)
  }, [projectId])

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    debouncedSearch(value)
  }

  // Load more handler
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return
    
    const nextPage = page + 1
    setPage(nextPage)
    await fetchTables(nextPage, searchQuery, true)
  }, [page, hasMore, isLoadingMore, searchQuery, fetchTables])

  // Refresh handler
  const handleRefresh = () => {
    setPage(1)
    fetchTables(1, searchQuery, false)
  }

  // Separate tables by type
  const sqlTables = useMemo(() => 
    tables.filter(t => !t.isDiscovered), 
    [tables]
  )
  const discoveredTables = useMemo(() => 
    tables.filter(t => t.isDiscovered), 
    [tables]
  )

  // Loading skeleton
  if (loading && tables.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonTable rows={6} columns={4} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
            <Input
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(prev => prev === 'grid' ? 'virtual' : 'grid')}
          >
            {viewMode === 'grid' ? 'Virtual List' : 'Grid View'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border" style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}>
          <div className="flex items-center gap-2">
            <Table2 className="w-5 h-5" style={{ color: colors.primary }} />
            <span className="text-sm" style={{ color: colors.textMuted }}>SQL Tables</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: colors.text }}>{sqlTables.length}</p>
        </div>
        
        <div className="p-4 rounded-lg border" style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: '#8b5cf6' }} />
            <span className="text-sm" style={{ color: colors.textMuted }}>Discovered Tables</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: colors.text }}>{discoveredTables.length}</p>
        </div>
        
        <div className="p-4 rounded-lg border" style={{ borderColor: colors.border, backgroundColor: colors.cardBg }}>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" style={{ color: '#10b981' }} />
            <span className="text-sm" style={{ color: colors.textMuted }}>Total</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: colors.text }}>{tables.length}</p>
        </div>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-12">
          <Table2 className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
          <p className="text-lg" style={{ color: colors.textMuted }}>No tables found</p>
          <p className="text-sm mt-2" style={{ color: colors.textMuted }}>
            {searchQuery ? 'Try a different search term' : 'Upload SQL DDL files or CSHTML views to discover tables'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => router.push(`/project/${projectId}/upload`)}
              className="mt-4 px-4 py-2 rounded-lg"
              style={{ backgroundColor: colors.primary, color: '#fff' }}
            >
              Upload Files
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* SQL Tables Section */}
          {sqlTables.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.textMuted }}>
                <Database className="w-4 h-4" />
                SQL DDL Tables ({sqlTables.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sqlTables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    onViewDetails={setSelectedTable}
                    colors={colors}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Discovered Tables Section with Infinite Scroll */}
          {discoveredTables.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: colors.textMuted }}>
                <Sparkles className="w-4 h-4 text-purple-500" />
                Discovered from CSHTML/SP ({discoveredTables.length})
              </h3>
              
              {viewMode === 'grid' ? (
                <InfiniteScroll
                  items={discoveredTables}
                  renderItem={(table, index) => (
                    <TableCard
                      key={table.id}
                      table={table}
                      onViewDetails={setSelectedTable}
                      colors={colors}
                    />
                  )}
                  keyExtractor={(table) => table.id}
                  onLoadMore={loadMore}
                  hasMore={hasMore}
                  isLoading={isLoadingMore}
                />
              ) : (
                <VirtualList
                  items={discoveredTables}
                  estimatedItemHeight={200}
                  height={600}
                  renderItem={(table, index, style) => (
                    <div style={style}>
                      <TableCard
                        table={table}
                        onViewDetails={setSelectedTable}
                        colors={colors}
                      />
                    </div>
                  )}
                  keyExtractor={(table) => table.id}
                  onEndReached={loadMore}
                  endReachedThreshold={200}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ backgroundColor: colors.primary, color: '#fff' }}
          onClick={() => router.push(`/project/${projectId}/upload`)}
        >
          Upload More Files
        </button>
      </div>

      {/* Table Detail Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} 
          onClick={() => setSelectedTable(null)}
        >
          <div className="max-w-4xl w-full max-h-[80vh] rounded-xl overflow-hidden" 
            style={{ backgroundColor: colors.cardBg }} 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: colors.border }}>
              <div className="flex items-center gap-2">
                {selectedTable.isDiscovered ? (
                  <Sparkles className="w-5 h-5 text-purple-500" />
                ) : (
                  <Database className="w-5 h-5" style={{ color: colors.primary }} />
                )}
                <h3 className="font-semibold" style={{ color: colors.text }}>{selectedTable.tableName}</h3>
                {selectedTable.isDiscovered && (
                  <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-600">Discovered</span>
                )}
              </div>
              <button onClick={() => setSelectedTable(null)} className="text-sm px-3 py-1 rounded" style={{ color: colors.textMuted }}>Close</button>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              {selectedTable.source && (
                <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
                  <strong>Source:</strong> {selectedTable.source}
                </p>
              )}
              <h4 className="font-medium mb-2" style={{ color: colors.text }}>Columns ({selectedTable.columns?.length || 0})</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <th className="text-left py-2" style={{ color: colors.textMuted }}>Name</th>
                    <th className="text-left py-2" style={{ color: colors.textMuted }}>Type</th>
                    <th className="text-left py-2" style={{ color: colors.textMuted }}>FK</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedTable.columns || []).map((col: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td className="py-2" style={{ color: colors.text }}>{col.name || col}</td>
                      <td className="py-2" style={{ color: colors.textMuted }}>{col.sqlType || col.type || '-'}</td>
                      <td className="py-2">
                        {col.isFK && (
                          <span className="text-green-500 text-xs">→ {col.fkTable || '?'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
