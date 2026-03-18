// =============================================================================
// PDF Export Utilities for Documentation
// =============================================================================

/**
 * Generate PDF from markdown content via API
 */
export async function exportMarkdownAsPDF(
  content: string,
  title: string,
  filename: string = 'document.pdf'
): Promise<void> {
  try {
    const response = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title, filename })
    })
    
    if (!response.ok) {
      throw new Error('PDF generation failed')
    }
    
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('PDF export failed:', error)
    throw error
  }
}

/**
 * Export Prisma schema as a formatted file
 */
export function exportPrismaSchema(content: string, filename: string = 'schema.prisma'): void {
  const blob = new Blob([content], { type: 'text/prisma' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Export markdown documentation
 */
export function exportMarkdown(content: string, filename: string = 'documentation.md'): void {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Export UAT test cases as markdown
 */
export function exportUATCases(content: string, filename: string = 'uat-test-cases.md'): void {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Get file extension based on export type
 */
export function getExportExtension(type: 'prisma' | 'erd' | 'docs' | 'uat' | 'flow', format: 'native' | 'pdf' | 'svg' | 'png' = 'native'): string {
  if (format === 'pdf') return 'pdf'
  if (format === 'svg') return 'svg'
  if (format === 'png') return 'png'
  
  switch (type) {
    case 'prisma': return 'prisma'
    case 'erd':
    case 'flow': return 'svg' // Default to SVG for diagrams
    case 'docs':
    case 'uat': return 'md'
    default: return 'txt'
  }
}
