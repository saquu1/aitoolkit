import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseLaravelBlade, parseLaravelModel, parseLaravelMigration, generateLaravelSQL } from '@/lib/laravel-parser'
import { fileClassifier } from '@/lib/parsers/file-classifier'
import { EnhancedJSParserEngine } from '@/lib/parsers/enhanced-js-parser'

// SQL Parser - extracts tables, procedures, views
function parseSQLContent(content: string) {
  const tables: any[] = []
  const procedures: any[] = []
  const views: any[] = []
  const functions: any[] = []

  // Extract CREATE TABLE statements
  const tableRegex = /CREATE\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([\s\S]*?)\)(?:\s*GO)?/gi
  let tableMatch
  while ((tableMatch = tableRegex.exec(content)) !== null) {
    const schemaName = tableMatch[1] || 'dbo'
    const tableName = tableMatch[2]
    const columnsStr = tableMatch[3]
    
    // Parse columns
    const columns: any[] = []
    const columnLines = columnsStr.split(',').map(line => line.trim()).filter(line => line)
    
    for (const line of columnLines) {
      // Skip constraints
      if (line.match(/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|INDEX|KEY)/i)) continue
      
      const colMatch = line.match(/^\[?(\w+)\]?\s+(\w+)(?:\(([^)]+)\))?(.*)$/i)
      if (colMatch) {
        const restOfLine = colMatch[4] || ''
        columns.push({
          name: colMatch[1],
          type: colMatch[2].toUpperCase(),
          size: colMatch[3] || null,
          nullable: !restOfLine.toUpperCase().includes('NOT NULL'),
          isPrimaryKey: restOfLine.toUpperCase().includes('PRIMARY KEY') || line.toUpperCase().includes('PRIMARY KEY'),
          isIdentity: restOfLine.toUpperCase().includes('IDENTITY'),
          defaultValue: restOfLine.match(/DEFAULT\s+([^\s,]+)/i)?.[1] || null
        })
      }
    }
    
    // Extract foreign keys from table
    const foreignKeys: any[] = []
    const fkRegex = /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([^)]+)\)/gi
    let fkMatch
    while ((fkMatch = fkRegex.exec(columnsStr)) !== null) {
      foreignKeys.push({
        column: fkMatch[1].replace(/[\[\]]/g, '').trim(),
        referencedSchema: fkMatch[2] || 'dbo',
        referencedTable: fkMatch[3],
        referencedColumn: fkMatch[4].replace(/[\[\]]/g, '').trim()
      })
    }
    
    tables.push({
      tableName,
      schemaName,
      columns,
      foreignKeys,
      sourceDDL: tableMatch[0].substring(0, 5000)
    })
  }

  // Extract CREATE PROCEDURE statements
  const procRegex = /CREATE\s+(?:OR\s+ALTER\s+)?PROC(?:EDURE)?\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*([\s\S]*?)\s*AS\s+([\s\S]*?)(?:GO|$)/gi
  let procMatch
  while ((procMatch = procRegex.exec(content)) !== null) {
    const schemaName = procMatch[1] || 'dbo'
    const procName = procMatch[2]
    const paramsStr = procMatch[3]
    const body = procMatch[4]
    
    // Parse parameters
    const parameters: any[] = []
    const paramRegex = /@(\w+)\s+(\w+)(?:\(([^)]+)\))?(?:\s*=\s*([^,\s]+))?/g
    let paramMatch
    while ((paramMatch = paramRegex.exec(paramsStr)) !== null) {
      parameters.push({
        name: paramMatch[1],
        type: paramMatch[2].toUpperCase(),
        size: paramMatch[3] || null,
        defaultValue: paramMatch[4] || null,
        isOutput: paramsStr.substring(paramMatch.index, paramMatch.index + 50).toUpperCase().includes('OUTPUT')
      })
    }
    
    // Determine action type based on body content
    const bodyUpper = body.toUpperCase()
    let actionType = 'read'
    const hasInsert = bodyUpper.includes('INSERT INTO')
    const hasUpdate = bodyUpper.includes('UPDATE ')
    const hasDelete = bodyUpper.includes('DELETE FROM')
    const hasSelect = bodyUpper.includes('SELECT ')
    
    if (hasInsert && !hasSelect) actionType = 'create'
    else if (hasUpdate && !hasSelect) actionType = 'update'
    else if (hasDelete && !hasSelect) actionType = 'delete'
    else if (hasInsert && hasSelect) actionType = 'create'
    else if (hasUpdate && hasSelect) actionType = 'update'
    else if (hasDelete && hasSelect) actionType = 'delete'
    
    // Extract tables referenced
    const tablesReferenced: string[] = []
    const tableRefRegex = /(?:FROM|JOIN|INTO|UPDATE)\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi
    let tableRefMatch
    while ((tableRefMatch = tableRefRegex.exec(body)) !== null) {
      const tableName = tableRefMatch[2]
      if (!tablesReferenced.includes(tableName) && !['DUAL', 'INSERTED', 'DELETED'].includes(tableName.toUpperCase())) {
        tablesReferenced.push(tableName)
      }
    }
    
    // Detect module name from SP name
    let moduleName = null
    const modulePatterns = [
      { pattern: /^sp_(\w+)_/i, group: 1 },
      { pattern: /^usp_(\w+)_/i, group: 1 },
      { pattern: /^(\w+)_/i, group: 1 }
    ]
    for (const mp of modulePatterns) {
      const match = procName.match(mp.pattern)
      if (match) {
        moduleName = match[mp.group]
        break
      }
    }
    
    procedures.push({
      procedureName: procName,
      schemaName,
      parameters,
      body: body.substring(0, 10000),
      actionType,
      tablesReferenced,
      moduleName,
      complexity: Math.min(100, Math.floor(body.length / 50))
    })
  }

  // Extract CREATE VIEW statements
  const viewRegex = /CREATE\s+VIEW\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*AS\s+([\s\S]*?)(?:GO|$)/gi
  let viewMatch
  while ((viewMatch = viewRegex.exec(content)) !== null) {
    const viewBody = viewMatch[3]
    
    // Extract tables from view
    const sourceTables: string[] = []
    const tableRefRegex = /(?:FROM|JOIN)\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi
    let tableRefMatch
    while ((tableRefMatch = tableRefRegex.exec(viewBody)) !== null) {
      if (!sourceTables.includes(tableRefMatch[2])) {
        sourceTables.push(tableRefMatch[2])
      }
    }
    
    views.push({
      viewName: viewMatch[2],
      schemaName: viewMatch[1] || 'dbo',
      body: viewBody.substring(0, 10000),
      sourceTables
    })
  }

  // Extract CREATE FUNCTION statements
  const funcRegex = /CREATE\s+FUNCTION\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([\s\S]*?)\)\s*RETURNS\s+(\w+)/gi
  let funcMatch
  while ((funcMatch = funcRegex.exec(content)) !== null) {
    functions.push({
      functionName: funcMatch[2],
      schemaName: funcMatch[1] || 'dbo',
      returnType: funcMatch[4]
    })
  }

  return { tables, procedures, views, functions }
}

// ============================================================================
// ADVANCED CSHTML PARSER - 5-LAYER DEEP EXTRACTION ENGINE
// ============================================================================

// Layer 2 & 4: Type Inference Rules
// IMPORTANT: More specific patterns must come BEFORE more general ones
const ADVANCED_TYPE_RULES: Array<{
  pattern: RegExp
  sqlType: string
  constraints?: string
  isFK?: boolean
  fkTable?: string
}> = [
  // Identity / Keys (must be first for exact match)
  { pattern: /^Id$/, sqlType: "INT", constraints: "IDENTITY(1,1) PRIMARY KEY" },
  
  // Strings with known lengths (specific names before general patterns)
  { pattern: /^(?:Code|Sku|Isbn)$/i, sqlType: "VARCHAR(50)", constraints: "UNIQUE" },
  { pattern: /^(?:Name|Title|Label)$/i, sqlType: "NVARCHAR(200)", constraints: "NOT NULL" },
  { pattern: /^(?:Description|Summary)$/i, sqlType: "NVARCHAR(1000)" },
  { pattern: /^(?:Notes?|Remarks?|Comments?)$/i, sqlType: "NVARCHAR(MAX)" },
  { pattern: /^(?:Body|Content|Html)$/i, sqlType: "NVARCHAR(MAX)" },
  
  // Contact (specific before general)
  { pattern: /^Email$/i, sqlType: "VARCHAR(255)", constraints: "UNIQUE" },
  { pattern: /^(?:Phone|Mobile|Fax|Tel|PhoneNumber)$/i, sqlType: "VARCHAR(20)" },
  { pattern: /^(?:Website|Url|Link|Uri|WebsiteUrl)$/i, sqlType: "VARCHAR(500)" },
  
  // Address
  { pattern: /^(?:Address|Street|Line[12])$/i, sqlType: "NVARCHAR(500)" },
  { pattern: /^(?:City|State|Province|Region)$/i, sqlType: "NVARCHAR(100)" },
  { pattern: /^(?:Zip|Postal|PostCode)(?:Code)?$/i, sqlType: "VARCHAR(20)" },
  { pattern: /^Country$/i, sqlType: "NVARCHAR(100)" },
  
  // Dates (specific patterns before general "Date" pattern)
  { pattern: /^(?:Dob|BirthDate|DateOfBirth)$/i, sqlType: "DATE" },
  { pattern: /^(?:Created|Modified|Updated|Deleted|Inserted)(?:By|On|At|Date|Time|Timestamp)$/i, sqlType: "DATETIME2" },
  { pattern: /^CreatedDate$/i, sqlType: "DATETIME2" },
  { pattern: /^ModifiedDate$/i, sqlType: "DATETIME2" },
  { pattern: /Timestamp$/i, sqlType: "DATETIME2", constraints: "DEFAULT SYSUTCDATETIME()" },
  { pattern: /Time(?!stamp)/i, sqlType: "TIME" },
  { pattern: /Year$/i, sqlType: "SMALLINT" },
  { pattern: /Month$/i, sqlType: "TINYINT" },
  { pattern: /Date$/i, sqlType: "DATETIME2" },  // General date pattern (after specific ones)
  
  // Numbers
  { pattern: /^(?:Age|Count|Quantity|Qty|Number|Num)$/i, sqlType: "INT" },
  { pattern: /^(?:Price|Amount|Cost|Rate|Fee|Salary|Budget|Total|Balance|Tax|Discount)$/i, sqlType: "DECIMAL(18,2)" },
  { pattern: /^(?:Percent|Percentage|Ratio)$/i, sqlType: "DECIMAL(5,2)" },
  { pattern: /^(?:Latitude|Lat)$/i, sqlType: "DECIMAL(9,6)" },
  { pattern: /^(?:Longitude|Lng|Lon)$/i, sqlType: "DECIMAL(9,6)" },
  { pattern: /^(?:Weight|Height|Width|Length|Size|Dimension)$/i, sqlType: "DECIMAL(10,2)" },
  
  // Boolean (specific pattern)
  { pattern: /^Is[A-Z]\w*$|^Has[A-Z]\w*$|^Can[A-Z]\w*$|^Should[A-Z]\w*$|^Allow[A-Z]\w*$|^Enable[A-Z]\w*$|^Show[A-Z]\w*$|^Include[A-Z]\w*/, sqlType: "BIT", constraints: "DEFAULT 0" },
  
  // Files
  { pattern: /^(?:Photo|Image|Avatar|Logo|Thumbnail|Icon|Banner)(?:Url|Path)?$/i, sqlType: "VARCHAR(500)" },
  { pattern: /^(?:File|Document|Attachment)(?:Name|Path|Url)?$/i, sqlType: "VARCHAR(500)" },
  { pattern: /^(?:MimeType|ContentType|FileType)$/i, sqlType: "VARCHAR(100)" },
  { pattern: /^(?:FileSize|Size)$/i, sqlType: "BIGINT" },
  
  // Auth
  { pattern: /^(?:Password|PasswordHash)$/i, sqlType: "VARCHAR(255)" },
  { pattern: /^(?:Salt|SecurityStamp)$/i, sqlType: "VARCHAR(255)" },
  { pattern: /^(?:Token|RefreshToken|ApiKey)$/i, sqlType: "VARCHAR(500)" },
  
  // Enums (stored as string or int)
  { pattern: /^(?:Status|State|Phase|Stage)$/i, sqlType: "VARCHAR(50)" },
  { pattern: /^(?:Type|Kind|Category|Level|Priority|Severity|Role|Gender)$/i, sqlType: "VARCHAR(50)" },
  
  // JSON / Complex
  { pattern: /^(?:Metadata|Settings|Config|Preferences|Options|Tags|Attributes)$/i, sqlType: "NVARCHAR(MAX)" },
  
  // Ordering
  { pattern: /^(?:Sort|Display)?Order$|^Sequence$|^Position$|^Rank$/i, sqlType: "INT", constraints: "DEFAULT 0" },
  
  // GUID
  { pattern: /^(?:Guid|Uuid|ExternalId|CorrelationId|TrackingId)$/i, sqlType: "UNIQUEIDENTIFIER", constraints: "DEFAULT NEWID()" },
  
  // IP / Technical
  { pattern: /^(?:IpAddress|Ip)$/i, sqlType: "VARCHAR(45)" },
  { pattern: /^(?:UserAgent|Browser)$/i, sqlType: "VARCHAR(500)" },
  { pattern: /^(?:Color|Colour)$/i, sqlType: "VARCHAR(7)" },
]

// Helper Type to SQL Type Mapping (excludes LabelFor and DisplayFor as they're not inputs)
const HELPER_TYPE_MAP: Record<string, { sqlType: string; inputType: string; isFK?: boolean }> = {
  "TextBoxFor": { sqlType: "VARCHAR(255)", inputType: "text" },
  "EditorFor": { sqlType: "INFER_FROM_NAME", inputType: "text" },
  "TextAreaFor": { sqlType: "NVARCHAR(MAX)", inputType: "textarea" },
  "PasswordFor": { sqlType: "VARCHAR(255)", inputType: "password" },
  "HiddenFor": { sqlType: "INT", inputType: "hidden" },
  "CheckBoxFor": { sqlType: "BIT", inputType: "checkbox" },
  "DropDownListFor": { sqlType: "INT", inputType: "select", isFK: true },
  "ListBoxFor": { sqlType: "M2M_RELATION", inputType: "multiselect" },
  "RadioButtonFor": { sqlType: "VARCHAR(50)", inputType: "radio" },
}

// Inference function
function inferSqlType(fieldName: string, helperType?: string): { sqlType: string; constraints?: string; isFK?: boolean; fkTable?: string } {
  // Check if it's an FK field (ends with Id but not just "Id")
  if (fieldName !== 'Id' && fieldName.endsWith('Id')) {
    const fkTable = fieldName.replace(/Id$/, '')
    return { sqlType: "INT", constraints: "NOT NULL", isFK: true, fkTable }
  }
  
  // IMPORTANT: Check name patterns FIRST for better type inference
  // Name-based inference takes precedence over helper type for semantic accuracy
  for (const rule of ADVANCED_TYPE_RULES) {
    if (rule.pattern.test(fieldName)) {
      return { sqlType: rule.sqlType, constraints: rule.constraints, isFK: rule.isFK, fkTable: rule.fkTable }
    }
  }
  
  // Then check helper type if no name pattern matched
  if (helperType && HELPER_TYPE_MAP[helperType]) {
    const mapping = HELPER_TYPE_MAP[helperType]
    return { sqlType: mapping.sqlType, isFK: mapping.isFK }
  }
  
  // Default
  return { sqlType: "NVARCHAR(255)" }
}

// Singularize helper
function singularize(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
  if (word.endsWith('ses')) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

// Main CSHTML Parser - 5-Layer Deep Extraction
function parseCSHTMLContent(content: string, fileName: string) {
  // Result structures
  const fields: any[] = []
  const scripts: string[] = []
  const ajaxEndpoints: string[] = []
  const eventHandlers: any[] = []
  const relationships: any[] = []
  const discoveredTables: any[] = []
  const constraints: any[] = []
  const validationRules: any[] = []
  const partialViews: string[] = []
  const cascadePairs: Array<{ parent: string; child: string }> = []
  
  // --- LAYER 1: RAW ELEMENT EXTRACTION ---
  
  // 1. Extract model declaration with improved pattern
  const modelRegex = /@model\s+(?:[\w.]+\.)*(\w+?)(?:ViewModel|VM|DTO|Model)?\s*$/m
  const modelMatch = content.match(modelRegex)
  const modelName = modelMatch ? modelMatch[1] : null
  
  // 2. Extract Razor HTML Helpers (TextBoxFor, DropDownListFor, etc.)
  // Pattern supports: m => m.Field, model => model.Field, x => x.Field
  // Note: LabelFor and DisplayFor are excluded as they don't represent actual inputs
  const razorHelperRegex = /@Html\.(TextBoxFor|EditorFor|TextAreaFor|PasswordFor|HiddenFor|CheckBoxFor|DropDownListFor|ListBoxFor|RadioButtonFor)\s*\(\s*(?:m|model|x)\s*=>\s*(?:m|model|x)\.([\w.]+)/gi
  let match
  while ((match = razorHelperRegex.exec(content)) !== null) {
    const helperType = match[1]
    const property = match[2]
    const fieldName = property.split('.').pop()!
    
    // Check for FK source in DropDownListFor (e.g., ViewBag.Countries)
    let fkSource: string | null = null
    if (helperType === 'DropDownListFor' || helperType === 'ListBoxFor') {
      const contextStart = Math.max(0, match.index - 50)
      const contextEnd = Math.min(content.length, match.index + match[0].length + 300)
      const context = content.substring(contextStart, contextEnd)
      
      // Extract ViewBag or SelectList source
      const sourceMatch = context.match(/ViewBag\.(\w+)|(?:SelectList|MultiSelectList)\s*\(\s*ViewBag\.(\w+)/i)
      if (sourceMatch) {
        fkSource = sourceMatch[1] || sourceMatch[2]
      }
    }
    
    // Infer SQL type
    const typeInfo = inferSqlType(fieldName, helperType)
    
    if (!fields.find(f => f.name === fieldName)) {
      fields.push({
        name: fieldName,
        type: helperType.replace('For', ''),
        inputType: HELPER_TYPE_MAP[helperType]?.inputType || 'text',
        sqlType: typeInfo.sqlType,
        constraints: typeInfo.constraints,
        isFK: typeInfo.isFK || helperType === 'DropDownListFor',
        fkTable: typeInfo.fkTable || (fkSource ? singularize(fkSource) : null),
        fkSource,
        isM2M: helperType === 'ListBoxFor',
        source: `razor-${helperType}`
      })
      
      // Create relationship for FK
      if (typeInfo.isFK || helperType === 'DropDownListFor') {
        const fkTable = typeInfo.fkTable || (fkSource ? singularize(fkSource) : fieldName.replace(/Id$/, ''))
        relationships.push({
          type: '1:M',
          from: fkTable,
          to: modelName || 'Unknown',
          fkColumn: fieldName,
          cascadeDelete: false
        })
      }
      
      // Many-to-Many from ListBoxFor
      if (helperType === 'ListBoxFor') {
        const relatedTable = singularize(fieldName.replace(/^(Selected|Chosen)?(\w+)Ids?$/i, '$2'))
        relationships.push({
          type: 'M:M',
          from: modelName || 'Unknown',
          to: relatedTable,
          junctionTable: `${modelName || 'Unknown'}${relatedTable}`,
          fkColumn: fieldName
        })
      }
    }
  }
  
  // 3. ASP.NET Core Tag Helpers (asp-for)
  const tagHelperRegex = /<(input|select|textarea)[^>]*\basp-for=["']([\w.]+)["'][^>]*\/?>/gi
  while ((match = tagHelperRegex.exec(content)) !== null) {
    const tag = match[1]
    const property = match[2]
    const fieldName = property.split('.').pop()!
    const element = match[0]
    
    // Check for asp-items (FK source)
    const itemsMatch = element.match(/asp-items=["']([^"']+)["']/i)
    const fkSource = itemsMatch ? itemsMatch[1].match(/ViewBag\.(\w+)|Model\.(\w+)/i)?.[1] || itemsMatch[1].match(/ViewBag\.(\w+)|Model\.(\w+)/i)?.[2] : null
    
    // Check for multiple attribute
    const isMultiple = /\bmultiple\b/i.test(element)
    
    // Infer type
    const typeInfo = inferSqlType(fieldName)
    let inputType = tag === 'select' ? (isMultiple ? 'multiselect' : 'select') : tag
    if (tag === 'input') {
      const typeAttrMatch = element.match(/type=["'](\w+)["']/i)
      inputType = typeAttrMatch ? typeAttrMatch[1] : 'text'
    }
    
    if (!fields.find(f => f.name === fieldName)) {
      fields.push({
        name: fieldName,
        type: tag === 'select' ? 'Select' : 'Input',
        inputType,
        sqlType: typeInfo.sqlType,
        constraints: typeInfo.constraints,
        isFK: tag === 'select' || typeInfo.isFK,
        fkTable: typeInfo.fkTable || (fkSource ? singularize(fkSource) : null),
        fkSource,
        isM2M: isMultiple,
        source: `tag-helper-${tag}`
      })
    }
  }
  
  // 4. Standard HTML input fields with name attribute
  const inputRegex = /<input[^>]*\b(?:name|id)=["']([\w.[\]]+)["'][^>]*>/gi
  while ((match = inputRegex.exec(content)) !== null) {
    const fieldName = match[1].split('.').pop()!.replace(/\[\d+\]/g, '')
    const element = match[0]
    
    if (!fields.find(f => f.name === fieldName)) {
      const typeMatch = element.match(/type=["'](\w+)["']/i)
      const typeInfo = inferSqlType(fieldName)
      
      fields.push({
        name: fieldName,
        type: 'Input',
        inputType: typeMatch ? typeMatch[1] : 'text',
        sqlType: typeInfo.sqlType,
        constraints: typeInfo.constraints,
        isFK: typeInfo.isFK,
        fkTable: typeInfo.fkTable,
        source: 'html-input'
      })
    }
  }
  
  // 5. Select elements
  const selectRegex = /<select[^>]*\b(?:name|id)=["']([\w.[\]]+)["'][^>]*>/gi
  while ((match = selectRegex.exec(content)) !== null) {
    const fieldName = match[1].split('.').pop()!.replace(/\[\d+\]/g, '')
    const element = match[0]
    const isMultiple = /\bmultiple\b/i.test(element)
    
    if (!fields.find(f => f.name === fieldName)) {
      const typeInfo = inferSqlType(fieldName)
      
      fields.push({
        name: fieldName,
        type: 'Select',
        inputType: isMultiple ? 'multiselect' : 'select',
        sqlType: typeInfo.sqlType,
        constraints: typeInfo.constraints,
        isFK: true,
        fkTable: typeInfo.fkTable || fieldName.replace(/Id$/, ''),
        isM2M: isMultiple,
        source: 'html-select'
      })
    }
  }
  
  // 6. Textarea elements
  const textareaRegex = /<textarea[^>]*\b(?:name|id)=["'](\w+)["'][^>]*>/gi
  while ((match = textareaRegex.exec(content)) !== null) {
    const fieldName = match[1]
    
    if (!fields.find(f => f.name === fieldName)) {
      fields.push({
        name: fieldName,
        type: 'TextArea',
        inputType: 'textarea',
        sqlType: 'NVARCHAR(MAX)',
        source: 'html-textarea'
      })
    }
  }
  
  // --- LAYER 2: CONSTRAINT EXTRACTION ---
  
  // 7. Extract validation attributes (data-val-*)
  const dataValRegex = /data-val-(required|length|range|regex|email|url|creditcard|equalto|remote)(?:-(max|min|pattern|other|url|additionalfields))?(?:=["']([^"']+)["'])?/gi
  while ((match = dataValRegex.exec(content)) !== null) {
    const rule = match[1]
    const param = match[2]
    const value = match[3]
    
    // Find the field this belongs to
    const contextStart = Math.max(0, match.index - 500)
    const contextEnd = Math.min(content.length, match.index + 100)
    const context = content.substring(contextStart, contextEnd)
    const fieldMatch = context.match(/(?:name|id|asp-for)=["']([\w.]+)["']/i)
    
    if (fieldMatch) {
      const fieldName = fieldMatch[1].split('.').pop()!
      validationRules.push({
        field: fieldName,
        rule,
        param,
        value,
        constraint: rule === 'required' ? 'NOT NULL' :
                    rule === 'length' && param === 'max' ? `VARCHAR(${value})` :
                    rule === 'range' ? `CHECK(field BETWEEN ${param === 'min' ? value : '?'} AND ${param === 'max' ? value : '?'})` :
                    rule === 'remote' ? 'UNIQUE' : null
      })
      
      // Apply to field
      const field = fields.find(f => f.name === fieldName)
      if (field) {
        if (rule === 'required') field.constraints = (field.constraints || '') + ' NOT NULL'
        if (rule === 'length' && param === 'max' && value) {
          field.sqlType = `VARCHAR(${value})`
          field.maxLength = parseInt(value)
        }
        if (rule === 'remote') {
          field.isUnique = true
          field.constraints = (field.constraints || '') + ' UNIQUE'
        }
      }
    }
  }
  
  // 8. HTML5 validation attributes
  const html5AttrRegex = /<(?:input|select|textarea)[^>]*>/gi
  while ((match = html5AttrRegex.exec(content)) !== null) {
    const element = match[0]
    const nameMatch = element.match(/(?:name|id|asp-for)=["']([\w.]+)["']/i)
    if (!nameMatch) continue
    
    const fieldName = nameMatch[1].split('.').pop()!
    const field = fields.find(f => f.name === fieldName)
    if (!field) continue
    
    // required
    if (/\brequired\b/i.test(element)) {
      field.constraints = (field.constraints || '') + ' NOT NULL'
    }
    
    // maxlength
    const maxLenMatch = element.match(/maxlength=["'](\d+)["']/i)
    if (maxLenMatch) {
      field.sqlType = `VARCHAR(${maxLenMatch[1]})`
      field.maxLength = parseInt(maxLenMatch[1])
    }
    
    // readonly/disabled
    if (/\b(?:readonly|disabled)\b/i.test(element)) {
      field.isComputed = true
    }
    
    // type="number" with min/max
    const minMatch = element.match(/min=["']([^"']+)["']/i)
    const maxMatch = element.match(/max=["']([^"']+)["']/i)
    if (minMatch || maxMatch) {
      constraints.push({
        field: fieldName,
        type: 'range',
        min: minMatch?.[1],
        max: maxMatch?.[1]
      })
    }
  }
  
  // --- LAYER 3: RELATIONSHIP DETECTION ---
  
  // 9. Collection indexer detection (child tables) - e.g., OrderItems[0].ProductId
  const collectionRegex = /(?:name|asp-for)=["'](\w+)\[(\d+)\]\.(\w+)["']/gi
  const childTables = new Map<string, Set<string>>()
  while ((match = collectionRegex.exec(content)) !== null) {
    const parentProp = match[1]
    const childProp = match[3]
    
    if (!childTables.has(parentProp)) {
      childTables.set(parentProp, new Set())
    }
    childTables.get(parentProp)!.add(childProp)
  }
  
  // Create discovered child tables
  childTables.forEach((columns, parentProp) => {
    const childTableName = singularize(parentProp)
    discoveredTables.push({
      tableName: childTableName,
      parentTable: modelName || 'Unknown',
      relationship: '1:M',
      columns: ['Id', `${modelName}Id`, ...Array.from(columns)],
      fkColumn: `${modelName}Id`
    })
    
    relationships.push({
      type: '1:M',
      from: modelName || 'Unknown',
      to: childTableName,
      fkColumn: `${modelName}Id`,
      cascadeDelete: true
    })
  })
  
  // 10. Nested property detection (1:1 relationships) - e.g., Address.City
  const nestedPropRegex = /(?:asp-for|name)=["'](\w+)\.(\w+)["']/gi
  const nestedObjects = new Map<string, Set<string>>()
  while ((match = nestedPropRegex.exec(content)) !== null) {
    const parent = match[1]
    const child = match[2]
    
    // Skip if it's a collection indexer
    if (parent.includes('[')) continue
    
    if (!nestedObjects.has(parent)) {
      nestedObjects.set(parent, new Set())
    }
    nestedObjects.get(parent)!.add(child)
  }
  
  // Create discovered 1:1 related tables
  nestedObjects.forEach((columns, parent) => {
    const isOneToOne = /^(Address|Profile|Setting|Detail|Info|Config|Preference)/i.test(parent)
    if (isOneToOne) {
      discoveredTables.push({
        tableName: parent,
        parentTable: modelName || 'Unknown',
        relationship: '1:1',
        columns: ['Id', `${modelName}Id`, ...Array.from(columns)],
        fkColumn: `${modelName}Id`
      })
    }
  })
  
  // 11. Self-referencing FK detection (hierarchy)
  const selfRefRegex = /(?:name|id|asp-for)=["'](Parent(?:Id|_Id)|Manager(?:Id|_Id)|ReportsTo(?:Id|_Id)|Superior(?:Id|_Id))["']/gi
  while ((match = selfRefRegex.exec(content)) !== null) {
    const fieldName = match[1]
    relationships.push({
      type: 'SELF_REF',
      from: modelName || 'Unknown',
      to: modelName || 'Unknown',
      fkColumn: fieldName,
      isHierarchy: true
    })
  }
  
  // 12. Cascade dropdown detection (Country -> Province -> City)
  const cascadeRegex = /\$\(["']#(\w+)["']\)\s*\.(?:change|on\s*\(\s*["']change["'])[\s\S]{0,800}?\$\s*\.\s*(?:ajax|get|getJSON|post)\s*\([\s\S]{0,500}?["']#(\w+)["']/gi
  while ((match = cascadeRegex.exec(content)) !== null) {
    cascadePairs.push({ parent: match[1], child: match[2] })
  }
  
  // --- LAYER 4: INTELLIGENT INFERENCE ---
  
  // 13. Audit column detection
  const auditFields = fields.filter(f => 
    /^(?:Created|Modified|Updated|Deleted|Inserted)(?:By|On|At|Date|Time|Timestamp)?$|^(?:Create|Update|Modify|Insert)(?:d_?(?:By|Date|At))$|^Is(?:Active|Deleted|Enabled|Archived|Published)$/i.test(f.name)
  )
  auditFields.forEach(f => { f.isAudit = true })
  
  // 14. Soft delete detection
  const softDeleteFields = fields.filter(f =>
    /^Is(?:Deleted|Active|Archived|Enabled|Visible|Hidden|Disabled|Published|Draft)$/i.test(f.name)
  )
  softDeleteFields.forEach(f => { f.isSoftDelete = true })
  
  // --- LAYER 5: SCRIPT & STRUCTURE ANALYSIS ---
  
  // Extract scripts and event handlers
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi
  let scriptMatch
  while ((scriptMatch = scriptRegex.exec(content)) !== null) {
    const scriptContent = scriptMatch[1]
    scripts.push(scriptContent.substring(0, 2000))
    
    // AJAX endpoints
    const ajaxRegex = /(?:url|href|action|src)\s*[:=]\s*["'`]([^"'`]+)["'`]/gi
    let ajaxMatch
    while ((ajaxMatch = ajaxRegex.exec(scriptContent)) !== null) {
      if (!ajaxEndpoints.includes(ajaxMatch[1])) {
        ajaxEndpoints.push(ajaxMatch[1])
      }
    }
    
    // $.ajax patterns
    const jqAjaxRegex = /\$\.(?:ajax|get|post|getJSON)\s*\(\s*(?:\{[\s\S]*?url\s*:\s*)?["'`]([^"'`]+)["'`]/gi
    while ((ajaxMatch = jqAjaxRegex.exec(scriptContent)) !== null) {
      if (!ajaxEndpoints.includes(ajaxMatch[1])) {
        ajaxEndpoints.push(ajaxMatch[1])
      }
    }
    
    // Event handlers
    const eventRegex = /\$\(['"`]([^'"`]+)['"`]\)\.(click|change|submit|keydown|keyup|focus|blur|hover)\s*\(/gi
    let eventMatch
    while ((eventMatch = eventRegex.exec(scriptContent)) !== null) {
      eventHandlers.push({
        selector: eventMatch[1],
        event: eventMatch[2]
      })
    }
    
    // .on event handlers
    const onEventRegex = /\.on\s*\(\s*['"`](\w+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/gi
    let onEventMatch
    while ((onEventMatch = onEventRegex.exec(scriptContent)) !== null) {
      eventHandlers.push({
        selector: onEventMatch[2],
        event: onEventMatch[1]
      })
    }
    
    // Dynamic row detection (child table indicator)
    const dynamicRowRegex = /(?:addRow|appendRow|cloneRow|addLine|newItem|addDetail)\s*\(/gi
    if (dynamicRowRegex.test(scriptContent)) {
      // This form has dynamic rows - likely a parent-child form
    }
  }
  
  // Partial view detection
  const partialRegex = /@(?:await\s+)?Html\.(?:Partial|RenderPartial)(?:Async)?\s*\(\s*["']([^"']+)["']/gi
  while ((match = partialRegex.exec(content)) !== null) {
    partialViews.push(match[1])
  }
  
  // Partial tag helper
  const partialTagRegex = /<partial\s+name=["']([^"']+)["']/gi
  while ((match = partialTagRegex.exec(content)) !== null) {
    partialViews.push(match[1])
  }
  
  // Determine view type
  let viewType = 'unknown'
  if (content.includes('Html.BeginForm') || content.includes('<form')) viewType = 'form'
  else if (content.includes('foreach') && (content.includes('table') || content.includes('ActionLink'))) viewType = 'list'
  else if (fields.length > 3) viewType = 'form'
  else if (content.includes('<table') && content.includes('foreach')) viewType = 'list'
  else if (content.includes('Details') || content.includes('DisplayFor')) viewType = 'detail'
  
  // Extract title
  const titleMatch = content.match(/ViewBag\.Title\s*=\s*"([^"]+)"/)
  const title = titleMatch ? titleMatch[1] : fileName.replace('.cshtml', '')
  
  // Extract layout
  const layoutMatch = content.match(/Layout\s*=\s*"([^"]+)"/)
  const layout = layoutMatch ? layoutMatch[1] : null
  
  // Extract sections
  const sections: any[] = []
  const sectionRegex = /@section\s+(\w+)\s*\{([\s\S]*?)\}/gi
  let sectionMatch
  while ((sectionMatch = sectionRegex.exec(content)) !== null) {
    sections.push({
      name: sectionMatch[1],
      content: sectionMatch[2].substring(0, 500)
    })
  }
  
  // Extract permissions (common patterns)
  const permissions: string[] = []
  const permRegex = /@(?:if|Html\.Raw)\s*\(\s*(?:User\.IsInRole|Roles\.IsUserInRole|User\.Identity\.IsAuthenticated)\s*\(?['"](\w+)['"]\)?/gi
  let permMatch
  while ((permMatch = permRegex.exec(content)) !== null) {
    if (!permissions.includes(permMatch[1])) {
      permissions.push(permMatch[1])
    }
  }
  
  return {
    viewName: fileName,
    viewType,
    modelName,
    title,
    layout,
    fields,
    scripts,
    ajaxEndpoints,
    eventHandlers,
    sections,
    permissions,
    relationships,
    discoveredTables,
    constraints,
    validationRules,
    partialViews,
    cascadePairs,
    summary: {
      totalFields: fields.length,
      totalFKs: fields.filter(f => f.isFK).length,
      totalM2M: fields.filter(f => f.isM2M).length,
      totalRelationships: relationships.length,
      totalChildTables: discoveredTables.length
    }
  }
}

// Main parser router
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, files, projectId, file } = body

    if (action === 'classify-files' && files) {
      return await classifyFiles(files)
    } else if (action === 'parse-all' && files) {
      return await parseAllFiles(files, projectId)
    } else if (action === 'parse-single' && file) {
      return await parseSingleFile(file, projectId)
    } else if (action === 'reparse-project' && projectId) {
      return await reparseProject(projectId)
    }

    return NextResponse.json({ error: 'Unknown action or missing parameters' }, { status: 400 })
  } catch (error: any) {
    console.error('Parser error:', error)
    return NextResponse.json({ error: error.message || 'Parse failed' }, { status: 500 })
  }
}

async function classifyFiles(files: Array<{ name: string; content: string; path?: string }>) {
  try {
    const classifications = fileClassifier.classifyBatch(
      files.map(f => ({ name: f.name, content: f.content }))
    )
    return NextResponse.json({ success: true, classifications })
  } catch (error: any) {
    console.error('Classification error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Classification failed' }, { status: 500 })
  }
}

async function parseAllFiles(files: Array<{ name: string; content: string; path?: string }>, projectId?: string) {
  const results = {
    sql: { tables: [] as any[], procedures: [] as any[], views: [] as any[], functions: [] as any[], results: [] as any[], summary: { totalTables: 0, totalProcedures: 0, totalViews: 0 } },
    cshtml: { results: [] as any[], summary: { totalFiles: 0, totalFields: 0, totalTables: 0, totalEventHandlers: 0 } },
    javascript: { results: [] as any[], summary: { totalAjaxCalls: 0, totalEventHandlers: 0, totalEndpoints: 0 } },
    laravel: { results: [] as any[], tables: [] as any[], summary: { totalFiles: 0, totalTables: 0, totalFields: 0 } },
    summary: { totalFiles: files.length, totalTables: 0, totalProcedures: 0, totalEventHandlers: 0 }
  }

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const fileName = file.name.toLowerCase()
    
    if (ext === 'sql') {
      const parsed = parseSQLContent(file.content)
      results.sql.tables.push(...parsed.tables)
      results.sql.procedures.push(...parsed.procedures)
      results.sql.views.push(...parsed.views)
      results.sql.functions.push(...parsed.functions)
    } else if (ext === 'cshtml' || ext === 'vbhtml') {
      const parsed = parseCSHTMLContent(file.content, file.name)
      results.cshtml.results.push(parsed)
    } else if (fileName.endsWith('.blade.php')) {
      // Laravel Blade template
      const parsed = parseLaravelBlade(file.content, file.name)
      results.laravel.results.push(parsed)
      results.laravel.tables.push(...parsed.tables)
    } else if (ext === 'php' && (fileName.includes('model') || fileName.includes('entity'))) {
      // Laravel Model
      const parsed = parseLaravelModel(file.content, file.name)
      results.laravel.results.push(parsed)
      results.laravel.tables.push(...parsed.tables)
    } else if (ext === 'php' && fileName.includes('migration')) {
      // Laravel Migration
      const parsed = parseLaravelMigration(file.content, file.name)
      results.laravel.results.push(parsed)
      results.laravel.tables.push(...parsed.tables)
    } else if (ext === 'js' || ext === 'jsx') {
      // JavaScript parsing
      const jsParser = new EnhancedJSParserEngine(file.name)
      const jsResult = jsParser.analyze(file.content, file.name)
      results.javascript.results.push({
        fileName: file.name,
        analysis: {
          ajaxCalls: jsResult.ajaxCalls,
          eventHandlers: jsResult.eventHandlers,
          complexity: jsResult.complexity,
          jqueryPlugins: jsResult.jqueryPlugins,
          dependencies: jsResult.dependencies,
          discoveredEndpoints: jsResult.discoveredEndpoints,
          summary: jsResult.summary
        }
      })
    } else if (ext === 'ts' || ext === 'tsx') {
      // TypeScript files can also contain JS patterns (AJAX, events)
      const jsParser = new EnhancedJSParserEngine(file.name)
      const jsResult = jsParser.analyze(file.content, file.name)
      results.javascript.results.push({
        fileName: file.name,
        analysis: {
          ajaxCalls: jsResult.ajaxCalls,
          eventHandlers: jsResult.eventHandlers,
          complexity: jsResult.complexity,
          jqueryPlugins: jsResult.jqueryPlugins,
          dependencies: jsResult.dependencies,
          discoveredEndpoints: jsResult.discoveredEndpoints,
          summary: jsResult.summary
        }
      })
    }
  }

  // Build sql.results array (combined procedures, views, functions for consumer compatibility)
  results.sql.results = [
    ...results.sql.procedures.map(p => ({ ...p, type: 'procedure' })),
    ...results.sql.views.map(v => ({ ...v, type: 'view' })),
    ...results.sql.functions.map(f => ({ ...f, type: 'function' }))
  ]

  // Calculate summaries
  results.sql.summary = {
    totalTables: results.sql.tables.length,
    totalProcedures: results.sql.procedures.length,
    totalViews: results.sql.views.length
  }
  
  results.cshtml.summary = {
    totalFiles: results.cshtml.results.length,
    totalFields: results.cshtml.results.reduce((sum, r) => sum + r.fields.length, 0),
    totalTables: results.cshtml.results.filter(r => r.modelName).length,
    totalEventHandlers: results.cshtml.results.reduce((sum, r) => sum + r.eventHandlers.length, 0)
  }
  
  results.laravel.summary = {
    totalFiles: results.laravel.results.length,
    totalTables: results.laravel.tables.length,
    totalFields: results.laravel.tables.reduce((sum, t) => sum + t.columns.length, 0)
  }
  
  // Calculate JavaScript summary
  const jsResults = results.javascript.results
  let totalAjaxCalls = 0
  let totalJSEventHandlers = 0
  let totalEndpoints = 0
  for (const js of jsResults) {
    const analysis = js.analysis || {}
    totalAjaxCalls += (analysis.ajaxCalls || []).length
    totalJSEventHandlers += (analysis.eventHandlers || []).length
    totalEndpoints += (analysis.discoveredEndpoints || []).length
  }
  results.javascript.summary = {
    totalAjaxCalls,
    totalEventHandlers: totalJSEventHandlers,
    totalEndpoints
  }

  results.summary = {
    totalFiles: files.length,
    totalTables: results.sql.summary.totalTables + results.cshtml.summary.totalTables + results.laravel.summary.totalTables,
    totalProcedures: results.sql.summary.totalProcedures,
    totalEventHandlers: results.cshtml.summary.totalEventHandlers + totalJSEventHandlers
  }

  // Store to database if projectId is provided
  if (projectId) {
    try {
      // Verify project exists
      const project = await db.toolkitProject.findUnique({
        where: { id: projectId }
      })
      
      if (project) {
        // Store tables
        for (const table of results.sql.tables) {
          await db.toolkitTable.upsert({
            where: {
              projectId_tableName: { projectId, tableName: table.tableName }
            },
            create: {
              projectId,
              tableName: table.tableName,
              schemaName: table.schemaName,
              columns: JSON.stringify(table.columns),
              foreignKeys: JSON.stringify(table.foreignKeys || []),
              indexes: '[]',
              constraints: '[]',
              sourceDDL: table.sourceDDL,
              status: 'complete'
            },
            update: {
              columns: JSON.stringify(table.columns),
              foreignKeys: JSON.stringify(table.foreignKeys || []),
              sourceDDL: table.sourceDDL,
              status: 'complete'
            }
          })
        }
        
        // Store procedures
        for (const proc of results.sql.procedures) {
          await db.storedProcedureCache.upsert({
            where: {
              projectId_procedureName: { projectId, procedureName: proc.procedureName }
            },
            create: {
              projectId,
              procedureName: proc.procedureName,
              schemaName: proc.schemaName,
              actionType: proc.actionType,
              moduleName: proc.moduleName,
              moduleConfidence: proc.moduleName ? 80 : 0,
              tablesReferenced: JSON.stringify(proc.tablesReferenced),
              implicitJoins: '[]',
              discoveredTables: '[]',
              businessRules: '[]',
              writeOperations: '[]',
              readOperations: '[]',
              parameters: JSON.stringify(proc.parameters),
              apiInputSchema: '{}',
              complexity: proc.complexity,
              riskLevel: proc.complexity > 70 ? 'high' : proc.complexity > 40 ? 'medium' : 'low',
              body: proc.body
            },
            update: {
              actionType: proc.actionType,
              moduleName: proc.moduleName,
              moduleConfidence: proc.moduleName ? 80 : 0,
              tablesReferenced: JSON.stringify(proc.tablesReferenced),
              parameters: JSON.stringify(proc.parameters),
              complexity: proc.complexity,
              riskLevel: proc.complexity > 70 ? 'high' : proc.complexity > 40 ? 'medium' : 'low',
              body: proc.body
            }
          })
        }
        
        // Store CSHTML analysis with enhanced fields
        for (const cs of results.cshtml.results) {
          await db.cSHTMLAnalysisCache.upsert({
            where: {
              projectId_viewName: { projectId, viewName: cs.viewName }
            },
            create: {
              project: { connect: { id: projectId } },
              viewName: cs.viewName,
              filePath: cs.layout,
              viewType: cs.viewType,
              modelName: cs.modelName,
              linkedTable: cs.modelName ? cs.modelName.replace(/ViewModel|Model$/i, '') : null,
              title: cs.title,
              layout: cs.layout ? JSON.stringify({ name: cs.layout }) : null,
              fields: JSON.stringify(cs.fields),
              listConfig: cs.summary ? JSON.stringify({
                totalFields: cs.summary.totalFields,
                totalFKs: cs.summary.totalFKs,
                totalM2M: cs.summary.totalM2M
              }) : null,
              sections: JSON.stringify(cs.sections),
              permissions: JSON.stringify(cs.permissions),
              scripts: JSON.stringify(cs.scripts),
              styles: '[]',
              rawContent: ''
            },
            update: {
              viewType: cs.viewType,
              modelName: cs.modelName,
              linkedTable: cs.modelName ? cs.modelName.replace(/ViewModel|Model$/i, '') : null,
              title: cs.title,
              fields: JSON.stringify(cs.fields),
              listConfig: cs.summary ? JSON.stringify({
                totalFields: cs.summary.totalFields,
                totalFKs: cs.summary.totalFKs,
                totalM2M: cs.summary.totalM2M
              }) : null,
              sections: JSON.stringify(cs.sections),
              permissions: JSON.stringify(cs.permissions),
              scripts: JSON.stringify(cs.scripts)
            }
          })
          
          // Create discovered table from model
          if (cs.modelName) {
            const tableName = cs.modelName.replace(/ViewModel|Model$/i, '')
            
            // Build column info with SQL types
            const columnInfo = cs.fields.map(f => ({
              name: f.name,
              sqlType: f.sqlType || 'NVARCHAR(255)',
              isFK: f.isFK || false,
              fkTable: f.fkTable || null,
              constraints: f.constraints || null
            }))
            
            await db.discoveredTableCache.upsert({
              where: {
                projectId_tableName: { projectId, tableName }
              },
              create: {
                project: { connect: { id: projectId } },
                tableName,
                discoveredInSP: `CSHTML: ${cs.viewName}`,
                accessType: 'inferred',
                columns: JSON.stringify(columnInfo),
                suggestedModule: tableName,
                priority: 'medium',
                isResolved: false
              },
              update: {
                discoveredInSP: `CSHTML: ${cs.viewName}`,
                columns: JSON.stringify(columnInfo)
              }
            })
          }
          
          // Store discovered child tables from CSHTML (from collection indexers)
          if (cs.discoveredTables && cs.discoveredTables.length > 0) {
            for (const childTable of cs.discoveredTables) {
              await db.discoveredTableCache.upsert({
                where: {
                  projectId_tableName: { projectId, tableName: childTable.tableName }
                },
                create: {
                  project: { connect: { id: projectId } },
                  tableName: childTable.tableName,
                  discoveredInSP: `CSHTML: ${cs.viewName} (child table)`,
                  accessType: 'inferred',
                  columns: JSON.stringify(childTable.columns.map((col: string) => ({ name: col }))),
                  suggestedModule: childTable.parentTable,
                  priority: 'high',
                  isResolved: false
                },
                update: {
                  columns: JSON.stringify(childTable.columns.map((col: string) => ({ name: col })))
                }
              })
            }
          }
        }
      }
    } catch (dbError) {
      console.error('Database storage error:', dbError)
      // Continue without failing - return results anyway
    }
  }

  return NextResponse.json({ success: true, ...results })
}

async function parseSingleFile(file: { name: string; content: string; path?: string }, projectId?: string) {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const fileName = file.name.toLowerCase()
  
  if (ext === 'sql') {
    const result = parseSQLContent(file.content)
    return NextResponse.json({ success: true, type: 'sql', ...result })
  } else if (ext === 'cshtml' || ext === 'vbhtml') {
    const result = parseCSHTMLContent(file.content, file.name)
    return NextResponse.json({ success: true, type: 'cshtml', ...result })
  } else if (fileName.endsWith('.blade.php')) {
    const result = parseLaravelBlade(file.content, file.name)
    return NextResponse.json({ success: true, type: 'laravel-blade', ...result })
  } else if (ext === 'php' && (fileName.includes('model') || fileName.includes('entity'))) {
    const result = parseLaravelModel(file.content, file.name)
    return NextResponse.json({ success: true, type: 'laravel-model', ...result })
  } else if (ext === 'php' && fileName.includes('migration')) {
    const result = parseLaravelMigration(file.content, file.name)
    return NextResponse.json({ success: true, type: 'laravel-migration', ...result })
  }
  
  return NextResponse.json({ success: false, error: 'Unsupported file type' })
}

async function reparseProject(projectId: string) {
  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  const files = await db.toolkitFile.findMany({
    where: { projectId, parseStatus: 'pending' }
  })

  if (files.length === 0) {
    return NextResponse.json({ success: true, message: 'No pending files to parse' })
  }

  // Process each file individually to get accurate counts
  let totalTables = 0
  let totalProcedures = 0
  const processedFiles: string[] = []

  for (const file of files) {
    const ext = file.fileName.split('.').pop()?.toLowerCase() || ''
    
    // Mark as parsing
    await db.toolkitFile.update({
      where: { id: file.id },
      data: { parseStatus: 'parsing' }
    })

    let tablesFound = 0
    let proceduresFound = 0

    // Parse based on file type
    if (ext === 'sql') {
      const parsed = parseSQLContent(file.content || '')
      tablesFound = parsed.tables.length
      proceduresFound = parsed.procedures.length
    } else if (ext === 'cshtml' || ext === 'vbhtml') {
      const parsed = parseCSHTMLContent(file.content || '', file.fileName)
      tablesFound = parsed.discoveredTables?.length || (parsed.modelName ? 1 : 0)
    }

    // Update file with correct counts
    await db.toolkitFile.update({
      where: { id: file.id },
      data: { 
        parseStatus: 'parsed',
        parsedAt: new Date(),
        tablesFound,
        proceduresFound
      }
    })

    totalTables += tablesFound
    totalProcedures += proceduresFound
    processedFiles.push(file.fileName)
  }

  // Now parse and store the actual tables to ToolkitTable
  const filesToParse = files.map(f => ({
    name: f.fileName,
    content: f.content || '',
    path: f.filePath || f.fileName
  }))

  const result: any = await parseAllFiles(filesToParse, projectId)

  return NextResponse.json({ 
    success: true, 
    filesProcessed: files.length,
    processedFiles,
    summary: {
      totalTables,
      totalProcedures,
      ...result.summary
    },
    ...result
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  
  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  // Get parsing status
  const files = await db.toolkitFile.findMany({
    where: { projectId },
    select: {
      fileName: true,
      parseStatus: true,
      tablesFound: true,
      proceduresFound: true,
      parsedAt: true
    }
  })

  const stats = {
    total: files.length,
    parsed: files.filter(f => f.parseStatus === 'parsed').length,
    pending: files.filter(f => f.parseStatus === 'pending').length,
    error: files.filter(f => f.parseStatus === 'error').length,
    totalTables: files.reduce((sum, f) => sum + (f.tablesFound || 0), 0),
    totalProcedures: files.reduce((sum, f) => sum + (f.proceduresFound || 0), 0)
  }

  return NextResponse.json({ success: true, stats, files })
}
