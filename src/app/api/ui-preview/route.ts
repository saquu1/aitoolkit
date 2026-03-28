// =============================================================================
// UI Preview API - Live Preview of Generated React Components
// =============================================================================
// Provides sandboxed preview of generated components with mock data
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  TableDef,
  ColumnDef,
} from '@/lib/types';
import { parseSqlServer } from '@/lib/sql-parser';
import { parseMySQL } from '@/lib/mysql-parser';
import { parsePostgreSQL } from '@/lib/postgresql-parser';
import { detectDatabaseType } from '@/lib/db-connection';
import { generateReactComponents, ComponentGenerationOptions } from '@/lib/parsers/react-generator';

// =============================================================================
// Types
// =============================================================================

interface PreviewRequest {
  action: 'preview' | 'mock-data' | 'validate' | 'theme';
  
  // For preview action
  componentType?: 'form' | 'list' | 'detail' | 'dashboard';
  tableName?: string;
  sql?: string;
  dbType?: 'sqlserver' | 'mysql' | 'postgresql';
  
  // Custom fields (if no SQL provided)
  fields?: PreviewField[];
  
  // Generation options
  options?: Partial<ComponentGenerationOptions>;
  
  // Mock data customization
  mockDataOptions?: MockDataOptions;
  
  // Theme customization
  theme?: ThemeConfig;
}

interface PreviewField {
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: unknown;
  placeholder?: string;
  validation?: { type: string; value?: string | number }[];
}

interface MockDataOptions {
  rowCount?: number;
  locale?: string;
  seed?: number;
  includeNulls?: boolean;
  nullProbability?: number;
}

interface ThemeConfig {
  primaryColor?: string;
  accentColor?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  fontFamily?: string;
  darkMode?: boolean;
}

interface PreviewResponse {
  success: boolean;
  code?: string;
  mockData?: Record<string, unknown>[];
  html?: string;
  styles?: string;
  scripts?: string;
  dependencies?: string[];
  errors?: string[];
  warnings?: string[];
  meta?: {
    tableName?: string;
    componentType?: string;
    fieldCount?: number;
    generatedAt?: string;
  };
}

// =============================================================================
// API Handler
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse<PreviewResponse>> {
  try {
    const body: PreviewRequest = await req.json();
    const { action } = body;

    switch (action) {
      case 'preview':
        return await handlePreview(body);
      case 'mock-data':
        return await handleMockData(body);
      case 'validate':
        return await handleValidate(body);
      case 'theme':
        return await handleTheme(body);
      default:
        return NextResponse.json(
          { success: false, errors: [`Unknown action: ${action}`] },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('UI Preview API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// Preview Handler
// =============================================================================

async function handlePreview(data: PreviewRequest): Promise<NextResponse<PreviewResponse>> {
  const { 
    componentType = 'form', 
    tableName = 'Entity', 
    sql, 
    dbType, 
    fields: customFields,
    options = {},
    mockDataOptions = {}
  } = data;

  let tables: TableDef[] = [];
  let errors: string[] = [];

  // Parse SQL if provided
  if (sql) {
    const detectedType = detectDatabaseType(sql);
    const effectiveType = dbType || detectedType || 'sqlserver';

    try {
      let result;
      switch (effectiveType) {
        case 'mysql':
          result = parseMySQL(sql);
          break;
        case 'postgresql':
          result = parsePostgreSQL(sql);
          break;
        case 'sqlserver':
        default:
          result = parseSqlServer(sql);
          break;
      }
      tables = result.tables;
      errors = result.errors;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'SQL parsing failed');
    }
  }

  // Convert custom fields to table if provided
  if (customFields && customFields.length > 0 && tables.length === 0) {
    tables = [{
      schemaName: 'public',
      tableName: tableName,
      columns: customFields.map(f => ({
        name: f.name,
        dataType: mapFieldTypeToSQL(f.type),
        isNullable: !f.required,
        isPrimaryKey: false,
        isIdentity: false,
      })),
      foreignKeys: [],
    }];
  }

  // Generate component code
  const generationOptions: ComponentGenerationOptions = {
    styleSystem: 'tailwind',
    componentLibrary: 'shadcn',
    includeValidations: true,
    includeTypeScript: true,
    stateManagement: 'react-hook-form',
    dataFetching: 'tanstack-query',
    router: 'next-app',
    ...options,
  };

  const result = generateReactComponents(
    [], // C# results (empty for now)
    tables,
    [], // CSHTML results (empty for now)
    undefined,
    generationOptions
  );

  // Find the matching component
  const component = result.components.find(c => 
    c.viewType === componentType && 
    (tableName ? c.tableName.toLowerCase() === tableName.toLowerCase() : true)
  );

  if (!component) {
    return NextResponse.json({
      success: false,
      errors: ['Could not generate component preview'],
    });
  }

  // Generate mock data for preview
  const table = tables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
  const mockData = table ? generateMockData(table.columns, mockDataOptions) : [];

  // Generate preview HTML
  const previewHtml = generatePreviewHtml(component.files[0]?.content || '', mockData, componentType);

  return NextResponse.json({
    success: true,
    code: component.files[0]?.content,
    mockData: mockData.slice(0, mockDataOptions.rowCount || 5),
    html: previewHtml.html,
    styles: previewHtml.styles,
    dependencies: component.dependencies.map(d => d.name),
    errors: errors.length > 0 ? errors : undefined,
    meta: {
      tableName,
      componentType,
      fieldCount: table?.columns.length || customFields?.length || 0,
      generatedAt: new Date().toISOString(),
    },
  });
}

// =============================================================================
// Mock Data Handler
// =============================================================================

async function handleMockData(data: PreviewRequest): Promise<NextResponse<PreviewResponse>> {
  const { sql, dbType, tableName, fields: customFields, mockDataOptions = {} } = data;

  let columns: ColumnDef[] = [];

  // Parse SQL if provided
  if (sql) {
    const detectedType = detectDatabaseType(sql);
    const effectiveType = dbType || detectedType || 'sqlserver';

    try {
      let result;
      switch (effectiveType) {
        case 'mysql':
          result = parseMySQL(sql);
          break;
        case 'postgresql':
          result = parsePostgreSQL(sql);
          break;
        default:
          result = parseSqlServer(sql);
          break;
      }
      
      const table = result.tables.find(t => 
        tableName ? t.tableName.toLowerCase() === tableName.toLowerCase() : true
      );
      columns = table?.columns || [];
    } catch (e) {
      return NextResponse.json({
        success: false,
        errors: [e instanceof Error ? e.message : 'SQL parsing failed'],
      });
    }
  }

  // Use custom fields
  if (customFields && columns.length === 0) {
    columns = customFields.map(f => ({
      name: f.name,
      dataType: mapFieldTypeToSQL(f.type),
      isNullable: !f.required,
      isPrimaryKey: false,
      isIdentity: false,
    }));
  }

  const mockData = generateMockData(columns, {
    rowCount: mockDataOptions.rowCount || 10,
    locale: mockDataOptions.locale || 'en-US',
    seed: mockDataOptions.seed,
    includeNulls: mockDataOptions.includeNulls ?? true,
    nullProbability: mockDataOptions.nullProbability ?? 0.1,
  });

  return NextResponse.json({
    success: true,
    mockData,
    meta: {
      fieldCount: columns.length,
    },
  });
}

// =============================================================================
// Validation Handler
// =============================================================================

async function handleValidate(data: PreviewRequest): Promise<NextResponse<PreviewResponse>> {
  const { sql, dbType } = data;

  if (!sql) {
    return NextResponse.json({
      success: false,
      errors: ['SQL is required for validation'],
    });
  }

  const detectedType = detectDatabaseType(sql);
  const effectiveType = dbType || detectedType || 'sqlserver';

  let result;
  try {
    switch (effectiveType) {
      case 'mysql':
        result = parseMySQL(sql);
        break;
      case 'postgresql':
        result = parsePostgreSQL(sql);
        break;
      default:
        result = parseSqlServer(sql);
        break;
    }
  } catch (e) {
    return NextResponse.json({
      success: false,
      errors: [e instanceof Error ? e.message : 'SQL validation failed'],
    });
  }

  return NextResponse.json({
    success: result.errors.length === 0,
    errors: result.errors.length > 0 ? result.errors : undefined,
    warnings: result.warnings.length > 0 ? result.warnings : undefined,
    meta: {
      tableName: result.tables[0]?.tableName,
      fieldCount: result.tables[0]?.columns.length || 0,
    },
  });
}

// =============================================================================
// Theme Handler
// =============================================================================

async function handleTheme(data: PreviewRequest): Promise<NextResponse<PreviewResponse>> {
  const { theme = {} } = data;

  const defaultTheme: ThemeConfig = {
    primaryColor: '#3b82f6',
    accentColor: '#8b5cf6',
    borderRadius: 'md',
    fontFamily: 'Inter, system-ui, sans-serif',
    darkMode: false,
  };

  const mergedTheme = { ...defaultTheme, ...theme };

  const styles = generateThemeStyles(mergedTheme);

  return NextResponse.json({
    success: true,
    styles,
    meta: {
      generatedAt: new Date().toISOString(),
    },
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map field type to SQL type
 */
function mapFieldTypeToSQL(type: string): string {
  const typeMap: Record<string, string> = {
    'text': 'NVARCHAR',
    'email': 'NVARCHAR',
    'password': 'NVARCHAR',
    'number': 'INT',
    'currency': 'DECIMAL',
    'date': 'DATE',
    'datetime': 'DATETIME',
    'boolean': 'BIT',
    'textarea': 'NVARCHAR',
    'file': 'VARBINARY',
  };
  
  return typeMap[type.toLowerCase()] || 'NVARCHAR';
}

/**
 * Generate mock data for columns
 */
function generateMockData(
  columns: ColumnDef[],
  options: MockDataOptions
): Record<string, unknown>[] {
  const { rowCount = 10, includeNulls = true, nullProbability = 0.1, seed } = options;
  
  // Seeded random for reproducibility
  let currentSeed = seed || Date.now();
  const seededRandom = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };

  const data: Record<string, unknown>[] = [];

  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, unknown> = {};

    for (const col of columns) {
      // Skip identity columns
      if (col.isIdentity) {
        row[col.name] = i + 1;
        continue;
      }

      // Random null based on probability
      if (includeNulls && !col.isPrimaryKey && seededRandom() < nullProbability) {
        row[col.name] = null;
        continue;
      }

      row[col.name] = generateMockValue(col, seededRandom, i);
    }

    data.push(row);
  }

  return data;
}

/**
 * Generate mock value for a column
 */
function generateMockValue(
  col: ColumnDef,
  random: () => number,
  index: number
): unknown {
  const name = col.name.toLowerCase();
  const type = col.dataType.toUpperCase();

  // Name-based inference
  if (name.includes('email')) {
    return `user${index + 1}@example.com`;
  }
  if (name.includes('phone') || name.includes('tel')) {
    return `+1-555-${String(Math.floor(random() * 900) + 100)}-${String(Math.floor(random() * 9000) + 1000)}`;
  }
  if (name.includes('first_name') || name === 'firstname') {
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Lisa'];
    return firstNames[Math.floor(random() * firstNames.length)];
  }
  if (name.includes('last_name') || name === 'lastname') {
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    return lastNames[Math.floor(random() * lastNames.length)];
  }
  if (name.includes('name') && !name.includes('first') && !name.includes('last')) {
    return `Item ${index + 1}`;
  }
  if (name.includes('address')) {
    return `${Math.floor(random() * 9999) + 1} Main Street`;
  }
  if (name.includes('city')) {
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];
    return cities[Math.floor(random() * cities.length)];
  }
  if (name.includes('country')) {
    const countries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany'];
    return countries[Math.floor(random() * countries.length)];
  }
  if (name.includes('status')) {
    const statuses = ['Active', 'Inactive', 'Pending', 'Completed'];
    return statuses[Math.floor(random() * statuses.length)];
  }
  if (name.includes('description') || name.includes('notes')) {
    return `This is a sample description for record ${index + 1}.`;
  }
  if (name.includes('url') || name.includes('website')) {
    return `https://example${index + 1}.com`;
  }
  if (name.includes('price') || name.includes('amount') || name.includes('cost')) {
    return parseFloat((random() * 1000).toFixed(2));
  }
  if (name.includes('quantity') || name.includes('count')) {
    return Math.floor(random() * 100) + 1;
  }
  if (name.includes('is_') || name.includes('has_')) {
    return random() > 0.5;
  }
  if (name.includes('created') || name.includes('updated')) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(random() * 365));
    return date.toISOString();
  }

  // Type-based generation
  if (type.includes('INT')) {
    return Math.floor(random() * 10000);
  }
  if (type.includes('DECIMAL') || type.includes('FLOAT') || type.includes('NUMERIC')) {
    return parseFloat((random() * 10000).toFixed(2));
  }
  if (type === 'BIT' || type === 'BOOLEAN') {
    return random() > 0.5;
  }
  if (type.includes('DATE') || type.includes('TIME')) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(random() * 365));
    return date.toISOString();
  }
  if (type.includes('TEXT') || type.includes('VARCHAR')) {
    const length = col.maxLength ? parseInt(col.maxLength) : 50;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
    let result = '';
    for (let i = 0; i < Math.min(length, 30); i++) {
      result += chars.charAt(Math.floor(random() * chars.length));
    }
    return result.trim();
  }
  if (type.includes('UNIQUEIDENTIFIER') || type.includes('UUID') || type.includes('GUID')) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(random() * 16);
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Default
  return `Value ${index + 1}`;
}

/**
 * Generate preview HTML with embedded component
 */
function generatePreviewHtml(
  code: string,
  mockData: Record<string, unknown>[],
  componentType: string
): { html: string; styles: string } {
  // Extract component name
  const componentMatch = code.match(/export\s+(?:const\s+)?(\w+)/);
  const componentName = componentMatch ? componentMatch[1] : 'Component';

  const styles = `
/* Preview Styles */
.preview-container {
  font-family: Inter, system-ui, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
.preview-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 24px;
  margin-bottom: 16px;
}
.preview-header {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
}
.preview-field {
  margin-bottom: 16px;
}
.preview-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  color: #374151;
}
.preview-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}
.preview-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.preview-table {
  width: 100%;
  border-collapse: collapse;
}
.preview-table th,
.preview-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}
.preview-table th {
  background: #f9fafb;
  font-weight: 500;
}
.preview-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.preview-button-primary {
  background: #3b82f6;
  color: white;
  border: none;
}
.preview-button-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}
`;

  let html = '';

  switch (componentType) {
    case 'form':
      html = generateFormPreviewHtml(componentName, mockData[0] || {});
      break;
    case 'list':
      html = generateListPreviewHtml(componentName, mockData);
      break;
    case 'detail':
      html = generateDetailPreviewHtml(componentName, mockData[0] || {});
      break;
    case 'dashboard':
      html = generateDashboardPreviewHtml(componentName, mockData);
      break;
    default:
      html = generateFormPreviewHtml(componentName, mockData[0] || {});
  }

  return { html, styles };
}

/**
 * Generate form preview HTML
 */
function generateFormPreviewHtml(
  componentName: string,
  sampleData: Record<string, unknown>
): string {
  const fields = Object.entries(sampleData).map(([name, value]) => ({
    name,
    value,
    type: typeof value === 'number' ? 'number' : 
          typeof value === 'boolean' ? 'checkbox' : 'text',
  }));

  return `
<div class="preview-container">
  <div class="preview-card">
    <div class="preview-header">${componentName}</div>
    <form class="preview-form">
      ${fields.map(f => `
        <div class="preview-field">
          <label class="preview-label">${f.name}</label>
          ${f.type === 'checkbox' 
            ? `<input type="checkbox" class="preview-checkbox" ${f.value ? 'checked' : ''} />`
            : f.type === 'number'
            ? `<input type="number" class="preview-input" value="${f.value}" />`
            : `<input type="text" class="preview-input" value="${f.value || ''}" />`
          }
        </div>
      `).join('')}
      <div class="preview-field" style="margin-top: 24px;">
        <button type="button" class="preview-button preview-button-primary">Submit</button>
        <button type="button" class="preview-button preview-button-secondary" style="margin-left: 8px;">Cancel</button>
      </div>
    </form>
  </div>
</div>
`;
}

/**
 * Generate list preview HTML
 */
function generateListPreviewHtml(
  componentName: string,
  data: Record<string, unknown>[]
): string {
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return `
<div class="preview-container">
  <div class="preview-card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div class="preview-header" style="margin-bottom: 0;">${componentName}</div>
      <button class="preview-button preview-button-primary">+ Add New</button>
    </div>
    <input type="text" class="preview-input" placeholder="Search..." style="margin-bottom: 16px; max-width: 300px;" />
    <table class="preview-table">
      <thead>
        <tr>
          ${columns.map(col => `<th>${col}</th>`).join('')}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${data.slice(0, 5).map(row => `
          <tr>
            ${columns.map(col => `<td>${row[col] ?? '-'}</td>`).join('')}
            <td>
              <button class="preview-button preview-button-secondary" style="padding: 4px 8px; font-size: 12px;">Edit</button>
              <button class="preview-button preview-button-secondary" style="padding: 4px 8px; font-size: 12px; margin-left: 4px; color: #ef4444;">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: #6b7280;">
      <span>Showing ${Math.min(5, data.length)} of ${data.length} items</span>
      <div>
        <button class="preview-button preview-button-secondary" style="padding: 4px 12px;">Previous</button>
        <button class="preview-button preview-button-secondary" style="padding: 4px 12px; margin-left: 8px;">Next</button>
      </div>
    </div>
  </div>
</div>
`;
}

/**
 * Generate detail preview HTML
 */
function generateDetailPreviewHtml(
  componentName: string,
  data: Record<string, unknown>
): string {
  const fields = Object.entries(data);

  return `
<div class="preview-container">
  <div class="preview-card">
    <div class="preview-header">${componentName}</div>
    <dl style="display: grid; gap: 16px;">
      ${fields.map(([name, value]) => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <dt style="font-weight: 500; color: #374151;">${name}</dt>
          <dd style="color: #6b7280;">${value ?? '-'}</dd>
        </div>
      `).join('')}
    </dl>
    <div style="margin-top: 24px;">
      <button class="preview-button preview-button-secondary">Back to List</button>
      <button class="preview-button preview-button-primary" style="margin-left: 8px;">Edit</button>
    </div>
  </div>
</div>
`;
}

/**
 * Generate dashboard preview HTML with actual widgets
 */
function generateDashboardPreviewHtml(
  componentName: string,
  data: Record<string, unknown>[]
): string {
  // Calculate metrics from data
  const totalCount = data.length;
  const activeCount = data.filter(row => 
    Object.entries(row).some(([k, v]) => 
      k.toLowerCase().includes('status') && String(v).toLowerCase() === 'active'
    )
  ).length;

  return `
<div class="preview-container">
  <div class="preview-header" style="margin-bottom: 24px;">${componentName}</div>
  
  <!-- KPI Cards -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
    <div class="preview-card" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;">
      <div style="font-size: 14px; opacity: 0.9;">Total Records</div>
      <div style="font-size: 32px; font-weight: 600; margin-top: 8px;">${totalCount}</div>
      <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">+12% from last month</div>
    </div>
    
    <div class="preview-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
      <div style="font-size: 14px; opacity: 0.9;">Active Items</div>
      <div style="font-size: 32px; font-weight: 600; margin-top: 8px;">${activeCount}</div>
      <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">${totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0}% of total</div>
    </div>
    
    <div class="preview-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white;">
      <div style="font-size: 14px; opacity: 0.9;">New This Week</div>
      <div style="font-size: 32px; font-weight: 600; margin-top: 8px;">${Math.floor(totalCount * 0.15)}</div>
      <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">+5 from last week</div>
    </div>
    
    <div class="preview-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;">
      <div style="font-size: 14px; opacity: 0.9;">Pending Review</div>
      <div style="font-size: 32px; font-weight: 600; margin-top: 8px;">${Math.floor(totalCount * 0.08)}</div>
      <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">Needs attention</div>
    </div>
  </div>
  
  <!-- Charts Row -->
  <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px;">
    <!-- Bar Chart -->
    <div class="preview-card">
      <div style="font-weight: 600; margin-bottom: 16px;">Monthly Trend</div>
      <div style="display: flex; align-items: flex-end; gap: 8px; height: 200px;">
        ${[65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 50, 88].map((h, i) => `
          <div style="flex: 1; background: linear-gradient(to top, #3b82f6, #60a5fa); border-radius: 4px 4px 0 0; height: ${h}%; opacity: ${0.5 + (i * 0.04)};"></div>
        `).join('')}
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 10px; color: #6b7280;">
        ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => `<span>${m}</span>`).join('')}
      </div>
    </div>
    
    <!-- Donut Chart -->
    <div class="preview-card">
      <div style="font-weight: 600; margin-bottom: 16px;">Status Distribution</div>
      <div style="display: flex; align-items: center; justify-content: center;">
        <svg width="150" height="150" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" stroke-width="20"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" stroke-width="20" 
            stroke-dasharray="${activeCount / totalCount * 251} 251" stroke-linecap="round" transform="rotate(-90 50 50)"/>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" stroke-width="20" 
            stroke-dasharray="${0.15 * 251} 251" stroke-dashoffset="-${activeCount / totalCount * 251}" stroke-linecap="round" transform="rotate(-90 50 50)"/>
        </svg>
      </div>
      <div style="display: flex; justify-content: center; gap: 16px; margin-top: 16px; font-size: 12px;">
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 12px; height: 12px; background: #10b981; border-radius: 2px;"></div>
          <span>Active</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 12px; height: 12px; background: #f59e0b; border-radius: 2px;"></div>
          <span>Pending</span>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Recent Activity -->
  <div class="preview-card">
    <div style="font-weight: 600; margin-bottom: 16px;">Recent Activity</div>
    <table class="preview-table">
      <thead>
        <tr>
          <th>ID</th>
          ${data.length > 0 ? Object.keys(data[0]).slice(0, 3).map(k => `<th>${k}</th>`).join('') : '<th>Name</th><th>Status</th><th>Created</th>'}
        </tr>
      </thead>
      <tbody>
        ${data.slice(0, 5).map((row, i) => `
          <tr>
            <td>${i + 1}</td>
            ${Object.values(row).slice(0, 3).map(v => `<td>${v ?? '-'}</td>`).join('')}
          </tr>
        `).join('') || '<tr><td colspan="4" style="text-align: center; color: #6b7280;">No recent activity</td></tr>'}
      </tbody>
    </table>
  </div>
</div>
`;
}

/**
 * Generate theme styles
 */
function generateThemeStyles(theme: ThemeConfig): string {
  const radiusMap: Record<string, string> = {
    'none': '0',
    'sm': '0.25rem',
    'md': '0.5rem',
    'lg': '0.75rem',
    'full': '9999px',
  };

  return `
:root {
  --primary: ${theme.primaryColor};
  --accent: ${theme.accentColor};
  --radius: ${radiusMap[theme.borderRadius || 'md']};
  --font-family: ${theme.fontFamily};
  ${theme.darkMode ? `
  --background: #0a0a0a;
  --foreground: #fafafa;
  --card: #171717;
  --card-foreground: #fafafa;
  ` : `
  --background: #ffffff;
  --foreground: #0a0a0a;
  --card: #ffffff;
  --card-foreground: #0a0a0a;
  `}
}

* {
  border-radius: var(--radius);
}

body {
  font-family: var(--font-family);
  background: var(--background);
  color: var(--foreground);
}
`;
}

// =============================================================================
// GET Handler - API Info
// =============================================================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    name: 'UI Preview API',
    version: '1.0.0',
    description: 'Generate live previews of React components from SQL schema',
    actions: [
      {
        name: 'preview',
        description: 'Generate component preview with code, mock data, and HTML',
        params: ['componentType', 'tableName', 'sql', 'fields', 'options'],
      },
      {
        name: 'mock-data',
        description: 'Generate mock data for testing',
        params: ['sql', 'tableName', 'fields', 'mockDataOptions'],
      },
      {
        name: 'validate',
        description: 'Validate SQL syntax',
        params: ['sql', 'dbType'],
      },
      {
        name: 'theme',
        description: 'Generate theme styles',
        params: ['theme'],
      },
    ],
    componentTypes: ['form', 'list', 'detail', 'dashboard'],
    supportedDbTypes: ['sqlserver', 'mysql', 'postgresql'],
  });
}
