'use client'

import { useCallback } from 'react'

interface ExportRow {
  [key: string]: string | number | boolean | null | undefined
}

/**
 * Hook for exporting data as CSV files.
 * Automatically handles type conversion, escaping, and BOM for Excel compatibility.
 */
export function useExportCSV() {
  const exportCSV = useCallback((data: ExportRow[], filename: string, options?: {
    title?: string
    sheetName?: string
  }) => {
    if (!data || data.length === 0) return

    const rows: string[][] = []

    // Add title row if provided
    if (options?.title) {
      rows.push([options.title])
      rows.push([]) // empty separator row
    }

    // Extract headers
    const headers = Object.keys(data[0])
    rows.push(headers)

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header]
        if (val === null || val === undefined) return ''
        if (typeof val === 'number' || typeof val === 'boolean') return String(val)
        // Escape commas, quotes, and newlines for CSV
        const escaped = String(val).replace(/"/g, '""')
        return `"${escaped}"`
      })
      rows.push(values)
    }

    // Build CSV with BOM for Excel UTF-8 compatibility
    const bom = '\uFEFF'
    const csvContent = bom + rows.map(row => row.join(',')).join('\n')

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.csv`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  const exportJSON = useCallback((data: any, filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.json`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  return { exportCSV, exportJSON }
}
