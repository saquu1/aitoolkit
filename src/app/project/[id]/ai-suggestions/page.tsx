'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { 
  ArrowLeft, Bot, CheckCircle, XCircle, AlertTriangle, 
  Clock, Play, RotateCcw, Eye, ChevronDown, ChevronUp,
  Filter, CheckSquare, XSquare, Loader2
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

// =============================================================================
// TYPES
// =============================================================================

interface AISuggestion {
  id: string
  targetType: string
  targetEntity: string
  targetField: string | null
  currentValue: any
  suggestedValue: any
  aiConfidence: number
  aiReason: string | null
  aiEvidence: string[]
  riskLevel: string
  changeCategory: string
  status: string
  createdAt: string
}

interface AISession {
  id: string
  scope: string
  status: string
  totalSuggestions: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  appliedCount: number
  createdAt: string
  completedAt: string | null
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AISuggestionsPage() {
  const params = useParams()
  const router = useRouter()
  const { colors } = useTheme()
  const projectId = params.id as string

  const [sessions, setSessions] = useState<AISession[]>([])
  const [selectedSession, setSelectedSession] = useState<AISession | null>(null)
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai-suggestions?projectId=${projectId}`)
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // Fetch suggestions for selected session
  const fetchSuggestions = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/ai-suggestions?sessionId=${sessionId}&status=${filter === 'all' ? '' : filter}`)
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('Failed to fetch suggestions:', err)
    }
  }, [filter])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    if (selectedSession) {
      fetchSuggestions(selectedSession.id)
    }
  }, [selectedSession, filter, fetchSuggestions])

  // Handle approve
  const handleApprove = async (suggestionId: string) => {
    setProcessing(suggestionId)
    try {
      const res = await fetch(`/api/ai-suggestions/${suggestionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', decisionBy: 'user' })
      })
      const data = await res.json()
      if (data.success) {
        await fetchSuggestions(selectedSession!.id)
        await fetchSessions()
      }
    } catch (err) {
      console.error('Failed to approve:', err)
    } finally {
      setProcessing(null)
    }
  }

  // Handle reject
  const handleReject = async (suggestionId: string) => {
    setProcessing(suggestionId)
    try {
      const res = await fetch(`/api/ai-suggestions/${suggestionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', decisionBy: 'user' })
      })
      const data = await res.json()
      if (data.success) {
        await fetchSuggestions(selectedSession!.id)
        await fetchSessions()
      }
    } catch (err) {
      console.error('Failed to reject:', err)
    } finally {
      setProcessing(null)
    }
  }

  // Handle apply
  const handleApply = async (suggestionId: string) => {
    setProcessing(suggestionId)
    try {
      const res = await fetch(`/api/ai-suggestions/${suggestionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', appliedBy: 'user' })
      })
      const data = await res.json()
      if (data.success) {
        await fetchSuggestions(selectedSession!.id)
        await fetchSessions()
      }
    } catch (err) {
      console.error('Failed to apply:', err)
    } finally {
      setProcessing(null)
    }
  }

  // Handle revert
  const handleRevert = async (suggestionId: string) => {
    setProcessing(suggestionId)
    try {
      const res = await fetch(`/api/ai-suggestions/${suggestionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revert', appliedBy: 'user' })
      })
      const data = await res.json()
      if (data.success) {
        await fetchSuggestions(selectedSession!.id)
        await fetchSessions()
      }
    } catch (err) {
      console.error('Failed to revert:', err)
    } finally {
      setProcessing(null)
    }
  }

  // Batch approve all pending
  const handleApproveAll = async () => {
    if (!selectedSession) return
    setProcessing('batch')
    try {
      const res = await fetch('/api/ai-suggestions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'approve_all', 
          sessionIds: [selectedSession.id],
          decisionBy: 'user'
        })
      })
      const data = await res.json()
      if (data.success) {
        await fetchSuggestions(selectedSession.id)
        await fetchSessions()
      }
    } catch (err) {
      console.error('Failed to approve all:', err)
    } finally {
      setProcessing(null)
    }
  }

  // Get risk color
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return '#dc2626'
      case 'high': return '#ea580c'
      case 'medium': return '#ca8a04'
      default: return '#16a34a'
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      pending: { bg: '#fef3c7', color: '#92400e' },
      approved: { bg: '#dcfce7', color: '#166534' },
      rejected: { bg: '#fee2e2', color: '#991b1b' },
      applied: { bg: '#dbeafe', color: '#1e40af' },
      reverted: { bg: '#f3e8ff', color: '#6b21a8' }
    }
    const style = styles[status] || styles.pending
    return (
      <span style={{ 
        backgroundColor: style.bg, 
        color: style.color,
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500
      }}>
        {status.toUpperCase()}
      </span>
    )
  }

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return '#16a34a'
    if (confidence >= 70) return '#ca8a04'
    return '#dc2626'
  }

  // Get confidence indicator
  const getConfidenceIndicator = (confidence: number) => {
    if (confidence >= 90) return '🟢'
    if (confidence >= 70) return '🟡'
    return '🔴'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push(`/project/${projectId}`)} 
                className="p-2 rounded-lg hover:opacity-80"
                style={{ color: colors.textMuted }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <Bot className="w-6 h-6" style={{ color: colors.primary }} />
                <h1 className="text-xl font-bold" style={{ color: colors.text }}>AI Suggestion Queue</h1>
              </div>
            </div>
            
            {selectedSession && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="px-3 py-1.5 text-sm rounded-lg"
                  style={{ backgroundColor: colors.border, color: colors.text }}
                >
                  ← Back to Sessions
                </button>
                {selectedSession.pendingCount > 0 && (
                  <button
                    onClick={handleApproveAll}
                    disabled={processing === 'batch'}
                    className="flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg text-white"
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    {processing === 'batch' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckSquare className="w-4 h-4" />
                    )}
                    Approve All ({selectedSession.pendingCount})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {!selectedSession ? (
          // Sessions List
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
              Analysis Sessions ({sessions.length})
            </h2>
            
            {sessions.length === 0 ? (
              <div className="text-center py-12 rounded-xl border-2 border-dashed" style={{ borderColor: colors.border }}>
                <Bot className="w-12 h-12 mx-auto mb-3" style={{ color: colors.textMuted }} />
                <p style={{ color: colors.textMuted }}>No AI analysis sessions yet</p>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  Click "AI Help" on any field or entity to start an analysis
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className="p-4 rounded-xl border cursor-pointer hover:border-opacity-60 transition-colors"
                    style={{ 
                      backgroundColor: colors.card, 
                      borderColor: colors.border 
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium" style={{ color: colors.text }}>
                            {session.scope === 'filtered' ? 'Low Confidence Review' : 
                             session.scope === 'project' ? 'Full Project Analysis' :
                             session.scope === 'entity' ? 'Entity Analysis' : 'Field Analysis'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded" 
                            style={{ backgroundColor: colors.border, color: colors.textMuted }}>
                            {session.status}
                          </span>
                        </div>
                        <div className="text-sm mt-1" style={{ color: colors.textMuted }}>
                          {new Date(session.createdAt).toLocaleString()} • 
                          {session.totalSuggestions} suggestions
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm">
                        {session.pendingCount > 0 && (
                          <span style={{ color: '#ca8a04' }}>
                            <Clock className="w-4 h-4 inline mr-1" />
                            {session.pendingCount} pending
                          </span>
                        )}
                        {session.approvedCount > 0 && (
                          <span style={{ color: '#16a34a' }}>
                            <CheckCircle className="w-4 h-4 inline mr-1" />
                            {session.approvedCount} approved
                          </span>
                        )}
                        {session.rejectedCount > 0 && (
                          <span style={{ color: '#dc2626' }}>
                            <XCircle className="w-4 h-4 inline mr-1" />
                            {session.rejectedCount} rejected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Suggestions List
          <div>
            {/* Filter Bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" style={{ color: colors.textMuted }} />
                {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-3 py-1 text-sm rounded-lg capitalize"
                    style={{ 
                      backgroundColor: filter === f ? colors.primary : colors.border,
                      color: filter === f ? '#fff' : colors.text
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
              
              <div className="text-sm" style={{ color: colors.textMuted }}>
                {suggestions.length} suggestions
              </div>
            </div>

            {/* Suggestions */}
            <div className="space-y-3">
              {suggestions.map(suggestion => (
                <div
                  key={suggestion.id}
                  className="rounded-xl border overflow-hidden"
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                  {/* Header */}
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedSuggestion(
                      expandedSuggestion === suggestion.id ? null : suggestion.id
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getRiskColor(suggestion.riskLevel) }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium" style={{ color: colors.text }}>
                              {suggestion.targetEntity}
                              {suggestion.targetField && `.${suggestion.targetField}`}
                            </span>
                            {getStatusBadge(suggestion.status)}
                          </div>
                          <div className="text-sm" style={{ color: colors.textMuted }}>
                            {suggestion.changeCategory.replace(/_/g, ' ')} • 
                            <span style={{ color: getConfidenceColor(suggestion.aiConfidence) }}>
                              {getConfidenceIndicator(suggestion.aiConfidence)} {suggestion.aiConfidence}% confidence
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {suggestion.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApprove(suggestion.id); }}
                              disabled={processing === suggestion.id}
                              className="p-2 rounded-lg hover:opacity-80"
                              style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                            >
                              {processing === suggestion.id ? 
                                <Loader2 className="w-4 h-4 animate-spin" /> : 
                                <CheckCircle className="w-4 h-4" />
                              }
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReject(suggestion.id); }}
                              disabled={processing === suggestion.id}
                              className="p-2 rounded-lg hover:opacity-80"
                              style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        {suggestion.status === 'approved' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApply(suggestion.id); }}
                            disabled={processing === suggestion.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg text-white"
                            style={{ backgroundColor: '#1e40af' }}
                          >
                            {processing === suggestion.id ? 
                              <Loader2 className="w-4 h-4 animate-spin" /> : 
                              <Play className="w-4 h-4" />
                            }
                            Apply
                          </button>
                        )}
                        
                        {suggestion.status === 'applied' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRevert(suggestion.id); }}
                            disabled={processing === suggestion.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg"
                            style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}
                          >
                            {processing === suggestion.id ? 
                              <Loader2 className="w-4 h-4 animate-spin" /> : 
                              <RotateCcw className="w-4 h-4" />
                            }
                            Revert
                          </button>
                        )}
                        
                        {expandedSuggestion === suggestion.id ? 
                          <ChevronUp className="w-5 h-5" style={{ color: colors.textMuted }} /> :
                          <ChevronDown className="w-5 h-5" style={{ color: colors.textMuted }} />
                        }
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedSuggestion === suggestion.id && (
                    <div className="border-t px-4 py-3" style={{ borderColor: colors.border }}>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Current Value */}
                        <div>
                          <h4 className="text-sm font-medium mb-2" style={{ color: colors.textMuted }}>
                            Current Value
                          </h4>
                          <div 
                            className="p-3 rounded-lg text-sm font-mono"
                            style={{ backgroundColor: colors.bg }}
                          >
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(suggestion.currentValue, null, 2)}
                            </pre>
                          </div>
                        </div>
                        
                        {/* Suggested Value */}
                        <div>
                          <h4 className="text-sm font-medium mb-2" style={{ color: colors.textMuted }}>
                            AI Suggestion
                          </h4>
                          <div 
                            className="p-3 rounded-lg text-sm font-mono"
                            style={{ backgroundColor: '#dcfce7' }}
                          >
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(suggestion.suggestedValue, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                      
                      {/* AI Reason */}
                      {suggestion.aiReason && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2" style={{ color: colors.textMuted }}>
                            AI Reasoning
                          </h4>
                          <p className="text-sm" style={{ color: colors.text }}>
                            {suggestion.aiReason}
                          </p>
                        </div>
                      )}
                      
                      {/* Evidence */}
                      {suggestion.aiEvidence?.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2" style={{ color: colors.textMuted }}>
                            Evidence
                          </h4>
                          <ul className="text-sm space-y-1">
                            {suggestion.aiEvidence.map((ev, i) => (
                              <li key={i} style={{ color: colors.text }}>
                                • {ev}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {suggestions.length === 0 && (
                <div className="text-center py-8" style={{ color: colors.textMuted }}>
                  No suggestions match the current filter
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
