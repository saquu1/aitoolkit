// =============================================================================
// Screen Blueprint Generator - Auto-generate UI designs from table metadata
// =============================================================================

import { TableDef, ColumnDef, ColumnIntelligence, UIComponentType, ScreenBlueprint, ScreenField, ScreenSection, ScreenAction, ScreenFilter } from './types';
import { ColumnIntelligenceEngine, columnIntelligence } from './column-intelligence';

// =============================================================================
// TYPES
// =============================================================================

export interface ScreenBlueprintResult {
  listScreen: ScreenBlueprint;
  formScreen: ScreenBlueprint;
  detailScreen: ScreenBlueprint;
  dashboardWidgets: DashboardWidget[];
}

export interface DashboardWidget {
  type: 'stat_card' | 'chart' | 'table' | 'list';
  title: string;
  tableName: string;
  config: Record<string, unknown>;
  position: { row: number; col: number; width: number; height: number };
}

export interface BlueprintGenerationOptions {
  includeSearch: boolean;
  includeFilters: boolean;
  includeExport: boolean;
  formLayout: 'single_column' | 'two_column' | 'auto';
  groupSections: boolean;
  maxColumnsInList: number;
}

// =============================================================================
// SCREEN BLUEPRINT GENERATOR CLASS
// =============================================================================

export class ScreenBlueprintGenerator {
  private columnEngine: ColumnIntelligenceEngine;

  constructor() {
    this.columnEngine = columnIntelligence;
  }

  /**
   * Generate all screen blueprints for a table
   */
  generateAllScreens(
    table: TableDef, 
    options: Partial<BlueprintGenerationOptions> = {}
  ): ScreenBlueprintResult {
    const opts: BlueprintGenerationOptions = {
      includeSearch: true,
      includeFilters: true,
      includeExport: true,
      formLayout: 'auto',
      groupSections: true,
      maxColumnsInList: 8,
      ...options
    };

    // Analyze columns first
    const columnAnalysis = this.analyzeTableColumns(table);

    return {
      listScreen: this.generateListScreen(table, columnAnalysis, opts),
      formScreen: this.generateFormScreen(table, columnAnalysis, opts),
      detailScreen: this.generateDetailScreen(table, columnAnalysis, opts),
      dashboardWidgets: this.generateDashboardWidgets(table, columnAnalysis)
    };
  }

  /**
   * Analyze table columns for blueprint generation
   */
  private analyzeTableColumns(table: TableDef): Map<string, ColumnIntelligence> {
    const analysis = new Map<string, ColumnIntelligence>();
    
    for (const column of table.columns) {
      const result = this.columnEngine.analyzeColumn(column, table.tableName);
      analysis.set(column.name, result.column);
    }
    
    return analysis;
  }

  /**
   * Generate List Screen Blueprint
   */
  generateListScreen(
    table: TableDef,
    columnAnalysis: Map<string, ColumnIntelligence>,
    options: BlueprintGenerationOptions
  ): ScreenBlueprint {
    // Select columns to display in list
    const displayColumns = this.selectListColumns(table, columnAnalysis, options.maxColumnsInList);
    
    // Generate fields
    const fields: ScreenField[] = displayColumns.map((col, index) => {
      const intel = columnAnalysis.get(col.name);
      return {
        columnName: col.name,
        label: intel?.label || this.formatLabel(col.name),
        uiType: intel?.inferredUIType || 'text_input',
        isRequired: false,
        isReadOnly: true,
        order: index + 1
      };
    });

    // Generate filters
    const filters: ScreenFilter[] = [];
    if (options.includeFilters) {
      for (const col of table.columns) {
        const intel = columnAnalysis.get(col.name);
        if (intel?.isFilterable) {
          filters.push(this.createFilter(col, intel));
        }
      }
    }

    // Generate actions
    const actions: ScreenAction[] = [
      { type: 'create', label: `Add ${this.singularize(table.tableName)}`, icon: 'plus' },
      { type: 'view', label: 'View', icon: 'eye' },
      { type: 'edit', label: 'Edit', icon: 'edit' },
      { type: 'delete', label: 'Delete', icon: 'trash', requiresConfirmation: true, confirmationMessage: `Are you sure you want to delete this ${this.singularize(table.tableName)}?` }
    ];

    if (options.includeExport) {
      actions.push({ type: 'export', label: 'Export', icon: 'download' });
    }

    return {
      screenType: 'list',
      tableName: table.tableName,
      title: this.formatTitle(table.tableName),
      fields,
      actions,
      filters,
      layout: 'single_column'
    };
  }

  /**
   * Generate Form Screen Blueprint
   */
  generateFormScreen(
    table: TableDef,
    columnAnalysis: Map<string, ColumnIntelligence>,
    options: BlueprintGenerationOptions
  ): ScreenBlueprint {
    // Group columns into sections
    const sections = options.groupSections 
      ? this.groupColumnsIntoSections(table, columnAnalysis)
      : [{ id: 'main', title: 'General Information', columns: 2, isCollapsible: false, defaultExpanded: true }];

    // Generate fields for all editable columns
    const fields: ScreenField[] = [];
    let order = 1;

    for (const col of table.columns) {
      // Skip auto-generated columns
      if (col.isIdentity || col.isPrimaryKey) continue;
      if (['createdon', 'createdby', 'modifiedon', 'modifiedby'].includes(col.name.toLowerCase())) continue;

      const intel = columnAnalysis.get(col.name);
      if (!intel) continue;

      // Determine section
      const section = this.determineSection(col.name);

      fields.push({
        columnName: col.name,
        label: intel.label || this.formatLabel(col.name),
        uiType: intel.inferredUIType,
        isRequired: !col.isNullable,
        isReadOnly: false,
        placeholder: intel.placeholder,
        validation: intel.validationRules,
        order: order++,
        section
      });
    }

    // Generate actions
    const actions: ScreenAction[] = [
      { type: 'edit', label: 'Save', icon: 'save' },
      { type: 'custom', label: 'Save & New', icon: 'plus-circle' },
      { type: 'custom', label: 'Cancel', icon: 'x' }
    ];

    return {
      screenType: 'form',
      tableName: table.tableName,
      title: `${this.singularize(table.tableName)} Form`,
      fields,
      actions,
      sections,
      layout: options.formLayout === 'auto' ? 'two_column' : options.formLayout
    };
  }

  /**
   * Generate Detail Screen Blueprint
   */
  generateDetailScreen(
    table: TableDef,
    columnAnalysis: Map<string, ColumnIntelligence>,
    options: BlueprintGenerationOptions
  ): ScreenBlueprint {
    // Group columns into sections for detail view
    const sections = this.groupColumnsIntoDetailSections(table, columnAnalysis);

    // Generate fields (all visible)
    const fields: ScreenField[] = [];
    let order = 1;

    for (const col of table.columns) {
      const intel = columnAnalysis.get(col.name);
      if (!intel) continue;

      const section = this.determineSection(col.name);

      fields.push({
        columnName: col.name,
        label: intel.label || this.formatLabel(col.name),
        uiType: intel.inferredUIType,
        isRequired: false,
        isReadOnly: true,
        order: order++,
        section
      });
    }

    // Generate actions
    const actions: ScreenAction[] = [
      { type: 'edit', label: 'Edit', icon: 'edit' },
      { type: 'delete', label: 'Delete', icon: 'trash', requiresConfirmation: true },
      { type: 'custom', label: 'Close', icon: 'x' }
    ];

    return {
      screenType: 'detail',
      tableName: table.tableName,
      title: `${this.singularize(table.tableName)} Details`,
      fields,
      actions,
      sections,
      layout: 'tabs'
    };
  }

  /**
   * Generate Dashboard Widgets
   */
  generateDashboardWidgets(
    table: TableDef,
    columnAnalysis: Map<string, ColumnIntelligence>
  ): DashboardWidget[] {
    const widgets: DashboardWidget[] = [];

    // Total count widget
    widgets.push({
      type: 'stat_card',
      title: `Total ${table.tableName}`,
      tableName: table.tableName,
      config: {
        aggregation: 'count',
        icon: 'database'
      },
      position: { row: 1, col: 1, width: 1, height: 1 }
    });

    // Check for status column
    const statusCol = table.columns.find(c => 
      c.name.toLowerCase().endsWith('status') || 
      c.name.toLowerCase() === 'isactive'
    );
    
    if (statusCol) {
      widgets.push({
        type: 'chart',
        title: `${table.tableName} by Status`,
        tableName: table.tableName,
        config: {
          chartType: 'pie',
          groupBy: statusCol.name,
          aggregation: 'count'
        },
        position: { row: 1, col: 2, width: 1, height: 1 }
      });
    }

    // Check for date column for trend
    const dateCol = table.columns.find(c => 
      c.name.toLowerCase().includes('date') || 
      c.name.toLowerCase() === 'createdon'
    );
    
    if (dateCol) {
      widgets.push({
        type: 'chart',
        title: `${table.tableName} Trend`,
        tableName: table.tableName,
        config: {
          chartType: 'line',
          xAxis: dateCol.name,
          aggregation: 'count',
          granularity: 'day'
        },
        position: { row: 2, col: 1, width: 2, height: 1 }
      });
    }

    // Recent items list
    widgets.push({
      type: 'list',
      title: `Recent ${table.tableName}`,
      tableName: table.tableName,
      config: {
        limit: 10,
        orderBy: 'createdOn',
        orderDirection: 'desc',
        columns: this.selectListColumns(table, columnAnalysis, 4).map(c => c.name)
      },
      position: { row: 3, col: 1, width: 2, height: 1 }
    });

    return widgets;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Select columns to display in list view
   */
  private selectListColumns(
    table: TableDef, 
    columnAnalysis: Map<string, ColumnIntelligence>,
    maxColumns: number
  ): ColumnDef[] {
    const selected: ColumnDef[] = [];
    
    // First, add columns marked as displayInList
    for (const col of table.columns) {
      const intel = columnAnalysis.get(col.name);
      if (intel?.displayInList && selected.length < maxColumns) {
        selected.push(col);
      }
    }
    
    // Then add searchable columns if space remains
    if (selected.length < maxColumns) {
      for (const col of table.columns) {
        if (selected.includes(col)) continue;
        const intel = columnAnalysis.get(col.name);
        if (intel?.isSearchable && selected.length < maxColumns) {
          selected.push(col);
        }
      }
    }
    
    // Finally add remaining columns
    if (selected.length < maxColumns) {
      for (const col of table.columns) {
        if (!selected.includes(col) && selected.length < maxColumns) {
          // Skip PK and audit columns
          if (col.isPrimaryKey || 
              ['createdon', 'createdby', 'modifiedon', 'modifiedby'].includes(col.name.toLowerCase())) {
            continue;
          }
          selected.push(col);
        }
      }
    }
    
    return selected;
  }

  /**
   * Create a filter for a column
   */
  private createFilter(col: ColumnDef, intel: ColumnIntelligence): ScreenFilter {
    const filterType = this.determineFilterType(col, intel);
    
    return {
      columnName: col.name,
      label: intel.label || this.formatLabel(col.name),
      type: filterType,
      options: filterType === 'dropdown' || filterType === 'boolean' 
        ? this.generateFilterOptions(col, intel) 
        : undefined,
      isMultiSelect: filterType === 'dropdown' && col.name.toLowerCase().endsWith('type')
    };
  }

  /**
   * Determine filter type for a column
   */
  private determineFilterType(col: ColumnDef, intel: ColumnIntelligence): ScreenFilter['type'] {
    if (col.dataType === 'BIT' || intel.inferredSemanticType === 'boolean_flag') {
      return 'boolean';
    }
    if (col.dataType.includes('DATE') || col.dataType.includes('TIME')) {
      return 'date_range';
    }
    if (col.dataType.includes('INT') || col.dataType.includes('DECIMAL') || col.dataType.includes('MONEY')) {
      return 'number_range';
    }
    if (intel.inferredSemanticType === 'status' || 
        intel.inferredSemanticType === 'type' || 
        intel.inferredSemanticType === 'category' ||
        intel.inferredSemanticType === 'foreign_key') {
      return 'dropdown';
    }
    return 'text';
  }

  /**
   * Generate filter options
   */
  private generateFilterOptions(col: ColumnDef, intel: ColumnIntelligence): { label: string; value: string }[] {
    if (intel.inferredSemanticType === 'boolean_flag') {
      return [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' }
      ];
    }
    return [];
  }

  /**
   * Group columns into sections for form
   */
  private groupColumnsIntoSections(
    table: TableDef,
    columnAnalysis: Map<string, ColumnIntelligence>
  ): ScreenSection[] {
    const sections: ScreenSection[] = [];
    const grouped = new Map<string, string[]>();

    // Group columns by section
    for (const col of table.columns) {
      const section = this.determineSection(col.name);
      if (!grouped.has(section)) {
        grouped.set(section, []);
      }
      grouped.get(section)!.push(col.name);
    }

    // Create sections
    let index = 1;
    const sectionOrder = ['Personal Info', 'Contact Info', 'Address', 'Administrative', 'Medical Info', 'Financial', 'Audit Trail', 'Other'];
    
    for (const sectionName of sectionOrder) {
      if (grouped.has(sectionName) && grouped.get(sectionName)!.length > 0) {
        sections.push({
          id: `section-${index++}`,
          title: sectionName,
          columns: sectionName === 'Address' || sectionName === 'Audit Trail' ? 1 : 2,
          isCollapsible: sectionName === 'Audit Trail',
          defaultExpanded: sectionName !== 'Audit Trail'
        });
      }
    }

    // Add any remaining sections
    for (const [sectionName, columns] of grouped) {
      if (!sectionOrder.includes(sectionName) && columns.length > 0) {
        sections.push({
          id: `section-${index++}`,
          title: sectionName,
          columns: 2,
          isCollapsible: false,
          defaultExpanded: true
        });
      }
    }

    return sections;
  }

  /**
   * Group columns into sections for detail view
   */
  private groupColumnsIntoDetailSections(
    table: TableDef,
    columnAnalysis: Map<string, ColumnIntelligence>
  ): ScreenSection[] {
    const sections = this.groupColumnsIntoSections(table, columnAnalysis);
    
    // Detail view always has tabs
    return sections.map(s => ({
      ...s,
      isCollapsible: false
    }));
  }

  /**
   * Determine section for a column
   */
  private determineSection(columnName: string): string {
    const name = columnName.toLowerCase();
    
    // Personal info
    if (['firstname', 'lastname', 'fullname', 'name', 'gender', 'dob', 'dateofbirth', 'age', 'bloodgroup', 'maritalstatus'].some(n => name.includes(n))) {
      return 'Personal Info';
    }
    
    // Contact info
    if (['phone', 'mobile', 'cell', 'email', 'fax', 'contact'].some(n => name.includes(n))) {
      return 'Contact Info';
    }
    
    // Address
    if (['address', 'street', 'city', 'country', 'state', 'province', 'postal', 'zip'].some(n => name.includes(n))) {
      return 'Address';
    }
    
    // Administrative
    if (['status', 'type', 'category', 'code', 'mrn', 'organization', 'branch', 'department'].some(n => name.includes(n))) {
      return 'Administrative';
    }
    
    // Medical Info
    if (['diagnosis', 'treatment', 'prescription', 'allergy', 'symptom', 'medical', 'patient', 'doctor'].some(n => name.includes(n))) {
      return 'Medical Info';
    }
    
    // Financial
    if (['amount', 'price', 'fee', 'cost', 'total', 'discount', 'tax', 'salary', 'pay', 'invoice', 'payment'].some(n => name.includes(n))) {
      return 'Financial';
    }
    
    // Audit Trail
    if (['created', 'modified', 'updated', 'by'].some(n => name.includes(n))) {
      return 'Audit Trail';
    }
    
    return 'Other';
  }

  /**
   * Format column name as label
   */
  private formatLabel(columnName: string): string {
    return columnName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format table name as title
   */
  private formatTitle(tableName: string): string {
    return this.formatLabel(tableName);
  }

  /**
   * Singularize a table name
   */
  private singularize(tableName: string): string {
    const singulars: Record<string, string> = {
      'patients': 'Patient',
      'appointments': 'Appointment',
      'users': 'User',
      'doctors': 'Doctor',
      'organizations': 'Organization',
      'branches': 'Branch',
      'departments': 'Department',
      'invoices': 'Invoice',
      'payments': 'Payment',
      'prescriptions': 'Prescription',
      'laboratories': 'Laboratory',
      'pharmacies': 'Pharmacy'
    };
    
    const lower = tableName.toLowerCase();
    if (singulars[lower]) {
      return singulars[lower];
    }
    
    // Default singularization
    if (lower.endsWith('ies')) {
      return lower.slice(0, -3) + 'y';
    }
    if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('ches')) {
      return lower.slice(0, -2);
    }
    if (lower.endsWith('s')) {
      return lower.slice(0, -1);
    }
    
    return tableName;
  }
}

// Export singleton
export const screenBlueprintGenerator = new ScreenBlueprintGenerator();
