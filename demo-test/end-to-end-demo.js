/**
 * COMPLETE END-TO-END DEMO
 * =======================
 * Demonstrates: Upload → Parse → Intelligence → Generate → Assemble → Export → ZIP
 * 
 * Input: Organizations.sql + OrganizationCreate.cshtml
 * Output: Complete Next.js project ZIP
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

// ============================================
// STEP 1: SQL PARSER
// ============================================

function parseSQL(ddl) {
  const result = {
    tables: [],
    views: [],
    procedures: []
  };

  // Extract CREATE TABLE
  const tableRegex = /CREATE\s+TABLE\s+\[dbo\]\.\[(\w+)\]\s*\(([\s\S]*?)\)(?:\s*ON\s+\[PRIMARY\])?/gi;
  let tableMatch;
  
  while ((tableMatch = tableRegex.exec(ddl)) !== null) {
    const tableName = tableMatch[1];
    const columnsBlock = tableMatch[2];
    
    const columns = [];
    const foreignKeys = [];
    const indexes = [];
    
    // Parse columns
    const colRegex = /\[(\w+)\]\s+\[?(\w+)\]?\s*(?:\(([^)]+)\))?\s*(NULL|NOT NULL)?(?:\s+(IDENTITY\([^)]+\)|DEFAULT\s+[^,]+))?/gi;
    let colMatch;
    
    while ((colMatch = colRegex.exec(columnsBlock)) !== null) {
      const colName = colMatch[1];
      const colType = colMatch[2];
      const colParams = colMatch[3];
      const nullable = colMatch[4] !== 'NOT NULL';
      
      if (colName === 'CONSTRAINT' || colName === 'PRIMARY' || colName === 'CLUSTERED') continue;
      
      columns.push({
        name: colName,
        type: colType,
        params: colParams,
        nullable,
        isPrimaryKey: colName.toLowerCase() === 'id',
        isForeignKey: colName.endsWith('Id') && colName !== 'Id'
      });
    }
    
    // Extract foreign keys
    const fkRegex = /CONSTRAINT\s+\[(\w+)\]\s+FOREIGN\s+KEY\(\[(\w+)\]\)\s*REFERENCES\s+\[dbo\]\.\[(\w+)\]\s*\(\[(\w+)\]\)/gi;
    let fkMatch;
    
    while ((fkMatch = fkRegex.exec(ddl)) !== null) {
      foreignKeys.push({
        name: fkMatch[1],
        column: fkMatch[2],
        refTable: fkMatch[3],
        refColumn: fkMatch[4]
      });
    }
    
    // Extract indexes
    const idxRegex = /CREATE\s+NONCLUSTERED\s+INDEX\s+\[(\w+)\]\s+ON\s+\[dbo\]\.\[(\w+)\]\s*\(\[(\w+)\]\)/gi;
    let idxMatch;
    
    while ((idxMatch = idxRegex.exec(ddl)) !== null) {
      indexes.push({
        name: idxMatch[1],
        table: idxMatch[2],
        column: idxMatch[3]
      });
    }
    
    result.tables.push({
      name: tableName,
      schema: 'dbo',
      columns,
      foreignKeys,
      indexes,
      sourceDDL: tableMatch[0]
    });
  }
  
  return result;
}

// ============================================
// STEP 2: CSHTML PARSER
// ============================================

function parseCSHTML(cshtml) {
  const result = {
    viewType: 'form',
    modelName: null,
    fields: [],
    dropdowns: [],
    cascades: [],
    validations: []
  };

  // Extract model
  const modelMatch = cshtml.match(/@model\s+([\w.]+)/);
  if (modelMatch) {
    result.modelName = modelMatch[1].split('.').pop();
  }
  
  // Extract title
  const titleMatch = cshtml.match(/ViewBag\.Title\s*=\s*"([^"]+)"/);
  if (titleMatch) {
    result.title = titleMatch[1];
  }
  
  // Extract form fields
  const fieldRegex = /@Html\.(TextBoxFor|DropDownListFor|TextAreaFor|CheckBoxFor)\(m\s*=>\s*m\.(\w+)/g;
  let fieldMatch;
  
  while ((fieldMatch = fieldRegex.exec(cshtml)) !== null) {
    const inputType = fieldMatch[1];
    const fieldName = fieldMatch[2];
    
    const field = {
      name: fieldName,
      type: inputType === 'TextBoxFor' ? 'text' : 
            inputType === 'DropDownListFor' ? 'select' :
            inputType === 'TextAreaFor' ? 'textarea' :
            inputType === 'CheckBoxFor' ? 'checkbox' : 'text'
    };
    
    // Extract placeholder
    const placeholderMatch = cshtml.match(new RegExp(`m => m\\.${fieldName}[^)]*placeholder\\s*=\\s*"([^"]+)"`));
    if (placeholderMatch) {
      field.placeholder = placeholderMatch[1];
    }
    
    // Check for required
    const labelMatch = cshtml.match(new RegExp(`@Html\\.LabelFor\\(m\\s*=>\\s*m\\.${fieldName}[^"]*"([^"]+)"`));
    if (labelMatch) {
      field.label = labelMatch[1];
    }
    
    result.fields.push(field);
  }
  
  // Extract dropdowns with data sources
  const dropdownRegex = /@Html\.DropDownListFor\(m\s*=>\s*m\.(\w+),\s*\(SelectList\)ViewBag\.(\w+)/g;
  let dropMatch;
  
  while ((dropMatch = dropdownRegex.exec(cshtml)) !== null) {
    result.dropdowns.push({
      field: dropMatch[1],
      dataSource: dropMatch[2]
    });
  }
  
  // Extract cascade patterns from JavaScript
  const cascadeRegex = /\$\.getJSON\('\/[^\/]+\/Get(\w+)By(\w+)'/g;
  let cascadeMatch;
  
  while ((cascadeMatch = cascadeRegex.exec(cshtml)) !== null) {
    result.cascades.push({
      child: cascadeMatch[1],
      parent: cascadeMatch[2]
    });
  }
  
  return result;
}

// ============================================
// STEP 3: INTELLIGENCE EXTRACTION
// ============================================

function extractIntelligence(parsedSQL, parsedCSHTML) {
  const intelligence = {
    tables: {},
    relationships: [],
    businessRules: [],
    uiPatterns: []
  };
  
  for (const table of parsedSQL.tables) {
    const tableIntel = {
      name: table.name,
      moduleName: toPascalCase(singularize(table.name)),
      columns: {},
      foreignKeys: table.foreignKeys,
      indexes: table.indexes,
      searchableColumns: [],
      sortableColumns: [],
      displayColumns: [],
      phiFields: [],
      piiFields: []
    };
    
    // Column intelligence
    for (const col of table.columns) {
      const colIntel = {
        name: col.name,
        type: col.type,
        sqlType: col.type,
        tsType: mapToTypeScript(col.type),
        prismaType: mapToPrisma(col.type),
        nullable: col.nullable,
        isPrimaryKey: col.isPrimaryKey,
        isForeignKey: col.isForeignKey,
        semanticType: inferSemanticType(col.name),
        uiType: inferUIType(col.name, col.type),
        searchable: isSearchable(col.name),
        displayable: isDisplayable(col.name),
        validation: inferValidation(col.name, col.type, col.nullable)
      };
      
      // Check for PHI/PII
      if (isPHI(col.name)) tableIntel.phiFields.push(col.name);
      if (isPII(col.name)) tableIntel.piiFields.push(col.name);
      
      tableIntel.columns[col.name] = colIntel;
      
      if (colIntel.searchable) tableIntel.searchableColumns.push(col.name);
      if (colIntel.displayable) tableIntel.displayColumns.push(col.name);
    }
    
    intelligence.tables[table.name] = tableIntel;
  }
  
  // CSHTML intelligence merge
  if (parsedCSHTML && parsedCSHTML.modelName) {
    const tableName = pluralize(parsedCSHTML.modelName);
    if (intelligence.tables[tableName]) {
      intelligence.tables[tableName].cshtmlEvidence = {
        fields: parsedCSHTML.fields,
        dropdowns: parsedCSHTML.dropdowns,
        cascades: parsedCSHTML.cascades,
        title: parsedCSHTML.title
      };
    }
  }
  
  return intelligence;
}

// ============================================
// STEP 4: CODE GENERATORS
// ============================================

function generatePrismaModel(tableName, columns, foreignKeys) {
  const modelName = toPascalCase(singularize(tableName));
  let model = `model ${modelName} {\n`;
  
  // Primary key
  model += `  id        String   @id @default(cuid())\n`;
  
  // Columns
  for (const col of columns) {
    if (col.name === 'Id') continue;
    if (['CreatedOn', 'ModifiedOn', 'CreatedBy', 'ModifiedBy'].includes(col.name)) continue;
    
    const prismaType = mapToPrisma(col.type);
    const optional = col.nullable ? '?' : '';
    
    model += `  ${toCamelCase(col.name)}  ${prismaType}${optional}\n`;
  }
  
  // Audit fields
  model += `  createdAt DateTime @default(now())\n`;
  model += `  updatedAt DateTime @updatedAt\n`;
  
  // Relations
  for (const fk of foreignKeys) {
    const relName = toPascalCase(singularize(fk.column.replace('Id', '')));
    model += `  ${toCamelCase(relName)}  ${relName}?  @relation(fields: [${toCamelCase(fk.column)}], references: [id])\n`;
    model += `  ${toCamelCase(fk.column)}  String?\n`;
  }
  
  model += `}\n\n`;
  
  return model;
}

function generateTypeScript(tableName, columns) {
  const typeName = toPascalCase(singularize(tableName));
  let code = `// Auto-generated TypeScript types for ${tableName}\n\n`;
  
  code += `export interface ${typeName} {\n`;
  code += `  id: string;\n`;
  
  for (const col of columns) {
    if (col.name === 'Id') continue;
    if (['CreatedOn', 'ModifiedOn', 'CreatedBy', 'ModifiedBy'].includes(col.name)) continue;
    
    const tsType = mapToTypeScript(col.type);
    const optional = col.nullable ? '?' : '';
    code += `  ${toCamelCase(col.name)}${optional}: ${tsType};\n`;
  }
  
  code += `  createdAt: Date;\n`;
  code += `  updatedAt: Date;\n`;
  code += `}\n\n`;
  
  code += `export interface Create${typeName}Input {\n`;
  for (const col of columns) {
    if (col.name === 'Id') continue;
    if (['CreatedOn', 'ModifiedOn', 'CreatedBy', 'ModifiedBy'].includes(col.name)) continue;
    
    const tsType = mapToTypeScript(col.type);
    const optional = col.nullable ? '?' : '';
    code += `  ${toCamelCase(col.name)}${optional}: ${tsType};\n`;
  }
  code += `}\n\n`;
  
  code += `export interface Update${typeName}Input extends Partial<Create${typeName}Input> {\n`;
  code += `  id: string;\n`;
  code += `}\n`;
  
  return code;
}

function generateZodSchema(tableName, columns) {
  const typeName = toPascalCase(singularize(tableName));
  let code = `import { z } from 'zod';\n\n`;
  
  code += `export const ${typeName}Schema = z.object({\n`;
  code += `  id: z.string(),\n`;
  
  for (const col of columns) {
    if (col.name === 'Id') continue;
    if (['CreatedOn', 'ModifiedOn', 'CreatedBy', 'ModifiedBy'].includes(col.name)) continue;
    
    const zodType = mapToZod(col.type, col.nullable);
    code += `  ${toCamelCase(col.name)}: ${zodType},\n`;
  }
  
  code += `});\n\n`;
  
  code += `export const create${typeName}Schema = ${typeName}Schema.omit({ id: true });\n`;
  code += `export const update${typeName}Schema = ${typeName}Schema.partial().required({ id: true });\n`;
  
  return code;
}

function generateFormComponent(tableName, columns, cshtmlEvidence) {
  const typeName = toPascalCase(singularize(tableName));
  const varName = toCamelCase(tableName);
  
  let code = `'use client';\n\n`;
  code += `import { useForm } from 'react-hook-form';\n`;
  code += `import { Button } from '@/components/ui/button';\n`;
  code += `import { Input } from '@/components/ui/input';\n`;
  code += `import { Label } from '@/components/ui/label';\n`;
  code += `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';\n`;
  code += `import { Textarea } from '@/components/ui/textarea';\n`;
  code += `import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';\n\n`;
  
  // CSHTML-derived field configurations
  const fieldConfig = cshtmlEvidence?.fields || columns.filter(c => !['Id', 'CreatedOn', 'ModifiedOn', 'CreatedBy', 'ModifiedBy'].includes(c.name));
  
  code += `interface ${typeName}FormProps {\n`;
  code += `  initialData?: any;\n`;
  code += `  onSubmit: (data: any) => Promise<void>;\n`;
  code += `  isEditing?: boolean;\n`;
  code += `}\n\n`;
  
  code += `export function ${typeName}Form({ initialData, onSubmit, isEditing }: ${typeName}FormProps) {\n`;
  code += `  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({\n`;
  code += `    defaultValues: initialData || {}\n`;
  code += `  });\n\n`;
  
  code += `  return (\n`;
  code += `    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">\n`;
  
  // Generate form fields
  for (const field of fieldConfig) {
    const fieldName = field.name || field;
    const label = field.label || toLabel(fieldName);
    const placeholder = field.placeholder || `Enter ${label.toLowerCase()}`;
    
    code += `      <div className="space-y-2">\n`;
    code += `        <Label htmlFor="${fieldName}">${label}</Label>\n`;
    
    if (field.type === 'select' || fieldName.endsWith('Id')) {
      const relName = fieldName.replace('Id', '');
      code += `        <Select {...register('${fieldName}')}>\n`;
      code += `          <SelectTrigger>\n`;
      code += `            <SelectValue placeholder="Select ${toLabel(relName)}" />\n`;
      code += `          </SelectTrigger>\n`;
      code += `          <SelectContent>\n`;
      code += `            {/* TODO: Load ${toPascalCase(relName)} options */}\n`;
      code += `          </SelectContent>\n`;
      code += `        </Select>\n`;
    } else if (field.type === 'textarea' || fieldName === 'Address') {
      code += `        <Textarea\n`;
      code += `          id="${fieldName}"\n`;
      code += `          placeholder="${placeholder}"\n`;
      code += `          {...register('${fieldName}')}\n`;
      code += `        />\n`;
    } else if (field.type === 'checkbox') {
      code += `        <div className="flex items-center space-x-2">\n`;
      code += `          <input type="checkbox" id="${fieldName}" {...register('${fieldName}')} />\n`;
      code += `          <Label htmlFor="${fieldName}">Active</Label>\n`;
      code += `        </div>\n`;
    } else {
      code += `        <Input\n`;
      code += `          id="${fieldName}"\n`;
      code += `          type="${fieldName.toLowerCase().includes('email') ? 'email' : 'text'}"\n`;
      code += `          placeholder="${placeholder}"\n`;
      code += `          {...register('${fieldName}')}\n`;
      code += `        />\n`;
    }
    
    code += `      </div>\n\n`;
  }
  
  code += `      <div className="flex gap-4">\n`;
  code += `        <Button type="submit" disabled={isSubmitting}>\n`;
  code += `          {isEditing ? 'Update' : 'Create'} ${typeName}\n`;
  code += `        </Button>\n`;
  code += `      </div>\n`;
  code += `    </form>\n`;
  code += `  );\n`;
  code += `}\n`;
  
  return code;
}

function generateTableComponent(tableName, columns) {
  const typeName = toPascalCase(singularize(tableName));
  const displayCols = columns.filter(c => 
    isDisplayable(c.name) && !['CreatedOn', 'ModifiedOn', 'CreatedBy', 'ModifiedBy'].includes(c.name)
  ).slice(0, 6);
  
  let code = `'use client';\n\n`;
  code += `import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';\n`;
  code += `import { Button } from '@/components/ui/button';\n`;
  code += `import { Badge } from '@/components/ui/badge';\n`;
  code += `import { Edit, Eye, Trash2 } from 'lucide-react';\n\n`;
  
  code += `interface ${typeName}TableProps {\n`;
  code += `  data: any[];\n`;
  code += `  onView?: (id: string) => void;\n`;
  code += `  onEdit?: (id: string) => void;\n`;
  code += `  onDelete?: (id: string) => void;\n`;
  code += `}\n\n`;
  
  code += `export function ${typeName}Table({ data, onView, onEdit, onDelete }: ${typeName}TableProps) {\n`;
  code += `  return (\n`;
  code += `    <Table>\n`;
  code += `      <TableHeader>\n`;
  code += `        <TableRow>\n`;
  
  for (const col of displayCols) {
    code += `          <TableHead>${toLabel(col.name)}</TableHead>\n`;
  }
  
  code += `          <TableHead>Status</TableHead>\n`;
  code += `          <TableHead className="text-right">Actions</TableHead>\n`;
  code += `        </TableRow>\n`;
  code += `      </TableHeader>\n`;
  code += `      <TableBody>\n`;
  code += `        {data.map((item) => (\n`;
  code += `          <TableRow key={item.id}>\n`;
  
  for (const col of displayCols) {
    code += `            <TableCell>{item.${toCamelCase(col.name)}}}</TableCell>\n`;
  }
  
  code += `            <TableCell>\n`;
  code += `              <Badge variant={item.isActive ? 'default' : 'secondary'}>\n`;
  code += `                {item.isActive ? 'Active' : 'Inactive'}\n`;
  code += `              </Badge>\n`;
  code += `            </TableCell>\n`;
  code += `            <TableCell className="text-right">\n`;
  code += `              <div className="flex justify-end gap-2">\n`;
  code += `                {onView && (\n`;
  code += `                  <Button variant="ghost" size="icon" onClick={() => onView(item.id)}>\n`;
  code += `                    <Eye className="h-4 w-4" />\n`;
  code += `                  </Button>\n`;
  code += `                )}\n`;
  code += `                {onEdit && (\n`;
  code += `                  <Button variant="ghost" size="icon" onClick={() => onEdit(item.id)}>\n`;
  code += `                    <Edit className="h-4 w-4" />\n`;
  code += `                  </Button>\n`;
  code += `                )}\n`;
  code += `                {onDelete && (\n`;
  code += `                  <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>\n`;
  code += `                    <Trash2 className="h-4 w-4" />\n`;
  code += `                </Button>\n`;
  code += `                )}\n`;
  code += `              </div>\n`;
  code += `            </TableCell>\n`;
  code += `          </TableRow>\n`;
  code += `        ))}\n`;
  code += `      </TableBody>\n`;
  code += `    </Table>\n`;
  code += `  );\n`;
  code += `}\n`;
  
  return code;
}

function generateAPIRoute(tableName, columns) {
  const typeName = toPascalCase(singularize(tableName));
  const varName = toCamelCase(singularize(tableName));
  const routePath = toKebabCase(tableName);
  
  let code = `import { NextRequest, NextResponse } from 'next/server';\n`;
  code += `import { prisma } from '@/lib/prisma';\n\n`;
  
  // GET
  code += `export async function GET(request: NextRequest) {\n`;
  code += `  const searchParams = request.nextUrl.searchParams;\n`;
  code += `  const id = searchParams.get('id');\n\n`;
  code += `  if (id) {\n`;
  code += `    const item = await prisma.${varName}.findUnique({\n`;
  code += `      where: { id },\n`;
  code += `      include: { /* TODO: Add relations */ }\n`;
  code += `    });\n`;
  code += `    return NextResponse.json(item);\n`;
  code += `  }\n\n`;
  code += `  const search = searchParams.get('search');\n`;
  code += `  const page = parseInt(searchParams.get('page') || '1');\n`;
  code += `  const pageSize = parseInt(searchParams.get('pageSize') || '20');\n\n`;
  
  code += `  const where = search ? {\n`;
  code += `    OR: [\n`;
  const searchableCols = columns.filter(c => isSearchable(c.name)).slice(0, 3);
  for (const col of searchableCols) {
    code += `      { ${toCamelCase(col.name)}: { contains: search, mode: 'insensitive' } },\n`;
  }
  code += `    ]\n`;
  code += `  } : {};\n\n`;
  
  code += `  const [items, total] = await Promise.all([\n`;
  code += `    prisma.${varName}.findMany({\n`;
  code += `      where,\n`;
  code += `      skip: (page - 1) * pageSize,\n`;
  code += `      take: pageSize,\n`;
  code += `      orderBy: { createdAt: 'desc' }\n`;
  code += `    }),\n`;
  code += `    prisma.${varName}.count({ where })\n`;
  code += `  ]);\n\n`;
  
  code += `  return NextResponse.json({\n`;
  code += `    items,\n`;
  code += `    pagination: {\n`;
  code += `      page,\n`;
  code += `      pageSize,\n`;
  code += `      total,\n`;
  code += `      totalPages: Math.ceil(total / pageSize)\n`;
  code += `    }\n`;
  code += `  });\n`;
  code += `}\n\n`;
  
  // POST
  code += `export async function POST(request: NextRequest) {\n`;
  code += `  const body = await request.json();\n`;
  code += `  const item = await prisma.${varName}.create({\n`;
  code += `    data: body\n`;
  code += `  });\n`;
  code += `  return NextResponse.json(item, { status: 201 });\n`;
  code += `}\n\n`;
  
  // PUT
  code += `export async function PUT(request: NextRequest) {\n`;
  code += `  const body = await request.json();\n`;
  code += `  const { id, ...data } = body;\n`;
  code += `  const item = await prisma.${varName}.update({\n`;
  code += `    where: { id },\n`;
  code += `    data\n`;
  code += `  });\n`;
  code += `  return NextResponse.json(item);\n`;
  code += `}\n\n`;
  
  // DELETE
  code += `export async function DELETE(request: NextRequest) {\n`;
  code += `  const { searchParams } = new URL(request.url);\n`;
  code += `  const id = searchParams.get('id');\n`;
  code += `  if (!id) {\n`;
  code += `    return NextResponse.json({ error: 'ID required' }, { status: 400 });\n`;
  code += `  }\n`;
  code += `  await prisma.${varName}.delete({ where: { id } });\n`;
  code += `  return NextResponse.json({ success: true });\n`;
  code += `}\n`;
  
  return code;
}

function generateHook(tableName) {
  const typeName = toPascalCase(singularize(tableName));
  const varName = toCamelCase(singularize(tableName));
  const routePath = toKebabCase(tableName);
  
  let code = `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\n\n`;
  
  // useList
  code += `export function use${typeName}List(params?: { search?: string; page?: number; pageSize?: number }) {\n`;
  code += `  return useQuery({\n`;
  code += `    queryKey: ['${routePath}', 'list', params],\n`;
  code += `    queryFn: async () => {\n`;
  code += `      const searchParams = new URLSearchParams();\n`;
  code += `      if (params?.search) searchParams.set('search', params.search);\n`;
  code += `      if (params?.page) searchParams.set('page', params.page.toString());\n`;
  code += `      if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());\n`;
  code += `      const res = await fetch(\`/api/${routePath}?\${searchParams}\`);\n`;
  code += `      if (!res.ok) throw new Error('Failed to fetch ${typeName}');\n`;
  code += `      return res.json();\n`;
  code += `    }\n`;
  code += `  });\n`;
  code += `}\n\n`;
  
  // useItem
  code += `export function use${typeName}Item(id: string | undefined) {\n`;
  code += `  return useQuery({\n`;
  code += `    queryKey: ['${routePath}', id],\n`;
  code += `    queryFn: async () => {\n`;
  code += `      if (!id) return null;\n`;
  code += `      const res = await fetch(\`/api/${routePath}?id=\${id}\`);\n`;
  code += `      if (!res.ok) throw new Error('Failed to fetch ${typeName}');\n`;
  code += `      return res.json();\n`;
  code += `    },\n`;
  code += `    enabled: !!id\n`;
  code += `  });\n`;
  code += `}\n\n`;
  
  // useMutations
  code += `export function use${typeName}Mutations() {\n`;
  code += `  const queryClient = useQueryClient();\n\n`;
  
  code += `  const createMutation = useMutation({\n`;
  code += `    mutationFn: async (data: any) => {\n`;
  code += `      const res = await fetch('/api/${routePath}', {\n`;
  code += `        method: 'POST',\n`;
  code += `        headers: { 'Content-Type': 'application/json' },\n`;
  code += `        body: JSON.stringify(data)\n`;
  code += `      });\n`;
  code += `      if (!res.ok) throw new Error('Failed to create ${typeName}');\n`;
  code += `      return res.json();\n`;
  code += `    },\n`;
  code += `    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['${routePath}'] })\n`;
  code += `  });\n\n`;
  
  code += `  const updateMutation = useMutation({\n`;
  code += `    mutationFn: async (data: any) => {\n`;
  code += `      const res = await fetch('/api/${routePath}', {\n`;
  code += `        method: 'PUT',\n`;
  code += `        headers: { 'Content-Type': 'application/json' },\n`;
  code += `        body: JSON.stringify(data)\n`;
  code += `      });\n`;
  code += `      if (!res.ok) throw new Error('Failed to update ${typeName}');\n`;
  code += `      return res.json();\n`;
  code += `    },\n`;
  code += `    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['${routePath}'] })\n`;
  code += `  });\n\n`;
  
  code += `  const deleteMutation = useMutation({\n`;
  code += `    mutationFn: async (id: string) => {\n`;
  code += `      const res = await fetch(\`/api/${routePath}?id=\${id}\`, { method: 'DELETE' });\n`;
  code += `      if (!res.ok) throw new Error('Failed to delete ${typeName}');\n`;
  code += `    },\n`;
  code += `    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['${routePath}'] })\n`;
  code += `  });\n\n`;
  
  code += `  return {\n`;
  code += `    createItem: createMutation.mutateAsync,\n`;
  code += `    updateItem: updateMutation.mutateAsync,\n`;
  code += `    deleteItem: deleteMutation.mutateAsync,\n`;
  code += `    isCreating: createMutation.isPending,\n`;
  code += `    isUpdating: updateMutation.isPending,\n`;
  code += `    isDeleting: deleteMutation.isPending\n`;
  code += `  };\n`;
  code += `}\n`;
  
  return code;
}

function generatePages(tableName, columns) {
  const typeName = toPascalCase(singularize(tableName));
  const varName = toCamelCase(singularize(tableName));
  const routePath = toKebabCase(tableName);
  
  const pages = {};
  
  // List Page
  pages.list = `'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search } from 'lucide-react';
import { ${typeName}Table } from '@/components/${typeName}/${typeName}Table';
import { use${typeName}List, use${typeName}Mutations } from '@/hooks/use${typeName}';

export default function ${typeName}ListPage() {
  const [search, setSearch] = useState('');
  const { items, pagination, isLoading, refetch } = use${typeName}List({ search });
  const { deleteItem } = use${typeName}Mutations();

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this ${typeName.toLowerCase()}?')) {
      await deleteItem(id);
      refetch();
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">${typeName} Management</h1>
          <p className="text-muted-foreground">Manage your ${typeName.toLowerCase()} records</p>
        </div>
        <Link href="/${routePath}/new">
          <Button><Plus className="w-4 h-4 mr-2" />Add ${typeName}</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search ${typeName.toLowerCase()}..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <${typeName}Table
              data={items}
              onView={(id) => window.location.href = \`/${routePath}/\${id}\`}
              onEdit={(id) => window.location.href = \`/${routePath}/\${id}/edit\`}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}`;

  // Create Page
  pages.create = `'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ${typeName}Form } from '@/components/${typeName}/${typeName}Form';
import { use${typeName}Mutations } from '@/hooks/use${typeName}';
import { useToast } from '@/hooks/use-toast';

export default function New${typeName}Page() {
  const router = useRouter();
  const { createItem } = use${typeName}Mutations();
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      await createItem(data);
      toast({ title: '${typeName} created successfully' });
      router.push('/${routePath}');
    } catch (error) {
      toast({ title: 'Failed to create ${typeName}', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New ${typeName}</CardTitle>
        </CardHeader>
        <CardContent>
          <${typeName}Form onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}`;

  // Detail/Edit Page
  pages.detail = `'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { ${typeName}Form } from '@/components/${typeName}/${typeName}Form';
import { use${typeName}Item, use${typeName}Mutations } from '@/hooks/use${typeName}';
import { useToast } from '@/hooks/use-toast';

export default function ${typeName}DetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { item, isLoading } = use${typeName}Item(id);
  const { updateItem } = use${typeName}Mutations();
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      await updateItem({ id, ...data });
      toast({ title: '${typeName} updated successfully' });
      router.push('/${routePath}');
    } catch (error) {
      toast({ title: 'Failed to update ${typeName}', variant: 'destructive' });
    }
  };

  if (isLoading) return <div className="container mx-auto py-6">Loading...</div>;
  if (!item) return <div className="container mx-auto py-6">${typeName} not found</div>;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/${routePath}')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Edit ${typeName}</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <${typeName}Form initialData={item} onSubmit={handleSubmit} isEditing />
        </CardContent>
      </Card>
    </div>
  );
}`;

  return pages;
}

// ============================================
// STEP 5: PROJECT ASSEMBLY
// ============================================

async function assembleProject(projectName, generatedFiles) {
  const projectDir = `/home/z/my-project/demo-output/${projectName}`;
  
  // Read template manifest
  const templatePath = '/home/z/my-project/templates/nextjs-react';
  
  // Copy all template files
  const filesToCopy = [
    'package.json',
    'tsconfig.json',
    'next.config.ts',
    'tailwind.config.ts',
    'postcss.config.mjs',
    'README.md',
    '.env.example'
  ];
  
  for (const file of filesToCopy) {
    try {
      const content = fs.readFileSync(`${templatePath}/${file}`, 'utf-8');
      fs.mkdirSync(`${projectDir}`, { recursive: true });
      fs.writeFileSync(`${projectDir}/${file}`, content);
    } catch (e) {
      console.log(`Skipping ${file}: ${e.message}`);
    }
  }
  
  // Copy src/app structure
  const appFiles = ['layout.tsx', 'page.tsx', 'globals.css', 'providers.tsx'];
  for (const file of appFiles) {
    try {
      const content = fs.readFileSync(`${templatePath}/src/app/${file}`, 'utf-8');
      fs.mkdirSync(`${projectDir}/src/app`, { recursive: true });
      fs.writeFileSync(`${projectDir}/src/app/${file}`, content);
    } catch (e) {}
  }
  
  // Copy lib
  const libFiles = ['prisma.ts', 'utils.ts'];
  for (const file of libFiles) {
    try {
      const content = fs.readFileSync(`${templatePath}/src/lib/${file}`, 'utf-8');
      fs.mkdirSync(`${projectDir}/src/lib`, { recursive: true });
      fs.writeFileSync(`${projectDir}/src/lib/${file}`, content);
    } catch (e) {}
  }
  
  // Copy UI components
  const uiComponents = ['button.tsx', 'input.tsx', 'select.tsx', 'form.tsx', 'card.tsx', 
                        'table.tsx', 'label.tsx', 'badge.tsx', 'dialog.tsx', 'dropdown-menu.tsx'];
  for (const comp of uiComponents) {
    try {
      const content = fs.readFileSync(`${templatePath}/src/components/ui/${comp}`, 'utf-8');
      fs.mkdirSync(`${projectDir}/src/components/ui`, { recursive: true });
      fs.writeFileSync(`${projectDir}/src/components/ui/${comp}`, content);
    } catch (e) {}
  }
  
  // Copy prisma schema
  try {
    const content = fs.readFileSync(`${templatePath}/prisma/schema.prisma`, 'utf-8');
    fs.mkdirSync(`${projectDir}/prisma`, { recursive: true });
    fs.writeFileSync(`${projectDir}/prisma/schema.prisma`, content);
  } catch (e) {}
  
  // Now insert generated files
  for (const [path, content] of Object.entries(generatedFiles)) {
    const fullPath = `${projectDir}/${path}`;
    fs.mkdirSync(require('path').dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  
  return projectDir;
}

// ============================================
// STEP 6: ZIP CREATION
// ============================================

async function createZip(projectDir, outputPath) {
  const zip = new JSZip();
  
  function addFolderToZip(folderPath, zipFolder) {
    const items = fs.readdirSync(folderPath);
    
    for (const item of items) {
      const itemPath = `${folderPath}/${item}`;
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        addFolderToZip(itemPath, zipFolder.folder(item));
      } else {
        const content = fs.readFileSync(itemPath);
        zipFolder.file(item, content);
      }
    }
  }
  
  addFolderToZip(projectDir, zip.folder(require('path').basename(projectDir)));
  
  // Add setup instructions
  const instructions = `# Setup Instructions

## ${require('path').basename(projectDir)}

### 1. Extract this ZIP file
\`\`\`bash
unzip ${require('path').basename(projectDir)}.zip
cd ${require('path').basename(projectDir)}
\`\`\`

### 2. Install dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Setup database
\`\`\`bash
npx prisma generate
npx prisma db push
\`\`\`

### 4. Run development server
\`\`\`bash
npm run dev
\`\`\`

### 5. Open browser
Navigate to http://localhost:3000

---
Generated by AI Enterprise Architect on ${new Date().toISOString()}
`;
  
  zip.file('SETUP_INSTRUCTIONS.md', instructions);
  
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function toPascalCase(str) {
  return str.replace(/[_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toUpperCase());
}

function toCamelCase(str) {
  return str.replace(/[_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, c => c.toLowerCase());
}

function toKebabCase(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

function toLabel(str) {
  return str.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
}

function singularize(name) {
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
  if (name.endsWith('ses')) return name.slice(0, -2);
  if (name.endsWith('s') && !name.endsWith('ss')) return name.slice(0, -1);
  return name;
}

function pluralize(name) {
  // Simple pluralization
  return name + 's';
}

function mapToTypeScript(sqlType) {
  const type = sqlType?.toLowerCase() || 'string';
  if (type.includes('int')) return 'number';
  if (type.includes('decimal') || type.includes('numeric') || type.includes('float')) return 'number';
  if (type.includes('date') || type.includes('time')) return 'Date';
  if (type.includes('bit') || type.includes('bool')) return 'boolean';
  if (type === 'uniqueidentifier') return 'string';
  return 'string';
}

function mapToPrisma(sqlType) {
  const type = sqlType?.toLowerCase() || 'string';
  if (type.includes('int')) return 'Int';
  if (type.includes('decimal') || type.includes('numeric')) return 'Decimal';
  if (type.includes('float')) return 'Float';
  if (type.includes('date') || type.includes('time')) return 'DateTime';
  if (type.includes('bit') || type.includes('bool')) return 'Boolean';
  if (type === 'uniqueidentifier') return 'String';
  return 'String';
}

function mapToZod(sqlType, nullable) {
  const type = sqlType?.toLowerCase() || 'string';
  let zodType = 'z.string()';
  if (type.includes('int')) zodType = 'z.number().int()';
  else if (type.includes('decimal') || type.includes('numeric')) zodType = 'z.number()';
  else if (type.includes('date')) zodType = 'z.coerce.date()';
  else if (type.includes('bit')) zodType = 'z.boolean()';
  
  return nullable ? `${zodType}.optional()` : zodType;
}

function inferSemanticType(colName) {
  const name = colName.toLowerCase();
  if (name.includes('email')) return 'email';
  if (name.includes('phone') || name.includes('tel') || name.includes('cell')) return 'phone';
  if (name.includes('address')) return 'address';
  if (name.includes('name')) return 'name';
  if (name.includes('code')) return 'code';
  if (name.includes('date')) return 'date';
  if (name.includes('active') || name.includes('status')) return 'status';
  return 'generic';
}

function inferUIType(colName, colType) {
  const name = colName.toLowerCase();
  if (name.includes('email')) return 'email';
  if (name.includes('phone') || name.includes('tel') || name.includes('cell')) return 'tel';
  if (name.endsWith('id') && name !== 'id') return 'select';
  if (name.includes('date')) return 'date';
  if (name.includes('address')) return 'textarea';
  if (name.includes('active') || name.includes('is_')) return 'checkbox';
  return 'text';
}

function isSearchable(colName) {
  const name = colName.toLowerCase();
  return name.includes('name') || name.includes('email') || name.includes('code') || name.includes('title');
}

function isDisplayable(colName) {
  const hidden = ['id', 'password', 'hash', 'token', 'secret', 'createdby', 'modifiedby'];
  return !hidden.some(h => colName.toLowerCase().includes(h));
}

function isPHI(colName) {
  const phiPatterns = ['mrn', 'ssn', 'diagnosis', 'medical', 'patient', 'health', 'disease'];
  return phiPatterns.some(p => colName.toLowerCase().includes(p));
}

function isPII(colName) {
  const piiPatterns = ['email', 'phone', 'cell', 'address', 'name', 'ssn', 'cnic'];
  return piiPatterns.some(p => colName.toLowerCase().includes(p));
}

function inferValidation(colName, colType, nullable) {
  const rules = [];
  const name = colName.toLowerCase();
  
  if (!nullable) rules.push({ type: 'required', message: `${toLabel(colName)} is required` });
  if (name.includes('email')) rules.push({ type: 'email', message: 'Invalid email format' });
  if (name.includes('phone') || name.includes('tel') || name.includes('cell')) {
    rules.push({ type: 'phone', message: 'Invalid phone format' });
  }
  
  return rules;
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('AI ENTERPRISE ARCHITECT - END-TO-END DEMO');
  console.log('='.repeat(60));
  console.log('');
  
  // Read input files
  const sqlContent = fs.readFileSync('/home/z/my-project/upload/schema.sql', 'utf-8');
  let cshtmlContent = '';
  try {
    cshtmlContent = fs.readFileSync('/home/z/my-project/upload/OrganizationCreate.cshtml', 'utf-8');
  } catch (e) {
    console.log('No CSHTML file found, proceeding with SQL only');
  }
  
  console.log('📁 Input Files:');
  console.log('   - SQL DDL: Organizations table');
  console.log('   - CSHTML: OrganizationCreate.cshtml');
  console.log('');
  
  // Step 1: Parse SQL
  console.log('🔄 Step 1: Parsing SQL DDL...');
  const parsedSQL = parseSQL(sqlContent);
  console.log(`   ✅ Found ${parsedSQL.tables.length} table(s)`);
  for (const table of parsedSQL.tables) {
    console.log(`      - ${table.name}: ${table.columns.length} columns, ${table.foreignKeys.length} FKs`);
  }
  console.log('');
  
  // Step 2: Parse CSHTML
  console.log('🔄 Step 2: Parsing CSHTML...');
  const parsedCSHTML = cshtmlContent ? parseCSHTML(cshtmlContent) : null;
  if (parsedCSHTML) {
    console.log(`   ✅ View Type: ${parsedCSHTML.viewType}`);
    console.log(`   ✅ Model: ${parsedCSHTML.modelName}`);
    console.log(`   ✅ Fields: ${parsedCSHTML.fields.length}`);
    console.log(`   ✅ Dropdowns: ${parsedCSHTML.dropdowns.length}`);
    console.log(`   ✅ Cascades: ${parsedCSHTML.cascades.length}`);
  }
  console.log('');
  
  // Step 3: Extract Intelligence
  console.log('🔄 Step 3: Extracting Intelligence...');
  const intelligence = extractIntelligence(parsedSQL, parsedCSHTML);
  for (const [tableName, tableIntel] of Object.entries(intelligence.tables)) {
    console.log(`   ✅ ${tableName}:`);
    console.log(`      - Display columns: ${tableIntel.displayColumns.join(', ')}`);
    console.log(`      - Searchable: ${tableIntel.searchableColumns.join(', ')}`);
    console.log(`      - PII fields: ${tableIntel.piiFields.join(', ') || 'none'}`);
    console.log(`      - FKs: ${tableIntel.foreignKeys.map(fk => fk.column + '→' + fk.refTable).join(', ') || 'none'}`);
  }
  console.log('');
  
  // Step 4: Generate Code
  console.log('🔄 Step 4: Generating Code...');
  const generatedFiles = {};
  const projectName = 'demo';
  
  for (const table of parsedSQL.tables) {
    const typeName = toPascalCase(singularize(table.name));
    const routePath = toKebabCase(table.name);
    const cshtmlEvidence = intelligence.tables[table.name]?.cshtmlEvidence;
    
    console.log(`   📦 Generating for ${typeName}...`);
    
    // Prisma model
    generatedFiles[`prisma/schema.prisma`] = generatePrismaModel(table.name, table.columns, table.foreignKeys);
    
    // TypeScript types
    generatedFiles[`src/types/${routePath}.ts`] = generateTypeScript(table.name, table.columns);
    
    // Zod schemas
    generatedFiles[`src/lib/validations/${routePath}.ts`] = generateZodSchema(table.name, table.columns);
    
    // React components
    generatedFiles[`src/components/${typeName}/${typeName}Form.tsx`] = generateFormComponent(table.name, table.columns, cshtmlEvidence);
    generatedFiles[`src/components/${typeName}/${typeName}Table.tsx`] = generateTableComponent(table.name, table.columns);
    
    // API route
    generatedFiles[`src/app/api/${routePath}/route.ts`] = generateAPIRoute(table.name, table.columns);
    
    // Hooks
    generatedFiles[`src/hooks/use${typeName}.ts`] = generateHook(table.name);
    
    // Pages
    const pages = generatePages(table.name, table.columns);
    generatedFiles[`src/app/${routePath}/page.tsx`] = pages.list;
    generatedFiles[`src/app/${routePath}/new/page.tsx`] = pages.create;
    generatedFiles[`src/app/${routePath}/[id]/page.tsx`] = pages.detail;
    
    console.log(`      ✅ Prisma model`);
    console.log(`      ✅ TypeScript types`);
    console.log(`      ✅ Zod validation`);
    console.log(`      ✅ Form component`);
    console.log(`      ✅ Table component`);
    console.log(`      ✅ API route`);
    console.log(`      ✅ Custom hooks`);
    console.log(`      ✅ 3 pages (list, create, detail)`);
  }
  console.log('');
  
  // Step 5: Assemble Project
  console.log('🔄 Step 5: Assembling Project...');
  const projectDir = await assembleProject(projectName, generatedFiles);
  console.log(`   ✅ Project assembled at: ${projectDir}`);
  
  // Count files
  const countFiles = (dir) => {
    let count = 0;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const stat = fs.statSync(`${dir}/${item}`);
      if (stat.isDirectory()) count += countFiles(`${dir}/${item}`);
      else count++;
    }
    return count;
  };
  console.log(`   ✅ Total files: ${countFiles(projectDir)}`);
  console.log('');
  
  // Step 6: Create ZIP
  console.log('🔄 Step 6: Creating ZIP Package...');
  const zipPath = `/home/z/my-project/download/${projectName}-project.zip`;
  fs.mkdirSync(require('path').dirname(zipPath), { recursive: true });
  await createZip(projectDir, zipPath);
  
  const zipStats = fs.statSync(zipPath);
  console.log(`   ✅ ZIP created: ${zipPath}`);
  console.log(`   ✅ ZIP size: ${(zipStats.size / 1024).toFixed(2)} KB`);
  console.log('');
  
  // Summary
  console.log('='.repeat(60));
  console.log('✅ COMPLETE! PROJECT EXPORT SUCCESSFUL');
  console.log('='.repeat(60));
  console.log('');
  console.log('📊 Generation Summary:');
  console.log(`   - Tables processed: ${parsedSQL.tables.length}`);
  console.log(`   - Files generated: ${Object.keys(generatedFiles).length}`);
  console.log(`   - Total project files: ${countFiles(projectDir)}`);
  console.log(`   - ZIP file: ${zipPath}`);
  console.log('');
  console.log('🚀 To run the generated project:');
  console.log(`   1. unzip ${zipPath}`);
  console.log(`   2. cd ${projectName}`);
  console.log(`   3. npm install`);
  console.log(`   4. npx prisma db push`);
  console.log(`   5. npm run dev`);
  console.log('');
  
  return { projectDir, zipPath, generatedFiles };
}

main().catch(console.error);
