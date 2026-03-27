/**
 * Type Mapping Tables
 * 
 * Central mapping configuration for converting between:
 * - SQL Server types → Prisma types
 * - SQL Server types → TypeScript types
 * - SQL Server types → Zod validation types
 * - Semantic types → UI components
 * - Semantic types → Validation patterns
 */

// ══════════════════════════════════════════════════════════════════════════════
// SQL SERVER → PRISMA TYPE MAPPING
// ══════════════════════════════════════════════════════════════════════════════

export const SQL_TO_PRISMA: Record<string, string> = {
  // Integer types
  'INT': 'Int',
  'INTEGER': 'Int',
  'BIGINT': 'BigInt',
  'SMALLINT': 'Int',
  'TINYINT': 'Int',
  
  // Boolean
  'BIT': 'Boolean',
  
  // Decimal/Numeric
  'DECIMAL': 'Decimal',
  'NUMERIC': 'Decimal',
  'MONEY': 'Decimal',
  'SMALLMONEY': 'Decimal',
  'FLOAT': 'Float',
  'REAL': 'Float',
  
  // String types
  'VARCHAR': 'String',
  'NVARCHAR': 'String',
  'CHAR': 'String',
  'NCHAR': 'String',
  'TEXT': 'String',
  'NTEXT': 'String',
  
  // Date/Time
  'DATE': 'DateTime',
  'DATETIME': 'DateTime',
  'DATETIME2': 'DateTime',
  'SMALLDATETIME': 'DateTime',
  'TIME': 'String', // Prisma doesn't have Time type
  'DATETIMEOFFSET': 'DateTime',
  
  // Binary
  'BINARY': 'Bytes',
  'VARBINARY': 'Bytes',
  'IMAGE': 'Bytes',
  
  // Unique Identifier
  'UNIQUEIDENTIFIER': 'String',
  
  // XML
  'XML': 'String',
  
  // JSON (SQL Server 2016+)
  'JSON': 'Json',
};

// MySQL to Prisma
export const MYSQL_TO_PRISMA: Record<string, string> = {
  'TINYINT': 'Int',
  'SMALLINT': 'Int',
  'MEDIUMINT': 'Int',
  'INT': 'Int',
  'INTEGER': 'Int',
  'BIGINT': 'BigInt',
  'FLOAT': 'Float',
  'DOUBLE': 'Float',
  'DECIMAL': 'Decimal',
  'NUMERIC': 'Decimal',
  'BIT': 'Boolean',
  'BOOLEAN': 'Boolean',
  'BOOL': 'Boolean',
  'DATE': 'DateTime',
  'DATETIME': 'DateTime',
  'TIMESTAMP': 'DateTime',
  'TIME': 'String',
  'YEAR': 'Int',
  'CHAR': 'String',
  'VARCHAR': 'String',
  'BINARY': 'Bytes',
  'VARBINARY': 'Bytes',
  'TINYBLOB': 'Bytes',
  'BLOB': 'Bytes',
  'MEDIUMBLOB': 'Bytes',
  'LONGBLOB': 'Bytes',
  'TINYTEXT': 'String',
  'TEXT': 'String',
  'MEDIUMTEXT': 'String',
  'LONGTEXT': 'String',
  'ENUM': 'String',
  'SET': 'String',
  'JSON': 'Json',
};

// PostgreSQL to Prisma
export const POSTGRES_TO_PRISMA: Record<string, string> = {
  'SMALLINT': 'Int',
  'INTEGER': 'Int',
  'BIGINT': 'BigInt',
  'SMALLSERIAL': 'Int',
  'SERIAL': 'Int',
  'BIGSERIAL': 'BigInt',
  'REAL': 'Float',
  'DOUBLE PRECISION': 'Float',
  'NUMERIC': 'Decimal',
  'DECIMAL': 'Decimal',
  'MONEY': 'Decimal',
  'BOOLEAN': 'Boolean',
  'DATE': 'DateTime',
  'TIME': 'String',
  'TIMETZ': 'String',
  'TIMESTAMP': 'DateTime',
  'TIMESTAMPTZ': 'DateTime',
  'CHAR': 'String',
  'CHARACTER': 'String',
  'VARCHAR': 'String',
  'CHARACTER VARYING': 'String',
  'TEXT': 'String',
  'BYTEA': 'Bytes',
  'UUID': 'String',
  'JSON': 'Json',
  'JSONB': 'Json',
  'XML': 'String',
  'INET': 'String',
  'CIDR': 'String',
  'MACADDR': 'String',
  'POINT': 'String',
  'LINE': 'String',
  'LSEG': 'String',
  'BOX': 'String',
  'PATH': 'String',
  'POLYGON': 'String',
  'CIRCLE': 'String',
};

// ══════════════════════════════════════════════════════════════════════════════
// SQL SERVER → TYPESCRIPT TYPE MAPPING
// ══════════════════════════════════════════════════════════════════════════════

export const SQL_TO_TYPESCRIPT: Record<string, string> = {
  // Integer types
  'INT': 'number',
  'INTEGER': 'number',
  'BIGINT': 'bigint',
  'SMALLINT': 'number',
  'TINYINT': 'number',
  
  // Boolean
  'BIT': 'boolean',
  
  // Decimal/Numeric
  'DECIMAL': 'number',
  'NUMERIC': 'number',
  'MONEY': 'number',
  'SMALLMONEY': 'number',
  'FLOAT': 'number',
  'REAL': 'number',
  
  // String types
  'VARCHAR': 'string',
  'NVARCHAR': 'string',
  'CHAR': 'string',
  'NCHAR': 'string',
  'TEXT': 'string',
  'NTEXT': 'string',
  
  // Date/Time
  'DATE': 'Date',
  'DATETIME': 'Date',
  'DATETIME2': 'Date',
  'SMALLDATETIME': 'Date',
  'TIME': 'string',
  'DATETIMEOFFSET': 'Date',
  
  // Binary
  'BINARY': 'Buffer',
  'VARBINARY': 'Buffer',
  'IMAGE': 'Buffer',
  
  // Unique Identifier
  'UNIQUEIDENTIFIER': 'string',
  
  // XML
  'XML': 'string',
  
  // JSON
  'JSON': 'Record<string, any>',
};

// ══════════════════════════════════════════════════════════════════════════════
// SQL SERVER → ZOD TYPE MAPPING
// ══════════════════════════════════════════════════════════════════════════════

export const SQL_TO_ZOD: Record<string, string> = {
  // Integer types
  'INT': 'z.number().int()',
  'INTEGER': 'z.number().int()',
  'BIGINT': 'z.bigint()',
  'SMALLINT': 'z.number().int()',
  'TINYINT': 'z.number().int().min(0).max(255)',
  
  // Boolean
  'BIT': 'z.boolean()',
  
  // Decimal/Numeric
  'DECIMAL': 'z.number()',
  'NUMERIC': 'z.number()',
  'MONEY': 'z.number()',
  'SMALLMONEY': 'z.number()',
  'FLOAT': 'z.number()',
  'REAL': 'z.number()',
  
  // String types
  'VARCHAR': 'z.string()',
  'NVARCHAR': 'z.string()',
  'CHAR': 'z.string()',
  'NCHAR': 'z.string()',
  'TEXT': 'z.string()',
  'NTEXT': 'z.string()',
  
  // Date/Time
  'DATE': 'z.coerce.date()',
  'DATETIME': 'z.coerce.date()',
  'DATETIME2': 'z.coerce.date()',
  'SMALLDATETIME': 'z.coerce.date()',
  'TIME': 'z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)',
  'DATETIMEOFFSET': 'z.coerce.date()',
  
  // Binary
  'BINARY': 'z.instanceof(Buffer)',
  'VARBINARY': 'z.instanceof(Buffer)',
  'IMAGE': 'z.instanceof(Buffer)',
  
  // Unique Identifier
  'UNIQUEIDENTIFIER': 'z.string().uuid()',
  
  // XML
  'XML': 'z.string()',
  
  // JSON
  'JSON': 'z.record(z.any())',
};

// ══════════════════════════════════════════════════════════════════════════════
// SEMANTIC TYPE → UI COMPONENT MAPPING
// ══════════════════════════════════════════════════════════════════════════════

export interface UIComponentConfig {
  component: string;
  props: Record<string, any>;
  importPath: string;
  shadcnComponent: string;
}

export const SEMANTIC_TO_UI: Record<string, UIComponentConfig> = {
  // Identity
  'name': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter name' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'first_name': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter first name' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'last_name': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter last name' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'full_name': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter full name' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  
  // Contact
  'email': {
    component: 'Input',
    props: { type: 'email', placeholder: 'Enter email address' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'phone': {
    component: 'Input',
    props: { type: 'tel', placeholder: 'Enter phone number' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'mobile': {
    component: 'Input',
    props: { type: 'tel', placeholder: 'Enter mobile number' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'fax': {
    component: 'Input',
    props: { type: 'tel', placeholder: 'Enter fax number' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  
  // Address
  'address': {
    component: 'Textarea',
    props: { placeholder: 'Enter address', rows: 3 },
    importPath: '@/components/ui/textarea',
    shadcnComponent: 'textarea',
  },
  'street': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter street address' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'city': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter city' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'state': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter state/province' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'province': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter province' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'country': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter country' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'postal_code': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter postal code' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'zip_code': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter ZIP code' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  
  // Identification
  'id': {
    component: 'Input',
    props: { type: 'number', disabled: true },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'code': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter code' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'reference_number': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter reference number' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'account_number': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter account number' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  
  // Financial
  'money': {
    component: 'Input',
    props: { type: 'number', step: '0.01', placeholder: 'Enter amount' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'currency': {
    component: 'Select',
    props: { placeholder: 'Select currency' },
    importPath: '@/components/ui/select',
    shadcnComponent: 'select',
  },
  'price': {
    component: 'Input',
    props: { type: 'number', step: '0.01', placeholder: 'Enter price' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'percentage': {
    component: 'Input',
    props: { type: 'number', step: '0.01', min: 0, max: 100, placeholder: 'Enter percentage' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  
  // Date/Time
  'date': {
    component: 'DatePicker',
    props: { placeholder: 'Select date' },
    importPath: '@/components/ui/date-picker',
    shadcnComponent: 'popover',
  },
  'datetime': {
    component: 'DateTimePicker',
    props: { placeholder: 'Select date and time' },
    importPath: '@/components/ui/date-picker',
    shadcnComponent: 'popover',
  },
  'time': {
    component: 'Input',
    props: { type: 'time', placeholder: 'Enter time' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'birthday': {
    component: 'DatePicker',
    props: { placeholder: 'Select birthday' },
    importPath: '@/components/ui/date-picker',
    shadcnComponent: 'popover',
  },
  
  // Boolean
  'boolean': {
    component: 'Switch',
    props: {},
    importPath: '@/components/ui/switch',
    shadcnComponent: 'switch',
  },
  'active': {
    component: 'Switch',
    props: {},
    importPath: '@/components/ui/switch',
    shadcnComponent: 'switch',
  },
  'status': {
    component: 'Select',
    props: { placeholder: 'Select status' },
    importPath: '@/components/ui/select',
    shadcnComponent: 'select',
  },
  
  // Text
  'description': {
    component: 'Textarea',
    props: { placeholder: 'Enter description', rows: 4 },
    importPath: '@/components/ui/textarea',
    shadcnComponent: 'textarea',
  },
  'notes': {
    component: 'Textarea',
    props: { placeholder: 'Enter notes', rows: 3 },
    importPath: '@/components/ui/textarea',
    shadcnComponent: 'textarea',
  },
  'comment': {
    component: 'Textarea',
    props: { placeholder: 'Enter comment', rows: 3 },
    importPath: '@/components/ui/textarea',
    shadcnComponent: 'textarea',
  },
  'title': {
    component: 'Input',
    props: { type: 'text', placeholder: 'Enter title' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  
  // File
  'file': {
    component: 'FileUpload',
    props: {},
    importPath: '@/components/ui/file-upload',
    shadcnComponent: 'input',
  },
  'image': {
    component: 'ImageUpload',
    props: {},
    importPath: '@/components/ui/image-upload',
    shadcnComponent: 'input',
  },
  'document': {
    component: 'FileUpload',
    props: { accept: '.pdf,.doc,.docx' },
    importPath: '@/components/ui/file-upload',
    shadcnComponent: 'input',
  },
  
  // Password
  'password': {
    component: 'Input',
    props: { type: 'password', placeholder: 'Enter password' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'confirm_password': {
    component: 'Input',
    props: { type: 'password', placeholder: 'Confirm password' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  
  // URL
  'url': {
    component: 'Input',
    props: { type: 'url', placeholder: 'Enter URL' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  'website': {
    component: 'Input',
    props: { type: 'url', placeholder: 'Enter website URL' },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  },
  
  // Special
  'color': {
    component: 'ColorPicker',
    props: {},
    importPath: '@/components/ui/color-picker',
    shadcnComponent: 'popover',
  },
  'icon': {
    component: 'IconPicker',
    props: {},
    importPath: '@/components/ui/icon-picker',
    shadcnComponent: 'popover',
  },
  'markdown': {
    component: 'MarkdownEditor',
    props: {},
    importPath: '@/components/ui/markdown-editor',
    shadcnComponent: 'textarea',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// SEMANTIC TYPE → VALIDATION PATTERN MAPPING
// ══════════════════════════════════════════════════════════════════════════════

export interface ValidationPattern {
  regex: string;
  zodMethod: string;
  errorMessage: string;
}

export const SEMANTIC_VALIDATION: Record<string, ValidationPattern> = {
  'email': {
    regex: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    zodMethod: '.email()',
    errorMessage: 'Invalid email format',
  },
  'phone': {
    regex: '^[+]?[(]?[0-9]{1,4}[)]?[-\\s./0-9]{6,}$',
    zodMethod: '.regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\\s./0-9]{6,}$/)',
    errorMessage: 'Invalid phone number format',
  },
  'url': {
    regex: '^(https?:\\/\\/)?([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([\\/\\w \\.-]*)*\\/?$',
    zodMethod: '.url()',
    errorMessage: 'Invalid URL format',
  },
  'postal_code': {
    regex: '^[A-Za-z0-9 ]{3,10}$',
    zodMethod: '.regex(/^[A-Za-z0-9 ]{3,10}$/)',
    errorMessage: 'Invalid postal code format',
  },
  'password': {
    regex: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$',
    zodMethod: '.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$/)',
    errorMessage: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  },
  'credit_card': {
    regex: '^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$',
    zodMethod: '.regex(/^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$/)',
    errorMessage: 'Invalid credit card number',
  },
  'ssn': {
    regex: '^\\d{3}-\\d{2}-\\d{4}$',
    zodMethod: '.regex(/^\\d{3}-\\d{2}-\\d{4}$/)',
    errorMessage: 'Invalid SSN format (XXX-XX-XXXX)',
  },
  'uuid': {
    regex: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    zodMethod: '.uuid()',
    errorMessage: 'Invalid UUID format',
  },
  'ip_address': {
    regex: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
    zodMethod: '.ip()',
    errorMessage: 'Invalid IP address',
  },
  'mac_address': {
    regex: '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$',
    zodMethod: '.regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2}$/)',
    errorMessage: 'Invalid MAC address format',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get Prisma type from SQL type
 */
export function getPrismaType(sqlType: string, dbType: 'sqlserver' | 'mysql' | 'postgresql' = 'sqlserver'): string {
  const upperType = sqlType.toUpperCase().replace(/\([^)]*\)/, ''); // Remove (max), (50), etc.
  
  switch (dbType) {
    case 'mysql':
      return MYSQL_TO_PRISMA[upperType] || 'String';
    case 'postgresql':
      return POSTGRES_TO_PRISMA[upperType] || 'String';
    default:
      return SQL_TO_PRISMA[upperType] || 'String';
  }
}

/**
 * Get TypeScript type from SQL type
 */
export function getTypeScriptType(sqlType: string): string {
  const upperType = sqlType.toUpperCase().replace(/\([^)]*\)/, '');
  return SQL_TO_TYPESCRIPT[upperType] || 'string';
}

/**
 * Get Zod validation from SQL type
 */
export function getZodType(sqlType: string): string {
  const upperType = sqlType.toUpperCase().replace(/\([^)]*\)/, '');
  return SQL_TO_ZOD[upperType] || 'z.string()';
}

/**
 * Get UI component from semantic type
 */
export function getUIComponent(semanticType: string): UIComponentConfig {
  const normalized = semanticType.toLowerCase().replace(/[_\s]/g, '_');
  return SEMANTIC_TO_UI[normalized] || {
    component: 'Input',
    props: { type: 'text', placeholder: `Enter ${semanticType}` },
    importPath: '@/components/ui/input',
    shadcnComponent: 'input',
  };
}

/**
 * Get validation pattern from semantic type
 */
export function getValidationPattern(semanticType: string): ValidationPattern | null {
  const normalized = semanticType.toLowerCase().replace(/[_\s]/g, '_');
  return SEMANTIC_VALIDATION[normalized] || null;
}

/**
 * Check if a type is numeric
 */
export function isNumericType(sqlType: string): boolean {
  const upperType = sqlType.toUpperCase().replace(/\([^)]*\)/, '');
  return ['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'DECIMAL', 'NUMERIC', 'MONEY', 'SMALLMONEY', 'FLOAT', 'REAL'].includes(upperType);
}

/**
 * Check if a type is a string
 */
export function isStringType(sqlType: string): boolean {
  const upperType = sqlType.toUpperCase().replace(/\([^)]*\)/, '');
  return ['VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR', 'TEXT', 'NTEXT', 'XML'].includes(upperType);
}

/**
 * Check if a type is a date
 */
export function isDateType(sqlType: string): boolean {
  const upperType = sqlType.toUpperCase().replace(/\([^)]*\)/, '');
  return ['DATE', 'DATETIME', 'DATETIME2', 'SMALLDATETIME', 'DATETIMEOFFSET'].includes(upperType);
}

/**
 * Check if a type is boolean
 */
export function isBooleanType(sqlType: string): boolean {
  const upperType = sqlType.toUpperCase().replace(/\([^)]*\)/, '');
  return upperType === 'BIT';
}

/**
 * Get default value for a type
 */
export function getDefaultValue(sqlType: string, semanticType?: string): any {
  const upperType = sqlType.toUpperCase().replace(/\([^)]*\)/, '');
  
  if (isBooleanType(upperType)) return false;
  if (isNumericType(upperType)) return 0;
  if (isDateType(upperType)) return null; // Dates should be null by default
  
  // String types
  const semantic = semanticType?.toLowerCase() || '';
  
  // Status/active fields
  if (semantic.includes('active') || semantic.includes('is_')) return false;
  if (semantic.includes('status')) return 'active';
  
  // Empty string for other string types
  return '';
}

/**
 * Convert table name to Prisma model name (PascalCase)
 */
export function toPrismaModelName(tableName: string): string {
  return tableName
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert field name to camelCase
 */
export function toCamelCase(fieldName: string): string {
  return fieldName
    .split(/[-_\s]+/)
    .map((word, index) => {
      if (index === 0) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Convert to snake_case
 */
export function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[-\s]/g, '_')
    .toLowerCase();
}

/**
 * Convert to kebab-case
 */
export function toKebabCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]/g, '-')
    .toLowerCase();
}
