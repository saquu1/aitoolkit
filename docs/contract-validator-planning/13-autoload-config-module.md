# ⚙️ Autoload Config Module Documentation

## Overview

The **Autoload Config Module** provides centralized control for managing automatic data fetching behavior across all pages in the application. It prevents database overload and improves stability by allowing granular control over which pages auto-fetch data on load.

---

## 📁 File Structure

```
src/
├── components/
│   ├── AutoloadToggle.tsx           # Toggle button component
│   └── tabs/
│       └── AutoloadRegistryTab.tsx  # Admin panel
├── app/api/autoload/
│   └── route.ts                     # REST API for CRUD
├── hooks/
│   └── useAutoload.ts               # React hooks
├── config/
│   └── routes.ts                    # Public route registration
└── prisma/schema.prisma             # AutoloadConfig model
```

---

## 🎯 Main Functionality

### Primary Purpose

1. **Reduce Database Load** - Prevents unnecessary database queries
2. **Improve Stability** - Prevents 502 errors and system overload
3. **Resource Management** - Enable autoload only for active pages
4. **Performance Optimization** - Pages with disabled autoload render immediately

### Key Capabilities

| Feature | Description |
|---------|-------------|
| Page-Level Control | Enable/disable autoload for individual pages |
| Category Management | Organize pages into categories for bulk actions |
| Bulk Operations | Enable/disable all or by category |
| Statistics Dashboard | Track enabled/disabled counts |
| Caching | 30-second client-side cache for states |

---

## 📊 Data Structures

### Database Model

```prisma
model AutoloadConfig {
  id            String    @id @default(cuid())
  pageKey       String    @unique    // e.g., 'dashboard', 'modules'
  pageName      String               // Human readable name
  category      String    @default("general")
  enabled       Boolean   @default(true)
  description   String?
  fetchEndpoint String?
  lastToggledAt DateTime?
  toggledBy     String?
  reason        String?
  priority      Int       @default(5)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### TypeScript Interfaces

```typescript
interface AutoloadConfig {
  id: string
  pageKey: string
  pageName: string
  category: string
  enabled: boolean
  description: string | null
  fetchEndpoint: string | null
  lastToggledAt: string | null
  toggledBy: string | null
  reason: string | null
  priority: number
}

interface AutoloadStats {
  total: number
  enabled: number
  disabled: number
  byCategory: Record<string, number>
}
```

---

## 🏷️ Page Categories

| Category | Description | Pages |
|----------|-------------|-------|
| `core` | Essential pages | Dashboard, Projects, Modules, FK Resolution, Data Dictionary, File Manager, Upload, Pipeline |
| `analytics` | Intelligence pages | Intelligence Bank, Intelligence, Project Intel, Chat Logs |
| `management` | Admin pages | API Management, Multi-Tenant, Settings, Autoload Config |
| `migration` | Migration tools | Legacy Migration |

---

## 📋 Default Page Configurations (17 Pages)

### Core Category

| Page Key | Page Name | Priority | Default |
|----------|-----------|----------|---------|
| dashboard | Dashboard | 1 | Disabled |
| projects | Projects | 2 | Disabled |
| modules | Module Registry | 3 | Disabled |
| fk-resolution | FK Resolution | 2 | Disabled |
| data-dictionary | Data Dictionary | 3 | Disabled |
| file-manager | File Manager | 3 | Disabled |
| smart-upload | Universal Upload | 3 | Disabled |
| upload | Schema Toolkit | 3 | Disabled |
| pipeline | Pipeline | 4 | Disabled |

### Analytics Category

| Page Key | Page Name | Priority | Default |
|----------|-----------|----------|---------|
| intelligence-bank | Intelligence Bank | 4 | Disabled |
| intelligence | Intelligence | 4 | Disabled |
| project-intel | Project Intelligence | 5 | Disabled |
| chat-logs | Chat Logs | 6 | Disabled |

### Management Category

| Page Key | Page Name | Priority | Default |
|----------|-----------|----------|---------|
| api-management | API Management | 7 | Disabled |
| multi-tenant | Multi-Tenant | 5 | Disabled |
| settings | Settings | 8 | Disabled |
| autoload | Autoload Config | 9 | Disabled |

### Migration Category

| Page Key | Page Name | Priority | Default |
|----------|-----------|----------|---------|
| legacy-migration | Legacy Migration | 6 | Disabled |

---

## 🖥️ UI Components

### AutoloadToggle Component

Three variants for different use cases:

```
┌─────────────────────────────────────────────────────────────────┐
│ VARIANT: switch (default)                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Auto-load data                                    [━━━━○]   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ VARIANT: button                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [🔄 Auto]                          (when enabled)           │ │
│ │ [📋 Manual]                        (when disabled)          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ VARIANT: badge                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Auto]  ← Clickable badge                                   │ │
│ │ [Manual] ← Clickable badge                                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### AutoloadRegistryTab Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ STATS OVERVIEW                                                  │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│ │ Total      │ │ Enabled    │ │ Disabled   │ │ Coverage   │    │
│ │    17      │ │     5      │ │     12     │ │    29%     │    │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│ BULK ACTIONS                                                    │
│ [Enable All] [Disable All] [Reset to Defaults]                  │
├─────────────────────────────────────────────────────────────────┤
│ CATEGORY: CORE (9 pages)                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Dashboard                              [━━━━○]    Priority 1│ │
│ │ Projects                               [━━○━━]    Priority 2│ │
│ │ Module Registry                        [━━○━━]    Priority 3│ │
│ │ FK Resolution                          [━━━━○]    Priority 2│ │
│ │ Data Dictionary                        [━━○━━]    Priority 3│ │
│ │ File Manager                           [━━○━━]    Priority 3│ │
│ │ Universal Upload                       [━━○━━]    Priority 3│ │
│ │ Schema Toolkit                          [━━○━━]    Priority 3│ │
│ │ Pipeline                               [━━○━━]    Priority 4│ │
│ │                                                             │ │
│ │ [Enable All Core] [Disable All Core]                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ CATEGORY: ANALYTICS (4 pages)                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Intelligence Bank                      [━━○━━]    Priority 4│ │
│ │ Intelligence                           [━━○━━]    Priority 4│ │
│ │ Project Intelligence                   [━━○━━]    Priority 5│ │
│ │ Chat Logs                              [━━○━━]    Priority 6│ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ PERFORMANCE TIPS                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 💡 Tips:                                                    │ │
│ │ • Disable autoload for pages you don't use often           │ │
│ │ • Enable only what you need to reduce DB load              │ │
│ │ • Lower priority pages are less critical                   │ │
│ │ • You can manually refresh data on any page                │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### `GET /api/autoload`

**Query Parameters:**
- `pageKey` - Get specific page config
- `category` - Filter by category

**Response:**
```json
{
  "config": { ... },
  "configs": [
    {
      "id": "clx...",
      "pageKey": "dashboard",
      "pageName": "Dashboard",
      "category": "core",
      "enabled": true,
      "description": "Main dashboard with statistics",
      "fetchEndpoint": "/api/dashboard",
      "priority": 1
    }
  ],
  "stats": {
    "total": 17,
    "enabled": 5,
    "disabled": 12,
    "byCategory": {
      "core": 9,
      "analytics": 4,
      "management": 4
    }
  }
}
```

### `POST /api/autoload`

**Actions:**

| Action | Request Body |
|--------|--------------|
| Single toggle | `{ pageKey, enabled?, reason? }` |
| Enable all | `{ action: 'enable-all' }` |
| Disable all | `{ action: 'disable-all' }` |
| Enable category | `{ action: 'enable-category', category }` |
| Disable category | `{ action: 'disable-category', category }` |

### `DELETE /api/autoload`

Reset all configurations to defaults.

---

## 🪝 React Hooks

### `useAutoload(pageKey)`

For individual page autoload control:

```typescript
const {
  enabled,      // Current state
  loading,      // Loading state
  config,       // Full config object
  error,        // Error message
  toggle,       // Toggle function
  enable,       // Enable function
  disable,      // Disable function (with optional reason)
  refresh       // Refresh state from server
} = useAutoload('dashboard')
```

**Usage Example:**
```tsx
function DashboardPage() {
  const { enabled, loading, toggle } = useAutoload('dashboard')
  
  useEffect(() => {
    if (enabled) {
      fetchDashboardData()
    }
  }, [enabled])
  
  return (
    <div>
      <AutoloadToggle pageKey="dashboard" showLabel />
      {/* ... */}
    </div>
  )
}
```

### `useAutoloadAll()`

For admin/settings pages managing all configs:

```typescript
const {
  configs,            // All config objects
  stats,              // Statistics
  loading,            // Loading state
  error,              // Error message
  refresh,            // Refresh all
  enableAll,          // Enable all pages
  disableAll,         // Disable all pages
  enableCategory,     // Enable by category
  disableCategory,    // Disable by category
  togglePage,         // Toggle specific page
  resetToDefaults     // Reset all to defaults
} = useAutoloadAll()
```

---

## 🔄 Client-Side Caching

```typescript
// 30-second TTL for autoload states
const CACHE_TTL = 30000

// Shared cache across all hook instances
const autoloadCache = new Map<string, {
  data: AutoloadConfig,
  timestamp: number
}>()

// Cache invalidation
function invalidateCache(pageKey?: string) {
  if (pageKey) {
    autoloadCache.delete(pageKey)
  } else {
    autoloadCache.clear()
  }
}
```

---

## 🎨 Priority System

| Priority | Meaning | Auto-load Behavior |
|----------|---------|-------------------|
| 1-3 | Critical | Should typically be enabled |
| 4-6 | Important | Enable when working on related features |
| 7-10 | Optional | Enable only when specifically needed |

---

## 🔗 Integration

### Page Integration

```tsx
// In page component
import { useAutoload } from '@/hooks/useAutoload'

export function MyPage() {
  const { enabled } = useAutoload('my-page')
  
  // Only auto-fetch if enabled
  useEffect(() => {
    if (enabled) {
      fetchData()
    }
  }, [enabled])
}
```

### Navigation Integration

```tsx
// Navigation item with autoload indicator
import { AutoloadIndicator } from '@/components/AutoloadToggle'

<NavItem>
  Dashboard <AutoloadIndicator pageKey="dashboard" />
</NavItem>
```

---

## 📝 Summary

The Autoload Config Module provides:

- ✅ 17 pages configured by default
- ✅ 4 categories for organization
- ✅ Bulk operations for efficiency
- ✅ Client-side caching (30s TTL)
- ✅ 3 UI variants (switch, button, badge)
- ✅ Full REST API
- ✅ React hooks for easy integration
- ✅ Priority system for guidance

---

*Document created: 2026-03-27*
