# 📊 Analysis Module Documentation

## Overview

The **Analysis Module** is a comprehensive AI coding session analytics system that tracks sessions, detects issues, monitors features, identifies patterns, analyzes costs, and calculates efficiency metrics.

---

## 📁 File Structure

```
src/
├── app/analytics/
│   ├── page.tsx                     # Main Analytics Dashboard
│   ├── api/page.tsx                 # API-specific analytics
│   ├── chat-log/page.tsx            # Chat log analytics
│   ├── tabs/                        # 14 tab components
│   │   ├── OverviewTab.tsx
│   │   ├── SessionsTab.tsx
│   │   ├── PatternsTab.tsx
│   │   ├── IssuesTab.tsx
│   │   ├── ContentBlocksTab.tsx
│   │   ├── ThreadReconstructorTab.tsx
│   │   ├── ReasoningTab.tsx
│   │   ├── EfficiencyTrendsTab.tsx
│   │   ├── IntelligenceDashboardTab.tsx
│   │   ├── KanbanBoardTab.tsx
│   │   ├── FileHeatmapTab.tsx
│   │   ├── ReportsTab.tsx
│   │   ├── AutomationTab.tsx
│   │   └── SessionsTab.tsx
│   └── components/
│       ├── PreSessionChecklist.tsx
│       ├── AnalyticsSettings.tsx
│       └── SessionComparisonTool.tsx
├── app/analysis/
│   ├── intelligence/page.tsx        # Intelligence analysis
│   └── chat-logs/page.tsx           # Chat logs intelligence
├── app/api/analytics/
│   ├── route.ts                     # Main analytics API
│   ├── intelligence/route.ts        # Pattern detection
│   ├── blocks/route.ts              # Content block analytics
│   ├── automation/route.ts          # Automation analytics
│   ├── data/route.ts                # Raw data endpoint
│   ├── fast/route.ts                # Fast analytics mode
│   ├── hybrid/route.ts              # Hybrid loading mode
│   ├── sync/route.ts                # Synchronous data sync
│   ├── timing/route.ts              # Timing chain analytics
│   ├── mixed/route.ts               # Mixed mode analytics
│   ├── extract-v2/route.ts          # Extraction v2
│   ├── export-pdf/route.ts          # PDF export
│   └── debug/route.ts               # Debug endpoint
├── lib/analytics/
│   ├── types.ts                     # Type definitions (689 lines)
│   ├── extraction.ts                # Content block parser
│   ├── intelligence.ts              # Issue recurrence, cost optimizer
│   ├── dashboard.ts                 # File heatmap, Kanban board
│   ├── automation.ts                # Pattern alerts, reports
│   ├── pattern-detection.ts         # Pattern detection algorithms
│   ├── git-integration.ts           # Git statistics
│   └── self-assessment.ts           # Self-assessment reports
├── components/analytics/
│   ├── overview-tab.tsx
│   ├── sessions-tab.tsx
│   ├── issues-tab.tsx
│   ├── patterns-tab.tsx
│   ├── cost-tab.tsx
│   └── api-health-tab.tsx
├── components/
│   ├── AnalyticsDashboard.tsx
│   └── chat-logs/
│       ├── ChatLogsIntelligenceDashboard.tsx
│       ├── TokenMetricsChart.tsx
│       ├── ToolCallsPanel.tsx
│       ├── FileOperationsPanel.tsx
│       ├── IssuesTrackerPanel.tsx
│       ├── FeaturesPanel.tsx
│       ├── QualityMetricsCard.tsx
│       ├── PerformanceTimeline.tsx
│       └── ErrorPatternBankPanel.tsx
└── hooks/
    ├── useAnalyticsData.ts          # Main data fetching hook
    ├── use-api-analytics.ts         # API analytics hook
    └── use-analytics.ts             # General analytics hook
```

---

## 🎯 Main Functionality

### Core Capabilities

| Feature | Description |
|---------|-------------|
| Session Tracking | Tracks AI coding sessions, tokens, costs, outcomes |
| Issue Detection | Detects and tracks issues/errors from AI sessions |
| Feature Tracking | Monitors features implemented during sessions |
| Pattern Detection | Identifies recurring patterns and anti-patterns |
| Cost Analysis | Analyzes token usage and costs with optimization |
| Efficiency Metrics | Calculates productivity and efficiency scores |

---

## 🏗️ Feature Architecture

### Tier 1: Extraction

| Feature | Description |
|---------|-------------|
| F1: Deep Content Block Parser | Parses messages into reasoning, text, tool_calls blocks |
| F3: Reasoning Block Analyzer | Extracts errors, strategies, and backtracks |
| F4: Thread Reconstructor | Builds visual thread trees and topic evolution |
| F5: Timing Chain Calculator | Calculates processing time, idle time, efficiency |

### Tier 2: Intelligence

| Feature | Description |
|---------|-------------|
| F7: Issue Recurrence Detector | Auto-links recurring issues with pattern signatures |
| F9: Cost Optimizer | Analyzes cache efficiency, waste, model efficiency |
| F10: Pattern Library | Maintains fix templates and prevention rules |

### Tier 3: Dashboard

| Feature | Description |
|---------|-------------|
| F12: File Change Heatmap | Tracks file modification patterns |
| F14: Kanban Board | Issue tracker with status columns |
| F15: Efficiency Trend Charts | Rolling averages and productivity metrics |

### Tier 4: Automation

| Feature | Description |
|---------|-------------|
| F17: Pattern Alert System | Real-time alerts for patterns and thresholds |
| F18: Weekly Self-Assessment Reports | Automated weekly summaries |
| F19: Prevention Rule Generator | Generates ESLint rules and pre-commit hooks |

---

## 📊 Data Structures

### Block Types

```typescript
type BlockType = 'reasoning' | 'text' | 'tool_calls'
type ToolName = 'bash' | 'write' | 'read' | 'edit' | 'todo_write' | 'other'
type FileOpType = 'created' | 'modified' | 'read' | 'deleted'
type SessionType = 'bug_fix' | 'feature' | 'refactor' | 'architecture' | 'documentation'
```

### ContentBlock Interface

```typescript
interface ContentBlock {
  id: string
  sessionId: string
  blockType: BlockType
  
  // Timing
  timingMetrics: {
    processingTime: number    // ms
    idleTime: number          // ms
    gapFromPrevious: number   // ms
  }
  
  // Flags
  flags: {
    hasError: boolean
    hasBacktrack: boolean
    errorType: string | null
    retryCount: number
  }
  
  // Analysis
  keywords: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  
  // Tool calls (if applicable)
  toolCalls?: ToolCallRecord[]
}
```

### IssueRecurrence Interface

```typescript
interface IssueRecurrence {
  patternId: string
  signature: string              // Unique pattern signature
  
  // Links
  linkedIssues: string[]
  linkedSessions: string[]
  
  // Metrics
  totalOccurrences: number
  totalTokens: number
  totalCost: number
  totalDuration: number          // ms
  
  // Trend
  trend: 'increasing' | 'stable' | 'decreasing'
  
  // Prevention
  preventionRule?: string
  preventionEffectiveness?: number  // 0-100%
}
```

### CostAnalysis Interface

```typescript
interface CostAnalysis {
  // Cache Statistics
  cacheStats: {
    totalRequests: number
    cacheHits: number
    hitRate: number              // percentage
    estimatedSavings: number     // dollars
  }
  
  // Waste Analysis
  wasteAnalysis: {
    duplicateCalls: number
    unnecessaryRedos: number
    inefficientPatterns: string[]
    wastedTokens: number
    wastedCost: number
  }
  
  // Savings Projection
  savingsProjection: {
    potentialSavings: number     // dollars
    recommendations: string[]
    projectedMonthly: number
    projectedYearly: number
  }
}
```

### KanbanIssue Interface

```typescript
interface KanbanIssue {
  id: string
  title: string
  description: string
  
  // Status
  column: 'backlog' | 'detected' | 'in_progress' | 'testing' | 'resolved'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: IssueStatus
  
  // Tracking
  sessionId: string
  firstDetected: string
  lastUpdated: string
  
  // Resolution
  resolution?: string
  resolvedAt?: string
  resolvedBy?: string
}
```

---

## 🖥️ UI Components

### Overview Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ SUMMARY CARDS                                                   │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│ │ Sessions   │ │ Issues     │ │ Features   │ │ Cost       │    │
│ │    234     │ │    45      │ │    67      │ │  $45.67    │    │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│ ACTIVITY TRENDS (Last 7 days)                                   │
│ ██████████████████████████████████████████████████████████████  │
│                                                                 │
│ DISTRIBUTION                                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Session Types:                                              │ │
│ │ ████████████ Bug Fix (45%)                                  │ │
│ │ ████████ Feature (30%)                                      │ │
│ │ ████ Refactor (15%)                                         │ │
│ │ ██ Other (10%)                                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Thread Reconstructor Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ THREAD TREE                                                     │
│                                                                 │
│ Session: bug-fix-auth-error-2026-03-27                         │
│ └───┬── User Request: Fix auth error in login                  │
│     │                                                          │
│     ├───┬── Reasoning: Analyzing auth flow                     │
│     │   └── Tool: Read auth.ts                                 │
│     │                                                          │
│     ├───┬── Reasoning: Found issue - token expiry              │
│     │   └── Tool: Edit auth.ts                                 │
│     │                                                          │
│     └───┬── Reasoning: Testing fix                             │
│         └── Tool: Bash - npm test                              │
│             └── ✓ Tests passed                                 │
│                                                                 │
│ TOPIC EVOLUTION                                                 │
│ Login → Auth Token → JWT Expiry → Fix Applied                  │
└─────────────────────────────────────────────────────────────────┘
```

### File Heatmap Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ FILE CHANGE HEATMAP                                             │
│                                                                 │
│           Mon Tue Wed Thu Fri Sat Sun                           │
│ auth.ts    ██  ██  █   █   ██  █   █                           │
│ api/route  █   ██  ██  ██  █   █   █                           │
│ components █   █   █   ██  ██  ██  █                           │
│ hooks      █   █   █   █   █   █   █                           │
│                                                                 │
│ HEAT: ██ High (5+ changes) | █ Medium (2-4) | ░ Low (0-1)      │
├─────────────────────────────────────────────────────────────────┤
│ MOST MODIFIED FILES                                             │
│ 1. src/lib/auth.ts (23 changes)                                │
│ 2. src/app/api/projects/route.ts (18 changes)                  │
│ 3. src/components/tabs/Dashboard.tsx (15 changes)              │
└─────────────────────────────────────────────────────────────────┘
```

### Kanban Board Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ KANBAN BOARD                                                    │
├──────────────┬──────────────┬──────────────┬──────────────┬────┤
│   BACKLOG    │   DETECTED   │  IN PROGRESS │   RESOLVED   │    │
│    (5)       │     (3)      │      (4)     │     (23)     │    │
├──────────────┼──────────────┼──────────────┼──────────────┼────┤
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │    │
│ │ Auth     │ │ │ API 500  │ │ │ Fix FK   │ │ │ Token    │ │    │
│ │ timeout  │ │ │ error    │ │ │ error    │ │ │ refresh  │ │    │
│ │ Low      │ │ │ Critical │ │ │ High     │ │ │ Medium   │ │    │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │    │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │    │
│ │ Add      │ │ │ Enum     │ │ │ Update   │ │ │ Session  │ │    │
│ │ logging  │ │ │ mismatch │ │ │ schema   │ │ │ handling │ │    │
│ │ Medium   │ │ │ High     │ │ │ Medium   │ │ │ Low      │ │    │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │    │
└──────────────┴──────────────┴──────────────┴──────────────┴────┘
```

---

## 🔌 API Endpoints

### `/api/analytics`

| Action | Description |
|--------|-------------|
| `overview` | Summary statistics |
| `sessions` | List of sessions |
| `session-details` | Detailed session info |
| `issues` | Issue tracking |
| `features` | Feature implementation tracking |
| `patterns` | Pattern library |
| `cost-analysis` | Cost and optimization data |
| `dashboard` | Combined dashboard data |
| `recurrence-matrix` | Issue recurrence patterns |
| `efficiency-metrics` | Productivity metrics |
| `file-heatmap` | File modification heatmap |
| `calendar-heatmap` | Calendar view of activity |
| `kanban-board` | Kanban board data |

### `/api/analytics/intelligence`

| Action | Description |
|--------|-------------|
| `patterns` | Detected patterns |
| `warnings` | Warning alerts |
| `predict` | Predictive analysis |
| `reports` | Generated reports |
| `git-stats` | Git integration stats |
| `git-analysis` | Detailed git analysis |
| `intelligence-overview` | Combined intelligence view |
| `recurrences` | Issue recurrences |
| `cost-analysis` | Cost optimization |
| `pattern-risks` | Risk assessment |
| `workflow-intelligence` | Workflow analysis |

---

## ⚡ Performance Features

### Three Loading Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `fast` | Quick summary data | Initial load |
| `heavy` | Full calculations | Detailed analysis |
| `mixed` | Fast first, heavy later | Progressive enhancement |

### Client-Side Caching

```typescript
// 30-second TTL for tab data
const CACHE_TTL = 30000

// Caching in useAnalyticsData hook
const cachedData = useRef<Map<string, { data: any, timestamp: number }>>(new Map())
```

### Parallel Fetching

```typescript
// Multiple endpoints fetched concurrently
const [overview, sessions, patterns] = await Promise.all([
  fetch('/api/analytics?action=overview'),
  fetch('/api/analytics?action=sessions'),
  fetch('/api/analytics?action=patterns')
])
```

---

## 💾 Database Models

| Model | Purpose |
|-------|---------|
| `AISession` | Session tracking with tokens, cost, duration |
| `AIIssue` | Issue tracking with severity, status, recurrence |
| `AIFeature` | Feature implementation tracking |
| `AIPattern` | Pattern library with recommendations |
| `AICostRecord` | Cost tracking over time |
| `AIAnalyticsSummary` | Aggregated summaries for reports |
| `AIGitCommit` | Git integration data |
| `ChatLog` | Raw chat log storage |

---

## 📝 Key Metrics Tracked

| Category | Metrics |
|----------|---------|
| **Session** | Duration, tokens, cost, category, outcome |
| **Issues** | Count, severity, resolution time, recurrence |
| **Features** | Implemented, complexity, time spent |
| **Cost** | Total spent, cache savings, waste, projections |
| **Efficiency** | Lines per minute, error rate, backtrack rate |
| **Files** | Changes per file, hotspot detection |

---

*Document created: 2026-03-27*
