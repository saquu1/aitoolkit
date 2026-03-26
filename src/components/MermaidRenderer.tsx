'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

interface MermaidRendererProps {
  chart: string
  className?: string
}

export function MermaidRenderer({ chart, className = '' }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return
      
      try {
        // Initialize mermaid with dark theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          er: {
            useMaxWidth: true,
          },
          flowchart: {
            useMaxWidth: true,
          }
        })
        
        // Generate unique ID
        const id = `mermaid-${Math.random().toString(36).substring(7)}`
        
        // Render the chart
        const { svg: renderedSvg } = await mermaid.render(id, chart)
        setSvg(renderedSvg)
        setError(null)
      } catch (err: any) {
        console.error('Mermaid render error:', err)
        setError(err.message || 'Failed to render diagram')
        setSvg('')
      }
    }
    
    renderChart()
  }, [chart])

  if (error) {
    return (
      <div className={`p-4 rounded-lg bg-red-500/10 border border-red-500/30 ${className}`}>
        <p className="text-red-400 text-sm">Error rendering diagram: {error}</p>
        <pre className="mt-2 text-xs text-red-300/70 overflow-auto">{chart}</pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-pulse text-slate-400">Rendering diagram...</div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`overflow-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
