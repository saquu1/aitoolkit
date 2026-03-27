// =============================================================================
// Schema Toolkit - Flow Diagram Generator (Mermaid.js)
// =============================================================================

import { TableDef, ColumnDef, ForeignKeyDef } from './types';

/**
 * Generate data flow diagram showing table relationships
 */
export function generateDataFlowDiagram(tables: TableDef[]): string {
  const lines: string[] = [];

  lines.push('flowchart TD');
  lines.push('');

  // Categorize tables
  const masterTables = tables.filter((t) => t.foreignKeys.length === 0);
  const transactionTables = tables.filter((t) => t.foreignKeys.length > 0);

  // Create nodes for master tables
  if (masterTables.length > 0) {
    lines.push('  %% ─── Master Tables ───');
    for (const table of masterTables) {
      const id = sanitizeId(table.tableName);
      const cols = table.columns.length;
      const fks = table.foreignKeys.length;
      lines.push(
        `  ${id}["📋 ${table.tableName}<br/><small>${cols} cols · ${fks} FKs</small>"]`
      );
    }
    lines.push('');
  }

  // Create nodes for transaction tables
  if (transactionTables.length > 0) {
    lines.push('  %% ─── Transaction Tables ───');
    for (const table of transactionTables) {
      const id = sanitizeId(table.tableName);
      const cols = table.columns.length;
      const fks = table.foreignKeys.length;
      lines.push(
        `  ${id}["📝 ${table.tableName}<br/><small>${cols} cols · ${fks} FKs</small>"]`
      );
    }
    lines.push('');
  }

  // Create edges for foreign keys
  lines.push('  %% ─── Relationships ───');
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      const fromId = sanitizeId(fk.referencesTable);
      const toId = sanitizeId(table.tableName);
      const label = truncate(fk.columnName, 15);
      lines.push(`  ${fromId} -->|"${label}"| ${toId}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate CRUD flow diagram for a specific table
 */
export function generateCRUDFlowDiagram(
  tableName: string,
  columns: ColumnDef[]
): string {
  const requiredCols = columns.filter((c) => !c.isNullable && !c.isPrimaryKey);
  const modelName = toPascalSingular(tableName);

  return `flowchart TD
  Start([User Action]) --> Choose{Operation?}

  %% ─── CREATE FLOW ───
  Choose -->|Create| C1[Open ${modelName} Form]
  C1 --> C2[Fill Required Fields]
  C2 --> C2a[${requiredCols.slice(0, 3).map((c) => c.name).join(', ')}...]
  C2a --> C3{Validate Input}
  C3 -->|Valid| C4[Save to ${tableName}]
  C3 -->|Invalid| C5[Show Validation Errors]
  C5 --> C2
  C4 --> Success([✅ Success])

  %% ─── READ FLOW ───
  Choose -->|Read| R1[Fetch ${tableName} List]
  R1 --> R2[Display in Table/Grid]
  R2 --> R3{Action?}
  R3 -->|Search| R4[Apply Filters]
  R4 --> R1
  R3 -->|View| R5[Show ${modelName} Details]
  R3 -->|Sort| R6[Re-order Results]
  R6 --> R2

  %% ─── UPDATE FLOW ───
  Choose -->|Update| U1[Select ${modelName} Record]
  U1 --> U2[Load Edit Form]
  U2 --> U3[Modify Fields]
  U3 --> U4{Validate Changes}
  U4 -->|Valid| U5[Update ${tableName}]
  U4 -->|Invalid| U6[Show Validation Errors]
  U6 --> U3
  U5 --> Success

  %% ─── DELETE FLOW ───
  Choose -->|Delete| D1[Select ${modelName} Record]
  D1 --> D2{Confirm Delete?}
  D2 -->|Yes| D3[Delete from ${tableName}]
  D2 -->|No| D4([Cancelled])
  D3 --> Success

  %% ─── STYLING ───
  style Success fill:#4ade80,stroke:#166534
  style C5 fill:#f87171,stroke:#991b1b
  style U6 fill:#f87171,stroke:#991b1b
  style D4 fill:#fbbf24,stroke:#92400e`;
}

/**
 * Generate module dependency diagram
 */
export function generateModuleDependencyDiagram(
  tables: TableDef[]
): string {
  const lines: string[] = [];

  lines.push('flowchart LR');
  lines.push('');

  // Group tables by their FK depth
  const depths = calculateDepths(tables);
  const maxDepth = Math.max(...Array.from(depths.values()));

  // Create subgraphs for each depth level
  for (let d = 0; d <= maxDepth; d++) {
    const tablesAtDepth = tables.filter(
      (t) => depths.get(t.tableName) === d
    );

    if (tablesAtDepth.length === 0) continue;

    const label = d === 0 ? '🏛️ Foundation' : `📦 Level ${d}`;
    lines.push(`  subgraph L${d}["${label}"]`);

    for (const table of tablesAtDepth) {
      const id = sanitizeId(table.tableName);
      lines.push(`    ${id}["${table.tableName}"]`);
    }

    lines.push('  end');
    lines.push('');
  }

  // Create edges
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      const fromId = sanitizeId(fk.referencesTable);
      const toId = sanitizeId(table.tableName);
      lines.push(`  ${fromId} --> ${toId}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate schema health flow diagram
 */
export function generateSchemaHealthFlow(
  tables: TableDef[],
  healthScore: number
): string {
  const lines: string[] = [];

  lines.push('flowchart TD');
  lines.push('');

  // Calculate health metrics
  const totalTables = tables.length;
  const tablesWithPK = tables.filter((t) =>
    t.columns.some((c) => c.isPrimaryKey)
  ).length;
  const totalFKs = tables.reduce((a, t) => a + t.foreignKeys.length, 0);
  const missingRefs = findMissingReferences(tables).length;

  // Main health node
  const healthColor =
    healthScore >= 80 ? '#4ade80' : healthScore >= 50 ? '#fbbf24' : '#f87171';

  lines.push(`  Health["📊 Schema Health Score<br/><b>${healthScore}/100</b>"]`);
  lines.push('');
  lines.push(`  style Health fill:${healthColor},stroke:#333`);

  // Metrics
  lines.push('  Tables["📋 Tables: ' + totalTables + '"]');
  lines.push('  PKs["🔑 Tables with PK: ' + tablesWithPK + '/' + totalTables + '"]');
  lines.push('  FKs["🔗 Foreign Keys: ' + totalFKs + '"]');
  lines.push('  Missing["❌ Missing References: ' + missingRefs + '"]');
  lines.push('');

  lines.push('  Health --> Tables');
  lines.push('  Health --> PKs');
  lines.push('  Health --> FKs');
  lines.push('  Health --> Missing');
  lines.push('');

  // Recommendations based on score
  lines.push('  Recs["💡 Recommendations"]');
  lines.push('  Health --> Recs');
  lines.push('');

  if (tablesWithPK < totalTables) {
    lines.push('  Rec1["Add primary keys to tables lacking them"]');
    lines.push('  Recs --> Rec1');
  }

  if (missingRefs > 0) {
    lines.push('  Rec2["Resolve missing FK references"]');
    lines.push('  Recs --> Rec2');
  }

  if (totalFKs === 0) {
    lines.push('  Rec3["Consider adding relationships between tables"]');
    lines.push('  Recs --> Rec3');
  }

  return lines.join('\n');
}

/**
 * Generate user journey flow for a table
 */
export function generateUserJourneyFlow(
  tableName: string,
  operations: ('create' | 'read' | 'update' | 'delete')[]
): string {
  const lines: string[] = [];
  const modelName = toPascalSingular(tableName);

  lines.push('flowchart TD');
  lines.push('');

  lines.push(`  Start([User visits ${modelName} page])`);

  let nodeCounter = 1;

  for (const op of operations) {
    switch (op) {
      case 'create':
        lines.push(`  Create["➕ Create New ${modelName}"]`);
        lines.push(`  CreateForm["Fill ${modelName} Form"]`);
        lines.push(`  CreateSave["Save ${modelName}"]`);
        lines.push(`  CreateSuccess([${modelName} Created])`);
        lines.push('');
        lines.push('  Start --> Create');
        lines.push('  Create --> CreateForm');
        lines.push('  CreateForm --> CreateSave');
        lines.push('  CreateSave --> CreateSuccess');
        lines.push('');
        break;

      case 'read':
        lines.push(`  View["👁️ View ${modelName} List"]`);
        lines.push(`  ViewDetail["View ${modelName} Details"]`);
        lines.push(`  ViewEnd([Done Viewing])`);
        lines.push('');
        lines.push('  Start --> View');
        lines.push('  View --> ViewDetail');
        lines.push('  ViewDetail --> ViewEnd');
        lines.push('');
        break;

      case 'update':
        lines.push(`  Edit["✏️ Edit ${modelName}"]`);
        lines.push(`  EditForm["Modify ${modelName} Data"]`);
        lines.push(`  EditSave["Save Changes"]`);
        lines.push(`  EditSuccess([${modelName} Updated])`);
        lines.push('');
        lines.push('  Start --> Edit');
        lines.push('  Edit --> EditForm');
        lines.push('  EditForm --> EditSave');
        lines.push('  EditSave --> EditSuccess');
        lines.push('');
        break;

      case 'delete':
        lines.push(`  Delete["🗑️ Delete ${modelName}"]`);
        lines.push(`  DeleteConfirm{"Confirm Delete?"}`);
        lines.push(`  DeleteExec["Remove ${modelName}"]`);
        lines.push(`  DeleteSuccess([${modelName} Deleted])`);
        lines.push(`  DeleteCancel([Cancelled])`);
        lines.push('');
        lines.push('  Start --> Delete');
        lines.push('  Delete --> DeleteConfirm');
        lines.push('  DeleteConfirm -->|Yes| DeleteExec');
        lines.push('  DeleteConfirm -->|No| DeleteCancel');
        lines.push('  DeleteExec --> DeleteSuccess');
        lines.push('');
        break;
    }
  }

  return lines.join('\n');
}

/**
 * Generate sequence diagram for CRUD operations
 */
export function generateCRUDSequenceDiagram(tableName: string): string {
  const modelName = toPascalSingular(tableName);

  return `sequenceDiagram
  autonumber
  participant U as User
  participant UI as Frontend
  participant API as API Server
  participant DB as Database

  %% CREATE
  rect rgb(230, 255, 230)
    Note over U,DB: Create ${modelName}
    U->>UI: Click "Create ${modelName}"
    UI->>UI: Show form
    U->>UI: Fill form & submit
    UI->>API: POST /api/${toKebabCase(tableName)}
    API->>API: Validate input
    API->>DB: INSERT INTO ${tableName}
    DB-->>API: Success (new ID)
    API-->>UI: 201 Created
    UI-->>U: Show success message
  end

  %% READ
  rect rgb(230, 230, 255)
    Note over U,DB: Read ${modelName} List
    U->>UI: Navigate to ${modelName} list
    UI->>API: GET /api/${toKebabCase(tableName)}
    API->>DB: SELECT * FROM ${tableName}
    DB-->>API: Result set
    API-->>UI: 200 OK (data)
    UI-->>U: Display ${modelName} list
  end

  %% UPDATE
  rect rgb(255, 255, 230)
    Note over U,DB: Update ${modelName}
    U->>UI: Click "Edit" on record
    UI->>API: GET /api/${toKebabCase(tableName)}/:id
    API->>DB: SELECT * FROM ${tableName} WHERE id = ?
    DB-->>API: Record data
    API-->>UI: 200 OK (data)
    UI-->>U: Show edit form with data
    U->>UI: Modify & submit
    UI->>API: PUT /api/${toKebabCase(tableName)}/:id
    API->>API: Validate changes
    API->>DB: UPDATE ${tableName} SET ... WHERE id = ?
    DB-->>API: Rows affected
    API-->>UI: 200 OK
    UI-->>U: Show success message
  end

  %% DELETE
  rect rgb(255, 230, 230)
    Note over U,DB: Delete ${modelName}
    U->>UI: Click "Delete" on record
    UI->>UI: Show confirmation dialog
    U->>UI: Confirm delete
    UI->>API: DELETE /api/${toKebabCase(tableName)}/:id
    API->>DB: DELETE FROM ${tableName} WHERE id = ?
    DB-->>API: Rows affected
    API-->>UI: 204 No Content
    UI-->>U: Show success message
  end`;
}

/**
 * Generate state diagram for record lifecycle
 */
export function generateRecordLifecycleDiagram(
  tableName: string,
  hasSoftDelete: boolean = false
): string {
  const lines: string[] = [];

  lines.push('stateDiagram-v2');
  lines.push(`  [*] --> Draft: New ${toPascalSingular(tableName)}`);
  lines.push('');
  lines.push('  Draft --> Active: Activate');
  lines.push('  Draft --> [*]: Delete (no data)');
  lines.push('');

  if (hasSoftDelete) {
    lines.push('  Active --> Inactive: Deactivate');
    lines.push('  Inactive --> Active: Reactivate');
    lines.push('  Inactive --> Deleted: Soft Delete');
    lines.push('  Deleted --> [*]: Permanent Delete');
    lines.push('');
    lines.push('  state Active {');
    lines.push('    [*] --> Valid');
    lines.push('    Valid --> Modified: Update');
    lines.push('    Modified --> Valid: Save');
    lines.push('  }');
  } else {
    lines.push('  Active --> [*]: Delete');
    lines.push('');
    lines.push('  state Active {');
    lines.push('    [*] --> Valid');
    lines.push('    Valid --> Modified: Update');
    lines.push('    Modified --> Valid: Save');
    lines.push('  }');
  }

  return lines.join('\n');
}

/**
 * Generate pie chart of data types distribution
 */
export function generateDataTypeDistributionPie(tables: TableDef[]): string {
  const typeCounts: Record<string, number> = {};

  for (const table of tables) {
    for (const col of table.columns) {
      typeCounts[col.dataType] = (typeCounts[col.dataType] || 0) + 1;
    }
  }

  const sortedTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const lines: string[] = [];
  lines.push('pie showData');
  lines.push('  title Column Data Types Distribution');

  for (const [type, count] of sortedTypes) {
    lines.push(`  "${type}" : ${count}`);
  }

  return lines.join('\n');
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate FK depth for each table
 */
function calculateDepths(tables: TableDef[]): Map<string, number> {
  const depths = new Map<string, number>();

  // Initialize all to 0
  for (const table of tables) {
    depths.set(table.tableName, 0);
  }

  // Iteratively calculate depths
  let changed = true;
  let iterations = 0;
  const maxIterations = tables.length;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const table of tables) {
      let maxDepDepth = 0;

      for (const fk of table.foreignKeys) {
        const depDepth = depths.get(fk.referencesTable);
        if (depDepth !== undefined && depDepth >= maxDepDepth) {
          maxDepDepth = depDepth + 1;
        }
      }

      const currentDepth = depths.get(table.tableName) || 0;
      if (maxDepDepth > currentDepth) {
        depths.set(table.tableName, maxDepDepth);
        changed = true;
      }
    }
  }

  return depths;
}

/**
 * Find missing FK references
 */
function findMissingReferences(tables: TableDef[]): string[] {
  const tableNames = new Set(tables.map((t) => t.tableName.toLowerCase()));
  const missing: string[] = [];

  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      if (!tableNames.has(fk.referencesTable.toLowerCase())) {
        missing.push(fk.referencesTable);
      }
    }
  }

  return [...new Set(missing)];
}

/**
 * Sanitize ID for Mermaid
 */
function sanitizeId(name: string): string {
  return 'T_' + name.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Truncate string
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Convert to PascalCase singular
 */
function toPascalSingular(name: string): string {
  let singular = name;

  if (singular.endsWith('ies')) {
    singular = singular.slice(0, -3) + 'y';
  } else if (singular.endsWith('ses') || singular.endsWith('xes')) {
    singular = singular.slice(0, -2);
  } else if (
    singular.endsWith('s') &&
    !singular.endsWith('ss') &&
    !singular.endsWith('us')
  ) {
    singular = singular.slice(0, -1);
  }

  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

/**
 * Convert to kebab-case
 */
function toKebabCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}
