/**
 * React Form Component Generator
 * 
 * Generates React form components with:
 * - React Hook Form integration
 * - Zod resolver validation
 * - Semantic type to UI component mapping
 * - FK dropdown support
 * - Cascade dropdown logic
 * - PII/PHI masking
 * - Required field indicators
 * - Responsive grid layout
 */

import { prisma } from '@/lib/db';
import {
  getUIComponent,
  toPrismaModelName,
  toCamelCase,
  getTypeScriptType,
  isBooleanType,
  isDateType,
  isNumericType,
} from './type-mappings';
import type { UnifiedField } from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ReactFormGeneratorConfig {
  projectId: string;
  tableName: string;
  formType?: 'create' | 'edit' | 'both'; // Generate create form, edit form, or both
  includeRelations?: boolean;
  includeValidation?: boolean;
  includePIIMasking?: boolean;
  useModal?: boolean; // Generate as modal dialog
  responsiveLayout?: boolean; // Use responsive grid
  columns?: 1 | 2 | 3; // Number of columns in form
  includeCancelButton?: boolean;
  includeResetButton?: boolean;
  submitLabel?: string;
}

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  readonly: boolean;
  hidden: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  validation?: FieldValidation;
  fkConfig?: FKFieldConfig;
  cascadeConfig?: CascadeFieldConfig;
  piiConfig?: PIIFieldConfig;
  gridWidth?: string; // 'full', 'half', 'third'
  component: string;
  props: Record<string, any>;
}

export type FormFieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'tel'
  | 'url'
  | 'textarea' 
  | 'select' 
  | 'multiselect'
  | 'checkbox' 
  | 'switch' 
  | 'radio' 
  | 'date' 
  | 'datetime' 
  | 'time'
  | 'file'
  | 'image'
  | 'hidden'
  | 'currency'
  | 'color';

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  customRules?: string[];
}

export interface FKFieldConfig {
  referencedTable: string;
  referencedColumn: string;
  displayColumn: string;
  endpoint: string;
  isResolved: boolean;
}

export interface CascadeFieldConfig {
  parentField: string;
  childField?: string;
  endpoint: string;
  dependencyType: 'parent-child' | 'chain';
}

export interface PIIFieldConfig {
  isPII: boolean;
  isPHI: boolean;
  maskingType?: 'partial' | 'full' | 'none';
  maskingPattern?: string;
}

export interface ReactFormGenerationResult {
  formComponent: string;
  types: string;
  imports: string[];
  errors: string[];
  warnings: string[];
  fields: FormField[];
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate React form component from Unified Intelligence Bank
 */
export async function generateReactForm(
  config: ReactFormGeneratorConfig
): Promise<ReactFormGenerationResult> {
  const result: ReactFormGenerationResult = {
    formComponent: '',
    types: '',
    imports: [],
    errors: [],
    warnings: [],
    fields: [],
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

    // Transform to FormField objects
    result.fields = fields
      .filter(f => !f.uiIsHidden)
      .map(f => transformToFormField(f, config));

    // Detect cascade relationships
    detectCascadeRelationships(result.fields, fields);

    // Generate the form component
    result.formComponent = generateFormComponent(config, result.fields, fields);
    
    // Generate type definitions
    result.types = generateFormTypes(config, result.fields);
    
    // Collect required imports
    result.imports = collectImports(result.fields, config);

  } catch (error: any) {
    result.errors.push(`Form generation error: ${error.message}`);
  }

  return result;
}

/**
 * Transform UnifiedField to FormField
 */
function transformToFormField(
  field: UnifiedField,
  config: ReactFormGeneratorConfig
): FormField {
  const modelName = toPrismaModelName(config.tableName);
  const fieldName = toCamelCase(field.fieldName);
  
  // Determine field type based on multiple sources
  const fieldType = determineFieldType(field);
  
  // Get UI component configuration
  const uiConfig = field.intelSemanticType 
    ? getUIComponent(field.intelSemanticType)
    : null;

  // Build form field
  const formField: FormField = {
    name: fieldName,
    label: field.intelSuggestedLabel || formatFieldLabel(field.fieldName),
    type: fieldType,
    required: !field.schemaIsNullable || field.validationIsRequired,
    readonly: field.uiIsReadOnly || false,
    hidden: field.uiIsHidden || false,
    placeholder: field.intelSuggestedPlaceholder || `Enter ${formatFieldLabel(field.fieldName).toLowerCase()}`,
    helpText: field.intelSuggestedHelpText || undefined,
    defaultValue: getDefaultValue(field),
    gridWidth: determineGridWidth(field),
    component: uiConfig?.component || getDefaultComponent(fieldType),
    props: {
      ...(uiConfig?.props || {}),
      disabled: field.uiIsReadOnly || field.uiIsDisabled,
    },
  };

  // Add validation rules
  if (config.includeValidation !== false) {
    formField.validation = buildValidationRules(field);
  }

  // Handle FK fields
  if (field.fkIsForeignKey && field.fkReferencedTable) {
    formField.fkConfig = {
      referencedTable: field.fkReferencedTable,
      referencedColumn: field.fkReferencedColumn || 'id',
      displayColumn: guessDisplayColumn(field.fkReferencedTable),
      endpoint: `/api/${toKebabCase(field.fkReferencedTable)}/dropdown`,
      isResolved: field.fkTableExists,
    };
    formField.type = 'select';
    formField.component = 'Select';
  }

  // Handle PII/PHI fields
  if (config.includePIIMasking && (field.compIsPII || field.compIsPHI)) {
    formField.piiConfig = {
      isPII: field.compIsPII,
      isPHI: field.compIsPHI,
      maskingType: field.compRequiresMasking ? 'partial' : 'none',
      maskingPattern: field.compMaskingPattern || undefined,
    };
  }

  // Handle boolean fields
  if (isBooleanType(field.schemaDataType || '')) {
    formField.type = 'switch';
    formField.component = 'Switch';
    formField.defaultValue = field.schemaDefaultValue === '1' || field.schemaDefaultValue === 'true';
  }

  // Handle date fields
  if (isDateType(field.schemaDataType || '')) {
    formField.type = 'date';
    formField.component = 'DatePicker';
  }

  return formField;
}

/**
 * Determine the form field type from UnifiedField data
 */
function determineFieldType(field: UnifiedField): FormFieldType {
  // First check UI component type from CSHTML
  if (field.uiComponentType) {
    const typeMap: Record<string, FormFieldType> = {
      'text': 'text',
      'email': 'email',
      'password': 'password',
      'number': 'number',
      'tel': 'tel',
      'url': 'url',
      'textarea': 'textarea',
      'select': 'select',
      'dropdown': 'select',
      'checkbox': 'checkbox',
      'switch': 'switch',
      'radio': 'radio',
      'date': 'date',
      'datetime': 'datetime',
      'time': 'time',
      'file': 'file',
      'image': 'image',
      'hidden': 'hidden',
      'currency': 'currency',
      'color': 'color',
    };
    
    const mapped = typeMap[field.uiComponentType.toLowerCase()];
    if (mapped) return mapped;
  }

  // Check semantic type
  if (field.intelSemanticType) {
    const semanticMap: Record<string, FormFieldType> = {
      'email': 'email',
      'phone': 'tel',
      'mobile': 'tel',
      'password': 'password',
      'url': 'url',
      'website': 'url',
      'address': 'textarea',
      'description': 'textarea',
      'notes': 'textarea',
      'money': 'currency',
      'price': 'currency',
      'date': 'date',
      'datetime': 'datetime',
      'time': 'time',
      'birthday': 'date',
      'boolean': 'switch',
      'active': 'switch',
      'status': 'select',
      'file': 'file',
      'image': 'image',
      'color': 'color',
    };
    
    const normalized = field.intelSemanticType.toLowerCase().replace(/[_\s]/g, '_');
    const mapped = semanticMap[normalized];
    if (mapped) return mapped;
  }

  // Check SQL data type
  const sqlType = (field.schemaDataType || 'VARCHAR').toUpperCase();
  
  if (sqlType === 'BIT') return 'switch';
  if (sqlType.includes('TEXT') || sqlType.includes('NTEXT')) return 'textarea';
  if (sqlType.includes('DATE') && sqlType.includes('TIME')) return 'datetime';
  if (sqlType.includes('DATE')) return 'date';
  if (sqlType.includes('TIME')) return 'time';
  if (sqlType.includes('MONEY') || sqlType.includes('DECIMAL') || sqlType.includes('NUMERIC')) {
    if (field.intelSemanticType?.toLowerCase().includes('money')) return 'currency';
    return 'number';
  }
  if (sqlType.includes('INT') || sqlType.includes('FLOAT') || sqlType.includes('REAL')) return 'number';

  return 'text';
}

/**
 * Get default component for field type
 */
function getDefaultComponent(type: FormFieldType): string {
  const componentMap: Record<FormFieldType, string> = {
    'text': 'Input',
    'email': 'Input',
    'password': 'Input',
    'number': 'Input',
    'tel': 'Input',
    'url': 'Input',
    'textarea': 'Textarea',
    'select': 'Select',
    'multiselect': 'MultiSelect',
    'checkbox': 'Checkbox',
    'switch': 'Switch',
    'radio': 'RadioGroup',
    'date': 'DatePicker',
    'datetime': 'DateTimePicker',
    'time': 'Input',
    'file': 'FileUpload',
    'image': 'ImageUpload',
    'hidden': 'Input',
    'currency': 'Input',
    'color': 'ColorPicker',
  };
  
  return componentMap[type] || 'Input';
}

/**
 * Determine grid width based on field characteristics
 */
function determineGridWidth(field: UnifiedField): string {
  // Check explicit grid width from UI config
  if (field.uiGridWidth) {
    return field.uiGridWidth; // 'full', 'half', 'third', etc.
  }
  
  // Full width for textareas and long text fields
  if (field.intelSemanticType === 'address' || 
      field.intelSemanticType === 'description' ||
      field.intelSemanticType === 'notes') {
    return 'full';
  }
  
  // Full width for large text fields
  if (field.schemaMaxLength && field.schemaMaxLength > 200) {
    return 'full';
  }
  
  // Default to half width
  return 'half';
}

/**
 * Build validation rules from field data
 */
function buildValidationRules(field: UnifiedField): FieldValidation {
  const validation: FieldValidation = {};
  
  // Length constraints
  if (field.schemaMaxLength) {
    validation.maxLength = field.schemaMaxLength;
  }
  
  // Parse CSHTML validation rules
  if (field.validationClientRules && field.validationClientRules !== '[]') {
    try {
      const rules = JSON.parse(field.validationClientRules);
      for (const rule of rules) {
        switch (rule.type) {
          case 'min':
          case 'minlength':
            validation.minLength = parseInt(rule.value);
            break;
          case 'max':
          case 'maxlength':
            validation.maxLength = parseInt(rule.value);
            break;
          case 'pattern':
          case 'regex':
            validation.pattern = rule.value;
            validation.patternMessage = rule.message || 'Invalid format';
            break;
        }
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  // Numeric constraints
  if (isNumericType(field.schemaDataType || '')) {
    if (field.intelSemanticType === 'percentage') {
      validation.min = 0;
      validation.max = 100;
    }
  }
  
  return validation;
}

/**
 * Detect cascade relationships between fields
 */
function detectCascadeRelationships(formFields: FormField[], unifiedFields: UnifiedField[]): void {
  // Look for common cascade patterns
  // Pattern 1: Country → Province/State → City
  // Pattern 2: Organization → Department
  
  const countryField = formFields.find(f => 
    f.name.toLowerCase().includes('country') && f.fkConfig
  );
  const provinceField = formFields.find(f => 
    (f.name.toLowerCase().includes('province') || f.name.toLowerCase().includes('state')) && f.fkConfig
  );
  const cityField = formFields.find(f => 
    f.name.toLowerCase().includes('city') && !f.name.toLowerCase().includes('country') && f.fkConfig
  );
  
  // Set up cascade for Country → Province
  if (countryField && provinceField) {
    provinceField.cascadeConfig = {
      parentField: countryField.name,
      endpoint: `/api/${toKebabCase(provinceField.fkConfig!.referencedTable)}/by-country`,
      dependencyType: 'parent-child',
    };
  }
  
  // Set up cascade for Province → City
  if (provinceField && cityField) {
    cityField.cascadeConfig = {
      parentField: provinceField.name,
      endpoint: `/api/${toKebabCase(cityField.fkConfig!.referencedTable)}/by-province`,
      dependencyType: 'parent-child',
    };
  }
  
  // Check for explicit cascade config in CSHTML data
  for (const uf of unifiedFields) {
    if (uf.uiDropdownConfig) {
      try {
        const dropdownConfig = JSON.parse(uf.uiDropdownConfig);
        if (dropdownConfig.cascadeParent) {
          const formField = formFields.find(f => f.name === toCamelCase(uf.fieldName));
          if (formField) {
            formField.cascadeConfig = {
              parentField: toCamelCase(dropdownConfig.cascadeParent),
              endpoint: dropdownConfig.cascadeEndpoint || '',
              dependencyType: 'parent-child',
            };
          }
        }
      } catch (e) {
        // Invalid JSON
      }
    }
  }
}

/**
 * Get default value for a field
 */
function getDefaultValue(field: UnifiedField): any {
  // Check schema default
  if (field.schemaDefaultValue) {
    const val = field.schemaDefaultValue;
    
    // Handle functions
    if (val.toLowerCase().includes('getdate')) return null;
    if (val.toLowerCase().includes('newid')) return null;
    
    // Boolean
    if (isBooleanType(field.schemaDataType || '')) {
      return val === '1' || val.toLowerCase() === 'true';
    }
    
    // Number
    if (isNumericType(field.schemaDataType || '')) {
      return parseFloat(val) || 0;
    }
    
    // String literal
    return val.replace(/'/g, '');
  }
  
  // Type-based defaults
  if (isBooleanType(field.schemaDataType || '')) return false;
  if (isNumericType(field.schemaDataType || '')) return undefined;
  if (isDateType(field.schemaDataType || '')) return undefined;
  
  return undefined;
}

/**
 * Guess the display column for a FK table
 */
function guessDisplayColumn(tableName: string): string {
  const lower = tableName.toLowerCase();
  
  // Common patterns
  if (lower.includes('country')) return 'name';
  if (lower.includes('province') || lower.includes('state')) return 'name';
  if (lower.includes('city')) return 'name';
  if (lower.includes('type')) return 'name';
  if (lower.includes('category')) return 'name';
  if (lower.includes('status')) return 'name';
  if (lower.includes('role')) return 'name';
  if (lower.includes('user')) return 'name';
  if (lower.includes('organization') || lower.includes('organisation')) return 'name';
  if (lower.includes('department')) return 'name';
  
  // Default to 'name' or 'title'
  return 'name';
}

/**
 * Format field name to human-readable label
 */
function formatFieldLabel(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
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
 * Generate the complete form component
 */
function generateFormComponent(
  config: ReactFormGeneratorConfig,
  formFields: FormField[],
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
  lines.push(` * ${modelName} Form Component`);
  lines.push(` * Auto-generated by AI Enterprise Architect`);
  lines.push(` * Table: ${config.tableName}`);
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(` */`);
  lines.push(``);
  
  // Imports
  lines.push(...generateImports(formFields, config));
  lines.push(``);
  
  // Types
  lines.push(`// Types`);
  lines.push(`interface ${modelName}FormProps {`);
  lines.push(`  onSuccess?: () => void;`);
  lines.push(`  onCancel?: () => void;`);
  lines.push(`  initialData?: Partial<${modelName}>;`);
  lines.push(`  mode?: 'create' | 'edit';`);
  lines.push(`}`);
  lines.push(``);
  
  // Component
  lines.push(`export function ${modelName}Form({`);
  lines.push(`  onSuccess,`);
  lines.push(`  onCancel,`);
  lines.push(`  initialData,`);
  lines.push(`  mode = 'create',`);
  lines.push(`}: ${modelName}FormProps) {`);
  lines.push(`  const { toast } = useToast();`);
  lines.push(`  const [isSubmitting, setIsSubmitting] = useState(false);`);
  lines.push(`  const [isBusy, setIsBusy] = useState(false);`);
  lines.push(``);
  
  // FK dropdown state
  const fkFields = formFields.filter(f => f.fkConfig);
  for (const fk of fkFields) {
    lines.push(`  const [${fk.name}Options, set${toPrismaModelName(fk.name)}Options] = useState<DropdownOption[]>([]);`);
  }
  lines.push(``);
  
  // Form definition
  lines.push(`  const form = useForm<${modelName}FormData>({`);
  lines.push(`    resolver: zodResolver(${camelName}Schema),`);
  lines.push(`    defaultValues: initialData || {`);
  lines.push(...generateDefaultValues(formFields));
  lines.push(`    },`);
  lines.push(`  });`);
  lines.push(``);
  
  // Load FK dropdown options
  lines.push(`  // Load dropdown options`);
  lines.push(`  useEffect(() => {`);
  lines.push(`    const loadDropdowns = async () => {`);
  lines.push(`      try {`);
  for (const fk of fkFields) {
    lines.push(`        const ${fk.name}Res = await fetch('${fk.fkConfig!.endpoint}');`);
    lines.push(`        if (${fk.name}Res.ok) {`);
    lines.push(`          const ${fk.name}Data = await ${fk.name}Res.json();`);
    lines.push(`          set${toPrismaModelName(fk.name)}Options(${fk.name}Data);`);
    lines.push(`        }`);
  }
  lines.push(`      } catch (error) {`);
  lines.push(`        console.error('Failed to load dropdown options:', error);`);
  lines.push(`      }`);
  lines.push(`    };`);
  lines.push(`    loadDropdowns();`);
  lines.push(`  }, []);`);
  lines.push(``);
  
  // Cascade effect
  const cascadeFields = formFields.filter(f => f.cascadeConfig);
  if (cascadeFields.length > 0) {
    lines.push(`  // Cascade dropdown effects`);
    for (const cascade of cascadeFields) {
      lines.push(`  useEffect(() => {`);
      lines.push(`    const parentValue = form.watch('${cascade.cascadeConfig!.parentField}');`);
      lines.push(`    if (parentValue) {`);
      lines.push(`      fetch(\`${cascade.cascadeConfig!.endpoint}?parentId=\${parentValue}\`)`);
      lines.push(`        .then(res => res.json())`);
      lines.push(`        .then(data => set${toPrismaModelName(cascade.name)}Options(data))`);
      lines.push(`        .catch(err => console.error('Cascade load error:', err));`);
      lines.push(`    }`);
      lines.push(`  }, [form.watch('${cascade.cascadeConfig!.parentField}')]);`);
      lines.push(``);
    }
  }
  
  // Submit handler
  lines.push(`  const onSubmit = async (data: ${modelName}FormData) => {`);
  lines.push(`    setIsSubmitting(true);`);
  lines.push(`    try {`);
  lines.push(`      const url = mode === 'edit' ? \`/api/${kebabName}/\${data.id}\` : '/api/${kebabName}';`);
  lines.push(`      const method = mode === 'edit' ? 'PUT' : 'POST';`);
  lines.push(`      `);
  lines.push(`      const response = await fetch(url, {`);
  lines.push(`        method,`);
  lines.push(`        headers: { 'Content-Type': 'application/json' },`);
  lines.push(`        body: JSON.stringify(data),`);
  lines.push(`      });`);
  lines.push(`      `);
  lines.push(`      if (response.ok) {`);
  lines.push(`        toast({`);
  lines.push(`          title: 'Success',`);
  lines.push(`          description: \`\${mode === 'edit' ? 'Updated' : 'Created'} ${modelName} successfully\`,`);
  lines.push(`        });`);
  lines.push(`        onSuccess?.();`);
  lines.push(`      } else {`);
  lines.push(`        const error = await response.json();`);
  lines.push(`        toast({`);
  lines.push(`          title: 'Error',`);
  lines.push(`          description: error.message || 'Operation failed',`);
  lines.push(`          variant: 'destructive',`);
  lines.push(`        });`);
  lines.push(`      }`);
  lines.push(`    } catch (error) {`);
  lines.push(`      toast({`);
  lines.push(`        title: 'Error',`);
  lines.push(`        description: 'An unexpected error occurred',`);
  lines.push(`        variant: 'destructive',`);
  lines.push(`      });`);
  lines.push(`    } finally {`);
  lines.push(`      setIsSubmitting(false);`);
  lines.push(`    }`);
  lines.push(`  };`);
  lines.push(``);
  
  // Return JSX
  lines.push(`  return (`);
  lines.push(`    <Form {...form}>`);
  lines.push(`      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">`);
  lines.push(...generateFormFields(formFields, config));
  lines.push(``);
  lines.push(`        <div className="flex justify-end gap-3 pt-4">`);
  if (config.includeCancelButton !== false) {
    lines.push(`          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>`);
    lines.push(`            Cancel`);
    lines.push(`          </Button>`);
  }
  lines.push(`          <Button type="submit" disabled={isSubmitting}>`);
  lines.push(`            {isSubmitting ? 'Saving...' : '${config.submitLabel || 'Save'}'}`);
  lines.push(`          </Button>`);
  lines.push(`        </div>`);
  lines.push(`      </form>`);
  lines.push(`    </Form>`);
  lines.push(`  );`);
  lines.push(`}`);
  
  return lines.join('\n');
}

/**
 * Generate imports
 */
function generateImports(formFields: FormField[], config: ReactFormGeneratorConfig): string[] {
  const imports: string[] = [];
  const components = new Set<string>();
  
  // React
  imports.push(`import { useState, useEffect } from 'react';`);
  
  // React Hook Form
  imports.push(`import { useForm } from 'react-hook-form';`);
  imports.push(`import { zodResolver } from '@hookform/resolvers/zod';`);
  
  // UI Components
  imports.push(`import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';`);
  imports.push(`import { Button } from '@/components/ui/button';`);
  imports.push(`import { Input } from '@/components/ui/input';`);
  
  // Add component imports based on field types
  for (const field of formFields) {
    if (field.component === 'Select') {
      imports.push(`import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';`);
    }
    if (field.component === 'Textarea') {
      imports.push(`import { Textarea } from '@/components/ui/textarea';`);
    }
    if (field.component === 'Switch') {
      imports.push(`import { Switch } from '@/components/ui/switch';`);
    }
    if (field.component === 'Checkbox') {
      imports.push(`import { Checkbox } from '@/components/ui/checkbox';`);
    }
    if (field.component === 'DatePicker' || field.component === 'DateTimePicker') {
      imports.push(`import { DatePicker } from '@/components/ui/date-picker';`);
      imports.push(`import { Calendar } from '@/components/ui/calendar';`);
      imports.push(`import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';`);
    }
  }
  
  // Toast
  imports.push(`import { useToast } from '@/hooks/use-toast';`);
  
  // Types and schemas
  const modelName = toPrismaModelName(config.tableName);
  imports.push(`import { ${modelName}FormData, ${camelName}Schema } from '@/lib/validations/${toKebabCase(config.tableName)}';`);
  
  return imports;
}

/**
 * Generate default values for form
 */
function generateDefaultValues(formFields: FormField[]): string[] {
  return formFields.map(f => {
    const defaultValue = f.defaultValue !== undefined ? JSON.stringify(f.defaultValue) : 'undefined';
    return `      ${f.name}: ${defaultValue},`;
  });
}

/**
 * Generate form fields JSX
 */
function generateFormFields(formFields: FormField[], config: ReactFormGeneratorConfig): string[] {
  const lines: string[] = [];
  
  // Group fields by grid width
  const fullWdithFields = formFields.filter(f => f.gridWidth === 'full');
  const halfWidthFields = formFields.filter(f => f.gridWidth === 'half');
  
  if (config.responsiveLayout !== false) {
    lines.push(`        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`);
  } else {
    lines.push(`        <div className="space-y-4">`);
  }
  
  for (const field of formFields) {
    lines.push(...generateSingleField(field, config));
    lines.push(``);
  }
  
  lines.push(`        </div>`);
  
  return lines;
}

/**
 * Generate a single form field
 */
function generateSingleField(field: FormField, config: ReactFormGeneratorConfig): string[] {
  const lines: string[] = [];
  
  // Skip hidden fields
  if (field.hidden) {
    return lines;
  }
  
  lines.push(`          <FormField`);
  lines.push(`            control={form.control}`);
  lines.push(`            name="${field.name}"`);
  lines.push(`            render={({ field: formField }) => (`);
  lines.push(`              <FormItem>`);
  lines.push(`                <FormLabel>`);
  lines.push(`                  ${field.label}`);
  if (field.required) {
    lines.push(`                  <span className="text-destructive ml-1">*</span>`);
  }
  lines.push(`                </FormLabel>`);
  
  // Generate the control based on type
  switch (field.type) {
    case 'select':
      lines.push(...generateSelectField(field));
      break;
    case 'switch':
      lines.push(...generateSwitchField(field));
      break;
    case 'checkbox':
      lines.push(...generateCheckboxField(field));
      break;
    case 'textarea':
      lines.push(...generateTextareaField(field));
      break;
    case 'date':
    case 'datetime':
      lines.push(...generateDateField(field));
      break;
    default:
      lines.push(...generateInputField(field));
  }
  
  // Help text
  if (field.helpText) {
    lines.push(`                <FormDescription>${field.helpText}</FormDescription>`);
  }
  
  lines.push(`                <FormMessage />`);
  lines.push(`              </FormItem>`);
  lines.push(`            )}`);
  lines.push(`          />`);
  
  return lines;
}

/**
 * Generate input field
 */
function generateInputField(field: FormField): string[] {
  const inputType = field.type === 'currency' ? 'number' : field.type;
  const props: string[] = [];
  
  props.push(`placeholder="${field.placeholder}"`);
  
  if (field.type === 'currency') {
    props.push('step="0.01"');
  }
  
  if (field.type === 'number') {
    props.push('step="any"');
  }
  
  if (field.readonly) {
    props.push('disabled');
  }
  
  return [
    `                <FormControl>`,
    `                  <Input type="${inputType}" ${props.join(' ')} {...formField} />`,
    `                </FormControl>`,
  ];
}

/**
 * Generate select field
 */
function generateSelectField(field: FormField): string[] {
  const optionsVar = `${field.name}Options`;
  
  const lines = [
    `                <Select onValueChange={formField.onChange} defaultValue={String(formField.value)}>`,
    `                  <FormControl>`,
    `                    <SelectTrigger>`,
    `                      <SelectValue placeholder="${field.placeholder}" />`,
    `                    </SelectTrigger>`,
    `                  </FormControl>`,
    `                  <SelectContent>`,
    `                    {${optionsVar}.map((option) => (`,
    `                      <SelectItem key={option.value} value={String(option.value)}>`,
    `                        {option.label}`,
    `                      </SelectItem>`,
    `                    ))}`,
    `                  </SelectContent>`,
    `                </Select>`,
  ];
  
  return lines;
}

/**
 * Generate switch field
 */
function generateSwitchField(field: FormField): string[] {
  return [
    `                <FormControl>`,
    `                  <Switch`,
    `                    checked={formField.value}`,
    `                    onCheckedChange={formField.onChange}`,
    `                    ${field.readonly ? 'disabled' : ''}`,
    `                  />`,
    `                </FormControl>`,
  ];
}

/**
 * Generate checkbox field
 */
function generateCheckboxField(field: FormField): string[] {
  return [
    `                <FormControl>`,
    `                  <Checkbox`,
    `                    checked={formField.value}`,
    `                    onCheckedChange={formField.onChange}`,
    `                    ${field.readonly ? 'disabled' : ''}`,
    `                  />`,
    `                </FormControl>`,
  ];
}

/**
 * Generate textarea field
 */
function generateTextareaField(field: FormField): string[] {
  return [
    `                <FormControl>`,
    `                  <Textarea`,
    `                    placeholder="${field.placeholder}"`,
    `                    rows={4}`,
    `                    ${field.readonly ? 'disabled' : ''}`,
    `                    {...formField}`,
    `                  />`,
    `                </FormControl>`,
  ];
}

/**
 * Generate date field
 */
function generateDateField(field: FormField): string[] {
  return [
    `                <FormControl>`,
    `                  <DatePicker`,
    `                    value={formField.value}`,
    `                    onChange={formField.onChange}`,
    `                    ${field.readonly ? 'disabled' : ''}`,
    `                  />`,
    `                </FormControl>`,
  ];
}

/**
 * Generate form type definitions
 */
function generateFormTypes(config: ReactFormGeneratorConfig, formFields: FormField[]): string {
  const modelName = toPrismaModelName(config.tableName);
  const lines: string[] = [];
  
  lines.push(`// Form Data Types for ${modelName}`);
  lines.push(`// Auto-generated - do not edit manually`);
  lines.push(``);
  lines.push(`export interface DropdownOption {`);
  lines.push(`  value: string | number;`);
  lines.push(`  label: string;`);
  lines.push(`}`);
  lines.push(``);
  
  return lines.join('\n');
}

/**
 * Collect all required imports
 */
function collectImports(formFields: FormField[], config: ReactFormGeneratorConfig): string[] {
  const imports = new Set<string>();
  
  // Always needed
  imports.add('react');
  imports.add('react-hook-form');
  imports.add('@hookform/resolvers/zod');
  imports.add('@/components/ui/form');
  imports.add('@/components/ui/button');
  imports.add('@/hooks/use-toast');
  
  // Field-specific imports
  for (const field of formFields) {
    switch (field.component) {
      case 'Input':
        imports.add('@/components/ui/input');
        break;
      case 'Select':
        imports.add('@/components/ui/select');
        break;
      case 'Textarea':
        imports.add('@/components/ui/textarea');
        break;
      case 'Switch':
        imports.add('@/components/ui/switch');
        break;
      case 'Checkbox':
        imports.add('@/components/ui/checkbox');
        break;
      case 'DatePicker':
      case 'DateTimePicker':
        imports.add('@/components/ui/date-picker');
        imports.add('@/components/ui/calendar');
        imports.add('@/components/ui/popover');
        break;
    }
  }
  
  return Array.from(imports);
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate form for a single table with default config
 */
export async function generateModelForm(
  projectId: string,
  tableName: string,
  options: Partial<ReactFormGeneratorConfig> = {}
): Promise<{ component: string; types: string; imports: string[]; errors: string[] }> {
  const config: ReactFormGeneratorConfig = {
    projectId,
    tableName,
    formType: 'both',
    includeRelations: true,
    includeValidation: true,
    includePIIMasking: true,
    responsiveLayout: true,
    columns: 2,
    includeCancelButton: true,
    ...options,
  };
  
  const result = await generateReactForm(config);
  
  return {
    component: result.formComponent,
    types: result.types,
    imports: result.imports,
    errors: result.errors,
  };
}

/**
 * Generate modal form wrapper
 */
export function wrapInModal(formComponent: string, modelName: string): string {
  const lines: string[] = [];
  
  lines.push(`'use client';`);
  lines.push(``);
  lines.push(`import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';`);
  lines.push(`import { Button } from '@/components/ui/button';`);
  lines.push(`import { Plus, Pencil } from 'lucide-react';`);
  lines.push(``);
  lines.push(`interface ${modelName}FormModalProps {`);
  lines.push(`  mode?: 'create' | 'edit';`);
  lines.push(`  initialData?: Partial<${modelName}>;`);
  lines.push(`  trigger?: React.ReactNode;`);
  lines.push(`  onSuccess?: () => void;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export function ${modelName}FormModal({ mode = 'create', initialData, trigger, onSuccess }: ${modelName}FormModalProps) {`);
  lines.push(`  const [open, setOpen] = useState(false);`);
  lines.push(``);
  lines.push(`  const handleSuccess = () => {`);
  lines.push(`    setOpen(false);`);
  lines.push(`    onSuccess?.();`);
  lines.push(`  };`);
  lines.push(``);
  lines.push(`  return (`);
  lines.push(`    <Dialog open={open} onOpenChange={setOpen}>`);
  lines.push(`      <DialogTrigger asChild>`);
  lines.push(`        {trigger || (`);
  lines.push(`          <Button>`);
  lines.push(`            {mode === 'create' ? <>`);
  lines.push(`              <Plus className="mr-2 h-4 w-4" />`);
  lines.push(`              Add ${modelName}`);
  lines.push(`            </> : <>`);
  lines.push(`              <Pencil className="mr-2 h-4 w-4" />`);
  lines.push(`              Edit`);
  lines.push(`            </>}`);
  lines.push(`          </Button>`);
  lines.push(`        )}`);
  lines.push(`      </DialogTrigger>`);
  lines.push(`      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">`);
  lines.push(`        <DialogHeader>`);
  lines.push(`          <DialogTitle>{mode === 'create' ? 'Create' : 'Edit'} ${modelName}</DialogTitle>`);
  lines.push(`        </DialogHeader>`);
  lines.push(`        <${modelName}Form`);
  lines.push(`          mode={mode}`);
  lines.push(`          initialData={initialData}`);
  lines.push(`          onSuccess={handleSuccess}`);
  lines.push(`          onCancel={() => setOpen(false)}`);
  lines.push(`        />`);
  lines.push(`      </DialogContent>`);
  lines.push(`    </Dialog>`);
  lines.push(`  );`);
  lines.push(`}`);
  
  return lines.join('\n');
}
