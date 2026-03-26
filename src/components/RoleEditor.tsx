'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { useTheme } from '@/hooks/useTheme'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Users,
  Shield,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Filter,
  Copy,
  UserPlus,
  UserMinus,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react'

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
  permissions: string[]
}

interface RoleEditorProps {
  role?: Role | null
  permissions: Permission[]
  onSave?: (role: Partial<Role>) => void
  onDelete?: (roleId: string) => void
  onCancel?: () => void
  isNew?: boolean
}

// Permission category colors
const categoryColors: Record<string, { bg: string; color: string }> = {
  read: { bg: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6' },
  write: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10B981' },
  delete: { bg: 'rgba(239, 68, 68, 0.2)', color: '#EF4444' },
  admin: { bg: 'rgba(139, 92, 246, 0.2)', color: '#8B5CF6' },
  special: { bg: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' }
}

export function RoleEditor({ 
  role, 
  permissions,
  onSave,
  onDelete,
  onCancel,
  isNew = false 
}: RoleEditorProps) {
  const { colors } = useTheme()
  
  // Form state
  const [name, setName] = useState(role?.name || '')
  const [description, setDescription] = useState(role?.description || '')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role?.permissions || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterResource, setFilterResource] = useState<string>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
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
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
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
  
  // Toggle permission
  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }
  
  // Toggle all permissions for a resource
  const toggleResourcePermissions = (resource: string, selected: boolean) => {
    const resourcePerms = permissionsByResource[resource] || []
    const resourcePermIds = resourcePerms.map(p => p.id)
    
    if (selected) {
      // Add all
      setSelectedPermissions(prev => {
        const newSet = new Set([...prev, ...resourcePermIds])
        return Array.from(newSet)
      })
    } else {
      // Remove all
      setSelectedPermissions(prev => prev.filter(id => !resourcePermIds.includes(id)))
    }
  }
  
  // Select all permissions
  const selectAll = () => {
    setSelectedPermissions(permissions.map(p => p.id))
  }
  
  // Clear all permissions
  const clearAll = () => {
    setSelectedPermissions([])
  }
  
  // Handle save
  const handleSave = () => {
    if (!name.trim()) return
    
    onSave?.({
      id: role?.id,
      name: name.trim(),
      description: description.trim(),
      type: role?.type || 'custom',
      userCount: role?.userCount || 0,
      permissions: selectedPermissions
    })
  }
  
  // Handle delete
  const handleDelete = () => {
    if (role?.id) {
      onDelete?.(role.id)
      setShowDeleteConfirm(false)
    }
  }
  
  // Validation
  const isValid = name.trim().length >= 2
  
  // Permission counts by category
  const permissionStats = useMemo(() => {
    const stats: Record<string, number> = {}
    selectedPermissions.forEach(permId => {
      const perm = permissions.find(p => p.id === permId)
      if (perm) {
        stats[perm.category] = (stats[perm.category] || 0) + 1
      }
    })
    return stats
  }, [selectedPermissions, permissions])
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
            {isNew ? (
              <>
                <Plus className="w-5 h-5" style={{ color: colors.success }} />
                New Role
              </>
            ) : (
              <>
                <Edit className="w-5 h-5" style={{ color: colors.primary }} />
                Edit Role
              </>
            )}
          </h2>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            {isNew ? 'Create a new role with specific permissions' : 'Modify role permissions and details'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {!isNew && role && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              style={{ borderColor: colors.error, color: colors.error }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={!isValid}
            style={{ backgroundColor: colors.success }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Card style={{ borderColor: colors.error }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8" style={{ color: colors.error }} />
              <div className="flex-1">
                <h3 className="font-semibold" style={{ color: colors.text }}>Delete Role?</h3>
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  This will remove the role from {role?.userCount || 0} users. This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleDelete}
                  style={{ backgroundColor: colors.error }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Role Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Role Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
                Role Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter role name"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              />
              {!isValid && name.length > 0 && (
                <p className="text-xs mt-1" style={{ color: colors.error }}>
                  Name must be at least 2 characters
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
                Role Type
              </label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}>
                {role?.type === 'system' ? (
                  <>
                    <Shield className="w-4 h-4" style={{ color: colors.accent }} />
                    <span style={{ color: colors.text }}>System Role</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" style={{ color: colors.warning }} />
                    <span style={{ color: colors.text }}>Custom Role</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: colors.textMuted }}>
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this role's purpose"
              className="h-20"
              style={{ backgroundColor: colors.bg, borderColor: colors.border }}
            />
          </div>
          
          {/* Permission Stats */}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-xs font-medium" style={{ color: colors.textMuted }}>
              Selected Permissions: {selectedPermissions.length} / {permissions.length}
            </span>
            <div className="flex items-center gap-2">
              {Object.entries(permissionStats).map(([category, count]) => (
                <Badge 
                  key={category}
                  style={{ 
                    backgroundColor: categoryColors[category]?.bg,
                    color: categoryColors[category]?.color
                  }}
                >
                  {category}: {count}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Permission Selection */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Permissions</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={selectAll}>
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
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
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-9 rounded-md px-3 text-sm"
              style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
            >
              <option value="all">All Categories</option>
              <option value="read">Read</option>
              <option value="write">Write</option>
              <option value="delete">Delete</option>
              <option value="admin">Admin</option>
              <option value="special">Special</option>
            </select>
            
            <select
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              className="h-9 rounded-md px-3 text-sm"
              style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
            >
              <option value="all">All Resources</option>
              {uniqueResources.map(res => (
                <option key={res} value={res}>{res}</option>
              ))}
            </select>
          </div>
          
          {/* Permission List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {Object.entries(permissionsByResource).map(([resource, perms]) => {
                const allSelected = perms.every(p => selectedPermissions.includes(p.id))
                const someSelected = perms.some(p => selectedPermissions.includes(p.id))
                
                return (
                  <div key={resource}>
                    {/* Resource Header */}
                    <div 
                      className="flex items-center gap-2 p-2 rounded-lg mb-2 cursor-pointer"
                      style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 80%, transparent)` }}
                      onClick={() => toggleResourcePermissions(resource, !allSelected)}
                    >
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el) {
                            (el as any).dataset.state = someSelected && !allSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'
                          }
                        }}
                      />
                      <Shield className="w-4 h-4" style={{ color: colors.accent }} />
                      <span className="font-medium text-sm" style={{ color: colors.text }}>
                        {resource.toUpperCase()}
                      </span>
                      <Badge variant="outline" style={{ borderColor: colors.border, color: colors.textMuted }}>
                        {perms.filter(p => selectedPermissions.includes(p.id)).length} / {perms.length}
                      </Badge>
                    </div>
                    
                    {/* Permissions */}
                    <div className="grid grid-cols-2 gap-2 pl-8">
                      {perms.map(permission => {
                        const isSelected = selectedPermissions.includes(permission.id)
                        const categoryStyle = categoryColors[permission.category]
                        
                        return (
                          <div
                            key={permission.id}
                            className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-all ${
                              isSelected ? 'ring-1' : ''
                            }`}
                            style={{ 
                              backgroundColor: isSelected 
                                ? `color-mix(in srgb, ${categoryStyle.color} 10%, transparent)`
                                : `color-mix(in srgb, ${colors.bg} 50%, transparent)`,
                              ringColor: isSelected ? categoryStyle.color : undefined
                            }}
                            onClick={() => togglePermission(permission.id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate" style={{ color: colors.text }}>
                                  {permission.name}
                                </span>
                                <Badge 
                                  className="text-xs h-4"
                                  style={{ 
                                    backgroundColor: categoryStyle.bg,
                                    color: categoryStyle.color
                                  }}
                                >
                                  {permission.category}
                                </Badge>
                              </div>
                              <p className="text-xs truncate" style={{ color: colors.textMuted }}>
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
