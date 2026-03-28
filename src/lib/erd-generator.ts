// =============================================================================
// Schema Toolkit - ERD Diagram Generator (Mermaid.js)
// =============================================================================

import { TableDef, ColumnDef, ForeignKeyDef } from './types';

/**
 * ERD diagram configuration
 */
export interface ERDConfig {
  showColumnTypes: boolean;
  showPrimaryKey: boolean;
  showForeignKey: boolean;
  showNullability: boolean;
  maxColumnsPerTable: number;
  groupBySchema: boolean;
  highlightMissingTables: boolean;
}

const DEFAULT_CONFIG: ERDConfig = {
  showColumnTypes: true,
  showPrimaryKey: true,
  showForeignKey: true,
  showNullability: false,
  maxColumnsPerTable: 20,
  groupBySchema: false,
  highlightMissingTables: true,
};

/**
 * Generate Mermaid ERD diagram
 */
export function generateERD(
  tables: TableDef[],
  config: Partial<ERDConfig> = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const lines: string[] = [];

  lines.push('erDiagram');

  // Track all referenced tables
  const allTableNames = new Set(tables.map((t) => t.tableName));
  const referencedTables = new Set<string>();

  // Collect all referenced tables from FKs
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      referencedTables.add(fk.referencesTable);
    }
  }

  // Find missing tables
  const missingTables = new Set<string>();
  for (const refTable of referencedTables) {
    if (!allTableNames.has(refTable)) {
      missingTables.add(refTable);
    }
  }

  // Generate table definitions
  for (const table of tables) {
    const tableId = sanitizeName(table.tableName);
    lines.push(`  ${tableId} {`);

    // Limit columns if specified
    const cols = table.columns.slice(0, cfg.maxColumnsPerTable);

    for (const col of cols) {
      const parts: string[] = [];

      // Type
      if (cfg.showColumnTypes) {
        parts.push(formatDataType(col.dataType, col.maxLength));
      } else {
        parts.push('field');
      }

      // Column name
      parts.push(sanitizeName(col.name));

      // Markers
      const markers: string[] = [];
      if (cfg.showPrimaryKey && col.isPrimaryKey) {
        markers.push('PK');
      }
      if (cfg.showForeignKey && isFKColumn(table, col.name)) {
        markers.push('FK');
      }
      if (cfg.showNullability && !col.isNullable) {
        markers.push('NOT_NULL');
      }

      if (markers.length > 0) {
        parts.push(markers.join(','));
      }

      lines.push(`    ${parts.join(' ')}`);
    }

    // Indicate if columns were truncated
    if (table.columns.length > cfg.maxColumnsPerTable) {
      const remaining = table.columns.length - cfg.maxColumnsPerTable;
      lines.push(`    string _${remaining}_more_columns`);
    }

    lines.push(`  }`);
  }

  // Add missing table placeholders
  if (cfg.highlightMissingTables && missingTables.size > 0) {
    lines.push('');
    lines.push('  %% ─── Missing Tables (FK References) ───');

    for (const missingTable of missingTables) {
      const tableId = sanitizeName(missingTable);
      lines.push(`  ${tableId} {`);
      lines.push(`    string _MISSING_TABLE_`);
      lines.push(`  }`);
    }
  }

  lines.push('');

  // Generate relationships
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      const fromTable = sanitizeName(fk.referencesTable);
      const toTable = sanitizeName(table.tableName);

      // Check if referenced table exists
      const refExists = allTableNames.has(fk.referencesTable);

      // Cardinality
      const col = table.columns.find(
        (c) => c.name.toLowerCase() === fk.columnName.toLowerCase()
      );
      const isNullable = col?.isNullable ?? true;

      // Mermaid relationship notation
      // ||--o{ : one-to-many (required parent, optional child)
      // |o--o{ : one-to-many (optional parent, optional child)
      // ||--|{ : one-to-many (required both)
      const parentCard = refExists ? '||' : '|X';
      const childCard = isNullable ? 'o{' : '|{';

      lines.push(
        `  ${fromTable} ${parentCard}--${childCard} ${toTable} : "${sanitizeName(fk.columnName)}"`
      );
    }
  }

  // Add styling for missing tables
  if (cfg.highlightMissingTables && missingTables.size > 0) {
    lines.push('');
    lines.push('  %% ─── Styling ───');

    for (const missingTable of missingTables) {
      const tableId = sanitizeName(missingTable);
      lines.push(`  style ${tableId} fill:#ffcccc,stroke:#ff0000`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate ERD grouped by module
 */
export function generateERDByModule(
  tables: TableDef[],
  moduleMap: Record<string, string[]>
): { moduleName: string; erd: string }[] {
  const results: { moduleName: string; erd: string }[] = [];

  for (const [moduleName, tableNames] of Object.entries(moduleMap)) {
    const moduleTables = tables.filter((t) =>
      tableNames.some(
        (name) => name.toLowerCase() === t.tableName.toLowerCase()
      )
    );

    if (moduleTables.length > 0) {
      results.push({
        moduleName,
        erd: generateERD(moduleTables, { highlightMissingTables: false }),
      });
    }
  }

  return results;
}

/**
 * Generate ERD with pagination for large schemas
 */
export function generatePaginatedERD(
  tables: TableDef[],
  pageSize: number = 15
): { pageNumber: number; erd: string; tableCount: number }[] {
  const pages: { pageNumber: number; erd: string; tableCount: number }[] = [];

  for (let i = 0; i < tables.length; i += pageSize) {
    const chunk = tables.slice(i, i + pageSize);
    pages.push({
      pageNumber: Math.floor(i / pageSize) + 1,
      erd: generateERD(chunk),
      tableCount: chunk.length,
    });
  }

  return pages;
}

/**
 * Generate focused ERD for specific table and its relations
 */
export function generateFocusedERD(
  tables: TableDef[],
  focusTable: string,
  depth: number = 1
): string {
  const focusTableLower = focusTable.toLowerCase();
  const includedTables = new Set<string>([focusTableLower]);

  // Find tables to include based on depth
  for (let d = 0; d < depth; d++) {
    const currentTables = [...includedTables];

    for (const tableName of currentTables) {
      const table = tables.find(
        (t) => t.tableName.toLowerCase() === tableName.toLowerCase()
      );

      if (table) {
        // Add tables this table references
        for (const fk of table.foreignKeys) {
          includedTables.add(fk.referencesTable.toLowerCase());
        }

        // Add tables that reference this table
        for (const t of tables) {
          for (const fk of t.foreignKeys) {
            if (fk.referencesTable.toLowerCase() === tableName.toLowerCase()) {
              includedTables.add(t.tableName.toLowerCase());
            }
          }
        }
      }
    }
  }

  // Filter to included tables
  const filteredTables = tables.filter((t) =>
    includedTables.has(t.tableName.toLowerCase())
  );

  const erd = generateERD(filteredTables);

  // Add focus table styling
  const lines = erd.split('\n');
  lines.push('');
  lines.push(`  %% Focus: ${focusTable}`);
  lines.push(`  style ${sanitizeName(focusTable)} fill:#e6f3ff,stroke:#0066cc`);

  return lines.join('\n');
}

/**
 * Generate data flow diagram (flowchart)
 */
export function generateDataFlowDiagram(tables: TableDef[]): string {
  const lines: string[] = [];

  lines.push('flowchart TD');

  // Group tables by type
  const masterTables = tables.filter((t) => t.foreignKeys.length === 0);
  const transactionTables = tables.filter(
    (t) => t.foreignKeys.length > 0 && t.columns.some((c) => c.dataType === 'DATETIME' || c.dataType === 'DATETIME2')
  );
  const lookupTables = tables.filter(
    (t) =>
      t.foreignKeys.length === 0 &&
      t.columns.length <= 5 &&
      t.tableName.toLowerCase().includes('type') ||
      t.tableName.toLowerCase().includes('category') ||
      t.tableName.toLowerCase().includes('status')
  );

  // Master tables subgraph
  if (masterTables.length > 0) {
    lines.push('  subgraph Masters["🏛️ Master Tables"]');
    for (const t of masterTables) {
      lines.push(`    ${sanitizeName(t.tableName)}["${t.tableName}<br/>${t.columns.length} cols"]`);
    }
    lines.push('  end');
  }

  // Transaction tables subgraph
  if (transactionTables.length > 0) {
    lines.push('');
    lines.push('  subgraph Transactions["📝 Transaction Tables"]');
    for (const t of transactionTables) {
      lines.push(`    ${sanitizeName(t.tableName)}["${t.tableName}<br/>${t.columns.length} cols"]`);
    }
    lines.push('  end');
  }

  // Lookup tables subgraph
  if (lookupTables.length > 0) {
    lines.push('');
    lines.push('  subgraph Lookups["📋 Lookup Tables"]');
    for (const t of lookupTables) {
      lines.push(`    ${sanitizeName(t.tableName)}["${t.tableName}"]`);
    }
    lines.push('  end');
  }

  // Draw relationships
  lines.push('');
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      lines.push(
        `  ${sanitizeName(fk.referencesTable)} -->|"${fk.columnName}"| ${sanitizeName(table.tableName)}`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Generate schema health diagram
 */
export function generateSchemaHealthDiagram(
  tables: TableDef[],
  healthMetrics: {
    totalTables: number;
    tablesWithPK: number;
    tablesWithFK: number;
    orphanTables: string[];
    missingReferences: string[];
  }
): string {
  const lines: string[] = [];

  lines.push('graph TD');
  lines.push('  A[Schema Health Report]');
  lines.push('');
  lines.push(`  B[Total Tables: ${healthMetrics.totalTables}]`);
  lines.push(`  C[Tables with PK: ${healthMetrics.tablesWithPK}]`);
  lines.push(`  D[Tables with FK: ${healthMetrics.tablesWithFK}]`);
  lines.push(`  E[Orphan Tables: ${healthMetrics.orphanTables.length}]`);
  lines.push(`  F[Missing References: ${healthMetrics.missingReferences.length}]`);
  lines.push('');
  lines.push('  A --> B');
  lines.push('  A --> C');
  lines.push('  A --> D');
  lines.push('  A --> E');
  lines.push('  A --> F');
  lines.push('');

  // Color coding based on health
  const pkPercentage = (healthMetrics.tablesWithPK / healthMetrics.totalTables) * 100;
  const refPercentage = 100 - (healthMetrics.missingReferences.length / Math.max(1, healthMetrics.totalTables) * 100);

  if (pkPercentage >= 90) {
    lines.push('  style C fill:#4ade80');
  } else if (pkPercentage >= 70) {
    lines.push('  style C fill:#fbbf24');
  } else {
    lines.push('  style C fill:#f87171');
  }

  if (refPercentage >= 90) {
    lines.push('  style F fill:#4ade80');
  } else if (refPercentage >= 70) {
    lines.push('  style F fill:#fbbf24');
  } else {
    lines.push('  style F fill:#f87171');
  }

  return lines.join('\n');
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Sanitize name for Mermaid compatibility
 */
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Format data type for display
 */
function formatDataType(dataType: string, maxLength?: string): string {
  const type = dataType.toLowerCase();

  if (maxLength) {
    if (maxLength === 'MAX') {
      return `${type}_max`;
    }
    return `${type}_${maxLength}`;
  }

  return type;
}

/**
 * Check if column is a foreign key
 */
function isFKColumn(table: TableDef, columnName: string): boolean {
  return table.foreignKeys.some(
    (fk) => fk.columnName.toLowerCase() === columnName.toLowerCase()
  );
}

/**
 * Generate table summary for ERD
 */
export function generateTableSummary(table: TableDef): string {
  const pkCount = table.columns.filter((c) => c.isPrimaryKey).length;
  const fkCount = table.foreignKeys.length;
  const nullableCount = table.columns.filter((c) => c.isNullable).length;

  return `Table: ${table.tableName}
Columns: ${table.columns.length}
Primary Keys: ${pkCount}
Foreign Keys: ${fkCount}
Nullable Columns: ${nullableCount}
Schema: ${table.schemaName}`;
}
