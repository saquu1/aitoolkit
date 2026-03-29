/**
 * Export Hub Service
 * Unified export interface for all generated artifacts
 * 
 * TASK-4.7: Export Hub
 * Part of Phase 4: Features & User Experience
 */

// Types
export type ExportFormat = 'json' | 'yaml' | 'csv' | 'markdown' | 'txt' | 'zip' | 'sql' | 'prisma' | 'typescript' | 'html'

export interface ExportOption {
  format: ExportFormat
  filename?: string
  includeTimestamp?: boolean
  includeMetadata?: boolean
}

export interface ExportResult {
  success: boolean
  data?: string | Blob
  filename?: string
  format: ExportFormat
  size?: number
  downloadUrl?: string
  error?: string
}

export interface ExportPackage {
  id: string
  name: string
  description: string
  files: ExportFile[]
  createdAt: Date
}

export interface ExportFile {
  id: string
  name: string
  type: 'prisma' | 'typescript' | 'json' | 'sql' | 'markdown' | 'html' | 'yaml'
  content: string
  size: number
  createdAt: Date
  projectId?: string
}

/**
 * Export Hub Service
 */
export class ExportHub {
  /**
   * Export to JSON
   */
  exportToJSON(data: any, pretty: boolean = true): string {
    return JSON.stringify(data, null, pretty ? 2 : 0)
  }

  /**
   * Export to YAML
   */
  exportToYAML(data: any): string {
    return this.objectToYAML(data, 0)
  }

  /**
   * Export to CSV
   */
  exportToCSV(data: any[]): string {
    if (!Array.isArray(data)) {
      data = [data]
    }
    
    if (data.length === 0) return ''
    
    const headers = Object.keys(data[0] || {}).join(',')
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'object' ? JSON.stringify(val) : val ?? ''
      ).join(',')
    )
    
    return headers + '\n' + rows.join('\n')
  }

  /**
   * Export to Markdown
   */
  exportToMarkdown(data: any, title?: string): string {
    if (typeof data === 'string') return data
    
    if (Array.isArray(data)) {
      return this.arrayToMarkdownTable(data, title)
    }
    
    if (typeof data === 'object') {
      return this.objectToMarkdown(data, title)
    }
    
    return String(data)
  }

  /**
   * Export to SQL
   */
  exportToSQL(data: any, tableName: string): string {
    if (typeof data === 'string') return data
    
    if (Array.isArray(data)) {
      return this.arrayToInsertStatements(data, tableName)
    }
    
    return String(data)
  }

  /**
   * Export to HTML
   */
  exportToHTML(data: any, title?: string): string {
    if (typeof data === 'string') return data
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title || 'Export'}</title>
  <style>
    body { font-family: sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  ${typeof data === 'object' ? this.objectToHTMLTable(data) : data}
</body>
</html>`
    return html
  }

  /**
   * Create export package
   */
  createPackage(
    files: ExportFile[],
    options?: { name?: string; description?: string }
  ): ExportPackage {
    const id = `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const pkg: ExportPackage = {
      id,
      name: options?.name || 'Export Package',
      description: options?.description || 'Generated export',
      files: files.map(f => ({
        ...f,
        id: f.id || `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date()
      })),
      createdAt: new Date()
    }
    
    return pkg
  }

  /**
   * Export package as ZIP
   */
  async exportPackageAsZip(pkg: ExportPackage): Promise<Blob> {
    // Simple concatenation fallback
    const parts: string[] = []
    pkg.files.forEach(f => {
      parts.push(`-- ${f.name} --\n${f.content}`)
    })
    return new Blob([parts.join('\n\n\n')], { type: 'application/zip' })
  }

  /**
   * Generate download URL
   */
  generateDownloadUrl(blob: Blob, filename: string): string {
    const url = URL.createObjectURL(blob)
    return url
  }

  // Helper methods
  private objectToYAML(obj: any, indent: number): string {
    const spaces = '  '.repeat(indent)
    let yaml = ''
    
    if (obj === null) return 'null'
    if (obj === undefined) return ''
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        yaml += `${spaces}- ${this.objectToYAML(item, indent + 1)}\n`
      }
      return yaml
    }
    
    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          yaml += `${spaces}${key}:\n${this.objectToYAML(value, indent + 1)}`
        } else {
          yaml += `${spaces}${key}: ${value}\n`
        }
      }
      return yaml
    }
    
    return String(obj)
  }

  private objectToMarkdown(obj: any, title?: string, indent: number = 0): string {
    const prefix = '  '.repeat(indent)
    let md = ''
    
    if (title) {
      md += `# ${title}\n\n`
    }
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        md += `${prefix}${key}:\n${this.objectToMarkdown(value, undefined, indent + 1)}\n`
      } else {
        md += `${prefix}${key}: ${value}\n`
      }
    }
    
    return md
  }

  private arrayToMarkdownTable(arr: any[], title?: string): string {
    if (arr.length === 0) return ''
    
    const headers = Object.keys(arr[0])
    let md = `| ${headers.join(' | ')} |\n`
    md += `| ${headers.map(() => '---').join(' | ')} |\n`
    
    for (const row of arr) {
      md += `| ${Object.values(row).map(v => 
        typeof v === 'object' ? JSON.stringify(v) : v ?? ''
      ).join(' | ')} |\n`
    }
    
    return `# ${title || 'Data'}\n\n${md}`
  }

  private arrayToInsertStatements(data: any[], tableName: string): string {
    return data.map(row => {
      const columns = Object.keys(row).join(', ')
      const values = Object.values(row).map(v => {
        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`
        if (v === null) return 'NULL'
        return v
      }).join(', ')
      return `INSERT INTO ${tableName} (${columns}) VALUES (${values});`
    }).join('\n')
  }

  private objectToHTMLTable(obj: any): string {
    if (Array.isArray(obj)) {
      const headers = Object.keys(obj[0] || {})
      return `
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${obj.map(row => `<tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      `
    }
    
    return `<pre>${JSON.stringify(obj, null, 2)}</pre>`
  }
}

// Export singleton
export const exportHub = new ExportHub()

// Convenience exports
export function createExportPackage(files: ExportFile[]): ExportPackage {
  return exportHub.createPackage(files)
}

export function exportToFile(data: any, format: ExportFormat, filename: string): ExportResult {
  const hub = new ExportHub()
  let exported: string
  
  switch (format) {
    case 'json':
      exported = hub.exportToJSON(data)
      break
    case 'yaml':
      exported = hub.exportToYAML(data)
      break
    case 'csv':
      exported = hub.exportToCSV(Array.isArray(data) ? data : [data])
      break
    case 'markdown':
      exported = hub.exportToMarkdown(data)
      break
    case 'html':
      exported = hub.exportToHTML(data)
      break
    case 'sql':
      exported = hub.exportToSQL(data, 'table')
      break
    default:
      exported = hub.exportToJSON(data)
  }
  
  const blob = new Blob([exported], { type: getMimeType(format) })
  return {
    success: true,
    data: blob,
    filename,
    format,
    size: blob.size,
    downloadUrl: URL.createObjectURL(blob)
  }
}

function getMimeType(format: ExportFormat): string {
  const types: Record<string, string> = {
    json: 'application/json',
    yaml: 'text/yaml',
    csv: 'text/csv',
    markdown: 'text/markdown',
    txt: 'text/plain',
    zip: 'application/zip',
    sql: 'application/sql',
    prisma: 'text/prisma',
    typescript: 'text/typescript',
    html: 'text/html'
  }
  return types[format] || 'application/octet-stream'
}
