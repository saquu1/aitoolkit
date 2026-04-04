// =============================================================================
// React Component Generator - Unified Intelligence to React Code
// =============================================================================
// Generates React components from parsed C#, SQL, and CSHTML intelligence
// Supports Form, List, Detail, and Dashboard view types
// =============================================================================

import {
  TableDef,
  ColumnDef,
  ForeignKeyDef,
  UIComponentType,
  ValidationRule,
} from '../types';
import {
  CSharpParseResult,
  CSharpProperty,
  ValidationAttributeInfo,
  DisplayIntelligence,
} from './csharp-parser';
import {
  ParsedCSHTMLView,
  ParsedFormField,
  ReactBlueprint,
  ReactFieldBlueprint,
  ReactListBlueprint,
} from '../cshtml-parser';
import { GapDetectionResult, FieldMapping } from './gap-detector';

// =============================================================================
// Generator Types
// =============================================================================

/**
 * Component Generation Options
 */
export interface ComponentGenerationOptions {
  // Output style
  styleSystem: 'tailwind' | 'css-modules' | 'styled-components';
  componentLibrary: 'shadcn' | 'mui' | 'antd' | 'chakra' | 'custom';
  
  // Features
  includeValidations: boolean;
  includeTypeScript: boolean;
  includeTests: boolean;
  includeStorybook: boolean;
  
  // State management
  stateManagement: 'react-state' | 'react-hook-form' | 'formik' | 'tanstack-form';
  
  // Data fetching
  dataFetching: 'fetch' | 'tanstack-query' | 'swr' | 'urql';
  
  // Routing
  router: 'next-app' | 'next-pages' | 'react-router';
  
  // Code style
  useArrowFunctions: boolean;
  useNamedExports: boolean;
  includeComments: boolean;
  maxLineLength: number;
}

/**
 * Generated Component
 */
export interface GeneratedComponent {
  // Metadata
  componentName: string;
  tableName: string;
  viewType: 'form' | 'list' | 'detail' | 'dashboard';
  
  // Source tracking
  sources: {
    csharp?: string;
    sql?: string;
    cshtml?: string;
  };
  
  // Generated code
  files: GeneratedFile[];
  
  // Dependencies
  dependencies: ComponentDependency[];
  
  // Validation schema
  validationSchema?: ValidationSchemaOutput;
  
  // API hooks
  apiHooks: APIHookDefinition[];
  
  // Metadata
  estimatedLOC: number;
  generationTime: number;
  confidence: number;
}

/**
 * Generated File
 */
export interface GeneratedFile {
  path: string;
  content: string;
  language: 'typescript' | 'typescript-tsx' | 'css' | 'json';
  description: string;
}

/**
 * Component Dependency
 */
export interface ComponentDependency {
  name: string;
  type: 'npm' | 'local' | 'ui-library';
  version?: string;
  importPath: string;
}

/**
 * Validation Schema Output
 */
export interface ValidationSchemaOutput {
  library: 'zod' | 'yup' | 'joi';
  schema: string;
  types: string;
}

/**
 * API Hook Definition
 */
export interface APIHookDefinition {
  hookName: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  requestBody?: string;
  responseType: string;
  hasPagination: boolean;
}

/**
 * Field Intelligence for Generation
 */
export interface UnifiedFieldIntelligence {
  name: string;
  type: string;
  
  // From SQL
  sqlType?: string;
  sqlMaxLength?: number;
  sqlNullable?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  fkTarget?: string;
  
  // From C#
  csharpType?: string;
  isRequired?: boolean;
  validations: ValidationAttributeInfo[];
  display?: DisplayIntelligence;
  
  // From CSHTML
  uiType: UIComponentType;
  label: string;
  placeholder?: string;
  defaultValue?: unknown;
  cssClass?: string;
  colSpan: number;
  order: number;
  
  // Options for dropdowns
  options?: { label: string; value: string }[];
  
  // Cross-reference
  confidence: number;
}

/**
 * Component Generation Result
 */
export interface ComponentGenerationResult {
  components: GeneratedComponent[];
  sharedTypes: GeneratedFile[];
  apiClient: GeneratedFile;
  validationSchemas: GeneratedFile[];
  indexExports: GeneratedFile;
  
  // Summary
  summary: {
    totalComponents: number;
    totalFiles: number;
    totalLOC: number;
    generationTimeMs: number;
    dependencies: ComponentDependency[];
  };
}

// =============================================================================
// Default Options
// =============================================================================

const DEFAULT_OPTIONS: ComponentGenerationOptions = {
  styleSystem: 'tailwind',
  componentLibrary: 'shadcn',
  includeValidations: true,
  includeTypeScript: true,
  includeTests: false,
  includeStorybook: false,
  stateManagement: 'react-hook-form',
  dataFetching: 'tanstack-query',
  router: 'next-app',
  useArrowFunctions: true,
  useNamedExports: true,
  includeComments: true,
  maxLineLength: 100,
};

// =============================================================================
// React Component Generator Engine
// =============================================================================

/**
 * React Component Generator Engine
 */
export class ReactGeneratorEngine {
  private options: ComponentGenerationOptions;
  private startTime: number = 0;
  
  // Input data
  private csharpResults: CSharpParseResult[] = [];
  private sqlTables: TableDef[] = [];
  private cshtmlResults: ParsedCSHTMLView[] = [];
  private gapResult?: GapDetectionResult;
  
  // Generated components
  private components: GeneratedComponent[] = [];
  
  constructor(options: Partial<ComponentGenerationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Generate React components from unified intelligence
   */
  generate(
    csharpResults: CSharpParseResult[],
    sqlTables: TableDef[],
    cshtmlResults: ParsedCSHTMLView[],
    gapResult?: GapDetectionResult
  ): ComponentGenerationResult {
    this.startTime = Date.now();
    
    // Store inputs
    this.csharpResults = csharpResults;
    this.sqlTables = sqlTables;
    this.cshtmlResults = cshtmlResults;
    this.gapResult = gapResult;
    
    // Clear previous results
    this.components = [];
    
    // Generate components for each view
    for (const cshtml of cshtmlResults) {
      const tableName = this.inferTableName(cshtml);
      const table = sqlTables.find(t => t.tableName.toLowerCase() === tableName?.toLowerCase());
      const csharp = csharpResults.find(c =>
        c.className.toLowerCase() === cshtml.model?.name?.toLowerCase() ||
        c.inferredTable?.toLowerCase() === tableName?.toLowerCase()
      );
      
      // Generate based on view type
      switch (cshtml.viewType) {
        case 'form':
          this.generateFormComponent(cshtml, table, csharp);
          break;
        case 'list':
          this.generateListComponent(cshtml, table, csharp);
          break;
        case 'details':
          this.generateDetailComponent(cshtml, table, csharp);
          break;
        case 'dashboard':
          this.generateDashboardComponent(cshtml, table, csharp);
          break;
        case 'mixed':
          this.generateFormComponent(cshtml, table, csharp);
          this.generateListComponent(cshtml, table, csharp);
          break;
        default:
          this.generateFormComponent(cshtml, table, csharp);
      }
    }
    
    // Generate shared types
    const sharedTypes = this.generateSharedTypes();
    
    // Generate API client
    const apiClient = this.generateAPIClient();
    
    // Generate validation schemas
    const validationSchemas = this.generateValidationSchemas();
    
    // Generate index exports
    const indexExports = this.generateIndexExports();
    
    // Build summary
    const totalLOC = this.components.reduce((sum, c) => sum + c.estimatedLOC, 0);
    const allDeps = this.components.flatMap(c => c.dependencies);
    const uniqueDeps = this.uniqueDependencies(allDeps);
    
    return {
      components: this.components,
      sharedTypes,
      apiClient,
      validationSchemas,
      indexExports,
      summary: {
        totalComponents: this.components.length,
        totalFiles: this.components.reduce((sum, c) => sum + c.files.length, 0) + 
                     sharedTypes.length + 1 + validationSchemas.length + indexExports.length,
        totalLOC,
        generationTimeMs: Date.now() - this.startTime,
        dependencies: uniqueDeps,
      },
    };
  }
  
  /**
   * Generate Form Component
   */
  private generateFormComponent(
    cshtml: ParsedCSHTMLView,
    table?: TableDef,
    csharp?: CSharpParseResult
  ): void {
    const componentName = this.toComponentName(cshtml.viewName, 'Form');
    const tableName = table?.tableName || this.inferTableName(cshtml) || 'Unknown';
    
    // Unify field intelligence
    const fields = this.unifyFieldIntelligence(cshtml, table, csharp);
    
    // Generate validation schema
    const validationSchema = this.generateZodSchema(fields, componentName);
    
    // Generate component code
    const componentCode = this.generateFormComponentCode(
      componentName,
      tableName,
      fields,
      validationSchema
    );
    
    // Generate API hook
    const apiHooks = this.generateFormAPIHooks(componentName, tableName, fields);
    
    const component: GeneratedComponent = {
      componentName,
      tableName,
      viewType: 'form',
      sources: {
        csharp: csharp?.fileName,
        sql: table?.tableName,
        cshtml: cshtml.viewName,
      },
      files: [
        {
          path: `components/${tableName}/${componentName}.tsx`,
          content: componentCode,
          language: 'typescript-tsx',
          description: `Form component for ${tableName}`,
        },
      ],
      dependencies: this.getFormDependencies(),
      validationSchema: {
        library: 'zod',
        schema: validationSchema,
        types: this.generateFormTypes(fields, componentName),
      },
      apiHooks,
      estimatedLOC: componentCode.split('\n').length,
      generationTime: Date.now() - this.startTime,
      confidence: this.calculateConfidence(cshtml, table, csharp),
    };
    
    this.components.push(component);
  }
  
  /**
   * Generate List Component
   */
  private generateListComponent(
    cshtml: ParsedCSHTMLView,
    table?: TableDef,
    csharp?: CSharpParseResult
  ): void {
    const componentName = this.toComponentName(cshtml.viewName, 'List');
    const tableName = table?.tableName || this.inferTableName(cshtml) || 'Unknown';
    
    // Get columns from CSHTML list view or table columns
    const columns = cshtml.list?.columns || table?.columns.map(c => ({
      field: c.name,
      header: this.formatLabel(c.name),
      sortable: true,
    })) || [];
    
    // Generate component code
    const componentCode = this.generateListComponentCode(
      componentName,
      tableName,
      columns,
      cshtml.list
    );
    
    const component: GeneratedComponent = {
      componentName,
      tableName,
      viewType: 'list',
      sources: {
        csharp: csharp?.fileName,
        sql: table?.tableName,
        cshtml: cshtml.viewName,
      },
      files: [
        {
          path: `components/${tableName}/${componentName}.tsx`,
          content: componentCode,
          language: 'typescript-tsx',
          description: `List component for ${tableName}`,
        },
      ],
      dependencies: this.getListDependencies(),
      estimatedLOC: componentCode.split('\n').length,
      generationTime: Date.now() - this.startTime,
      confidence: this.calculateConfidence(cshtml, table, csharp),
      apiHooks: [this.generateListAPIHook(componentName, tableName)],
    };
    
    this.components.push(component);
  }
  
  /**
   * Generate Detail Component
   */
  private generateDetailComponent(
    cshtml: ParsedCSHTMLView,
    table?: TableDef,
    csharp?: CSharpParseResult
  ): void {
    const componentName = this.toComponentName(cshtml.viewName, 'Detail');
    const tableName = table?.tableName || this.inferTableName(cshtml) || 'Unknown';
    
    // Unify field intelligence
    const fields = this.unifyFieldIntelligence(cshtml, table, csharp);
    
    // Generate component code
    const componentCode = this.generateDetailComponentCode(
      componentName,
      tableName,
      fields
    );
    
    const component: GeneratedComponent = {
      componentName,
      tableName,
      viewType: 'detail',
      sources: {
        csharp: csharp?.fileName,
        sql: table?.tableName,
        cshtml: cshtml.viewName,
      },
      files: [
        {
          path: `components/${tableName}/${componentName}.tsx`,
          content: componentCode,
          language: 'typescript-tsx',
          description: `Detail component for ${tableName}`,
        },
      ],
      dependencies: this.getDetailDependencies(),
      estimatedLOC: componentCode.split('\n').length,
      generationTime: Date.now() - this.startTime,
      confidence: this.calculateConfidence(cshtml, table, csharp),
      apiHooks: [this.generateDetailAPIHook(componentName, tableName)],
    };
    
    this.components.push(component);
  }
  
  /**
   * Generate Dashboard Component
   */
  private generateDashboardComponent(
    cshtml: ParsedCSHTMLView,
    table?: TableDef,
    csharp?: CSharpParseResult
  ): void {
    const componentName = this.toComponentName(cshtml.viewName, 'Dashboard');
    const tableName = table?.tableName || this.inferTableName(cshtml) || 'Dashboard';
    
    // Generate component code
    const componentCode = this.generateDashboardComponentCode(
      componentName,
      tableName
    );
    
    const component: GeneratedComponent = {
      componentName,
      tableName,
      viewType: 'dashboard',
      sources: {
        csharp: csharp?.fileName,
        sql: table?.tableName,
        cshtml: cshtml.viewName,
      },
      files: [
        {
          path: `components/${tableName}/${componentName}.tsx`,
          content: componentCode,
          language: 'typescript-tsx',
          description: `Dashboard component for ${tableName}`,
        },
      ],
      dependencies: this.getDashboardDependencies(),
      estimatedLOC: componentCode.split('\n').length,
      generationTime: Date.now() - this.startTime,
      confidence: this.calculateConfidence(cshtml, table, csharp),
      apiHooks: [],
    };
    
    this.components.push(component);
  }
  
  // ===========================================================================
  // Code Generation Methods
  // ===========================================================================
  
  /**
   * Generate Form Component Code
   */
  private generateFormComponentCode(
    componentName: string,
    tableName: string,
    fields: UnifiedFieldIntelligence[],
    validationSchema: string
  ): string {
    const lines: string[] = [];
    
    // Imports
    lines.push('// ===========================================================================');
    lines.push(`// ${componentName} - Auto-generated from Schema Architect`);
    lines.push('// ===========================================================================');
    lines.push('');
    lines.push("import { useForm } from 'react-hook-form';");
    lines.push("import { zodResolver } from '@hookform/resolvers/zod';");
    lines.push("import { z } from 'zod';");
    lines.push("import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';");
    lines.push('');
    
    // UI components
    lines.push("import { Button } from '@/components/ui/button';");
    lines.push("import { Input } from '@/components/ui/input';");
    lines.push("import { Label } from '@/components/ui/label';");
    lines.push("import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';");
    lines.push("import { Textarea } from '@/components/ui/textarea';");
    lines.push("import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';");
    lines.push("import { Checkbox } from '@/components/ui/checkbox';");
    lines.push("import { DatePicker } from '@/components/ui/date-picker';");
    lines.push("import { Alert, AlertDescription } from '@/components/ui/alert';");
    lines.push("import { Loader2 } from 'lucide-react';");
    lines.push('');
    
    // Validation schema
    lines.push('// Validation Schema');
    lines.push(`const ${componentName}Schema = ${validationSchema};`);
    lines.push('');
    lines.push(`type ${componentName}FormData = z.infer<typeof ${componentName}Schema>;`);
    lines.push('');
    
    // API functions
    lines.push('// API Functions');
    lines.push(`const create${tableName} = async (data: ${componentName}FormData) => {`);
    lines.push(`  const response = await fetch('/api/${this.toKebabCase(tableName)}', {`);
    lines.push("    method: 'POST',");
    lines.push("    headers: { 'Content-Type': 'application/json' },");
    lines.push('    body: JSON.stringify(data),');
    lines.push('  });');
    lines.push('  if (!response.ok) throw new Error("Failed to create");');
    lines.push('  return response.json();');
    lines.push('};');
    lines.push('');
    
    lines.push(`const update${tableName} = async (id: string, data: Partial<${componentName}FormData>) => {`);
    lines.push(`  const response = await fetch(\`/api/${this.toKebabCase(tableName)}/\${id}\`, {`);
    lines.push("    method: 'PUT',");
    lines.push("    headers: { 'Content-Type': 'application/json' },");
    lines.push('    body: JSON.stringify(data),');
    lines.push('  });');
    lines.push('  if (!response.ok) throw new Error("Failed to update");');
    lines.push('  return response.json();');
    lines.push('};');
    lines.push('');
    
    // Component Props
    lines.push('// Component Props');
    lines.push(`interface ${componentName}Props {`);
    lines.push('  id?: string;');
    lines.push('  initialData?: Partial<FormData>;');
    lines.push('  onSuccess?: (data: unknown) => void;');
    lines.push('  onCancel?: () => void;');
    lines.push('}');
    lines.push('');
    
    // Component
    lines.push(`export ${this.options.useArrowFunctions ? 'const' : 'function'} ${componentName}${this.options.useArrowFunctions ? ': React.FC<' : '('}${componentName}Props${this.options.useArrowFunctions ? '>' : ''}${this.options.useArrowFunctions ? ' = ' : ''}({`);
    lines.push('  id,');
    lines.push('  initialData,');
    lines.push('  onSuccess,');
    lines.push('  onCancel,');
    if (!this.options.useArrowFunctions) {
      lines.push(`}: ${componentName}Props) {`);
    } else {
      lines.push('}) => {');
    }
    lines.push('  const queryClient = useQueryClient();');
    lines.push('');
    
    // Form setup
    lines.push('  const {');
    lines.push('    register,');
    lines.push('    handleSubmit,');
    lines.push('    formState: { errors, isSubmitting },');
    lines.push('    reset,');
    lines.push('    setValue,');
    lines.push('    watch,');
    lines.push(`  } = useForm<${componentName}FormData>({`);
    lines.push(`    resolver: zodResolver(${componentName}Schema),`);
    lines.push('    defaultValues: initialData,');
    lines.push('  });');
    lines.push('');
    
    // Mutations
    lines.push('  // Mutations');
    lines.push(`  const createMutation = useMutation({`);
    lines.push(`    mutationFn: create${tableName},`);
    lines.push('    onSuccess: (data) => {');
    lines.push(`      queryClient.invalidateQueries({ queryKey: ['${tableName}'] });`);
    lines.push('      onSuccess?.(data);');
    lines.push('    },');
    lines.push('  });');
    lines.push('');
    
    lines.push(`  const updateMutation = useMutation({`);
    lines.push(`    mutationFn: ({ id, data }: { id: string; data: Partial<${componentName}FormData> }) =>`);
    lines.push(`      update${tableName}(id, data),`);
    lines.push('    onSuccess: (data) => {');
    lines.push(`      queryClient.invalidateQueries({ queryKey: ['${tableName}'] });`);
    lines.push('      onSuccess?.(data);');
    lines.push('    },');
    lines.push('  });');
    lines.push('');
    
    // Submit handler
    lines.push('  const onSubmit = handleSubmit(async (data) => {');
    lines.push('    if (id) {');
    lines.push('      await updateMutation.mutateAsync({ id, data });');
    lines.push('    } else {');
    lines.push('      await createMutation.mutateAsync(data);');
    lines.push('    }');
    lines.push('  });');
    lines.push('');
    
    // JSX
    lines.push('  return (');
    lines.push(`    <form onSubmit={onSubmit} className="space-y-6">`);
    lines.push('      {/* Error Alert */}');
    lines.push('      {(createMutation.isError || updateMutation.isError) && (');
    lines.push('        <Alert variant="destructive">');
    lines.push('          <AlertDescription>');
    lines.push('            {createMutation.error?.message || updateMutation.error?.message}');
    lines.push('          </AlertDescription>');
    lines.push('        </Alert>');
    lines.push('      )}');
    lines.push('');
    
    // Fields
    lines.push('      {/* Form Fields */}');
    lines.push('      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">');
    
    for (const field of fields.sort((a, b) => a.order - b.order)) {
      lines.push(this.generateFormFieldCode(field));
    }
    
    lines.push('      </div>');
    lines.push('');
    
    // Actions
    lines.push('      {/* Actions */}');
    lines.push('      <div className="flex justify-end gap-4">');
    lines.push('        {onCancel && (');
    lines.push('          <Button type="button" variant="outline" onClick={onCancel}>');
    lines.push('            Cancel');
    lines.push('          </Button>');
    lines.push('        )}');
    lines.push('        <Button type="submit" disabled={isSubmitting}>');
    lines.push('          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}');
    lines.push(`          {id ? 'Update' : 'Create'} ${tableName}`);
    lines.push('        </Button>');
    lines.push('      </div>');
    lines.push('    </form>');
    lines.push('  );');
    lines.push(this.options.useArrowFunctions ? '};' : '}');
    lines.push('');
    
    lines.push(`export default ${componentName};`);
    
    return lines.join('\n');
  }
  
  /**
   * Generate form field code
   */
  private generateFormFieldCode(field: UnifiedFieldIntelligence): string {
    const lines: string[] = [];
    const fieldName = field.name;
    const label = field.label || this.formatLabel(fieldName);
    const colSpanClass = field.colSpan === 12 ? 'col-span-2' : '';
    
    lines.push(`        {/* ${label} */}`);
    lines.push(`        <div className="${colSpanClass}">`);
    lines.push(`          <Label htmlFor="${fieldName}">${label}${field.isRequired ? ' *' : ''}</Label>`);
    
    switch (field.uiType) {
      case 'text_input':
      case 'email_input':
      case 'password_input':
      case 'phone_input':
      case 'url_input':
        const inputType = field.uiType.replace('_input', '');
        lines.push(`          <Input`);
        lines.push(`            id="${fieldName}"`);
        lines.push(`            type="${inputType}"`);
        lines.push(`            placeholder="${field.placeholder || ''}"`);
        lines.push(`            {...register('${fieldName}')}`);
        lines.push(`          />`);
        break;
        
      case 'number_input':
      case 'currency_input':
        lines.push(`          <Input`);
        lines.push(`            id="${fieldName}"`);
        lines.push(`            type="number"`);
        lines.push(`            step="${field.uiType === 'currency_input' ? '0.01' : '1'}"`);
        lines.push(`            placeholder="${field.placeholder || ''}"`);
        lines.push(`            {...register('${fieldName}', { valueAsNumber: true })}`);
        lines.push(`          />`);
        break;
        
      case 'textarea':
        lines.push(`          <Textarea`);
        lines.push(`            id="${fieldName}"`);
        lines.push(`            placeholder="${field.placeholder || ''}"`);
        lines.push(`            {...register('${fieldName}')}`);
        lines.push(`          />`);
        break;
        
      case 'checkbox':
      case 'toggle':
        lines.push(`          <div className="flex items-center space-x-2 pt-2">`);
        lines.push(`            <Checkbox`);
        lines.push(`              id="${fieldName}"`);
        lines.push(`              onCheckedChange={(checked) => setValue('${fieldName}', checked)}`);
        lines.push(`            />`);
        lines.push(`            <Label htmlFor="${fieldName}">${label}</Label>`);
        lines.push(`          </div>`);
        break;
        
      case 'dropdown':
      case 'multi_select':
        lines.push(`          <Select onValueChange={(value) => setValue('${fieldName}', value)}>`);
        lines.push(`            <SelectTrigger>`);
        lines.push(`              <SelectValue placeholder="${field.placeholder || `Select ${label}`}" />`);
        lines.push(`            </SelectTrigger>`);
        lines.push(`            <SelectContent>`);
        if (field.options) {
          for (const opt of field.options) {
            lines.push(`              <SelectItem value="${opt.value}">${opt.label}</SelectItem>`);
          }
        } else {
          lines.push(`              {/* TODO: Add options from API */}`);
        }
        lines.push(`            </SelectContent>`);
        lines.push(`          </Select>`);
        break;
        
      case 'date_picker':
      case 'datetime_picker':
        lines.push(`          <DatePicker`);
        lines.push(`            onChange={(date) => setValue('${fieldName}', date)}`);
        lines.push(`          />`);
        break;
        
      case 'hidden':
        lines.push(`          <input type="hidden" {...register('${fieldName}')} />`);
        break;
        
      case 'file_upload':
      case 'image_upload':
        lines.push(`          <Input`);
        lines.push(`            id="${fieldName}"`);
        lines.push(`            type="file"`);
        lines.push(`            {...register('${fieldName}')}`);
        lines.push(`          />`);
        break;
        
      default:
        lines.push(`          <Input`);
        lines.push(`            id="${fieldName}"`);
        lines.push(`            placeholder="${field.placeholder || ''}"`);
        lines.push(`            {...register('${fieldName}')}`);
        lines.push(`          />`);
    }
    
    // Error display
    lines.push(`          {errors.${fieldName} && (`);
    lines.push(`            <p className="text-sm text-destructive mt-1">{errors.${fieldName}?.message}</p>`);
    lines.push(`          )}`);
    lines.push(`        </div>`);
    
    return lines.join('\n');
  }
  
  /**
   * Generate List Component Code
   */
  private generateListComponentCode(
    componentName: string,
    tableName: string,
    columns: { field: string; header: string; sortable?: boolean }[],
    listConfig?: ParsedCSHTMLView['list']
  ): string {
    const lines: string[] = [];
    
    // Imports
    lines.push('// ===========================================================================');
    lines.push(`// ${componentName} - Auto-generated from Schema Architect`);
    lines.push('// ===========================================================================');
    lines.push('');
    lines.push("import { useQuery } from '@tanstack/react-query';");
    lines.push("import { useState } from 'react';");
    lines.push('');
    lines.push("import { Button } from '@/components/ui/button';");
    lines.push("import { Input } from '@/components/ui/input';");
    lines.push("import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';");
    lines.push("import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';");
    lines.push("import { Badge } from '@/components/ui/badge';");
    lines.push("import { Loader2, Plus, Pencil, Trash2, Search } from 'lucide-react';");
    lines.push('');
    
    // Type definition
    lines.push(`interface ${tableName} {`);
    lines.push('  id: string;');
    for (const col of columns) {
      lines.push(`  ${col.field}: string;`);
    }
    lines.push('}');
    lines.push('');
    
    // API function
    lines.push('// API Function');
    lines.push(`const fetch${tableName}List = async (params: { page?: number; search?: string }) => {`);
    lines.push(`  const query = new URLSearchParams({`);
    lines.push("    page: String(params.page || 1),");
    lines.push("    search: params.search || '',");
    lines.push('  });');
    lines.push(`  const response = await fetch(\`/api/${this.toKebabCase(tableName)}?\${query}\`);`);
    lines.push('  if (!response.ok) throw new Error("Failed to fetch");');
    lines.push('  return response.json();');
    lines.push('};');
    lines.push('');
    
    // Component Props
    lines.push(`interface ${componentName}Props {`);
    lines.push('  onCreate?: () => void;');
    lines.push('  onEdit?: (id: string) => void;');
    lines.push('  onDelete?: (id: string) => void;');
    lines.push('}');
    lines.push('');
    
    // Component
    lines.push(`export ${this.options.useArrowFunctions ? 'const' : 'function'} ${componentName}${this.options.useArrowFunctions ? ': React.FC<' : '('}${componentName}Props${this.options.useArrowFunctions ? '>' : ''}${this.options.useArrowFunctions ? ' = ' : ''}({`);
    lines.push('  onCreate,');
    lines.push('  onEdit,');
    lines.push('  onDelete,');
    if (!this.options.useArrowFunctions) {
      lines.push(`}: ${componentName}Props) {`);
    } else {
      lines.push('}) => {');
    }
    lines.push('  const [page, setPage] = useState(1);');
    lines.push('  const [search, setSearch] = useState("");');
    lines.push('');
    
    // Query
    lines.push('  const { data, isLoading, error } = useQuery({');
    lines.push(`    queryKey: ['${tableName}', page, search],`);
    lines.push(`    queryFn: () => fetch${tableName}List({ page, search }),`);
    lines.push('  });');
    lines.push('');
    
    // JSX
    lines.push('  return (');
    lines.push('    <Card>');
    lines.push('      <CardHeader className="flex flex-row items-center justify-between">');
    lines.push(`        <CardTitle>${tableName} List</CardTitle>`);
    lines.push('        <Button onClick={onCreate}>');
    lines.push('          <Plus className="mr-2 h-4 w-4" />');
    lines.push('          Add New');
    lines.push('        </Button>');
    lines.push('      </CardHeader>');
    lines.push('      <CardContent>');
    lines.push('        {/* Search */}');
    lines.push('        <div className="flex items-center gap-4 mb-4">');
    lines.push('          <div className="relative flex-1">');
    lines.push('            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />');
    lines.push('            <Input');
    lines.push('              placeholder="Search..."');
    lines.push('              value={search}');
    lines.push('              onChange={(e) => setSearch(e.target.value)}');
    lines.push('              className="pl-9"');
    lines.push('            />');
    lines.push('          </div>');
    lines.push('        </div>');
    lines.push('');
    
    // Table
    lines.push('        {/* Table */}');
    lines.push('        {isLoading ? (');
    lines.push('          <div className="flex justify-center py-8">');
    lines.push('            <Loader2 className="h-8 w-8 animate-spin" />');
    lines.push('          </div>');
    lines.push('        ) : error ? (');
    lines.push('          <div className="text-center py-8 text-destructive">');
    lines.push('            Error loading data');
    lines.push('          </div>');
    lines.push('        ) : (');
    lines.push('          <Table>');
    lines.push('            <TableHeader>');
    lines.push('              <TableRow>');
    for (const col of columns) {
      lines.push(`                <TableHead>${col.header}</TableHead>`);
    }
    lines.push('                <TableHead className="text-right">Actions</TableHead>');
    lines.push('              </TableRow>');
    lines.push('            </TableHeader>');
    lines.push('            <TableBody>');
    lines.push('              {data?.items?.map((item) => (');
    lines.push('                <TableRow key={item.id}>');
    for (const col of columns) {
      lines.push(`                  <TableCell>{item.${col.field}}</TableCell>`);
    }
    lines.push('                  <TableCell className="text-right">');
    lines.push('                    <Button variant="ghost" size="icon" onClick={() => onEdit?.(item.id)}>');
    lines.push('                      <Pencil className="h-4 w-4" />');
    lines.push('                    </Button>');
    lines.push('                    <Button variant="ghost" size="icon" onClick={() => onDelete?.(item.id)}>');
    lines.push('                      <Trash2 className="h-4 w-4 text-destructive" />');
    lines.push('                    </Button>');
    lines.push('                  </TableCell>');
    lines.push('                </TableRow>');
    lines.push('              ))}');
    lines.push('            </TableBody>');
    lines.push('          </Table>');
    lines.push('        )}');
    lines.push('');
    
    // Pagination
    lines.push('        {/* Pagination */}');
    lines.push('        <div className="flex items-center justify-between mt-4">');
    lines.push('          <div className="text-sm text-muted-foreground">');
    lines.push('            Showing {data?.items?.length || 0} of {data?.total || 0} items');
    lines.push('          </div>');
    lines.push('          <div className="flex gap-2">');
    lines.push('            <Button');
    lines.push('              variant="outline"');
    lines.push('              size="sm"');
    lines.push('              onClick={() => setPage(p => Math.max(1, p - 1))}');
    lines.push('              disabled={page === 1}');
    lines.push('            >');
    lines.push('              Previous');
    lines.push('            </Button>');
    lines.push('            <Button');
    lines.push('              variant="outline"');
    lines.push('              size="sm"');
    lines.push('              onClick={() => setPage(p => p + 1)}');
    lines.push('              disabled={!data?.hasMore}');
    lines.push('            >');
    lines.push('              Next');
    lines.push('            </Button>');
    lines.push('          </div>');
    lines.push('        </div>');
    lines.push('      </CardContent>');
    lines.push('    </Card>');
    lines.push('  );');
    lines.push(this.options.useArrowFunctions ? '};' : '}');
    lines.push('');
    
    lines.push(`export default ${componentName};`);
    
    return lines.join('\n');
  }
  
  /**
   * Generate Detail Component Code
   */
  private generateDetailComponentCode(
    componentName: string,
    tableName: string,
    fields: UnifiedFieldIntelligence[]
  ): string {
    const lines: string[] = [];
    
    // Imports
    lines.push('// ===========================================================================');
    lines.push(`// ${componentName} - Auto-generated from Schema Architect`);
    lines.push('// ===========================================================================');
    lines.push('');
    lines.push("import { useQuery } from '@tanstack/react-query';");
    lines.push('');
    lines.push("import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';");
    lines.push("import { Badge } from '@/components/ui/badge';");
    lines.push("import { Loader2 } from 'lucide-react';");
    lines.push('');
    
    // Type definition
    lines.push(`interface ${tableName}Detail {`);
    lines.push('  id: string;');
    for (const field of fields) {
      lines.push(`  ${field.name}: ${this.mapTypeToTS(field.type)};`);
    }
    lines.push('}');
    lines.push('');
    
    // API function
    lines.push(`const fetch${tableName}Detail = async (id: string) => {`);
    lines.push(`  const response = await fetch(\`/api/${this.toKebabCase(tableName)}/\${id}\`);`);
    lines.push('  if (!response.ok) throw new Error("Failed to fetch");');
    lines.push('  return response.json();');
    lines.push('};');
    lines.push('');
    
    // Component Props
    lines.push(`interface ${componentName}Props {`);
    lines.push('  id: string;');
    lines.push('}');
    lines.push('');
    
    // Component
    lines.push(`export ${this.options.useArrowFunctions ? 'const' : 'function'} ${componentName}${this.options.useArrowFunctions ? ': React.FC<' : '('}${componentName}Props${this.options.useArrowFunctions ? '>' : ''}${this.options.useArrowFunctions ? ' = ' : ''}({ id }${this.options.useArrowFunctions ? '' : `: ${componentName}Props`})${this.options.useArrowFunctions ? ' => {' : ' {'}`);
    lines.push('  const { data, isLoading, error } = useQuery({');
    lines.push(`    queryKey: ['${tableName}', id],`);
    lines.push(`    queryFn: () => fetch${tableName}Detail(id),`);
    lines.push('  });');
    lines.push('');
    
    // JSX
    lines.push('  if (isLoading) {');
    lines.push('    return (');
    lines.push('      <div className="flex justify-center py-8">');
    lines.push('        <Loader2 className="h-8 w-8 animate-spin" />');
    lines.push('      </div>');
    lines.push('    );');
    lines.push('  }');
    lines.push('');
    lines.push('  if (error) {');
    lines.push('    return (');
    lines.push('      <div className="text-center py-8 text-destructive">');
    lines.push('        Error loading details');
    lines.push('      </div>');
    lines.push('    );');
    lines.push('  }');
    lines.push('');
    lines.push('  return (');
    lines.push('    <Card>');
    lines.push(`      <CardHeader>`);
    lines.push(`        <CardTitle>${tableName} Details</CardTitle>`);
    lines.push('      </CardHeader>');
    lines.push('      <CardContent>');
    lines.push('        <dl className="space-y-4">');
    
    for (const field of fields) {
      lines.push(`          <div className="flex justify-between">`);
      lines.push(`            <dt className="font-medium">${field.label}</dt>`);
      lines.push(`            <dd>{data?.${field.name}}</dd>`);
      lines.push(`          </div>`);
    }
    
    lines.push('        </dl>');
    lines.push('      </CardContent>');
    lines.push('    </Card>');
    lines.push('  );');
    lines.push(this.options.useArrowFunctions ? '};' : '}');
    lines.push('');
    
    lines.push(`export default ${componentName};`);
    
    return lines.join('\n');
  }
  
  /**
   * Generate Dashboard Component Code with Real Widgets
   */
  private generateDashboardComponentCode(
    componentName: string,
    tableName: string,
    fields?: UnifiedFieldIntelligence[]
  ): string {
    const lines: string[] = [];
    
    lines.push('// ===========================================================================');
    lines.push(`// ${componentName} - Auto-generated from Schema Architect`);
    lines.push('// ===========================================================================');
    lines.push('');
    
    // Imports
    lines.push("import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';");
    lines.push("import { useQuery } from '@tanstack/react-query';");
    lines.push("import { Activity, TrendingUp, TrendingDown, Users, DollarSign, Calendar, FileText, AlertCircle } from 'lucide-react';");
    lines.push('');
    
    // Types
    lines.push(`interface ${tableName}Stats {`);
    lines.push('  total: number;');
    lines.push('  active: number;');
    lines.push('  inactive: number;');
    lines.push('  newThisMonth: number;');
    lines.push('  growth: number;');
    lines.push('}');
    lines.push('');
    
    // API function
    lines.push(`const fetch${tableName}Stats = async (): Promise<${tableName}Stats> => {`);
    lines.push(`  const response = await fetch('/api/${this.toKebabCase(tableName)}/stats');`);
    lines.push('  if (!response.ok) throw new Error("Failed to fetch stats");');
    lines.push('  return response.json();');
    lines.push('};');
    lines.push('');
    
    lines.push(`const fetchRecent${tableName} = async () => {`);
    lines.push(`  const response = await fetch('/api/${this.toKebabCase(tableName)}?limit=5');`);
    lines.push('  if (!response.ok) throw new Error("Failed to fetch recent items");');
    lines.push('  return response.json();');
    lines.push('};');
    lines.push('');
    
    // Component
    lines.push(`export ${this.options.useArrowFunctions ? 'const ' : ''}${componentName}${this.options.useArrowFunctions ? ': React.FC = () => ' : ''} ${this.options.useArrowFunctions ? '=>' : ''} {`);
    
    // Queries
    lines.push('  const { data: stats, isLoading: statsLoading } = useQuery({');
    lines.push(`    queryKey: ['${tableName}', 'stats'],`);
    lines.push(`    queryFn: fetch${tableName}Stats,`);
    lines.push('  });');
    lines.push('');
    lines.push('  const { data: recentItems, isLoading: itemsLoading } = useQuery({');
    lines.push(`    queryKey: ['${tableName}', 'recent'],`);
    lines.push(`    queryFn: fetchRecent${tableName},`);
    lines.push('  });');
    lines.push('');
    
    // Helper
    lines.push('  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);');
    lines.push('  const formatCurrency = (num: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);');
    lines.push('');
    
    lines.push('  return (');
    lines.push('    <div className="space-y-6">');
    lines.push('      {/* KPI Cards */}');
    lines.push('      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">');
    lines.push('');
    
    // Card 1: Total Records
    lines.push('        {/* Total Records */}');
    lines.push('        <Card className="border-l-4 border-l-blue-500">');
    lines.push('          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">');
    lines.push(`            <CardTitle className="text-sm font-medium">Total ${tableName}</CardTitle>`);
    lines.push('            <FileText className="h-4 w-4 text-muted-foreground" />');
    lines.push('          </CardHeader>');
    lines.push('          <CardContent>');
    lines.push('            {statsLoading ? (');
    lines.push('              <div className="text-2xl font-bold animate-pulse bg-muted h-8 w-16 rounded" />');
    lines.push('            ) : (');
    lines.push('              <>');
    lines.push('                <div className="text-2xl font-bold">{formatNumber(stats?.total || 0)}</div>');
    lines.push('                <p className="text-xs text-muted-foreground">');
    lines.push('                  <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />');
    lines.push('                  {stats?.growth || 0}% from last month');
    lines.push('                </p>');
    lines.push('              </>');
    lines.push('            )}');
    lines.push('          </CardContent>');
    lines.push('        </Card>');
    lines.push('');
    
    // Card 2: Active Items
    lines.push('        {/* Active Items */}');
    lines.push('        <Card className="border-l-4 border-l-green-500">');
    lines.push('          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">');
    lines.push('            <CardTitle className="text-sm font-medium">Active Items</CardTitle>');
    lines.push('            <Activity className="h-4 w-4 text-green-500" />');
    lines.push('          </CardHeader>');
    lines.push('          <CardContent>');
    lines.push('            {statsLoading ? (');
    lines.push('              <div className="text-2xl font-bold animate-pulse bg-muted h-8 w-16 rounded" />');
    lines.push('            ) : (');
    lines.push('              <>');
    lines.push('                <div className="text-2xl font-bold text-green-600">{formatNumber(stats?.active || 0)}</div>');
    lines.push('                <p className="text-xs text-muted-foreground">');
    lines.push('                  {stats?.total ? Math.round((stats.active / stats.total) * 100) : 0}% of total');
    lines.push('                </p>');
    lines.push('              </>');
    lines.push('            )}');
    lines.push('          </CardContent>');
    lines.push('        </Card>');
    lines.push('');
    
    // Card 3: New This Month
    lines.push('        {/* New This Month */}');
    lines.push('        <Card className="border-l-4 border-l-purple-500">');
    lines.push('          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">');
    lines.push('            <CardTitle className="text-sm font-medium">New This Month</CardTitle>');
    lines.push('            <Calendar className="h-4 w-4 text-purple-500" />');
    lines.push('          </CardHeader>');
    lines.push('          <CardContent>');
    lines.push('            {statsLoading ? (');
    lines.push('              <div className="text-2xl font-bold animate-pulse bg-muted h-8 w-16 rounded" />');
    lines.push('            ) : (');
    lines.push('              <>');
    lines.push('                <div className="text-2xl font-bold text-purple-600">{formatNumber(stats?.newThisMonth || 0)}</div>');
    lines.push('                <p className="text-xs text-muted-foreground">');
    lines.push('                  Recently added');
    lines.push('                </p>');
    lines.push('              </>');
    lines.push('            )}');
    lines.push('          </CardContent>');
    lines.push('        </Card>');
    lines.push('');
    
    // Card 4: Pending/Inactive
    lines.push('        {/* Pending Review */}');
    lines.push('        <Card className="border-l-4 border-l-amber-500">');
    lines.push('          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">');
    lines.push('            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>');
    lines.push('            <AlertCircle className="h-4 w-4 text-amber-500" />');
    lines.push('          </CardHeader>');
    lines.push('          <CardContent>');
    lines.push('            {statsLoading ? (');
    lines.push('              <div className="text-2xl font-bold animate-pulse bg-muted h-8 w-16 rounded" />');
    lines.push('            ) : (');
    lines.push('              <>');
    lines.push('                <div className="text-2xl font-bold text-amber-600">{formatNumber(stats?.inactive || 0)}</div>');
    lines.push('                <p className="text-xs text-muted-foreground">');
    lines.push('                  Requires action');
    lines.push('                </p>');
    lines.push('              </>');
    lines.push('            )}');
    lines.push('          </CardContent>');
    lines.push('        </Card>');
    lines.push('      </div>');
    lines.push('');
    
    // Charts Section
    lines.push('      {/* Charts Row */}');
    lines.push('      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">');
    lines.push('        {/* Trend Chart */}');
    lines.push('        <Card className="col-span-4">');
    lines.push('          <CardHeader>');
    lines.push('            <CardTitle>Monthly Trend</CardTitle>');
    lines.push('            <CardDescription>Number of records over time</CardDescription>');
    lines.push('          </CardHeader>');
    lines.push('          <CardContent>');
    lines.push('            <div className="h-[200px] flex items-end justify-between gap-2 px-4">');
    lines.push('              {/* Placeholder bars - Replace with actual chart library */}');
    lines.push('              {[65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 50, 88].map((h, i) => (');
    lines.push('                <div');
    lines.push('                  key={i}');
    lines.push('                  className="flex-1 bg-gradient-to-t from-primary/80 to-primary rounded-t"');
    lines.push('                  style={{ height: `${h}%`, opacity: 0.5 + (i * 0.04) }}');
    lines.push('                />');
    lines.push('              ))}');
    lines.push('            </div>');
    lines.push('            <div className="flex justify-between mt-4 text-xs text-muted-foreground">');
    lines.push('              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => (');
    lines.push('                <span key={m}>{m}</span>');
    lines.push('              ))}');
    lines.push('            </div>');
    lines.push('          </CardContent>');
    lines.push('        </Card>');
    lines.push('');
    
    // Donut Chart
    lines.push('        {/* Status Distribution */}');
    lines.push('        <Card className="col-span-3">');
    lines.push('          <CardHeader>');
    lines.push('            <CardTitle>Status Distribution</CardTitle>');
    lines.push('            <CardDescription>Active vs inactive breakdown</CardDescription>');
    lines.push('          </CardHeader>');
    lines.push('          <CardContent className="flex flex-col items-center">');
    lines.push('            <div className="relative w-40 h-40">');
    lines.push('              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">');
    lines.push('                <circle');
    lines.push('                  cx="50" cy="50" r="40"');
    lines.push('                  fill="none"');
    lines.push('                  stroke="currentColor"');
    lines.push('                  strokeWidth="20"');
    lines.push('                  className="text-muted"');
    lines.push('                />');
    lines.push('                <circle');
    lines.push('                  cx="50" cy="50" r="40"');
    lines.push('                  fill="none"');
    lines.push('                  stroke="currentColor"');
    lines.push('                  strokeWidth="20"');
    lines.push('                  strokeLinecap="round"');
    lines.push('                  className="text-green-500"');
    lines.push('                  strokeDasharray={`${((stats?.active || 0) / (stats?.total || 1)) * 251} 251`}');
    lines.push('                />');
    lines.push('              </svg>');
    lines.push('              <div className="absolute inset-0 flex items-center justify-center">');
    lines.push('                <div className="text-center">');
    lines.push('                  <div className="text-2xl font-bold">{stats?.total || 0}</div>');
    lines.push('                  <div className="text-xs text-muted-foreground">Total</div>');
    lines.push('                </div>');
    lines.push('              </div>');
    lines.push('            </div>');
    lines.push('            <div className="flex gap-6 mt-4 text-sm">');
    lines.push('              <div className="flex items-center gap-2">');
    lines.push('                <div className="w-3 h-3 rounded-full bg-green-500" />');
    lines.push('                <span>Active ({stats?.active || 0})</span>');
    lines.push('              </div>');
    lines.push('              <div className="flex items-center gap-2">');
    lines.push('                <div className="w-3 h-3 rounded-full bg-muted" />');
    lines.push('                <span>Inactive ({stats?.inactive || 0})</span>');
    lines.push('              </div>');
    lines.push('            </div>');
    lines.push('          </CardContent>');
    lines.push('        </Card>');
    lines.push('      </div>');
    lines.push('');
    
    // Recent Activity Table
    lines.push('      {/* Recent Activity */}');
    lines.push('      <Card>');
    lines.push('        <CardHeader>');
    lines.push('          <CardTitle>Recent Activity</CardTitle>');
    lines.push('          <CardDescription>Latest records in the system</CardDescription>');
    lines.push('        </CardHeader>');
    lines.push('        <CardContent>');
    lines.push('          {itemsLoading ? (');
    lines.push('            <div className="space-y-2">');
    lines.push('              {[...Array(5)].map((_, i) => (');
    lines.push('                <div key={i} className="h-12 bg-muted animate-pulse rounded" />');
    lines.push('              ))}');
    lines.push('            </div>');
    lines.push('          ) : (');
    lines.push('            <div className="space-y-4">');
    lines.push('              {recentItems?.items?.slice(0, 5).map((item: any, i: number) => (');
    lines.push('                <div key={item.id || i} className="flex items-center justify-between p-3 rounded-lg border">');
    lines.push('                  <div className="flex items-center gap-4">');
    lines.push('                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">');
    lines.push('                      <span className="text-sm font-medium">{i + 1}</span>');
    lines.push('                    </div>');
    lines.push('                    <div>');
    lines.push('                      <div className="font-medium">{item.name || item.title || `Item ${i + 1}`}</div>');
    lines.push('                      <div className="text-sm text-muted-foreground">{item.created || "Just now"}</div>');
    lines.push('                    </div>');
    lines.push('                  </div>');
    lines.push('                  <div className={`px-2 py-1 rounded text-xs ${item.status === "Active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>');
    lines.push('                    {item.status || "Pending"}');
    lines.push('                  </div>');
    lines.push('                </div>');
    lines.push('              ))}');
    lines.push('            </div>');
    lines.push('          )}');
    lines.push('        </CardContent>');
    lines.push('      </Card>');
    lines.push('    </div>');
    lines.push('  );');
    lines.push(this.options.useArrowFunctions ? '};' : '}');
    lines.push('');
    
    lines.push(`export default ${componentName};`);
    
    return lines.join('\n');
  }
  
  // ===========================================================================
  // Validation Schema Generation
  // ===========================================================================
  
  /**
   * Generate Zod validation schema
   */
  private generateZodSchema(fields: UnifiedFieldIntelligence[], componentName: string): string {
    const lines: string[] = [];
    
    lines.push('z.object({');
    
    for (const field of fields) {
      let fieldSchema = 'z.';
      
      // Base type
      switch (field.uiType) {
        case 'text_input':
        case 'textarea':
        case 'hidden':
          fieldSchema += 'string()';
          break;
        case 'email_input':
          fieldSchema += 'string().email()';
          break;
        case 'password_input':
          fieldSchema += 'string().min(8)';
          break;
        case 'phone_input':
          fieldSchema += 'string()';
          break;
        case 'url_input':
          fieldSchema += 'string().url()';
          break;
        case 'number_input':
        case 'currency_input':
        case 'percentage_input':
          fieldSchema += 'number()';
          break;
        case 'checkbox':
        case 'toggle':
          fieldSchema += 'boolean()';
          break;
        case 'date_picker':
        case 'datetime_picker':
          fieldSchema += 'date()';
          break;
        case 'dropdown':
        case 'multi_select':
          fieldSchema += 'string()';
          break;
        case 'file_upload':
        case 'image_upload':
          fieldSchema += 'any()'; // File type needs special handling
          break;
        default:
          fieldSchema += 'string()';
      }
      
      // Required/Optional
      if (!field.isRequired && !field.isPrimaryKey) {
        fieldSchema += '.optional()';
      }
      
      // Length constraints
      if (field.sqlMaxLength && (field.uiType === 'text_input' || field.uiType === 'textarea')) {
        fieldSchema += `.max(${field.sqlMaxLength})`;
      }
      
      // Validations from C#
      for (const val of field.validations) {
        if (val.type === 'stringlength' && val.parameters.maximumLength) {
          fieldSchema += `.max(${val.parameters.maximumLength})`;
        }
        if (val.type === 'minlength' && val.parameters.length) {
          fieldSchema += `.min(${val.parameters.length})`;
        }
        if (val.type === 'range') {
          const min = val.parameters.minimum;
          const max = val.parameters.maximum;
          if (min !== undefined && max !== undefined) {
            fieldSchema += `.min(${min}).max(${max})`;
          }
        }
        if (val.type === 'regex' && val.parameters.pattern) {
          fieldSchema += `.regex(new RegExp('${val.parameters.pattern}'))`;
        }
      }
      
      lines.push(`  ${field.name}: ${fieldSchema},`);
    }
    
    lines.push('})');
    
    return lines.join('\n');
  }
  
  /**
   * Generate form types
   */
  private generateFormTypes(fields: UnifiedFieldIntelligence[], componentName: string): string {
    const lines: string[] = [];
    
    lines.push(`interface ${componentName}FormData {`);
    for (const field of fields) {
      lines.push(`  ${field.name}${field.isRequired ? '' : '?'}: ${this.mapTypeToTS(field.type)};`);
    }
    lines.push('}');
    
    return lines.join('\n');
  }
  
  // ===========================================================================
  // Helper Methods
  // ===========================================================================
  
  /**
   * Unify field intelligence from all sources
   */
  private unifyFieldIntelligence(
    cshtml: ParsedCSHTMLView,
    table?: TableDef,
    csharp?: CSharpParseResult
  ): UnifiedFieldIntelligence[] {
    const fields: UnifiedFieldIntelligence[] = [];
    
    // Start with CSHTML fields
    for (const cshtmlField of cshtml.fields) {
      const field: UnifiedFieldIntelligence = {
        name: cshtmlField.name,
        type: cshtmlField.inputType,
        uiType: cshtmlField.inputType as UIComponentType,
        label: cshtmlField.label,
        placeholder: cshtmlField.placeholder,
        defaultValue: cshtmlField.defaultValue,
        cssClass: cshtmlField.cssClass,
        colSpan: cshtmlField.colSpan,
        order: cshtmlField.layout?.column || 0,
        validations: [],
        confidence: 70,
      };
      
      // Enrich from SQL
      if (table) {
        const col = table.columns.find(c => c.name.toLowerCase() === cshtmlField.name.toLowerCase());
        if (col) {
          field.sqlType = col.dataType;
          field.sqlMaxLength = col.maxLength ? parseInt(col.maxLength) : undefined;
          field.sqlNullable = col.isNullable;
          field.isPrimaryKey = col.isPrimaryKey;
          field.confidence += 20;
          
          // Find FK
          const fk = table.foreignKeys.find(fk => fk.columnName.toLowerCase() === cshtmlField.name.toLowerCase());
          if (fk) {
            field.isForeignKey = true;
            field.fkTarget = fk.referencesTable;
          }
        }
      }
      
      // Enrich from C#
      if (csharp) {
        const prop = csharp.properties.find(p => p.name.toLowerCase() === cshtmlField.name.toLowerCase());
        if (prop) {
          field.csharpType = prop.type;
          field.isRequired = prop.isRequired || prop.validationAttributes.some(v => v.type === 'required');
          field.validations = prop.validationAttributes;
          
          const display = csharp.displayAttributes.find(d => d.propertyName.toLowerCase() === cshtmlField.name.toLowerCase());
          if (display) {
            field.display = display;
            if (display.displayName && !field.label) {
              field.label = display.displayName;
            }
            if (display.prompt && !field.placeholder) {
              field.placeholder = display.prompt;
            }
          }
          
          field.confidence += 10;
        }
      }
      
      fields.push(field);
    }
    
    // Add missing SQL columns
    if (table) {
      for (const col of table.columns) {
        const exists = fields.some(f => f.name.toLowerCase() === col.name.toLowerCase());
        if (!exists && !col.isIdentity) {
          fields.push({
            name: col.name,
            type: col.dataType,
            uiType: this.inferUIType(col),
            label: this.formatLabel(col.name),
            sqlType: col.dataType,
            sqlMaxLength: col.maxLength ? parseInt(col.maxLength) : undefined,
            sqlNullable: col.isNullable,
            isPrimaryKey: col.isPrimaryKey,
            isRequired: !col.isNullable,
            validations: [],
            colSpan: 6,
            order: fields.length + 1,
            confidence: 50,
          });
        }
      }
    }
    
    return fields;
  }
  
  /**
   * Infer UI type from SQL column
   */
  private inferUIType(col: ColumnDef): UIComponentType {
    const type = col.dataType.toUpperCase();
    const name = col.name.toLowerCase();
    
    if (col.isPrimaryKey) return 'hidden';
    if (type === 'BIT') return 'checkbox';
    if (type.includes('DATE')) return 'date_picker';
    if (type.includes('TIME')) return 'time_picker';
    if (type === 'INT' || type === 'DECIMAL' || type === 'FLOAT') return 'number_input';
    if (type.includes('TEXT') || col.maxLength && parseInt(col.maxLength) > 500) return 'textarea';
    if (name.includes('email')) return 'email_input';
    if (name.includes('phone')) return 'phone_input';
    if (name.includes('password')) return 'password_input';
    if (name.endsWith('id') && !col.isPrimaryKey) return 'dropdown';
    
    return 'text_input';
  }
  
  /**
   * Map type to TypeScript
   */
  private mapTypeToTS(type: string): string {
    const lower = type.toLowerCase();
    if (lower.includes('int') || lower.includes('number')) return 'number';
    if (lower.includes('bool')) return 'boolean';
    if (lower.includes('date')) return 'Date';
    return 'string';
  }
  
  /**
   * Format label from field name
   */
  private formatLabel(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  /**
   * Convert to component name
   */
  private toComponentName(viewName: string, suffix: string): string {
    const cleaned = viewName
      .replace(/View$/, '')
      .replace(/Index$/, '')
      .replace(/Edit$/, '')
      .replace(/Create$/, '')
      .replace(/List$/, '')
      .replace(/Details$/, '');
    
    return this.toPascalCase(cleaned) + suffix;
  }
  
  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[\s_-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
  
  /**
   * Convert to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[\s_]+/g, '-');
  }
  
  /**
   * Infer table name from view
   */
  private inferTableName(cshtml: ParsedCSHTMLView): string | undefined {
    return cshtml.model?.linkedTable || 
           this.pluralize(cshtml.viewName.replace(/View$/, '').replace(/Index$/, ''));
  }
  
  /**
   * Pluralize word
   */
  private pluralize(word: string): string {
    if (word.endsWith('s')) return word;
    if (word.endsWith('y')) return word.slice(0, -1) + 'ies';
    return word + 's';
  }
  
  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    cshtml: ParsedCSHTMLView,
    table?: TableDef,
    csharp?: CSharpParseResult
  ): number {
    let score = 50;
    
    if (table) score += 20;
    if (csharp) score += 15;
    if (cshtml.fields.length > 0) score += 10;
    if (cshtml.model) score += 5;
    
    return Math.min(score, 100);
  }
  
  /**
   * Get form dependencies
   */
  private getFormDependencies(): ComponentDependency[] {
    return [
      { name: 'react-hook-form', type: 'npm', importPath: 'react-hook-form' },
      { name: '@hookform/resolvers', type: 'npm', importPath: '@hookform/resolvers/zod' },
      { name: 'zod', type: 'npm', importPath: 'zod' },
      { name: '@tanstack/react-query', type: 'npm', importPath: '@tanstack/react-query' },
      { name: 'lucide-react', type: 'npm', importPath: 'lucide-react' },
    ];
  }
  
  /**
   * Get list dependencies
   */
  private getListDependencies(): ComponentDependency[] {
    return [
      { name: '@tanstack/react-query', type: 'npm', importPath: '@tanstack/react-query' },
      { name: 'lucide-react', type: 'npm', importPath: 'lucide-react' },
    ];
  }
  
  /**
   * Get detail dependencies
   */
  private getDetailDependencies(): ComponentDependency[] {
    return [
      { name: '@tanstack/react-query', type: 'npm', importPath: '@tanstack/react-query' },
      { name: 'lucide-react', type: 'npm', importPath: 'lucide-react' },
    ];
  }
  
  /**
   * Get dashboard dependencies
   */
  private getDashboardDependencies(): ComponentDependency[] {
    return [];
  }
  
  /**
   * Generate form API hooks
   */
  private generateFormAPIHooks(
    componentName: string,
    tableName: string,
    fields: UnifiedFieldIntelligence[]
  ): APIHookDefinition[] {
    return [
      {
        hookName: `useCreate${tableName}`,
        endpoint: `/api/${this.toKebabCase(tableName)}`,
        method: 'POST',
        requestBody: `${componentName}FormData`,
        responseType: tableName,
        hasPagination: false,
      },
      {
        hookName: `useUpdate${tableName}`,
        endpoint: `/api/${this.toKebabCase(tableName)}/[id]`,
        method: 'PUT',
        requestBody: `Partial<${componentName}FormData>`,
        responseType: tableName,
        hasPagination: false,
      },
    ];
  }
  
  /**
   * Generate list API hook
   */
  private generateListAPIHook(componentName: string, tableName: string): APIHookDefinition {
    return {
      hookName: `use${tableName}List`,
      endpoint: `/api/${this.toKebabCase(tableName)}`,
      method: 'GET',
      responseType: `{ items: ${tableName}[]; total: number; hasMore: boolean }`,
      hasPagination: true,
    };
  }
  
  /**
   * Generate detail API hook
   */
  private generateDetailAPIHook(componentName: string, tableName: string): APIHookDefinition {
    return {
      hookName: `use${tableName}Detail`,
      endpoint: `/api/${this.toKebabCase(tableName)}/[id]`,
      method: 'GET',
      responseType: `${tableName}Detail`,
      hasPagination: false,
    };
  }
  
  /**
   * Generate shared types
   */
  private generateSharedTypes(): GeneratedFile[] {
    const types: GeneratedFile[] = [];
    
    // Generate types for each table
    for (const table of this.sqlTables) {
      const content = this.generateTableTypeFile(table);
      types.push({
        path: `types/${this.toKebabCase(table.tableName)}.ts`,
        content,
        language: 'typescript',
        description: `Type definitions for ${table.tableName}`,
      });
    }
    
    return types;
  }
  
  /**
   * Generate table type file
   */
  private generateTableTypeFile(table: TableDef): string {
    const lines: string[] = [];
    
    lines.push(`// ${table.tableName} Types - Auto-generated from Schema Architect`);
    lines.push('');
    lines.push(`export interface ${table.tableName} {`);
    
    for (const col of table.columns) {
      const optional = col.isNullable ? '?' : '';
      const type = this.mapSQLTypeToTS(col.dataType, col.isNullable);
      lines.push(`  ${col.name}${optional}: ${type};`);
    }
    
    lines.push('}');
    lines.push('');
    
    // Create/Update types
    lines.push(`export interface Create${table.tableName} {`);
    for (const col of table.columns) {
      if (!col.isIdentity && !col.isPrimaryKey) {
        const optional = col.isNullable ? '?' : '';
        const type = this.mapSQLTypeToTS(col.dataType, col.isNullable);
        lines.push(`  ${col.name}${optional}: ${type};`);
      }
    }
    lines.push('}');
    lines.push('');
    
    lines.push(`export interface Update${table.tableName} {`);
    for (const col of table.columns) {
      if (!col.isIdentity && !col.isPrimaryKey) {
        const type = this.mapSQLTypeToTS(col.dataType, col.isNullable);
        lines.push(`  ${col.name}?: ${type};`);
      }
    }
    lines.push('}');
    
    return lines.join('\n');
  }
  
  /**
   * Map SQL type to TypeScript
   */
  private mapSQLTypeToTS(sqlType: string, nullable: boolean): string {
    const type = sqlType.toUpperCase();
    
    if (type.includes('INT')) return 'number';
    if (type.includes('DECIMAL') || type.includes('FLOAT') || type.includes('NUMERIC')) return 'number';
    if (type === 'BIT') return 'boolean';
    if (type.includes('DATE') || type.includes('TIME')) return 'Date';
    if (type === 'UNIQUEIDENTIFIER') return 'string';
    
    return 'string';
  }
  
  /**
   * Generate API client
   */
  private generateAPIClient(): GeneratedFile {
    const lines: string[] = [];
    
    lines.push('// API Client - Auto-generated from Schema Architect');
    lines.push("import { fetchQuery, fetchMutation } from '@/lib/api-utils';");
    lines.push('');
    
    for (const table of this.sqlTables) {
      const kebab = this.toKebabCase(table.tableName);
      
      // GET all
      lines.push(`export const get${table.tableName}List = async (params?: { page?: number; search?: string }) =>`);
      lines.push(`  fetchQuery<{ items: ${table.tableName}[]; total: number }>('/api/${kebab}', params);`);
      lines.push('');
      
      // GET by ID
      lines.push(`export const get${table.tableName}ById = async (id: string) =>`);
      lines.push(`  fetchQuery<${table.tableName}>(\`/api/${kebab}/\${id}\`);`);
      lines.push('');
      
      // CREATE
      lines.push(`export const create${table.tableName} = async (data: Create${table.tableName}) =>`);
      lines.push(`  fetchMutation<${table.tableName}>(\`/api/${kebab}\`, 'POST', data);`);
      lines.push('');
      
      // UPDATE
      lines.push(`export const update${table.tableName} = async (id: string, data: Update${table.tableName}) =>`);
      lines.push(`  fetchMutation<${table.tableName}>(\`/api/${kebab}/\${id}\`, 'PUT', data);`);
      lines.push('');
      
      // DELETE
      lines.push(`export const delete${table.tableName} = async (id: string) =>`);
      lines.push(`  fetchMutation<void>(\`/api/${kebab}/\${id}\`, 'DELETE');`);
      lines.push('');
    }
    
    return {
      path: 'lib/api-client.ts',
      content: lines.join('\n'),
      language: 'typescript',
      description: 'API client functions',
    };
  }
  
  /**
   * Generate validation schemas
   */
  private generateValidationSchemas(): GeneratedFile[] {
    const schemas: GeneratedFile[] = [];
    
    for (const component of this.components) {
      if (component.validationSchema) {
        schemas.push({
          path: `lib/validations/${this.toKebabCase(component.tableName)}.ts`,
          content: `import { z } from 'zod';\n\nexport const ${component.componentName}Schema = ${component.validationSchema.schema};\n\nexport type ${component.componentName}FormData = z.infer<typeof ${component.componentName}Schema>;`,
          language: 'typescript',
          description: `Validation schema for ${component.componentName}`,
        });
      }
    }
    
    return schemas;
  }
  
  /**
   * Generate index exports
   */
  private generateIndexExports(): GeneratedFile {
    const lines: string[] = [];
    
    lines.push('// Components Index - Auto-generated from Schema Architect');
    lines.push('');
    
    for (const component of this.components) {
      const kebab = this.toKebabCase(component.tableName);
      lines.push(`export { ${component.componentName} } from './${kebab}/${component.componentName}';`);
    }
    
    return {
      path: 'components/index.ts',
      content: lines.join('\n'),
      language: 'typescript',
      description: 'Component exports',
    };
  }
  
  /**
   * Get unique dependencies
   */
  private uniqueDependencies(deps: ComponentDependency[]): ComponentDependency[] {
    const seen = new Set<string>();
    return deps.filter(dep => {
      if (seen.has(dep.name)) return false;
      seen.add(dep.name);
      return true;
    });
  }
}

// =============================================================================
// Exports
// =============================================================================

export const reactGenerator = new ReactGeneratorEngine();

export function generateReactComponents(
  csharpResults: CSharpParseResult[],
  sqlTables: TableDef[],
  cshtmlResults: ParsedCSHTMLView[],
  gapResult?: GapDetectionResult,
  options?: Partial<ComponentGenerationOptions>
): ComponentGenerationResult {
  const engine = new ReactGeneratorEngine(options);
  return engine.generate(csharpResults, sqlTables, cshtmlResults, gapResult);
}
