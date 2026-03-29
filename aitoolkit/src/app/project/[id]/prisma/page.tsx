'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { Layers, Loader2, Download, Copy, Check, RefreshCw } from 'lucide-react'

export default function PrismaPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [tables, setTables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [prismaSchema, setPrismaSchema] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchTables()
  }, [projectId])

  const fetchTables = async () => {
    try {
      const response = await fetch(`/api/project-status?projectId=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setTables(data.tables || [])
      }
    } catch (error) {
      console.error('Error fetching tables:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePrismaSchema = () => {
    if (tables.length === 0) return

    setGenerating(true)

    // Generate Prisma schema from tables
    let schema = `// Generated Prisma Schema\n`
    schema += `// Project: ${projectId}\n`
    schema += `// Generated at: ${new Date().toISOString()}\n\n`
    schema += `generator client {\n  provider = "prisma-client-js"\n}\n\n`
    schema += `datasource db {\n  provider = "sqlite"\n  url      = env("DATABASE_URL")\n}\n\n`

    tables.forEach(table => {
      schema += `model ${table.tableName} {\n`

      // Add columns
      const columns = table.columns || []
      columns.forEach((col: any) => {
        const prismaType = mapToPrismaType(col.type)
        const nullable = col.nullable ? '?' : ''
        const isPrimary = table.primaryKey === col.name || col.isPrimaryKey

        if (isPrimary) {
          schema += `  ${col.name} ${prismaType} @id @default(cuid())\n`
        } else {
          schema += `  ${col.name} ${prismaType}${nullable}\n`
        }
      })

      // Add foreign keys
      if (table.foreignKeys && table.foreignKeys.length > 0) {
        schema += `\n  // Relations\n`
        table.foreignKeys.forEach((fk: any) => {
          schema += `  // ${fk.column} -> ${fk.referencedTable || fk.references}\n`
        })
      }

      schema += `}\n\n`
    })

    setPrismaSchema(schema)
    setGenerating(false)
  }

  const mapToPrismaType = (sqlType: string): string => {
    const type = sqlType?.toLowerCase() || 'string'
    if (type.includes('int')) return 'Int'
    if (type.includes('decimal') || type.includes('float') || type.includes('double') || type.includes('numeric')) return 'Float'
    if (type.includes('bool') || type.includes('bit')) return 'Boolean'
    if (type.includes('date') || type.includes('time')) return 'DateTime'
    if (type.includes('text') || type.includes('char') || type.includes('varchar')) return 'String'
    if (type.includes('binary') || type.includes('image')) return 'Bytes'
    if (type.includes('json')) return 'Json'
    return 'String'
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prismaSchema)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadSchema = () => {
    const blob = new Blob([prismaSchema], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'schema.prisma'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Layers className="w-6 h-6" style={{ color: '#8b5cf6' }} />
              <h1 className="text-xl font-bold" style={{ color: colors.text }}>Prisma Schema</h1>
            </div>
            {tables.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={generatePrismaSchema}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg"
                  style={{ backgroundColor: colors.primary, color: '#fff' }}
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Generate
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
          </div>
        ) : tables.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
            <p style={{ color: colors.textMuted }}>No tables available to generate schema</p>
            <button
              onClick={() => router.push(`/project/${projectId}/upload`)}
              className="mt-4 px-4 py-2 rounded-lg"
              style={{ backgroundColor: colors.primary, color: '#fff' }}
            >
              Upload SQL Files
            </button>
          </div>
        ) : prismaSchema ? (
          <div className="space-y-4">
            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={downloadSchema}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border"
                style={{ borderColor: colors.border, color: colors.text }}
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>

            {/* Schema Preview */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: colors.border }}>
              <div className="px-4 py-2 border-b flex items-center justify-between" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
                <span className="text-sm font-medium" style={{ color: colors.text }}>schema.prisma</span>
                <span className="text-xs" style={{ color: colors.textMuted }}>{tables.length} models</span>
              </div>
              <pre className="p-4 overflow-auto text-sm" style={{ backgroundColor: colors.bg, color: colors.text, maxHeight: '60vh' }}>
                {prismaSchema}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 mx-auto mb-4" style={{ color: colors.textMuted }} />
            <p style={{ color: colors.textMuted }}>Click "Generate" to create Prisma schema from {tables.length} tables</p>
          </div>
        )}
      </div>
    </div>
  )
}
