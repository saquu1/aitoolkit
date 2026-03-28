// =============================================================================
// CODE GENERATOR - Auto-generate Next.js code from parsed intelligence
// =============================================================================

import { ParsedCSHTMLView, ParsedFormField, CascadingDropdown, AjaxEndpoint } from '../cshtml-parser'
import { TableDef, ColumnDef, StoredProcedureDef } from '../types'

// =============================================================================
// TYPES
// =============================================================================

export interface GeneratedFile {
  path: string
  content: string
  type: 'component' | 'api' | 'schema' | 'hook' | 'type' | 'page' | 'config'
  description: string
}

export interface CodeGeneratorOptions {
  projectId: string
  moduleName: string
  useReactQuery?: boolean
  useZod?: boolean
  generateTests?: boolean
  styleSystem?: 'tailwind' | 'css-modules'
}

// =============================================================================
// CODE GENERATOR CLASS
// =============================================================================

export class CodeGenerator {
  private options: CodeGeneratorOptions

  constructor(options: CodeGeneratorOptions) {
    this.options = {
      useReactQuery: true,
      useZod: true,
      generateTests: false,
      styleSystem: 'tailwind',
      ...options
    }
  }

  // ===========================================================================
  // MAIN ENTRY POINT
  // ===========================================================================

  generateFromCSHTML(view: ParsedCSHTMLView, tables: TableDef[]): { files: GeneratedFile[] } {
    const files: GeneratedFile[] = []
    const moduleName = this.options.moduleName || view.viewName.toLowerCase()
    const tableName = view.model?.linkedTable || view.viewName + 's'

    // 1. Generate Zod schema
    if (this.options.useZod) {
      files.push(this.generateZodSchema(view, moduleName))
    }

    // 2. Generate TypeScript types
    files.push(this.generateTypes(view, moduleName, tableName))

    // 3. Generate React Query hooks
    if (this.options.useReactQuery) {
      files.push(this.generateReactQueryHooks(view, moduleName, tableName))
    }

    // 4. Generate form component
    files.push(this.generateFormComponent(view, moduleName))

    // 5. Generate list component
    files.push(this.generateListComponent(view, moduleName, tableName))

    // 6. Generate detail component
    files.push(this.generateDetailComponent(view, moduleName))

    // 7. Generate API routes
    files.push(...this.generateAPIRoutes(view, moduleName, tableName))

    // 8. Generate pages
    files.push(...this.generatePages(view, moduleName))

    // 9. Generate cascading select if needed
    if (view.cascadingDropdowns && view.cascadingDropdowns.length > 0) {
      files.push(this.generateCascadingSelect(view, moduleName))
    }

    return { files }
  }

  // ===========================================================================
  // ZOD SCHEMA GENERATION
  // ===========================================================================

  generateZodSchema(view: ParsedCSHTMLView, moduleName: string): GeneratedFile {
    const fields = view.fields || []
    const schemaLines: string[] = []

    for (const field of fields) {
      const line = this.fieldToZodSchema(field)
      schemaLines.push(`  ${field.name}: ${line}`)
    }

    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/schema.ts`,
      content: `import { z } from 'zod'

// Auto-generated Zod schema from CSHTML view: ${view.viewName}

export const ${entityName}Schema = z.object({
${schemaLines.join(',\n')}
})

export type ${entityName}FormData = z.infer<typeof ${entityName}Schema>
`,
      type: 'schema',
      description: `Zod validation schema for ${moduleName}`
    }
  }

  private fieldToZodSchema(field: ParsedFormField): string {
    let schema = 'z.string()'

    switch (field.inputType) {
      case 'number_input':
      case 'currency_input':
        schema = 'z.coerce.number()'
        break
      case 'checkbox':
        schema = 'z.boolean()'
        break
      case 'date_picker':
        schema = 'z.coerce.date()'
        break
      case 'email_input':
        schema = 'z.string().email()'
        break
      default:
        schema = 'z.string()'
    }

    // Add validation rules
    for (const v of (field.validation || [])) {
      switch (v.type) {
        case 'required':
          if (field.inputType !== 'checkbox') {
            schema += '.min(1, "This field is required")'
          }
          break
        case 'min_length':
          schema += `.min(${v.value || 1})`
          break
        case 'max_length':
          schema += `.max(${v.value || 255})`
          break
        case 'email':
          schema += '.email()'
          break
        case 'pattern':
          if (v.value) schema += `.regex(/${v.value}/)`
          break
      }
    }

    if (!field.isRequired && field.inputType !== 'checkbox') {
      schema += '.optional()'
    }

    return schema
  }

  // ===========================================================================
  // TYPESCRIPT TYPES GENERATION
  // ===========================================================================

  generateTypes(view: ParsedCSHTMLView, moduleName: string, tableName: string): GeneratedFile {
    const fields = view.fields || []
    const entityName = this.toPascalCase(moduleName)

    const typeLines = fields.map(f => {
      const tsType = this.fieldToTypeScriptType(f)
      const optional = f.isRequired ? '' : '?'
      return `  ${f.name}${optional}: ${tsType}`
    })

    return {
      path: `modules/${moduleName}/types.ts`,
      content: `// Auto-generated TypeScript types for ${moduleName}

export interface ${entityName} {
  id: string
${typeLines.join('\n')}
  createdAt: Date
  updatedAt: Date
}

export interface ${entityName}FormData {
${typeLines.join('\n')}
}

export interface ${entityName}Filters {
  search?: string
}

export interface ${entityName}ListResponse {
  data: ${entityName}[]
  total: number
  page: number
  pageSize: number
}
`,
      type: 'type',
      description: `TypeScript types for ${moduleName}`
    }
  }

  private fieldToTypeScriptType(field: ParsedFormField): string {
    switch (field.inputType) {
      case 'number_input':
      case 'currency_input':
        return 'number'
      case 'checkbox':
        return 'boolean'
      case 'date_picker':
      case 'datetime_picker':
        return 'Date'
      default:
        return 'string'
    }
  }

  // ===========================================================================
  // REACT QUERY HOOKS GENERATION
  // ===========================================================================

  generateReactQueryHooks(view: ParsedCSHTMLView, moduleName: string, tableName: string): GeneratedFile {
    const entityName = this.toPascalCase(moduleName)

    return {
      path: `modules/${moduleName}/hooks/useQueries.ts`,
      content: `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ${entityName}, ${entityName}FormData, ${entityName}Filters } from '../types'

const API_BASE = '/api/${moduleName}'

// Fetch list
async function fetch${entityName}s(filters?: ${entityName}Filters) {
  const params = new URLSearchParams(filters as any)
  const res = await fetch(\`\${API_BASE}?\${params}\`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// Fetch single
async function fetch${entityName}(id: string) {
  const res = await fetch(\`\${API_BASE}/\${id}\`)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// Create
async function create${entityName}(data: ${entityName}FormData) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create')
  return res.json()
}

// Update
async function update${entityName}(id: string, data: Partial<${entityName}FormData>) {
  const res = await fetch(\`\${API_BASE}/\${id}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update')
  return res.json()
}

// Delete
async function delete${entityName}(id: string) {
  const res = await fetch(\`\${API_BASE}/\${id}\`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete')
}

// Query keys
export const ${moduleName}Keys = {
  all: ['${moduleName}'] as const,
  lists: () => [...${moduleName}Keys.all, 'list'] as const,
  list: (filters?: ${entityName}Filters) => [...${moduleName}Keys.lists(), filters] as const,
  details: () => [...${moduleName}Keys.all, 'detail'] as const,
  detail: (id: string) => [...${moduleName}Keys.details(), id] as const,
}

// Hooks
export function use${entityName}s(filters?: ${entityName}Filters) {
  return useQuery({
    queryKey: ${moduleName}Keys.list(filters),
    queryFn: () => fetch${entityName}s(filters)
  })
}

export function use${entityName}(id: string) {
  return useQuery({
    queryKey: ${moduleName}Keys.detail(id),
    queryFn: () => fetch${entityName}(id),
    enabled: !!id
  })
}

export function useCreate${entityName}() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: create${entityName},
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ${moduleName}Keys.lists() })
  })
}

export function useUpdate${entityName}() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<${entityName}FormData> }) => 
      update${entityName}(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ${moduleName}Keys.detail(id) })
      queryClient.invalidateQueries({ queryKey: ${moduleName}Keys.lists() })
    }
  })
}

export function useDelete${entityName}() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: delete${entityName},
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ${moduleName}Keys.lists() })
  })
}
`,
      type: 'hook',
      description: `React Query hooks for ${moduleName}`
    }
  }

  // ===========================================================================
  // FORM COMPONENT GENERATION
  // ===========================================================================

  generateFormComponent(view: ParsedCSHTMLView, moduleName: string): GeneratedFile {
    const entityName = this.toPascalCase(moduleName)
    const fields = view.fields || []

    const formFields = fields.map(f => {
      const required = f.isRequired ? ' *' : ''
      const placeholder = f.placeholder ? ` placeholder="${f.placeholder}"` : ''
      
      if (f.inputType === 'textarea') {
        return `<div>
            <label className="text-sm font-medium">${f.label}${required}</label>
            <Textarea${placeholder} {...form.register('${f.name}')} />
          </div>`
      }
      if (f.inputType === 'checkbox') {
        return `<div className="flex items-center gap-2">
            <Checkbox {...form.register('${f.name}')} />
            <label className="text-sm">${f.label}</label>
          </div>`
      }
      if (f.inputType === 'dropdown') {
        return `<div>
            <label className="text-sm font-medium">${f.label}${required}</label>
            <Select onValueChange={(v) => form.setValue('${f.name}', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select ${f.label}" />
              </SelectTrigger>
              <SelectContent>
                {/* TODO: Load options from ${f.dropdownSource || 'API'} */}
              </SelectContent>
            </Select>
          </div>`
      }
      
      const type = f.inputType === 'email_input' ? 'email' : 
                   f.inputType === 'number_input' ? 'number' :
                   f.inputType === 'date_picker' ? 'date' : 'text'
      
      return `<div>
            <label className="text-sm font-medium">${f.label}${required}</label>
            <Input type="${type}"${placeholder} {...form.register('${f.name}')} />
          </div>`
    }).join('\n          ')

    return {
      path: `modules/${moduleName}/components/${entityName}Form.tsx`,
      content: `'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ${entityName}Schema, ${entityName}FormData } from '../schema'
import { useCreate${entityName}, useUpdate${entityName} } from '../hooks/useQueries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface ${entityName}FormProps {
  initialData?: Partial<${entityName}FormData> & { id?: string }
  onSuccess?: () => void
  onCancel?: () => void
}

export function ${entityName}Form({ initialData, onSuccess, onCancel }: ${entityName}FormProps) {
  const createMutation = useCreate${entityName}()
  const updateMutation = useUpdate${entityName}()

  const form = useForm<${entityName}FormData>({
    resolver: zodResolver(${entityName}Schema),
    defaultValues: initialData || {}
  })

  const onSubmit = async (data: ${entityName}FormData) => {
    try {
      if (initialData?.id) {
        await updateMutation.mutateAsync({ id: initialData.id, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      onSuccess?.()
    } catch (error) {
      console.error('Submit error:', error)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${formFields}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
`,
      type: 'component',
      description: `Form component for ${moduleName}`
    }
  }

  // ===========================================================================
  // LIST COMPONENT GENERATION
  // ===========================================================================

  generateListComponent(view: ParsedCSHTMLView, moduleName: string, tableName: string): GeneratedFile {
    const entityName = this.toPascalCase(moduleName)
    const displayFields = (view.fields || []).slice(0, 5)

    return {
      path: `modules/${moduleName}/components/${entityName}List.tsx`,
      content: `'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { use${entityName}s, useDelete${entityName} } from '../hooks/useQueries'
import { ${entityName} } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'

export function ${entityName}List() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const { data, isLoading } = use${entityName}s({ search })
  const deleteMutation = useDelete${entityName}()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>${entityName}s</CardTitle>
        <Button onClick={() => router.push('/${moduleName}/new')}>
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              ${displayFields.map(f => `<TableHead>${f.label}</TableHead>`).join('\n              ')}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={${displayFields.length + 1}}>Loading...</TableCell></TableRow>
            ) : !data?.data?.length ? (
              <TableRow><TableCell colSpan={${displayFields.length + 1}}>No records</TableCell></TableRow>
            ) : (
              data.data.map((item: ${entityName}) => (
                <TableRow key={item.id}>
                  ${displayFields.map(f => `<TableCell>{item.${f.name}}</TableCell>`).join('\n                  ')}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => router.push(\`/${moduleName}/\${item.id}\`)}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(\`/${moduleName}/\${item.id}/edit\`)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
`,
      type: 'component',
      description: `List component for ${moduleName}`
    }
  }

  // ===========================================================================
  // DETAIL COMPONENT GENERATION
  // ===========================================================================

  generateDetailComponent(view: ParsedCSHTMLView, moduleName: string): GeneratedFile {
    const entityName = this.toPascalCase(moduleName)
    const fields = view.fields || []

    return {
      path: `modules/${moduleName}/components/${entityName}Detail.tsx`,
      content: `'use client'

import { use${entityName} } from '../hooks/useQueries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ${entityName}DetailProps {
  id: string
}

export function ${entityName}Detail({ id }: ${entityName}DetailProps) {
  const router = useRouter()
  const { data: item, isLoading } = use${entityName}(id)

  if (isLoading) return <div>Loading...</div>
  if (!item) return <div>Not found</div>

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <CardTitle>Details</CardTitle>
        </div>
        <Button onClick={() => router.push(\`/${moduleName}/\${id}/edit\`)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${fields.map(f => `<div>
            <dt className="text-sm font-medium text-muted-foreground">${f.label}</dt>
            <dd className="text-sm mt-1">{item.${f.name}}</dd>
          </div>`).join('\n          ')}
        </dl>
      </CardContent>
    </Card>
  )
}
`,
      type: 'component',
      description: `Detail component for ${moduleName}`
    }
  }

  // ===========================================================================
  // CASCADE SELECT GENERATION
  // ===========================================================================

  generateCascadingSelect(view: ParsedCSHTMLView, moduleName: string): GeneratedFile {
    const cascades = view.cascadingDropdowns || []

    return {
      path: `modules/${moduleName}/components/CascadingSelect.tsx`,
      content: `'use client'

import { useQuery } from '@tanstack/react-query'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState, useEffect } from 'react'

// Cascading config from CSHTML analysis
const CASCADE_CONFIG = {
  ${cascades.map(c => `"${c.parentField}": {
    childField: "${c.childField}",
    endpoint: "${c.ajaxEndpoint}"
  }`).join(',\n  ')}
}

interface CascadingSelectProps {
  parentName: string
  childName: string
  parentValue?: string
  childValue?: string
  onParentChange: (value: string) => void
  onChildChange: (value: string) => void
  parentLabel?: string
  childLabel?: string
}

export function CascadingSelect({
  parentName, childName, parentValue, childValue,
  onParentChange, onChildChange, parentLabel, childLabel
}: CascadingSelectProps) {
  const { data: childOptions, isLoading } = useQuery({
    queryKey: [childName, parentValue],
    queryFn: async () => {
      if (!parentValue) return []
      const config = CASCADE_CONFIG[parentName as keyof typeof CASCADE_CONFIG]
      if (!config) return []
      const res = await fetch(\`\${config.endpoint}?\${parentName}=\${parentValue}\`)
      return res.json()
    },
    enabled: !!parentValue
  })

  useEffect(() => {
    if (parentValue) onChildChange('')
  }, [parentValue])

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-medium">{parentLabel || parentName}</label>
        <Select value={parentValue} onValueChange={onParentChange}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {/* Load parent options */}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">{childLabel || childName}</label>
        <Select value={childValue} onValueChange={onChildChange} disabled={!parentValue || isLoading}>
          <SelectTrigger><SelectValue placeholder={isLoading ? "Loading..." : "Select"} /></SelectTrigger>
          <SelectContent>
            {childOptions?.map((opt: any) => (
              <SelectItem key={opt.id || opt.value} value={opt.id || opt.value}>
                {opt.name || opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
`,
      type: 'component',
      description: `Cascading select for ${moduleName}`
    }
  }

  // ===========================================================================
  // API ROUTE GENERATION
  // ===========================================================================

  generateAPIRoutes(view: ParsedCSHTMLView, moduleName: string, tableName: string): GeneratedFile[] {
    const entityName = this.toPascalCase(moduleName)

    const mainRoute: GeneratedFile = {
      path: `app/api/${moduleName}/route.ts`,
      content: `import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ${entityName}Schema } from '@/modules/${moduleName}/schema'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''

    const where = search ? {
      OR: [
        { name: { contains: search } }
      ]
    } : {}

    const [data, total] = await Promise.all([
      prisma.${tableName}.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.${tableName}.count({ where })
    ])

    return NextResponse.json({ data, total, page, pageSize })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = ${entityName}Schema.parse(body)
    const item = await prisma.${tableName}.create({ data })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
`,
      type: 'api',
      description: `CRUD API for ${moduleName}`
    }

    const itemRoute: GeneratedFile = {
      path: `app/api/${moduleName}/[id]/route.ts`,
      content: `import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ${entityName}Schema } from '@/modules/${moduleName}/schema'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.${tableName}.findUnique({
      where: { id: params.id }
    })
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = ${entityName}Schema.partial().parse(body)
    const item = await prisma.${tableName}.update({
      where: { id: params.id },
      data
    })
    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.${tableName}.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
`,
      type: 'api',
      description: `Single item API for ${moduleName}`
    }

    return [mainRoute, itemRoute]
  }

  // ===========================================================================
  // PAGE GENERATION
  // ===========================================================================

  generatePages(view: ParsedCSHTMLView, moduleName: string): GeneratedFile[] {
    const entityName = this.toPascalCase(moduleName)

    return [
      {
        path: `app/${moduleName}/page.tsx`,
        content: `import { ${entityName}List } from '@/modules/${moduleName}/components/${entityName}List'

export default function ${entityName}ListPage() {
  return <${entityName}List />
}
`,
        type: 'page',
        description: `List page for ${moduleName}`
      },
      {
        path: `app/${moduleName}/new/page.tsx`,
        content: `'use client'

import { ${entityName}Form } from '@/modules/${moduleName}/components/${entityName}Form'
import { useRouter } from 'next/navigation'

export default function New${entityName}Page() {
  const router = useRouter()
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Create ${entityName}</h1>
      <${entityName}Form 
        onSuccess={() => router.push('/${moduleName}')}
        onCancel={() => router.back()}
      />
    </div>
  )
}
`,
        type: 'page',
        description: `Create page for ${moduleName}`
      },
      {
        path: `app/${moduleName}/[id]/page.tsx`,
        content: `'use client'

import { ${entityName}Detail } from '@/modules/${moduleName}/components/${entityName}Detail'
import { use } from 'react'

export default function ${entityName}DetailPage({ params }: { params: { id: string } }) {
  const { id } = use(params)
  return <${entityName}Detail id={id} />
}
`,
        type: 'page',
        description: `Detail page for ${moduleName}`
      },
      {
        path: `app/${moduleName}/[id]/edit/page.tsx`,
        content: `'use client'

import { ${entityName}Form } from '@/modules/${moduleName}/components/${entityName}Form'
import { use${entityName} } from '@/modules/${moduleName}/hooks/useQueries'
import { useRouter, use } from 'next/navigation'

export default function Edit${entityName}Page({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = use(params)
  const { data: initialData } = use${entityName}(id)

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Edit ${entityName}</h1>
      <${entityName}Form 
        initialData={initialData}
        onSuccess={() => router.push('/${moduleName}')}
        onCancel={() => router.back()}
      />
    </div>
  )
}
`,
        type: 'page',
        description: `Edit page for ${moduleName}`
      }
    ]
  }

  // ===========================================================================
  // PRISMA SCHEMA GENERATION
  // ===========================================================================

  generatePrismaSchema(tables: TableDef[]): GeneratedFile {
    const models = tables.map(t => this.tableToPrismaModel(t)).join('\n\n')

    return {
      path: 'prisma/schema.prisma',
      content: `// Auto-generated Prisma schema
// Generated: ${new Date().toISOString()}

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

${models}
`,
      type: 'config',
      description: 'Prisma database schema'
    }
  }

  private tableToPrismaModel(table: TableDef): string {
    const columns = table.columns.map(c => {
      let type = 'String'
      switch (c.dataType?.toUpperCase()) {
        case 'INT': case 'INTEGER': case 'BIGINT': type = 'Int'; break
        case 'DECIMAL': case 'MONEY': case 'FLOAT': type = 'Float'; break
        case 'BIT': case 'BOOLEAN': type = 'Boolean'; break
        case 'DATE': case 'DATETIME': type = 'DateTime'; break
      }
      const nullable = c.isNullable ? '?' : ''
      const unique = c.isUnique ? ' @unique' : ''
      return `  ${c.name}  ${type}${nullable}${unique}`
    }).join('\n')

    const fks = (table.foreignKeys || []).map(fk => 
      `  ${fk.columnName}  String
  ${fk.columnName.replace(/Id$/i, '')}  ${fk.referencesTable} @relation(fields: [${fk.columnName}], references: [${fk.referencesColumn}])`
    ).join('\n')

    return `model ${table.tableName} {
  id        String   @id @default(cuid())
${columns}
${fks}
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('')
  }
}

// Factory function
export function createCodeGenerator(options: CodeGeneratorOptions): CodeGenerator {
  return new CodeGenerator(options)
}
