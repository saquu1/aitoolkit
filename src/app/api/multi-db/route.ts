// =============================================================================
// Schema Toolkit - Multi-Database Parser API Route
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { parseSqlServer } from '@/lib/sql-parser';
import { parseMySQL } from '@/lib/mysql-parser';
import { parsePostgreSQL } from '@/lib/postgresql-parser';
import { 
  detectDatabaseType, 
  type DatabaseType,
  type DatabaseConnectionConfig,
} from '@/lib/db-connection';
import { LiveDatabaseConnector } from '@/lib/live-db-connector';

/**
 * POST /api/multi-db
 * Parse DDL from multiple database types or manage live connections
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    switch (action) {
      case 'parse':
        return await handleParse(data);
      case 'detect':
        return await handleDetect(data);
      case 'test-connection':
        return await handleTestConnection(data);
      case 'introspect':
        return await handleIntrospect(data);
      case 'get-tables':
        return await handleGetTables(data);
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Multi-DB API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Parse DDL with explicit or auto-detected database type
 */
async function handleParse(data: {
  ddl: string;
  dbType?: DatabaseType;
  autoDetect?: boolean;
}) {
  const { ddl, dbType, autoDetect = true } = data;

  if (!ddl) {
    return NextResponse.json(
      { error: 'DDL is required' },
      { status: 400 }
    );
  }

  // Auto-detect or use specified database type
  const detectedType = autoDetect ? detectDatabaseType(ddl) : null;
  const effectiveType = dbType || detectedType || 'sqlserver';

  // Parse based on database type
  let result;
  const startTime = Date.now();

  switch (effectiveType) {
    case 'mysql':
      result = parseMySQL(ddl);
      break;
    case 'postgresql':
      result = parsePostgreSQL(ddl);
      break;
    case 'sqlserver':
    default:
      result = parseSqlServer(ddl);
      break;
  }

  // Add detection info
  const response = {
    ...result,
    meta: {
      requestedType: dbType || null,
      detectedType,
      effectiveType,
      parseTimeMs: Date.now() - startTime,
      inputLength: ddl.length,
      inputLines: ddl.split('\n').length,
    },
  };

  return NextResponse.json(response);
}

/**
 * Detect database type from DDL content
 */
async function handleDetect(data: { ddl: string }) {
  const { ddl } = data;

  if (!ddl) {
    return NextResponse.json(
      { error: 'DDL is required' },
      { status: 400 }
    );
  }

  const detectedType = detectDatabaseType(ddl);

  // Get confidence indicators
  const indicators = getDetectionIndicators(ddl);

  return NextResponse.json({
    detectedType,
    confidence: indicators.confidence,
    indicators: indicators.matches,
    suggestedParser: detectedType,
  });
}

/**
 * Test database connection
 */
async function handleTestConnection(data: {
  config: DatabaseConnectionConfig;
}) {
  const { config } = data;

  if (!config || !config.type || !config.database) {
    return NextResponse.json(
      { error: 'Connection config with type and database are required' },
      { status: 400 }
    );
  }

  try {
    const connector = new LiveDatabaseConnector(config);
    const result = await connector.testConnection();

    return NextResponse.json({
      success: result.success,
      message: result.message,
      serverVersion: result.serverVersion,
      tableCount: result.tableCount,
      databaseSize: result.databaseSize,
      connectionId: generateConnectionId(config),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    });
  }
}

/**
 * Introspect database schema from live connection
 */
async function handleIntrospect(data: {
  config: DatabaseConnectionConfig;
  tables?: string[];
}) {
  const { config, tables } = data;

  if (!config || !config.type || !config.database) {
    return NextResponse.json(
      { error: 'Connection config with type and database are required' },
      { status: 400 }
    );
  }

  try {
    const connector = new LiveDatabaseConnector(config);
    const result = await connector.introspect();

    // Filter tables if specific ones requested
    if (tables && tables.length > 0) {
      result.tables = result.tables.filter(t =>
        tables.some(name => name.toLowerCase() === t.tableName.toLowerCase())
      );
    }

    return NextResponse.json({
      tables: result.tables,
      views: result.views,
      storedProcedures: result.storedProcedures,
      functions: result.functions,
      triggers: result.triggers,
      sequences: result.sequences,
      enums: result.enums,
      stats: result.stats,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Introspection failed',
    }, { status: 500 });
  }
}

/**
 * Get list of tables from live database
 */
async function handleGetTables(data: {
  config: DatabaseConnectionConfig;
}) {
  const { config } = data;

  if (!config || !config.type || !config.database) {
    return NextResponse.json(
      { error: 'Connection config with type and database are required' },
      { status: 400 }
    );
  }

  try {
    const connector = new LiveDatabaseConnector(config);
    const tableList = await connector.getTableList();

    return NextResponse.json({
      tables: tableList,
      count: tableList.length,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to get tables',
    }, { status: 500 });
  }
}

/**
 * Get database type detection indicators
 */
function getDetectionIndicators(ddl: string): {
  confidence: number;
  matches: Record<string, string[]>;
} {
  const upperDDL = ddl.toUpperCase();
  const matches: Record<string, string[]> = {
    sqlserver: [],
    mysql: [],
    postgresql: [],
    sqlite: [],
  };

  // SQL Server indicators
  const sqlServerPatterns = [
    { pattern: 'UNIQUEIDENTIFIER', name: 'UNIQUEIDENTIFIER type' },
    { pattern: 'NVARCHAR', name: 'NVARCHAR type' },
    { pattern: 'NCHAR', name: 'NCHAR type' },
    { pattern: '[DBO].', name: 'dbo schema bracket notation' },
    { pattern: 'IDENTITY(1,1)', name: 'IDENTITY(1,1) syntax' },
    { pattern: 'GETDATE()', name: 'GETDATE() function' },
    { pattern: 'NEWID()', name: 'NEWID() function' },
    { pattern: 'GO\n', name: 'GO batch separator' },
  ];

  for (const { pattern, name } of sqlServerPatterns) {
    if (upperDDL.includes(pattern)) {
      matches.sqlserver.push(name);
    }
  }

  // MySQL indicators
  const mysqlPatterns = [
    { pattern: 'AUTO_INCREMENT', name: 'AUTO_INCREMENT' },
    { pattern: 'ENGINE=', name: 'ENGINE clause' },
    { pattern: 'TINYINT(1)', name: 'TINYINT(1) boolean' },
    { pattern: 'MEDIUMTEXT', name: 'MEDIUMTEXT type' },
    { pattern: 'LONGTEXT', name: 'LONGTEXT type' },
  ];

  for (const { pattern, name } of mysqlPatterns) {
    if (upperDDL.includes(pattern)) {
      matches.mysql.push(name);
    }
  }

  // Check for backtick quoting (MySQL specific)
  if (ddl.includes('`')) {
    matches.mysql.push('Backtick quoting');
  }

  // PostgreSQL indicators
  const pgPatterns = [
    { pattern: 'SERIAL', name: 'SERIAL type' },
    { pattern: 'BIGSERIAL', name: 'BIGSERIAL type' },
    { pattern: 'BYTEA', name: 'BYTEA type' },
    { pattern: 'TIMESTAMPTZ', name: 'TIMESTAMPTZ type' },
    { pattern: 'JSONB', name: 'JSONB type' },
    { pattern: 'RETURNING', name: 'RETURNING clause' },
    { pattern: 'CREATE TYPE', name: 'CREATE TYPE statement' },
  ];

  for (const { pattern, name } of pgPatterns) {
    if (upperDDL.includes(pattern)) {
      matches.postgresql.push(name);
    }
  }

  // SQLite indicators
  const sqlitePatterns = [
    { pattern: 'AUTOINCREMENT', name: 'AUTOINCREMENT' },
    { pattern: 'WITHOUT ROWID', name: 'WITHOUT ROWID' },
  ];

  for (const { pattern, name } of sqlitePatterns) {
    if (upperDDL.includes(pattern)) {
      matches.sqlite.push(name);
    }
  }

  // Calculate confidence
  const counts = {
    sqlserver: matches.sqlserver.length,
    mysql: matches.mysql.length,
    postgresql: matches.postgresql.length,
    sqlite: matches.sqlite.length,
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const max = Math.max(...Object.values(counts));
  
  const confidence = total > 0 ? Math.round((max / total) * 100) : 0;

  return { confidence, matches };
}

/**
 * Generate a unique connection ID
 */
function generateConnectionId(config: DatabaseConnectionConfig): string {
  const hash = Buffer.from(JSON.stringify({
    type: config.type,
    host: config.host,
    port: config.port,
    database: config.database,
    schema: config.schema,
  })).toString('base64').slice(0, 16);
  
  return `conn_${config.type}_${hash}`;
}

/**
 * GET /api/multi-db
 * Get supported database types and capabilities
 */
export async function GET() {
  return NextResponse.json({
    supportedTypes: [
      {
        type: 'sqlserver',
        name: 'Microsoft SQL Server',
        version: '2008+',
        features: ['ddl', 'stored-procedures', 'views', 'functions', 'triggers'],
        connectionSupported: true,
        defaultPort: 1433,
      },
      {
        type: 'mysql',
        name: 'MySQL',
        version: '5.7+',
        features: ['ddl', 'stored-procedures', 'views', 'functions', 'triggers'],
        connectionSupported: true,
        defaultPort: 3306,
      },
      {
        type: 'postgresql',
        name: 'PostgreSQL',
        version: '12+',
        features: ['ddl', 'stored-procedures', 'views', 'functions', 'triggers', 'enums', 'arrays', 'json'],
        connectionSupported: true,
        defaultPort: 5432,
      },
      {
        type: 'sqlite',
        name: 'SQLite',
        version: '3.x',
        features: ['ddl', 'views', 'triggers'],
        connectionSupported: true,
        defaultPort: null,
      },
    ],
    capabilities: {
      autoDetect: true,
      liveIntrospection: true,
      multiSource: true,
      realTimeAnalysis: true,
    },
  });
}
