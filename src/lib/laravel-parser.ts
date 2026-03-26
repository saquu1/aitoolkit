// ============================================================================
// LARAVEL BLADE PARSER - 5-LAYER DEEP EXTRACTION ENGINE
// ============================================================================

// Types
interface LaravelColumn {
  name: string
  sqlType: string
  nullable: boolean
  isPK: boolean
  isFK: boolean
  fkTable?: string
  fkColumn?: string
  isUnique: boolean
  isComputed: boolean
  isAudit: boolean
  defaultValue?: string
  checkConstraint?: string
  enumValues?: string[]
  label?: string
  maxLength?: number
  source: string
  confidence: number
}

interface LaravelTable {
  name: string
  columns: LaravelColumn[]
  relationships: LaravelRelationship[]
  isJunction: boolean
  isPivot: boolean
  isPolymorphic: boolean
  softDeletes: boolean
  timestamps: boolean
  traits: string[]
}

interface LaravelRelationship {
  type: '1:1' | '1:M' | 'M:1' | 'M:M' | 'SELF_REF' | 
        'MORPH_ONE' | 'MORPH_MANY' | 'MORPH_M2M'
  from: string
  to: string
  fkColumn: string
  pivotTable?: string
  morphType?: string
  cascadeDelete: boolean
}

interface LaravelParseResult {
  tables: LaravelTable[]
  warnings: string[]
  confidence: number
  sources: string[]
}

// ═══════════════════════════════════════════
// REGEX REGISTRY - LARAVEL SPECIFIC
// ═══════════════════════════════════════════

const LARAVEL_REGEX = {
  // ── Layer 1: Blade Extraction ──
  
  rawInput: /<input[^>]*>/gi,
  rawSelect: /<select[^>]*>[\s\S]*?<\/select>/gi,
  rawTextarea: /<textarea[^>]*>[\s\S]*?<\/textarea>/gi,
  
  attrName: /\bname=["']([\w.\[\]]+)["']/i,
  attrType: /\btype=["'](\w+)["']/i,
  attrRequired: /\brequired\b/i,
  attrMaxLength: /\bmaxlength=["'](\d+)["']/i,
  attrMin: /\bmin=["']([^"']+)["']/i,
  attrMax: /\bmax=["']([^"']+)["']/i,
  attrPattern: /\bpattern=["']([^"']+)["']/i,
  attrReadonly: /\b(?:readonly|disabled)\b/i,
  attrMultiple: /\bmultiple\b/i,
  
  // Laravel old() value detection
  oldValue: /\{\{\s*old\(\s*['"]([\w.]+)['"](?:\s*,\s*([^)]+))?\)\s*\}\}/g,
  
  // Form facade (Laravel Collective)
  formFacade: /\{!!\s*Form::(\w+)\s*\(\s*['"]([\w.]+)['"]/g,
  formSelect: /\{!!\s*Form::select\s*\(\s*['"]([\w.]+)['"](?:\s*,\s*(\$[\w->]+|\[[^\]]*\]))?/g,
  formLabel: /\{!!\s*Form::label\s*\(\s*['"]([\w.]+)['"](?:\s*,\s*['"]([^"']+)['"])?\s*\)\s*!!\}/g,
  
  // Livewire wire:model
  wireModel: /wire:model(?:\.\w+)*=["']([\w.]+)["']/g,
  wireNested: /wire:model(?:\.\w+)*=["'](\w+)\.(\d+)\.(\w+)["']/g,
  
  // Alpine.js x-model
  alpineModel: /x-model(?:\.\w+)?=["']([\w.]+)["']/g,
  
  // Vue v-model (Inertia)
  vueModel: /v-model(?:\.\w+)?=["'](?:form\.)?(\w+)["']/g,
  
  // Blade components (x-input, x-select, etc.)
  bladeComponent: /<x-([\w.-]+)[^>]*\b(?:name|field)=["']([\w.]+)["'](?:[^>]*\btype=["'](\w+)["'])?(?:[^>]*\blabel=["']([^"']+)["'])?[^>]*\/?>/gi,
  
  // Filament fields
  filamentField: /(TextInput|Select|Textarea|Toggle|Checkbox|DatePicker|DateTimePicker|TimePicker|FileUpload|RichEditor|MarkdownEditor|ColorPicker|KeyValue|Repeater|TagsInput|Hidden)::make\(\s*['"]([\w.]+)['"]\s*\)/g,
  filamentRelation: /Select::make\(\s*['"]([\w.]+)['"]\s*\)[\s\S]*?->relationship\(\s*['"](\w+)['"](?:\s*,\s*['"](\w+)['"])?\s*\)/g,
  filamentMultiple: /->multiple\(\)/,
  
  // @error directive
  errorDirective: /@error\(\s*['"]([\w.*]+)["']\s*\)/g,
  errorsHas: /\$errors->(?:has|first)\(\s*['"]([\w.*]+)['"]\s*\)/g,
  
  // Form action
  formAction: /action=["']\{\{\s*(?:route|url|action)\(\s*['"]([\w.]+)['"](?:\s*,\s*([^)]+))?\)\s*\}\}["']/g,
  csrf: /@csrf/g,
  methodSpoofing: /@method\(\s*['"](\w+)['"]\s*\)/g,
  
  // Labels
  labelFor: /<label[^>]*\bfor=["']([\w-]+)["'][^>]*>([^<]*(?:<[^>]*>[^<]*)*?)<\/label>/gi,
  
  // Partials and components
  include: /@include\(\s*['"]([\w._-]+)["'](?:\s*,\s*([^)]+))?\s*\)/g,
  component: /@component\(\s*['"]([\w._-]+)["'](?:\s*,\s*([^)]+))?\s*\)/g,
  livewireTag: /<livewire:([\w.-]+)/g,
  livewireDirective: /@livewire\(\s*['"]([\w.-]+)["']/g,
  
  // Loops
  foreachLoop: /@foreach\s*\(\s*\$(\w+)\s+as\s+\$(\w+)\s*\)/g,
  
  // Table headers
  tableHeaders: /<th[^>]*>([^<]+)<\/th>/gi,
  
  // Dynamic rows
  dynamicRow: /(?:add(?:Row|Item|Line|Detail)|append(?:Row|Item)|new(?:Row|Item))\s*\(/gi,
  
  // Inertia useForm
  inertiaForm: /useForm\s*\(\s*\{([\s\S]*?)\}\s*\)/g,
  inertiaFields: /(\w+)\s*:\s*(['"][^"']*["']|null|\d+(?:\.\d+)?|true|false|\[\]|\{\})/g,
  
  // ── Layer 2: Validation ──
  
  validationRules: /(?:public\s+function\s+rules\s*\(\s*\)[\s\S]*?return\s*\[|['"]rules['"]\s*=>\s*\[)([\s\S]*?)\]\s*;/g,
  inlineValidation: /\$(?:request|this)\s*->\s*validate\s*\(\s*\[([\s\S]*?)\]\s*\)/g,
  validatorMake: /Validator::make\s*\(\s*\$[\w->]+\s*,\s*\[([\s\S]*?)\]\s*\)/g,
  
  ruleField: /['"]([\w.*]+)['"]\s*=>\s*(?:['"]([^"']+)['"]|\[([\s\S]*?)\])/g,
  
  // ── Layer 3: Model / Eloquent ──
  
  fillable: /\$fillable\s*=\s*\[([\s\S]*?)\]\s*;/,
  guarded: /\$guarded\s*=\s*\[([\s\S]*?)\]\s*;/,
  casts: /(?:\$casts\s*=\s*\[|function\s+casts\s*\(\s*\)[\s\S]*?return\s*\[)([\s\S]*?)\]/,
  
  tableName: /\$table\s*=\s*['"](\w+)['"]/,
  primaryKey: /\$primaryKey\s*=\s*['"](\w+)['"]/,
  timestamps: /\$timestamps\s*=\s*(true|false)/,
  incrementing: /\$incrementing\s*=\s*(true|false)/,
  keyType: /\$keyType\s*=\s*['"](\w+)['"]/,
  
  relationship: /public\s+function\s+(\w+)\s*\([^)]*\)(?:\s*:\s*\w+)?\s*\{\s*return\s+\$this->(hasMany|hasOne|belongsTo|belongsToMany|morphMany|morphOne|morphTo|morphToMany|morphedByMany|hasManyThrough|hasOneThrough)\s*\(([\s\S]*?)\)\s*;?\s*\}/g,
  
  softDeletes: /use\s+SoftDeletes\b/,
  traits: /use\s+(HasFactory|SoftDeletes|Notifiable|HasRoles|HasApiTokens|Searchable|Auditable|Sluggable|HasMedia|HasUuids|HasUlids|Billable|MustVerifyEmail|Translatable)\b/g,
  
  // ── Layer 4: Migration ──
  
  schemaCreate: /Schema::create\s*\(\s*['"](\w+)['"]\s*,\s*function\s*\(\s*Blueprint\s+\$(\w+)\s*\)\s*\{([\s\S]*?)\}\s*\)/g,
  
  migrationColumn: /\$\w+->(id|uuid|ulid|string|text|longText|mediumText|tinyText|integer|tinyInteger|smallInteger|mediumInteger|bigInteger|unsignedInteger|unsignedBigInteger|unsignedTinyInteger|unsignedSmallInteger|unsignedMediumInteger|float|double|decimal|boolean|date|dateTime|dateTimeTz|time|timeTz|timestamp|timestampTz|year|binary|char|enum|set|json|jsonb|ipAddress|macAddress|morphs|nullableMorphs|uuidMorphs|nullableUuidMorphs|foreignId|foreignUuid|foreignUlid|rememberToken|softDeletes|softDeletesTz|timestamps|timestampsTz|nullableTimestamps)\s*\(\s*(?:['"](\w+)['"])?(?:\s*,\s*([^)]*))?\s*\)((?:\s*->[\w]+\([^)]*\))*)?/g,
  
  migrationModifier: /->(nullable|unique|default|index|primary|unsigned|comment|constrained|cascadeOnDelete|cascadeOnUpdate|nullOnDelete|restrictOnDelete)\s*\(\s*(?:['"]?([^)'"]*?)['"]?)?\s*\)/g,
  
  migrationFK: /\$\w+->foreign\(\s*['"](\w+)['"]\s*\)\s*->references\(\s*['"](\w+)['"]\s*\)\s*->on\(\s*['"](\w+)['"]\s*\)/g,
  
  migrationIndex: /\$\w+->(index|unique|primary|fullText|spatialIndex)\s*\(\s*(?:\[([^\]]+)\]|['"](\w+)['"])/g,
  
  // ── Layer 5: Routes ──
  
  routeResource: /Route::(?:resource|apiResource)\s*\(\s*['"]([\w\-\/]+)["']\s*,\s*(?:\[)?[\s\S]*?([\w\\]+)(?:::class)?/g,
  routeIndividual: /Route::(get|post|put|patch|delete)\s*\(\s*['"]([^"']+)["']/g,
  
  // ── Livewire Properties ──
  
  livewireProp: /(?:public|#\[Locked\])\s+(?:(string|int|float|bool|array|\?string|\?int|\?float|\?bool|Carbon|Collection)\s+)?\$(\w+)(?:\s*=\s*([^;]+))?;/g,
}

// ═══════════════════════════════════════════
// TYPE MAPPINGS
// ═══════════════════════════════════════════

const FORM_FACADE_TYPE_MAP: Record<string, string> = {
  "text": "VARCHAR(255)",
  "email": "VARCHAR(255)",
  "password": "VARCHAR(255)",
  "hidden": "INT",
  "number": "DECIMAL(18,2)",
  "date": "DATE",
  "time": "TIME",
  "datetime": "DATETIME",
  "file": "VARCHAR(500)",
  "textarea": "TEXT",
  "checkbox": "BIT",
  "radio": "VARCHAR(50)",
  "select": "INT", // FK
  "url": "VARCHAR(500)",
  "tel": "VARCHAR(20)",
  "color": "VARCHAR(7)",
}

const FILAMENT_TYPE_MAP: Record<string, string> = {
  "TextInput": "VARCHAR(255)",
  "Select": "INT",
  "Textarea": "TEXT",
  "Toggle": "BIT",
  "Checkbox": "BIT",
  "DatePicker": "DATE",
  "DateTimePicker": "DATETIME",
  "TimePicker": "TIME",
  "FileUpload": "VARCHAR(500)",
  "RichEditor": "NVARCHAR(MAX)",
  "MarkdownEditor": "NVARCHAR(MAX)",
  "ColorPicker": "VARCHAR(7)",
  "Hidden": "INT",
  "TagsInput": "NVARCHAR(MAX)",
  "KeyValue": "NVARCHAR(MAX)",
}

const MIGRATION_TYPE_MAP: Record<string, string> = {
  'id': 'BIGINT IDENTITY(1,1) PRIMARY KEY',
  'uuid': 'UNIQUEIDENTIFIER DEFAULT NEWID()',
  'ulid': 'CHAR(26)',
  'string': 'VARCHAR',
  'char': 'CHAR',
  'text': 'NVARCHAR(MAX)',
  'mediumText': 'NVARCHAR(MAX)',
  'longText': 'NVARCHAR(MAX)',
  'tinyText': 'VARCHAR(255)',
  'integer': 'INT',
  'tinyInteger': 'TINYINT',
  'smallInteger': 'SMALLINT',
  'mediumInteger': 'MEDIUMINT',
  'bigInteger': 'BIGINT',
  'unsignedInteger': 'INT',
  'unsignedBigInteger': 'BIGINT',
  'unsignedTinyInteger': 'TINYINT',
  'unsignedSmallInteger': 'SMALLINT',
  'unsignedMediumInteger': 'MEDIUMINT',
  'float': 'FLOAT',
  'double': 'FLOAT',
  'decimal': 'DECIMAL',
  'boolean': 'BIT',
  'date': 'DATE',
  'dateTime': 'DATETIME2',
  'dateTimeTz': 'DATETIME2',
  'time': 'TIME',
  'timeTz': 'TIME',
  'timestamp': 'DATETIME2',
  'timestampTz': 'DATETIME2',
  'year': 'SMALLINT',
  'binary': 'VARBINARY(MAX)',
  'enum': 'VARCHAR(50)',
  'set': 'VARCHAR(255)',
  'json': 'NVARCHAR(MAX)',
  'jsonb': 'NVARCHAR(MAX)',
  'ipAddress': 'VARCHAR(45)',
  'macAddress': 'VARCHAR(17)',
  'rememberToken': 'VARCHAR(100)',
  'softDeletes': 'DATETIME2',
  'softDeletesTz': 'DATETIME2',
  'timestamps': 'DATETIME2',
  'timestampsTz': 'DATETIME2',
}

const CAST_TYPE_MAP: Record<string, string> = {
  'string': 'VARCHAR(255)',
  'integer': 'INT',
  'int': 'INT',
  'float': 'FLOAT',
  'double': 'DOUBLE PRECISION',
  'boolean': 'BIT',
  'bool': 'BIT',
  'date': 'DATE',
  'datetime': 'DATETIME2',
  'timestamp': 'DATETIME2',
  'array': 'NVARCHAR(MAX)',
  'json': 'NVARCHAR(MAX)',
  'object': 'NVARCHAR(MAX)',
  'collection': 'NVARCHAR(MAX)',
  'hashed': 'VARCHAR(255)',
  'encrypted': 'NVARCHAR(MAX)',
}

const PHP_TYPE_MAP: Record<string, string> = {
  'string': 'VARCHAR(255)',
  '?string': 'VARCHAR(255)',
  'int': 'INT',
  '?int': 'INT',
  'float': 'DECIMAL(18,2)',
  '?float': 'DECIMAL(18,2)',
  'bool': 'BIT',
  '?bool': 'BIT',
  'array': 'NVARCHAR(MAX)',
  'Carbon': 'DATETIME2',
  'Collection': 'NVARCHAR(MAX)',
}

// Advanced name-based type inference (Laravel snake_case)
const NAME_TYPE_RULES: Array<{ pattern: RegExp; sqlType: string; constraints?: string }> = [
  // PK
  { pattern: /^id$/, sqlType: 'INT IDENTITY(1,1) PRIMARY KEY' },
  { pattern: /_id$/, sqlType: 'INT' },
  
  // Strings
  { pattern: /^(code|sku|isbn|slug)$/i, sqlType: 'VARCHAR(50)' },
  { pattern: /^(name|title|label|subject)$/i, sqlType: 'NVARCHAR(200)' },
  { pattern: /^(description|summary|excerpt)$/i, sqlType: 'NVARCHAR(1000)' },
  { pattern: /^(body|content|html|bio)$/i, sqlType: 'NVARCHAR(MAX)' },
  { pattern: /^(notes?|remarks?|comments?)$/i, sqlType: 'NVARCHAR(MAX)' },
  
  // Contact
  { pattern: /email/i, sqlType: 'VARCHAR(255)' },
  { pattern: /phone|mobile|fax|tel/i, sqlType: 'VARCHAR(20)' },
  { pattern: /website|url|link|uri|href/i, sqlType: 'VARCHAR(500)' },
  
  // Address
  { pattern: /^(address|street|line_?[12])$/i, sqlType: 'NVARCHAR(500)' },
  { pattern: /^(city|state|province|region)$/i, sqlType: 'NVARCHAR(100)' },
  { pattern: /^(zip|postal|post_code)$/i, sqlType: 'VARCHAR(20)' },
  { pattern: /^country$/i, sqlType: 'NVARCHAR(100)' },
  
  // Dates
  { pattern: /_at$/i, sqlType: 'DATETIME2' },
  { pattern: /_on$/i, sqlType: 'DATE' },
  { pattern: /^dob$|^birth_?date$|^date_of_birth$/i, sqlType: 'DATE' },
  { pattern: /^year$/i, sqlType: 'SMALLINT' },
  { pattern: /^month$/i, sqlType: 'TINYINT' },
  
  // Numbers
  { pattern: /^(age|count|quantity|qty|number|num|total_count|order|sort_order|sequence|position|rank)$/i, sqlType: 'INT' },
  { pattern: /^(price|amount|cost|rate|fee|salary|wage|budget|total|balance|tax|discount|subtotal|grand_total)$/i, sqlType: 'DECIMAL(18,2)' },
  { pattern: /^(percent|percentage|ratio|commission)$/i, sqlType: 'DECIMAL(5,2)' },
  { pattern: /^(lat|latitude)$/i, sqlType: 'DECIMAL(9,6)' },
  { pattern: /^(lng|lon|longitude)$/i, sqlType: 'DECIMAL(9,6)' },
  { pattern: /^(weight|height|width|length|depth|size|area|volume|distance)$/i, sqlType: 'DECIMAL(10,2)' },
  
  // Boolean
  { pattern: /^is_|^has_|^can_|^should_|^allow|^enable|^show_|^include_/i, sqlType: 'BIT' },
  
  // Files
  { pattern: /^(photo|image|avatar|logo|thumbnail|icon|banner|cover)(_url|_path)?$/i, sqlType: 'VARCHAR(500)' },
  { pattern: /^(file|document|attachment|resume|cv)(_name|_path|_url)?$/i, sqlType: 'VARCHAR(500)' },
  { pattern: /^(mime_?type|content_?type|file_?type)$/i, sqlType: 'VARCHAR(100)' },
  { pattern: /^(file_?size|size_in_bytes)$/i, sqlType: 'BIGINT' },
  
  // Auth
  { pattern: /^password|password_hash$/i, sqlType: 'VARCHAR(255)' },
  { pattern: /^(token|refresh_token|api_key|api_token|secret|remember_token)$/i, sqlType: 'VARCHAR(500)' },
  
  // Enums
  { pattern: /^(status|state|phase|stage)$/i, sqlType: 'VARCHAR(50)' },
  { pattern: /^(type|kind|category|level|priority|severity|role|gender|color_code)$/i, sqlType: 'VARCHAR(50)' },
  
  // JSON
  { pattern: /^(metadata|settings?|config|preferences?|options|extra|data|payload|attributes|tags|labels|keywords)$/i, sqlType: 'NVARCHAR(MAX)' },
  
  // UUID
  { pattern: /^(guid|uuid|external_id|correlation_id|tracking_id|reference)$/i, sqlType: 'UNIQUEIDENTIFIER' },
  
  // IP
  { pattern: /^ip(_address)?$/i, sqlType: 'VARCHAR(45)' },
  { pattern: /^(user_agent|browser)$/i, sqlType: 'VARCHAR(500)' },
  
  // Color
  { pattern: /^(color|colour)$/i, sqlType: 'VARCHAR(7)' },
]

// ═══════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════

export function parseLaravelBlade(
  content: string,
  fileName: string
): LaravelParseResult {
  
  const result: LaravelParseResult = {
    tables: [],
    warnings: [],
    confidence: 0,
    sources: ['blade']
  }
  
  const tableMap = new Map<string, LaravelTable>()
  const labels = new Map<string, string>()
  const fks = new Map<string, string>()
  
  // Determine entity from filename
  let entity = extractEntityFromPath(fileName)
  
  // Initialize table
  if (!tableMap.has(entity)) {
    tableMap.set(entity, createEmptyTable(entity))
  }
  const table = tableMap.get(entity)!
  
  // ── Extract Labels ──
  extractLabels(content, labels)
  
  // ── Collect All Fields ──
  const fields: Array<{ name: string; type: string; raw: string; source: string }> = []
  
  // Raw HTML inputs
  extractRawInputs(content, fields)
  
  // Raw selects
  extractRawSelects(content, fields)
  
  // Raw textareas
  extractRawTextareas(content, fields)
  
  // Form facade
  extractFormFacade(content, fields, fks)
  
  // wire:model (Livewire)
  extractWireModels(content, fields)
  
  // Nested wire:model (child tables)
  extractNestedWireModels(content, tableMap, entity)
  
  // Alpine x-model
  extractAlpineModels(content, fields)
  
  // Vue v-model (Inertia)
  extractVueModels(content, fields)
  
  // Blade components
  extractBladeComponents(content, fields, labels)
  
  // Filament fields
  extractFilamentFields(content, fields, fks)
  
  // @error directives (confirms field exists)
  extractErrorDirectives(content, fields)
  
  // Inertia useForm
  extractInertiaForm(content, fields)
  
  // ── Build Columns from Fields ──
  const seenNames = new Set<string>()
  
  for (const field of fields) {
    // Skip array fields
    if (field.name.includes('[]')) {
      // M:M detection
      const baseName = field.name.replace('[]', '')
      handleManyToMany(entity, baseName, tableMap)
      continue
    }
    
    // Skip nested fields
    if (field.name.includes('.') && !field.name.includes('*')) continue
    
    if (seenNames.has(field.name)) continue
    seenNames.add(field.name)
    
    // Build column
    const col = buildLaravelColumn(field.name, field.type, field.raw, field.source)
    
    if (!table.columns.find(c => c.name === col.name)) {
      table.columns.push(col)
    }
  }
  
  // ── Extract from Route Action ──
  extractRouteInfo(content, table, entity)
  
  // ── Ensure PK ──
  if (!table.columns.find(c => c.isPK)) {
    table.columns.unshift({
      name: 'id',
      sqlType: 'INT IDENTITY(1,1) PRIMARY KEY',
      nullable: false,
      isPK: true,
      isFK: false,
      isUnique: false,
      isComputed: false,
      isAudit: false,
      source: 'auto',
      confidence: 100
    })
  }
  
  // ── Add timestamps if form detected ──
  if (fields.length > 3 && table.timestamps) {
    for (const ts of ['created_at', 'updated_at']) {
      if (!table.columns.find(c => c.name === ts)) {
        table.columns.push({
          name: ts,
          sqlType: 'DATETIME2',
          nullable: true,
          isPK: false,
          isFK: false,
          isUnique: false,
          isComputed: false,
          isAudit: true,
          source: 'timestamps',
          confidence: 90
        })
      }
    }
  }
  
  // ── Apply Labels ──
  for (const col of table.columns) {
    if (labels.has(col.name)) {
      col.label = labels.get(col.name)
    }
  }
  
  // ── Assemble Result ──
  result.tables = Array.from(tableMap.values())
  
  // Calculate confidence
  result.confidence = Math.min(100,
    (result.tables.length > 0 ? 20 : 0) +
    (fields.length > 5 ? 30 : fields.length * 5) +
    (fks.size > 0 ? 20 : 0) +
    (labels.size > 0 ? 15 : 0) +
    (content.includes('@csrf') ? 15 : 0)
  )
  
  return result
}

// ═══════════════════════════════════════════
// EXTRACTION FUNCTIONS
// ═══════════════════════════════════════════

function extractEntityFromPath(fileName: string): string {
  // create.blade.php → parent folder name
  // organization/create.blade.php → Organization
  const parts = fileName.replace(/\.blade\.php$/i, '').split('/')
  let name = parts[parts.length - 1]
  
  // Remove common action names
  name = name.replace(/^(create|edit|show|index|form|_form|store|update)$/i, '')
  
  if (!name && parts.length > 1) {
    name = parts[parts.length - 2]
  }
  
  return singularize(capitalize(name || 'Unknown'))
}

function extractLabels(content: string, labels: Map<string, string>) {
  let m: RegExpExecArray | null
  
  // HTML label for
  const labelForRegex = new RegExp(LARAVEL_REGEX.labelFor.source, 'gi')
  while ((m = labelForRegex.exec(content))) {
    labels.set(m[1], m[2].replace(/<[^>]+>/g, '').trim())
  }
  
  // Form::label
  const formLabelRegex = new RegExp(LARAVEL_REGEX.formLabel.source, 'g')
  while ((m = formLabelRegex.exec(content))) {
    labels.set(m[1], m[2] || m[1])
  }
}

function extractRawInputs(content: string, fields: Array<{ name: string; type: string; raw: string; source: string }>) {
  for (const el of content.matchAll(LARAVEL_REGEX.rawInput)) {
    const raw = el[0]
    const nameMatch = raw.match(LARAVEL_REGEX.attrName)
    const typeMatch = raw.match(LARAVEL_REGEX.attrType)
    
    if (nameMatch) {
      fields.push({
        raw,
        source: 'html-input',
        name: nameMatch[1].replace(/\[\]$/, ''),
        type: typeMatch ? typeMatch[1] : 'text'
      })
    }
  }
}

function extractRawSelects(content: string, fields: Array<{ name: string; type: string; raw: string; source: string }>) {
  for (const el of content.matchAll(LARAVEL_REGEX.rawSelect)) {
    const raw = el[0]
    const nameMatch = raw.match(LARAVEL_REGEX.attrName)
    const isMultiple = LARAVEL_REGEX.attrMultiple.test(raw)
    
    if (nameMatch) {
      fields.push({
        raw,
        source: isMultiple ? 'html-multiselect' : 'html-select',
        name: nameMatch[1].replace(/\[\]$/, ''),
        type: isMultiple ? 'multiselect' : 'select'
      })
    }
  }
}

function extractRawTextareas(content: string, fields: Array<{ name: string; type: string; raw: string; source: string }>) {
  for (const el of content.matchAll(LARAVEL_REGEX.rawTextarea)) {
    const raw = el[0]
    const nameMatch = raw.match(LARAVEL_REGEX.attrName)
    
    if (nameMatch) {
      fields.push({
        raw,
        source: 'html-textarea',
        name: nameMatch[1],
        type: 'textarea'
      })
    }
  }
}

function extractFormFacade(
  content: string,
  fields: Array<{ name: string; type: string; raw: string; source: string }>,
  fks: Map<string, string>
) {
  let m: RegExpExecArray | null
  const facadeRegex = new RegExp(LARAVEL_REGEX.formFacade.source, 'g')
  
  while ((m = facadeRegex.exec(content))) {
    const helperType = m[1]
    const propertyName = m[2]
    
    fields.push({
      raw: m[0],
      source: `form-facade-${helperType}`,
      name: propertyName,
      type: helperType
    })
    
    // FK detection for select
    if (helperType === 'select') {
      const contextStart = Math.max(0, m.index - 50)
      const contextEnd = Math.min(content.length, m.index + m[0].length + 300)
      const context = content.substring(contextStart, contextEnd)
      
      // Extract $variable source
      const sourceMatch = context.match(/\$(\w+)/)
      if (sourceMatch) {
        fks.set(propertyName, sourceMatch[1])
      }
    }
  }
}

function extractWireModels(content: string, fields: Array<{ name: string; type: string; raw: string; source: string }>) {
  let m: RegExpExecArray | null
  const wireRegex = new RegExp(LARAVEL_REGEX.wireModel.source, 'g')
  
  while ((m = wireRegex.exec(content))) {
    const propertyName = m[1]
    
    // Get context to determine type
    const contextStart = Math.max(0, m.index - 100)
    const contextEnd = Math.min(content.length, m.index + m[0].length + 50)
    const context = content.substring(contextStart, contextEnd)
    
    const typeMatch = context.match(LARAVEL_REGEX.attrType)
    const tagMatch = context.match(/<(select|textarea|input)/)
    
    let inputType = 'text'
    if (typeMatch) {
      inputType = typeMatch[1]
    } else if (tagMatch) {
      inputType = tagMatch[1] === 'select' ? 'select' : tagMatch[1] === 'textarea' ? 'textarea' : 'text'
    }
    
    fields.push({
      raw: context,
      source: 'livewire',
      name: propertyName,
      type: inputType
    })
  }
}

function extractNestedWireModels(
  content: string,
  tableMap: Map<string, LaravelTable>,
  parentEntity: string
) {
  let m: RegExpExecArray | null
  const nestedRegex = new RegExp(LARAVEL_REGEX.wireNested.source, 'g')
  
  while ((m = nestedRegex.exec(content))) {
    const parentProp = m[1]
    const childField = m[3]
    
    const childTableName = singularize(capitalize(parentProp))
    
    if (!tableMap.has(childTableName)) {
      const childTable = createEmptyTable(childTableName)
      
      // Add parent FK
      childTable.columns.push({
        name: `${parentEntity.toLowerCase()}_id`,
        sqlType: 'INT',
        nullable: false,
        isPK: false,
        isFK: true,
        fkTable: pluralize(parentEntity.toLowerCase()),
        isUnique: false,
        isComputed: false,
        isAudit: false,
        source: 'parent-fk',
        confidence: 95
      })
      
      childTable.relationships.push({
        type: '1:M',
        from: parentEntity,
        to: childTableName,
        fkColumn: `${parentEntity.toLowerCase()}_id`,
        cascadeDelete: true
      })
      
      tableMap.set(childTableName, childTable)
    }
    
    const ct = tableMap.get(childTableName)!
    if (!ct.columns.find(c => c.name === childField)) {
      ct.columns.push(buildLaravelColumn(childField, 'text', '', 'wire-nested'))
    }
  }
}

function extractAlpineModels(content: string, fields: Array<{ name: string; type: string; raw: string; source: string }>) {
  let m: RegExpExecArray | null
  const alpineRegex = new RegExp(LARAVEL_REGEX.alpineModel.source, 'g')
  
  while ((m = alpineRegex.exec(content))) {
    const prop = m[1]
    
    // Skip if it's a form.field pattern
    if (prop.startsWith('form.')) {
      fields.push({
        raw: m[0],
        source: 'alpine',
        name: prop.replace('form.', ''),
        type: 'text'
      })
    }
  }
}

function extractVueModels(content: string, fields: Array<{ name: string; type: string; raw: string; source: string }>) {
  let m: RegExpExecArray | null
  const vueRegex = new RegExp(LARAVEL_REGEX.vueModel.source, 'g')
  
  while ((m = vueRegex.exec(content))) {
    fields.push({
      raw: m[0],
      source: 'vue-inertia',
      name: m[1],
      type: 'text'
    })
  }
}

function extractBladeComponents(
  content: string,
  fields: Array<{ name: string; type: string; raw: string; source: string }>,
  labels: Map<string, string>
) {
  let m: RegExpExecArray | null
  const compRegex = new RegExp(LARAVEL_REGEX.bladeComponent.source, 'g')
  
  while ((m = compRegex.exec(content))) {
    const componentType = m[1]
    const name = m[2]
    const type = m[3] || inferTypeFromComponent(componentType)
    const label = m[4]
    
    if (label) labels.set(name, label)
    
    fields.push({
      raw: m[0],
      source: `blade-component-${componentType}`,
      name,
      type
    })
  }
}

function extractFilamentFields(
  content: string,
  fields: Array<{ name: string; type: string; raw: string; source: string }>,
  fks: Map<string, string>
) {
  let m: RegExpExecArray | null
  
  // Standard fields
  const fieldRegex = new RegExp(LARAVEL_REGEX.filamentField.source, 'g')
  while ((m = fieldRegex.exec(content))) {
    const componentType = m[1]
    const name = m[2]
    
    fields.push({
      raw: m[0],
      source: `filament-${componentType}`,
      name,
      type: componentType === 'Select' ? 'select' : 
             componentType === 'Textarea' ? 'textarea' :
             componentType === 'Toggle' || componentType === 'Checkbox' ? 'checkbox' :
             componentType === 'DatePicker' ? 'date' :
             componentType === 'DateTimePicker' ? 'datetime' :
             componentType === 'FileUpload' ? 'file' : 'text'
    })
  }
  
  // Relationship fields
  const relRegex = new RegExp(LARAVEL_REGEX.filamentRelation.source, 'g')
  while ((m = relRegex.exec(content))) {
    const fieldName = m[1]
    const relationTable = m[2]
    
    fks.set(fieldName, relationTable)
  }
}

function extractErrorDirectives(content: string, fields: Array<{ name: string; type: string; raw: string; source: string }>) {
  let m: RegExpExecArray | null
  const errorRegex = new RegExp(LARAVEL_REGEX.errorDirective.source, 'g')
  
  while ((m = errorRegex.exec(content))) {
    const field = m[1]
    
    // Skip wildcard validations
    if (field.includes('.*.')) continue
    
    // Add if not already present
    if (!fields.find(f => f.name === field)) {
      fields.push({
        raw: '',
        source: 'error-directive',
        name: field,
        type: 'text'
      })
    }
  }
}

function extractInertiaForm(content: string, fields: Array<{ name: string; type: string; raw: string; source: string }>) {
  let m: RegExpExecArray | null
  const inertiaRegex = new RegExp(LARAVEL_REGEX.inertiaForm.source, 'g')
  
  while ((m = inertiaRegex.exec(content))) {
    const formBody = m[1]
    const fieldRegex = new RegExp(LARAVEL_REGEX.inertiaFields.source, 'g')
    let fm: RegExpExecArray | null
    
    while ((fm = fieldRegex.exec(formBody))) {
      const name = fm[1]
      const defaultVal = fm[2]
      
      fields.push({
        raw: fm[0],
        source: 'inertia-form',
        name,
        type: inferTypeFromDefault(defaultVal)
      })
    }
  }
}

function extractRouteInfo(content: string, table: LaravelTable, entity: string) {
  let m: RegExpExecArray | null
  const actionRegex = new RegExp(LARAVEL_REGEX.formAction.source, 'g')
  
  while ((m = actionRegex.exec(content))) {
    const route = m[1]
    const parts = route.split('.')
    
    if (parts.length >= 2) {
      const action = parts.pop()
      const routeEntity = singularize(capitalize(parts.pop() || ''))
      
      if (routeEntity && routeEntity !== entity) {
        // Update table name based on route
        table.name = pluralize(routeEntity.toLowerCase())
      }
      
      // Determine if this is create or edit
      if (action === 'store') {
        // Create form
      } else if (action === 'update') {
        // Edit form - look for hidden ID
      }
    }
  }
  
  // Method spoofing detection
  const methodMatch = content.match(LARAVEL_REGEX.methodSpoofing)
  if (methodMatch) {
    // PUT/PATCH = update, DELETE = delete
  }
}

function handleManyToMany(entity: string, fieldName: string, tableMap: Map<string, LaravelTable>) {
  // Extract related entity from field name
  const relatedName = fieldName
    .replace(/^selected_?/i, '')
    .replace(/_ids$/i, '')
    .replace(/s$/i, '')
  
  const related = singularize(capitalize(relatedName))
  
  // Create junction table name (alphabetical order)
  const junctionName = [entity.toLowerCase(), related.toLowerCase()].sort().join('_')
  
  if (!tableMap.has(junctionName)) {
    tableMap.set(junctionName, {
      name: junctionName,
      columns: [
        {
          name: `${entity.toLowerCase()}_id`,
          sqlType: 'INT',
          nullable: false,
          isPK: true,
          isFK: true,
          fkTable: pluralize(entity.toLowerCase()),
          isUnique: false,
          isComputed: false,
          isAudit: false,
          source: 'm2m',
          confidence: 85
        },
        {
          name: `${related.toLowerCase()}_id`,
          sqlType: 'INT',
          nullable: false,
          isPK: true,
          isFK: true,
          fkTable: pluralize(related.toLowerCase()),
          isUnique: false,
          isComputed: false,
          isAudit: false,
          source: 'm2m',
          confidence: 85
        }
      ],
      relationships: [{
        type: 'M:M',
        from: entity,
        to: related,
        fkColumn: '',
        cascadeDelete: true
      }],
      isJunction: false,
      isPivot: true,
      isPolymorphic: false,
      softDeletes: false,
      timestamps: false,
      traits: []
    })
  }
}

// ═══════════════════════════════════════════
// MODEL PARSER
// ═══════════════════════════════════════════

export function parseLaravelModel(
  content: string,
  fileName: string
): LaravelParseResult {
  
  const result: LaravelParseResult = {
    tables: [],
    warnings: [],
    confidence: 0,
    sources: ['model']
  }
  
  const entity = fileName.replace(/\.php$/i, '').split('/').pop() || 'Unknown'
  const tableMap = new Map<string, LaravelTable>()
  
  tableMap.set(entity, createEmptyTable(entity))
  const table = tableMap.get(entity)!
  
  // Table name
  const tableNameMatch = content.match(LARAVEL_REGEX.tableName)
  if (tableNameMatch) {
    table.name = tableNameMatch[1]
  } else {
    table.name = pluralize(toSnakeCase(entity))
  }
  
  // Soft deletes
  table.softDeletes = LARAVEL_REGEX.softDeletes.test(content)
  
  // Timestamps
  const tsMatch = content.match(LARAVEL_REGEX.timestamps)
  table.timestamps = tsMatch ? tsMatch[1] === 'true' : true
  
  // Traits
  const traitRegex = new RegExp(LARAVEL_REGEX.traits.source, 'g')
  let m: RegExpExecArray | null
  while ((m = traitRegex.exec(content))) {
    table.traits.push(m[1])
  }
  
  // $fillable
  const fillableMatch = content.match(LARAVEL_REGEX.fillable)
  if (fillableMatch) {
    const fieldRegex = /['"](\w+)['"]/g
    while ((m = fieldRegex.exec(fillableMatch[1]))) {
      table.columns.push(buildLaravelColumn(m[1], 'text', '', 'fillable'))
    }
  }
  
  // $casts
  const castsMatch = content.match(LARAVEL_REGEX.casts)
  if (castsMatch) {
    const castRegex = /['"](\w+)['"]\s*=>\s*['"]?([\w:]+)['"]?/g
    while ((m = castRegex.exec(castsMatch[1]))) {
      const fieldName = m[1]
      const cast = m[2]
      
      const existingCol = table.columns.find(c => c.name === fieldName)
      if (existingCol) {
        existingCol.sqlType = parseCast(cast)
        existingCol.source += '+cast'
        existingCol.confidence = 90
      } else {
        table.columns.push({
          name: fieldName,
          sqlType: parseCast(cast),
          nullable: true,
          isPK: false,
          isFK: false,
          isUnique: false,
          isComputed: false,
          isAudit: false,
          source: 'cast',
          confidence: 80
        })
      }
    }
  }
  
  // Relationships
  const relRegex = new RegExp(LARAVEL_REGEX.relationship.source, 'g')
  while ((m = relRegex.exec(content))) {
    const methodName = m[1]
    const relType = m[2]
    const args = m[3]
    
    const classMatch = args.match(/([\w\\]+)::class/)
    if (!classMatch) continue
    
    const relatedClass = classMatch[1].split('\\').pop()!
    const isSelfRef = ['self', 'static', '__CLASS__'].includes(relatedClass) || relatedClass === entity
    
    const fkMatch = args.match(/,\s*['"](\w+)['"]/)
    
    switch (relType) {
      case 'belongsTo': {
        const fkCol = fkMatch?.[1] || `${toSnakeCase(methodName)}_id`
        const fkTable = isSelfRef ? table.name : pluralize(toSnakeCase(relatedClass))
        
        if (!table.columns.find(c => c.name === fkCol)) {
          table.columns.push({
            name: fkCol,
            sqlType: 'INT',
            nullable: false,
            isPK: false,
            isFK: true,
            fkTable,
            fkColumn: 'id',
            isUnique: false,
            isComputed: false,
            isAudit: false,
            source: 'relationship',
            confidence: 95
          })
        }
        
        table.relationships.push({
          type: isSelfRef ? 'SELF_REF' : 'M:1',
          from: entity,
          to: isSelfRef ? entity : relatedClass,
          fkColumn: fkCol,
          cascadeDelete: false
        })
        break
      }
      
      case 'hasMany': {
        table.relationships.push({
          type: '1:M',
          from: entity,
          to: isSelfRef ? entity : relatedClass,
          fkColumn: fkMatch?.[1] || `${toSnakeCase(entity)}_id`,
          cascadeDelete: true
        })
        break
      }
      
      case 'hasOne': {
        table.relationships.push({
          type: '1:1',
          from: entity,
          to: relatedClass,
          fkColumn: fkMatch?.[1] || `${toSnakeCase(entity)}_id`,
          cascadeDelete: true
        })
        break
      }
      
      case 'belongsToMany': {
        const pivotMatch = args.match(/,\s*['"](\w+)['"]/)
        const pivotTable = pivotMatch?.[1] || [toSnakeCase(entity), toSnakeCase(relatedClass)].sort().join('_')
        
        if (!tableMap.has(pivotTable)) {
          tableMap.set(pivotTable, {
            name: pivotTable,
            columns: [
              {
                name: `${toSnakeCase(entity)}_id`,
                sqlType: 'INT',
                nullable: false,
                isPK: true,
                isFK: true,
                fkTable: pluralize(toSnakeCase(entity)),
                isUnique: false,
                isComputed: false,
                isAudit: false,
                source: 'pivot',
                confidence: 95
              },
              {
                name: `${toSnakeCase(relatedClass)}_id`,
                sqlType: 'INT',
                nullable: false,
                isPK: true,
                isFK: true,
                fkTable: pluralize(toSnakeCase(relatedClass)),
                isUnique: false,
                isComputed: false,
                isAudit: false,
                source: 'pivot',
                confidence: 95
              }
            ],
            relationships: [{
              type: 'M:M',
              from: entity,
              to: relatedClass,
              fkColumn: '',
              pivotTable,
              cascadeDelete: true
            }],
            isJunction: false,
            isPivot: true,
            isPolymorphic: false,
            softDeletes: false,
            timestamps: false,
            traits: []
          })
        }
        
        table.relationships.push({
          type: 'M:M',
          from: entity,
          to: relatedClass,
          fkColumn: '',
          pivotTable,
          cascadeDelete: true
        })
        break
      }
    }
  }
  
  // Ensure PK
  if (!table.columns.find(c => c.isPK)) {
    table.columns.unshift({
      name: 'id',
      sqlType: 'INT IDENTITY(1,1) PRIMARY KEY',
      nullable: false,
      isPK: true,
      isFK: false,
      isUnique: false,
      isComputed: false,
      isAudit: false,
      source: 'auto',
      confidence: 100
    })
  }
  
  // Add timestamps
  if (table.timestamps) {
    for (const ts of ['created_at', 'updated_at']) {
      if (!table.columns.find(c => c.name === ts)) {
        table.columns.push({
          name: ts,
          sqlType: 'DATETIME2',
          nullable: true,
          isPK: false,
          isFK: false,
          isUnique: false,
          isComputed: false,
          isAudit: true,
          source: 'timestamps',
          confidence: 100
        })
      }
    }
  }
  
  // Add soft deletes
  if (table.softDeletes) {
    if (!table.columns.find(c => c.name === 'deleted_at')) {
      table.columns.push({
        name: 'deleted_at',
        sqlType: 'DATETIME2',
        nullable: true,
        isPK: false,
        isFK: false,
        isUnique: false,
        isComputed: false,
        isAudit: true,
        source: 'soft-deletes',
        confidence: 100
      })
    }
  }
  
  result.tables = Array.from(tableMap.values())
  result.confidence = table.columns.length > 5 ? 90 : 70
  
  return result
}

// ═══════════════════════════════════════════
// MIGRATION PARSER
// ═══════════════════════════════════════════

export function parseLaravelMigration(
  content: string,
  fileName: string
): LaravelParseResult {
  
  const result: LaravelParseResult = {
    tables: [],
    warnings: [],
    confidence: 0,
    sources: ['migration']
  }
  
  const tableMap = new Map<string, LaravelTable>()
  
  const schemaRegex = new RegExp(LARAVEL_REGEX.schemaCreate.source, 'g')
  let sm: RegExpExecArray | null
  
  while ((sm = schemaRegex.exec(content))) {
    const tableName = sm[1]
    const body = sm[3]
    
    const entity = singularize(capitalize(tableName.replace(/_/g, ' ').replace(/ /g, '')))
    
    if (!tableMap.has(entity)) {
      tableMap.set(entity, createEmptyTable(entity))
    }
    const table = tableMap.get(entity)!
    table.name = tableName
    
    // Parse columns
    const colRegex = new RegExp(LARAVEL_REGEX.migrationColumn.source, 'g')
    let cm: RegExpExecArray | null
    
    while ((cm = colRegex.exec(body))) {
      const method = cm[1]
      const colName = cm[2]
      const params = cm[3]
      const chainStr = cm[4]
      
      // Special methods
      if (method === 'timestamps' || method === 'timestampsTz' || method === 'nullableTimestamps') {
        table.timestamps = true
        continue
      }
      if (method === 'softDeletes' || method === 'softDeletesTz') {
        table.softDeletes = true
        continue
      }
      if (method === 'rememberToken') {
        table.columns.push({
          name: 'remember_token',
          sqlType: 'VARCHAR(100)',
          nullable: true,
          isPK: false,
          isFK: false,
          isUnique: false,
          isComputed: false,
          isAudit: false,
          source: 'migration',
          confidence: 100
        })
        continue
      }
      if (method === 'morphs' || method === 'nullableMorphs' || method === 'uuidMorphs' || method === 'nullableUuidMorphs') {
        const morphName = colName || 'morphable'
        const isNullable = method.startsWith('nullable')
        const isUuid = method.includes('uuid')
        
        table.columns.push({
          name: `${morphName}_type`,
          sqlType: 'VARCHAR(255)',
          nullable: isNullable,
          isPK: false,
          isFK: false,
          isUnique: false,
          isComputed: false,
          isAudit: false,
          source: 'migration-morph',
          confidence: 100
        })
        table.columns.push({
          name: `${morphName}_id`,
          sqlType: isUuid ? 'UNIQUEIDENTIFIER' : 'INT',
          nullable: isNullable,
          isPK: false,
          isFK: false,
          isUnique: false,
          isComputed: false,
          isAudit: false,
          source: 'migration-morph',
          confidence: 100
        })
        table.isPolymorphic = true
        continue
      }
      
      const finalName = colName || 'id'
      const sqlType = mapMigrationToSQL(method, params)
      
      // Parse chain modifiers
      let nullable = false
      let unique = false
      let defaultVal: string | undefined
      let isFK = false
      let fkTable: string | undefined
      let cascadeDelete = false
      
      if (chainStr) {
        if (/->nullable\(\)/.test(chainStr)) nullable = true
        if (/->unique\(\)/.test(chainStr)) unique = true
        
        const defMatch = chainStr.match(/->default\(\s*(?:['"]([^"']*?)['"]|(\w+))\s*\)/)
        if (defMatch) defaultVal = defMatch[1] || defMatch[2]
        
        if (/->constrained/.test(chainStr)) {
          isFK = true
          const constMatch = chainStr.match(/->constrained\(\s*['"](\w+)['"]\s*\)/)
          fkTable = constMatch?.[1] || pluralize(finalName.replace(/_id$/, ''))
        }
        
        if (/->cascadeOnDelete/.test(chainStr)) cascadeDelete = true
      }
      
      const isPK = method === 'id' || method === 'uuid' || method === 'ulid' || (chainStr && /->primary/.test(chainStr))
      
      const existing = table.columns.find(c => c.name === finalName)
      if (existing) {
        existing.sqlType = sqlType
        existing.nullable = nullable
        existing.isUnique = unique
        existing.isPK = isPK
        existing.isFK = isFK
        if (fkTable) existing.fkTable = fkTable
        if (defaultVal) existing.defaultValue = defaultVal
        existing.source = 'migration'
        existing.confidence = 100
      } else {
        table.columns.push({
          name: finalName,
          sqlType,
          nullable,
          isPK,
          isFK,
          fkTable,
          isUnique: unique,
          isComputed: false,
          isAudit: /^(created|updated|deleted)_(at|by)$/.test(finalName),
          defaultValue: isPK ? 'IDENTITY(1,1)' : defaultVal,
          source: 'migration',
          confidence: 100
        })
        
        if (isFK && fkTable) {
          table.relationships.push({
            type: 'M:1',
            from: entity,
            to: singularize(capitalize(fkTable.replace(/_/g, ' ').replace(/ /g, ''))),
            fkColumn: finalName,
            cascadeDelete
          })
        }
      }
    }
    
    // Foreign keys
    const fkRegex = new RegExp(LARAVEL_REGEX.migrationFK.source, 'g')
    let fkm: RegExpExecArray | null
    while ((fkm = fkRegex.exec(body))) {
      const column = fkm[1]
      const refCol = fkm[2]
      const refTable = fkm[3]
      
      const col = table.columns.find(c => c.name === column)
      if (col) {
        col.isFK = true
        col.fkTable = refTable
        col.fkColumn = refCol
      }
    }
  }
  
  result.tables = Array.from(tableMap.values())
  result.confidence = 100 // Migration is the source of truth
  
  return result
}

// ═══════════════════════════════════════════
// VALIDATION PARSER
// ═══════════════════════════════════════════

export function parseLaravelValidation(
  content: string,
  fileName: string
): { entity: string; rules: Map<string, string> } {
  
  const entity = fileName
    .replace(/\.php$/i, '')
    .replace(/(Store|Update|Create|Edit|Save)?(Request|FormRequest)$/i, '')
    .split('/').pop() || 'Unknown'
  
  const rules = new Map<string, string>()
  
  const ruleBlockRegex = new RegExp(LARAVEL_REGEX.validationRules.source, 'g')
  let m: RegExpExecArray | null
  
  while ((m = ruleBlockRegex.exec(content))) {
    const rulesBlock = m[1]
    const fieldRegex = new RegExp(LARAVEL_REGEX.ruleField.source, 'g')
    let fm: RegExpExecArray | null
    
    while ((fm = fieldRegex.exec(rulesBlock))) {
      const field = fm[1]
      const fieldRules = fm[2] || fm[3]
      rules.set(field, fieldRules)
    }
  }
  
  return { entity, rules }
}

// ═══════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════

function createEmptyTable(entity: string): LaravelTable {
  return {
    name: pluralize(toSnakeCase(entity)),
    columns: [],
    relationships: [],
    isJunction: false,
    isPivot: false,
    isPolymorphic: false,
    softDeletes: false,
    timestamps: true,
    traits: []
  }
}

function buildLaravelColumn(
  name: string,
  type: string,
  raw: string,
  source: string
): LaravelColumn {
  
  const col: LaravelColumn = {
    name: toSnakeCase(name),
    sqlType: 'VARCHAR(255)',
    nullable: true,
    isPK: false,
    isFK: false,
    isUnique: false,
    isComputed: false,
    isAudit: false,
    source,
    confidence: 60
  }
  
  // PK detection
  if (name === 'id' || /^id$/i.test(name)) {
    col.isPK = true
    col.sqlType = 'INT IDENTITY(1,1) PRIMARY KEY'
    col.nullable = false
    col.confidence = 95
  }
  // FK detection
  else if (name.endsWith('_id') && (type === 'select' || type === 'hidden')) {
    col.isFK = true
    col.sqlType = 'INT'
    col.fkTable = pluralize(name.replace(/_id$/, ''))
    col.fkColumn = 'id'
    col.nullable = false
    col.confidence = 90
  }
  // Type-based inference
  else if (type === 'checkbox') {
    col.sqlType = 'BIT'
    col.defaultValue = '0'
  }
  else if (type === 'textarea') {
    col.sqlType = 'NVARCHAR(MAX)'
  }
  else if (type === 'password') {
    col.sqlType = 'VARCHAR(255)'
  }
  else if (type === 'email') {
    col.sqlType = 'VARCHAR(255)'
    col.isUnique = true
  }
  else if (type === 'date') {
    col.sqlType = 'DATE'
  }
  else if (type === 'datetime' || type === 'datetime-local') {
    col.sqlType = 'DATETIME2'
  }
  else if (type === 'time') {
    col.sqlType = 'TIME'
  }
  else if (type === 'number') {
    col.sqlType = 'DECIMAL(18,2)'
  }
  else if (type === 'tel') {
    col.sqlType = 'VARCHAR(20)'
  }
  else if (type === 'url') {
    col.sqlType = 'VARCHAR(500)'
  }
  else if (type === 'color') {
    col.sqlType = 'VARCHAR(7)'
  }
  else if (type === 'file') {
    col.sqlType = 'VARCHAR(500)'
  }
  else if (type === 'multiselect') {
    // M:M - handled separately
    col.sqlType = 'NVARCHAR(MAX)'
  }
  else {
    // Name-based inference
    col.sqlType = inferTypeFromName(name)
  }
  
  // Required from raw
  if (raw && LARAVEL_REGEX.attrRequired.test(raw)) {
    col.nullable = false
  }
  
  // Readonly
  if (raw && LARAVEL_REGEX.attrReadonly.test(raw)) {
    col.isComputed = true
  }
  
  // MaxLength
  if (raw) {
    const maxMatch = raw.match(LARAVEL_REGEX.attrMaxLength)
    if (maxMatch) {
      col.maxLength = parseInt(maxMatch[1])
      col.sqlType = `VARCHAR(${maxMatch[1]})`
    }
  }
  
  // Audit detection
  if (/^(created|modified|updated|deleted)_(at|by|on)$/i.test(name)) {
    col.isAudit = true
  }
  
  return col
}

function inferTypeFromName(name: string): string {
  for (const rule of NAME_TYPE_RULES) {
    if (rule.pattern.test(name)) {
      return rule.sqlType
    }
  }
  return 'VARCHAR(255)'
}

function inferTypeFromComponent(comp: string): string {
  const map: Record<string, string> = {
    'input': 'text',
    'text-input': 'text',
    'textarea': 'textarea',
    'select': 'select',
    'checkbox': 'checkbox',
    'radio': 'radio',
    'file-input': 'file',
    'date-picker': 'date',
    'form.input': 'text',
    'form.select': 'select',
    'form.textarea': 'textarea',
    'form.checkbox': 'checkbox',
  }
  return map[comp] || 'text'
}

function inferTypeFromDefault(val: string): string {
  if (val === "''") return 'text'
  if (val === 'null') return 'text'
  if (val === 'true' || val === 'false') return 'checkbox'
  if (val === '[]') return 'multiselect'
  if (val === '{}') return 'text'
  if (/^\d+$/.test(val)) return 'number'
  return 'text'
}

function mapMigrationToSQL(method: string, params?: string): string {
  let baseType = MIGRATION_TYPE_MAP[method] || 'VARCHAR(255)'
  
  // Handle parameterized types
  if (method === 'string' && params) {
    const len = parseInt(params)
    if (!isNaN(len)) {
      baseType = `VARCHAR(${len})`
    }
  }
  else if (method === 'decimal' && params) {
    const parts = params.split(',')
    if (parts.length >= 2) {
      baseType = `DECIMAL(${parts[0].trim()}, ${parts[1].trim()})`
    }
  }
  else if (method === 'enum' && params) {
    // Parse enum values
    const values = params.split(',').map(v => v.trim().replace(/['"]/g, ''))
    baseType = `VARCHAR(50) -- CHECK(${values.map(v => `'${v}'`).join(', ')})`
  }
  
  return baseType
}

function parseCast(cast: string): string {
  // Handle decimal:2 format
  const decMatch = cast.match(/^decimal:(\d+)$/)
  if (decMatch) {
    return `DECIMAL(18, ${decMatch[1]})`
  }
  
  if (cast.includes('Enum') || cast.includes('::class')) {
    return 'VARCHAR(50)'
  }
  
  return CAST_TYPE_MAP[cast] || 'VARCHAR(255)'
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/__+/g, '_')
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function singularize(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('zes')) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1)
  return word
}

function pluralize(word: string): string {
  if (word.endsWith('y') && !/[aeiou]y$/i.test(word)) return word.slice(0, -1) + 'ies'
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') || word.endsWith('ch') || word.endsWith('sh')) return word + 'es'
  return word + 's'
}

// ═══════════════════════════════════════════
// SQL GENERATION
// ═══════════════════════════════════════════

export function generateLaravelSQL(
  result: LaravelParseResult
): string {
  
  const lines: string[] = []
  const fkStatements: string[] = []
  
  lines.push(`-- ═══════════════════════════════════════`)
  lines.push(`-- AUTO-GENERATED FROM LARAVEL PROJECT`)
  lines.push(`-- Confidence: ${result.confidence}%`)
  lines.push(`-- Sources: ${result.sources.join(', ')}`)
  lines.push(`-- ═══════════════════════════════════════\n`)
  
  for (const table of result.tables) {
    lines.push(`-- ───────────────────────────────────`)
    lines.push(`-- TABLE: ${table.name}`)
    if (table.isPivot) lines.push(`-- TYPE: Pivot/Junction`)
    if (table.isPolymorphic) lines.push(`-- TYPE: Polymorphic`)
    if (table.softDeletes) lines.push(`-- SOFT DELETES: Yes`)
    lines.push(`-- ───────────────────────────────────`)
    
    const colDefs: string[] = []
    
    for (const col of table.columns) {
      let def = `  [${col.name}] ${col.sqlType}`
      
      if (col.isPK) {
        if (col.sqlType.includes('IDENTITY')) {
          // Already has identity
        } else {
          def += ' PRIMARY KEY'
        }
      } else {
        if (!col.nullable) def += ' NOT NULL'
        if (col.nullable && !col.isPK) def += ' NULL'
      }
      
      if (col.defaultValue) {
        def += ` DEFAULT ${col.defaultValue}`
      }
      
      if (col.isUnique && !col.isPK) {
        def += ' UNIQUE'
      }
      
      colDefs.push(def)
    }
    
    lines.push(`CREATE TABLE [${table.name}] (`)
    lines.push(colDefs.join(',\n'))
    lines.push(`);`)
    lines.push('')
    
    // FK constraints
    for (const col of table.columns) {
      if (col.isFK && col.fkTable) {
        const fkName = `FK_${table.name}_${col.name}`
        fkStatements.push(
          `ALTER TABLE [${table.name}] ADD CONSTRAINT [${fkName}] ` +
          `FOREIGN KEY ([${col.name}]) ` +
          `REFERENCES [${col.fkTable}](${col.fkColumn || 'id'});`
        )
      }
    }
  }
  
  if (fkStatements.length > 0) {
    lines.push(`-- ═══════════════════════════════════════`)
    lines.push(`-- FOREIGN KEY CONSTRAINTS`)
    lines.push(`-- ═══════════════════════════════════════\n`)
    for (const fk of fkStatements) {
      lines.push(fk)
    }
  }
  
  return lines.join('\n')
}
