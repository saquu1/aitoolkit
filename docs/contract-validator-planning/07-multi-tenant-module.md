# 🏢 Multi-Tenant Module Documentation

## Overview

The **Multi-Tenant Module** provides enterprise-grade multi-tenancy with company/tenant management, workspace organization, project management, role-based access control (RBAC), and subscription tier management.

---

## 📁 File Structure

```
src/
├── components/tabs/
│   └── MultiTenantTab.tsx           # Main UI component
├── app/architecture/multi-tenant/
│   └── page.tsx                     # Page wrapper
├── app/api/
│   ├── multi-tenant/
│   │   └── route.ts                 # Main API router (1200+ lines)
│   └── tenant/
│       ├── context/route.ts         # Tenant context extraction
│       ├── companies/route.ts       # Company CRUD API
│       ├── projects/route.ts        # Project management API
│       ├── workspaces/route.ts      # Workspace management API
│       └── switch-company/route.ts  # Company switching API
├── lib/
│   ├── multi-tenant.ts              # Core types, RBAC engine, tiers (724 lines)
│   ├── tenant-types.ts              # Type definitions (255 lines)
│   ├── tenant-context.ts            # Server-side tenant context
│   ├── tenant-context.tsx           # React context provider
│   ├── tenant-db.ts                 # Database service classes (1195 lines)
│   └── multi-tenant-schema.ts       # Prisma schema definitions
```

---

## 🎯 Main Functionality

### Core Capabilities

| Feature | Description |
|---------|-------------|
| Company Management | Create, update, and manage companies (tenants) |
| Workspace Organization | Group projects within companies |
| Project Management | Create and manage projects |
| Role-Based Access Control | Hierarchical permissions system |
| Subscription Tiers | Free, Starter, Professional, Enterprise plans |
| User Membership | Add/remove users from companies and projects |
| API Key Management | Generate and manage API keys per company |
| Invitation System | Invite users to companies/projects |
| Audit Logging | Track all important actions |

---

## 🏗️ Multi-Tenancy Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        COMPANY (Tenant)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Subscription: Professional                                 │  │
│  │ Limits: 50 Projects | 100 Users | 500 Tables | 10000 API  │  │
│  │ Usage: 23 Projects | 45 Users | 234 Tables | 4567 API     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│        ┌──────────┐   ┌──────────┐   ┌──────────┐              │
│        │Workspace │   │Workspace │   │Workspace │              │
│        │ "HIS"    │   │ "ERP"    │   │ "CRM"    │              │
│        └────┬─────┘   └────┬─────┘   └────┬─────┘              │
│             │              │              │                      │
│        ┌────┴────┐    ┌────┴────┐    ┌────┴────┐               │
│        │Project  │    │Project  │    │Project  │               │
│        │HIS-Core │    │ERP-Fin  │    │CRM-Sales│               │
│        └─────────┘    └─────────┘    └─────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Hierarchy

1. **Company** → Top-level tenant with subscription and limits
2. **Workspace** → Optional grouping within company
3. **Project** → Actual software project with schema/artifacts

---

## 🔐 Tenant Isolation Approach

### Data Isolation Strategy: Shared Database with `companyId` Column

All data is filtered by `companyId`:

```typescript
// From tenant-context.ts
export function withTenantFilter<T extends { companyId?: string }>(
  context: TenantContext,
  query: T
): T & { companyId: string } {
  return {
    ...query,
    companyId: context.companyId
  }
}
```

### Access Control Layers

#### Company-Level Roles

| Role | Level | Permissions |
|------|-------|-------------|
| `owner` | 100 | Full access, billing management, delete company |
| `admin` | 80 | User/project management, invite users |
| `member` | 50 | Basic access, view projects |

#### Project-Level Roles

| Role | Level | Permissions |
|------|-------|-------------|
| `manager` | 70 | Full project management, edit schemas |
| `developer` | 50 | Edit modules/schemas, view code |
| `viewer` | 20 | Read-only access |

#### Permission System

```typescript
// Resource:Action format
"company:*"        // Full company access
"users:*"          // Full user management
"projects:*"       // Full project management
"billing:*"        // Billing management
"project:read"     // Read project
"modules:manage"   // Manage modules
"schemas:manage"   // Manage schemas
```

---

## 📊 Data Structures

### Company Model

```prisma
model Company {
  id                   String   @id
  name                 String
  slug                 String   @unique
  subscriptionTier     String   @default("free")
  subscriptionStatus   String   @default("trialing")
  settings             String   @default("{}")  // JSON
  limits               String   @default("{}")  // JSON
  usage                String   @default("{}")  // JSON
  isActive             Boolean  @default(true)
  
  // Relations
  workspaces           Workspace[]
  users                UserCompany[]
  projects             Project[]
  apiKeys              APIKey[]
}
```

### Subscription Tier Limits

```typescript
interface TenantLimits {
  maxProjects: number;      // -1 = unlimited
  maxUsers: number;
  maxTables: number;
  maxModules: number;
  maxExports: number;
  maxApiCalls: number;
  maxStorage: number;       // MB
}

// Default limits by tier
const TIER_LIMITS = {
  free: {
    maxProjects: 3,
    maxUsers: 5,
    maxTables: 50,
    maxModules: 10,
    maxExports: 10,
    maxApiCalls: 1000,
    maxStorage: 100
  },
  starter: {
    maxProjects: 10,
    maxUsers: 20,
    maxTables: 200,
    maxModules: 50,
    maxExports: 50,
    maxApiCalls: 10000,
    maxStorage: 1000
  },
  professional: {
    maxProjects: 50,
    maxUsers: 100,
    maxTables: 500,
    maxModules: 200,
    maxExports: 200,
    maxApiCalls: 100000,
    maxStorage: 10000
  },
  enterprise: {
    maxProjects: -1,  // unlimited
    maxUsers: -1,
    maxTables: -1,
    maxModules: -1,
    maxExports: -1,
    maxApiCalls: -1,
    maxStorage: -1
  }
}
```

### Tenant Context

```typescript
interface TenantContext {
  userId: string;
  email: string;
  name?: string | null;
  role: "owner" | "admin" | "member";
  companyId: string;
  company: {
    id: string;
    name: string;
    slug: string;
    subscriptionTier: string;
    subscriptionStatus: string;
    isActive: boolean;
  };
  permissions: string[];
}
```

---

## 🖥️ UI Components

### MultiTenantTab Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ OVERVIEW TAB                                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Company: Healthcare Solutions Inc.                          │ │
│ │ Tier: Professional | Status: Active                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ USAGE CARDS                                                     │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│ │ Projects   │ │ Users      │ │ Tables     │ │ Storage    │    │
│ │ 23/50      │ │ 45/100     │ │ 234/500    │ │ 4.5/10 GB  │    │
│ │ ████████░░ │ │ █████████░ │ │ ████████░░ │ │ █████░░░░░ │    │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│ SUBSCRIPTION TAB                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Current Plan: Professional                                  │ │
│ │                                                             │ │
│ │ [Free] [Starter] [Professional ✓] [Enterprise]             │ │
│ │                                                             │ │
│ │ Features:                                                   │ │
│ │ ✓ 50 Projects     ✓ 100 Users      ✓ 500 Tables            │ │
│ │ ✓ Priority Support ✓ API Access    ✓ Custom Branding       │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ USERS TAB                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ User              Email               Role        Status    │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ John Smith        john@example.com    Owner       Active   │ │
│ │ Jane Doe          jane@example.com    Admin       Active   │ │
│ │ Bob Wilson        bob@example.com     Member      Pending  │ │
│ │                                                             │ │
│ │ [+ Invite User]                                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ RBAC TAB                                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ROLE DEFINITIONS                                            │ │
│ │                                                             │ │
│ │ ▼ Owner (Level 100)                                        │ │
│ │   Permissions: company:*, users:*, projects:*, billing:*   │ │
│ │                                                             │ │
│ │ ▼ Admin (Level 80)                                         │ │
│ │   Permissions: users:read, users:write, projects:*         │ │
│ │                                                             │ │
│ │ ▼ Member (Level 50)                                        │ │
│ │   Permissions: projects:read, modules:read                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### Main Multi-Tenant API (`/api/multi-tenant`)

| Action | Method | Description |
|--------|--------|-------------|
| `create-company` | POST | Create new company with owner |
| `get-company` | GET/POST | Get company by ID |
| `update-company` | POST | Update company details |
| `get-user-companies` | GET/POST | Get all companies for user |
| `create-workspace` | POST | Create workspace in company |
| `get-company-workspaces` | GET/POST | List company workspaces |
| `create-project` | POST | Create project with limit checks |
| `get-company-projects` | GET/POST | List company projects |
| `add-user-to-company` | POST | Add user with role |
| `remove-user-from-company` | POST | Remove user membership |
| `add-user-to-project` | POST | Assign user to project |
| `create-api-key` | POST | Generate API key |
| `create-invitation` | POST | Create invitation token |
| `accept-invitation` | POST | Accept invitation |
| `get-audit-logs` | GET/POST | Get company audit logs |
| `get-subscription-tiers` | GET | List available tiers |

### Tenant Context API (`/api/tenant/context`)
- Returns current user's companies, workspaces, projects, and roles

### Companies API (`/api/tenant/companies`)
- POST: Create new company

### Projects API (`/api/tenant/projects`)
- GET: List projects (with workspace/company filter)
- POST: Create new project

---

## 🛠️ Key Services

### CompanyService

```typescript
class CompanyService {
  // Creates company with owner and default workspace
  async createCompany(data: CreateCompanyData): Promise<Company>
  
  // Update subscription tier/limits
  async updateSubscription(companyId: string, tier: string): Promise<Company>
  
  // Track usage metrics
  async updateUsage(companyId: string, usage: Partial<UsageMetrics>): Promise<void>
}
```

### ProjectService

```typescript
class ProjectService {
  // Create project with limit enforcement
  async createProject(data: CreateProjectData): Promise<Project>
  
  // Track table/column counts
  async updateStatistics(projectId: string, stats: ProjectStats): Promise<void>
}
```

### UserCompanyService / UserProjectService

```typescript
// Membership management with limit checks
async addUserToCompany(data: AddUserToCompanyData): Promise<UserCompany>
async removeUserFromCompany(companyId: string, userId: string): Promise<void>
```

### APIKeyService

```typescript
class APIKeyService {
  // Generate secure API keys with SHA256 hashing
  async createAPIKey(companyId: string, name: string): Promise<{ key: string, hash: string }>
  
  // Validate and track usage
  async validateAPIKey(key: string): Promise<APIKey | null>
}
```

### InvitationService

```typescript
class InvitationService {
  // Token-based invitations with 7-day expiry
  async createInvitation(data: CreateInvitationData): Promise<Invitation>
  async acceptInvitation(token: string, userId: string): Promise<void>
}
```

### RBACEngine

```typescript
class RBACEngine {
  // Check user permissions
  hasPermission(userRole: string, permission: string): boolean
  
  // Project access verification
  canAccessProject(userId: string, projectId: string): Promise<boolean>
  
  // Get all permissions for role
  getRolePermissions(role: string): string[]
}
```

---

## 💳 Subscription Tiers

| Tier | Price | Projects | Users | Tables | API Calls | Storage |
|------|-------|----------|-------|--------|-----------|---------|
| Free | $0 | 3 | 5 | 50 | 1,000 | 100 MB |
| Starter | $29/mo | 10 | 20 | 200 | 10,000 | 1 GB |
| Professional | $99/mo | 50 | 100 | 500 | 100,000 | 10 GB |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |

---

## 📝 Summary

This is a **comprehensive multi-tenant architecture** with:

- **4 subscription tiers** with configurable limits
- **3 company roles** + **3 project roles**
- **Complete user membership** and invitation flow
- **API key management** for programmatic access
- **Audit logging** for compliance
- **React context** for client-side state management
- **Server-side context extraction** for API security

---

*Document created: 2026-03-27*
