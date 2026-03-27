# 🔄 Pipeline Module Documentation

## Overview

The **Pipeline Module** is a sophisticated multi-agent orchestration system that executes 26 specialized agents across 5 layers to analyze, enrich, and generate code from database schemas.

---

## 📁 File Structure

```
src/
├── agents/core/
│   ├── pipeline.ts              # Main Pipeline Execution Engine
│   ├── types.ts                 # Type definitions for agents/pipelines
│   ├── index.ts                 # Module exports
│   ├── orchestrator.ts          # Higher-level orchestration
│   ├── context.ts               # Shared context management
│   ├── registry.ts              # Agent registration/discovery
│   └── agent-interface.ts       # Agent interface definitions
├── components/tabs/
│   └── PipelineTab.tsx          # Main Pipeline UI
├── app/api/pipeline/
│   └── route.ts                 # Pipeline API endpoint
├── app/generation/pipeline/
│   └── page.tsx                 # Pipeline page wrapper
└── lib/intelligence-bank/
    └── enrichment-pipeline.ts   # 12-Step Enrichment Pipeline
```

---

## 🎯 Main Functionality

The Pipeline module serves **three distinct purposes**:

### 1. Agent Pipeline (`/src/agents/core/pipeline.ts`)
An execution engine that orchestrates multiple AI agents in sequence or parallel with:
- Error handling and retries
- Progress reporting
- Pause/resume/cancel capabilities
- Event-driven architecture

### 2. Code Generation Pipeline (`/src/app/api/pipeline/route.ts`)
A 4-stage end-to-end pipeline:
- **Stage 1: Parsing** - SQL DDL, Stored Procedures, CSHTML Views
- **Stage 2: Intelligence** - Validation rules, index recommendations
- **Stage 3: Code Generation** - Prisma, TypeScript, API routes, React components
- **Stage 4: Export** - File preparation and statistics

### 3. Enrichment Pipeline (`/src/lib/intelligence-bank/enrichment-pipeline.ts`)
A 12-step enrichment process for unified field records.

---

## 🔄 Pipeline Architecture

### 5 Layers, 26 Agents

```
┌─────────────────────────────────────────────────────────────────┐
│                    PIPELINE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LAYER 1: SCHEMA (5 agents)                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ schema.1 → SQL DDL Parser                                   ││
│  │ schema.2 → Stored Procedure Parser                          ││
│  │ schema.3 → View Analyzer                                    ││
│  │ schema.4 → CSHTML Parser                                    ││
│  │ schema.5 → FK Resolver                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  LAYER 2: INTELLIGENCE (5 agents)                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ intelligence.1 → Column Intelligence                        ││
│  │ intelligence.2 → PII/PHI Detection                          ││
│  │ intelligence.3 → Relationship Discovery                     ││
│  │ intelligence.4 → Business Rules Extraction                  ││
│  │ intelligence.5 → Health Scorer                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  LAYER 3: MODULE (5 agents)                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ module.1 → Module Registry                                  ││
│  │ module.2 → Auto-Linker                                      ││
│  │ module.3 → Priority Planner                                 ││
│  │ module.4 → Dependency Chain                                 ││
│  │ module.5 → Sprint Planner                                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  LAYER 4: REQUIREMENTS (5 agents)                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ requirements.1 → AI Questions                               ││
│  │ requirements.2 → User Stories                               ││
│  │ requirements.3 → Acceptance Criteria                        ││
│  │ requirements.4 → SOP Generator                              ││
│  │ requirements.5 → Traceability Matrix                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  LAYER 5: GENERATION (6 agents)                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ generation.1 → Prisma Generator                             ││
│  │ generation.2 → API Spec Generator                           ││
│  │ generation.3 → Screen Blueprint                             ││
│  │ generation.4 → Code Generator                               ││
│  │ generation.5 → Test Case Generator                          ││
│  │ generation.6 → Documentation Generator                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Predefined Pipeline Presets

| Preset | Agents | Duration | Purpose |
|--------|--------|----------|---------|
| Quick Scan | 4 agents | ~2 min | Fast schema analysis |
| Full Analysis | 26 agents | ~15 min | Complete codebase analysis |
| Migration Planning | 14 agents | ~8 min | Schema + Intelligence + Migration |

```typescript
// Quick Scan - 4 agents (~2 min)
['schema.1', 'schema.5', 'intelligence.1', 'intelligence.5']

// Full Analysis - 26 agents (~15 min)
[All 5 layers]

// Migration Planning - 14 agents
[Schema + Intelligence + Migration layers]
```

---

## 📊 Data Structures

### Pipeline Configuration

```typescript
interface PipelineConfig {
  id: string;
  name: string;
  description: string;
  agents: AgentId[];
  mode: 'sequential' | 'parallel' | 'conditional';
  aiConfig: AIConfig;
  stopOnError: boolean;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  timeout: number;
  outputDir: string;
}
```

### Pipeline Result

```typescript
interface PipelineResult {
  executionId: string;
  pipelineId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: PipelineStatus;
  agentResults: AgentExecutionResult[];
  errors: PipelineError[];
  outputFiles: string[];
  summary: {
    totalAgents: number;
    completedAgents: number;
    failedAgents: number;
    skippedAgents: number;
    totalItemsProcessed: number;
  };
}
```

### Pipeline Status Types

```typescript
type PipelineStatus = 
  | 'idle'         // Not started
  | 'initializing' // Setting up
  | 'running'      // Executing agents
  | 'paused'       // User paused
  | 'completed'    // All agents done
  | 'failed'       // Error occurred
  | 'cancelled';   // User cancelled
```

### Agent Status Types

```typescript
type AgentStatus = 
  | 'pending'    // Not yet started
  | 'running'    // Currently executing
  | 'completed'  // Successfully finished
  | 'failed'     // Execution failed
  | 'skipped';   // Skipped due to conditions
```

---

## 🖥️ UI Components

### PipelineTab Features

```
┌─────────────────────────────────────────────────────────────────┐
│ PROGRESS CARD                                                    │
│ ████████████████░░░░░░░░ 67%                                    │
│ Agents: 17/26 | Time: 8m 23s | Status: Running                  │
├─────────────────────────────────────────────────────────────────┤
│ QUICK PIPELINE CARDS                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                          │
│ │ Quick    │ │ Full     │ │ Migration│                          │
│ │ Scan     │ │ Analysis │ │ Planning │                          │
│ │ ~2 min   │ │ ~15 min  │ │ ~8 min   │                          │
│ └──────────┘ └──────────┘ └──────────┘                          │
├─────────────────────────────────────────────────────────────────┤
│ AGENT STATUS GRID (by Layer)                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ SCHEMA LAYER                                                 │ │
│ │ ✓ schema.1 ✓ schema.2 ✓ schema.3 ✓ schema.4 ✓ schema.5     │ │
│ │                                                             │ │
│ │ INTELLIGENCE LAYER                                          │ │
│ │ ✓ intel.1 ✓ intel.2 ◷ intel.3 ○ intel.4 ○ intel.5          │ │
│ │                                                             │ │
│ │ MODULE LAYER                                                │ │
│ │ ○ module.1 ○ module.2 ○ module.3 ○ module.4 ○ module.5      │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ EXECUTION LOGS                                                   │
│ [10:23:45] ✓ schema.1 completed - Parsed 45 tables              │
│ [10:24:12] ✓ schema.5 completed - Resolved 67 FKs               │
│ [10:25:03] ◷ intel.3 running - Discovering relationships...     │
├─────────────────────────────────────────────────────────────────┤
│ CONTROLS                                                         │
│ [▶ Run] [⏸ Pause] [⏹ Stop] [↺ Reset]                           │
└─────────────────────────────────────────────────────────────────┘
```

**Legend:**
- ✓ = Completed
- ◷ = Running
- ○ = Pending
- ✗ = Failed

---

## 🔌 API Endpoints

### `/api/pipeline` (POST)

**Request:**
```typescript
interface PipelineRequest {
  files: {
    name: string;
    content: string;
    type: 'sql_ddl' | 'sql_sp' | 'razor_view' | 'javascript' | 'auto';
  }[];
  options?: {
    generatePrisma?: boolean;
    generateTypes?: boolean;
    generateZod?: boolean;
    generateAPI?: boolean;
    generateForm?: boolean;
    generateTable?: boolean;
    generatePages?: boolean;
    targetFramework?: 'nextjs' | 'nestjs' | 'express';
  };
}
```

**Response:**
```typescript
interface PipelineResult {
  success: boolean;
  parsing: {
    tables: ParsedTable[];
    storedProcedures: ParsedSP[];
    views: ParsedView[];
    statistics: { ... };
  };
  intelligence: {
    statistics: { ... };
  };
  generation: {
    prisma: string;
    typescript: string[];
    api: string[];
    components: string[];
  };
  export: {
    files: string[];
    statistics: { ... };
  };
  errors: string[];
  warnings: string[];
}
```

---

## 💾 Database Models

| Model | Purpose |
|-------|---------|
| `PipelineExecution` | Tracks pipeline runs |
| `AgentExecution` | Tracks individual agent executions |
| `AgentDefinition` | Registered agent metadata |
| `AgentLog` | Agent execution logs |
| `AgentRun` | Individual agent run records |
| `AgentMessage` | Inter-agent messages |
| `UnifiedEnrichmentSession` | Enrichment pipeline sessions |
| `UnifiedEnrichmentLog` | Enrichment step logs |
| `UnifiedFieldRecord` | Enriched field records |
| `UnifiedSOPRule` | SOP rule definitions |
| `ConsistencyCheckResult` | Consistency validation results |

---

## 🚀 Execution Modes

### Sequential Mode
Agents run one after another:
```
Agent1 → Agent2 → Agent3 → Agent4 → ...
```

### Parallel Mode
Multiple agents run simultaneously:
```
┌─ Agent1 ─┐
├─ Agent2 ─┤ → Result
├─ Agent3 ─┤
└─ Agent4 ─┘
```

### Conditional Mode
Agents run based on conditions:
```
Agent1 → if (condition) → Agent2
                       → else → Agent3
```

---

## 📝 Key Exports

```typescript
// Pipeline Classes
export { PipelineExecutor, PipelineBuilder };
export { createFullAnalysisPipeline, createQuickScanPipeline, createMigrationPlanningPipeline };
export { createPipelineExecutor, createPipelineBuilder, runPipeline };

// Types
export type { PipelineConfig, PipelineResult, PipelineStatus, PipelineEvents, PipelineProgress };
export type { AgentId, AgentMetadata, AgentStatus, AgentExecutionResult };
```

---

## 🔧 12-Step Enrichment Pipeline

For the Intelligence Bank integration:

| Step | Agent | Purpose |
|------|-------|---------|
| 1 | CSHTML Parser | Creates initial records from views |
| 2 | Schema Matcher | Matches to database schema |
| 3 | FK Resolver | Resolves foreign key relationships |
| 4 | Column Intelligence | Semantic analysis |
| 5 | Compliance Scanner | PII/PHI detection |
| 6 | Validation Merger | Merges client/server validation |
| 7 | UI Component Enrichment | Enhanced UI mapping |
| 8 | SOP Compliance Check | Apply SOP rules |
| 9 | Complexity Calculator | Calculate field complexity |
| 10 | Test Case Generator | Generate test cases |
| 11 | Documentation Generator | Create documentation |
| 12 | Consistency Validator | Final cross-check |

---

*Document created: 2026-03-27*
