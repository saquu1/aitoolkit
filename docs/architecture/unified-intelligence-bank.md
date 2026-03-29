# 🏗️ Architecture Plan: Unified Intelligence Bank with Project Isolation

**Document Version:** 1.0  
**Created:** 2026-03-27  
**Status:** Implementation Ready

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED INTELLIGENCE BANK                             │
│                        (Single Global Repository)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      FILTER SYSTEM                                   │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │
│   │  │ All      │  │ Project  │  │ Project  │  │ Multi-Select     │   │   │
│   │  │ Projects │  │    A     │  │    B     │  │ A + B + C...     │   │   │
│   │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    DATA ISOLATION                                    │   │
│   │                                                                      │   │
│   │    projectId: null        projectId: "A"       projectId: "B"       │   │
│   │    ┌───────────┐         ┌───────────┐        ┌───────────┐       │   │
│   │    │  GLOBAL   │         │ PROJECT A │        │ PROJECT B │       │   │
│   │    │  (Main)   │         │  (Child)  │        │  (Child)  │       │   │
│   │    └───────────┘         └───────────┘        └───────────┘       │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │   PROMOTE    │ │   INHERIT    │ │    SHARE     │
            │  Child→Global│ │ Global→Child │ │  Cross-Project│
            └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 🔄 Data Flow Model

### 1. INHERIT (Global → Child)

```
┌─────────┐         ┌─────────┐
│ GLOBAL  │ ──────▶ │ PROJECT │   Entity definitions, patterns, rules
│ (Main)  │         │ (Child) │   Child can override inherited values
└─────────┘         └─────────┘
```

### 2. PROMOTE (Child → Global)

```
┌─────────┐         ┌─────────┐
│ PROJECT │ ──────▶ │ GLOBAL  │   Useful patterns, learned rules
│ (Child) │         │ (Main)  │   Admin approval required
└─────────┘         └─────────┘
```

### 3. SHARE (Cross-Project)

```
┌─────────┐         ┌─────────┐
│ PROJECT │ ◀─────▶ │ PROJECT │   Shared entities between projects
│    A    │         │    B    │   Explicit sharing, not automatic
└─────────┘         └─────────┘
```

### 4. ISOLATE (Project Only)

```
┌─────────┐
│ PROJECT │     Data stays in project, never flows
│    X    │     Sensitive project-specific data
└─────────┘
```

---

## ⚙️ Context-Aware Mode System

### Project Settings > Intelligence & Scope

| Setting | Global Scope Enabled | Project Scope Only |
|---------|---------------------|-------------------|
| Inherit Entities | ✓ Inherits global entity definitions | ✗ No inheritance |
| Inherit Patterns | ✓ Inherits global patterns and rules | ✗ Project-specific only |
| Can Promote | ✓ Can promote findings to global | ✗ No promotion |
| Error Patterns | ✓ Sees patterns from all projects | ✗ Project errors only |
| Intelligence | ✓ Uses global intelligence for suggestions | ✗ Isolated intelligence |

### Inheritance Behavior Options

| Entity Type | Options |
|-------------|---------|
| Entity Definitions | Inherit + Override / Isolated |
| Patterns | Inherit + Extend / Isolated |
| Rules | Inherit + Add Project Rules / Isolated |
| Error Patterns | Project Only / Global + Project |
| Contract Tests | Inherit Global Templates / Isolated |

---

## 📋 Module Behavior Matrix

| Module | Global Scope | Project Scope | Data Isolation |
|--------|--------------|---------------|----------------|
| **Intelligence Bank** | All entities + Inheritance | Project entities only | By `projectId` |
| **Error Patterns** | All projects patterns | Project errors only | By `projectId` |
| **Contract Validator** | Main APIs + Project APIs | Project APIs only | By `projectId` |
| **Chat Logs** | All sessions | Project sessions | By `projectId` |
| **Data Dictionary** | Global definitions | Project overrides | By `projectId` |
| **Module Registry** | Shared modules | Project-specific | By `projectId` |

---

## 🎛️ Filter UI Design

### Scope Selector Dropdown

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔍 Scope:  [▼ All Projects (Global View)        ]  [Settings ⚙️]          │
└─────────────────────────────────────────────────────────────────────────────┘

Dropdown Options:
┌─────────────────────────────────────────────────────────────────────────────┐
│  ○ All Projects (Global View)                                                │
│    └── Shows aggregated data across all projects                             │
│                                                                              │
│  ○ Project: HIS System (A)                                                   │
│    └── Isolated view for Project A                                           │
│                                                                              │
│  ○ Project: ERP System (B)                                                   │
│    └── Isolated view for Project B                                           │
│                                                                              │
│  ○ Multiple Projects...                                                      │
│    └── Opens multi-select dialog                                             │
│    ┌───────────────────────────────────────────────────────────────────┐    │
│    │ ☑ HIS System (A)                                                  │    │
│    │ ☑ ERP System (B)                                                  │    │
│    │ ☐ CRM System (C)                                                  │    │
│    │ ☐ Inventory System (D)                                            │    │
│    │                                         [Apply] [Cancel]           │    │
│    └───────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Benefits of This Architecture

| Benefit | Description |
|---------|-------------|
| **Single Source of Truth** | One Intelligence Bank, no duplication |
| **Flexible Scope** | Work globally or project-specific |
| **Knowledge Sharing** | Promote useful patterns to global |
| **Data Isolation** | Each project's data is separate |
| **Inheritance** | New projects inherit global intelligence |
| **Comparison** | Compare across multiple projects |

---

## 📋 Implementation Priorities

| Priority | Feature | Description |
|----------|---------|-------------|
| 1️⃣ | **Database Schema** | Update Prisma models with projectId and new tables |
| 2️⃣ | **Project Selector** | Dropdown in header for all modules |
| 3️⃣ | **Data Isolation** | Add projectId to all relevant queries |
| 4️⃣ | **Context Toggle** | Project Settings > Context Mode |
| 5️⃣ | **Inheritance System** | Global → Child data flow |
| 6️⃣ | **Promote Feature** | Child → Global data promotion |
| 7️⃣ | **Multi-Select** | Select multiple projects for comparison |

---

## 📊 Main App vs Projects Architecture

### Module Categorization

| Layer | Modules | Description |
|-------|---------|-------------|
| **Platform** | Projects, Settings, Autoload Config, Multi-Tenant, API Management | Manages projects and global config |
| **Shared Services** | Intelligence Bank, Error Patterns, Contract Validator, Chat Logs, Data Dictionary, Module Registry | Work across all projects |
| **Workspace** | File Manager, Universal Upload, Schema Toolkit, FK Resolution, Pipeline, Intelligence, Legacy Migration, Project Intelligence | Requires project selection |
| **Generation** | Pipeline, Module Registry | Code generation & export |

### Key Principles

1. **Shared Services** = Available WITHOUT selecting a project
2. **Workspace** = Requires project selection
3. **Platform** = Manages projects and global config

---

## 📝 Related Documents

- [Database Schema Plan](./database-schema-unified-intelligence.md)
- [Implementation Report](./implementation-report-unified-intelligence.md)

---

*Last Updated: 2026-03-27*
