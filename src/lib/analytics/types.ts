/**
 * AI CHAT ANALYTICS - COMPREHENSIVE TYPES
 * =======================================
 * All type definitions for the AI Chat Analytics Dashboard
 */

// =============================================================================
// TIER 1: EXTRACTION TYPES
// =============================================================================

export type BlockType = 'reasoning' | 'text' | 'tool_calls'
export type ToolName = 'bash' | 'write' | 'read' | 'edit' | 'todo_write' | 'other'
export type FileOpType = 'created' | 'modified' | 'read' | 'deleted'
export type FileCategory = 'api_route' | 'page' | 'component' | 'service' | 'hook' | 'utility' | 'type_definition' | 'config' | 'test' | 'schema' | 'style' | 'other'
export type SessionType = 'bug_fix' | 'feature' | 'refactor' | 'architecture' | 'documentation' | 'testing' | 'deployment' | 'investigation' | 'unknown'
export type IssueStatus = 'detected' | 'in_progress' | 'resolved' | 'wont_fix' | 'recurring'
export type PatternStatus = 'active' | 'monitoring' | 'resolved' | 'archived'

// Content Block
export interface ContentBlock {
  id: string
  sessionId: string
  blockType: BlockType
  content: string
  startTime: Date
  endTime?: Date
  duration?: number
  
  // Timing per block
  timingMetrics: {
    processingTime: number
    idleTime: number
    gapFromPrevious: number
  }
  
  // Error/backtrack flags
  flags: {
    hasError: boolean
    hasBacktrack: boolean
    backtrackedFrom?: string
    errorType?: string
    retryCount: number
  }
  
  // Keyword extraction
  keywords: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  
  // For tool calls
  toolCalls?: ToolCallRecord[]
  
  createdAt: Date
}

export interface ToolCallRecord {
  id: string
  blockId: string
  toolName: ToolName
  input: Record<string, any>
  output?: string
  success: boolean
  duration?: number
  fileOperations?: FileOperation[]
}

export interface FileOperation {
  filePath: string
  operation: FileOpType
  category: FileCategory
  linesAdded: number
  linesRemoved: number
  timestamp: Date
}

// Reasoning Block Analysis
export interface ReasoningAnalysis {
  id: string
  blockId: string
  sessionId: string
  
  // Error recognition
  errors: ErrorRecord[]
  errorPatterns: string[]
  
  // Strategy decisions
  strategies: StrategyDecision[]
  
  // Backtracking detection
  backtracks: BacktrackRecord[]
  
  // Reasoning quality
  qualityMetrics: {
    coherenceScore: number
    decisionClarity: number
    errorRecoveryRate: number
    strategyEffectiveness: number
  }
  
  createdAt: Date
}

export interface ErrorRecord {
  type: string
  message: string
  stackTrace?: string
  detectedAt: Date
  resolvedAt?: Date
  resolutionStrategy?: string
}

export interface StrategyDecision {
  id: string
  type: 'approach' | 'tool_selection' | 'file_selection' | 'solution_design'
  description: string
  reasoning: string
  outcome: 'success' | 'partial' | 'failed'
  confidence: number
}

export interface BacktrackRecord {
  id: string
  fromPath: string
  toPath: string
  reason: string
  stepsLost: number
  timestamp: Date
}

// Thread Reconstruction
export interface ThreadReconstruction {
  id: string
  sessionId: string
  
  // Visual thread tree
  tree: ThreadNode
  
  // Topic evolution
  topics: TopicEvolution[]
  
  // Message flow
  messageFlow: MessageFlowNode[]
  
  // Key decisions
  keyDecisions: DecisionPoint[]
  
  createdAt: Date
}

export interface ThreadNode {
  id: string
  type: 'user' | 'assistant' | 'tool' | 'reasoning' | 'error'
  content: string
  timestamp: Date
  children: ThreadNode[]
  metadata?: Record<string, any>
}

export interface TopicEvolution {
  topic: string
  startMessageIndex: number
  endMessageIndex?: number
  keywords: string[]
  relatedFiles: string[]
  outcomes: string[]
}

export interface MessageFlowNode {
  id: string
  messageIndex: number
  type: string
  summary: string
  duration: number
  transitions: string[]
}

export interface DecisionPoint {
  id: string
  messageIndex: number
  decision: string
  alternatives: string[]
  outcome: string
  impact: 'high' | 'medium' | 'low'
}

// Timing Chain
export interface TimingChain {
  id: string
  sessionId: string
  
  // Timing breakdown
  stages: TimingStage[]
  
  // Gap detection
  gaps: TimingGap[]
  
  // Idle time calculation
  idlePeriods: IdlePeriod[]
  
  // Overall metrics
  totalDuration: number
  activeTime: number
  idleTime: number
  efficiency: number
  
  createdAt: Date
}

export interface TimingStage {
  name: string
  startTime: Date
  endTime: Date
  duration: number
  percentage: number
}

export interface TimingGap {
  afterStage: string
  beforeStage: string
  duration: number
  reason?: string
}

export interface IdlePeriod {
  startTime: Date
  endTime: Date
  duration: number
  type: 'waiting' | 'processing' | 'unknown'
}

// =============================================================================
// TIER 2: INTELLIGENCE TYPES
// =============================================================================

// Issue Recurrence
export interface IssueRecurrence {
  id: string
  patternId: string
  
  // Pattern identification
  issueType: string
  title: string
  signature: string
  
  // Auto-linking
  linkedIssues: string[]
  linkedSessions: string[]
  
  // Cumulative cost
  totalOccurrences: number
  totalTokens: number
  totalCost: number
  totalDuration: number
  
  // Trend
  trend: 'increasing' | 'stable' | 'decreasing'
  lastOccurrence: Date
  
  // Prevention
  preventionRule?: string
  preventionEffectiveness?: number
  
  createdAt: Date
  updatedAt: Date
}

// Cost Optimization
export interface CostAnalysis {
  id: string
  sessionId?: string
  dateRange?: { start: Date; end: Date }
  
  // Cache hit rate
  cacheStats: {
    totalRequests: number
    cacheHits: number
    cacheMisses: number
    hitRate: number
    estimatedSavings: number
  }
  
  // Waste analysis
  wasteAnalysis: {
    duplicateCalls: number
    unnecessaryRedos: number
    inefficientPatterns: string[]
    wastedTokens: number
    wastedCost: number
  }
  
  // Savings projection
  savingsProjection: {
    potentialSavings: number
    recommendations: CostRecommendation[]
    projectedMonthly: number
    projectedYearly: number
  }
  
  // Model efficiency
  modelEfficiency: ModelEfficiencyRecord[]
  
  createdAt: Date
}

export interface CostRecommendation {
  id: string
  type: 'cache' | 'model_switch' | 'pattern_optimization' | 'batch_processing'
  description: string
  potentialSavings: number
  effort: 'low' | 'medium' | 'high'
  priority: number
}

export interface ModelEfficiencyRecord {
  model: string
  sessions: number
  avgCostPerFeature: number
  avgTokensPerFeature: number
  efficiency: number
  recommendation: string
}

// Pattern Library
export interface PatternLibraryEntry {
  id: string
  patternId: string
  
  // Pattern info
  name: string
  type: string
  description: string
  
  // Fix templates
  fixTemplate: FixTemplate
  
  // Prevention rules
  preventionRules: PreventionRule[]
  
  // Effectiveness tracking
  stats: {
    occurrences: number
    fixesApplied: number
    successRate: number
    avgResolutionTime: number
  }
  
  // Status
  status: PatternStatus
  severity: 'low' | 'medium' | 'high' | 'critical'
  
  createdAt: Date
  updatedAt: Date
}

export interface FixTemplate {
  id: string
  name: string
  description: string
  steps: FixStep[]
  code?: string
  prerequisites: string[]
}

export interface FixStep {
  order: number
  action: string
  details: string
  validation?: string
}

export interface PreventionRule {
  id: string
  name: string
  description: string
  condition: string
  action: string
  eslintRule?: string
  isActive: boolean
}

// =============================================================================
// TIER 3: DASHBOARD TYPES
// =============================================================================

// File Change Heatmap
export interface FileHeatmapData {
  filePath: string
  category: FileCategory
  changeCount: number
  linesChanged: number
  sessionsInvolved: string[]
  issuesCount: number
  lastModified: Date
  
  // Calendar data
  dailyChanges: Record<string, number>  // date -> count
}

export interface CalendarHeatmapCell {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4  // 0 = no activity, 4 = max activity
}

// Issue Tracker (Kanban)
export interface KanbanIssue {
  id: string
  issueId: string
  title: string
  description: string
  issueType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: IssueStatus
  sessionId: string
  sessionTitle?: string
  
  // Kanban specific
  column: 'backlog' | 'detected' | 'in_progress' | 'testing' | 'resolved'
  order: number
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  
  // Related
  relatedIssues: string[]
  relatedFiles: string[]
  patterns: string[]
}

// Efficiency Trend
export interface EfficiencyTrend {
  date: string
  
  // Metrics
  tokensPerFeature: number
  costPerFeature: number
  issuesPerSession: number
  resolutionRate: number
  productivityScore: number
  
  // Rolling averages
  rollingAvg7d: {
    tokensPerFeature: number
    costPerFeature: number
    productivity: number
  }
  
  rollingAvg30d: {
    tokensPerFeature: number
    costPerFeature: number
    productivity: number
  }
}

// =============================================================================
// TIER 4: AUTOMATION TYPES
// =============================================================================

// Pattern Alert
export interface PatternAlert {
  id: string
  patternId: string
  patternName: string
  
  // Alert details
  type: 'issue_detected' | 'pattern_match' | 'cost_threshold' | 'efficiency_drop'
  severity: 'info' | 'warning' | 'critical'
  message: string
  
  // Context
  sessionId?: string
  relatedIssues: string[]
  
  // Status
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed'
  
  // Actions
  suggestedActions: string[]
  
  // Real-time import
  triggeredDuring: 'import' | 'analysis' | 'threshold'
  
  createdAt: Date
  acknowledgedAt?: Date
  resolvedAt?: Date
}

// Weekly Report
export interface WeeklyReport {
  id: string
  reportType: 'daily' | 'weekly' | 'monthly'
  periodStart: Date
  periodEnd: Date
  
  // Summary
  summary: {
    totalSessions: number
    totalTokens: number
    totalCost: number
    avgDuration: number
    issuesResolved: number
    issuesCreated: number
    featuresImplemented: number
  }
  
  // Scores
  scores: {
    efficiency: number
    resolution: number
    productivity: number
    costEfficiency: number
  }
  
  // Trends
  trends: {
    sessionsTrend: number
    costTrend: number
    issuesTrend: number
    featuresTrend: number
  }
  
  // Insights
  insights: InsightRecord[]
  
  // Patterns
  topPatterns: PatternSummary[]
  
  // Recommendations
  recommendations: RecommendationRecord[]
  
  // PDF info
  pdfGenerated: boolean
  pdfUrl?: string
  
  // Email
  emailSent: boolean
  emailSentAt?: Date
  
  createdAt: Date
}

export interface InsightRecord {
  type: 'achievement' | 'warning' | 'recommendation' | 'pattern'
  title: string
  description: string
  actionable: boolean
  action?: string
}

export interface PatternSummary {
  patternId: string
  name: string
  type: string
  occurrences: number
  trend: 'up' | 'down' | 'stable'
}

export interface RecommendationRecord {
  id: string
  priority: number
  category: 'cost' | 'efficiency' | 'quality' | 'process'
  title: string
  description: string
  impact: string
}

// Prevention Rule Generator
export interface GeneratedRule {
  id: string
  patternId: string
  patternName: string
  
  // Rule details
  ruleName: string
  ruleType: 'eslint' | 'precommit' | 'runtime' | 'documentation'
  
  // ESLint specific
  eslintConfig?: {
    rule: string
    options: Record<string, any>
    message: string
  }
  
  // Pre-commit specific
  precommitConfig?: {
    hook: string
    command: string
    files: string[]
  }
  
  // Documentation
  documentation?: string
  
  // Status
  isActive: boolean
  effectiveness: number
  lastTriggered?: Date
  triggerCount: number
  
  createdAt: Date
}

// =============================================================================
// DASHBOARD STATE TYPES
// =============================================================================

export interface AnalyticsDashboardState {
  activeTab: 'overview' | 'sessions' | 'files' | 'issues' | 'patterns' | 'reports'
  dateRange: {
    start: Date
    end: Date
  }
  filters: {
    model?: string
    category?: SessionType
    severity?: string
    status?: IssueStatus
    patternStatus?: PatternStatus
  }
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface AnalyticsOverviewData {
  // Summary cards
  summary: {
    totalSessions: number
    totalTokens: number
    totalCost: number
    totalIssues: number
    resolvedIssues: number
    totalFeatures: number
    avgEfficiency: number
  }
  
  // Distributions
  distributions: {
    byModel: Record<string, number>
    byCategory: Record<string, number>
    byIssueType: Record<string, number>
    bySeverity: Record<string, number>
  }
  
  // Trends (last 7 days)
  trends: {
    daily: Array<{
      date: string
      sessions: number
      tokens: number
      cost: number
      issues: number
      features: number
    }>
  }
  
  // Recent activity
  recentSessions: Array<{
    id: string
    title: string
    date: Date
    model: string
    category: SessionType
    tokens: number
    cost: number
    issues: number
    features: number
  }>
  
  // Active alerts
  activeAlerts: PatternAlert[]
  
  // Top patterns
  topPatterns: PatternLibraryEntry[]
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  pagination?: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}
