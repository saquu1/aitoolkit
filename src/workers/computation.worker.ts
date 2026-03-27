/**
 * WEB WORKER INFRASTRUCTURE
 * =========================
 * Web Worker setup for heavy computations
 *
 * Features:
 * - Off-main-thread computation
 * - Task queue management
 * - Result caching
 * - Error handling
 * - React hooks for worker communication
 */

// =============================================================================
// WORKER TYPES
// =============================================================================

export type WorkerTaskType =
  | 'parse_sql'
  | 'parse_json'
  | 'analyze_schema'
  | 'compute_diff'
  | 'generate_code'
  | 'transform_data'
  | 'validate_data'
  | 'compute_graph'

export interface WorkerTask<T = unknown, R = unknown> {
  id: string
  type: WorkerTaskType
  payload: T
  timestamp: number
}

export interface WorkerResult<R = unknown> {
  taskId: string
  success: boolean
  data?: R
  error?: string
  duration: number
}

export interface WorkerMessage<T = unknown, R = unknown> {
  type: 'task' | 'result' | 'error' | 'ready' | 'ping'
  task?: WorkerTask<T>
  result?: WorkerResult<R>
  error?: string
}

// =============================================================================
// WORKER CODE (Inline for Next.js compatibility)
// =============================================================================

const workerCode = `
// Worker task handlers
const handlers = {
  // Parse SQL DDL statements
  parse_sql: (payload) => {
    const { sql } = payload;
    const tables = [];
    const procedures = [];
    const views = [];

    // Simple SQL parsing logic
    const tableMatches = sql.matchAll(/CREATE\\s+TABLE\\s+(?:\\[?(\\w+)\\]?\\.?\\[?(\\w+)\\]?)\\s*\\(([^)]+)\\)/gis);
    for (const match of tableMatches) {
      tables.push({
        schema: match[1] || 'dbo',
        name: match[2],
        columns: match[3].split(',').map(col => col.trim()).filter(Boolean)
      });
    }

    return { tables, procedures, views };
  },

  // Parse large JSON strings
  parse_json: (payload) => {
    const { json } = payload;
    return JSON.parse(json);
  },

  // Analyze schema structure
  analyze_schema: (payload) => {
    const { tables, columns } = payload;

    const stats = {
      tableCount: tables.length,
      columnCount: columns.length,
      relationships: [],
      indexes: [],
      constraints: [],
    };

    // Analyze relationships (FK detection)
    for (const col of columns) {
      if (col.name.endsWith('Id') && col.name !== 'Id') {
        const refTable = col.name.replace(/Id$/, '');
        stats.relationships.push({
          from: col.tableName,
          to: refTable,
          via: col.name,
        });
      }
    }

    return stats;
  },

  // Compute diff between two datasets
  compute_diff: (payload) => {
    const { oldData, newData, keyField } = payload;

    const oldMap = new Map(oldData.map(item => [item[keyField], item]));
    const newMap = new Map(newData.map(item => [item[keyField], item]));

    const added = [];
    const removed = [];
    const modified = [];

    for (const [key, item] of newMap) {
      if (!oldMap.has(key)) {
        added.push(item);
      } else {
        const oldItem = oldMap.get(key);
        if (JSON.stringify(oldItem) !== JSON.stringify(item)) {
          modified.push({ old: oldItem, new: item });
        }
      }
    }

    for (const [key, item] of oldMap) {
      if (!newMap.has(key)) {
        removed.push(item);
      }
    }

    return { added, removed, modified };
  },

  // Transform data array
  transform_data: (payload) => {
    const { data, transforms } = payload;

    return data.map(item => {
      let result = { ...item };
      for (const transform of transforms) {
        switch (transform.type) {
          case 'rename':
            result[transform.to] = result[transform.from];
            delete result[transform.from];
            break;
          case 'map':
            result[transform.field] = transform.fn(result[transform.field]);
            break;
          case 'filter':
            if (!transform.predicate(result)) {
              return null;
            }
            break;
        }
      }
      return result;
    }).filter(Boolean);
  },

  // Validate data against schema
  validate_data: (payload) => {
    const { data, schema } = payload;

    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      for (const [field, rules] of Object.entries(schema)) {
        const value = item[field];

        if (rules.required && (value === undefined || value === null)) {
          errors.push({ row: i, field, error: 'Required field is missing' });
        }

        if (rules.type && typeof value !== rules.type) {
          errors.push({ row: i, field, error: 'Expected type ' + rules.type });
        }

        if (rules.minLength && value.length < rules.minLength) {
          errors.push({ row: i, field, error: 'Minimum length is ' + rules.minLength });
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push({ row: i, field, error: 'Maximum length is ' + rules.maxLength });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  },

  // Compute graph metrics
  compute_graph: (payload) => {
    const { nodes, edges } = payload;

    // Build adjacency list
    const adjacency = new Map();
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    for (const edge of edges) {
      adjacency.get(edge.source)?.push(edge.target);
    }

    // Find cycles
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    function dfs(node, path) {
      visited.add(node);
      recursionStack.add(node);

      for (const neighbor of (adjacency.get(node) || [])) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path, neighbor]);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          cycles.push(path.slice(cycleStart));
        }
      }

      recursionStack.delete(node);
    }

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, [node.id]);
      }
    }

    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      cycles: cycles.length,
      cycleDetails: cycles,
    };
  },

  // Generate code from template
  generate_code: (payload) => {
    const { template, data } = payload;
    let result = template;

    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp('\\{\\{\\s*' + key + '\\s*\\}\\}', 'g');
      result = result.replace(regex, String(value));
    }

    return { code: result };
  },
};

// Message handler
self.onmessage = function(e) {
  const message = e.data;

  if (message.type === 'ping') {
    self.postMessage({ type: 'pong' });
    return;
  }

  if (message.type === 'task' && message.task) {
    const task = message.task;
    const startTime = performance.now();

    try {
      const handler = handlers[task.type];

      if (!handler) {
        throw new Error('Unknown task type: ' + task.type);
      }

      const data = handler(task.payload);
      const duration = performance.now() - startTime;

      self.postMessage({
        type: 'result',
        result: {
          taskId: task.id,
          success: true,
          data,
          duration,
        },
      });
    } catch (error) {
      const duration = performance.now() - startTime;

      self.postMessage({
        type: 'result',
        result: {
          taskId: task.id,
          success: false,
          error: error.message,
          duration,
        },
      });
    }
  }
};

// Signal ready
self.postMessage({ type: 'ready' });
`;

// =============================================================================
// WORKER MANAGER
// =============================================================================

class WorkerManager {
  private worker: Worker | null = null
  private taskQueue: Map<string, {
    resolve: (result: WorkerResult) => void
    reject: (error: Error) => void
  }> = new Map()
  private isReady = false
  private taskIdCounter = 0

  constructor() {
    this.initWorker()
  }

  private initWorker() {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return
    }

    // Create inline worker
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)

    this.worker = new Worker(url)

    this.worker.onmessage = (e) => {
      const message: WorkerMessage = e.data

      if (message.type === 'ready') {
        this.isReady = true
        return
      }

      if (message.type === 'result' && message.result) {
        const pending = this.taskQueue.get(message.result.taskId)
        if (pending) {
          this.taskQueue.delete(message.result.taskId)
          pending.resolve(message.result)
        }
      }
    }

    this.worker.onerror = (e) => {
      console.error('Worker error:', e)
    }

    // Clean up blob URL after worker is created
    URL.revokeObjectURL(url)
  }

  /**
   * Execute a task in the worker
   */
  async execute<T, R>(type: WorkerTaskType, payload: T): Promise<R> {
    if (!this.worker || !this.isReady) {
      throw new Error('Worker not ready')
    }

    const taskId = `task_${++this.taskIdCounter}_${Date.now()}`
    const task: WorkerTask<T> = {
      id: taskId,
      type,
      payload,
      timestamp: Date.now(),
    }

    return new Promise((resolve, reject) => {
      this.taskQueue.set(taskId, {
        resolve: (result) => {
          if (result.success) {
            resolve(result.data as R)
          } else {
            reject(new Error(result.error || 'Task failed'))
          }
        },
        reject,
      })

      // Set timeout for task
      setTimeout(() => {
        if (this.taskQueue.has(taskId)) {
          this.taskQueue.delete(taskId)
          reject(new Error('Task timeout'))
        }
      }, 60000) // 1 minute timeout

      this.worker!.postMessage({ type: 'task', task })
    })
  }

  /**
   * Check if worker is ready
   */
  getReady(): boolean {
    return this.isReady
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.isReady = false
    }
  }
}

// Singleton worker manager
let workerManager: WorkerManager | null = null

function getWorkerManager(): WorkerManager {
  if (!workerManager) {
    workerManager = new WorkerManager()
  }
  return workerManager
}

// =============================================================================
// REACT HOOKS (Client-side only)
// =============================================================================

/**
 * Hook to execute tasks in a web worker
 */
export function useWorker() {
  const manager = getWorkerManager()

  const execute = async <T, R>(
    type: WorkerTaskType,
    payload: T
  ): Promise<R> => {
    return manager.execute<T, R>(type, payload)
  }

  return {
    execute,
    isReady: manager.getReady(),
  }
}

/**
 * Hook for SQL parsing with web worker
 */
export function useWorkerSqlParser() {
  const { execute, isReady } = useWorker()

  const parse = async (sql: string) => {
    return execute<string, { tables: unknown[]; procedures: unknown[]; views: unknown[] }>(
      'parse_sql',
      { sql }
    )
  }

  return { parse, isReady }
}

/**
 * Hook for data diff computation with web worker
 */
export function useWorkerDiff<T extends Record<string, unknown>>() {
  const { execute, isReady } = useWorker()

  const computeDiff = async (
    oldData: T[],
    newData: T[],
    keyField: keyof T
  ) => {
    return execute<{ oldData: T[]; newData: T[]; keyField: string }, {
      added: T[]
      removed: T[]
      modified: { old: T; new: T }[]
    }>('compute_diff', { oldData, newData, keyField: String(keyField) })
  }

  return { computeDiff, isReady }
}

/**
 * Hook for schema analysis with web worker
 */
export function useWorkerSchemaAnalysis() {
  const { execute, isReady } = useWorker()

  const analyze = async (tables: unknown[], columns: unknown[]) => {
    return execute('analyze_schema', { tables, columns })
  }

  return { analyze, isReady }
}

/**
 * Hook for data validation with web worker
 */
export function useWorkerValidation() {
  const { execute, isReady } = useWorker()

  const validate = async (
    data: Record<string, unknown>[],
    schema: Record<string, { required?: boolean; type?: string; minLength?: number; maxLength?: number }>
  ) => {
    return execute('validate_data', { data, schema })
  }

  return { validate, isReady }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Execute a single task without hooks
 */
export async function executeWorkerTask<T, R>(
  type: WorkerTaskType,
  payload: T
): Promise<R> {
  const manager = getWorkerManager()
  return manager.execute<T, R>(type, payload)
}

/**
 * Check if web workers are supported
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined'
}

// =============================================================================
// EXPORTS
// =============================================================================

export { WorkerManager }
export default getWorkerManager
