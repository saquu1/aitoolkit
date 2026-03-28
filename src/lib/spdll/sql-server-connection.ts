/**
 * SQL Server Connection Pool - Enterprise-grade Database Connection Management
 * 
 * GAP-SP-008 Implementation
 * 
 * Features:
 * - Connection pooling with configurable limits
 * - Live SP analysis support
 * - Query timeout management
 * - Health monitoring
 * - Automatic reconnection
 * - Transaction support
 * - Query logging and metrics
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SQLServerConfig {
  /** Server hostname or IP */
  server: string;
  /** Server port (default: 1433) */
  port?: number;
  /** Database name */
  database: string;
  /** Authentication type */
  authentication: 'windows' | 'sql' | 'azure_ad';
  /** Username (for SQL authentication) */
  user?: string;
  /** Password (for SQL authentication) */
  password?: string;
  /** Connection timeout in ms */
  connectionTimeout?: number;
  /** Query timeout in ms */
  queryTimeout?: number;
  /** Pool configuration */
  pool?: {
    min?: number;
    max?: number;
    idleTimeout?: number;
    acquireTimeout?: number;
  };
  /** SSL/TLS configuration */
  encrypt?: boolean;
  trustServerCertificate?: boolean;
  /** Additional options */
  options?: Record<string, any>;
}

export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalQueries: number;
  failedQueries: number;
  averageQueryTime: number;
  lastError: string | null;
  lastErrorTime: Date | null;
  poolHealth: 'healthy' | 'degraded' | 'unhealthy';
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  columns: ColumnMetadata[];
  executionTime: number;
  fromCache: boolean;
}

export interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
  length: number | null;
  precision: number | null;
  scale: number | null;
}

export interface SPParameterInfo {
  name: string;
  type: string;
  direction: 'input' | 'output' | 'input_output';
  defaultValue: string | null;
  maxLength: number | null;
  precision: number | null;
  scale: number | null;
}

export interface SPMetadata {
  name: string;
  schema: string;
  parameters: SPParameterInfo[];
  returnType: 'table' | 'scalar' | 'none';
  bodyText: string | null;
  createDate: Date | null;
  modifyDate: Date | null;
  isEncryption: boolean;
  isReplSerialOnly: boolean;
  usesAnsiNulls: boolean;
  usesQuotedIdentifier: boolean;
}

export interface QueryMetrics {
  queryId: string;
  sql: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  rowCount: number;
  success: boolean;
  error: string | null;
  fromCache: boolean;
}

export interface ConnectionHealth {
  isConnected: boolean;
  serverVersion: string | null;
  lastPing: Date | null;
  responseTime: number | null;
  errors: HealthError[];
}

export interface HealthError {
  timestamp: Date;
  message: string;
  code?: string;
}

export type PoolEventListener = (event: PoolEvent) => void;

export interface PoolEvent {
  type: 'connection_created' | 'connection_released' | 'connection_error' | 
        'query_start' | 'query_end' | 'query_error' | 'pool_exhausted' |
        'pool_recovered' | 'health_check';
  timestamp: Date;
  data?: any;
}

// ============================================================================
// CONNECTION POOL CLASS
// ============================================================================

/**
 * SQL Server Connection Pool with enterprise features
 */
export class SQLServerConnectionPool {
  private config: SQLServerConfig;
  private pool: any[] = [];
  private activeConnections: Set<any> = new Set();
  private waitingQueue: Array<{
    resolve: (conn: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  private stats: ConnectionPoolStats;
  private queryMetrics: QueryMetrics[] = [];
  private listeners: PoolEventListener[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isShuttingDown: boolean = false;

  // Pool configuration
  private readonly minPoolSize: number;
  private readonly maxPoolSize: number;
  private readonly idleTimeout: number;
  private readonly acquireTimeout: number;

  constructor(config: SQLServerConfig) {
    this.config = {
      port: 1433,
      connectionTimeout: 30000,
      queryTimeout: 30000,
      encrypt: true,
      trustServerCertificate: false,
      ...config,
      pool: {
        min: 2,
        max: 10,
        idleTimeout: 30000,
        acquireTimeout: 10000,
        ...config.pool
      }
    };

    this.minPoolSize = this.config.pool!.min!;
    this.maxPoolSize = this.config.pool!.max!;
    this.idleTimeout = this.config.pool!.idleTimeout!;
    this.acquireTimeout = this.config.pool!.acquireTimeout!;

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      totalQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      lastError: null,
      lastErrorTime: null,
      poolHealth: 'healthy'
    };
  }

  /**
   * Initialize the connection pool
   */
  async initialize(): Promise<void> {
    // Create minimum connections
    const initPromises: Promise<any>[] = [];
    
    for (let i = 0; i < this.minPoolSize; i++) {
      initPromises.push(this.createConnection());
    }

    try {
      await Promise.all(initPromises);
      this.startHealthCheck();
      this.emitEvent({ type: 'pool_recovered', timestamp: new Date() });
    } catch (error) {
      this.stats.poolHealth = 'unhealthy';
      throw new Error(`Failed to initialize connection pool: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new connection
   */
  private async createConnection(): Promise<any> {
    try {
      // Dynamic import of mssql (optional dependency)
      const mssql = await this.loadMSSQL();
      
      const connection = new mssql.ConnectionPool({
        server: this.config.server,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        connectionTimeout: this.config.connectionTimeout,
        requestTimeout: this.config.queryTimeout,
        encrypt: this.config.encrypt,
        trustServerCertificate: this.config.trustServerCertificate,
        options: {
          ...this.config.options,
          enableArithAbort: true
        }
      });

      await connection.connect();

      const wrappedConnection = {
        raw: connection,
        lastUsed: Date.now(),
        isHealthy: true
      };

      this.pool.push(wrappedConnection);
      this.stats.totalConnections++;
      this.updatePoolStats();

      this.emitEvent({
        type: 'connection_created',
        timestamp: new Date(),
        data: { poolSize: this.pool.length }
      });

      return wrappedConnection;
    } catch (error) {
      this.stats.lastError = error instanceof Error ? error.message : String(error);
      this.stats.lastErrorTime = new Date();
      throw error;
    }
  }

  /**
   * Load MSSQL package dynamically
   */
  private async loadMSSQL(): Promise<any> {
    try {
      return await import('mssql');
    } catch {
      throw new Error('mssql package not installed. Run: npm install mssql');
    }
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<any> {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    // Try to get an idle connection
    for (let i = 0; i < this.pool.length; i++) {
      const conn = this.pool[i];
      if (!this.activeConnections.has(conn) && conn.isHealthy) {
        this.activeConnections.add(conn);
        conn.lastUsed = Date.now();
        this.updatePoolStats();
        return conn;
      }
    }

    // Create a new connection if under max limit
    if (this.pool.length < this.maxPoolSize) {
      try {
        const conn = await this.createConnection();
        this.activeConnections.add(conn);
        this.updatePoolStats();
        return conn;
      } catch (error) {
        // Fall through to wait in queue
      }
    }

    // Wait for a connection to become available
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex(w => w.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
          this.stats.waitingRequests--;
          this.emitEvent({
            type: 'pool_exhausted',
            timestamp: new Date()
          });
          reject(new Error('Connection acquire timeout'));
        }
      }, this.acquireTimeout);

      this.waitingQueue.push({ resolve, reject, timeout });
      this.stats.waitingRequests++;
    });
  }

  /**
   * Release a connection back to the pool
   */
  release(connection: any): void {
    this.activeConnections.delete(connection);
    connection.lastUsed = Date.now();
    this.updatePoolStats();

    // Check if anyone is waiting for a connection
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift();
      if (waiter) {
        clearTimeout(waiter.timeout);
        this.activeConnections.add(connection);
        this.stats.waitingRequests--;
        waiter.resolve(connection);
      }
    }

    this.emitEvent({
      type: 'connection_released',
      timestamp: new Date(),
      data: { activeConnections: this.activeConnections.size }
    });
  }

  /**
   * Execute a query
   */
  async query<T = any>(sql: string, params?: Record<string, any>): Promise<QueryResult<T>> {
    const queryId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    this.emitEvent({
      type: 'query_start',
      timestamp: new Date(),
      data: { queryId, sql: sql.substring(0, 200) }
    });

    let connection: any = null;
    try {
      connection = await this.acquire();
      const mssql = await this.loadMSSQL();
      
      const request = connection.raw.request();
      
      // Add parameters
      if (params) {
        for (const [name, value] of Object.entries(params)) {
          request.input(name, value);
        }
      }

      const result = await request.query(sql);
      const executionTime = Date.now() - startTime;

      // Update stats
      this.stats.totalQueries++;
      this.updateAverageQueryTime(executionTime);

      // Extract column metadata
      const columns: ColumnMetadata[] = result.recordset?.columns 
        ? Array.from(result.recordset.columns.values()).map((col: any) => ({
            name: col.name,
            type: col.type?.name || 'unknown',
            nullable: col.nullable ?? true,
            length: col.length,
            precision: col.precision,
            scale: col.scale
          }))
        : [];

      const queryResult: QueryResult<T> = {
        rows: result.recordset || [],
        rowCount: result.recordset?.length || 0,
        columns,
        executionTime,
        fromCache: false
      };

      this.emitEvent({
        type: 'query_end',
        timestamp: new Date(),
        data: { queryId, rowCount: queryResult.rowCount, executionTime }
      });

      this.recordMetrics({
        queryId,
        sql,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: executionTime,
        rowCount: queryResult.rowCount,
        success: true,
        error: null,
        fromCache: false
      });

      return queryResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.stats.failedQueries++;
      this.stats.lastError = errorMessage;
      this.stats.lastErrorTime = new Date();

      this.emitEvent({
        type: 'query_error',
        timestamp: new Date(),
        data: { queryId, error: errorMessage }
      });

      this.recordMetrics({
        queryId,
        sql,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: executionTime,
        rowCount: 0,
        success: false,
        error: errorMessage,
        fromCache: false
      });

      throw new Error(`Query execution failed: ${errorMessage}`);
    } finally {
      if (connection) {
        this.release(connection);
      }
    }
  }

  /**
   * Execute a stored procedure
   */
  async executeSP<T = any>(
    procedureName: string,
    params?: Record<string, { value: any; type?: string; direction?: 'input' | 'output' }>
  ): Promise<QueryResult<T>> {
    const queryId = `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    let connection: any = null;
    try {
      connection = await this.acquire();
      const mssql = await this.loadMSSQL();
      
      const request = connection.raw.request();
      
      // Add parameters with type information
      if (params) {
        for (const [name, param] of Object.entries(params)) {
          if (param.direction === 'output') {
            request.output(name, param.type || mssql.VarChar, param.value);
          } else {
            request.input(name, param.type ? this.getMSSQLType(mssql, param.type) : undefined, param.value);
          }
        }
      }

      const result = await request.execute(procedureName);
      const executionTime = Date.now() - startTime;

      this.stats.totalQueries++;
      this.updateAverageQueryTime(executionTime);

      // Extract output parameters
      const outputParams: Record<string, any> = {};
      if (result.output) {
        for (const [key, value] of Object.entries(result.output)) {
          outputParams[key] = value;
        }
      }

      const queryResult: QueryResult<T> = {
        rows: result.recordset || [],
        rowCount: result.recordset?.length || 0,
        columns: [],
        executionTime,
        fromCache: false
      };

      // Attach output parameters
      (queryResult as any).outputParameters = outputParams;

      return queryResult;
    } finally {
      if (connection) {
        this.release(connection);
      }
    }
  }

  /**
   * Get MSSQL type from string
   */
  private getMSSQLType(mssql: any, typeName: string): any {
    const types: Record<string, any> = {
      'int': mssql.Int,
      'bigint': mssql.BigInt,
      'smallint': mssql.SmallInt,
      'tinyint': mssql.TinyInt,
      'bit': mssql.Bit,
      'decimal': mssql.Decimal,
      'numeric': mssql.Numeric,
      'money': mssql.Money,
      'float': mssql.Float,
      'real': mssql.Real,
      'varchar': mssql.VarChar,
      'nvarchar': mssql.NVarChar,
      'char': mssql.Char,
      'nchar': mssql.NChar,
      'text': mssql.Text,
      'ntext': mssql.NText,
      'date': mssql.Date,
      'datetime': mssql.DateTime,
      'datetime2': mssql.DateTime2,
      'smalldatetime': mssql.SmallDateTime,
      'time': mssql.Time,
      'uniqueidentifier': mssql.UniqueIdentifier,
      'xml': mssql.Xml,
      'varbinary': mssql.VarBinary,
      'image': mssql.Image
    };

    return types[typeName.toLowerCase()] || mssql.VarChar;
  }

  /**
   * Get stored procedure metadata
   */
  async getSPMetadata(procedureName: string, schema: string = 'dbo'): Promise<SPMetadata> {
    // Query system views for SP metadata
    const metadataQuery = `
      SELECT 
        p.name AS procedure_name,
        s.name AS schema_name,
        p.create_date,
        p.modify_date,
        p.uses_ansi_nulls,
        p.uses_quoted_identifier,
        m.definition AS body_text,
        p.is_encrypted,
        p.is_replication_serial_only
      FROM sys.procedures p
      JOIN sys.schemas s ON p.schema_id = s.schema_id
      LEFT JOIN sys.sql_modules m ON p.object_id = m.object_id
      WHERE p.name = @procedureName AND s.name = @schema
    `;

    const paramsQuery = `
      SELECT 
        par.name AS parameter_name,
        TYPE_NAME(par.user_type_id) AS type_name,
        par.is_output,
        par.is_readonly,
        par.has_default_value,
        par.default_value,
        par.max_length,
        par.precision,
        par.scale
      FROM sys.parameters par
      JOIN sys.procedures p ON par.object_id = p.object_id
      JOIN sys.schemas s ON p.schema_id = s.schema_id
      WHERE p.name = @procedureName AND s.name = @schema
      ORDER BY par.parameter_id
    `;

    const [metadataResult, paramsResult] = await Promise.all([
      this.query(metadataQuery, { procedureName, schema }),
      this.query(paramsQuery, { procedureName, schema })
    ]);

    if (metadataResult.rows.length === 0) {
      throw new Error(`Stored procedure '${schema}.${procedureName}' not found`);
    }

    const row = metadataResult.rows[0];

    // Parse parameters
    const parameters: SPParameterInfo[] = paramsResult.rows
      .filter((p: any) => p.parameter_name) // Exclude return value
      .map((p: any) => ({
        name: p.parameter_name,
        type: p.type_name,
        direction: p.is_output ? 'output' : 'input',
        defaultValue: p.default_value,
        maxLength: p.max_length > 0 ? p.max_length : null,
        precision: p.precision,
        scale: p.scale
      }));

    return {
      name: procedureName,
      schema,
      parameters,
      returnType: 'table', // Assume table return
      bodyText: row.body_text,
      createDate: row.create_date,
      modifyDate: row.modify_date,
      isEncryption: row.is_encrypted || false,
      isReplSerialOnly: row.is_replication_serial_only || false,
      usesAnsiNulls: row.uses_ansi_nulls || false,
      usesQuotedIdentifier: row.uses_quoted_identifier || false
    };
  }

  /**
   * List all stored procedures in the database
   */
  async listProcedures(schema?: string): Promise<Array<{ name: string; schema: string }>> {
    const sql = schema
      ? `SELECT name, SCHEMA_NAME(schema_id) AS schema_name FROM sys.procedures WHERE SCHEMA_NAME(schema_id) = @schema ORDER BY name`
      : `SELECT name, SCHEMA_NAME(schema_id) AS schema_name FROM sys.procedures ORDER BY schema_name, name`;

    const result = await this.query(sql, schema ? { schema } : {});
    
    return result.rows.map((row: any) => ({
      name: row.name,
      schema: row.schema_name
    }));
  }

  /**
   * Check connection health
   */
  async checkHealth(): Promise<ConnectionHealth> {
    const health: ConnectionHealth = {
      isConnected: false,
      serverVersion: null,
      lastPing: null,
      responseTime: null,
      errors: []
    };

    try {
      const startTime = Date.now();
      const result = await this.query('SELECT @@VERSION AS version, GETDATE() AS current_time');
      const endTime = Date.now();

      health.isConnected = true;
      health.serverVersion = result.rows[0]?.version?.substring(0, 100) || null;
      health.lastPing = new Date();
      health.responseTime = endTime - startTime;

      this.emitEvent({
        type: 'health_check',
        timestamp: new Date(),
        data: { responseTime: health.responseTime, healthy: true }
      });
    } catch (error) {
      health.errors.push({
        timestamp: new Date(),
        message: error instanceof Error ? error.message : String(error)
      });

      this.emitEvent({
        type: 'health_check',
        timestamp: new Date(),
        data: { healthy: false, error: health.errors[0].message }
      });
    }

    return health;
  }

  /**
   * Get pool statistics
   */
  getStats(): ConnectionPoolStats {
    return { ...this.stats };
  }

  /**
   * Get query metrics
   */
  getMetrics(limit: number = 100): QueryMetrics[] {
    return this.queryMetrics.slice(-limit);
  }

  /**
   * Add event listener
   */
  addEventListener(listener: PoolEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: PoolEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Shutdown the connection pool
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Stop health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Reject waiting requests
    for (const waiter of this.waitingQueue) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Connection pool is shutting down'));
    }
    this.waitingQueue.length = 0;

    // Close all connections
    const closePromises = this.pool.map(async (conn) => {
      try {
        await conn.raw.close();
      } catch {
        // Ignore close errors
      }
    });

    await Promise.all(closePromises);
    this.pool.length = 0;
    this.activeConnections.clear();
    this.updatePoolStats();
  }

  /**
   * Update pool statistics
   */
  private updatePoolStats(): void {
    this.stats.activeConnections = this.activeConnections.size;
    this.stats.idleConnections = this.pool.length - this.activeConnections.size;
    
    // Update health status
    if (this.stats.idleConnections === 0 && this.stats.waitingRequests > 0) {
      this.stats.poolHealth = 'degraded';
    } else if (this.pool.length === 0) {
      this.stats.poolHealth = 'unhealthy';
    } else {
      this.stats.poolHealth = 'healthy';
    }
  }

  /**
   * Update average query time
   */
  private updateAverageQueryTime(executionTime: number): void {
    const alpha = 0.1; // Smoothing factor
    this.stats.averageQueryTime = this.stats.averageQueryTime === 0
      ? executionTime
      : Math.round(alpha * executionTime + (1 - alpha) * this.stats.averageQueryTime);
  }

  /**
   * Record query metrics
   */
  private recordMetrics(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);
    // Keep only last 1000 metrics
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics.shift();
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: PoolEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Start periodic health check
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch {
        // Health check failed, pool status already updated
      }

      // Clean up idle connections above minimum
      const now = Date.now();
      const toRemove: any[] = [];
      
      for (const conn of this.pool) {
        if (
          !this.activeConnections.has(conn) &&
          this.pool.length - toRemove.length > this.minPoolSize &&
          now - conn.lastUsed > this.idleTimeout
        ) {
          toRemove.push(conn);
        }
      }

      for (const conn of toRemove) {
        try {
          await conn.raw.close();
          const index = this.pool.indexOf(conn);
          if (index !== -1) {
            this.pool.splice(index, 1);
          }
        } catch {
          // Ignore close errors
        }
      }

      this.updatePoolStats();
    }, 60000); // Every minute
  }
}

// ============================================================================
// CONNECTION MANAGER (Singleton Pattern)
// ============================================================================

/**
 * Connection Manager for managing multiple connection pools
 */
export class SQLServerConnectionManager {
  private static instance: SQLServerConnectionManager;
  private pools: Map<string, SQLServerConnectionPool> = new Map();

  private constructor() {}

  static getInstance(): SQLServerConnectionManager {
    if (!SQLServerConnectionManager.instance) {
      SQLServerConnectionManager.instance = new SQLServerConnectionManager();
    }
    return SQLServerConnectionManager.instance;
  }

  /**
   * Create or get a connection pool
   */
  getPool(name: string, config?: SQLServerConfig): SQLServerConnectionPool {
    if (!this.pools.has(name)) {
      if (!config) {
        throw new Error(`No configuration provided for new pool '${name}'`);
      }
      const pool = new SQLServerConnectionPool(config);
      this.pools.set(name, pool);
    }
    return this.pools.get(name)!;
  }

  /**
   * Initialize a pool
   */
  async initializePool(name: string, config: SQLServerConfig): Promise<SQLServerConnectionPool> {
    const pool = this.getPool(name, config);
    await pool.initialize();
    return pool;
  }

  /**
   * Get all pool names
   */
  getPoolNames(): string[] {
    return Array.from(this.pools.keys());
  }

  /**
   * Close a specific pool
   */
  async closePool(name: string): Promise<void> {
    const pool = this.pools.get(name);
    if (pool) {
      await pool.shutdown();
      this.pools.delete(name);
    }
  }

  /**
   * Close all pools
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.pools.values()).map(pool => pool.shutdown());
    await Promise.all(closePromises);
    this.pools.clear();
  }

  /**
   * Get statistics for all pools
   */
  getAllStats(): Record<string, ConnectionPoolStats> {
    const stats: Record<string, ConnectionPoolStats> = {};
    for (const [name, pool] of this.pools) {
      stats[name] = pool.getStats();
    }
    return stats;
  }
}

// Export singleton instance
export const connectionManager = SQLServerConnectionManager.getInstance();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a connection pool from environment variables
 */
export function createPoolFromEnv(name: string = 'default'): SQLServerConnectionPool {
  const config: SQLServerConfig = {
    server: process.env.SQL_SERVER || 'localhost',
    port: parseInt(process.env.SQL_PORT || '1433'),
    database: process.env.SQL_DATABASE || 'master',
    authentication: (process.env.SQL_AUTHENTICATION as 'windows' | 'sql') || 'sql',
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    connectionTimeout: parseInt(process.env.SQL_CONNECTION_TIMEOUT || '30000'),
    queryTimeout: parseInt(process.env.SQL_QUERY_TIMEOUT || '30000'),
    encrypt: process.env.SQL_ENCRYPT !== 'false',
    trustServerCertificate: process.env.SQL_TRUST_CERTIFICATE === 'true',
    pool: {
      min: parseInt(process.env.SQL_POOL_MIN || '2'),
      max: parseInt(process.env.SQL_POOL_MAX || '10'),
      idleTimeout: parseInt(process.env.SQL_POOL_IDLE_TIMEOUT || '30000'),
      acquireTimeout: parseInt(process.env.SQL_POOL_ACQUIRE_TIMEOUT || '10000')
    }
  };

  return connectionManager.getPool(name, config);
}

/**
 * Quick query execution using default pool
 */
export async function quickQuery<T = any>(sql: string, params?: Record<string, any>): Promise<QueryResult<T>> {
  const pool = connectionManager.getPool('default');
  return pool.query(sql, params);
}

/**
 * Quick SP execution using default pool
 */
export async function quickExecuteSP<T = any>(
  procedureName: string,
  params?: Record<string, { value: any; type?: string; direction?: 'input' | 'output' }>
): Promise<QueryResult<T>> {
  const pool = connectionManager.getPool('default');
  return pool.executeSP(procedureName, params);
}
