'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  ShieldAlert,
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
  Grid3X3
} from 'lucide-react'

// Permission Types
interface Permission {
  id: string
  name: string
  description: string
  category: 'read' | 'write' | 'delete' | 'admin' | 'special'
  resource: string
  action: string
}

interface Role {
  id: string
  name: string
  description: string
  type: 'system' | 'custom'
  userCount: number
  permissions: string[] // Permission IDs
}

interface Page {
  id: string
  name: string
  path: string
  module: string
  requiredPermissions: string[]
}

interface PermissionAssignment {
  pageId: string
  roleId: string
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canExport: boolean
}

// Sample data for demo
const samplePermissions: Permission[] = [
  { id: 'patient.view', name: 'View Patients', description: 'View patient records', category: 'read', resource: 'patient', action: 'view' },
  { id: 'patient.create', name: 'Create Patients', description: 'Create new patient records', category: 'write', resource: 'patient', action: 'create' },
  { id: 'patient.edit', name: 'Edit Patients', description: 'Edit patient records', category: 'write', resource: 'patient', action: 'edit' },
  { id: 'patient.delete', name: 'Delete Patients', description: 'Delete patient records', category: 'delete', resource: 'patient', action: 'delete' },
  { id: 'appointment.view', name: 'View Appointments', description: 'View appointments', category: 'read', resource: 'appointment', action: 'view' },
  { id: 'appointment.create', name: 'Create Appointments', description: 'Create appointments', category: 'write', resource: 'appointment', action: 'create' },
  { id: 'appointment.edit', name: 'Edit Appointments', description: 'Edit appointments', category: 'write', resource: 'appointment', action: 'edit' },
  { id: 'appointment.cancel', name: 'Cancel Appointments', description: 'Cancel appointments', category: 'write', resource: 'appointment', action: 'cancel' },
  { id: 'report.view', name: 'View Reports', description: 'View reports', category: 'read', resource: 'report', action: 'view' },
  { id: 'report.export', name: 'Export Reports', description: 'Export reports', category: 'special', resource: 'report', action: 'export' },
  { id: 'user.manage', name: 'Manage Users', description: 'Manage system users', category: 'admin', resource: 'user', action: 'manage' },
  { id: 'role.manage', name: 'Manage Roles', description: 'Manage roles and permissions', category: 'admin', resource: 'role', action: 'manage' },
  { id: 'billing.view', name: 'View Billing', description: 'View billing information', category: 'read', resource: 'billing', action: 'view' },
  { id: 'billing.process', name: 'Process Billing', description: 'Process billing transactions', category: 'write', resource: 'billing', action: 'process' },
  { id: 'inventory.view', name: 'View Inventory', description: 'View inventory', category: 'read', resource: 'inventory', action: 'view' },
  { id: 'inventory.manage', name: 'Manage Inventory', description: 'Manage inventory items', category: 'write', resource: 'inventory', action: 'manage' }
]

const sampleRoles: Role[] = [
  { 
    id: 'admin', 
    name: 'Administrator', 
    description: 'Full system access', 
    type: 'system',
    userCount: 2,
    permissions: samplePermissions.map(p => p.id) 
  },
  { 
    id: 'doctor', 
    name: 'Doctor', 
    description: 'Medical staff with patient access', 
    type: 'system',
    userCount: 15,
    permissions: ['patient.view', 'patient.edit', 'appointment.view', 'appointment.create', 'appointment.edit', 'report.view', 'report.export'] 
  },
  { 
    id: 'nurse', 
    name: 'Nurse', 
    description: 'Nursing staff', 
    type: 'system',
    userCount: 30,
    permissions: ['patient.view', 'appointment.view', 'appointment.create'] 
  },
  { 
    id: 'receptionist', 
    name: 'Receptionist', 
    description: 'Front desk staff', 
    type: 'system',
    userCount: 8,
    permissions: ['patient.view', 'patient.create', 'appointment.view', 'appointment.create', 'appointment.edit', 'appointment.cancel', 'billing.view'] 
  },
  { 
    id: 'billing', 
    name: 'Billing Staff', 
    description: 'Billing department', 
    type: 'system',
    userCount: 5,
    permissions: ['patient.view', 'billing.view', 'billing.process', 'report.view', 'report.export'] 
  },
  { 
    id: 'readonly', 
    name: 'Read Only', 
    description: 'View-only access', 
    type: 'custom',
    userCount: 10,
    permissions: ['patient.view', 'appointment.view', 'report.view'] 
  }
]

const samplePages: Page[] = [
  { id: 'patient-list', name: 'Patient List', path: '/patients', module: 'ADT', requiredPermissions: ['patient.view'] },
  { id: 'patient-form', name: 'Patient Form', path: '/patients/new', module: 'ADT', requiredPermissions: ['patient.view', 'patient.create'] },
  { id: 'appointment-calendar', name: 'Appointment Calendar', path: '/appointments', module: 'ADT', requiredPermissions: ['appointment.view'] },
  { id: 'reports', name: 'Reports', path: '/reports', module: 'RPT', requiredPermissions: ['report.view'] },
  { id: 'user-management', name: 'User Management', path: '/admin/users', module: 'SYS', requiredPermissions: ['user.manage'] },
  { id: 'billing', name: 'Billing', path: '/billing', module: 'BIL', requiredPermissions: ['billing.view'] },
  { id: 'inventory', name: 'Inventory', path: '/inventory', module: 'INV', requiredPermissions: ['inventory.view'] }
]

// Permission category colors
const categoryColors: Record<string, { bg: string; color: string }> = {
  read: { bg: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6' },
  write: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10B981' },
  delete: { bg: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' },
  admin: { bg: 'rgba(139, 92, 246, 0.2)', color: '#8B5CF6' },
  special: { bg: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' }
}

// Permission category icons
const categoryIcons: Record<string, any> = {
  read: Eye,
  write: Edit,
  delete: Trash2,
  admin: Settings,
  special: ShieldAlert
}

interface PermissionMatrixProps {
  permissions?: Permission[]
  roles?: Role[]
  pages?: Page[]
  onPermissionChange?: (roleId: string, permissionId: string, granted: boolean) => void
  onExport?: (format: 'excel' | 'csv' | 'json') => void
}

export function PermissionMatrix({
  permissions = samplePermissions,
  roles = sampleRoles,
  pages = samplePages,
  onPermissionChange,
  onExport
}: PermissionMatrixProps) {
  const { colors } = useTheme()
  
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterResource, setFilterResource] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'matrix' | 'roles' | 'pages'>('matrix')
  const [editMode, setEditMode] = useState(false)
  
  // Local state for edit mode
  const [localRoles, setLocalRoles] = useState<Role[]>(roles)
  
  // Get unique resources
  const uniqueResources = useMemo(() => {
    const resources = new Set<string>()
    permissions.forEach(p => resources.add(p.resource))
    return Array.from(resources)
  }, [permissions])
  
  // Filtered permissions
  const filteredPermissions = useMemo(() => {
    return permissions.filter(p => {
      const matchesSearch = searchQuery === '' || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.resource.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory
      const matchesResource = filterResource === 'all' || p.resource === filterResource
      return matchesSearch && matchesCategory && matchesResource
    })
  }, [permissions, searchQuery, filterCategory, filterResource])
  
  // Group permissions by resource
  const permissionsByResource = useMemo(() => {
    const groups: Record<string, Permission[]> = {}
    filteredPermissions.forEach(p => {
      if (!groups[p.resource]) groups[p.resource] = []
      groups[p.resource].push(p)
    })
    return groups
  }, [filteredPermissions])
  
  // Check if role has permission
  const hasPermission = useCallback((role: Role, permissionId: string): boolean => {
    return role.permissions.includes(permissionId)
  }, [])
  
  // Toggle permission
  const togglePermission = useCallback((roleId: string, permissionId: string) => {
    if (!editMode) return
    
    setLocalRoles(prev => prev.map(role => {
      if (role.id !== roleId) return role
      
      const hasIt = role.permissions.includes(permissionId)
      const newPermissions = hasIt
        ? role.permissions.filter(id => id !== permissionId)
        : [...role.permissions, permissionId]
      
      onPermissionChange?.(roleId, permissionId, !hasIt)
      
      return { ...role, permissions: newPermissions }
    }))
  }, [editMode, onPermissionChange])
  
  // Statistics
  const stats = useMemo(() => {
    const totalPermissions = permissions.length
    const totalRoles = roles.length
    const totalAssignments = roles.reduce((sum, role) => sum + role.permissions.length, 0)
    const avgPermissionsPerRole = Math.round(totalAssignments / totalRoles)
    
    return {
      totalPermissions,
      totalRoles,
      totalAssignments,
      avgPermissionsPerRole
    }
  }, [permissions, roles])
  
  // Export functions
  const exportToCSV = () => {
    let csv = 'Permission,' + roles.map(r => r.name).join(',') + '\n'
    
    permissions.forEach(p => {
      const row = [p.name]
      roles.forEach(role => {
        row.push(hasPermission(role, p.id) ? 'Yes' : 'No')
      })
      csv += row.join(',') + '\n'
    })
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'permission-matrix.csv'
    a.click()
    URL.revokeObjectURL(url)
    onExport?.('csv')
  }
  
  const exportToJSON = () => {
    const data = {
      permissions,
      roles: localRoles,
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'permission-matrix.json'
    a.click()
    URL.revokeObjectURL(url)
    onExport?.('json')
  }
  
  // Render permission cell
  const renderPermissionCell = (role: Role, permission: Permission) => {
    const has = hasPermission(role, permission.id)
    const categoryStyle = categoryColors[permission.category]
    
    return (
      <div 
        className={`w-8 h-8 rounded flex items-center justify-center cursor-pointer transition-all ${editMode ? 'hover:scale-110' : ''}`}
        style={{ 
          backgroundColor: has ? categoryStyle.bg : 'transparent',
          border: `1px solid ${has ? categoryStyle.color : colors.border}`
        }}
        onClick={() => togglePermission(role.id, permission.id)}
      >
        {has ? (
          <Check className="w-4 h-4" style={{ color: categoryStyle.color }} />
        ) : (
          <X className="w-4 h-4" style={{ color: colors.textMuted }} />
        )}
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
              <Shield className="w-4 h-4" style={{ color: colors.primary }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Total Permissions</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.totalPermissions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4" style={{ color: colors.accent }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Total Roles</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.totalRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4" style={{ color: colors.success }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Assignments</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.totalAssignments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Grid3X3 className="w-4 h-4" style={{ color: colors.warning }} />
              <span className="text-xs" style={{ color: colors.textMuted }}>Avg per Role</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: colors.text }}>{stats.avgPermissionsPerRole}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: colors.textMuted }} />
          <Input
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            style={{ backgroundColor: colors.bg, borderColor: colors.border }}
          />
        </div>
        
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-32" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="write">Write</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="special">Special</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterResource} onValueChange={setFilterResource}>
          <SelectTrigger className="w-32" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
            <SelectValue placeholder="Resource" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resources</SelectItem>
            {uniqueResources.map(res => (
              <SelectItem key={res} value={res}>{res}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex items-center gap-2 ml-auto">
          <Button 
            size="sm" 
            variant={editMode ? 'default' : 'outline'}
            onClick={() => setEditMode(!editMode)}
            style={editMode ? { backgroundColor: colors.warning } : {}}
          >
            {editMode ? (
              <>
                <Unlock className="w-4 h-4 mr-2" />
                Editing
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Edit Mode
              </>
            )}
          </Button>
          
          <div className="w-px h-6" style={{ backgroundColor: colors.border }} />
          
          <Button size="sm" variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportToJSON}>
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>
      
      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <TabsList>
          <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
          <TabsTrigger value="roles">By Role</TabsTrigger>
          <TabsTrigger value="pages">Page Access</TabsTrigger>
        </TabsList>
        
        {/* Matrix View */}
        <TabsContent value="matrix">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10" style={{ backgroundColor: colors.bg }}>
                        Permission
                      </TableHead>
                      {localRoles.map(role => (
                        <TableHead 
                          key={role.id}
                          className="text-center min-w-[80px]"
                          style={{ color: colors.text }}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-medium truncate max-w-[70px]">{role.name}</span>
                            <Badge 
                              variant="outline" 
                              className="text-xs h-4"
                              style={{ borderColor: colors.border, color: colors.textMuted }}
                            >
                              {role.permissions.length}
                            </Badge>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(permissionsByResource).map(([resource, perms]) => (
                      <>
                        {/* Resource Header Row */}
                        <TableRow key={`header-${resource}`}>
                          <TableCell 
                            colSpan={localRoles.length + 1}
                            className="font-medium"
                            style={{ 
                              backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)`,
                              color: colors.accent
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              {resource.toUpperCase()}
                              <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textMuted }}>
                                {perms.length} permissions
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* Permission Rows */}
                        {perms.map(permission => {
                          const categoryStyle = categoryColors[permission.category]
                          const Icon = categoryIcons[permission.category]
                          
                          return (
                            <TableRow key={permission.id}>
                              <TableCell className="sticky left-0 z-10" style={{ backgroundColor: colors.bg }}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-6 h-6 rounded flex items-center justify-center"
                                    style={{ backgroundColor: categoryStyle.bg }}
                                  >
                                    <Icon className="w-3 h-3" style={{ color: categoryStyle.color }} />
                                  </div>
                                  <div>
                                    <span className="text-sm" style={{ color: colors.text }}>{permission.name}</span>
                                    <p className="text-xs" style={{ color: colors.textMuted }}>{permission.description}</p>
                                  </div>
                                </div>
                              </TableCell>
                              {localRoles.map(role => (
                                <TableCell key={`${role.id}-${permission.id}`} className="text-center">
                                  {renderPermissionCell(role, permission)}
                                </TableCell>
                              ))}
                            </TableRow>
                          )
                        })}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* By Role View */}
        <TabsContent value="roles">
          <div className="grid grid-cols-3 gap-4">
            {localRoles.map(role => (
              <Card key={role.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="w-4 h-4" style={{ color: colors.primary }} />
                        {role.name}
                      </CardTitle>
                      <CardDescription>{role.description}</CardDescription>
                    </div>
                    <Badge 
                      variant="outline"
                      style={{ borderColor: role.type === 'system' ? colors.accent : colors.warning, color: role.type === 'system' ? colors.accent : colors.warning }}
                    >
                      {role.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge style={{ backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`, color: colors.primary }}>
                      {role.permissions.length} permissions
                    </Badge>
                    <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                      {role.userCount} users
                    </Badge>
                  </div>
                  
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {role.permissions.map(permId => {
                        const perm = permissions.find(p => p.id === permId)
                        if (!perm) return null
                        
                        const categoryStyle = categoryColors[perm.category]
                        const Icon = categoryIcons[perm.category]
                        
                        return (
                          <div 
                            key={permId}
                            className="flex items-center gap-2 p-2 rounded"
                            style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                          >
                            <div 
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{ backgroundColor: categoryStyle.bg }}
                            >
                              <Icon className="w-3 h-3" style={{ color: categoryStyle.color }} />
                            </div>
                            <span className="text-xs" style={{ color: colors.text }}>{perm.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        {/* Page Access View */}
        <TabsContent value="pages">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ color: colors.textMuted }}>Page</TableHead>
                      <TableHead style={{ color: colors.textMuted }}>Path</TableHead>
                      <TableHead style={{ color: colors.textMuted }}>Module</TableHead>
                      <TableHead style={{ color: colors.textMuted }}>Required Permissions</TableHead>
                      <TableHead style={{ color: colors.textMuted }}>Roles with Access</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map(page => {
                      const rolesWithAccess = localRoles.filter(role => 
                        page.requiredPermissions.every(perm => role.permissions.includes(perm))
                      )
                      
                      return (
                        <TableRow key={page.id}>
                          <TableCell>
                            <span className="font-medium" style={{ color: colors.text }}>{page.name}</span>
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
                            <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                              {page.module}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {page.requiredPermissions.map(permId => {
                                const perm = permissions.find(p => p.id === permId)
                                return (
                                  <Badge 
                                    key={permId}
                                    className="text-xs"
                                    style={{ 
                                      backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                                      color: colors.primary
                                    }}
                                  >
                                    {perm?.name || permId}
                                  </Badge>
                                )
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {rolesWithAccess.length > 0 ? (
                                rolesWithAccess.map(role => (
                                  <Badge 
                                    key={role.id}
                                    variant="outline"
                                    className="text-xs"
                                    style={{ borderColor: colors.success, color: colors.success }}
                                  >
                                    {role.name}
                                  </Badge>
                                ))
                              ) : (
                                <div className="flex items-center gap-1" style={{ color: colors.error }}>
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="text-xs">No access</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
