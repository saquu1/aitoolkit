'use client'

import { useState } from 'react'
import { HelpCircle, X, Sparkles, MessageSquare, Code, Database, FileText } from 'lucide-react'

interface AIHelpButtonProps {
  context?: string
  onHelp?: (query: string) => void
}

interface HelpSuggestion {
  id: string
  title: string
  description: string
  category: 'schema' | 'api' | 'ui' | 'general'
}

export function AIHelpButton({ context = 'general', onHelp }: AIHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState('')
  const [suggestions] = useState<HelpSuggestion[]>([])

  const contextSuggestions: Record<string, HelpSuggestion[]> = {
    schema: [
      { id: '1', title: 'Generate Table Schema', description: 'Create SQL DDL for a new table', category: 'schema' },
      { id: '2', title: 'Add Foreign Keys', description: 'Define relationships between tables', category: 'schema' },
      { id: '3', title: 'Create Indexes', description: 'Optimize query performance', category: 'schema' },
    ],
    api: [
      { id: '4', title: 'Generate CRUD API', description: 'Create RESTful endpoints for a table', category: 'api' },
      { id: '5', title: 'Add Validation', description: 'Implement request validation with Zod', category: 'api' },
      { id: '6', title: 'Create API Tests', description: 'Generate test cases for API', category: 'api' },
    ],
    ui: [
      { id: '7', title: 'Generate Form Component', description: 'Create a React form with validation', category: 'ui' },
      { id: '8', title: 'Create Table Component', description: 'Build a data table with sorting/filtering', category: 'ui' },
      { id: '9', title: 'Add Detail View', description: 'Create a detail page for records', category: 'ui' },
    ],
    general: [
      { id: '10', title: 'Explain Feature', description: 'Get detailed explanation of a feature', category: 'general' },
      { id: '11', title: 'Best Practices', description: 'Learn recommended patterns', category: 'general' },
      { id: '12', title: 'Code Examples', description: 'See example implementations', category: 'general' },
    ]
  }

  const handleSuggestionClick = async (suggestion: HelpSuggestion) => {
    setQuery(suggestion.title)
    await handleAsk()
  }

  const handleAsk = async () => {
    if (!query.trim()) return
    
    setIsLoading(true)
    setResponse('')
    
    try {
      const res = await fetch('/api/ai-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'help',
          context,
          query
        })
      })
      
      const data = await res.json()
      setResponse(data.response || data.message || 'No response generated')
    } catch (error) {
      setResponse('Failed to get AI assistance. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
        title="AI Help"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">AI Help Assistant</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-140px)]">
          {/* Quick Suggestions */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Quick Suggestions</h4>
            <div className="flex flex-wrap gap-2">
              {(contextSuggestions[context] || contextSuggestions.general).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSuggestionClick(s)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors flex items-center gap-1"
                >
                  {s.category === 'schema' && <Database className="w-3 h-3" />}
                  {s.category === 'api' && <Code className="w-3 h-3" />}
                  {s.category === 'ui' && <FileText className="w-3 h-3" />}
                  {s.category === 'general' && <MessageSquare className="w-3 h-3" />}
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* Query Input */}
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="Ask a question about schema, API, or UI..."
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleAsk}
                disabled={isLoading || !query.trim()}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Thinking...' : 'Ask'}
              </button>
            </div>
          </div>

          {/* Response */}
          {response && (
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-slate-200 text-sm">{response}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <p className="text-xs text-slate-400 text-center">
            AI responses are generated and may require verification
          </p>
        </div>
      </div>
    </div>
  )
}
