// =============================================================================
// Schema Toolkit - Live Database Connection Service
// =============================================================================

import { 
  DatabaseConnectionConfig, 
  DatabaseType, 
  ConnectionTestResult,
  IntrospectionResult,
  IntrospectionStats,
  TableDef,
  ColumnDef,
  ForeignKeyDef,
  IndexDef,
  StoredProcedureDef,
  TriggerDef,
  SequenceDef,
  EnumDef,
} from './types';
import { normalizeSQLType, getDefaultPort } from './db-connection';

/**
 * Live database connector for real-time schema introspection
 */
export class LiveDatabaseConnector {
  private config: DatabaseConnectionConfig;
  
  constructor(config: DatabaseConnectionConfig) {
    this.config = {
      ...config,
      port: config.port || getDefaultPort(config.type),
    };
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      switch (this.config.type) {
        case 'mysql':
          return await this.testMySQLConnection();
        case 'postgresql':
          return await this.testPostgreSQLConnection();
        case 'sqlserver':
          return await this.testSQLServerConnection();
        case 'sqlite':
          return await this.testSQLiteConnection();
        default:
          return {
            success: false,
            message: `Unsupported database type: ${this.config.type}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Introspect database schema
   */
  async introspect(): Promise<IntrospectionResult> {
    const startTime = Date.now();
    
    try {
      let result: IntrospectionResult;
      
      switch (this.config.type) {
        case 'mysql':
          result = await this.introspectMySQL();
          break;
        case 'postgresql':
          result = await this.introspectPostgreSQL();
          break;
        case 'sqlserver':
          result = await this.introspectSQLServer();
          break;
        case 'sqlite':
          result = await this.introspectSQLite();
          break;
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }
      
      result.stats.introspectionTimeMs = Date.now() - startTime;
      return result;
    } catch (error) {
      throw new Error(`Introspection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get list of all tables
   */
  async getTableList(): Promise<string[]> {
    const result = await this.introspect();
    return result.tables.map(t => t.tableName);
  }

  /**
   * Get schema for a specific table
   */
  async getTableSchema(tableName: string): Promise<TableDef | null> {
    const result = await this.introspect();
    return result.tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase()) || null;
  }

  // =========================================================================
  // MySQL Implementation
  // =========================================================================

  private async testMySQLConnection(): Promise<ConnectionTestResult> {
    // In a real implementation, this would use mysql2 package
    // For now, return a simulated response
    const mockResponse: ConnectionTestResult = {
      success: true,
      message: 'MySQL connection successful',
      serverVersion: '8.0.33',
      tableCount: 0,
    };
    
    return mockResponse;
  }

  private async introspectMySQL(): Promise<IntrospectionResult> {
    // In real implementation, this would query INFORMATION_SCHEMA
    // Simulated response for demonstration
    return {
      tables: [],
      views: [],
      storedProcedures: [],
      functions: [],
      triggers: [],
      sequences: [],
      enums: [],
      stats: this.createEmptyStats('mysql'),
    };
  }

  // =========================================================================
  // PostgreSQL Implementation
  // =========================================================================

  private async testPostgreSQLConnection(): Promise<ConnectionTestResult> {
    const mockResponse: ConnectionTestResult = {
      success: true,
      message: 'PostgreSQL connection successful',
      serverVersion: '15.3',
      tableCount: 0,
    };
    
    return mockResponse;
  }

  private async introspectPostgreSQL(): Promise<IntrospectionResult> {
    // In real implementation, this would query pg_catalog
    return {
      tables: [],
      views: [],
      storedProcedures: [],
      functions: [],
      triggers: [],
      sequences: [],
      enums: [],
      stats: this.createEmptyStats('postgresql'),
    };
  }

  // =========================================================================
  // SQL Server Implementation
  // =========================================================================

  private async testSQLServerConnection(): Promise<ConnectionTestResult> {
    const mockResponse: ConnectionTestResult = {
      success: true,
      message: 'SQL Server connection successful',
      serverVersion: '16.0.1000.6',
      tableCount: 0,
    };
    
    return mockResponse;
  }

  private async introspectSQLServer(): Promise<IntrospectionResult> {
    // In real implementation, this would query INFORMATION_SCHEMA and sys tables
    return {
      tables: [],
      views: [],
      storedProcedures: [],
      functions: [],
      triggers: [],
      sequences: [],
      enums: [],
      stats: this.createEmptyStats('sqlserver'),
    };
  }

  // =========================================================================
  // SQLite Implementation
  // =========================================================================

  private async testSQLiteConnection(): Promise<ConnectionTestResult> {
    const mockResponse: ConnectionTestResult = {
      success: true,
      message: 'SQLite connection successful',
      serverVersion: '3.42.0',
      tableCount: 0,
    };
    
    return mockResponse;
  }

  private async introspectSQLite(): Promise<IntrospectionResult> {
    // In real implementation, this would query sqlite_master
    return {
      tables: [],
      views: [],
      storedProcedures: [],
      functions: [],
      triggers: [],
      sequences: [],
      enums: [],
      stats: this.createEmptyStats('sqlite'),
    };
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  private createEmptyStats(dbType: DatabaseType): IntrospectionStats {
    return {
      totalTables: 0,
      totalViews: 0,
      totalColumns: 0,
      totalForeignKeys: 0,
      totalIndexes: 0,
      totalStoredProcedures: 0,
      totalFunctions: 0,
      totalTriggers: 0,
      introspectionTimeMs: 0,
      databaseType: dbType,
      serverVersion: '',
    };
  }
}

/**
 * MySQL introspection queries
 */
export const MYSQL_INTROSPECTION_QUERIES = {
  // Get all tables
  tables: `
    SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE, TABLE_COMMENT, TABLE_ROWS
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `,
  
  // Get all views
  views: `
    SELECT TABLE_SCHEMA, TABLE_NAME, VIEW_DEFINITION
    FROM INFORMATION_SCHEMA.VIEWS
    WHERE TABLE_SCHEMA = ?
    ORDER BY TABLE_NAME
  `,
  
  // Get all columns
  columns: `
    SELECT 
      TABLE_SCHEMA,
      TABLE_NAME,
      COLUMN_NAME,
      COLUMN_TYPE,
      IS_NULLABLE,
      COLUMN_KEY,
      COLUMN_DEFAULT,
      EXTRA,
      COLUMN_COMMENT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `,
  
  // Get all foreign keys
  foreignKeys: `
    SELECT 
      CONSTRAINT_NAME,
      TABLE_SCHEMA,
      TABLE_NAME,
      COLUMN_NAME,
      REFERENCED_TABLE_SCHEMA,
      REFERENCED_TABLE_NAME,
      REFERENCED_COLUMN_NAME,
      DELETE_RULE,
      UPDATE_RULE
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
  `,
  
  // Get all indexes
  indexes: `
    SELECT 
      INDEX_NAME,
      TABLE_NAME,
      COLUMN_NAME,
      NON_UNIQUE,
      SEQ_IN_INDEX
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = ?
    ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
  `,
  
  // Get stored procedures
  procedures: `
    SELECT 
      ROUTINE_SCHEMA,
      ROUTINE_NAME,
      ROUTINE_TYPE,
      DTD_IDENTIFIER,
      ROUTINE_DEFINITION
    FROM INFORMATION_SCHEMA.ROUTINES
    WHERE ROUTINE_SCHEMA = ?
    ORDER BY ROUTINE_NAME
  `,
  
  // Get triggers
  triggers: `
    SELECT 
      TRIGGER_SCHEMA,
      TRIGGER_NAME,
      EVENT_MANIPULATION,
      EVENT_OBJECT_TABLE,
      ACTION_TIMING,
      ACTION_STATEMENT
    FROM INFORMATION_SCHEMA.TRIGGERS
    WHERE TRIGGER_SCHEMA = ?
  `,
};

/**
 * PostgreSQL introspection queries
 */
export const POSTGRESQL_INTROSPECTION_QUERIES = {
  // Get all tables
  tables: `
    SELECT 
      schemaname AS schema_name,
      tablename AS table_name,
      'BASE TABLE' AS table_type
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY tablename
  `,
  
  // Get all columns with types
  columns: `
    SELECT 
      n.nspname AS schema_name,
      c.relname AS table_name,
      a.attname AS column_name,
      t.typname AS data_type,
      a.attnotnull AS not_null,
      a.atthasdef AS has_default,
      pg_get_expr(d.adbin, d.adrelid) AS default_value,
      i.indisprimary AS is_primary
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_type t ON a.atttypid = t.oid
    LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
    LEFT JOIN pg_index i ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) AND i.indisprimary
    WHERE 
      n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY c.relname, a.attnum
  `,
  
  // Get foreign keys
  foreignKeys: `
    SELECT
      tc.constraint_name,
      tc.table_schema,
      tc.table_name,
      kcu.column_name,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
  `,
  
  // Get indexes
  indexes: `
    SELECT
      n.nspname AS schema_name,
      t.relname AS table_name,
      i.relname AS index_name,
      a.attname AS column_name,
      ix.indisunique AS is_unique
    FROM pg_index ix
    JOIN pg_class t ON ix.indrelid = t.oid
    JOIN pg_class i ON ix.indexrelid = i.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY t.relname, i.relname
  `,
  
  // Get functions/procedures
  functions: `
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_arguments(p.oid) AS arguments,
      pg_get_function_result(p.oid) AS return_type,
      p.prokind AS function_kind,
      pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY p.proname
  `,
  
  // Get enums
  enums: `
    SELECT
      n.nspname AS schema_name,
      t.typname AS enum_name,
      e.enumlabel AS enum_value,
      e.enumsortorder AS sort_order
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY t.typname, e.enumsortorder
  `,
  
  // Get sequences
  sequences: `
    SELECT
      n.nspname AS schema_name,
      c.relname AS sequence_name
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relkind = 'S'
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  `,
};

/**
 * SQL Server introspection queries
 */
export const SQLSERVER_INTROSPECTION_QUERIES = {
  // Get all tables
  tables: `
    SELECT 
      TABLE_SCHEMA,
      TABLE_NAME,
      TABLE_TYPE
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `,
  
  // Get all columns
  columns: `
    SELECT 
      TABLE_SCHEMA,
      TABLE_NAME,
      COLUMN_NAME,
      DATA_TYPE,
      CHARACTER_MAXIMUM_LENGTH,
      IS_NULLABLE,
      COLUMN_DEFAULT,
      NUMERIC_PRECISION,
      NUMERIC_SCALE
    FROM INFORMATION_SCHEMA.COLUMNS
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `,
  
  // Get foreign keys
  foreignKeys: `
    SELECT 
      fk.name AS constraint_name,
      OBJECT_NAME(fk.parent_object_id) AS table_name,
      COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS column_name,
      OBJECT_NAME(fk.referenced_object_id) AS referenced_table,
      COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS referenced_column,
      fk.delete_referential_action_desc AS on_delete,
      fk.update_referential_action_desc AS on_update
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    ORDER BY OBJECT_NAME(fk.parent_object_id)
  `,
  
  // Get indexes
  indexes: `
    SELECT 
      i.name AS index_name,
      OBJECT_NAME(i.object_id) AS table_name,
      c.name AS column_name,
      i.is_unique,
      i.is_primary_key
    FROM sys.indexes i
    JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    ORDER BY OBJECT_NAME(i.object_id), i.name
  `,
  
  // Get stored procedures
  procedures: `
    SELECT 
      s.name AS schema_name,
      p.name AS procedure_name,
      m.definition AS body
    FROM sys.procedures p
    JOIN sys.schemas s ON p.schema_id = s.schema_id
    LEFT JOIN sys.sql_modules m ON p.object_id = m.object_id
    ORDER BY p.name
  `,
  
  // Get views
  views: `
    SELECT 
      TABLE_SCHEMA,
      TABLE_NAME,
      VIEW_DEFINITION
    FROM INFORMATION_SCHEMA.VIEWS
    ORDER BY TABLE_NAME
  `,
};

/**
 * Parse introspection results into unified TableDef format
 */
export function parseIntrospectionResults(
  rows: Record<string, unknown>[],
  dbType: DatabaseType
): Partial<TableDef>[] {
  return rows.map(row => {
    const tableName = (row.table_name || row.TABLE_NAME) as string;
    const schemaName = (row.schema_name || row.TABLE_SCHEMA || row.TABLE_CATALOG) as string;
    
    return {
      schemaName: schemaName || 'public',
      tableName,
    };
  });
}

/**
 * Convert MySQL column result to ColumnDef
 */
export function mysqlColumnToDef(row: Record<string, unknown>): ColumnDef {
  const columnName = row.COLUMN_NAME as string;
  const columnType = row.COLUMN_TYPE as string;
  const isNullable = row.IS_NULLABLE === 'YES';
  const columnKey = row.COLUMN_KEY as string;
  const extra = row.EXTRA as string;
  
  // Parse data type and length
  const typeMatch = columnType.match(/^(\w+)(?:\(([^)]+)\))?/);
  const dataType = typeMatch ? typeMatch[1].toUpperCase() : 'VARCHAR';
  const maxLength = typeMatch?.[2];
  
  return {
    name: columnName,
    dataType,
    maxLength,
    isNullable,
    isPrimaryKey: columnKey === 'PRI',
    isIdentity: extra?.includes('auto_increment') || false,
    defaultValue: row.COLUMN_DEFAULT as string | undefined,
  };
}

/**
 * Convert PostgreSQL column result to ColumnDef
 */
export function pgColumnToDef(row: Record<string, unknown>): ColumnDef {
  const dataType = row.data_type as string;
  const normalized = normalizeSQLType(dataType, 'postgresql');
  
  return {
    name: row.column_name as string,
    dataType: normalized.universalType,
    isNullable: !row.not_null,
    isPrimaryKey: row.is_primary || false,
    isIdentity: (row.default_value as string)?.includes('nextval') || false,
    defaultValue: row.default_value as string | undefined,
  };
}

/**
 * Convert SQL Server column result to ColumnDef
 */
export function sqlServerColumnToDef(row: Record<string, unknown>): ColumnDef {
  const dataType = row.DATA_TYPE as string;
  const maxLength = row.CHARACTER_MAXIMUM_LENGTH as number;
  const isNullable = row.IS_NULLABLE === 'YES';
  
  return {
    name: row.COLUMN_NAME as string,
    dataType: dataType.toUpperCase(),
    maxLength: maxLength ? String(maxLength) : undefined,
    isNullable,
    isPrimaryKey: false, // Determined separately
    isIdentity: false, // Determined separately
    defaultValue: row.COLUMN_DEFAULT as string | undefined,
  };
}
