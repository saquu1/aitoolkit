'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/hooks/useTheme'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Users,
  Lock,
  Unlock,
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Edit,
  Eye,
  Settings,
  Check,
  X,
  AlertTriangle,
  FileSpreadsheet,
  Grid3X3,
  Save,
  ChevronDown,
  ChevronRight,
  Link,
  ExternalLink
} from 'lucide-react'

interface Page {
  id: string
  name: string
  path: string
  module: string
  requiredPermissions: string[]
}

interface Role {
  id: string
  name: string
  description: string
  type: 'system' | 'custom'
  userCount: number
  permissions: string[]
}

interface PermissionAssignmentProps {
  pages: Page[]
  roles: Role[]
  onAssignmentChange?: (pageId: string, roleId: string, permissions: string[]) => void
  onExport?: (format: 'excel' | 'csv') => void
}

export function PermissionAssignment({
  pages,
  roles,
  onAssignmentChange,
  onExport
}: PermissionAssignmentProps) {
  const { colors } = useTheme()
  
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterModule, setFilterModule] = useState<string>('all')
  const [selectedPage, setSelectedPage] = useState<Page | null>(null)
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set())
  const [editMode, setEditMode] = useState(false)
  const [localPages, setLocalPages] = useState<Page[]>(pages)
  
  // Get unique modules
  const uniqueModules = useMemo(() => {
    const modules = new Set<string>()
    pages.forEach(p => modules.add(p.module))
    return Array.from(modules)
  }, [pages])
  
  // Filtered pages
  const filteredPages = useMemo(() => {
    return pages.filter(p => {
      const matchesSearch = searchQuery === '' || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.path.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesModule = filterModule === 'all' || p.module === filterModule
      return matchesSearch && matchesModule
    })
  }, [pages, searchQuery, filterModule])
  
  // Group pages by module
  const pagesByModule = useMemo(() => {
    const groups: Record<string, Page[]> = {}
    filteredPages.forEach(p => {
      if (!groups[p.module]) groups[p.module] = []
      groups[p.module].push(p)
    })
    return groups
  }, [filteredPages])
  
  // Check if role can access page
  const canAccessPage = useCallback((page: Page, role: Role): boolean => {
    return page.requiredPermissions.every(perm => role.permissions.includes(perm))
  }, [])
  
  // Check partial access (some permissions)
  const hasPartialAccess = useCallback((page: Page, role: Role): boolean => {
    return page.requiredPermissions.some(perm => role.permissions.includes(perm)) &&
           !canAccessPage(page, role)
  }, [canAccessPage])
  
  // Toggle page expansion
  const togglePageExpansion = (pageId: string) => {
    const newExpanded = new Set(expandedPages)
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId)
    } else {
      newExpanded.add(pageId)
    }
    setExpandedPages(newExpanded)
  }
  
  // Export to Excel/CSV
  const exportToCSV = () => {
    let csv = 'Page,Path,Module,' + roles.map(r => r.name).join(',') + '\n'
    
    pages.forEach(page => {
      const row = [page.name, page.path, page.module]
      roles.forEach(role => {
        row.push(canAccessPage(page, role) ? 'Full Access' : 
                 hasPartialAccess(page, role) ? 'Partial' : 'No Access')
      })
      csv += row.map(cell => `"${cell}"`).join(',') + '\n'
    })
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'page-permissions.csv'
    a.click()
    URL.revokeObjectURL(url)
    onExport?.('csv')
  }
  
  // Statistics
  const stats = useMemo(() => {
    let fullAccess = 0
    let partialAccess = 0
    let noAccess = 0
    
    pages.forEach(page => {
      roles.forEach(role => {
        if (canAccessPage(page, role)) fullAccess++
        else if (hasPartialAccess(page, role)) partialAccess++
        else noAccess++
      })
    })
    
    return { fullAccess, partialAccess, noAccess }
  }, [pages, roles, canAccessPage, hasPartialAccess])
  
  // Access level colors
  const accessLevelStyles: Record<string, { bg: string; color: string; icon: any }> = {
    full: { bg: 'rgba(34, 197, 94, 0.2)', color: '#22C55E', icon: ShieldCheck },
    partial: { bg: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', icon: AlertTriangle },
    none: { bg: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', icon: ShieldX }
  }
  
  // Render access badge
  const renderAccessBadge = (page: Page, role: Role) => {
    const hasFullAccess = canAccessPage(page, role)
    const hasPartial = hasPartialAccess(page, role)
    
    if (hasFullAccess) {
      const style = accessLevelStyles.full
      const Icon = style.icon
      return (
        <div 
          className="flex items-center gap-1 px-2 py-1 rounded"
          style={{ backgroundColor: style.bg }}
        >
          <Icon className="w-3 h-3" style={{ color: style.color }} />
          <span className="text-xs" style={{ color: style.color }}>Full</span>
        </div>
      )
    }
    
    if (hasPartial) {
      const style = accessLevelStyles.partial
      const Icon = style.icon
      return (
        <div 
          className="flex items-center gap-1 px-2 py-1 rounded"
          style={{ backgroundColor: style.bg }}
        >
          <Icon className="w-3 h-3" style={{ color: style.color }} />
          <span className="text-xs" style={{ color: style.color }}>Partial</span>
        </div>
      )
    }
    
    const style = accessLevelStyles.none
    const Icon = style.icon
    return (
      <div 
        className="flex items-center gap-1 px-2 py-1 rounded"
        style={{ backgroundColor: style.bg }}
      >
        <Icon className="w-3 h-3" style={{ color: style.color }} />
        <span className="text-xs" style={{ color: style.color }}>None</span>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4" style={{ color: colors.success }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Full Access</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.success }}>{stats.fullAccess}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" style={{ color: colors.warning }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Partial Access</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.warning }}>{stats.partialAccess}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldX className="w-4 h-4" style={{ color: colors.error }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>No Access</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.error }}>{stats.noAccess}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Grid3X3 className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Total Pages</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{pages.length}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            style={{ backgroundColor: colors.bg, borderColor: colors.border }}
          />
        </div>
        
        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-32" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {uniqueModules.map(mod => (
              <SelectItem key={mod} value={mod}>{mod}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-2 ml-auto">
          <Button size="sm" variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Link className="w-5 h-5" style={{ color: colors.accent }} />
            Page Permission Assignments
          </CardTitle>
          <CardDescription>
            View which roles have access to each page based on their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {Object.entries(pagesByModule).map(([module, modulePages]) => (
                <div key={module}>
                  {/* Module Header */}
                  <div 
                    className="flex items-center gap-2 p-2 rounded-lg mb-2"
                    style={{ backgroundColor: `color-mix(in srgb, ${colors.accent} 20%, transparent)` }}
                  >
                    <Shield className="w-4 h-4" style={{ color: colors.accent }} />
                    <span className="font-medium" style={{ color: colors.text }}>
                      {module}
                    </span>
                    <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textMuted }}>
                      {modulePages.length} pages
                    </Badge>
                  </div>
                  
                  {/* Pages Table */}
                  <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]" style={{ color: colors.textMuted }}>Page</TableHead>
                          <TableHead className="w-[200px]" style={{ color: colors.textMuted }}>Path</TableHead>
                          <TableHead className="w-[200px]" style={{ color: colors.textMuted }}>Required Permissions</TableHead>
                          {roles.map(role => (
                            <TableHead 
                              key={role.id}
                              className="text-center min-w-[100px]"
                              style={{ color: colors.text }}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-medium truncate max-w-[80px]">{role.name}</span>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modulePages.map(page => {
                          const isExpanded = expandedPages.has(page.id)
                          
                          return (
                            <>
                              <TableRow 
                                key={page.id}
                                className="cursor-pointer"
                                onClick={() => togglePageExpansion(page.id)}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
                                    )}
                                    <ExternalLink className="w-3 h-3" style={{ color: colors.textMuted }} />
                                    <span className="font-medium" style={{ color: colors.text }}>
                                      {page.name}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <code 
                                    className="text-xs px-2 py-1 rounded"
                                    style={{ 
                                      backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)`,
                                      color: colors.textSecondary
                                    }}
                                  >
                                    {page.path}
                                  </code>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {page.requiredPermissions.slice(0, 2).map(perm => (
                                      <Badge 
                                        key={perm}
                                        className="text-xs"
                                        style={{ 
                                          backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                                          color: colors.primary
                                        }}
                                      >
                                        {perm}
                                      </Badge>
                                    ))}
                                    {page.requiredPermissions.length > 2 && (
                                      <Badge 
                                        variant="outline"
                                        className="text-xs"
                                        style={{ borderColor: colors.border, color: colors.textMuted }}
                                      >
                                        +{page.requiredPermissions.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                {roles.map(role => (
                                  <TableCell key={`${page.id}-${role.id}`} className="text-center">
                                    {renderAccessBadge(page, role)}
                                  </TableCell>
                                ))}
                              </TableRow>
                              
                              {/* Expanded Row - Permission Details */}
                              {isExpanded && (
                                <TableRow key={`${page.id}-expanded`}>
                                  <TableCell colSpan={3 + roles.length}>
                                    <div 
                                      className="p-4 space-y-4"
                                      style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 30%, transparent)` }}
                                    >
                                      {/* All Required Permissions */}
                                      <div>
                                        <h4 className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>
                                          All Required Permissions ({page.requiredPermissions.length})
                                        </h4>
                                        <div className="flex flex-wrap gap-1">
                                          {page.requiredPermissions.map(perm => (
                                            <Badge 
                                              key={perm}
                                              style={{ 
                                                backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                                                color: colors.primary
                                              }}
                                            >
                                              {perm}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      {/* Role Access Details */}
                                      <div>
                                        <h4 className="text-xs font-medium mb-2" style={{ color: colors.textMuted }}>
                                          Role Access Details
                                        </h4>
                                        <div className="grid grid-cols-3 gap-2">
                                          {roles.map(role => {
                                            const hasFullAccess = canAccessPage(page, role)
                                            const missingPerms = page.requiredPermissions.filter(
                                              perm => !role.permissions.includes(perm)
                                            )
                                            
                                            return (
                                              <div 
                                                key={role.id}
                                                className="p-2 rounded-lg"
                                                style={{ 
                                                  backgroundColor: hasFullAccess 
                                                    ? `color-mix(in srgb, ${colors.success} 10%, transparent)`
                                                    : `color-mix(in srgb, ${colors.error} 10%, transparent)`
                                                }}
                                              >
                                                <div className="flex items-center justify-between mb-2">
                                                  <span className="font-medium text-sm" style={{ color: colors.text }}>
                                                    {role.name}
                                                  </span>
                                                  {hasFullAccess ? (
                                                    <Check className="w-4 h-4" style={{ color: colors.success }} />
                                                  ) : (
                                                    <X className="w-4 h-4" style={{ color: colors.error }} />
                                                  )}
                                                </div>
                                                {!hasFullAccess && missingPerms.length > 0 && (
                                                  <div>
                                                    <span className="text-xs" style={{ color: colors.textMuted }}>
                                                      Missing:
                                                    </span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                      {missingPerms.map(perm => (
                                                        <Badge 
                                                          key={perm}
                                                          variant="outline"
                                                          className="text-xs"
                                                          style={{ borderColor: colors.error, color: colors.error }}
                                                        >
                                                          {perm}
                                                        </Badge>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6">
            <span className="text-xs font-medium" style={{ color: colors.textMuted }}>Access Levels:</span>
            {Object.entries(accessLevelStyles).map(([level, style]) => {
              const Icon = style.icon
              const labels: Record<string, string> = {
                full: 'Full Access - Role has all required permissions',
                partial: 'Partial Access - Role has some but not all permissions',
                none: 'No Access - Role lacks all required permissions'
              }
              
              return (
                <div key={level} className="flex items-center gap-2">
                  <div 
                    className="flex items-center gap-1 px-2 py-1 rounded"
                    style={{ backgroundColor: style.bg }}
                  >
                    <Icon className="w-3 h-3" style={{ color: style.color }} />
                    <span className="text-xs" style={{ color: style.color }}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: colors.textMuted }}>
                    {labels[level]}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
