'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTheme } from '@/hooks/useTheme'
import { useSchema } from '@/hooks/useSchema'
import { 
  Building2,
  Users,
  CreditCard,
  Shield,
  Settings,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Crown,
  Star,
  Zap,
  TrendingUp,
  DollarSign,
  Calendar,
  Bell,
  Key,
  Globe,
  Lock,
  Mail,
  RefreshCw
} from 'lucide-react'

// Subscription tier data
const SUBSCRIPTION_TIERS = [
  {
    name: 'free',
    displayName: 'Free',
    price: 0,
    billing: 'forever',
    icon: Star,
    color: 'slate',
    features: ['1 Project', '2 Users', '10 Tables', 'Basic AI'],
    limits: { projects: 1, users: 2, tables: 10, storage: 100 }
  },
  {
    name: 'starter',
    displayName: 'Starter',
    price: 29,
    billing: 'per month',
    icon: Zap,
    color: 'blue',
    features: ['5 Projects', '10 Users', '50 Tables', 'Full AI Suite', 'Email Support'],
    limits: { projects: 5, users: 10, tables: 50, storage: 1024 }
  },
  {
    name: 'professional',
    displayName: 'Professional',
    price: 99,
    billing: 'per month',
    icon: Crown,
    color: 'purple',
    recommended: true,
    features: ['25 Projects', '50 Users', 'Unlimited Tables', 'Multi-workspace', 'Integrations', 'Priority Support'],
    limits: { projects: 25, users: 50, tables: -1, storage: 10240 }
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 0,
    billing: 'contact sales',
    icon: Building2,
    color: 'amber',
    features: ['Unlimited Everything', 'SSO/SAML', 'Custom Branding', '24/7 Support', 'SLA', 'On-premise Option'],
    limits: { projects: -1, users: -1, tables: -1, storage: -1 }
  }
]

const ROLES = [
  { name: 'owner', displayName: 'Owner', level: 100, description: 'Full access to company and billing' },
  { name: 'admin', displayName: 'Admin', level: 80, description: 'Manage users and projects' },
  { name: 'manager', displayName: 'Manager', level: 70, description: 'Manage assigned projects' },
  { name: 'developer', displayName: 'Developer', level: 50, description: 'Edit modules and schemas' },
  { name: 'viewer', displayName: 'Viewer', level: 20, description: 'Read-only access' }
]

interface MockCompany {
  name: string
  tier: string
  status: string
  users: number
  projects: number
}

interface MockUser {
  name: string
  email: string
  role: string
  status: string
  lastActive: string
}

interface MultiTenantTabProps {
  onNavigate?: (tab: string) => void
}

export function MultiTenantTab({ onNavigate }: MultiTenantTabProps) {
  const { colors } = useTheme()
  // Connect to shared schema state
  const { 
    parseResult, 
    totalTables, 
    totalColumns, 
    fkResolvedPercent, 
    modulesLinked, 
    linkedModules, 
    missingTables 
  } = useSchema()
  
  const [activeSection, setActiveSection] = useState<'overview' | 'subscription' | 'users' | 'rbac'>('overview')
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  
  // Mock data
  const company: MockCompany = {
    name: 'Acme Healthcare',
    tier: 'professional',
    status: 'active',
    users: 23,
    projects: 8
  }

  const mockUsers: MockUser[] = [
    { name: 'John Smith', email: 'john@acme.com', role: 'owner', status: 'active', lastActive: '2 hours ago' },
    { name: 'Jane Doe', email: 'jane@acme.com', role: 'admin', status: 'active', lastActive: '1 day ago' },
    { name: 'Bob Wilson', email: 'bob@acme.com', role: 'developer', status: 'active', lastActive: '5 mins ago' },
    { name: 'Alice Brown', email: 'alice@acme.com', role: 'viewer', status: 'pending', lastActive: 'Never' }
  ]

  const usage = {
    projects: { current: 8, limit: 25, percentage: 32 },
    users: { current: 23, limit: 50, percentage: 46 },
    tables: { current: 147, limit: -1, percentage: 0 },
    storage: { current: 2048, limit: 10240, percentage: 20 },
    apiCalls: { current: 5420, limit: -1, percentage: 0 }
  }

  const getTierColor = (tier: string) => {
    return {
      backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
      color: colors.primary,
      borderColor: `color-mix(in srgb, ${colors.primary} 30%, transparent)`,
    }
  }

  const getRoleStyle = (role: string) => {
    const roleColors: Record<string, string> = {
      owner: colors.warning,
      admin: colors.error,
      manager: colors.accent,
      developer: colors.success,
      viewer: colors.textMuted,
    }
    const color = roleColors[role] || colors.textMuted
    return {
      backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
      color: color,
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: colors.text }}>
            <Building2 className="w-7 h-7" style={{ color: colors.warning }} />
            Multi-Tenant Management
          </h2>
          <p className="mt-1" style={{ color: colors.textMuted }}>
            Company settings, subscription, users, and role-based access control
          </p>
        </div>
        <Badge 
          className="text-sm px-4 py-1.5 flex items-center gap-2"
          style={getTierColor(company.tier)}
        >
          <Crown className="w-4 h-4" />
          {company.tier.charAt(0).toUpperCase() + company.tier.slice(1)} Plan
        </Badge>
      </div>

      {/* Section Tabs */}
      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as any)}>
        <TabsList className="border">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="rbac" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Company Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" style={{ color: colors.accent }} />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label style={{ color: colors.textMuted }}>Company Name</Label>
                <Input 
                  value={company.name} 
                  className="mt-1"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.inputText,
                  }}
                  readOnly
                />
              </div>
              <div>
                <Label style={{ color: colors.textMuted }}>Subscription Status</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Badge 
                    className="flex items-center gap-1"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${colors.success} 20%, transparent)`,
                      color: colors.success,
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {company.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: colors.textMuted }}>Projects</span>
                  <Badge 
                    variant="outline"
                    style={{ borderColor: colors.border, color: colors.textSecondary }}
                  >
                    {usage.projects.current}/{usage.projects.limit === -1 ? '∞' : usage.projects.limit}
                  </Badge>
                </div>
                <Progress value={usage.projects.percentage} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: colors.textMuted }}>Users</span>
                  <Badge 
                    variant="outline"
                    style={{ borderColor: colors.border, color: colors.textSecondary }}
                  >
                    {usage.users.current}/{usage.users.limit === -1 ? '∞' : usage.users.limit}
                  </Badge>
                </div>
                <Progress value={usage.users.percentage} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: colors.textMuted }}>Tables</span>
                  <Badge 
                    variant="outline"
                    style={{ borderColor: colors.border, color: colors.textSecondary }}
                  >
                    {usage.tables.current} (unlimited)
                  </Badge>
                </div>
                <Progress value={0} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: colors.textMuted }}>Storage</span>
                  <Badge 
                    variant="outline"
                    style={{ borderColor: colors.border, color: colors.textSecondary }}
                  >
                    {usage.storage.current}MB / {usage.storage.limit}MB
                  </Badge>
                </div>
                <Progress value={usage.storage.percentage} className="h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Users, label: 'Invite Users', desc: 'Add team members', color: colors.accent },
              { icon: Key, label: 'API Keys', desc: 'Manage integrations', color: colors.primary },
              { icon: Bell, label: 'Notifications', desc: 'Alert settings', color: colors.success },
            ].map((action) => (
              <Card 
                key={action.label}
                className="hover:opacity-80 cursor-pointer transition-all"
                style={{ borderColor: `color-mix(in srgb, ${action.color} 30%, transparent)` }}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${action.color} 20%, transparent)` }}
                  >
                    <action.icon className="w-5 h-5" style={{ color: action.color }} />
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: colors.text }}>{action.label}</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>{action.desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 ml-auto" style={{ color: colors.textMuted }} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4 mt-4">
          {/* Current Plan */}
          <Card style={{ borderColor: `color-mix(in srgb, ${colors.primary} 30%, transparent)` }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <Badge style={getTierColor(company.tier)}>
                  Professional
                </Badge>
              </div>
              <CardDescription>
                Your subscription renews on February 15, 2025
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold" style={{ color: colors.text }}>$99</div>
                  <div className="text-sm" style={{ color: colors.textMuted }}>per month</div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    style={{ borderColor: colors.border, color: colors.textSecondary }}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Update Payment
                  </Button>
                  <Button 
                    variant="outline"
                    style={{ borderColor: colors.border, color: colors.textSecondary }}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Billing History
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Comparison */}
          <div className="grid grid-cols-4 gap-4">
            {SUBSCRIPTION_TIERS.map((tier) => {
              const Icon = tier.icon
              const isCurrent = tier.name === company.tier
              
              return (
                <Card 
                  key={tier.name}
                  style={{
                    borderColor: isCurrent ? colors.primary : colors.border,
                    boxShadow: tier.recommended ? `0 0 0 1px ${colors.primary}` : 'none',
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: colors.primary }} />
                      </div>
                      {tier.recommended && (
                        <Badge 
                          className="text-xs"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                            color: colors.primary,
                          }}
                        >
                          Recommended
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge 
                          className="text-xs"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${colors.success} 20%, transparent)`,
                            color: colors.success,
                          }}
                        >
                          Current
                        </Badge>
                      )}
                    </div>
                    
                    <h4 className="font-semibold" style={{ color: colors.text }}>{tier.displayName}</h4>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold" style={{ color: colors.text }}>
                        {tier.price === 0 && tier.name !== 'free' ? 'Custom' : `$${tier.price}`}
                      </span>
                      <span className="text-sm" style={{ color: colors.textMuted }}>{tier.billing}</span>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      {tier.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4" style={{ color: colors.success }} />
                          <span style={{ color: colors.textSecondary }}>{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {!isCurrent && (
                      <Button 
                        className="w-full mt-4"
                        size="sm"
                        style={{
                          backgroundColor: tier.name === 'enterprise' ? colors.warning : colors.primary,
                          color: '#ffffff',
                        }}
                      >
                        {tier.name === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4 mt-4">
          {/* User Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { value: usage.users.current, label: 'Total Users', color: colors.text },
              { value: mockUsers.filter(u => u.status === 'active').length, label: 'Active', color: colors.success },
              { value: mockUsers.filter(u => u.status === 'pending').length, label: 'Pending', color: colors.warning },
              { value: usage.users.limit - usage.users.current, label: 'Available Seats', color: colors.primary },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Invite Button */}
          <div className="flex justify-end">
            <Button style={{ backgroundColor: colors.accent, color: '#ffffff' }}>
              <Users className="w-4 h-4 mr-2" />
              Invite User
            </Button>
          </div>

          {/* User List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockUsers.map((user) => (
                  <div 
                    key={user.email} 
                    className="rounded-lg p-3 flex items-center justify-between"
                    style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center font-medium"
                        style={{ 
                          backgroundColor: `color-mix(in srgb, ${colors.primary} 20%, transparent)`,
                          color: colors.primary,
                        }}
                      >
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: colors.text }}>{user.name}</div>
                        <div className="text-xs" style={{ color: colors.textMuted }}>{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge style={getRoleStyle(user.role)}>
                        {user.role}
                      </Badge>
                      <Badge 
                        style={{
                          backgroundColor: user.status === 'active' 
                            ? `color-mix(in srgb, ${colors.success} 20%, transparent)` 
                            : `color-mix(in srgb, ${colors.warning} 20%, transparent)`,
                          color: user.status === 'active' ? colors.success : colors.warning,
                        }}
                      >
                        {user.status}
                      </Badge>
                      <span className="text-xs w-20 text-right" style={{ color: colors.textMuted }}>
                        {user.lastActive}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RBAC Tab */}
        <TabsContent value="rbac" className="space-y-4 mt-4">
          {/* RBAC Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" style={{ color: colors.warning }} />
                Role-Based Access Control
              </CardTitle>
              <CardDescription>
                Configure permissions for each role. Changes affect all users with that role.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Role Definitions */}
          <div className="space-y-3">
            {ROLES.map((role) => (
              <Card key={role.name}>
                <div 
                  className="p-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setExpandedRole(expandedRole === role.name ? null : role.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedRole === role.name ? (
                        <ChevronDown className="w-4 h-4" style={{ color: colors.textMuted }} />
                      ) : (
                        <ChevronRight className="w-4 h-4" style={{ color: colors.textMuted }} />
                      )}
                      <div>
                        <div className="font-medium flex items-center gap-2" style={{ color: colors.text }}>
                          {role.displayName}
                          <Badge style={getRoleStyle(role.name)}>
                            Level {role.level}
                          </Badge>
                        </div>
                        <div className="text-sm" style={{ color: colors.textMuted }}>{role.description}</div>
                      </div>
                    </div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>
                      {mockUsers.filter(u => u.role === role.name).length} users
                    </div>
                  </div>
                </div>
                
                {expandedRole === role.name && (
                  <div className="border-t p-4" style={{ borderColor: colors.border }}>
                    <h5 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>Permissions</h5>
                    <div className="grid grid-cols-3 gap-2">
                      {PERMISSION_EXAMPLES[role.name]?.map((perm) => (
                        <div 
                          key={perm} 
                          className="flex items-center gap-2 text-sm rounded p-2"
                          style={{ backgroundColor: `color-mix(in srgb, ${colors.bg} 50%, transparent)` }}
                        >
                          {perm.includes('*') ? (
                            <Lock className="w-4 h-4" style={{ color: colors.success }} />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" style={{ color: colors.accent }} />
                          )}
                          <span style={{ color: colors.textSecondary }}>{perm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Permission examples for RBAC display
const PERMISSION_EXAMPLES: Record<string, string[]> = {
  owner: ['* (Full Access)', 'billing:manage', 'users:manage', 'company:manage'],
  admin: ['users:manage', 'projects:manage', 'workspaces:manage', 'settings:manage'],
  manager: ['project:manage', 'modules:manage', 'schemas:manage', 'team:manage'],
  developer: ['modules:manage', 'schemas:manage', 'blueprints:create', 'exports:create'],
  viewer: ['project:read', 'modules:read', 'schemas:read', 'blueprints:read']
}
