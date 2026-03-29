/**
 * Agent Context - Shared Data Model for Pipeline Execution
 * 
 * This file defines the shared context that is passed between agents during
 * pipeline execution. It provides a centralized state management system with
 * immutability guarantees, change tracking, and event notifications.
 */

import type {
  AgentContextData,
  AIConfig,
  SourceFile,
  ParsedTable,
  ParsedStoredProcedure,
  ParsedView,
  ParsedCSHTML,
  ParsedForeignKey,
  ColumnIntelligence,
  PII_PHIDetection,
  DiscoveredRelationship,
  InferredBusinessRule,
  SchemaHealthScore,
  Module,
  SprintPlan,
  UserStory,
  SOP,
  TraceabilityEntry,
  GeneratedPrismaSchema,
  GeneratedAPISpec,
  GeneratedScreenBlueprint,
  GeneratedTestCase,
  MigrationPlan,
  EventCallback,
} from './types';

// ============================================================================
// CONTEXT CHANGE TRACKING
// ============================================================================

/**
 * Represents a change to the context
 */
export interface ContextChange {
  /** Path to the changed property (dot notation) */
  path: string;
  /** Type of change */
  type: 'set' | 'add' | 'remove' | 'update';
  /** Old value (if applicable) */
  oldValue?: unknown;
  /** New value */
  newValue: unknown;
  /** Timestamp of change */
  timestamp: Date;
  /** Agent that made the change */
  agentId?: string;
}

/**
 * Context event types
 */
export interface ContextEvents {
  'change': ContextChange;
  'bulk-change': { changes: ContextChange[] };
  'reset': { previousState: AgentContextData };
  'snapshot': { snapshotId: string; data: AgentContextData };
}

// ============================================================================
// CONTEXT SNAPSHOT
// ============================================================================

/**
 * Represents a snapshot of the context at a point in time
 */
export interface ContextSnapshot {
  /** Snapshot ID */
  id: string;
  /** Timestamp when snapshot was taken */
  timestamp: Date;
  /** Context data at this point */
  data: AgentContextData;
  /** Description of snapshot */
  description?: string;
  /** Agent that triggered snapshot */
  triggeredBy?: string;
}

// ============================================================================
// CONTEXT INTERFACE
// ============================================================================

/**
 * Interface for the agent context
 */
export interface IAgentContext {
  // --------------------------------------------------------------------------
  // DATA ACCESS
  // --------------------------------------------------------------------------

  /**
   * Get the entire context data
   */
  getData(): AgentContextData;

  /**
   * Get a specific value from the context
   * @param path Dot-notation path (e.g., 'parsedTables.0.name')
   */
  get<T = unknown>(path: string): T | undefined;

  /**
   * Set a value in the context
   * @param path Dot-notation path
   * @param value Value to set
   * @param agentId Agent making the change
   */
  set(path: string, value: unknown, agentId?: string): void;

  /**
   * Update multiple values at once
   * @param updates Object with updates (shallow merge)
   * @param agentId Agent making the changes
   */
  update(updates: Partial<AgentContextData>, agentId?: string): void;

  /**
   * Check if a path exists in the context
   */
  has(path: string): boolean;

  /**
   * Delete a value from the context
   * @param path Dot-notation path
   * @param agentId Agent making the change
   */
  delete(path: string, agentId?: string): boolean;

  // --------------------------------------------------------------------------
  // ARRAY OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Push an item to an array
   * @param path Path to array
   * @param item Item to push
   * @param agentId Agent making the change
   */
  push<T>(path: string, item: T, agentId?: string): number;

  /**
   * Push multiple items to an array
   * @param path Path to array
   * @param items Items to push
   * @param agentId Agent making the change
   */
  pushMany<T>(path: string, items: T[], agentId?: string): number;

  // --------------------------------------------------------------------------
  // SNAPSHOTS & HISTORY
  // --------------------------------------------------------------------------

  /**
   * Create a snapshot of the current context
   * @param description Optional description
   * @param triggeredBy Agent that triggered snapshot
   */
  createSnapshot(description?: string, triggeredBy?: string): string;

  /**
   * Restore context from a snapshot
   * @param snapshotId Snapshot ID to restore
   */
  restoreSnapshot(snapshotId: string): boolean;

  /**
   * Get all snapshots
   */
  getSnapshots(): ContextSnapshot[];

  /**
   * Get a specific snapshot
   */
  getSnapshot(snapshotId: string): ContextSnapshot | undefined;

  /**
   * Delete a snapshot
   */
  deleteSnapshot(snapshotId: string): boolean;

  // --------------------------------------------------------------------------
  // CHANGE TRACKING
  // --------------------------------------------------------------------------

  /**
   * Get change history
   */
  getChangeHistory(): ContextChange[];

  /**
   * Get changes since a specific timestamp
   */
  getChangesSince(timestamp: Date): ContextChange[];

  /**
   * Clear change history
   */
  clearChangeHistory(): void;

  // --------------------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------------------

  /**
   * Subscribe to context events
   */
  on<K extends keyof ContextEvents>(
    event: K,
    callback: EventCallback<ContextEvents[K]>
  ): void;

  /**
   * Unsubscribe from context events
   */
  off<K extends keyof ContextEvents>(
    event: K,
    callback: EventCallback<ContextEvents[K]>
  ): void;

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  /**
   * Reset context to initial state
   */
  reset(): void;

  /**
   * Clone the context
   */
  clone(): IAgentContext;

  /**
   * Export context as JSON
   */
  toJSON(): string;

  /**
   * Import context from JSON
   */
  fromJSON(json: string): void;
}

// ============================================================================
// AGENT CONTEXT IMPLEMENTATION
// ============================================================================

/**
 * Implementation of the agent context
 */
export class AgentContext implements IAgentContext {
  private _data: AgentContextData;
  private _changeHistory: ContextChange[] = [];
  private _snapshots: Map<string, ContextSnapshot> = new Map();
  private _eventListeners: Map<string, Set<EventCallback<unknown>>> = new Map();
  private _snapshotCounter = 0;

  // --------------------------------------------------------------------------
  // CONSTRUCTOR
  // --------------------------------------------------------------------------

  constructor(initialData?: Partial<AgentContextData>) {
    this._data = this.createDefaultContext(initialData);
  }

  /**
   * Create default context with initial values
   */
  private createDefaultContext(overrides?: Partial<AgentContextData>): AgentContextData {
    return {
      // Source Files
      sourceFiles: overrides?.sourceFiles ?? [],

      // Parsed Schema (Schema Layer output)
      parsedTables: overrides?.parsedTables ?? [],
      parsedProcedures: overrides?.parsedProcedures ?? [],
      parsedViews: overrides?.parsedViews ?? [],
      parsedCSHTML: overrides?.parsedCSHTML ?? [],
      fkRelationships: overrides?.fkRelationships ?? [],

      // Intelligence Layer output
      columnIntelligence: overrides?.columnIntelligence ?? [],
      piiPHIDetections: overrides?.piiPHIDetections ?? [],
      discoveredRelationships: overrides?.discoveredRelationships ?? [],
      businessRules: overrides?.businessRules ?? [],
      healthScore: overrides?.healthScore ?? null,

      // Module Layer output
      modules: overrides?.modules ?? [],
      sprintPlans: overrides?.sprintPlans ?? [],

      // Requirements Layer output
      userStories: overrides?.userStories ?? [],
      sops: overrides?.sops ?? [],
      traceabilityMatrix: overrides?.traceabilityMatrix ?? [],

      // Generation Layer output
      prismaSchemas: overrides?.prismaSchemas ?? [],
      apiSpecs: overrides?.apiSpecs ?? [],
      screenBlueprints: overrides?.screenBlueprints ?? [],
      testCases: overrides?.testCases ?? [],

      // Migration Layer output
      migrationPlan: overrides?.migrationPlan ?? null,

      // Configuration
      aiConfig: overrides?.aiConfig ?? {
        engine: 'offline',
        temperature: 0.7,
        maxTokens: 4096,
      },

      // Metadata
      projectName: overrides?.projectName ?? 'Untitled Project',
      projectDescription: overrides?.projectDescription ?? '',
      createdAt: overrides?.createdAt ?? new Date(),
      updatedAt: overrides?.updatedAt ?? new Date(),
    };
  }

  // --------------------------------------------------------------------------
  // DATA ACCESS
  // --------------------------------------------------------------------------

  getData(): AgentContextData {
    return { ...this._data };
  }

  get<T = unknown>(path: string): T | undefined {
    const keys = path.split('.');
    let current: unknown = this._data;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array indices
      const arrayIndex = parseInt(key, 10);
      if (!isNaN(arrayIndex) && Array.isArray(current)) {
        current = current[arrayIndex];
      } else if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return current as T;
  }

  set(path: string, value: unknown, agentId?: string): void {
    const keys = path.split('.');
    const oldValue = this.get(path);

    // Navigate to the parent object
    let current: Record<string, unknown> = this._data as unknown as Record<string, unknown>;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const arrayIndex = parseInt(key, 10);

      if (!isNaN(arrayIndex) && Array.isArray(current)) {
        current = current[arrayIndex] as Record<string, unknown>;
      } else if (current[key] === undefined) {
        // Create nested objects if they don't exist
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    // Set the value
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;

    // Record the change
    this.recordChange({
      path,
      type: oldValue === undefined ? 'set' : 'update',
      oldValue,
      newValue: value,
      timestamp: new Date(),
      agentId,
    });

    // Update timestamp
    this._data.updatedAt = new Date();
  }

  update(updates: Partial<AgentContextData>, agentId?: string): void {
    const changes: ContextChange[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key in this._data) {
        const oldValue = this._data[key as keyof AgentContextData];
        (this._data as unknown as Record<string, unknown>)[key] = value;

        changes.push({
          path: key,
          type: 'update',
          oldValue,
          newValue: value,
          timestamp: new Date(),
          agentId,
        });
      }
    }

    if (changes.length > 0) {
      changes.forEach((change) => this.recordChange(change));
      this.emit('bulk-change', { changes });
    }

    this._data.updatedAt = new Date();
  }

  has(path: string): boolean {
    return this.get(path) !== undefined;
  }

  delete(path: string, agentId?: string): boolean {
    const keys = path.split('.');
    const oldValue = this.get(path);

    if (oldValue === undefined) {
      return false;
    }

    // Navigate to the parent object
    let current: Record<string, unknown> = this._data as unknown as Record<string, unknown>;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const arrayIndex = parseInt(key, 10);

      if (!isNaN(arrayIndex) && Array.isArray(current)) {
        current = current[arrayIndex] as Record<string, unknown>;
      } else {
        current = current[key] as Record<string, unknown>;
      }
    }

    // Delete the value
    const lastKey = keys[keys.length - 1];
    if (Array.isArray(current)) {
      const index = parseInt(lastKey, 10);
      current.splice(index, 1);
    } else {
      delete current[lastKey];
    }

    // Record the change
    this.recordChange({
      path,
      type: 'remove',
      oldValue,
      newValue: undefined as unknown,
      timestamp: new Date(),
      agentId,
    });

    this._data.updatedAt = new Date();
    return true;
  }

  // --------------------------------------------------------------------------
  // ARRAY OPERATIONS
  // --------------------------------------------------------------------------

  push<T>(path: string, item: T, agentId?: string): number {
    const array = this.get<T[]>(path);

    if (!Array.isArray(array)) {
      throw new Error(`Path ${path} is not an array`);
    }

    array.push(item);
    this.recordChange({
      path: `${path}.${array.length - 1}`,
      type: 'add',
      newValue: item,
      timestamp: new Date(),
      agentId,
    });

    this._data.updatedAt = new Date();
    return array.length;
  }

  pushMany<T>(path: string, items: T[], agentId?: string): number {
    const array = this.get<T[]>(path);

    if (!Array.isArray(array)) {
      throw new Error(`Path ${path} is not an array`);
    }

    const startIndex = array.length;
    array.push(...items);

    items.forEach((item, index) => {
      this.recordChange({
        path: `${path}.${startIndex + index}`,
        type: 'add',
        newValue: item,
        timestamp: new Date(),
        agentId,
      });
    });

    this._data.updatedAt = new Date();
    return array.length;
  }

  // --------------------------------------------------------------------------
  // SNAPSHOTS & HISTORY
  // --------------------------------------------------------------------------

  createSnapshot(description?: string, triggeredBy?: string): string {
    this._snapshotCounter++;
    const id = `snapshot-${this._snapshotCounter}-${Date.now()}`;

    const snapshot: ContextSnapshot = {
      id,
      timestamp: new Date(),
      data: this.deepClone(this._data),
      description,
      triggeredBy,
    };

    this._snapshots.set(id, snapshot);
    this.emit('snapshot', { snapshotId: id, data: snapshot.data });

    return id;
  }

  restoreSnapshot(snapshotId: string): boolean {
    const snapshot = this._snapshots.get(snapshotId);

    if (!snapshot) {
      return false;
    }

    const previousState = this._data;
    this._data = this.deepClone(snapshot.data);
    this.emit('reset', { previousState });

    return true;
  }

  getSnapshots(): ContextSnapshot[] {
    return Array.from(this._snapshots.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  getSnapshot(snapshotId: string): ContextSnapshot | undefined {
    return this._snapshots.get(snapshotId);
  }

  deleteSnapshot(snapshotId: string): boolean {
    return this._snapshots.delete(snapshotId);
  }

  // --------------------------------------------------------------------------
  // CHANGE TRACKING
  // --------------------------------------------------------------------------

  getChangeHistory(): ContextChange[] {
    return [...this._changeHistory];
  }

  getChangesSince(timestamp: Date): ContextChange[] {
    return this._changeHistory.filter(
      (change) => change.timestamp >= timestamp
    );
  }

  clearChangeHistory(): void {
    this._changeHistory = [];
  }

  private recordChange(change: ContextChange): void {
    this._changeHistory.push(change);
    this.emit('change', change);
  }

  // --------------------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------------------

  on<K extends keyof ContextEvents>(
    event: K,
    callback: EventCallback<ContextEvents[K]>
  ): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set());
    }
    this._eventListeners.get(event)!.add(callback as EventCallback<unknown>);
  }

  off<K extends keyof ContextEvents>(
    event: K,
    callback: EventCallback<ContextEvents[K]>
  ): void {
    this._eventListeners.get(event)?.delete(callback as EventCallback<unknown>);
  }

  private emit<K extends keyof ContextEvents>(
    event: K,
    data: ContextEvents[K]
  ): void {
    this._eventListeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in context event listener for ${event}:`, error);
      }
    });
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  reset(): void {
    const previousState = this._data;
    this._data = this.createDefaultContext();
    this._changeHistory = [];
    this._snapshots.clear();
    this.emit('reset', { previousState });
  }

  clone(): IAgentContext {
    const cloned = new AgentContext(this.deepClone(this._data));
    return cloned;
  }

  toJSON(): string {
    return JSON.stringify(this._data, null, 2);
  }

  fromJSON(json: string): void {
    try {
      const data = JSON.parse(json);
      this._data = this.createDefaultContext(data);
      this._data.updatedAt = new Date();
    } catch (error) {
      throw new Error(`Failed to parse context JSON: ${error}`);
    }
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

// ============================================================================
// CONTEXT BUILDER
// ============================================================================

/**
 * Builder for creating agent contexts with a fluent API
 */
export class ContextBuilder {
  private _data: Partial<AgentContextData> = {};

  /**
   * Set project metadata
   */
  project(name: string, description?: string): this {
    this._data.projectName = name;
    this._data.projectDescription = description ?? '';
    return this;
  }

  /**
   * Set AI configuration
   */
  aiConfig(config: AIConfig): this {
    this._data.aiConfig = config;
    return this;
  }

  /**
   * Add source files
   */
  sourceFiles(files: SourceFile[]): this {
    this._data.sourceFiles = files;
    return this;
  }

  /**
   * Add parsed tables
   */
  parsedTables(tables: ParsedTable[]): this {
    this._data.parsedTables = tables;
    return this;
  }

  /**
   * Add parsed procedures
   */
  parsedProcedures(procedures: ParsedStoredProcedure[]): this {
    this._data.parsedProcedures = procedures;
    return this;
  }

  /**
   * Add parsed views
   */
  parsedViews(views: ParsedView[]): this {
    this._data.parsedViews = views;
    return this;
  }

  /**
   * Add parsed CSHTML
   */
  parsedCSHTML(views: ParsedCSHTML[]): this {
    this._data.parsedCSHTML = views;
    return this;
  }

  /**
   * Add FK relationships
   */
  fkRelationships(fks: ParsedForeignKey[]): this {
    this._data.fkRelationships = fks;
    return this;
  }

  /**
   * Add column intelligence
   */
  columnIntelligence(intel: ColumnIntelligence[]): this {
    this._data.columnIntelligence = intel;
    return this;
  }

  /**
   * Add PII/PHI detections
   */
  piiPHIDetections(detections: PII_PHIDetection[]): this {
    this._data.piiPHIDetections = detections;
    return this;
  }

  /**
   * Add discovered relationships
   */
  discoveredRelationships(relations: DiscoveredRelationship[]): this {
    this._data.discoveredRelationships = relations;
    return this;
  }

  /**
   * Add business rules
   */
  businessRules(rules: InferredBusinessRule[]): this {
    this._data.businessRules = rules;
    return this;
  }

  /**
   * Set health score
   */
  healthScore(score: SchemaHealthScore): this {
    this._data.healthScore = score;
    return this;
  }

  /**
   * Add modules
   */
  modules(modules: Module[]): this {
    this._data.modules = modules;
    return this;
  }

  /**
   * Add sprint plans
   */
  sprintPlans(plans: SprintPlan[]): this {
    this._data.sprintPlans = plans;
    return this;
  }

  /**
   * Add user stories
   */
  userStories(stories: UserStory[]): this {
    this._data.userStories = stories;
    return this;
  }

  /**
   * Add SOPs
   */
  sops(sops: SOP[]): this {
    this._data.sops = sops;
    return this;
  }

  /**
   * Add traceability matrix
   */
  traceabilityMatrix(matrix: TraceabilityEntry[]): this {
    this._data.traceabilityMatrix = matrix;
    return this;
  }

  /**
   * Add Prisma schemas
   */
  prismaSchemas(schemas: GeneratedPrismaSchema[]): this {
    this._data.prismaSchemas = schemas;
    return this;
  }

  /**
   * Add API specs
   */
  apiSpecs(specs: GeneratedAPISpec[]): this {
    this._data.apiSpecs = specs;
    return this;
  }

  /**
   * Add screen blueprints
   */
  screenBlueprints(blueprints: GeneratedScreenBlueprint[]): this {
    this._data.screenBlueprints = blueprints;
    return this;
  }

  /**
   * Add test cases
   */
  testCases(cases: GeneratedTestCase[]): this {
    this._data.testCases = cases;
    return this;
  }

  /**
   * Set migration plan
   */
  migrationPlan(plan: MigrationPlan): this {
    this._data.migrationPlan = plan;
    return this;
  }

  /**
   * Build the context
   */
  build(): IAgentContext {
    return new AgentContext(this._data);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new agent context with optional initial data
 */
export function createAgentContext(
  initialData?: Partial<AgentContextData>
): IAgentContext {
  return new AgentContext(initialData);
}

/**
 * Create a context builder
 */
export function createContextBuilder(): ContextBuilder {
  return new ContextBuilder();
}

/**
 * Create a minimal context for testing
 */
export function createTestContext(): IAgentContext {
  return new AgentContext({
    projectName: 'Test Project',
    projectDescription: 'A test project for unit testing',
    aiConfig: {
      engine: 'offline',
      temperature: 0.7,
    },
  });
}

/**
 * Validate that a context has minimum required data
 */
export function validateContext(context: IAgentContext): {
  valid: boolean;
  missing: string[];
} {
  const data = context.getData();
  const missing: string[] = [];

  if (!data.projectName) {
    missing.push('projectName');
  }

  if (!data.aiConfig) {
    missing.push('aiConfig');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
