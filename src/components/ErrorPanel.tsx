/**
 * ERROR PANEL COMPONENT
 * =====================
 * Floating debug panel that displays API errors in real-time
 *
 * Features:
 * - Always visible error indicator
 * - Expandable error list
 * - Error severity indicators
 * - Acknowledge/dismiss functionality
 * - Pattern detection hints
 * - Performance metrics
 */

'use client'

import React, { useState } from 'react'
import { useApiError, getErrorToastMessage, type ManagedError } from '@/hooks/useApiError'

// =============================================================================
// STYLES (Inline for portability)
// =============================================================================

const styles = {
  container: {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  },
  badge: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'all 0.2s ease',
    border: 'none',
  },
  panel: {
    width: '400px',
    maxHeight: '500px',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  errorList: {
    flex: 1,
    overflowY: 'auto' as const,
    maxHeight: '350px',
  },
  errorItem: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  errorItemAck: {
    opacity: 0.5,
  },
  footer: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'opacity 0.15s ease',
  },
}

// =============================================================================
// SEVERITY ICONS
// =============================================================================

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'critical': return '🚨'
    case 'error': return '❌'
    case 'warning': return '⚠️'
    case 'info': return 'ℹ️'
    default: return '❓'
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#ef4444'
    case 'error': return '#f97316'
    case 'warning': return '#eab308'
    case 'info': return '#3b82f6'
    default: return '#6b7280'
  }
}

// =============================================================================
// ERROR ITEM COMPONENT
// =============================================================================

interface ErrorItemProps {
  error: ManagedError
  onAcknowledge: (id: string) => void
  onRemove: (id: string) => void
  onSendToPattern?: (error: ManagedError) => void
}

function ErrorItem({ error, onAcknowledge, onRemove, onSendToPattern }: ErrorItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sendingToPattern, setSendingToPattern] = useState(false)
  const [sentToPattern, setSentToPattern] = useState(false)
  const toastInfo = getErrorToastMessage(error)
  const bgColor = error.acknowledged ? 'rgba(100,100,100,0.3)' : 'rgba(30,30,30,0.95)'

  // Copy full error details to clipboard
  const copyFullDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    const details = `🔐 ERROR REPORT
===============
Title: ${toastInfo.title}
Description: ${toastInfo.description}
Request ID: ${error.requestId}
Endpoint: ${error.method} ${error.endpoint}
Status: ${error.status} ${error.statusText}
Type: ${error.type}
Severity: ${error.severity}
Timestamp: ${new Date(error.timestamp).toLocaleString()}
Duration: ${error.duration ? error.duration + 'ms' : 'N/A'}
Occurrences: ${error.displayCount}
${error.hint ? `Hint: ${error.hint}` : ''}
${error.retryCount && error.retryCount > 0 ? `Retries: ${error.retryCount}` : ''}
================`

    navigator.clipboard.writeText(details).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Send error to Pattern Dashboard
  const sendToPatternDashboard = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!onSendToPattern || sentToPattern) return
    
    setSendingToPattern(true)
    try {
      await onSendToPattern(error)
      setSentToPattern(true)
      // Auto-acknowledge after sending
      onAcknowledge(error.id)
    } catch (err) {
      console.error('Failed to send to pattern dashboard:', err)
    } finally {
      setSendingToPattern(false)
    }
  }

  return (
    <div
      style={{
        ...styles.errorItem,
        backgroundColor: bgColor,
        ...(error.acknowledged ? styles.errorItemAck : {}),
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Main Error Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '18px' }}>{getSeverityIcon(error.severity)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: getSeverityColor(error.severity),
            fontWeight: 600,
            fontSize: '13px',
            marginBottom: '2px',
          }}>
            {toastInfo.title}
          </div>
          <div style={{ color: '#9ca3af', fontSize: '12px', lineHeight: 1.4 }}>
            {toastInfo.description}
          </div>
          <div style={{
            color: '#6b7280',
            fontSize: '10px',
            marginTop: '4px',
            display: 'flex',
            gap: '8px',
          }}>
            <span>{error.method} {error.endpoint.split('?')[0].split('/').slice(-2).join('/')}</span>
            {error.duration && <span>{error.duration}ms</span>}
            {error.displayCount > 1 && <span>×{error.displayCount}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {!error.acknowledged && (
            <button
              onClick={(e) => { e.stopPropagation(); onAcknowledge(error.id) }}
              style={{
                ...styles.button,
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '4px 8px',
                fontSize: '10px',
              }}
              title="Mark as acknowledged"
            >
              ✓
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(error.id) }}
            style={{
              ...styles.button,
              backgroundColor: 'transparent',
              color: '#9ca3af',
              padding: '4px 8px',
              fontSize: '10px',
            }}
            title="Remove this error"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '6px',
          fontSize: '11px',
          fontFamily: 'monospace',
        }}>
          <div style={{ color: '#9ca3af', marginBottom: '6px' }}>
            <strong>Request ID:</strong> {error.requestId}
          </div>
          <div style={{ color: '#9ca3af', marginBottom: '6px' }}>
            <strong>Endpoint:</strong> {error.endpoint}
          </div>
          <div style={{ color: '#9ca3af', marginBottom: '6px' }}>
            <strong>Status:</strong> {error.status} {error.statusText}
          </div>
          <div style={{ color: '#9ca3af', marginBottom: '6px' }}>
            <strong>Type:</strong> {error.type}
          </div>
          {error.hint && (
            <div style={{ color: '#fbbf24', marginBottom: '6px' }}>
              <strong>Hint:</strong> {error.hint}
            </div>
          )}
          {error.retryCount && error.retryCount > 0 && (
            <div style={{ color: '#f97316', marginBottom: '6px' }}>
              <strong>Retries:</strong> {error.retryCount}
            </div>
          )}
          <div style={{ color: '#6b7280', marginTop: '8px' }}>
            {new Date(error.timestamp).toLocaleTimeString()}
          </div>
          
          {/* Copy Full Detail Button */}
          <button
            onClick={copyFullDetails}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '8px 12px',
              backgroundColor: copied ? '#22c55e' : '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy Full Details'}
          </button>
          
          {/* Send to Pattern Dashboard Button */}
          {onSendToPattern && (
            <button
              onClick={sendToPatternDashboard}
              disabled={sendingToPattern || sentToPattern}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '8px 12px',
                backgroundColor: sentToPattern ? '#22c55e' : sendingToPattern ? '#6b7280' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: sentToPattern || sendingToPattern ? 'default' : 'pointer',
                fontSize: '11px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                opacity: sendingToPattern ? 0.7 : 1,
              }}
            >
              {sendingToPattern ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                  Sending...
                </>
              ) : sentToPattern ? (
                <>
                  ✓ Sent to Pattern Dashboard
                </>
              ) : (
                <>
                  📊 Send to Pattern Dashboard
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// MAIN ERROR PANEL COMPONENT
// =============================================================================

interface ErrorPanelProps {
  maxVisible?: number
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  showBadge?: boolean
}

export function ErrorPanel({
  maxVisible = 10,
  position = 'bottom-right',
  showBadge = true,
}: ErrorPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const {
    errors,
    summary,
    hasErrors,
    hasCritical,
    acknowledgeError,
    acknowledgeAll,
    clearErrors,
    removeError,
  } = useApiError({
    onCritical: (error) => {
      console.error('🚨 CRITICAL ERROR:', error)
      // Auto-open panel on critical errors
      setIsOpen(true)
    },
  })

  // Send error to Pattern Dashboard
  const handleSendToPattern = async (error: ManagedError) => {
    try {
      const response = await fetch('/api/error-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createFromError',
          data: {
            patternKey: `${error.type}_${error.endpoint.split('?')[0]}_${error.status}`,
            patternName: `${error.type} - ${error.endpoint.split('?')[0]}`,
            errorType: error.type || 'UNKNOWN',
            endpoint: error.endpoint,
            httpStatus: error.status,
            description: error.message || 'Error from Error Monitor',
            severity: error.severity || 'info',
            rootCause: error.hint || null,
          },
        }),
      })
      
      const result = await response.json()
      
      if (!result.success) {
        console.error('Failed to create pattern:', result.error)
        throw new Error(result.error || 'Failed to create pattern')
      }
      
      console.log('✅ Pattern created:', result.pattern)
      return result
    } catch (err) {
      console.error('Error sending to pattern dashboard:', err)
      throw err
    }
  }

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
  }

  if (!hasErrors && !isOpen) return null

  const visibleErrors = errors.slice(0, maxVisible)

  return (
    <div style={{ ...styles.container, ...positionStyles[position] }}>
      {/* Badge Button */}
      {showBadge && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            ...styles.badge,
            backgroundColor: hasCritical ? '#ef4444' : hasErrors ? '#f97316' : '#3b82f6',
          }}
        >
          <span style={{ fontSize: '20px' }}>
            {hasCritical ? '🚨' : hasErrors ? '⚠️' : '✓'}
          </span>
          {summary.unacknowledged > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#fff',
              color: '#000',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '11px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {summary.unacknowledged}
            </span>
          )}
        </button>
      )}

      {/* Error Panel */}
      {isOpen && (
        <div
          style={{
            ...styles.panel,
            backgroundColor: '#1f1f1f',
            color: '#fff',
            marginTop: showBadge ? '10px' : '0',
          }}
        >
          {/* Header */}
          <div style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🔥</span>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>Error Monitor</span>
              <span style={{
                backgroundColor: hasCritical ? '#ef4444' : '#3b82f6',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
              }}>
                {summary.total}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '18px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Error List */}
          <div style={styles.errorList}>
            {visibleErrors.length === 0 ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#6b7280',
              }}>
                <span style={{ fontSize: '32px' }}>✅</span>
                <p style={{ marginTop: '10px' }}>No errors</p>
              </div>
            ) : (
              visibleErrors.map(error => (
                <ErrorItem
                  key={error.id}
                  error={error}
                  onAcknowledge={acknowledgeError}
                  onRemove={removeError}
                  onSendToPattern={handleSendToPattern}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>
              {summary.critical > 0 && <span style={{ color: '#ef4444' }}>🚨 {summary.critical} critical • </span>}
              {summary.errors > 0 && <span style={{ color: '#f97316' }}>❌ {summary.errors} errors • </span>}
              {summary.warnings > 0 && <span style={{ color: '#eab308' }}>⚠️ {summary.warnings} warnings</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={acknowledgeAll}
                style={{
                  ...styles.button,
                  backgroundColor: '#3b82f6',
                  color: 'white',
                }}
              >
                Ack All
              </button>
              <button
                onClick={clearErrors}
                style={{
                  ...styles.button,
                  backgroundColor: '#374151',
                  color: 'white',
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// MINIMAL ERROR INDICATOR (Alternative to full panel)
// =============================================================================

export function ErrorIndicator() {
  const { hasErrors, hasCritical, summary } = useApiError()

  if (!hasErrors) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      backgroundColor: hasCritical ? '#ef4444' : '#f97316',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    }}>
      {hasCritical ? '🚨' : '⚠️'}
      {summary.unacknowledged} error{summary.unacknowledged !== 1 ? 's' : ''}
    </div>
  )
}

export default ErrorPanel
