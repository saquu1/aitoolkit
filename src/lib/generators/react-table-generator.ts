/**
 * React Data Table Generator
 * 
 * Generates TanStack Table / DataTable components with:
 * - Column definitions from UnifiedField
 * - FK lookups (show name instead of id)
 * - Date formatting
 * - Boolean badges
 * - Action column (view, edit, delete)
 * - Search/filter functionality
 * - Pagination
 * - Export functionality
 * - Row selection
 */

import { prisma } from '@/lib/db';
import {
  getTypeScriptType,
  toPrismaModelName,
  toCamelCase,
  isBooleanType,
  isDateType,
  isNumericType,
} from './type-mappings';
import type { UnifiedField } from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ReactTableGeneratorConfig {
  projectId: string;
  tableName: string;
  includeActions?: boolean;
  includeSearch?: boolean;
  includeFilters?: boolean;
  includePagination?: boolean;
  includeExport?: boolean;
  includeRowSelection?: boolean;
  includeBulkActions?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
}

export interface TableColumn {
  accessorKey: string;
  header: string;
  cellType: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'fk' | 'status' | 'badge' | 'currency';
  sortable: boolean;
  filterable: boolean;
  hidden: boolean;
  fkConfig?: {
    referencedTable: string;
    displayColumn: string;
  };
  format?: string;
  width?: number;
}

export interface ReactTableGenerationResult {
  tableComponent: string;
  columnDefs: string;
  types: string;
  imports: string[];
  errors: string[];
  warnings: string[];
  columns: TableColumn[];
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate React Data Table component from Unified Intelligence Bank
 */
export async function generateReactTable(
  config: ReactTableGeneratorConfig
): Promise<ReactTableGenerationResult> {
  const result: ReactTableGenerationResult = {
    tableComponent: '',
    columnDefs: '',
    types: '',
    imports: [],
    errors: [],
    warnings: [],
    columns: [],
  };

  try {
    // Get all fields for the table
    const fields = await prisma.unifiedField.findMany({
      where: {
        projectId: config.projectId,
        tableName: config.tableName,
      },
      orderBy: { displayOrder: 'asc' },
    });

    if (fields.length === 0) {
      result.errors.push(`No fields found for table ${config.tableName}`);
      return result;
    }

    // Transform to TableColumn objects
    result.columns = fields
      .filter(f => !f.uiIsHidden && !f.schemaIsPrimaryKey)
      .map(f => transformToTableColumn(f, config));

    // Generate the table component
    result.tableComponent = generateTableComponent(config, result.columns, fields);
    
    // Generate column definitions
    result.columnDefs = generateColumnDefinitions(config, result.columns);
    
    // Generate type definitions
    result.types = generateTableTypes(config, result.columns);
    
    // Collect required imports
    result.imports = collectTableImports(result.columns, config);

  } catch (error: any) {
    result.errors.push(`Table generation error: ${error.message}`);
  }

  return result;
}

/**
 * Transform UnifiedField to TableColumn
 */
function transformToTableColumn(
  field: UnifiedField,
  config: ReactTableGeneratorConfig
): TableColumn {
  const columnName = toCamelCase(field.fieldName);
  
  // Determine cell type
  const cellType = determineCellType(field);
  
  const column: TableColumn = {
    accessorKey: columnName,
    header: field.intelSuggestedLabel || formatColumnHeader(field.fieldName),
    cellType,
    sortable: !field.uiIsReadOnly,
    filterable: isFilterable(field),
    hidden: field.uiIsHidden || shouldHideInTable(field),
    width: estimateColumnWidth(field),
  };

  // Add FK config
  if (field.fkIsForeignKey && field.fkReferencedTable) {
    column.fkConfig = {
      referencedTable: field.fkReferencedTable,
      displayColumn: guessDisplayColumn(field.fkReferencedTable),
    };
  }

  // Add format for dates
  if (isDateType(field.schemaDataType || '')) {
    column.format = 'MMM dd, yyyy';
  }

  return column;
}

/**
 * Determine the cell type for display
 */
function determineCellType(field: UnifiedField): TableColumn['cellType'] {
  // Check semantic type first
  if (field.intelSemanticType) {
    const semantic = field.intelSemanticType.toLowerCase();
    
    if (semantic.includes('money') || semantic.includes('price') || semantic.includes('amount')) {
      return 'currency';
    }
    if (semantic.includes('status')) {
      return 'status';
    }
    if (semantic.includes('active') || semantic.includes('is_')) {
      return 'boolean';
    }
  }

  // Check FK
  if (field.fkIsForeignKey) {
    return 'fk';
  }

  // Check SQL type
  const sqlType = (field.schemaDataType || 'VARCHAR').toUpperCase();
  
  if (sqlType === 'BIT') return 'boolean';
  if (sqlType.includes('MONEY') || sqlType.includes('DECIMAL')) return 'currency';
  if (sqlType.includes('DATE') && sqlType.includes('TIME')) return 'datetime';
  if (sqlType.includes('DATE')) return 'date';
  if (isNumericType(sqlType)) return 'number';

  return 'text';
}

/**
 * Check if field should be filterable
 */
function isFilterable(field: UnifiedField): boolean {
  // FK fields are filterable
  if (field.fkIsForeignKey) return true;
  
  // Status/active fields are filterable
  const semantic = field.intelSemanticType?.toLowerCase() || '';
  if (semantic.includes('status') || semantic.includes('active')) return true;
  
  // Date fields are filterable
  if (isDateType(field.schemaDataType || '')) return true;
  
  return false;
}

/**
 * Check if field should be hidden in table view
 */
function shouldHideInTable(field: UnifiedField): boolean {
  // Hide very long text fields
  if (field.schemaMaxLength && field.schemaMaxLength > 500) return true;
  
  // Hide certain semantic types
  const semantic = field.intelSemanticType?.toLowerCase() || '';
  if (semantic.includes('description') || semantic.includes('notes')) return true;
  
  // Hide password fields
  if (semantic.includes('password')) return true;
  
  return false;
}

/**
 * Estimate column width
 */
function estimateColumnWidth(field: UnifiedField): number {
  if (field.fkIsForeignKey) return 150;
  
  const semantic = field.intelSemanticType?.toLowerCase() || '';
  
  if (semantic.includes('phone')) return 120;
  if (semantic.includes('email')) return 200;
  if (semantic.includes('date')) return 120;
  if (semantic.includes('active') || semantic.includes('status')) return 100;
  if (semantic.includes('money') || semantic.includes('price')) return 120;
  
  if (field.schemaMaxLength) {
    if (field.schemaMaxLength < 20) return 100;
    if (field.schemaMaxLength < 50) return 150;
    if (field.schemaMaxLength < 100) return 200;
    return 250;
  }
  
  return 150;
}

/**
 * Format column header
 */
function formatColumnHeader(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/Id$/i, '')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

/**
 * Guess the display column for FK lookup
 */
function guessDisplayColumn(tableName: string): string {
  const lower = tableName.toLowerCase();
  
  if (lower.includes('country')) return 'name';
  if (lower.includes('province') || lower.includes('state')) return 'name';
  if (lower.includes('city')) return 'name';
  if (lower.includes('type')) return 'name';
  if (lower.includes('category')) return 'name';
  if (lower.includes('status')) return 'name';
  if (lower.includes('role')) return 'name';
  if (lower.includes('user')) return 'name';
  if (lower.includes('organization') || lower.includes('organisation')) return 'name';
  
  return 'name';
}

/**
 * Convert to kebab-case
 */
function toKebabCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]/g, '-')
    .toLowerCase();
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT GENERATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate the complete table component
 */
function generateTableComponent(
  config: ReactTableGeneratorConfig,
  columns: TableColumn[],
  unifiedFields: UnifiedField[]
): string {
  const modelName = toPrismaModelName(config.tableName);
  const camelName = toCamelCase(config.tableName);
  const kebabName = toKebabCase(config.tableName);
  
  const lines: string[] = [];
  
  // File header
  lines.push(`'use client';`);
  lines.push(``);
  lines.push(`/**`);
  lines.push(` * ${modelName} Data Table Component`);
  lines.push(` * Auto-generated by AI Enterprise Architect`);
  lines.push(` * Table: ${config.tableName}`);
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(` */`);
  lines.push(``);
  
  // Imports
  lines.push(...generateTableImports(columns, config));
  lines.push(``);
  
  // Types
  lines.push(`type ${modelName}WithRelations = ${modelName} & {`);
  const fkColumns = columns.filter(c => c.cellType === 'fk' && c.fkConfig);
  for (const col of fkColumns) {
    const refModel = toPrismaModelName(col.fkConfig!.referencedTable);
    lines.push(`  ${toCamelCase(col.fkConfig!.referencedTable)}?: ${refModel};`);
  }
  lines.push(`};`);
  lines.push(``);
  
  // Column definitions export
  lines.push(`export const columns: ColumnDef<${modelName}WithRelations>[] = [`);
  for (const col of columns) {
    lines.push(...generateColumnDef(col, modelName));
  }
  lines.push(`];`);
  lines.push(``);
  
  // Main component
  lines.push(`interface ${modelName}TableProps {`);
  lines.push(`  data: ${modelName}WithRelations[];`);
  lines.push(`  onRowClick?: (row: ${modelName}WithRelations) => void;`);
  lines.push(`  onEdit?: (row: ${modelName}WithRelations) => void;`);
  lines.push(`  onDelete?: (row: ${modelName}WithRelations) => void;`);
  lines.push(`  loading?: boolean;`);
  lines.push(`}`);
  lines.push(``);
  
  lines.push(`export function ${modelName}Table({`);
  lines.push(`  data,`);
  lines.push(`  onRowClick,`);
  lines.push(`  onEdit,`);
  lines.push(`  onDelete,`);
  lines.push(`  loading = false,`);
  lines.push(`}: ${modelName}TableProps) {`);
  lines.push(`  const [sorting, setSorting] = useState<SortingState>([]);`);
  lines.push(`  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);`);
  lines.push(`  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});`);
  lines.push(`  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});`);
  lines.push(`  const [globalFilter, setGlobalFilter] = useState('');`);
  lines.push(``);
  
  lines.push(`  const table = useReactTable({`);
  lines.push(`    data,`);
  lines.push(`    columns,`);
  lines.push(`    onSortingChange: setSorting,`);
  lines.push(`    onColumnFiltersChange: setColumnFilters,`);
  lines.push(`    getCoreRowModel: getCoreRowModel(),`);
  lines.push(`    getPaginationRowModel: getPaginationRowModel(),`);
  lines.push(`    getSortedRowModel: getSortedRowModel(),`);
  lines.push(`    getFilteredRowModel: getFilteredRowModel(),`);
  lines.push(`    onColumnVisibilityChange: setColumnVisibility,`);
  lines.push(`    onRowSelectionChange: setRowSelection,`);
  lines.push(`    onGlobalFilterChange: setGlobalFilter,`);
  lines.push(`    state: {`);
  lines.push(`      sorting,`);
  lines.push(`      columnFilters,`);
  lines.push(`      columnVisibility,`);
  lines.push(`      rowSelection,`);
  lines.push(`      globalFilter,`);
  lines.push(`    },`);
  lines.push(`  });`);
  lines.push(``);
  
  // Render JSX
  lines.push(`  return (`);
  lines.push(`    <div className="w-full">`);
  
  // Toolbar
  lines.push(`      <div className="flex items-center justify-between py-4">`);
  if (config.includeSearch !== false) {
    lines.push(`        <div className="flex items-center gap-2">`);
    lines.push(`          <div className="relative">`);
    lines.push(`            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />`);
    lines.push(`            <Input`);
    lines.push(`              placeholder="Search ${camelName}..."`);
    lines.push(`              value={globalFilter}`);
    lines.push(`              onChange={(e) => setGlobalFilter(e.target.value)}`);
    lines.push(`              className="pl-8 w-[300px]"`);
    lines.push(`            />`);
    lines.push(`          </div>`);
    lines.push(`        </div>`);
  }
  lines.push(`        <div className="flex items-center gap-2">`);
  if (config.includeExport !== false) {
    lines.push(`          <Button variant="outline" size="sm">`);
    lines.push(`            <Download className="mr-2 h-4 w-4" />`);
    lines.push(`            Export`);
    lines.push(`          </Button>`);
  }
  lines.push(`          <DropdownMenu>`);
  lines.push(`            <DropdownMenuTrigger asChild>`);
  lines.push(`              <Button variant="outline" size="sm">`);
  lines.push(`                <Settings2 className="mr-2 h-4 w-4" />`);
  lines.push(`                Columns`);
  lines.push(`              </Button>`);
  lines.push(`            </DropdownMenuTrigger>`);
  lines.push(`            <DropdownMenuContent align="end">`);
  lines.push(`              {table`);
  lines.push(`                .getAllColumns()`);
  lines.push(`                .filter((column) => column.getCanHide())`);
  lines.push(`                .map((column) => {`);
  lines.push(`                  return (`);
  lines.push(`                    <DropdownMenuCheckboxItem`);
  lines.push(`                      key={column.id}`);
  lines.push(`                      className="capitalize"`);
  lines.push(`                      checked={column.getIsVisible()}`);
  lines.push(`                      onCheckedChange={(value) =>`);
  lines.push(`                        column.toggleVisibility(!!value)`);
  lines.push(`                      }`);
  lines.push(`                    >`);
  lines.push(`                      {column.id}`);
  lines.push(`                    </DropdownMenuCheckboxItem>`);
  lines.push(`                  );`);
  lines.push(`                })}`);
  lines.push(`            </DropdownMenuContent>`);
  lines.push(`          </DropdownMenu>`);
  lines.push(`        </div>`);
  lines.push(`      </div>`);
  lines.push(``);
  
  // Table
  lines.push(`      <div className="rounded-md border">`);
  lines.push(`        <Table>`);
  lines.push(`          <TableHeader>`);
  lines.push(`            {table.getHeaderGroups().map((headerGroup) => (`);
  lines.push(`              <TableRow key={headerGroup.id}>`);
  lines.push(`                {headerGroup.headers.map((header) => (`);
  lines.push(`                  <TableHead key={header.id}>`);
  lines.push(`                    {header.isPlaceholder`);
  lines.push(`                      ? null`);
  lines.push(`                      : flexRender(`);
  lines.push(`                          header.column.columnDef.header,`);
  lines.push(`                          header.getContext()`);
  lines.push(`                        )}`);
  lines.push(`                  </TableHead>`);
  lines.push(`                ))}`);
  lines.push(`              </TableRow>`);
  lines.push(`            ))}`);
  lines.push(`          </TableHeader>`);
  lines.push(`          <TableBody>`);
  lines.push(`            {loading ? (`);
  lines.push(`              <TableRow>`);
  lines.push(`                <TableCell colSpan={columns.length} className="h-24 text-center">`);
  lines.push(`                  <div className="flex items-center justify-center">`);
  lines.push(`                    <Loader2 className="h-6 w-6 animate-spin" />`);
  lines.push(`                  </div>`);
  lines.push(`                </TableCell>`);
  lines.push(`              </TableRow>`);
  lines.push(`            ) : table.getRowModel().rows?.length ? (`);
  lines.push(`              table.getRowModel().rows.map((row) => (`);
  lines.push(`                <TableRow`);
  lines.push(`                  key={row.id}`);
  lines.push(`                  data-state={row.getIsSelected() && 'selected'}`);
  lines.push(`                  className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}`);
  lines.push(`                  onClick={() => onRowClick?.(row.original)}`);
  lines.push(`                >`);
  lines.push(`                  {row.getVisibleCells().map((cell) => (`);
  lines.push(`                    <TableCell key={cell.id}>`);
  lines.push(`                      {flexRender(cell.column.columnDef.cell, cell.getContext())}`);
  lines.push(`                    </TableCell>`);
  lines.push(`                  ))}`);
  lines.push(`                </TableRow>`);
  lines.push(`              ))`);
  lines.push(`            ) : (`);
  lines.push(`              <TableRow>`);
  lines.push(`                <TableCell colSpan={columns.length} className="h-24 text-center">`);
  lines.push(`                  No results found.`);
  lines.push(`                </TableCell>`);
  lines.push(`              </TableRow>`);
  lines.push(`            )}`);
  lines.push(`          </TableBody>`);
  lines.push(`        </Table>`);
  lines.push(`      </div>`);
  lines.push(``);
  
  // Pagination
  if (config.includePagination !== false) {
    lines.push(`      <div className="flex items-center justify-between space-x-2 py-4">`);
    lines.push(`        <div className="flex-1 text-sm text-muted-foreground">`);
    lines.push(`          {table.getFilteredSelectedRowModel().rows.length} of{' '}`);
    lines.push(`          {table.getFilteredRowModel().rows.length} row(s) selected.`);
    lines.push(`        </div>`);
    lines.push(`        <div className="flex items-center space-x-2">`);
    lines.push(`          <div className="flex items-center gap-2">`);
    lines.push(`            <p className="text-sm font-medium">Rows per page</p>`);
    lines.push(`            <Select`);
    lines.push(`              value={\`\${table.getState().pagination.pageSize}\`}`);
    lines.push(`              onValueChange={(value) => table.setPageSize(Number(value))}`);
    lines.push(`            >`);
    lines.push(`              <SelectTrigger className="h-8 w-[70px]">`);
    lines.push(`                <SelectValue placeholder={table.getState().pagination.pageSize} />`);
    lines.push(`              </SelectTrigger>`);
    lines.push(`              <SelectContent side="top">`);
    lines.push(`                ${(config.pageSizeOptions || [10, 20, 30, 50]).map(n => `<SelectItem key="${n}" value="${n}">${n}</SelectItem>`).join('\n                ')}`);
    lines.push(`              </SelectContent>`);
    lines.push(`            </Select>`);
    lines.push(`          </div>`);
    lines.push(`          <div className="flex w-[100px] items-center justify-center text-sm font-medium">`);
    lines.push(`            Page {table.getState().pagination.pageIndex + 1} of{' '}`);
    lines.push(`            {table.getPageCount()}`);
    lines.push(`          </div>`);
    lines.push(`          <div className="flex items-center gap-2">`);
    lines.push(`            <Button`);
    lines.push(`              variant="outline"`);
    lines.push(`              size="sm"`);
    lines.push(`              onClick={() => table.previousPage()}`);
    lines.push(`              disabled={!table.getCanPreviousPage()}`);
    lines.push(`            >`);
    lines.push(`              <ChevronLeft className="h-4 w-4" />`);
    lines.push(`            </Button>`);
    lines.push(`            <Button`);
    lines.push(`              variant="outline"`);
    lines.push(`              size="sm"`);
    lines.push(`              onClick={() => table.nextPage()}`);
    lines.push(`              disabled={!table.getCanNextPage()}`);
    lines.push(`            >`);
    lines.push(`              <ChevronRight className="h-4 w-4" />`);
    lines.push(`            </Button>`);
    lines.push(`          </div>`);
    lines.push(`        </div>`);
    lines.push(`      </div>`);
  }
  
  lines.push(`    </div>`);
  lines.push(`  );`);
  lines.push(`}`);
  
  return lines.join('\n');
}

/**
 * Generate imports for table component
 */
function generateTableImports(columns: TableColumn[], config: ReactTableGeneratorConfig): string[] {
  const imports: string[] = [];
  
  // React
  imports.push(`import { useState } from 'react';`);
  
  // TanStack Table
  imports.push(`import {`);
  imports.push(`  ColumnDef,`);
  imports.push(`  ColumnFiltersState,`);
  imports.push(`  SortingState,`);
  imports.push(`  VisibilityState,`);
  imports.push(`  flexRender,`);
  imports.push(`  getCoreRowModel,`);
  imports.push(`  getFilteredRowModel,`);
  imports.push(`  getPaginationRowModel,`);
  imports.push(`  getSortedRowModel,`);
  imports.push(`  useReactTable,`);
  imports.push(`  RowSelectionState,`);
  imports.push(`} from '@tanstack/react-table';`);
  
  // UI Components
  imports.push(`import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';`);
  imports.push(`import { Button } from '@/components/ui/button';`);
  imports.push(`import { Input } from '@/components/ui/input';`);
  imports.push(`import { Badge } from '@/components/ui/badge';`);
  imports.push(`import { Checkbox } from '@/components/ui/checkbox';`);
  imports.push(`import {`);
  imports.push(`  DropdownMenu,`);
  imports.push(`  DropdownMenuCheckboxItem,`);
  imports.push(`  DropdownMenuContent,`);
  imports.push(`  DropdownMenuTrigger,`);
  imports.push(`} from '@/components/ui/dropdown-menu';`);
  imports.push(`import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';`);
  
  // Icons
  imports.push(`import { ChevronLeft, ChevronRight, Settings2, Search, Download, MoreHorizontal, Pencil, Trash2, Eye, Loader2 } from 'lucide-react';`);
  
  // Types
  imports.push(`import { ${toPrismaModelName(config.tableName)} } from '@/types/${toKebabCase(config.tableName)}';`);
  
  return imports;
}

/**
 * Generate column definition for a single column
 */
function generateColumnDef(col: TableColumn, modelName: string): string[] {
  const lines: string[] = [];
  
  lines.push(`  {`);
  lines.push(`    accessorKey: '${col.accessorKey}',`);
  lines.push(`    header: '${col.header}',`);
  lines.push(`    enableSorting: ${col.sortable},`);
  lines.push(`    enableHiding: ${!col.hidden},`);
  
  // Cell renderer based on type
  switch (col.cellType) {
    case 'boolean':
      lines.push(`    cell: ({ row }) => (`);
      lines.push(`      <Badge variant={row.getValue('${col.accessorKey}') ? 'default' : 'secondary'}>`);
      lines.push(`        {row.getValue('${col.accessorKey}') ? 'Yes' : 'No'}`);
      lines.push(`      </Badge>`);
      lines.push(`    ),`);
      break;
      
    case 'date':
      lines.push(`    cell: ({ row }) => {`);
      lines.push(`      const date = row.getValue('${col.accessorKey}') as Date;`);
      lines.push(`      return date ? format(date, 'MMM dd, yyyy') : '-';`);
      lines.push(`    },`);
      break;
      
    case 'datetime':
      lines.push(`    cell: ({ row }) => {`);
      lines.push(`      const date = row.getValue('${col.accessorKey}') as Date;`);
      lines.push(`      return date ? format(date, 'MMM dd, yyyy HH:mm') : '-';`);
      lines.push(`    },`);
      break;
      
    case 'currency':
      lines.push(`    cell: ({ row }) => {`);
      lines.push(`      const amount = row.getValue('${col.accessorKey}') as number;`);
      lines.push(`      return formatCurrency(amount);`);
      lines.push(`    },`);
      break;
      
    case 'fk':
      const refField = toCamelCase(col.fkConfig!.referencedTable);
      lines.push(`    cell: ({ row }) => {`);
      lines.push(`      const related = row.original.${refField};`);
      lines.push(`      return related?.${col.fkConfig!.displayColumn} || '-';`);
      lines.push(`    },`);
      break;
      
    case 'status':
      lines.push(`    cell: ({ row }) => {`);
      lines.push(`      const status = row.getValue('${col.accessorKey}') as string;`);
      lines.push(`      return <Badge variant="outline">{status}</Badge>;`);
      lines.push(`    },`);
      break;
      
    default:
      // Text - truncate if too long
      lines.push(`    cell: ({ row }) => {`);
      lines.push(`      const value = row.getValue('${col.accessorKey}') as string;`);
      lines.push(`      return value?.length > 50 ? \`\${value.substring(0, 50)}...\` : value || '-';`);
      lines.push(`    },`);
  }
  
  lines.push(`  },`);
  
  return lines;
}

/**
 * Generate column definitions string
 */
function generateColumnDefinitions(config: ReactTableGeneratorConfig, columns: TableColumn[]): string {
  const modelName = toPrismaModelName(config.tableName);
  return `export const ${toCamelCase(config.tableName)}Columns: ColumnDef<${modelName}>[] = [
${columns.map(col => `  { accessorKey: '${col.accessorKey}', header: '${col.header}' }`).join(',\n')}
];`;
}

/**
 * Generate table type definitions
 */
function generateTableTypes(config: ReactTableGeneratorConfig, columns: TableColumn[]): string {
  const modelName = toPrismaModelName(config.tableName);
  const lines: string[] = [];
  
  lines.push(`// Table Types for ${modelName}`);
  lines.push(`// Auto-generated - do not edit manually`);
  lines.push(``);
  lines.push(`export interface ${modelName}TableProps {`);
  lines.push(`  data: ${modelName}[];`);
  lines.push(`  onRowClick?: (row: ${modelName}) => void;`);
  lines.push(`  onEdit?: (row: ${modelName}) => void;`);
  lines.push(`  onDelete?: (row: ${modelName}) => void;`);
  lines.push(`  loading?: boolean;`);
  lines.push(`}`);
  lines.push(``);
  
  return lines.join('\n');
}

/**
 * Collect all required imports
 */
function collectTableImports(columns: TableColumn[], config: ReactTableGeneratorConfig): string[] {
  const imports = new Set<string>();
  
  // Always needed
  imports.add('react');
  imports.add('@tanstack/react-table');
  imports.add('@/components/ui/table');
  imports.add('@/components/ui/button');
  imports.add('lucide-react');
  
  // Conditional imports
  if (config.includeSearch !== false) {
    imports.add('@/components/ui/input');
  }
  
  for (const col of columns) {
    if (col.cellType === 'boolean' || col.cellType === 'status') {
      imports.add('@/components/ui/badge');
    }
    if (col.cellType === 'date' || col.cellType === 'datetime') {
      imports.add('date-fns');
    }
    if (col.cellType === 'currency') {
      imports.add('@/lib/utils');
    }
  }
  
  return Array.from(imports);
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate table for a single table with default config
 */
export async function generateModelTable(
  projectId: string,
  tableName: string,
  options: Partial<ReactTableGeneratorConfig> = {}
): Promise<{ component: string; types: string; imports: string[]; errors: string[] }> {
  const config: ReactTableGeneratorConfig = {
    projectId,
    tableName,
    includeActions: true,
    includeSearch: true,
    includeFilters: true,
    includePagination: true,
    includeExport: true,
    pageSize: 10,
    pageSizeOptions: [10, 20, 30, 50],
    ...options,
  };
  
  const result = await generateReactTable(config);
  
  return {
    component: result.tableComponent,
    types: result.types,
    imports: result.imports,
    errors: result.errors,
  };
}

/**
 * Generate action column for table
 */
export function generateActionColumn(modelName: string, kebabName: string): string {
  return `
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const record = row.original;
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.location.href = \`/${kebabName}/\${record.id}\`}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.href = \`/${kebabName}/\${record.id}/edit\`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => {
                if (confirm('Are you sure you want to delete this record?')) {
                  fetch(\`/api/${kebabName}/\${record.id}\`, { method: 'DELETE' });
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },`;
}
